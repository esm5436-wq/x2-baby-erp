import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

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
  const id = result.lastInsertRowid;
  return { id: typeof id === 'bigint' ? Number(id) : id, changes: result.rowsAffected };
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
  const today = `${yy}${mm}${dd}`;
  const rows = await allDb(
    "SELECT id FROM orders WHERE id LIKE ?",
    [prefix + '%']
  );
  let maxExisting = 0;
  for (const r of rows) {
    const seq = parseInt(r.id.slice(prefix.length), 10);
    if (Number.isFinite(seq) && seq > maxExisting) maxExisting = seq;
  }
  // عدّاد دائم في الإعدادات: يمنع إعادة استخدام معرّف طلب محذوف في نفس اليوم
  let stored = { date: '', last: 0 };
  try {
    const seqRow = await getDb("SELECT value FROM settings WHERE key = 'order_id_seq'");
    if (seqRow) stored = JSON.parse(seqRow.value);
  } catch {}
  const next = (stored.date === today ? Math.max(Number(stored.last) || 0, maxExisting) : maxExisting) + 1;
  await runDb("INSERT OR REPLACE INTO settings (key, value) VALUES ('order_id_seq', ?)",
    [JSON.stringify({ date: today, last: next })]);
  return prefix + String(next).padStart(3, '0');
}

export async function localizeImageAsFile(url, entityId) {
  if (!url || url.startsWith('data:')) return url;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!resp.ok) return url;
    const buffer = Buffer.from(await resp.arrayBuffer());
    const mime = resp.headers.get('content-type') || 'image/jpeg';
    const base64 = buffer.toString('base64');
    return `data:${mime};base64,${base64}`;
  } catch (e) {
    console.error('Failed to localize image:', e.message);
    return url;
  }
}

async function cleanupLegacyProductImages() {
  try {
    const flag = await getDb("SELECT value FROM settings WHERE key = 'legacy_product_images_cleaned' LIMIT 1");
    if (flag && flag.value === '1') return;
    const rows = await allDb("SELECT id, data FROM products");
    let cleaned = 0;
    for (const row of rows) {
      try {
        const product = JSON.parse(row.data);
        let modified = false;
        if (typeof product.image === 'string' && product.image.startsWith('/uploads/')) {
          product.image = '';
          modified = true;
        }
        if (Array.isArray(product.images)) {
          const filtered = product.images.filter(u => !(typeof u === 'string' && u.startsWith('/uploads/')));
          if (filtered.length !== product.images.length) {
            product.images = filtered;
            modified = true;
          }
        }
        if (modified) {
          await runDb("UPDATE products SET data = ? WHERE id = ?", [JSON.stringify(product), row.id]);
          cleaned++;
        }
      } catch {}
    }
    await runDb("INSERT OR IGNORE INTO settings (key, value) VALUES ('legacy_product_images_cleaned', '0')");
    await runDb("UPDATE settings SET value = '1' WHERE key = 'legacy_product_images_cleaned'");
    console.log(`Legacy product image cleanup done (${cleaned} products updated)`);
  } catch (e) {
    console.error('cleanupLegacyProductImages error:', e.message);
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
    `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', permissions TEXT, can_change_password INTEGER DEFAULT 1, created_by TEXT, last_login DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_specialization ON contacts(specialization)`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_entity_type ON contacts(entity_type)`,
    `CREATE INDEX IF NOT EXISTS idx_order_items_cost_order_id ON order_items_cost_tracking(order_id)`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_created ON expenses(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at)`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('categories', '["أطفال", "رضع", "أولاد", "بنات"]')`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('isManualMode', 'false')`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('taxEnabled', 'false')`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('taxRate', '0')`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('ai_api_keys', '[]')`,
    `CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, note_type TEXT DEFAULT 'general', content TEXT NOT NULL, attachment TEXT, show_to_customer INTEGER DEFAULT 0, created_by TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at)`,
  ];

  for (const sql of statements) {
    try { await db.execute(sql); } catch (e) { console.error('Schema init error:', e.message); }
  }

  const dropTables = [
    `DROP TABLE IF EXISTS easyorders_staging`,
    `DROP TABLE IF EXISTS easyorders_product_map`,
    `DROP TABLE IF EXISTS easyorders_sync_log`,
    `DROP TABLE IF EXISTS easyorders_webhook_config`,
    `DROP TABLE IF EXISTS easyorders_category_map`,
  ];
  for (const sql of dropTables) {
    try { await db.execute(sql); } catch (e) { console.error('Drop table error:', e.message); }
  }

  const removeSettings = [
    `DELETE FROM settings WHERE key = 'easyorders_config'`,
    `DELETE FROM settings WHERE key = 'easyorders_export_defaults'`,
    `DELETE FROM settings WHERE key = 'easyorders_last_poll'`,
  ];
  for (const sql of removeSettings) {
    try { await db.execute(sql); } catch (e) {}
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

  await cleanupLegacyProductImages();
  await migrateExistingNotes();
  await bootstrapAdminUser();
}

export async function migrateExistingNotes() {
  try {
    const existing = await allDb("SELECT COUNT(*) as cnt FROM notes");
    if (existing[0] && existing[0].cnt > 0) return;

    const customers = await allDb("SELECT id, notes, admin_notes, created_at FROM customers");
    for (const c of customers) {
      if (c.notes && c.notes.trim()) {
        const id = `note-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        await runDb(
          "INSERT OR IGNORE INTO notes (id, entity_type, entity_id, content, show_to_customer, created_by, created_at) VALUES (?, 'customer', ?, ?, 1, 'system', ?)",
          [id, c.id, c.notes, c.created_at || new Date().toISOString()]
        );
      }
      if (c.admin_notes && c.admin_notes.trim()) {
        const id = `note-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        await runDb(
          "INSERT OR IGNORE INTO notes (id, entity_type, entity_id, content, show_to_customer, created_by, created_at) VALUES (?, 'customer', ?, ?, 0, 'system', ?)",
          [id, c.id, c.admin_notes, c.created_at || new Date().toISOString()]
        );
      }
    }

    const orders = await allDb("SELECT id, data FROM orders");
    for (const o of orders) {
      try {
        const parsed = JSON.parse(o.data);
        if (parsed.notes && parsed.notes.trim()) {
          const id = `note-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
          await runDb(
            "INSERT OR IGNORE INTO notes (id, entity_type, entity_id, content, show_to_customer, created_by, created_at) VALUES (?, 'order', ?, ?, 0, 'system', ?)",
            [id, o.id, parsed.notes, parsed.createdAt || new Date().toISOString()]
          );
        }
      } catch {}
    }

    const contacts = await allDb("SELECT id, notes, created_at FROM contacts");
    for (const c of contacts) {
      if (c.notes && c.notes.trim()) {
        const id = `note-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        await runDb(
          "INSERT OR IGNORE INTO notes (id, entity_type, entity_id, content, show_to_customer, created_by, created_at) VALUES (?, 'contact', ?, ?, 1, 'system', ?)",
          [id, c.id, c.notes, c.created_at || new Date().toISOString()]
        );
      }
    }

    console.log('Notes migration completed');
  } catch (e) {
    console.error('Notes migration error:', e.message);
  }
}

export async function bootstrapAdminUser() {
  try {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = await bcrypt.hash(password, 10);
    const existing = await getDb("SELECT * FROM users WHERE username = ?", [username]);
    if (existing) {
      if (!existing.password_hash) {
        await runDb("UPDATE users SET role = 'admin', password_hash = ? WHERE id = ?", [hash, existing.id]);
      } else {
        await runDb("UPDATE users SET role = 'admin' WHERE id = ?", [existing.id]);
      }
    } else {
      await runDb(
        "INSERT INTO users (username, password_hash, role, permissions, can_change_password, created_by) VALUES (?, ?, 'admin', '{}', 1, 'system')",
        [username, hash]
      );
    }
    // إزالة أي حسابات متبقية بدون كلمة مرور (حسابات غير آمنة من إصدارات قديمة)
    await runDb("DELETE FROM users WHERE password_hash = '' OR password_hash IS NULL");
  } catch (e) {
    console.error('Admin bootstrap error:', e.message);
  }
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

async function resolveItemTarget(item) {
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
  return { productId, variantId };
}

function heldOf(item) {
  return Number.isFinite(item?.actualDeducted) && item.actualDeducted >= 0
    ? item.actualDeducted
    : Math.max(0, Number(item?.quantity) || 0);
}

export async function findStockShortages(items) {
  const shortages = [];
  const demand = new Map();
  for (const rawItem of items || []) {
    if (!rawItem || !(Number(rawItem.quantity) > 0)) continue;
    const { productId, variantId } = await resolveItemTarget(rawItem);
    if (!productId || !variantId) continue;
    const key = `${productId}_${variantId}`;
    const cur = demand.get(key);
    if (cur) cur.qty += Number(rawItem.quantity);
    else demand.set(key, { productId, variantId, qty: Number(rawItem.quantity) });
  }
  const productCache = new Map();
  for (const { productId, variantId, qty } of demand.values()) {
    let product = productCache.has(productId) ? productCache.get(productId) : undefined;
    if (product === undefined) {
      const rows = await allDb("SELECT data FROM products WHERE id = ?", [productId]);
      product = rows.length ? JSON.parse(rows[0].data) : null;
      productCache.set(productId, product);
    }
    if (!product) continue;
    const v = (product.variants || []).find(x => x.id === variantId);
    if (!v) continue;
    if (qty > (v.quantity || 0)) {
      shortages.push({
        productId,
        variantId,
        productName: product.name,
        variantLabel: [v.size, v.color].filter(Boolean).join(' - '),
        sku: v.sku || '',
        requested: qty,
        available: v.quantity || 0
      });
    }
  }
  return shortages;
}

export async function adjustStock(items, operation) {
  for (const item of items || []) {
    let { productId, variantId } = await resolveItemTarget(item);
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
          const current = v.quantity || 0;
          const actual = Math.min(current, Math.max(0, Number(item.quantity) || 0));
          v.quantity = current - actual;
          item.actualDeducted = (Number.isFinite(item.actualDeducted) ? item.actualDeducted : 0) + actual;
        } else if (operation === 'return') {
          const held = heldOf(item);
          v.quantity = (v.quantity || 0) + held;
          item.actualDeducted = 0;
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

export function buildShortageMessage(shortages) {
  return 'الكمية المطلوبة غير متوفرة في المخزون: ' +
    shortages.map(s => `${s.productName}${s.variantLabel ? ` (${s.variantLabel})` : ''} — المطلوب ${s.requested} والمتاح ${s.available}`).join('، ');
}

export function buildEditOps(oldItems, newItems, oldStatus, newStatus) {
  const wasActive = isActiveStatus(oldStatus);
  const nowActive = isActiveStatus(newStatus ?? oldStatus);
  const ops = { returns: [], deducts: [] };
  if (!wasActive && !nowActive) return ops;

  if (wasActive && !nowActive) {
    for (const oldIt of oldItems) {
      const H = heldOf(oldIt);
      if (H > 0) {
        ops.returns.push({ productId: oldIt.productId, variantId: oldIt.variantId, quantity: H, actualDeducted: H });
      }
    }
    return ops;
  }

  if (!wasActive && nowActive) {
    for (const newIt of newItems) {
      if ((Number(newIt.quantity) || 0) > 0) ops.deducts.push(newIt);
    }
    return ops;
  }

  const oldMap = {}, newMap = {};
  oldItems.forEach(item => { oldMap[`${item.productId}_${item.variantId}`] = item; });
  newItems.forEach(item => { newMap[`${item.productId}_${item.variantId}`] = item; });

  for (const key of Object.keys(oldMap)) {
    if (!(key in newMap)) {
      const oldIt = oldMap[key];
      const H = heldOf(oldIt);
      if (H > 0) {
        ops.returns.push({ productId: oldIt.productId, variantId: oldIt.variantId, quantity: H, actualDeducted: H });
      }
    }
  }

  for (const key of Object.keys(newMap)) {
    if (!(key in oldMap)) {
      const newIt = newMap[key];
      if ((Number(newIt.quantity) || 0) > 0) ops.deducts.push(newIt);
    }
  }

  for (const key of Object.keys(oldMap)) {
    if (!(key in newMap)) continue;
    const oldIt = oldMap[key];
    const newIt = newMap[key];
    const H = heldOf(oldIt);
    const N = Number(newIt.quantity) || 0;
    if (N === H) {
      newIt.actualDeducted = N;
      continue;
    }
    if (N > H) {
      ops.deducts.push({ productId: newIt.productId, variantId: newIt.variantId, quantity: N - H, actualDeducted: H, __syncTo: newIt });
    } else {
      ops.returns.push({ productId: newIt.productId, variantId: newIt.variantId, quantity: H - N, actualDeducted: H - N });
      newIt.actualDeducted = N;
    }
  }
  return ops;
}

export async function applyEditOps(ops) {
  for (const r of ops.returns) await adjustStock([r], 'return');
  for (const d of ops.deducts) {
    const syncTarget = d.__syncTo;
    await adjustStock([d], 'deduct');
    if (syncTarget) syncTarget.actualDeducted = d.actualDeducted;
  }
}

