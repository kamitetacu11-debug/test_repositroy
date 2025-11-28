/**
 * SAP HR Module (HCM)
 * Employees, Departments, Time Tracking, Leave, Payroll
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../../models/database');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

// ============================================
// EMPLOYEES
// ============================================

router.get('/employees', (req, res) => {
    try {
        const { departmentId, status, search, limit = 100 } = req.query;

        let query = `
            SELECT e.*, d.name as department_name, p.title as position_title,
                   m.first_name || ' ' || m.last_name as manager_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN positions p ON e.position_id = p.id
            LEFT JOIN employees m ON e.manager_id = m.id
            WHERE e.organization_id = ?
        `;
        const params = [req.user.organizationId];

        if (departmentId) {
            query += ' AND e.department_id = ?';
            params.push(departmentId);
        }
        if (status) {
            query += ' AND e.employment_status = ?';
            params.push(status);
        }
        if (search) {
            query += ' AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_number LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY e.last_name, e.first_name LIMIT ?';
        params.push(parseInt(limit));

        const employees = db.prepare(query).all(...params);
        res.json({ success: true, data: employees });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/employees/:id', (req, res) => {
    try {
        const employee = db.prepare(`
            SELECT e.*, d.name as department_name, p.title as position_title
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN positions p ON e.position_id = p.id
            WHERE e.id = ? AND e.organization_id = ?
        `).get(req.params.id, req.user.organizationId);

        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        // Get current compensation
        const compensation = db.prepare(`
            SELECT * FROM employee_compensation
            WHERE employee_id = ? AND (end_date IS NULL OR end_date >= date('now'))
            ORDER BY effective_date DESC LIMIT 1
        `).get(employee.id);

        // Get leave balances
        const leaveBalances = db.prepare(`
            SELECT * FROM leave_balances
            WHERE employee_id = ? AND fiscal_year = strftime('%Y', 'now')
        `).all(employee.id);

        res.json({ success: true, data: { ...employee, compensation, leaveBalances } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/employees', authorize('admin', 'manager'), (req, res) => {
    try {
        const {
            userId, firstName, lastName, dateOfBirth, gender, nationalId,
            hireDate, employmentType, positionId, departmentId, managerId,
            costCenterId, workLocation, phone, emergencyContact, emergencyPhone
        } = req.body;

        const id = uuidv4();
        const employeeNumber = `EMP-${Date.now().toString(36).toUpperCase()}`;

        db.prepare(`
            INSERT INTO employees (
                id, user_id, employee_number, first_name, last_name, date_of_birth,
                gender, national_id, hire_date, employment_type, position_id,
                department_id, manager_id, cost_center_id, work_location, phone,
                emergency_contact, emergency_phone, organization_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, userId, employeeNumber, firstName, lastName, dateOfBirth,
            gender, nationalId, hireDate, employmentType, positionId,
            departmentId, managerId, costCenterId, workLocation, phone,
            emergencyContact, emergencyPhone, req.user.organizationId
        );

        // Create default leave balances
        const leaveTypes = ['vacation', 'sick', 'personal'];
        const defaultDays = { vacation: 15, sick: 10, personal: 3 };
        const fiscalYear = new Date().getFullYear();

        leaveTypes.forEach(type => {
            db.prepare(`
                INSERT INTO leave_balances (id, employee_id, leave_type, fiscal_year, entitled_days)
                VALUES (?, ?, ?, ?, ?)
            `).run(uuidv4(), id, type, fiscalYear, defaultDays[type]);
        });

        res.json({ success: true, data: { id, employeeNumber }, message: 'Employee created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/employees/:id', authorize('admin', 'manager'), (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const allowedFields = [
            'first_name', 'last_name', 'phone', 'emergency_contact', 'emergency_phone',
            'position_id', 'department_id', 'manager_id', 'work_location', 'employment_status'
        ];

        const setClause = [];
        const values = [];

        Object.keys(updates).forEach(key => {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(dbKey)) {
                setClause.push(`${dbKey} = ?`);
                values.push(updates[key]);
            }
        });

        if (setClause.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid fields to update' });
        }

        values.push(id, req.user.organizationId);
        db.prepare(`UPDATE employees SET ${setClause.join(', ')} WHERE id = ? AND organization_id = ?`).run(...values);

        res.json({ success: true, message: 'Employee updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// DEPARTMENTS
// ============================================

router.get('/departments', (req, res) => {
    try {
        const departments = db.prepare(`
            SELECT d.*, p.name as parent_name,
                   (SELECT COUNT(*) FROM employees WHERE department_id = d.id AND employment_status = 'active') as employee_count
            FROM departments d
            LEFT JOIN departments p ON d.parent_id = p.id
            WHERE d.organization_id = ?
            ORDER BY d.name
        `).all(req.user.organizationId);

        res.json({ success: true, data: departments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/departments', authorize('admin'), (req, res) => {
    try {
        const { code, name, description, parentId, managerId, costCenterId } = req.body;
        const id = uuidv4();

        db.prepare(`
            INSERT INTO departments (id, code, name, description, parent_id, manager_id, cost_center_id, organization_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, code, name, description, parentId, managerId, costCenterId, req.user.organizationId);

        res.json({ success: true, data: { id }, message: 'Department created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// POSITIONS
// ============================================

router.get('/positions', (req, res) => {
    try {
        const positions = db.prepare(`
            SELECT p.*, d.name as department_name,
                   (SELECT COUNT(*) FROM employees WHERE position_id = p.id AND employment_status = 'active') as filled_count
            FROM positions p
            LEFT JOIN departments d ON p.department_id = d.id
            WHERE p.is_active = 1
            ORDER BY p.title
        `).all();

        res.json({ success: true, data: positions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/positions', authorize('admin'), (req, res) => {
    try {
        const { code, title, description, departmentId, jobGrade, minSalary, maxSalary } = req.body;
        const id = uuidv4();

        db.prepare(`
            INSERT INTO positions (id, code, title, description, department_id, job_grade, min_salary, max_salary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, code, title, description, departmentId, jobGrade, minSalary, maxSalary);

        res.json({ success: true, data: { id }, message: 'Position created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// TIME TRACKING
// ============================================

router.get('/time-entries', (req, res) => {
    try {
        const { employeeId, startDate, endDate, status } = req.query;

        let query = `
            SELECT te.*, e.first_name || ' ' || e.last_name as employee_name
            FROM time_entries te
            JOIN employees e ON te.employee_id = e.id
            WHERE e.organization_id = ?
        `;
        const params = [req.user.organizationId];

        if (employeeId) {
            query += ' AND te.employee_id = ?';
            params.push(employeeId);
        }
        if (startDate) {
            query += ' AND te.entry_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND te.entry_date <= ?';
            params.push(endDate);
        }
        if (status) {
            query += ' AND te.status = ?';
            params.push(status);
        }

        query += ' ORDER BY te.entry_date DESC, te.clock_in DESC';

        const entries = db.prepare(query).all(...params);
        res.json({ success: true, data: entries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/time-entries/clock-in', (req, res) => {
    try {
        const { projectId, taskId, notes } = req.body;

        // Get employee ID for current user
        const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
        if (!employee) {
            return res.status(400).json({ success: false, message: 'Employee record not found' });
        }

        const id = uuidv4();
        const now = new Date();
        const entryDate = now.toISOString().split('T')[0];

        db.prepare(`
            INSERT INTO time_entries (id, employee_id, entry_date, clock_in, project_id, task_id, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, employee.id, entryDate, now.toISOString(), projectId, taskId, notes);

        res.json({ success: true, data: { id, clockIn: now.toISOString() }, message: 'Clocked in' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/time-entries/:id/clock-out', (req, res) => {
    try {
        const { id } = req.params;
        const { breakDuration } = req.body;

        const entry = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id);
        if (!entry) {
            return res.status(404).json({ success: false, message: 'Time entry not found' });
        }

        const clockOut = new Date();
        const clockIn = new Date(entry.clock_in);
        const totalMinutes = (clockOut - clockIn) / 60000 - (breakDuration || 0);
        const totalHours = totalMinutes / 60;
        const overtimeHours = Math.max(0, totalHours - 8);

        db.prepare(`
            UPDATE time_entries SET clock_out = ?, break_duration = ?, total_hours = ?, overtime_hours = ?
            WHERE id = ?
        `).run(clockOut.toISOString(), breakDuration || 0, totalHours, overtimeHours, id);

        res.json({ success: true, data: { clockOut: clockOut.toISOString(), totalHours }, message: 'Clocked out' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// LEAVE MANAGEMENT
// ============================================

router.get('/leave-requests', (req, res) => {
    try {
        const { employeeId, status, limit = 50 } = req.query;

        let query = `
            SELECT lr.*, e.first_name || ' ' || e.last_name as employee_name,
                   a.first_name || ' ' || a.last_name as approved_by_name
            FROM leave_requests lr
            JOIN employees e ON lr.employee_id = e.id
            LEFT JOIN employees a ON lr.approved_by = a.id
            WHERE e.organization_id = ?
        `;
        const params = [req.user.organizationId];

        if (employeeId) {
            query += ' AND lr.employee_id = ?';
            params.push(employeeId);
        }
        if (status) {
            query += ' AND lr.status = ?';
            params.push(status);
        }

        query += ' ORDER BY lr.created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const requests = db.prepare(query).all(...params);
        res.json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/leave-requests', (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;

        const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
        if (!employee) {
            return res.status(400).json({ success: false, message: 'Employee record not found' });
        }

        // Calculate days
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysRequested = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        // Check balance
        const balance = db.prepare(`
            SELECT * FROM leave_balances
            WHERE employee_id = ? AND leave_type = ? AND fiscal_year = strftime('%Y', 'now')
        `).get(employee.id, leaveType);

        if (balance && (balance.remaining_days - balance.pending_days) < daysRequested) {
            return res.status(400).json({ success: false, message: 'Insufficient leave balance' });
        }

        const id = uuidv4();

        db.prepare(`
            INSERT INTO leave_requests (id, employee_id, leave_type, start_date, end_date, days_requested, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, employee.id, leaveType, startDate, endDate, daysRequested, reason);

        // Update pending days
        if (balance) {
            db.prepare(`
                UPDATE leave_balances SET pending_days = pending_days + ? WHERE id = ?
            `).run(daysRequested, balance.id);
        }

        res.json({ success: true, data: { id, daysRequested }, message: 'Leave request submitted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/leave-requests/:id/approve', authorize('admin', 'manager'), (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const approver = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);

        const request = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);
        if (!request || request.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Invalid request' });
        }

        db.prepare(`
            UPDATE leave_requests SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP, notes = ?
            WHERE id = ?
        `).run(approver?.id, notes, id);

        // Update used days and pending days
        db.prepare(`
            UPDATE leave_balances
            SET used_days = used_days + ?, pending_days = pending_days - ?
            WHERE employee_id = ? AND leave_type = ? AND fiscal_year = strftime('%Y', 'now')
        `).run(request.days_requested, request.days_requested, request.employee_id, request.leave_type);

        res.json({ success: true, message: 'Leave approved' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/leave-requests/:id/reject', authorize('admin', 'manager'), (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const approver = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);

        const request = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);
        if (!request || request.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Invalid request' });
        }

        db.prepare(`
            UPDATE leave_requests SET status = 'rejected', approved_by = ?, approved_at = CURRENT_TIMESTAMP, notes = ?
            WHERE id = ?
        `).run(approver?.id, notes, id);

        // Remove from pending
        db.prepare(`
            UPDATE leave_balances SET pending_days = pending_days - ?
            WHERE employee_id = ? AND leave_type = ? AND fiscal_year = strftime('%Y', 'now')
        `).run(request.days_requested, request.employee_id, request.leave_type);

        res.json({ success: true, message: 'Leave rejected' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// PAYROLL
// ============================================

router.get('/payroll-runs', authorize('admin', 'manager'), (req, res) => {
    try {
        const runs = db.prepare(`
            SELECT pr.*, u.full_name as created_by_name
            FROM payroll_runs pr
            LEFT JOIN users u ON pr.created_by = u.id
            WHERE pr.organization_id = ?
            ORDER BY pr.pay_period_end DESC
        `).all(req.user.organizationId);

        res.json({ success: true, data: runs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/payroll-runs', authorize('admin'), (req, res) => {
    try {
        const { payPeriodStart, payPeriodEnd, paymentDate } = req.body;
        const id = uuidv4();

        // Get all active employees
        const employees = db.prepare(`
            SELECT e.*, ec.base_salary, ec.pay_frequency
            FROM employees e
            LEFT JOIN employee_compensation ec ON e.id = ec.employee_id AND ec.end_date IS NULL
            WHERE e.organization_id = ? AND e.employment_status = 'active'
        `).all(req.user.organizationId);

        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;

        // Create payroll run
        db.prepare(`
            INSERT INTO payroll_runs (id, pay_period_start, pay_period_end, payment_date, employee_count, organization_id, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, payPeriodStart, payPeriodEnd, paymentDate, employees.length, req.user.organizationId, req.user.id);

        // Create payslips
        const insertPayslip = db.prepare(`
            INSERT INTO payslips (id, payroll_run_id, employee_id, gross_salary, overtime_pay, bonuses, deductions, tax_amount, net_salary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        employees.forEach(emp => {
            const baseSalary = emp.base_salary || 0;

            // Get overtime hours
            const overtime = db.prepare(`
                SELECT COALESCE(SUM(overtime_hours), 0) as hours
                FROM time_entries
                WHERE employee_id = ? AND entry_date BETWEEN ? AND ? AND status = 'approved'
            `).get(emp.id, payPeriodStart, payPeriodEnd);

            const overtimePay = (overtime?.hours || 0) * (baseSalary / 160) * 1.5;
            const grossSalary = baseSalary + overtimePay;
            const taxAmount = grossSalary * 0.2; // 20% tax
            const deductions = taxAmount;
            const netSalary = grossSalary - deductions;

            insertPayslip.run(uuidv4(), id, emp.id, grossSalary, overtimePay, 0, deductions, taxAmount, netSalary);

            totalGross += grossSalary;
            totalDeductions += deductions;
            totalNet += netSalary;
        });

        // Update totals
        db.prepare(`
            UPDATE payroll_runs SET total_gross = ?, total_deductions = ?, total_net = ?
            WHERE id = ?
        `).run(totalGross, totalDeductions, totalNet, id);

        res.json({
            success: true,
            data: { id, employeeCount: employees.length, totalGross, totalNet },
            message: 'Payroll run created'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
