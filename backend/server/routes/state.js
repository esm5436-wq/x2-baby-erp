import { Router } from 'express';
import { allDb, getDb, runDb, logActivity, generateOrderId, adjustStock, isActiveStatus, getAllProducts } from '../db.js';

const router = Router();

router.get('/api/state', async (req, res) => {
    try {
        const productRows = await allDb("SELECT data FROM products");
        const products = productRows.map(r => {
            try { return JSON.parse(r.data); } catch { return null; }
        }).filter(Boolean);

        const productCosts = new Map();
        products.forEach(p => productCosts.set(p.id, p.costPrice || 0));

        const orderRows = await allDb("SELECT data FROM orders");
        const orders = orderRows.map(r => {
            let o;
            try { o = JSON.parse(r.data); } catch { return null; }
            if (!o) return null;
            if (o.items) {
                let recalculatedTotalCost = 0;
                o.items = o.items.map(item => {
                    if (!item.costPrice || item.costPrice === 0) {
                        item.costPrice = productCosts.get(item.productId) || (item.price * 0.6);
                    }
                    recalculatedTotalCost += (item.costPrice * (item.quantity || 1));
                    return item;
                });
                if (!o.totalCost || o.totalCost === 0) {
                    o.totalCost = recalculatedTotalCost;
                }
            }
            return o;
        });

        const settingsRows = await allDb("SELECT key, value FROM settings");
        const settings = {};
        settingsRows.forEach(row => {
            if (row.key === 'isManualMode') settings.isManualMode = JSON.parse(row.value);
            if (row.key === 'brandLogo') settings.brandLogo = row.value;
            if (row.key === 'brandName') settings.brandName = row.value;
            if (row.key === 'brandSlogan') settings.brandSlogan = row.value;
            if (row.key === 'brandSloganDesign') settings.brandSloganDesign = row.value;
            if (row.key === 'taxEnabled') settings.taxEnabled = JSON.parse(row.value);
            if (row.key === 'taxRate') settings.taxRate = Number(row.value);
            if (row.key === 'invoiceSettings') {
                try { settings.invoiceSettings = JSON.parse(row.value); } catch {}
            }
        });

        // Read individual invoice settings keys (new format)
        settingsRows.forEach(row => {
            if (row.key.startsWith('invoiceSettings.')) {
                const field = row.key.slice('invoiceSettings.'.length);
                if (!settings.invoiceSettings) settings.invoiceSettings = {};
                try { settings.invoiceSettings[field] = JSON.parse(row.value); } catch { settings.invoiceSettings[field] = row.value; }
            }
        });

        const thankYouRow = settingsRows.find(r => r.key === 'thankYouImage');
        if (thankYouRow) {
            if (!settings.invoiceSettings) settings.invoiceSettings = {};
            settings.invoiceSettings.thankYouImage = thankYouRow.value;
        }

        const categories = await allDb("SELECT * FROM categories ORDER BY parentId ASC, name ASC");
        const suppliers = await allDb("SELECT * FROM suppliers ORDER BY name");
        const contacts = await allDb(`SELECT id, company_name as companyName, phone, phone2, contact_person as contactPerson, extra_phones as extraPhones, email, address, specialization, entity_type as entityType, tax_id as taxId, commercial_registry as commercialRegistry, notes, status, created_at as createdAt, updated_at as updatedAt, latitude, longitude, map_url as mapUrl, ratings_enabled as ratingsEnabled, ratings_data as ratingsData, links FROM contacts ORDER BY company_name ASC`);
        const targets = await allDb(
            "SELECT id, title, amount, start_date as startDate, deadline, category, created_at as createdAt FROM financial_targets");
        const customers = await allDb("SELECT * FROM customers ORDER BY name ASC");

        res.json({
            products, orders, customers, categories, suppliers, contacts, targets,
            brandName: 'X2 BABY ERP',
            brandSlogan: 'الجودة، الثقة، والأمان',
            brandSloganDesign: '',
            ...settings,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/api/import', async (req, res) => {
    try {
        const { products, orders, categories, isManualMode } = req.body;
        await runDb("BEGIN TRANSACTION");
        try {
            await runDb("DELETE FROM products");
            await runDb("DELETE FROM orders");

            for (const p of (products || [])) {
                await runDb("INSERT INTO products (id, data) VALUES (?, ?)",
                    [p.id, JSON.stringify(p)]);
            }
            for (const o of (orders || [])) {
                const storeNumber = o.id;
                const newId = await generateOrderId();
                o.id = newId;
                o.sourceId = storeNumber;
                await runDb("INSERT INTO orders (id, data) VALUES (?, ?)",
                    [newId, JSON.stringify(o)]);
            }

            await runDb("UPDATE settings SET value = ? WHERE key = 'categories'",
                [JSON.stringify(categories || [])]);
            await runDb("UPDATE settings SET value = ? WHERE key = 'isManualMode'",
                [JSON.stringify(!!isManualMode)]);

            await runDb("COMMIT");
            const activityLogId = await logActivity('import', 'state', null,
                'تم استيراد ' + (products || []).length + ' منتج و ' + (orders || []).length + ' طلب');
            res.json({ success: true, activityLogId });
        } catch (err) {
            await runDb("ROLLBACK");
            throw err;
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/api/activity-logs', async (req, res) => {
    try {
        const { limit = 50, offset = 0, entity_type, action, search, startDate, endDate, sortField = 'created_at', sortOrder = 'desc' } = req.query;
        let query = "SELECT * FROM activity_logs WHERE 1=1";
        let countQuery = "SELECT COUNT(*) as total FROM activity_logs WHERE 1=1";
        const params = [];
        const countParams = [];

        if (entity_type) {
            query += " AND entity_type = ?";
            countQuery += " AND entity_type = ?";
            params.push(entity_type);
            countParams.push(entity_type);
        }
        if (action) {
            query += " AND action = ?";
            countQuery += " AND action = ?";
            params.push(action);
            countParams.push(action);
        }
        if (search) {
            query += " AND description LIKE ?";
            countQuery += " AND description LIKE ?";
            params.push(`%${search}%`);
            countParams.push(`%${search}%`);
        }
        if (startDate) {
            query += " AND created_at >= ?";
            countQuery += " AND created_at >= ?";
            params.push(startDate);
            countParams.push(startDate);
        }
        if (endDate) {
            query += " AND created_at <= ?";
            countQuery += " AND created_at <= ?";
            params.push(endDate + 'T23:59:59.999Z');
            countParams.push(endDate + 'T23:59:59.999Z');
        }

        const totalRow = await allDb(countQuery, countParams);
        const total = totalRow[0]?.total || 0;

        const allowedSortFields = ['created_at', 'entity_type', 'action'];
        const safeField = allowedSortFields.includes(sortField) ? sortField : 'created_at';
        const safeOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${safeField} ${safeOrder} LIMIT ? OFFSET ?`;
        params.push(Number(limit), Number(offset));

        const logs = await allDb(query, params);
        res.json({ rows: logs, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function getEntityLabel(entityType, data) {
    if (!data) return '';
    switch (entityType) {
        case 'product': return data.name || '';
        case 'order':
            const id = data.id || '';
            const name = data.customerName || '';
            return id && name ? `${id} - ${name}` : id || name || '';
        case 'contact': return data.companyName || data.name || '';
        case 'supplier': return data.name || '';
        case 'target': return data.title || '';
        case 'category': return data.name || '';
        case 'expense': return data.description || `${data.amount || ''}${data.category ? ' - ' + data.category : ''}` || '';
        case 'settings': return data.key || '';
        default: return '';
    }
}

const ENTITY_TYPE_LABELS = {
    product: 'المنتج',
    order: 'الطلب',
    contact: 'جهة الاتصال',
    supplier: 'المورد',
    target: 'الهدف',
    category: 'القسم',
    expense: 'المصروف',
    settings: 'الإعدادات',
    state: 'النظام'
};

router.post('/api/activity-logs/:id/undo', async (req, res) => {
    try {
        const log = await allDb("SELECT * FROM activity_logs WHERE id = ?", [req.params.id]);
        if (!log.length) return res.status(404).json({ error: 'Log not found' });
        const entry = log[0];
        let metadata = {};
        try { metadata = JSON.parse(entry.metadata || '{}'); } catch {}

        const { action, entity_type, entity_id } = entry;
        const entityId = entity_id;

        if (action === 'create') {
            // Undo create = delete
            if (entity_type === 'product') await runDb("DELETE FROM products WHERE id = ?", [entityId]);
            else if (entity_type === 'order') await runDb("DELETE FROM orders WHERE id = ?", [entityId]);
            else if (entity_type === 'expense') await runDb("DELETE FROM expenses WHERE id = ?", [entityId]);
            else if (entity_type === 'contact') await runDb("DELETE FROM contacts WHERE id = ?", [entityId]);
            else if (entity_type === 'category') await runDb("DELETE FROM categories WHERE id = ?", [entityId]);
            else if (entity_type === 'supplier') await runDb("DELETE FROM suppliers WHERE id = ?", [entityId]);
            else if (entity_type === 'target') await runDb("DELETE FROM financial_targets WHERE id = ?", [entityId]);
            const label = getEntityLabel(entity_type, metadata.entityData);
            logActivity('delete', entity_type, entityId, `تراجع عن إنشاء ${ENTITY_TYPE_LABELS[entity_type] || entity_type}${label ? ' "' + label + '"' : ''}`);
        } else if (action === 'delete') {
            // Undo delete = restore from metadata.entityData
            const entityData = metadata.entityData;
            if (!entityData) return res.status(400).json({ error: 'لا توجد بيانات كافية للتراجع عن الحذف' });
            if (entity_type === 'product') await runDb("INSERT OR REPLACE INTO products (id, data) VALUES (?, ?)", [entityId, JSON.stringify(entityData)]);
            else if (entity_type === 'order') {
                const dataStr = typeof entityData === 'string' ? entityData : JSON.stringify(entityData);
                await runDb("INSERT OR REPLACE INTO orders (id, data) VALUES (?, ?)", [entityId, dataStr]);
            } else if (entity_type === 'expense') {
                await runDb("INSERT INTO expenses (id, amount, category, description, created_at, updated_at, beneficiary_id) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)",
                    [entityId, entityData.amount, entityData.category, entityData.description || '', entityData.created_at || new Date().toISOString(), entityData.beneficiary_id || null]);
            } else if (entity_type === 'contact') {
                const cols = Object.keys(entityData).filter(k => k !== 'id').map(k => `${k}=?`).join(',');
                await runDb(`INSERT OR REPLACE INTO contacts (id, ${Object.keys(entityData).filter(k => k !== 'id').join(',')}) VALUES (?, ${Object.keys(entityData).filter(k => k !== 'id').map(() => '?').join(',')})`,
                    [entityId, ...Object.keys(entityData).filter(k => k !== 'id').map(k => entityData[k])]);
            } else if (entity_type === 'supplier') {
                await runDb("INSERT INTO suppliers (id, name, phone, phone2, created_at) VALUES (?, ?, ?, ?, ?)",
                    [entityId, entityData.name, entityData.phone || '', entityData.phone2 || '', entityData.created_at || new Date().toISOString()]);
            } else if (entity_type === 'target') {
                await runDb("INSERT INTO financial_targets (id, title, amount, start_date, deadline, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [entityId, entityData.title, entityData.amount, entityData.startDate, entityData.deadline, entityData.category, entityData.createdAt]);
            } else if (entity_type === 'category') {
                await runDb("INSERT INTO categories (id, name, parentId) VALUES (?, ?, ?)",
                    [entityId, entityData.name, entityData.parentId || null]);
            }
            const label2 = getEntityLabel(entity_type, entityData);
            logActivity('create', entity_type, entityId, `تراجع عن حذف ${ENTITY_TYPE_LABELS[entity_type] || entity_type}${label2 ? ' "' + label2 + '"' : ''}`);
        } else if (action === 'update') {
            // Undo update = restore previous state from metadata.previousState
            const prevState = metadata.previousState;
            if (!prevState) return res.status(400).json({ error: 'لا توجد بيانات سابقة للتراجع عن التعديل' });
            if (entity_type === 'product') {
                await runDb("UPDATE products SET data = ? WHERE id = ?", [JSON.stringify(prevState), entityId]);
            } else if (entity_type === 'order') {
                // Read current order to determine stock reversal
                const currentRow = await getDb("SELECT data FROM orders WHERE id = ?", [entityId]);
                if (currentRow) {
                    const currentOrder = JSON.parse(currentRow.data);
                    const currentStatus = currentOrder.status;
                    const restoredStatus = prevState.status;
                    // Reverse stock adjustment if status transition changed stock
                    // Original: Active→Inactive(return) called adjustStock('return'), Inactive→Active called adjustStock('deduct')
                    // Undo reverses the original operation
                    if (isActiveStatus(currentStatus) && !isActiveStatus(restoredStatus)) {
                        await adjustStock(currentOrder.items || [], 'return');
                    } else if (!isActiveStatus(currentStatus) && isActiveStatus(restoredStatus)) {
                        await adjustStock(currentOrder.items || [], 'deduct');
                    }
                }
                await runDb("UPDATE orders SET data = ? WHERE id = ?", [JSON.stringify(prevState), entityId]);
            }
            const label3 = getEntityLabel(entity_type, prevState);
            logActivity('update', entity_type, entityId, `تراجع عن تعديل ${ENTITY_TYPE_LABELS[entity_type] || entity_type}${label3 ? ' "' + label3 + '"' : ''}`);
        } else if (action === 'import') {
            const ids = entity_id ? entity_id.split(',').filter(Boolean) : [];
            if (ids.length === 0) return res.status(400).json({ error: 'لا توجد معرفات للتراجع عن الاستيراد' });
            const entityData = metadata.entityData;
            if (entityData && Array.isArray(entityData)) {
                for (const prod of entityData) {
                    if (!prod || !prod.id) continue;
                    await runDb("INSERT OR REPLACE INTO products (id, data) VALUES (?, ?)", [prod.id, JSON.stringify(prod)]);
                }
            } else if (entity_type === 'product') {
                for (const pid of ids) {
                    await runDb("DELETE FROM products WHERE id = ?", [pid]);
                }
            } else if (entity_type === 'order') {
                for (const oid of ids) {
                    await runDb("DELETE FROM orders WHERE id = ?", [oid]);
                }
            }
            logActivity('delete', entity_type, entity_id, `تراجع عن استيراد ${ids.length} ${entity_type === 'product' ? 'منتج' : 'طلب'}`);
        }

        const updatedProducts = await getAllProducts();
        res.json({ success: true, message: 'تم التراجع بنجاح', products: updatedProducts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/api/backup', async (req, res) => {
    try {
        const products = await allDb("SELECT * FROM products");
        const orders = await allDb("SELECT * FROM orders");
        const settings = await allDb("SELECT * FROM settings");
        const categories = await allDb("SELECT * FROM categories");
        const suppliers = await allDb("SELECT * FROM suppliers");
        const contacts = await allDb("SELECT * FROM contacts");
        const customers = await allDb("SELECT * FROM customers");
        const targets = await allDb("SELECT * FROM financial_targets");
        res.json({ products, orders, settings, categories, suppliers, contacts, customers, targets, exportedAt: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
