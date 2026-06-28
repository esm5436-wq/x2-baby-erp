import { Router } from 'express';
import { allDb, getDb, runDb, logActivity } from '../db.js';
import crypto from 'crypto';
import { calculateCustomerRating } from '../utils/calculateCustomerRating.js';

const router = Router();

export async function findCustomerByPhone(phone) {
  if (!phone) return null;
  const clean = phone.trim();
  const row = await getDb("SELECT * FROM customers WHERE phone = ? OR alt_phone = ?", [clean, clean]);
  return row || null;
}

export async function findOrCreateCustomer({ name, phone, address, city, altPhone, mapUrl, latitude, longitude, notes }) {
  if (!phone) return null;
  const cleanPhone = phone.trim();
  const existing = await findCustomerByPhone(cleanPhone);
  if (existing) {
    let changed = false;
    if (name && !existing.name) { existing.name = name; changed = true; }
    if (address && !existing.address) { existing.address = address; changed = true; }
    if (city && !existing.city) { existing.city = city; changed = true; }
    if (altPhone && !existing.alt_phone) { existing.alt_phone = altPhone; changed = true; }
    if (mapUrl && !existing.map_url) { existing.map_url = mapUrl; changed = true; }
    if (latitude && !existing.latitude) { existing.latitude = latitude; changed = true; }
    if (longitude && !existing.longitude) { existing.longitude = longitude; changed = true; }
    if (notes && !existing.notes) { existing.notes = notes; changed = true; }
    if (changed) {
      await runDb(
        `UPDATE customers SET name=?, alt_phone=?, address=?, city=?, map_url=?, latitude=?, longitude=?, notes=?, updated_at=datetime('now') WHERE id=?`,
        [existing.name, existing.alt_phone, existing.address, existing.city,
         existing.map_url, existing.latitude, existing.longitude, existing.notes, existing.id]
      );
    }
    return existing;
  }
  const id = `cus-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();
  await runDb(
    `INSERT INTO customers (id, name, phone, alt_phone, address, city, map_url, latitude, longitude, notes, total_orders, total_spent, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
    [id, name || cleanPhone, cleanPhone, altPhone || null, address || null, city || null,
     mapUrl || null, latitude || null, longitude || null, notes || null, now, now]
  );
  return await getDb("SELECT * FROM customers WHERE id = ?", [id]);
}

export async function updateCustomerStats(customerId) {
  if (!customerId) return;
  const rows = await allDb("SELECT data FROM orders");
  let totalOrders = 0;
  let totalSpent = 0;
  let lastOrderDate = null;
  for (const row of rows) {
    try {
      const o = JSON.parse(row.data);
      if (o.customerId === customerId) {
        totalOrders++;
        totalSpent += o.totalAmount || 0;
        if (!lastOrderDate || o.createdAt > lastOrderDate) lastOrderDate = o.createdAt;
      }
    } catch {}
  }
  await runDb(
    `UPDATE customers SET total_orders = ?, total_spent = ?, last_order_date = ?, updated_at = datetime('now') WHERE id = ?`,
    [totalOrders, totalSpent, lastOrderDate, customerId]
  );
  await calculateCustomerRating(customerId);
}

router.get('/api/customers', async (req, res) => {
  try {
    const { search, source, city } = req.query;
    let query = "SELECT * FROM customers WHERE 1=1";
    const params = [];
    if (search) {
      query += " AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (source) { query += " AND source = ?"; params.push(source); }
    if (city) { query += " AND city = ?"; params.push(city); }
    query += " ORDER BY total_orders DESC, name ASC";
    const rows = await allDb(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/customers/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) return res.json([]);
    const rows = await allDb(
      "SELECT * FROM customers WHERE phone LIKE ? OR name LIKE ? ORDER BY total_orders DESC LIMIT 10",
      [`%${q}%`, `%${q}%`]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/customers/:id', async (req, res) => {
  try {
    const customer = await getDb("SELECT * FROM customers WHERE id = ?", [req.params.id]);
    if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });
    const orderRows = await allDb("SELECT data FROM orders");
    const orders = [];
    for (const row of orderRows) {
      try {
        const o = JSON.parse(row.data);
        if (o.customerId === customer.id) orders.push(o);
      } catch {}
    }
    orders.sort((a, b) => b.createdAt?.localeCompare(a.createdAt) || 0);
    res.json({ customer, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/customers', async (req, res) => {
  try {
    const { name, phone, altPhone, email, address, city, source, tags, notes, adminNotes, mapUrl, latitude, longitude } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'الاسم ورقم الهاتف مطلوبان' });
    const existing = await findCustomerByPhone(phone);
    if (existing) return res.status(409).json({ error: 'يوجد عميل بهذا الرقم بالفعل', customer: existing });
    const id = `cus-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();
    await runDb(
      `INSERT INTO customers (id, name, phone, alt_phone, email, address, city, source, tags, notes, admin_notes, map_url, latitude, longitude, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, phone, altPhone || null, email || null, address || null, city || null,
       source || null, tags || '[]', notes || null, adminNotes || null,
       mapUrl || null, latitude || null, longitude || null, now, now]
    );
    const customer = await getDb("SELECT * FROM customers WHERE id = ?", [id]);
    await logActivity('create', 'customer', id, `تم إنشاء العميل ${name}`);
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/api/customers/:id', async (req, res) => {
  try {
    const existing = await getDb("SELECT * FROM customers WHERE id = ?", [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'العميل غير موجود' });
    const { name, phone, altPhone, email, address, city, source, tags, notes, adminNotes, mapUrl, latitude, longitude } = req.body;
    await runDb(
      `UPDATE customers SET name=?, phone=?, alt_phone=?, email=?, address=?, city=?, source=?, tags=?, notes=?, admin_notes=?, map_url=?, latitude=?, longitude=?, updated_at=datetime('now') WHERE id=?`,
      [name || existing.name, phone || existing.phone, altPhone ?? existing.alt_phone,
       email ?? existing.email, address ?? existing.address, city ?? existing.city,
       source ?? existing.source, tags ?? existing.tags, notes ?? existing.notes,
       adminNotes ?? existing.admin_notes,
       mapUrl ?? existing.map_url, latitude ?? existing.latitude,
       longitude ?? existing.longitude, req.params.id]
    );
    const customer = await getDb("SELECT * FROM customers WHERE id = ?", [req.params.id]);
    await logActivity('update', 'customer', req.params.id, `تم تحديث العميل ${customer.name}`);
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/customers/:id', async (req, res) => {
  try {
    const customer = await getDb("SELECT * FROM customers WHERE id = ?", [req.params.id]);
    if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });
    await runDb("DELETE FROM customers WHERE id = ?", [req.params.id]);
    await logActivity('delete', 'customer', req.params.id, `تم حذف العميل ${customer.name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/customers/merge', async (req, res) => {
  try {
    const { sourceId, targetId } = req.body;
    if (!sourceId || !targetId || sourceId === targetId) {
      return res.status(400).json({ error: 'معرفات غير صالحة' });
    }
    const source = await getDb("SELECT * FROM customers WHERE id = ?", [sourceId]);
    const target = await getDb("SELECT * FROM customers WHERE id = ?", [targetId]);
    if (!source || !target) return res.status(404).json({ error: 'أحد العملاء غير موجود' });
    const orderRows = await allDb("SELECT data FROM orders");
    for (const row of orderRows) {
      try {
        const o = JSON.parse(row.data);
        if (o.customerId === sourceId) {
          o.customerId = targetId;
          await runDb("UPDATE orders SET data = ? WHERE id = ?", [JSON.stringify(o), o.id]);
        }
      } catch {}
    }
    await runDb("DELETE FROM customers WHERE id = ?", [sourceId]);
    await updateCustomerStats(targetId);
    await logActivity('update', 'customer', targetId, `تم دمج العميل ${source.name} مع ${target.name}`);
    res.json({ success: true, customer: await getDb("SELECT * FROM customers WHERE id = ?", [targetId]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/customers/:id/refresh-stats', async (req, res) => {
  try {
    await updateCustomerStats(req.params.id);
    const customer = await getDb("SELECT * FROM customers WHERE id = ?", [req.params.id]);
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
