/**
 * SAP Workflow Approvals Module
 * Approval Rules, Requests, Multi-level Approvals, Delegation
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../../models/database');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

// ============================================
// APPROVAL RULES
// ============================================

router.get('/rules', authorize('admin'), (req, res) => {
    try {
        const rules = db.prepare(`
            SELECT ar.*,
                   e.first_name || ' ' || e.last_name as approver_name,
                   r.name as role_name
            FROM approval_rules ar
            LEFT JOIN employees e ON ar.approver_id = e.id
            LEFT JOIN roles r ON ar.approver_role = r.id
            WHERE ar.organization_id = ? AND ar.is_active = 1
            ORDER BY ar.document_type, ar.approval_level
        `).all(req.user.organizationId);

        res.json({ success: true, data: rules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/rules', authorize('admin'), (req, res) => {
    try {
        const {
            documentType, approvalLevel, approverId, approverRole,
            minAmount, maxAmount, conditions, autoApprove
        } = req.body;

        const id = uuidv4();

        db.prepare(`
            INSERT INTO approval_rules (
                id, organization_id, document_type, approval_level, approver_id,
                approver_role, min_amount, max_amount, conditions, auto_approve
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, req.user.organizationId, documentType, approvalLevel || 1,
            approverId, approverRole, minAmount, maxAmount,
            JSON.stringify(conditions || {}), autoApprove ? 1 : 0
        );

        res.json({ success: true, data: { id }, message: 'Approval rule created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/rules/:id', authorize('admin'), (req, res) => {
    try {
        const { id } = req.params;
        const { approverId, approverRole, minAmount, maxAmount, conditions, isActive } = req.body;

        db.prepare(`
            UPDATE approval_rules SET
                approver_id = COALESCE(?, approver_id),
                approver_role = COALESCE(?, approver_role),
                min_amount = COALESCE(?, min_amount),
                max_amount = COALESCE(?, max_amount),
                conditions = COALESCE(?, conditions),
                is_active = COALESCE(?, is_active)
            WHERE id = ? AND organization_id = ?
        `).run(approverId, approverRole, minAmount, maxAmount,
               conditions ? JSON.stringify(conditions) : null,
               isActive !== undefined ? (isActive ? 1 : 0) : null,
               id, req.user.organizationId);

        res.json({ success: true, message: 'Rule updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/rules/:id', authorize('admin'), (req, res) => {
    try {
        const { id } = req.params;

        db.prepare(`
            UPDATE approval_rules SET is_active = 0 WHERE id = ? AND organization_id = ?
        `).run(id, req.user.organizationId);

        res.json({ success: true, message: 'Rule deactivated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// APPROVAL REQUESTS
// ============================================

// Get pending approvals for current user
router.get('/pending', (req, res) => {
    try {
        const requests = db.prepare(`
            SELECT ar.*,
                   u.full_name as requester_name,
                   u.avatar_url as requester_avatar,
                   (SELECT COUNT(*) FROM approval_history WHERE request_id = ar.id) as approval_count
            FROM approval_requests ar
            JOIN users u ON ar.requester_id = u.id
            WHERE ar.current_approver_id = ? AND ar.status = 'pending'
            ORDER BY ar.created_at DESC
        `).all(req.user.id);

        res.json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get my submitted requests
router.get('/my-requests', (req, res) => {
    try {
        const { status, documentType, limit = 50 } = req.query;

        let query = `
            SELECT ar.*,
                   u.full_name as current_approver_name
            FROM approval_requests ar
            LEFT JOIN users u ON ar.current_approver_id = u.id
            WHERE ar.requester_id = ?
        `;
        const params = [req.user.id];

        if (status) {
            query += ' AND ar.status = ?';
            params.push(status);
        }
        if (documentType) {
            query += ' AND ar.document_type = ?';
            params.push(documentType);
        }

        query += ' ORDER BY ar.created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const requests = db.prepare(query).all(...params);
        res.json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get request details with history
router.get('/requests/:id', (req, res) => {
    try {
        const { id } = req.params;

        const request = db.prepare(`
            SELECT ar.*,
                   u.full_name as requester_name,
                   u.avatar_url as requester_avatar,
                   ca.full_name as current_approver_name
            FROM approval_requests ar
            JOIN users u ON ar.requester_id = u.id
            LEFT JOIN users ca ON ar.current_approver_id = ca.id
            WHERE ar.id = ?
        `).get(id);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        // Get approval history
        const history = db.prepare(`
            SELECT ah.*,
                   u.full_name as approver_name,
                   u.avatar_url as approver_avatar
            FROM approval_history ah
            JOIN users u ON ah.approver_id = u.id
            WHERE ah.request_id = ?
            ORDER BY ah.created_at ASC
        `).all(id);

        res.json({
            success: true,
            data: {
                ...request,
                documentData: JSON.parse(request.document_data || '{}'),
                history
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Submit new approval request
router.post('/requests', (req, res) => {
    try {
        const { documentType, documentId, documentData, amount, description, urgency } = req.body;

        // Find applicable approval rule
        let rule = db.prepare(`
            SELECT * FROM approval_rules
            WHERE organization_id = ? AND document_type = ? AND is_active = 1
            AND (min_amount IS NULL OR min_amount <= ?)
            AND (max_amount IS NULL OR max_amount >= ?)
            ORDER BY approval_level ASC
            LIMIT 1
        `).get(req.user.organizationId, documentType, amount || 0, amount || 0);

        if (!rule) {
            // Get default manager if no rule found
            const employee = db.prepare(`
                SELECT e.manager_id FROM employees e
                JOIN users u ON e.user_id = u.id
                WHERE u.id = ?
            `).get(req.user.id);

            if (!employee || !employee.manager_id) {
                return res.status(400).json({
                    success: false,
                    message: 'No approval rule found and no manager assigned'
                });
            }

            rule = { approver_id: employee.manager_id, approval_level: 1 };
        }

        // Check for auto-approve
        if (rule.auto_approve) {
            // Auto-approve the document
            return res.json({
                success: true,
                data: { autoApproved: true },
                message: 'Document auto-approved based on rules'
            });
        }

        const id = uuidv4();
        const requestNumber = `APR-${Date.now().toString(36).toUpperCase()}`;

        // Get approver ID (from rule or by role)
        let approverId = rule.approver_id;
        if (!approverId && rule.approver_role) {
            // Find user with this role
            const approver = db.prepare(`
                SELECT id FROM users WHERE organization_id = ? AND role = ? AND is_active = 1 LIMIT 1
            `).get(req.user.organizationId, rule.approver_role);
            approverId = approver?.id;
        }

        if (!approverId) {
            return res.status(400).json({ success: false, message: 'No approver found' });
        }

        db.prepare(`
            INSERT INTO approval_requests (
                id, request_number, organization_id, requester_id, document_type,
                document_id, document_data, amount, description, urgency,
                current_approver_id, current_level, total_levels
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, requestNumber, req.user.organizationId, req.user.id,
            documentType, documentId, JSON.stringify(documentData || {}),
            amount, description, urgency || 'normal',
            approverId, 1, rule.approval_level
        );

        // Create notification for approver
        db.prepare(`
            INSERT INTO notifications (id, user_id, type, title, content, data)
            VALUES (?, ?, 'approval_request', 'New Approval Request', ?, ?)
        `).run(
            uuidv4(), approverId,
            `${req.user.fullName || 'A user'} submitted ${documentType} for approval`,
            JSON.stringify({ requestId: id, requestNumber })
        );

        res.json({ success: true, data: { id, requestNumber }, message: 'Approval request submitted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Approve request
router.post('/requests/:id/approve', (req, res) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;

        const request = db.prepare(`
            SELECT * FROM approval_requests WHERE id = ? AND current_approver_id = ? AND status = 'pending'
        `).get(id, req.user.id);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found or not authorized' });
        }

        // Log approval history
        db.prepare(`
            INSERT INTO approval_history (id, request_id, approver_id, action, level, comment)
            VALUES (?, ?, ?, 'approved', ?, ?)
        `).run(uuidv4(), id, req.user.id, request.current_level, comment);

        // Check if there are more approval levels
        const nextLevel = request.current_level + 1;
        if (nextLevel <= request.total_levels) {
            // Find next approver
            const nextRule = db.prepare(`
                SELECT * FROM approval_rules
                WHERE organization_id = ? AND document_type = ? AND approval_level = ? AND is_active = 1
            `).get(request.organization_id, request.document_type, nextLevel);

            if (nextRule) {
                let nextApproverId = nextRule.approver_id;
                if (!nextApproverId && nextRule.approver_role) {
                    const nextApprover = db.prepare(`
                        SELECT id FROM users WHERE organization_id = ? AND role = ? AND is_active = 1 LIMIT 1
                    `).get(request.organization_id, nextRule.approver_role);
                    nextApproverId = nextApprover?.id;
                }

                if (nextApproverId) {
                    db.prepare(`
                        UPDATE approval_requests
                        SET current_approver_id = ?, current_level = ?
                        WHERE id = ?
                    `).run(nextApproverId, nextLevel, id);

                    // Notify next approver
                    db.prepare(`
                        INSERT INTO notifications (id, user_id, type, title, content, data)
                        VALUES (?, ?, 'approval_request', 'Approval Required', ?, ?)
                    `).run(
                        uuidv4(), nextApproverId,
                        `Request ${request.request_number} requires your approval (Level ${nextLevel})`,
                        JSON.stringify({ requestId: id })
                    );

                    return res.json({ success: true, message: 'Approved, forwarded to next level' });
                }
            }
        }

        // Final approval
        db.prepare(`
            UPDATE approval_requests
            SET status = 'approved', completed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(id);

        // Notify requester
        db.prepare(`
            INSERT INTO notifications (id, user_id, type, title, content, data)
            VALUES (?, ?, 'approval_completed', 'Request Approved', ?, ?)
        `).run(
            uuidv4(), request.requester_id,
            `Your ${request.document_type} request has been approved`,
            JSON.stringify({ requestId: id })
        );

        res.json({ success: true, message: 'Request fully approved' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Reject request
router.post('/requests/:id/reject', (req, res) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;

        if (!comment) {
            return res.status(400).json({ success: false, message: 'Rejection comment required' });
        }

        const request = db.prepare(`
            SELECT * FROM approval_requests WHERE id = ? AND current_approver_id = ? AND status = 'pending'
        `).get(id, req.user.id);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found or not authorized' });
        }

        // Log rejection
        db.prepare(`
            INSERT INTO approval_history (id, request_id, approver_id, action, level, comment)
            VALUES (?, ?, ?, 'rejected', ?, ?)
        `).run(uuidv4(), id, req.user.id, request.current_level, comment);

        // Update request status
        db.prepare(`
            UPDATE approval_requests
            SET status = 'rejected', completed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(id);

        // Notify requester
        db.prepare(`
            INSERT INTO notifications (id, user_id, type, title, content, data)
            VALUES (?, ?, 'approval_rejected', 'Request Rejected', ?, ?)
        `).run(
            uuidv4(), request.requester_id,
            `Your ${request.document_type} request was rejected: ${comment}`,
            JSON.stringify({ requestId: id })
        );

        res.json({ success: true, message: 'Request rejected' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Request changes (send back for revision)
router.post('/requests/:id/revision', (req, res) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;

        if (!comment) {
            return res.status(400).json({ success: false, message: 'Revision comment required' });
        }

        const request = db.prepare(`
            SELECT * FROM approval_requests WHERE id = ? AND current_approver_id = ? AND status = 'pending'
        `).get(id, req.user.id);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found or not authorized' });
        }

        // Log revision request
        db.prepare(`
            INSERT INTO approval_history (id, request_id, approver_id, action, level, comment)
            VALUES (?, ?, ?, 'revision_requested', ?, ?)
        `).run(uuidv4(), id, req.user.id, request.current_level, comment);

        // Update request status
        db.prepare(`
            UPDATE approval_requests SET status = 'revision_requested' WHERE id = ?
        `).run(id);

        // Notify requester
        db.prepare(`
            INSERT INTO notifications (id, user_id, type, title, content, data)
            VALUES (?, ?, 'approval_revision', 'Revision Requested', ?, ?)
        `).run(
            uuidv4(), request.requester_id,
            `Your ${request.document_type} request needs revision: ${comment}`,
            JSON.stringify({ requestId: id })
        );

        res.json({ success: true, message: 'Revision requested' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Resubmit after revision
router.post('/requests/:id/resubmit', (req, res) => {
    try {
        const { id } = req.params;
        const { documentData, comment } = req.body;

        const request = db.prepare(`
            SELECT * FROM approval_requests WHERE id = ? AND requester_id = ? AND status = 'revision_requested'
        `).get(id, req.user.id);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found or cannot be resubmitted' });
        }

        // Update request
        db.prepare(`
            UPDATE approval_requests
            SET status = 'pending',
                document_data = COALESCE(?, document_data),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(documentData ? JSON.stringify(documentData) : null, id);

        // Log resubmission
        db.prepare(`
            INSERT INTO approval_history (id, request_id, approver_id, action, level, comment)
            VALUES (?, ?, ?, 'resubmitted', ?, ?)
        `).run(uuidv4(), id, req.user.id, request.current_level, comment);

        // Notify approver
        db.prepare(`
            INSERT INTO notifications (id, user_id, type, title, content, data)
            VALUES (?, ?, 'approval_resubmitted', 'Request Resubmitted', ?, ?)
        `).run(
            uuidv4(), request.current_approver_id,
            `Request ${request.request_number} has been resubmitted for approval`,
            JSON.stringify({ requestId: id })
        );

        res.json({ success: true, message: 'Request resubmitted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Cancel request
router.post('/requests/:id/cancel', (req, res) => {
    try {
        const { id } = req.params;

        const request = db.prepare(`
            SELECT * FROM approval_requests WHERE id = ? AND requester_id = ? AND status IN ('pending', 'revision_requested')
        `).get(id, req.user.id);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found or cannot be cancelled' });
        }

        db.prepare(`
            UPDATE approval_requests SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(id);

        res.json({ success: true, message: 'Request cancelled' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// DELEGATION
// ============================================

router.post('/delegate', (req, res) => {
    try {
        const { delegateToId, startDate, endDate, documentTypes } = req.body;

        // Store delegation (simplified - would typically have a delegations table)
        const id = uuidv4();

        db.prepare(`
            INSERT INTO approval_rules (
                id, organization_id, document_type, approval_level, approver_id,
                min_amount, max_amount, conditions, is_active
            )
            SELECT ?, organization_id, document_type, approval_level, ?,
                   min_amount, max_amount, conditions, 1
            FROM approval_rules
            WHERE approver_id = ? AND is_active = 1
            ${documentTypes?.length ? `AND document_type IN (${documentTypes.map(() => '?').join(',')})` : ''}
        `).run(id, delegateToId, req.user.id, ...(documentTypes || []));

        res.json({ success: true, message: 'Delegation created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// APPROVAL DASHBOARD
// ============================================

router.get('/dashboard', (req, res) => {
    try {
        const userId = req.user.id;
        const orgId = req.user.organizationId;

        // Pending for me
        const pendingForMe = db.prepare(`
            SELECT COUNT(*) as count FROM approval_requests
            WHERE current_approver_id = ? AND status = 'pending'
        `).get(userId);

        // My pending requests
        const myPending = db.prepare(`
            SELECT COUNT(*) as count FROM approval_requests
            WHERE requester_id = ? AND status = 'pending'
        `).get(userId);

        // Requests by status (organization-wide for admins)
        const byStatus = db.prepare(`
            SELECT status, COUNT(*) as count
            FROM approval_requests
            WHERE organization_id = ?
            GROUP BY status
        `).all(orgId);

        // Requests by type
        const byType = db.prepare(`
            SELECT document_type, COUNT(*) as count
            FROM approval_requests
            WHERE organization_id = ? AND created_at >= date('now', '-30 days')
            GROUP BY document_type
        `).all(orgId);

        // Average approval time
        const avgTime = db.prepare(`
            SELECT AVG(julianday(completed_at) - julianday(created_at)) * 24 as avg_hours
            FROM approval_requests
            WHERE organization_id = ? AND status = 'approved' AND completed_at IS NOT NULL
            AND completed_at >= date('now', '-30 days')
        `).get(orgId);

        // Recent activity
        const recentActivity = db.prepare(`
            SELECT ah.*, ar.request_number, ar.document_type, u.full_name as approver_name
            FROM approval_history ah
            JOIN approval_requests ar ON ah.request_id = ar.id
            JOIN users u ON ah.approver_id = u.id
            WHERE ar.organization_id = ?
            ORDER BY ah.created_at DESC
            LIMIT 10
        `).all(orgId);

        // Urgent requests
        const urgentRequests = db.prepare(`
            SELECT ar.*, u.full_name as requester_name
            FROM approval_requests ar
            JOIN users u ON ar.requester_id = u.id
            WHERE ar.organization_id = ? AND ar.status = 'pending' AND ar.urgency = 'urgent'
            ORDER BY ar.created_at ASC
        `).all(orgId);

        res.json({
            success: true,
            data: {
                pendingForMe: pendingForMe.count,
                myPendingRequests: myPending.count,
                byStatus,
                byType,
                avgApprovalTimeHours: avgTime.avg_hours ? Math.round(avgTime.avg_hours * 10) / 10 : null,
                recentActivity,
                urgentRequests
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
