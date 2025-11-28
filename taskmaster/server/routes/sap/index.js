/**
 * SAP Enterprise Routes - Main Index
 */

const express = require('express');
const router = express.Router();

// Import SAP modules
const financeRoutes = require('./finance');
const hrRoutes = require('./hr');
const mmRoutes = require('./mm');
const sdRoutes = require('./sd');
const crmRoutes = require('./crm');
const projectRoutes = require('./projects');
const approvalRoutes = require('./approvals');

// Mount SAP modules
router.use('/finance', financeRoutes);
router.use('/hr', hrRoutes);
router.use('/mm', mmRoutes);
router.use('/sd', sdRoutes);
router.use('/crm', crmRoutes);
router.use('/projects', projectRoutes);
router.use('/approvals', approvalRoutes);

// SAP Dashboard - Overview of all modules
router.get('/dashboard', async (req, res) => {
    try {
        const { db } = require('../../models/database');
        const orgId = req.user.organizationId;

        // Gather KPIs from all modules
        const kpis = {
            finance: {
                pendingInvoices: db.prepare(`
                    SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
                    FROM invoices WHERE organization_id = ? AND status = 'sent'
                `).get(orgId) || { count: 0, total: 0 },
                overdueInvoices: db.prepare(`
                    SELECT COUNT(*) as count
                    FROM invoices WHERE organization_id = ? AND status = 'overdue'
                `).get(orgId) || { count: 0 }
            },
            hr: {
                totalEmployees: db.prepare(`
                    SELECT COUNT(*) as count FROM employees WHERE organization_id = ? AND employment_status = 'active'
                `).get(orgId) || { count: 0 },
                pendingLeaves: db.prepare(`
                    SELECT COUNT(*) as count FROM leave_requests lr
                    JOIN employees e ON lr.employee_id = e.id
                    WHERE e.organization_id = ? AND lr.status = 'pending'
                `).get(orgId) || { count: 0 }
            },
            inventory: {
                lowStock: db.prepare(`
                    SELECT COUNT(*) as count FROM inventory i
                    JOIN products p ON i.product_id = p.id
                    WHERE p.organization_id = ? AND i.quantity_on_hand <= p.reorder_point
                `).get(orgId) || { count: 0 },
                pendingOrders: db.prepare(`
                    SELECT COUNT(*) as count FROM purchase_orders
                    WHERE organization_id = ? AND status IN ('draft', 'sent')
                `).get(orgId) || { count: 0 }
            },
            sales: {
                pendingOrders: db.prepare(`
                    SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
                    FROM sales_orders WHERE organization_id = ? AND status IN ('draft', 'confirmed')
                `).get(orgId) || { count: 0, total: 0 },
                monthlyRevenue: db.prepare(`
                    SELECT COALESCE(SUM(total_amount), 0) as total
                    FROM sales_orders
                    WHERE organization_id = ? AND status = 'delivered'
                    AND order_date >= date('now', 'start of month')
                `).get(orgId) || { total: 0 }
            },
            crm: {
                openLeads: db.prepare(`
                    SELECT COUNT(*) as count FROM crm_leads
                    WHERE organization_id = ? AND status IN ('new', 'contacted', 'qualified')
                `).get(orgId) || { count: 0 },
                openOpportunities: db.prepare(`
                    SELECT COUNT(*) as count, COALESCE(SUM(expected_value), 0) as pipeline
                    FROM crm_opportunities
                    WHERE organization_id = ? AND stage NOT IN ('closed_won', 'closed_lost')
                `).get(orgId) || { count: 0, pipeline: 0 },
                openTickets: db.prepare(`
                    SELECT COUNT(*) as count FROM service_tickets
                    WHERE organization_id = ? AND status IN ('new', 'open', 'pending')
                `).get(orgId) || { count: 0 }
            },
            projects: {
                activeProjects: db.prepare(`
                    SELECT COUNT(*) as count FROM projects
                    WHERE organization_id = ? AND status = 'active'
                `).get(orgId) || { count: 0 },
                overdueMilestones: db.prepare(`
                    SELECT COUNT(*) as count FROM project_milestones pm
                    JOIN projects p ON pm.project_id = p.id
                    WHERE p.organization_id = ? AND pm.status = 'delayed'
                `).get(orgId) || { count: 0 }
            },
            approvals: {
                pending: db.prepare(`
                    SELECT COUNT(*) as count FROM approval_requests
                    WHERE current_approver_id = ? AND status = 'pending'
                `).get(req.user.id) || { count: 0 }
            }
        };

        res.json({
            success: true,
            data: {
                kpis,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('SAP Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load SAP dashboard'
        });
    }
});

module.exports = router;
