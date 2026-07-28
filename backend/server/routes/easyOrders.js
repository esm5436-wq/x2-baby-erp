import { Router } from 'express';
import { allDb, getDb, runDb, logActivity, getAllProducts } from '../db.js';
import {
  addStagingOrder, getStagingOrders, getStagingOrder,
  confirmStagingOrder, rejectStagingOrder, updateStagingOrder,
  saveProductMap, getProductMap, getAllProductMaps,
  addSyncLog, getSyncLogs
} from '../db.js';
import {
  getConfig, call, uploadToImgBB, uploadImages,
  mapProductToEasy, extractProductAndVariantIds, mapEasyOrderToErp,
  generateSlug,
  updateEasyStock, updateEasyOrderStatus,
  syncProductToEasy
} from '../utils/easyOrdersClient.js';

const router = Router();

// ========== 1. الإعدادات ==========

router.get('/api/easy-orders/config', async (req, res) => {
  try {
    const row = await getDb("SELECT value FROM settings WHERE key = 'easyorders_config'");
    const config = row ? JSON.parse(row.value) : {};
    const defaultsRow = await getDb("SELECT value FROM settings WHERE key = 'easyorders_export_defaults'");
    const defaults = defaultsRow ? JSON.parse(defaultsRow.value) : {};
    const lastPollRow = await getDb("SELECT value FROM settings WHERE key = 'easyorders_last_poll'");
    res.json({ success: true, config, defaults, lastPoll: lastPollRow?.value || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/easy-orders/config', async (req, res) => {
  try {
    const { config, defaults } = req.body;
    if (config) {
      config.updatedAt = new Date().toISOString();
      if (!config.createdAt) config.createdAt = config.updatedAt;
      await runDb("INSERT OR REPLACE INTO settings (key, value) VALUES ('easyorders_config', ?)", [JSON.stringify(config)]);
    }
    if (defaults) {
      await runDb("INSERT OR REPLACE INTO settings (key, value) VALUES ('easyorders_export_defaults', ?)", [JSON.stringify(defaults)]);
    }
    await logActivity('update', 'settings', 'easyorders_config', 'تم تحديث إعدادات Easy Orders');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 2. اختبار الاتصال ==========

router.post('/api/easy-orders/test-connection', async (req, res) => {
  try {
    const cfg = await getConfig();
    if (!cfg) return res.status(400).json({ error: 'التكامل غير مفعل' });
    const resp = await fetch('https://api.easy-orders.net/api/v1/external-apps/products?limit=1', {
      headers: { 'Api-Key': cfg.apiKey }
    });
    if (resp.ok) {
      await addSyncLog('poll', 'inbound', null, null, 'success', 'اختبار الاتصال: ناجح');
      res.json({ success: true, message: 'الاتصال ناجح ✅' });
    } else {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.message || `فشل الاتصال: ${resp.status}`);
    }
  } catch (err) {
    await addSyncLog('poll', 'inbound', null, null, 'failed', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========== 3. تصدير المنتجات ==========

router.get('/api/easy-orders/export/preview', async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) return res.status(400).json({ error: 'يرجى تحديد المنتجات المراد تصديرها' });
    const productIds = ids.split(',');
    const products = [];
    for (const pid of productIds) {
      const row = await getDb("SELECT data FROM products WHERE id = ?", [pid.trim()]);
      if (row) products.push(JSON.parse(row.data));
    }
    const preview = products.map(p => ({
      product: p,
      easyProduct: mapProductToEasy(p, []) // preview only, categories resolved on confirm
    }));
    res.json({ success: true, preview });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/easy-orders/export/confirm', async (req, res) => {
  try {
    const { products, exportImages } = req.body;
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'بيانات المنتجات غير صالحة' });
    }
    const config = await getDb("SELECT value FROM settings WHERE key = 'easyorders_config'");
    const cfg = config ? JSON.parse(config.value) : {};
    const imgbbKey = cfg.imgbbApiKey || '';
    const results = [];

    for (const item of products) {
      try {
        const product = item.product || item;

        // Resolve category names to EasyOrders category IDs
        // After mirror sync, ERP category IDs ARE the EasyOrders IDs
        const catNames = product.categories || (product.category ? [product.category] : []);
        const resolvedCategoryIds = [];
        for (const catName of catNames) {
          if (!catName) continue;
          const catRow = await allDb("SELECT id FROM categories WHERE name = ?", [catName]);
          if (catRow?.[0]?.id) {
            resolvedCategoryIds.push(catRow[0].id);
          }
        }

        let easyProduct = item.easyProduct || mapProductToEasy(product, resolvedCategoryIds);

        if (exportImages && product.image) {
          const imgUrl = await uploadToImgBB(product.image, imgbbKey);
          if (imgUrl) {
            easyProduct.thumb = imgUrl;
            easyProduct.images = [imgUrl];
          }
        }
        if (exportImages && product.images?.length > 0) {
          for (const img of product.images) {
            const url = await uploadToImgBB(img, imgbbKey);
            if (url && !easyProduct.images.includes(url)) easyProduct.images.push(url);
          }
        }

        let existingMap = await getProductMap(product.id);
        let easyResponse;

        if (existingMap?.easyProductId) {
          easyResponse = await call('PATCH', `/products/${existingMap.easyProductId}`, easyProduct);
          const { productId, sku, variantsMap } = extractProductAndVariantIds(easyResponse || easyProduct);
          await saveProductMap(product.id, productId || existingMap.easyProductId, sku || existingMap.easy_product_sku, variantsMap);
        } else {
          easyResponse = await call('POST', '/products', easyProduct);
          const { productId, sku, variantsMap } = extractProductAndVariantIds(easyResponse || easyProduct);
          await saveProductMap(product.id, productId || '', sku || product.id, variantsMap);
        }

        results.push({ productId: product.id, success: true, easyProductId: easyResponse?.id || '' });
        await addSyncLog('export', 'outbound', 'product', product.id, 'success', `تم تصدير ${product.name}`);
      } catch (err) {
        results.push({ productId: item.product?.id || item.id || 'unknown', success: false, error: err.message });
        await addSyncLog('export', 'outbound', 'product', item.product?.id || '', 'failed', err.message);
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 4. الـ Polling - جلب الطلبات ==========

router.post('/api/easy-orders/poll', async (req, res) => {
  try {
    const cfg = await getConfig();
    if (!cfg) return res.status(400).json({ error: 'التكامل غير مفعل' });

    const url = `https://api.easy-orders.net/api/v1/external-apps/orders?page=1&limit=1`;
    const resp = await fetch(url, { headers: { 'Api-Key': cfg.apiKey } });
    if (resp.status === 404) {
      await addSyncLog('poll', 'inbound', 'order', '', 'failed', 'جلب الطلبات غير متاح — Easy Orders لا يدعم قائمة الطلبات. استخدم Webhook بدلاً من ذلك.');
      return res.json({ success: true, message: 'جلب الطلبات غير متاح. يُرجى استخدام Webhook لاستقبال الطلبات.', notAvailable: true });
    }
    if (!resp.ok) throw new Error(`فشل جلب الطلبات: ${resp.status}`);

    const lastPollRow = await getDb("SELECT value FROM settings WHERE key = 'easyorders_last_poll'");
    const lastPoll = lastPollRow?.value || '';

    const allOrders = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      let filterParam = 'filter=created_at||gt||' + encodeURIComponent(lastPoll || '2020-01-01');
      const url = `https://api.easy-orders.net/api/v1/external-apps/orders?${filterParam}&page=${page}&limit=50`;
      const resp = await fetch(url, { headers: { 'Api-Key': cfg.apiKey } });
      if (!resp.ok) {
        throw new Error(`فشل جلب الطلبات: ${resp.status}`);
      }
      const data = await resp.json();
      const orders = Array.isArray(data) ? data : (data.orders || data.data || []);
      allOrders.push(...orders);
      hasMore = orders.length === 50;
      page++;
    }

    const now = new Date().toISOString();
    await runDb("INSERT OR REPLACE INTO settings (key, value) VALUES ('easyorders_last_poll', ?)", [now]);

    const imported = [];
    let skipped = 0;

    for (const easyOrder of allOrders) {
      const existing = await getDb("SELECT id FROM easyorders_staging WHERE easy_order_id = ?", [easyOrder.id || easyOrder._id]);
      if (existing) { skipped++; continue; }
      const erpOrder = await mapEasyOrderToErp(easyOrder);
      const stagingId = await addStagingOrder(easyOrder.id || easyOrder._id, erpOrder, easyOrder.status);
      imported.push({ stagingId, orderId: erpOrder.id, customerName: erpOrder.customerName, easyOrderId: easyOrder.id });
    }

    await addSyncLog('poll', 'inbound', 'order', '', 'success', `تم جلب ${imported.length} طلب جديد (تخطي ${skipped})`, { count: imported.length, skipped });
    res.json({ success: true, imported: imported.length, skipped, orders: imported });
  } catch (err) {
    await addSyncLog('poll', 'inbound', 'order', '', 'failed', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========== 5. إدارة طلبات المراجعة (Staging) ==========

router.get('/api/easy-orders/staging', async (req, res) => {
  try {
    const { status } = req.query;
    const orders = await getStagingOrders(status || null);
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/easy-orders/staging/:id', async (req, res) => {
  try {
    const order = await getStagingOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/api/easy-orders/staging/:id', async (req, res) => {
  try {
    const { updates } = req.body;
    const result = await updateStagingOrder(req.params.id, updates);
    await addSyncLog('confirm', 'inbound', 'order', req.params.id, 'success', 'تم تعديل طلب قيد المراجعة');
    res.json({ success: true, order: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/easy-orders/staging/:id/confirm', async (req, res) => {
  try {
    const stagingOrder = await getStagingOrder(req.params.id);
    if (!stagingOrder) return res.status(404).json({ error: 'الطلب غير موجود' });
    const orderData = await confirmStagingOrder(req.params.id);
    if (stagingOrder.easy_order_id) {
      try { await updateEasyOrderStatus(stagingOrder.easy_order_id, 'confirmed'); } catch {}
    }
    await addSyncLog('confirm', 'inbound', 'order', req.params.id, 'success', `تم تأكيد الطلب للعميل ${orderData.customerName}`);
    res.json({ success: true, order: orderData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/easy-orders/staging/:id/reject', async (req, res) => {
  try {
    const stagingOrder = await getStagingOrder(req.params.id);
    if (!stagingOrder) return res.status(404).json({ error: 'الطلب غير موجود' });
    const result = await rejectStagingOrder(req.params.id);
    if (stagingOrder.easy_order_id) {
      try { await updateEasyOrderStatus(stagingOrder.easy_order_id, 'canceled'); } catch {}
    }
    await addSyncLog('reject', 'inbound', 'order', req.params.id, 'success', 'تم رفض الطلب وإعادة المخزون');
    res.json({ success: true, stagingId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/easy-orders/staging/batch-confirm', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'معرفات غير صالحة' });
    const confirmed = [];
    const errors = [];
    for (const id of ids) {
      try {
        const stagingOrder = await getStagingOrder(id);
        const orderData = await confirmStagingOrder(id);
        if (stagingOrder?.easy_order_id) {
          try { await updateEasyOrderStatus(stagingOrder.easy_order_id, 'confirmed'); } catch {}
        }
        confirmed.push({ id, customer: orderData.customerName });
        await addSyncLog('confirm', 'inbound', 'order', id, 'success', `تأكيد جماعي: ${orderData.customerName}`);
      } catch (e) { errors.push({ id, error: e.message }); }
    }
    res.json({ success: true, confirmed: confirmed.length, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/easy-orders/staging/batch-reject', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'معرفات غير صالحة' });
    const rejected = [];
    const errors = [];
    for (const id of ids) {
      try {
        const stagingOrder = await getStagingOrder(id);
        await rejectStagingOrder(id);
        if (stagingOrder?.easy_order_id) {
          try { await updateEasyOrderStatus(stagingOrder.easy_order_id, 'canceled'); } catch {}
        }
        rejected.push(id);
        await addSyncLog('reject', 'inbound', 'order', id, 'success', 'رفض جماعي');
      } catch (e) { errors.push({ id, error: e.message }); }
    }
    res.json({ success: true, rejected: rejected.length, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 6. سجل المزامنة ==========

router.get('/api/easy-orders/sync-logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await getSyncLogs(limit);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 7. حالة التكامل (Dashboard Stats) ==========

router.get('/api/easy-orders/stats', async (req, res) => {
  try {
    const pendingStaging = await allDb("SELECT COUNT(*) as count FROM easyorders_staging WHERE status = 'pending'");
    const totalExported = await allDb("SELECT COUNT(*) as count FROM easyorders_product_map WHERE status = 'synced'");
    const lastPoll = await getDb("SELECT value FROM settings WHERE key = 'easyorders_last_poll'");
    const config = await getDb("SELECT value FROM settings WHERE key = 'easyorders_config'");
    const cfg = config ? JSON.parse(config.value) : {};

    res.json({
      success: true,
      stats: {
        pendingOrders: pendingStaging[0]?.count || 0,
        exportedProducts: totalExported[0]?.count || 0,
        lastPoll: lastPoll?.value || null,
        enabled: !!cfg.enabled,
        apiKeySet: !!cfg.apiKey
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 8. رفع صورة لـ ImgBB ==========

router.post('/api/easy-orders/upload-image', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'الصورة مطلوبة' });
    const configRow = await getDb("SELECT value FROM settings WHERE key = 'easyorders_config'");
    const cfg = configRow ? JSON.parse(configRow.value) : {};
    const url = await uploadToImgBB(image, cfg.imgbbApiKey || '');
    res.json({ success: !!url, url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 9. Webhook ==========

router.post('/api/easy-orders/webhook', async (req, res) => {
  try {
    const secret = req.headers['secret'] || req.body?.secret || req.query?.secret;
    const webhookRow = await getDb("SELECT secret FROM easyorders_webhook_config LIMIT 1");
    if (webhookRow && webhookRow.secret && secret !== webhookRow.secret) {
      await addSyncLog('webhook', 'inbound', 'order', null, 'failed', `Webhook secret mismatch. Got: ${secret?.substring(0,5) || 'null'}`);
      return res.status(401).json({ error: 'Secret غير صالح' });
    }

    await addSyncLog('poll', 'inbound', 'order', null, 'success', `Webhook raw: ${JSON.stringify(req.body).substring(0, 300)}`);

    const body = req.body || {};
    const event = body.event || body.type || body.event_type;
    const payload = body.data || body;

    const isOrder = event === 'order.created' || event === 'order' || (!event && body.cart_items);
    const isStatusUpdate = event === 'order-status-update' || (event === 'order.status.updated');

    if (isOrder) {
      const easyOrder = payload;
      const orderId = easyOrder.id || easyOrder._id;
      const existing = await getDb("SELECT id, status FROM easyorders_staging WHERE easy_order_id = ?", [orderId]);
      if (existing && existing.status !== 'pending') {
        return res.json({ success: true, message: 'الطلب موجود مسبقاً' });
      }
      if (existing) {
        const erpOrder = await mapEasyOrderToErp(easyOrder);
        await runDb("UPDATE easyorders_staging SET data = ?, source_order_status = ? WHERE id = ?", [JSON.stringify(erpOrder), easyOrder.status, existing.id]);
        return res.json({ success: true, stagingId: existing.id, updated: true });
      }
      const erpOrder = await mapEasyOrderToErp(easyOrder);
      const stagingId = await addStagingOrder(orderId, erpOrder, easyOrder.status);
      await addSyncLog('poll', 'inbound', 'order', stagingId, 'success', `Webhook: طلب جديد من ${erpOrder.customerName}`);
      return res.json({ success: true, stagingId });
    }

    if (isStatusUpdate) {
      const orderId = payload.order_id || payload.id;
      const status = payload.new_status || payload.status;
      const statusMap = {
        'pending': 'تحت المراجعة',
        'confirmed': 'تم التأكيد',
        'processing': 'قيد التجهيز للشحن',
        'waiting_for_pickup': 'بانتظار الشحن',
        'in_delivery': 'قيد التوصيل',
        'delivered': 'تم التوصيل',
        'canceled': 'تم الغاء الطلب',
        'returning_from_delivery': 'مرتجع من الشحن',
        'request_refund': 'العميل طلب الارجاع',
        'refund_in_progress': 'جاري الارجاع',
        'refunded': 'تم الارجاع'
      };
      const erpStatus = statusMap[status] || status;
      const staging = await getDb("SELECT data FROM easyorders_staging WHERE easy_order_id = ?", [orderId]);
      if (staging) {
        const data = JSON.parse(staging.data);
        data.status = erpStatus;
        await runDb("UPDATE easyorders_staging SET data = ?, source_order_status = ? WHERE easy_order_id = ?", [JSON.stringify(data), status, orderId]);
      }
      await addSyncLog('poll', 'inbound', 'order', orderId, 'success', `Webhook: تحديث حالة الطلب إلى ${erpStatus}`);
      return res.json({ success: true });
    }

    await addSyncLog('poll', 'inbound', 'order', null, 'success', `Webhook event غير معروف: ${event}`);
    res.json({ success: true, message: 'Event غير معروف' });
  } catch (err) {
    await addSyncLog('poll', 'inbound', 'order', null, 'failed', `Webhook error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ========== 9b. Webhook Config ==========
router.post('/api/easy-orders/webhook-config', async (req, res) => {
  try {
    const { secret } = req.body;
    if (!secret) return res.status(400).json({ error: 'Secret مطلوب' });
    const existing = await getDb("SELECT id FROM easyorders_webhook_config LIMIT 1");
    if (existing) {
      await runDb("UPDATE easyorders_webhook_config SET secret = ? WHERE id = ?", [secret, existing.id]);
    } else {
      await runDb("INSERT INTO easyorders_webhook_config (secret) VALUES (?)", [secret]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 10. Outbound Sync — Stock ==========

router.post('/api/easy-orders/outbound/stock', async (req, res) => {
  try {
    const { productId } = req.body;
    const productRow = await getDb("SELECT data FROM products WHERE id = ?", [productId]);
    if (!productRow) return res.status(404).json({ error: 'المنتج غير موجود' });

    const product = JSON.parse(productRow.data);
    const mapRow = await getDb("SELECT * FROM easyorders_product_map WHERE erp_product_id = ?", [productId]);
    if (!mapRow || !mapRow.easy_product_sku) {
      return res.status(400).json({ error: 'المنتج غير مُصدَّر للمتجر بعد' });
    }

    const totalQty = (product.variants || []).reduce((s, v) => s + (v.quantity || 0), 0);
    await updateEasyStock(mapRow.easy_product_sku, totalQty);
    await runDb("UPDATE easyorders_product_map SET last_synced_at = datetime('now'), status = 'synced' WHERE erp_product_id = ?", [productId]);
    await addSyncLog('export', 'outbound', 'product', productId, 'success', `مزامنة مخزون: ${product.name} (${totalQty} قطعة)`);

    res.json({ success: true, quantity: totalQty });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 11. Outbound Sync — Order Status ==========

router.post('/api/easy-orders/outbound/order-status', async (req, res) => {
  try {
    const { orderId, newStatus } = req.body;
    const orderRow = await getDb("SELECT data FROM orders WHERE id = ?", [orderId]);
    if (!orderRow) return res.status(404).json({ error: 'الطلب غير موجود' });

    const order = JSON.parse(orderRow.data);
    const externalOrderId = order.externalOrderId;
    if (!externalOrderId) {
      return res.status(400).json({ error: 'الطلب ليس له معرف خارجي' });
    }

    const statusMap = {
      'تحت المراجعة': 'pending',
      'تم التأكيد': 'confirmed',
      'قيد التجهيز للشحن': 'processing',
      'بانتظار الشحن': 'waiting_for_pickup',
      'قيد التوصيل': 'in_delivery',
      'تم التوصيل': 'delivered',
      'تم الغاء الطلب': 'canceled',
      'مرتجع من الشحن': 'returning_from_delivery',
      'العميل طلب الارجاع': 'request_refund',
      'جاري الارجاع': 'refund_in_progress',
      'تم الارجاع': 'refunded'
    };

    const easyStatus = statusMap[newStatus];
    if (!easyStatus) {
      return res.status(400).json({ error: `حالة "${newStatus}" غير قابلة للمزامنة` });
    }

    await updateEasyOrderStatus(externalOrderId, easyStatus);
    await addSyncLog('export', 'outbound', 'order', orderId, 'success', `مزامنة حالة الطلب: ${newStatus}`);
    res.json({ success: true, easyStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 12. Category Sync ==========

router.get('/api/easy-orders/categories', async (req, res) => {
  try {
    const cfg = await getConfig();
    if (!cfg) return res.status(400).json({ error: 'التكامل غير مفعل' });
    const easyCategories = await call('GET', '/categories');
    const localMap = await allDb("SELECT * FROM easyorders_category_map");
    res.json({ success: true, categories: easyCategories, localMap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/easy-orders/categories/sync', async (req, res) => {
  try {
    const { direction } = req.body;
    const results = [];

    if (direction === 'easy-to-erp') {
      const easyCategories = await call('GET', '/categories');
      const easyList = Array.isArray(easyCategories) ? easyCategories : (easyCategories?.data || []);

      const flattenEasyCats = (cats, parentId = null) => {
        const flat = [];
        for (const c of cats) {
          flat.push({ ...c, parentId });
          if (c.children && Array.isArray(c.children) && c.children.length > 0) {
            flat.push(...flattenEasyCats(c.children, c.id));
          }
        }
        return flat;
      };
      const allEasy = flattenEasyCats(easyList);
      const easyIds = new Set(allEasy.map(c => c.id));

      for (const ec of allEasy) {
        try {
          const existing = await getDb("SELECT * FROM categories WHERE id = ?", [ec.id]);
          if (existing) {
            await runDb(
              "UPDATE categories SET name = ?, parentId = ?, slug = ?, thumb = ?, show_in_header = ?, position = ?, hidden = ? WHERE id = ?",
              [ec.name, ec.parentId || null, ec.slug || '', ec.thumb || '', ec.show_in_header ? 1 : 0, ec.position || 0, ec.hidden ? 1 : 0, ec.id]
            );
            results.push({ name: ec.name, id: ec.id, status: 'updated' });
          } else {
            await runDb(
              "INSERT INTO categories (id, name, parentId, slug, thumb, show_in_header, position, hidden) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              [ec.id, ec.name, ec.parentId || null, ec.slug || '', ec.thumb || '', ec.show_in_header ? 1 : 0, ec.position || 0, ec.hidden ? 1 : 0]
            );
            results.push({ name: ec.name, id: ec.id, status: 'imported' });
          }
        } catch (e) {
          results.push({ name: ec.name, status: 'failed', error: e.message });
        }
      }

      const localCats = await allDb("SELECT id FROM categories");
      for (const lc of localCats) {
        if (!easyIds.has(lc.id)) {
          try {
            await runDb("DELETE FROM categories WHERE id = ? OR parentId = ?", [lc.id, lc.id]);
            results.push({ id: lc.id, status: 'deleted' });
          } catch (e) {
            results.push({ id: lc.id, status: 'failed', error: e.message });
          }
        }
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 13. Products Status (sync status per product) ==========

router.get('/api/easy-orders/products-status', async (req, res) => {
  try {
    const products = await getAllProducts();
    const maps = await getAllProductMaps();
    const mapByErpId = {};
    for (const m of maps) mapByErpId[m.erp_product_id] = m;

    const enriched = products.map(p => {
      const m = mapByErpId[p.id];
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        image: p.image,
        price: p.price,
        exported: !!m?.easy_product_id,
        easyProductId: m?.easy_product_id || null,
        easyProductSku: m?.easy_product_sku || null,
        lastSyncedAt: m?.last_synced_at || null,
        syncStatus: m?.status || 'not_exported'
      };
    });
    res.json({ success: true, products: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 14. Cron — Auto-poll for Vercel ==========

router.get('/api/easy-orders/cron', async (req, res) => {
  try {
    const secret = req.query.secret || req.headers['x-cron-secret'];
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && secret !== cronSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cfg = await getConfig();
    if (!cfg || !cfg.enabled) {
      return res.json({ success: true, message: 'التكامل غير مفعل' });
    }

    const probeUrl = `https://api.easy-orders.net/api/v1/external-apps/orders?page=1&limit=1`;
    const probeResp = await fetch(probeUrl, { headers: { 'Api-Key': cfg.apiKey } });
    if (probeResp.status === 404) {
      return res.json({ success: true, message: 'جلب الطلبات غير متاح — استخدم Webhook', notAvailable: true });
    }
    if (!probeResp.ok) throw new Error(`HTTP ${probeResp.status}`);

    const lastPollRow = await getDb("SELECT value FROM settings WHERE key = 'easyorders_last_poll'");
    const lastPoll = lastPollRow?.value || '';
    const allOrders = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const filterParam = 'filter=created_at||gt||' + encodeURIComponent(lastPoll || '2020-01-01');
      const url = `https://api.easy-orders.net/api/v1/external-apps/orders?${filterParam}&page=${page}&limit=50`;
      const resp = await fetch(url, { headers: { 'Api-Key': cfg.apiKey } });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const orders = Array.isArray(data) ? data : (data.orders || data.data || []);
      allOrders.push(...orders);
      hasMore = orders.length === 50;
      page++;
    }

    let imported = 0;
    let skipped = 0;
    for (const easyOrder of allOrders) {
      const existing = await getDb("SELECT id FROM easyorders_staging WHERE easy_order_id = ?", [easyOrder.id || easyOrder._id]);
      if (existing) { skipped++; continue; }
      const erpOrder = await mapEasyOrderToErp(easyOrder);
      await addStagingOrder(easyOrder.id || easyOrder._id, erpOrder, easyOrder.status);
      imported++;
    }

    await runDb("INSERT OR REPLACE INTO settings (key, value) VALUES ('easyorders_last_poll', ?)", [new Date().toISOString()]);
    if (imported > 0) await addSyncLog('poll', 'inbound', null, null, 'success', `Cron: جلب ${imported} طلب جديد`);

    res.json({ success: true, imported, skipped, total: allOrders.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 15. Bulk Stock Sync (sync all exported products) ==========

router.post('/api/easy-orders/outbound/bulk-stock-sync', async (req, res) => {
  try {
    const cfg = await getConfig();
    if (!cfg) return res.status(400).json({ error: 'التكامل غير مفعل' });
    const maps = await allDb("SELECT * FROM easyorders_product_map WHERE status = 'synced'");
    const results = [];
    for (const m of maps) {
      try {
        const productRow = await getDb("SELECT data FROM products WHERE id = ?", [m.erp_product_id]);
        if (!productRow) continue;
        const product = JSON.parse(productRow.data);
        const totalQty = (product.variants || []).reduce((s, v) => s + (v.quantity || 0), 0);
        await updateEasyStock(m.easy_product_sku, totalQty);
        await runDb("UPDATE easyorders_product_map SET last_synced_at = datetime('now'), status = 'synced' WHERE erp_product_id = ?", [m.erp_product_id]);
        results.push({ productId: m.erp_product_id, name: product.name, quantity: totalQty, success: true });
      } catch (e) {
        results.push({ productId: m.erp_product_id, success: false, error: e.message });
      }
    }
    await addSyncLog('export', 'outbound', 'product', null, 'success', `مزامنة مخزون جماعية: ${results.filter(r => r.success).length} منتج`);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 16. Outbound Sync — Single Product (manual or auto) ==========

router.post('/api/easy-orders/outbound/product-sync/:id', async (req, res) => {
  try {
    const result = await syncProductToEasy(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
