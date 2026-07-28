import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings, ArrowRightLeft, ShoppingBag, Clock, Check, X, AlertCircle,
  Upload, Download, RefreshCw, Eye, EyeOff, Search, Trash2,
  Plus, Package, ExternalLink, FileText, Loader2, Zap, Sparkles, ClipboardCopy
} from 'lucide-react';
import { AppState, Order, Product, EasyOrdersConfig, SyncLogEntry } from '../types';

import { API_BASE } from '../lib/api';
import { MD3Snackbar, useSnackbar } from './md3';

interface EasyOrdersPanelProps {
  state: AppState;
  onUpdateState: (update: Partial<AppState>) => void;
}

type TabKey = 'settings' | 'export' | 'staging' | 'categories' | 'logs';

const CategorySyncTab: React.FC<{ apiBase: string; showNotification: (msg: string, type: 'success' | 'error') => void; onUpdateState: (update: Partial<AppState>) => void }> = ({ apiBase, showNotification, onUpdateState }) => {
  const [easyCategories, setEasyCategories] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);

  const fetchCategories = async () => {
    try {
      const r = await fetch(`${apiBase}/easy-orders/categories`);
      const d = await r.json();
      if (d.success) {
        const cats = Array.isArray(d.categories) ? d.categories : (d.categories?.data || []);
        setEasyCategories(cats);
      }
    } catch {}
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await fetch(`${apiBase}/easy-orders/categories/sync`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'easy-to-erp' })
      });
      const d = await r.json();
      if (d.success) {
        const successCount = d.results.filter((r: any) => r.status !== 'failed').length;
        const deletedCount = d.results.filter((r: any) => r.status === 'deleted').length;
        let msg = `تمت مزامنة ${successCount} تصنيف من المتجر`;
        if (deletedCount > 0) msg += ` — تم حذف ${deletedCount} قسم غير موجود في المتجر`;
        showNotification(msg, 'success');
        const catRes = await fetch(`${apiBase}/categories`);
        const catData = await catRes.json();
        if (Array.isArray(catData)) {
          onUpdateState({ categories: catData });
        }
        fetchCategories();
      } else showNotification(d.error || 'فشلت المزامنة', 'error');
    } catch { showNotification('خطأ في الاتصال', 'error'); }
    setSyncing(false);
  };

  return (
    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 space-y-6">
        <h2 className="text-xl font-black flex items-center gap-2"><Package size={20} /> مزامنة التصنيفات</h2>

        <p className="text-xs text-gray-500 font-bold">يتم سحب جميع التصنيفات من المتجر مع الحقول (الاسم، الرابط، الصورة، الهيدر، الأولوية، الإخفاء) وحذف أي قسم في النظام غير موجود في المتجر.</p>

        <div className="space-y-2">
          <h3 className="text-sm font-black text-gray-600">التصنيفات في المتجر ({easyCategories.length})</h3>
          {easyCategories.length === 0 ? (
            <p className="text-xs text-gray-400 italic">لا توجد تصنيفات في المتجر بعد</p>
          ) : (
            <div className="space-y-1">
              {easyCategories.map((cat: any) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${cat.parent_id ? 'mr-6 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'}`}>{cat.name}</span>
                  {cat.show_in_header && <span className="text-[9px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-bold">هيدر</span>}
                  {cat.hidden && <span className="text-[9px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full font-bold">مخفي</span>}
                  {cat.children && cat.children.length > 0 && <span className="text-[9px] text-gray-400">{cat.children.length} فرعي</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={handleSync} disabled={syncing}
          className="w-full py-4 bg-accent text-white font-black rounded-2xl shadow-lg disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2">
          {syncing ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
          {syncing ? 'جاري المزامنة...' : 'سحب التصنيفات من المتجر'}
        </button>
      </div>
    </motion.div>
  );
};

const EasyOrdersPanel: React.FC<EasyOrdersPanelProps> = ({ state, onUpdateState }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('settings');
  const { messages: snackMessages, show: showSnack, dismiss: dismissSnack } = useSnackbar();

  // Settings state
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [imgbbKey, setImgbBKey] = useState('');
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [autoSyncProducts, setAutoSyncProducts] = useState(false);
  const [autoSyncOrders, setAutoSyncOrders] = useState(true);
  const [trackStock, setTrackStock] = useState(true);
  const [salePricePercent, setSalePricePercent] = useState(85);
  const [testingConnection, setTestingConnection] = useState(false);

  // Export state
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [exportPreview, setExportPreview] = useState<any[] | null>(null);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [productsStatus, setProductsStatus] = useState<any[]>([]);
  const [exportFilter, setExportFilter] = useState<'all' | 'exported' | 'not_exported'>('all');

  // Staging state
  const [stagingOrders, setStagingOrders] = useState<any[]>([]);
  const [stagingLoading, setStagingLoading] = useState(false);
  const [selectedStaging, setSelectedStaging] = useState<string[]>([]);
  const [expandedStaging, setExpandedStaging] = useState<string | null>(null);

  // Polling state
  const [polling, setPolling] = useState(false);
  const [pollResult, setPollResult] = useState<{ imported: number; skipped: number } | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval>>(undefined);

  // Logs state
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({ pendingOrders: 0, exportedProducts: 0, lastPoll: '', enabled: false, apiKeySet: false });

  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    showSnack(message, { type });
  }, [showSnack]);

  const saveField = useCallback(async (overrides: Record<string, any>) => {
    const config: Record<string, any> = {
      apiKey, enabled, imgbbApiKey: imgbbKey, autoConfirm,
      autoSyncProducts, autoSyncOrders,
      createdAt: '', updatedAt: new Date().toISOString()
    };
    Object.assign(config, overrides);
    const defaults: Record<string, any> = { trackStock, disableOrdersNoStock: false, enableReviews: true, salePricePercent };
    if ('trackStock' in overrides) defaults.trackStock = overrides.trackStock;
    if ('salePricePercent' in overrides) defaults.salePricePercent = overrides.salePricePercent;
    try {
      const r = await fetch(`${API_BASE}/easy-orders/config`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, defaults })
      });
      const d = await r.json();
      if (d.success) fetchStats();
    } catch {}
  }, [apiKey, enabled, imgbbKey, autoConfirm, autoSyncProducts, autoSyncOrders, trackStock, salePricePercent]);

  // Load config
  useEffect(() => {
    fetch(`${API_BASE}/easy-orders/config`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const c = d.config || {};
          setApiKey(c.apiKey || '');
          setEnabled(!!c.enabled);
          setImgbBKey(c.imgbbApiKey || '');
          setAutoConfirm(!!c.autoConfirm);
          setAutoSyncProducts(!!c.autoSyncProducts);
          setAutoSyncOrders(c.autoSyncOrders !== false);
          const de = d.defaults || {};
          setTrackStock(de.trackStock !== false);
          setSalePricePercent(de.salePricePercent || 85);
        }
      })
      .catch(() => {});
    fetchStats();
    fetch(`${API_BASE}/easy-orders/sync-logs?limit=20`).then(r => r.json()).then(d => { if (d.success) setSyncLogs(d.logs); }).catch(() => {});
  }, []);

  const fetchStats = () => {
    fetch(`${API_BASE}/easy-orders/stats`).then(r => r.json()).then(d => { if (d.success) setStats(d.stats); }).catch(() => {});
  };

  const fetchProductsStatus = async () => {
    try {
      const r = await fetch(`${API_BASE}/easy-orders/products-status`);
      const d = await r.json();
      if (d.success) setProductsStatus(d.products || []);
    } catch {}
  };

  const fetchStaging = async () => {
    setStagingLoading(true);
    try {
      const r = await fetch(`${API_BASE}/easy-orders/staging`);
      const d = await r.json();
      if (d.success) setStagingOrders(d.orders || []);
    } catch {}
    setStagingLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'staging') fetchStaging();
    if (activeTab === 'export') fetchProductsStatus();
    if (activeTab === 'logs') {
      setLogsLoading(true);
      fetch(`${API_BASE}/easy-orders/sync-logs?limit=50`).then(r => r.json()).then(d => { if (d.success) setSyncLogs(d.logs); setLogsLoading(false); }).catch(() => setLogsLoading(false));
    }
  }, [activeTab]);

  const handleSaveConfig = async () => {
    const config = { apiKey, enabled, imgbbApiKey: imgbbKey, autoConfirm, createdAt: '', updatedAt: new Date().toISOString() };
    const defaults = { trackStock, disableOrdersNoStock: false, enableReviews: true, salePricePercent };
    try {
      const r = await fetch(`${API_BASE}/easy-orders/config`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, defaults })
      });
      const d = await r.json();
      if (d.success) {
        showNotification('تم حفظ الإعدادات بنجاح', 'success');
        fetchStats();
      } else showNotification(d.error || 'فشل الحفظ', 'error');
    } catch { showNotification('خطأ في الاتصال', 'error'); }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      await handleSaveConfig();
      const r = await fetch(`${API_BASE}/easy-orders/test-connection`, { method: 'POST' });
      const d = await r.json();
      if (d.success) showNotification(d.message, 'success');
      else showNotification(d.error || 'فشل الاتصال', 'error');
    } catch { showNotification('خطأ في الاتصال', 'error'); }
    setTestingConnection(false);
  };

  const handleSearchProducts = () => {
    let filtered = state.products;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.name?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) || (p.categories || []).some(c => c.toLowerCase().includes(q)));
    }
    if (exportFilter !== 'all') {
      const exportedIds = new Set(productsStatus.filter(p => p.exported).map(p => p.id));
      if (exportFilter === 'exported') filtered = filtered.filter(p => exportedIds.has(p.id));
      if (exportFilter === 'not_exported') filtered = filtered.filter(p => !exportedIds.has(p.id));
    }
    return filtered;
  };

  const handleExportPreview = async () => {
    if (selectedProducts.length === 0) { showNotification('اختر منتجاً واحداً على الأقل', 'error'); return; }
    try {
      const r = await fetch(`${API_BASE}/easy-orders/export/preview?ids=${selectedProducts.join(',')}`);
      const d = await r.json();
      if (d.success) setExportPreview(d.preview);
      else showNotification(d.error || 'فشل جلب المعاينة', 'error');
    } catch { showNotification('خطأ في الاتصال', 'error'); }
  };

  const handleConfirmExport = async () => {
    if (!exportPreview) return;
    setExporting(true);
    try {
      const r = await fetch(`${API_BASE}/easy-orders/export/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: exportPreview, exportImages: true })
      });
      const d = await r.json();
      if (d.success) {
        const successCount = d.results.filter(r => r.success).length;
        const failCount = d.results.filter(r => !r.success).length;
        if (failCount > 0) {
          const errors = d.results.filter(r => !r.success).map(r => `${r.productId}: ${r.error}`).join('\n');
          showNotification(`تم تصدير ${successCount} منتج بنجاح، فشل ${failCount} منتج.\n${errors}`, 'error');
        } else {
          showNotification(`تم تصدير ${successCount} منتج بنجاح`, 'success');
        }
        setExportPreview(null);
        setSelectedProducts([]);
        fetchStats();
        fetch(`${API_BASE}/easy-orders/sync-logs?limit=20`).then(r => r.json()).then(d2 => { if (d2.success) setSyncLogs(d2.logs); }).catch(() => {});
      } else showNotification(d.error || 'فشل التصدير', 'error');
    } catch { showNotification('خطأ في الاتصال', 'error'); }
    setExporting(false);
  };

  const handlePoll = async () => {
    setPolling(true);
    setPollResult(null);
    try {
      const r = await fetch(`${API_BASE}/easy-orders/poll`, { method: 'POST' });
      const d = await r.json();
      if (d.success) {
        setPollResult({ imported: d.imported, skipped: d.skipped });
        showNotification(`تم جلب ${d.imported} طلب جديد`, 'success');
        fetchStats();
        fetchStaging();
        fetch(`${API_BASE}/easy-orders/sync-logs?limit=20`).then(r2 => r2.json()).then(d2 => { if (d2.success) setSyncLogs(d2.logs); }).catch(() => {});
      } else showNotification(d.error || 'فشل الجلب', 'error');
    } catch { showNotification('خطأ في الاتصال', 'error'); }
    setPolling(false);
  };

  const handleConfirmStaging = async (id: string) => {
    try {
      const r = await fetch(`${API_BASE}/easy-orders/staging/${id}/confirm`, { method: 'POST' });
      const d = await r.json();
      if (d.success) {
        showNotification('تم تأكيد الطلب', 'success');
        fetchStaging();
        fetchStats();
      } else showNotification(d.error || 'فشل التأكيد', 'error');
    } catch { showNotification('خطأ', 'error'); }
  };

  const handleRejectStaging = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رفض هذا الطلب؟ سيتم إعادة الكميات للمخزون.')) return;
    try {
      const r = await fetch(`${API_BASE}/easy-orders/staging/${id}/reject`, { method: 'POST' });
      const d = await r.json();
      if (d.success) {
        showNotification('تم رفض الطلب وإعادة المخزون', 'success');
        fetchStaging();
        fetchStats();
      } else showNotification(d.error || 'فشل', 'error');
    } catch { showNotification('خطأ', 'error'); }
  };

  const handleBatchConfirm = async () => {
    if (selectedStaging.length === 0) return;
    try {
      const r = await fetch(`${API_BASE}/easy-orders/staging/batch-confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedStaging })
      });
      const d = await r.json();
      if (d.success) {
        showNotification(`تم تأكيد ${d.confirmed} طلب`, 'success');
        setSelectedStaging([]);
        fetchStaging();
        fetchStats();
      }
    } catch {}
  };

  const handleBatchReject = async () => {
    if (selectedStaging.length === 0) return;
    if (!window.confirm(`رفض ${selectedStaging.length} طلب؟ سيتم إعادة المخزون.`)) return;
    try {
      const r = await fetch(`${API_BASE}/easy-orders/staging/batch-reject`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedStaging })
      });
      const d = await r.json();
      if (d.success) {
        showNotification(`تم رفض ${d.rejected} طلب`, 'success');
        setSelectedStaging([]);
        fetchStaging();
        fetchStats();
      }
    } catch {}
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'settings', label: 'الإعدادات', icon: <Settings size={18} /> },
    { key: 'export', label: 'تصدير المنتجات', icon: <Upload size={18} /> },
    { key: 'staging', label: `الطلبات الواردة${stats.pendingOrders > 0 ? ` (${stats.pendingOrders})` : ''}`, icon: <ShoppingBag size={18} /> },
    { key: 'categories', label: 'التصنيفات', icon: <Package size={18} /> },
    { key: 'logs', label: 'سجل المزامنة', icon: <Clock size={18} /> },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 relative p-4 sm:p-8">
      <MD3Snackbar messages={snackMessages} onDismiss={dismissSnack} />

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-2xl" style={{ backgroundColor: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
          <ArrowRightLeft size={24} />
        </div>
        <h1 className="text-3xl font-black">إعدادات المتجر</h1>
      </div>

      {/* Status Bar */}
      <div className="flex flex-wrap gap-3 mb-2">
        <span className={`px-4 py-2 rounded-xl text-xs font-black ${enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          {enabled ? '🟢 مفعل' : '🔴 غير مفعل'}
        </span>
        <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-black">
          📦 {stats.exportedProducts} منتج مصدر
        </span>
        <span className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-black">
          ⏳ {stats.pendingOrders} طلب قيد المراجعة
        </span>
        {stats.lastPoll && (
          <span className="px-4 py-2 bg-gray-50 text-gray-500 rounded-xl text-xs font-black">
            آخر جلب: {new Date(stats.lastPoll).toLocaleString('ar-EG')}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-sm transition-colors duration-200 ${activeTab === t.key ? 'bg-accent text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ============ TAB: SETTINGS ============ */}
      {activeTab === 'settings' && (
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 space-y-6">
            <h2 className="text-xl font-black flex items-center gap-2"><Settings size={20} /> إعدادات API</h2>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400">مفتاح API (Easy Orders)</label>
              <div className="flex gap-2">
                <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)} onBlur={e => saveField({ apiKey: (e.target as HTMLInputElement).value })}
                  placeholder="51e08305-dfce-4b2d-a62a-9aa04037e543"
                  className="flex-1 p-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-accent font-mono text-sm" />
                <button onClick={() => setShowKey(!showKey)} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 hover:bg-gray-100">
                  {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
              <div><h4 className="font-black">تفعيل التكامل</h4><p className="text-xs text-gray-400">تشغيل أو إيقاف الاتصال بـ Easy Orders</p></div>
              <button onClick={() => { const v = !enabled; setEnabled(v); saveField({ enabled: v }); }} className={`w-14 h-7 rounded-full relative transition-colors duration-200 ${enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${enabled ? 'left-8' : 'left-1'}`} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400">مفتاح ImgBB API (لرفع الصور - مجاني)</label>
              <input type="text" value={imgbbKey} onChange={e => setImgbBKey(e.target.value)} onBlur={e => saveField({ imgbbApiKey: (e.target as HTMLInputElement).value })}
                placeholder="أدخل مفتاح ImgBB من https://api.imgbb.com"
                className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-accent text-sm" />
              <p className="text-[10px] text-gray-400">مطلوب فقط لرفع الصور للمتجر. يمكنك الحصول على مفتاح مجاني من موقع ImgBB.</p>
              <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold flex items-start gap-1">🖼️ الصور المخزنة في النظام (Data URI) سيتم رفعها تلقائياً لـ ImgBB عند التصدير. Easy Orders يقبل فقط روابط URLs مباشرة — JPEG/PNG مدعومة حتى 32MB.</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
              <div><h4 className="font-black">تأكيد تلقائي</h4><p className="text-xs text-gray-400">تجاوز مراجعة الطلبات وإدراجها مباشرة (إلغاء تفعيل الـ Staging)</p></div>
              <button onClick={() => { const v = !autoConfirm; setAutoConfirm(v); saveField({ autoConfirm: v }); }} className={`w-14 h-7 rounded-full relative transition-colors duration-200 ${autoConfirm ? 'bg-accent' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${autoConfirm ? 'left-8' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
              <div><h4 className="font-black">مزامنة تلقائية للمنتجات</h4><p className="text-xs text-gray-400">عند حفظ منتج في ERP يتم تصديره تلقائياً إلى Easy Orders</p></div>
              <button onClick={() => { const v = !autoSyncProducts; setAutoSyncProducts(v); saveField({ autoSyncProducts: v }); }} className={`w-14 h-7 rounded-full relative transition-colors duration-200 ${autoSyncProducts ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${autoSyncProducts ? 'left-8' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
              <div><h4 className="font-black">مزامنة تلقائية للطلبات</h4><p className="text-xs text-gray-400">جلب الطلبات الجديدة من Easy Orders تلقائياً كل دقيقة</p></div>
              <button onClick={() => { const v = !autoSyncOrders; setAutoSyncOrders(v); saveField({ autoSyncOrders: v }); }} className={`w-14 h-7 rounded-full relative transition-colors duration-200 ${autoSyncOrders ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${autoSyncOrders ? 'left-8' : 'left-1'}`} />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 space-y-6">
            <h2 className="text-xl font-black flex items-center gap-2"><Package size={20} /> إعدادات تصدير المنتجات</h2>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
              <div><h4 className="font-black">تتبع المخزون</h4><p className="text-xs text-gray-400">track_stock في Easy Orders</p></div>
              <button onClick={() => { const v = !trackStock; setTrackStock(v); saveField({ trackStock: v }); }} className={`w-14 h-7 rounded-full relative transition-colors duration-200 ${trackStock ? 'bg-accent' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${trackStock ? 'left-8' : 'left-1'}`} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400">نسبة سعر العرض (%)</label>
              <input type="number" value={salePricePercent} onChange={e => setSalePricePercent(Number(e.target.value))} onBlur={e => saveField({ salePricePercent: Number((e.target as HTMLInputElement).value) })}
                className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-accent" />
              <p className="text-[10px] text-gray-400">سعر العرض = سعر المنتج × (النسبة / 100). مثال: 85 يعني خصم 15%</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 space-y-6">
            <h2 className="text-xl font-black flex items-center gap-2"><span className="material-symbols-rounded" style={{ fontSize: 20 }}>webhook</span> إعدادات Webhook</h2>
            <p className="text-xs text-gray-400">Webhook يسمح للمتجر بإرسال الطلبات الجديدة تلقائياً بدلاً من الجلب الدوري.</p>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl space-y-3">
              <p className="text-xs text-blue-700 dark:text-blue-400"><strong>ملاحظة:</strong> قم بإنشاء Webhook في لوحة تحكم المتجر مع الرابط التالي:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-blue-100 dark:bg-blue-800/30 px-3 py-2 rounded-xl text-[10px] ltr text-left truncate">https://x2-baby-erp-backend.vercel.app/api/easy-orders/webhook</code>
                <button onClick={() => { navigator.clipboard.writeText('https://x2-baby-erp-backend.vercel.app/api/easy-orders/webhook'); showNotification('تم نسخ الرابط', 'success'); }}
                  className="shrink-0 p-2 bg-blue-100 dark:bg-blue-800/30 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors" title="نسخ الرابط">
                  <ClipboardCopy size={16} className="text-blue-600 dark:text-blue-400" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={handleSaveConfig} className="flex-1 py-4 bg-accent text-white font-black rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-200">
              حفظ الإعدادات
            </button>
            <button onClick={handleTestConnection} disabled={testingConnection || !apiKey}
              className="px-8 py-4 bg-emerald-500 text-white font-black rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-200 disabled:opacity-50 flex items-center gap-2">
              {testingConnection ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
              {testingConnection ? 'جارٍ الاختبار...' : 'اختبار الاتصال'}
            </button>
          </div>
        </motion.div>
      )}

      {/* ============ TAB: EXPORT ============ */}
      {activeTab === 'export' && (
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 space-y-6">
            <h2 className="text-xl font-black flex items-center gap-2"><Search size={20} /> اختيار المنتجات</h2>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => setExportFilter('all')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${exportFilter === 'all' ? 'bg-accent text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}>
                الكل ({state.products.length})
              </button>
              <button onClick={() => setExportFilter('not_exported')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${exportFilter === 'not_exported' ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}>
                غير المصدّر ({state.products.length - productsStatus.filter(p => p.exported).length})
              </button>
              <button onClick={() => setExportFilter('exported')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${exportFilter === 'exported' ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}>
                المصدّر ({productsStatus.filter(p => p.exported).length})
              </button>
            </div>

            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث عن منتج بالاسم أو المعرف..."
              className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-accent" />

            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
              {handleSearchProducts().map(p => {
                const ps = productsStatus.find(s => s.id === p.id);
                const isExported = ps?.exported;
                return (
                <button key={p.id} onClick={() => setSelectedProducts(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                  className={`p-4 rounded-2xl border-2 text-right transition-colors duration-200 ${selectedProducts.includes(p.id) ? 'border-accent bg-accent/5 shadow-md' : 'border-gray-100 dark:border-slate-700 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    {p.image ? <img src={p.image} className="w-12 h-12 rounded-xl object-cover" /> : <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center"><Package size={20} className="text-gray-400" /></div>}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-400">{p.category} • {p.price} ج.م</p>
                      {isExported ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-1">
                          <Check size={8} /> مصدّر
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full mt-1">
                          <AlertCircle size={8} /> غير مصدّر
                        </span>
                      )}
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedProducts.includes(p.id) ? 'bg-accent border-accent' : 'border-gray-300'}`}>
                      {selectedProducts.includes(p.id) && <Check size={14} className="text-white" />}
                    </div>
                  </div>
                </button>
                );
              })}
              {handleSearchProducts().length === 0 && (
                <div className="col-span-full py-16 text-center text-gray-400 font-bold italic">لا توجد منتجات. ابدأ بإضافة منتجات إلى المخزون.</div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-500">تم اختيار {selectedProducts.length} منتج</span>
              <button onClick={handleExportPreview} disabled={selectedProducts.length === 0}
                className="px-6 py-3 bg-accent text-white font-black rounded-2xl shadow-lg disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center gap-2">
                <Eye size={18} /> عرض المعاينة
              </button>
            </div>
          </div>

          {/* Export Preview */}
          <AnimatePresence>
            {exportPreview && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 space-y-6">
                <h2 className="text-xl font-black flex items-center gap-2"><FileText size={20} /> معاينة البيانات قبل التصدير</h2>

                {exportPreview.map((item, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {item.product.image && <img src={item.product.image} className="w-10 h-10 rounded-xl object-cover" />}
                        <span className="font-black">{item.product.name}</span>
                      </div>
                      <span className="text-xs text-gray-400">{item.easyProduct.sku}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-xl"><span className="text-gray-400">السعر:</span> <span className="font-bold">{item.easyProduct.price} ج.م</span></div>
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-xl"><span className="text-gray-400">سعر العرض:</span> <span className="font-bold">{item.easyProduct.sale_price} ج.م</span></div>
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-xl"><span className="text-gray-400">الكمية:</span> <span className="font-bold">{item.easyProduct.quantity}</span></div>
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-xl"><span className="text-gray-400">المتغيرات:</span> <span className="font-bold">{item.easyProduct.variants?.length || 0}</span></div>
                    </div>
                    {item.easyProduct.variations?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.easyProduct.variations.map((v, vi) => (
                          <span key={vi} className="px-2 py-1 bg-accent/10 rounded-lg text-[10px] font-bold text-accent">{v.name}: {v.props?.map(p => p.name).join(', ')}</span>
                        ))}
                      </div>
                    )}
                    {item.easyProduct.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">{item.easyProduct.description}</p>
                    )}
                  </div>
                ))}

                <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <button onClick={handleConfirmExport} disabled={exporting}
                    className="flex-1 py-4 bg-emerald-500 text-white font-black rounded-2xl shadow-lg disabled:opacity-50 hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2">
                    {exporting ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                    {exporting ? 'جاري التصدير...' : 'تأكيد التصدير'}
                  </button>
                  <button onClick={() => setExportPreview(null)}
                    className="px-8 py-4 bg-gray-50 dark:bg-slate-800 text-gray-400 font-black rounded-2xl">
                    إلغاء
                  </button>
                </div>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 justify-center">🖼️ سيتم رفع الصور تلقائياً لخدمة ImgBB. Easy Orders يقبل فقط روابط URLs مباشرة — JPEG/PNG.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ============ TAB: STAGING ============ */}
      {activeTab === 'staging' && (
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button onClick={handlePoll} disabled={polling}
                className="px-6 py-3 bg-accent text-white font-black rounded-2xl shadow-lg disabled:opacity-50 hover:scale-[1.02] transition-all duration-200 flex items-center gap-2">
                <RefreshCw size={18} className={polling ? 'animate-spin' : ''} />
                {polling ? 'جاري الجلب...' : 'جلب الطلبات الآن'}
              </button>
              {selectedStaging.length > 0 && (
                <>
                  <button onClick={handleBatchConfirm} className="px-4 py-3 bg-emerald-500 text-white font-black rounded-2xl flex items-center gap-1">
                    <Check size={16} /> تأكيد ({selectedStaging.length})
                  </button>
                  <button onClick={handleBatchReject} className="px-4 py-3 bg-red-500 text-white font-black rounded-2xl flex items-center gap-1">
                    <X size={16} /> رفض ({selectedStaging.length})
                  </button>
                </>
              )}
            </div>
            <button onClick={fetchStaging} className="p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl">
              <RefreshCw size={18} />
            </button>
          </div>

          {pollResult && (
            <div className={`p-4 rounded-2xl font-bold text-sm ${pollResult.imported > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
              {pollResult.imported > 0 ? `✅ تم جلب ${pollResult.imported} طلب جديد` : '📭 لا توجد طلبات جديدة'} {pollResult.skipped > 0 && `(تخطي ${pollResult.skipped} مكرر)`}
            </div>
          )}

          {stagingLoading ? (
            <div className="py-20 text-center text-gray-400 font-bold"><Loader2 size={32} className="animate-spin mx-auto mb-4" /> جاري تحميل الطلبات...</div>
          ) : stagingOrders.filter(o => o.status === 'pending').length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-[32px]">
              <ShoppingBag size={48} className="mx-auto mb-4 text-gray-200" />
              <p className="text-gray-400 font-bold italic">لا توجد طلبات قيد المراجعة. اضغط "جلب الطلبات الآن" للتحقق من وجود طلبات جديدة.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stagingOrders.filter(o => o.status === 'pending').map(order => {
                const data = order.data || {};
                const isExpanded = expandedStaging === order.id;
                return (
                  <motion.div key={order.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-[28px] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                    <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedStaging(isExpanded ? null : order.id)}>
                      <input type="checkbox" checked={selectedStaging.includes(order.id)} onChange={e => {
                        e.stopPropagation();
                        setSelectedStaging(prev => prev.includes(order.id) ? prev.filter(id => id !== order.id) : [...prev, order.id]);
                      }} className="w-5 h-5 rounded-lg accent-accent" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black">{data.customerName || 'عميل'}</span>
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">قيد المراجعة</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {data.customerPhone || ''} • {data.totalAmount} ج.م • {data.items?.length || 0} منتج
                        </p>
                      </div>
                      <div className="text-left text-[10px] text-gray-400 shrink-0">
                        {new Date((order.created_at || order.createdAt || '').replace(' ', 'T')).toLocaleString('ar-EG')}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="border-t border-gray-100 dark:border-slate-800">
                          <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-xl"><span className="text-gray-400">العميل:</span> <span className="font-bold block">{data.customerName}</span></div>
                              <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-xl"><span className="text-gray-400">الهاتف:</span> <span className="font-bold block">{data.customerPhone}</span></div>
                              <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-xl"><span className="text-gray-400">المدينة:</span> <span className="font-bold block">{data.city || '—'}</span></div>
                              <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-xl"><span className="text-gray-400">الإجمالي:</span> <span className="font-bold block">{data.totalAmount} ج.م</span></div>
                            </div>
                            {data.address && <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-xs"><span className="text-gray-400">العنوان:</span> <span className="font-bold">{data.address}</span></div>}
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-gray-400">المنتجات:</p>
                              {(data.items || []).map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800 rounded-xl text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold">{item.productName}</span>
                                    {item.sku && <span className="font-mono text-[9px] text-gray-400">[{item.sku}]</span>}
                                    {item.skuStatus === 'unmatched' && <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded text-[8px] font-black">SKU غير متطابق</span>}
                                  </div>
                                  <span className="text-gray-400">{item.quantity} × {item.price} ج.م</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-3 pt-2">
                              <button onClick={() => handleConfirmStaging(order.id)} className="flex-1 py-3 bg-emerald-500 text-white font-black rounded-2xl text-sm flex items-center justify-center gap-2">
                                <Check size={16} /> تأكيد الطلب
                              </button>
                              <button onClick={() => handleRejectStaging(order.id)} className="flex-1 py-3 bg-red-500 text-white font-black rounded-2xl text-sm flex items-center justify-center gap-2">
                                <X size={16} /> رفض الطلب
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ============ TAB: CATEGORIES ============ */}
      {activeTab === 'categories' && (
        <CategorySyncTab apiBase={API_BASE} showNotification={showNotification} onUpdateState={onUpdateState} />
      )}

      {/* ============ TAB: LOGS ============ */}
      {activeTab === 'logs' && (
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2"><Clock size={20} /> سجل المزامنة</h2>
            {logsLoading ? (
              <div className="py-16 text-center text-gray-400 font-bold"><Loader2 size={32} className="animate-spin mx-auto mb-4" /> جاري التحميل...</div>
            ) : syncLogs.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-[28px]">
                <Clock size={48} className="mx-auto mb-4 text-gray-200" />
                <p className="text-gray-400 font-bold italic">لا توجد عمليات مزامنة بعد. ابدأ بتصدير منتج أو جلب طلبات.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[80vh] overflow-y-auto custom-scrollbar">
                {syncLogs.map(log => {
                  const typeConfig: Record<string, { label: string; icon: string; color: string }> = {
                    poll: { label: 'جلب طلبات', icon: '📥', color: 'bg-blue-50 text-blue-700' },
                    export: { label: 'تصدير منتج', icon: '📤', color: 'bg-purple-50 text-purple-700' },
                    confirm: { label: 'تأكيد طلب', icon: '✅', color: 'bg-emerald-50 text-emerald-700' },
                    reject: { label: 'رفض طلب', icon: '❌', color: 'bg-red-50 text-red-700' },
                    image_upload: { label: 'رفع صورة', icon: '🖼️', color: 'bg-amber-50 text-amber-700' },
                  };
                  const tc = typeConfig[log.type] || { label: log.type, icon: '📋', color: 'bg-gray-50 text-gray-700' };
                  return (
                    <div key={log.id} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/50 dark:bg-slate-800/30 text-xs">
                      <span className={`px-2 py-1 rounded-lg font-bold ${tc.color}`}>{tc.icon} {tc.label}</span>
                      <span className={`px-2 py-1 rounded-lg font-bold ${log.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {log.status === 'success' ? 'نجاح' : 'فشل'}
                      </span>
                      {log.entityId && <span className="font-bold text-gray-500 font-mono">{log.entityId}</span>}
                      <span className="text-gray-400 flex-1">{log.message}</span>
                      <span className="text-gray-400 shrink-0">{new Date((log.createdAt || log.created_at || '').replace(' ', 'T')).toLocaleString('ar-EG')}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default React.memo(EasyOrdersPanel);
