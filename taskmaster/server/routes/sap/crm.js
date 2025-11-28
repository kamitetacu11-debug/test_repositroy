/**
 * SAP CRM Module
 * Leads, Opportunities, Activities, Service Tickets
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../../models/database');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

// ============================================
// LEADS
// ============================================

router.get('/leads', (req, res) => {
    try {
        const { status, rating, assignedTo, search, limit = 50 } = req.query;

        let query = `
            SELECT l.*, e.first_name || ' ' || e.last_name as assigned_to_name
            FROM crm_leads l
            LEFT JOIN employees e ON l.assigned_to = e.id
            WHERE l.organization_id = ?
        `;
        const params = [req.user.organizationId];

        if (status) {
            query += ' AND l.status = ?';
            params.push(status);
        }
        if (rating) {
            query += ' AND l.rating = ?';
            params.push(rating);
        }
        if (assignedTo) {
            query += ' AND l.assigned_to = ?';
            params.push(assignedTo);
        }
        if (search) {
            query += ' AND (l.first_name LIKE ? OR l.last_name LIKE ? OR l.company LIKE ? OR l.email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY l.created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const leads = db.prepare(query).all(...params);
        res.json({ success: true, data: leads });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/leads', (req, res) => {
    try {
        const {
            firstName, lastName, company, email, phone,
            source, rating, industry, estimatedValue, notes, assignedTo
        } = req.body;

        const id = uuidv4();
        const leadNumber = `LD-${Date.now().toString(36).toUpperCase()}`;

        db.prepare(`
            INSERT INTO crm_leads (
                id, lead_number, first_name, last_name, company, email, phone,
                source, rating, industry, estimated_value, notes, assigned_to, organization_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, leadNumber, firstName, lastName, company, email, phone,
            source, rating || 'warm', industry, estimatedValue, notes, assignedTo, req.user.organizationId
        );

        res.json({ success: true, data: { id, leadNumber }, message: 'Lead created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/leads/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { status, rating, notes, assignedTo } = req.body;

        db.prepare(`
            UPDATE crm_leads SET status = COALESCE(?, status), rating = COALESCE(?, rating),
            notes = COALESCE(?, notes), assigned_to = COALESCE(?, assigned_to)
            WHERE id = ? AND organization_id = ?
        `).run(status, rating, notes, assignedTo, id, req.user.organizationId);

        res.json({ success: true, message: 'Lead updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Convert lead to customer
router.post('/leads/:id/convert', authorize('admin', 'manager'), (req, res) => {
    try {
        const { id } = req.params;

        const lead = db.prepare('SELECT * FROM crm_leads WHERE id = ? AND organization_id = ?').get(id, req.user.organizationId);
        if (!lead || lead.status === 'converted') {
            return res.status(400).json({ success: false, message: 'Invalid lead' });
        }

        // Create customer
        const customerId = uuidv4();
        const customerCode = `CUS-${Date.now().toString(36).toUpperCase()}`;

        db.prepare(`
            INSERT INTO customers (id, customer_code, name, contact_name, email, phone, organization_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            customerId, customerCode, lead.company || `${lead.first_name} ${lead.last_name}`,
            `${lead.first_name} ${lead.last_name}`, lead.email, lead.phone, req.user.organizationId
        );

        // Update lead
        db.prepare(`
            UPDATE crm_leads SET status = 'converted', converted_to_customer_id = ?, converted_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(customerId, id);

        res.json({ success: true, data: { customerId, customerCode }, message: 'Lead converted to customer' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// OPPORTUNITIES
// ============================================

router.get('/opportunities', (req, res) => {
    try {
        const { stage, assignedTo, customerId, limit = 50 } = req.query;

        let query = `
            SELECT o.*, c.name as customer_name, e.first_name || ' ' || e.last_name as assigned_to_name
            FROM crm_opportunities o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN employees e ON o.assigned_to = e.id
            WHERE o.organization_id = ?
        `;
        const params = [req.user.organizationId];

        if (stage) {
            query += ' AND o.stage = ?';
            params.push(stage);
        }
        if (assignedTo) {
            query += ' AND o.assigned_to = ?';
            params.push(assignedTo);
        }
        if (customerId) {
            query += ' AND o.customer_id = ?';
            params.push(customerId);
        }

        query += ' ORDER BY o.expected_close_date ASC LIMIT ?';
        params.push(parseInt(limit));

        const opportunities = db.prepare(query).all(...params);
        res.json({ success: true, data: opportunities });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/opportunities', (req, res) => {
    try {
        const {
            name, customerId, leadId, stage, probability,
            expectedValue, expectedCloseDate, source, notes, assignedTo
        } = req.body;

        const id = uuidv4();
        const opportunityNumber = `OPP-${Date.now().toString(36).toUpperCase()}`;

        db.prepare(`
            INSERT INTO crm_opportunities (
                id, opportunity_number, name, customer_id, lead_id, stage, probability,
                expected_value, expected_close_date, source, notes, assigned_to, organization_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, opportunityNumber, name, customerId, leadId, stage || 'prospecting',
            probability || 10, expectedValue, expectedCloseDate, source, notes, assignedTo, req.user.organizationId
        );

        res.json({ success: true, data: { id, opportunityNumber }, message: 'Opportunity created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/opportunities/:id/stage', (req, res) => {
    try {
        const { id } = req.params;
        const { stage, probability, notes } = req.body;

        const stageProbabilities = {
            prospecting: 10, qualification: 25, proposal: 50,
            negotiation: 75, closed_won: 100, closed_lost: 0
        };

        const actualProbability = probability || stageProbabilities[stage] || 50;

        let updateQuery = 'UPDATE crm_opportunities SET stage = ?, probability = ?';
        const params = [stage, actualProbability];

        if (stage === 'closed_won' || stage === 'closed_lost') {
            updateQuery += ', actual_close_date = date("now")';
        }
        if (notes) {
            updateQuery += ', notes = ?';
            params.push(notes);
        }

        updateQuery += ' WHERE id = ? AND organization_id = ?';
        params.push(id, req.user.organizationId);

        db.prepare(updateQuery).run(...params);

        res.json({ success: true, message: 'Opportunity updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// ACTIVITIES
// ============================================

router.get('/activities', (req, res) => {
    try {
        const { relatedType, relatedId, status, assignedTo, limit = 50 } = req.query;

        let query = `
            SELECT a.*, e.first_name || ' ' || e.last_name as assigned_to_name
            FROM crm_activities a
            LEFT JOIN employees e ON a.assigned_to = e.id
            WHERE a.organization_id = ?
        `;
        const params = [req.user.organizationId];

        if (relatedType) {
            query += ' AND a.related_type = ?';
            params.push(relatedType);
        }
        if (relatedId) {
            query += ' AND a.related_id = ?';
            params.push(relatedId);
        }
        if (status) {
            query += ' AND a.status = ?';
            params.push(status);
        }
        if (assignedTo) {
            query += ' AND a.assigned_to = ?';
            params.push(assignedTo);
        }

        query += ' ORDER BY a.due_date ASC, a.created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const activities = db.prepare(query).all(...params);
        res.json({ success: true, data: activities });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/activities', (req, res) => {
    try {
        const {
            activityType, subject, description, relatedType, relatedId,
            dueDate, priority, assignedTo
        } = req.body;

        const id = uuidv4();

        db.prepare(`
            INSERT INTO crm_activities (
                id, activity_type, subject, description, related_type, related_id,
                due_date, priority, assigned_to, organization_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, activityType, subject, description, relatedType, relatedId,
            dueDate, priority || 'normal', assignedTo, req.user.organizationId
        );

        res.json({ success: true, data: { id }, message: 'Activity created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/activities/:id/complete', (req, res) => {
    try {
        const { id } = req.params;

        db.prepare(`
            UPDATE crm_activities SET status = 'completed', completed_at = CURRENT_TIMESTAMP
            WHERE id = ? AND organization_id = ?
        `).run(id, req.user.organizationId);

        res.json({ success: true, message: 'Activity completed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// SERVICE TICKETS
// ============================================

router.get('/tickets', (req, res) => {
    try {
        const { customerId, status, priority, assignedTo, limit = 50 } = req.query;

        let query = `
            SELECT t.*, c.name as customer_name, e.first_name || ' ' || e.last_name as assigned_to_name
            FROM service_tickets t
            JOIN customers c ON t.customer_id = c.id
            LEFT JOIN employees e ON t.assigned_to = e.id
            WHERE t.organization_id = ?
        `;
        const params = [req.user.organizationId];

        if (customerId) {
            query += ' AND t.customer_id = ?';
            params.push(customerId);
        }
        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }
        if (priority) {
            query += ' AND t.priority = ?';
            params.push(priority);
        }
        if (assignedTo) {
            query += ' AND t.assigned_to = ?';
            params.push(assignedTo);
        }

        query += ' ORDER BY t.priority DESC, t.created_at ASC LIMIT ?';
        params.push(parseInt(limit));

        const tickets = db.prepare(query).all(...params);
        res.json({ success: true, data: tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/tickets', (req, res) => {
    try {
        const {
            customerId, subject, description, category, priority, assignedTo
        } = req.body;

        const id = uuidv4();
        const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;

        // Calculate SLA due date based on priority
        const slaHours = { urgent: 4, high: 8, normal: 24, low: 48 };
        const slaDueDate = new Date();
        slaDueDate.setHours(slaDueDate.getHours() + (slaHours[priority] || 24));

        db.prepare(`
            INSERT INTO service_tickets (
                id, ticket_number, customer_id, subject, description,
                category, priority, assigned_to, sla_due_date, organization_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, ticketNumber, customerId, subject, description,
            category, priority || 'normal', assignedTo, slaDueDate.toISOString(), req.user.organizationId
        );

        res.json({ success: true, data: { id, ticketNumber }, message: 'Ticket created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/tickets/:id/resolve', (req, res) => {
    try {
        const { id } = req.params;
        const { resolution } = req.body;

        db.prepare(`
            UPDATE service_tickets SET status = 'resolved', resolution = ?, resolved_at = CURRENT_TIMESTAMP
            WHERE id = ? AND organization_id = ?
        `).run(resolution, id, req.user.organizationId);

        res.json({ success: true, message: 'Ticket resolved' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/tickets/:id/rate', (req, res) => {
    try {
        const { id } = req.params;
        const { satisfactionRating } = req.body;

        db.prepare(`
            UPDATE service_tickets SET satisfaction_rating = ?, status = 'closed'
            WHERE id = ? AND organization_id = ?
        `).run(satisfactionRating, id, req.user.organizationId);

        res.json({ success: true, message: 'Ticket rated and closed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// CRM DASHBOARD
// ============================================

router.get('/dashboard', (req, res) => {
    try {
        const orgId = req.user.organizationId;

        // Lead funnel
        const leadFunnel = db.prepare(`
            SELECT status, COUNT(*) as count, COALESCE(SUM(estimated_value), 0) as value
            FROM crm_leads WHERE organization_id = ?
            GROUP BY status
        `).all(orgId);

        // Opportunity pipeline
        const pipeline = db.prepare(`
            SELECT stage, COUNT(*) as count, COALESCE(SUM(expected_value), 0) as value
            FROM crm_opportunities WHERE organization_id = ? AND stage NOT IN ('closed_won', 'closed_lost')
            GROUP BY stage
        `).all(orgId);

        // Won/Lost this month
        const wonLost = db.prepare(`
            SELECT stage, COUNT(*) as count, COALESCE(SUM(actual_value), 0) as value
            FROM crm_opportunities
            WHERE organization_id = ? AND actual_close_date >= date('now', 'start of month')
            GROUP BY stage
        `).all(orgId);

        // Overdue activities
        const overdueActivities = db.prepare(`
            SELECT COUNT(*) as count FROM crm_activities
            WHERE organization_id = ? AND status = 'pending' AND due_date < datetime('now')
        `).get(orgId);

        // Open tickets by priority
        const ticketsByPriority = db.prepare(`
            SELECT priority, COUNT(*) as count
            FROM service_tickets
            WHERE organization_id = ? AND status IN ('new', 'open', 'pending')
            GROUP BY priority
        `).all(orgId);

        // SLA compliance
        const slaStats = db.prepare(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN resolved_at <= sla_due_date THEN 1 ELSE 0 END) as within_sla
            FROM service_tickets
            WHERE organization_id = ? AND status IN ('resolved', 'closed')
        `).get(orgId);

        res.json({
            success: true,
            data: {
                leadFunnel,
                pipeline,
                wonLost,
                overdueActivities: overdueActivities.count,
                ticketsByPriority,
                slaCompliance: slaStats.total > 0 ? Math.round((slaStats.within_sla / slaStats.total) * 100) : 100
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
