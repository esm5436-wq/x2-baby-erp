
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatDate } from '../lib/formatDate';
import { useSearchParams } from 'react-router-dom';
import CollapsibleSection from './CollapsibleSection';
import { 
  Package, 
  Search, 
  Plus, 
  Minus, 
  AlertTriangle, 
  Layers, 
  RefreshCw, 
  X, 
  ImageIcon,
  Edit2,
  Tag,
  Sparkles,
  Coins,
  Upload,
  Trash2,
  Palette,
  AlertCircle,
  Save,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Check,
  Ban,
  Copy,
  Globe,
  FileJson,
  Link as LinkIcon,
  Bell,
  Eye,
  EyeOff,
  ExternalLink,
  CheckSquare,
  Square,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  HelpCircle,
  TrendingUp,
  Target,
  Trophy,
  XCircle,
  Pencil,
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Variant, Category, Branding, ViewMode, Order, Supplier } from '../types';
import ProductModal from './ProductModal';
import BatchEditModal from './BatchEditModal';
import type { BatchField } from './BatchEditModal';
import ViewSwitcher from './ViewSwitcher';
import { exportToExcel, exportToPDF, exportToHTML, exportToCSV, exportToJSON } from '../lib/exportService';

interface InventoryProps {
  products: Product[];
  categories: Category[];
  branding?: Branding;
  onUpdateProduct: (product: Product) => void;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onDeleteMultipleProducts: (productIds: string[]) => void;
  onBatchUpdateProducts: (ids: string[], updates: Record<string, any>) => void;
  isLoading: boolean;
  importProductsPreview: Product[] | null;
  onImportProductsFetch: (source: 'url' | 'file', data: string | Product[]) => Promise<void>;
  onImportProductsConfirm: (products: Product[]) => Promise<void>;
  onImportProductsClose: () => void;
  suppliers: any[];
  contacts: any[];
  orders: Order[];
}

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

const SyncProductEditor: React.FC<{ 
  product: Product; 
  isSaved: boolean;
  onSave: (product: Product) => void;
  onRemove: () => void;
  categories?: Category[];
  suppliers?: any[];
  contacts?: any[];
}> = ({ product, isSaved, onSave, onRemove, categories, suppliers, contacts }) => {
  const [showPriceHelp, setShowPriceHelp] = useState(false);
  const [localProduct, setLocalProduct] = useState<Product>(() => {
    const clone = JSON.parse(JSON.stringify(product));
    if (clone.wholesalePrice === undefined) clone.wholesalePrice = clone.costPrice || 0;
    if (clone.packagingCost === undefined) clone.packagingCost = 0;
    return clone;
  });
  const [options, setOptions] = useState<OptionCategory[]>(() => {
    const sizes = Array.from(new Set(product.variants.map(v => v.size))).filter(v => v !== 'واحد') as string[];
    const colors = Array.from(new Set(product.variants.map(v => v.color))).filter(v => v !== 'متعدد') as string[];
    const opts: OptionCategory[] = [];
    if (sizes.length > 0) opts.push({ id: 'opt-size', name: 'المقاس', values: sizes });
    if (colors.length > 0) opts.push({ id: 'opt-color', name: 'اللون', values: colors });
    return opts;
  });

  const [bulkQty, setBulkQty] = useState<string>('0');
  const [bulkPrice, setBulkPrice] = useState<string>(product.price.toString());
  const [bulkThreshold, setBulkThreshold] = useState<string>('2');
  const [deletedKeys, setDeletedKeys] = useState<Set<string>>(new Set());
  const localProductRef = useRef(localProduct);
  localProductRef.current = localProduct;

  useEffect(() => {
    const prod = localProductRef.current;
    if (isSaved) return;
    if (options.length === 0) {
      if (prod.variants.length !== 1 || (prod.variants.length > 0 && prod.variants[0].size !== 'واحد')) {
        setLocalProduct(prev => ({
          ...prev,
          variants: [{ id: `v-main-${Date.now()}`, size: 'واحد', color: 'متعدد', quantity: prev.variants[0]?.quantity || 0, price: prev.price, lowStockThreshold: 2 }]
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

        const existing = prod.variants.find(v => v.size === sizeStr && v.color === colorStr);
        return {
          id: existing?.id || `v-${Math.random().toString(36).substr(2, 9)}`,
          size: sizeStr,
          color: colorStr,
          quantity: existing?.quantity || 0,
          price: existing?.price || prod.price,
          lowStockThreshold: existing?.lowStockThreshold || 2
        };
      })
      .filter(v => v !== null) as Variant[];

    setLocalProduct(prev => ({ ...prev, variants: newVariants }));
  }, [options, isSaved, deletedKeys]);

  const handleAddValue = (id: string, val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    setOptions(options.map(opt => opt.id === id ? { ...opt, values: opt.values.includes(trimmed) ? opt.values : [...opt.values, trimmed] } : opt));
  };

  const applyQtyToAll = () => {
    setLocalProduct({
      ...localProduct,
      variants: localProduct.variants.map(v => ({...v, quantity: parseInt(bulkQty) || 0}))
    });
  };

  const applyPriceToAll = () => {
    const priceVal = Number(bulkPrice) || 0;
    setLocalProduct({
      ...localProduct,
      price: priceVal,
      variants: localProduct.variants.map(v => ({...v, price: priceVal}))
    });
  };

  const applyThresholdToAll = () => {
    setLocalProduct({
      ...localProduct,
      variants: localProduct.variants.map(v => ({...v, lowStockThreshold: parseInt(bulkThreshold) || 0}))
    });
  };

  const removeVariant = (idx: number) => {
    if (localProduct.variants.length <= 1) return alert('يجب بقاء متغير واحد');
    const variantToRemove = localProduct.variants[idx];
    setDeletedKeys(prev => new Set([...prev, `${variantToRemove.size}-${variantToRemove.color}`]));
    const newVars = [...localProduct.variants];
    newVars.splice(idx, 1);
    setLocalProduct({ ...localProduct, variants: newVars });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 px-2 uppercase tracking-widest">اسم المنتج</label>
          <input className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-gray-900 dark:text-white focus:border-accent outline-none transition-all" value={localProduct.name} onChange={e => setLocalProduct({...localProduct, name: e.target.value})} disabled={isSaved} />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 px-2 uppercase tracking-widest">الوسوم (Tags)</label>
          <div className="flex flex-wrap gap-1 mb-1 min-h-[30px]">
            {localProduct.tags?.map(tag => (
              <span key={tag} className="bg-accent/10 text-accent px-2 py-0.5 rounded-lg text-[9px] font-bold flex items-center gap-1 border border-accent/20">
                {tag}
                {!isSaved && (
                  <button onClick={() => setLocalProduct({...localProduct, tags: localProduct.tags?.filter(t => t !== tag)})}>
                    <X size={10} />
                  </button>
                )}
              </span>
            ))}
          </div>
          <input 
            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-gray-900 dark:text-white focus:border-accent outline-none transition-all text-xs" 
            placeholder="أضف وسوم (افصل بفاصلة أو اضغط Enter)..." 
            disabled={isSaved}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const val = (e.target as HTMLInputElement).value.trim();
                if (val && !localProduct.tags?.includes(val)) {
                  setLocalProduct({...localProduct, tags: [...(localProduct.tags || []), val]});
                  (e.target as HTMLInputElement).value = '';
                }
              }
            }}
            onChange={e => {
              const val = e.target.value;
              if (val.endsWith(',') || val.endsWith('،')) {
                const tag = val.slice(0, -1).trim();
                if (tag && !localProduct.tags?.includes(tag)) {
                  setLocalProduct({...localProduct, tags: [...(localProduct.tags || []), tag]});
                  e.target.value = '';
                }
              }
            }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 px-2 uppercase tracking-widest">سعر البيع</label>
          <div className="relative group/price">
            <input type="number" className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-black text-gray-900 dark:text-white focus:border-accent outline-none transition-all" value={localProduct.price} onChange={e => setLocalProduct({...localProduct, price: Number(e.target.value)})} disabled={isSaved} />
            
            {!isSaved && (localProduct.wholesalePrice || 0) > 0 && (
              <div className="mt-3 p-3 bg-accent/5 rounded-2xl border border-accent/10 space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-1.5 text-accent">
                    <Sparkles size={14} className="animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-wider">اقتراح ذكي</span>
                    <HelpCircle 
                      size={12} 
                      className="cursor-pointer hover:text-accent-hover transition-colors" 
                      onClick={() => setShowPriceHelp(!showPriceHelp)}
                    />
                  </div>
                  <button onClick={() => {
                    const cost = (localProduct.wholesalePrice || 0) + (localProduct.packagingCost || 0);
                    const suggested = Math.ceil((cost * 1.45) / 5) * 5 - 1;
                    setLocalProduct({...localProduct, price: suggested});
                  }} className="text-[9px] font-black bg-accent text-white px-2 py-1 rounded-lg">تطبيق</button>
                </div>

                {showPriceHelp && (
                  <div className="bg-white dark:bg-slate-900 border border-accent/20 rounded-xl p-3 space-y-2 shadow-xl animate-in fade-in slide-in-from-top-1 duration-300 relative z-20">
                    <div className="flex items-start gap-2">
                      <TrendingUp size={14} className="text-blue-500 mt-0.5" />
                      <div>
                        <h4 className="text-[8px] font-black text-gray-900 dark:text-white mb-0.5">تسعير &quot;سريع&quot;</h4>
                        <p className="text-[7px] text-gray-500 leading-tight">للنمو السريع وبناء قاعدة عملاء.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Target size={14} className="text-accent mt-0.5" />
                      <div>
                        <h4 className="text-[8px] font-black text-gray-900 dark:text-white mb-0.5">تسعير &quot;متوازن&quot;</h4>
                        <p className="text-[7px] text-gray-500 leading-tight">المثالي لاستدامة الأرباح.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Trophy size={14} className="text-emerald-500 mt-0.5" />
                      <div>
                        <h4 className="text-[8px] font-black text-gray-900 dark:text-white mb-0.5">تسعير &quot;مميز&quot;</h4>
                        <p className="text-[7px] text-gray-500 leading-tight">للمنتجات الحصرية والجودة.</p>
                      </div>
                    </div>
                    <p className="text-[6px] text-gray-400 dark:text-gray-500 font-bold italic pt-1 border-t border-gray-50 uppercase">
                      * نتبع قواعد التسعير النفسي.
                    </p>
                  </div>
                )}

                <div className="flex gap-2 relative z-10">
                  {[
                    { label: 'سريع', m: 1.25 },
                    { label: 'متوازن', m: 1.67 },
                    { label: 'مميز', m: 2.5 }
                  ].map(t => {
                    const cost = (localProduct.wholesalePrice || 0) + (localProduct.packagingCost || 0);
                    let s = Math.ceil((cost * t.m) / 5) * 5;
                    if (s > 10) s -= 1;
                    return (
                      <button key={t.label} onClick={() => setLocalProduct({...localProduct, price: s})} className="flex-1 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 p-1 rounded-lg text-center hover:border-accent transition-all">
                        <div className="text-[7px] font-black text-gray-400 dark:text-gray-500">{t.label}</div>
                        <div className="text-[9px] font-black text-accent">{s}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Image */}
      <div className="space-y-1">
        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 px-2 uppercase tracking-widest">صورة المنتج</label>
        <div className="flex items-center gap-4">
          {localProduct.image && (
            <img src={localProduct.image} className="w-20 h-20 rounded-2xl object-cover border border-gray-200 dark:border-slate-700" />
          )}
          <input className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-gray-900 dark:text-white focus:border-accent outline-none transition-all text-xs" value={localProduct.image || ''} onChange={e => setLocalProduct({...localProduct, image: e.target.value})} disabled={isSaved} placeholder="رابط الصورة أو المسار" />
        </div>
      </div>
      {/* Description */}
      <div className="space-y-1">
        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 px-2 uppercase tracking-widest">الوصف</label>
        <textarea className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-gray-900 dark:text-white focus:border-accent outline-none transition-all text-xs resize-none" rows={3} value={localProduct.description || ''} onChange={e => setLocalProduct({...localProduct, description: e.target.value})} disabled={isSaved} placeholder="وصف المنتج..." />
      </div>
      {/* Category, Brand, Supplier */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 px-2 uppercase tracking-widest">التصنيف</label>
          <select className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-gray-900 dark:text-white focus:border-accent outline-none transition-all" value={localProduct.category || ''} onChange={e => setLocalProduct({...localProduct, category: e.target.value})} disabled={isSaved}>
            <option value="">بدون تصنيف</option>
            {(categories || []).map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 px-2 uppercase tracking-widest">العلامة التجارية</label>
          <input className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-gray-900 dark:text-white focus:border-accent outline-none transition-all" value={localProduct.brand || ''} onChange={e => setLocalProduct({...localProduct, brand: e.target.value})} disabled={isSaved} placeholder="براند" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 px-2 uppercase tracking-widest">المورد</label>
          <select className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-gray-900 dark:text-white focus:border-accent outline-none transition-all" value={localProduct.supplierId || ''} onChange={e => setLocalProduct({...localProduct, supplierId: e.target.value})} disabled={isSaved}>
            <option value="">بدون مورد</option>
            {(suppliers || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            {(contacts || []).filter(c => c.entity_type === 'مصنع' || c.entity_type === 'تاجر جملة').map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>
          </div>
        </motion.div>
  );
};

const SyncReviewModal: React.FC<{ products: Product[]; onSaveItem: (p: Product) => void; onSaveAll: (ps: Product[]) => void; onClose: () => void; categories?: Category[]; suppliers?: any[]; contacts?: any[]; }> = ({ products, onSaveItem, onSaveAll, onClose, categories, suppliers, contacts }) => {
  const [localProducts, setLocalProducts] = useState<Product[]>(JSON.parse(JSON.stringify(products)));
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(products[0]?.id || null);

  const handleSaveProduct = (prod: Product) => {
    onSaveItem(prod);
    setSavedIds(prev => new Set([...prev, prod.id]));
    const next = localProducts.find(p => p.id !== prod.id && !savedIds.has(p.id));
    if (next) setExpandedId(next.id);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-5xl shadow-2xl relative flex flex-col max-h-[90vh] border border-white/20 dark:border-slate-800">
        <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-[40px] z-10 shadow-sm">
          <div><h3 className="text-2xl font-black text-gray-900 dark:text-white">مراجعة المنتجات المستوردة</h3></div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 dark:text-gray-500 hover:text-red-500 transition-all"><X size={32} /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-gray-50/50 dark:bg-slate-950/50">
          {localProducts.map(prod => (
            <motion.div 
              key={prod.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`border-2 rounded-[36px] overflow-hidden bg-white dark:bg-slate-800 shadow-lg transition-all ${savedIds.has(prod.id) ? 'opacity-60 border-emerald-100 dark:border-emerald-900/30' : 'border-white dark:border-slate-800'}`}
            >
              <button onClick={() => setExpandedId(expandedId === prod.id ? null : prod.id)} className="w-full flex items-center gap-6 p-6 text-right group">
                <motion.img 
                  whileHover={{ scale: 1.1 }}
                  src={prod.image} 
                  className="w-20 h-20 rounded-[24px] object-cover shadow-md border border-gray-100 dark:border-slate-700" 
                />
                <div className="flex-1">
                  <h4 className="font-black text-xl text-gray-900 dark:text-white">{prod.name}</h4>
                  <div className="flex gap-4 mt-1 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest"><span>{(prod.price || 0).toLocaleString()} ج.م</span><span>{prod.category}</span></div>
                </div>
                {savedIds.has(prod.id) ? <Check className="text-emerald-500" size={32} strokeWidth={3}/> : <ChevronDown className={`text-gray-400 dark:text-gray-500 transition-transform duration-300 ${expandedId === prod.id ? 'rotate-180 text-accent' : ''}`} size={32}/>}
              </button>
              <AnimatePresence>
                {expandedId === prod.id && !savedIds.has(prod.id) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="p-8 bg-white dark:bg-slate-800 border-t border-gray-50 dark:border-slate-700">
                      <SyncProductEditor product={prod} isSaved={false} onSave={handleSaveProduct} onRemove={() => setLocalProducts(prev => prev.filter(p => p.id !== prod.id))} categories={categories} suppliers={suppliers} contacts={contacts} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
        <div className="p-8 border-t dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 rounded-b-[40px] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <div className="text-xl font-black text-gray-900 dark:text-white">المتبقي: <span className="text-accent">{localProducts.length - savedIds.size}</span> منتجات</div>
          <div className="flex gap-4">
            <button onClick={() => onSaveAll(localProducts.filter(p => !savedIds.has(p.id)))} className="bg-emerald-600 text-white font-black px-12 py-5 rounded-[24px] shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-3 text-lg"><Check size={28} strokeWidth={3}/> تخطى وحفظ المنتجات كما هى</button>
            <button onClick={onClose} className="px-10 py-5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded-[24px] font-black hover:bg-gray-200 dark:hover:bg-slate-700 transition-all">إغلاق</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Inventory: React.FC<InventoryProps> = React.memo(({ 
  products, 
  categories, 
  branding,
  onUpdateProduct, 
  onSaveProduct, 
  onDeleteProduct, 
  onDeleteMultipleProducts, 
  onBatchUpdateProducts, 
  isLoading, 
  importProductsPreview, 
  onImportProductsFetch, 
  onImportProductsConfirm, 
  onImportProductsClose, 
  suppliers,
  contacts,
  orders
}) => {
  const categoryOptions = useMemo(() => {
    if (!categories) return [];
    const opts: { label: string; value: string }[] = [];
    categories.filter((c: Category) => !c.parentId).forEach((mainCat: Category) => {
      opts.push({ label: mainCat.name, value: mainCat.name });
      categories.filter((sub: Category) => sub.parentId === mainCat.id).forEach((subCat: Category) => {
        opts.push({ label: `${mainCat.name} > ${subCat.name}`, value: `${mainCat.name} > ${subCat.name}` });
      });
    });
    return opts;
  }, [categories]);

  const supplierOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [];
    (suppliers || []).forEach((s: Supplier) => {
      opts.push({ label: `${s.name} (${s.phone}${s.phone2 ? ` / ${s.phone2}` : ''})`, value: s.id });
    });
    (contacts || [])
      .filter((c: any) => c.entityType === 'مصنع' || c.entityType === 'تاجر جملة')
      .forEach((c: any) => {
        opts.push({ label: `${c.companyName} (${c.phone}${c.phone2 ? ` / ${c.phone2}` : ''})`, value: c.id });
      });
    return opts;
  }, [suppliers, contacts]);

  const allSupplierEntities = useMemo(() => {
    const map: Record<string, string> = {};
    (suppliers || []).forEach((s: Supplier) => { map[s.id] = s.name; });
    (contacts || [])
      .filter((c: any) => c.entityType === 'مصنع' || c.entityType === 'تاجر جملة')
      .forEach((c: any) => { map[c.id] = c.companyName; });
    return map;
  }, [suppliers, contacts]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    products.forEach(p => p.tags?.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [products]);

  const batchProductFields: BatchField[] = [
    { key: 'price', label: 'سعر البيع', type: 'number' },
    { key: 'costPrice', label: 'التكلفة', type: 'number' },
    { key: 'wholesalePrice', label: 'سعر الجملة', type: 'number' },
    { key: 'packagingCost', label: 'تكلفة التغليف', type: 'number' },
    { key: 'category', label: 'التصنيف', type: 'select', options: categoryOptions },
    { key: 'supplierId', label: 'المورد', type: 'select', options: supplierOptions },
    { key: 'tags', label: 'الوسوم', type: 'text', suggestions: allTags },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(value);
  };
  const [q, setQ] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [modal, setModal] = useState<{open: boolean, p?: Product}>({open: false});
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  useEffect(() => { if (viewingProductId) setGalleryIndex(0); }, [viewingProductId]);
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const entityId = searchParams.get('entityId');
    if (entityId && products.length > 0) {
      const found = products.find(p => p.id === entityId);
      if (found) setViewingProductId(found.id);
    }
  }, [searchParams, products]);
  const [importStep, setImportStep] = useState<'none' | 'source' | 'url_input'>('none');
  const [importUrl, setImportUrl] = useState('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minStock, setMinStock] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [selectedColor, setSelectedColor] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isExportSettingsOpen, setIsExportSettingsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem('erp_view_inventory') as ViewMode) || 'grid');
  useEffect(() => { localStorage.setItem('erp_view_inventory', viewMode); }, [viewMode]);
  const [imageFitContain, setImageFitContain] = useState(() => localStorage.getItem('erp_image_fit') === 'true');
  useEffect(() => { localStorage.setItem('erp_image_fit', String(imageFitContain)); }, [imageFitContain]);
  const [exportConfig, setExportConfig] = useState({
    includeVariants: true,
    includeCosts: true,
    includeImages: false, // PDF only toggle
    format: 'excel' as 'excel' | 'pdf' | 'html',
    selectedColumns: ['id', 'sku', 'name', 'category', 'supplier', 'tags', 'quantity', 'price']
  });

  const availableColumns = [
    { id: 'id', label: 'المعرف' },
    { id: 'sku', label: 'SKU' },
    { id: 'name', label: 'اسم المنتج' },
    { id: 'category', label: 'التصنيف' },
    { id: 'supplier', label: 'المورد' },
    { id: 'tags', label: 'الوسوم' },
    { id: 'url', label: 'رابط المنتج' },
    { id: 'size', label: 'المقاس' },
    { id: 'color', label: 'اللون' },
    { id: 'quantity', label: 'الكمية' },
    { id: 'price', label: 'سعر البيع' },
    { id: 'wholesalePrice', label: 'سعر الجملة' },
    { id: 'packagingCost', label: 'تكلفة التغليف' },
    { id: 'totalCost', label: 'إجمالي تكلفة القطعة' },
    { id: 'total_sale', label: 'إجمالي (بيع)' },
    { id: 'total_cost_val', label: 'إجمالي (تكلفة)' }
  ];

  const toggleColumn = (colId: string) => {
    setExportConfig(prev => ({
      ...prev,
      selectedColumns: prev.selectedColumns.includes(colId)
        ? prev.selectedColumns.filter(c => c !== colId)
        : [...prev.selectedColumns, colId]
    }));
  };
  
  const allSizes = useMemo(() => {
    const sizes = new Set<string>();
    products.forEach(p => p.variants.forEach(v => { if (v.size) sizes.add(v.size); }));
    return Array.from(sizes).sort();
  }, [products]);

  const allColors = useMemo(() => {
    const colors = new Set<string>();
    products.forEach(p => p.variants.forEach(v => { if (v.color) colors.add(v.color); }));
    return Array.from(colors).sort();
  }, [products]);

  const validCategoryStrings = useMemo(() => {
    const names = new Set<string>();
    categories.forEach(cat => {
      names.add(cat.name);
      if (cat.parentId) {
        const parent = categories.find(p => p.id === cat.parentId);
        if (parent) {
          names.add(`${parent.name} > ${cat.name}`);
        }
      }
    });
    return names;
  }, [categories]);

  const filtered = useMemo(() => {
    const priceNum = parseFloat(q);
    const isNumericSearch = q !== '' && !isNaN(priceNum);
    let result = products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(q.toLowerCase()) || 
                          (p.sku || '').toLowerCase().includes(q.toLowerCase()) ||
                          p.category.toLowerCase().includes(q.toLowerCase()) ||
                          p.tags?.some(t => t.toLowerCase().includes(q.toLowerCase())) ||
                          (p.url || '').toLowerCase().includes(q.toLowerCase()) ||
                          p.variants.some(v => v.size.toLowerCase().includes(q.toLowerCase()) || v.color.toLowerCase().includes(q.toLowerCase())) ||
                          (isNumericSearch && (p.price === priceNum || p.costPrice === priceNum || p.wholesalePrice === priceNum));
      const matchSupplier = selectedSupplierId === 'all' || p.supplierId === selectedSupplierId;
      const matchCategory = selectedCategory === 'all' || 
                            p.category === selectedCategory || 
                            p.category.startsWith(selectedCategory + ' > ');
      const matchTag = selectedTag === 'all' || p.tags?.includes(selectedTag);
      const matchPrice = (minPrice === '' || p.price >= parseFloat(minPrice)) &&
                         (maxPrice === '' || p.price <= parseFloat(maxPrice));
      const matchSize = selectedSize === 'all' || p.variants.some(v => v.size === selectedSize);
      const matchColor = selectedColor === 'all' || p.variants.some(v => v.color === selectedColor);
      const totalStock = p.variants.reduce((sum, v) => sum + v.quantity, 0);
      const matchStock = (minStock === '' || totalStock >= parseFloat(minStock)) &&
                         (maxStock === '' || totalStock <= parseFloat(maxStock));
      return matchSearch && matchSupplier && matchCategory && matchTag && matchPrice && matchSize && matchColor && matchStock;
    });

    return [...result].sort((a, b) => {
      let va: any, vb: any;
      switch (sortField) {
        case 'name': va = a.name; vb = b.name; break;
        case 'price': va = a.price ?? 0; vb = b.price ?? 0; break;
        case 'stock':
          va = a.variants.reduce((sum, v) => sum + v.quantity, 0);
          vb = b.variants.reduce((sum, v) => sum + v.quantity, 0);
          break;
        default: va = a.createdAt || ''; vb = b.createdAt || '';
      }
      if (typeof va === 'number' && typeof vb === 'number') return sortAsc ? va - vb : vb - va;
      return sortAsc ? (va || '').localeCompare(vb || '', 'ar') : (vb || '').localeCompare(va || '', 'ar');
    });
  }, [products, q, selectedSupplierId, selectedCategory, selectedTag, sortField, sortAsc, minPrice, maxPrice, minStock, maxStock, selectedSize, selectedColor]);

  const inventoryStats = useMemo(() => {
    let totalCost = 0;
    let totalSales = 0;
    let totalQuantity = 0;

    products.forEach(p => {
      p.variants.forEach(v => {
        totalQuantity += v.quantity;
        totalCost += (v.quantity * (p.costPrice || 0));
        totalSales += (v.quantity * (v.price || p.price || 0));
      });
    });

    return { totalCost, totalSales, totalQuantity };
  }, [products]);

  const importJsonInputRef = useRef<HTMLInputElement>(null);

  const staggerVariants = useMemo(() => ({
    show: { transition: { staggerChildren: 0.05 } }
  }), []);

  const cardVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1 }
  }), []);

  const hoverVariants = useMemo(() => ({ y: -8, scale: 1.02 }), []);

  const handleImportSourceChoice = (source: 'feed' | 'json') => {
    if (source === 'feed') setImportStep('url_input');
    else importJsonInputRef.current?.click();
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const products = Array.isArray(parsed) ? parsed : (parsed.products || parsed.data || []);
        onImportProductsFetch('file', products);
      } catch { alert('الملف غير صالح'); }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
    setImportStep('none');
  };

  const handleImportUrlSubmit = () => {
    if (!importUrl.trim()) return alert('يرجى إدخال رابط صالح');
    onImportProductsFetch('url', importUrl.trim());
    setImportStep('none');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`هل أنت متأكد من حذف ${selectedIds.size} منتج نهائياً؟`)) {
      onDeleteMultipleProducts(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleProfessionalExport = async () => {
    setIsExporting(true);
    try {
      const selectedProducts = products.filter(p => (selectedIds.size > 0 ? selectedIds.has(p.id) : filtered.map(f => f.id).includes(p.id)));
      
      if (selectedProducts.length === 0) {
        alert('لا توجد منتجات محددة للتصدير');
        setIsExporting(false);
        return;
      }

      // Construct columns dynamically based on exportConfig
      const excelColumns: any[] = [];
      
      availableColumns.forEach(col => {
        if (exportConfig.selectedColumns.includes(col.id)) {
          excelColumns.push({ 
            header: col.label, 
            key: col.id, 
            width: col.id === 'name' ? 35 : (col.id === 'url' ? 40 : 18) 
          });
        }
      });

      const excelExportData: any[] = [];
      const needsVariants = exportConfig.selectedColumns.includes('size') || exportConfig.selectedColumns.includes('color');
      
      selectedProducts.forEach(p => {
        const supplierName = p.supplierId ? allSupplierEntities[p.supplierId] || '-' : '-';
        const tagsString = p.tags?.join(', ') || '-';
        const wholesale = p.wholesalePrice || p.costPrice || 0;
        const packaging = p.packagingCost || 0;
        const totalCostItem = wholesale + packaging;

        if ((exportConfig.includeVariants || needsVariants) && p.variants.length > 0) {
          p.variants.forEach(v => {
            const row: any = {};
            if (exportConfig.selectedColumns.includes('id')) row.id = p.id;
            if (exportConfig.selectedColumns.includes('name')) row.name = p.name;
            if (exportConfig.selectedColumns.includes('category')) row.category = p.category;
            if (exportConfig.selectedColumns.includes('supplier')) row.supplier = supplierName;
            if (exportConfig.selectedColumns.includes('tags')) row.tags = tagsString;
            if (exportConfig.selectedColumns.includes('url')) row.url = p.url || '-';
            if (exportConfig.selectedColumns.includes('size')) row.size = v.size;
            if (exportConfig.selectedColumns.includes('color')) row.color = v.color;
            if (exportConfig.selectedColumns.includes('quantity')) row.quantity = v.quantity;
            if (exportConfig.selectedColumns.includes('price')) row.price = v.price || p.price;
            if (exportConfig.selectedColumns.includes('wholesalePrice')) row.wholesalePrice = wholesale;
            if (exportConfig.selectedColumns.includes('packagingCost')) row.packagingCost = packaging;
            if (exportConfig.selectedColumns.includes('totalCost')) row.totalCost = totalCostItem;
            if (exportConfig.selectedColumns.includes('total_sale')) row.total_sale = Math.round((v.quantity * (v.price || p.price)) * 100) / 100;
            if (exportConfig.selectedColumns.includes('total_cost_val')) row.total_cost_val = Math.round((v.quantity * totalCostItem) * 100) / 100;
            
            excelExportData.push(row);
          });
        } else {
          const totalQty = p.variants.reduce((sum, v) => sum + v.quantity, 0);
          const row: any = {};
          if (exportConfig.selectedColumns.includes('id')) row.id = p.id;
          if (exportConfig.selectedColumns.includes('name')) row.name = p.name;
          if (exportConfig.selectedColumns.includes('category')) row.category = p.category;
          if (exportConfig.selectedColumns.includes('supplier')) row.supplier = supplierName;
          if (exportConfig.selectedColumns.includes('tags')) row.tags = tagsString;
          if (exportConfig.selectedColumns.includes('url')) row.url = p.url || '-';
          if (exportConfig.selectedColumns.includes('size')) row.size = 'متعدد';
          if (exportConfig.selectedColumns.includes('color')) row.color = 'متعدد';
          if (exportConfig.selectedColumns.includes('quantity')) row.quantity = totalQty;
          if (exportConfig.selectedColumns.includes('price')) row.price = p.price;
          if (exportConfig.selectedColumns.includes('wholesalePrice')) row.wholesalePrice = wholesale;
          if (exportConfig.selectedColumns.includes('packagingCost')) row.packagingCost = packaging;
          if (exportConfig.selectedColumns.includes('totalCost')) row.totalCost = totalCostItem;
          if (exportConfig.selectedColumns.includes('total_sale')) row.total_sale = Math.round((totalQty * p.price) * 100) / 100;
          if (exportConfig.selectedColumns.includes('total_cost_val')) row.total_cost_val = Math.round((totalQty * totalCostItem) * 100) / 100;
          
          excelExportData.push(row);
        }
      });

      // Stats for the Dashboard — matches inventoryStats in the UI
      const totalSalesValue = excelExportData.reduce((sum, d) => sum + (d.price * d.quantity), 0);
      const totalCostValue = selectedProducts.reduce((sum, p) => sum + p.variants.reduce((s, v) => s + v.quantity * (p.costPrice || 0), 0), 0);
      const totalQtyCount = excelExportData.reduce((sum, d) => sum + d.quantity, 0);
      const lowStockCount = selectedProducts.reduce((sum, p) => sum + p.variants.filter(v => v.quantity <= (v.lowStockThreshold || 0)).length, 0);

      const summaryData = [
        { label: 'إجمالي عدد القطع', value: totalQtyCount.toString() },
        { label: 'إجمالي القيمة (سعر البيع)', value: formatCurrency(totalSalesValue) },
        { label: 'إجمالي القيمة (التكلفة)', value: formatCurrency(totalCostValue) },
        { label: 'الأرباح المتوقعة', value: formatCurrency(totalSalesValue - totalCostValue), color: 'green' },
      ];

      if (exportConfig.format === 'excel') {
        await exportToExcel(excelExportData, `inventory_${Date.now()}`, 'جرد المخزون', excelColumns, summaryData, branding, { user: 'المسؤول', status: 'جرد مستمر' });
      } else if (exportConfig.format === 'pdf') {
        const pdfKeys = excelColumns.map(c => c.key);
        const pdfHeaders = excelColumns.map(c => c.header);
        
        const pdfFormattedData = excelExportData.map(d => {
          const formatted: any = { ...d };
          // Format all monetary fields if they exist in the row
          const moneyFields = ['price', 'wholesalePrice', 'packagingCost', 'totalCost', 'total_sale', 'total_cost_val', 'profit'];
          moneyFields.forEach(field => {
            if (formatted[field] !== undefined) {
              formatted[field] = formatCurrency(formatted[field]);
            }
          });
          return formatted;
        });
        
        await exportToPDF(pdfFormattedData, `inventory_${Date.now()}`, 'تقرير جرد المخزون الشامل', pdfHeaders, pdfKeys, undefined, summaryData, branding);
      } else if (exportConfig.format === 'html') {
        const htmlKeys = excelColumns.map(c => c.key);
        const htmlHeaders = excelColumns.map(c => c.header);
        
        // Pass raw data (no formatCurrency) so updateDashboard() calculates KPIs correctly
        // SummaryData is passed separately for correct initial KPI values
        exportToHTML(excelExportData, `inventory_${Date.now()}`, 'عرض جرد المخزون التفاعلي', htmlHeaders, htmlKeys, branding, summaryData);
      }
      
      setIsExportSettingsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = (format: 'json' | 'csv' | 'excel' | 'pdf') => {
    const targetProducts = selectedIds.size > 0 
      ? products.filter(p => selectedIds.has(p.id)) 
      : products.filter(p => filtered.map(f => f.id).includes(p.id));

    const fileName = `inventory_export_${Date.now()}`;

    if (format === 'json') {
      exportToJSON(targetProducts, fileName);
    } else if (format === 'csv') {
      const columns = ['المعرف', 'اسم المنتج', 'الفئة', 'السعر', 'التكلفة'];
      const keys = ['id', 'name', 'category', 'price', p => p.variants[0]?.quantity || 0];
      // Note: for CSV simplified I'll use IDs
      exportToCSV(targetProducts, fileName, columns, ['id', 'name', 'category', 'price', 'costPrice']);
    }
    
    setIsExportSettingsOpen(false);
  };

  const generateCSV = (data: Product[]) => {
    const headers = ['المعرف', 'اسم المنتج', 'الفئة', 'السعر', 'التكلفة', 'إجمالي الكمية'];
    const rows = data.map(p => [
      p.id,
      p.name,
      p.category,
      p.price,
      p.costPrice,
      p.variants.reduce((sum, v) => sum + v.quantity, 0)
    ]);
    return [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  };

  const generateExcelAuditTable = (data: Product[]) => {
    let table = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"><style>
        table { border-collapse: collapse; width: 100%; direction: rtl; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        th { background-color: #5D87B8; color: white; font-weight: bold; border: 1px solid #ddd; padding: 12px; }
        td { border: 1px solid #ddd; padding: 10px; text-align: right; }
        .header-row { font-size: 20px; font-weight: bold; text-align: center; background-color: #f1f5f9; }
        .variant-row { background-color: #ffffff; }
        .low-stock { color: #ef4444; font-weight: bold; }
      </style></head>
      <body>
        <table>
          <tr><th colspan="9" class="header-row">تقرير جرد المخزون التفصيلي (صغارنا ERP)</th></tr>
          <tr>
            <th>كود المنتج</th>
            <th>اسم المنتج</th>
            <th>الفئة</th>
            <th>المقاس</th>
            <th>اللون</th>
            <th>الكمية المتوفرة</th>
            <th>سعر البيع</th>
            <th>سعر التكلفة</th>
            <th>إجمالي القيمة (بيع)</th>
          </tr>
    `;
    
    data.forEach(p => {
      p.variants.forEach(v => {
        const isLow = v.quantity <= (v.lowStockThreshold || 0);
        table += `
          <tr class="variant-row">
            <td>${p.id}</td>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>${v.size}</td>
            <td>${v.color}</td>
            <td class="${isLow ? 'low-stock' : ''}">${v.quantity}</td>
            <td>${v.price || p.price}</td>
            <td>${p.costPrice}</td>
            <td>${v.quantity * (v.price || p.price)}</td>
          </tr>
        `;
      });
    });
    
    table += `</table></body></html>`;
    return table;
  };

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printSelectedProducts = (selectedProducts: Product[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html dir="rtl">
        <head>
          <title>تقرير الجرد التفصيلي</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
            body { font-family: 'Cairo', sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; background: #fff; }
            .header-banner { border-bottom: 5px solid #5D87B8; padding-bottom: 25px; margin-bottom: 40px; text-align: center; }
            .header-banner h1 { margin: 0; color: #5D87B8; font-size: 32px; font-weight: 900; letter-spacing: -1px; }
            .meta { font-size: 14px; color: #64748b; margin-top: 8px; font-weight: bold; }
            
            .product-audit-block { border: 2px solid #f1f5f9; border-radius: 24px; padding: 25px; margin-bottom: 40px; page-break-inside: avoid; background-color: #f8fafc; }
            .product-top { display: flex; gap: 25px; margin-bottom: 20px; align-items: start; }
            .product-img { width: 140px; height: 140px; object-fit: cover; border-radius: 20px; border: 3px solid #fff; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
            .product-meta-info { flex: 1; }
            .product-meta-info h2 { margin: 0 0 12px 0; font-size: 22px; font-weight: 900; color: #0f172a; }
            
            .audit-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
            .audit-table th { background-color: #5D87B8; color: white; padding: 12px; text-align: right; font-weight: bold; }
            .audit-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
            .audit-table tr:last-child td { border-bottom: none; }
            
            .low-stock-alert { color: #ef4444; font-weight: 900; background: #fee2e2; padding: 2px 8px; rounded: 6px; }
            
            .finance-row { margin-top: 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
            .finance-card { background: #fff; padding: 15px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center; }
            .finance-card label { display: block; font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 5px; }
            .finance-card span { display: block; font-size: 16px; font-weight: 900; color: #0f172a; }

            .grand-total { margin-top: 40px; background: #0f172a; color: white; padding: 30px; border-radius: 24px; display: flex; justify-content: space-between; align-items: center; }
            .grand-total h3 { margin: 0; font-size: 14px; opacity: 0.8; }
            .grand-total .val { font-size: 28px; font-weight: 900; }

            @media print {
              body { padding: 0; }
              .product-audit-block { background: #fff !important; border: 1px solid #ddd; }
              .grand-total { background: #000 !important; color: #fff !important; }
            }
          </style>
        </head>
        <body>
          <div class="header-banner">
            ${branding?.logo ? `<img src="${branding.logo}" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 15px; background: white; padding: 10px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" />` : ''}
            <h1>${branding?.name || 'صغارنا ERP'} - تقرير الجرد التفصيلي</h1>
            <div style="margin-top: 10px;">
              ${branding?.sloganDesign ? `<img src="${branding.sloganDesign}" style="width: 180px; height: auto; object-fit: contain; filter: brightness(0) invert(1);" />` : branding?.slogan ? `<div style="font-size: 14px; opacity: 0.8; font-style: italic;">" ${branding.slogan} "</div>` : ''}
            </div>
            <div class="meta">تاريخ التقرير: ${new Date().toLocaleString('ar-EG')} | إجمالي الأصناف المحددة للجرد: ${selectedProducts.length}</div>
          </div>

          ${selectedProducts.map(p => {
            const totalQty = p.variants.reduce((s, v) => s + v.quantity, 0);
            const totalRevenue = p.variants.reduce((s, v) => s + (v.quantity * (v.price || p.price)), 0);
            const totalCostVal = totalQty * p.costPrice;

            return `
              <div class="product-audit-block">
                <div class="product-top">
                  <img src="${p.image}" class="product-img" onerror="this.src='https://picsum.photos/200'" />
                  <div class="product-meta-info">
                    <h2>${p.name}</h2>
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                      <span style="background: #e0f2fe; color: #0369a1; padding: 5px 12px; border-radius: 10px; font-size: 11px; font-weight: 900;">${p.category}</span>
                      <span style="background: #f1f5f9; color: #475569; padding: 5px 12px; border-radius: 10px; font-size: 11px; font-weight: 900;">ID: ${p.id}</span>
                    </div>
                    <div style="font-size: 13px; font-weight: bold;">الرابط: <a href="${p.url || '#'}" style="color: #5D87B8; text-decoration: none;">${p.url ? 'فتح صفحة المنتج' : 'غير متوفر'}</a></div>
                  </div>
                </div>

                <table class="audit-table">
                  <thead>
                    <tr>
                      <th>المقاس</th>
                      <th>اللون</th>
                      <th>الكمية المتاحة</th>
                      <th>سعر الوحدة</th>
                      <th>إجمالي القيمة</th>
                      <th>حالة المخزون</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${p.variants.map(v => {
                      const isLow = v.quantity <= (v.lowStockThreshold || 0);
                      return `
                        <tr>
                          <td style="font-weight: bold;">${v.size}</td>
                          <td>${v.color}</td>
                          <td style="font-weight: 900; font-size: 14px;">${v.quantity}</td>
                          <td>${(v.price || p.price || 0).toLocaleString()} ج.م</td>
                          <td style="font-weight: bold;">${(v.quantity * (v.price || p.price || 0)).toLocaleString()} ج.م</td>
                          <td>
                            ${isLow ? '<span class="low-stock-alert">نقص مخزون!</span>' : '<span style="color: #16a34a; font-weight: bold;">متوفر</span>'}
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>

                <div class="finance-row">
                  <div class="finance-card">
                    <label>إجمالي القطع</label>
                    <span>${totalQty} قطعة</span>
                  </div>
                  <div class="finance-card">
                    <label>قيمة المخزون (بيع)</label>
                    <span>${(totalRevenue || 0).toLocaleString()} ج.م</span>
                  </div>
                  <div class="finance-card">
                    <label>قيمة المخزون (تكلفة)</label>
                    <span>${(totalCostVal || 0).toLocaleString()} ج.م</span>
                  </div>
                  <div class="finance-card">
                    <label>الربح المتوقع</label>
                    <span style="color: #16a34a;">${((totalRevenue - totalCostVal) || 0).toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}

          <div class="grand-total">
            <div>
              <h3>إجمالي قيمة الجرد الحالي (سعر البيع)</h3>
              <div class="val">${(selectedProducts.reduce((sum, p) => sum + p.variants.reduce((s, v) => s + (v.quantity * (v.price || p.price || 0)), 0), 0) || 0).toLocaleString()} ج.م</div>
            </div>
            <div style="text-align: left;">
              <h3>إجمالي القطع التي تم جردها</h3>
              <div class="val">${selectedProducts.reduce((sum, p) => sum + p.variants.reduce((s, v) => s + v.quantity, 0), 0)} قطعة</div>
            </div>
          </div>

          <div style="text-align: center; margin-top: 60px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 25px;">
            نظام ${branding?.name || 'X2 ERP'} لإدارة الموارد - ${branding?.slogan || ''}
            <br/>
            هذا التقرير تم توليده آلياً بواسطة النظام بتاريخ ${new Date().toLocaleString('ar-EG')}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => { window.print(); window.close(); }, 800);
            };
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm('هل أنت متأكد من حذف المنتج؟')) {
      onDeleteProduct(id);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key="inventory-list"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        className="space-y-8 pb-24"
      >
        <div className="flex flex-col lg:flex-row justify-between gap-6 items-center">
          <motion.h2 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="text-2xl font-black flex items-center gap-3 text-gray-900 dark:text-white shrink-0"
          >
            <motion.div 
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.8 }}
            >
              <Package className="text-accent" size={32} />
            </motion.div>
             المخزون المتوفر
          </motion.h2>
          <div className="flex flex-wrap gap-4 w-full lg:w-auto items-center justify-center lg:justify-end">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.02 }}
              className="relative flex-1 md:min-w-80 md:w-80"
            >
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20}/>
              <input className="w-full pr-12 pl-4 py-3.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-gray-900 dark:text-white focus:border-accent shadow-sm" placeholder="ابحث عن منتج..." value={q} onChange={e => setQ(e.target.value)} />
            </motion.div>
  
            <motion.button 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setImportStep('source')} 
              disabled={isLoading} 
              className="bg-primary text-blue-900 px-6 py-3.5 rounded-2xl flex items-center gap-2 font-black shadow-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 text-xs md:text-sm"
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''}/> استيراد منتجات
            </motion.button>
            <motion.button 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setModal({open: true})} 
              className="bg-gray-900 dark:bg-slate-700 text-white px-6 py-3.5 rounded-2xl flex items-center gap-2 font-black shadow-md hover:opacity-90 transition-all active:scale-95 text-xs md:text-sm"
            >
              <Plus size={20}/> إضافة منتج
            </motion.button>
          </div>
        </div>

        {/* Smart Filters Bar */}
        <CollapsibleSection
          title="فلاتر وترتيب"
          icon={<Tag size={20} className="text-accent" />}
          mobileOnly
          headerClassName="bg-white dark:bg-slate-900 p-4 rounded-[32px] border border-gray-50 dark:border-slate-800 shadow-sm mb-2"
        >
        <div className="flex flex-wrap gap-3 items-center justify-center lg:justify-start">
              <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-widest px-2">
            <Tag size={14} /> فلاتر وترتيب:
          </div>

          <button 
            onClick={selectAllFiltered}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 font-black border text-[11px] transition-all active:scale-95 ${selectedIds.size === filtered.length && filtered.length > 0 ? 'bg-accent text-white border-accent' : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-slate-800 shadow-sm'}`}
          >
            {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
            تحديد الكل
          </button>

          <button 
            onClick={() => setIsExportSettingsOpen(true)}
            className="px-3 py-2 rounded-xl bg-accent/10 text-accent border border-accent/20 flex items-center gap-2 font-black text-[11px] transition-all hover:bg-accent hover:text-white"
          >
            <Download size={16} />
            تصدير البيانات
          </button>

          <div className="relative">
            <select 
              className="px-8 py-2.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl outline-none font-black text-[11px] text-gray-700 dark:text-gray-200 focus:border-accent shadow-sm cursor-pointer appearance-none"
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
            >
              <option value="all">كل الموردين</option>
              {Object.entries(allSupplierEntities).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" size={12} />
          </div>

          <div className="flex items-center gap-2 mr-auto">
            <button
              onClick={() => setImageFitContain(!imageFitContain)}
              className={`p-2 rounded-xl transition-all ${imageFitContain ? 'bg-accent/10 text-accent border-accent/30' : 'bg-white dark:bg-slate-900 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-slate-800'} border shadow-sm`}
              title={imageFitContain ? 'إظهار الصور كاملة (بدون قص)' : 'قص الصور لملء الإطار'}
            >
              <ImageIcon size={16} />
            </button>
            <ViewSwitcher current={viewMode} onChange={setViewMode} />
          </div>
          
          <div className="relative">
            <select 
              className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl outline-none font-black text-[11px] text-gray-700 dark:text-gray-200 focus:border-accent shadow-sm cursor-pointer appearance-none"
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
            >
              <option value="created_at">التاريخ</option>
              <option value="name">الاسم</option>
              <option value="price">السعر</option>
              <option value="stock">المخزون</option>
            </select>
            <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
          </div>
          <button onClick={() => setSortAsc(p => !p)} className={`px-3 py-2.5 rounded-xl flex items-center gap-1.5 font-black text-[11px] transition-all ${sortAsc ? 'bg-accent text-white' : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-slate-800'}`} title={sortAsc ? 'تصاعدي' : 'تنازلي'}>
            <ArrowUpDown size={14} /> {sortAsc ? '▲' : '▼'}
          </button>

          <select 
            className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl outline-none font-black text-[11px] text-gray-700 dark:text-gray-200 focus:border-accent shadow-sm cursor-pointer"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">جميع التصنيفات</option>
            {categories.filter(c => !c.parentId).map(mainCat => (
              <React.Fragment key={mainCat.id}>
                <option value={mainCat.name}>{mainCat.name}</option>
                {categories.filter(sub => sub.parentId === mainCat.id).map(subCat => (
                  <option key={subCat.id} value={`${mainCat.name} > ${subCat.name}`}>
                    -- {subCat.name}
                  </option>
                ))}
              </React.Fragment>
            ))}
          </select>

          <select 
            className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl outline-none font-black text-[11px] text-gray-700 dark:text-gray-200 focus:border-accent shadow-sm cursor-pointer"
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
          >
            <option value="all">جميع الوسوم (Tags)</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className={`text-[10px] font-black px-3 py-2 rounded-xl transition-all flex items-center gap-1 ${
              showAdvancedSearch
                ? 'bg-accent/10 text-accent border border-accent/20'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            {showAdvancedSearch ? <ChevronUp size={12} /> : <ChevronDown size={12} />} بحث متقدم
          </button>

          {(selectedCategory !== 'all' || selectedTag !== 'all' || q !== '' || selectedSupplierId !== 'all' || minPrice !== '' || maxPrice !== '' || minStock !== '' || maxStock !== '' || selectedSize !== 'all' || selectedColor !== 'all') && (
            <button 
              onClick={() => {
                setQ('');
                setSelectedCategory('all');
                setSelectedTag('all');
                setSelectedSupplierId('all');
                setMinPrice('');
                setMaxPrice('');
                setMinStock('');
                setMaxStock('');
                setSelectedSize('all');
                setSelectedColor('all');
              }}
              className="text-[10px] font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-xl transition-all flex items-center gap-1"
            >
              <X size={12} /> رسيت الكل
            </button>
          )}
        </div>
        </CollapsibleSection>

        {/* Advanced Search Panel */}
        <AnimatePresence>
          {showAdvancedSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-3 items-end bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                {/* Price Range */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-wide">💰 السعر من</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={minPrice}
                    onChange={e => setMinPrice(e.target.value)}
                    className="w-20 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none text-[11px] font-bold text-gray-900 dark:text-white focus:border-accent"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-wide">السعر إلى</label>
                  <input
                    type="number"
                    placeholder="∞"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    className="w-20 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none text-[11px] font-bold text-gray-900 dark:text-white focus:border-accent"
                  />
                </div>

                {/* Stock Range */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-wide">📦 المخزون من</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={minStock}
                    onChange={e => setMinStock(e.target.value)}
                    className="w-20 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none text-[11px] font-bold text-gray-900 dark:text-white focus:border-accent"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-wide">المخزون إلى</label>
                  <input
                    type="number"
                    placeholder="∞"
                    value={maxStock}
                    onChange={e => setMaxStock(e.target.value)}
                    className="w-20 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none text-[11px] font-bold text-gray-900 dark:text-white focus:border-accent"
                  />
                </div>

                {/* Size Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-wide">📐 المقاس</label>
                  <div className="relative">
                    <select
                      value={selectedSize}
                      onChange={e => setSelectedSize(e.target.value)}
                      className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none text-[11px] font-bold text-gray-700 dark:text-gray-200 focus:border-accent cursor-pointer appearance-none min-w-[90px]"
                    >
                      <option value="all">الكل</option>
                      {allSizes.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                  </div>
                </div>

                {/* Color Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-wide">🎨 اللون</label>
                  <div className="relative">
                    <select
                      value={selectedColor}
                      onChange={e => setSelectedColor(e.target.value)}
                      className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none text-[11px] font-bold text-gray-700 dark:text-gray-200 focus:border-accent cursor-pointer appearance-none min-w-[90px]"
                    >
                      <option value="all">الكل</option>
                      {allColors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inventory Stats Summary */}
        <CollapsibleSection
          title="ملخص المخزون"
          icon={<Package size={20} className="text-amber-600" />}
          mobileOnly
          headerClassName="bg-white dark:bg-slate-900 p-4 rounded-[32px] border border-gray-50 dark:border-slate-800 shadow-sm mb-2"
        >
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-4 md:gap-8 justify-center lg:justify-start items-center bg-white dark:bg-slate-900 p-4 md:px-8 rounded-[32px] border border-gray-50 dark:border-slate-800 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
              <Package size={20} />
            </div>
            <div>
              <span className="block text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">إجمالي القطع</span>
              <span className="font-black text-lg text-gray-900 dark:text-white">{inventoryStats.totalQuantity.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="w-px h-8 bg-gray-100 dark:bg-slate-800 hidden md:block"></div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
              <Coins size={20} />
            </div>
            <div>
              <span className="block text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">إجمالي التكلفة</span>
              <span className="font-black text-lg text-emerald-600">{inventoryStats.totalCost.toLocaleString()} <span className="text-[10px]">ج.م</span></span>
            </div>
          </div>
          
          <div className="w-px h-8 bg-gray-100 dark:bg-slate-800 hidden md:block"></div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="block text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">قيمة البيع المتوقعة</span>
              <span className="font-black text-lg text-accent">{inventoryStats.totalSales.toLocaleString()} <span className="text-[10px]">ج.م</span></span>
            </div>
          </div>

          <div className="w-px h-8 bg-gray-100 dark:bg-slate-800 hidden md:block"></div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
              <Check size={20} />
            </div>
            <div>
              <span className="block text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">الربح المتوقع</span>
              <span className="font-black text-lg text-blue-600">{(inventoryStats.totalSales - inventoryStats.totalCost).toLocaleString()} <span className="text-[10px]">ج.م</span></span>
            </div>
          </div>
        </motion.div>
        </CollapsibleSection>

      <input type="file" accept=".json" className="hidden" ref={importJsonInputRef} onChange={handleImportFileChange} />

      <AnimatePresence>
        {importStep !== 'none' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[40px] p-8 max-w-lg w-full shadow-2xl space-y-6 relative overflow-hidden"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-50 dark:bg-slate-800 text-accent rounded-3xl flex items-center justify-center mx-auto mb-4">
                  {importStep === 'url_input' ? <LinkIcon size={32} /> : <RefreshCw size={32} />}
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                  {importStep === 'source' ? 'استيراد منتجات من المتجر' : 'رابط المنتجات'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 font-bold">
                  {importStep === 'source' ? 'اختر مصدر البيانات:' : 'أدخل رابط JSON للمنتجات:'}
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {importStep === 'source' && (
                  <motion.div 
                    initial="hidden"
                    animate="show"
                    variants={{ show: { transition: { staggerChildren: 0.1 } } }}
                    className="space-y-4"
                  >
                    <motion.button 
                      variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } }}
                      whileHover={{ scale: 1.02, x: -5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleImportSourceChoice('feed')} 
                      className="w-full flex items-center gap-4 p-5 bg-indigo-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 rounded-3xl text-right hover:bg-indigo-100 dark:hover:bg-slate-700 transition-all group"
                    >
                      <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform"><Globe size={24} /></div>
                      <div><h4 className="font-black text-gray-900 dark:text-white text-sm">رابط API</h4><p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">جلب المنتجات عبر رابط</p></div>
                    </motion.button>
                    <motion.button 
                      variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } }}
                      whileHover={{ scale: 1.02, x: -5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleImportSourceChoice('json')} 
                      className="w-full flex items-center gap-4 p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-3xl text-right hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all group"
                    >
                      <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform"><FileJson size={24} /></div>
                      <div><h4 className="font-black text-gray-900 dark:text-white text-sm">ملف JSON</h4><p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">رفع ملف من جهازك</p></div>
                    </motion.button>
                  </motion.div>
                )}

                {importStep === 'url_input' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                     <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 px-2 uppercase">رابط API</label>
                       <input 
                        type="url" 
                        className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl outline-none focus:border-accent focus:bg-white dark:focus:bg-slate-900 transition-all font-bold text-gray-800 dark:text-white text-xs" 
                        placeholder="https://example.com/products.json"
                        value={importUrl}
                        onChange={e => setImportUrl(e.target.value)}
                       />
                     </div>
                     <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleImportUrlSubmit}
                      className="w-full py-5 bg-accent text-white rounded-2xl font-black shadow-xl hover:opacity-90 transition-all text-lg active:scale-95"
                     >
                       جلب البيانات
                     </motion.button>
                  </motion.div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button 
                  onClick={() => setImportStep(importStep === 'url_input' ? 'source' : 'none')}
                  className="flex-1 py-4 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 rounded-2xl font-black hover:bg-gray-100 dark:hover:bg-slate-700 transition-all border border-gray-100 dark:border-slate-700"
                >
                  {importStep === 'url_input' ? 'رجوع' : 'إلغاء'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {importProductsPreview && <SyncReviewModal products={importProductsPreview} onSaveItem={onSaveProduct} onSaveAll={onImportProductsConfirm} onClose={onImportProductsClose} categories={categories} suppliers={suppliers} contacts={contacts} />}
      {modal.open && (
        <ProductModal 
          product={modal.p} 
          categories={categories} 
          suppliers={suppliers} 
          contacts={contacts}
          onClose={() => setModal({open: false})} 
          onSave={onSaveProduct} 
          onDeleteAction={onDeleteProduct} 
        />
      )}

      {/* Export Settings Modal */}
      <AnimatePresence>
        {isExportSettingsOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-y-auto overflow-x-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setIsExportSettingsOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] p-8 max-w-md w-full shadow-2xl relative z-10 text-right my-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black flex items-center gap-2">
                  <Download className="text-accent" /> إعدادات التصدير
                </h3>
                <button onClick={() => setIsExportSettingsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-400 dark:text-gray-500">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2">صيغة الملف</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button 
                      onClick={() => setExportConfig({...exportConfig, format: 'excel'})}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 font-bold ${exportConfig.format === 'excel' ? 'border-accent bg-accent/5 text-accent' : 'border-gray-100 dark:border-slate-800 text-gray-500'}`}
                    >
                      <FileSpreadsheet size={24} />
                      Excel
                    </button>
                    <button 
                      onClick={() => setExportConfig({...exportConfig, format: 'pdf'})}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 font-bold ${exportConfig.format === 'pdf' ? 'border-accent bg-accent/5 text-accent' : 'border-gray-100 dark:border-slate-800 text-gray-500'}`}
                    >
                      <FileText size={24} />
                      PDF
                    </button>
                    <button 
                      onClick={() => setExportConfig({...exportConfig, format: 'html'})}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 font-bold ${exportConfig.format === 'html' ? 'border-accent bg-accent/5 text-accent' : 'border-gray-100 dark:border-slate-800 text-gray-500'}`}
                    >
                      <Globe size={24} />
                      ويب
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">الأعمدة المراد تصديرها</label>
                    <button 
                      onClick={() => {
                        const allIds = availableColumns.map(c => c.id);
                        const isAllSelected = exportConfig.selectedColumns.length === allIds.length;
                        setExportConfig(prev => ({
                          ...prev,
                          selectedColumns: isAllSelected ? ['name', 'quantity', 'price'] : allIds
                        }));
                      }}
                      className="text-[10px] font-black text-accent hover:underline"
                    >
                      {exportConfig.selectedColumns.length === availableColumns.length ? 'إلغاء الكل' : 'تحديد الكل'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableColumns.map(col => (
                      <button 
                        key={col.id}
                        onClick={() => toggleColumn(col.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-[10px] font-black transition-all ${exportConfig.selectedColumns.includes(col.id) ? 'bg-accent/10 border-accent text-accent shadow-sm' : 'border-gray-100 dark:border-slate-800 text-gray-400 dark:text-gray-500 hover:border-gray-200'}`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-colors ${exportConfig.selectedColumns.includes(col.id) ? 'bg-accent border-accent' : 'bg-white border-gray-200'}`}>
                          {exportConfig.selectedColumns.includes(col.id) && <Check size={10} className="text-white" strokeWidth={5} />}
                        </div>
                        {col.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2">خيارات إضافية</label>
                  
                  <button 
                    onClick={() => setExportConfig({...exportConfig, includeVariants: !exportConfig.includeVariants})}
                    className="w-full p-4 rounded-2xl border border-gray-100 dark:border-slate-800 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className={`w-10 h-6 rounded-full transition-all relative ${exportConfig.includeVariants ? 'bg-accent' : 'bg-gray-200'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${exportConfig.includeVariants ? 'right-5' : 'right-1'}`} />
                    </div>
                    <span className="font-bold text-gray-700 dark:text-gray-200">تصدير تفاصيل المقاسات والألوان</span>
                  </button>

                  <button 
                    onClick={() => setExportConfig({...exportConfig, includeCosts: !exportConfig.includeCosts})}
                    className="w-full p-4 rounded-2xl border border-gray-100 dark:border-slate-800 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className={`w-10 h-6 rounded-full transition-all relative ${exportConfig.includeCosts ? 'bg-accent' : 'bg-gray-200'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${exportConfig.includeCosts ? 'right-5' : 'right-1'}`} />
                    </div>
                    <span className="font-bold text-gray-700 dark:text-gray-200">تضمين أسعار التكلفة والأرباح</span>
                  </button>
                </div>

                <button 
                  onClick={() => handleProfessionalExport()}
                  disabled={isExporting}
                  className={`w-full py-5 bg-accent text-white font-black rounded-2xl shadow-lg hover:shadow-accent/40 active:scale-95 transition-all flex items-center justify-center gap-3 text-lg ${isExporting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isExporting ? (
                    <>
                      <RefreshCw size={24} className="animate-spin" />
                      جاري التصدير...
                    </>
                  ) : (
                    <>
                      <Download size={24} />
                      بدء التصدير الآن
                    </>
                  )}
                </button>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold text-center italic">
                  {selectedIds.size > 0 ? `سيتم تصدير ${selectedIds.size} منتج محدد` : `سيتم تصدير جميع المنتجات الظاهرة حالياً (${filtered.length})`}
                </p>

                <div className="flex justify-center gap-4 pt-2 border-t border-gray-50 dark:border-slate-800">
                  <button onClick={() => handleExport('csv')} className="text-[10px] font-bold text-gray-400 dark:text-gray-500 hover:text-accent">CSV (سريع)</button>
                  <button onClick={() => handleExport('json')} className="text-[10px] font-bold text-gray-400 dark:text-gray-500 hover:text-accent">JSON (بيانات)</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {viewMode === 'grid' && (
        <motion.div 
          variants={staggerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6"
        >
          {filtered.map(p => {
            const isOutOfStock = p.variants.every(v => v.quantity === 0);
            const isLowStock = p.variants.some(v => v.quantity <= (v.lowStockThreshold || 0)) && !isOutOfStock;
            const isSelected = selectedIds.has(p.id);
            const supplierName = p.supplierId ? allSupplierEntities[p.supplierId] : null;
            
            return (
              <motion.div 
                key={p.id} 
                variants={cardVariants}
                whileHover={hoverVariants}
                onClick={() => setViewingProductId(p.id)}
                className={`bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-sm border group relative flex flex-col cursor-pointer ${isSelected ? 'ring-4 ring-accent/30 border-accent shadow-xl' : isOutOfStock ? 'border-red-400 dark:border-red-500 ring-2 ring-red-100 dark:ring-red-900/30' : isLowStock ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-100 dark:ring-amber-900/30' : 'border-gray-50 dark:border-slate-800 hover:shadow-xl dark:hover:shadow-slate-900/50'}`}
              >
                <div className={`relative overflow-hidden bg-gray-50 dark:bg-slate-800 ${imageFitContain ? '' : 'max-h-72'}`}>
                  <img src={p.image} className={`w-full ${imageFitContain ? 'h-auto block' : 'h-full object-cover transition-transform duration-500 group-hover:scale-110'}`} onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" fill="none"><rect width="200" height="200" fill="%23f1f5f9"/><rect x="70" y="60" width="60" height="80" rx="8" stroke="%2394a3b8" stroke-width="2" fill="none"/><circle cx="100" cy="110" r="12" fill="%23cbd5e1"/><rect x="80" y="70" width="40" height="6" rx="3" fill="%23cbd5e1"/></svg>'); (e.target as HTMLImageElement).className = `w-full h-full object-contain p-8 ${imageFitContain ? 'block' : ''}`; }} />
                  
                  {p.images && p.images.length > 1 && (
                    <div className="absolute top-4 left-4 z-10 bg-black/60 text-white text-[9px] font-black px-2 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1 pointer-events-none">
                      <ImageIcon size={12} /> +{p.images.length - 1}
                    </div>
                  )}

                  <div className="absolute top-4 right-4 z-10" onClick={(e) => { e.stopPropagation(); toggleSelect(p.id); }}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${isSelected ? 'bg-accent text-white scale-110' : 'bg-white/80 dark:bg-slate-800/80 text-gray-300 dark:text-slate-600 hover:text-accent'}`}>
                      {isSelected ? <CheckSquare size={20} strokeWidth={3} /> : <Square size={20} />}
                    </div>
                  </div>

                  <div className="absolute top-4 left-4 flex flex-col gap-2 items-start pointer-events-none">
                    {p.category && validCategoryStrings.has(p.category) && (
                      <span className="bg-white/95 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-[10px] font-black text-slate-800 dark:text-white px-3 py-1.5 rounded-2xl shadow-sm uppercase tracking-tight flex items-center gap-1">
                        {p.category.split(' > ').map((part, idx) => (
                          <React.Fragment key={idx}>
                            {idx > 0 && <span className="text-accent/30">/</span>}
                            {part}
                          </React.Fragment>
                        ))}
                      </span>
                    )}
                    {isOutOfStock && (
                      <span className="bg-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                        <XCircle size={12} /> نفذ المخزون
                      </span>
                    )}
                    {isLowStock && (
                      <span className="bg-amber-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 animate-glow-soft">
                        <AlertTriangle size={12} /> مخزون منخفض
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-black text-gray-900 dark:text-white text-xl line-clamp-2 leading-snug mb-1">{p.name}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-mono text-[11px] font-bold text-gray-400 dark:text-gray-500">{p.sku || ''}</span>
                    <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600">|</span>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 font-mono">ID: {p.id}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-col gap-1">
                      <div className="text-accent font-black text-2xl">{p.price?.toLocaleString()} <span className="text-sm">ج.م</span></div>
                      <span className="text-sm text-amber-600 font-black">تكلفة {p.costPrice?.toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className={`text-base font-black ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>
                        {p.variants.reduce((s, v) => s + v.quantity, 0)} قطعة
                      </span>
                      {(p.price || 0) > 0 && (p.costPrice || 0) > 0 && (() => {
                        const profit = (p.price || 0) - (p.costPrice || 0);
                        const margin = ((profit / (p.price || 1)) * 100).toFixed(0);
                        return (
                          <span className={`text-sm font-black px-3 py-1 rounded-xl ${profit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-red-50 dark:bg-red-900/20 text-red-500'}`}>
                            {profit >= 0 ? '+' : ''}{profit.toLocaleString()} ج.م ({margin}%)
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-black mt-auto pt-3 border-t border-gray-50 dark:border-slate-800">
                    {p.variants.length > 0 && (
                      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                        <Layers size={16} /> {p.variants.length} متغير
                        {(() => {
                          const lowCount = p.variants.filter(v => v.quantity <= (v.lowStockThreshold || 0)).length;
                          return lowCount > 0 ? <span className="text-red-500 font-black">({lowCount} منخفض)</span> : null;
                        })()}
                      </div>
                    )}
                    {p.tags && p.tags.length > 0 && p.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-lg border border-gray-100 dark:border-slate-800">{tag}</span>
                    ))}
                    {p.tags && p.tags.length > 2 && <span className="text-gray-400 text-xs">+{p.tags.length - 2}</span>}
                    {supplierName && (
                      <span className="text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg flex items-center gap-1.5 whitespace-nowrap">
                        <ExternalLink size={14} /> {supplierName}
                      </span>
                    )}
                    <div className="w-full text-[9px] text-gray-300 dark:text-gray-600 font-bold pt-2 mt-2 border-t border-gray-50 dark:border-slate-800">
                      {formatDate(p.createdAt, 'date')}
                      {p.updatedAt && <> | آخر تعديل: {formatDate(p.updatedAt, 'date')}</>}
                    </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 px-5 pb-4 border-t border-gray-50 dark:border-slate-800 pt-3">
            <button onClick={(e) => { e.stopPropagation(); setModal({open: true, p}); }} className="flex items-center gap-1.5 text-[10px] font-black text-accent hover:bg-accent/5 py-2 px-3 rounded-xl transition-all">
              <Edit2 size={14} /> تعديل
            </button>
            {p.url && (
              <a href={p.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 text-[10px] font-black text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 py-2 px-3 rounded-xl transition-all">
                <ExternalLink size={14} /> رابط
              </a>
            )}
            <button onClick={(e) => handleDelete(p.id, e)} className="flex items-center gap-1.5 text-[10px] font-black text-red-500 hover:bg-red-50/50 dark:hover:bg-red-900/10 py-2 px-3 rounded-xl transition-all">
              <Trash2 size={14} /> حذف
            </button>
          </div>
        </motion.div>
            );
          })}
        </motion.div>
      )}

      {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full text-right min-w-[700px]">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
              <tr>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300"></th>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300">المعرف</th>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300">المنتج</th>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300">الإضافة</th>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300">آخر تعديل</th>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300">التصنيف</th>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300">SKU</th>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300">المخزون</th>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300">التكلفة</th>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300">البيع</th>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300">الربح</th>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300">المتغيرات</th>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {filtered.map(p => {
                const isOutOfStock = p.variants.every(v => v.quantity === 0);
                const isLowStock = p.variants.some(v => v.quantity <= (v.lowStockThreshold || 0)) && !isOutOfStock;
                const isSelected = selectedIds.has(p.id);
                const supplierName = p.supplierId ? allSupplierEntities[p.supplierId] : null;
                const totalQty = p.variants.reduce((s, v) => s + v.quantity, 0);
                const profit = (p.price || 0) - (p.costPrice || 0);
                return (
                  <tr key={p.id} onClick={() => setViewingProductId(p.id)} className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 ${isSelected ? 'bg-accent/5' : ''} ${isOutOfStock ? 'bg-red-100/80 dark:bg-red-900/20' : isLowStock ? 'bg-amber-50/80 dark:bg-amber-900/10' : ''}`}>
                    <td className="p-4" onClick={(e) => { e.stopPropagation(); toggleSelect(p.id); }}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${isSelected ? 'bg-accent text-white' : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-accent'}`}>
                        {isSelected ? <Check size={16} strokeWidth={3} /> : <Square size={16} />}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-[10px] font-bold text-gray-400 dark:text-gray-500">{p.id}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={p.image} className={`w-12 h-12 rounded-xl ${imageFitContain ? 'object-contain p-1' : 'object-cover'} bg-gray-50 dark:bg-slate-800`} onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none"><rect width="48" height="48" rx="12" fill="%23f1f5f9"/><circle cx="24" cy="22" r="8" fill="%23cbd5e1"/><rect x="14" y="34" width="20" height="4" rx="2" fill="%23cbd5e1"/></svg>'); }} />
                        <div>
                          <div className="font-black text-sm text-gray-900 dark:text-white">{p.name}</div>
                          {p.tags && p.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {p.tags.slice(0, 2).map(t => <span key={t} className="text-[9px] font-bold text-gray-400 dark:text-gray-500">{t}</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{formatDate(p.createdAt, 'date')}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{p.updatedAt ? formatDate(p.updatedAt, 'date') : '—'}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{p.category}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-[11px] font-bold text-gray-400 dark:text-gray-500">{p.sku || '—'}</span>
                    </td>
                    <td className="p-4">
                      <span className={`font-black text-sm ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-amber-500' : 'text-gray-700 dark:text-gray-300'}`}>{totalQty}</span>
                    </td>
                    <td className="p-4 font-black text-sm text-amber-600">{(p.costPrice || 0).toLocaleString()} ج.م</td>
                    <td className="p-4 font-black text-sm text-accent">{(p.price || 0).toLocaleString()} ج.م</td>
                    <td className="p-4">
                      <span className={`font-black text-sm ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{profit.toLocaleString()} ج.م</span>
                    </td>
                    <td className="p-4">
                      <span className="font-black text-sm text-gray-500 dark:text-gray-400">{p.variants.length}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        {p.url && <a href={p.url} target="_blank" onClick={(e) => e.stopPropagation()} className="text-blue-500 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all"><ExternalLink size={14} /></a>}
                        <button onClick={(e) => { e.stopPropagation(); setModal({open: true, p}); }} className="text-accent hover:text-accent/80 p-1.5 rounded-lg hover:bg-accent/5 transition-all" title="تعديل"><Edit2 size={14} /></button>
                        <button onClick={(e) => handleDelete(p.id, e)} className="text-red-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-all" title="حذف"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {viewMode === 'compact' && (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.03 } } }}
          className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3"
        >
          {filtered.map(p => {
            const isOutOfStock = p.variants.every(v => v.quantity === 0);
            const isLowStock = p.variants.some(v => v.quantity <= (v.lowStockThreshold || 0)) && !isOutOfStock;
            const isSelected = selectedIds.has(p.id);
            const totalQty = p.variants.reduce((s, v) => s + v.quantity, 0);
            return (
              <motion.div
                key={p.id}
                variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}
                onClick={() => setViewingProductId(p.id)}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-3 border transition-all cursor-pointer ${isSelected ? 'ring-2 ring-accent border-accent shadow-md' : isOutOfStock ? 'border-red-400 dark:border-red-500' : isLowStock ? 'border-amber-400 dark:border-amber-500' : 'border-gray-50 dark:border-slate-800 hover:shadow-md'}`}
              >
                <div className={`relative rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-800 mb-2 ${imageFitContain ? '' : 'aspect-square'}`}>
                  <img src={p.image} className={`w-full ${imageFitContain ? 'h-auto block' : 'h-full object-cover'}`} onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" fill="none"><rect width="200" height="200" rx="20" fill="%23f1f5f9"/><circle cx="100" cy="80" r="24" fill="%23cbd5e1"/><rect x="60" y="120" width="80" height="10" rx="5" fill="%23cbd5e1"/></svg>'); }} />
                  <div className="absolute top-1 right-1 w-5 h-5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:border-accent transition-colors" onClick={(e) => { e.stopPropagation(); toggleSelect(p.id); }}>
                    {isSelected && <Check size={12} strokeWidth={4} className="text-accent" />}
                  </div>
                </div>
                  <h4 className="font-black text-[10px] text-gray-900 dark:text-white line-clamp-2 leading-tight mb-1">{p.name}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-accent font-black text-xs">{(p.price || 0).toLocaleString()}</span>
                    <span className={`text-[9px] font-bold ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'}`}>{totalQty} قطعة</span>
                  </div>
                  <div className="text-[7px] text-gray-300 dark:text-gray-600 font-bold text-center mt-1">
                    {formatDate(p.createdAt, 'date')}
                    {p.updatedAt && <span className="mr-1">| {formatDate(p.updatedAt, 'date')}</span>}
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-gray-50 dark:border-slate-800">
                    <button onClick={(e) => { e.stopPropagation(); setModal({open: true, p}); }} className="text-accent hover:bg-accent/5 p-1.5 rounded-lg transition-all" title="تعديل"><Edit2 size={12} /></button>
                    {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 p-1.5 rounded-lg transition-all"><ExternalLink size={12} /></a>}
                    <button onClick={(e) => handleDelete(p.id, e)} className="text-red-500 hover:bg-red-50/50 dark:hover:bg-red-900/10 p-1.5 rounded-lg transition-all" title="حذف"><Trash2 size={12} /></button>
                  </div>
                </motion.div>
            );
          })}
        </motion.div>
      )}

      {viewMode === 'detailed' && (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.05 } } }}
          className="space-y-4"
        >
              {filtered.map(p => {
            const isOutOfStock = p.variants.every(v => v.quantity === 0);
            const isLowStock = p.variants.some(v => v.quantity <= (v.lowStockThreshold || 0)) && !isOutOfStock;
            const isSelected = selectedIds.has(p.id);
            const supplierName = p.supplierId ? allSupplierEntities[p.supplierId] : null;
            const totalQty = p.variants.reduce((s, v) => s + v.quantity, 0);
            return (
              <motion.div
                key={p.id}
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                onClick={() => setViewingProductId(p.id)}
                className={`bg-white dark:bg-slate-900 rounded-[28px] p-6 border transition-all cursor-pointer ${isSelected ? 'ring-2 ring-accent border-accent shadow-lg' : isOutOfStock ? 'border-red-400 dark:border-red-500' : isLowStock ? 'border-amber-400 dark:border-amber-500' : 'border-gray-100 dark:border-slate-800 hover:shadow-md'}`}
              >
                <div className="flex gap-6">
                  <img src={p.image} className={`w-28 ${imageFitContain ? 'h-auto rounded-2xl bg-gray-50 dark:bg-slate-800 shrink-0' : 'h-28 rounded-2xl object-cover bg-gray-50 dark:bg-slate-800 shrink-0'}`} onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" fill="none"><rect width="112" height="112" rx="16" fill="%23f1f5f9"/><circle cx="56" cy="44" r="16" fill="%23cbd5e1"/><rect x="32" y="72" width="48" height="8" rx="4" fill="%23cbd5e1"/></svg>'); }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-black text-lg text-gray-900 dark:text-white">{p.name}</h3>
                        {p.category && <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{p.category}</span>}
                      </div>
                      <div onClick={(e) => { e.stopPropagation(); toggleSelect(p.id); }} className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 cursor-pointer ${isSelected ? 'bg-accent text-white' : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-accent'}`}>
                        {isSelected ? <Check size={18} strokeWidth={3} /> : <Square size={18} />}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-3">
                      <div><span className="text-[9px] font-black text-gray-400 dark:text-gray-500 block">البيع</span><span className="font-black text-accent">{(p.price || 0).toLocaleString()} ج.م</span></div>
                      <div><span className="text-[9px] font-black text-gray-400 dark:text-gray-500 block">التكلفة</span><span className="font-black text-amber-600">{(p.costPrice || 0).toLocaleString()} ج.م</span></div>
                      <div><span className="text-[9px] font-black text-gray-400 dark:text-gray-500 block">الربح</span><span className={`font-black ${(p.price||0)-(p.costPrice||0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{((p.price||0)-(p.costPrice||0)).toLocaleString()} ج.م</span></div>
                      <div><span className="text-[9px] font-black text-gray-400 dark:text-gray-500 block">المخزون</span><span className={`font-black ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-amber-500' : 'text-gray-700 dark:text-gray-300'}`}>{totalQty} قطعة</span></div>
                    </div>
                    {p.variants.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {p.variants.map(v => (
                          <span key={v.id} className="text-[10px] bg-gray-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg font-bold text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-slate-700">
                            {v.size}/{v.color}: <span className="text-accent">{v.quantity}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    {supplierName && <div className="mt-3 text-[11px] font-bold text-indigo-500">المورد: {supplierName}</div>}
                    {p.tags && p.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.tags.map(t => <span key={t} className="text-[9px] bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded-md border border-gray-100 dark:border-slate-800">{t}</span>)}
                      </div>
                    )}
                    <div className="mt-2 text-[10px] font-bold text-gray-300 dark:text-gray-600">
                      {formatDate(p.createdAt, 'full')}
                      {p.updatedAt && <> | آخر تعديل: {formatDate(p.updatedAt, 'full')}</>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-50 dark:border-slate-800">
                  <button onClick={(e) => { e.stopPropagation(); setModal({open: true, p}); }} className="flex items-center gap-1.5 text-[10px] font-black text-accent hover:bg-accent/5 py-2 px-3 rounded-xl transition-all"><Edit2 size={14} /> تعديل</button>
                  {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 text-[10px] font-black text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 py-2 px-3 rounded-xl transition-all"><ExternalLink size={14} /> رابط</a>}
                  <button onClick={(e) => handleDelete(p.id, e)} className="flex items-center gap-1.5 text-[10px] font-black text-red-500 hover:bg-red-50/50 dark:hover:bg-red-900/10 py-2 px-3 rounded-xl transition-all"><Trash2 size={14} /> حذف</button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {filtered.length === 0 && !isLoading && (
        <div className="py-24 text-center text-gray-300 dark:text-slate-800 bg-white dark:bg-slate-900 rounded-[40px] border border-dashed border-gray-100 dark:border-slate-800">
          <Package size={64} className="mx-auto mb-4 opacity-10" />
          <p className="text-xl font-black">لا توجد منتجات مطابقة للبحث</p>
        </div>
      )}

      {/* Product Details Modal */}
      {viewingProductId && (() => {
        const product = products.find(p => p.id === viewingProductId);
        if (!product) return null;
        const isOutOfStock = product.variants.every(v => v.quantity === 0);
        const isLowStock = product.variants.some(v => v.quantity <= (v.lowStockThreshold || 0)) && !isOutOfStock;
        const totalQty = product.variants.reduce((s, v) => s + v.quantity, 0);
        const supplierName = product.supplierId ? allSupplierEntities[product.supplierId] : null;
        const totalSales = product.variants.reduce((s, v) => s + v.quantity * (v.price || product.price), 0);
        const totalCost = totalQty * product.costPrice;
        const totalProfit = totalSales - totalCost;
        const profitPerUnit = (product.price || 0) - (product.costPrice || 0);
        const profitMargin = product.price > 0 ? ((product.price - product.costPrice) / product.price * 100) : 0;
        const lowStockCount = product.variants.filter(v => v.quantity <= (v.lowStockThreshold || 0)).length;
        const sortedByStock = [...product.variants].sort((a, b) => b.quantity - a.quantity);
        const highestStock = sortedByStock[0];
        const lowestStock = sortedByStock[sortedByStock.length - 1];
        const avgPrice = product.variants.reduce((s, v) => s + (v.price || product.price), 0) / product.variants.length;
        const allImages = product.images && product.images.length > 0 ? product.images : [product.image].filter(Boolean);
        const activeOrderStatuses = ['تحت المراجعة', 'تم التأكيد', 'في انتظار الدفع', 'تم الدفع', 'قيد التجهيز للشحن', 'بانتظار الشحن', 'قيد التوصيل', 'تم التوصيل'];
        const salesFromOrders = orders.filter(o => activeOrderStatuses.includes(o.status)).reduce((acc, o) => {
          o.items.forEach(item => { if (!item.productId) return; if (item.productId === product.id) { acc.pieces += item.quantity || 0; acc.revenue += (item.quantity || 0) * (item.price || 0); acc.profit += (item.quantity || 0) * ((item.price || 0) - (item.costPrice || 0)); } });
          return acc;
        }, { pieces: 0, revenue: 0, profit: 0 });
        const piecesSold = salesFromOrders.pieces;
        const salesRevenue = salesFromOrders.revenue;
        const salesProfit = salesFromOrders.profit;
        const turnoverRate = totalQty > 0 ? (piecesSold / totalQty) : 0;
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => setViewingProductId(null)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative z-10"
            >
              {/* Image Gallery Header — Natural aspect */}
              <div className="relative bg-gray-50 dark:bg-slate-800 rounded-t-[32px] overflow-hidden flex items-center justify-center min-h-[200px]">
                {allImages.length > 0 ? (
                  <>
                    <img src={allImages[galleryIndex]} className="w-full max-h-[55vh] object-contain p-6 transition-opacity duration-300" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" fill="none"><rect width="200" height="200" fill="%23f1f5f9"/><circle cx="100" cy="80" r="24" fill="%23cbd5e1"/><rect x="60" y="120" width="80" height="10" rx="5" fill="%23cbd5e1"/></svg>'); }} />
                    {allImages.length > 1 && (
                      <>
                        <button onClick={() => setGalleryIndex(prev => (prev - 1 + allImages.length) % allImages.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-gray-700 dark:text-gray-200 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-slate-900 transition-all shadow-lg"><ChevronRight size={20} /></button>
                        <button onClick={() => setGalleryIndex(prev => (prev + 1) % allImages.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-gray-700 dark:text-gray-200 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-slate-900 transition-all shadow-lg"><ChevronLeft size={20} /></button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {allImages.map((_, idx) => (
                            <button key={idx} onClick={() => setGalleryIndex(idx)} className={`w-2.5 h-2.5 rounded-full transition-all shadow-sm ${idx === galleryIndex ? 'bg-gray-800 dark:bg-white scale-125' : 'bg-gray-300 dark:bg-gray-600'}`} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="py-16 text-gray-300 dark:text-gray-600"><ImageIcon size={72} /></div>
                )}
                <button onClick={() => setViewingProductId(null)} className="absolute top-4 left-4 w-10 h-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-slate-900 transition-all shadow-lg"><X size={20} /></button>
                {isOutOfStock && (
                  <div className="absolute bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg"><XCircle size={16} /> نفذ المخزون</div>
                )}
                {isLowStock && (
                  <div className="absolute bottom-4 right-4 bg-amber-500 text-white px-4 py-2 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg"><AlertTriangle size={16} /> مخزون منخفض</div>
                )}
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white">{product.name}</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-3 py-1 rounded-xl text-xs font-bold font-mono">{product.sku || '—'}</span>
                    <span className="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 px-3 py-1 rounded-xl text-xs font-bold font-mono" title={product.id}>ID: {product.id}</span>
                    <span className="bg-accent/10 text-accent px-3 py-1 rounded-xl text-xs font-bold">{product.category}</span>
                    {supplierName && <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1"><ExternalLink size={12} /> {supplierName}</span>}
                    {product.createdAt && <span className="bg-gray-50 dark:bg-slate-800 text-gray-400 px-3 py-1 rounded-xl text-[10px] font-bold">{formatDate(product.createdAt, 'full')}</span>}
                    {product.updatedAt && <span className="bg-gray-50 dark:bg-slate-800 text-gray-400 px-3 py-1 rounded-xl text-[10px] font-bold">آخر تعديل: {formatDate(product.updatedAt, 'full')}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-accent/5 rounded-2xl border border-accent/10">
                    <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">سعر البيع</span>
                    <div className="font-black text-2xl text-accent mt-1">{(product.price || 0).toLocaleString()} <span className="text-xs">ج.م</span></div>
                    <span className="text-[8px] text-gray-400">للقطعة</span>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                    <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">التكلفة</span>
                    <div className="font-black text-2xl text-amber-600 mt-1">{(product.costPrice || 0).toLocaleString()} <span className="text-xs">ج.م</span></div>
                    <span className="text-[8px] text-gray-400">للقطعة</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${profitPerUnit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30'}`}>
                    <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">ربح القطعة</span>
                    <div className={`font-black text-2xl mt-1 ${profitPerUnit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{profitPerUnit.toLocaleString()} <span className="text-xs">ج.م</span></div>
                    <span className={`text-[8px] ${profitMargin >= 40 ? 'text-emerald-500' : profitMargin > 0 ? 'text-amber-500' : 'text-red-400'}`}>هامش {profitMargin.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                    <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">إجمالي المخزون (بيع)</span>
                    <div className="font-black text-sm text-accent mt-0.5">{totalSales.toLocaleString()} <span className="text-[9px]">ج.م</span></div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                    <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">إجمالي المخزون (تكلفة)</span>
                    <div className="font-black text-sm text-amber-600 mt-0.5">{totalCost.toLocaleString()} <span className="text-[9px]">ج.م</span></div>
                  </div>
                  <div className={`p-3 rounded-2xl border ${profitMargin >= 40 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30' : profitMargin > 0 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30'}`}>
                    <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">هامش الربح</span>
                    <div className={`font-black text-sm mt-0.5 ${profitMargin >= 40 ? 'text-emerald-600' : profitMargin > 0 ? 'text-amber-600' : 'text-red-500'}`}>{profitMargin.toFixed(1)}%</div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                    <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">إجمالي القطع</span>
                    <div className="font-black text-sm text-gray-700 dark:text-gray-200 mt-0.5">{totalQty.toLocaleString()}</div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                    <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">القطع المباعة</span>
                    <div className="font-black text-sm text-blue-600 dark:text-blue-400 mt-0.5">{piecesSold.toLocaleString()}</div>
                  </div>
                  <div className={`p-3 rounded-2xl border ${totalProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30'}`}>
                    <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">إجمالي الربح</span>
                    <div className={`font-black text-sm mt-0.5 ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{totalProfit.toLocaleString()} <span className="text-[9px]">ج.م</span></div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                    <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">متوسط السعر</span>
                    <div className="font-black text-sm text-accent mt-0.5">{Math.round(avgPrice).toLocaleString()} <span className="text-[9px]">ج.م</span></div>
                  </div>
                  <div className={`p-3 rounded-2xl border ${lowStockCount > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30' : 'bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700'}`}>
                    <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">متغيرات منخفضة</span>
                    <div className={`font-black text-sm mt-0.5 ${lowStockCount > 0 ? 'text-red-500' : 'text-gray-500'}`}>{lowStockCount} من {product.variants.length}</div>
                  </div>
                  {highestStock && (
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
                      <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">الأعلى مخزوناً</span>
                      <div className="font-black text-[10px] text-emerald-600 mt-0.5 leading-tight line-clamp-1">{highestStock.size} / {highestStock.color} <span className="text-gray-500">({highestStock.quantity})</span></div>
                    </div>
                  )}
                  {lowestStock && (
                    <div className={`p-3 rounded-2xl border ${lowestStock.quantity <= (lowestStock.lowStockThreshold || 0) ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20' : 'bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700'}`}>
                      <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">الأقل مخزوناً</span>
                      <div className={`font-black text-[10px] mt-0.5 leading-tight line-clamp-1 ${lowestStock.quantity <= (lowestStock.lowStockThreshold || 0) ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}>{lowestStock.size} / {lowestStock.color} <span className="text-gray-400">({lowestStock.quantity})</span></div>
                    </div>
                  )}
                </div>

                {/* Product Performance */}
                <div className="bg-gradient-to-br from-gray-50 to-white dark:from-slate-800/50 dark:to-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 via-emerald-500 to-amber-500 rounded-r-full" />
                  <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-500" /> أداء المنتج</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-[9px] font-black text-gray-400 dark:text-gray-500">إجمالي المبيعات</span>
                      <div className="font-black text-sm text-blue-600 dark:text-blue-400 mt-0.5">{piecesSold} <span className="text-[9px]">قطعة</span></div>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-gray-400 dark:text-gray-500">إيراد المبيعات</span>
                      <div className="font-black text-sm text-accent mt-0.5">{salesRevenue.toLocaleString()} <span className="text-[9px]">ج.م</span></div>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-gray-400 dark:text-gray-500">الربح من المبيعات</span>
                      <div className={`font-black text-sm mt-0.5 ${salesProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{salesProfit.toLocaleString()} <span className="text-[9px]">ج.م</span></div>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-gray-400 dark:text-gray-500">معدل الدوران</span>
                      <div className={`font-black text-sm mt-0.5 ${turnoverRate >= 3 ? 'text-emerald-600' : turnoverRate >= 1 ? 'text-amber-600' : 'text-gray-500'}`}>{turnoverRate.toFixed(1)}× <span className="text-[9px]">{turnoverRate >= 3 ? 'ممتاز' : turnoverRate >= 1 ? 'جيد' : 'ضعيف'}</span></div>
                    </div>
                  </div>
                  {/* Performance Bar */}
                  {(() => {
                    const allSoldData = orders.filter(o => activeOrderStatuses.includes(o.status)).reduce((acc, o) => {
                      o.items.forEach(item => { if (!item.productId) return; acc[item.productId] = (acc[item.productId] || 0) + (item.quantity || 0); });
                      return acc;
                    }, {} as Record<string, number>);
                    const sortedProducts = Object.entries(allSoldData).sort((a, b) => b[1] - a[1]);
                    const rank = sortedProducts.findIndex(([id]) => id === product.id) + 1;
                    const totalProductsWithSales = sortedProducts.length;
                    const percentile = rank > 0 && totalProductsWithSales > 0 ? Math.max(0, Math.min(100, Math.round((1 - (rank - 1) / totalProductsWithSales) * 100))) : 0;
                    return (
                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-black text-gray-400 dark:text-gray-500">أداء المبيعات</span>
                          <span className={`text-[9px] font-black ${percentile >= 80 ? 'text-emerald-600' : percentile >= 50 ? 'text-amber-600' : 'text-gray-500'}`}>
                            {percentile}% {rank > 0 ? `(ترتيب ${rank} من ${totalProductsWithSales})` : ''}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${percentile >= 80 ? 'bg-gradient-to-l from-emerald-400 to-emerald-500' : percentile >= 50 ? 'bg-gradient-to-l from-amber-400 to-amber-500' : 'bg-gradient-to-l from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500'}`} style={{ width: `${percentile}%` }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Layers size={18} className="text-accent" /> المتغيرات = {product.variants.length}</h3>
                  <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-slate-800">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-gray-50 dark:bg-slate-800">
                        <tr>
                          <th className="p-3 font-black text-gray-500">SKU</th>
                          <th className="p-3 font-black text-gray-500">المقاس</th>
                          <th className="p-3 font-black text-gray-500">اللون</th>
                          <th className="p-3 font-black text-gray-500">الكمية</th>
                          <th className="p-3 font-black text-gray-500">السعر</th>
                          <th className="p-3 font-black text-gray-500">حد التنبيه</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                        {product.variants.map(v => (
                          <tr key={v.id} className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 ${v.quantity <= (v.lowStockThreshold || 0) ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                            <td className="p-3 font-mono text-[10px] font-bold text-gray-400">{v.sku || '—'}</td>
                            <td className="p-3 font-bold text-gray-900 dark:text-gray-100">{v.size}</td>
                            <td className="p-3 font-bold text-gray-900 dark:text-gray-100">{v.color}</td>
                            <td className={`p-3 font-black ${v.quantity <= (v.lowStockThreshold || 0) ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>{v.quantity}</td>
                            <td className="p-3 font-black text-accent">{(v.price || product.price).toLocaleString()}</td>
                            <td className="p-3 font-bold text-gray-500">{v.lowStockThreshold || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {product.tags && product.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white mb-2">الوسوم</h3>
                    <div className="flex flex-wrap gap-2">
                      {product.tags.map(t => (
                        <span key={t} className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-100 dark:border-slate-700">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {product.url && (
                  <div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white mb-2">رابط المنتج</h3>
                    <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-accent text-xs font-bold hover:underline flex items-center gap-1"><ExternalLink size={14} /> {product.url}</a>
                  </div>
                )}

                <div className="flex justify-between gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                  <button onClick={() => setViewingProductId(null)} className="px-8 py-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black hover:bg-gray-200 dark:hover:bg-slate-700 transition-all">إغلاق</button>
                  <button onClick={() => { setViewingProductId(null); setModal({open: true, p: product}); }} className="px-8 py-3 bg-gradient-to-l from-indigo-500 to-indigo-600 text-white rounded-2xl font-black shadow-lg hover:opacity-90 transition-all flex items-center gap-2"><Edit2 size={18} /> تعديل المنتج</button>
                </div>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* شريط الإجراءات العائم للمنتجات المحددة */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: 100, opacity: 0, x: '-50%' }}
            className="fixed bottom-20 md:bottom-8 left-1/2 z-[60]"
          >
            <div className="bg-white dark:bg-slate-900 px-8 py-5 rounded-[40px] shadow-2xl border border-accent/20 dark:border-slate-700 flex items-center gap-8 backdrop-blur-md bg-white/90 dark:bg-slate-900/90">
              <div className="flex flex-col">
                 <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase">تم تحديد</span>
                 <span className="text-accent font-black text-xl">{selectedIds.size} <span className="text-xs">منتج</span></span>
              </div>
              
              <div className="w-px h-10 bg-gray-100 dark:bg-slate-800"></div>
              
              <div className="flex gap-4 items-center">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsExportSettingsOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                >
                  <Download size={20} />
                  تصدير الجرد
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsBatchEditOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl font-black hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all border border-emerald-100 dark:border-emerald-900/30 active:scale-95"
                >
                  <Pencil size={20} />
                  تعديل جماعي
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-black hover:bg-red-100 dark:hover:bg-red-900/40 transition-all border border-red-100 dark:border-red-900/30 active:scale-95"
                >
                  <Trash2 size={20} />
                  حذف المحدد
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedIds(new Set())}
                  className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-gray-500 rounded-2xl hover:text-red-500 transition-all active:scale-95"
                  title="إلغاء التحديد"
                >
                  <X size={24} />
                </motion.button>
              </div>
            </div>
        </motion.div>
      )}
    </AnimatePresence>

      <BatchEditModal
        isOpen={isBatchEditOpen}
        onClose={() => setIsBatchEditOpen(false)}
        selectedCount={selectedIds.size}
        entityName="منتج"
        fields={batchProductFields}
        onSave={(updates) => {
          if (updates.tags && typeof updates.tags === 'string') {
            updates.tags = updates.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
          }
          onBatchUpdateProducts(Array.from(selectedIds), updates);
          setSelectedIds(new Set());
        }}
      />

    </motion.div>
    </AnimatePresence>
  );
});

export default Inventory;
