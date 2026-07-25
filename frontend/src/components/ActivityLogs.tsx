import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronLeft, ChevronRight, ChevronDown, RotateCcw, Filter, X, Calendar, Activity, RefreshCw, Package, ShoppingBag, DollarSign, Users, Truck, Target, Settings, CreditCard, ArrowLeft, ArrowRight, ExternalLink, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUndoRedo } from '../contexts/UndoRedoContext';

import { API_BASE } from '../lib/api';
import { MD3Button, MD3IconButton, MD3EmptyState, MD3Dialog, MD3Snackbar, useSnackbar } from './md3';

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
  const [viewingLog, setViewingLog] = useState<LogRow | null>(null);
  const [undoingId, setUndoingId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);
  const { messages: snackMessages, show: showSnack, dismiss: dismissSnack } = useSnackbar();
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
        showSnack(`تم التراجع عن: ${log.description}`, { type: 'success' });
      } else {
        setNotification({ message: data.error || 'فشل التراجع', type: 'error' });
        showSnack(data.error || 'فشل التراجع', { type: 'error' });
      }
    } catch (err) {
      console.error('Undo failed:', err);
      setNotification({ message: 'فشل التراجع', type: 'error' });
      showSnack('فشل التراجع', { type: 'error' });
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
      <span className="text-[10px] font-bold text-[var(--md-sys-color-on-surface-variant)] block">{label}</span>
      <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">{val(value)}</span>
    </div>
  );

  const renderDiffRow = (field: string, oldVal: string, newVal: string) => (
    <div key={field} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center py-1.5 border-b border-[var(--md-sys-color-outline-variant)]/20 last:border-0">
      <div className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)]">{FIELD_LABELS[field] || field}</div>
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
          <span className="text-[10px] font-bold text-[var(--md-sys-color-on-surface-variant)] block">المتغيرات ({data.variants.length})</span>
          <div className="mt-1 space-y-1">
            {data.variants.slice(0, 5).map((v: any, i: number) => (
              <div key={i} className="text-xs font-bold text-[var(--md-sys-color-on-surface)] bg-[var(--md-sys-color-surface-container)] px-2 py-1 rounded-lg">
                {v.size} / {v.color} — {v.quantity} قطعة
              </div>
            ))}
            {data.variants.length > 5 && (
              <div className="text-xs text-[var(--md-sys-color-on-surface-variant)]">+{data.variants.length - 5} متغيرات أخرى</div>
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
          <span className="text-[10px] font-bold text-[var(--md-sys-color-on-surface-variant)] block">المنتجات ({data.items.length})</span>
          <div className="mt-1 space-y-1">
            {data.items.slice(0, 8).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs font-bold text-[var(--md-sys-color-on-surface)] bg-[var(--md-sys-color-surface-container)] px-3 py-1.5 rounded-lg">
                <span>{item.productName}</span>
                <span className="text-[var(--md-sys-color-on-surface-variant)]">{item.quantity} × {item.price}</span>
              </div>
            ))}
            {data.items.length > 8 && (
              <div className="text-xs text-[var(--md-sys-color-on-surface-variant)]">+{data.items.length - 8} منتجات أخرى</div>
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
    if (!data) return <span className="text-[var(--md-sys-color-on-surface-variant)] text-xs">لا توجد بيانات</span>;
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
        <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--md-sys-color-on-surface-variant)] bg-[var(--md-sys-color-surface-container)] px-3 py-2 rounded-xl">
          {ENTITY_ICONS[entity_type] || null}
          <span>{ENTITY_LABELS[entity_type] || entity_type}</span>
          <span className="text-[var(--md-sys-color-outline)]">|</span>
          <span>المعرف: {log.entity_id || '—'}</span>
          <span className="text-[var(--md-sys-color-outline)]">|</span>
          <span>رقم: {log.id}</span>
        </div>

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
                    <div key={id} className="bg-[var(--md-sys-color-surface-container)] rounded-xl border border-[var(--md-sys-color-outline-variant)]/20 overflow-hidden">
                      <div className="px-3 py-2 bg-[var(--md-sys-color-surface-container)] border-b border-[var(--md-sys-color-outline-variant)]/20 text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] flex items-center gap-2">
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
          const diffs = computeDiff(prevState, newState);
          if (diffs.length > 0) {
            return (
              <div className="bg-[var(--md-sys-color-surface-container)] rounded-xl border border-[var(--md-sys-color-outline-variant)]/20 overflow-hidden">
                <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/10 border-b border-[var(--md-sys-color-outline-variant)]/20 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <Activity size={14} /> تم تغيير {diffs.length} {diffs.length === 1 ? 'حقل' : 'حقول'}
                </div>
                <div className="p-3 space-y-1">
                  {diffs.map(d => renderDiffRow(d.field, d.oldVal, d.newVal))}
                </div>
              </div>
            );
          }
          return renderEntityData(newState, entity_type, false);
        })()}

        {action === 'create' && entityData && (
          <div className="bg-[var(--md-sys-color-surface-container)] rounded-xl border border-[var(--md-sys-color-outline-variant)]/20 p-3">
            {renderEntityData(entityData, entity_type, false)}
          </div>
        )}

        {action === 'delete' && entityData && (
          <div className="bg-[var(--md-sys-color-surface-container)] rounded-xl border border-red-200 dark:border-red-900/30 p-3">
            <div className="text-[10px] font-bold text-red-500 mb-2 flex items-center gap-1">
              <Activity size={12} /> البيانات المحذوفة
            </div>
            {renderEntityData(entityData, entity_type, false)}
          </div>
        )}

        {!entityData && !prevState && !newState && log.metadata && (
          <pre className="text-xs text-[var(--md-sys-color-on-surface-variant)] bg-[var(--md-sys-color-surface-container)] p-3 rounded-xl overflow-auto max-h-48 leading-relaxed whitespace-pre-wrap font-mono">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* MD3 Snackbar */}
      <MD3Snackbar messages={snackMessages} onDismiss={dismissSnack} />
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl shadow-lg" style={{ backgroundColor: 'var(--md-sys-color-tertiary-container)', color: 'var(--md-sys-color-on-tertiary-container)' }}>
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--md-sys-color-on-surface)]">سجل النشاطات</h1>
            <p className="text-sm text-[var(--md-sys-color-on-surface-variant)] font-medium">
              إجمالي {total} نشاط
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative">
            <select value={sortField} onChange={e => { setSortField(e.target.value); setOffset(0); }} className="px-4 py-3 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-xl outline-none font-black text-xs text-[var(--md-sys-color-on-surface)] focus:border-accent shadow-sm cursor-pointer appearance-none">
              <option value="created_at">التاريخ</option>
              <option value="entity_type">نوع الكيان</option>
              <option value="action">الإجراء</option>
            </select>
            <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)] pointer-events-none" size={12} />
          </div>
          <MD3IconButton icon={<ArrowUpDown size={14} />} onClick={() => { setSortAsc(p => !p); setOffset(0); }} variant={sortAsc ? 'filled' : 'standard'} title={sortAsc ? 'تصاعدي' : 'تنازلي'} />
          <MD3IconButton icon={<Filter size={20} />} onClick={() => setShowFilters(!showFilters)} variant={showFilters ? 'filled' : 'standard'} title="الفلاتر" />
          <MD3IconButton icon={<RefreshCw size={20} className={loading ? 'animate-spin' : ''} />} onClick={fetchLogs} title="تحديث" />
          {hasFilters && (
            <MD3Button variant="outlined" size="small" icon={<X size={16} />} onClick={clearFilters}>
              مسح الفلترة
            </MD3Button>
          )}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: showFilters ? 1 : 0, height: showFilters ? 'auto' : 0 }}
        className="overflow-hidden">
        <div className="bg-[var(--md-sys-color-surface)] rounded-2xl border border-[var(--md-sys-color-outline-variant)]/20 p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] mb-1.5">نوع الكيان</label>
              <select value={filters.entity_type} onChange={e => { setFilters(f => ({ ...f, entity_type: e.target.value })); setOffset(0); }}
                className="w-full p-2.5 rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 text-sm font-medium text-[var(--md-sys-color-on-surface)]">
                <option value="">الكل</option>
                {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] mb-1.5">نوع الإجراء</label>
              <select value={filters.action} onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); setOffset(0); }}
                className="w-full p-2.5 rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 text-sm font-medium text-[var(--md-sys-color-on-surface)]">
                <option value="">الكل</option>
                <option value="create">إنشاء</option>
                <option value="update">تحديث</option>
                <option value="delete">حذف</option>
                <option value="import">استيراد</option>
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] mb-1.5">بحث في الوصف</label>
              <div className="relative">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]" />
                <input type="text" value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setOffset(0); }}
                  placeholder="ابحث..."
                  className="w-full p-2.5 pr-9 rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 text-sm font-medium text-[var(--md-sys-color-on-surface)]" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] mb-1.5">من تاريخ</label>
                <div className="relative">
                  <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]" />
                  <input type="date" value={filters.startDate} onChange={e => { setFilters(f => ({ ...f, startDate: e.target.value })); setOffset(0); }}
                    className="w-full p-2.5 pr-9 rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 text-sm font-medium text-[var(--md-sys-color-on-surface)]" />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] mb-1.5">إلى تاريخ</label>
                <div className="relative">
                  <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]" />
                  <input type="date" value={filters.endDate} onChange={e => { setFilters(f => ({ ...f, endDate: e.target.value })); setOffset(0); }}
                    className="w-full p-2.5 pr-9 rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 text-sm font-medium text-[var(--md-sys-color-on-surface)]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--md-sys-color-surface)] rounded-2xl border border-[var(--md-sys-color-outline-variant)]/20 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-sm font-bold text-[var(--md-sys-color-on-surface-variant)]">جاري تحميل السجل...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Activity size={40} className="mx-auto text-[var(--md-sys-color-outline)] mb-4" />
            <p className="text-lg font-bold text-[var(--md-sys-color-on-surface-variant)]">لا توجد نشاطات</p>
            <p className="text-sm text-[var(--md-sys-color-on-surface-variant)] mt-1">لم يتم تسجيل أي نشاط بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--md-sys-color-outline-variant)]/20">
            {logs.map((log) => {
              const actionColor = ACTION_COLORS[log.action] || { bg: 'bg-[var(--md-sys-color-surface-container)]', text: 'text-[var(--md-sys-color-on-surface-variant)]', label: log.action };
              return (
                <div key={log.id}>
                  <div onClick={() => setViewingLog(log)}
                    className="flex items-center gap-3 p-4 hover:bg-[var(--md-sys-color-surface-container)] transition-colors cursor-pointer">

                    <span className={`px-3 py-1 rounded-lg text-xs font-black ${actionColor.bg} ${actionColor.text} min-w-[60px] text-center`}>
                      {actionColor.label}
                    </span>

                    <span className="px-3 py-1 rounded-lg text-xs font-black bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface-variant)] min-w-[80px] text-center">
                      {ENTITY_LABELS[log.entity_type] || log.entity_type}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="shrink-0 text-[var(--md-sys-color-on-surface-variant)]">{ENTITY_ICONS[log.entity_type]}</span>
                        <p className="text-sm font-bold text-[var(--md-sys-color-on-surface)] truncate">{getDisplayDescription(log)}</p>
                      </div>
                      <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">{formatDate(log.created_at)}</p>
                    </div>

                    <MD3IconButton icon={<RotateCcw size={16} className={undoingId === log.id ? 'animate-spin' : ''} />} onClick={(e) => { e.stopPropagation(); handleUndo(log); }} disabled={undoingId === log.id} title="تراجع" />

                    <ChevronDown size={16} className="text-[var(--md-sys-color-outline)] shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[var(--md-sys-color-outline-variant)]/20 bg-[var(--md-sys-color-surface-container)]">
            <p className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)]">
              صفحة {currentPage} من {totalPages}
            </p>
            <div className="flex gap-2">
              <MD3IconButton icon={<ChevronRight size={18} />} onClick={() => setOffset(o => Math.max(0, o - limit))} disabled={offset === 0} title="السابق" />
              <MD3IconButton icon={<ChevronLeft size={18} />} onClick={() => setOffset(o => o + limit)} disabled={offset + limit >= total} title="التالي" />
            </div>
          </div>
        )}
      </motion.div>

      {/* Log Detail Modal */}
      <MD3Dialog
        isOpen={!!viewingLog}
        onClose={() => setViewingLog(null)}
        title="تفاصيل النشاط"
        icon={<span className="material-symbols-rounded" style={{ fontSize: 24 }}>history</span>}
        maxWidth="lg"
        actions={viewingLog ? [
          {
            label: 'فتح',
            variant: 'text' as const,
            icon: <ExternalLink size={16} />,
            onClick: () => {
              const r = getEntityRoute(viewingLog);
              if (r) navigate(r);
            },
          },
          {
            label: 'تراجع عن هذا الإجراء',
            variant: 'tonal' as const,
            icon: <RotateCcw size={16} className={undoingId === viewingLog?.id ? 'animate-spin' : ''} />,
            onClick: () => { if (viewingLog) handleUndo(viewingLog); },
          },
        ] : undefined}
      >
        {viewingLog && (() => {
          const log = viewingLog;
          let md: any = {};
          try { md = JSON.parse(log.metadata || '{}'); } catch {}
          const { action, entity_type } = log;
          const prevState = md.previousState;
          const newState = md.newState;
          const entityData = md.entityData;
          const ac = ACTION_COLORS[log.action] || { bg: 'bg-[var(--md-sys-color-surface-container)]', text: 'text-[var(--md-sys-color-on-surface-variant)]', label: log.action };

          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded-lg text-xs font-black ${ac.bg} ${ac.text}`}>{ac.label}</span>
                <span className="px-3 py-1 rounded-lg text-xs font-black bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface-variant)]">{ENTITY_LABELS[entity_type] || entity_type}</span>
                <span className="text-[10px] font-bold text-[var(--md-sys-color-on-surface-variant)]">#{log.id}</span>
              </div>

              <p className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">{getDisplayDescription(log)}</p>

              <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] flex items-center gap-1.5">
                <Activity size={12} /> {formatDate(log.created_at)}
                <span className="text-[var(--md-sys-color-outline)]">|</span> المعرف: {log.entity_id || '—'}
              </p>

              {(() => {
                const identity = getEntityIdentity(log);
                if (!identity.length) return null;
                return (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--md-sys-color-outline-variant)]/20">
                    {identity.map((i, idx) =>
                      i.value ? (
                        <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--md-sys-color-secondary-container)] border border-[var(--md-sys-color-outline-variant)]/20">
                          <span className="text-[10px] font-bold text-[var(--md-sys-color-on-secondary-container)]">{i.label}:</span>
                          <span className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">{i.value}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                );
              })()}

              <div className="space-y-5">
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
                            <div key={id} className="bg-[var(--md-sys-color-surface-container)] rounded-2xl border border-[var(--md-sys-color-outline-variant)]/20 overflow-hidden">
                              <div className="px-4 py-2.5 bg-[var(--md-sys-color-surface-container)] border-b border-[var(--md-sys-color-outline-variant)]/20 text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] flex items-center gap-2">
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
                      <div className="bg-[var(--md-sys-color-surface-container)] rounded-2xl border border-[var(--md-sys-color-outline-variant)]/20 overflow-hidden">
                        <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-900/10 border-b border-[var(--md-sys-color-outline-variant)]/20 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
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
                    <h3 className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] mb-3 flex items-center gap-2">
                      <ExternalLink size={14} /> {action === 'delete' ? 'البيانات المحذوفة' : 'البيانات الكاملة'}
                    </h3>
                    <div className="bg-[var(--md-sys-color-surface-container)] rounded-2xl border border-[var(--md-sys-color-outline-variant)]/20 overflow-hidden">
                      <div className="p-4">{renderEntityData(entityData, entity_type, false)}</div>
                    </div>
                  </div>
                )}
                {!entityData && !prevState && !newState && log.metadata && (
                  <pre className="text-xs text-[var(--md-sys-color-on-surface-variant)] bg-[var(--md-sys-color-surface-container)] p-4 rounded-2xl overflow-auto max-h-48 leading-relaxed whitespace-pre-wrap font-mono">{JSON.stringify(md, null, 2)}</pre>
                )}
              </div>
            </div>
          );
        })()}
      </MD3Dialog>
    </div>
  );
};

export default React.memo(ActivityLogs);
