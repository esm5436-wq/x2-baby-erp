import { getDb, runDb, allDb, addSyncLog as addLog } from '../db.js';

const BASE_URL = 'https://api.easy-orders.net/api/v1/external-apps';

async function getConfig() {
  const row = await getDb("SELECT value FROM settings WHERE key = 'easyorders_config'");
  if (!row) return null;
  try {
    const config = JSON.parse(row.value);
    return config.enabled ? config : null;
  } catch { return null; }
}

async function call(method, endpoint, body = null) {
  const config = await getConfig();
  if (!config) throw new Error('التكامل مع Easy Orders غير مفعل. يرجى تفعيله من الإعدادات.');

  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Api-Key': config.apiKey,
    'Content-Type': 'application/json'
  };

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const resp = await fetch(url, options);

  if (!resp.ok) {
    let errMsg = `خطأ في الاتصال: ${resp.status}`;
    try {
      const errData = await resp.json();
      if (errData.message) errMsg = errData.message;
    } catch {}
    throw new Error(errMsg);
  }

  try { return await resp.json(); }
  catch { return null; }
}

async function uploadToImgBB(base64Image, apiKey) {
  if (!base64Image) return null;
  if (base64Image.startsWith('http')) return base64Image;

  let rawBase64 = base64Image;
  const dataUriMatch = base64Image.match(/^data:image\/[a-zA-Z]+;base64,(.+)$/);
  if (dataUriMatch) {
    rawBase64 = dataUriMatch[1];
  }

  if (!apiKey) throw new Error('مفتاح ImgBB مطلوب لرفع الصور. يرجى إضافته في الإعدادات.');

  const formData = new URLSearchParams();
  formData.append('key', apiKey);
  formData.append('image', rawBase64);

  const resp = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData
  });

  if (!resp.ok) {
    const errData = await resp.json();
    throw new Error(errData.error?.message || 'فشل رفع الصورة لـ ImgBB');
  }

  const data = await resp.json();
  return data.data?.url || data.data?.display_url || null;
}

async function uploadImages(images, imgbbApiKey) {
  if (!images || images.length === 0) return [];
  const results = [];
  for (const img of images) {
    try {
      const url = await uploadToImgBB(img, imgbbApiKey);
      if (url) results.push(url);
    } catch (e) {
      console.error('Image upload failed:', e.message);
    }
  }
  return results;
}

function generateSlug(name) {
  return name
    ?.toLowerCase()
    ?.replace(/[^\w\s-]/g, '')
    ?.replace(/\s+/g, '-')
    ?.replace(/-+/g, '-')
    ?.trim() || `product-${Date.now()}`;
}

function mapProductToEasy(product, resolvedCategoryIds = []) {
  const variants = product.variants || [];
  const totalQty = variants.reduce((s, v) => s + (v.quantity || 0), 0);
  const ss = product.storeSettings || {};

  let variations = [];
  const easyVariants = [];

  if (product.options && product.options.length > 0) {
    for (const opt of product.options) {
      if (opt.values.length === 0) continue;
      const props = opt.values.map(v => ({
        name: v,
        value: (opt.type === 'color' && opt.colorValues?.[v]) || v
      }));
      variations.push({ name: opt.name, type: opt.type || 'dropdown', props });
    }

    for (const v of variants) {
      const vProps = [];
      for (const opt of product.options) {
        const val = v.optionValues?.[opt.name] || '';
        if (val) vProps.push({ variation: opt.name, variation_prop: val });
      }
      easyVariants.push({
        price: v.price || product.price || 0,
        sale_price: ss.sale_price || 0,
        quantity: v.quantity || 0,
        taager_code: v.sku || v.id,
        variation_props: vProps
      });
    }
  } else {
    const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];
    const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
    const hasSize = sizes.length > 0 && !(sizes.length === 1 && sizes[0] === 'واحد');
    const hasColor = colors.length > 0 && !(colors.length === 1 && colors[0] === 'متعدد');

    if (hasColor) {
      variations.push({ name: 'اللون', type: 'dropdown', props: colors.map(c => ({ name: c, value: c })) });
    }
    if (hasSize) {
      variations.push({ name: 'المقاس', type: 'dropdown', props: sizes.map(s => ({ name: s, value: s })) });
    }

    for (const v of variants) {
      const vProps = [];
      if (hasColor) vProps.push({ variation: 'اللون', variation_prop: v.color || 'متعدد' });
      if (hasSize) vProps.push({ variation: 'المقاس', variation_prop: v.size || 'واحد' });
      easyVariants.push({
        price: v.price || product.price || 0,
        sale_price: ss.sale_price || 0,
        quantity: v.quantity || 0,
        taager_code: v.sku || v.id,
        variation_props: vProps
      });
    }
  }

  return {
    name: product.name || '',
    price: product.price || 0,
    sale_price: ss.sale_price || Math.round((product.price || 0) * 0.85),
    description: ss.description || product.description || '',
    slug: ss.slug || generateSlug(product.name),
    sku: product.sku || product.id,
    thumb: '',
    images: [],
    quantity: totalQty,
    track_stock: ss.track_stock ?? true,
    disable_orders_for_no_stock: ss.disable_orders_for_no_stock ?? false,
    buy_now_text: ss.buy_now_text || 'اشتر الآن',
    is_reviews_enabled: ss.is_reviews_enabled ?? true,
    is_quantity_hidden: ss.is_quantity_hidden ?? false,
    is_header_hidden: ss.is_header_hidden ?? false,
    is_free_shipping: ss.is_free_shipping ?? false,
    is_fixed_buy_button: ss.is_fixed_buy_button ?? false,
    show_landing_in_same_page: ss.is_buy_on_same_page ?? false,
    is_checkout_before_description: ss.is_buy_before_description ?? false,
    hidden: ss.is_hidden ?? false,
    hide_related_products: ss.hide_related_products ?? false,
    fake_visitors_min: ss.fake_visitors_min || 0,
    fake_visitors_max: ss.fake_visitors_max || 0,
    fake_timer_hours: ss.fake_timer_hours || 0,
    categories: resolvedCategoryIds.length > 0 ? resolvedCategoryIds.map(id => ({ id })) : [],
    taager_code: product.sku || product.id,
    drop_shipping_provider: '',
    variations,
    variants: easyVariants
  };
}

function extractProductAndVariantIds(easyProduct) {
  const resp = easyProduct?.data || easyProduct || {};
  const productId = resp.id || resp.product_id || easyProduct?.id || null;
  const sku = resp.sku || resp.taager_code || easyProduct?.sku || easyProduct?.taager_code || null;
  const variantsMap = {};
  if (easyProduct?.variants) {
    for (const v of easyProduct.variants) {
      const vSku = v.sku || v.taager_code || v.id;
      if (vSku) {
        variantsMap[vSku] = v.id || vSku;
      }
    }
  }
  return { productId, sku, variantsMap };
}

async function mapEasyOrderToErp(easyOrder) {
  let productMaps = [];
  try {
    const rows = await allDb("SELECT * FROM easyorders_product_map");
    productMaps = rows.map(r => ({ ...r, variants_map: JSON.parse(r.variants_map || '{}') }));
  } catch {}

  const mapByEasyId = {};
  const mapByErpId = {};
  for (const m of productMaps) {
    mapByEasyId[m.easy_product_id] = m;
    mapByErpId[m.erp_product_id] = m;
  }

  const items = (easyOrder.cart_items || []).map(ci => {
    const product = ci.product || {};
    const variant = ci.variant || {};
    const variantProps = variant.variation_props || [];

    const variantLabel = variantProps.map(p => p.variation_prop).filter(Boolean).join(' - ') || 'واحد';

    const incomingSku = product.sku || product.taager_code || '';
    const incomingVariantSku = variant.taager_code || variant.sku || incomingSku;

    let erpProductId = incomingSku;
    let erpVariantId = incomingVariantSku;
    let skuStatus = 'unmatched';

    const easyProductId = product.id || ci.product_id;
    const map = mapByEasyId[easyProductId] || mapByErpId[easyProductId];
    if (map) {
      erpProductId = map.erp_product_id;
      const revMap = {};
      for (const [k, v] of Object.entries(map.variants_map || {})) revMap[v] = k;
      const matchedSku = revMap[variant.id] || incomingVariantSku;
      erpVariantId = matchedSku;
      skuStatus = 'matched';
    }

    return {
      productId: erpProductId,
      variantId: erpVariantId,
      productName: product.name || '',
      variantLabel,
      quantity: ci.quantity || 1,
      price: ci.price || variant.price || 0,
      costPrice: 0,
      sku: incomingSku,
      variantSku: incomingVariantSku,
      erpSku: erpProductId,
      erpVariantSku: erpVariantId,
      skuStatus
    };
  });

  return {
    id: '',
    customerName: easyOrder.full_name || easyOrder.name || '',
    customerPhone: easyOrder.phone || '',
    address: easyOrder.address || '',
    city: easyOrder.government || easyOrder.city || '',
    notes: '',
    items,
    totalAmount: easyOrder.total_cost || easyOrder.cost || 0,
    totalCost: 0,
    status: 'تحت المراجعة',
    createdAt: new Date().toISOString(),
    shippingCost: easyOrder.shipping_cost || 0,
    paymentMethod: easyOrder.payment_method === 'cod' ? 'نقد' : easyOrder.payment_method || '',
    paymentStatus: easyOrder.payment_status || '',
    sourceId: easyOrder.id || '',
    externalOrderId: easyOrder.id || ''
  };
}

async function updateEasyStock(sku, quantity) {
  return call('PATCH', `/products/sku/${encodeURIComponent(sku)}/quantity`, { quantity });
}

async function updateEasyOrderStatus(easyOrderId, status) {
  return call('PATCH', `/orders/${easyOrderId}/status`, { status });
}

async function syncProductToEasy(productId) {
  const productRow = await getDb("SELECT data FROM products WHERE id = ?", [productId]);
  if (!productRow) throw new Error('المنتج غير موجود');

  const product = JSON.parse(productRow.data);
  const catNames = product.categories || (product.category ? [product.category] : []);
  const resolvedCategoryIds = [];
  for (const catName of catNames) {
    if (!catName) continue;
    const catRow = await allDb("SELECT id FROM categories WHERE name = ?", [catName]);
    if (catRow?.[0]?.id) resolvedCategoryIds.push(catRow[0].id);
  }

  const config = await getConfig();
  const imgbbKey = config?.imgbbApiKey || '';
  let easyProduct = mapProductToEasy(product, resolvedCategoryIds);

  if (product.image) {
    try {
      const imgUrl = await uploadToImgBB(product.image, imgbbKey);
      if (imgUrl) { easyProduct.thumb = imgUrl; easyProduct.images = [imgUrl]; }
    } catch {}
  }
  if (product.images?.length > 0) {
    for (const img of product.images) {
      try {
        const url = await uploadToImgBB(img, imgbbKey);
        if (url && !easyProduct.images.includes(url)) easyProduct.images.push(url);
      } catch {}
    }
  }

  const existingMap = await getDb("SELECT * FROM easyorders_product_map WHERE erp_product_id = ?", [productId]);
  let easyResponse;
  if (existingMap?.easy_product_id) {
    easyResponse = await call('PATCH', `/products/${existingMap.easy_product_id}`, easyProduct);
    const { productId: pid, sku, variantsMap } = extractProductAndVariantIds(easyResponse || easyProduct);
    await runDb(
      `INSERT OR REPLACE INTO easyorders_product_map (id, erp_product_id, easy_product_id, easy_product_sku, variants_map, last_synced_at, status)
       VALUES (?, ?, ?, ?, ?, datetime('now'), 'synced')`,
      [`map-${productId}`, productId, pid || existingMap.easy_product_id, sku || existingMap.easy_product_sku, JSON.stringify(variantsMap)]
    );
  } else {
    easyResponse = await call('POST', '/products', easyProduct);
    const { productId: pid, sku, variantsMap } = extractProductAndVariantIds(easyResponse || easyProduct);
    await runDb(
      `INSERT OR REPLACE INTO easyorders_product_map (id, erp_product_id, easy_product_id, easy_product_sku, variants_map, last_synced_at, status)
       VALUES (?, ?, ?, ?, ?, datetime('now'), 'synced')`,
      [`map-${productId}`, productId, pid || '', sku || product.sku || productId, JSON.stringify(variantsMap)]
    );
  }

  await addLog('export', 'outbound', 'product', productId, 'success', `مزامنة تلقائية: ${product.name}`);
  return { success: true, productId, name: product.name };
}

export {
  getConfig, call, uploadToImgBB, uploadImages,
  mapProductToEasy, extractProductAndVariantIds, mapEasyOrderToErp,
  generateSlug, BASE_URL,
  updateEasyStock, updateEasyOrderStatus,
  syncProductToEasy
};
