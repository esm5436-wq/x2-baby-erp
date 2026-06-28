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
  generateSlug
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
      easyProduct: mapProductToEasy(p),
      imageUrls: []
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
        let easyProduct = item.easyProduct || mapProductToEasy(product);

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
      const erpOrder = mapEasyOrderToErp(easyOrder);
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
    const orderData = await confirmStagingOrder(req.params.id);
    await addSyncLog('confirm', 'inbound', 'order', req.params.id, 'success', `تم تأكيد الطلب للعميل ${orderData.customerName}`);
    const products = await getAllProducts();
    res.json({ success: true, order: orderData, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/easy-orders/staging/:id/reject', async (req, res) => {
  try {
    const result = await rejectStagingOrder(req.params.id);
    await addSyncLog('reject', 'inbound', 'order', req.params.id, 'success', 'تم رفض الطلب وإعادة المخزون');
    const products = await getAllProducts();
    res.json({ success: true, stagingId: req.params.id, products });
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
        const orderData = await confirmStagingOrder(id);
        confirmed.push({ id, customer: orderData.customerName });
      } catch (e) { errors.push({ id, error: e.message }); }
    }
    const products = await getAllProducts();
    res.json({ success: true, confirmed: confirmed.length, errors, products });
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
        await rejectStagingOrder(id);
        rejected.push(id);
      } catch (e) { errors.push({ id, error: e.message }); }
    }
    const products = await getAllProducts();
    res.json({ success: true, rejected: rejected.length, errors, products });
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

export default router;
