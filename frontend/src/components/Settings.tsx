import React, { useRef, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Upload, Database, AlertCircle, AlertTriangle, Check, Clock, Palette, Image as ImageIcon, Trash2, Save, Tag, Plus, ChevronDown, ChevronRight, Edit2, Sparkles, Key, ArrowUp, ArrowDown, Eye, EyeOff, X, Printer, Percent, RotateCcw, History, Layers, RefreshCw } from 'lucide-react';
import { AppState, Category } from '../types';
import { compressImage } from '../lib/imageUtils';
import { updateFavicon } from '../lib/faviconUtils';
import { useTheme } from '../contexts/ThemeContext';
import { MD3Button, MD3IconButton, MD3Dialog, useSnackbar, MD3Snackbar } from './md3';

interface SettingsProps {
  state: AppState;
  onImport: (newState: AppState) => void;
  onUpdateState: (update: Partial<AppState>) => void;
}

import { API_BASE } from '../lib/api';

const Settings: React.FC<SettingsProps> = ({ state, onImport, onUpdateState }) => {
  const { uiTheme, setTheme, primaryColor, secondaryColor, setPrimaryColor, setSecondaryColor, resetColors } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sloganDesignInputRef = useRef<HTMLInputElement>(null);
  const thankYouInputRef = useRef<HTMLInputElement>(null);
  const { messages: snackbarMessages, dismiss: dismissSnackbar, success: snackSuccess, error: snackError } = useSnackbar();
  const [pendingImport, setPendingImport] = useState<AppState | null>(null);
  const [confirmReplaceMode, setConfirmReplaceMode] = useState(false);
  const [taxRateInput, setTaxRateInput] = useState(state.taxRate.toString());
  const [aiKeys, setAiKeys] = useState<string[]>([]);
  const [showAiKeyInput, setShowAiKeyInput] = useState(false);
  const [editingAiKeyIndex, setEditingAiKeyIndex] = useState<number | null>(null);
  const [aiKeyInput, setAiKeyInput] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const [imageFitContain, setImageFitContain] = useState(() => localStorage.getItem('erp_image_fit') === 'true');
  const [checkpoints, setCheckpoints] = useState<{id: number; name: string; created_at: string}[]>([]);
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [checkpointName, setCheckpointName] = useState('');
  const [checkpointLoading, setCheckpointLoading] = useState(false);

  // Coupon Management State
  const [coupons, setCoupons] = useState<Array<{code: string; discount: number; is_percent: boolean}>>([]);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState(0);
  const [newCouponIsPercent, setNewCouponIsPercent] = useState(true);



  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortControllerRef.current = new AbortController();
    fetch(`${API_BASE}/ai-keys`, { signal: abortControllerRef.current.signal })
      .then(r => r.json()).then(d => {
      if (d.keys) setAiKeys(d.keys);
    }).catch(() => {});
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Fetch saved coupons
  useEffect(() => {
    fetch(`${API_BASE}/coupons`).then(r => r.json()).then(data => {
      setCoupons(data.map((c: any) => ({ code: c.code, discount: c.discount, is_percent: !!c.is_percent })));
    }).catch(() => {});
  }, []);

  // Fetch checkpoints
  useEffect(() => {
    fetch(`${API_BASE}/checkpoints`).then(r => r.json()).then(data => {
      setCheckpoints(data.rows || []);
    }).catch(() => {});
  }, []);


  const showNotification = (message: string, type: 'success' | 'error') => {
    if (type === 'success') snackSuccess(message);
    else snackError(message);
  };

  // Category Management State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<{name: string, parentId: string | null, slug: string, thumb: string, show_in_header: boolean, position: number, hidden: boolean}>({ name: '', parentId: null, slug: '', thumb: '', show_in_header: false, position: 0, hidden: false });
  const [categoryImgUploading, setCategoryImgUploading] = useState(false);
  const categoryThumbInputRef = useRef<HTMLInputElement>(null);

  const generateSlug = (name: string) => {
    return name.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  };

  const handleCategoryThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showNotification('يجب اختيار ملف صورة', 'error'); return; }
    setCategoryImgUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setCategoryForm(prev => ({ ...prev, thumb: dataUrl }));
      showNotification('تم رفع الصورة بنجاح', 'success');
    } catch { showNotification('خطأ في رفع الصورة', 'error'); }
    setCategoryImgUploading(false);
    if (categoryThumbInputRef.current) categoryThumbInputRef.current.value = '';
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) return;
    
    try {
      const payload = { ...categoryForm, slug: categoryForm.slug || generateSlug(categoryForm.name) };
      if (editingCategory) {
        await fetch(`${API_BASE}/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        onUpdateState({
          categories: state.categories.map(c => c.id === editingCategory.id ? { ...c, ...payload } : c)
        });
        showNotification('تم تحديث التصنيف بنجاح', 'success');
      } else {
        const newCat: Category = {
          id: `cat-${Date.now()}`,
          name: categoryForm.name,
          parentId: categoryForm.parentId,
          slug: payload.slug,
          thumb: payload.thumb,
          show_in_header: payload.show_in_header,
          position: payload.position,
          hidden: payload.hidden
        };
        await fetch(`${API_BASE}/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCat)
        });
        onUpdateState({ categories: [...state.categories, newCat] });
        showNotification('تم إضافة التصنيف بنجاح', 'success');
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', parentId: null, slug: '', thumb: '', show_in_header: false, position: 0, hidden: false });
    } catch (err) {
      showNotification('خطأ في حفظ التصنيف', 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const hasChildren = state.categories.some(c => c.parentId === id);
    if (hasChildren) {
      if (!window.confirm('هذا التصنيف يحتوي على تصنيفات فرعية، هل أنت متأكد من حذف التصنيف وجميع ما فيه؟')) return;
    } else {
      if (!window.confirm('هل أنت متأكد من حذف هذا التصنيف؟')) return;
    }

    try {
      await fetch(`${API_BASE}/categories/${id}`, { method: 'DELETE' });
      
      // Proactively clear stale categories from currently loaded products
      const deletedCatNames = new Set<string>();
      const affectedIds = new Set([id, ...state.categories.filter(c => c.parentId === id).map(c => c.id)]);
      state.categories.forEach(c => {
        if (affectedIds.has(c.id)) deletedCatNames.add(c.name);
      });

      onUpdateState({
        categories: state.categories.filter(c => !affectedIds.has(c.id)),
        products: state.products.map(p => {
          if (p.category && (deletedCatNames.has(p.category) || Array.from(deletedCatNames).some(name => p.category.includes(` > ${name}`) || p.category.startsWith(`${name} > `)))) {
            return { ...p, category: '', categories: (p.categories || []).filter(c => !deletedCatNames.has(c)) };
          }
          return { ...p, categories: (p.categories || []).filter(c => !deletedCatNames.has(c)) };
        })
      });
      showNotification('تم حذف التصنيف بنجاح', 'success');
    } catch (err) {
      showNotification('خطأ في حذف التصنيف', 'error');
    }
  };

  const handleTaxToggle = async () => {
    const newValue = !state.taxEnabled;
    try {
      await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'taxEnabled', value: newValue })
      });
      onUpdateState({ taxEnabled: newValue });
      showNotification(newValue ? 'تم تفعيل الضريبة' : 'تم تعطيل الضريبة', 'success');
    } catch (err) {
      showNotification('خطأ في تغيير الإعدادات', 'error');
    }
  };

  const handleTaxRateSave = async () => {
    const rate = parseFloat(taxRateInput);
    if (isNaN(rate)) return;
    try {
      await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'taxRate', value: rate })
      });
      onUpdateState({ taxRate: rate });
      showNotification('تم حفظ نسبة الضريبة', 'success');
    } catch (err) {
      showNotification('خطأ في حفظ الضريبة', 'error');
    }
  };

  const handleAddAiKey = async () => {
    if (!aiKeyInput.trim()) return;
    try {
      const r = await fetch(`${API_BASE}/ai-keys`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: aiKeyInput.trim() })
      });
      const d = await r.json();
      if (d.keys) setAiKeys(d.keys);
      setAiKeyInput('');
      setShowAiKeyInput(false);
      showNotification('تم إضافة المفتاح بنجاح', 'success');
    } catch { showNotification('خطأ في إضافة المفتاح', 'error'); }
  };

  const handleUpdateAiKey = async (index: number) => {
    if (!aiKeyInput.trim()) return;
    try {
      const r = await fetch(`${API_BASE}/ai-keys/${index}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: aiKeyInput.trim() })
      });
      const d = await r.json();
      if (d.keys) setAiKeys(d.keys);
      setAiKeyInput('');
      setEditingAiKeyIndex(null);
      showNotification('تم تعديل المفتاح بنجاح', 'success');
    } catch { showNotification('خطأ في تعديل المفتاح', 'error'); }
  };

  const handleDeleteAiKey = async (index: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المفتاح؟')) return;
    try {
      const r = await fetch(`${API_BASE}/ai-keys/${index}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.keys) setAiKeys(d.keys);
      showNotification('تم حذف المفتاح بنجاح', 'success');
    } catch { showNotification('خطأ في حذف المفتاح', 'error'); }
  };

  const handleReorderAiKey = async (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= aiKeys.length) return;
    const newKeys = [...aiKeys];
    [newKeys[fromIndex], newKeys[toIndex]] = [newKeys[toIndex], newKeys[fromIndex]];
    try {
      const r = await fetch(`${API_BASE}/ai-keys/reorder`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: newKeys })
      });
      const d = await r.json();
      if (d.keys) setAiKeys(d.keys);
    } catch { showNotification('خطأ في إعادة الترتيب', 'error'); }
  };

  const maskKey = (key: string) => {
    if (showKeys) return key;
    if (key.length <= 8) return key.slice(0, 4) + '...';
    return key.slice(0, 4) + '...' + key.slice(-4);
  };

  const handleUpdateCoupon = async (code: string, discount: number, isPercent: boolean) => {
    try {
      await fetch(`${API_BASE}/coupons`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, discount, is_percent: isPercent })
      });
    } catch {}
  };

  const handleDeleteCoupon = async (code: string) => {
    if (!window.confirm(`حذف الكوبون "${code}"؟`)) return;
    try {
      await fetch(`${API_BASE}/coupons/${encodeURIComponent(code)}`, { method: 'DELETE' });
      setCoupons(prev => prev.filter(c => c.code !== code));
      showNotification('تم حذف الكوبون', 'success');
    } catch { showNotification('خطأ في حذف الكوبون', 'error'); }
  };

  const handleAddCoupon = async () => {
    const code = newCouponCode.trim().toUpperCase();
    if (!code) return;
    if (coupons.some(c => c.code === code)) {
      showNotification('الكوبون موجود مسبقًا', 'error');
      return;
    }
    try {
      await fetch(`${API_BASE}/coupons`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, discount: newCouponDiscount, is_percent: newCouponIsPercent })
      });
      setCoupons(prev => [...prev, { code, discount: newCouponDiscount, is_percent: newCouponIsPercent }]);
      setNewCouponCode('');
      setNewCouponDiscount(0);
      setNewCouponIsPercent(true);
      setShowCouponInput(false);
      showNotification('تم إضافة الكوبون', 'success');
    } catch { showNotification('خطأ في إضافة الكوبون', 'error'); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await compressImage(file, 400, 0.7);
      await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'brandLogo', value: base64 })
      });
      onUpdateState({ brandLogo: base64 });
      updateFavicon(base64);
      showNotification('تم تحديث شعار البراند بنجاح', 'success');
    } catch (err) {
      showNotification('خطأ في حفظ الشعار', 'error');
    }
    e.target.value = '';
  };

  const handleSloganDesignUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await compressImage(file, 400, 0.7);
      await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'brandSloganDesign', value: base64 })
      });
      onUpdateState({ brandSloganDesign: base64 });
      showNotification('تم تحديث تصميم الشعار اللفظي بنجاح', 'success');
    } catch (err) {
      showNotification('خطأ في حفظ تصميم الشعار', 'error');
    }
    e.target.value = '';
  };

  const handleThankYouUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await compressImage(file, 300, 0.7);
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'thankYouImage', value: base64 })
      });
      if (!res.ok) throw new Error();
      onUpdateState({ invoiceSettings: { ...state.invoiceSettings, thankYouImage: base64 } as any });
      showNotification('تم رفع الصورة بنجاح', 'success');
    } catch (err) {
      showNotification('خطأ في حفظ الصورة', 'error');
    }
    e.target.value = '';
  };

  const saveInvoiceSettings = async (overrides: any) => {
    const keys = Object.keys(overrides);
    for (const k of keys) {
      const val = overrides[k];
      const valueToStore = typeof val === 'boolean' || Array.isArray(val) ? JSON.stringify(val) : val;
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: `invoiceSettings.${k}`, value: valueToStore })
      });
      if (!res.ok) { showNotification('خطأ في حفظ الإعدادات', 'error'); return; }
    }
  };

  const handleCreateCheckpoint = async () => {
    if (!checkpointName.trim()) return;
    setCheckpointLoading(true);
    try {
      const res = await fetch(`${API_BASE}/checkpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: checkpointName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setShowCheckpointModal(false);
        setCheckpointName('');
        showNotification(`تم إنشاء نقطة استعادة "${checkpointName.trim()}"`, 'success');
        const r = await fetch(`${API_BASE}/checkpoints`);
        const d = await r.json();
        setCheckpoints(d.rows || []);
      } else {
        showNotification(data.error || 'فشل إنشاء نقطة الاستعادة', 'error');
      }
    } catch {
      showNotification('خطأ في الاتصال بالسيرفر', 'error');
    }
    setCheckpointLoading(false);
  };

  const handleRestoreCheckpoint = async (id: number, name: string) => {
    if (!window.confirm(`هل أنت متأكد من استعادة نقطة "${name}"؟ سيتم استبدال جميع البيانات الحالية.`)) return;
    try {
      const res = await fetch(`${API_BASE}/checkpoints/${id}/restore`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message, 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showNotification(data.error || 'فشل الاستعادة', 'error');
      }
    } catch {
      showNotification('خطأ في الاتصال بالسيرفر', 'error');
    }
  };

  const handleDeleteCheckpoint = async (id: number, name: string) => {
    if (!window.confirm(`حذف نقطة الاستعادة "${name}"؟`)) return;
    try {
      const res = await fetch(`${API_BASE}/checkpoints/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCheckpoints(prev => prev.filter(c => c.id !== id));
        showNotification('تم حذف نقطة الاستعادة', 'success');
      }
    } catch {
      showNotification('خطأ في حذف نقطة الاستعادة', 'error');
    }
  };

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(state, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `erp_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotification('تم تصدير ملف البيانات بنجاح', 'success');
    } catch (e) {
      showNotification('حدث خطأ أثناء التصدير', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed.products) || !Array.isArray(parsed.orders)) {
            throw new Error('الملف غير صالح');
        }
        setPendingImport(parsed);
      } catch (error) {
        showNotification('الملف المحدد غير صالح', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const executeImport = (strategy: 'replace' | 'merge') => {
    if (!pendingImport) return;
    let finalState: AppState = strategy === 'replace' ? pendingImport : {
      ...state,
      products: [...state.products, ...pendingImport.products.filter(p => !state.products.some(ex => ex.id === p.id))],
      orders: [...state.orders, ...pendingImport.orders.filter(o => !state.orders.some(ex => ex.id === o.id))],
      categories: [...new Set([...state.categories, ...(pendingImport.categories || [])])]
    };
    onImport(finalState);
    setPendingImport(null);
    setConfirmReplaceMode(false);
    showNotification('تم استعادة البيانات بنجاح', 'success');
  };

  const mainCategories = useMemo(() => state.categories.filter(c => !c.parentId), [state.categories]);
  const subCategoriesByParent = useMemo(() => {
    const map = new Map<string, typeof state.categories>();
    state.categories.forEach(c => {
      if (c.parentId) {
        const existing = map.get(c.parentId) || [];
        map.set(c.parentId, [...existing, c]);
      }
    });
    return map;
  }, [state.categories]);
  const availableParentCategories = useMemo(
    () => state.categories.filter(c => !c.parentId && (!editingCategory || c.id !== editingCategory.id)),
    [state.categories, editingCategory]
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="space-y-8 relative p-4 sm:p-8"
    >
      <MD3Snackbar messages={snackbarMessages} onDismiss={dismissSnackbar} />

      <MD3Dialog
        isOpen={!!pendingImport}
        onClose={() => setPendingImport(null)}
        title="خيارات استعادة البيانات"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm font-bold text-[var(--md-sys-color-on-surface-variant)]">يوجد {pendingImport?.length} منتج مستورد. اختر طريقة الاستيراد:</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => executeImport('merge')} className="p-4 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] rounded-2xl font-bold hover:opacity-90 transition-opacity duration-200">
              <Layers size={20} className="mx-auto mb-2" />
              <span className="text-sm">دمج مع الحالي</span>
              <p className="text-[10px] opacity-70 mt-1">إضافة المنتجات الجديدة فقط</p>
            </button>
            <button onClick={() => executeImport('replace')} className="p-4 bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] rounded-2xl font-bold hover:opacity-90 transition-opacity duration-200">
              <RefreshCw size={20} className="mx-auto mb-2" />
              <span className="text-sm">استبدال الكل</span>
              <p className="text-[10px] opacity-70 mt-1">حذف الحالي واستيراد الجديد</p>
            </button>
          </div>
        </div>
      </MD3Dialog>

      <div className="flex items-center gap-2 mb-2"><Palette style={{ color: 'var(--md-sys-color-primary)' }} /><h2 className="text-2xl font-bold">الهوية البصرية</h2></div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-[var(--md-sys-color-surface)] p-8 rounded-[32px] shadow-sm border border-[var(--md-sys-color-outline-variant)]/20 flex flex-col md:flex-row items-center gap-8">
        <div className="w-40 h-40 bg-white rounded-[40px] border flex items-center justify-center overflow-hidden shadow-md ring-8 ring-[var(--md-sys-color-surface-container)]">
          {state.brandLogo ? <img src={state.brandLogo} className="w-full h-full object-contain p-4" /> : <ImageIcon size={40} className="text-[var(--md-sys-color-on-surface-variant)]" />}
        </div>
        <div className="flex-1 text-center md:text-right space-y-4">
          <h3 className="text-xl font-black">شعار المتجر (Logo)</h3>
          <p className="text-[var(--md-sys-color-on-surface-variant)] text-sm">يظهر الشعار في المساعد الذكي والتقارير وفواتير النظام.</p>
          
          <div className="space-y-4">
            <div className="space-y-2 text-right">
              <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest px-2">اسم النشاط التجاري</label>
              <input 
                type="text" 
                value={state.brandName || ''}
                onChange={async (e) => {
                  const val = e.target.value;
                  onUpdateState({ brandName: val });
                  await fetch(`${API_BASE}/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'brandName', value: val })
                  });
                }}
                className="w-full p-4 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-2xl font-bold outline-none focus:border-[var(--md-sys-color-primary)]"
              />
            </div>
            
            <div className="space-y-2 text-right">
              <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest px-2">الشعار اللفظي (Slogan)</label>
              <input 
                type="text" 
                value={state.brandSlogan || ''}
                onChange={async (e) => {
                  const val = e.target.value;
                  onUpdateState({ brandSlogan: val });
                  await fetch(`${API_BASE}/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'brandSlogan', value: val })
                  });
                }}
                className="w-full p-4 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-2xl font-bold outline-none focus:border-[var(--md-sys-color-primary)]"
              />
            </div>

            <div className="space-y-2 text-right p-4 bg-accent/5 rounded-2xl border border-accent/10">
              <label className="text-[10px] font-black text-accent uppercase tracking-widest px-2">تصميم الشعار اللفظي (Image Slogan)</label>
              <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] mb-2 px-2">إذا كان لديك تصميم جاهز للشعار اللفظي، يمكنك رفعه هنا ليظهر فوق زر الوضع الليلي.</p>
              
              {state.brandSloganDesign && (
                <div className="mb-3 relative group w-fit mx-auto md:mx-0">
                  <img src={state.brandSloganDesign} className="h-16 w-auto object-contain bg-white rounded-lg p-2 shadow-sm" />
                  <button 
                    onClick={async () => {
                      onUpdateState({ brandSloganDesign: '' });
                      await fetch(`${API_BASE}/settings`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ key: 'brandSloganDesign', value: '' })
                      });
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white min-w-[40px] min-h-[40px] flex items-center justify-center p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
              
              <input type="file" ref={sloganDesignInputRef} className="hidden" accept="image/*" onChange={handleSloganDesignUpload} />
              <button 
                onClick={() => sloganDesignInputRef.current?.click()}
                className="w-full md:w-auto px-4 py-2 bg-[var(--md-sys-color-surface)] border border-accent/20 text-accent font-bold rounded-xl text-xs hover:bg-accent hover:text-white transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Upload size={14} />
                {state.brandSloganDesign ? 'تغيير التصميم' : 'رفع تصميم الشعار اللفظي'}
              </button>
            </div>

            <div className="space-y-3 p-4 bg-accent/5 rounded-2xl border border-accent/10">
              <h4 className="font-black text-sm">صورة شكراً لك (تظهر في الفاتورة)</h4>
              {state.invoiceSettings?.thankYouImage && (
                <div className="relative group w-fit mx-auto">
                  <img src={state.invoiceSettings.thankYouImage} className="h-16 w-auto object-contain bg-white rounded-lg p-2 shadow-sm" />
                  <button
                    onClick={async () => {
                      onUpdateState({ invoiceSettings: { ...state.invoiceSettings, thankYouImage: '' } as any });
                      const res = await fetch(`${API_BASE}/settings`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ key: 'thankYouImage', value: '' })
                      });
                      if (!res.ok) throw new Error();
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white min-w-[40px] min-h-[40px] flex items-center justify-center p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
              <input type="file" ref={thankYouInputRef} className="hidden" accept="image/*" onChange={handleThankYouUpload} />
              <button
                onClick={() => thankYouInputRef.current?.click()}
                className="w-full px-4 py-2 bg-[var(--md-sys-color-surface)] border border-accent/20 text-accent font-bold rounded-xl text-xs hover:bg-accent hover:text-white transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Upload size={14} />
                {state.invoiceSettings?.thankYouImage ? 'تغيير الصورة' : 'رفع صورة شكراً لك'}
              </button>
            </div>
          </div>

          <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
          <MD3Button variant="filled" onClick={() => logoInputRef.current?.click()}>تغيير صورة الشعار</MD3Button>
        </div>
      </motion.div>

      <div className="flex items-center gap-2 mb-2"><Tag className="text-accent" /><h2 className="text-2xl font-bold">إدارة التصنيفات</h2></div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="bg-[var(--md-sys-color-surface)] p-8 rounded-[32px] shadow-sm border border-[var(--md-sys-color-outline-variant)]/20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black">شجرة التصنيفات</h3>
            <p className="text-[var(--md-sys-color-on-surface-variant)] text-xs mt-1">هنا يمكنك إضافة التصنيفات الأساسية (مثل: أطفال) والتصنيفات الفرعية (مثل: سالوبيتات).</p>
          </div>
          <MD3Button 
            variant="filled"
            icon={<Plus size={18} />}
            onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', parentId: null, slug: '', thumb: '', show_in_header: false, position: 0, hidden: false }); setIsCategoryModalOpen(true); }}
          >
            إضافة تصنيف جديد
          </MD3Button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {mainCategories.map(mainCat => (
            <div key={mainCat.id} className="bg-[var(--md-sys-color-surface-container)] rounded-2xl border border-[var(--md-sys-color-outline-variant)]/20 overflow-hidden">
              <div className="p-4 flex items-center justify-between hover:bg-[var(--md-sys-color-surface-container)] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                    <Tag size={18} />
                  </div>
                  <span className="font-black text-[var(--md-sys-color-on-surface)]">{mainCat.name}</span>
                  <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-bold">قسم أساسي</span>
                  {mainCat.show_in_header && <span className="text-[9px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded-full font-bold">الهيدر</span>}
                  {mainCat.hidden && <span className="text-[9px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full font-bold">مخفي</span>}
                  {mainCat.position > 0 && <span className="text-[9px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-full font-bold">#{mainCat.position}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setEditingCategory(mainCat); setCategoryForm({ name: mainCat.name, parentId: mainCat.parentId || null, slug: mainCat.slug || '', thumb: mainCat.thumb || '', show_in_header: mainCat.show_in_header || false, position: mainCat.position || 0, hidden: mainCat.hidden || false }); setIsCategoryModalOpen(true); }}
                    className="p-2 text-[var(--md-sys-color-on-surface-variant)] hover:text-accent hover:bg-[var(--md-sys-color-surface-container)] rounded-lg transition-colors duration-200"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteCategory(mainCat.id)}
                    className="p-2 text-[var(--md-sys-color-on-surface-variant)] hover:text-red-500 hover:bg-[var(--md-sys-color-surface-container)] rounded-lg transition-colors duration-200"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              {/* Sub-categories */}
              <div className="border-t border-[var(--md-sys-color-outline-variant)]/20 bg-[var(--md-sys-color-surface)]/50">
                {(subCategoriesByParent.get(mainCat.id) || []).map(subCat => (
                  <div key={subCat.id} className="p-3 pr-12 flex items-center justify-between hover:bg-[var(--md-sys-color-surface-container)] transition-colors border-b last:border-0 border-[var(--md-sys-color-outline-variant)]/20">
                    <div className="flex items-center gap-2">
                      <ChevronRight size={14} className="text-[var(--md-sys-color-on-surface-variant)]" />
                      <span className="font-bold text-sm text-[var(--md-sys-color-on-surface-variant)]">{subCat.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => { setEditingCategory(subCat); setCategoryForm({ name: subCat.name, parentId: subCat.parentId || null, slug: subCat.slug || '', thumb: subCat.thumb || '', show_in_header: subCat.show_in_header || false, position: subCat.position || 0, hidden: subCat.hidden || false }); setIsCategoryModalOpen(true); }}
                        className="p-1.5 text-[var(--md-sys-color-on-surface-variant)] hover:text-accent rounded-md transition-colors duration-200"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(subCat.id)}
                        className="p-1.5 text-[var(--md-sys-color-on-surface-variant)] hover:text-red-500 rounded-md transition-colors duration-200"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {(subCategoriesByParent.get(mainCat.id) || []).length === 0 && (
                  <button 
                    onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', parentId: mainCat.id, slug: '', thumb: '', show_in_header: false, position: 0, hidden: false }); setIsCategoryModalOpen(true); }}
                    className="w-full text-right p-3 pr-12 text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] hover:text-accent transition-colors duration-200 italic"
                  >
                    + إضافة قسم فرعي لـ "{mainCat.name}"
                  </button>
                )}
                {(subCategoriesByParent.get(mainCat.id) || []).length > 0 && (
                  <button 
                    onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', parentId: mainCat.id, slug: '', thumb: '', show_in_header: false, position: 0, hidden: false }); setIsCategoryModalOpen(true); }}
                    className="w-full text-right p-2 pr-12 text-[9px] font-black text-accent/50 hover:text-accent transition-colors duration-200"
                  >
                    + إضافة قسم فرعي
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {mainCategories.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-[var(--md-sys-color-outline-variant)]/20 rounded-[32px]">
              <Tag size={48} className="mx-auto mb-4 text-[var(--md-sys-color-on-surface-variant)]" />
              <p className="text-[var(--md-sys-color-on-surface-variant)] font-bold italic">لا توجد أقسام مسجلة. ابدأ بإضافة قسم أساسي.</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Category Modal */}
      <MD3Dialog
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategory ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
        maxWidth="sm"
        actions={[
          { label: 'إلغاء', onClick: () => setIsCategoryModalOpen(false), variant: 'text' },
          { label: 'حفظ', onClick: handleSaveCategory, variant: 'filled' }
        ]}
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest px-2">اسم التصنيف</label>
            <input 
              type="text" 
              value={categoryForm.name}
              onChange={(e) => {
                const name = e.target.value;
                setCategoryForm(prev => ({ ...prev, name, slug: prev.slug || generateSlug(name) }));
              }}
              placeholder="مثال: سالوبيتات مواليد، أطقم خروج..." 
              className="w-full p-4 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-2xl font-bold outline-none focus:border-[var(--md-sys-color-primary)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest px-2">الرابط (Slug)</label>
            <input 
              type="text" 
              value={categoryForm.slug}
              onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
              placeholder="auto-generated-from-name" 
              className="w-full p-4 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-2xl font-bold text-ltr text-sm outline-none focus:border-[var(--md-sys-color-primary)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest px-2">التصنيف الأساسي (اتركه فارغاً إذا كان تصنيفاً رئيساً)</label>
            <select 
              value={categoryForm.parentId || ''}
              onChange={(e) => setCategoryForm({ ...categoryForm, parentId: e.target.value || null })}
              className="w-full p-4 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-2xl font-bold outline-none focus:border-[var(--md-sys-color-primary)]"
            >
              <option value="">-- تصنيف أساسي --</option>
              {availableParentCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest px-2">صورة القسم</label>
            <input ref={categoryThumbInputRef} type="file" accept="image/*" className="hidden" onChange={handleCategoryThumbUpload} />
            <div className="flex items-center gap-3">
              {categoryForm.thumb && (
                <div className="relative group">
                  <img src={categoryForm.thumb} alt="preview" className="w-16 h-16 object-cover rounded-xl border border-[var(--md-sys-color-outline-variant)]/20" onError={(e) => (e.currentTarget.style.display='none')} />
                  <button onClick={() => setCategoryForm(prev => ({ ...prev, thumb: '' }))} className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-[var(--md-sys-color-error)] text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                </div>
              )}
              <button
                type="button"
                disabled={categoryImgUploading}
                onClick={() => categoryThumbInputRef.current?.click()}
                className="flex-1 p-4 bg-[var(--md-sys-color-surface-container)] border border-dashed border-[var(--md-sys-color-outline-variant)]/40 rounded-2xl font-bold text-sm text-[var(--md-sys-color-on-surface-variant)] hover:border-[var(--md-sys-color-primary)] transition-colors cursor-pointer disabled:opacity-50"
              >
                {categoryImgUploading ? (
                  <span className="flex items-center justify-center gap-2"><RefreshCw size={14} className="animate-spin" /> جاري الرفع...</span>
                ) : categoryForm.thumb ? 'تغيير الصورة' : 'اختر صورة من الجهاز'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest px-2">الأولوية في الظهور (Position)</label>
            <input 
              type="number" 
              value={categoryForm.position}
              onChange={(e) => setCategoryForm({ ...categoryForm, position: parseInt(e.target.value) || 0 })}
              min={0}
              className="w-full p-4 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-2xl font-bold outline-none focus:border-[var(--md-sys-color-primary)]"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-[var(--md-sys-color-surface-container)] rounded-2xl">
            <div>
              <p className="font-bold text-sm">إظهار في الهيدر</p>
              <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">يظهر القسم في القائمة الرئيسية للمتجر</p>
            </div>
            <button onClick={() => setCategoryForm({ ...categoryForm, show_in_header: !categoryForm.show_in_header })} className={`w-14 h-7 rounded-full relative transition-colors duration-200 shrink-0 ${categoryForm.show_in_header ? 'bg-[var(--md-sys-color-primary)]' : 'bg-[var(--md-sys-color-surface-container-highest)]'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${categoryForm.show_in_header ? 'left-8' : 'left-1'}`} /></button>
          </div>

          <div className="flex items-center justify-between p-4 bg-[var(--md-sys-color-surface-container)] rounded-2xl">
            <div>
              <p className="font-bold text-sm">إخفاء القسم</p>
              <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">لن يظهر القسم في واجهة المتجر</p>
            </div>
            <button onClick={() => setCategoryForm({ ...categoryForm, hidden: !categoryForm.hidden })} className={`w-14 h-7 rounded-full relative transition-colors duration-200 shrink-0 ${categoryForm.hidden ? 'bg-[var(--md-sys-color-error)]' : 'bg-[var(--md-sys-color-surface-container-highest)]'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${categoryForm.hidden ? 'left-8' : 'left-1'}`} /></button>
          </div>
        </div>
      </MD3Dialog>

      <div className="flex items-center gap-2 mb-2"><AlertTriangle className="text-orange-500" /><h2 className="text-2xl font-bold">الإعدادات المالية</h2></div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-[var(--md-sys-color-surface)] p-8 rounded-[32px] shadow-sm border border-[var(--md-sys-color-outline-variant)]/20">
        <div className="p-4 bg-[var(--md-sys-color-surface-container)] rounded-2xl">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ fontSize: 'var(--md-sys-typescale-title-medium-size)', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>تفعيل نظام الضريبة</h4>
              <p style={{ fontSize: 'var(--md-sys-typescale-body-medium-size)', color: 'var(--md-sys-color-on-surface-variant)', marginTop: 4, overflowWrap: 'break-word', wordBreak: 'break-word' }}>حساب الربح الصافي بعد الضريبة</p>
            </div>
            <button onClick={handleTaxToggle} className={`w-14 h-7 rounded-full relative transition-colors duration-200 shrink-0 ${state.taxEnabled ? 'bg-[var(--md-sys-color-primary)]' : 'bg-[var(--md-sys-color-surface-container-highest)]'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${state.taxEnabled ? 'left-8' : 'left-1'}`} /></button>
          </div>
        </div>
        {state.taxEnabled && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 flex gap-2">
            <input type="number" value={taxRateInput} onChange={(e) => setTaxRateInput(e.target.value)} className="flex-1 bg-[var(--md-sys-color-surface)] border rounded-xl px-4 py-2 font-black" />
            <button onClick={handleTaxRateSave} className="px-6 py-2 bg-blue-600 text-white font-black rounded-xl">حفظ</button>
          </div>
        )}
      </motion.div>

      <div className="flex items-center gap-2 mb-2"><ImageIcon className="text-accent" /><h2 className="text-2xl font-bold">إعدادات العرض</h2></div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 }} className="bg-[var(--md-sys-color-surface)] p-8 rounded-[32px] shadow-sm border border-[var(--md-sys-color-outline-variant)]/20 space-y-3">
        
        {/* مظهر التطبيق */}
        <div className="p-4 bg-[var(--md-sys-color-surface-container)] rounded-2xl">
          <h4 style={{ fontSize: 'var(--md-sys-typescale-title-medium-size)', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>مظهر التطبيق</h4>
          <p style={{ fontSize: 'var(--md-sys-typescale-body-medium-size)', color: 'var(--md-sys-color-on-surface-variant)', marginTop: 4, overflowWrap: 'break-word', wordBreak: 'break-word' }}>اختر بين التصميم الكلاسيكي أو Material Design 3 الحديث.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => setTheme('classic')}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors duration-200 ${uiTheme === 'classic' ? 'bg-accent text-white shadow-md' : 'bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface-variant)] hover:opacity-80'}`}
            >
              كلاسيكي
            </button>
            <button
              onClick={() => setTheme('material3')}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors duration-200 ${uiTheme === 'material3' ? 'bg-accent text-white shadow-md' : 'bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface-variant)] hover:opacity-80'}`}
            >
              Material 3
            </button>
          </div>
        </div>

        {/* ألوان الثيم */}
        {uiTheme === 'material3' && (
          <div className="p-4 bg-[var(--md-sys-color-surface-container)] rounded-2xl">
            <h4 style={{ fontSize: 'var(--md-sys-typescale-title-medium-size)', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>ألوان الثيم</h4>
            <p style={{ fontSize: 'var(--md-sys-typescale-body-medium-size)', color: 'var(--md-sys-color-on-surface-variant)', marginTop: 4, overflowWrap: 'break-word', wordBreak: 'break-word' }}>خصص اللون الأساسي والثانوي لتصميم Material 3.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)]">أساسي</span>
                <div className="relative">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-10 h-10 rounded-xl border-2 border-[var(--md-sys-color-outline-variant)]/20 shadow-sm cursor-pointer hover:scale-110 transition-transform" style={{ backgroundColor: primaryColor }} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)]">ثانوي</span>
                <div className="relative">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-10 h-10 rounded-xl border-2 border-[var(--md-sys-color-outline-variant)]/20 shadow-sm cursor-pointer hover:scale-110 transition-transform" style={{ backgroundColor: secondaryColor }} />
                </div>
              </div>
              <button
                onClick={resetColors}
                className="p-2 rounded-xl bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface-variant)] hover:opacity-80 transition-opacity duration-200"
                title="إعادة تعيين الألوان"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        )}

        {/* إظهار الصور كاملة */}
        <div className="p-4 bg-[var(--md-sys-color-surface-container)] rounded-2xl">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ fontSize: 'var(--md-sys-typescale-title-medium-size)', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>إظهار الصور كاملة بدون قص</h4>
              <p style={{ fontSize: 'var(--md-sys-typescale-body-medium-size)', color: 'var(--md-sys-color-on-surface-variant)', marginTop: 4, overflowWrap: 'break-word', wordBreak: 'break-word' }}>عند التفعيل، تُعرض الصورة كاملة داخل بطاقة المنتج مع خلفية البطاقة حولها بدلاً من قصها لتناسب الإطار (object-fit: contain بدلاً من cover).</p>
            </div>
            <button
              onClick={() => { const next = !imageFitContain; setImageFitContain(next); localStorage.setItem('erp_image_fit', String(next)); }}
              className={`w-14 h-7 rounded-full relative transition-colors duration-200 shrink-0 ${imageFitContain ? 'bg-accent' : 'bg-[var(--md-sys-color-surface-container-highest)]'}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${imageFitContain ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </motion.div>

      <div className="flex items-center gap-2 mb-2"><Clock className="text-accent" /><h2 className="text-2xl font-bold">نقاط الاستعادة</h2></div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.13 }} className="bg-[var(--md-sys-color-surface)] p-8 rounded-[32px] shadow-sm border border-[var(--md-sys-color-outline-variant)]/20">
        <div className="p-4 bg-[var(--md-sys-color-surface-container)] rounded-2xl mb-4">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ fontSize: 'var(--md-sys-typescale-title-medium-size)', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>نقاط الاستعادة (Checkpoints)</h4>
              <p style={{ fontSize: 'var(--md-sys-typescale-body-medium-size)', color: 'var(--md-sys-color-on-surface-variant)', marginTop: 4, overflowWrap: 'break-word', wordBreak: 'break-word' }}>التقط لقطة سريعة للبيانات الحالية لاستعادتها لاحقاً عند الحاجة.</p>
            </div>
            <button
              onClick={() => { setCheckpointName(''); setShowCheckpointModal(true); }}
              className="flex items-center gap-2 px-5 py-3 bg-accent text-white font-black rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform duration-200 shrink-0"
            >
              <History size={18} /> إنشاء نقطة استعادة
            </button>
          </div>
        </div>

        {checkpoints.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-[var(--md-sys-color-outline-variant)]/20 rounded-[28px]">
            <Clock size={48} className="mx-auto mb-4 text-[var(--md-sys-color-on-surface-variant)]" />
            <p className="text-[var(--md-sys-color-on-surface-variant)] font-bold italic">لا توجد نقاط استعادة. أنشئ نقطة استعادة جديدة للاحتفاظ بنسخة من البيانات الحالية.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {checkpoints.map((cp, index) => (
              <motion.div
                key={cp.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent shrink-0">
                      <Clock size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-black text-sm text-[var(--md-sys-color-on-surface)] block">{cp.name}</span>
                      <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] font-bold">{new Date(cp.created_at).toLocaleString('ar-EG')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleRestoreCheckpoint(cp.id, cp.name)}
                      className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors duration-200"
                      title="استعادة"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteCheckpoint(cp.id, cp.name)}
className="p-2 text-[var(--md-sys-color-on-surface-variant)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <MD3Dialog
          isOpen={showCheckpointModal}
          onClose={() => setShowCheckpointModal(false)}
          title="إنشاء نقطة استعادة جديدة"
          maxWidth="sm"
          actions={[
            { label: 'إنشاء', onClick: handleCreateCheckpoint, variant: 'filled' },
            { label: 'إلغاء', onClick: () => setShowCheckpointModal(false), variant: 'text' }
          ]}
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest px-2">اسم نقطة الاستعادة</label>
              <input
                type="text"
                value={checkpointName}
                onChange={e => setCheckpointName(e.target.value)}
                placeholder="مثال: قبل تحديث الأسعار"
                className="w-full p-4 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-2xl font-bold outline-none focus:border-[var(--md-sys-color-primary)]"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && !checkpointLoading) handleCreateCheckpoint(); }}
              />
            </div>
          </div>
        </MD3Dialog>
      </motion.div>

      <div className="flex items-center gap-2 mb-2"><Printer className="text-accent" /><h2 className="text-2xl font-bold">إعدادات الفاتورة</h2></div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.14 }} className="bg-[var(--md-sys-color-surface)] p-8 rounded-[32px] shadow-sm border border-[var(--md-sys-color-outline-variant)]/20">
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-black text-sm">روابط QR</h4>
            <div className="p-4 bg-[var(--md-sys-color-surface-container)] rounded-2xl space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)]">سياسة الاستبدال والاسترجاع</label>
                  <input
                    value={state.invoiceSettings?.exchangeReturnUrl || ''}
                    onChange={async (e) => {
                      const val = e.target.value;
                      onUpdateState({ invoiceSettings: { ...state.invoiceSettings, exchangeReturnUrl: val } as any });
                      await saveInvoiceSettings({ exchangeReturnUrl: val });
                    }}
                    
                    className="w-full px-4 py-2.5 rounded-2xl text-xs font-bold border border-[var(--md-sys-color-outline-variant)]/20 bg-[var(--md-sys-color-surface)]"
                    placeholder="https://..."
                  />
                </div>
                <button
                  onClick={async () => {
                    const updated = { ...state.invoiceSettings, showExchangeReturnQr: !state.invoiceSettings?.showExchangeReturnQr } as any;
                    onUpdateState({ invoiceSettings: updated });
                    await saveInvoiceSettings({ showExchangeReturnQr: !state.invoiceSettings?.showExchangeReturnQr });
                  }}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-200 shrink-0 ${state.invoiceSettings?.showExchangeReturnQr ? 'bg-accent' : 'bg-[var(--md-sys-color-surface-container-highest)]'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${state.invoiceSettings?.showExchangeReturnQr ? 'left-6.5' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)]">سياسة الشحن</label>
                  <input
                    value={state.invoiceSettings?.shippingUrl || ''}
                    onChange={async (e) => {
                      const val = e.target.value;
                      onUpdateState({ invoiceSettings: { ...state.invoiceSettings, shippingUrl: val } as any });
                      await saveInvoiceSettings({ shippingUrl: val });
                    }}
                    
                    className="w-full px-4 py-2.5 rounded-2xl text-xs font-bold border border-[var(--md-sys-color-outline-variant)]/20 bg-[var(--md-sys-color-surface)]"
                    placeholder="https://..."
                  />
                </div>
                <button
                  onClick={async () => {
                    const updated = { ...state.invoiceSettings, showShippingQr: !state.invoiceSettings?.showShippingQr } as any;
                    onUpdateState({ invoiceSettings: updated });
                    await saveInvoiceSettings({ showShippingQr: !state.invoiceSettings?.showShippingQr });
                  }}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-200 shrink-0 ${state.invoiceSettings?.showShippingQr ? 'bg-accent' : 'bg-[var(--md-sys-color-surface-container-highest)]'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${state.invoiceSettings?.showShippingQr ? 'left-6.5' : 'left-0.5'}`} />
                </button>
              </div>

            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-black text-sm">نص تذييل الفاتورة</h4>
            <div className="p-4 bg-[var(--md-sys-color-surface-container)] rounded-2xl space-y-3">
              <textarea
                value={state.invoiceSettings?.footerText || ''}
                  onChange={async (e) => {
                      const val = e.target.value;
                      onUpdateState({ invoiceSettings: { ...state.invoiceSettings, footerText: val } as any });
                      await saveInvoiceSettings({ footerText: val });
                  }}
                
                className="w-full px-4 py-3 rounded-2xl text-xs font-bold border border-[var(--md-sys-color-outline-variant)]/20 bg-[var(--md-sys-color-surface)] min-h-[80px] resize-y"
                placeholder="أي إيضاحات إضافية تظهر أسفل الفاتورة..."
                dir="rtl"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)]">إظهار النص في الفاتورة</span>
                <button
                  onClick={async () => {
                    const updated = { ...state.invoiceSettings, showFooterText: !state.invoiceSettings?.showFooterText } as any;
                    onUpdateState({ invoiceSettings: updated });
                    await saveInvoiceSettings({ showFooterText: !state.invoiceSettings?.showFooterText });
                  }}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-200 shrink-0 ${state.invoiceSettings?.showFooterText ? 'bg-accent' : 'bg-[var(--md-sys-color-surface-container-highest)]'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${state.invoiceSettings?.showFooterText ? 'left-6.5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-black text-sm">روابط التواصل الاجتماعي</h4>
              <div className="p-4 bg-[var(--md-sys-color-surface-container)] rounded-2xl space-y-3">
                {(state.invoiceSettings?.socialLinks || []).map((link, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={link.platform}
                      onChange={async (e) => {
                        const updated = [...(state.invoiceSettings?.socialLinks || [])];
                        updated[idx] = { ...updated[idx], platform: e.target.value };
                        onUpdateState({ invoiceSettings: { ...state.invoiceSettings, socialLinks: updated } as any });
                        await saveInvoiceSettings({ socialLinks: updated });
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-bold border border-[var(--md-sys-color-outline-variant)]/20 bg-[var(--md-sys-color-surface)]"
                    >
                      <option value="store">المتجر</option>
                      <option value="facebook">فيسبوك</option>
                      <option value="instagram">إنستغرام</option>
                      <option value="whatsapp">واتساب</option>
                      <option value="tiktok">تيك توك</option>
                      <option value="youtube">يوتيوب</option>
                      <option value="x">X (تويتر)</option>
                      <option value="linkedin">لينكد إن</option>
                      <option value="snapchat">سناب شات</option>
                      <option value="telegram">تيليغرام</option>
                    </select>
                    <input
                      value={link.url}
                      onChange={async (e) => {
                        const updated = [...(state.invoiceSettings?.socialLinks || [])];
                        updated[idx] = { ...updated[idx], url: e.target.value };
                        onUpdateState({ invoiceSettings: { ...state.invoiceSettings, socialLinks: updated } as any });
                        await saveInvoiceSettings({ socialLinks: updated });
                      }}
                      className="flex-1 px-3 py-2 rounded-xl text-xs font-bold border border-[var(--md-sys-color-outline-variant)]/20 bg-[var(--md-sys-color-surface)]"
                      placeholder="https://..."
                    />
                    <button
                      onClick={async () => {
                        const updated = (state.invoiceSettings?.socialLinks || []).filter((_, i) => i !== idx);
                        onUpdateState({ invoiceSettings: { ...state.invoiceSettings, socialLinks: updated } as any });
                        await saveInvoiceSettings({ socialLinks: updated });
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors duration-200"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={async () => {
                    const updated = [...(state.invoiceSettings?.socialLinks || []), { platform: 'facebook', url: '' }];
                    onUpdateState({ invoiceSettings: { ...state.invoiceSettings, socialLinks: updated } as any });
                    await saveInvoiceSettings({ socialLinks: updated });
                  }}
className="w-full px-4 py-2 bg-[var(--md-sys-color-surface)] border border-accent/20 text-accent font-bold rounded-xl text-xs hover:bg-accent hover:text-white transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Plus size={14} />
                  إضافة رابط تواصل
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)]">إظهار QR التواصل في الفاتورة</span>
                <button
                  onClick={async () => {
                    onUpdateState({ invoiceSettings: { ...state.invoiceSettings, showSocialQr: !state.invoiceSettings?.showSocialQr } as any });
                    await saveInvoiceSettings({ showSocialQr: !state.invoiceSettings?.showSocialQr });
                  }}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-200 shrink-0 ${state.invoiceSettings?.showSocialQr ? 'bg-accent' : 'bg-[var(--md-sys-color-surface-container-highest)]'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${state.invoiceSettings?.showSocialQr ? 'left-6.5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

      <div className="flex items-center gap-2 mb-2"><Sparkles className="text-accent" /><h2 className="text-2xl font-bold">إدارة مفاتيح AI API</h2></div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="bg-[var(--md-sys-color-surface)] p-8 rounded-[32px] shadow-sm border border-[var(--md-sys-color-outline-variant)]/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-black">مفاتيح الذكاء الاصطناعي</h3>
            <p className="text-[var(--md-sys-color-on-surface-variant)] text-xs mt-1">أضف عدة مفاتيح API لضمان عمل المساعد الذكي. عند استهلاك حصة أحد المفاتيح، سيتحول النظام تلقائياً للمفتاح التالي.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowKeys(!showKeys)} className="p-3 text-[var(--md-sys-color-on-surface-variant)] hover:text-accent rounded-xl hover:bg-[var(--md-sys-color-surface-container)] transition-colors duration-200">
              {showKeys ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <MD3Button
              variant="filled"
              icon={<Plus size={18} />}
              onClick={() => { setEditingAiKeyIndex(null); setAiKeyInput(''); setShowAiKeyInput(true); }}
            >
              إضافة مفتاح
            </MD3Button>
          </div>
        </div>

        {aiKeys.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-[var(--md-sys-color-outline-variant)]/20 rounded-[28px]">
            <Key size={48} className="mx-auto mb-4 text-[var(--md-sys-color-on-surface-variant)]" />
            <p className="text-[var(--md-sys-color-on-surface-variant)] font-bold italic">لا توجد مفاتيح API بعد. أضف مفتاحاً جديداً لتفعيل المساعد الذكي.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {aiKeys.map((key, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-2xl border transition-colors duration-200 ${index === 0 ? 'bg-accent/5 border-accent/20 ring-1 ring-accent/10' : 'bg-[var(--md-sys-color-surface-container)] border-[var(--md-sys-color-outline-variant)]/20'}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${index === 0 ? 'bg-accent text-white' : 'bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface-variant)] border border-[var(--md-sys-color-outline-variant)]/20'}`}>
                      {index === 0 ? <Check size={20} strokeWidth={3} /> : <span className="font-black text-sm">{index + 1}</span>}
                    </div>
                    {editingAiKeyIndex === index ? (
                      <div className="flex-1 min-w-0 flex gap-2">
                        <input
                          type="text"
                          value={aiKeyInput}
                          onChange={e => setAiKeyInput(e.target.value)}
                          className="flex-1 p-2.5 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-xl font-mono text-xs outline-none focus:border-[var(--md-sys-color-primary)]"
                          placeholder="أدخل المفتاح..."
                          autoFocus
                        />
                        <button onClick={() => handleUpdateAiKey(index)} className="px-3 py-2 bg-accent text-white rounded-xl font-black text-xs"><Save size={16} /></button>
                        <button onClick={() => { setEditingAiKeyIndex(null); setAiKeyInput(''); }} className="px-3 py-2 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface-variant)] rounded-xl"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-[var(--md-sys-color-on-surface)] ltr block truncate" dir="ltr">{maskKey(key)}</span>
                          {index === 0 && <span className="text-[9px] bg-accent/10 text-accent px-2 py-0.5 rounded-lg font-black">أساسي</span>}
                        </div>
                        <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] font-bold">المفتاح #{index + 1}</span>
                      </div>
                    )}
                  </div>
                    {editingAiKeyIndex !== index && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => handleReorderAiKey(index, 'up')}
                        disabled={index === 0}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center p-1.5 text-accent dark:text-accent-light hover:text-accent-dark disabled:opacity-20 disabled:cursor-not-allowed rounded-lg hover:bg-accent/10 dark:hover:bg-accent/20 transition-colors duration-200"
                        title="تحريك لأعلى"
                      >
                        <ArrowUp size={18} strokeWidth={3} />
                      </button>
                      <button
                        onClick={() => handleReorderAiKey(index, 'down')}
                        disabled={index === aiKeys.length - 1}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center p-1.5 text-accent dark:text-accent-light hover:text-accent-dark disabled:opacity-20 disabled:cursor-not-allowed rounded-lg hover:bg-accent/10 dark:hover:bg-accent/20 transition-colors duration-200"
                        title="تحريك لأسفل"
                      >
                        <ArrowDown size={18} strokeWidth={3} />
                      </button>
                      <button
                        onClick={() => { setEditingAiKeyIndex(index); setAiKeyInput(key); }}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center p-1.5 text-[var(--md-sys-color-on-surface-variant)] hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200"
                        title="تعديل"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteAiKey(index)}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center p-1.5 text-[var(--md-sys-color-on-surface-variant)] hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {showAiKeyInput && editingAiKeyIndex === null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-4"
            >
              <div className="p-4 bg-[var(--md-sys-color-surface-container)] rounded-2xl border border-[var(--md-sys-color-outline-variant)]/20">
                <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest px-1 mb-2 block">مفتاح API جديد</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiKeyInput}
                    onChange={e => setAiKeyInput(e.target.value)}
                    className="flex-1 p-3 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-xl font-mono text-sm outline-none focus:border-[var(--md-sys-color-primary)]"
                    placeholder="AIzaSyBdEQUeSZNvFwEB3R9biVHMS9fjusZut8A"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleAddAiKey(); }}
                  />
                  <button onClick={handleAddAiKey} className="px-6 py-3 bg-accent text-white rounded-xl font-black shadow-lg hover:opacity-90 transition-opacity duration-200">إضافة</button>
                  <button onClick={() => { setShowAiKeyInput(false); setAiKeyInput(''); }} className="px-4 py-3 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface-variant)] rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors duration-200"><X size={20} /></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {aiKeys.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--md-sys-color-outline-variant)]/20 text-center">
            <p className="text-[10px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
              <span className="text-accent">{aiKeys.length}</span> مفتاح متاح
              {aiKeys.length > 1 && <span className="opacity-60"> — الترتيب من الأعلى إلى الأسفل يحدد أولوية الاستخدام</span>}
            </p>
          </div>
        )}
      </motion.div>

      <div className="flex items-center gap-2 mb-2"><Tag className="text-accent" /><h2 className="text-2xl font-bold">الكوبونات</h2></div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.16 }} className="bg-[var(--md-sys-color-surface)] p-8 rounded-[32px] shadow-sm border border-[var(--md-sys-color-outline-variant)]/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-black">إدارة كوبونات الخصم</h3>
            <p className="text-[var(--md-sys-color-on-surface-variant)] text-xs mt-1">أضف كوبونات الخصم وحدد قيمتها ونوع الخصم (نسبة مئوية أو مبلغ ثابت).</p>
          </div>
          <button
            onClick={() => { setShowCouponInput(!showCouponInput); setNewCouponCode(''); setNewCouponDiscount(0); setNewCouponIsPercent(true); }}
            className="flex items-center gap-2 px-5 py-3 bg-accent text-white font-black rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform duration-200"
          >
            <Plus size={18} /> إضافة كوبون جديد
          </button>
        </div>

        {coupons.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-[var(--md-sys-color-outline-variant)]/20 rounded-[28px]">
            <Percent size={48} className="mx-auto mb-4 text-[var(--md-sys-color-on-surface-variant)]" />
            <p className="text-[var(--md-sys-color-on-surface-variant)] font-bold italic">لا توجد كوبونات مسجلة. أضف كوبوناً جديداً.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {coupons.map((c, index) => (
              <motion.div
                key={c.code}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Tag size={16} className="text-accent shrink-0" />
                    <span className="font-black text-sm text-[var(--md-sys-color-on-surface)] min-w-[70px]">{c.code}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        defaultValue={c.discount}
                        onBlur={e => {
                          const val = Number(e.target.value);
                          if (val !== c.discount) {
                            setCoupons(prev => prev.map(x => x.code === c.code ? { ...x, discount: val } : x));
                            handleUpdateCoupon(c.code, val, c.is_percent);
                          }
                        }}
                        className="w-20 p-2 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-xl font-bold text-center text-sm"
                      />
                      <button
                        onClick={() => {
                          const next = !c.is_percent;
                          setCoupons(prev => prev.map(x => x.code === c.code ? { ...x, is_percent: next } : x));
                          handleUpdateCoupon(c.code, c.discount, next);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors duration-200 ${c.is_percent ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}
                      >
                        {c.is_percent ? <><Percent size={12} className="inline" /> %</> : 'ج.م'}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCoupon(c.code)}
                    className="p-2 text-[var(--md-sys-color-on-surface-variant)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                    title="حذف الكوبون"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {showCouponInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-4"
            >
              <div className="p-4 bg-[var(--md-sys-color-surface-container)] rounded-2xl border border-[var(--md-sys-color-outline-variant)]/20">
                <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest px-1 mb-2 block">كوبون جديد</label>
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    value={newCouponCode}
                    onChange={e => setNewCouponCode(e.target.value)}
                    className="flex-1 min-w-[120px] p-3 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-xl font-bold text-sm outline-none focus:border-[var(--md-sys-color-primary)]"
                    placeholder="كود الكوبون"
                    onKeyDown={e => { if (e.key === 'Enter') handleAddCoupon(); }}
                  />
                  <input
                    type="number"
                    value={newCouponDiscount}
                    onChange={e => setNewCouponDiscount(Number(e.target.value))}
                    className="w-24 p-3 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-xl font-bold text-center outline-none focus:border-[var(--md-sys-color-primary)]"
                    placeholder="القيمة"
                  />
                  <button
                    onClick={() => setNewCouponIsPercent(!newCouponIsPercent)}
                    className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors duration-200 ${newCouponIsPercent ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}
                  >
                    {newCouponIsPercent ? <><Percent size={14} className="inline" /> %</> : 'ج.م'}
                  </button>
                  <button onClick={handleAddCoupon} className="px-6 py-3 bg-accent text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition-opacity duration-200">إضافة</button>
                  <button onClick={() => { setShowCouponInput(false); setNewCouponCode(''); }} className="px-4 py-3 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface-variant)] rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors duration-200"><X size={20} /></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {coupons.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--md-sys-color-outline-variant)]/20 text-center">
            <p className="text-[10px] font-bold text-[var(--md-sys-color-on-surface-variant)]"><span className="text-accent">{coupons.length}</span> كوبون مسجل</p>
          </div>
        )}
      </motion.div>



      <div className="flex items-center gap-2 mb-2"><Database className="text-accent" /><h2 className="text-2xl font-bold">إدارة البيانات</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-[var(--md-sys-color-surface)] p-8 rounded-3xl shadow-sm border flex flex-col items-center text-center gap-4">
          <Download size={32} className="text-blue-600" />
          <h3 className="text-xl font-black">تصدير نسخة احتياطية</h3>
          <MD3Button variant="filled" fullWidth onClick={handleExport}>تحميل ملف البيانات</MD3Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-[var(--md-sys-color-surface)] p-8 rounded-3xl shadow-sm border flex flex-col items-center text-center gap-4">
          <Upload size={32} className="text-amber-600" />
          <h3 className="text-xl font-black">استعادة البيانات</h3>
          <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
          <MD3Button variant="outlined" fullWidth onClick={() => fileInputRef.current?.click()}>رفع ملف البيانات</MD3Button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default React.memo(Settings);
