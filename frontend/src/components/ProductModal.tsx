
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUnsavedCheck } from '../hooks/useUnsavedCheck';
import { 
  Upload, Plus, Trash2, Sparkles, HelpCircle, TrendingUp, AlertCircle,
  Target, Trophy, Link as LinkIcon, Check, Zap, X,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Product, Variant, Category, OptionCategory, OptionType } from '../types';
import { formatDate } from '../lib/formatDate';
import { MD3Dialog } from './md3';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExt from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';

const cartesian = (arrays: string[][]): string[][] => {
  return arrays.reduce<string[][]>((a, b) => a.flatMap(d => b.map(e => [...d, e])), [[]]);
};

const STEPS = [
  { icon: 'inventory_2', label: 'المعلومات الأساسية', desc: 'الاسم والتصنيف والصور والتسعير' },
  { icon: 'tune', label: 'المتغيرات', desc: 'المقاسات والألوان والكميات' },
];

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
  const [currentStep, setCurrentStep] = useState(0);
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
      variants: [{ id: 'v-1', sku: '', size: 'واحد', color: 'متعدد', quantity: 0, price: 0, lowStockThreshold: 2 }],
    };
  });

  const [options, setOptions] = useState<OptionCategory[]>(() => {
    if (!product) return [];
    if (product.options && product.options.length > 0) {
      return JSON.parse(JSON.stringify(product.options));
    }
    const sizes = Array.from(new Set(product.variants.map(v => v.size))).filter(v => v !== 'واحد') as string[];
    const colors = Array.from(new Set(product.variants.map(v => v.color))).filter(v => v !== 'متعدد') as string[];
    const opts: OptionCategory[] = [];
    if (sizes.length > 0) opts.push({ id: 'opt-size', name: 'المقاس', type: 'dropdown', values: sizes });
    if (colors.length > 0) opts.push({ id: 'opt-color', name: 'اللون', type: 'dropdown', values: colors });
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

  const tipTapEditor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      LinkExt.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'اكتب وصف المنتج التفصيلي هنا...' }),
    ],
    content: p.description || '',
    onUpdate: ({ editor }) => setP(prev => ({ ...prev, description: editor.getHTML() })),
  });

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
          variants: [{ id: `v-main-${Date.now()}`, sku: prev.sku || '', size: 'واحد', color: 'متعدد', quantity: prev.variants[0]?.quantity || 0, price: prev.price, lowStockThreshold: prev.variants[0]?.lowStockThreshold || 2 }]
        }));
      }
      return;
    }

    const optionArrays = options.map(opt => opt.values.length > 0 ? opt.values : ['افتراضي']);
    const productCombos = cartesian(optionArrays);

    const newVariants: Variant[] = productCombos
      .map((combo: string[]) => {
        const sizeStr = combo[0] || 'واحد';
        const colorStr = combo.slice(1).join(' / ') || 'متعدد';
        const optVals: Record<string, string> = {};
        options.forEach((opt, i) => { optVals[opt.name] = combo[i] || ''; });
        const key = `${sizeStr}-${colorStr}`;
        if (deletedKeys.has(key)) return null;
        const existing = currentP.variants.find(v => v.size === sizeStr && v.color === colorStr);
        return {
          id: existing?.id || `v-${Math.random().toString(36).substr(2, 9)}`,
          size: sizeStr, color: colorStr,
          quantity: existing?.quantity || 0,
          price: existing?.price || currentP.price,
          lowStockThreshold: existing?.lowStockThreshold || 2,
          optionValues: optVals
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

  const applyQtyToAll = () => { setP({ ...p, variants: p.variants.map(v => ({...v, quantity: parseInt(bulkQty) || 0})) }); };
  const applyPriceToAll = () => { const pv = Number(bulkPrice) || 0; setP({ ...p, price: pv, variants: p.variants.map(v => ({...v, price: pv})) }); };
  const applyThresholdToAll = () => { setP({ ...p, variants: p.variants.map(v => ({...v, lowStockThreshold: parseInt(bulkThreshold) || 0})) }); };

  const removeVariant = (idx: number) => {
    if (p.variants.length <= 1) return alert('يجب بقاء متغير واحد');
    const vr = p.variants[idx];
    setDeletedKeys(prev => new Set([...prev, `${vr.size}-${vr.color}`]));
    const newVars = [...p.variants]; newVars.splice(idx, 1);
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
          let width = img.width; let height = img.height;
          if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
          else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const compressed = await compressImage(file);
    const newImages = p.images ? [compressed, ...p.images.slice(1)] : [compressed];
    setP({ ...p, image: compressed, images: newImages });
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return;
    const compressed = await Promise.all(Array.from(files).map(f => compressImage(f)));
    const currentImages = p.images || [p.image].filter(Boolean);
    const newImages = [...currentImages, ...compressed];
    setP({ ...p, images: newImages, image: newImages[0] || p.image });
  };

  const handleAddImageUrl = () => {
    const url = pendingImageUrl.trim(); if (!url) return;
    const currentImages = p.images || [p.image].filter(Boolean);
    setP({ ...p, images: [...currentImages, url], image: currentImages[0] || p.image });
    setPendingImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    const currentImages = p.images || []; if (currentImages.length <= 1) return;
    const newImages = currentImages.filter((_, i) => i !== index);
    setP({ ...p, images: newImages, image: newImages[0] || p.image });
  };

  const handleSetMainImage = (index: number) => {
    const currentImages = p.images || []; if (index === 0) return;
    const newImages = [currentImages[index], ...currentImages.filter((_, i) => i !== index)];
    setP({ ...p, images: newImages, image: newImages[0] });
  };

  const isEdit = product && !product.id.toString().startsWith('p-');

  const inputCls = "w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-gray-900 dark:text-white outline-none focus:border-accent focus:bg-white dark:focus:bg-slate-900 transition-colors duration-200 shadow-sm";
  const labelCls = "text-xs font-black text-gray-600 dark:text-gray-400 pr-1 uppercase tracking-widest";

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 md:col-span-1 space-y-2">
          <label className={labelCls}>اسم المنتج</label>
          <input className={inputCls} placeholder="أدخل اسم المنتج..." value={p.name} onChange={e => setP({...p, name: e.target.value})} />
        </div>
        <div className="col-span-2 md:col-span-1 space-y-2">
          <label className="text-xs font-black text-gray-500 dark:text-gray-400 pr-1 uppercase tracking-widest">رقم SKU (تلقائي)</label>
          <div className="w-full p-4 bg-gray-100 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-700 rounded-2xl font-mono font-black text-gray-700 dark:text-gray-300 shadow-sm text-left ltr">
            {p.sku || <span className="text-gray-400 dark:text-gray-500">سيتم التوليد تلقائياً</span>}
          </div>
        </div>
        <div className="col-span-2 md:col-span-1 space-y-2">
          <label className={labelCls}>التصنيف الرئيسي</label>
          {categories.length > 0 ? (
            <select className={`${inputCls} appearance-none`} value={p.category} onChange={e => setP({...p, category: e.target.value, categories: Array.from(new Set([e.target.value, ...(p.categories || [])])) })}>
              <option value="عام">-- اختر تصنيفاً --</option>
              {categories.filter(c => !c.parentId).map(mainCat => (
                <React.Fragment key={mainCat.id}>
                  <option value={mainCat.name}>{mainCat.name}</option>
                  {categories.filter(sub => sub.parentId === mainCat.id).map(subCat => (
                    <option key={subCat.id} value={`${mainCat.name} > ${subCat.name}`}>&nbsp;&nbsp;-- {subCat.name}</option>
                  ))}
                </React.Fragment>
              ))}
            </select>
          ) : (
            <div className="w-full p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-[10px] font-black text-red-600 flex items-center gap-2">
              <AlertCircle size={14} /> من فضلك أضف تصنيفات من الإعدادات أولاً!
            </div>
          )}
        </div>
        <div className="col-span-2 md:col-span-1 space-y-2">
          <label className={labelCls}>العلامة التجارية (Brand)</label>
          <input className={inputCls} placeholder="مثال: Baby Comfort..." value={p.brand || ''} onChange={e => setP({...p, brand: e.target.value || undefined})} />
        </div>
        <div className="col-span-2 space-y-2">
          <label className={labelCls}>التصنيفات الفرعية (اختياري — يظهر في المتجر)</label>
          {categories.length > 0 ? (
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50/50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 min-h-[44px]">
              {categories.filter(c => !c.parentId).flatMap(mainCat => [
                mainCat,
                ...categories.filter(sub => sub.parentId === mainCat.id)
              ]).map(cat => {
                const allCats = p.categories || (p.category ? [p.category] : []);
                const isSelected = allCats.includes(cat.name);
                return (
                  <button key={cat.id} type="button" onClick={() => {
                    const cur = p.categories || (p.category ? [p.category] : []);
                    const next = isSelected ? cur.filter(c => c !== cat.name) : [...cur, cat.name];
                    setP({...p, categories: next, category: next[0] || p.category});
                  }}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${isSelected ? 'bg-accent text-white border-accent shadow-md' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-accent'}`}>
                    {cat.parentId ? `${categories.find(c => c.id === cat.parentId)?.name || ''} > ${cat.name}` : cat.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <span className="text-[10px] text-gray-400">أضف تصنيفات من الإعدادات أولاً</span>
          )}
          <p className="text-[9px] text-gray-400 dark:text-gray-500 italic px-1">اختر أكثر من تصنيف ليظهر المنتج في أقسام متعددة في المتجر.</p>
        </div>
        <div className="col-span-2 space-y-2">
          <label className={labelCls}>المورد</label>
          <select className={`${inputCls} appearance-none`} value={p.supplierId || ''} onChange={e => setP({...p, supplierId: e.target.value})}>
            <option value="">اختار المورد...</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.phone}{s.phone2 ? ` / ${s.phone2}` : ''})</option>)}
            {contacts && contacts.filter(c => c.entityType === 'مصنع' || c.entityType === 'تاجر جملة').map(c => (
              <option key={c.id} value={c.id}>{c.companyName} ({c.phone}{c.phone2 ? ` / ${c.phone2}` : ''})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <label className={labelCls}>وصف المنتج التفصيلي</label>
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          {tipTapEditor && (
            <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
              {[1,2,3].map(level => (
                <button key={level} type="button" onClick={() => tipTapEditor.chain().focus().toggleHeading({ level: level as any }).run()}
                  className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${tipTapEditor.isActive('heading', { level }) ? 'bg-accent text-white' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>
                  H{level}
                </button>
              ))}
              <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1" />
              <button type="button" onClick={() => tipTapEditor.chain().focus().toggleBold().run()}
                className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${tipTapEditor.isActive('bold') ? 'bg-accent text-white' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>B</button>
              <button type="button" onClick={() => tipTapEditor.chain().focus().toggleItalic().run()}
                className={`w-7 h-7 rounded-lg text-[10px] italic transition-all ${tipTapEditor.isActive('italic') ? 'bg-accent text-white' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>I</button>
              <button type="button" onClick={() => tipTapEditor.chain().focus().toggleBulletList().run()}
                className={`w-7 h-7 rounded-lg transition-all ${tipTapEditor.isActive('bulletList') ? 'bg-accent text-white' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>
                <span className="material-symbols-rounded" style={{ fontSize: 14 }}>format_list_bulleted</span>
              </button>
              <button type="button" onClick={() => {
                const url = window.prompt('رابط:');
                if (url) tipTapEditor.chain().focus().setLink({ href: url }).run();
              }}
                className={`w-7 h-7 rounded-lg transition-all ${tipTapEditor.isActive('link') ? 'bg-accent text-white' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>
                <LinkIcon size={14} />
              </button>
            </div>
          )}
          <EditorContent editor={tipTapEditor} className="prose prose-sm max-w-none p-3 min-h-[120px] dark:prose-invert [&_.tiptap]:outline-none [&_.tiptap]:min-h-[100px]" />
        </div>
        <p className="text-[9px] text-gray-400 dark:text-gray-500 italic px-1">الوصف التفصيلي يظهر في صفحة المنتج بالمتجر.</p>
      </div>

      <div className="space-y-3">
        <label className={labelCls}>الوسوم / الكلمات المفتاحية (Tags)</label>
        <div className="flex flex-wrap gap-2 mb-2 min-h-[40px] p-2 bg-gray-50/50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
          {p.tags && p.tags.length > 0 ? p.tags.map(tag => (
            <span key={tag} className="bg-accent/10 text-accent px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 border border-accent/20 animate-in fade-in zoom-in duration-200">
              {tag}
              <button onClick={() => setP({...p, tags: p.tags?.filter(t => t !== tag)})} className="hover:text-red-500 transition-colors"><X size={12} /></button>
            </span>
          )) : <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium p-1">لا توجد وسوم مضافة لهذا المنتج...</span>}
        </div>
        <div className="relative">
          <input className={inputCls} placeholder="أضف وسم جديد (مثال: شتوي) واضغط Enter..." value={pendingTag}
            onChange={e => { const val = e.target.value; if (val.endsWith(',') || val.endsWith('،')) { const tag = val.slice(0, -1).trim(); if (tag && !p.tags?.includes(tag)) { setP({...p, tags: [...(p.tags || []), tag]}); setPendingTag(''); } } else { setPendingTag(val); } }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const tag = pendingTag.trim(); if (tag && !p.tags?.includes(tag)) { setP({...p, tags: [...(p.tags || []), tag]}); setPendingTag(''); } } }}
          />
          <button onClick={() => { const tag = pendingTag.trim(); if (tag && !p.tags?.includes(tag)) { setP({...p, tags: [...(p.tags || []), tag]}); setPendingTag(''); } }}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-accent text-white rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition-all duration-200">
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <label className={labelCls}>صور المنتج</label>
        <div className="flex flex-wrap gap-3">
          {(p.images || [p.image].filter(Boolean)).map((img, idx) => (
            <div key={idx} className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 group/img">
              <img src={img} className="w-full h-full object-cover" />
              {idx === 0 && <div className="absolute top-1 right-1 bg-accent text-white text-[7px] font-black px-1.5 py-0.5 rounded-md shadow">أساسي</div>}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {idx > 0 && <button type="button" onClick={() => handleSetMainImage(idx)} className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-gray-700 hover:text-accent transition-colors shadow" title="تعيين كأساسية"><Check size={14} /></button>}
                {(p.images || [p.image].filter(Boolean)).length > 1 && <button type="button" onClick={() => handleRemoveImage(idx)} className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors shadow" title="حذف"><Trash2 size={12} /></button>}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => galleryFileInputRef.current?.click()} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-accent hover:text-accent transition-colors bg-gray-50/50 dark:bg-slate-800/50">
            <Upload size={20} /><span className="text-[8px] font-black">رفع صور</span>
          </button>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1 text-gray-400 bg-gray-50/50 dark:bg-slate-800/50 p-1">
            <input className="w-full text-[8px] text-gray-500 text-center bg-transparent outline-none" placeholder="URL صورة" value={pendingImageUrl} onChange={e => setPendingImageUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddImageUrl(); } }} />
            <button type="button" onClick={handleAddImageUrl} className="text-[8px] font-black bg-accent text-white px-2 py-1 rounded-lg hover:opacity-90 active:scale-95 transition-all"><LinkIcon size={10} className="inline" /> إضافة</button>
          </div>
        </div>
        <input type="file" accept="image/*" multiple className="hidden" ref={galleryFileInputRef} onChange={handleGalleryUpload} />
        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold px-2 italic">أول صورة هي الأساسية. يمكن رفع صور متعددة أو إضافة روابط URLs.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className={labelCls}>سعر البيع الافتراضي</label>
          <input type="number" className={inputCls} value={p.price} onChange={e => setP({...p, price: Number(e.target.value)})} />
          {(p.wholesalePrice || 0) > 0 && (
            <div className="mt-2 p-3 bg-accent/5 dark:bg-accent/10 border border-accent/20 rounded-2xl space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2 text-accent">
                  <Sparkles size={14} className="animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-wider">اقتراح السعر الذكي</span>
                  <HelpCircle size={12} className="cursor-pointer" onClick={() => setShowPriceHelp(!showPriceHelp)} />
                </div>
                <div onClick={() => { const cost = (p.wholesalePrice || 0) + (p.packagingCost || 0); setP({...p, price: Math.ceil((cost * 1.45) / 5) * 5 - 1}); }}
                  className="cursor-pointer text-[9px] font-black bg-accent text-white px-2 py-1 rounded-lg hover:opacity-90 active:scale-95 transition-all">تطبيق</div>
              </div>
              {showPriceHelp && (
                <div className="bg-white dark:bg-slate-900 border border-accent/20 rounded-xl p-3 space-y-2 shadow-md animate-in fade-in duration-300 relative z-20">
                  <div className="flex items-start gap-2"><TrendingUp size={14} className="text-blue-500 mt-0.5" /><div><h4 className="text-[10px] font-black text-gray-900 dark:text-white">تسعير "سريع" (20%)</h4><p className="text-[9px] text-gray-500">زيادة المبيعات وبناء قاعدة عملاء سريعة</p></div></div>
                  <div className="flex items-start gap-2"><Target size={14} className="text-accent mt-0.5" /><div><h4 className="text-[10px] font-black text-gray-900 dark:text-white">تسعير "متوازن" (40%)</h4><p className="text-[9px] text-gray-500">استمرارية الربح مع تنافسية عالية</p></div></div>
                  <div className="flex items-start gap-2"><Trophy size={14} className="text-emerald-500 mt-0.5" /><div><h4 className="text-[10px] font-black text-gray-900 dark:text-white">تسعير "مميز" (60%)</h4><p className="text-[9px] text-gray-500">للمنتجات الحصرية بهامش ربح مرتفع</p></div></div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 relative z-10">
                {[{ label: 'سريع 20%', margin: 1.25, color: 'text-blue-500' }, { label: 'متوازن 40%', margin: 1.67, color: 'text-accent' }, { label: 'مميز 60%', margin: 2.5, color: 'text-emerald-500' }].map((tier) => {
                  const cost = (p.wholesalePrice || 0) + (p.packagingCost || 0);
                  let s = Math.ceil((cost * tier.margin) / 5) * 5; if (s > 10) s -= 1;
                  return <button key={tier.label} type="button" onClick={() => setP({...p, price: Math.round(s)})} className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-accent transition-colors text-right group/tier">
                    <div className="text-[7px] font-black text-gray-400 group-hover/tier:text-accent">{tier.label}</div>
                    <div className={`text-[10px] font-black ${tier.color}`}>{Math.round(s)} ج.م</div>
                  </button>;
                })}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className={labelCls}>سعر الجملة</label>
          <input type="number" className={inputCls} value={p.wholesalePrice || 0} onChange={e => { const ws = Number(e.target.value); setP({...p, wholesalePrice: ws, costPrice: ws + (p.packagingCost || 0)}); }} />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>تكلفة التغليف</label>
          <input type="number" className={inputCls} value={p.packagingCost || 0} onChange={e => { const pk = Number(e.target.value); setP({...p, packagingCost: pk, costPrice: (p.wholesalePrice || 0) + pk}); }} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-emerald-600 dark:text-emerald-400 pr-1 uppercase tracking-widest">إجمالي تكلفة القطعة</label>
          <div className="w-full p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl font-black text-emerald-700 dark:text-emerald-400 shadow-inner flex justify-between items-center">
            <span>{(p.wholesalePrice || 0) + (p.packagingCost || 0)} ج.م</span>
            <span className="text-[10px] opacity-60">(جملة + تغليف)</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h4 className="font-black text-base text-gray-900 dark:text-white">خيارات المتغيرات</h4>
        <button onClick={() => setOptions([...options, {id: `o-${Date.now()}`, name: 'الخيار', type: 'dropdown', values: []}])} className="text-[10px] font-black bg-accent text-white px-3 py-2 rounded-xl flex items-center gap-1.5 hover:opacity-90 shadow-md transition-all active:scale-95">
          <Plus size={14}/> أضف خياراً
        </button>
      </div>

      <div className="space-y-3">
        {options.map(opt => (
          <div key={opt.id} className="p-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-[20px] shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-gray-50 dark:border-slate-700 pb-2 gap-2">
              <input className="text-xs font-black text-gray-800 dark:text-gray-200 bg-transparent outline-none flex-1 text-right" value={opt.name} onChange={e => setOptions(options.map(o => o.id === opt.id ? {...o, name: e.target.value} : o))} />
              <button onClick={() => setOptions(options.filter(o => o.id !== opt.id))} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
            </div>

            <div className="flex gap-1 bg-gray-100 dark:bg-slate-900 p-1 rounded-xl">
              {([
                { t: 'dropdown' as OptionType, icon: 'arrow_drop_down', label: 'قائمة' },
                { t: 'buttons' as OptionType, label: 'أزرار' },
                { t: 'color' as OptionType, label: 'ألوان' },
              ]).map(m => (
                <button key={m.t} onClick={() => setOptions(options.map(o => o.id === opt.id ? {...o, type: m.t} : o))}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all ${opt.type === m.t ? 'bg-accent text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 justify-end">
              {opt.values.map(v => (
                <span key={v} className="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-lg text-[10px] font-black text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  {opt.type === 'color' && (
                    <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" style={{ backgroundColor: opt.colorValues?.[v] || v }} />
                  )}
                  {v}
                  <X size={10} className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => setOptions(options.map(o => o.id === opt.id ? {...o, values: o.values.filter(x => x !== v)} : o))} />
                </span>
              ))}
            </div>

            <div className="flex gap-1.5 items-end">
              <div className="flex-1">
                <input className="w-full bg-gray-50 dark:bg-slate-900 p-2.5 rounded-xl text-[10px] font-bold text-gray-900 dark:text-white outline-none border border-gray-100 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-accent transition-colors shadow-inner text-right" placeholder="اكتب واضغط Enter..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const val = (e.target as any).value.trim(); if (val) handleAddValue(opt.id, val); (e.target as any).value = ''; } }} />
              </div>
              {opt.type === 'color' && (
                <input type="color" className="w-9 h-9 rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer" value="#000000" onChange={e => {
                  const hex = e.target.value;
                  const newOpts = options.map(o => {
                    if (o.id !== opt.id) return o;
                    return { ...o, colorValues: { ...o.colorValues, [hex]: hex } };
                  });
                  setOptions(newOpts);
                }} />
              )}
            </div>

            {opt.type === 'color' && opt.values.length > 0 && (
              <div className="flex gap-1.5 justify-end flex-wrap">
                {opt.values.map(v => (
                  <div key={v} className="flex flex-col items-center gap-0.5">
                    <input type="color" className="w-7 h-7 rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer p-0" value={opt.colorValues?.[v] || '#000000'} onChange={e => {
                      const hex = e.target.value;
                      setOptions(options.map(o => o.id === opt.id ? {...o, colorValues: { ...o.colorValues, [v]: hex }} : o));
                    }} />
                    <span className="text-[7px] text-gray-400">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-accent" />
          <span className="text-[10px] font-black text-gray-600 dark:text-gray-400">تعديل الكل مرة واحدة</span>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-1.5">
            <div className="flex flex-col gap-0.5"><span className="text-[7px] font-black text-gray-400">الكمية</span>
              <input type="number" className="w-16 p-1.5 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-lg text-center font-black text-xs focus:border-accent outline-none" value={bulkQty} onChange={e => setBulkQty(e.target.value)} /></div>
            <button onClick={applyQtyToAll} className="px-2.5 py-1.5 bg-accent text-white font-black rounded-lg text-[9px] hover:opacity-90 active:scale-95 transition-all">تطبيق</button>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex flex-col gap-0.5"><span className="text-[7px] font-black text-gray-400">السعر</span>
              <input type="number" className="w-20 p-1.5 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-lg text-center font-black text-xs focus:border-accent outline-none" value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} /></div>
            <button onClick={applyPriceToAll} className="px-2.5 py-1.5 bg-accent text-white font-black rounded-lg text-[9px] hover:opacity-90 active:scale-95 transition-all">تطبيق</button>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex flex-col gap-0.5"><span className="text-[7px] font-black text-gray-400">حد التنبيه</span>
              <input type="number" className="w-16 p-1.5 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-lg text-center font-black text-xs focus:border-accent outline-none" value={bulkThreshold} onChange={e => setBulkThreshold(e.target.value)} /></div>
            <button onClick={applyThresholdToAll} className="px-2.5 py-1.5 bg-accent text-white font-black rounded-lg text-[9px] hover:opacity-90 active:scale-95 transition-all">تطبيق</button>
          </div>
        </div>
      </div>

      <div className="rounded-[20px] border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm bg-white dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[11px]">
            <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="p-2.5 font-black text-gray-500 dark:text-gray-300 uppercase">المتغير</th>
                <th className="p-2.5 font-black text-gray-500 dark:text-gray-300 uppercase text-center">البيانات</th>
                <th className="p-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
              {p.variants.map((v, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="p-2.5 font-black text-gray-900 dark:text-white whitespace-nowrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {v.optionValues && Object.entries(v.optionValues).map(([k, val]) => {
                        const opt = options.find(o => o.name === k);
                        if (!opt) return null;
                        if (opt.type === 'color') {
                          const hex = opt.colorValues?.[val] || val;
                          return <span key={k} className="inline-flex items-center gap-1 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-md text-[9px]"><span className="w-2.5 h-2.5 rounded-full border" style={{backgroundColor: hex}} />{val}</span>;
                        }
                        if (opt.type === 'buttons') {
                          return <span key={k} className="inline-flex items-center gap-1 bg-accent/10 text-accent px-1.5 py-0.5 rounded-md text-[9px] font-bold">{val}</span>;
                        }
                        return <span key={k} className="inline-flex items-center gap-1 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-md text-[9px]">{val}</span>;
                      })}
                      {(!v.optionValues || Object.keys(v.optionValues).length === 0) && <span>{v.size} - {v.color}</span>}
                    </div>
                  </td>
                  <td className="p-2.5 text-center">
                    <div className="flex flex-wrap justify-center gap-2">
                      <div className="inline-flex items-center gap-1">
                        <span className="text-[7px] text-gray-400 font-black">الكمية</span>
                        <input type="number" className="w-12 p-1 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-lg text-center font-black text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-accent outline-none" value={v.quantity} onChange={e => { const nv = [...p.variants]; nv[i].quantity = Number(e.target.value); setP({...p, variants: nv})}} />
                      </div>
                      <div className="inline-flex items-center gap-1">
                        <span className="text-[7px] text-gray-400 font-black">السعر</span>
                        <input type="number" className="w-14 p-1 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-lg text-center font-black text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-accent outline-none" value={v.price} onChange={e => { const nv = [...p.variants]; nv[i].price = Number(e.target.value); setP({...p, variants: nv})}} />
                      </div>
                    </div>
                  </td>
                  <td className="p-2.5 text-center">
                    <button type="button" onClick={() => removeVariant(i)} className="text-gray-500 hover:text-red-500 transition-colors p-1.5"><Trash2 size={13}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const stepContents = [renderStep1, renderStep2];

  return (
    <MD3Dialog
      isOpen={true}
      onClose={() => withUnsavedCheck(onClose)}
      title={isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}
      icon={<span className="material-symbols-rounded" style={{ fontSize: 24 }}>inventory_2</span>}
      maxWidth="xl"
      actions={[
        ...(isEdit ? [{ label: 'حذف', onClick: () => { if(window.confirm('هل أنت متأكد من حذف المنتج نهائياً من النظام؟')) { markClean(); onDeleteAction(product!.id); onClose(); } }, variant: 'danger' as const }] : []),
        { label: 'إلغاء', onClick: () => withUnsavedCheck(onClose), variant: 'text' as const },
        { label: currentStep === 1 ? 'حفظ المنتج' : 'التالي', onClick: () => { if (currentStep < 1) { setCurrentStep(currentStep + 1); } else { markClean(); onSave({...p, options}); } }, variant: 'filled' as const }
      ]}
    >
      <div dir="rtl" className="text-right">
        {isEdit && (
          <div className="px-6 pt-2 pb-0">
            <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 dark:text-gray-500">
              <span>تاريخ الإضافة: {formatDate(product!.createdAt, 'full')}</span>
              {product!.updatedAt && <><span className="opacity-40">|</span><span>آخر تعديل: {formatDate(product!.updatedAt, 'full')}</span></>}
            </div>
          </div>
        )}

        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 dark:bg-slate-700" />
            <div className="absolute top-4 right-0 h-0.5 bg-accent transition-all duration-300" style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }} />
            {STEPS.map((step, idx) => (
              <button key={idx} onClick={() => idx <= currentStep && setCurrentStep(idx)}
                className={`relative z-10 flex flex-col items-center gap-1.5 group/step ${idx <= currentStep ? 'cursor-pointer' : 'cursor-default'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 border-2
                  ${idx < currentStep ? 'bg-accent border-accent text-white' : idx === currentStep ? 'bg-accent/10 border-accent text-accent' : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-gray-500'}`}>
                  {idx < currentStep ? <Check size={16} /> : <span className="material-symbols-rounded" style={{ fontSize: 18 }}>{step.icon}</span>}
                </div>
                <div className="text-center hidden sm:block">
                  <div className={`text-[10px] font-black ${idx === currentStep ? 'text-accent' : idx < currentStep ? 'text-accent/70' : 'text-gray-400 dark:text-gray-500'}`}>{step.label}</div>
                  <div className="text-[8px] text-gray-400 dark:text-gray-500">{step.desc}</div>
                </div>
                <div className="sm:hidden text-center">
                  <div className={`text-[9px] font-black ${idx === currentStep ? 'text-accent' : idx < currentStep ? 'text-accent/70' : 'text-gray-400 dark:text-gray-500'}`}>{step.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 pb-2 pt-2">
          <div className="flex items-center justify-between">
            {currentStep > 0 ? (
              <button onClick={() => setCurrentStep(currentStep - 1)} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-accent transition-colors px-3 py-2 rounded-xl hover:bg-accent/5">
                <ChevronRight size={16} /> السابق
              </button>
            ) : <div />}
            {currentStep < 1 ? (
              <button onClick={() => setCurrentStep(currentStep + 1)} className="flex items-center gap-1.5 text-xs font-bold text-white bg-accent px-4 py-2 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md">
                التالي <ChevronLeft size={16} />
              </button>
            ) : (
              <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500">
                <span className="material-symbols-rounded" style={{ fontSize: 14 }}>info</span>
                اضغط "حفظ المنتج" لإتمام العملية
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
          {stepContents[currentStep]()}
        </div>
      </div>
    </MD3Dialog>
  );
};

export default ProductModal;
