
import React, { useState, useEffect, useRef } from 'react';
import { useUnsavedCheck } from '../hooks/useUnsavedCheck';
import { 
  X, 
  Upload,
  Plus,
  Trash2,
  Sparkles,
  HelpCircle,
  TrendingUp,
  AlertCircle,
  Target,
  Trophy,
  Image as ImageIcon,
  Link as LinkIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Zap
} from 'lucide-react';
import { Product, Variant, Category } from '../types';
import { formatDate } from '../lib/formatDate';

interface OptionCategory {
  id: string;
  name: string;
  values: string[];
}

const QUICK_SUGGESTIONS: Record<string, string[]> = {
  'المقاس': ['حديث ولادة', '0-3 شهور', '3-6 شهور', '6-9 شهور', '9-12 شهر', '12-18 شهر', '18-24 شهر', 'سنة', 'سنتين', '3 سنوات', '4 سنوات', '5 سنوات'],
  'اللون': ['أبيض', 'أسود', 'كحلي', 'رمادي', 'أحمر', 'وردي', 'لبني', 'أخضر', 'أصفر', 'بيج', 'بني', 'برتقالي'],
  'الخامة': ['قطن 100%', 'ميلتون', 'صوف', 'كتان', 'ليكرا', 'جيرسي'],
};

const cartesian = (arrays: string[][]): string[][] => {
  return arrays.reduce<string[][]>((a, b) => a.flatMap(d => b.map(e => [...d, e])), [[]]);
};

interface ProductModalProps {
  product?: Product;
  categories: Category[];
  suppliers: any[];
  contacts?: any[];
  onClose: () => void;
  onSave: (product: Product) => void;
  onDeleteAction: (productId: string) => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, categories, suppliers, contacts, onClose, onSave, onDeleteAction }) => {
  const [showPriceHelp, setShowPriceHelp] = useState(false);
  const [p, setP] = useState<Product>(() => {
    if (product) {
      const clone = JSON.parse(JSON.stringify(product));
      if (clone.wholesalePrice === undefined) clone.wholesalePrice = clone.costPrice || 0;
      if (clone.packagingCost === undefined) clone.packagingCost = 0;
      return clone;
    }
    const firstCat = categories.find(c => !c.parentId);
    return { 
      id: `p-${Date.now()}`, 
      name: '', 
      category: firstCat ? firstCat.name : 'عام', 
      price: 0, 
      costPrice: 0, 
      wholesalePrice: 0, 
      packagingCost: 0, 
      image: '', 
      url: '', 
      supplierId: '',
      createdAt: new Date().toISOString(),
      variants: [{ id: 'v-1', size: 'واحد', color: 'متعدد', quantity: 0, price: 0, lowStockThreshold: 2 }] 
    };
  });
  const [options, setOptions] = useState<OptionCategory[]>(() => {
    if (!product) return [];
    const sizes = Array.from(new Set(product.variants.map(v => v.size))).filter(v => v !== 'واحد') as string[];
    const colors = Array.from(new Set(product.variants.map(v => v.color))).filter(v => v !== 'متعدد') as string[];
    const opts: OptionCategory[] = [];
    if (sizes.length > 0) opts.push({ id: 'opt-size', name: 'المقاس', values: sizes });
    if (colors.length > 0) opts.push({ id: 'opt-color', name: 'اللون', values: colors });
    return opts;
  });
  
  const [bulkQty, setBulkQty] = useState<string>('0');
  const [bulkPrice, setBulkPrice] = useState<string>(p.price.toString());
  const [bulkThreshold, setBulkThreshold] = useState<string>('2');
  const [pendingTag, setPendingTag] = useState('');
  const [pendingImageUrl, setPendingImageUrl] = useState('');
  const [deletedKeys, setDeletedKeys] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const pRef = useRef(p);
  pRef.current = p;
  const { withUnsavedCheck, markClean } = useUnsavedCheck(p);
  
  useEffect(() => {
    if (!p.images && p.image) {
      setP(prev => ({ ...prev, images: [prev.image] }));
    }
  }, []);
  
  useEffect(() => {
    const currentP = pRef.current;
    if (options.length === 0) {
      if (currentP.variants.length !== 1 || (currentP.variants.length > 0 && currentP.variants[0].size !== 'واحد')) {
        setP(prev => ({
          ...prev,
          variants: [{ id: `v-main-${Date.now()}`, size: 'واحد', color: 'متعدد', quantity: prev.variants[0]?.quantity || 0, price: prev.price, lowStockThreshold: prev.variants[0]?.lowStockThreshold || 2 }]
        }));
      }
      return;
    }

    const optionValues = options.map(opt => opt.values.length > 0 ? opt.values : ['افتراضي']);
    const productCombos = cartesian(optionValues);

    const newVariants: Variant[] = productCombos
      .map((combo: string[]) => {
        const sizeStr = combo[0] || 'واحد';
        const colorStr = combo.slice(1).join(' / ') || 'متعدد';
        const key = `${sizeStr}-${colorStr}`;
        if (deletedKeys.has(key)) return null;

        const existing = currentP.variants.find(v => v.size === sizeStr && v.color === colorStr);
        return {
          id: existing?.id || `v-${Math.random().toString(36).substr(2, 9)}`,
          size: sizeStr,
          color: colorStr,
          quantity: existing?.quantity || 0,
          price: existing?.price || currentP.price,
          lowStockThreshold: existing?.lowStockThreshold || 2
        };
      })
      .filter(v => v !== null) as Variant[];

    setP(prev => ({ ...prev, variants: newVariants }));
  }, [options, deletedKeys]);

  const handleAddValue = (id: string, val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    setOptions(options.map(opt => opt.id === id ? { ...opt, values: opt.values.includes(trimmed) ? opt.values : [...opt.values, trimmed] } : opt));
  };

  const applyQtyToAll = () => {
    setP({
      ...p,
      variants: p.variants.map(v => ({...v, quantity: parseInt(bulkQty) || 0}))
    });
  };

  const applyPriceToAll = () => {
    const priceVal = Number(bulkPrice) || 0;
    setP({
      ...p,
      price: priceVal,
      variants: p.variants.map(v => ({...v, price: priceVal}))
    });
  };

  const applyThresholdToAll = () => {
    setP({
      ...p,
      variants: p.variants.map(v => ({...v, lowStockThreshold: parseInt(bulkThreshold) || 0}))
    });
  };

  const removeVariant = (idx: number) => {
    if (p.variants.length <= 1) return alert('يجب بقاء متغير واحد');
    const variantToRemove = p.variants[idx];
    setDeletedKeys(prev => new Set([...prev, `${variantToRemove.size}-${variantToRemove.color}`]));
    const newVars = [...p.variants];
    newVars.splice(idx, 1);
    setP({ ...p, variants: newVars });
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 800;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
          } else {
            if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    const newImages = p.images ? [compressed, ...p.images.slice(1)] : [compressed];
    setP({ ...p, image: compressed, images: newImages });
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const compressed = await Promise.all(Array.from(files).map(f => compressImage(f)));
    const currentImages = p.images || [p.image].filter(Boolean);
    const newImages = [...currentImages, ...compressed];
    setP({ ...p, images: newImages, image: newImages[0] || p.image });
  };

  const handleAddImageUrl = () => {
    const url = pendingImageUrl.trim();
    if (!url) return;
    const currentImages = p.images || [p.image].filter(Boolean);
    const newImages = [...currentImages, url];
    setP({ ...p, images: newImages, image: newImages[0] || p.image });
    setPendingImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    const currentImages = p.images || [];
    if (currentImages.length <= 1) return;
    const newImages = currentImages.filter((_, i) => i !== index);
    setP({ ...p, images: newImages, image: newImages[0] || p.image });
  };

  const handleSetMainImage = (index: number) => {
    const currentImages = p.images || [];
    if (index === 0) return;
    const newImages = [currentImages[index], ...currentImages.filter((_, i) => i !== index)];
    setP({ ...p, images: newImages, image: newImages[0] });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto" dir="rtl" onClick={() => withUnsavedCheck(onClose)}>
      <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-3xl shadow-2xl relative flex flex-col max-h-[90vh] border border-gray-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
        <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10 rounded-t-[40px] shadow-sm text-right">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">{(product && !product.id.toString().startsWith('p-')) ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3>
          <button onClick={() => withUnsavedCheck(onClose)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 dark:text-gray-500 hover:text-red-500 transition-all"><X size={28}/></button>
        </div>
        {product && !product.id.toString().startsWith('p-') && (
          <div className="px-8 pt-3 pb-0">
            <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 dark:text-gray-500">
              <span>تاريخ الإضافة: {formatDate(product.createdAt, 'full')}</span>
              {product.updatedAt && <><span className="opacity-40">|</span><span>آخر تعديل: {formatDate(product.updatedAt, 'full')}</span></>}
            </div>
          </div>
        )}
        <div className="p-8 space-y-8 overflow-y-auto text-right">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 md:col-span-1 space-y-2">
              <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 uppercase tracking-widest">اسم المنتج</label>
              <input className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-gray-900 dark:text-white outline-none focus:border-accent focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm" placeholder="أدخل اسم المنتج..." value={p.name} onChange={e => setP({...p, name: e.target.value})} />
            </div>
            <div className="col-span-2 md:col-span-1 space-y-2">
              <label className="text-xs font-black text-gray-500 dark:text-gray-400 pr-1 uppercase tracking-widest">رقم SKU (تلقائي)</label>
              <div className="w-full p-4 bg-gray-100 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-700 rounded-2xl font-mono font-black text-gray-700 dark:text-gray-300 shadow-sm text-left ltr">
                {p.sku || <span className="text-gray-400 dark:text-gray-500">سيتم التوليد تلقائياً</span>}
              </div>
            </div>
            <div className="col-span-2 md:col-span-1 space-y-2">
              <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 uppercase tracking-widest">التصنيف</label>
              {categories.length > 0 ? (
                <select className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-gray-900 dark:text-white outline-none focus:border-accent focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm appearance-none" value={p.category} onChange={e => setP({...p, category: e.target.value})}>
                  <option value="عام">-- اختر تصنيفاً --</option>
                  {categories.filter(c => !c.parentId).map(mainCat => (
                    <React.Fragment key={mainCat.id}>
                      <option value={mainCat.name}>{mainCat.name}</option>
                      {categories.filter(sub => sub.parentId === mainCat.id).map(subCat => (
                        <option key={subCat.id} value={`${mainCat.name} > ${subCat.name}`}>
                          &nbsp;&nbsp;-- {subCat.name}
                        </option>
                      ))}
                    </React.Fragment>
                  ))}
                </select>
              ) : (
                <div className="w-full p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-[10px] font-black text-red-600 flex items-center gap-2">
                  <AlertCircle size={14} />
                  من فضلك أضف تصنيفات من الإعدادات أولاً!
                </div>
              )}
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 uppercase tracking-widest">المورد</label>
              <select className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-gray-900 dark:text-white outline-none focus:border-accent focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm appearance-none" value={p.supplierId || ''} onChange={e => setP({...p, supplierId: e.target.value})}>
                <option value="">اختار المورد...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.phone}{s.phone2 ? ` / ${s.phone2}` : ''})</option>)}
                {contacts && contacts
                  .filter(c => c.entityType === 'مصنع' || c.entityType === 'تاجر جملة')
                  .map(c => <option key={c.id} value={c.id}>{c.companyName} ({c.phone}{c.phone2 ? ` / ${c.phone2}` : ''})</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-3">
              <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 uppercase tracking-widest">الوسوم / الكلمات المفتاحية (Tags)</label>
              
              <div className="flex flex-wrap gap-2 mb-2 min-h-[40px] p-2 bg-gray-50/50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                {p.tags && p.tags.length > 0 ? (
                  p.tags.map(tag => (
                    <span key={tag} className="bg-accent/10 text-accent px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 border border-accent/20 animate-in fade-in zoom-in duration-200">
                      {tag}
                      <button 
                        onClick={() => setP({...p, tags: p.tags?.filter(t => t !== tag)})}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium p-1">لا توجد وسوم مضافة لهذا المنتج...</span>
                )}
              </div>

              <div className="relative">
                <input 
                  className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-gray-900 dark:text-white outline-none focus:border-accent focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm" 
                  placeholder="أضف وسم جديد (مثال: شتوي) واضغط Enter..." 
                  value={pendingTag}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.endsWith(',') || val.endsWith('،')) {
                      const tag = val.slice(0, -1).trim();
                      if (tag && !p.tags?.includes(tag)) {
                        setP({...p, tags: [...(p.tags || []), tag]});
                        setPendingTag('');
                      }
                    } else {
                      setPendingTag(val);
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const tag = pendingTag.trim();
                      if (tag && !p.tags?.includes(tag)) {
                        setP({...p, tags: [...(p.tags || []), tag]});
                        setPendingTag('');
                      }
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    const tag = pendingTag.trim();
                    if (tag && !p.tags?.includes(tag)) {
                      setP({...p, tags: [...(p.tags || []), tag]});
                      setPendingTag('');
                    }
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-accent text-white rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition-all"
                >
                  <Plus size={18} />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold px-2 italic">يمكنك إضافة أكثر من وسم للمنتج. الوسوم تساعدك في تنظيم منتجاتك والبحث عنها بسهولة.</p>
            </div>

            {/* Image Gallery Section */}
            <div className="col-span-2 space-y-3">
              <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 uppercase tracking-widest">صور المنتج</label>
              <div className="flex flex-wrap gap-3">
                {(p.images || [p.image].filter(Boolean)).map((img, idx) => (
                  <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 group/img">
                    <img src={img} className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <div className="absolute top-1 right-1 bg-accent text-white text-[7px] font-black px-1.5 py-0.5 rounded-md shadow">أساسي</div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      {idx > 0 && (
                        <button type="button" onClick={() => handleSetMainImage(idx)} className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-gray-700 hover:text-accent transition-all shadow" title="تعيين كأساسية"><Check size={14} /></button>
                      )}
                      {(p.images || [p.image].filter(Boolean)).length > 1 && (
                        <button type="button" onClick={() => handleRemoveImage(idx)} className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow" title="حذف"><Trash2 size={12} /></button>
                      )}
                    </div>
                  </div>
                ))}

                <button type="button" onClick={() => galleryFileInputRef.current?.click()} className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-accent hover:text-accent transition-all bg-gray-50/50 dark:bg-slate-800/50">
                  <Upload size={20} />
                  <span className="text-[8px] font-black">رفع صور</span>
                </button>

                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1 text-gray-400 bg-gray-50/50 dark:bg-slate-800/50 p-1">
                  <input className="w-full text-[8px] text-gray-500 text-center bg-transparent outline-none" placeholder="URL صورة" value={pendingImageUrl} onChange={e => setPendingImageUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddImageUrl(); } }} />
                  <button type="button" onClick={handleAddImageUrl} className="text-[8px] font-black bg-accent text-white px-2 py-1 rounded-lg hover:opacity-90 transition-all active:scale-95"><LinkIcon size={10} className="inline" /> إضافة</button>
                </div>
              </div>
              <input type="file" accept="image/*" multiple className="hidden" ref={galleryFileInputRef} onChange={handleGalleryUpload} />
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold px-2 italic">أول صورة هي الأساسية. يمكن رفع صور متعددة أو إضافة روابط URLs.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 uppercase tracking-widest">سعر البيع الافتراضي</label>
              <div className="relative group/price">
                <input type="number" className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-black text-gray-900 dark:text-white outline-none focus:border-accent focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm" value={p.price} onChange={e => setP({...p, price: Number(e.target.value)})} />
                
                {/* Smart Price Suggestion */}
                {(p.wholesalePrice || 0) > 0 && (
                  <div className="mt-3 p-4 bg-accent/5 dark:bg-accent/10 border border-accent/20 rounded-2xl space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2 text-accent">
                        <Sparkles size={16} className="animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-wider">اقتراح السعر الذكي (X2 Smart)</span>
                        <HelpCircle 
                          size={14} 
                          className="cursor-pointer hover:text-accent-hover transition-colors" 
                          onClick={() => setShowPriceHelp(!showPriceHelp)}
                        />
                      </div>
                      <div onClick={() => {
                        const cost = (p.wholesalePrice || 0) + (p.packagingCost || 0);
                        const suggested = Math.ceil((cost * 1.45) / 5) * 5 - 1; // 45% margin approx + rounding to 9
                        setP({...p, price: suggested});
                      }} className="cursor-pointer text-[10px] font-black bg-accent text-white px-3 py-1.5 rounded-lg hover:opacity-90 active:scale-95 transition-all">
                        تطبيق السعر الموصى به
                      </div>
                    </div>
                    
                    {showPriceHelp && (
                      <div className="bg-white dark:bg-slate-900 border border-accent/20 rounded-xl p-4 space-y-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300 relative z-20">
                        <div className="flex items-start gap-3">
                          <TrendingUp size={18} className="text-blue-500 mt-1" />
                          <div>
                            <h4 className="text-[11px] font-black text-gray-900 dark:text-white mb-1">تسعير "سريع" (النمو السريع)</h4>
                            <p className="text-[10px] text-gray-500 leading-relaxed">يهدف لزيادة المبيعات وبناء قاعدة عملاء ضخمة بسرعة. هامش ربح مدروس يغطي المصاريف ويحافظ على التنافسية.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Target size={18} className="text-accent mt-1" />
                          <div>
                            <h4 className="text-[11px] font-black text-gray-900 dark:text-white mb-1">تسعير "متوازن" (الأمان الاستراتيجي)</h4>
                            <p className="text-[10px] text-gray-500 leading-relaxed">السعر المثالي لضمان استمرارية الربح مع الحفاظ على قدرة تنافسية عالية في السوق.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Trophy size={18} className="text-emerald-500 mt-1" />
                          <div>
                            <h4 className="text-[11px] font-black text-gray-900 dark:text-white mb-1">تسعير "مميز" (قيمة العلامة التجارية)</h4>
                            <p className="text-[10px] text-gray-500 leading-relaxed">للمنتجات الفريدة أو الحصرية. هامش ربح مرتفع يعكس جودة وفخامة ما يقدمه مشروعك.</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-gray-50 dark:border-slate-800">
                          <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold italic">
                            * نستخدم قواعد "التسعير النفسي" (Psychological Pricing) عبر تقريب الأسعار لما ينتهي بـ 9 أو 49 لزيادة جاذبية العرض.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-3 gap-3 relative z-10">
                      {[
                        { label: 'سريع (20%)', margin: 1.25, color: 'text-blue-500' },
                        { label: 'متوازن (40%)', margin: 1.67, color: 'text-accent' },
                        { label: 'مميز (60%)', margin: 2.5, color: 'text-emerald-500' }
                      ].map((tier) => {
                        const cost = (p.wholesalePrice || 0) + (p.packagingCost || 0);
                        let suggested = cost * tier.margin;
                        // Beautiful rounding (e.g., 99, 149, 199 or .50, .45 if decimals, but here we use integers usually)
                        suggested = Math.ceil(suggested / 5) * 5;
                        if (suggested > 10) suggested -= 1; // 149 instead of 150

                        return (
                          <button
                            key={tier.label}
                            type="button"
                            onClick={() => setP({...p, price: Math.round(suggested)})}
                            className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-accent transition-all text-right group/tier"
                          >
                            <div className="text-[8px] font-black text-gray-400 dark:text-gray-500 group-hover/tier:text-accent">{tier.label}</div>
                            <div className={`text-xs font-black ${tier.color}`}>{Math.round(suggested)} ج.م</div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[9px] text-gray-500 font-medium leading-relaxed">
                      * الاقتراح مبني على تكلفة القطعة ({ (p.wholesalePrice || 0) + (p.packagingCost || 0) } ج.م) مضافاً إليها هامش الربح وقواعد التسويق النفسي.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 uppercase tracking-widest">سعر الجملة</label>
              <input type="number" className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-black text-gray-900 dark:text-white outline-none focus:border-accent focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm" 
                value={p.wholesalePrice || 0} 
                onChange={e => {
                  const ws = Number(e.target.value);
                  const pk = p.packagingCost || 0;
                  setP({...p, wholesalePrice: ws, costPrice: ws + pk});
                }} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 uppercase tracking-widest">تكلفة التغليف</label>
              <input type="number" className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-black text-gray-900 dark:text-white outline-none focus:border-accent focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm" 
                value={p.packagingCost || 0} 
                onChange={e => {
                  const pk = Number(e.target.value);
                  const ws = p.wholesalePrice || 0;
                  setP({...p, packagingCost: pk, costPrice: ws + pk});
                }} 
              />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 uppercase tracking-widest font-black text-emerald-600 dark:text-emerald-400">إجمالي تكلفة القطعة</label>
              <div className="w-full p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl font-black text-emerald-700 dark:text-emerald-400 shadow-inner flex justify-between items-center">
                <span>{(p.wholesalePrice || 0) + (p.packagingCost || 0)} ج.م</span>
                <span className="text-[10px] opacity-60">(سعر الجملة + التغليف)</span>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-100 dark:border-slate-800 pt-8 space-y-6">
             <div className="flex justify-between items-center">
               <h4 className="font-black text-lg text-gray-900 dark:text-white">خيارات المتغيرات</h4>
               <button onClick={() => setOptions([...options, {id: `o-${Date.now()}`, name: 'المقاس', values: []}])} className="text-xs font-black bg-accent text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:opacity-90 shadow-md transition-all active:scale-95">
                 <Plus size={16}/> أضف خياراً
               </button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.map(opt => (
                  <div key={opt.id} className="p-4 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-[28px] shadow-sm space-y-3">
                    <div className="flex justify-between items-center border-b border-gray-50 dark:border-slate-700 pb-2">
                      <input className="text-xs font-black text-gray-800 dark:text-gray-200 bg-transparent outline-none w-full text-right" value={opt.name} onChange={e => setOptions(options.map(o => o.id === opt.id ? {...o, name: e.target.value} : o))} />
                      <button onClick={() => setOptions(options.filter(o => o.id !== opt.id))} className="text-gray-400 dark:text-gray-500 hover:text-red-500"><X size={14}/></button>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {opt.values.map(v => (
                        <span key={v} className="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-lg text-[10px] font-black text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                          {v} 
                          <X size={10} className="cursor-pointer text-gray-400 dark:text-gray-500 hover:text-red-500" onClick={() => setOptions(options.map(o => o.id === opt.id ? {...o, values: o.values.filter(x => x !== v)} : o))} />
                        </span>
                      ))}
                    </div>
                    <input className="w-full bg-gray-50 dark:bg-slate-900 p-3 rounded-2xl text-[10px] font-bold text-gray-900 dark:text-white outline-none border border-gray-100 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-accent transition-all shadow-inner text-right" placeholder="اكتب واضغط Enter..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const val = (e.target as any).value.trim(); if (val) handleAddValue(opt.id, val); (e.target as any).value = ''; } }} />
                  </div>
                ))}
             </div>

             {/* Bulk Edit Bar */}
             <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
               <div className="flex items-center gap-2 mb-3">
                 <Zap size={16} className="text-accent" />
                 <span className="text-xs font-black text-gray-600 dark:text-gray-400">تعديل الكل مرة واحدة</span>
               </div>
               <div className="flex flex-wrap gap-4 items-end">
                 <div className="flex items-center gap-2">
                   <div className="flex flex-col gap-1">
                     <span className="text-[8px] font-black text-gray-400 dark:text-gray-500">الكمية</span>
                     <input type="number" className="w-20 p-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl text-center font-black text-sm text-gray-900 dark:text-white focus:border-accent outline-none" value={bulkQty} onChange={e => setBulkQty(e.target.value)} />
                   </div>
                   <button onClick={applyQtyToAll} className="px-3 py-2 bg-accent text-white font-black rounded-xl text-[10px] hover:opacity-90 transition-all active:scale-95">تطبيق</button>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="flex flex-col gap-1">
                     <span className="text-[8px] font-black text-gray-400 dark:text-gray-500">السعر</span>
                     <input type="number" className="w-24 p-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl text-center font-black text-sm text-gray-900 dark:text-white focus:border-accent outline-none" value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} />
                   </div>
                   <button onClick={applyPriceToAll} className="px-3 py-2 bg-accent text-white font-black rounded-xl text-[10px] hover:opacity-90 transition-all active:scale-95">تطبيق</button>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="flex flex-col gap-1">
                     <span className="text-[8px] font-black text-gray-400 dark:text-gray-500">حد التنبيه</span>
                     <input type="number" className="w-20 p-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl text-center font-black text-sm text-gray-900 dark:text-white focus:border-accent outline-none" value={bulkThreshold} onChange={e => setBulkThreshold(e.target.value)} />
                   </div>
                   <button onClick={applyThresholdToAll} className="px-3 py-2 bg-accent text-white font-black rounded-xl text-[10px] hover:opacity-90 transition-all active:scale-95">تطبيق</button>
                 </div>
               </div>
             </div>

             <div className="rounded-[32px] border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm bg-white dark:bg-slate-800">
               <div className="overflow-x-auto">
                 <table className="w-full text-right text-[11px]">
                    <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
                      <tr>
                        <th className="p-3 font-black text-gray-500 dark:text-gray-300 uppercase">المتغير</th>
                        <th className="p-3 font-black text-gray-500 dark:text-gray-300 uppercase text-center">البيانات</th>
                        <th className="p-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                      {p.variants.map((v, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="p-3 font-black text-gray-900 dark:text-white whitespace-nowrap">{v.size} - {v.color}</td>
                          <td className="p-3 text-center">
                            <div className="flex flex-wrap justify-center gap-3">
                              <div className="inline-flex items-center gap-1.5">
                                <span className="text-[8px] text-gray-400 dark:text-gray-500 font-black">الكمية</span>
                                <input type="number" className="w-14 p-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-lg text-center font-black text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-accent outline-none" value={v.quantity} onChange={e => { const nv = [...p.variants]; nv[i].quantity = Number(e.target.value); setP({...p, variants: nv})}} />
                              </div>
                              <div className="inline-flex items-center gap-1.5">
                                <span className="text-[8px] text-gray-400 dark:text-gray-500 font-black">السعر</span>
                                <input type="number" className="w-16 p-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-lg text-center font-black text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-accent outline-none" value={v.price} onChange={e => { const nv = [...p.variants]; nv[i].price = Number(e.target.value); setP({...p, variants: nv})}} />
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <button type="button" onClick={() => removeVariant(i)} className="text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors p-1.5"><Trash2 size={14}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
             </div>
          </div>
        </div>
        <div className="p-8 border-t dark:border-slate-800 flex gap-4 sticky bottom-0 bg-white dark:bg-slate-900 rounded-b-[40px] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <button onClick={() => {markClean(); onSave(p); onClose();}} className="flex-1 bg-accent text-white font-black py-5 rounded-[24px] shadow-xl hover:opacity-90 transition-all text-lg active:scale-95">حفظ التغييرات والمنتج</button>
          {product && (
            <button 
              onClick={() => {
                if(window.confirm('هل أنت متأكد من حذف المنتج نهائياً من النظام؟')) {
                  markClean();
                  onDeleteAction(product.id);
                  onClose();
                }
              }} 
              className="p-5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-[24px] border border-transparent hover:border-red-100 dark:hover:border-red-900/30 transition-all shadow-sm"
              title="حذف المنتج نهائياً"
            >
              <Trash2 size={28}/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
