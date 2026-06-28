import { Router } from 'express';
import { allDb, getDb, runDb, logActivity } from '../db.js';

const router = Router();

const CONTACT_COLS = `id, company_name as companyName, phone, phone2, contact_person as contactPerson, extra_phones as extraPhones, email, address, specialization, entity_type as entityType, tax_id as taxId, commercial_registry as commercialRegistry, notes, status, created_at as createdAt, updated_at as updatedAt, latitude, longitude, map_url as mapUrl, ratings_enabled as ratingsEnabled, ratings_data as ratingsData, links`;

router.get('/api/contacts', async (req, res) => {
  try {
    const { search, entityType, specialization, status } = req.query;
    let query = `SELECT ${CONTACT_COLS} FROM contacts WHERE 1=1`;
    const params = [];

    if (search) {
      query += " AND (company_name LIKE ? OR phone LIKE ? OR phone2 LIKE ? OR email LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (entityType && entityType !== 'all') {
      query += " AND entity_type = ?";
      params.push(entityType);
    }
    if (specialization && specialization !== 'all') {
      query += " AND specialization = ?";
      params.push(specialization);
    }
    if (status && status !== 'all') {
      query += " AND status = ?";
      params.push(status);
    }

    query += " ORDER BY company_name ASC";
    const rows = await allDb(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/contacts/export', async (req, res) => {
  try {
    const rows = await allDb(`SELECT ${CONTACT_COLS} FROM contacts ORDER BY company_name ASC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/contacts', async (req, res) => {
  try {
    const { companyName, phone, phone2, contactPerson, extraPhones, email, address, specialization, entityType, taxId, commercialRegistry, notes, status, latitude, longitude, mapUrl, ratingsEnabled, ratingsData, links } = req.body;
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: 'اسم الشركة مطلوب' });
    }

    const id = `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await runDb(
      `INSERT INTO contacts (id, company_name, phone, phone2, contact_person, extra_phones, email, address, specialization, entity_type, tax_id, commercial_registry, notes, status, latitude, longitude, map_url, ratings_enabled, ratings_data, links)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, companyName.trim(), phone || '', phone2 || '', contactPerson || '', extraPhones || '[]', email || '', address || '', specialization || '', entityType || 'أخرى', taxId || '', commercialRegistry || '', notes || '', status || 'نشط', latitude || null, longitude || null, mapUrl || null, ratingsEnabled ? 1 : 0, ratingsData || '{}', links || '[]']
    );

    if (specialization && specialization.trim()) {
      await runDb("INSERT OR IGNORE INTO specializations (name) VALUES (?)", [specialization.trim()]);
    }

    const activityLogId = await logActivity('create', 'contact', id, `تم إضافة جهة اتصال: ${companyName}`, { entityData: { id, companyName, phone, phone2, contactPerson, extraPhones, email, address, specialization, entityType, taxId, commercialRegistry, notes, status, latitude, longitude, mapUrl, ratingsEnabled, ratingsData, links } });
    const created = await getDb(`SELECT ${CONTACT_COLS} FROM contacts WHERE id = ?`, [id]);
    res.json({ ...created, activityLogId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/api/contacts/:id', async (req, res) => {
  try {
    const { companyName, phone, phone2, contactPerson, extraPhones, email, address, specialization, entityType, taxId, commercialRegistry, notes, status, latitude, longitude, mapUrl, ratingsEnabled, ratingsData, links } = req.body;
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: 'اسم الشركة مطلوب' });
    }

    const prevContact = await getDb(`SELECT ${CONTACT_COLS} FROM contacts WHERE id = ?`, [req.params.id]);
    await runDb(
      `UPDATE contacts SET company_name=?, phone=?, phone2=?, contact_person=?, extra_phones=?, email=?, address=?, specialization=?, entity_type=?, tax_id=?, commercial_registry=?, notes=?, status=?, latitude=?, longitude=?, map_url=?, ratings_enabled=?, ratings_data=?, links=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [companyName.trim(), phone || '', phone2 || '', contactPerson || '', extraPhones || '[]', email || '', address || '', specialization || '', entityType || 'أخرى', taxId || '', commercialRegistry || '', notes || '', status || 'نشط', latitude || null, longitude || null, mapUrl || null, ratingsEnabled ? 1 : 0, ratingsData || '{}', links || '[]', req.params.id]
    );

    if (specialization && specialization.trim()) {
      await runDb("INSERT OR IGNORE INTO specializations (name) VALUES (?)", [specialization.trim()]);
    }

    const updated = await getDb(`SELECT ${CONTACT_COLS} FROM contacts WHERE id = ?`, [req.params.id]);
    const activityLogId = await logActivity('update', 'contact', req.params.id, `تم تحديث جهة اتصال: ${companyName}`, { previousState: prevContact, newState: updated });
    res.json({ ...updated, activityLogId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/contacts/:id', async (req, res) => {
  try {
    const entityData = await getDb(`SELECT ${CONTACT_COLS} FROM contacts WHERE id = ?`, [req.params.id]);
    await runDb("DELETE FROM contacts WHERE id = ?", [req.params.id]);
    const activityLogId = await logActivity('delete', 'contact', req.params.id, `تم حذف جهة اتصال: ${entityData?.companyName || req.params.id}`, { entityData });
    res.json({ success: true, activityLogId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/contacts/companies', async (req, res) => {
  try {
    const rows = await allDb("SELECT company_name as companyName, entity_type as entityType FROM contacts WHERE status = 'نشط' AND entity_type IS NOT NULL AND entity_type != '' ORDER BY company_name ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/contacts/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await getDb("SELECT id, company_name as companyName, entity_type as entityType FROM contacts WHERE id = ?", [id]);
    if (!contact) return res.status(404).json({ error: 'الجهة غير موجودة' });

    // Expenses stats
    const exp = await getDb("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM expenses WHERE beneficiary_id = ?", [id]);

    // Purchase invoices stats (suppliers use same IDs via migration)
    const purch = await getDb("SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM purchase_invoices WHERE supplier_id = ?", [id]);

    // Products count (JSON: data contains supplierId)
    const allProducts = await allDb("SELECT data FROM products");
    let productsCount = 0;
    for (const row of allProducts) {
      try {
        const p = JSON.parse(row.data);
        if (p.supplierId === id) productsCount++;
      } catch {}
    }

    // Orders stats (JSON: data contains shippingCompany and status)
    const allOrders = await allDb("SELECT data FROM orders");
    let ordersTotalCount = 0;
    let ordersShippingTotal = 0;
    let ordersValueTotal = 0;
    let ordersInProgress = 0;
    let ordersCompleted = 0;
    let ordersCancelledReturned = 0;

    const SHIPPING_STATUSES = ['تم التأكيد', 'تم الدفع', 'قيد التجهيز للشحن', 'بانتظار الشحن', 'قيد التوصيل'];
    const COMPLETED_STATUSES = ['تم التوصيل'];
    const CANCELLED_RETURNED_STATUSES = ['تم الغاء الطلب', 'مرتجع من الشحن', 'تم الارجاع', 'العميل طلب الارجاع', 'جاري الارجاع'];

    for (const row of allOrders) {
      try {
        const o = JSON.parse(row.data);
        if (o.shippingCompany === contact.companyName) {
          ordersTotalCount++;
          const shipCost = parseFloat(o.shippingCost) || 0;
          ordersShippingTotal += shipCost;
          ordersValueTotal += parseFloat(o.totalAmount) || 0;

          if (SHIPPING_STATUSES.includes(o.status)) ordersInProgress++;
          else if (COMPLETED_STATUSES.includes(o.status)) ordersCompleted++;
          else if (CANCELLED_RETURNED_STATUSES.includes(o.status)) ordersCancelledReturned++;
        }
      } catch {}
    }

    res.json({
      expensesCount: exp.count,
      expensesTotal: exp.total,
      purchaseCount: purch.count,
      purchaseTotal: purch.total,
      productsCount,
      orders: {
        totalCount: ordersTotalCount,
        shippingTotal: ordersShippingTotal,
        ordersValueTotal,
        inProgress: ordersInProgress,
        completed: ordersCompleted,
        cancelledReturned: ordersCancelledReturned
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/contacts/specializations', async (req, res) => {
  try {
    const rows = await allDb("SELECT DISTINCT name FROM specializations ORDER BY name ASC");
    const fromContacts = await allDb("SELECT DISTINCT specialization FROM contacts WHERE specialization IS NOT NULL AND specialization != '' ORDER BY specialization ASC");
    const all = new Set();
    rows.forEach(r => { if (r.name) all.add(r.name); });
    fromContacts.forEach(r => { if (r.specialization) all.add(r.specialization); });
    res.json(Array.from(all));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/contacts/specializations/:name', async (req, res) => {
  try {
    await runDb("DELETE FROM specializations WHERE name = ?", [req.params.name]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
