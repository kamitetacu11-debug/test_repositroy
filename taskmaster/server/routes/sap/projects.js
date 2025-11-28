/**
 * SAP Project System (PS) Module
 * Projects, Milestones, Resources, WBS, Time Tracking
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../../models/database');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

// ============================================
// PROJECTS
// ============================================

router.get('/projects', (req, res) => {
    try {
        const { status, managerId, customerId, search, limit = 50 } = req.query;

        let query = `
            SELECT p.*,
                   e.first_name || ' ' || e.last_name as manager_name,
                   c.name as customer_name,
                   (SELECT COUNT(*) FROM project_milestones WHERE project_id = p.id) as milestone_count,
                   (SELECT COUNT(*) FROM project_milestones WHERE project_id = p.id AND status = 'completed') as completed_milestones,
                   (SELECT SUM(actual_hours) FROM project_resources WHERE project_id = p.id) as total_hours_spent
            FROM projects p
            LEFT JOIN employees e ON p.manager_id = e.id
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE p.organization_id = ?
        `;
        const params = [req.user.organizationId];

        if (status) {
            query += ' AND p.status = ?';
            params.push(status);
        }
        if (managerId) {
            query += ' AND p.manager_id = ?';
            params.push(managerId);
        }
        if (customerId) {
            query += ' AND p.customer_id = ?';
            params.push(customerId);
        }
        if (search) {
            query += ' AND (p.name LIKE ? OR p.project_code LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY p.created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const projects = db.prepare(query).all(...params);

        // Calculate progress for each project
        const result = projects.map(p => ({
            ...p,
            progress: p.milestone_count > 0
                ? Math.round((p.completed_milestones / p.milestone_count) * 100)
                : 0
        }));

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/projects/:id', (req, res) => {
    try {
        const { id } = req.params;

        const project = db.prepare(`
            SELECT p.*,
                   e.first_name || ' ' || e.last_name as manager_name,
                   c.name as customer_name
            FROM projects p
            LEFT JOIN employees e ON p.manager_id = e.id
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE p.id = ? AND p.organization_id = ?
        `).get(id, req.user.organizationId);

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Get milestones
        const milestones = db.prepare(`
            SELECT * FROM project_milestones WHERE project_id = ? ORDER BY due_date ASC
        `).all(id);

        // Get resources
        const resources = db.prepare(`
            SELECT pr.*, e.first_name || ' ' || e.last_name as employee_name
            FROM project_resources pr
            JOIN employees e ON pr.employee_id = e.id
            WHERE pr.project_id = ?
        `).all(id);

        // Calculate budget usage
        const budgetUsed = db.prepare(`
            SELECT COALESCE(SUM(actual_hours * hourly_rate), 0) as used
            FROM project_resources WHERE project_id = ?
        `).get(id);

        res.json({
            success: true,
            data: {
                ...project,
                milestones,
                resources,
                budgetUsed: budgetUsed.used,
                budgetRemaining: (project.budget || 0) - budgetUsed.used
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/projects', authorize('admin', 'manager'), (req, res) => {
    try {
        const {
            name, description, customerId, managerId, budget,
            startDate, endDate, priority, projectType
        } = req.body;

        const id = uuidv4();
        const projectCode = `PRJ-${Date.now().toString(36).toUpperCase()}`;

        db.prepare(`
            INSERT INTO projects (
                id, project_code, name, description, customer_id, manager_id,
                budget, start_date, end_date, priority, project_type, organization_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, projectCode, name, description, customerId, managerId,
            budget, startDate, endDate, priority || 'medium', projectType || 'internal',
            req.user.organizationId
        );

        res.json({ success: true, data: { id, projectCode }, message: 'Project created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/projects/:id', authorize('admin', 'manager'), (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status, budget, endDate, managerId } = req.body;

        db.prepare(`
            UPDATE projects SET
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                status = COALESCE(?, status),
                budget = COALESCE(?, budget),
                end_date = COALESCE(?, end_date),
                manager_id = COALESCE(?, manager_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND organization_id = ?
        `).run(name, description, status, budget, endDate, managerId, id, req.user.organizationId);

        res.json({ success: true, message: 'Project updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// MILESTONES (WBS Elements)
// ============================================

router.get('/projects/:projectId/milestones', (req, res) => {
    try {
        const { projectId } = req.params;

        const milestones = db.prepare(`
            SELECT m.*,
                   (SELECT COUNT(*) FROM tasks t WHERE t.milestone_id = m.id) as task_count,
                   (SELECT COUNT(*) FROM tasks t WHERE t.milestone_id = m.id AND t.status = 'completed') as completed_tasks
            FROM project_milestones m
            WHERE m.project_id = ?
            ORDER BY m.due_date ASC
        `).all(projectId);

        res.json({ success: true, data: milestones });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/projects/:projectId/milestones', (req, res) => {
    try {
        const { projectId } = req.params;
        const { name, description, dueDate, deliverables, dependencies } = req.body;

        const id = uuidv4();
        const wbsCode = `WBS-${Date.now().toString(36).toUpperCase()}`;

        db.prepare(`
            INSERT INTO project_milestones (
                id, project_id, wbs_code, name, description, due_date, deliverables, dependencies
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, projectId, wbsCode, name, description, dueDate,
            JSON.stringify(deliverables || []),
            JSON.stringify(dependencies || [])
        );

        res.json({ success: true, data: { id, wbsCode }, message: 'Milestone created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/milestones/:id/status', (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        let completedAt = null;
        if (status === 'completed') {
            completedAt = new Date().toISOString();
        }

        db.prepare(`
            UPDATE project_milestones SET status = ?, completed_at = ?
            WHERE id = ?
        `).run(status, completedAt, id);

        res.json({ success: true, message: 'Milestone updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// PROJECT RESOURCES
// ============================================

router.get('/projects/:projectId/resources', (req, res) => {
    try {
        const { projectId } = req.params;

        const resources = db.prepare(`
            SELECT pr.*,
                   e.first_name || ' ' || e.last_name as employee_name,
                   e.department,
                   p.name as position_name
            FROM project_resources pr
            JOIN employees e ON pr.employee_id = e.id
            LEFT JOIN positions p ON e.position_id = p.id
            WHERE pr.project_id = ?
        `).all(projectId);

        res.json({ success: true, data: resources });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/projects/:projectId/resources', authorize('admin', 'manager'), (req, res) => {
    try {
        const { projectId } = req.params;
        const { employeeId, role, plannedHours, hourlyRate, startDate, endDate } = req.body;

        // Check if resource already assigned
        const existing = db.prepare(`
            SELECT id FROM project_resources WHERE project_id = ? AND employee_id = ?
        `).get(projectId, employeeId);

        if (existing) {
            return res.status(400).json({ success: false, message: 'Resource already assigned' });
        }

        const id = uuidv4();

        db.prepare(`
            INSERT INTO project_resources (
                id, project_id, employee_id, role, planned_hours, hourly_rate, start_date, end_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, projectId, employeeId, role, plannedHours, hourlyRate, startDate, endDate);

        res.json({ success: true, data: { id }, message: 'Resource assigned' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/resources/:id/hours', (req, res) => {
    try {
        const { id } = req.params;
        const { hours, date, description } = req.body;

        // Update actual hours
        db.prepare(`
            UPDATE project_resources SET actual_hours = actual_hours + ?
            WHERE id = ?
        `).run(hours, id);

        // Log time entry
        const resource = db.prepare('SELECT * FROM project_resources WHERE id = ?').get(id);

        db.prepare(`
            INSERT INTO time_entries (id, employee_id, entry_date, hours_worked, project_id, description, status)
            VALUES (?, ?, ?, ?, ?, ?, 'approved')
        `).run(uuidv4(), resource.employee_id, date || new Date().toISOString().split('T')[0], hours, resource.project_id, description);

        res.json({ success: true, message: 'Hours logged' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// PROJECT TASKS
// ============================================

router.get('/projects/:projectId/tasks', (req, res) => {
    try {
        const { projectId } = req.params;
        const { milestoneId, status, assigneeId } = req.query;

        let query = `
            SELECT t.*,
                   u.full_name as assignee_name,
                   m.name as milestone_name
            FROM tasks t
            LEFT JOIN users u ON t.assignee_id = u.id
            LEFT JOIN project_milestones m ON t.milestone_id = m.id
            WHERE t.project_id = ?
        `;
        const params = [projectId];

        if (milestoneId) {
            query += ' AND t.milestone_id = ?';
            params.push(milestoneId);
        }
        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }
        if (assigneeId) {
            query += ' AND t.assignee_id = ?';
            params.push(assigneeId);
        }

        query += ' ORDER BY t.deadline ASC, t.priority DESC';

        const tasks = db.prepare(query).all(...params);
        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/projects/:projectId/tasks', (req, res) => {
    try {
        const { projectId } = req.params;
        const { title, description, milestoneId, assigneeId, priority, deadline, estimatedHours } = req.body;

        // Get project's organization
        const project = db.prepare('SELECT organization_id FROM projects WHERE id = ?').get(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const id = uuidv4();

        db.prepare(`
            INSERT INTO tasks (
                id, organization_id, project_id, milestone_id, title, description,
                assignee_id, creator_id, priority, deadline, estimated_hours
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, project.organization_id, projectId, milestoneId, title, description,
            assigneeId, req.user.id, priority || 'medium', deadline, estimatedHours
        );

        res.json({ success: true, data: { id }, message: 'Task created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// PROJECT ANALYTICS
// ============================================

router.get('/projects/:projectId/analytics', (req, res) => {
    try {
        const { projectId } = req.params;

        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Milestone progress
        const milestoneStats = db.prepare(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'pending' AND due_date < date('now') THEN 1 ELSE 0 END) as overdue
            FROM project_milestones WHERE project_id = ?
        `).get(projectId);

        // Task progress
        const taskStats = db.prepare(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'pending' AND deadline < date('now') THEN 1 ELSE 0 END) as overdue
            FROM tasks WHERE project_id = ?
        `).get(projectId);

        // Budget analysis
        const budgetStats = db.prepare(`
            SELECT
                COALESCE(SUM(actual_hours * hourly_rate), 0) as actual_cost,
                COALESCE(SUM(planned_hours * hourly_rate), 0) as planned_cost,
                COALESCE(SUM(actual_hours), 0) as actual_hours,
                COALESCE(SUM(planned_hours), 0) as planned_hours
            FROM project_resources WHERE project_id = ?
        `).get(projectId);

        // Resource utilization
        const resourceUtilization = db.prepare(`
            SELECT
                e.first_name || ' ' || e.last_name as name,
                pr.planned_hours,
                pr.actual_hours,
                CASE WHEN pr.planned_hours > 0
                    THEN ROUND((pr.actual_hours * 100.0 / pr.planned_hours), 1)
                    ELSE 0
                END as utilization_pct
            FROM project_resources pr
            JOIN employees e ON pr.employee_id = e.id
            WHERE pr.project_id = ?
        `).all(projectId);

        // Timeline analysis
        const startDate = new Date(project.start_date);
        const endDate = new Date(project.end_date);
        const today = new Date();
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const elapsedDays = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
        const timeProgress = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

        const taskProgress = taskStats.total > 0
            ? Math.round((taskStats.completed / taskStats.total) * 100)
            : 0;

        res.json({
            success: true,
            data: {
                project: {
                    name: project.name,
                    status: project.status,
                    budget: project.budget
                },
                milestones: milestoneStats,
                tasks: taskStats,
                budget: {
                    planned: project.budget,
                    actualCost: budgetStats.actual_cost,
                    plannedCost: budgetStats.planned_cost,
                    variance: project.budget - budgetStats.actual_cost,
                    costPerformanceIndex: budgetStats.planned_cost > 0
                        ? (budgetStats.planned_cost / budgetStats.actual_cost).toFixed(2)
                        : 1
                },
                hours: {
                    planned: budgetStats.planned_hours,
                    actual: budgetStats.actual_hours,
                    schedulePerformanceIndex: budgetStats.planned_hours > 0
                        ? (budgetStats.actual_hours / budgetStats.planned_hours).toFixed(2)
                        : 1
                },
                resourceUtilization,
                timeline: {
                    startDate: project.start_date,
                    endDate: project.end_date,
                    totalDays,
                    elapsedDays,
                    timeProgress,
                    taskProgress,
                    scheduleVariance: taskProgress - timeProgress
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// PROJECT DASHBOARD
// ============================================

router.get('/dashboard', (req, res) => {
    try {
        const orgId = req.user.organizationId;

        // Projects by status
        const projectsByStatus = db.prepare(`
            SELECT status, COUNT(*) as count, COALESCE(SUM(budget), 0) as total_budget
            FROM projects WHERE organization_id = ?
            GROUP BY status
        `).all(orgId);

        // Active projects summary
        const activeProjects = db.prepare(`
            SELECT p.id, p.name, p.project_code, p.end_date,
                   (SELECT COUNT(*) FROM project_milestones WHERE project_id = p.id AND status != 'completed') as pending_milestones,
                   (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status NOT IN ('completed', 'cancelled') AND deadline < date('now')) as overdue_tasks
            FROM projects p
            WHERE p.organization_id = ? AND p.status = 'active'
            ORDER BY p.end_date ASC
            LIMIT 10
        `).all(orgId);

        // Resource allocation
        const resourceAllocation = db.prepare(`
            SELECT
                e.first_name || ' ' || e.last_name as name,
                COUNT(DISTINCT pr.project_id) as project_count,
                COALESCE(SUM(pr.planned_hours), 0) as total_planned_hours,
                COALESCE(SUM(pr.actual_hours), 0) as total_actual_hours
            FROM employees e
            LEFT JOIN project_resources pr ON e.id = pr.employee_id
            LEFT JOIN projects p ON pr.project_id = p.id AND p.status = 'active'
            WHERE e.organization_id = ?
            GROUP BY e.id
            ORDER BY total_planned_hours DESC
            LIMIT 10
        `).all(orgId);

        // Upcoming milestones
        const upcomingMilestones = db.prepare(`
            SELECT m.*, p.name as project_name, p.project_code
            FROM project_milestones m
            JOIN projects p ON m.project_id = p.id
            WHERE p.organization_id = ? AND m.status != 'completed'
            AND m.due_date >= date('now')
            ORDER BY m.due_date ASC
            LIMIT 10
        `).all(orgId);

        // Budget overview
        const budgetOverview = db.prepare(`
            SELECT
                COALESCE(SUM(p.budget), 0) as total_budget,
                COALESCE(SUM(
                    (SELECT COALESCE(SUM(pr.actual_hours * pr.hourly_rate), 0)
                     FROM project_resources pr WHERE pr.project_id = p.id)
                ), 0) as total_spent
            FROM projects p
            WHERE p.organization_id = ? AND p.status = 'active'
        `).get(orgId);

        res.json({
            success: true,
            data: {
                projectsByStatus,
                activeProjects,
                resourceAllocation,
                upcomingMilestones,
                budgetOverview: {
                    ...budgetOverview,
                    remaining: budgetOverview.total_budget - budgetOverview.total_spent
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
