import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Search, Plus, ShoppingBag, DollarSign, Calendar,
  MapPin, Globe, Tag, Filter, X, Trash2, UserCheck, RefreshCw, TrendingUp,
  Download, CheckSquare, Square, ChevronDown, Navigation, Phone, FileText, Edit2, Star, Copy, ArrowUpDown
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import CustomerModal from './CustomerModal';
import CustomerDetail from './CustomerDetail';
import { formatDate } from '../lib/formatDate';
import { API_BASE } from '../lib/api';
import type { Customer, Order } from '../types';

interface CustomersProps {
  customers: Customer[];
  orders: Order[];
  branding?: any;
}

const CLASSIFICATION_STYLES: Record<string, string> = {
  'ممتاز': 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  'جيد جداً': 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'جيد': 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  'تحت المراقبة': 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  'جديد': 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
};

const CLASSIFICATION_ORDER: Record<string, number> = {
  'ممتاز': 5,
  'جيد جداً': 4,
  'جيد': 3,
  'تحت المراقبة': 2,
  'جديد': 1,
};

function getCircleColor(percent: number): string {
  if (percent >= 85) return '#10b981';
  if (percent >= 70) return '#3b82f6';
  if (percent >= 50) return '#f59e0b';
  return '#ef4444';
}

function parseTags(tags?: string): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return tags.split(',').map(t => t.trim()).filter(Boolean);
  }
}

export default function Customers({ customers, orders, branding }: CustomersProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [localCustomers, setLocalCustomers] = useState<Customer[]>(customers);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showExportSettings, setShowExportSettings] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  const EXPORT_COLUMNS = [
    { id: 'name', label: 'اسم العميل' },
    { id: 'phone', label: 'رقم الهاتف' },
    { id: 'alt_phone', label: 'هاتف بديل' },
    { id: 'email', label: 'البريد الإلكتروني' },
    { id: 'city', label: 'المحافظة' },
    { id: 'source', label: 'المصدر' },
    { id: 'address', label: 'العنوان' },
    { id: 'total_orders', label: 'عدد الطلبات' },
    { id: 'total_spent', label: 'إجمالي الإنفاق' },
    { id: 'last_order_date', label: 'آخر طلب' },
    { id: 'classification', label: 'التصنيف' },
    { id: 'tags', label: 'الوسوم' },
    { id: 'notes', label: 'ملاحظات' },
    { id: 'admin_notes', label: 'ملاحظات الإدارة' },
    { id: 'createdAt', label: 'تاريخ الإنشاء' },
  ] as const;
  const [exportColumns, setExportColumns] = useState<string[]>(['name', 'phone', 'city', 'source', 'total_orders', 'total_spent', 'classification']);

  useEffect(() => { setLocalCustomers(customers); }, [customers]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/customers`);
      const data = await res.json();
      setLocalCustomers(data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const sources = useMemo(() => {
    const s = new Set<string>();
    localCustomers.forEach(c => { if (c.source) s.add(c.source); });
    return Array.from(s).sort();
  }, [localCustomers]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    localCustomers.forEach(c => parseTags(c.tags).forEach(t => s.add(t)));
    return Array.from(s).sort();
  }, [localCustomers]);

  const allClassifications = useMemo(() => {
    const s = new Set<string>();
    localCustomers.forEach(c => { if (c.classification) s.add(c.classification); });
    return Array.from(s).sort();
  }, [localCustomers]);

  const filtered = useMemo(() => {
    let result = localCustomers.filter(c => {
      if (search) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.phone.includes(q)) return false;
      }
      if (sourceFilter && c.source !== sourceFilter) return false;
      if (tagFilter) {
        const tags = parseTags(c.tags);
        if (!tags.includes(tagFilter)) return false;
      }
      if (classificationFilter && c.classification !== classificationFilter) return false;
      if (dateFilter === 'last7' && c.last_order_date) {
        const d = new Date(c.last_order_date);
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        if (d < weekAgo) return false;
      } else if (dateFilter === 'last30' && c.last_order_date) {
        const d = new Date(c.last_order_date);
        const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
        if (d < monthAgo) return false;
      } else if (dateFilter === 'no_orders') {
        if (c.total_orders && c.total_orders > 0) return false;
      } else if (dateFilter === 'custom' && fromDate && toDate) {
        const d = c.last_order_date ? new Date(c.last_order_date) : null;
        if (!d || d < new Date(fromDate) || d > new Date(toDate + 'T23:59:59')) return false;
      }
      return true;
    });
    result.sort((a, b) => {
      let va: any, vb: any;
      switch (sortField) {
        case 'total_spent': va = a.total_spent ?? 0; vb = b.total_spent ?? 0; break;
        case 'total_orders': va = a.total_orders ?? 0; vb = b.total_orders ?? 0; break;
        case 'classification':
          va = CLASSIFICATION_ORDER[a.classification ?? ''] ?? 0;
          vb = CLASSIFICATION_ORDER[b.classification ?? ''] ?? 0;
          break;
        case 'last_order_date': va = a.last_order_date || ''; vb = b.last_order_date || ''; break;
        case 'rating': va = a.rating ?? 0; vb = b.rating ?? 0; break;
        default: va = a.createdAt || ''; vb = b.createdAt || '';
      }
      if (typeof va === 'number' && typeof vb === 'number') return sortAsc ? va - vb : vb - va;
      return sortAsc ? (va || '').localeCompare(vb || '') : (vb || '').localeCompare(va || '');
    });
    return result;
  }, [localCustomers, search, sourceFilter, tagFilter, classificationFilter, dateFilter, fromDate, toDate, sortField, sortAsc]);

  const stats = useMemo(() => {
    const total = localCustomers.length;
    const totalOrders = localCustomers.reduce((s, c) => s + (c.total_orders || 0), 0);
    const totalSpent = localCustomers.reduce((s, c) => s + (c.total_spent || 0), 0);
    const avgSpent = total > 0 ? totalSpent / total : 0;
    return { total, totalOrders, totalSpent, avgSpent };
  }, [localCustomers]);

  const hasActiveFilters = search || sourceFilter || tagFilter || classificationFilter || dateFilter !== 'all';

  const resetFilters = () => {
    setSearch(''); setSourceFilter(''); setTagFilter(''); setClassificationFilter(''); setDateFilter('all'); setFromDate(''); setToDate('');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} عميل؟`)) return;
    for (const id of selectedIds) {
      try { await fetch(`${API_BASE}/customers/${id}`, { method: 'DELETE' }); } catch {}
    }
    await fetchCustomers();
    setSelectedIds(new Set());
  };

  const handleExport = async () => {
    const XLSX = await import('xlsx');
    const data = (selectedIds.size > 0 ? filtered.filter(c => selectedIds.has(c.id)) : filtered).map(c => {
      const row: any = {};
      exportColumns.forEach(col => {
        switch (col) {
          case 'name': row['اسم العميل'] = c.name; break;
          case 'phone': row['رقم الهاتف'] = c.phone; break;
          case 'alt_phone': row['هاتف بديل'] = c.alt_phone || ''; break;
          case 'email': row['البريد الإلكتروني'] = c.email || ''; break;
          case 'city': row['المحافظة'] = c.city || ''; break;
          case 'source': row['المصدر'] = c.source || ''; break;
          case 'address': row['العنوان'] = c.address || ''; break;
          case 'total_orders': row['عدد الطلبات'] = c.total_orders || 0; break;
          case 'total_spent': row['إجمالي الإنفاق'] = c.total_spent || 0; break;
          case 'last_order_date': row['آخر طلب'] = c.last_order_date || ''; break;
          case 'classification': row['التصنيف'] = c.classification || ''; break;
          case 'tags': row['الوسوم'] = c.tags || ''; break;
          case 'notes': row['ملاحظات'] = c.notes || ''; break;
          case 'admin_notes': row['ملاحظات الإدارة'] = c.admin_notes || ''; break;
          case 'createdAt': row['تاريخ الإنشاء'] = c.createdAt || ''; break;
        }
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'العملاء');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `work_customers_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportSettings(false);
  };

  const handleSave = async (data: any) => {
    try {
      const isEdit = !!editCustomer;
      const url = isEdit ? `${API_BASE}/customers/${editCustomer.id}` : `${API_BASE}/customers`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) { const err = await res.json(); if (res.status === 409) { alert(err.error); return; } }
      await fetchCustomers();
      setModalOpen(false); setEditCustomer(null);
    } catch (err) { console.error('Failed to save customer:', err); }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`هل أنت متأكد من حذف العميل "${customer.name}"؟`)) return;
    try {
      await fetch(`${API_BASE}/customers/${customer.id}`, { method: 'DELETE' });
      await fetchCustomers(); setViewCustomer(null);
    } catch (err) { console.error('Failed to delete customer:', err); }
  };

  const handleViewCustomer = async (customer: Customer) => {
    try {
      const res = await fetch(`${API_BASE}/customers/${customer.id}`);
      const data = await res.json();
      setCustomerOrders(data.orders || []);
      setViewCustomer(data.customer || customer);
    } catch { setCustomerOrders([]); setViewCustomer(customer); }
  };

  const handleOpenEdit = () => { setEditCustomer(viewCustomer); setViewCustomer(null); setModalOpen(true); };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 items-center">
        <motion.h2 initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="text-2xl font-black flex items-center gap-3 text-gray-900 dark:text-white shrink-0">
          <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.8 }}>
            <Users className="text-accent" size={32} />
          </motion.div>
          العملاء
        </motion.h2>
        <div className="flex flex-wrap gap-4 w-full lg:w-auto items-center justify-center lg:justify-end">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileHover={{ scale: 1.02 }} className="relative flex-1 md:min-w-72 md:w-72">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
            <input className="w-full pr-12 pl-4 py-3.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-gray-900 dark:text-white focus:border-accent shadow-sm" placeholder="ابحث عن عميل..." value={search} onChange={e => setSearch(e.target.value)} />
          </motion.div>
          <motion.button initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { setEditCustomer(null); setModalOpen(true); }}
            className="bg-accent text-white px-6 py-3.5 rounded-2xl flex items-center gap-2 font-black shadow-md hover:bg-accent/90 transition-all active:scale-95 text-xs md:text-sm"
          >
            <Plus size={20} /> إضافة عميل
          </motion.button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-widest px-2">
          <Tag size={14} /> فلاتر:
        </div>
        <div className="relative">
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl outline-none font-black text-[11px] text-gray-700 dark:text-gray-200 focus:border-accent shadow-sm cursor-pointer appearance-none">
            <option value="">كل المصادر</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
        </div>
        <div className="relative">
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl outline-none font-black text-[11px] text-gray-700 dark:text-gray-200 focus:border-accent shadow-sm cursor-pointer appearance-none">
            <option value="">كل الوسوم</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
        </div>
        <div className="relative">
          <select value={classificationFilter} onChange={e => setClassificationFilter(e.target.value)} className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl outline-none font-black text-[11px] text-gray-700 dark:text-gray-200 focus:border-accent shadow-sm cursor-pointer appearance-none">
            <option value="">كل التصنيفات</option>
            {allClassifications.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
        </div>
        {/* Sort */}
        <div className="w-px h-6 bg-gray-200 dark:bg-slate-700" />
        <div className="relative">
          <select value={sortField} onChange={e => setSortField(e.target.value)} className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl outline-none font-black text-[11px] text-gray-700 dark:text-gray-200 focus:border-accent shadow-sm cursor-pointer appearance-none">
            <option value="created_at">الأحدث أولاً</option>
            <option value="total_spent">الأعلى إنفاقاً</option>
            <option value="total_orders">الأكثر طلبات</option>
            <option value="classification">التصنيف</option>
            <option value="last_order_date">آخر طلب</option>
            <option value="rating">التقييم</option>
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
        </div>
        <button onClick={() => setSortAsc(p => !p)} className={`px-3 py-2.5 rounded-xl flex items-center gap-1.5 font-black text-[11px] transition-all ${sortAsc ? 'bg-accent text-white' : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-slate-800'}`} title={sortAsc ? 'تصاعدي' : 'تنازلي'}>
          <ArrowUpDown size={14} /> {sortAsc ? '▲' : '▼'}
        </button>
        <button onClick={() => setShowAdvancedFilter(!showAdvancedFilter)} className={`px-4 py-2.5 rounded-xl flex items-center gap-2 font-black text-[11px] transition-all ${showAdvancedFilter ? 'bg-accent text-white' : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-slate-800'}`}>
          <Filter size={14} /> مدة آخر طلب
        </button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={toggleSelectAll}
          className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 font-black text-[11px] border transition-all active:scale-95 ${selectedIds.size === filtered.length && filtered.length > 0 ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-slate-800'}`}
          title="تحديد الكل"
        >
          {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
          <span className="hidden sm:inline">تحديد الكل</span>
        </motion.button>
        {selectedIds.size > 0 && (
          <motion.button initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            onClick={() => setShowExportSettings(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl font-black text-[11px] shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            <Download size={16} /> تصدير
          </motion.button>
        )}
        <button onClick={fetchCustomers} className="p-2.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
          <RefreshCw size={14} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
        {hasActiveFilters && (
          <button onClick={resetFilters} className="text-[10px] font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-xl transition-all flex items-center gap-1">
            <X size={12} /> رسيت الفلاتر
          </button>
        )}
      </div>

      {/* Advanced Date Filter */}
      <AnimatePresence>
        {showAdvancedFilter && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 flex flex-wrap items-center gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400">آخر طلب</label>
                <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none">
                  <option value="all">كل الفترات</option>
                  <option value="last7">آخر 7 أيام</option>
                  <option value="last30">آخر 30 يوم</option>
                  <option value="no_orders">بدون طلبات</option>
                  <option value="custom">نطاق مخصص</option>
                </select>
              </div>
              {dateFilter === 'custom' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400">من</label>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400">إلى</label>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none" />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-4 md:gap-8 justify-center lg:justify-start items-center bg-white dark:bg-slate-900 p-4 md:px-8 rounded-[32px] border border-gray-50 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent"><Users size={20} /></div>
          <div>
            <div className="text-[10px] font-black text-gray-400 dark:text-gray-500">إجمالي العملاء</div>
            <div className="text-lg font-black text-gray-900 dark:text-white">{stats.total}</div>
          </div>
        </div>
        <div className="w-px h-10 bg-gray-100 dark:bg-slate-800" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600"><ShoppingBag size={20} /></div>
          <div>
            <div className="text-[10px] font-black text-gray-400 dark:text-gray-500">إجمالي الطلبات</div>
            <div className="text-lg font-black text-gray-900 dark:text-white">{stats.totalOrders}</div>
          </div>
        </div>
        <div className="w-px h-10 bg-gray-100 dark:bg-slate-800" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600"><DollarSign size={20} /></div>
          <div>
            <div className="text-[10px] font-black text-gray-400 dark:text-gray-500">إجمالي الإنفاق</div>
            <div className="text-lg font-black text-gray-900 dark:text-white">{stats.totalSpent.toLocaleString()} ج.م</div>
          </div>
        </div>
      </motion.div>

      {/* Customer Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Users size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-xl font-black text-gray-400 dark:text-gray-500">لا يوجد عملاء مطابقين</p>
          <button onClick={() => { setEditCustomer(null); setModalOpen(true); }} className="mt-4 px-6 py-3 bg-accent text-white rounded-2xl font-black hover:bg-accent/90 transition-all">إضافة أول عميل</button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          {filtered.map((customer, idx) => {
            const rating = customer.rating || 0;
            const circleColor = getCircleColor(rating);
            const circR = 18;
            const circC = 2 * Math.PI * circR;
            const circOff = circC - (rating / 100) * circC;
            const tags = parseTags(customer.tags);
            return (
            <motion.div
              key={customer.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => handleViewCustomer(customer)}
              className={`bg-white dark:bg-slate-900 rounded-[20px] p-3 border transition-all relative ${selectedIds.has(customer.id) ? 'ring-4 ring-blue-500/30 border-blue-500' : 'border-gray-100 dark:border-slate-800 hover:shadow-md'} cursor-pointer`}
            >
              {/* Top row: checkbox + name + badges + rating + actions */}
              <div className="flex items-start gap-3 mb-2">
                <div onClick={e => e.stopPropagation()} className="mt-1">
                  <button onClick={() => toggleSelect(customer.id)}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${selectedIds.has(customer.id) ? 'bg-blue-500 text-white' : 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-slate-700'}`}
                  >
                    {selectedIds.has(customer.id) ? <CheckSquare size={12} /> : <Square size={12} />}
                  </button>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent dark:text-accent shrink-0">
                  <UserCheck size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-gray-900 dark:text-white text-sm truncate">{customer.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {customer.source && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent/5 text-accent">
                        {customer.source}
                      </span>
                    )}
                    {customer.classification && (
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border ${CLASSIFICATION_STYLES[customer.classification] || ''}`}>
                        {customer.classification}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="w-9 h-9 relative flex items-center justify-center" title={`التقييم: ${rating}%`}>
                    <svg width="36" height="36" viewBox="0 0 44 44">
                      <circle cx="22" cy="22" r={circR} fill="none" stroke="#e5e7eb" strokeWidth="4" className="dark:stroke-slate-700" />
                      <circle
                        cx="22" cy="22" r={circR}
                        fill="none"
                        stroke={circleColor}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circC}
                        strokeDashoffset={circOff}
                        transform="rotate(-90 22 22)"
                        className="transition-all duration-700"
                      />
                    </svg>
                    <span className="absolute text-[8px] font-black" style={{ color: circleColor }}>{rating}</span>
                  </div>
                  <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditCustomer(customer); setModalOpen(true); }}
                      className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-all text-gray-400 hover:text-blue-500"
                      title="تعديل"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(customer); }}
                      className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-all text-gray-400 hover:text-red-500"
                      title="حذف"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 flex-wrap text-xs text-gray-500 dark:text-gray-400 font-bold">
                  <Phone size={12} className="shrink-0" />
                  <span dir="ltr" className="font-mono">{customer.phone}</span>
                  <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(customer.phone || ''); }} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-300 hover:text-blue-500 transition-all"><Copy size={10} /></button>
                  <a href={`https://wa.me/20${(customer.phone || '').replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-300 hover:text-emerald-500 transition-all"><FaWhatsapp size={10} /></a>
                  {customer.altPhone && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600 mx-0.5">·</span>
                      <span dir="ltr" className="font-mono">{customer.altPhone}</span>
                      <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(customer.altPhone || ''); }} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-300 hover:text-blue-500 transition-all"><Copy size={10} /></button>
                      <a href={`https://wa.me/20${(customer.altPhone || '').replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-300 hover:text-emerald-500 transition-all"><FaWhatsapp size={10} /></a>
                    </>
                  )}
                  {customer.city && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <MapPin size={12} className="shrink-0" />
                      <span>{customer.city}</span>
                    </>
                  )}
                </div>

                {customer.address && (
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 font-bold truncate">
                    <MapPin size={12} className="shrink-0" />
                    <span className="truncate">{customer.address}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 flex-wrap">
                  {(customer.map_url || customer.latitude || customer.longitude || customer.city || customer.address) && (
                    <div className="flex items-center gap-1 text-xs text-accent font-bold">
                      <Navigation size={12} className="shrink-0" />
                      <a
                        href={
                          customer.map_url
                            ? customer.map_url
                            : (customer.latitude && customer.longitude)
                            ? `https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`
                            : `https://www.google.com/maps?q=${encodeURIComponent(customer.city || customer.address || '')}`
                        }
                        target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="hover:underline truncate"
                      >
                        عرض على جوجل ماب
                      </a>
                    </div>
                  )}
                </div>

                {customer.admin_notes && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-bold truncate">
                    <FileText size={12} className="shrink-0" />
                    <span className="truncate">{customer.admin_notes}</span>
                  </div>
                )}

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {tags.map((t, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-accent/5 text-accent rounded-full text-[9px] font-black">{t}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs font-bold text-gray-400 dark:text-gray-500 mt-2 pt-2 border-t border-gray-50 dark:border-slate-800">
                <span className="flex items-center gap-1"><ShoppingBag size={13} /> {customer.total_orders || 0} طلب</span>
                <span className="opacity-40">|</span>
                <span className="flex items-center gap-1"><DollarSign size={13} /> {(customer.total_spent || 0).toLocaleString()} ج.م</span>
                {customer.last_order_date && (
                  <>
                    <span className="opacity-40">|</span>
                    <span className="flex items-center gap-1"><Calendar size={13} /> {formatDate(customer.last_order_date, 'date')}</span>
                  </>
                )}
              </div>
            </motion.div>
          );})}
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50">
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 p-3 flex items-center gap-3">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 px-2">{selectedIds.size} عميل</span>
            <button onClick={() => setShowExportSettings(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs hover:bg-indigo-700 transition-all">
              <Download size={14} /> تصدير
            </button>
            <button onClick={handleBulkDelete} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-black text-xs hover:bg-red-600 transition-all">
              <Trash2 size={14} /> حذف
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="p-2 bg-gray-100 dark:bg-slate-800 text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-all">
              <X size={16} />
            </button>
          </motion.div>
        </div>
      )}

      {/* Export Settings Modal */}
      <AnimatePresence>
        {showExportSettings && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowExportSettings(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-lg shadow-2xl border border-gray-100 dark:border-slate-800 p-6 z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black">تصدير العملاء</h3>
                <button onClick={() => setShowExportSettings(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700"><X size={16} /></button>
              </div>
              <div className="space-y-3 mb-6">
                <p className="text-xs font-bold text-gray-400">اختر الحقول المراد تصديرها:</p>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {EXPORT_COLUMNS.map(col => (
                    <label key={col.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer text-sm font-bold">
                      <input type="checkbox" checked={exportColumns.includes(col.id)} onChange={() => {
                        setExportColumns(prev => prev.includes(col.id) ? prev.filter(c => c !== col.id) : [...prev, col.id]);
                      }} className="w-4 h-4 rounded accent-accent" />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={handleExport} className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all text-sm" disabled={exportColumns.length === 0}>
                <Download size={16} className="inline ml-2" /> تصدير ({selectedIds.size > 0 ? `${selectedIds.size} محدد` : `${filtered.length} عميل`})
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CustomerModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditCustomer(null); }}
        onSave={handleSave}
        initialData={editCustomer ? {
          name: editCustomer.name,
          phone: editCustomer.phone,
          altPhone: editCustomer.alt_phone || '',
          email: editCustomer.email || '',
          address: editCustomer.address || '',
          city: editCustomer.city || '',
          source: editCustomer.source || '',
          tags: editCustomer.tags || '',
          notes: editCustomer.notes || '',
          adminNotes: editCustomer.admin_notes || '',
          mapUrl: editCustomer.map_url || '',
          latitude: editCustomer.latitude || '',
          longitude: editCustomer.longitude || '',
        } : undefined}
        title={editCustomer ? 'تعديل العميل' : 'إضافة عميل جديد'}
      />

      {viewCustomer && (
        <CustomerDetail
          customer={viewCustomer}
          orders={customerOrders}
          onClose={() => setViewCustomer(null)}
          onEdit={handleOpenEdit}
          onDelete={() => handleDelete(viewCustomer)}
          onViewOrder={(orderId) => {
            setViewCustomer(null);
            navigate(`/orders?viewOrder=${orderId}`);
          }}
        />
      )}
    </motion.div>
  );
}
