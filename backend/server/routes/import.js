import { Router } from 'express';
import { runDb, getDb, logActivity, generateOrderId, localizeImageAsFile } from '../db.js';
import { XMLParser } from 'fast-xml-parser';

const router = Router();

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ''
});

function ensureDefaultVariant(p) {
  if (!p.variants || p.variants.length === 0) {
    p.variants = [{
      id: `v-main-${p.id || Math.random().toString(36).slice(2, 10)}`,
      size: 'واحد',
      color: 'متعدد',
      quantity: p.quantity || 0,
      price: p.price || 0,
      lowStockThreshold: 2
    }];
  }
  return p;
}

function parseItemsFromXml(xmlText) {
  const parsed = xmlParser.parse(xmlText);
  const rss = parsed.rss || parsed.feed || parsed.root || {};
  const channel = rss.channel || rss;
  let items = channel.item || channel.entry || [];
  if (!Array.isArray(items)) items = [items];
  return items.map(item => ({
    id: item['g:id'] || item.id || item['g:item_group_id'] || 'p-' + String(Math.random()).slice(2, 10),
    name: item.title || item['g:title'] || '',
    description: item['g:description'] || item.description || '',
    price: parseFloat(String(item['g:price'] || item.price || '0').replace(/[^0-9.]/g, '')) || 0,
    image: item['g:image_link'] || item.image_link || item['g:link'] || item.link || '',
    category: item['g:product_type'] || item['g:google_product_category'] || '',
    brand: item['g:brand'] || item.brand || '',
    tags: [],
    variants: [],
    quantity: item['g:availability'] === 'in_stock' ? 10 : 0
  }));
}

async function fetchProductsFromUrl(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('فشل جلب البيانات: ' + resp.status);
  const text = await resp.text();
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const data = JSON.parse(trimmed);
    return Array.isArray(data) ? data : (data.products || data.data || []);
  }
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<rss') || trimmed.startsWith('<feed')) {
    return parseItemsFromXml(trimmed);
  }
  throw new Error('تنسيق غير مدعوم. يدعم JSON و XML فقط.');
}

router.post('/api/import/products/fetch', async (req, res) => {
  try {
    const { url, file } = req.body;
    let allProducts = [];
    if (url) {
      allProducts = await fetchProductsFromUrl(url);
    } else if (file) {
      allProducts = Array.isArray(file) ? file : (file.products || file.data || []);
    } else {
      return res.status(400).json({ error: 'يجب توفير رابط أو ملف' });
    }
    const newProducts = [];
    let existingCount = 0;
    for (const p of allProducts) {
      ensureDefaultVariant(p);
      const existing = await getDb("SELECT data FROM products WHERE id = ?", [p.id]);
      if (existing) {
        existingCount++;
        continue;
      }
      if (!p.createdAt) p.createdAt = new Date().toISOString();
      if (p.image && p.image.startsWith('http'))
        p.image = await localizeImageAsFile(p.image, p.id);
      if (p.images && Array.isArray(p.images))
        p.images = await Promise.all(p.images.map(u => localizeImageAsFile(u, p.id + '_gallery')));
      newProducts.push(p);
    }
    res.json({ success: true, products: newProducts, count: newProducts.length, existingCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/import/products/confirm', async (req, res) => {
  try {
    const { products } = req.body;
    let saved = 0;
    let skipped = 0;
    for (const p of products) {
      const existing = await getDb("SELECT data FROM products WHERE id = ?", [p.id]);
      if (existing) {
        skipped++;
        continue;
      }
      await runDb("INSERT INTO products (id, data) VALUES (?, ?)", [p.id, JSON.stringify(p)]);
      saved++;
    }
    const activityLogId = await logActivity('import', 'product', products.map(p => p.id).join(','), `تم استيراد ${saved} منتج من المتجر`, { count: saved, entityData: products });
    res.json({ success: true, count: saved, skipped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/import/orders/fetch', async (req, res) => {
  try {
    const { url, file } = req.body;
    let orders = [];
    if (url) {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('فشل جلب البيانات: ' + resp.status);
      const data = await resp.json();
      orders = Array.isArray(data) ? data : (data.orders || data.data || []);
    } else if (file) {
      orders = file;
    } else {
      return res.status(400).json({ error: 'يجب توفير رابط أو ملف' });
    }
    const result = [];
    for (const o of orders) {
      const oldId = o.id;
      const newId = await generateOrderId();
      o.id = newId;
      o.sourceId = oldId;
      if (!o.createdAt) o.createdAt = new Date().toISOString();
      result.push(o);
    }
    res.json({ success: true, orders: result, count: result.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/import/orders/confirm', async (req, res) => {
  try {
    const { orders } = req.body;
    let saved = 0;
    let skipped = 0;
    for (const o of orders) {
      const existing = await getDb("SELECT data FROM orders WHERE id = ?", [o.id]);
      if (existing) {
        skipped++;
        continue;
      }
      await runDb("INSERT INTO orders (id, data) VALUES (?, ?)", [o.id, JSON.stringify(o)]);
      saved++;
    }
    const activityLogId = await logActivity('import', 'order', orders.map(o => o.id).join(','), `تم استيراد ${saved} طلب من المتجر`, { count: saved });
    res.json({ success: true, count: saved, skipped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
