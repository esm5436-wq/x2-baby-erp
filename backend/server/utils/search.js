import { allDb } from '../db.js';

export async function searchProducts(query) {
    const rows = await allDb("SELECT data, sku FROM products");
    const products = rows.map(r => ({ ...JSON.parse(r.data), sku: r.sku || JSON.parse(r.data).sku }));
    return products
        .filter(p =>
            p.name?.toLowerCase().includes(query.toLowerCase()) ||
            p.category?.toLowerCase().includes(query.toLowerCase()) ||
            p.sku?.toLowerCase().includes(query.toLowerCase())
        )
        .map(p => ({
            id: p.id, sku: p.sku, name: p.name, price: p.price, category: p.category,
            variants: (p.variants || []).map(v => ({
                id: v.id, sku: v.sku, size: v.size, color: v.color, quantity: v.quantity
            }))
        }))
        .slice(0, 5);
}
