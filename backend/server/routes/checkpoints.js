import { Router } from 'express';
import { allDb, getDb, runDb, logActivity } from '../db.js';

const router = Router();

async function safeAll(sql, fallback = []) {
  try { return await allDb(sql); } catch { return fallback; }
}

router.post('/api/checkpoints', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'يجب إدخال اسم لنقطة الاستعادة' });

    const productRows = await safeAll("SELECT data FROM products");
    const products = productRows.map(r => r.data ? JSON.parse(r.data) : null).filter(Boolean);

    const orderRows = await safeAll("SELECT data FROM orders");
    const orders = orderRows.map(r => r.data ? JSON.parse(r.data) : null).filter(Boolean);

    const snapshot = {
      products, orders,
      categories: await safeAll("SELECT * FROM categories ORDER BY parentId ASC, name ASC"),
      suppliers: await safeAll("SELECT * FROM suppliers ORDER BY name"),
      contacts: await safeAll("SELECT * FROM contacts"),
      targets: await safeAll("SELECT * FROM financial_targets"),
      settings: await safeAll("SELECT * FROM settings"),
      coupons: await safeAll("SELECT * FROM saved_coupons"),
      expenses: await safeAll("SELECT * FROM expenses"),
      purchaseInvoices: await safeAll("SELECT * FROM purchase_invoices"),
      purchaseInvoiceItems: await safeAll("SELECT * FROM purchase_invoice_items")
    };

    const result = await runDb(
      "INSERT INTO checkpoints (name, snapshot) VALUES (?, ?)",
      [name.trim(), JSON.stringify(snapshot)]
    );

    logActivity('create', 'settings', `checkpoint-${result.id}`,
      `تم إنشاء نقطة استعادة "${name.trim()}"`);

    res.json({ success: true, id: result.id, name: name.trim() });
  } catch (err) {
    console.error('Checkpoint POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/checkpoints', async (req, res) => {
  try {
    const rows = await allDb("SELECT id, name, created_at FROM checkpoints ORDER BY created_at DESC");
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/checkpoints/:id/restore', async (req, res) => {
  try {
    const row = await getDb("SELECT * FROM checkpoints WHERE id = ?", [req.params.id]);
    if (!row) return res.status(404).json({ error: 'نقطة الاستعادة غير موجودة' });
    let snapshot;
    try { snapshot = JSON.parse(row.snapshot); } catch { return res.status(400).json({ error: 'ملف نقطة الاستعادة تالف' }); }

    await runDb("BEGIN TRANSACTION");
    try {
      await runDb("DELETE FROM products");
      await runDb("DELETE FROM orders");
      await runDb("DELETE FROM categories");
      await runDb("DELETE FROM suppliers");
      await runDb("DELETE FROM contacts");
      await runDb("DELETE FROM financial_targets");
      await runDb("DELETE FROM saved_coupons");
      await runDb("DELETE FROM expenses");
      await runDb("DELETE FROM purchase_invoices");
      await runDb("DELETE FROM purchase_invoice_items");
      await runDb("DELETE FROM settings");

      for (const p of (snapshot.products || [])) {
        if (!p.id) continue;
        await runDb("INSERT OR REPLACE INTO products (id, data) VALUES (?, ?)", [p.id, JSON.stringify(p)]);
      }
      for (const o of (snapshot.orders || [])) {
        if (!o.id) continue;
        await runDb("INSERT OR REPLACE INTO orders (id, data) VALUES (?, ?)", [o.id, JSON.stringify(o)]);
      }
      for (const c of (snapshot.categories || [])) {
        await runDb("INSERT OR REPLACE INTO categories (id, name, parentId, created_at) VALUES (?, ?, ?, ?)",
          [c.id, c.name, c.parentId || null, c.created_at || new Date().toISOString()]);
      }
      for (const s of (snapshot.suppliers || [])) {
        await runDb("INSERT OR REPLACE INTO suppliers (id, name, phone, phone2, created_at) VALUES (?, ?, ?, ?, ?)",
          [s.id, s.name, s.phone || '', s.phone2 || '', s.created_at || new Date().toISOString()]);
      }
      for (const c of (snapshot.contacts || [])) {
        const cols = Object.keys(c).filter(k => k !== 'id');
        const vals = cols.map(k => c[k]);
        await runDb(`INSERT OR REPLACE INTO contacts (id, ${cols.join(',')}) VALUES (?, ${cols.map(() => '?').join(',')})`,
          [c.id, ...vals]);
      }
      for (const t of (snapshot.targets || [])) {
        await runDb("INSERT OR REPLACE INTO financial_targets (id, title, amount, start_date, deadline, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [t.id, t.title, t.amount, t.startDate || t.start_date, t.deadline, t.category, t.createdAt || t.created_at || new Date().toISOString()]);
      }
      for (const c of (snapshot.coupons || [])) {
        await runDb("INSERT OR REPLACE INTO saved_coupons (code, discount, is_percent, updated_at) VALUES (?, ?, ?, ?)",
          [c.code, c.discount, c.is_percent || 0, c.updated_at || new Date().toISOString()]);
      }
      for (const ex of (snapshot.expenses || [])) {
        await runDb("INSERT OR REPLACE INTO expenses (id, amount, category, description, created_at, updated_at, beneficiary_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [ex.id, ex.amount, ex.category, ex.description || '', ex.created_at || new Date().toISOString(), ex.updated_at || new Date().toISOString(), ex.beneficiary_id || null]);
      }
      for (const inv of (snapshot.purchaseInvoices || [])) {
        await runDb("INSERT OR REPLACE INTO purchase_invoices (id, supplier_id, invoice_number, total_amount, payment_method, image, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [inv.id, inv.supplier_id, inv.invoice_number, inv.total_amount, inv.payment_method, inv.image, inv.date, inv.created_at || new Date().toISOString()]);
      }
      for (const item of (snapshot.purchaseInvoiceItems || [])) {
        await runDb("INSERT OR REPLACE INTO purchase_invoice_items (id, invoice_id, product_id, variant_id, quantity, buy_price) VALUES (?, ?, ?, ?, ?, ?)",
          [item.id, item.invoice_id, item.product_id, item.variant_id, item.quantity, item.buy_price]);
      }
      // Restore settings key-value pairs
      for (const s of (snapshot.settings || [])) {
        await runDb("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [s.key, s.value]);
      }

      await runDb("COMMIT");
      logActivity('update', 'settings', `checkpoint-${row.id}`,
        `تمت استعادة نقطة "${row.name}"`);
      res.json({ success: true, message: `تمت استعادة نقطة "${row.name}" بنجاح` });
    } catch (err) {
      await runDb("ROLLBACK");
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/checkpoints/:id', async (req, res) => {
  try {
    const row = await getDb("SELECT id, name FROM checkpoints WHERE id = ?", [req.params.id]);
    if (!row) return res.status(404).json({ error: 'نقطة الاستعادة غير موجودة' });
    await runDb("DELETE FROM checkpoints WHERE id = ?", [req.params.id]);
    logActivity('delete', 'settings', `checkpoint-${req.params.id}`,
      `تم حذف نقطة استعادة "${row.name}"`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
