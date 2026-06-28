import { Router } from 'express';
import { allDb, getDb, runDb, logActivity, generateOrderId, adjustStock, getAllProducts, isActiveStatus, resolveProductBySku, resolveVariantBySku } from '../db.js';
import { findOrCreateCustomer, updateCustomerStats } from './customers.js';

const router = Router();

async function adjustStockForEdit(oldItems, newItems, orderStatus) {
  if (!isActiveStatus(orderStatus)) return;
  const oldMap = {};
  oldItems.forEach(item => {
    const key = `${item.productId}_${item.variantId}`;
    oldMap[key] = item.quantity;
  });
  const newMap = {};
  newItems.forEach(item => {
    const key = `${item.productId}_${item.variantId}`;
    newMap[key] = item.quantity;
  });
  // Removed items
  for (const key of Object.keys(oldMap)) {
    if (!(key in newMap)) {
      const [productId, variantId] = key.split('_');
      await adjustStock([{ productId, variantId, quantity: oldMap[key] }], 'return');
    }
  }
  // Added items
  for (const key of Object.keys(newMap)) {
    if (!(key in oldMap)) {
      const [productId, variantId] = key.split('_');
      await adjustStock([{ productId, variantId, quantity: newMap[key] }], 'deduct');
    }
  }
  // Changed quantity
  for (const key of Object.keys(oldMap)) {
    if (key in newMap && oldMap[key] !== newMap[key]) {
      const [productId, variantId] = key.split('_');
      const diff = oldMap[key] - newMap[key];
      if (diff > 0) {
        await adjustStock([{ productId, variantId, quantity: diff }], 'return');
      } else {
        await adjustStock([{ productId, variantId, quantity: -diff }], 'deduct');
      }
    }
  }
}

router.post('/api/orders', async (req, res) => {
  try {
    const order = req.body;
    if (order.items) {
      for (const item of order.items) {
        // Validate SKU if present
        if (item.sku && item.sku.startsWith('SKU-')) {
          const found = await resolveVariantBySku(item.sku);
          if (found) {
            item.productId = found.product.id;
            item.variantId = found.variant.id;
            item.skuStatus = 'matched';
          } else {
            const prod = await resolveProductBySku(item.sku);
            if (prod) {
              item.productId = prod.id;
              if (prod.variants?.length === 1) {
                item.variantId = prod.variants[0].id;
              }
              item.skuStatus = 'matched';
            } else {
              item.skuStatus = 'unmatched';
            }
          }
        }

        if (!item.productId) {
          return res.status(400).json({ error: `المنتج "${item.productName || 'غير معروف'}" ليس له معرف منتج صالح. يرجى إعادة ربط المنتج بالطلب.` });
        }
      }

      // Log items with unmatched SKUs for manual review
      const unmatched = order.items.filter(i => i.skuStatus === 'unmatched');
      if (unmatched.length > 0) {
        await logActivity('warning', 'order', '', `طلب يحتوي على ${unmatched.length} منتج(ة) برقم SKU غير متطابق - يتطلب مراجعة يدوية`,
          { items: unmatched.map(i => ({ name: i.productName, sku: i.sku })) });
      }
    }
    if (order.customerPhone && !order.customerId) {
      const customer = await findOrCreateCustomer({
        name: order.customerName,
        phone: order.customerPhone,
        address: order.address,
        city: order.city,
        altPhone: order.altPhone,
        mapUrl: order.mapUrl,
        latitude: order.latitude,
        longitude: order.longitude,
        notes: order.notes
      });
      if (customer) order.customerId = customer.id;
    }
    if (order.customerId) {
      await updateCustomerStats(order.customerId);
    } else if (order.customerPhone) {
      const customer = await findOrCreateCustomer(
        order.customerName, order.customerPhone, order.address, order.city, order.altPhone
      );
      if (customer) order.customerId = customer.id;
    }
    let activityLogId;
    const existingRow = await getDb("SELECT data FROM orders WHERE id = ?", [order.id]);
    if (existingRow) {
      const existingOrder = JSON.parse(existingRow.data);
      await adjustStockForEdit(existingOrder.items || [], order.items || [], order.status || existingOrder.status);
      await runDb("UPDATE orders SET data = ? WHERE id = ?",
        [JSON.stringify(order), order.id]);
      activityLogId = await logActivity('update', 'order', order.id, `تم تحديث الطلب للعميل ${order.customerName}`, { previousState: existingOrder, newState: order });
    } else {
      const newId = await generateOrderId();
      order.id = newId;
      if (isActiveStatus(order.status)) {
        await adjustStock(order.items || [], 'deduct');
      }
      await runDb("INSERT INTO orders (id, data) VALUES (?, ?)",
        [order.id, JSON.stringify(order)]);
      activityLogId = await logActivity('create', 'order', order.id, `تم إنشاء الطلب للعميل ${order.customerName}`, { entityData: order });
    }
    if (order.customerId) {
      await updateCustomerStats(order.customerId);
    }
    const products = await getAllProducts();
    const id = order.id;
    res.json({ success: true, id, activityLogId, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/orders/:id', async (req, res) => {
  try {
    const row = await getDb("SELECT data FROM orders WHERE id = ?", [req.params.id]);
    if (row) {
      const order = JSON.parse(row.data);
      if (isActiveStatus(order.status)) {
        await adjustStock(order.items || [], 'return');
      }
      await runDb("DELETE FROM orders WHERE id = ?", [req.params.id]);
      const activityLogId = await logActivity('delete', 'order', req.params.id, `تم حذف الطلب للعميل ${order.customerName}`, { entityData: order });
    }
    const products = await getAllProducts();
    res.json({ success: true, activityLogId, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/orders/bulk-delete', async (req, res) => {
  try {
    const ids = req.body.ids;
    const entityData = {};
    await runDb("BEGIN TRANSACTION");
    for (const id of ids) {
      const row = await getDb("SELECT data FROM orders WHERE id = ?", [id]);
      if (row) {
        const order = JSON.parse(row.data);
        entityData[id] = order;
        if (isActiveStatus(order.status)) {
          await adjustStock(order.items || [], 'return');
        }
      }
    }
    const placeholders = ids.map(() => '?').join(',');
    await runDb(`DELETE FROM orders WHERE id IN (${placeholders})`, ids);
    await runDb("COMMIT");
    const activityLogId = await logActivity('delete', 'order', ids.join(','), `تم حذف ${ids.length} طلب`, { entityData });
    const products = await getAllProducts();
    res.json({ success: true, activityLogId, products });
  } catch (err) {
    await runDb("ROLLBACK").catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

router.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const row = await getDb("SELECT data FROM orders WHERE id = ?", [req.params.id]);
    if (!row) return res.status(404).json({ error: "Order not found" });
    const order = JSON.parse(row.data);
    const previousState = JSON.parse(JSON.stringify(order));
    const oldStatus = order.status;
    if (isActiveStatus(oldStatus) && !isActiveStatus(status)) {
      await adjustStock(order.items || [], 'return');
    } else if (!isActiveStatus(oldStatus) && isActiveStatus(status)) {
      await adjustStock(order.items || [], 'deduct');
    }
    order.status = status;
    await runDb("UPDATE orders SET data = ? WHERE id = ?",
      [JSON.stringify(order), req.params.id]);
    const newState = JSON.parse(JSON.stringify(order));
    const activityLogId = await logActivity('update', 'order', req.params.id, `تم تغيير حالة الطلب للعميل ${order.customerName} إلى ${status}`, { previousState, newState });
    const products = await getAllProducts();
    res.json({ success: true, activityLogId, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/api/orders/batch/status', async (req, res) => {
  try {
    const { orderIds, status } = req.body;
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: "Invalid orderIds" });
    }
    const previousState = {};
    const newState = {};
    await runDb("BEGIN TRANSACTION");
    for (const id of orderIds) {
      const row = await getDb("SELECT data FROM orders WHERE id = ?", [id]);
      if (row) {
        const order = JSON.parse(row.data);
        previousState[id] = JSON.parse(JSON.stringify(order));
        const oldStatus = order.status;
        if (isActiveStatus(oldStatus) && !isActiveStatus(status)) {
          await adjustStock(order.items || [], 'return');
        } else if (!isActiveStatus(oldStatus) && isActiveStatus(status)) {
          await adjustStock(order.items || [], 'deduct');
        }
        order.status = status;
        newState[id] = JSON.parse(JSON.stringify(order));
        await runDb("UPDATE orders SET data = ? WHERE id = ?",
          [JSON.stringify(order), id]);
      }
    }
    await runDb("COMMIT");
    const activityLogId = await logActivity('update', 'order', orderIds.join(','), `تم تغيير حالة ${orderIds.length} طلب إلى ${status}`, { previousState, newState });
    const products = await getAllProducts();
    res.json({ success: true, activityLogId, products });
  } catch (err) {
    await runDb("ROLLBACK").catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/orders/:id/track-costs', async (req, res) => {
  try {
    const orderId = req.params.id;
    const { items } = req.body;
    await runDb("DELETE FROM order_items_cost_tracking WHERE order_id = ?", [orderId]);
    for (const item of items) {
      await runDb(
        `INSERT INTO order_items_cost_tracking (order_id, product_id, cost_at_sale, quantity, price_at_sale) VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.productId, item.costPrice || 0, item.quantity || 1, item.price || 0]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/api/orders/batch', async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ids' });
    }
    const previousState = {};
    const newState = {};
    await runDb("BEGIN TRANSACTION");
    for (const id of ids) {
      const row = await getDb("SELECT data FROM orders WHERE id = ?", [id]);
      if (row) {
        const order = JSON.parse(row.data);
        previousState[id] = JSON.parse(JSON.stringify(order));
        Object.keys(updates).forEach(key => {
          order[key] = updates[key];
        });
        newState[id] = JSON.parse(JSON.stringify(order));
        await runDb("UPDATE orders SET data = ? WHERE id = ?",
          [JSON.stringify(order), id]);
      }
    }
    await runDb("COMMIT");
    const activityLogId = await logActivity('update', 'order', ids.join(','), `تم تعديل ${ids.length} طلب`, { previousState, newState });
    const products = await getAllProducts();
    res.json({ success: true, activityLogId, products });
  } catch (err) {
    await runDb("ROLLBACK").catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

export default router;
