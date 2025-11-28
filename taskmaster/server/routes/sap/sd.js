/**
 * SAP Sales & Distribution (SD)
 * Customers, Quotations, Sales Orders, Shipments
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../../models/database');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

// ============================================
// CUSTOMERS
// ============================================

router.get('/customers', (req, res) => {
    try {
        const { search, group, active, limit = 100 } = req.query;

        let query = `
            SELECT c.*, e.first_name || ' ' || e.last_name as sales_rep_name
            FROM customers c
            LEFT JOIN employees e ON c.sales_rep_id = e.id
            WHERE c.organization_id = ?
        `;
        const params = [req.user.organizationId];

        if (search) {
            query += ' AND (c.name LIKE ? OR c.customer_code LIKE ? OR c.email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (group) {
            query += ' AND c.customer_group = ?';
            params.push(group);
        }
        if (active !== undefined) {
            query += ' AND c.is_active = ?';
            params.push(active === 'true' ? 1 : 0);
        }

        query += ' ORDER BY c.name LIMIT ?';
        params.push(parseInt(limit));

        const customers = db.prepare(query).all(...params);
        res.json({ success: true, data: customers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/customers/:id', (req, res) => {
    try {
        const customer = db.prepare(`
            SELECT c.*, e.first_name || ' ' || e.last_name as sales_rep_name
            FROM customers c
            LEFT JOIN employees e ON c.sales_rep_id = e.id
            WHERE c.id = ? AND c.organization_id = ?
        `).get(req.params.id, req.user.organizationId);

        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        // Get recent orders
        const recentOrders = db.prepare(`
            SELECT * FROM sales_orders WHERE customer_id = ? ORDER BY order_date DESC LIMIT 10
        `).all(customer.id);

        // Get open opportunities
        const opportunities = db.prepare(`
            SELECT * FROM crm_opportunities WHERE customer_id = ? AND stage NOT IN ('closed_won', 'closed_lost')
        `).all(customer.id);

        res.json({ success: true, data: { ...customer, recentOrders, opportunities } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/customers', authorize('admin', 'manager'), (req, res) => {
    try {
        const {
            name, customerType, contactName, email, phone,
            billingAddress, shippingAddress, city, country,
            paymentTerms, creditLimit, currency, taxId, salesRepId, customerGroup
        } = req.body;

        const id = uuidv4();
        const customerCode = `CUS-${Date.now().toString(36).toUpperCase()}`;

        db.prepare(`
            INSERT INTO customers (
                id, customer_code, name, customer_type, contact_name, email, phone,
                billing_address, shipping_address, city, country, payment_terms,
                credit_limit, currency, tax_id, sales_rep_id, customer_group, organization_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, customerCode, name, customerType || 'business', contactName, email, phone,
            billingAddress, shippingAddress, city, country, paymentTerms || 30,
            creditLimit || 0, currency || 'USD', taxId, salesRepId, customerGroup, req.user.organizationId
        );

        res.json({ success: true, data: { id, customerCode }, message: 'Customer created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// SALES QUOTATIONS
// ============================================

router.get('/quotations', (req, res) => {
    try {
        const { customerId, status, limit = 50 } = req.query;

        let query = `
            SELECT sq.*, c.name as customer_name
            FROM sales_quotations sq
            JOIN customers c ON sq.customer_id = c.id
            WHERE sq.organization_id = ?
        `;
        const params = [req.user.organizationId];

        if (customerId) {
            query += ' AND sq.customer_id = ?';
            params.push(customerId);
        }
        if (status) {
            query += ' AND sq.status = ?';
            params.push(status);
        }

        query += ' ORDER BY sq.quotation_date DESC LIMIT ?';
        params.push(parseInt(limit));

        const quotations = db.prepare(query).all(...params);
        res.json({ success: true, data: quotations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/quotations', (req, res) => {
    try {
        const { customerId, validUntil, lines, notes, discountAmount } = req.body;

        const subtotal = lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);
        const taxAmount = lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice * (l.taxRate || 0) / 100), 0);
        const totalAmount = subtotal - (discountAmount || 0) + taxAmount;

        const id = uuidv4();
        const quotationNumber = `QT-${Date.now().toString(36).toUpperCase()}`;

        db.prepare(`
            INSERT INTO sales_quotations (
                id, quotation_number, customer_id, quotation_date, valid_until,
                subtotal, discount_amount, tax_amount, total_amount, notes,
                created_by, organization_id
            ) VALUES (?, ?, ?, date('now'), ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, quotationNumber, customerId, validUntil,
            subtotal, discountAmount || 0, taxAmount, totalAmount, notes,
            req.user.id, req.user.organizationId
        );

        res.json({ success: true, data: { id, quotationNumber, totalAmount }, message: 'Quotation created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// SALES ORDERS
// ============================================

router.get('/orders', (req, res) => {
    try {
        const { customerId, status, paymentStatus, limit = 50 } = req.query;

        let query = `
            SELECT so.*, c.name as customer_name
            FROM sales_orders so
            JOIN customers c ON so.customer_id = c.id
            WHERE so.organization_id = ?
        `;
        const params = [req.user.organizationId];

        if (customerId) {
            query += ' AND so.customer_id = ?';
            params.push(customerId);
        }
        if (status) {
            query += ' AND so.status = ?';
            params.push(status);
        }
        if (paymentStatus) {
            query += ' AND so.payment_status = ?';
            params.push(paymentStatus);
        }

        query += ' ORDER BY so.order_date DESC LIMIT ?';
        params.push(parseInt(limit));

        const orders = db.prepare(query).all(...params);
        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/orders/:id', (req, res) => {
    try {
        const order = db.prepare(`
            SELECT so.*, c.name as customer_name, c.email as customer_email
            FROM sales_orders so
            JOIN customers c ON so.customer_id = c.id
            WHERE so.id = ? AND so.organization_id = ?
        `).get(req.params.id, req.user.organizationId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const lines = db.prepare(`
            SELECT sol.*, p.name as product_name, p.sku
            FROM sales_order_lines sol
            LEFT JOIN products p ON sol.product_id = p.id
            WHERE sol.sales_order_id = ?
        `).all(order.id);

        const shipments = db.prepare(`
            SELECT * FROM shipments WHERE sales_order_id = ? ORDER BY shipment_date DESC
        `).all(order.id);

        res.json({ success: true, data: { ...order, lines, shipments } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/orders', (req, res) => {
    try {
        const {
            customerId, quotationId, requestedDeliveryDate, lines,
            discountAmount, shippingAmount, shippingAddress, billingAddress, notes
        } = req.body;

        // Check credit limit
        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
        const subtotal = lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice * (1 - (l.discountPercent || 0) / 100)), 0);
        const taxAmount = lines.reduce((sum, l) => {
            const lineSubtotal = l.quantity * l.unitPrice * (1 - (l.discountPercent || 0) / 100);
            return sum + (lineSubtotal * (l.taxRate || 0) / 100);
        }, 0);
        const totalAmount = subtotal - (discountAmount || 0) + taxAmount + (shippingAmount || 0);

        if (customer.credit_limit > 0 && customer.current_balance + totalAmount > customer.credit_limit) {
            return res.status(400).json({ success: false, message: 'Credit limit exceeded' });
        }

        const id = uuidv4();
        const orderNumber = `SO-${Date.now().toString(36).toUpperCase()}`;

        db.prepare(`
            INSERT INTO sales_orders (
                id, order_number, customer_id, quotation_id, order_date, requested_delivery_date,
                subtotal, discount_amount, tax_amount, shipping_amount, total_amount,
                shipping_address, billing_address, notes, created_by, organization_id
            ) VALUES (?, ?, ?, ?, date('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, orderNumber, customerId, quotationId, requestedDeliveryDate,
            subtotal, discountAmount || 0, taxAmount, shippingAmount || 0, totalAmount,
            shippingAddress || customer.shipping_address, billingAddress || customer.billing_address,
            notes, req.user.id, req.user.organizationId
        );

        // Insert lines
        const insertLine = db.prepare(`
            INSERT INTO sales_order_lines (id, sales_order_id, product_id, description, quantity, unit_price, discount_percent, tax_rate, line_total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        lines.forEach(line => {
            const lineTotal = line.quantity * line.unitPrice * (1 - (line.discountPercent || 0) / 100);
            insertLine.run(uuidv4(), id, line.productId, line.description, line.quantity, line.unitPrice, line.discountPercent || 0, line.taxRate || 0, lineTotal);
        });

        // Update customer balance
        db.prepare('UPDATE customers SET current_balance = current_balance + ? WHERE id = ?').run(totalAmount, customerId);

        // Update quotation if linked
        if (quotationId) {
            db.prepare("UPDATE sales_quotations SET status = 'accepted' WHERE id = ?").run(quotationId);
        }

        res.json({ success: true, data: { id, orderNumber, totalAmount }, message: 'Sales order created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/orders/:id/status', authorize('admin', 'manager'), (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        db.prepare('UPDATE sales_orders SET status = ? WHERE id = ? AND organization_id = ?').run(status, id, req.user.organizationId);

        res.json({ success: true, message: 'Order status updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// SHIPMENTS
// ============================================

router.get('/shipments', (req, res) => {
    try {
        const { status, limit = 50 } = req.query;

        let query = `
            SELECT s.*, so.order_number, c.name as customer_name
            FROM shipments s
            JOIN sales_orders so ON s.sales_order_id = so.id
            JOIN customers c ON so.customer_id = c.id
            WHERE so.organization_id = ?
        `;
        const params = [req.user.organizationId];

        if (status) {
            query += ' AND s.status = ?';
            params.push(status);
        }

        query += ' ORDER BY s.shipment_date DESC LIMIT ?';
        params.push(parseInt(limit));

        const shipments = db.prepare(query).all(...params);
        res.json({ success: true, data: shipments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/shipments', authorize('admin', 'manager'), (req, res) => {
    try {
        const { salesOrderId, warehouseId, lines, carrier, trackingNumber, shippingCost, notes } = req.body;

        const order = db.prepare('SELECT * FROM sales_orders WHERE id = ? AND organization_id = ?').get(salesOrderId, req.user.organizationId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Sales order not found' });
        }

        const id = uuidv4();
        const shipmentNumber = `SHP-${Date.now().toString(36).toUpperCase()}`;

        db.prepare(`
            INSERT INTO shipments (
                id, shipment_number, sales_order_id, warehouse_id, shipment_date,
                carrier, tracking_number, shipping_cost, notes, status, created_by
            ) VALUES (?, ?, ?, ?, date('now'), ?, ?, ?, ?, 'shipped', ?)
        `).run(id, shipmentNumber, salesOrderId, warehouseId, carrier, trackingNumber, shippingCost || 0, notes, req.user.id);

        // Update order lines and inventory
        lines.forEach(line => {
            // Update shipped quantity
            db.prepare(`
                UPDATE sales_order_lines SET quantity_shipped = quantity_shipped + ? WHERE id = ?
            `).run(line.quantityShipped, line.lineId);

            // Reduce inventory
            db.prepare(`
                UPDATE inventory SET quantity_on_hand = quantity_on_hand - ?, last_movement_date = date('now')
                WHERE product_id = ? AND warehouse_id = ?
            `).run(line.quantityShipped, line.productId, warehouseId);

            // Record movement
            db.prepare(`
                INSERT INTO inventory_movements (id, product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, created_by)
                VALUES (?, ?, ?, 'issue', ?, 'shipment', ?, ?)
            `).run(uuidv4(), line.productId, warehouseId, -line.quantityShipped, id, req.user.id);
        });

        // Update order status
        const orderLines = db.prepare('SELECT * FROM sales_order_lines WHERE sales_order_id = ?').all(salesOrderId);
        const allShipped = orderLines.every(l => l.quantity_shipped >= l.quantity);
        const newStatus = allShipped ? 'shipped' : 'processing';
        db.prepare('UPDATE sales_orders SET status = ? WHERE id = ?').run(newStatus, salesOrderId);

        res.json({ success: true, data: { id, shipmentNumber }, message: 'Shipment created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/shipments/:id/status', authorize('admin', 'manager'), (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        db.prepare('UPDATE shipments SET status = ? WHERE id = ?').run(status, id);

        // If delivered, update sales order
        if (status === 'delivered') {
            const shipment = db.prepare('SELECT sales_order_id FROM shipments WHERE id = ?').get(id);
            db.prepare("UPDATE sales_orders SET status = 'delivered' WHERE id = ?").run(shipment.sales_order_id);
        }

        res.json({ success: true, message: 'Shipment status updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// REPORTS
// ============================================

router.get('/reports/sales-summary', (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const end = endDate || new Date().toISOString().split('T')[0];

        const summary = db.prepare(`
            SELECT
                COUNT(*) as total_orders,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(AVG(total_amount), 0) as avg_order_value,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
                SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_orders
            FROM sales_orders
            WHERE organization_id = ? AND order_date BETWEEN ? AND ?
        `).get(req.user.organizationId, start, end);

        const topProducts = db.prepare(`
            SELECT p.name, p.sku, SUM(sol.quantity) as total_quantity, SUM(sol.line_total) as total_revenue
            FROM sales_order_lines sol
            JOIN products p ON sol.product_id = p.id
            JOIN sales_orders so ON sol.sales_order_id = so.id
            WHERE so.organization_id = ? AND so.order_date BETWEEN ? AND ?
            GROUP BY sol.product_id
            ORDER BY total_revenue DESC
            LIMIT 10
        `).all(req.user.organizationId, start, end);

        const topCustomers = db.prepare(`
            SELECT c.name, c.customer_code, COUNT(so.id) as order_count, SUM(so.total_amount) as total_revenue
            FROM sales_orders so
            JOIN customers c ON so.customer_id = c.id
            WHERE so.organization_id = ? AND so.order_date BETWEEN ? AND ?
            GROUP BY so.customer_id
            ORDER BY total_revenue DESC
            LIMIT 10
        `).all(req.user.organizationId, start, end);

        res.json({
            success: true,
            data: {
                period: { startDate: start, endDate: end },
                summary,
                topProducts,
                topCustomers
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
