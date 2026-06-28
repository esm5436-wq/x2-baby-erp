import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Upload, Database, AlertCircle, AlertTriangle, Check, Clock, Palette, Image as ImageIcon, Trash2, Save, Tag, Plus, ChevronDown, ChevronRight, Edit2, Sparkles, Key, ArrowUp, ArrowDown, Eye, EyeOff, X, Printer, Percent, RotateCcw, History } from 'lucide-react';
import { AppState, Category } from '../types';
import { compressImage } from '../lib/imageUtils';

interface SettingsProps {
  state: AppState;
  onImport: (newState: AppState) => void;
  onUpdateState: (update: Partial<AppState>) => void;
}

const API_BASE = '/api';

const Settings: React.FC<SettingsProps> = ({ state, onImport, onUpdateState }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sloganDesignInputRef = useRef<HTMLInputElement>(null);
  const thankYouInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
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



  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    setNotification({ message, type });
    notificationTimerRef.current = setTimeout(() => {
      setNotification(null);
      notificationTimerRef.current = null;
    }, 3000);
  };

  // Category Management State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<{name: string, parentId: string | null}>({ name: '', parentId: null });

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) return;
    
    try {
      if (editingCategory) {
        await fetch(`${API_BASE}/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(categoryForm)
        });
        onUpdateState({
          categories: state.categories.map(c => c.id === editingCategory.id ? { ...c, ...categoryForm } : c)
        });
        showNotification('تم تحديث التصنيف بنجاح', 'success');
      } else {
        const newCat: Category = {
          id: `cat-${Date.now()}`,
          name: categoryForm.name,
          parentId: categoryForm.parentId
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
      setCategoryForm({ name: '', parentId: null });
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
            return { ...p, category: '' };
          }
          return p;
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="space-y-8 relative p-4 sm:p-8"
    >
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -50, x: '-50%' }} className={`fixed top-6 left-1/2 z-[300] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}><Check size={24} /> <span className="font-bold">{notification.message}</span></motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingImport && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setPendingImport(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 rounded-[32px] p-8 max-w-md w-full shadow-2xl relative z-10 space-y-6">
              <h3 className="text-2xl font-black text-center">خيارات استعادة البيانات</h3>
              <div className="space-y-3">
                <button onClick={() => executeImport('merge')} className="w-full p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600 font-bold block text-center">دمج البيانات (Merge)</button>
                {confirmReplaceMode ? (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-500 border-dashed text-center">
                    <p className="text-xs text-red-600 mb-3 font-bold underline">سيتم مسح البيانات الحالية بالكامل!</p>
                    <button onClick={() => executeImport('replace')} className="w-full py-3 bg-red-600 text-white rounded-xl font-bold">تأكيد الاستبدال الكامل</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmReplaceMode(true)} className="w-full p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl text-red-600 font-bold block text-center">استبدال الكل (Replace)</button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 mb-2"><Palette className="text-accent" /><h2 className="text-2xl font-bold">الهوية البصرية</h2></div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8">
        <div className="w-40 h-40 bg-white rounded-[40px] border flex items-center justify-center overflow-hidden shadow-xl ring-8 ring-gray-50/50">
          {state.brandLogo ? <img src={state.brandLogo} className="w-full h-full object-contain p-4" /> : <ImageIcon size={40} className="text-gray-400 dark:text-gray-500" />}
        </div>
        <div className="flex-1 text-center md:text-right space-y-4">
          <h3 className="text-xl font-black">شعار المتجر (Logo)</h3>
          <p className="text-gray-500 text-sm">يظهر الشعار في المساعد الذكي والتقارير وفواتير النظام.</p>
          
          <div className="space-y-4">
            <div className="space-y-2 text-right">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">اسم النشاط التجاري</label>
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
                className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-accent"
              />
            </div>
            
            <div className="space-y-2 text-right">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">الشعار اللفظي (Slogan)</label>
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
                className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-2 text-right p-4 bg-accent/5 rounded-2xl border border-accent/10">
              <label className="text-[10px] font-black text-accent uppercase tracking-widest px-2">تصميم الشعار اللفظي (Image Slogan)</label>
              <p className="text-[10px] text-gray-400 mb-2 px-2">إذا كان لديك تصميم جاهز للشعار اللفظي، يمكنك رفعه هنا ليظهر فوق زر الوضع الليلي.</p>
              
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
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
              
              <input type="file" ref={sloganDesignInputRef} className="hidden" accept="image/*" onChange={handleSloganDesignUpload} />
              <button 
                onClick={() => sloganDesignInputRef.current?.click()}
                className="w-full md:w-auto px-4 py-2 bg-white dark:bg-slate-800 border border-accent/20 text-accent font-bold rounded-xl text-xs hover:bg-accent hover:text-white transition-all flex items-center justify-center gap-2"
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
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
              <input type="file" ref={thankYouInputRef} className="hidden" accept="image/*" onChange={handleThankYouUpload} />
              <button
                onClick={() => thankYouInputRef.current?.click()}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-accent/20 text-accent font-bold rounded-xl text-xs hover:bg-accent hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Upload size={14} />
                {state.invoiceSettings?.thankYouImage ? 'تغيير الصورة' : 'رفع صورة شكراً لك'}
              </button>
            </div>
          </div>

          <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
          <button onClick={() => logoInputRef.current?.click()} className="px-6 py-3 bg-accent text-white font-black rounded-2xl shadow-md hover:opacity-90">تغيير صورة الشعار</button>
        </div>
      </motion.div>

      <div className="flex items-center gap-2 mb-2"><Tag className="text-accent" /><h2 className="text-2xl font-bold">إدارة التصنيفات</h2></div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black">شجرة التصنيفات</h3>
            <p className="text-gray-500 text-xs mt-1">هنا يمكنك إضافة التصنيفات الأساسية (مثل: أطفال) والتصنيفات الفرعية (مثل: سالوبيتات).</p>
          </div>
          <button 
            onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', parentId: null }); setIsCategoryModalOpen(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-accent text-white font-black rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={18} /> إضافة تصنيف جديد
          </button>
        </div>

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {state.categories.filter(c => !c.parentId).map(mainCat => (
            <div key={mainCat.id} className="bg-gray-50/50 dark:bg-slate-800/30 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
              <div className="p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                    <Tag size={18} />
                  </div>
                  <span className="font-black text-gray-900 dark:text-white">{mainCat.name}</span>
                  <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-bold">قسم أساسي</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setEditingCategory(mainCat); setCategoryForm({ name: mainCat.name, parentId: mainCat.parentId || null }); setIsCategoryModalOpen(true); }}
                    className="p-2 text-gray-400 hover:text-accent hover:bg-white dark:hover:bg-slate-900 rounded-lg transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteCategory(mainCat.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-900 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              {/* Sub-categories */}
              <div className="border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                {state.categories.filter(c => c.parentId === mainCat.id).map(subCat => (
                  <div key={subCat.id} className="p-3 pr-12 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border-b last:border-0 border-gray-50 dark:border-slate-800/50">
                    <div className="flex items-center gap-2">
                      <ChevronRight size={14} className="text-gray-400 dark:text-gray-500" />
                      <span className="font-bold text-sm text-gray-600 dark:text-gray-400">{subCat.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => { setEditingCategory(subCat); setCategoryForm({ name: subCat.name, parentId: subCat.parentId || null }); setIsCategoryModalOpen(true); }}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-accent rounded-md transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(subCat.id)}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 rounded-md transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {state.categories.filter(c => c.parentId === mainCat.id).length === 0 && (
                  <button 
                    onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', parentId: mainCat.id }); setIsCategoryModalOpen(true); }}
                    className="w-full text-right p-3 pr-12 text-[10px] font-black text-gray-400 hover:text-accent transition-all italic"
                  >
                    + إضافة قسم فرعي لـ "{mainCat.name}"
                  </button>
                )}
                {state.categories.filter(c => c.parentId === mainCat.id).length > 0 && (
                  <button 
                    onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', parentId: mainCat.id }); setIsCategoryModalOpen(true); }}
                    className="w-full text-right p-2 pr-12 text-[9px] font-black text-accent/50 hover:text-accent transition-all"
                  >
                    + إضافة قسم فرعي
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {state.categories.filter(c => !c.parentId).length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-[32px]">
              <Tag size={48} className="mx-auto mb-4 text-gray-200" />
              <p className="text-gray-400 font-bold italic">لا توجد أقسام مسجلة. ابدأ بإضافة قسم أساسي.</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Category Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCategoryModalOpen(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white dark:bg-slate-900 rounded-[32px] p-8 max-w-md w-full shadow-2xl relative z-10 text-right">
              <h3 className="text-2xl font-black mb-6">{editingCategory ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}</h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">اسم التصنيف</label>
                  <input 
                    type="text" 
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="مثال: سالوبيتات مواليد، أطقم خروج..." 
                    className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">التصنيف الأساسي (اتركه فارغاً إذا كان تصنيفاً رئيساً)</label>
                  <select 
                    value={categoryForm.parentId || ''}
                    onChange={(e) => setCategoryForm({ ...categoryForm, parentId: e.target.value || null })}
                    className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-accent"
                  >
                    <option value="">-- تصنيف أساسي --</option>
                    {state.categories.filter(c => !c.parentId && (!editingCategory || c.id !== editingCategory.id)).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={handleSaveCategory}
                    className="flex-1 py-4 bg-accent text-white font-black rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    حفظ
                  </button>
                  <button 
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="flex-1 py-4 bg-gray-50 dark:bg-slate-800 text-gray-400 font-black rounded-2xl"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 mb-2"><AlertTriangle className="text-orange-500" /><h2 className="text-2xl font-bold">الإعدادات المالية</h2></div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl mb-4">
          <div><h4 className="font-black">تفعيل نظام الضريبة</h4><p className="text-xs text-gray-400">حساب الربح الصافي بعد الضريبة</p></div>
          <button onClick={handleTaxToggle} className={`w-14 h-7 rounded-full relative transition-all ${state.taxEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${state.taxEnabled ? 'left-8' : 'left-1'}`} /></button>
        </div>
        {state.taxEnabled && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 flex gap-2">
            <input type="number" value={taxRateInput} onChange={(e) => setTaxRateInput(e.target.value)} className="flex-1 bg-white dark:bg-slate-900 border rounded-xl px-4 py-2 font-black" />
            <button onClick={handleTaxRateSave} className="px-6 py-2 bg-blue-600 text-white font-black rounded-xl">حفظ</button>
          </div>
        )}
      </motion.div>

      <div className="flex items-center gap-2 mb-2"><ImageIcon className="text-accent" /><h2 className="text-2xl font-bold">إعدادات العرض</h2></div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 }} className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
          <div>
            <h4 className="font-black">إظهار الصور كاملة بدون قص</h4>
            <p className="text-xs text-gray-400 mt-1">عند التفعيل، تُعرض الصورة كاملة داخل بطاقة المنتج مع خلفية البطاقة حولها بدلاً من قصها لتناسب الإطار (object-fit: contain بدلاً من cover). مفيد عندما تريد رؤية المنتج كاملاً دون فقدان أجزاء من الصورة.</p>
          </div>
          <button
            onClick={() => { const next = !imageFitContain; setImageFitContain(next); localStorage.setItem('erp_image_fit', String(next)); }}
            className={`w-14 h-7 rounded-full relative transition-all shrink-0 ${imageFitContain ? 'bg-accent' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${imageFitContain ? 'left-8' : 'left-1'}`} />
          </button>
        </div>
      </motion.div>

      <div className="flex items-center gap-2 mb-2"><Clock className="text-accent" /><h2 className="text-2xl font-bold">نقاط الاستعادة</h2></div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.13 }} className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-black">نقاط الاستعادة (Checkpoints)</h3>
            <p className="text-gray-500 text-xs mt-1">التقط لقطة سريعة للبيانات الحالية لاستعادتها لاحقاً عند الحاجة.</p>
          </div>
          <button
            onClick={() => { setCheckpointName(''); setShowCheckpointModal(true); }}
            className="flex items-center gap-2 px-5 py-3 bg-accent text-white font-black rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <History size={18} /> إنشاء نقطة استعادة
          </button>
        </div>

        {checkpoints.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-[28px]">
            <Clock size={48} className="mx-auto mb-4 text-gray-200 dark:text-slate-700" />
            <p className="text-gray-400 font-bold italic">لا توجد نقاط استعادة. أنشئ نقطة استعادة جديدة للاحتفاظ بنسخة من البيانات الحالية.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {checkpoints.map((cp, index) => (
              <motion.div
                key={cp.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="p-4 rounded-2xl bg-gray-50/50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent shrink-0">
                      <Clock size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-black text-sm text-gray-900 dark:text-white block">{cp.name}</span>
                      <span className="text-[10px] text-gray-400 font-bold">{new Date(cp.created_at).toLocaleString('ar-EG')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleRestoreCheckpoint(cp.id, cp.name)}
                      className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-all"
                      title="استعادة"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteCheckpoint(cp.id, cp.name)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
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

        <AnimatePresence>
          {showCheckpointModal && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowCheckpointModal(false)} />
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white dark:bg-slate-900 rounded-[32px] p-8 max-w-md w-full shadow-2xl relative z-10 text-right">
                <h3 className="text-2xl font-black mb-6">إنشاء نقطة استعادة جديدة</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">اسم نقطة الاستعادة</label>
                    <input
                      type="text"
                      value={checkpointName}
                      onChange={e => setCheckpointName(e.target.value)}
                      placeholder="مثال: قبل تحديث الأسعار"
                      className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-accent"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter' && !checkpointLoading) handleCreateCheckpoint(); }}
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={handleCreateCheckpoint}
                      disabled={checkpointLoading || !checkpointName.trim()}
                      className="flex-1 py-4 bg-accent text-white font-black rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {checkpointLoading ? 'جاري الحفظ...' : 'إنشاء'}
                    </button>
                    <button
                      onClick={() => setShowCheckpointModal(false)}
                      className="flex-1 py-4 bg-gray-50 dark:bg-slate-800 text-gray-400 font-black rounded-2xl"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="flex items-center gap-2 mb-2"><Printer className="text-accent" /><h2 className="text-2xl font-bold">إعدادات الفاتورة</h2></div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.14 }} className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800">
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-black text-sm">روابط QR</h4>
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-bold text-gray-500">سياسة الاستبدال والاسترجاع</label>
                  <input
                    value={state.invoiceSettings?.exchangeReturnUrl || ''}
                    onChange={async (e) => {
                      const val = e.target.value;
                      onUpdateState({ invoiceSettings: { ...state.invoiceSettings, exchangeReturnUrl: val } as any });
                      await saveInvoiceSettings({ exchangeReturnUrl: val });
                    }}
                    
                    className="w-full px-4 py-2.5 rounded-2xl text-xs font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    placeholder="https://..."
                  />
                </div>
                <button
                  onClick={async () => {
                    const updated = { ...state.invoiceSettings, showExchangeReturnQr: !state.invoiceSettings?.showExchangeReturnQr } as any;
                    onUpdateState({ invoiceSettings: updated });
                    await saveInvoiceSettings({ showExchangeReturnQr: !state.invoiceSettings?.showExchangeReturnQr });
                  }}
                  className={`w-12 h-6 rounded-full relative transition-all shrink-0 ${state.invoiceSettings?.showExchangeReturnQr ? 'bg-accent' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${state.invoiceSettings?.showExchangeReturnQr ? 'left-6.5' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-bold text-gray-500">سياسة الشحن</label>
                  <input
                    value={state.invoiceSettings?.shippingUrl || ''}
                    onChange={async (e) => {
                      const val = e.target.value;
                      onUpdateState({ invoiceSettings: { ...state.invoiceSettings, shippingUrl: val } as any });
                      await saveInvoiceSettings({ shippingUrl: val });
                    }}
                    
                    className="w-full px-4 py-2.5 rounded-2xl text-xs font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    placeholder="https://..."
                  />
                </div>
                <button
                  onClick={async () => {
                    const updated = { ...state.invoiceSettings, showShippingQr: !state.invoiceSettings?.showShippingQr } as any;
                    onUpdateState({ invoiceSettings: updated });
                    await saveInvoiceSettings({ showShippingQr: !state.invoiceSettings?.showShippingQr });
                  }}
                  className={`w-12 h-6 rounded-full relative transition-all shrink-0 ${state.invoiceSettings?.showShippingQr ? 'bg-accent' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${state.invoiceSettings?.showShippingQr ? 'left-6.5' : 'left-0.5'}`} />
                </button>
              </div>

            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-black text-sm">نص تذييل الفاتورة</h4>
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl space-y-3">
              <textarea
                value={state.invoiceSettings?.footerText || ''}
                  onChange={async (e) => {
                      const val = e.target.value;
                      onUpdateState({ invoiceSettings: { ...state.invoiceSettings, footerText: val } as any });
                      await saveInvoiceSettings({ footerText: val });
                  }}
                
                className="w-full px-4 py-3 rounded-2xl text-xs font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 min-h-[80px] resize-y"
                placeholder="أي إيضاحات إضافية تظهر أسفل الفاتورة..."
                dir="rtl"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">إظهار النص في الفاتورة</span>
                <button
                  onClick={async () => {
                    const updated = { ...state.invoiceSettings, showFooterText: !state.invoiceSettings?.showFooterText } as any;
                    onUpdateState({ invoiceSettings: updated });
                    await saveInvoiceSettings({ showFooterText: !state.invoiceSettings?.showFooterText });
                  }}
                  className={`w-12 h-6 rounded-full relative transition-all shrink-0 ${state.invoiceSettings?.showFooterText ? 'bg-accent' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${state.invoiceSettings?.showFooterText ? 'left-6.5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-black text-sm">روابط التواصل الاجتماعي</h4>
              <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl space-y-3">
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
                      className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
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
                      className="flex-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      placeholder="https://..."
                    />
                    <button
                      onClick={async () => {
                        const updated = (state.invoiceSettings?.socialLinks || []).filter((_, i) => i !== idx);
                        onUpdateState({ invoiceSettings: { ...state.invoiceSettings, socialLinks: updated } as any });
                        await saveInvoiceSettings({ socialLinks: updated });
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
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
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-accent/20 text-accent font-bold rounded-xl text-xs hover:bg-accent hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} />
                  إضافة رابط تواصل
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">إظهار QR التواصل في الفاتورة</span>
                <button
                  onClick={async () => {
                    onUpdateState({ invoiceSettings: { ...state.invoiceSettings, showSocialQr: !state.invoiceSettings?.showSocialQr } as any });
                    await saveInvoiceSettings({ showSocialQr: !state.invoiceSettings?.showSocialQr });
                  }}
                  className={`w-12 h-6 rounded-full relative transition-all shrink-0 ${state.invoiceSettings?.showSocialQr ? 'bg-accent' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${state.invoiceSettings?.showSocialQr ? 'left-6.5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

      <div className="flex items-center gap-2 mb-2"><Sparkles className="text-accent" /><h2 className="text-2xl font-bold">إدارة مفاتيح AI API</h2></div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-black">مفاتيح الذكاء الاصطناعي</h3>
            <p className="text-gray-500 text-xs mt-1">أضف عدة مفاتيح API لضمان عمل المساعد الذكي. عند استهلاك حصة أحد المفاتيح، سيتحول النظام تلقائياً للمفتاح التالي.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowKeys(!showKeys)} className="p-3 text-gray-400 hover:text-accent rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
              {showKeys ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button 
              onClick={() => { setEditingAiKeyIndex(null); setAiKeyInput(''); setShowAiKeyInput(true); }}
              className="flex items-center gap-2 px-5 py-3 bg-accent text-white font-black rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={18} /> إضافة مفتاح
            </button>
          </div>
        </div>

        {aiKeys.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-[28px]">
            <Key size={48} className="mx-auto mb-4 text-gray-200 dark:text-slate-700" />
            <p className="text-gray-400 font-bold italic">لا توجد مفاتيح API بعد. أضف مفتاحاً جديداً لتفعيل المساعد الذكي.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {aiKeys.map((key, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-2xl border transition-all ${index === 0 ? 'bg-accent/5 border-accent/20 ring-1 ring-accent/10' : 'bg-gray-50/50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-700'}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${index === 0 ? 'bg-accent text-white' : 'bg-white dark:bg-slate-800 text-gray-400 border border-gray-100 dark:border-slate-700'}`}>
                      {index === 0 ? <Check size={20} strokeWidth={3} /> : <span className="font-black text-sm">{index + 1}</span>}
                    </div>
                    {editingAiKeyIndex === index ? (
                      <div className="flex-1 min-w-0 flex gap-2">
                        <input
                          type="text"
                          value={aiKeyInput}
                          onChange={e => setAiKeyInput(e.target.value)}
                          className="flex-1 p-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-mono text-xs outline-none focus:border-accent"
                          placeholder="أدخل المفتاح..."
                          autoFocus
                        />
                        <button onClick={() => handleUpdateAiKey(index)} className="px-3 py-2 bg-accent text-white rounded-xl font-black text-xs"><Save size={16} /></button>
                        <button onClick={() => { setEditingAiKeyIndex(null); setAiKeyInput(''); }} className="px-3 py-2 bg-gray-100 dark:bg-slate-800 text-gray-400 rounded-xl"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-gray-900 dark:text-white ltr block truncate" dir="ltr">{maskKey(key)}</span>
                          {index === 0 && <span className="text-[9px] bg-accent/10 text-accent px-2 py-0.5 rounded-lg font-black">أساسي</span>}
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold">المفتاح #{index + 1}</span>
                      </div>
                    )}
                  </div>
                    {editingAiKeyIndex !== index && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => handleReorderAiKey(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 text-accent dark:text-accent-light hover:text-accent-dark disabled:opacity-20 disabled:cursor-not-allowed rounded-lg hover:bg-accent/10 dark:hover:bg-accent/20 transition-all"
                        title="تحريك لأعلى"
                      >
                        <ArrowUp size={18} strokeWidth={3} />
                      </button>
                      <button
                        onClick={() => handleReorderAiKey(index, 'down')}
                        disabled={index === aiKeys.length - 1}
                        className="p-1.5 text-accent dark:text-accent-light hover:text-accent-dark disabled:opacity-20 disabled:cursor-not-allowed rounded-lg hover:bg-accent/10 dark:hover:bg-accent/20 transition-all"
                        title="تحريك لأسفل"
                      >
                        <ArrowDown size={18} strokeWidth={3} />
                      </button>
                      <button
                        onClick={() => { setEditingAiKeyIndex(index); setAiKeyInput(key); }}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                        title="تعديل"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteAiKey(index)}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
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
              <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2 block">مفتاح API جديد</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiKeyInput}
                    onChange={e => setAiKeyInput(e.target.value)}
                    className="flex-1 p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-mono text-sm outline-none focus:border-accent"
                    placeholder="AIzaSyBdEQUeSZNvFwEB3R9biVHMS9fjusZut8A"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleAddAiKey(); }}
                  />
                  <button onClick={handleAddAiKey} className="px-6 py-3 bg-accent text-white rounded-xl font-black shadow-lg hover:opacity-90 transition-all">إضافة</button>
                  <button onClick={() => { setShowAiKeyInput(false); setAiKeyInput(''); }} className="px-4 py-3 bg-gray-100 dark:bg-slate-800 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={20} /></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {aiKeys.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-50 dark:border-slate-800 text-center">
            <p className="text-[10px] font-bold text-gray-400">
              <span className="text-accent">{aiKeys.length}</span> مفتاح متاح
              {aiKeys.length > 1 && <span className="opacity-60"> — الترتيب من الأعلى إلى الأسفل يحدد أولوية الاستخدام</span>}
            </p>
          </div>
        )}
      </motion.div>

      <div className="flex items-center gap-2 mb-2"><Tag className="text-accent" /><h2 className="text-2xl font-bold">الكوبونات</h2></div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.16 }} className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-black">إدارة كوبونات الخصم</h3>
            <p className="text-gray-500 text-xs mt-1">أضف كوبونات الخصم وحدد قيمتها ونوع الخصم (نسبة مئوية أو مبلغ ثابت).</p>
          </div>
          <button
            onClick={() => { setShowCouponInput(!showCouponInput); setNewCouponCode(''); setNewCouponDiscount(0); setNewCouponIsPercent(true); }}
            className="flex items-center gap-2 px-5 py-3 bg-accent text-white font-black rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={18} /> إضافة كوبون جديد
          </button>
        </div>

        {coupons.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-[28px]">
            <Percent size={48} className="mx-auto mb-4 text-gray-200 dark:text-slate-700" />
            <p className="text-gray-400 font-bold italic">لا توجد كوبونات مسجلة. أضف كوبوناً جديداً.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {coupons.map((c, index) => (
              <motion.div
                key={c.code}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="p-4 rounded-2xl bg-gray-50/50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Tag size={16} className="text-accent shrink-0" />
                    <span className="font-black text-sm text-gray-900 dark:text-white min-w-[70px]">{c.code}</span>
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
                        className="w-20 p-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-center text-sm"
                      />
                      <button
                        onClick={() => {
                          const next = !c.is_percent;
                          setCoupons(prev => prev.map(x => x.code === c.code ? { ...x, is_percent: next } : x));
                          handleUpdateCoupon(c.code, c.discount, next);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${c.is_percent ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}
                      >
                        {c.is_percent ? <><Percent size={12} className="inline" /> %</> : 'ج.م'}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCoupon(c.code)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
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
              <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2 block">كوبون جديد</label>
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    value={newCouponCode}
                    onChange={e => setNewCouponCode(e.target.value)}
                    className="flex-1 min-w-[120px] p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-accent"
                    placeholder="كود الكوبون"
                    onKeyDown={e => { if (e.key === 'Enter') handleAddCoupon(); }}
                  />
                  <input
                    type="number"
                    value={newCouponDiscount}
                    onChange={e => setNewCouponDiscount(Number(e.target.value))}
                    className="w-24 p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-center outline-none focus:border-accent"
                    placeholder="القيمة"
                  />
                  <button
                    onClick={() => setNewCouponIsPercent(!newCouponIsPercent)}
                    className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${newCouponIsPercent ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}
                  >
                    {newCouponIsPercent ? <><Percent size={14} className="inline" /> %</> : 'ج.م'}
                  </button>
                  <button onClick={handleAddCoupon} className="px-6 py-3 bg-accent text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition-all">إضافة</button>
                  <button onClick={() => { setShowCouponInput(false); setNewCouponCode(''); }} className="px-4 py-3 bg-gray-100 dark:bg-slate-800 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={20} /></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {coupons.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-50 dark:border-slate-800 text-center">
            <p className="text-[10px] font-bold text-gray-400"><span className="text-accent">{coupons.length}</span> كوبون مسجل</p>
          </div>
        )}
      </motion.div>



      <div className="flex items-center gap-2 mb-2"><Database className="text-accent" /><h2 className="text-2xl font-bold">إدارة البيانات</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border flex flex-col items-center text-center gap-4">
          <Download size={32} className="text-blue-600" />
          <h3 className="text-xl font-black">تصدير نسخة احتياطية</h3>
          <button onClick={handleExport} className="w-full py-3 bg-accent text-white font-black rounded-2xl shadow-md">تحميل ملف البيانات</button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border flex flex-col items-center text-center gap-4">
          <Upload size={32} className="text-amber-600" />
          <h3 className="text-xl font-black">استعادة البيانات</h3>
          <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
          <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-2 font-black rounded-2xl">رفع ملف البيانات</button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Settings;
