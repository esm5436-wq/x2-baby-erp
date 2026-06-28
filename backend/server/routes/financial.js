import { Router } from 'express';
import { allDb, getDb, runDb, logActivity } from '../db.js';

const router = Router();

// ---- Targets ----
router.get('/api/targets', async (req, res) => {
    try {
        const rows = await allDb(
            "SELECT id, title, amount, deadline, category, created_at as createdAt FROM financial_targets ORDER BY created_at DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/api/targets', async (req, res) => {
    try {
        const { id, title, amount, startDate, deadline, category } = req.body;
        await runDb(
            "INSERT INTO financial_targets (id, title, amount, start_date, deadline, category) VALUES (?, ?, ?, ?, ?, ?)",
            [id, title, amount, startDate, deadline, category]);
        const activityLogId = await logActivity('create', 'target', id, `تم إضافة هدف ${title}`, { entityData: { id, title, amount, startDate, deadline, category } });
        res.json({ success: true, activityLogId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/api/targets/:id', async (req, res) => {
    try {
        const { title, amount, startDate, deadline, category } = req.body;
        const prevRow = await getDb("SELECT * FROM financial_targets WHERE id = ?", [req.params.id]);
        await runDb(
            "UPDATE financial_targets SET title = ?, amount = ?, start_date = ?, deadline = ?, category = ? WHERE id = ?",
            [title, amount, startDate, deadline, category, req.params.id]);
        const newRow = await getDb("SELECT * FROM financial_targets WHERE id = ?", [req.params.id]);
        const activityLogId = await logActivity('update', 'target', req.params.id, `تم تحديث الهدف ${title}`, { previousState: prevRow, newState: newRow });
        res.json({ success: true, activityLogId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/api/targets/:id', async (req, res) => {
    try {
        const entityData = await getDb("SELECT * FROM financial_targets WHERE id = ?", [req.params.id]);
        await runDb("DELETE FROM financial_targets WHERE id = ?", [req.params.id]);
        const activityLogId = await logActivity('delete', 'target', req.params.id, `تم حذف الهدف ${entityData?.title || ''}`, { entityData });
        res.json({ success: true, activityLogId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---- Expenses ----
router.get('/api/expenses', async (req, res) => {
    try {
        let query = 'SELECT id, amount, category, description, created_at, beneficiary_id FROM expenses WHERE 1=1';
        const params = [];
        if (req.query.startDate) { query += ' AND created_at >= ?'; params.push(req.query.startDate); }
        if (req.query.endDate) { query += ' AND created_at <= ?'; params.push(req.query.endDate); }
        if (req.query.category) { query += ' AND category = ?'; params.push(req.query.category); }
        query += ' ORDER BY created_at DESC LIMIT 100';
        res.json(await allDb(query, params));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/api/expenses', async (req, res) => {
    try {
        const { amount, category, description, date, beneficiary_id } = req.body;
        if (!amount || !category) return res.status(400).json({ error: 'Amount and category are required' });
        const createdAt = date || new Date().toISOString();
        await runDb(
            "INSERT INTO expenses (amount, category, description, created_at, updated_at, beneficiary_id) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)",
            [amount, category, description || '', createdAt, beneficiary_id || null]);
        const expenseId = (await allDb("SELECT last_insert_rowid() as id"))[0]?.id;
        const activityLogId = await logActivity('create', 'expense', String(expenseId), `تم إضافة مصروف ${amount} - ${category}`, { entityData: { id: expenseId, amount, category, description, created_at: createdAt, beneficiary_id } });
        res.json({ success: true, activityLogId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/api/expenses/:id', async (req, res) => {
    try {
        const entityData = await getDb("SELECT * FROM expenses WHERE id = ?", [req.params.id]);
        await runDb('DELETE FROM expenses WHERE id = ?', [req.params.id]);
        const activityLogId = await logActivity('delete', 'expense', req.params.id, `تم حذف مصروف ${entityData?.amount || ''} - ${entityData?.category || ''}`, { entityData });
        res.json({ success: true, activityLogId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/api/expenses/categories', async (req, res) => {
    try {
        const cats = await allDb('SELECT DISTINCT category FROM expenses ORDER BY category');
        res.json(cats.map(c => c.category));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---- Financial Summary ----
router.get('/api/financial-summary', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const orders = await allDb("SELECT data FROM orders");
        const parsedOrders = orders.map(r => JSON.parse(r.data));
        let filteredOrders = parsedOrders.filter(o => o.status !== 'تم الغاء الطلب');

        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : new Date('2000-01-01');
            const end = endDate ? new Date(endDate) : new Date();
            if (endDate) end.setHours(23, 59, 59, 999);
            filteredOrders = filteredOrders.filter(o => {
                const d = new Date(o.createdAt);
                return d >= start && d <= end;
            });
        }

        const totalSales = filteredOrders.reduce((sum, o) =>
            sum + ((o.totalAmount || 0) - (o.shippingCost || 0)), 0);

        const productRows = await allDb("SELECT data FROM products");
        const productCosts = new Map();
        productRows.forEach(row => {
            const p = JSON.parse(row.data);
            productCosts.set(p.id, p.costPrice || 0);
        });

        const totalCOGS = filteredOrders.reduce((sum, o) =>
            sum + (o.items || []).reduce((itemSum, item) => {
                const cost = (item.costPrice && item.costPrice > 0)
                    ? item.costPrice
                    : (productCosts.get(item.productId) || (item.price * 0.6));
                return itemSum + (cost * (item.quantity || 1));
            }, 0), 0);

        const grossProfit = totalSales - totalCOGS;

        const expensesResult = await getDb(`
            SELECT COALESCE(SUM(amount), 0) as total FROM expenses
            WHERE category != 'مشتريات مخزون (Inventory)'
            AND created_at BETWEEN ? AND ?`,
            [startDate || '2000-01-01', endDate || new Date().toISOString().split('T')[0]]);
        const totalOPEX = expensesResult?.total || 0;

        const lifetimeSpendResult = await getDb(
            `SELECT COALESCE(SUM(amount), 0) as total FROM expenses`);
        const lifetimeTotalSpend = lifetimeSpendResult?.total || 0;

        const lifetimeSales = parsedOrders
            .filter(o => o.status !== 'تم الغاء الطلب')
            .reduce((sum, o) => sum + ((o.totalAmount || 0) - (o.shippingCost || 0)), 0);

        const netProfit = grossProfit - totalOPEX;
        const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

        res.json({
            totalSales: Math.round(totalSales * 100) / 100,
            totalCOGS: Math.round(totalCOGS * 100) / 100,
            grossProfit: Math.round(grossProfit * 100) / 100,
            totalOPEX: Math.round(totalOPEX * 100) / 100,
            netProfit: Math.round(netProfit * 100) / 100,
            profitMargin: Math.round(profitMargin * 100) / 100,
            ordersCount: filteredOrders.length,
            lifetimeTotalSpend: Math.round(lifetimeTotalSpend * 100) / 100,
            lifetimeSales: Math.round(lifetimeSales * 100) / 100
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
