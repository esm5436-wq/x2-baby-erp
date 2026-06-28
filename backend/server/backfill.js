import { allDb, getDb, runDb, logActivity } from './db.js';
import crypto from 'crypto';
import { calculateCustomerRating } from './utils/calculateCustomerRating.js';

async function findCustomerByPhone(phone) {
  if (!phone) return null;
  const clean = phone.trim();
  const row = await getDb("SELECT * FROM customers WHERE phone = ? OR alt_phone = ?", [clean, clean]);
  return row || null;
}

export async function backfillOrdersAsync() {
  try {
    const orderRows = await allDb("SELECT data FROM orders");
    const phoneMap = {};
    for (const row of orderRows) {
      try {
        const o = JSON.parse(row.data);
        if (!o.customerPhone) continue;
        const phone = o.customerPhone.trim();
        if (!phone) continue;
        if (!phoneMap[phone]) phoneMap[phone] = { orders: [], lastDate: null, firstDate: null, best: {} };
        const entry = phoneMap[phone];
        entry.orders.push(o);
        if (!entry.firstDate || o.createdAt < entry.firstDate) entry.firstDate = o.createdAt;
        if (!entry.lastDate || o.createdAt > entry.lastDate) {
          entry.lastDate = o.createdAt;
          entry.best = {
            name: o.customerName || phone,
            address: o.address || '',
            city: o.city || '',
            altPhone: o.altPhone || '',
            mapUrl: o.mapUrl || '',
            latitude: o.latitude || '',
            longitude: o.longitude || '',
            notes: o.notes || ''
          };
        }
      } catch {}
    }
    let created = 0;
    let linked = 0;
    for (const [phone, entry] of Object.entries(phoneMap)) {
      const totalSpent = entry.orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
      const existing = await findCustomerByPhone(phone);
      let customerId;
      if (existing) {
        customerId = existing.id;
        await runDb(
          `UPDATE customers SET total_orders=?, total_spent=?, last_order_date=?, name=?, address=?, city=?, alt_phone=?, map_url=?, latitude=?, longitude=?, notes=?, created_at=IFNULL(?, created_at), updated_at=datetime('now') WHERE id=?`,
          [entry.orders.length, totalSpent, entry.lastDate, entry.best.name, entry.best.address,
           entry.best.city, entry.best.altPhone, entry.best.mapUrl, entry.best.latitude,
           entry.best.longitude, entry.best.notes, entry.firstDate || null, customerId]
        );
      } else {
        const id = `cus-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const now = new Date().toISOString();
        const firstDate = entry.firstDate || entry.lastDate || now;
        await runDb(
          `INSERT INTO customers (id, name, phone, alt_phone, address, city, map_url, latitude, longitude, notes, total_orders, total_spent, last_order_date, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, entry.best.name, phone, entry.best.altPhone || null, entry.best.address || null,
           entry.best.city || null, entry.best.mapUrl || null, entry.best.latitude || null,
           entry.best.longitude || null, entry.best.notes || null, entry.orders.length,
           totalSpent, entry.lastDate || now, firstDate, now]
        );
        customerId = id;
        created++;
      }
      for (const o of entry.orders) {
        if (!o.customerId) {
          o.customerId = customerId;
          await runDb("UPDATE orders SET data = ? WHERE id = ?", [JSON.stringify(o), o.id]);
          linked++;
        }
      }
      await calculateCustomerRating(customerId);
    }
    if (created > 0 || linked > 0) {
      await logActivity('create', 'customer', 'bulk', `تم ترحيل ${created} عميل جديد وربط ${linked} طلب`);
    }
    console.log(`[Backfill] تم الترحيل التلقائي: ${created} عميل جديد, ${linked} طلب مرتبط`);
  } catch (err) {
    console.error('[Backfill] فشل الترحيل التلقائي:', err.message);
  }
}
