import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, X, Save, Trash2, Eye, EyeOff, Shield, UserCog, Check, AlertCircle } from 'lucide-react';
import { API_BASE } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

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
  const [form, setForm] = useState({ username: '', password: '', role: 'user', can_change_password: true, permissions: JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)) });
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const showNotif = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800">
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -50, x: '-50%' }} className={`fixed top-6 left-1/2 z-[300] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
            {notification.type === 'success' ? <Check size={24} /> : <AlertCircle size={24} />}
            <span className="font-bold">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2"><Shield className="text-accent" /><h3 className="text-2xl font-bold">إدارة المستخدمين</h3></div>
        <button onClick={openNew} className="flex items-center gap-2 px-5 py-3 bg-accent text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-md"><Plus size={18} /> مستخدم جديد</button>
      </div>

      <div className="space-y-3">
        {users.map(user => (
          <motion.div key={user.id} layout className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><UserCog size={20} className="text-accent" /></div>
              <div>
                <p className="font-bold">{user.username}</p>
                <p className="text-xs text-gray-400">{user.role === 'admin' ? 'مدير' : 'مستخدم'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openEdit(user)} className="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-xl transition-all"><Save size={16} /></button>
              {user.role !== 'admin' && (
                <button onClick={() => deleteUser(user)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 size={16} /></button>
              )}
            </div>
          </motion.div>
        ))}
        {users.length === 0 && (
          <p className="text-center text-gray-400 py-8 font-bold">لا يوجد مستخدمون بعد</p>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 rounded-[32px] p-8 max-w-2xl w-full shadow-2xl relative z-10 space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black">{editingUser ? 'تعديل مستخدم' : 'مستخدم جديد'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">اسم المستخدم</label>
                  <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-accent" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{editingUser ? 'كلمة مرور جديدة (اتركها فارغة)' : 'كلمة المرور'}</label>
                  <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-accent" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الدور</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-accent">
                    <option value="user">مستخدم</option>
                    <option value="admin">مدير</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">تغيير كلمة المرور</label>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.can_change_password} onChange={e => setForm({ ...form, can_change_password: e.target.checked })} className="w-5 h-5 rounded accent-accent" />
                      <span className="font-bold text-sm">مسموح للمستخدم تغيير كلمة المرور</span>
                    </label>
                  </div>
                </div>
              </div>

              {form.role !== 'admin' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الصلاحيات</label>
                    <div className="flex gap-2">
                      <button onClick={() => setAllPermissions(true)} className="px-3 py-1.5 bg-accent/10 text-accent text-xs font-bold rounded-xl hover:bg-accent/20 transition-all">تحديد الكل</button>
                      <button onClick={() => setAllPermissions(false)} className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-all">إلغاء الكل</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {SECTIONS.map(section => (
                      <div key={section.key} className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700">
                        <p className="font-bold text-sm mb-3">{section.label}</p>
                        <div className="flex gap-3">
                          <label className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all ${form.permissions[section.key]?.view ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-gray-100 dark:bg-slate-700 text-gray-400'}`}>
                            <input type="checkbox" checked={form.permissions[section.key]?.view || false} onChange={() => togglePerm(section.key, 'view')} className="hidden" />
                            <Eye size={14} /> عرض
                          </label>
                          <label className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all ${form.permissions[section.key]?.edit ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-gray-100 dark:bg-slate-700 text-gray-400'}`}>
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
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-700 flex items-center gap-3">
                  <Shield size={20} className="text-amber-500 flex-shrink-0" />
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-300">المدير لديه جميع الصلاحيات بشكل تلقائي</p>
                </div>
              )}

              <button onClick={saveUser} className="w-full py-4 bg-accent text-white rounded-2xl font-bold shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2">
                <Save size={20} /> {editingUser ? 'حفظ التغييرات' : 'إنشاء المستخدم'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
