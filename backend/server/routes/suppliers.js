import { Router } from 'express';
import { allDb, getDb, runDb, logActivity, localizeImageAsFile } from '../db.js';

const router = Router();

// ---- Suppliers ----
router.get('/api/suppliers', async (req, res) => {
    try {
        res.json(await allDb("SELECT * FROM suppliers ORDER BY name"));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/api/suppliers', async (req, res) => {
    try {
        const { id, name, phone, phone2 } = req.body;
        await runDb("INSERT INTO suppliers (id, name, phone, phone2) VALUES (?, ?, ?, ?)",
            [id, name, phone, phone2 || null]);
        const activityLogId = await logActivity('create', 'supplier', id, `تم إضافة المورد ${name}`, { entityData: { id, name, phone, phone2 } });
        res.json({ success: true, activityLogId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/api/suppliers/:id', async (req, res) => {
    try {
        const row = await getDb("SELECT * FROM suppliers WHERE id = ?", [req.params.id]);
        await runDb("DELETE FROM suppliers WHERE id = ?", [req.params.id]);
        const activityLogId = await logActivity('delete', 'supplier', req.params.id, `تم حذف المورد ${row?.name || ''}`, { entityData: row || undefined });
        res.json({ success: true, activityLogId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---- Categories ----
router.get('/api/categories', async (req, res) => {
    try {
        res.json(await allDb("SELECT * FROM categories ORDER BY parentId ASC, name ASC"));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/api/categories', async (req, res) => {
    try {
        const { id, name, parentId } = req.body;
        await runDb("INSERT INTO categories (id, name, parentId) VALUES (?, ?, ?)",
            [id, name, parentId || null]);
        const activityLogId = await logActivity('create', 'category', id, `تم إضافة القسم ${name}`, { entityData: { id, name, parentId } });
        res.json({ success: true, activityLogId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/api/categories/:id', async (req, res) => {
    try {
        const { name, parentId } = req.body;
        const prevRow = await getDb("SELECT * FROM categories WHERE id = ?", [req.params.id]);
        await runDb("UPDATE categories SET name = ?, parentId = ? WHERE id = ?",
            [name, parentId || null, req.params.id]);
        const newRow = await getDb("SELECT * FROM categories WHERE id = ?", [req.params.id]);
        const activityLogId = await logActivity('update', 'category', req.params.id, `تم تحديث القسم ${name}`, { previousState: prevRow || undefined, newState: newRow || undefined });
        res.json({ success: true, activityLogId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/api/categories/:id', async (req, res) => {
    try {
        const cats = await allDb("SELECT * FROM categories WHERE id = ? OR parentId = ?", [req.params.id, req.params.id]);
        await runDb("DELETE FROM categories WHERE id = ? OR parentId = ?",
            [req.params.id, req.params.id]);
        const deletedCatName = cats.find(c => c.id === req.params.id)?.name || '';
        const activityLogId = await logActivity('delete', 'category', req.params.id, `تم حذف القسم ${deletedCatName}`, { entityData: cats });
        res.json({ success: true, activityLogId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---- Purchase Invoices ----
router.get('/api/purchase-invoices', async (req, res) => {
    try {
        const invoices = await allDb(`
            SELECT pi.*, COALESCE(s.name, c.company_name, '') as supplier_name
            FROM purchase_invoices pi
            LEFT JOIN suppliers s ON pi.supplier_id = s.id
            LEFT JOIN contacts c ON pi.supplier_id = c.id
            ORDER BY pi.date DESC`);
        for (const inv of invoices) {
            inv.items = await allDb("SELECT * FROM purchase_invoice_items WHERE invoice_id = ?", [inv.id]);
        }
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/api/purchase-invoices', async (req, res) => {
    try {
        const invoice = req.body;
        const { id, supplierId, invoiceNumber, date, totalAmount, paymentMethod, image, items, supplierName } = invoice;

        let finalImage = image;
        if (image && image.startsWith('http')) {
            finalImage = await localizeImageAsFile(image, id);
        }

        await runDb("BEGIN TRANSACTION");
        try {
            await runDb(
                `INSERT INTO purchase_invoices (id, supplier_id, invoice_number, total_amount, payment_method, image, date)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [id, supplierId, invoiceNumber, totalAmount, paymentMethod, finalImage, date]);

            for (const item of items) {
                await runDb(
                    `INSERT INTO purchase_invoice_items (id, invoice_id, product_id, variant_id, quantity, buy_price)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [item.id, id, item.productId, item.variantId, item.quantity, item.buyPrice]);

                const row = await getDb("SELECT data FROM products WHERE id = ?", [item.productId]);
                if (row) {
                    const product = JSON.parse(row.data);
                    product.supplierId = supplierId;
                    product.wholesalePrice = item.buyPrice;
                    product.costPrice = (item.buyPrice || 0) + (product.packagingCost || 0);
                    product.variants = product.variants.map(v => {
                        if (v.id === item.variantId) {
                            v.quantity = (v.quantity || 0) + item.quantity;
                        }
                        return v;
                    });
                    await runDb("UPDATE products SET data = ? WHERE id = ?",
                        [JSON.stringify(product), item.productId]);
                }
            }

            await runDb(
                `INSERT INTO expenses (amount, category, description, created_at, updated_at)
                 VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [totalAmount, 'مشتريات مخزون (Inventory)',
                 `فاتورة مشتريات رقم ${invoiceNumber} من ${supplierName || 'مورد'}`, date]);

            await runDb("COMMIT");
            const activityLogId = await logActivity('create', 'purchase_invoice', id,
                `فاتورة مشتريات رقم ${invoiceNumber} من ${supplierName || 'مورد'} بقيمة ${totalAmount}`, { entityData: { id, supplierId, invoiceNumber, totalAmount, date, items } });
            res.json({ success: true, activityLogId });
        } catch (err) {
            await runDb("ROLLBACK");
            throw err;
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
