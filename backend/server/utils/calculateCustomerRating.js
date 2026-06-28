import { getDb, runDb } from '../db.js';

const DELIVERED_STATUS = 'تم التوصيل';
const RETURNED_STATUSES = ['مرتجع من الشحن', 'تم الارجاع'];
const CANCELED_STATUSES = ['تم الغاء الطلب'];
const HIGH_RISK_STATUS = 'مخاطر عالية';

export async function calculateCustomerRating(customerId) {
  if (!customerId) return;
  try {
    const orderRows = await getDb("SELECT data FROM orders WHERE data LIKE ?", [`%"customerId":"${customerId}"%`]);
    const orders = [];
    if (orderRows) {
      const rows = Array.isArray(orderRows) ? orderRows : [orderRows];
      for (const row of rows) {
        try {
          const o = JSON.parse(row.data);
          if (o.customerId === customerId) orders.push(o);
        } catch {}
      }
    }
    if (orders.length === 0) {
      await runDb("UPDATE customers SET rating = 0, classification = 'جديد', total_orders = 0, total_spent = 0, last_order_date = NULL, updated_at = datetime('now') WHERE id = ?", [customerId]);
      return;
    }

    // Check 2-day new period (created_at = first order date)
    const customerRows = await getDb("SELECT created_at FROM customers WHERE id = ?", [customerId]);
    const customerCreatedAt = customerRows?.[0]?.created_at;
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const isNew = customerCreatedAt && new Date(customerCreatedAt) > twoDaysAgo;

    if (isNew) {
      const totalSpent = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
      const lastDate = orders.reduce((latest, o) => !latest || o.createdAt > latest ? o.createdAt : latest, null);
      await runDb(
        `UPDATE customers SET rating = 0, classification = 'جديد', total_orders = ?, total_spent = ?, last_order_date = ?, updated_at = datetime('now') WHERE id = ?`,
        [orders.length, totalSpent, lastDate || null, customerId]
      );
      return;
    }

    const total = orders.length;
    const delivered = orders.filter(o => o.status === DELIVERED_STATUS).length;
    const returned = orders.filter(o => RETURNED_STATUSES.includes(o.status)).length;
    const canceled = orders.filter(o => CANCELED_STATUSES.includes(o.status)).length;
    const highRisk = orders.filter(o => o.status === HIGH_RISK_STATUS).length;
    const totalSpent = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const lastDate = orders.reduce((latest, o) => !latest || o.createdAt > latest ? o.createdAt : latest, null);
    const deliveryRate = total > 0 ? (delivered / total) * 100 : 0;
    const returnRate = total > 0 ? (returned / total) * 100 : 0;
    const cancelRate = total > 0 ? (canceled / total) * 100 : 0;
    const highRiskRate = total > 0 ? (highRisk / total) * 100 : 0;
    let classification;
    if (deliveryRate >= 85 && returnRate < 10 && highRiskRate < 5) {
      classification = 'ممتاز';
    } else if (deliveryRate >= 70 && returnRate < 20 && highRiskRate < 10) {
      classification = 'جيد جداً';
    } else if (deliveryRate >= 50 && returnRate < 30) {
      classification = 'جيد';
    } else {
      classification = 'تحت المراقبة';
    }
    const rating = Math.round(deliveryRate);
    await runDb(
      `UPDATE customers SET rating = ?, classification = ?, total_orders = ?, total_spent = ?, last_order_date = ?, updated_at = datetime('now') WHERE id = ?`,
      [rating, classification, total, totalSpent, lastDate || null, customerId]
    );
  } catch (err) {
    console.error(`[Rating] فشل حساب تقييم العميل ${customerId}:`, err.message);
  }
}
