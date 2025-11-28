/**
 * SAP-like Enterprise Schema
 * Comprehensive business management database schema
 */

const { db } = require('./database');

const initSAPSchema = () => {
    console.log('Initializing SAP Enterprise Schema...');

    // ============================================
    // FINANCE MODULE (FI/CO)
    // ============================================

    // Chart of Accounts (План счетов)
    db.exec(`
        CREATE TABLE IF NOT EXISTS gl_accounts (
            id TEXT PRIMARY KEY,
            account_number TEXT UNIQUE NOT NULL,
            account_name TEXT NOT NULL,
            account_type TEXT CHECK(account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
            parent_account_id TEXT REFERENCES gl_accounts(id),
            is_active INTEGER DEFAULT 1,
            currency TEXT DEFAULT 'USD',
            organization_id TEXT REFERENCES organizations(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Journal Entries (Проводки)
    db.exec(`
        CREATE TABLE IF NOT EXISTS journal_entries (
            id TEXT PRIMARY KEY,
            entry_number TEXT UNIQUE NOT NULL,
            entry_date DATE NOT NULL,
            description TEXT,
            reference TEXT,
            status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'posted', 'reversed')),
            total_debit REAL DEFAULT 0,
            total_credit REAL DEFAULT 0,
            created_by TEXT REFERENCES users(id),
            approved_by TEXT REFERENCES users(id),
            organization_id TEXT REFERENCES organizations(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            posted_at DATETIME
        )
    `);

    // Journal Entry Lines
    db.exec(`
        CREATE TABLE IF NOT EXISTS journal_entry_lines (
            id TEXT PRIMARY KEY,
            journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
            account_id TEXT NOT NULL REFERENCES gl_accounts(id),
            debit_amount REAL DEFAULT 0,
            credit_amount REAL DEFAULT 0,
            description TEXT,
            cost_center_id TEXT REFERENCES cost_centers(id),
            project_id TEXT REFERENCES projects(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Cost Centers (Центры затрат)
    db.exec(`
        CREATE TABLE IF NOT EXISTS cost_centers (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            manager_id TEXT REFERENCES users(id),
            parent_id TEXT REFERENCES cost_centers(id),
            budget REAL DEFAULT 0,
            actual_spend REAL DEFAULT 0,
            organization_id TEXT REFERENCES organizations(id),
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Profit Centers
    db.exec(`
        CREATE TABLE IF NOT EXISTS profit_centers (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            manager_id TEXT REFERENCES users(id),
            target_revenue REAL DEFAULT 0,
            target_profit REAL DEFAULT 0,
            actual_revenue REAL DEFAULT 0,
            actual_profit REAL DEFAULT 0,
            organization_id TEXT REFERENCES organizations(id),
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Budgets
    db.exec(`
        CREATE TABLE IF NOT EXISTS budgets (
            id TEXT PRIMARY KEY,
            fiscal_year INTEGER NOT NULL,
            fiscal_period INTEGER,
            cost_center_id TEXT REFERENCES cost_centers(id),
            account_id TEXT REFERENCES gl_accounts(id),
            budget_amount REAL NOT NULL,
            actual_amount REAL DEFAULT 0,
            variance REAL GENERATED ALWAYS AS (budget_amount - actual_amount) STORED,
            organization_id TEXT REFERENCES organizations(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(fiscal_year, fiscal_period, cost_center_id, account_id)
        )
    `);

    // Invoices (AR/AP)
    db.exec(`
        CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY,
            invoice_number TEXT UNIQUE NOT NULL,
            invoice_type TEXT CHECK(invoice_type IN ('receivable', 'payable')),
            partner_id TEXT NOT NULL,
            partner_type TEXT CHECK(partner_type IN ('customer', 'vendor')),
            invoice_date DATE NOT NULL,
            due_date DATE NOT NULL,
            subtotal REAL NOT NULL,
            tax_amount REAL DEFAULT 0,
            total_amount REAL NOT NULL,
            paid_amount REAL DEFAULT 0,
            status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
            currency TEXT DEFAULT 'USD',
            notes TEXT,
            organization_id TEXT REFERENCES organizations(id),
            created_by TEXT REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Invoice Lines
    db.exec(`
        CREATE TABLE IF NOT EXISTS invoice_lines (
            id TEXT PRIMARY KEY,
            invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
            product_id TEXT REFERENCES products(id),
            description TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit_price REAL NOT NULL,
            discount_percent REAL DEFAULT 0,
            tax_rate REAL DEFAULT 0,
            line_total REAL NOT NULL,
            account_id TEXT REFERENCES gl_accounts(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Payments
    db.exec(`
        CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            payment_number TEXT UNIQUE NOT NULL,
            payment_type TEXT CHECK(payment_type IN ('incoming', 'outgoing')),
            invoice_id TEXT REFERENCES invoices(id),
            partner_id TEXT NOT NULL,
            amount REAL NOT NULL,
            payment_date DATE NOT NULL,
            payment_method TEXT CHECK(payment_method IN ('cash', 'bank_transfer', 'credit_card', 'check', 'other')),
            reference TEXT,
            bank_account TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')),
            organization_id TEXT REFERENCES organizations(id),
            created_by TEXT REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // ============================================
    // HR MODULE (HCM)
    // ============================================

    // Employees (extends users)
    db.exec(`
        CREATE TABLE IF NOT EXISTS employees (
            id TEXT PRIMARY KEY,
            user_id TEXT UNIQUE REFERENCES users(id),
            employee_number TEXT UNIQUE NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            date_of_birth DATE,
            gender TEXT,
            national_id TEXT,
            hire_date DATE NOT NULL,
            termination_date DATE,
            employment_status TEXT DEFAULT 'active' CHECK(employment_status IN ('active', 'on_leave', 'terminated', 'suspended')),
            employment_type TEXT CHECK(employment_type IN ('full_time', 'part_time', 'contractor', 'intern')),
            position_id TEXT REFERENCES positions(id),
            department_id TEXT REFERENCES departments(id),
            manager_id TEXT REFERENCES employees(id),
            cost_center_id TEXT REFERENCES cost_centers(id),
            work_location TEXT,
            phone TEXT,
            emergency_contact TEXT,
            emergency_phone TEXT,
            bank_account TEXT,
            tax_id TEXT,
            organization_id TEXT REFERENCES organizations(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Departments
    db.exec(`
        CREATE TABLE IF NOT EXISTS departments (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            parent_id TEXT REFERENCES departments(id),
            manager_id TEXT REFERENCES employees(id),
            cost_center_id TEXT REFERENCES cost_centers(id),
            organization_id TEXT REFERENCES organizations(id),
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Positions
    db.exec(`
        CREATE TABLE IF NOT EXISTS positions (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            department_id TEXT REFERENCES departments(id),
            job_grade TEXT,
            min_salary REAL,
            max_salary REAL,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Salary/Compensation
    db.exec(`
        CREATE TABLE IF NOT EXISTS employee_compensation (
            id TEXT PRIMARY KEY,
            employee_id TEXT NOT NULL REFERENCES employees(id),
            effective_date DATE NOT NULL,
            end_date DATE,
            base_salary REAL NOT NULL,
            currency TEXT DEFAULT 'USD',
            pay_frequency TEXT CHECK(pay_frequency IN ('weekly', 'biweekly', 'monthly', 'annually')),
            bonus_target REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Time Tracking
    db.exec(`
        CREATE TABLE IF NOT EXISTS time_entries (
            id TEXT PRIMARY KEY,
            employee_id TEXT NOT NULL REFERENCES employees(id),
            entry_date DATE NOT NULL,
            clock_in DATETIME,
            clock_out DATETIME,
            break_duration INTEGER DEFAULT 0,
            total_hours REAL,
            overtime_hours REAL DEFAULT 0,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
            project_id TEXT REFERENCES projects(id),
            task_id TEXT REFERENCES tasks(id),
            notes TEXT,
            approved_by TEXT REFERENCES employees(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Leave Requests
    db.exec(`
        CREATE TABLE IF NOT EXISTS leave_requests (
            id TEXT PRIMARY KEY,
            employee_id TEXT NOT NULL REFERENCES employees(id),
            leave_type TEXT CHECK(leave_type IN ('vacation', 'sick', 'personal', 'maternity', 'paternity', 'unpaid', 'other')),
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            days_requested REAL NOT NULL,
            reason TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled')),
            approved_by TEXT REFERENCES employees(id),
            approved_at DATETIME,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Leave Balances
    db.exec(`
        CREATE TABLE IF NOT EXISTS leave_balances (
            id TEXT PRIMARY KEY,
            employee_id TEXT NOT NULL REFERENCES employees(id),
            leave_type TEXT NOT NULL,
            fiscal_year INTEGER NOT NULL,
            entitled_days REAL NOT NULL,
            used_days REAL DEFAULT 0,
            pending_days REAL DEFAULT 0,
            remaining_days REAL GENERATED ALWAYS AS (entitled_days - used_days - pending_days) STORED,
            UNIQUE(employee_id, leave_type, fiscal_year)
        )
    `);

    // Payroll
    db.exec(`
        CREATE TABLE IF NOT EXISTS payroll_runs (
            id TEXT PRIMARY KEY,
            pay_period_start DATE NOT NULL,
            pay_period_end DATE NOT NULL,
            payment_date DATE NOT NULL,
            status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'processing', 'completed', 'cancelled')),
            total_gross REAL DEFAULT 0,
            total_deductions REAL DEFAULT 0,
            total_net REAL DEFAULT 0,
            employee_count INTEGER DEFAULT 0,
            organization_id TEXT REFERENCES organizations(id),
            created_by TEXT REFERENCES users(id),
            approved_by TEXT REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Payslips
    db.exec(`
        CREATE TABLE IF NOT EXISTS payslips (
            id TEXT PRIMARY KEY,
            payroll_run_id TEXT NOT NULL REFERENCES payroll_runs(id),
            employee_id TEXT NOT NULL REFERENCES employees(id),
            gross_salary REAL NOT NULL,
            overtime_pay REAL DEFAULT 0,
            bonuses REAL DEFAULT 0,
            deductions REAL DEFAULT 0,
            tax_amount REAL DEFAULT 0,
            net_salary REAL NOT NULL,
            payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'failed')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // ============================================
    // MATERIALS MANAGEMENT (MM)
    // ============================================

    // Products/Materials
    db.exec(`
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            sku TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            category_id TEXT REFERENCES product_categories(id),
            product_type TEXT CHECK(product_type IN ('goods', 'service', 'raw_material', 'finished_good')),
            unit_of_measure TEXT DEFAULT 'EA',
            unit_price REAL DEFAULT 0,
            cost_price REAL DEFAULT 0,
            min_stock_level INTEGER DEFAULT 0,
            max_stock_level INTEGER,
            reorder_point INTEGER DEFAULT 0,
            lead_time_days INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            organization_id TEXT REFERENCES organizations(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Product Categories
    db.exec(`
        CREATE TABLE IF NOT EXISTS product_categories (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            parent_id TEXT REFERENCES product_categories(id),
            description TEXT,
            organization_id TEXT REFERENCES organizations(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Warehouses
    db.exec(`
        CREATE TABLE IF NOT EXISTS warehouses (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            address TEXT,
            manager_id TEXT REFERENCES employees(id),
            is_active INTEGER DEFAULT 1,
            organization_id TEXT REFERENCES organizations(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Inventory
    db.exec(`
        CREATE TABLE IF NOT EXISTS inventory (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL REFERENCES products(id),
            warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
            quantity_on_hand INTEGER DEFAULT 0,
            quantity_reserved INTEGER DEFAULT 0,
            quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
            last_count_date DATE,
            last_movement_date DATE,
            UNIQUE(product_id, warehouse_id)
        )
    `);

    // Inventory Movements
    db.exec(`
        CREATE TABLE IF NOT EXISTS inventory_movements (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL REFERENCES products(id),
            warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
            movement_type TEXT CHECK(movement_type IN ('receipt', 'issue', 'transfer', 'adjustment', 'return')),
            quantity INTEGER NOT NULL,
            reference_type TEXT,
            reference_id TEXT,
            unit_cost REAL,
            notes TEXT,
            created_by TEXT REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Vendors/Suppliers
    db.exec(`
        CREATE TABLE IF NOT EXISTS vendors (
            id TEXT PRIMARY KEY,
            vendor_code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            contact_name TEXT,
            email TEXT,
            phone TEXT,
            address TEXT,
            city TEXT,
            country TEXT,
            payment_terms INTEGER DEFAULT 30,
            currency TEXT DEFAULT 'USD',
            tax_id TEXT,
            rating INTEGER DEFAULT 3 CHECK(rating BETWEEN 1 AND 5),
            is_active INTEGER DEFAULT 1,
            organization_id TEXT REFERENCES organizations(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Purchase Requisitions
    db.exec(`
        CREATE TABLE IF NOT EXISTS purchase_requisitions (
            id TEXT PRIMARY KEY,
            requisition_number TEXT UNIQUE NOT NULL,
            requestor_id TEXT NOT NULL REFERENCES employees(id),
            department_id TEXT REFERENCES departments(id),
            required_date DATE,
            priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
            status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'approved', 'rejected', 'ordered', 'cancelled')),
            total_amount REAL DEFAULT 0,
            notes TEXT,
            approved_by TEXT REFERENCES employees(id),
            approved_at DATETIME,
            organization_id TEXT REFERENCES organizations(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Purchase Requisition Lines
    db.exec(`
        CREATE TABLE IF NOT EXISTS purchase_requisition_lines (
            id TEXT PRIMARY KEY,
            requisition_id TEXT NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
            product_id TEXT REFERENCES products(id),
            description TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit_price REAL,
            preferred_vendor_id TEXT REFERENCES vendors(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Purchase Orders
    db.exec(`
        CREATE TABLE IF NOT EXISTS purchase_orders (
            id TEXT PRIMARY KEY,
            po_number TEXT UNIQUE NOT NULL,
            vendor_id TEXT NOT NULL REFERENCES vendors(id),
            requisition_id TEXT REFERENCES purchase_requisitions(id),
            order_date DATE NOT NULL,
            expected_delivery DATE,
            status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled')),
            subtotal REAL DEFAULT 0,
            tax_amount REAL DEFAULT 0,
            total_amount REAL DEFAULT 0,
            payment_terms INTEGER,
            shipping_address TEXT,
            notes TEXT,
            created_by TEXT REFERENCES users(id),
            approved_by TEXT REFERENCES users(id),
            organization_id TEXT REFERENCES organizations(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Purchase Order Lines
    db.exec(`
        CREATE TABLE IF NOT EXISTS purchase_order_lines (
            id TEXT PRIMARY KEY,
            purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
            product_id TEXT REFERENCES products(id),
            description TEXT NOT NULL,
            quantity_ordered REAL NOT NULL,
            quantity_received REAL DEFAULT 0,
            unit_price REAL NOT NULL,
            tax_rate REAL DEFAULT 0,
            line_total REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Goods Receipts
    db.exec(`
        CREATE TABLE IF NOT EXISTS goods_receipts (
            id TEXT PRIMARY KEY,
            receipt_number TEXT UNIQUE NOT NULL,
            purchase_order_id TEXT REFERENCES purchase_orders(id),
            vendor_id TEXT NOT NULL REFERENCES vendors(id),
            warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
            receipt_date DATE NOT NULL,
            status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'posted', 'cancelled')),
            notes TEXT,
            received_by TEXT REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // ============================================
    // SALES & DISTRIBUTION (SD)
    // ============================================

    // Customers
    db.exec(`
        CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            customer_code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            customer_type TEXT CHECK(customer_type IN ('individual', 'business')),
            contact_name TEXT,
            email TEXT,
            phone TEXT,
            billing_address TEXT,
            shipping_address TEXT,
            city TEXT,
            country TEXT,
            payment_terms INTEGER DEFAULT 30,
            credit_limit REAL DEFAULT 0,
            current_balance REAL DEFAULT 0,
            currency TEXT DEFAULT 'USD',
            tax_id TEXT,
            sales_rep_id TEXT REFERENCES employees(id),
            customer_group TEXT,
            is_active INTEGER DEFAULT 1,
            organization_id TEXT REFERENCES organizations(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Sales Quotations
    db.exec(`
        CREATE TABLE IF NOT EXISTS sales_quotations (
            id TEXT PRIMARY KEY,
            quotation_number TEXT UNIQUE NOT NULL,
            customer_id TEXT NOT NULL REFERENCES customers(id),
            quotation_date DATE NOT NULL,
            valid_until DATE,
            status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
            subtotal REAL DEFAULT 0,
            discount_amount REAL DEFAULT 0,
            tax_amount REAL DEFAULT 0,
            total_amount REAL DEFAULT 0,
            notes TEXT,
            created_by TEXT REFERENCES users(id),
            organization_id TEXT REFERENCES organizations(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Sales Orders
    db.exec(`
        CREATE TABLE IF NOT EXISTS sales_orders (
            id TEXT PRIMARY KEY,
            order_number TEXT UNIQUE NOT NULL,
            customer_id TEXT NOT NULL REFERENCES customers(id),
            quotation_id TEXT REFERENCES sales_quotations(id),
            order_date DATE NOT NULL,
            requested_delivery_date DATE,
            status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
            subtotal REAL DEFAULT 0,
            discount_amount REAL DEFAULT 0,
            tax_amount REAL DEFAULT 0,
            shipping_amount REAL DEFAULT 0,
            total_amount REAL DEFAULT 0,
            shipping_address TEXT,
            billing_address TEXT,
            payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'partial', 'paid')),
            notes TEXT,
            created_by TEXT REFERENCES users(id),
            organization_id TEXT REFERENCES organizations(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Sales Order Lines
    db.exec(`
        CREATE TABLE IF NOT EXISTS sales_order_lines (
            id TEXT PRIMARY KEY,
            sales_order_id TEXT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
            product_id TEXT NOT NULL REFERENCES products(id),
            description TEXT,
            quantity REAL NOT NULL,
            unit_price REAL NOT NULL,
            discount_percent REAL DEFAULT 0,
            tax_rate REAL DEFAULT 0,
            line_total REAL NOT NULL,
            quantity_shipped REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Shipments
    db.exec(`
        CREATE TABLE IF NOT EXISTS shipments (
            id TEXT PRIMARY KEY,
            shipment_number TEXT UNIQUE NOT NULL,
            sales_order_id TEXT NOT NULL REFERENCES sales_orders(id),
            warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
            shipment_date DATE NOT NULL,
            carrier TEXT,
            tracking_number TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'shipped', 'in_transit', 'delivered', 'returned')),
            shipping_cost REAL DEFAULT 0,
            notes TEXT,
            created_by TEXT REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // ============================================
    // CRM MODULE
    // ============================================

    // Leads
    db.exec(`
        CREATE TABLE IF NOT EXISTS crm_leads (
            id TEXT PRIMARY KEY,
            lead_number TEXT UNIQUE NOT NULL,
            first_name TEXT,
            last_name TEXT,
            company TEXT,
            email TEXT,
            phone TEXT,
            source TEXT CHECK(source IN ('website', 'referral', 'cold_call', 'trade_show', 'advertising', 'social_media', 'other')),
            status TEXT DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost')),
            rating TEXT DEFAULT 'warm' CHECK(rating IN ('hot', 'warm', 'cold')),
            industry TEXT,
            estimated_value REAL,
            notes TEXT,
            assigned_to TEXT REFERENCES employees(id),
            converted_to_customer_id TEXT REFERENCES customers(id),
            converted_at DATETIME,
            organization_id TEXT REFERENCES organizations(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Opportunities
    db.exec(`
        CREATE TABLE IF NOT EXISTS crm_opportunities (
            id TEXT PRIMARY KEY,
            opportunity_number TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            customer_id TEXT REFERENCES customers(id),
            lead_id TEXT REFERENCES crm_leads(id),
            stage TEXT DEFAULT 'prospecting' CHECK(stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
            probability INTEGER DEFAULT 10 CHECK(probability BETWEEN 0 AND 100),
            expected_value REAL,
            expected_close_date DATE,
            actual_close_date DATE,
            actual_value REAL,
            source TEXT,
            assigned_to TEXT REFERENCES employees(id),
            notes TEXT,
            organization_id TEXT REFERENCES organizations(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Activities
    db.exec(`
        CREATE TABLE IF NOT EXISTS crm_activities (
            id TEXT PRIMARY KEY,
            activity_type TEXT CHECK(activity_type IN ('call', 'email', 'meeting', 'task', 'note')),
            subject TEXT NOT NULL,
            description TEXT,
            related_type TEXT CHECK(related_type IN ('lead', 'customer', 'opportunity', 'contact')),
            related_id TEXT,
            due_date DATETIME,
            completed_at DATETIME,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
            priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high')),
            assigned_to TEXT REFERENCES employees(id),
            organization_id TEXT REFERENCES organizations(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Service Tickets
    db.exec(`
        CREATE TABLE IF NOT EXISTS service_tickets (
            id TEXT PRIMARY KEY,
            ticket_number TEXT UNIQUE NOT NULL,
            customer_id TEXT NOT NULL REFERENCES customers(id),
            subject TEXT NOT NULL,
            description TEXT,
            category TEXT,
            priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
            status TEXT DEFAULT 'new' CHECK(status IN ('new', 'open', 'pending', 'resolved', 'closed')),
            assigned_to TEXT REFERENCES employees(id),
            resolution TEXT,
            resolved_at DATETIME,
            satisfaction_rating INTEGER CHECK(satisfaction_rating BETWEEN 1 AND 5),
            sla_due_date DATETIME,
            organization_id TEXT REFERENCES organizations(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // ============================================
    // PROJECT MANAGEMENT
    // ============================================

    // Projects
    db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            project_code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            project_type TEXT CHECK(project_type IN ('internal', 'external', 'investment')),
            customer_id TEXT REFERENCES customers(id),
            manager_id TEXT REFERENCES employees(id),
            status TEXT DEFAULT 'planning' CHECK(status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
            priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
            start_date DATE,
            end_date DATE,
            actual_start_date DATE,
            actual_end_date DATE,
            budget REAL DEFAULT 0,
            actual_cost REAL DEFAULT 0,
            cost_center_id TEXT REFERENCES cost_centers(id),
            profit_center_id TEXT REFERENCES profit_centers(id),
            completion_percent INTEGER DEFAULT 0,
            organization_id TEXT REFERENCES organizations(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Project Milestones (WBS Elements)
    db.exec(`
        CREATE TABLE IF NOT EXISTS project_milestones (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            wbs_code TEXT,
            name TEXT NOT NULL,
            description TEXT,
            due_date DATE,
            completed_at DATE,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'delayed')),
            deliverables TEXT DEFAULT '[]',
            dependencies TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Project Resources
    db.exec(`
        CREATE TABLE IF NOT EXISTS project_resources (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            employee_id TEXT NOT NULL REFERENCES employees(id),
            role TEXT,
            allocation_percent INTEGER DEFAULT 100,
            planned_hours REAL DEFAULT 0,
            actual_hours REAL DEFAULT 0,
            hourly_rate REAL DEFAULT 0,
            start_date DATE,
            end_date DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(project_id, employee_id)
        )
    `);

    // ============================================
    // APPROVAL WORKFLOW
    // ============================================

    // Approval Rules
    db.exec(`
        CREATE TABLE IF NOT EXISTS approval_rules (
            id TEXT PRIMARY KEY,
            organization_id TEXT REFERENCES organizations(id),
            document_type TEXT NOT NULL,
            approval_level INTEGER DEFAULT 1,
            approver_id TEXT REFERENCES users(id),
            approver_role TEXT,
            min_amount REAL,
            max_amount REAL,
            conditions TEXT DEFAULT '{}',
            auto_approve INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Approval Requests
    db.exec(`
        CREATE TABLE IF NOT EXISTS approval_requests (
            id TEXT PRIMARY KEY,
            request_number TEXT UNIQUE NOT NULL,
            organization_id TEXT REFERENCES organizations(id),
            requester_id TEXT NOT NULL REFERENCES users(id),
            document_type TEXT NOT NULL,
            document_id TEXT,
            document_data TEXT DEFAULT '{}',
            amount REAL,
            description TEXT,
            urgency TEXT DEFAULT 'normal' CHECK(urgency IN ('low', 'normal', 'high', 'urgent')),
            current_approver_id TEXT REFERENCES users(id),
            current_level INTEGER DEFAULT 1,
            total_levels INTEGER DEFAULT 1,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'revision_requested', 'cancelled')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME
        )
    `);

    // Approval History
    db.exec(`
        CREATE TABLE IF NOT EXISTS approval_history (
            id TEXT PRIMARY KEY,
            request_id TEXT NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
            approver_id TEXT NOT NULL REFERENCES users(id),
            action TEXT CHECK(action IN ('approved', 'rejected', 'revision_requested', 'resubmitted', 'forwarded')),
            level INTEGER,
            comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // ============================================
    // INDEXES
    // ============================================

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
        CREATE INDEX IF NOT EXISTS idx_invoices_partner ON invoices(partner_id, partner_type);
        CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
        CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
        CREATE INDEX IF NOT EXISTS idx_time_entries_emp ON time_entries(employee_id, entry_date);
        CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
        CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor ON purchase_orders(vendor_id);
        CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
        CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
        CREATE INDEX IF NOT EXISTS idx_crm_opportunities_stage ON crm_opportunities(stage);
        CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
        CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
    `);

    // ============================================
    // MIGRATIONS - Add columns to existing tables
    // ============================================

    // Add project_id and milestone_id to tasks table
    const taskMigrations = [
        { name: 'project_id', type: 'TEXT REFERENCES projects(id)' },
        { name: 'milestone_id', type: 'TEXT REFERENCES project_milestones(id)' }
    ];

    taskMigrations.forEach(col => {
        try {
            db.exec(`ALTER TABLE tasks ADD COLUMN ${col.name} ${col.type}`);
        } catch (err) {
            // Column already exists - ignore
        }
    });

    console.log('SAP Enterprise Schema initialized successfully!');
};

module.exports = { initSAPSchema };
