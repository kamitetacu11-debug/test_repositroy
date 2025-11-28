/**
 * SAP Finance Module (FI/CO)
 * General Ledger, AP/AR, Cost Centers, Budgets
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../../models/database');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

// ============================================
// CHART OF ACCOUNTS
// ============================================

// Get all GL accounts
router.get('/accounts', (req, res) => {
    try {
        const accounts = db.prepare(`
            SELECT a.*, p.account_name as parent_name
            FROM gl_accounts a
            LEFT JOIN gl_accounts p ON a.parent_account_id = p.id
            WHERE a.organization_id = ?
            ORDER BY a.account_number
        `).all(req.user.organizationId);

        res.json({ success: true, data: accounts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create GL account
router.post('/accounts', authorize('admin', 'manager'), (req, res) => {
    try {
        const { accountNumber, accountName, accountType, parentAccountId, currency } = req.body;
        const id = uuidv4();

        db.prepare(`
            INSERT INTO gl_accounts (id, account_number, account_name, account_type, parent_account_id, currency, organization_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, accountNumber, accountName, accountType, parentAccountId, currency || 'USD', req.user.organizationId);

        res.json({ success: true, data: { id }, message: 'Account created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// JOURNAL ENTRIES
// ============================================

// Get journal entries
router.get('/journal-entries', (req, res) => {
    try {
        const { status, startDate, endDate, limit = 50 } = req.query;

        let query = `
            SELECT je.*, u.full_name as created_by_name
            FROM journal_entries je
            LEFT JOIN users u ON je.created_by = u.id
            WHERE je.organization_id = ?
        `;
        const params = [req.user.organizationId];

        if (status) {
            query += ' AND je.status = ?';
            params.push(status);
        }
        if (startDate) {
            query += ' AND je.entry_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND je.entry_date <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY je.entry_date DESC LIMIT ?';
        params.push(parseInt(limit));

        const entries = db.prepare(query).all(...params);
        res.json({ success: true, data: entries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create journal entry
router.post('/journal-entries', authorize('admin', 'manager'), (req, res) => {
    try {
        const { entryDate, description, reference, lines } = req.body;

        if (!lines || lines.length < 2) {
            return res.status(400).json({ success: false, message: 'At least 2 lines required' });
        }

        const totalDebit = lines.reduce((sum, l) => sum + (l.debitAmount || 0), 0);
        const totalCredit = lines.reduce((sum, l) => sum + (l.creditAmount || 0), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return res.status(400).json({ success: false, message: 'Debits must equal credits' });
        }

        const id = uuidv4();
        const entryNumber = `JE-${Date.now()}`;

        db.prepare(`
            INSERT INTO journal_entries (id, entry_number, entry_date, description, reference, total_debit, total_credit, created_by, organization_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, entryNumber, entryDate, description, reference, totalDebit, totalCredit, req.user.id, req.user.organizationId);

        // Insert lines
        const insertLine = db.prepare(`
            INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_amount, credit_amount, description, cost_center_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        lines.forEach(line => {
            insertLine.run(uuidv4(), id, line.accountId, line.debitAmount || 0, line.creditAmount || 0, line.description, line.costCenterId);
        });

        res.json({ success: true, data: { id, entryNumber }, message: 'Journal entry created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Post journal entry
router.post('/journal-entries/:id/post', authorize('admin', 'manager'), (req, res) => {
    try {
        const { id } = req.params;

        db.prepare(`
            UPDATE journal_entries SET status = 'posted', posted_at = CURRENT_TIMESTAMP
            WHERE id = ? AND organization_id = ? AND status = 'draft'
        `).run(id, req.user.organizationId);

        res.json({ success: true, message: 'Journal entry posted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// COST CENTERS
// ============================================

router.get('/cost-centers', (req, res) => {
    try {
        const centers = db.prepare(`
            SELECT cc.*, u.full_name as manager_name, p.name as parent_name
            FROM cost_centers cc
            LEFT JOIN users u ON cc.manager_id = u.id
            LEFT JOIN cost_centers p ON cc.parent_id = p.id
            WHERE cc.organization_id = ?
            ORDER BY cc.code
        `).all(req.user.organizationId);

        res.json({ success: true, data: centers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/cost-centers', authorize('admin', 'manager'), (req, res) => {
    try {
        const { code, name, description, managerId, parentId, budget } = req.body;
        const id = uuidv4();

        db.prepare(`
            INSERT INTO cost_centers (id, code, name, description, manager_id, parent_id, budget, organization_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, code, name, description, managerId, parentId, budget || 0, req.user.organizationId);

        res.json({ success: true, data: { id }, message: 'Cost center created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// INVOICES (AP/AR)
// ============================================

router.get('/invoices', (req, res) => {
    try {
        const { type, status, limit = 50 } = req.query;

        let query = `SELECT * FROM invoices WHERE organization_id = ?`;
        const params = [req.user.organizationId];

        if (type) {
            query += ' AND invoice_type = ?';
            params.push(type);
        }
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY invoice_date DESC LIMIT ?';
        params.push(parseInt(limit));

        const invoices = db.prepare(query).all(...params);
        res.json({ success: true, data: invoices });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/invoices', authorize('admin', 'manager'), (req, res) => {
    try {
        const { invoiceType, partnerId, partnerType, invoiceDate, dueDate, lines, notes } = req.body;

        const subtotal = lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice * (1 - (l.discountPercent || 0) / 100)), 0);
        const taxAmount = lines.reduce((sum, l) => {
            const lineSubtotal = l.quantity * l.unitPrice * (1 - (l.discountPercent || 0) / 100);
            return sum + (lineSubtotal * (l.taxRate || 0) / 100);
        }, 0);
        const totalAmount = subtotal + taxAmount;

        const id = uuidv4();
        const invoiceNumber = `INV-${Date.now()}`;

        db.prepare(`
            INSERT INTO invoices (id, invoice_number, invoice_type, partner_id, partner_type, invoice_date, due_date, subtotal, tax_amount, total_amount, notes, organization_id, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, invoiceNumber, invoiceType, partnerId, partnerType, invoiceDate, dueDate, subtotal, taxAmount, totalAmount, notes, req.user.organizationId, req.user.id);

        // Insert lines
        const insertLine = db.prepare(`
            INSERT INTO invoice_lines (id, invoice_id, product_id, description, quantity, unit_price, discount_percent, tax_rate, line_total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        lines.forEach(line => {
            const lineTotal = line.quantity * line.unitPrice * (1 - (line.discountPercent || 0) / 100);
            insertLine.run(uuidv4(), id, line.productId, line.description, line.quantity, line.unitPrice, line.discountPercent || 0, line.taxRate || 0, lineTotal);
        });

        res.json({ success: true, data: { id, invoiceNumber, totalAmount }, message: 'Invoice created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// BUDGETS
// ============================================

router.get('/budgets', (req, res) => {
    try {
        const { fiscalYear, costCenterId } = req.query;

        let query = `
            SELECT b.*, cc.name as cost_center_name, ga.account_name
            FROM budgets b
            LEFT JOIN cost_centers cc ON b.cost_center_id = cc.id
            LEFT JOIN gl_accounts ga ON b.account_id = ga.id
            WHERE b.organization_id = ?
        `;
        const params = [req.user.organizationId];

        if (fiscalYear) {
            query += ' AND b.fiscal_year = ?';
            params.push(parseInt(fiscalYear));
        }
        if (costCenterId) {
            query += ' AND b.cost_center_id = ?';
            params.push(costCenterId);
        }

        const budgets = db.prepare(query).all(...params);
        res.json({ success: true, data: budgets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/budgets', authorize('admin', 'manager'), (req, res) => {
    try {
        const { fiscalYear, fiscalPeriod, costCenterId, accountId, budgetAmount } = req.body;
        const id = uuidv4();

        db.prepare(`
            INSERT INTO budgets (id, fiscal_year, fiscal_period, cost_center_id, account_id, budget_amount, organization_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(fiscal_year, fiscal_period, cost_center_id, account_id) DO UPDATE SET budget_amount = excluded.budget_amount
        `).run(id, fiscalYear, fiscalPeriod, costCenterId, accountId, budgetAmount, req.user.organizationId);

        res.json({ success: true, data: { id }, message: 'Budget saved' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// FINANCIAL REPORTS
// ============================================

router.get('/reports/trial-balance', (req, res) => {
    try {
        const { asOfDate } = req.query;
        const date = asOfDate || new Date().toISOString().split('T')[0];

        const trialBalance = db.prepare(`
            SELECT
                ga.account_number,
                ga.account_name,
                ga.account_type,
                COALESCE(SUM(jel.debit_amount), 0) as total_debit,
                COALESCE(SUM(jel.credit_amount), 0) as total_credit,
                COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) as balance
            FROM gl_accounts ga
            LEFT JOIN journal_entry_lines jel ON ga.id = jel.account_id
            LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted' AND je.entry_date <= ?
            WHERE ga.organization_id = ?
            GROUP BY ga.id
            HAVING total_debit > 0 OR total_credit > 0
            ORDER BY ga.account_number
        `).all(date, req.user.organizationId);

        res.json({ success: true, data: { asOfDate: date, accounts: trialBalance } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/reports/income-statement', (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const end = endDate || new Date().toISOString().split('T')[0];

        const revenues = db.prepare(`
            SELECT ga.account_name, COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) as amount
            FROM gl_accounts ga
            LEFT JOIN journal_entry_lines jel ON ga.id = jel.account_id
            LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted' AND je.entry_date BETWEEN ? AND ?
            WHERE ga.organization_id = ? AND ga.account_type = 'revenue'
            GROUP BY ga.id
        `).all(start, end, req.user.organizationId);

        const expenses = db.prepare(`
            SELECT ga.account_name, COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as amount
            FROM gl_accounts ga
            LEFT JOIN journal_entry_lines jel ON ga.id = jel.account_id
            LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted' AND je.entry_date BETWEEN ? AND ?
            WHERE ga.organization_id = ? AND ga.account_type = 'expense'
            GROUP BY ga.id
        `).all(start, end, req.user.organizationId);

        const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        res.json({
            success: true,
            data: {
                period: { startDate: start, endDate: end },
                revenues,
                expenses,
                totalRevenue,
                totalExpenses,
                netIncome: totalRevenue - totalExpenses
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
