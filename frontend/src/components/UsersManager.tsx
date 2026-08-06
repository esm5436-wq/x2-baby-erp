import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Eye, EyeOff, Shield, UserCog, Save } from 'lucide-react';
import { API_BASE } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { MD3Button, MD3IconButton, MD3Dialog, useSnackbar } from './md3';

const SECTIONS = [
  { key: 'products', label: 'المخزون' },
  { key: 'orders', label: 'الطلبات' },
  { key: 'customers', label: 'العملاء' },
  { key: 'contacts', label: 'جهات الاتصال' },
  { key: 'suppliers', label: 'الموردين' },
  { key: 'purchases', label: 'المشتريات' },
  { key: 'accounts', label: 'الحسابات' },
  { key: 'settings', label: 'الإعدادات' },
  { key: 'ai', label: 'المساعد الذكي' },
  { key: 'activity-logs', label: 'سجل النشاطات' },
];

const DEFAULT_PERMISSIONS = Object.fromEntries(
  SECTIONS.map(s => [s.key, { view: false, edit: false }])
);

export default function UsersManager() {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form, setForm] = useState(() => ({ username: '', password: '', role: 'user', can_change_password: true, permissions: JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)) }));
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const snackbar = useSnackbar();

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const showNotif = (message: string, type: 'success' | 'error') => {
    if (type === 'success') snackbar.success(message);
    else snackbar.error(message);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`, { headers });
      const data = await res.json();
      setUsers(data.users || []);
    } catch {}
  };

  useEffect(() => { fetchUsers(); }, []);

  const openNew = () => {
    setEditingUser(null);
    setForm({ username: '', password: '', role: 'user', can_change_password: true, permissions: JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)) });
    setShowModal(true);
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    let perms = DEFAULT_PERMISSIONS;
    try { perms = JSON.parse(user.permissions || '{}'); } catch {}
    setForm({
      username: user.username,
      password: '',
      role: user.role,
      can_change_password: user.can_change_password === 1 || user.can_change_password === true,
      permissions: { ...DEFAULT_PERMISSIONS, ...perms }
    });
    setShowModal(true);
  };

  const saveUser = async () => {
    if (editingUser) {
      const body: any = {};
      if (form.username !== editingUser.username) body.username = form.username;
      if (form.password) body.password = form.password;
      if (form.role !== editingUser.role) body.role = form.role;
      body.permissions = form.permissions;
      body.can_change_password = form.can_change_password;
      try {
        const res = await fetch(`${API_BASE}/users/${editingUser.id}`, { method: 'PUT', headers, body: JSON.stringify(body) });
        if (!res.ok) { const d = await res.json(); showNotif(d.error || 'خطأ', 'error'); return; }
        showNotif('تم تحديث المستخدم', 'success');
        setShowModal(false);
        fetchUsers();
      } catch { showNotif('خطأ في الاتصال', 'error'); }
    } else {
      try {
        const res = await fetch(`${API_BASE}/users`, { method: 'POST', headers, body: JSON.stringify(form) });
        if (!res.ok) { const d = await res.json(); showNotif(d.error || 'خطأ', 'error'); return; }
        showNotif('تم إنشاء المستخدم', 'success');
        setShowModal(false);
        fetchUsers();
      } catch { showNotif('خطأ في الاتصال', 'error'); }
    }
  };

  const deleteUser = async (user: any) => {
    if (!confirm(`هل أنت متأكد من حذف المستخدم ${user.username}؟`)) return;
    try {
      const res = await fetch(`${API_BASE}/users/${user.id}`, { method: 'DELETE', headers });
      if (!res.ok) { const d = await res.json(); showNotif(d.error || 'خطأ', 'error'); return; }
      showNotif('تم حذف المستخدم', 'success');
      fetchUsers();
    } catch { showNotif('خطأ في الاتصال', 'error'); }
  };

  const togglePerm = (section: string, action: 'view' | 'edit') => {
    setForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [section]: {
          ...prev.permissions[section],
          [action]: !prev.permissions[section]?.[action]
        }
      }
    }));
  };

  const setAllPermissions = (value: boolean) => {
    setForm(prev => ({
      ...prev,
      permissions: Object.fromEntries(
        SECTIONS.map(s => [s.key, { view: value, edit: value }])
      )
    }));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--md-sys-color-surface)] p-8 rounded-[32px] shadow-sm border border-[var(--md-sys-color-outline-variant)]/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-2xl shrink-0" style={{ backgroundColor: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
            <Shield size={24} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold">إدارة المستخدمين</h3>
        </div>
        <MD3Button variant="filled" icon={<Plus size={18} />} onClick={openNew} className="w-full sm:w-auto">مستخدم جديد</MD3Button>
      </div>

      <div className="space-y-3">
        {users.map(user => (
          <motion.div key={user.id} layout className="flex items-center justify-between p-4 bg-[var(--md-sys-color-surface-container)] rounded-2xl border border-[var(--md-sys-color-outline-variant)]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}><UserCog size={20} /></div>
              <div>
                <p className="font-bold text-[var(--md-sys-color-on-surface)]">{user.username}</p>
                <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">{user.role === 'admin' ? 'مدير' : 'مستخدم'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <MD3IconButton icon={<Save size={16} />} onClick={() => openEdit(user)} title="تعديل" />
              {user.role !== 'admin' && (
                <MD3IconButton icon={<Trash2 size={16} />} onClick={() => deleteUser(user)} title="حذف" />
              )}
            </div>
          </motion.div>
        ))}
        {users.length === 0 && (
          <p className="text-center text-[var(--md-sys-color-on-surface-variant)] py-8 font-bold">لا يوجد مستخدمون بعد</p>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <MD3Dialog
            isOpen={true}
            onClose={() => setShowModal(false)}
            title={editingUser ? 'تعديل مستخدم' : 'مستخدم جديد'}
            icon={<span className="material-symbols-rounded" style={{ fontSize: 24 }}>person_add</span>}
            maxWidth="lg"
            actions={[
              { label: 'إلغاء', onClick: () => setShowModal(false), variant: 'text' },
              { label: editingUser ? 'حفظ التغييرات' : 'إنشاء المستخدم', onClick: saveUser, variant: 'filled' }
            ]}
          >

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest">اسم المستخدم</label>
                  <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full p-4 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/30 rounded-2xl font-bold outline-none text-[var(--md-sys-color-on-surface)] focus:border-[var(--md-sys-color-primary)]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest">{editingUser ? 'كلمة مرور جديدة (اتركها فارغة)' : 'كلمة المرور'}</label>
                  <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full p-4 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/30 rounded-2xl font-bold outline-none text-[var(--md-sys-color-on-surface)] focus:border-[var(--md-sys-color-primary)]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest">الدور</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full p-4 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/30 rounded-2xl font-bold outline-none text-[var(--md-sys-color-on-surface)] focus:border-[var(--md-sys-color-primary)]">
                    <option value="user">مستخدم</option>
                    <option value="admin">مدير</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest">تغيير كلمة المرور</label>
                  <div className="flex items-center gap-3 p-4 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/30 rounded-2xl">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.can_change_password} onChange={e => setForm({ ...form, can_change_password: e.target.checked })} className="w-5 h-5 rounded accent-[var(--md-sys-color-primary)]" />
                      <span className="font-bold text-sm text-[var(--md-sys-color-on-surface)]">مسموح للمستخدم تغيير كلمة المرور</span>
                    </label>
                  </div>
                </div>
              </div>

              {form.role !== 'admin' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الصلاحيات</label>
                    <div className="flex gap-2">
                      <MD3Button variant="tonal" size="small" onClick={() => setAllPermissions(true)}>تحديد الكل</MD3Button>
                      <MD3Button variant="outlined" size="small" onClick={() => setAllPermissions(false)}>إلغاء الكل</MD3Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {SECTIONS.map(section => (
                      <div key={section.key} className="p-4 bg-[var(--md-sys-color-surface-container)] rounded-2xl border border-[var(--md-sys-color-outline-variant)]/20">
                        <p className="font-bold text-sm mb-3 text-[var(--md-sys-color-on-surface)]">{section.label}</p>
                        <div className="flex gap-3">
                          <label className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all ${form.permissions[section.key]?.view ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface-variant)]'}`}>
                            <input type="checkbox" checked={form.permissions[section.key]?.view || false} onChange={() => togglePerm(section.key, 'view')} className="hidden" />
                            <Eye size={14} /> عرض
                          </label>
                          <label className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all ${form.permissions[section.key]?.edit ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface-variant)]'}`}>
                            <input type="checkbox" checked={form.permissions[section.key]?.edit || false} onChange={() => togglePerm(section.key, 'edit')} className="hidden" />
                            <Save size={14} /> تعديل
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {form.role === 'admin' && (
                <div className="p-4 bg-[var(--md-sys-color-tertiary-container)] rounded-2xl border border-[var(--md-sys-color-outline-variant)]/20 flex items-center gap-3">
                  <Shield size={20} className="text-[var(--md-sys-color-tertiary)] flex-shrink-0" />
                  <p className="text-sm font-bold text-[var(--md-sys-color-on-tertiary-container)]">المدير لديه جميع الصلاحيات بشكل تلقائي</p>
                </div>
              )}

          </MD3Dialog>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
