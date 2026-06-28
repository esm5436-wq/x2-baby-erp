import { Router } from 'express';
import { allDb, runDb, getDb, logActivity, localizeImageAsFile, generateProductSku, generateVariantSkus } from '../db.js';

const router = Router();

router.post('/api/products', async (req, res) => {
    try {
        let product = req.body;
        if (product.image && product.image.startsWith('http')) {
            product.image = await localizeImageAsFile(product.image, product.id);
        }
        if (product.images && Array.isArray(product.images)) {
            product.images = await Promise.all(
                product.images.map(url => localizeImageAsFile(url, product.id + '_gallery'))
            );
        }
        if (!product.createdAt) product.createdAt = new Date().toISOString();

        const existing = await getDb("SELECT data, sku FROM products WHERE id = ?", [product.id]);
        if (existing) {
            // Keep existing SKU, but ensure variants have SKUs
            if (!product.sku) product.sku = existing.sku;
            const prevState = JSON.parse(existing.data);
            // Assign variant SKUs for new variants missing them
            const existingVariants = prevState.variants || [];
            const varSkuCount = existingVariants.filter(v => v.sku).length;
            const newVariants = (product.variants || []).map((v, i) => {
                if (!v.sku) {
                    const found = existingVariants.find(ev => ev.id === v.id);
                    return { ...v, sku: found?.sku || `${product.sku}-${String(varSkuCount + i + 1).padStart(2, '0')}` };
                }
                return v;
            });
            product.variants = newVariants;

            await runDb("UPDATE products SET data = ? WHERE id = ?",
                [JSON.stringify(product), product.id]);
            const activityLogId = await logActivity('update', 'product', product.id, 'تم تعديل المنتج ' + product.name, { previousState: prevState, newState: product });
            res.json({ success: true, activityLogId });
        } else {
            // Auto-generate SKU for new products
            if (!product.sku) {
                product.sku = await generateProductSku();
            }
            // Ensure all variants have SKUs
            const variants = product.variants || [];
            if (variants.length === 0) {
                product.variants = [{
                    id: `v-main-${product.id}`,
                    sku: `${product.sku}-01`,
                    size: 'واحد',
                    color: 'متعدد',
                    quantity: 0,
                    price: product.price || 0,
                    lowStockThreshold: 2
                }];
            } else {
                const varSkus = await generateVariantSkus(product.sku, variants.length);
                product.variants = variants.map((v, i) => ({
                    ...v,
                    sku: v.sku || varSkus[i] || `${product.sku}-${String(i + 1).padStart(2, '0')}`
                }));
            }

            await runDb("INSERT INTO products (id, data, sku) VALUES (?, ?, ?)",
                [product.id, JSON.stringify(product), product.sku]);
            const activityLogId = await logActivity('create', 'product', product.id, 'تم حفظ المنتج ' + product.name + ' (' + product.sku + ')', { entityData: product });
            res.json({ success: true, activityLogId, sku: product.sku });
        }
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'رقم SKU مكرر: ' + product.sku + '. يرجى المحاولة مرة أخرى.' });
        }
        res.status(500).json({ error: err.message });
    }
});

router.delete('/api/products/:id', async (req, res) => {
    try {
        const row = await getDb("SELECT data FROM products WHERE id = ?", [req.params.id]);
        if (row) {
            const p = JSON.parse(row.data);
            await runDb("DELETE FROM products WHERE id = ?", [req.params.id]);
            const activityLogId = await logActivity('delete', 'product', req.params.id, 'تم حذف المنتج ' + p.name, { entityData: p });
        } else {
            await runDb("DELETE FROM products WHERE id = ?", [req.params.id]);
        }
        res.json({ success: true, activityLogId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/api/products/bulk-delete', async (req, res) => {
    try {
        const ids = req.body.ids;
        const rows = await allDb("SELECT id, data FROM products WHERE id IN (" + ids.map(() => '?').join(',') + ")", ids);
        const entityData = {};
        rows.forEach(r => { entityData[r.id] = JSON.parse(r.data); });
        const placeholders = ids.map(() => '?').join(',');
        await runDb('DELETE FROM products WHERE id IN (' + placeholders + ')', ids);
        const activityLogId = await logActivity('delete', 'product', ids.join(','), 'تم حذف ' + ids.length + ' منتج', { entityData });
        res.json({ success: true, activityLogId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/api/products/batch', async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ids' });
    }
    const previousState = {};
    const newState = {};
    for (const id of ids) {
      const row = await getDb("SELECT data FROM products WHERE id = ?", [id]);
      if (row) {
        const product = JSON.parse(row.data);
        previousState[id] = JSON.parse(JSON.stringify(product));
        Object.keys(updates).forEach(key => {
          product[key] = updates[key];
        });
        newState[id] = JSON.parse(JSON.stringify(product));
        await runDb("UPDATE products SET data = ? WHERE id = ?",
          [JSON.stringify(product), id]);
      }
    }
    const activityLogId = await logActivity('update', 'product', ids.join(','), `تم تعديل ${ids.length} منتج`, { previousState, newState });
    res.json({ success: true, activityLogId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
