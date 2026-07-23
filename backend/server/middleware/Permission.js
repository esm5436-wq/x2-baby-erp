import { getDb } from '../db.js';

const SECTION_BY_PATH = [
  { prefix: '/api/products', section: 'products' },
  { prefix: '/api/orders', section: 'orders' },
  { prefix: '/api/customers', section: 'customers' },
  { prefix: '/api/contacts', section: 'contacts' },
  { prefix: '/api/suppliers', section: 'suppliers' },
  { prefix: '/api/purchase-invoices', section: 'purchases' },
  { prefix: '/api/easy-orders', section: 'purchases' },
  { prefix: '/api/targets', section: 'accounts' },
  { prefix: '/api/expenses', section: 'accounts' },
  { prefix: '/api/financial', section: 'accounts' },
  { prefix: '/api/settings', section: 'settings' },
  { prefix: '/api/ai-keys', section: 'settings' },
  { prefix: '/api/coupons', section: 'settings' },
  { prefix: '/api/checkpoints', section: 'settings' },
  { prefix: '/api/import/products', section: 'products' },
  { prefix: '/api/import/orders', section: 'orders' },
  { prefix: '/api/categories', section: 'products' },
  { prefix: '/api/ai/chat', section: 'ai' },
  { prefix: '/api/activity-logs', section: 'activity-logs' },
];

const BYPASS_PATHS = [
  '/api/auth', '/api/public',
  '/api/brand-logo', '/api/manifest',
  '/api/users', '/api/state',
  '/api/backup',
];

export async function requireRoutePermission(req, res, next) {
  try {
    if (BYPASS_PATHS.some(p => req.path.startsWith(p))) {
      return next();
    }
    if (!req.user) {
      return res.status(401).json({ error: 'غير مصرح' });
    }
    if (req.user.role === 'admin') {
      return next();
    }
    const match = SECTION_BY_PATH.find(({ prefix }) => req.path.startsWith(prefix));
    if (!match) {
      return next();
    }
    const user = await getDb("SELECT permissions FROM users WHERE id = ?", [req.user.userId]);
    if (!user) {
      return res.status(401).json({ error: 'المستخدم غير موجود' });
    }
    const perms = (() => { try { return JSON.parse(user.permissions || '{}'); } catch { return {}; } })();
    const action = ['GET', 'HEAD'].includes(req.method) ? 'view' : 'edit';
    const sectionPerms = perms[match.section];
    if (!sectionPerms || !sectionPerms[action]) {
      return res.status(403).json({
        error: `ليس لديك صلاحية ${action === 'view' ? 'عرض' : 'تعديل'} هذا القسم`
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}
