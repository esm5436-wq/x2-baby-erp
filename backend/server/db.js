import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const isVercel = process.env.VERCEL === '1' || !!process.env.TURSO_DATABASE_URL;

let db;

if (isVercel) {
  db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
} else {
  const dataDir = path.join(process.cwd(), 'data');
  const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const dbPathLocal = path.join(dataDir, 'database.db');
  db = createClient({ url: `file:${dbPathLocal}` });
}

export const allDb = async (query, params = []) => {
  const result = await db.execute({ sql: query, args: params });
  return result.rows;
};

export const getDb = async (query, params = []) => {
  const result = await db.execute({ sql: query, args: params });
  return result.rows[0] || null;
};

export const runDb = async (query, params = []) => {
  const result = await db.execute({ sql: query, args: params });
  return { id: result.lastInsertRowid, changes: result.rowsAffected };
};

export async function logActivity(action, entityType, entityId, description, metadata = {}) {
  try {
    const result = await runDb(
      "INSERT INTO activity_logs (action, entity_type, entity_id, description, metadata) VALUES (?, ?, ?, ?, ?)",
      [action, entityType, entityId, description, JSON.stringify(metadata)]
    );
    return result.id;
  } catch (e) {
    console.error('Failed to log activity:', e.message);
    return null;
  }
}

export async function generateOrderId() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = `ORD-${yy}${mm}${dd}-`;
  const rows = await allDb(
    "SELECT id FROM orders WHERE id LIKE ? ORDER BY id DESC LIMIT 1",
    [prefix + '%']
  );
  let counter = 1;
  if (rows.length > 0) {
    const parts = rows[0].id.split('-');
    counter = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return prefix + String(counter).padStart(3, '0');
}

export async function localizeImageAsFile(url, entityId) {
  if (!url || !url.startsWith('http')) return url;
  if (isVercel) return url;
  const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 10);
  let ext = '.jpg';
  try { ext = path.extname(new URL(url).pathname) || '.jpg'; } catch (e) {}
  const filename = entityId + '_' + hash + ext;
  const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
  const filepath = path.join(uploadsDir, filename);
  if (fs.existsSync(filepath)) return '/uploads/images/' + filename;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!resp.ok) return url;
    const buffer = Buffer.from(await resp.arrayBuffer());
    if (!fs.existsSync(path.dirname(filepath))) fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, buffer);
    return '/uploads/images/' + filename;
  } catch (e) {
    console.error('Failed to localize image:', e.message);
    return url;
  }
}

export async function initializeSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data TEXT)`,
    `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, data TEXT)`,
    `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`,
    `CREATE TABLE IF NOT EXISTS suppliers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, phone2 TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS purchase_invoices (id TEXT PRIMARY KEY, supplier_id TEXT, invoice_number TEXT, total_amount REAL, payment_method TEXT, image TEXT, date TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS purchase_invoice_items (id TEXT PRIMARY KEY, invoice_id TEXT, product_id TEXT, variant_id TEXT, quantity INTEGER, buy_price REAL)`,
    `CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, amount REAL NOT NULL, category TEXT NOT NULL, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS financial_targets (id TEXT PRIMARY KEY, title TEXT NOT NULL, amount REAL NOT NULL, start_date TEXT, deadline TEXT NOT NULL, category TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, parentId TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, alt_phone TEXT, email TEXT, address TEXT, city TEXT, source TEXT, tags TEXT DEFAULT '[]', notes TEXT, total_orders INTEGER DEFAULT 0, total_spent REAL DEFAULT 0, last_order_date TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`,
    `CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)`,
    `CREATE TABLE IF NOT EXISTS contacts (id TEXT PRIMARY KEY, company_name TEXT NOT NULL, phone TEXT, phone2 TEXT, email TEXT, address TEXT, specialization TEXT, entity_type TEXT DEFAULT 'أخرى', tax_id TEXT, commercial_registry TEXT, notes TEXT, status TEXT DEFAULT 'نشط', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS specializations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS saved_coupons (code TEXT PRIMARY KEY, discount REAL NOT NULL, is_percent INTEGER DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS order_items_cost_tracking (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL, product_id TEXT NOT NULL, cost_at_sale REAL NOT NULL, quantity INTEGER NOT NULL, price_at_sale REAL NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS activity_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT, description TEXT, metadata TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS checkpoints (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, snapshot TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS easyorders_staging (id TEXT PRIMARY KEY, easy_order_id TEXT UNIQUE, data TEXT NOT NULL, status TEXT DEFAULT 'pending', source_order_status TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, synced_at DATETIME)`,
    `CREATE TABLE IF NOT EXISTS easyorders_product_map (id TEXT PRIMARY KEY, erp_product_id TEXT NOT NULL, easy_product_id TEXT, easy_product_sku TEXT, variants_map TEXT DEFAULT '{}', last_synced_at DATETIME, status TEXT DEFAULT 'pending')`,
    `CREATE TABLE IF NOT EXISTS easyorders_sync_log (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, direction TEXT NOT NULL, entity_type TEXT, entity_id TEXT, status TEXT NOT NULL, message TEXT, metadata TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_specialization ON contacts(specialization)`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_entity_type ON contacts(entity_type)`,
    `CREATE INDEX IF NOT EXISTS idx_order_items_cost_order_id ON order_items_cost_tracking(order_id)`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_created ON expenses(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_easyorders_staging_status ON easyorders_staging(status)`,
    `CREATE INDEX IF NOT EXISTS idx_easyorders_sync_log_type ON easyorders_sync_log(type, created_at)`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('categories', '["أطفال", "رضع", "أولاد", "بنات"]')`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('isManualMode', 'false')`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('taxEnabled', 'false')`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('taxRate', '0')`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('ai_api_keys', '[]')`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('easyorders_config', '{}')`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('easyorders_export_defaults', '{"trackStock":true,"disableOrdersNoStock":false,"enableReviews":true,"salePricePercent":85}')`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('easyorders_last_poll', '')`,
  ];

  for (const sql of statements) {
    try { await db.execute(sql); } catch (e) { console.error('Schema init error:', e.message); }
  }

  try {
    const rows = await db.execute("SELECT * FROM pragma_table_info('suppliers')");
    if (!rows.rows.some(r => r.name === 'phone2')) {
      await db.execute("ALTER TABLE suppliers ADD COLUMN phone2 TEXT");
    }
  } catch (e) {}

  try {
    const rows = await db.execute("SELECT * FROM pragma_table_info('customers')");
    const cols = rows.rows.map(r => r.name);
    const custAdditions = [];
    if (!cols.includes('map_url')) custAdditions.push("ALTER TABLE customers ADD COLUMN map_url TEXT");
    if (!cols.includes('latitude')) custAdditions.push("ALTER TABLE customers ADD COLUMN latitude TEXT");
    if (!cols.includes('longitude')) custAdditions.push("ALTER TABLE customers ADD COLUMN longitude TEXT");
    if (!cols.includes('rating')) custAdditions.push("ALTER TABLE customers ADD COLUMN rating REAL DEFAULT 0");
    if (!cols.includes('classification')) custAdditions.push("ALTER TABLE customers ADD COLUMN classification TEXT DEFAULT 'جديد'");
    if (!cols.includes('admin_notes')) custAdditions.push("ALTER TABLE customers ADD COLUMN admin_notes TEXT");
    for (const sql of custAdditions) { try { await db.execute(sql); } catch (e) {} }
  } catch (e) {}

  try {
    const rows = await db.execute("SELECT * FROM pragma_table_info('expenses')");
    if (!rows.rows.some(r => r.name === 'beneficiary_id')) {
      await db.execute("ALTER TABLE expenses ADD COLUMN beneficiary_id TEXT");
    }
  } catch (e) {}

  try {
    const rows = await db.execute("SELECT * FROM pragma_table_info('contacts')");
    const cols = rows.rows.map(r => r.name);
    const contactAdditions = [];
    if (!cols.includes('latitude')) contactAdditions.push("ALTER TABLE contacts ADD COLUMN latitude TEXT");
    if (!cols.includes('longitude')) contactAdditions.push("ALTER TABLE contacts ADD COLUMN longitude TEXT");
    if (!cols.includes('contact_person')) contactAdditions.push("ALTER TABLE contacts ADD COLUMN contact_person TEXT");
    if (!cols.includes('extra_phones')) contactAdditions.push("ALTER TABLE contacts ADD COLUMN extra_phones TEXT DEFAULT '[]'");
    if (!cols.includes('map_url')) contactAdditions.push("ALTER TABLE contacts ADD COLUMN map_url TEXT");
    if (!cols.includes('ratings_enabled')) contactAdditions.push("ALTER TABLE contacts ADD COLUMN ratings_enabled INTEGER DEFAULT 0");
    if (!cols.includes('ratings_data')) contactAdditions.push("ALTER TABLE contacts ADD COLUMN ratings_data TEXT DEFAULT '{}'");
    if (!cols.includes('links')) contactAdditions.push("ALTER TABLE contacts ADD COLUMN links TEXT DEFAULT '[]'");
    for (const sql of contactAdditions) { try { await db.execute(sql); } catch (e) {} }
  } catch (e) {}

  try {
    const rows = await db.execute("SELECT * FROM pragma_table_info('products')");
    if (!rows.rows.some(r => r.name === 'sku')) {
      await db.execute("ALTER TABLE products ADD COLUMN sku TEXT");
      await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku)");
    }
  } catch (e) {}

  try {
    await db.execute("UPDATE orders SET data = json_set(data, '$.status', 'مخاطر عالية') WHERE json_extract(data, '$.status') = 'High Risk'");
    await db.execute("UPDATE orders SET data = json_set(data, '$.status', 'مخاطر متوسطة') WHERE json_extract(data, '$.status') = 'Moderate Risk'");
  } catch (e) {}
}

const ACTIVE_STATUSES = [
  'تحت المراجعة', 'تم التأكيد', 'في انتظار الدفع', 'تم الدفع',
  'قيد التجهيز للشحن', 'بانتظار الشحن', 'قيد التوصيل', 'تم التوصيل'
];

export function isActiveStatus(status) {
  return ACTIVE_STATUSES.includes(status);
}

export async function getAllProducts() {
  const rows = await allDb("SELECT data FROM products");
  return rows.map(r => JSON.parse(r.data));
}

export async function resolveProductBySku(sku) {
  if (!sku) return null;
  const row = await getDb("SELECT data FROM products WHERE sku = ?", [sku]);
  if (!row) return null;
  return JSON.parse(row.data);
}

export async function resolveVariantBySku(variantSku) {
  if (!variantSku) return null;
  const productSku = variantSku.replace(/-\d{2}$/, '');
  const row = await getDb("SELECT data FROM products WHERE sku = ?", [productSku]);
  if (!row) return null;
  const product = JSON.parse(row.data);
  const variant = (product.variants || []).find(v => v.sku === variantSku);
  if (!variant) return null;
  return { product, variant };
}

export async function getNextSkuNumber() {
  const rows = await allDb("SELECT sku FROM products WHERE sku IS NOT NULL ORDER BY sku DESC LIMIT 1");
  const row = rows[0] || null;
  let nextNum = 1;
  if (row && row.sku) {
    const match = row.sku.match(/SKU-(\d+)/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  return String(nextNum).padStart(5, '0');
}

export async function generateProductSku() {
  const num = await getNextSkuNumber();
  return `SKU-${num}`;
}

export async function generateVariantSkus(productSku, variantCount) {
  return Array.from({ length: variantCount }, (_, i) =>
    `${productSku}-${String(i + 1).padStart(2, '0')}`
  );
}

export async function adjustStock(items, operation) {
  for (const item of items) {
    let productId = item.productId;
    let variantId = item.variantId;
    const sku = item.variantSku || item.sku || '';
    if (sku.startsWith('SKU-')) {
      if (sku.includes('-') && sku.split('-').length >= 3) {
        const found = await resolveVariantBySku(sku);
        if (found) {
          productId = found.product.id;
          variantId = found.variant.id;
        }
      }
      if (!productId || !variantId) {
        const prodSku = sku.replace(/-\d{2}$/, '');
        const product = await resolveProductBySku(prodSku);
        if (product) {
          productId = product.id;
          if (sku !== prodSku) {
            const v = (product.variants || []).find(x => x.sku === sku);
            if (v) variantId = v.id;
          } else if (product.variants?.length === 1) {
            variantId = product.variants[0].id;
          }
        }
      }
    }
    if (!productId || !variantId) continue;
    const rows = await allDb("SELECT data FROM products WHERE id = ?", [productId]);
    if (rows.length === 0) continue;
    const product = JSON.parse(rows[0].data);
    let changed = false;
    const existingVariant = product.variants?.find(v => v.id === variantId);
    if (!existingVariant) {
      product.variants = product.variants || [];
      product.variants.push({
        id: variantId,
        sku: item.sku || `${product.sku || 'UNKNOWN'}-99`,
        size: 'واحد',
        color: 'متعدد',
        quantity: 0,
        price: product.price || 0,
        lowStockThreshold: 2
      });
      changed = true;
    }
    product.variants = product.variants.map(v => {
      if (v.id === variantId) {
        changed = true;
        if (operation === 'deduct') {
          v.quantity = Math.max(0, (v.quantity || 0) - item.quantity);
        } else if (operation === 'return') {
          v.quantity = (v.quantity || 0) + item.quantity;
        }
      }
      return v;
    });
    if (changed) {
      await runDb("UPDATE products SET data = ? WHERE id = ?",
        [JSON.stringify(product), productId]);
    }
  }
}

export async function addStagingOrder(easyOrderId, orderData, sourceStatus) {
  const id = `stg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const rows = await allDb("SELECT id FROM easyorders_staging WHERE easy_order_id = ?", [easyOrderId]);
  if (rows.length > 0) return rows[0].id;
  await runDb(
    "INSERT INTO easyorders_staging (id, easy_order_id, data, status, source_order_status, synced_at) VALUES (?, ?, ?, 'pending', ?, datetime('now'))",
    [id, easyOrderId, JSON.stringify(orderData), sourceStatus || 'pending']
  );
  return id;
}

export async function getStagingOrders(status = null) {
  let query = "SELECT * FROM easyorders_staging ORDER BY created_at DESC";
  const params = [];
  if (status) { query = "SELECT * FROM easyorders_staging WHERE status = ? ORDER BY created_at DESC"; params.push(status); }
  const rows = await allDb(query, params);
  return rows.map(r => ({ ...r, data: JSON.parse(r.data) }));
}

export async function getStagingOrder(id) {
  const row = await getDb("SELECT * FROM easyorders_staging WHERE id = ?", [id]);
  if (!row) return null;
  return { ...row, data: JSON.parse(row.data) };
}

export async function confirmStagingOrder(id) {
  const order = await getStagingOrder(id);
  if (!order) throw new Error('الطلب غير موجود في طلبات المراجعة');
  const orderData = order.data;
  orderData.id = await generateOrderId();
  const skuIssues = [];
  for (const item of (orderData.items || [])) {
    if (item.sku && item.sku.startsWith('SKU-')) {
      const found = await resolveVariantBySku(item.variantSku || item.sku);
      if (found) {
        item.productId = found.product.id;
        item.variantId = found.variant.id;
        item.skuStatus = 'matched';
      } else {
        const prod = await resolveProductBySku(item.sku);
        if (prod) {
          item.productId = prod.id;
          if (prod.variants?.length === 1) item.variantId = prod.variants[0].id;
          item.skuStatus = 'matched';
        } else {
          item.skuStatus = 'unmatched';
          skuIssues.push({ name: item.productName, sku: item.sku });
        }
      }
    }
  }
  if (isActiveStatus(orderData.status)) {
    await adjustStock(orderData.items || [], 'deduct');
  }
  await runDb("INSERT INTO orders (id, data) VALUES (?, ?)", [orderData.id, JSON.stringify(orderData)]);
  await runDb("UPDATE easyorders_staging SET status = 'confirmed' WHERE id = ?", [id]);
  if (skuIssues.length > 0) {
    await logActivity('warning', 'order', orderData.id,
      `[Easy Orders] تم تأكيد الطلب مع ${skuIssues.length} منتج SKU غير متطابق`,
      { stagingId: id, sourceId: order.easy_order_id, skuIssues });
  }
  await logActivity('create', 'order', orderData.id,
    `[Easy Orders] تم تأكيد الطلب للعميل ${orderData.customerName}`,
    { stagingId: id, sourceId: order.easy_order_id, skuIssues: skuIssues.length > 0 ? skuIssues : undefined });
  return orderData;
}

export async function rejectStagingOrder(id) {
  const order = await getStagingOrder(id);
  if (!order) throw new Error('الطلب غير موجود في طلبات المراجعة');
  const orderData = order.data;
  await adjustStock(orderData.items || [], 'return');
  await runDb("UPDATE easyorders_staging SET status = 'rejected' WHERE id = ?", [id]);
  await logActivity('delete', 'order', id, `[Easy Orders] تم رفض الطلب رقم ${order.easy_order_id} وإعادة المخزون`, { stagingId: id });
  return order;
}

export async function updateStagingOrder(id, updates) {
  const rows = await allDb("SELECT data FROM easyorders_staging WHERE id = ?", [id]);
  if (rows.length === 0) throw new Error('الطلب غير موجود');
  const currentData = JSON.parse(rows[0].data);
  Object.keys(updates).forEach(k => { currentData[k] = updates[k]; });
  await runDb("UPDATE easyorders_staging SET data = ? WHERE id = ?", [JSON.stringify(currentData), id]);
  return { ...rows[0], data: currentData };
}

export async function saveProductMap(erpProductId, easyProductId, easySku, variantsMap = {}) {
  const id = `map-${erpProductId}`;
  await runDb(
    `INSERT OR REPLACE INTO easyorders_product_map (id, erp_product_id, easy_product_id, easy_product_sku, variants_map, last_synced_at, status)
     VALUES (?, ?, ?, ?, ?, datetime('now'), 'synced')`,
    [id, erpProductId, easyProductId, easySku, JSON.stringify(variantsMap)]
  );
}

export async function getProductMap(erpProductId) {
  const row = await getDb("SELECT * FROM easyorders_product_map WHERE erp_product_id = ?", [erpProductId]);
  if (!row) return null;
  return { ...row, variants_map: JSON.parse(row.variants_map || '{}') };
}

export async function getAllProductMaps() {
  const rows = await allDb("SELECT * FROM easyorders_product_map");
  return rows.map(r => ({ ...r, variants_map: JSON.parse(r.variants_map || '{}') }));
}

export async function addSyncLog(type, direction, entityType, entityId, status, message, metadata = {}) {
  await runDb(
    `INSERT INTO easyorders_sync_log (type, direction, entity_type, entity_id, status, message, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [type, direction, entityType, entityId, status, message, JSON.stringify(metadata)]
  );
}

export async function getSyncLogs(limit = 50) {
  const rows = await allDb("SELECT * FROM easyorders_sync_log ORDER BY created_at DESC LIMIT ?", [limit]);
  return rows.map(r => ({ ...r, metadata: tryParseJson(r.metadata) }));
}

function tryParseJson(str) {
  try { return JSON.parse(str); } catch { return str; }
}
