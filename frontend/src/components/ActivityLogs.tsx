import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronLeft, ChevronRight, ChevronDown, RotateCcw, Filter, X, Calendar, Activity, RefreshCw, Package, ShoppingBag, DollarSign, Users, Truck, Target, Settings, CreditCard, ArrowLeft, ArrowRight, ExternalLink, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUndoRedo } from '../contexts/UndoRedoContext';

import { API_BASE } from '../lib/api';

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  product: <Package size={18} />,
  order: <ShoppingBag size={18} />,
  expense: <DollarSign size={18} />,
  contact: <Users size={18} />,
  supplier: <Truck size={18} />,
  category: <Package size={18} />,
  target: <Target size={18} />,
  settings: <Settings size={18} />,
  purchase_invoice: <CreditCard size={18} />,
};

const ACTION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  create: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', label: 'إنشاء' },
  update: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'تحديث' },
  delete: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'حذف' },
  import: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', label: 'استيراد' },
};

const ENTITY_LABELS: Record<string, string> = {
  product: 'منتج',
  order: 'طلب',
  expense: 'مصروف',
  contact: 'جهة اتصال',
  supplier: 'مورد',
  category: 'قسم',
  target: 'هدف مالي',
  settings: 'إعدادات',
  purchase_invoice: 'فاتورة مشتريات',
  state: 'حالة النظام',
};

interface LogRow {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  metadata: string | null;
  created_at: string;
}

interface Filters {
  entity_type: string;
  action: string;
  search: string;
  startDate: string;
  endDate: string;
}

interface ActivityLogsProps {
  onRefresh?: () => void;
}

const ActivityLogs: React.FC<ActivityLogsProps> = ({ onRefresh }) => {
  const navigate = useNavigate();
  const { pushUndo, refreshKey } = useUndoRedo();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);
  const [modalLog, setModalLog] = useState<LogRow | null>(null);
  const [undoingId, setUndoingId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);
  const [filters, setFilters] = useState<Filters>({
    entity_type: '',
    action: '',
    search: '',
    startDate: '',
    endDate: '',
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      params.set('sortField', sortField);
      params.set('sortOrder', sortAsc ? 'asc' : 'desc');
      if (filters.entity_type) params.set('entity_type', filters.entity_type);
      if (filters.action) params.set('action', filters.action);
      if (filters.search) params.set('search', filters.search);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);

      const res = await fetch(`${API_BASE}/activity-logs?${params}`);
      const data = await res.json();
      setLogs(data.rows || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setLoading(false);
    }
  }, [offset, limit, filters, sortField, sortAsc]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { if (refreshKey > 0) fetchLogs(); }, [refreshKey, fetchLogs]);
  useEffect(() => { if (!notification) return; const t = setTimeout(() => setNotification(null), 3000); return () => clearTimeout(t); }, [notification]);

  useEffect(() => {
    if (!modalLog) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalLog(null); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalLog]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handleUndo = async (log: LogRow) => {
    setUndoingId(log.id);
    try {
      const res = await fetch(`${API_BASE}/activity-logs/${log.id}/undo`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        pushUndo(log.id);
        fetchLogs();
        onRefresh?.();
        setNotification({ message: `تم التراجع عن: ${log.description}`, type: 'success' });
      } else {
        setNotification({ message: data.error || 'فشل التراجع', type: 'error' });
      }
    } catch (err) {
      console.error('Undo failed:', err);
      setNotification({ message: 'فشل التراجع', type: 'error' });
    } finally {
      setUndoingId(null);
    }
  };

  const clearFilters = () => {
    setFilters({ entity_type: '', action: '', search: '', startDate: '', endDate: '' });
    setOffset(0);
  };

  const hasFilters = filters.entity_type || filters.action || filters.search || filters.startDate || filters.endDate;

  const getEntityIdentity = (log: LogRow): { label: string; value: string }[] => {
    let md: any = {};
    try { md = JSON.parse(log.metadata || '{}'); } catch {}
    const data = md.entityData || md.newState || md.previousState;
    if (!data) return [];
    switch (log.entity_type) {
      case 'order': return [
        { label: 'العميل', value: data.customerName || data.customer_name || '' },
        { label: 'رقم الطلب', value: log.entity_id || '' },
      ].filter(i => i.value);
      case 'product': return [{ label: 'المنتج', value: data.name || '' }].filter(i => i.value);
      case 'contact': return [{ label: 'جهة الاتصال', value: data.companyName || data.company_name || '' }].filter(i => i.value);
      case 'supplier': return [{ label: 'المورد', value: data.name || '' }].filter(i => i.value);
      case 'category': return [{ label: 'القسم', value: data.name || '' }].filter(i => i.value);
      case 'expense': return [
        { label: 'المبلغ', value: String(data.amount || '') },
        { label: 'الفئة', value: data.category || '' },
      ].filter(i => i.value);
      case 'target': return [{ label: 'الهدف', value: data.title || '' }].filter(i => i.value);
      case 'purchase_invoice': return [
        { label: 'رقم الفاتورة', value: data.invoiceNumber || data.invoice_number || '' },
        { label: 'المبلغ', value: String(data.totalAmount || data.total_amount || '') },
      ].filter(i => i.value);
      case 'settings': return [{ label: 'المفتاح', value: data.key || data.value || '' }].filter(i => i.value);
      default: return [];
    }
  };

  const getDisplayDescription = (log: LogRow): string => {
    const identity = getEntityIdentity(log);
    if (!identity.length) return log.description;
    const info = identity.map(i => i.value).join(' - ');
    if (log.description.includes(info)) return log.description;
    return `${log.description} (${info})`;
  };

  const getEntityRoute = (log: LogRow): string | null => {
    const { entity_type, entity_id } = log;
    if (!entity_id) return null;
    switch (entity_type) {
      case 'product': return `/?entityId=${encodeURIComponent(entity_id)}`;
      case 'order': return `/orders?entityId=${encodeURIComponent(entity_id)}`;
      case 'contact': return `/contacts?entityId=${encodeURIComponent(entity_id)}`;
      case 'supplier': case 'category': case 'purchase_invoice': return `/purchases?entityId=${encodeURIComponent(entity_id)}`;
      case 'expense': case 'target': return `/accounts?entityId=${encodeURIComponent(entity_id)}`;
      case 'settings': return `/settings`;
      default: return null;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  };

  const formatCurrency = (val: number) => {
    try { return val.toLocaleString('ar-EG') + ' ج.م'; } catch { return String(val); }
  };

  const val = (v: any): string => {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'boolean') return v ? 'نعم' : 'لا';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'object') return JSON.stringify(v).length > 80 ? JSON.stringify(v).substring(0, 80) + '…' : JSON.stringify(v);
    return String(v);
  };

  const computeDiff = (prev: any, next: any): { field: string; oldVal: string; newVal: string }[] => {
    if (!prev || !next) return [];
    const diffs: { field: string; oldVal: string; newVal: string }[] = [];
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
    for (const key of allKeys) {
      const pv = JSON.stringify(prev[key]);
      const nv = JSON.stringify(next[key]);
      if (pv !== nv) {
        diffs.push({ field: key, oldVal: val(prev[key]), newVal: val(next[key]) });
      }
    }
    return diffs;
  };

  const FIELD_LABELS: Record<string, string> = {
    name: 'الاسم', title: 'العنوان', amount: 'المبلغ', price: 'السعر', costPrice: 'تكلفة الشراء',
    wholesalePrice: 'سعر الجملة', packagingCost: 'تكلفة التغليف', category: 'القسم',
    quantity: 'الكمية', status: 'الحالة', customerName: 'اسم العميل', customerPhone: 'هاتف العميل',
    totalAmount: 'الإجمالي', totalCost: 'التكلفة', shippingCost: 'تكلفة الشحن',
    companyName: 'اسم الشركة', phone: 'الهاتف', phone2: 'هاتف 2', email: 'البريد',
    entityType: 'نوع الكيان', notes: 'ملاحظات', address: 'العنوان',
    specialization: 'التخصص', taxId: 'الرقم الضريبي',
    startDate: 'تاريخ البداية', deadline: 'تاريخ النهاية',
    description: 'الوصف', invoiceNumber: 'رقم الفاتورة', supplierId: 'المورد',
    paymentMethod: 'طريقة الدفع', date: 'التاريخ',
    parentId: 'القسم الأب', code: 'الكود',
    value: 'القيمة', key: 'المفتاح',
  };

  const renderField = (label: string, value: any, highlight = false) => (
    <div className={`${highlight ? 'bg-amber-50 dark:bg-amber-900/10 rounded-lg p-2 -mx-2' : ''}`}>
      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 block">{label}</span>
      <span className="text-sm font-bold text-gray-900 dark:text-white">{val(value)}</span>
    </div>
  );

  const renderDiffRow = (field: string, oldVal: string, newVal: string) => (
    <div key={field} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center py-1.5 border-b border-gray-100 dark:border-slate-700/50 last:border-0">
      <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{FIELD_LABELS[field] || field}</div>
      <div className="flex flex-col gap-1">
        <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
          <ArrowLeft size={12} /> {oldVal}
        </span>
        <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
          <ArrowRight size={12} /> {newVal}
        </span>
      </div>
    </div>
  );

  const renderProductDetail = (data: any) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {renderField('الاسم', data?.name)}
      {renderField('السعر', data?.price)}
      {renderField('تكلفة الشراء', data?.costPrice)}
      {renderField('القسم', data?.category)}
      {renderField('سعر الجملة', data?.wholesalePrice)}
      {renderField('تكلفة التغليف', data?.packagingCost)}
      {data?.variants && (
        <div className="col-span-2">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 block">المتغيرات ({data.variants.length})</span>
          <div className="mt-1 space-y-1">
            {data.variants.slice(0, 5).map((v: any, i: number) => (
              <div key={i} className="text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                {v.size} / {v.color} — {v.quantity} قطعة
              </div>
            ))}
            {data.variants.length > 5 && (
              <div className="text-xs text-gray-400">+{data.variants.length - 5} متغيرات أخرى</div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderOrderDetail = (data: any) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {renderField('العميل', data?.customerName)}
        {renderField('الهاتف', data?.customerPhone)}
        {renderField('الحالة', data?.status, true)}
        {renderField('الإجمالي', data?.totalAmount)}
        {renderField('تكلفة الشحن', data?.shippingCost)}
        {renderField('المدينة', data?.city)}
        {renderField('طريقة الدفع', data?.paymentMethod)}
        {renderField('كود الخصم', data?.coupon)}
      </div>
      {data?.items && data.items.length > 0 && (
        <div>
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 block">المنتجات ({data.items.length})</span>
          <div className="mt-1 space-y-1">
            {data.items.slice(0, 8).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                <span>{item.productName}</span>
                <span className="text-gray-400">{item.quantity} × {item.price}</span>
              </div>
            ))}
            {data.items.length > 8 && (
              <div className="text-xs text-gray-400">+{data.items.length - 8} منتجات أخرى</div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderExpenseDetail = (data: any) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {renderField('المبلغ', data?.amount)}
      {renderField('الفئة', data?.category)}
      {renderField('الوصف', data?.description)}
      {renderField('التاريخ', data?.created_at ? formatDate(data.created_at) : null)}
    </div>
  );

  const renderContactDetail = (data: any) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {renderField('اسم الشركة', data?.companyName || data?.company_name)}
      {renderField('الهاتف', data?.phone)}
      {renderField('هاتف 2', data?.phone2)}
      {renderField('نوع الكيان', data?.entityType || data?.entity_type)}
      {renderField('التخصص', data?.specialization)}
      {renderField('البريد', data?.email)}
      {renderField('الرقم الضريبي', data?.taxId || data?.tax_id)}
      {renderField('الحالة', data?.status)}
    </div>
  );

  const renderSupplierDetail = (data: any) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {renderField('الاسم', data?.name)}
      {renderField('الهاتف', data?.phone)}
      {renderField('هاتف 2', data?.phone2)}
    </div>
  );

  const renderCategoryDetail = (data: any) => (
    <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
      {renderField('الاسم', data?.name)}
      {renderField('القسم الأب', data?.parentId || data?.parentid)}
    </div>
  );

  const renderTargetDetail = (data: any) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {renderField('العنوان', data?.title)}
      {renderField('المبلغ', data?.amount)}
      {renderField('تاريخ البداية', data?.startDate || data?.start_date ? formatDate(data?.startDate || data?.start_date) : null)}
      {renderField('تاريخ النهاية', data?.deadline ? formatDate(data.deadline) : null)}
    </div>
  );

  const renderSettingsDetail = (data: any) => (
    <div className="grid grid-cols-2 gap-3">
      {renderField('المفتاح', data?.key)}
      {renderField('القيمة', typeof data?.value === 'object' ? JSON.stringify(data.value) : data?.value)}
    </div>
  );

  const renderInvoiceDetail = (data: any) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {renderField('رقم الفاتورة', data?.invoiceNumber || data?.invoice_number)}
      {renderField('المبلغ', data?.totalAmount || data?.total_amount)}
      {renderField('التاريخ', data?.date ? formatDate(data.date) : null)}
      {renderField('المورد', data?.supplierId || data?.supplier_id)}
    </div>
  );

  const renderEntityData = (data: any, entityType: string, isDiff: boolean): React.ReactNode => {
    if (!data) return <span className="text-gray-400 text-xs">لا توجد بيانات</span>;
    const entity = data;
    switch (entityType) {
      case 'product': return renderProductDetail(entity);
      case 'order': return renderOrderDetail(entity);
      case 'expense': return renderExpenseDetail(entity);
      case 'contact': return renderContactDetail(entity);
      case 'supplier': return renderSupplierDetail(entity);
      case 'category': return renderCategoryDetail(entity);
      case 'target': return renderTargetDetail(entity);
      case 'settings': return renderSettingsDetail(entity);
      case 'purchase_invoice': return renderInvoiceDetail(entity);
      default: return null;
    }
  };

  const renderDetail = (log: LogRow) => {
    let metadata: any = {};
    try { metadata = JSON.parse(log.metadata || '{}'); } catch {}

    const { action, entity_type } = log;
    const prevState = metadata.previousState;
    const newState = metadata.newState;
    const entityData = metadata.entityData;

    return (
      <div className="space-y-3">
        {/* Metadata info bar */}
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl">
          {ENTITY_ICONS[entity_type] || null}
          <span>{ENTITY_LABELS[entity_type] || entity_type}</span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span>المعرف: {log.entity_id || '—'}</span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span>رقم: {log.id}</span>
        </div>

        {/* Update — show diff */}
        {action === 'update' && prevState && newState && (() => {
          const isBulk = entity_type === 'order' || entity_type === 'product';
          if (isBulk && typeof Object.values(prevState)[0] === 'object') {
            // Bulk update with multiple items keyed by id
            const ids = Object.keys(prevState);
            return (
              <div className="space-y-3">
                {ids.map(id => {
                  const prev = prevState[id];
                  const next = newState[id];
                  const diffs = computeDiff(prev, next);
                  if (diffs.length === 0) return null;
                  return (
                    <div key={id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        {ENTITY_ICONS[entity_type]}
                        <span dir="ltr" className="font-mono">{id}</span>
                      </div>
                      <div className="p-3 space-y-1">
                        {diffs.map(d => renderDiffRow(d.field, d.oldVal, d.newVal))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }
          // Single entity update
          const diffs = computeDiff(prevState, newState);
          if (diffs.length > 0) {
            return (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/10 border-b border-gray-100 dark:border-slate-700 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <Activity size={14} /> تم تغيير {diffs.length} {diffs.length === 1 ? 'حقل' : 'حقول'}
                </div>
                <div className="p-3 space-y-1">
                  {diffs.map(d => renderDiffRow(d.field, d.oldVal, d.newVal))}
                </div>
              </div>
            );
          }
          // No diffs found — show current state
          return renderEntityData(newState, entity_type, false);
        })()}

        {/* Create — show entity data */}
        {action === 'create' && entityData && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3">
            {renderEntityData(entityData, entity_type, false)}
          </div>
        )}

        {/* Delete — show what was deleted */}
        {action === 'delete' && entityData && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900/30 p-3">
            <div className="text-[10px] font-bold text-red-500 mb-2 flex items-center gap-1">
              <Activity size={12} /> البيانات المحذوفة
            </div>
            {renderEntityData(entityData, entity_type, false)}
          </div>
        )}

        {/* Fallback: show raw metadata */}
        {!entityData && !prevState && !newState && log.metadata && (
          <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 p-3 rounded-xl overflow-auto max-h-48 leading-relaxed whitespace-pre-wrap font-mono">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  const LogDetailModal: React.FC<{ log: LogRow; onClose: () => void; onUndo: (log: LogRow) => void; undoingId: number | null }> = ({ log, onClose, onUndo, undoingId }) => {
    const isUndoing = undoingId === log.id;
    let md: any = {};
    try { md = JSON.parse(log.metadata || '{}'); } catch {}
    const { action, entity_type } = log;
    const prevState = md.previousState;
    const newState = md.newState;
    const entityData = md.entityData;
    const ac = ACTION_COLORS[log.action] || { bg: 'bg-gray-100 dark:bg-slate-800', text: 'text-gray-700 dark:text-gray-300', label: log.action };

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center p-2 md:p-6"
        onClick={onClose}>
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-slate-700/50">
          <button onClick={onClose} className="absolute top-4 left-4 z-10 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 transition-all">
            <X size={20} />
          </button>
          <div className="p-6 pb-4 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-3 py-1 rounded-lg text-xs font-black ${ac.bg} ${ac.text}`}>{ac.label}</span>
              <span className="px-3 py-1 rounded-lg text-xs font-black bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400">{ENTITY_LABELS[entity_type] || entity_type}</span>
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">#{log.id}</span>
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{getDisplayDescription(log)}</p>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
              <Activity size={12} /> {formatDate(log.created_at)}
              <span className="text-gray-300 dark:text-gray-600">|</span> المعرف: {log.entity_id || '—'}
            </p>
          </div>
          {(() => {
            const identity = getEntityIdentity(log);
            if (!identity.length) return null;
            return (
              <div className="px-6 pt-4 pb-1 border-b border-gray-100 dark:border-slate-800">
                <div className="flex flex-wrap gap-2">
                  {identity.map((i, idx) =>
                    i.value ? (
                      <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                        <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400">{i.label}:</span>
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{i.value}</span>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            );
          })()}
          <div className="p-6 space-y-5">
            {action === 'update' && prevState && newState && (() => {
              const isBulk = entity_type === 'order' || entity_type === 'product';
              if (isBulk && typeof Object.values(prevState)[0] === 'object') {
                const ids = Object.keys(prevState);
                return (
                  <div className="space-y-3">
                    {ids.map(id => {
                      const prev = prevState[id];
                      const next = newState[id];
                      const diffs = computeDiff(prev, next);
                      if (diffs.length === 0) return null;
                      return (
                        <div key={id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                          <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-2">
                            {ENTITY_ICONS[entity_type] || null}
                            <span dir="ltr" className="font-mono">{id}</span>
                          </div>
                          <div className="p-4 space-y-1">{diffs.map(d => renderDiffRow(d.field, d.oldVal, d.newVal))}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              const diffs = computeDiff(prevState, newState);
              if (diffs.length > 0) {
                return (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-900/10 border-b border-gray-100 dark:border-slate-700 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <Activity size={14} /> تم تغيير {diffs.length} {diffs.length === 1 ? 'حقل' : 'حقول'}
                    </div>
                    <div className="p-4 space-y-1">{diffs.map(d => renderDiffRow(d.field, d.oldVal, d.newVal))}</div>
                  </div>
                );
              }
              return null;
            })()}
            {entityData && (
              <div>
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-2">
                  <ExternalLink size={14} /> {action === 'delete' ? 'البيانات المحذوفة' : 'البيانات الكاملة'}
                </h3>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-4">{renderEntityData(entityData, entity_type, false)}</div>
                </div>
              </div>
            )}
            {!entityData && !prevState && !newState && log.metadata && (
              <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl overflow-auto max-h-48 leading-relaxed whitespace-pre-wrap font-mono">{JSON.stringify(md, null, 2)}</pre>
            )}
          </div>
          <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <button onClick={() => { const r = getEntityRoute(log); if (r) { onClose(); navigate(r); } }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all font-bold text-sm">
              <ExternalLink size={16} />
              فتح
            </button>
            <button onClick={() => { onUndo(log); onClose(); }} disabled={isUndoing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 disabled:opacity-50 transition-all font-bold text-sm">
              <RotateCcw size={16} className={isUndoing ? 'animate-spin' : ''} />
              تراجع عن هذا الإجراء
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast notification */}
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-xl shadow-2xl border font-bold text-sm flex items-center gap-2 ${
              notification.type === 'success'
                ? 'bg-emerald-500 text-white border-emerald-600'
                : 'bg-red-500 text-white border-red-600'
            }`}>
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
            <Activity size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">سجل النشاطات</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              إجمالي {total} نشاط
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative">
            <select value={sortField} onChange={e => { setSortField(e.target.value); setOffset(0); }} className="px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none font-black text-xs text-gray-700 dark:text-gray-200 focus:border-accent shadow-sm cursor-pointer appearance-none">
              <option value="created_at">التاريخ</option>
              <option value="entity_type">نوع الكيان</option>
              <option value="action">الإجراء</option>
            </select>
            <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
          </div>
          <button onClick={() => { setSortAsc(p => !p); setOffset(0); }} className={`px-3 py-3 rounded-xl flex items-center gap-1.5 font-black text-xs transition-all ${sortAsc ? 'bg-accent text-white' : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700'}`} title={sortAsc ? 'تصاعدي' : 'تنازلي'}>
            <ArrowUpDown size={14} /> {sortAsc ? '▲' : '▼'}
          </button>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-xl border transition-all ${showFilters ? 'bg-accent text-white border-accent' : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
            <Filter size={20} />
          </button>
          <button onClick={fetchLogs}
            className="p-3 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-bold text-sm">
              <X size={16} /> مسح الفلترة
            </button>
          )}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: showFilters ? 1 : 0, height: showFilters ? 'auto' : 0 }}
        className="overflow-hidden">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">نوع الكيان</label>
              <select value={filters.entity_type} onChange={e => { setFilters(f => ({ ...f, entity_type: e.target.value })); setOffset(0); }}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-900 dark:text-white">
                <option value="">الكل</option>
                {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">نوع الإجراء</label>
              <select value={filters.action} onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); setOffset(0); }}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-900 dark:text-white">
                <option value="">الكل</option>
                <option value="create">إنشاء</option>
                <option value="update">تحديث</option>
                <option value="delete">حذف</option>
                <option value="import">استيراد</option>
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">بحث في الوصف</label>
              <div className="relative">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setOffset(0); }}
                  placeholder="ابحث..."
                  className="w-full p-2.5 pr-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-900 dark:text-white" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">من تاريخ</label>
                <div className="relative">
                  <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="date" value={filters.startDate} onChange={e => { setFilters(f => ({ ...f, startDate: e.target.value })); setOffset(0); }}
                    className="w-full p-2.5 pr-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-900 dark:text-white" />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">إلى تاريخ</label>
                <div className="relative">
                  <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="date" value={filters.endDate} onChange={e => { setFilters(f => ({ ...f, endDate: e.target.value })); setOffset(0); }}
                    className="w-full p-2.5 pr-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-900 dark:text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-sm font-bold text-gray-400">جاري تحميل السجل...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Activity size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-lg font-bold text-gray-400 dark:text-gray-500">لا توجد نشاطات</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">لم يتم تسجيل أي نشاط بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {logs.map((log) => {
              const actionColor = ACTION_COLORS[log.action] || { bg: 'bg-gray-100 dark:bg-slate-800', text: 'text-gray-700 dark:text-gray-300', label: log.action };
              return (
                <div key={log.id}>
                  <div onClick={() => setModalLog(log)}
                    className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">

                    <span className={`px-3 py-1 rounded-lg text-xs font-black ${actionColor.bg} ${actionColor.text} min-w-[60px] text-center`}>
                      {actionColor.label}
                    </span>

                    <span className="px-3 py-1 rounded-lg text-xs font-black bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 min-w-[80px] text-center">
                      {ENTITY_LABELS[log.entity_type] || log.entity_type}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="shrink-0 text-gray-400">{ENTITY_ICONS[log.entity_type]}</span>
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{getDisplayDescription(log)}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(log.created_at)}</p>
                    </div>

                    <button onClick={e => { e.stopPropagation(); handleUndo(log); }} disabled={undoingId === log.id}
                      className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-400 hover:text-amber-500 hover:border-amber-300 dark:hover:border-amber-700 disabled:opacity-50 transition-all">
                      <RotateCcw size={16} className={undoingId === log.id ? 'animate-spin' : ''} />
                    </button>

                    <ChevronDown size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
            <p className="text-xs font-bold text-gray-400">
              صفحة {currentPage} من {totalPages}
            </p>
            <div className="flex gap-2">
              <button disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - limit))}
                className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 disabled:opacity-30 text-gray-500 hover:bg-white dark:hover:bg-slate-800 transition-all">
                <ChevronRight size={18} />
              </button>
              <button disabled={offset + limit >= total} onClick={() => setOffset(o => o + limit)}
                className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 disabled:opacity-30 text-gray-500 hover:bg-white dark:hover:bg-slate-800 transition-all">
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Log Detail Modal */}
      <AnimatePresence>
        {modalLog && <LogDetailModal log={modalLog} onClose={() => setModalLog(null)} onUndo={handleUndo} undoingId={undoingId} />}
      </AnimatePresence>
    </div>
  );
};

export default ActivityLogs;
