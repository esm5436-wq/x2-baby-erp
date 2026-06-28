import { getDb, runDb } from '../db.js';

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

  if (!apiKey) throw new Error('مفتاح ImgBB مطلوب لرفع الصور. يرجى إضافته في الإعدادات.');

  const formData = new URLSearchParams();
  formData.append('key', apiKey);
  formData.append('image', base64Image);

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

function mapProductToEasy(product) {
  const variants = product.variants || [];
  const totalQty = variants.reduce((s, v) => s + (v.quantity || 0), 0);

  const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];
  const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];

  const variations = [];
  const hasSize = sizes.length > 0 && !(sizes.length === 1 && sizes[0] === 'واحد');
  const hasColor = colors.length > 0 && !(colors.length === 1 && colors[0] === 'متعدد');

  if (hasColor) {
    variations.push({
      name: 'اللون',
      type: 'dropdown',
      props: colors.map(c => ({ name: c, value: c }))
    });
  }
  if (hasSize) {
    variations.push({
      name: 'المقاس',
      type: 'dropdown',
      props: sizes.map(s => ({ name: s, value: s }))
    });
  }

  const easyVariants = variants.map(v => {
    const vProps = [];
    if (hasColor) vProps.push({ variation: 'اللون', variation_prop: v.color || 'متعدد' });
    if (hasSize) vProps.push({ variation: 'المقاس', variation_prop: v.size || 'واحد' });
    return {
      price: v.price || product.price || 0,
      sale_price: 0,
      quantity: v.quantity || 0,
      taager_code: v.sku || v.id,
      variation_props: vProps
    };
  });

  return {
    name: product.name || '',
    price: product.price || 0,
    sale_price: Math.round((product.price || 0) * 0.85),
    description: product.description || '',
    slug: generateSlug(product.name),
    sku: product.sku || product.id,
    thumb: '',
    images: [],
    quantity: totalQty,
    track_stock: true,
    disable_orders_for_no_stock: false,
    buy_now_text: 'اشتر الآن',
    is_reviews_enabled: true,
    is_quantity_hidden: false,
    is_header_hidden: false,
    is_free_shipping: false,
    taager_code: product.sku || product.id,
    drop_shipping_provider: '',
    variations,
    variants: easyVariants
  };
}

function extractProductAndVariantIds(easyProduct) {
  const productId = easyProduct?.id || null;
  const sku = easyProduct?.sku || easyProduct?.taager_code || null;
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

function mapEasyOrderToErp(easyOrder) {
  const items = (easyOrder.cart_items || []).map(ci => {
    const product = ci.product || {};
    const variant = ci.variant || {};
    const variantProps = variant.variation_props || [];
    const sizeProp = variantProps.find(p => p.variation === 'size' || p.variation === 'المقاس');
    const colorProp = variantProps.find(p => p.variation === 'color' || p.variation === 'اللون');

    // Extract incoming identifiers — these are SKUs, not local DB IDs
    const incomingSku = product.sku || product.taager_code || '';
    const incomingVariantSku = variant.taager_code || variant.sku || incomingSku;

    return {
      productId: incomingSku,
      variantId: incomingVariantSku,
      productName: product.name || '',
      variantLabel: [colorProp?.variation_prop, sizeProp?.variation_prop].filter(Boolean).join(' - ') || 'واحد',
      quantity: ci.quantity || 1,
      price: ci.price || 0,
      costPrice: 0,
      sku: incomingSku,
      variantSku: incomingVariantSku,
      skuStatus: 'unmatched'
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

export {
  getConfig, call, uploadToImgBB, uploadImages,
  mapProductToEasy, extractProductAndVariantIds, mapEasyOrderToErp,
  generateSlug, BASE_URL
};
