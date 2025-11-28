/**
 * SAP Materials Management (MM)
 * Products, Inventory, Vendors, Purchase Orders
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../../models/database');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

// ============================================
// PRODUCTS
// ============================================

router.get('/products', (req, res) => {
    try {
        const { categoryId, search, lowStock, limit = 100 } = req.query;

        let query = `
            SELECT p.*, pc.name as category_name,
                   COALESCE(SUM(i.quantity_on_hand), 0) as total_stock
            FROM products p
            LEFT JOIN product_categories pc ON p.category_id = pc.id
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.organization_id = ? AND p.is_active = 1
        `;
        const params = [req.user.organizationId];

        if (categoryId) {
            query += ' AND p.category_id = ?';
            params.push(categoryId);
        }
        if (search) {
            query += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' GROUP BY p.id';

        if (lowStock) {
            query += ' HAVING total_stock <= p.reorder_point';
        }

        query += ' ORDER BY p.name LIMIT ?';
        params.push(parseInt(limit));

        const products = db.prepare(query).all(...params);
        res.json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/products', authorize('admin', 'manager'), (req, res) => {
    try {
        const {
            sku, name, description, categoryId, productType, unitOfMeasure,
            unitPrice, costPrice, minStockLevel, maxStockLevel, reorderPoint, leadTimeDays
        } = req.body;

        const id = uuidv4();

        db.prepare(`
            INSERT INTO products (
                id, sku, name, description, category_id, product_type, unit_of_measure,
                unit_price, cost_price, min_stock_level, max_stock_level, reorder_point, lead_time_days, organization_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, sku, name, description, categoryId, productType || 'goods', unitOfMeasure || 'EA',
            unitPrice || 0, costPrice || 0, minStockLevel || 0, maxStockLevel, reorderPoint || 0, leadTimeDays || 0, req.user.organizationId
        );

        res.json({ success: true, data: { id }, message: 'Product created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// CATEGORIES
// ============================================

router.get('/categories', (req, res) => {
    try {
        const categories = db.prepare(`
            SELECT pc.*, p.name as parent_name,
                   (SELECT COUNT(*) FROM products WHERE category_id = pc.id) as product_count
            FROM product_categories pc
            LEFT JOIN product_categories p ON pc.parent_id = p.id
            WHERE pc.organization_id = ?
            ORDER BY pc.name
        `).all(req.user.organizationId);

        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/categories', authorize('admin', 'manager'), (req, res) => {
    try {
        const { code, name, parentId, description } = req.body;
        const id = uuidv4();

        db.prepare(`
            INSERT INTO product_categories (id, code, name, parent_id, description, organization_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, code, name, parentId, description, req.user.organizationId);

        res.json({ success: true, data: { id }, message: 'Category created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// WAREHOUSES
// ============================================

router.get('/warehouses', (req, res) => {
    try {
        const warehouses = db.prepare(`
            SELECT w.*, e.first_name || ' ' || e.last_name as manager_name
            FROM warehouses w
            LEFT JOIN employees e ON w.manager_id = e.id
            WHERE w.organization_id = ? AND w.is_active = 1
            ORDER BY w.name
        `).all(req.user.organizationId);

        res.json({ success: true, data: warehouses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/warehouses', authorize('admin'), (req, res) => {
    try {
        const { code, name, address, managerId } = req.body;
        const id = uuidv4();

        db.prepare(`
            INSERT INTO warehouses (id, code, name, address, manager_id, organization_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, code, name, address, managerId, req.user.organizationId);

        res.json({ success: true, data: { id }, message: 'Warehouse created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// INVENTORY
// ============================================

router.get('/inventory', (req, res) => {
    try {
        const { warehouseId, productId } = req.query;

        let query = `
            SELECT i.*, p.name as product_name, p.sku, w.name as warehouse_name
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            JOIN warehouses w ON i.warehouse_id = w.id
            WHERE p.organization_id = ?
        `;
        const params = [req.user.organizationId];

        if (warehouseId) {
            query += ' AND i.warehouse_id = ?';
            params.push(warehouseId);
        }
        if (productId) {
            query += ' AND i.product_id = ?';
            params.push(productId);
        }

        query += ' ORDER BY p.name';

        const inventory = db.prepare(query).all(...params);
        res.json({ success: true, data: inventory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/inventory/adjust', authorize('admin', 'manager'), (req, res) => {
    try {
        const { productId, warehouseId, quantity, movementType, notes, unitCost } = req.body;

        const id = uuidv4();

        // Record movement
        db.prepare(`
            INSERT INTO inventory_movements (id, product_id, warehouse_id, movement_type, quantity, unit_cost, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, productId, warehouseId, movementType, quantity, unitCost, notes, req.user.id);

        // Update inventory
        const adjustment = movementType === 'issue' || movementType === 'transfer' ? -quantity : quantity;

        db.prepare(`
            INSERT INTO inventory (id, product_id, warehouse_id, quantity_on_hand, last_movement_date)
            VALUES (?, ?, ?, ?, date('now'))
            ON CONFLICT(product_id, warehouse_id) DO UPDATE SET
                quantity_on_hand = quantity_on_hand + ?,
                last_movement_date = date('now')
        `).run(uuidv4(), productId, warehouseId, adjustment, adjustment);

        res.json({ success: true, data: { id }, message: 'Inventory adjusted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// VENDORS
// ============================================

router.get('/vendors', (req, res) => {
    try {
        const { search, active } = req.query;

        let query = 'SELECT * FROM vendors WHERE organization_id = ?';
        const params = [req.user.organizationId];

        if (search) {
            query += ' AND (name LIKE ? OR vendor_code LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        if (active !== undefined) {
            query += ' AND is_active = ?';
            params.push(active === 'true' ? 1 : 0);
        }

        query += ' ORDER BY name';

        const vendors = db.prepare(query).all(...params);
        res.json({ success: true, data: vendors });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/vendors', authorize('admin', 'manager'), (req, res) => {
    try {
        const {
            name, contactName, email, phone, address, city, country,
            paymentTerms, currency, taxId
        } = req.body;

        const id = uuidv4();
        const vendorCode = `VND-${Date.now().toString(36).toUpperCase()}`;

        db.prepare(`
            INSERT INTO vendors (
                id, vendor_code, name, contact_name, email, phone, address,
                city, country, payment_terms, currency, tax_id, organization_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, vendorCode, name, contactName, email, phone, address,
            city, country, paymentTerms || 30, currency || 'USD', taxId, req.user.organizationId
        );

        res.json({ success: true, data: { id, vendorCode }, message: 'Vendor created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// PURCHASE REQUISITIONS
// ============================================

router.get('/purchase-requisitions', (req, res) => {
    try {
        const { status, limit = 50 } = req.query;

        let query = `
            SELECT pr.*, e.first_name || ' ' || e.last_name as requestor_name, d.name as department_name
            FROM purchase_requisitions pr
            JOIN employees e ON pr.requestor_id = e.id
            LEFT JOIN departments d ON pr.department_id = d.id
            WHERE pr.organization_id = ?
        `;
        const params = [req.user.organizationId];

        if (status) {
            query += ' AND pr.status = ?';
            params.push(status);
        }

        query += ' ORDER BY pr.created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const requisitions = db.prepare(query).all(...params);
        res.json({ success: true, data: requisitions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/purchase-requisitions', (req, res) => {
    try {
        const { departmentId, requiredDate, priority, lines, notes } = req.body;

        const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
        if (!employee) {
            return res.status(400).json({ success: false, message: 'Employee record not found' });
        }

        const id = uuidv4();
        const requisitionNumber = `PR-${Date.now().toString(36).toUpperCase()}`;
        const totalAmount = lines.reduce((sum, l) => sum + (l.quantity * (l.unitPrice || 0)), 0);

        db.prepare(`
            INSERT INTO purchase_requisitions (
                id, requisition_number, requestor_id, department_id, required_date,
                priority, total_amount, notes, organization_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, requisitionNumber, employee.id, departmentId, requiredDate, priority || 'normal', totalAmount, notes, req.user.organizationId);

        // Insert lines
        const insertLine = db.prepare(`
            INSERT INTO purchase_requisition_lines (id, requisition_id, product_id, description, quantity, unit_price, preferred_vendor_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        lines.forEach(line => {
            insertLine.run(uuidv4(), id, line.productId, line.description, line.quantity, line.unitPrice, line.preferredVendorId);
        });

        res.json({ success: true, data: { id, requisitionNumber }, message: 'Requisition created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// PURCHASE ORDERS
// ============================================

router.get('/purchase-orders', (req, res) => {
    try {
        const { vendorId, status, limit = 50 } = req.query;

        let query = `
            SELECT po.*, v.name as vendor_name
            FROM purchase_orders po
            JOIN vendors v ON po.vendor_id = v.id
            WHERE po.organization_id = ?
        `;
        const params = [req.user.organizationId];

        if (vendorId) {
            query += ' AND po.vendor_id = ?';
            params.push(vendorId);
        }
        if (status) {
            query += ' AND po.status = ?';
            params.push(status);
        }

        query += ' ORDER BY po.order_date DESC LIMIT ?';
        params.push(parseInt(limit));

        const orders = db.prepare(query).all(...params);
        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/purchase-orders', authorize('admin', 'manager'), (req, res) => {
    try {
        const {
            vendorId, requisitionId, expectedDelivery, lines, paymentTerms, shippingAddress, notes
        } = req.body;

        const subtotal = lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);
        const taxAmount = lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice * (l.taxRate || 0) / 100), 0);
        const totalAmount = subtotal + taxAmount;

        const id = uuidv4();
        const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;

        db.prepare(`
            INSERT INTO purchase_orders (
                id, po_number, vendor_id, requisition_id, order_date, expected_delivery,
                subtotal, tax_amount, total_amount, payment_terms, shipping_address, notes,
                created_by, organization_id
            ) VALUES (?, ?, ?, ?, date('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, poNumber, vendorId, requisitionId, expectedDelivery,
            subtotal, taxAmount, totalAmount, paymentTerms, shippingAddress, notes,
            req.user.id, req.user.organizationId
        );

        // Insert lines
        const insertLine = db.prepare(`
            INSERT INTO purchase_order_lines (id, purchase_order_id, product_id, description, quantity_ordered, unit_price, tax_rate, line_total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        lines.forEach(line => {
            const lineTotal = line.quantity * line.unitPrice;
            insertLine.run(uuidv4(), id, line.productId, line.description, line.quantity, line.unitPrice, line.taxRate || 0, lineTotal);
        });

        // Update requisition status if linked
        if (requisitionId) {
            db.prepare("UPDATE purchase_requisitions SET status = 'ordered' WHERE id = ?").run(requisitionId);
        }

        res.json({ success: true, data: { id, poNumber, totalAmount }, message: 'Purchase order created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Receive goods
router.post('/purchase-orders/:id/receive', authorize('admin', 'manager'), (req, res) => {
    try {
        const { id } = req.params;
        const { warehouseId, lines, notes } = req.body;

        const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ? AND organization_id = ?').get(id, req.user.organizationId);
        if (!po) {
            return res.status(404).json({ success: false, message: 'Purchase order not found' });
        }

        const receiptId = uuidv4();
        const receiptNumber = `GR-${Date.now().toString(36).toUpperCase()}`;

        // Create goods receipt
        db.prepare(`
            INSERT INTO goods_receipts (id, receipt_number, purchase_order_id, vendor_id, warehouse_id, receipt_date, notes, received_by, status)
            VALUES (?, ?, ?, ?, ?, date('now'), ?, ?, 'posted')
        `).run(receiptId, receiptNumber, id, po.vendor_id, warehouseId, notes, req.user.id);

        // Update PO lines and inventory
        lines.forEach(line => {
            // Update received quantity
            db.prepare(`
                UPDATE purchase_order_lines SET quantity_received = quantity_received + ? WHERE id = ?
            `).run(line.quantityReceived, line.lineId);

            // Add to inventory
            db.prepare(`
                INSERT INTO inventory (id, product_id, warehouse_id, quantity_on_hand, last_movement_date)
                VALUES (?, ?, ?, ?, date('now'))
                ON CONFLICT(product_id, warehouse_id) DO UPDATE SET
                    quantity_on_hand = quantity_on_hand + ?,
                    last_movement_date = date('now')
            `).run(uuidv4(), line.productId, warehouseId, line.quantityReceived, line.quantityReceived);

            // Record movement
            db.prepare(`
                INSERT INTO inventory_movements (id, product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, created_by)
                VALUES (?, ?, ?, 'receipt', ?, 'goods_receipt', ?, ?)
            `).run(uuidv4(), line.productId, warehouseId, line.quantityReceived, receiptId, req.user.id);
        });

        // Update PO status
        const poLines = db.prepare('SELECT * FROM purchase_order_lines WHERE purchase_order_id = ?').all(id);
        const allReceived = poLines.every(l => l.quantity_received >= l.quantity_ordered);
        const anyReceived = poLines.some(l => l.quantity_received > 0);

        const newStatus = allReceived ? 'received' : (anyReceived ? 'partial' : po.status);
        db.prepare('UPDATE purchase_orders SET status = ? WHERE id = ?').run(newStatus, id);

        res.json({ success: true, data: { receiptId, receiptNumber }, message: 'Goods received' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
