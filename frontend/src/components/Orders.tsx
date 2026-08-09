
// ... (imports remain the same)
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUnsavedCheck } from '../hooks/useUnsavedCheck';
import { formatDate } from '../lib/formatDate';
import CollapsibleSection from './CollapsibleSection';
import { 
  ShoppingBag, 
  Plus, 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  Trash2, 
  Clock, 
  CheckCircle, 
  Truck, 
  XCircle, 
  PackageCheck, 
  AlertTriangle, 
  AlertCircle, 
  RefreshCw, 

  Globe, 
  FileJson, 
  X, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  AlertOctagon, 
  CornerUpLeft, 
  DollarSign, 
  Info, 
  CreditCard, 
  Tag, 
  Megaphone, 
  Hash, 
  Calculator, 
  Gift, 
  Search, 
  Percent,
  Edit2,
  CheckSquare,
  Square,
  Download,
  FileSpreadsheet,
  Printer,
  TrendingUp,

  Calendar,
  Eye,
  Terminal,
  ClipboardList,
  Package,
  Copy,
  Navigation,
  Pencil,
  Image,
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FaWhatsapp } from 'react-icons/fa';
import BatchEditModal from './BatchEditModal';
import type { BatchField } from './BatchEditModal';
import InvoicePrintModal from './InvoicePrintModal';
import WaybillPrintModal from './WaybillPrintModal';
import PopupSheet from './PopupSheet';
import { API_BASE } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import CustomerDetail from './CustomerDetail';
import { MD3StatCard, MD3Dialog } from './md3';
import { Product, Order, OrderItem, OrderStatus, Variant, ShippingMethod, Branding, ViewMode, InvoiceSettings, Customer } from '../types';
import ViewSwitcher from './ViewSwitcher';
import { exportToExcel, exportToPDF, exportToHTML, exportToCSV, exportToJSON } from '../lib/exportService';

// ... (GOVERNORATES_RATES, SearchableSelect, OrderDetails, SyncReviewModal, etc. remain the same)
// Keeping the large chunks of code identical to preserve context, focusing on the Orders component logic changes.

const GOVERNORATES_RATES: Record<string, number> = {
  'القاهرة': 65,
  'الجيزة': 65,
  'اطراف القاهره و الجيزه': 75,
  'المدن الجديده': 75,
  'الاسكندرية': 75,
  'القليوبية': 90,
  'الدقهلية': 90,
  'الغربية': 90,
  'المنوفية': 90,
  'بورسعيد': 90,
  'الإسماعيلية': 85,
  'السويس': 85,
  'الشرقية': 85,
  'البحيرة': 85,
  'الفيوم': 95,
  'بني سويف': 95,
  'المنيا': 95,
  'اسيوط': 95,
  'سوهاج': 95,
  'قنا': 105,
  'الاقصر': 105,
  'أسوان': 105,
  'الغردقة': 145,
  'العين السخنة': 150,
  'كفر الشيخ': 85,
  'دمياط': 85,
  'مرسى مطروح': 95,
  'الساحل الشمالي': 95,
  'الوادي الجديد': 145,
  'مرسي علم': 145,
  'سفاجا': 145,
  'شرم الشيخ': 190,
  'دهب': 190,
  'العريش': 190
};

// ... (SearchableSelect component)
interface Option {
  value: string;
  label: string;
  subLabel?: string;
  disabled?: boolean;
  image?: string;
}

const SearchableSelect: React.FC<{
  options: Option[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  onClear?: () => void;
  onImageClick?: (url: string) => void;
}> = ({ options, value, onChange, placeholder, icon, disabled, onClear, onImageClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [dropdownUp, setDropdownUp] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<any>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredOptions = useMemo(() => {
    return options.filter(opt => 
      opt.label.toLowerCase().includes(search.toLowerCase()) || 
      (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
    );
  }, [options, search]);

  const selectedOption = options.find(opt => opt.value === value);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropdownUp(spaceBelow < 280);
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        ref={triggerRef}
        className={`w-full pr-10 pl-4 py-3 bg-gray-50 dark:bg-slate-800 border ${isOpen ? 'border-accent ring-2 ring-accent/20' : 'border-gray-200 dark:border-slate-700'} rounded-2xl flex items-center justify-between cursor-pointer transition-colors duration-200 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.image && (
            <div className="shrink-0">
              <img
                src={selectedOption.image}
                className="w-6 h-6 rounded-md object-cover cursor-pointer"
                alt=""
                onClick={() => onImageClick?.(selectedOption.image!)}
                onMouseEnter={e => {
                  if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setTooltipPos({ top: rect.top, left: rect.left + rect.width + 12 });
                  setHoveredImage(selectedOption.image!);
                }}
                onMouseLeave={() => {
                  hoverTimeoutRef.current = setTimeout(() => setHoveredImage(null), 120);
                }}
              />
            </div>
          )}
          <span className={`text-sm font-bold truncate ${selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-none">
          {value && onClear && (
            <span onClick={(e) => { e.stopPropagation(); onClear(); }} className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer">
              <X size={13} />
            </span>
          )}
          <ChevronDown size={16} className={`text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>
      
      {icon && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">{icon}</div>}

      <PopupSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className={`absolute ${dropdownUp ? 'bottom-full mb-2' : 'top-full mt-2'} w-full bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-md z-[200] overflow-hidden animate-in fade-in zoom-in duration-200`}
        title="اختر من القائمة"
      >
          <div className="p-2 border-b border-gray-50 dark:border-slate-700">
            <div className="relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input 
                autoFocus
                className="w-full pr-8 pl-3 py-2 bg-gray-50 dark:bg-slate-900 rounded-xl text-xs font-bold outline-none text-gray-900 dark:text-white"
                placeholder="ابحث..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div 
                  key={opt.value}
                  onClick={() => {
                    if (opt.disabled) return;
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`p-3 rounded-xl flex items-center justify-between group transition-colors ${opt.disabled ? 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-slate-900' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700'} ${opt.value === value ? 'bg-accent/10 text-accent' : 'text-gray-700 dark:text-gray-200'}`}
                >
                  <div className="flex items-center gap-2">
                    {opt.image && (
                      <img
                        src={opt.image}
                        className="w-8 h-8 rounded-lg object-cover border border-gray-100 dark:border-slate-700 shrink-0 cursor-pointer"
                        alt=""
                        onClick={e => { e.stopPropagation(); onImageClick?.(opt.image!); setIsOpen(false); setSearch(''); }}
                        onMouseEnter={e => {
                          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setTooltipPos({ top: rect.top, left: rect.left + rect.width + 12 });
                          setHoveredImage(opt.image!);
                        }}
                        onMouseLeave={() => {
                          hoverTimeoutRef.current = setTimeout(() => setHoveredImage(null), 120);
                        }}
                      />
                    )}
                    <div className="flex flex-col">
                      <span className="font-bold text-xs">{opt.label}</span>
                      {opt.subLabel && <span className="text-[10px] font-medium mt-0.5">{opt.disabled ? (<span className="text-red-300 dark:text-red-400">نفذت الكمية</span>) : (<span className="text-gray-400 dark:text-gray-500">{opt.subLabel}</span>)}</span>}
                    </div>
                  </div>
                  {opt.value === value && !opt.disabled && <Check size={14} />}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-gray-400 dark:text-gray-500 font-medium">لا توجد نتائج</div>
            )}
          </div>
      </PopupSheet>

      {hoveredImage && (
        <div
          style={{ position: 'fixed', top: tooltipPos.top, left: tooltipPos.left, zIndex: 700 }}
          onMouseEnter={() => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); }}
          onMouseLeave={() => setHoveredImage(null)}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-100 dark:border-slate-700 p-2">
            <img src={hoveredImage} className="w-36 h-36 rounded-xl object-cover max-w-none" alt="" />
          </div>
        </div>
      )}
    </div>
  );
};

interface OrdersProps {
  orders: Order[];
  products: Product[];
  branding?: Branding;
  invoiceSettings?: InvoiceSettings;
  onAddOrder: (order: Order) => void;
  onUpdateOrder: (order: Order) => void;
  onDeleteOrder: (orderId: string) => void;
  onDeleteMultipleOrders: (orderIds: string[]) => void;
  onBatchUpdateOrders: (ids: string[], updates: Record<string, any>) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onUpdateMultipleStatus?: (orderIds: string[], status: string) => void;
  isLoading: boolean;
  importOrdersPreview: Order[] | null;
  onImportOrdersFetch: (source: 'url' | 'file', data: string | Order[]) => Promise<void>;
  onImportOrdersConfirm: (orders: Order[]) => Promise<void>;
  onImportOrdersClose: () => void;
}

const OrderDetails: React.FC<{ order: Order }> = ({ order }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700">
            <button 
                onClick={() => setShow(!show)}
                className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-gray-400 dark:text-gray-500 hover:text-accent transition-colors duration-200 uppercase tracking-widest py-2 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800"
            >
                {show ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                <span>تفاصيل تقنية إضافية (IDs, UTM, Payment)</span>
            </button>
            
            {show && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-xs bg-gray-50/80 dark:bg-slate-900/50 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 mt-4 animate-in fade-in slide-in-from-top-2">
                    {order.city && (
                        <div><span className="block text-gray-400 dark:text-gray-500 font-bold mb-1">المدينة</span><span className="font-bold text-gray-800 dark:text-gray-200 text-sm">{order.city}</span></div>
                    )}
                    {order.shippingCost !== undefined && (
                        <div><span className="block text-gray-400 dark:text-gray-500 font-bold mb-1">تكلفة الشحن</span><span className="font-bold text-gray-800 dark:text-gray-200 text-sm">{order.shippingCost} ج.م</span></div>
                    )}
                    {order.coupon && (
                        <div><span className="block text-gray-400 dark:text-gray-500 font-bold mb-1">الكوبون</span><span className="font-bold text-accent flex items-center gap-1 text-sm"><Tag size={12}/> {order.coupon} ({order.couponDiscount} ج.م)</span></div>
                    )}
                    {order.paymentMethod && (
                        <div><span className="block text-gray-400 dark:text-gray-500 font-bold mb-1">طريقة الدفع</span><span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1 text-sm"><CreditCard size={12}/> {order.paymentMethod}</span></div>
                    )}
                    {order.paymentStatus && (
                        <div><span className="block text-gray-400 dark:text-gray-500 font-bold mb-1">حالة الدفع</span><span className="font-bold text-gray-800 dark:text-gray-200 text-sm">{order.paymentStatus}</span></div>
                    )}
                    {order.altPhone && (
                        <div><span className="block text-gray-400 dark:text-gray-500 font-bold mb-1">هاتف بديل</span><span className="font-bold text-gray-800 dark:text-gray-200 font-mono text-sm">{order.altPhone}</span></div>
                    )}
                    {order.sourceId && (
                        <div><span className="block text-gray-400 dark:text-gray-500 font-bold mb-1">رقم المتجر</span><span className="font-mono text-gray-700 dark:text-gray-300 font-bold text-sm bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md inline-block">#{order.sourceId}</span></div>
                    )}
                    {order.externalOrderId && (
                        <div><span className="block text-gray-400 dark:text-gray-500 font-bold mb-1">رقم خارجي (External)</span><span className="font-mono text-gray-600 dark:text-gray-400 text-xs">{order.externalOrderId}</span></div>
                    )}
                    {order.ref && (
                        <div><span className="block text-gray-400 dark:text-gray-500 font-bold mb-1">Ref</span><span className="font-medium text-gray-800 dark:text-gray-200 text-xs">{order.ref}</span></div>
                    )}
                    {order.utmSource && (
                        <div><span className="block text-gray-400 dark:text-gray-500 font-bold mb-1">مصدر الحملة (UTM)</span><span className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1 text-xs"><Megaphone size={10}/> {order.utmSource}</span></div>
                    )}
                    {(order as any).customerSource && (
                        <div><span className="block text-gray-400 dark:text-gray-500 font-bold mb-1">مصدر العميل</span><span className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1 text-xs"><Megaphone size={10}/> {(order as any).customerSource}</span></div>
                    )}
                    {order.utmCampaign && (
                        <div><span className="block text-gray-400 dark:text-gray-500 font-bold mb-1">اسم الحملة</span><span className="font-medium text-gray-800 dark:text-gray-200 text-xs">{order.utmCampaign}</span></div>
                    )}
                    {order.funnelId && (
                        <div><span className="block text-gray-400 dark:text-gray-500 font-bold mb-1">Funnel ID</span><span className="font-medium text-gray-800 dark:text-gray-200 text-xs">{order.funnelId}</span></div>
                    )}
                    {order.referralCode && (
                        <div><span className="block text-gray-400 dark:text-gray-500 font-bold mb-1">كود الإحالة</span><span className="font-medium text-gray-800 dark:text-gray-200 text-xs">{order.referralCode}</span></div>
                    )}
                    {order.extraData && (
                        <div className="col-span-2"><span className="block text-gray-400 dark:text-gray-500 font-bold mb-1">بيانات إضافية 1</span><span className="font-medium text-gray-800 dark:text-gray-200 break-words text-xs bg-white dark:bg-slate-950 p-2 rounded-lg block border border-gray-100 dark:border-slate-800">{order.extraData}</span></div>
                    )}
                    {order.extraData2 && (
                        <div className="col-span-2"><span className="block text-gray-400 dark:text-gray-500 font-bold mb-1">بيانات إضافية 2</span><span className="font-medium text-gray-800 dark:text-gray-200 break-words text-xs bg-white dark:bg-slate-950 p-2 rounded-lg block border border-gray-100 dark:border-slate-800">{order.extraData2}</span></div>
                    )}
                </div>
            )}
        </div>
    );
};

const SyncOrderEditor: React.FC<{ 
    order: Order; 
    onSave: (o: Order) => void; 
    onCancel: () => void;
  }> = ({ order, onSave, onCancel }) => {
     const [formData, setFormData] = useState<Order>(() => JSON.parse(JSON.stringify(order)));
  
     const handleItemChange = (idx: number, field: keyof OrderItem, value: any) => {
        const newItems = [...formData.items];
        newItems[idx] = { ...newItems[idx], [field]: value };
        setFormData({ ...formData, items: newItems });
     };
     
     const removeItem = (idx: number) => {
        const newItems = formData.items.filter((_, i) => i !== idx);
        setFormData({ ...formData, items: newItems });
     };
  
     const calculatedTotal = formData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) + (formData.shippingCost || 0) - (formData.couponDiscount || 0);
  
     return (
       <div className="space-y-4 p-1 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-500 dark:text-gray-400">اسم العميل</label>
                  <input className="w-full p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-gray-900 dark:text-white" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
              </div>
              <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-500 dark:text-gray-400">رقم الهاتف</label>
                  <input className="w-full p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold font-mono text-gray-900 dark:text-white" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} />
              </div>
               <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-500 dark:text-gray-400">المدينة</label>
                  <input className="w-full p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-gray-900 dark:text-white" value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>
              <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-500 dark:text-gray-400">العنوان</label>
                  <input className="w-full p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-gray-900 dark:text-white" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
          </div>
  
          <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm text-right min-w-[500px]">
                  <thead className="bg-gray-100 dark:bg-slate-800">
                      <tr>
                          <th className="p-2 text-xs text-gray-500 dark:text-gray-300">المنتج</th>
                          <th className="p-2 text-xs text-gray-500 dark:text-gray-300 w-20">الكمية</th>
                          <th className="p-2 text-xs text-gray-500 dark:text-gray-300 w-24">السعر</th>
                          <th className="p-2 w-10"></th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {formData.items.map((item, idx) => (
                          <tr key={idx} className="bg-white dark:bg-slate-900">
                              <td className="p-2">
                                  <div className="font-bold text-gray-800 dark:text-gray-200 text-xs">{item.productName}</div>
                                  <div className="text-[10px] text-gray-500">{item.variantLabel}</div>
                              </td>
                              <td className="p-2">
                                  <input type="number" className="w-full p-1 rounded-lg border border-gray-200 dark:border-slate-700 text-center font-bold bg-white dark:bg-slate-900 text-gray-900 dark:text-white" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))} />
                              </td>
                              <td className="p-2">
                                  <input type="number" className="w-full p-1 rounded-lg border border-gray-200 dark:border-slate-700 text-center font-bold bg-white dark:bg-slate-900 text-gray-900 dark:text-white" value={item.price} onChange={e => handleItemChange(idx, 'price', Number(e.target.value))} />
                              </td>
                              <td className="p-2 text-center">
                                  <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
               </table>
             </div>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
               <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">الشحن</label>
                  <input type="number" className="w-full p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-gray-900 dark:text-white" value={formData.shippingCost || 0} onChange={e => setFormData({...formData, shippingCost: Number(e.target.value)})} />
              </div>
               <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 flex justify-between">
                      <span>الإجمالي</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">محسوب: {calculatedTotal}</span>
                  </label>
                  <input type="number" className="w-full p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-accent dark:text-accent-light" value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: Number(e.target.value)})} />
              </div>
          </div>
  
          <div className="flex justify-end gap-3 pt-4">
              <button onClick={onCancel} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors duration-200">إلغاء</button>
              <button onClick={() => onSave(formData)} className="px-6 py-2 bg-accent text-white font-bold rounded-xl shadow-md hover:opacity-90 transition-opacity duration-200">حفظ التعديلات</button>
          </div>
       </div>
     );
};

const SyncReviewModal: React.FC<{ orders: Order[]; onSaveItem: (o: Order) => void; onSaveAll: (os: Order[]) => void; onClose: () => void; onViewCustomer?: (customerId: string, order: Order) => void; }> = ({ orders, onSaveItem, onSaveAll, onClose, onViewCustomer }) => {
    const [localOrders, setLocalOrders] = useState<Order[]>(() => JSON.parse(JSON.stringify(orders)));
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
    const [expandedId, setExpandedId] = useState<string | null>(orders[0]?.id || null);
    const [editingId, setEditingId] = useState<string | null>(null);
  
    const handleSaveOrder = (order: Order) => {
      onSaveItem(order);
      setSavedIds(prev => new Set([...prev, order.id]));
      const next = localOrders.find(o => o.id !== order.id && !savedIds.has(o.id));
      if (next) setExpandedId(next.id);
    };

    const handleUpdateOrder = (updatedOrder: Order) => {
        setLocalOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
        setEditingId(null);
    };
  
    return (
      <MD3Dialog
        isOpen={true}
        onClose={onClose}
        title="مراجعة الطلبات المستوردة"
        maxWidth="xl"
        actions={[
          { label: 'إغلاق', onClick: onClose, variant: 'text' as const },
          { label: 'حفظ الكل', onClick: () => onSaveAll(localOrders.filter(o => !savedIds.has(o.id))), variant: 'filled' as const, icon: <Check size={18} strokeWidth={3} /> }
        ]}
      >
        <div className="space-y-4">
              {localOrders.map((order, index) => (
                <motion.div 
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                   className={`border-2 rounded-[36px] overflow-hidden bg-[var(--md-sys-color-surface-container-low)] shadow-lg transition-all duration-200 ${savedIds.has(order.id) ? 'opacity-60 border-green-100 dark:border-green-900/30' : 'border-[var(--md-sys-color-outline-variant)]/20'}`}
                >
                  <button onClick={() => setExpandedId(expandedId === order.id ? null : order.id)} className="w-full flex items-center gap-6 p-6 text-right group">
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                       className="w-16 h-16 rounded-[24px] bg-[var(--md-sys-color-surface-container)] flex items-center justify-center shadow-md border border-[var(--md-sys-color-outline-variant)]/20 font-black text-[var(--md-sys-color-primary)]"
                    >
                      {order.customerName.charAt(0)}
                    </motion.div>
                    <div className="flex-1">
                      <h4 className="font-black text-xl text-[var(--md-sys-color-on-surface)]">
                      {order.customerId ? (
                                              <button onClick={e => { e.stopPropagation(); onViewCustomer?.(order.customerId!, order); }} className="text-[var(--md-sys-color-primary)] hover:underline text-right">{order.customerName}</button>
                      ) : order.customerName}
                    </h4>
                      <div className="flex gap-4 mt-1 text-xs font-black text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest">
                          <span>{(order.totalAmount || 0).toLocaleString()} ج.م</span>
                          <span>{order.items.length} أصناف</span>
                          <span>{new Date(order.createdAt).toLocaleDateString('ar-EG')}</span>
                          {order.city && <span>{order.city}</span>}
                      </div>
                    </div>
                    {savedIds.has(order.id) ? <Check className="text-green-500" size={32} strokeWidth={3}/> : <ChevronDown className={`text-gray-400 dark:text-gray-500 transition-transform duration-300 ${expandedId === order.id ? 'rotate-180 text-accent' : ''}`} size={32}/>}
                  </button>
                  <AnimatePresence>
                    {expandedId === order.id && !savedIds.has(order.id) && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-8 bg-[var(--md-sys-color-surface-container)] border-t border-[var(--md-sys-color-outline-variant)]/20">
                            {editingId === order.id ? (
                                <SyncOrderEditor order={order} onSave={handleUpdateOrder} onCancel={() => setEditingId(null)} />
                            ) : (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl">
                                          <h5 className="font-bold text-[var(--md-sys-color-on-surface-variant)] text-xs mb-1">تفاصيل العميل</h5>
                                          <p className="font-bold text-[var(--md-sys-color-on-surface)]">
                                            {order.customerId ? (
                        <button onClick={e => { e.stopPropagation(); onViewCustomer?.(order.customerId!, order); }} className="text-[var(--md-sys-color-primary)] hover:underline text-right">{order.customerName}</button>
                                            ) : order.customerName}
                                          </p>
                                          <p className="text-sm text-gray-500">{order.customerPhone}</p>
                                          <p className="text-sm text-gray-500">{order.address}</p>
                                          {order.city && <p className="text-sm text-gray-500 mt-1"><span className="font-bold">المدينة:</span> {order.city}</p>}
                                          {(order as any).customerSource && <p className="text-sm text-gray-500 mt-1"><span className="font-bold">المصدر:</span> {(order as any).customerSource}</p>}
                                      </div>
                                      <div className="p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl">
                                          <h5 className="font-bold text-[var(--md-sys-color-on-surface-variant)] text-xs mb-1">الأصناف ({order.items.length})</h5>
                                          <ul className="space-y-1">
                                              {order.items.map((item, idx) => (
                                                  <li key={idx} className="text-sm font-bold text-[var(--md-sys-color-on-surface)] flex justify-between">
                                                      <span>{item.quantity}x {item.productName} ({item.variantLabel})</span>
                                                      <span>{((item.price || 0) * (item.quantity || 0)).toLocaleString()} ج.م</span>
                                                  </li>
                                              ))}
                                          </ul>
                                          <div className="mt-2 pt-2 border-t border-[var(--md-sys-color-outline-variant)]/20 text-xs text-[var(--md-sys-color-on-surface-variant)] space-y-1">
                                              <div className="flex justify-between"><span>الشحن:</span> <span>{order.shippingCost || 0} ج.م</span></div>
                                              {order.coupon && <div className="flex justify-between text-amber-600 dark:text-amber-400"><span>كوبون ({order.coupon}):</span> <span>-{order.couponDiscount} ج.م</span></div>}
                                                <div className="flex justify-between font-bold text-[var(--md-sys-color-on-surface)] mt-1 pt-1 border-t border-[var(--md-sys-color-outline-variant)]/20"><span>الإجمالي:</span> <span className="text-green-500 dark:text-green-400">{order.totalAmount} ج.م</span></div>
                                          </div>
                                      </div>
                                  </div>
                                  <OrderDetails order={order} />
                                  <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-[var(--md-sys-color-outline-variant)]/20">
                                      <motion.button 
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setEditingId(order.id)} 
                                        className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-black rounded-2xl border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200 flex items-center justify-center gap-2 flex-1 min-w-[120px]"
                                      >
                                        <Edit2 size={18}/> تعديل
                                      </motion.button>
                                      <motion.button 
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setLocalOrders(prev => prev.filter(o => o.id !== order.id))} 
                                        className="px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-black rounded-2xl border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-200 flex items-center justify-center flex-1 min-w-[120px]"
                                      >
                                        استبعاد الطلب
                                      </motion.button>
                                      <motion.button 
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                         onClick={() => handleSaveOrder(order)} 
                                         className="px-6 py-3 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-black rounded-2xl shadow-lg hover:opacity-90 transition-opacity duration-200 flex items-center justify-center flex-1 min-w-[120px]"
                                      >
                                        قبول وحفظ
                                      </motion.button>
                                  </div>
                                </div>
                            )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
        </div>
      </MD3Dialog>
    );
  };

const SHIPPING_STATUSES = [
  OrderStatus.CONFIRMED,
  OrderStatus.PAID,
  OrderStatus.PROCESSING_SHIPPING,
  OrderStatus.WAITING_SHIPPING,
  OrderStatus.ON_DELIVERY,
  OrderStatus.RETURNED_FROM_SHIPPING
];

const STATUS_TRANSITIONS: Record<string, { label: string; nextStatus: OrderStatus; icon: any; btnClass: string }[]> = {
  [OrderStatus.CONFIRMED]: [
    { label: 'بدء التجهيز', nextStatus: OrderStatus.PROCESSING_SHIPPING, icon: PackageCheck, btnClass: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-100 dark:border-blue-900/30' },
  ],
  [OrderStatus.PAID]: [
    { label: 'بدء التجهيز', nextStatus: OrderStatus.PROCESSING_SHIPPING, icon: PackageCheck, btnClass: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-100 dark:border-blue-900/30' },
  ],
  [OrderStatus.PROCESSING_SHIPPING]: [
    { label: 'بانتظار المندوب', nextStatus: OrderStatus.WAITING_SHIPPING, icon: Clock, btnClass: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 border-orange-100 dark:border-orange-900/30' },
  ],
  [OrderStatus.WAITING_SHIPPING]: [
    { label: 'خروج للتوصيل', nextStatus: OrderStatus.ON_DELIVERY, icon: Truck, btnClass: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100 dark:border-indigo-900/30' },
  ],
  [OrderStatus.ON_DELIVERY]: [
    { label: 'تم التوصيل', nextStatus: OrderStatus.DELIVERED, icon: CheckCircle, btnClass: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100 dark:border-emerald-900/30' },
    { label: 'مرتجع شحن', nextStatus: OrderStatus.RETURNED_FROM_SHIPPING, icon: RefreshCw, btnClass: 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-100 dark:border-red-900/30' },
  ],
  [OrderStatus.RETURNED_FROM_SHIPPING]: [
    { label: 'تم الارجاع', nextStatus: OrderStatus.RETURNED, icon: CheckCircle, btnClass: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100 dark:border-emerald-900/30' },
  ],
  [OrderStatus.INCOMPLETE]: [
    { label: 'إكمال الطلب', nextStatus: OrderStatus.CONFIRMED, icon: CheckCircle, btnClass: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-100 dark:border-blue-900/30' },
    { label: 'إلغاء الطلب', nextStatus: OrderStatus.CANCELED, icon: XCircle, btnClass: 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-100 dark:border-red-900/30' },
  ],
};

const getTransitions = (status: string) => STATUS_TRANSITIONS[status] || [];

const Orders: React.FC<OrdersProps> = ({ 
  orders, 
  products, 
  branding,
  onAddOrder, 
  onUpdateOrder, 
  onDeleteOrder, 
  onDeleteMultipleOrders, 
  onBatchUpdateOrders, 
  onUpdateStatus, 
  onUpdateMultipleStatus,
  isLoading, 
  importOrdersPreview, 
  onImportOrdersFetch, 
  onImportOrdersConfirm, 
  onImportOrdersClose,
  invoiceSettings
}) => {
  const { canEdit } = useAuth();
  const canManageOrders = canEdit('orders');
  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    (orders || []).forEach((o: Order) => { if (o.city) cities.add(o.city); });
    return Array.from(cities);
  }, [orders]);

  const uniqueShippingCompanies = useMemo(() => {
    const companies = new Set<string>();
    (orders || []).forEach((o: Order) => { if (o.shippingCompany) companies.add(o.shippingCompany); });
    return Array.from(companies);
  }, [orders]);

  const batchOrderFields: BatchField[] = [
    { key: 'city', label: 'المدينة', type: 'text', suggestions: uniqueCities },
    { key: 'shippingMethod', label: 'طريقة الشحن', type: 'select', options: Object.values(ShippingMethod).map(s => ({ label: s, value: s })) },
    { key: 'shippingCompany', label: 'شركة الشحن', type: 'text', suggestions: uniqueShippingCompanies },
    { key: 'notes', label: 'ملاحظات', type: 'text' },
    { key: 'status', label: 'الحالة', type: 'select', options: Object.values(OrderStatus).map(s => ({ label: s, value: s })) },
  ];

  const [searchParams, setSearchParams] = useSearchParams();
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(value);
  };
  const parseGoogleMapsUrl = (url: string): { lat: string; lng: string } | null => {
    if (!url) return null;
    const patterns = [
      /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,
      /\/maps\/place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return { lat: m[1], lng: m[2] };
    }
    return null;
  };
  const [isAdding, setIsAdding] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // Handle auto-edit/view from URL params
  useEffect(() => {
    const editId = searchParams.get('edit');
    const viewId = searchParams.get('entityId');
    const viewOrderId = searchParams.get('viewOrder');
    if (viewOrderId) {
      const found = orders.find(o => o.id === viewOrderId);
      if (found) {
        setViewingOrderId(found.id);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('viewOrder');
        setSearchParams(newParams, { replace: true });
      }
    }
    if (viewId) {
      const found = orders.find(o => o.id === viewId || o.sourceId === viewId);
      if (found) setViewingOrderId(found.id);
    }
    if (editId) {
      const orderToEdit = orders.find(o => o.id === editId);
      if (orderToEdit) {
        startEditing(orderToEdit);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('edit');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, orders]);

  const [formData, setFormData] = useState({
    orderIdColumn: '',
    customerId: '',
    customerName: '',
    customerPhone: '',
    address: '',
    notes: '',
    city: '',
    shippingCost: 0,
    coupon: '',
    couponDiscount: 0,
    altPhone: '',
    extraData: '',
    ref: '',
    utmSource: '',
    utmCampaign: '',
    shippingMethod: ShippingMethod.EXTERNAL,
    shippingCompany: '',
    status: OrderStatus.UNDER_REVIEW,
    mapUrl: '',
    latitude: '',
    longitude: '',
    customerSource: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const autoFillTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (autoFillTimer.current) clearTimeout(autoFillTimer.current);
    const phone = formData.customerPhone?.trim();
    if (!phone || phone.length < 10) {
      setFormData(prev => ({ ...prev, customerId: '' }));
      return;
    }
    autoFillTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/customers/search?q=${encodeURIComponent(phone)}`);
        if (!res.ok) return;
        const customers = await res.json();
        const match = customers.find((c: any) => c.phone.replace(/\s/g, '') === phone.replace(/\s/g, ''));
        if (!match) return;
        setFormData(prev => ({
          ...prev,
          customerId: match.id,
          customerName: match.name || prev.customerName,
          altPhone: match.alt_phone || prev.altPhone,
          address: match.address || prev.address,
          city: match.city || prev.city,
          mapUrl: match.map_url || prev.mapUrl,
          latitude: match.latitude || prev.latitude,
          longitude: match.longitude || prev.longitude,
          notes: match.notes || prev.notes,
          customerSource: match.source || prev.customerSource
        }));
      } catch {}
    }, 500);
    return () => { if (autoFillTimer.current) clearTimeout(autoFillTimer.current); };
  }, [formData.customerPhone]);

  const { withUnsavedCheck, markClean } = useUnsavedCheck(formData);

  const [contactCompanies, setContactCompanies] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/contacts/companies`)
      .then(r => r.json())
      .then(rows => {
        setContactCompanies(rows.filter((r: any) => r.entityType === 'شركة شحن').map((r: any) => r.companyName));
      })
      .catch(() => {});
  }, []);

  const savedCompanies = useMemo(() => {
    const companies = orders
      .map(o => o.shippingCompany)
      .filter((c): c is string => !!c);
    const all = new Set([...companies, ...contactCompanies]);
    return Array.from(all);
  }, [orders, contactCompanies]);

  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'last30' | 'thisMonth' | 'lastMonth' | 'month' | 'custom'>('all');
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

  const [isFreeShipping, setIsFreeShipping] = useState(false);
  const [useCoupon, setUseCoupon] = useState(false);
  const [isPercentDiscount, setIsPercentDiscount] = useState(false);
  const [showCouponDropdown, setShowCouponDropdown] = useState(false);
  const [couponMode, setCouponMode] = useState<'saved' | 'custom'>('saved');
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  const [viewingCustomerFromOrder, setViewingCustomerFromOrder] = useState<Customer | null>(null);
  const [viewingCustomerOrders, setViewingCustomerOrders] = useState<Order[]>([]);
  const [waybillModalOpen, setWaybillModalOpen] = useState(false);
  const [waybillOrders, setWaybillOrders] = useState<Order[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [editingItemIndex, setEditingItemIndex] = useState<number>(-1);
  const [editVariantId, setEditVariantId] = useState<string>('');
  const [editQuantity, setEditQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [editSize, setEditSize] = useState<string>('');
  const [editColor, setEditColor] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [tableHoveredImage, setTableHoveredImage] = useState<string | null>(null);
  const [tableTooltipPos, setTableTooltipPos] = useState({ top: 0, left: 0 });
  const tableHoverTimeoutRef = useRef<any>(null);
  const [importStep, setImportStep] = useState<'none' | 'source' | 'url_input'>('none');
  const [importUrl, setImportUrl] = useState('');

  const importJsonInputRef = useRef<HTMLInputElement>(null);
  const couponContainerRef = useRef<HTMLDivElement>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false);
  const [savedCoupons, setSavedCoupons] = useState<Record<string, { discount: number; is_percent: boolean }>>({});

  useEffect(() => {
    fetch(`${API_BASE}/coupons`).then(r => r.json()).then((data: { code: string; discount: number; is_percent: boolean }[]) => {
      const map: Record<string, { discount: number; is_percent: boolean }> = {};
      data.forEach(c => { map[c.code] = { discount: c.discount, is_percent: !!c.is_percent }; });
      setSavedCoupons(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!showCouponDropdown) return;
    const handler = (e: MouseEvent) => {
      if (couponContainerRef.current && !couponContainerRef.current.contains(e.target as Node)) {
        setShowCouponDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCouponDropdown]);

  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isInvoicePrintOpen, setIsInvoicePrintOpen] = useState(false);
  const [singlePrintOrderId, setSinglePrintOrderId] = useState<string | null>(null);
  const [activeStatusOrderId, setActiveStatusOrderId] = useState<string | null>(null);
  useEffect(() => {
    if (activeStatusOrderId === null) return;
    const handleClick = () => setActiveStatusOrderId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [activeStatusOrderId]);
  const [isExportSettingsOpen, setIsExportSettingsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    format: 'excel' as 'excel' | 'pdf' | 'html',
    includeItems: true,
    selectedColumns: ['sourceId', 'customerName', 'customerPhone', 'city', 'status', 'totalAmount', 'createdAt']
  });

  const availableColumns = [
    { id: 'sourceId', label: 'رقم الطلب' },
    { id: 'customerName', label: 'اسم العميل' },
    { id: 'customerPhone', label: 'رقم الهاتف' },
    { id: 'city', label: 'المدينة' },
    { id: 'address', label: 'العنوان' },
    { id: 'status', label: 'الحالة' },
    { id: 'totalAmount', label: 'الإجمالي' },
    { id: 'createdAt', label: 'التاريخ' },
    { id: 'coupon', label: 'الكوبون' },
  ];

  const toggleColumn = (colId: string) => {
    setExportConfig(prev => ({
      ...prev,
      selectedColumns: prev.selectedColumns.includes(colId)
        ? prev.selectedColumns.filter(c => c !== colId)
        : [...prev.selectedColumns, colId]
    }));
  };

  const handleProfessionalExport = async () => {
    setIsExporting(true);
    try {
      const targetOrders = selectedIds.size > 0 
        ? orders.filter(o => selectedIds.has(o.id))
        : filteredOrders;

      const fileName = `orders_export_${Date.now()}`;
      const title = `سجل الطلبات - ${new Date().toLocaleDateString('ar-EG')}`;

      const summaryData = [
        { label: 'عدد الطلبات', value: targetOrders.length.toString() },
        { label: 'إجمالي القطع المبيعة', value: targetOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + (i.quantity || 0), 0), 0).toString() },
        { label: 'إجمالي المبيعات (نقدي)', value: formatCurrency(targetOrders.reduce((sum, o) => sum + o.totalAmount, 0)), color: 'green' },
        { label: 'إجمالي عوائد الشحن', value: formatCurrency(targetOrders.reduce((sum, o) => sum + (o.shippingCost || 0), 0)) },
        { label: 'متوسط قيمة الطلب', value: formatCurrency(targetOrders.length > 0 ? targetOrders.reduce((sum, o) => sum + o.totalAmount, 0) / targetOrders.length : 0) },
      ];

      if (exportConfig.format === 'excel') {
        const fileName = `orders_${Date.now()}`;
        const sheetName = 'سجل الطلبات';
        const excelColumns: any[] = [];
        if (exportConfig.selectedColumns.includes('createdAt')) excelColumns.push({ header: 'التاريخ', key: 'createdAt', width: 22 });
        if (exportConfig.selectedColumns.includes('sourceId')) excelColumns.push({ header: 'رقم الطلب', key: 'sourceId', width: 15 });
        if (exportConfig.selectedColumns.includes('customerName')) excelColumns.push({ header: 'العميل', key: 'customerName', width: 25 });
        if (exportConfig.selectedColumns.includes('customerPhone')) excelColumns.push({ header: 'الهاتف', key: 'customerPhone', width: 15 });
        if (exportConfig.selectedColumns.includes('city')) excelColumns.push({ header: 'المحافظة', key: 'city', width: 15 });
        if (exportConfig.selectedColumns.includes('status')) excelColumns.push({ header: 'الحالة', key: 'status', width: 15 });

        if (exportConfig.includeItems) {
          excelColumns.push({ header: 'المنتج', key: 'productName', width: 30 });
          excelColumns.push({ header: 'المتغير', key: 'variantLabel', width: 20 });
          excelColumns.push({ header: 'الكمية', key: 'qty', width: 10 });
          excelColumns.push({ header: 'سعر القطعة', key: 'itemPrice', width: 15 });
        }

        if (exportConfig.selectedColumns.includes('totalAmount')) excelColumns.push({ header: 'إجمالي الطلب', key: 'totalAmount', width: 18 });
        if (exportConfig.selectedColumns.includes('coupon')) excelColumns.push({ header: 'الكوبون', key: 'coupon', width: 12 });

        const excelData: any[] = [];
        targetOrders.forEach(o => {
          const orderDate = new Date(o.createdAt).toLocaleString('ar-EG');
          if (exportConfig.includeItems && o.items.length > 0) {
            o.items.forEach(item => {
              excelData.push({
                createdAt: orderDate,
                sourceId: displayOrderId(o.id),
                storeId: o.sourceId || '',
                customerName: o.customerName,
                customerPhone: o.customerPhone,
                city: o.city || '-',
                status: o.status,
                productName: item.productName,
                variantLabel: item.variantLabel,
                qty: item.quantity,
                itemPrice: item.price,
                totalAmount: o.totalAmount,
                coupon: o.coupon || '-'
              });
            });
          } else {
            excelData.push({
              createdAt: orderDate,
              sourceId: displayOrderId(o.id),
              storeId: o.sourceId || '',
              customerName: o.customerName,
              customerPhone: o.customerPhone,
              city: o.city || '-',
              status: o.status,
              totalAmount: o.totalAmount,
              coupon: o.coupon || '-'
            });
          }
        });

        await exportToExcel(excelData, fileName, sheetName, excelColumns, summaryData, branding, { user: 'المسؤول', status: 'جرد مستمر' });
      } else if (exportConfig.format === 'pdf') {
        const activeCols = availableColumns.filter(c => exportConfig.selectedColumns.includes(c.id));
        const columns = activeCols.map(c => c.label);
        const keys = activeCols.map(c => c.id === 'totalAmount' ? 'totalPrice' : c.id);
        
        const data = targetOrders.map(o => ({
          ...o,
          sourceId: displayOrderId(o.id),
          storeId: o.sourceId || '',
          totalPrice: formatCurrency(o.totalAmount),
          createdAt: new Date(o.createdAt).toLocaleDateString('ar-EG')
        }));

        await exportToPDF(data, fileName, title, columns, keys, undefined, summaryData, branding);
      } else if (exportConfig.format === 'html') {
        const activeCols = availableColumns.filter(c => exportConfig.selectedColumns.includes(c.id));
        const htmlHeaders = activeCols.map(c => c.label);
        const htmlKeys = activeCols.map(c => c.id === 'totalAmount' ? 'totalPrice' : c.id);
        
        const htmlData = targetOrders.map(o => ({
          ...o,
          sourceId: displayOrderId(o.id),
          storeId: o.sourceId || '',
          totalPrice: formatCurrency(o.totalAmount),
          createdAt: new Date(o.createdAt).toLocaleString('ar-EG')
        }));

        exportToHTML(htmlData, fileName, 'عرض سجل الطلبات التفاعلي', htmlHeaders, htmlKeys, branding);
      }

      setIsExportSettingsOpen(false);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'الكل' | 'all_shipping'>('الكل');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const isShippingFilter = statusFilter === 'all_shipping';
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem('erp_view_orders') as ViewMode) || 'grid');
  useEffect(() => { localStorage.setItem('erp_view_orders', viewMode); }, [viewMode]);

  const filteredOrders = useMemo(() => {
    let result = orders.filter(o => {
      const search = orderSearch.toLowerCase();
      const matchSearch = o.customerName.toLowerCase().includes(search) || 
                          o.customerPhone.includes(search) ||
                          (o.sourceId || '').toLowerCase().includes(search) ||
                          o.items.some(item => item.productName.toLowerCase().includes(search)) ||
                          o.items.some(item => (item.sku || '').toLowerCase().includes(search));
      const matchStatus = statusFilter === 'الكل' || (statusFilter === 'all_shipping' ? SHIPPING_STATUSES.includes(o.status) : o.status === statusFilter);

      // Date filtering
      const orderDate = new Date(o.createdAt);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const last30 = new Date(today);
      last30.setDate(last30.getDate() - 30);

      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      lastDayLastMonth.setHours(23, 59, 59, 999);

      let matchDate = true;
      if (dateFilter === 'today') {
        matchDate = orderDate >= today;
      } else if (dateFilter === 'yesterday') {
        matchDate = orderDate >= yesterday && orderDate < today;
      } else if (dateFilter === 'thisMonth') {
        matchDate = orderDate >= firstDayThisMonth;
      } else if (dateFilter === 'lastMonth') {
        matchDate = orderDate >= firstDayLastMonth && orderDate <= lastDayLastMonth;
      } else if (dateFilter === 'last30') {
        matchDate = orderDate >= last30;
      } else if (dateFilter === 'month') {
        const [year, month] = selectedMonth.split('-').map(Number);
        matchDate = orderDate.getFullYear() === year && (orderDate.getMonth() + 1) === month;
      } else if (dateFilter === 'custom') {
        const start = customDateRange.start ? new Date(customDateRange.start) : null;
        const end = customDateRange.end ? new Date(customDateRange.end) : null;
        if (end) end.setHours(23, 59, 59, 999);
        
        if (start && end) {
          matchDate = orderDate >= start && orderDate <= end;
        } else if (start) {
          matchDate = orderDate >= start;
        } else if (end) {
          matchDate = orderDate <= end;
        }
      }

      return matchSearch && matchStatus && matchDate;
    });

    return [...result].sort((a, b) => {
      let va: any, vb: any;
      switch (sortField) {
        case 'totalAmount': va = a.totalAmount ?? 0; vb = b.totalAmount ?? 0; break;
        case 'shippingCost': va = a.shippingCost ?? 0; vb = b.shippingCost ?? 0; break;
        case 'city': va = a.city || ''; vb = b.city || ''; break;
        default: va = a.createdAt || ''; vb = b.createdAt || '';
      }
      if (typeof va === 'number' && typeof vb === 'number') return sortAsc ? va - vb : vb - va;
      return sortAsc ? (va || '').localeCompare(vb || '') : (vb || '').localeCompare(va || '');
    });
  }, [orders, orderSearch, statusFilter, sortField, sortAsc, dateFilter, customDateRange]);

  const orderStats = useMemo(() => {
    const targetOrders = filteredOrders;
    const totalRevenue = targetOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const localShipping = targetOrders.filter(o => o.shippingMethod === ShippingMethod.LOCAL).reduce((sum, o) => sum + (o.shippingCost || 0), 0);
    const externalShipping = targetOrders.filter(o => o.shippingMethod === ShippingMethod.EXTERNAL || !o.shippingMethod).reduce((sum, o) => sum + (o.shippingCost || 0), 0);
    const totalShipping = localShipping + externalShipping;
    const completedOrders = targetOrders.filter(o => o.status === OrderStatus.DELIVERED).length;
    
    const estimatedProfit = targetOrders.reduce((sum, o) => {
      const orderCost = o.items.reduce((itemSum, item) => {
        const prod = products.find(p => p.id === item.productId);
        return itemSum + ((prod?.costPrice || 0) * (item.quantity || 0));
      }, 0);
      return sum + ((o.totalAmount || 0) - orderCost - (o.shippingCost || 0));
    }, 0);

    return {
      total: targetOrders.length,
      revenue: totalRevenue,
      shipping: totalShipping,
      localShipping,
      externalShipping,
      localOrderCount: targetOrders.filter(o => o.shippingMethod === ShippingMethod.LOCAL).length,
      externalOrderCount: targetOrders.filter(o => o.shippingMethod === ShippingMethod.EXTERNAL || !o.shippingMethod).length,
      completed: completedOrders,
      profit: estimatedProfit,
      pending: targetOrders.filter(o => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELED && o.status !== OrderStatus.INCOMPLETE).length
    };
  }, [filteredOrders, products]);

  const dispatchStats = useMemo(() => {
    const targetOrders = filteredOrders;
    const totalCollected = targetOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const localShipping = targetOrders.filter(o => o.shippingMethod === ShippingMethod.LOCAL).reduce((sum, o) => sum + (o.shippingCost || 0), 0);
    const externalShipping = targetOrders.filter(o => o.shippingMethod === ShippingMethod.EXTERNAL || !o.shippingMethod).reduce((sum, o) => sum + (o.shippingCost || 0), 0);
    const totalItems = targetOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
    const distinctCities = new Set(targetOrders.map(o => o.city).filter(Boolean)).size;

    return {
      count: targetOrders.length,
      totalCollected,
      totalItems,
      distinctCities,
      avgValue: targetOrders.length > 0 ? totalCollected / targetOrders.length : 0,
      localShipping,
      externalShipping
    };
  }, [filteredOrders]);

  const governorateOptions = useMemo(() => Object.keys(GOVERNORATES_RATES).map(g => ({ value: g, label: g })), []);
  
  const productOptions = useMemo(() => products.map(p => ({ 
    value: p.id, 
    label: `${p.name} [${p.sku || ''}]`,
    subLabel: `${p.price} ج.م | ${p.variants.reduce((s,v) => s + v.quantity, 0)} قطعة`,
    image: p.image
  })), [products]);

  const allCoupons = savedCoupons;

  const suggestedCoupons = useMemo(() => Object.keys(allCoupons), [allCoupons]);

  const filteredCoupons = useMemo(() => {
    if (!suggestedCoupons.length) return [];
    const q = formData.coupon.toUpperCase();
    if (!q) return suggestedCoupons;
    return suggestedCoupons.filter(c => c.includes(q));
  }, [suggestedCoupons, formData.coupon]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`هل أنت متأكد من حذف ${selectedIds.size} طلب نهائياً؟`)) {
      onDeleteMultipleOrders(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
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

  const generateCSV = (data: Order[]) => {
    const headers = ['رقم الطلب', 'رقم المتجر', 'تاريخ الطلب', 'اسم العميل', 'رقم الهاتف', 'المحافظة', 'الحالة', 'الإجمالي', 'عدد الأصناف'];
    const rows = data.map(o => [
      displayOrderId(o.id),
      o.sourceId || '',
      new Date(o.createdAt).toLocaleString('ar-EG'),
      o.customerName,
      o.customerPhone,
      o.city || '-',
      o.status,
      o.totalAmount,
      o.items.length
    ]);
    return [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  };

  const generateExcelAuditTable = (data: Order[]) => {
     let table = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"><style>
        table { border-collapse: collapse; width: 100%; direction: rtl; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        th { background-color: #5D87B8; color: white; font-weight: bold; border: 1px solid #ddd; padding: 12px; }
        td { border: 1px solid #ddd; padding: 10px; text-align: right; }
      </style></head>
      <body>
        <table>
          <tr>
            <th>رقم الطلب</th>
            <th>تاريخ الطلب</th>
            <th>اسم العميل</th>
            <th>رقم الهاتف</th>
            <th>المحافظة</th>
            <th>العنوان</th>
            <th>عدد الأصناف</th>
            <th>حالة الطلب</th>
            <th>الإجمالي</th>
          </tr>
    `;
    data.forEach(o => {
        table += `
          <tr>
            <td>${displayOrderId(o.id)}</td>
            <td>${new Date(o.createdAt).toLocaleString('ar-EG')}</td>
            <td>${o.customerName}</td>
            <td>${o.customerPhone}</td>
            <td>${o.city || '-'}</td>
            <td>${o.address}</td>
            <td>${o.items.length}</td>
            <td>${o.status}</td>
            <td>${o.totalAmount}</td>
          </tr>
        `;
    });
    table += `</table></body></html>`;
    return table;
  };

  const printSelectedOrders = (selectedOrders: Order[]) => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const html = `
      <html dir="rtl">
        <head>
          <title>تقرير الطلبات</title>
          <style>
             @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
            body { font-family: 'Cairo', sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 20px; }
            @media print {
               .no-print { display: none; }
            }
          </style>
        </head>
        <body>
            <div class="header">
              ${branding?.logo ? `<img src="${branding.logo}" style="width: 60px; height: 60px; object-fit: contain; margin-bottom: 10px; background: white; padding: 5px; border-radius: 10px; border: 1px solid #eee;" />` : ''}
              <h1 style="margin: 0;">${branding?.name || 'نظام X2 ERP'}</h1>
              <div style="margin: 5px 0;">
                ${branding?.sloganDesign ? `<img src="${branding.sloganDesign}" style="width: 140px; height: auto; object-fit: contain;" />` : branding?.slogan ? `<p style="margin: 0; font-style: italic; opacity: 0.8;">${branding.slogan}</p>` : ''}
              </div>
              <div style="height: 2px; background: #5D87B8; width: 60px; margin: 10px auto;"></div>
              <h2 style="margin: 0; font-size: 18px;">تقرير الطلبات المحددة</h2>
              <p>تاريخ التقرير: ${new Date().toLocaleString('ar-EG')}</p>
              <p>عدد الطلبات: ${selectedOrders.length}</p>
            </div>
          <table>
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>العميل</th>
                <th>الهاتف</th>
                <th>التاريخ</th>
                <th>المدينة</th>
                <th>الحالة</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${selectedOrders.map(o => `
                <tr>
                  <td>${displayOrderId(o.id)}</td>
                  <td>${o.customerName}</td>
                  <td>${o.customerPhone}</td>
                  <td>${new Date(o.createdAt).toLocaleDateString('ar-EG')}</td>
                  <td>${o.city || '-'}</td>
                  <td>${o.status}</td>
                  <td>${o.totalAmount} ج.م</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
          </script>
        </body>
      </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
  };

  const handleExport = (format: 'json' | 'csv' | 'excel' | 'pdf') => {
    const selectedOrders = orders.filter(o => selectedIds.has(o.id));
    
    if (format === 'json') {
      const dataStr = JSON.stringify(selectedOrders, null, 2);
      downloadFile(dataStr, `orders_${format}_${Date.now()}.json`, 'application/json');
    } else if (format === 'csv') {
      const csvContent = generateCSV(selectedOrders);
      downloadFile(csvContent, `orders_export_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
    } else if (format === 'excel') {
      const excelContent = generateExcelAuditTable(selectedOrders);
      downloadFile(excelContent, `orders_audit_${Date.now()}.xls`, 'application/vnd.ms-excel');
    } else if (format === 'pdf') {
      printSelectedOrders(selectedOrders);
    }
    
    setIsExportSettingsOpen(false);
  };
  
  const handleDeleteSingle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
       onDeleteOrder(id);
    }
  };

  const handleViewCustomerFromOrder = async (customerId: string, order: Order) => {
    try {
      const res = await fetch(`${API_BASE}/customers/${customerId}`);
      const data = await res.json();
      if (data.customer) {
        setViewingCustomerFromOrder(data.customer);
        setViewingCustomerOrders(data.orders || []);
      }
    } catch {
      // fallback: show basic info if API fails
    }
  };

  const resetForm = () => {
    setFormData({ 
        orderIdColumn: '',
        customerId: '',
        customerName: '', customerPhone: '', address: '', notes: '', 
        city: '', shippingCost: 0, coupon: '', couponDiscount: 0, 
        altPhone: '', extraData: '', ref: '', utmSource: '', utmCampaign: '',
        shippingMethod: ShippingMethod.EXTERNAL,
        shippingCompany: '',
        status: OrderStatus.UNDER_REVIEW,
        mapUrl: '',
        latitude: '',
        longitude: '',
        customerSource: ''
    });
    setFormErrors({});
    setOrderItems([]);
    setEditingItemIndex(-1);
    setEditVariantId('');
    setEditQuantity(1);
    setEditSize('');
    setEditColor('');
    setSelectedSize('');
    setSelectedColor('');
    setIsFreeShipping(false);
    setUseCoupon(false);
    setIsPercentDiscount(false);
    setCouponMode('saved');
    setIsAdding(false);
    setEditingOrderId(null);
  };

  const startEditing = (order: Order) => {
    setFormData({
      customerId: order.customerId || '',
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      address: order.address.split(' - ')[0] || order.address, // Try to separate city if combined
      notes: order.notes,
      city: order.city || '',
      shippingCost: order.shippingCost || 0,
      coupon: order.coupon || '',
      couponDiscount: order.couponDiscount || 0,
      altPhone: order.altPhone || '',
      extraData: order.extraData || '',
      ref: order.ref || '',
      utmSource: order.utmSource || '',
      utmCampaign: order.utmCampaign || '',
      shippingMethod: order.shippingMethod || ShippingMethod.EXTERNAL,
      shippingCompany: order.shippingCompany || '',
      orderIdColumn: order.orderIdColumn || '', // Populate
      mapUrl: order.mapUrl || '',
      latitude: order.latitude || '',
      longitude: order.longitude || '',
      customerSource: (order as any).customerSource || '',
      status: order.status
    });
    setOrderItems(order.items);
    setEditingItemIndex(-1);
    setEditVariantId('');
    setEditQuantity(1);
    setEditSize('');
    setEditColor('');
    setSelectedProduct('');
    setSelectedSize('');
    setSelectedColor('');
    setIsFreeShipping(order.shippingCost === 0);
    setUseCoupon(!!order.coupon);
    setIsPercentDiscount(!!order.couponDiscountIsPercent);
    setCouponMode(order.coupon === 'خصم مخصص' ? 'custom' : 'saved');
    setEditingOrderId(order.id);
    setIsAdding(true);
  };

  const handleCityChange = (city: string) => {
      const rate = GOVERNORATES_RATES[city] || 0;
      setFormData(prev => ({ 
          ...prev, 
          city, 
          shippingCost: isFreeShipping ? 0 : rate 
      }));
  };

  const handleMapUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, mapUrl: url }));
    const coords = parseGoogleMapsUrl(url);
    if (coords) {
      setFormData(prev => ({ ...prev, mapUrl: url, latitude: coords.lat, longitude: coords.lng }));
    } else {
      setFormData(prev => ({ ...prev, mapUrl: url }));
    }
  };

  const toggleFreeShipping = (checked: boolean) => {
      setIsFreeShipping(checked);
      if (checked) {
          setFormData(prev => ({ ...prev, shippingCost: 0 }));
      } else {
          const rate = GOVERNORATES_RATES[formData.city] || 0;
          setFormData(prev => ({ ...prev, shippingCost: rate }));
      }
  };

  // Derive selectedVariant from selectedProduct + selectedSize + selectedColor
  useEffect(() => {
    if (!selectedProduct) { setSelectedVariant(''); return; }
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;
    const sizes = [...new Set(product.variants.map(v => v.size))].filter(s => s !== 'واحد');
    const colors = [...new Set(product.variants.map(v => v.color))].filter(c => c !== 'متعدد');
    if (sizes.length === 0 && colors.length === 0) {
      setSelectedVariant(product.variants[0]?.id || '');
      return;
    }
    if (sizes.length > 0 && colors.length > 0) {
      if (selectedSize && selectedColor) {
        const v = product.variants.find(va => va.size === selectedSize && va.color === selectedColor);
        setSelectedVariant(v?.id || '');
      } else {
        setSelectedVariant('');
      }
    } else if (sizes.length > 0) {
      if (selectedSize) {
        const v = product.variants.find(va => va.size === selectedSize);
        setSelectedVariant(v?.id || '');
      } else {
        setSelectedVariant('');
      }
    } else if (colors.length > 0) {
      if (selectedColor) {
        const v = product.variants.find(va => va.color === selectedColor);
        setSelectedVariant(v?.id || '');
      } else {
        setSelectedVariant('');
      }
    }
  }, [selectedProduct, selectedSize, selectedColor, products]);

  const addItemToOrder = () => {
    if (!selectedProduct || !selectedVariant) return;
    const product = products.find(p => p.id === selectedProduct);
    const variant = product?.variants.find(v => v.id === selectedVariant);
    if (!product || !variant) return;
    if (variant.quantity < quantity) {
      alert(`الكمية غير متوفرة. المتاح: ${variant.quantity}`);
      return;
    }
    const newItem: OrderItem = {
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      variantLabel: `${variant.size} - ${variant.color}`,
      quantity,
      price: product.price,
      costPrice: product.costPrice,
      image: product.image,
      sku: product.sku || variant.sku,
      skuStatus: 'matched'
    };
    setOrderItems([...orderItems, newItem]);
    setSelectedProduct('');
    setSelectedVariant('');
    setSelectedSize('');
    setSelectedColor('');
    setQuantity(1);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
    if (editingItemIndex === index) { setEditingItemIndex(-1); setEditVariantId(''); setEditQuantity(1); setEditSize(''); setEditColor(''); }
  };

  const startInlineEditItem = (index: number) => {
    const item = orderItems[index];
    if (!item) return;
    const product = products.find(p => p.id === item.productId);
    if (product) {
      const variant = product.variants.find(v => v.id === item.variantId);
      if (variant) {
        setEditSize(variant.size);
        setEditColor(variant.color);
      } else if (product.variants.length > 0) {
        setEditSize(product.variants[0].size);
        setEditColor(product.variants[0].color);
      }
    }
    setEditQuantity(item.quantity);
    setEditingItemIndex(index);
  };

  const saveInlineEdit = () => {
    if (editingItemIndex < 0) return;
    const item = orderItems[editingItemIndex];
    if (!item) return;
    const product = products.find(p => p.id === item.productId);
    const variant = product?.variants.find(v => v.size === editSize && v.color === editColor);
    if (!product || !variant) {
      // deleted product — just update quantity
      setOrderItems(orderItems.map((it, i) => i === editingItemIndex ? { ...it, quantity: editQuantity } : it));
    } else {
      setOrderItems(orderItems.map((it, i) => i === editingItemIndex ? {
        ...it,
        variantId: variant.id,
        variantLabel: `${variant.size} - ${variant.color}`,
        quantity: editQuantity,
        price: product.price,
      } : it));
    }
    setEditingItemIndex(-1);
    setEditVariantId('');
    setEditQuantity(1);
    setEditSize('');
    setEditColor('');
  };

  const cancelInlineEdit = () => {
    setEditingItemIndex(-1);
    setEditVariantId('');
    setEditQuantity(1);
    setEditSize('');
    setEditColor('');
  };

  const itemsTotal = useMemo(() => orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0), [orderItems]);
  
  const calculatedDiscount = useMemo(() => {
      if (!useCoupon || !formData.couponDiscount) return 0;
      if (isPercentDiscount) {
          return Math.round((itemsTotal * formData.couponDiscount) / 100);
      }
      return formData.couponDiscount;
  }, [useCoupon, formData.couponDiscount, isPercentDiscount, itemsTotal]);

  const toggleDiscountMode = () => {
    if (itemsTotal > 0 && formData.couponDiscount > 0) {
      setFormData(prev => {
        const val = prev.couponDiscount;
        if (isPercentDiscount) {
          return { ...prev, couponDiscount: Math.round(itemsTotal * val / 100) };
        }
        return { ...prev, couponDiscount: Math.round(val / itemsTotal * 100) };
      });
    }
    setIsPercentDiscount(prev => !prev);
  };

  const finalTotal = itemsTotal + (formData.shippingCost || 0) - calculatedDiscount;

  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!(formData.customerName || '').trim()) errors.customerName = 'يرجى إدخال اسم العميل';
    if (!(formData.customerPhone || '').trim()) errors.customerPhone = 'يرجى إدخال رقم الهاتف';
    if (!(formData.address || '').trim()) errors.address = 'يرجى إدخال العنوان التفصيلي';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    if (orderItems.length === 0) {
      alert("يجب إضافة منتج واحد على الأقل");
      return;
    }
    for (const item of orderItems) {
      if (!item.productId) {
        alert(`المنتج "${item.productName || 'غير معروف'}" ليس له معرف منتج صالح. يرجى حذفه وإعادة إضافته.`);
        return;
      }
    }
    const totalCost = orderItems.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
    
    const originalOrder = editingOrderId && editingOrderId !== 'new' ? orders.find(o => o.id === editingOrderId) : null;

    const finalExtraData = formData.extraData;

    const newOrder: Order = {
      id: originalOrder ? originalOrder.id : '',
      sourceId: originalOrder?.sourceId || '',
      customerId: formData.customerId || undefined,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      address: formData.city ? `${formData.address} - ${formData.city}` : formData.address,
      notes: formData.notes,
      items: orderItems,
      totalAmount: Math.max(0, finalTotal),
      totalCost,
      status: formData.status || OrderStatus.UNDER_REVIEW,
      createdAt: originalOrder ? originalOrder.createdAt : new Date().toISOString(),
      city: formData.city,
      shippingCost: formData.shippingCost,
      coupon: useCoupon ? formData.coupon : '',
      couponDiscount: calculatedDiscount,
      couponDiscountRaw: useCoupon ? formData.couponDiscount : 0,
      couponDiscountIsPercent: useCoupon ? isPercentDiscount : false,
      altPhone: formData.altPhone,
      extraData: finalExtraData,
      ref: formData.ref,
      utmSource: formData.utmSource,
      utmCampaign: formData.utmCampaign,
      shippingMethod: formData.shippingMethod,
      shippingCompany: formData.shippingMethod === ShippingMethod.EXTERNAL ? formData.shippingCompany : '',
      mapUrl: formData.mapUrl || originalOrder?.mapUrl,
      latitude: formData.latitude || originalOrder?.latitude,
      longitude: formData.longitude || originalOrder?.longitude,
      customerSource: formData.customerSource || undefined,
      // Preserve other fields
      externalOrderId: originalOrder?.externalOrderId,
      orderIdColumn: '', 
      paymentMethod: originalOrder?.paymentMethod,
      paymentStatus: originalOrder?.paymentStatus,
      funnelId: originalOrder?.funnelId,
      referralCode: originalOrder?.referralCode
    };

    if (editingOrderId && editingOrderId !== 'new') {
        onUpdateOrder(newOrder);
    } else {
        onAddOrder(newOrder);
    }
    markClean();
    resetForm();
  };

  const displayOrderId = (id: string) => id.replace(/^ORD-/, '');

  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.UNDER_REVIEW:
        return 'bg-slate-500 text-white';
      case OrderStatus.CONFIRMED:
        return 'bg-blue-500 text-white';
      case OrderStatus.WAITING_PAYMENT:
        return 'bg-amber-400 text-white';
      case OrderStatus.PAID:
        return 'bg-violet-500 text-white';
      case OrderStatus.PROCESSING_SHIPPING:
        return 'bg-sky-500 text-white';
      case OrderStatus.WAITING_SHIPPING:
        return 'bg-orange-400 text-white';
      case OrderStatus.ON_DELIVERY:
        return 'bg-indigo-500 text-white';
      case OrderStatus.DELIVERED:
        return 'bg-emerald-600 text-white';
      case OrderStatus.RETURNED_FROM_SHIPPING:
        return 'bg-red-500 text-white';
      case OrderStatus.RETURNED:
        return 'bg-red-700 text-white';
      case OrderStatus.CANCELED:
        return 'bg-rose-500 text-white';
      case OrderStatus.PAYMENT_FAILED:
        return 'bg-pink-500 text-white';
      case OrderStatus.CLIENT_RETURN_REQUEST:
        return 'bg-fuchsia-500 text-white';
      case OrderStatus.RETURN_IN_PROGRESS:
        return 'bg-cyan-600 text-white';
      case OrderStatus.INCOMPLETE:
        return 'bg-yellow-600 text-white';
      case OrderStatus.HIGH_RISK:
        return 'bg-rose-700 text-white';
      case OrderStatus.MODERATE_RISK:
        return 'bg-orange-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const getStatusTextColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.UNDER_REVIEW: return 'text-slate-500';
      case OrderStatus.CONFIRMED: return 'text-blue-500';
      case OrderStatus.WAITING_PAYMENT: return 'text-amber-400';
      case OrderStatus.PAID: return 'text-violet-500';
      case OrderStatus.PROCESSING_SHIPPING: return 'text-sky-500';
      case OrderStatus.WAITING_SHIPPING: return 'text-orange-400';
      case OrderStatus.ON_DELIVERY: return 'text-indigo-500';
      case OrderStatus.DELIVERED: return 'text-emerald-600 dark:text-emerald-400';
      case OrderStatus.RETURNED_FROM_SHIPPING: return 'text-red-500';
      case OrderStatus.RETURNED: return 'text-red-700 dark:text-red-400';
      case OrderStatus.CANCELED: return 'text-rose-500';
      case OrderStatus.PAYMENT_FAILED: return 'text-pink-500';
      case OrderStatus.CLIENT_RETURN_REQUEST: return 'text-fuchsia-500';
      case OrderStatus.RETURN_IN_PROGRESS: return 'text-cyan-600 dark:text-cyan-400';
      case OrderStatus.INCOMPLETE: return 'text-yellow-600 dark:text-yellow-400';
      case OrderStatus.HIGH_RISK: return 'text-rose-700 dark:text-rose-400';
      case OrderStatus.MODERATE_RISK: return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.UNDER_REVIEW: return <Loader2 size={14} className="animate-spin" />;
      case OrderStatus.CONFIRMED: return <CheckCircle size={14} />;
      case OrderStatus.WAITING_PAYMENT: return <Clock size={14} />;
      case OrderStatus.PAID: return <DollarSign size={14} />;
      case OrderStatus.PAYMENT_FAILED: return <AlertOctagon size={14} />;
      case OrderStatus.PROCESSING_SHIPPING: return <PackageCheck size={14} />;
      case OrderStatus.WAITING_SHIPPING: return <Clock size={14} />;
      case OrderStatus.ON_DELIVERY: return <Truck size={14} />;
      case OrderStatus.DELIVERED: return <CheckCircle size={14} />;
      case OrderStatus.CANCELED: return <XCircle size={14} />;
      case OrderStatus.RETURNED: 
      case OrderStatus.RETURNED_FROM_SHIPPING:
      case OrderStatus.CLIENT_RETURN_REQUEST:
      case OrderStatus.RETURN_IN_PROGRESS:
        return <CornerUpLeft size={14} />;
      case OrderStatus.INCOMPLETE:
        return <XCircle size={14} />;
      case OrderStatus.HIGH_RISK:
      case OrderStatus.MODERATE_RISK:
        return <AlertTriangle size={14} />;
      default: return <Clock size={14} />;
    }
  };

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
        const orders = Array.isArray(parsed) ? parsed : (parsed.orders || parsed.data || []);
        onImportOrdersFetch('file', orders);
      } catch { alert('الملف غير صالح'); }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
    setImportStep('none');
  };

  const handleImportUrlSubmit = () => {
    if (!importUrl.trim()) return alert('يرجى إدخال رابط صالح');
    onImportOrdersFetch('url', importUrl.trim());
    setImportStep('none');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <motion.div 
              whileHover={{ rotate: [0, -20, 20, 0] }} 
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: 'var(--md-sys-color-primary-container)',
                color: 'var(--md-sys-color-on-primary-container)',
              }}
            >
              <ShoppingBag size={22} />
            </motion.div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">الطلبات</h1>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{orders.length} طلب</p>
            </div>
          </motion.div>
        </div>
        
        <div className="flex flex-wrap gap-2 justify-end">
            <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={selectAll}
                className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 font-black text-[11px] border transition-all duration-200 active:scale-95 ${selectedIds.size === orders.length && orders.length > 0 ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-slate-800'}`}
                title="تحديد الكل"
            >
                {selectedIds.size === orders.length && orders.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                <span className="hidden sm:inline">تحديد الكل</span>
            </motion.button>

            {selectedIds.size > 0 && (
            <motion.button 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => isShippingFilter ? (setWaybillOrders(orders.filter(o => selectedIds.has(o.id))), setWaybillModalOpen(true)) : setIsInvoicePrintOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-white rounded-2xl font-black text-[11px] shadow-lg hover:shadow-md transition-all duration-200 active:scale-95"
              style={{
                backgroundColor: 'var(--md-sys-color-tertiary)',
                color: 'var(--md-sys-color-on-tertiary)',
              }}
            >
              <Printer size={16} />
              <span className="hidden sm:inline">{isShippingFilter ? 'طباعة بوليصة' : 'طباعة فاتورة'}</span>
            </motion.button>
            )}

            {canManageOrders && (
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setImportStep('source')} 
                disabled={isLoading} 
                className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-gray-500 dark:text-gray-400 px-4 py-2.5 rounded-2xl flex items-center gap-2 font-black text-[11px] shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''}/> <span className="hidden sm:inline">استيراد طلبات</span>
              </motion.button>
            )}
            {canManageOrders && (
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { resetForm(); setIsAdding(true); setEditingOrderId('new'); }}
                className="text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 font-black text-[11px] shadow-lg transition-all duration-200 active:scale-95"
                style={{
                  backgroundColor: 'var(--md-sys-color-primary)',
                  color: 'var(--md-sys-color-on-primary)',
                }}
              >
                <Plus size={18} />
                <span>طلب جديد</span>
              </motion.button>
            )}
        </div>
      </div>

      {isShippingFilter ? (
        <CollapsibleSection title="إحصائيات الشحن" icon={<Truck size={18} />} mobileOnly defaultOpen={false}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <MD3StatCard
              icon={<Truck size={20} />}
              label="إجمالي الشحنات"
              value={dispatchStats.count.toString()}
              unit="طلب"
              iconBg="bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"
              tooltip="إجمالي عدد الطلبات التي دخلت مرحلة التجهيز أو الشحن."
            />
            <MD3StatCard
              icon={<PackageCheck size={20} />}
              label="قيمة التحصيل"
              value={formatCurrency(dispatchStats.totalCollected)}
              subtitle={`شحن: محلي (${formatCurrency(dispatchStats.localShipping)}) | خارجي (${formatCurrency(dispatchStats.externalShipping)})`}
              iconBg="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
              tooltip="إجمالي الأموال التي يجب تحصيلها من العملاء."
            />
            <MD3StatCard
              icon={<MapPin size={20} />}
              label="تغطية المحافظات"
              value={dispatchStats.distinctCities.toString()}
              unit="مدينة"
              iconBg="bg-orange-100 dark:bg-orange-900/30 text-orange-600"
              tooltip="عدد المدن المختلفة التي يتم الشحن إليها."
            />
            <MD3StatCard
              icon={<Clock size={20} />}
              label="متوسط الشحنة"
              value={formatCurrency(dispatchStats.avgValue)}
              iconBg="bg-blue-100 dark:bg-blue-900/30 text-blue-600"
              tooltip="متوسط قيمة المبلغ المطلوب لكل شحنة."
            />
            <MD3StatCard
              icon={<Package size={20} />}
              label="قطع قيد الشحن"
              value={dispatchStats.totalItems.toString()}
              unit="قطعة"
              iconBg="bg-purple-100 dark:bg-purple-900/30 text-purple-600"
              tooltip="إجمالي عدد المنتجات داخل الشحنات الحالية."
            />
          </div>
        </CollapsibleSection>
      ) : (
        <CollapsibleSection title="إحصائيات الطلبات" icon={<ShoppingBag size={18} />} mobileOnly defaultOpen={false}>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <MD3StatCard 
              icon={<ShoppingBag size={20} />} 
              label="إجمالي الطلبات" 
              value={orderStats.total.toString()} 
              unit="طلب" 
              subtitle={`شحن داخلي: ${orderStats.localOrderCount} | شحن خارجي: ${orderStats.externalOrderCount}`}
              iconBg="bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"
              tooltip="العدد الكلي للطلبات المسجلة في النظام لأي حالة. يساعدك في تتبع حجم العمل الإجمالي."
            />

            <MD3StatCard 
              icon={<TrendingUp size={20} />} 
              label="إجمالي المبيعات" 
              value={formatCurrency(orderStats.revenue)} 
              subtitle={`شحن: محلي (${formatCurrency(orderStats.localShipping)}) | خارجي (${formatCurrency(orderStats.externalShipping)}) | الإجمالي: ${formatCurrency(orderStats.shipping)}`}
              iconBg="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600" 
              tooltip="هذا الرقم يمثل القيمة الكلية لكل المبيعات المسجلة. يتم حسابه عن طريق جمع (سعر المنتجات في كل طلب + تكلفة الشحن المحددة). هو المؤشر الأساسي لحجم التدفق المالي الداخل (Gross Revenue) قبل خصم أي تكاليف."
            />

            <MD3StatCard 
              icon={<Calculator size={20} />} 
              label="الأرباح التقديرية" 
              value={formatCurrency(orderStats.profit)} 
              iconBg="bg-blue-100 dark:bg-blue-900/30 text-blue-600" 
              tooltip="يمثل صافي الربح المتوقع من هذه الطلبات. يتم احتسابه بدقة من خلال المعادلة: (إجمالي مدفوعات العملاء - (تكلفة المنتجات الأصلية + مصاريف الشحن)). هذا المؤشر يساعدك في معرفة الجدوى الاقتصادية الحقيقية لعملياتك بعد استبعاد التكاليف المباشرة."
            />

            <MD3StatCard 
              icon={<CheckCircle size={20} />} 
              label="طلبات مكتملة" 
              value={orderStats.completed.toString()} 
              unit="طلب" 
              iconBg="bg-purple-100 dark:bg-purple-900/30 text-purple-600" 
              tooltip="هي الطلبات التي تمت دورتها بنجاح ووصلت لحالة 'تم التوصيل'. هذا الرقم يعكس نجاح المبيعات المحققة فعلياً والتي تم تحصيل ثمنها، وهو المعيار الحقيقي لنجاح العمل."
            />

            <MD3StatCard 
              icon={<Clock size={20} />} 
              label="طلبات انتظار" 
              value={orderStats.pending.toString()} 
              unit="طلب" 
              iconBg="bg-orange-100 dark:bg-orange-900/30 text-orange-600" 
              tooltip="تشمل جميع الطلبات التي تم إنشاؤها ولكنها لم تصل بعد لحالة 'تم التوصيل' أو 'ملغى'. هي مؤشر على حجم العمل المتراكم حالياً والذي يتطلب جهداً في المتابعة أو التجهيز أو الشحن."
            />
          </div>
        </CollapsibleSection>
      )}

      <input type="file" accept=".json" className="hidden" ref={importJsonInputRef} onChange={handleImportFileChange} />

      <MD3Dialog
        isOpen={importStep !== 'none'}
        onClose={() => setImportStep(importStep === 'url_input' ? 'source' : 'none')}
        title={importStep === 'source' ? 'استيراد طلبات من المتجر' : 'رابط الطلبات'}
        description={importStep === 'source' ? 'اختر مصدر البيانات:' : 'أدخل رابط JSON للطلبات:'}
        icon={importStep === 'url_input' ? <Globe size={24} /> : <RefreshCw size={24} />}
        maxWidth="md"
        actions={[
          { label: importStep === 'url_input' ? 'رجوع' : 'إلغاء', onClick: () => setImportStep(importStep === 'url_input' ? 'source' : 'none'), variant: 'text' as const }
        ]}
      >
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
                      className="w-full flex items-center gap-4 p-5 bg-indigo-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 rounded-3xl text-right hover:bg-indigo-100 dark:hover:bg-slate-700 transition-colors duration-200 group"
                    >
                      <div className="w-12 h-12 bg-[var(--md-sys-color-surface)] rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform"><Globe size={24} /></div>
                      <div><h4 className="font-black text-[var(--md-sys-color-on-surface)] text-sm">رابط API</h4><p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] font-bold">جلب الطلبات عبر رابط</p></div>
                    </motion.button>
                    <motion.button 
                      variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } }}
                      whileHover={{ scale: 1.02, x: -5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleImportSourceChoice('json')} 
                      className="w-full flex items-center gap-4 p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-3xl text-right hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors duration-200 group"
                    >
                      <div className="w-12 h-12 bg-[var(--md-sys-color-surface)] rounded-2xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform"><FileJson size={24} /></div>
                      <div><h4 className="font-black text-[var(--md-sys-color-on-surface)] text-sm">ملف JSON</h4><p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] font-bold">رفع ملف من جهازك</p></div>
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
                       <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] px-2 uppercase">رابط API</label>
                       <input 
                        type="url" 
                        className="w-full p-4 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-2xl outline-none focus:border-[var(--md-sys-color-primary)] focus:bg-[var(--md-sys-color-surface)] transition-all duration-200 font-bold text-[var(--md-sys-color-on-surface)] text-xs" 
                        placeholder="https://example.com/orders.json"
                        value={importUrl}
                        onChange={e => setImportUrl(e.target.value)}
                       />
                     </div>
                     <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleImportUrlSubmit}
                      className="w-full py-5 rounded-2xl font-black shadow-xl hover:opacity-90 transition-all duration-200 text-lg active:scale-95"
                      style={{ backgroundColor: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)' }}
                     >
                       جلب البيانات
                     </motion.button>
                  </motion.div>
                )}
              </div>
      </MD3Dialog>

      {importOrdersPreview && <SyncReviewModal orders={importOrdersPreview} onSaveItem={onAddOrder} onSaveAll={onImportOrdersConfirm} onClose={onImportOrdersClose} onViewCustomer={handleViewCustomerFromOrder} />}

      {!isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-[28px] border border-gray-100 dark:border-slate-800 shadow-sm"
        >
          <div className="relative flex-1 w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <input 
              type="text"
              placeholder="بحث ذكي (اسم، هاتف، رقم أوردر، منتج...)"
              className="w-full pr-12 pl-4 py-3 bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-accent rounded-2xl outline-none font-bold text-sm transition-colors duration-200"
              value={orderSearch}
              onChange={e => setOrderSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">ترتيب:</span>
            <div className="relative">
              <select 
                className="px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-accent rounded-2xl outline-none font-black text-xs cursor-pointer appearance-none min-w-[120px] transition-colors duration-200"
                value={sortField}
                onChange={e => setSortField(e.target.value)}
              >
                <option value="created_at">التاريخ</option>
                <option value="totalAmount">القيمة</option>
                <option value="shippingCost">الشحن</option>
                <option value="city">المدينة</option>
              </select>
              <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
            </div>
            <button onClick={() => setSortAsc(p => !p)} className={`px-3 py-3 rounded-2xl flex items-center gap-1.5 font-black text-xs transition-colors duration-200 ${sortAsc ? 'bg-accent text-white' : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-transparent'}`} title={sortAsc ? 'تصاعدي' : 'تنازلي'}>
              <ArrowUpDown size={14} /> {sortAsc ? '▲' : '▼'}
            </button>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Calendar className="text-gray-400 dark:text-gray-500 hidden sm:block" size={16} />
            <select 
              className="px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-accent rounded-2xl outline-none font-black text-xs cursor-pointer appearance-none min-w-[120px] transition-colors duration-200"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value as any)}
            >
              <option value="all">كل الأوقات</option>
              <option value="today">اليوم</option>
              <option value="yesterday">الأمس</option>
              <option value="thisMonth">هذا الشهر</option>
              <option value="lastMonth">الشهر الماضي</option>
              <option value="month">شهر محدد</option>
              <option value="last30">آخر 30 يوم</option>
              <option value="custom">فترة مخصصة</option>
            </select>
          </div>

          {dateFilter === 'month' && (
            <div className="flex items-center gap-2 animate-in slide-in-from-right-2 fade-in">
              <input 
                type="month"
                className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none font-bold text-[10px]"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              />
            </div>
          )}

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 animate-in slide-in-from-right-2 fade-in">
              <input 
                type="date"
                className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none font-bold text-[10px]"
                value={customDateRange.start}
                onChange={e => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
              <span className="text-gray-400 dark:text-gray-500 text-[10px]">إلى</span>
              <input 
                type="date"
                className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none font-bold text-[10px]"
                value={customDateRange.end}
                onChange={e => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          )}
          
          <div className="relative flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setFilterDropdownOpen(prev => !prev)}
              onBlur={() => setTimeout(() => setFilterDropdownOpen(false), 200)}
              className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-transparent rounded-2xl font-black text-xs cursor-pointer min-w-[150px] transition-colors duration-200"
            >
              {statusFilter === 'الكل' && <span>جميع الحالات</span>}
              {statusFilter === 'all_shipping' && <span>الشحن</span>}
              {statusFilter !== 'الكل' && statusFilter !== 'all_shipping' && (
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${getStatusStyle(statusFilter as OrderStatus)}`}>
                  {getStatusIcon(statusFilter as OrderStatus)}
                  {statusFilter}
                </span>
              )}
              <ChevronDown size={14} className="mr-auto text-gray-400" />
            </button>
            <PopupSheet
              isOpen={filterDropdownOpen}
              onClose={() => setFilterDropdownOpen(false)}
              className="absolute top-full right-0 mt-1 w-56 z-50"
              title="فلترة الحالة"
            >
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-100 dark:border-slate-700 p-1.5 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => { setStatusFilter('الكل'); setFilterDropdownOpen(false); }}
                    className="w-full text-right px-3 py-2 rounded-xl text-[10px] font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-between"
                  >
                    <span>جميع الحالات</span>
                    {statusFilter === 'الكل' && <Check size={10} className="text-blue-500" />}
                  </button>
                  <button
                    onClick={() => { setStatusFilter('all_shipping'); setFilterDropdownOpen(false); }}
                    className="w-full text-right px-3 py-2 rounded-xl text-[10px] font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                      الشحن
                    </span>
                    {statusFilter === 'all_shipping' && <Check size={10} className="text-blue-500" />}
                  </button>
                  <div className="h-px bg-gray-100 dark:bg-slate-700 my-1"></div>
                  {Object.values(OrderStatus).map(status => (
                    <button
                      key={status}
                      onClick={() => { setStatusFilter(status as any); setFilterDropdownOpen(false); }}
                      className="w-full text-right px-3 py-2 rounded-xl text-[10px] font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(status).split(' ')[0]}`}></div>
                        {status}
                      </span>
                      {statusFilter === status && <Check size={10} className="text-blue-500" />}
                    </button>
                  ))}
                </div>
            </PopupSheet>
          </div>

          {(orderSearch || statusFilter !== 'الكل' || dateFilter !== 'all') && (
            <button 
              onClick={() => { 
                setOrderSearch(''); 
                setStatusFilter('الكل'); 
                setDateFilter('all');
                setCustomDateRange({ start: '', end: '' });
              }}
              className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors duration-200"
              title="تصفير الفلاتر"
            >
              <X size={20} />
            </button>
          )}

          <div className="mr-auto">
            <ViewSwitcher current={viewMode} onChange={setViewMode} />
          </div>
        </motion.div>
      )}

      <MD3Dialog
        isOpen={isAdding}
        onClose={() => withUnsavedCheck(resetForm)}
        title={editingOrderId && editingOrderId !== 'new' ? 'تعديل بيانات الطلب' : 'إنشاء طلب جديد'}
        description="أدخل بيانات الطلب كاملة"
        icon={editingOrderId && editingOrderId !== 'new' ? <Edit2 size={20} /> : <Plus size={20} />}
        maxWidth="xl"
      >

          {editingOrderId && editingOrderId !== 'new' && (() => {
            const editingOrder = orders.find(o => o.id === editingOrderId);
            if (!editingOrder) return null;
            return (
              <div className="flex items-center gap-4 mb-6 px-1">
                <div className="text-[10px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
                  <span>تاريخ الإضافة: {formatDate(editingOrder.createdAt, 'full')}</span>
                  {editingOrder.updatedAt && <span className="mr-3">آخر تعديل: {formatDate(editingOrder.updatedAt, 'full')}</span>}
                </div>
              </div>
            );
          })()}

          <form onSubmit={handleSaveOrder} noValidate className="space-y-8">
            {/* Form Fields... */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-[var(--md-sys-color-on-surface-variant)] pr-1">اسم العميل <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]" />
                  <input required className={`w-full pr-9 pl-4 py-2.5 bg-[var(--md-sys-color-surface-container)] border rounded-xl outline-none text-[var(--md-sys-color-on-surface)] focus:bg-[var(--md-sys-color-surface)] transition-colors duration-200 text-sm font-bold ${formErrors.customerName ? 'border-red-400 dark:border-red-500' : 'border-[var(--md-sys-color-outline-variant)]/20'}`} placeholder="الاسم الثلاثي" value={formData.customerName} onChange={e => { setFormData({...formData, customerName: e.target.value}); if (formErrors.customerName) setFormErrors(prev => ({ ...prev, customerName: '' })); }} />
                </div>
                {formErrors.customerName && (
                  <p className="text-[11px] font-bold text-red-500 pr-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.customerName}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-[var(--md-sys-color-on-surface-variant)] pr-1">رقم الهاتف <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]" />
                  <input required type="tel" className={`w-full pr-9 pl-4 py-2.5 bg-[var(--md-sys-color-surface-container)] border rounded-xl outline-none text-[var(--md-sys-color-on-surface)] font-mono text-sm font-bold ${formErrors.customerPhone ? 'border-red-400 dark:border-red-500' : 'border-[var(--md-sys-color-outline-variant)]/20'}`} placeholder="01xxxxxxxxx" value={formData.customerPhone} onChange={e => { setFormData({...formData, customerPhone: e.target.value}); if (formErrors.customerPhone) setFormErrors(prev => ({ ...prev, customerPhone: '' })); }} />
                </div>
                {formErrors.customerPhone && (
                  <p className="text-[11px] font-bold text-red-500 pr-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.customerPhone}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-[var(--md-sys-color-on-surface-variant)] pr-1">هاتف بديل</label>
                <div className="relative">
                  <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]" />
                  <input type="tel" className="w-full pr-9 pl-4 py-2.5 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-xl outline-none text-[var(--md-sys-color-on-surface)] font-mono text-sm font-bold" placeholder="01xxxxxxxxx" value={formData.altPhone} onChange={e => setFormData({...formData, altPhone: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 dark:text-gray-400 pr-1">المحافظة</label>
                <SearchableSelect options={governorateOptions} value={formData.city} onChange={handleCityChange} placeholder="اختر المحافظة..." icon={<MapPin size={16} />} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-black text-[var(--md-sys-color-on-surface-variant)] pr-1">العنوان التفصيلي <span className="text-red-500">*</span></label>
                <input required className={`w-full px-4 py-2.5 bg-[var(--md-sys-color-surface-container)] border rounded-xl outline-none text-[var(--md-sys-color-on-surface)] focus:bg-[var(--md-sys-color-surface)] transition-colors duration-200 text-sm font-bold ${formErrors.address ? 'border-red-400 dark:border-red-500' : 'border-[var(--md-sys-color-outline-variant)]/20'}`} placeholder="رقم العمارة - اسم الشارع - علامة مميزة" value={formData.address} onChange={e => { setFormData({...formData, address: e.target.value}); if (formErrors.address) setFormErrors(prev => ({ ...prev, address: '' })); }} />
                {formErrors.address && (
                  <p className="text-[11px] font-bold text-red-500 pr-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.address}</p>
                )}
              </div>
              
               {/* Google Maps URL + Map Preview */}
               <div className="md:col-span-2 space-y-3">
                  <label className="text-xs font-black text-[var(--md-sys-color-on-surface-variant)] pr-1 flex items-center gap-1.5">
                    <Navigation size={14} /> رابط خريطة جوجل
                  </label>
                  <div className="relative">
                    <MapPin size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]" />
                    <input
                      value={formData.mapUrl}
                      onChange={e => handleMapUrlChange(e.target.value)}
                      className="w-full pr-9 pl-4 py-2.5 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-xl outline-none text-[var(--md-sys-color-on-surface)] focus:bg-[var(--md-sys-color-surface)] transition-colors duration-200 text-sm font-bold font-mono"
                     placeholder="https://maps.google.com/?q=30.0444,31.2357"
                   />
                 </div>
                  <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] pr-1 font-bold">
                    الصق رابط جوجل ماب وسيتم تحديد الموقع تلقائياً، أو اكتب العنوان لمعاينة الخريطة
                  </p>
                  {(() => {
                    const hasCoords = formData.latitude && formData.longitude;
                    const addrText = (formData.address || '').trim();
                    if (hasCoords) {
                      return (
                        <div className="rounded-2xl overflow-hidden border-2 border-fuchsia-200 dark:border-fuchsia-800">
                          <iframe
                            title="موقع الطلب"
                            width="100%"
                            height="200"
                            frameBorder="0"
                            src={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}&z=15&output=embed`}
                            className="bg-gray-100 dark:bg-slate-800"
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        </div>
                      );
                    }
                    if (addrText) {
                      return (
                        <div className="rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-slate-700">
                          <iframe
                            title="موقع الطلب"
                            width="100%"
                            height="200"
                            frameBorder="0"
                            src={`https://www.google.com/maps?q=${encodeURIComponent(addrText)}&z=15&output=embed`}
                            className="bg-gray-100 dark:bg-slate-800 opacity-70"
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
               {editingOrderId && editingOrderId !== 'new' && (
                 <div className="md:col-span-2 p-5 bg-[var(--md-sys-color-surface-container)] rounded-[24px] border border-[var(--md-sys-color-outline-variant)]/20">
                      <h4 className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] mb-3 flex items-center gap-1.5">
                        تغيير حالة الطلب
                     </h4>
                     <div className="flex flex-wrap gap-2">
                        {Object.values(OrderStatus).map(status => (
                           <button
                              key={status}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, status }))}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-colors duration-200 border ${
                                 formData.status === status
                                    ? getStatusStyle(status)
                                     : 'bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface-variant)] border-[var(--md-sys-color-outline-variant)]/20'
                              }`}
                           >
                              {status}
                           </button>
                                   ))}
                                </div>
                  </div>
                )}
                <div className="md:col-span-2 p-5 bg-[var(--md-sys-color-surface-container)] rounded-[24px] border border-[var(--md-sys-color-outline-variant)]/20 relative space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1 flex-1 min-w-[200px]">
                        <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] block mb-2">نوع التوصيل</label>
                        <div className="flex gap-2">
                           <button 
                               type="button"
                               onClick={() => setFormData({...formData, shippingMethod: ShippingMethod.LOCAL})}
                                className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black transition-colors duration-200 border ${formData.shippingMethod === ShippingMethod.LOCAL ? 'text-white border-transparent' : 'bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface-variant)] border-[var(--md-sys-color-outline-variant)]/20'}`}
                               style={formData.shippingMethod === ShippingMethod.LOCAL ? { backgroundColor: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)' } : {}}
                           >
                               توصيل محلي
                           </button>
                           <button 
                               type="button"
                               onClick={() => setFormData({...formData, shippingMethod: ShippingMethod.EXTERNAL})}
                                className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black transition-colors duration-200 border ${formData.shippingMethod === ShippingMethod.EXTERNAL ? 'text-white border-transparent' : 'bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface-variant)] border-[var(--md-sys-color-outline-variant)]/20'}`}
                               style={formData.shippingMethod === ShippingMethod.EXTERNAL ? { backgroundColor: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)' } : {}}
                           >
                               شحن خارجي
                           </button>
                        </div>
                      </div>
                      
                      {formData.shippingMethod === ShippingMethod.EXTERNAL && (
                        <div className="space-y-1 flex-1 min-w-[200px] animate-in slide-in-from-right-2 fade-in">
                          <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] block mb-2">اسم شركة الشحن</label>
                          <div className="relative group">
                            <Truck size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)] z-10" />
                            <input 
                              list="shipping-companies"
                              className="w-full pr-9 pl-4 py-2.5 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-xl outline-none text-xs font-bold focus:border-blue-500 transition-colors duration-200"
                              placeholder="ادخل اسم الشركة..."
                              value={formData.shippingCompany}
                              onChange={e => setFormData({...formData, shippingCompany: e.target.value})}
                            />
                            <datalist id="shipping-companies">
                              {savedCompanies.map((c, i) => (
                                <option key={i} value={c} />
                              ))}
                            </datalist>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1 flex-1 min-w-[120px]">
                        <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] block mb-2">سعر الشحن</label>
                        <input type="number" className={`w-full py-2.5 px-3 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-xl text-center font-black text-sm ${isFreeShipping ? 'text-[var(--md-sys-color-on-surface-variant)] line-through' : 'text-[var(--md-sys-color-on-surface)]'}`} value={formData.shippingCost} disabled={isFreeShipping} onChange={e => setFormData({...formData, shippingCost: Number(e.target.value)})} />
                      </div>
                      <div className="flex items-center gap-2 bg-[var(--md-sys-color-surface)] px-3 py-2 rounded-xl border border-[var(--md-sys-color-outline-variant)]/20 shadow-sm self-end">
                          <input type="checkbox" id="free-shipping" checked={isFreeShipping} onChange={(e) => toggleFreeShipping(e.target.checked)} className="w-5 h-5 accent-fuchsia-500 cursor-pointer rounded-md" />
                          <label htmlFor="free-shipping" className="text-[10px] font-black cursor-pointer text-fuchsia-600 dark:text-fuchsia-400 select-none">شحن مجاني</label>
                      </div>
                  </div>
                    <div className="border-t border-[var(--md-sys-color-outline-variant)]/20 pt-4">
                       <div className="flex items-center gap-2 mb-4">
                           <input type="checkbox" id="use-coupon" checked={useCoupon} onChange={(e) => setUseCoupon(e.target.checked)} className="w-5 h-5 accent-emerald-500 cursor-pointer rounded-md" />
                           <label htmlFor="use-coupon" className="text-[10px] font-black cursor-pointer text-emerald-600 dark:text-emerald-400 select-none flex items-center gap-1"><Tag size={13}/> تفعيل كوبون خصم</label>
                       </div>
{useCoupon && (
                       <>
                           <div className="flex bg-gray-100 dark:bg-slate-800 rounded-xl p-0.5 mb-4">
                       <button type="button"
                                  onClick={() => { setCouponMode('saved'); setFormData(prev => ({ ...prev, coupon: '' })); }}
                                  className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all duration-200 ${couponMode === 'saved' ? 'bg-[var(--md-sys-color-surface)] shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] dark:hover:text-gray-300'}`}
                                >الكوبونات المحفوظة</button>
                                <button type="button"
                                  onClick={() => { setCouponMode('custom'); setFormData(prev => ({ ...prev, coupon: 'خصم مخصص' })); }}
                                  className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all duration-200 ${couponMode === 'custom' ? 'bg-[var(--md-sys-color-surface)] shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] dark:hover:text-gray-300'}`}
                               >خصم مخصص</button>
                           </div>
                           {couponMode === 'saved' ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-1 relative" ref={couponContainerRef}>
                                   <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)]">كود الكوبون</label>
                                   <input
                                       type="text"
                                       placeholder="CODE"
                                       className="w-full py-2.5 px-3 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-xl text-center font-bold uppercase text-xs outline-none focus:border-fuchsia-500"
                                       value={formData.coupon}
                                       onChange={e => {
                                           const val = e.target.value.toUpperCase();
                                           const info = allCoupons[val];
                                           setFormData(prev => ({
                                               ...prev,
                                               coupon: val,
                                               couponDiscount: info ? info.discount : prev.couponDiscount
                                           }));
                                           if (info) {
                                             setIsPercentDiscount(info.is_percent);
                                           }
                                       }}
                                       onFocus={() => {
                                         const val = formData.coupon.toUpperCase();
                                         const info = allCoupons[val];
                                         if (val && info) {
                                           setFormData(prev => ({ ...prev, couponDiscount: info.discount }));
                                           setIsPercentDiscount(info.is_percent);
                                         }
                                         setShowCouponDropdown(true);
                                       }}
                                   />
                                   {showCouponDropdown && filteredCoupons.length > 0 && (
                                     <PopupSheet
                                       isOpen={showCouponDropdown && filteredCoupons.length > 0}
                                       onClose={() => setShowCouponDropdown(false)}
                                       className="absolute top-full left-0 right-0 mt-1 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/20 rounded-xl shadow-md z-30 max-h-36 overflow-y-auto"
                                       title="الكوبونات"
                                     >
                                        {filteredCoupons.map(code => {
                                          const info = allCoupons[code];
                                          return (
                                          <div key={code} className="px-3 py-2 hover:bg-[var(--md-sys-color-surface-container)]">
                                            <button
                                              type="button"
                                              className="text-xs font-bold text-[var(--md-sys-color-on-surface)] w-full text-right"
                                              onClick={() => {
                                                setFormData(prev => ({
                                                  ...prev,
                                                  coupon: code,
                                                  couponDiscount: info.discount
                                                }));
                                                setIsPercentDiscount(info.is_percent);
                                                setShowCouponDropdown(false);
                                              }}
                                            >
                                               {code} <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">({info.discount} {info.is_percent ? '%' : 'ج.م'})</span>
                                            </button>
                                          </div>
                                          );
                                        })}
                                     </PopupSheet>
                                   )}
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] flex justify-between items-center">قيمة الخصم<span className="text-[8px] bg-[var(--md-sys-color-surface-container)] px-2 py-0.5 rounded text-[var(--md-sys-color-on-surface)] font-bold">{isPercentDiscount ? 'نسبة %' : 'مبلغ ثابت'}</span></label>
                                  <div className="relative">
                                      <input type="number" className="w-full py-2.5 pl-10 pr-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-center font-black text-sm text-red-500 dark:text-red-400 outline-none cursor-not-allowed opacity-70" value={formData.couponDiscount} readOnly />
                                       <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)] font-bold text-[10px] pointer-events-none">{isPercentDiscount ? <Percent size={13}/> : 'ج.م'}</div>
                                   </div>
                                </div>
                           </div>
                           ) : (
                           <div className="animate-in fade-in slide-in-from-top-2">
                               <div className="flex gap-3 items-end">
                                 <div className="flex-1 space-y-1">
                                   <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)]">نوع الخصم</label>
                                   <div className="flex bg-[var(--md-sys-color-surface-container)] rounded-xl p-0.5">
                                     <button type="button"
                                       onClick={() => setIsPercentDiscount(true)}
                                       className={`flex-1 py-2 text-xs font-black rounded-lg transition-all duration-200 ${isPercentDiscount ? 'bg-[var(--md-sys-color-surface)] shadow-sm text-red-500 dark:text-red-400' : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] dark:hover:text-gray-300'}`}
                                     >نسبة %</button>
                                     <button type="button"
                                       onClick={() => setIsPercentDiscount(false)}
                                       className={`flex-1 py-2 text-xs font-black rounded-lg transition-all duration-200 ${!isPercentDiscount ? 'bg-[var(--md-sys-color-surface)] shadow-sm text-red-500 dark:text-red-400' : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] dark:hover:text-gray-300'}`}
                                     >مبلغ ثابت</button>
                                   </div>
                                 </div>
                                 <div className="flex-1 space-y-1">
                                   <label className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)]">قيمة الخصم</label>
                                   <div className="relative">
                                     <input type="number"
                                       className="w-full py-2.5 pl-10 pr-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-center font-black text-sm text-red-500 dark:text-red-400 outline-none"
                                       value={formData.couponDiscount}
                                       onChange={e => setFormData(prev => ({ ...prev, couponDiscount: Number(e.target.value) }))}
                                     />
                                     <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-bold text-[10px] pointer-events-none">{isPercentDiscount ? <Percent size={13}/> : 'ج.م'}</div>
                                   </div>
                                 </div>
                               </div>
                           </div>
                           )}
                       </>
                       )}
                  </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                 <button type="button" onClick={() => document.getElementById('advanced-fields')?.classList.toggle('hidden')} className="text-[11px] font-black text-violet-600 dark:text-violet-400 flex items-center gap-1 hover:underline"><Plus size={13}/> حقول إضافية (UTM, Ref, Notes)</button>
                  <div id="advanced-fields" className={`${editingOrderId && editingOrderId !== 'new' ? '' : 'hidden'} grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 pt-3 border-t border-[var(--md-sys-color-outline-variant)]/20`}>
                     <input className="py-2.5 px-3 bg-[var(--md-sys-color-surface-container)] rounded-xl text-xs font-bold dark:text-gray-200 border border-[var(--md-sys-color-outline-variant)]/20 outline-none focus:bg-[var(--md-sys-color-surface)] transition-colors duration-200" placeholder="ملاحظات (Notes)" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                     <input className="py-2.5 px-3 bg-[var(--md-sys-color-surface-container)] rounded-xl text-xs font-bold dark:text-gray-200 border border-[var(--md-sys-color-outline-variant)]/20 outline-none focus:bg-[var(--md-sys-color-surface)] transition-colors duration-200" placeholder="بيانات إضافية (Extra Data)" value={formData.extraData} onChange={e => setFormData({...formData, extraData: e.target.value})} />
                      <input className="py-2.5 px-3 bg-[var(--md-sys-color-surface-container)] rounded-xl text-xs font-bold dark:text-gray-200 border border-[var(--md-sys-color-outline-variant)]/20 outline-none focus:bg-[var(--md-sys-color-surface)] transition-colors duration-200" placeholder="مصدر الحملة (UTM Source)" value={formData.utmSource} onChange={e => setFormData({...formData, utmSource: e.target.value})} />
                     <input className="py-2.5 px-3 bg-[var(--md-sys-color-surface-container)] rounded-xl text-xs font-bold dark:text-gray-200 border border-[var(--md-sys-color-outline-variant)]/20 outline-none focus:bg-[var(--md-sys-color-surface)] transition-colors duration-200" placeholder="مصدر العميل (Customer Source)" value={formData.customerSource} onChange={e => setFormData({...formData, customerSource: e.target.value})} />
                     <input className="py-2.5 px-3 bg-[var(--md-sys-color-surface-container)] rounded-xl text-xs font-bold dark:text-gray-200 border border-[var(--md-sys-color-outline-variant)]/20 outline-none focus:bg-[var(--md-sys-color-surface)] transition-colors duration-200" placeholder="Ref" value={formData.ref} onChange={e => setFormData({...formData, ref: e.target.value})} />
                  </div>
              </div>
            </div>
            <hr className="border-[var(--md-sys-color-outline-variant)]/20" />
            <div className="space-y-4">
              <h4 className="font-black text-[var(--md-sys-color-on-surface)] text-sm flex items-center gap-2">
                <Package size={16} className="text-cyan-500" /> منتجات الطلب
              </h4>
              <div className="flex flex-wrap gap-2.5 items-end">
                {editingItemIndex >= 0 ? (
                  <div className="w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2 min-w-0 flex-1"><Edit2 size={14} /> جاري تعديل: <span className="text-indigo-900 dark:text-indigo-200 truncate">{orderItems[editingItemIndex]?.productName}</span></span>
                    <button type="button" onClick={cancelInlineEdit} className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0">إلغاء</button>
                  </div>
                  ) : (
                  <>
                    <div className="flex-[2] min-w-[200px]"><SearchableSelect options={productOptions} value={selectedProduct} onChange={(val) => {setSelectedProduct(val); setSelectedSize(''); setSelectedColor(''); setSelectedVariant('');}} onClear={() => { setSelectedProduct(''); setSelectedSize(''); setSelectedColor(''); setSelectedVariant(''); }} placeholder="اختر المنتج..." onImageClick={setPreviewImage} /></div>
                    {(() => {
                      const prod = products.find(p => p.id === selectedProduct);
                      if (!prod) return null;
                      const sizes = [...new Set(prod.variants.map(v => v.size))].filter(s => s !== 'واحد');
                      const colors = [...new Set(prod.variants.map(v => v.color))].filter(c => c !== 'متعدد');
                      if (sizes.length === 0 && colors.length === 0) return null;
                      const sizeOptions = sizes.map(s => { const qty = prod.variants.filter(v => v.size === s).reduce((sum, v) => sum + v.quantity, 0); return { value: s, label: s, subLabel: `${prod.price} ج.م | ${qty} قطعة`, disabled: qty === 0 }; });
                      const colorOptions = colors.map(c => { const qty = prod.variants.filter(v => v.color === c).reduce((sum, v) => sum + v.quantity, 0); return { value: c, label: c, subLabel: `${prod.price} ج.م | ${qty} قطعة`, disabled: qty === 0 }; });
                      return (
                        <>
                          {sizes.length > 0 && (
                            <div className="flex-1 min-w-[140px]"><SearchableSelect options={sizeOptions} value={selectedSize} onChange={setSelectedSize} onClear={() => setSelectedSize('')} placeholder="اختر المقاس" /></div>
                          )}
                          {colors.length > 0 && (
                            <div className="flex-1 min-w-[140px]"><SearchableSelect options={colorOptions} value={selectedColor} onChange={setSelectedColor} onClear={() => setSelectedColor('')} placeholder="اختر اللون" /></div>
                          )}
                        </>
                      );
                    })()}
                    <div className="flex-none flex gap-2.5 items-end">
                      <input type="number" min="1" className="w-20 py-2.5 px-3 bg-[var(--md-sys-color-surface-container)] rounded-xl border border-[var(--md-sys-color-outline-variant)]/20 outline-none text-[var(--md-sys-color-on-surface)] font-bold text-xs text-center" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value))} />
                       <button type="button" onClick={addItemToOrder} className="py-2.5 px-4 rounded-xl text-xs font-black transition-opacity duration-200 shadow-sm hover:opacity-90 whitespace-nowrap" style={{ backgroundColor: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)' }}>+ إضافة</button>
                    </div>
                  </>
                )}
              </div>
              {orderItems.length > 0 && (
                 <div className="border border-[var(--md-sys-color-outline-variant)]/20 rounded-2xl overflow-x-auto shadow-sm">
                   <table className="w-full text-right text-sm min-w-[550px]">
                    <thead className="bg-[var(--md-sys-color-surface-container)] border-b border-[var(--md-sys-color-outline-variant)]/20">
                      <tr>
                        <th className="p-3 font-black text-[10px] text-[var(--md-sys-color-on-surface-variant)] text-center w-10">الصورة</th>
                        <th className="p-3 font-black text-[10px] text-[var(--md-sys-color-on-surface-variant)] text-right">المنتج</th>
                        <th className="p-3 font-black text-[10px] text-[var(--md-sys-color-on-surface-variant)] text-right">الخيار</th>
                        <th className="p-3 font-black text-[10px] text-[var(--md-sys-color-on-surface-variant)] text-center">SKU</th>
                        <th className="p-3 font-black text-[10px] text-[var(--md-sys-color-on-surface-variant)] text-center">الكمية</th>
                        <th className="p-3 font-black text-[10px] text-[var(--md-sys-color-on-surface-variant)] text-center">السعر</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                      {orderItems.map((item, idx) => (
                          <tr key={idx} className={`transition-colors ${editingItemIndex === idx ? 'bg-indigo-50/50 dark:bg-indigo-900/10 ring-1 ring-indigo-200 dark:ring-indigo-800' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}>
                            <td className="p-3 text-center">
                              {item.image ? (
                                <div className="inline-block">
                                  <img
                                    src={item.image}
                                    className="w-9 h-9 rounded-lg object-cover border border-[var(--md-sys-color-outline-variant)]/20 cursor-pointer"
                                    onClick={() => setPreviewImage(item.image)}
                                    alt=""
                                    onMouseEnter={e => {
                                      if (tableHoverTimeoutRef.current) clearTimeout(tableHoverTimeoutRef.current);
                                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                      setTableTooltipPos({ top: rect.top, left: rect.left + rect.width + 12 });
                                      setTableHoveredImage(item.image!);
                                    }}
                                    onMouseLeave={() => {
                                      tableHoverTimeoutRef.current = setTimeout(() => setTableHoveredImage(null), 120);
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
                                  <Image size={14} className="text-gray-300 dark:text-gray-600" />
                                </div>
                              )}
                            </td>
                            <td className="p-3 font-bold text-xs text-[var(--md-sys-color-on-surface)]">
                              {editingItemIndex === idx ? (
                                <span className="flex items-center gap-1.5"><Edit2 size={12} className="text-indigo-500" /> {item.productName}</span>
                              ) : item.productName}
                            </td>
                             <td className="p-3 text-[10px] text-[var(--md-sys-color-on-surface-variant)] font-bold min-w-[160px]">
                                {editingItemIndex === idx ? (
                                  (() => {
                                    const prod = products.find(p => p.id === item.productId);
                                    if (!prod) return <span className="text-[10px] text-gray-400">{item.variantLabel}</span>;
                                    const sizes = [...new Set(prod.variants.map(v => v.size))].filter(s => s !== 'واحد');
                                    const colors = [...new Set(prod.variants.map(v => v.color))].filter(c => c !== 'متعدد');
                                    if (sizes.length === 0 && colors.length === 0) return <span className="text-[10px] text-gray-400">خيار وحيد</span>;
                                    const sizeOptions = sizes.map(s => { const qty = prod.variants.filter(v => v.size === s).reduce((sum, v) => sum + v.quantity, 0); return { value: s, label: s, subLabel: `${prod.price} ج.م | ${qty} قطعة`, disabled: qty === 0 }; });
                                    const colorOptions = colors.map(c => { const qty = prod.variants.filter(v => v.color === c).reduce((sum, v) => sum + v.quantity, 0); return { value: c, label: c, subLabel: `${prod.price} ج.م | ${qty} قطعة`, disabled: qty === 0 }; });
                                    return (
                                      <div className="flex flex-wrap gap-1.5 min-w-0">
                                        {sizes.length > 0 && (
                                          <div className="flex-1 min-w-[100px]"><SearchableSelect options={sizeOptions} value={editSize} onChange={setEditSize} onClear={() => setEditSize('')} placeholder="المقاس" /></div>
                                        )}
                                        {colors.length > 0 && (
                                          <div className="flex-1 min-w-[100px]"><SearchableSelect options={colorOptions} value={editColor} onChange={setEditColor} onClear={() => setEditColor('')} placeholder="اللون" /></div>
                                        )}
                                      </div>
                                    );
                                  })()
                                ) : item.variantLabel}
                               </td>
                              <td className="p-3 text-center">
                                <span className="font-mono text-[10px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
                                  {item.sku || '—'}
                                  {item.skuStatus === 'unmatched' && <span className="text-red-500 mr-1" title="SKU غير متطابق - يتطلب مراجعة">⚠️</span>}
                                </span>
                              </td>
                            <td className="p-3 text-center font-black text-xs dark:text-white">
                              {editingItemIndex === idx ? (
                                <input type="number" min="1" className="w-16 mx-auto py-1.5 px-2 bg-[var(--md-sys-color-surface)] rounded-lg border border-[var(--md-sys-color-outline-variant)]/20 outline-none text-[var(--md-sys-color-on-surface)] font-bold text-xs text-center" value={editQuantity} onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)} />
                              ) : item.quantity}
                            </td>
                            <td className="p-3 text-center font-black text-xs text-green-500 dark:text-green-400">
                              {editingItemIndex === idx ? (
                                (() => {
                                  const p = products.find(pr => pr.id === item.productId);
                                  return `${((p?.price || item.price) * editQuantity).toLocaleString()} ج.م`;
                                })()
                              ) : `${(item.price * item.quantity).toLocaleString()} ج.م`}
                            </td>
                            <td className="p-3 text-left flex items-center gap-1 justify-end">
                              {editingItemIndex === idx ? (
                                <>
                                  <button type="button" onClick={saveInlineEdit} className="text-green-500 hover:text-green-700 p-1.5 min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg" title="حفظ"><Check size={14} /></button>
                                  <button type="button" onClick={cancelInlineEdit} className="text-gray-400 hover:text-gray-600 p-1.5 min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="إلغاء"><X size={14} /></button>
                                </>
                              ) : (
                                <>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); startInlineEditItem(idx); }} className="text-indigo-400 hover:text-indigo-600 p-1.5 min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg" title="تعديل المنتج">
                                    <Edit2 size={14} />
                                  </button>
                                  <button type="button" onClick={() => removeOrderItem(idx)} className="text-red-400 hover:text-red-600 p-1.5 min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </td>
                         </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[var(--md-sys-color-surface-container)] border-t border-[var(--md-sys-color-outline-variant)]/20">
                       <tr>
                           <td colSpan={6} className="p-0">
                             <div className="flex flex-col gap-1 p-4 text-xs">
                                <div className="flex justify-between items-center px-3 max-w-[250px] mr-auto">
                                   <span className="text-[var(--md-sys-color-on-surface-variant)] font-bold">مجموع المنتجات:</span>
                                   <span className="font-black text-[var(--md-sys-color-on-surface)]">{itemsTotal.toLocaleString()} ج.م</span>
                                </div>
                                <div className="flex justify-between items-center px-3 max-w-[250px] mr-auto">
                                   <span className="text-[var(--md-sys-color-on-surface-variant)] font-bold">الشحن:</span>
                                   <span className="font-black text-[var(--md-sys-color-on-surface)]">{isFreeShipping ? <span className="text-emerald-600 dark:text-emerald-400">مجاني</span> : `${formData.shippingCost} ج.م`}</span>
                                </div>
                                {useCoupon && formData.couponDiscount > 0 && (
                                   <div className="flex justify-between items-center px-3 max-w-[250px] mr-auto text-emerald-600 dark:text-emerald-400">
                                      <span className="font-bold">خصم ({formData.coupon}):</span>
                                      <span className="font-black">-{calculatedDiscount} ج.م</span>
                                   </div>
                                )}
                                <div className="mx-auto w-[250px] h-px bg-[var(--md-sys-color-outline-variant)]/20 my-1"></div>
                                <div className="flex justify-between items-center px-3 max-w-[250px] mr-auto text-sm">
                                   <span className="font-black text-[var(--md-sys-color-on-surface)]">الإجمالي:</span>
                                    <span className="font-black text-green-500 dark:text-green-400">{Math.max(0, finalTotal).toLocaleString()} ج.م</span>
                                </div>
                             </div>
                          </td>
                       </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
            {Object.values(formErrors).some(Boolean) && (
              <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900">
                <AlertCircle size={18} className="text-red-500 shrink-0" />
                <p className="text-sm font-bold text-red-600 dark:text-red-300">
                  أكمل الحقول الإلزامية المميزة بعلامة <span className="text-red-500 font-black">*</span> ثم اضغط الحفظ مرة أخرى
                </p>
              </div>
            )}
            <button type="submit" className="w-full text-white font-black py-4 rounded-2xl shadow-lg hover:opacity-90 transition-opacity duration-200 text-base flex justify-center items-center gap-2" style={{ backgroundColor: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)' }}>
                <CheckCircle size={20} />
                {editingOrderId && editingOrderId !== 'new' ? 'حفظ التعديلات' : 'حفظ وتأكيد الطلب'} 
                <span className="text-xs opacity-80 text-green-200">({Math.max(0, finalTotal).toLocaleString()} ج.م)</span>
            </button>
          </form>
      </MD3Dialog>

      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60"
            onClick={() => setPreviewImage(null)}
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={previewImage}
              className="max-w-[80vw] max-h-[80vh] rounded-3xl shadow-2xl cursor-default"
              onClick={e => e.stopPropagation()}
              alt=""
            />
          </motion.div>
        )}
      </AnimatePresence>

      {tableHoveredImage && (
        <div
          style={{ position: 'fixed', top: tableTooltipPos.top, left: tableTooltipPos.left, zIndex: 700 }}
          onMouseEnter={() => { if (tableHoverTimeoutRef.current) clearTimeout(tableHoverTimeoutRef.current); }}
          onMouseLeave={() => setTableHoveredImage(null)}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-100 dark:border-slate-700 p-2">
            <img src={tableHoveredImage} className="w-36 h-36 rounded-xl object-cover max-w-none" alt="" />
          </div>
        </div>
      )}
      
      {viewMode === 'grid' ? (
        <motion.div 
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.05
              }
            }
          }}
          className="space-y-3"
        >
              {filteredOrders.map(order => {
                 const isSelected = selectedIds.has(order.id);
                 const waNumber = order.customerPhone?.replace(/^0/, '');
                 const mapQuery = encodeURIComponent(`${order.city || ''} ${order.address || ''}`);
             return (
              <motion.div 
                key={order.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white dark:bg-slate-900 rounded-[24px] shadow-sm border transition-all duration-200 relative ${isSelected ? 'ring-4 ring-blue-500/30 border-blue-500' : 'border-gray-100 dark:border-slate-800 hover:shadow-lg'}`}
              >
                 <div 
                   className="p-5 cursor-pointer select-none"
                   onClick={() => setViewingOrderId(order.id)}
                 >
                   {/* Top row: checkbox + badge + name + total + actions */}
                   <div className="flex items-start gap-3">
                      <div onClick={(e) => e.stopPropagation()} className="mt-1">
                         <button 
                            onClick={() => toggleSelect(order.id)} 
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors duration-200 ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-slate-700'}`}
                         >
                            {isSelected ? <Check size={12} strokeWidth={3} /> : <Square size={12} />}
                         </button>
                      </div>

                       <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
                         <span className="text-[8px] text-white/70 font-black leading-none">#</span>
                         <span className="text-xs font-black text-white leading-none">{displayOrderId(order.id).split('-').pop()}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                         <h4 className="font-black text-gray-900 dark:text-white text-sm truncate">{order.customerName}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-0.5">
                             <Calendar size={10} />
                             {formatDate(order.createdAt, 'date')}
                             {order.updatedAt && <><span className="opacity-30">•</span><span className="text-gray-300 dark:text-gray-600">آخر تعديل: {formatDate(order.updatedAt, 'date')}</span></>}
                             <span className="opacity-30">•</span>
                             <span>{order.items.length} أصناف</span>
                          </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          {canManageOrders && <motion.button 
                             whileHover={{ scale: 1.05 }}
                             whileTap={{ scale: 0.95 }}
                             onClick={() => startEditing(order)}
                              className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold shadow-md flex items-center gap-1.5 transition-colors duration-200"
                              style={{ backgroundColor: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)' }}
                             title="تعديل"
                          >
                             <Edit2 size={12} />
                             تعديل
                          </motion.button>}
                         {canManageOrders && <button 
                            onClick={(e) => handleDeleteSingle(order.id, e as any)}
                            className="p-1.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors duration-200"
                            title="حذف"
                         >
                            <Trash2 size={14} />
                         </button>}
                      </div>
                   </div>

                   {/* Phone row with WhatsApp + bigger buttons */}
                    <div className="flex flex-wrap items-center gap-2 mt-3 pr-14">
                       <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400">
                          <Phone size={13} className="text-gray-400" />
                          <span className="font-mono text-sm" dir="ltr">{order.customerPhone}</span>
                          <button 
                             onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(order.customerPhone); }}
                             className="p-1.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-blue-500 transition-colors duration-200"
                             title="نسخ"
                          >
                             <Copy size={14} />
                          </button>
                          <a 
                             href={`tel:${order.customerPhone}`} 
                             onClick={e => e.stopPropagation()}
                             className="p-1.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-emerald-500 hover:text-emerald-600 transition-colors duration-200"
                             title="اتصال"
                          >
                             <Phone size={14} />
                          </a>
                          <a 
                             href={`https://wa.me/20${waNumber}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             onClick={e => e.stopPropagation()}
                             className="p-1.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200"
                             title="واتساب"
                          >
                             <FaWhatsapp size={15} />
                          </a>
                       </div>
                       {order.altPhone && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-500">
                             <span className="opacity-40">|</span>
                             <span className="font-mono" dir="ltr">{order.altPhone}</span>
                          </div>
                       )}
                    </div>

                   {/* Address row */}
                    {(order.city || order.address) && (
                       <div className="flex flex-wrap items-center gap-2 mt-1 pr-14">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-500">
                             <MapPin size={11} className="text-gray-400" />
                             <span className="truncate max-w-[250px]">{order.city}{order.city && order.address ? ' - ' : ''}{order.address}</span>
                          </div>
                       </div>
                    )}
                    {(order.mapUrl || (order.latitude && order.longitude) || (mapQuery && mapQuery.length > 3)) && (
                       <div className="flex items-center gap-1.5 pr-14 mt-1 text-[11px] text-teal-600 dark:text-teal-400 font-black">
                          <Navigation size={11} className="shrink-0" />
                          <a
                             href={order.mapUrl || (order.latitude && order.longitude ? `https://www.google.com/maps?q=${order.latitude},${order.longitude}` : `https://www.google.com/maps/search/?api=1&query=${mapQuery}`)}
                             target="_blank"
                             rel="noopener noreferrer"
                             onClick={e => e.stopPropagation()}
                             className="hover:underline truncate"
                          >
                             عرض على جوجل ماب
                          </a>
                       </div>
                    )}

                   {/* Products showcase */}
                    {order.items.length > 0 && (
                       <div className="mt-3 pr-14 flex flex-wrap gap-1.5">
                           {order.items.slice(0, 3).map((item, i) => (
                              <span key={i} className="text-[10px] bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-lg font-bold text-gray-500 dark:text-gray-400 border border-gray-50 dark:border-slate-700 flex items-center gap-1">
                                 {item.productName} ×{item.quantity}
                                 {item.sku && <span className="font-mono text-[8px] text-gray-400">[{item.sku}]</span>}
                                 <span className={`text-[9px] font-black ${getStatusTextColor(order.status)}`}>{((item.price || 0) * (item.quantity || 0)).toLocaleString()} ج.م</span>
                              </span>
                           ))}
                          {order.items.length > 3 && <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold self-center">+{order.items.length - 3}</span>}
                       </div>
                    )}

                    {/* Separator + bottom info row */}
                    <div className="mt-3 pt-3 border-t border-gray-50 dark:border-slate-800">
                       <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                             {/* Status with click dropdown */}
                             {canManageOrders && <div className="relative" onClick={e => { e.stopPropagation(); setActiveStatusOrderId(prev => prev === order.id ? null : order.id); }}>
                                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black cursor-pointer ${getStatusStyle(order.status)}`}>
                                   {getStatusIcon(order.status)}
                                   {order.status}
                                </span>
                                 <PopupSheet
                                    isOpen={activeStatusOrderId === order.id}
                                    onClose={() => setActiveStatusOrderId(null)}
                                    className="absolute bottom-full right-0 mb-2 w-48 pt-1 z-50"
                                    title="تغيير الحالة"
                                 >
                                      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-100 dark:border-slate-700 p-1.5">
                                         <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 px-3 py-1.5">تغيير الحالة</div>
                                         {Object.values(OrderStatus).map(status => (
                                            <button
                                               key={status}
                                               onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, status); setActiveStatusOrderId(null); }}
                                               className="w-full text-right px-3 py-2 rounded-xl text-[10px] font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-between"
                                            >
                                               <span className="flex items-center gap-1.5">
                                                  <div className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(status).split(' ')[0]}`}></div>
                                                  {status}
                                               </span>
                                               {order.status === status && <Check size={10} className="text-blue-500" />}
                                            </button>
                                        ))}
                                     </div>
                               </PopupSheet>
                             </div>}

                              <span className={`text-xs font-black ${getStatusTextColor(order.status)}`}>{(order.totalAmount || 0).toLocaleString()} ج.م</span>

                             <span className="text-[10px] text-gray-300 dark:text-gray-600">|</span>
                             <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{order.items.length} منتج</span>
                          </div>

                          {/* Link icons - bigger */}
                          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                             {order.customerPhone && (
                                <>
                                   <a 
                                      href={`https://wa.me/20${waNumber}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                       className="p-1.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-400 hover:text-emerald-600 transition-colors duration-200 border border-gray-100 dark:border-slate-700"
                                       title="واتساب"
                                   >
                                      <FaWhatsapp size={16} />
                                   </a>
                                   <a 
                                      href={`tel:${order.customerPhone}`}
                                       className="p-1.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200 border border-gray-100 dark:border-slate-700"
                                       title="اتصال مباشر"
                                   >
                                      <Phone size={15} />
                                   </a>
                                </>
                             )}
                          </div>
                       </div>

                     </div>
                 </div>
              </motion.div>
             );
          })}
          {filteredOrders.length === 0 && (
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="text-center py-24 bg-white dark:bg-slate-900 rounded-[40px] border border-dashed border-gray-200 dark:border-slate-800"
             >
                <ShoppingBag size={64} className="mx-auto mb-4 text-gray-200 dark:text-slate-700" />
                <h3 className="text-xl font-black text-gray-300 dark:text-slate-700">لا توجد طلبات لعرضها</h3>
             </motion.div>
          )}
        </motion.div>
      ) : viewMode === 'list' ? (
        <div className="bg-white dark:bg-slate-900 rounded-[24px] overflow-hidden border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full text-right min-w-[700px]">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
              <tr>
                <th className="p-4 w-10"></th>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300">العميل</th>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300">رقم الطلب</th>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300">التاريخ</th>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300">الأصناف</th>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300">الإجمالي</th>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300">الحالة</th>
                <th className="p-4 font-black text-[11px] text-gray-500 dark:text-gray-300"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {filteredOrders.map(order => {
                 const isSelected = selectedIds.has(order.id);
                 const waNumber = order.customerPhone?.replace(/^0/, '');
                 return (
                  <tr key={order.id} onClick={() => setViewingOrderId(order.id)} className={`cursor-pointer transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-slate-800/50 ${isSelected ? 'bg-blue-500/5' : ''}`}>
                     <td className="p-4" onClick={e => e.stopPropagation()}>
                       <button onClick={() => toggleSelect(order.id)} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-200 ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400'}`}>
                         {isSelected ? <Check size={16} strokeWidth={3} /> : <Square size={16} />}
                        </button>
                     </td>
                      <td className="p-4">
                        <div className="font-black text-sm text-gray-900 dark:text-white">
                          {order.customerId ? (
                            <button onClick={e => { e.stopPropagation(); handleViewCustomerFromOrder(order.customerId!, order); }} className="text-accent hover:underline text-right">{order.customerName}</button>
                          ) : order.customerName}
                        </div>
                       <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 font-bold font-mono" dir="ltr">{order.customerPhone}</span>
                          <a 
                             href={`https://wa.me/20${waNumber}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             onClick={e => e.stopPropagation()}
                              className="p-1 min-w-[40px] min-h-[40px] flex items-center justify-center rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-400 hover:text-emerald-600 transition-colors duration-200"
                              title="واتساب"
                          >
                             <FaWhatsapp size={13} />
                          </a>
                       </div>
                     </td>
                      <td className="p-4 font-mono text-sm font-bold text-gray-500">#{displayOrderId(order.id)}</td>
                      <td className="p-4 text-xs font-bold text-gray-500">{formatDate(order.createdAt, 'date')}</td>
                      <td className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500">{order.updatedAt ? formatDate(order.updatedAt, 'date') : '—'}</td>
                      <td className="p-4 text-sm font-bold text-gray-600 dark:text-gray-400">{order.items.length}</td>
                       <td className={`p-4 font-black text-sm ${getStatusTextColor(order.status)}`}>{(order.totalAmount || 0).toLocaleString()} ج.م</td>
                     <td className="p-4">
                        {canManageOrders && <div className="relative" onClick={e => { e.stopPropagation(); setActiveStatusOrderId(prev => prev === order.id ? null : order.id); }}>
                              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[9px] font-black cursor-pointer ${getStatusStyle(order.status)}`}>
                                 {getStatusIcon(order.status)}
                                 {order.status}
                              </span>
                               <PopupSheet
                                  isOpen={activeStatusOrderId === order.id}
                                  onClose={() => setActiveStatusOrderId(null)}
                                  className="absolute bottom-full right-0 mb-2 w-48 pt-1 z-50"
                                  title="تغيير الحالة"
                               >
                                     <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-100 dark:border-slate-700 p-1.5">
                                       <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 px-3 py-1.5">تغيير الحالة</div>
                                       {Object.values(OrderStatus).map(status => (
                                          <button
                                             key={status}
                                             onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, status); setActiveStatusOrderId(null); }}
                                             className="w-full text-right px-3 py-2 rounded-xl text-[10px] font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-between"
                                          >
                                             <span className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(status).split(' ')[0]}`}></div>
                                                {status}
                                             </span>
                                             {order.status === status && <Check size={10} className="text-blue-500" />}
                                          </button>
                                  ))}
                               </div>
                         </PopupSheet>
                        </div>}
                     </td>
                     <td className="p-4">
                        <div className="flex items-center gap-1.5">
                            {canManageOrders && <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); startEditing(order); }} className="p-2.5 rounded-xl shadow-md transition-colors duration-200" style={{ backgroundColor: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)' }} title="تعديل"><Edit2 size={15} /></motion.button>}
                          {canManageOrders && <button onClick={(e) => { e.stopPropagation(); handleDeleteSingle(order.id, e as any); }} className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-200" title="حذف"><Trash2 size={15} /></button>}
                        </div>
                     </td>
                   </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      ) : viewMode === 'compact' ? (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.03 } } }}
          className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2"
        >
          {filteredOrders.map(order => {
            const isSelected = selectedIds.has(order.id);
            return (
              <motion.div
                key={order.id}
                variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}
                onClick={() => setViewingOrderId(order.id)}
                className={`relative bg-white dark:bg-slate-900 rounded-2xl p-3 border transition-all duration-200 cursor-pointer ${isSelected ? 'ring-2 ring-blue-500 border-blue-500 shadow-md' : 'border-gray-50 dark:border-slate-800 hover:shadow-md'}`}
              >
                <div className="absolute top-1.5 right-1.5 z-10" onClick={e => e.stopPropagation()}>
                  <button onClick={() => toggleSelect(order.id)} className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors duration-200 ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-slate-700'}`}>
                    {isSelected ? <Check size={11} strokeWidth={3} /> : <Square size={11} />}
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                   <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
                    <span className="text-[8px] font-black text-white">#</span>
                  </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-[11px] text-gray-900 dark:text-white truncate">
                        {order.customerId ? (
                          <button onClick={e => { e.stopPropagation(); handleViewCustomerFromOrder(order.customerId!, order); }} className="text-accent hover:underline text-right truncate w-full block">{order.customerName}</button>
                        ) : order.customerName}
                      </h4>
                      <div className="flex items-center gap-1 text-[8px] text-gray-400 dark:text-gray-500 font-bold">
                         <span className="font-mono" dir="ltr">{order.customerPhone}</span>
                      </div>
                      <div className="text-[7px] text-gray-300 dark:text-gray-600 font-bold mt-0.5">
                         {formatDate(order.createdAt, 'date')}
                         {order.updatedAt && <> | {formatDate(order.updatedAt, 'date')}</>}
                      </div>
                    </div>
                </div>
                <div className="flex items-center justify-between gap-1">
                    <span className={`font-black text-[11px] ${getStatusTextColor(order.status)}`}>{(order.totalAmount || 0).toLocaleString()} <span className="text-[8px]">ج.م</span></span>
                  {canManageOrders && <div className="relative" onClick={e => { e.stopPropagation(); setActiveStatusOrderId(prev => prev === order.id ? null : order.id); }}>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] font-black cursor-pointer leading-none ${getStatusStyle(order.status)}`}>
                           {getStatusIcon(order.status)}
                           {order.status}
                        </span>
                         <PopupSheet
                            isOpen={activeStatusOrderId === order.id}
                            onClose={() => setActiveStatusOrderId(null)}
                            className="absolute bottom-full right-0 mb-2 w-44 pt-1 z-50"
                            title="تغيير الحالة"
                         >
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-100 dark:border-slate-700 p-1">
                                 <div className="text-[9px] font-black text-gray-400 dark:text-gray-500 px-3 py-1.5">تغيير الحالة</div>
                                 {Object.values(OrderStatus).map(status => (
                                    <button
                                       key={status}
                                       onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, status); setActiveStatusOrderId(null); }}
                                       className="w-full text-right px-3 py-1.5 rounded-xl text-[9px] font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-between"
                                    >
                                       <span className="flex items-center gap-1.5">
                                          <div className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(status).split(' ')[0]}`}></div>
                                          {status}
                                       </span>
                                       {order.status === status && <Check size={9} className="text-blue-500" />}
                                    </button>
                                  ))}
                               </div>
                         </PopupSheet>
                   </div>}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2 pt-2 border-t border-gray-50 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                          {canManageOrders && <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => startEditing(order)} className="p-1.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm" title="تعديل"><Edit2 size={11} /></motion.button>}
                  {canManageOrders && <button onClick={(e) => handleDeleteSingle(order.id, e as any)} className="p-1.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-100 dark:border-red-900/30" title="حذف"><Trash2 size={11} /></button>}
                  {order.customerPhone && (() => {
                     const waCompact = order.customerPhone.replace(/^0/, '');
                     return (
                        <a href={`https://wa.me/20${waCompact}`} target="_blank" rel="noopener noreferrer"
                           className="p-1.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-gray-50 dark:bg-slate-800 text-emerald-400 hover:text-emerald-600 border border-gray-100 dark:border-slate-700 transition-colors duration-200" title="واتساب">
                           <FaWhatsapp size={12} />
                        </a>
                     );
                  })()}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.05 } } }}
          className="space-y-3"
        >
          {filteredOrders.map(order => {
            const isSelected = selectedIds.has(order.id);
            const waNumber = order.customerPhone?.replace(/^0/, '');
            return (
              <motion.div
                key={order.id}
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                onClick={() => setViewingOrderId(order.id)}
                className={`bg-white dark:bg-slate-900 rounded-[20px] p-4 border transition-all duration-200 cursor-pointer ${isSelected ? 'ring-2 ring-blue-500 border-blue-500 shadow-lg' : 'border-gray-100 dark:border-slate-800 hover:shadow-md'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div onClick={e => e.stopPropagation()}>
                      <button onClick={() => toggleSelect(order.id)} className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200 ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-slate-700'}`}>
                        {isSelected ? <Check size={16} strokeWidth={3} /> : <Square size={16} />}
                      </button>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-gray-900 dark:text-white text-sm truncate">
                        {order.customerId ? (
                          <button onClick={e => { e.stopPropagation(); handleViewCustomerFromOrder(order.customerId!, order); }} className="text-accent hover:underline text-right truncate w-full block">{order.customerName}</button>
                        ) : order.customerName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-gray-400 dark:text-gray-500 mt-0.5">
                        <span className="font-mono" dir="ltr">{order.customerPhone}</span>
                        <a 
                           href={`https://wa.me/20${waNumber}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           onClick={e => e.stopPropagation()}
                           className="p-0.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-400 hover:text-emerald-600 transition-colors duration-200"
                           title="واتساب"
                        >
                           <FaWhatsapp size={13} />
                        </a>
                        {order.city && <><span className="opacity-30">-</span><span>{order.city}</span></>}
                        <span className="opacity-30">-</span>
                        <span>{formatDate(order.createdAt, 'date')}</span>
                        {order.updatedAt && <><span className="opacity-30">-</span><span className="text-gray-300 dark:text-gray-600">آخر تعديل: {formatDate(order.updatedAt, 'date')}</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="text-left shrink-0 flex flex-col items-end gap-1.5">
                     <div className={`font-black text-sm ${getStatusTextColor(order.status)}`}>{(order.totalAmount || 0).toLocaleString()} ج.م</div>
                     {canManageOrders && <div className="relative" onClick={e => { e.stopPropagation(); setActiveStatusOrderId(prev => prev === order.id ? null : order.id); }}>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-black cursor-pointer ${getStatusStyle(order.status)}`}>
                           {getStatusIcon(order.status)}
                           {order.status}
                        </span>
                         <PopupSheet
                            isOpen={activeStatusOrderId === order.id}
                            onClose={() => setActiveStatusOrderId(null)}
                            className="absolute bottom-full right-0 mb-2 w-44 pt-1 z-50"
                            title="تغيير الحالة"
                         >
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-100 dark:border-slate-700 p-1">
                                 <div className="text-[9px] font-black text-gray-400 dark:text-gray-500 px-3 py-1.5">تغيير الحالة</div>
                                 {Object.values(OrderStatus).map(status => (
                                    <button
                                       key={status}
                                       onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, status); setActiveStatusOrderId(null); }}
                                       className="w-full text-right px-3 py-1.5 rounded-xl text-[9px] font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-between"
                                    >
                                       <span className="flex items-center gap-1.5">
                                          <div className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(status).split(' ')[0]}`}></div>
                                          {status}
                                       </span>
                                       {order.status === status && <Check size={9} className="text-blue-500" />}
                                    </button>
                                  ))}
                               </div>
                         </PopupSheet>
                     </div>}
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      {order.customerPhone && (
                        <>
                           <a href={`https://wa.me/20${waNumber}`} target="_blank" rel="noopener noreferrer" className="p-1.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-gray-50 dark:bg-slate-800 text-emerald-400 hover:text-emerald-600 border border-gray-100 dark:border-slate-700 transition-colors duration-200"><FaWhatsapp size={14} /></a>
                  {canManageOrders && <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => startEditing(order)} className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm" title="تعديل"><Edit2 size={13} /></motion.button>}
                          {canManageOrders && <button onClick={(e) => handleDeleteSingle(order.id, e as any)} className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-200" title="حذف"><Trash2 size={13} /></button>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2 pr-14">
                  {order.items.slice(0, 3).map((item, i) => (
                    <span key={i} className="text-[10px] bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-lg font-bold text-gray-500 dark:text-gray-400 border border-gray-50 dark:border-slate-700 flex items-center gap-1">
                      {item.productName} ×{item.quantity}
                      <span className={`text-[9px] font-black ${getStatusTextColor(order.status)}`}>{((item.price || 0) * (item.quantity || 0)).toLocaleString()} ج.م</span>
                    </span>
                  ))}
                  {order.items.length > 3 && <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold self-center">+{order.items.length - 3}</span>}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Full Order Details Modal */}
      {viewingOrderId && (() => {
        const vo = orders.find(o => o.id === viewingOrderId);
        const trans = vo ? getTransitions(vo.status) : [];
        return (
      <MD3Dialog
        isOpen={!!viewingOrderId}
        onClose={() => setViewingOrderId(null)}
        title="تفاصيل الطلب"
        description={`#${displayOrderId(viewingOrderId)} • ${formatDate(vo?.createdAt, 'date')}${vo?.updatedAt ? ` • آخر تعديل: ${formatDate(vo.updatedAt, 'date')}` : ''}`}
        icon={<ShoppingBag size={20} />}
        maxWidth="xl"
        actions={[
          { label: 'تعديل الطلب', onClick: () => { if(vo) startEditing(vo); setViewingOrderId(null); }, variant: 'tonal' as const, icon: <Edit2 size={15} /> },
          ...(isShippingFilter && trans.length > 0 ? trans.map(t => ({
            label: t.label,
            onClick: () => { if(vo) { onUpdateStatus(vo.id, t.nextStatus); setViewingOrderId(null); } },
            variant: 'filled' as const,
            icon: <t.icon size={15} />
          })) : []),
          { label: isShippingFilter ? 'طباعة بوليصة' : 'طباعة فاتورة', onClick: () => {
              if (isShippingFilter && vo) {
                setWaybillOrders([vo]);
                setWaybillModalOpen(true);
              } else {
                setSinglePrintOrderId(viewingOrderId);
              }
              setViewingOrderId(null);
          }, variant: 'tonal' as const, icon: <Printer size={15} /> }
        ]}
      >
                <div>
                   {orders.find(o => o.id === viewingOrderId) && (() => {
                     const o = orders.find(ord => ord.id === viewingOrderId)!;
                     const mapQuery = encodeURIComponent(`${o.city || ''} ${o.address || ''}`);
                     const waNumber = o.customerPhone?.replace(/^0/, '');
                     return (
                     <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             {/* LEFT COLUMN - Customer Info with tall map */}
                             <div className="space-y-4">
                                <div className="bg-[var(--md-sys-color-surface-container)] p-5 rounded-3xl border border-[var(--md-sys-color-outline-variant)]/20">
                                   <h4 className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] tracking-wider mb-4 flex items-center gap-1.5">
                                     <User size={12} className="text-violet-500" /> بيانات العميل
                                   </h4>
                                  <div className="space-y-3">
                                     <div>
                                        <span className="block text-[9px] text-[var(--md-sys-color-on-surface-variant)] font-bold mb-0.5">الاسم</span>
                                        <span className="text-sm font-black text-[var(--md-sys-color-on-surface)]">{o.customerName}</span>
                                     </div>
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                           <span className="block text-[9px] text-[var(--md-sys-color-on-surface-variant)] font-bold mb-0.5">رقم الهاتف</span>
                                           <div className="flex items-center gap-1.5">
                                              <span className="text-sm font-black dark:text-[var(--md-sys-color-on-surface)] font-mono" dir="ltr">{o.customerPhone}</span>
                                             <button onClick={() => navigator.clipboard.writeText(o.customerPhone)} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-300 hover:text-blue-500 transition-colors duration-200"><Copy size={10} /></button>
                                             <a href={`tel:${o.customerPhone}`} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-emerald-400 hover:text-emerald-500 transition-colors duration-200"><Phone size={10} /></a>
                                             <a href={`https://wa.me/20${waNumber}`} target="_blank" rel="noopener noreferrer" className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-300 hover:text-emerald-500 transition-colors duration-200"><FaWhatsapp size={10} /></a>
                                           </div>
                                        </div>
                                        {o.altPhone && (
                                           <div>
                                               <span className="block text-[9px] text-[var(--md-sys-color-on-surface-variant)] font-bold mb-0.5">هاتف بديل</span>
                                              <div className="flex items-center gap-1.5">
                                                 <span className="text-sm font-black dark:text-[var(--md-sys-color-on-surface)] font-mono" dir="ltr">{o.altPhone}</span>
                                                <button onClick={() => navigator.clipboard.writeText(o.altPhone || '')} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-300 hover:text-blue-500 transition-colors duration-200"><Copy size={10} /></button>
                                              </div>
                                           </div>
                                        )}
                                     </div>
                                     <div>
                                         <span className="block text-[9px] text-[var(--md-sys-color-on-surface-variant)] font-bold mb-0.5">العنوان</span>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{o.city}{o.city && o.address ? ' - ' : ''}{o.address}</span>
                                            {(o.mapUrl || (o.latitude && o.longitude) || (mapQuery && mapQuery.length > 3)) && (
                                              <a
                                                 href={o.mapUrl || (o.latitude && o.longitude ? `https://www.google.com/maps?q=${o.latitude},${o.longitude}` : `https://www.google.com/maps/search/?api=1&query=${mapQuery}`)}
                                                 target="_blank"
                                                 rel="noopener noreferrer"
                                                 className="flex items-center gap-1 text-[11px] font-black text-teal-600 dark:text-teal-400 hover:underline shrink-0"
                                              >
                                                 <Navigation size={12} className="shrink-0" />
                                                 عرض على جوجل ماب
                                              </a>
                                            )}
                                         </div>
                                      </div>
                                       {(() => {
                                         if (o.latitude && o.longitude) {
                                           return (
                                             <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 min-h-[280px]">
                                               <iframe title="موقع الطلب" width="100%" height="280" frameBorder="0"
                                                 src={`https://www.google.com/maps?q=${o.latitude},${o.longitude}&z=15&output=embed`}
                                                 className="bg-gray-100 dark:bg-slate-800" allowFullScreen loading="lazy"
                                                 referrerPolicy="no-referrer-when-downgrade" />
                                             </div>
                                           );
                                         }
                                         const addrText = `${o.city || ''} ${o.address || ''}`.trim();
                                         if (addrText) {
                                           return (
                                             <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700 min-h-[280px]">
                                               <iframe title="موقع الطلب" width="100%" height="280" frameBorder="0"
                                                 src={`https://www.google.com/maps?q=${encodeURIComponent(addrText)}&z=15&output=embed`}
                                                 className="bg-gray-100 dark:bg-slate-800 opacity-70" allowFullScreen loading="lazy"
                                                 referrerPolicy="no-referrer-when-downgrade" />
                                             </div>
                                           );
                                         }
                                         return null;
                                       })()}
                                    </div>
                                 </div>
                             </div>

                             {/* RIGHT COLUMN - Technical, Extra, Notes, Shipping */}
                             <div className="space-y-4">
                                 <div className="bg-[var(--md-sys-color-surface-container)] p-5 rounded-3xl border border-[var(--md-sys-color-outline-variant)]/20">
                                   <h4 className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] tracking-wider mb-4 flex items-center gap-1.5">
                                      <Hash size={12} className="text-amber-500" /> بيانات تقنية
                                   </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-3">
                                      {o.sourceId && (
                                         <div className="col-span-2 bg-[var(--md-sys-color-surface)] p-3 rounded-2xl border border-[var(--md-sys-color-outline-variant)]/20">
                                             <span className="block text-[9px] text-[var(--md-sys-color-on-surface-variant)] font-bold mb-0.5">رقم المتجر</span>
                                             <span className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">{o.sourceId}</span>
                                         </div>
                                      )}
                                      <div>
                                          <span className="block text-[9px] text-[var(--md-sys-color-on-surface-variant)] font-bold mb-0.5">المصدر (UTM)</span>
                                          <span className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">{o.utmSource || '-'}</span>
                                       </div>
                                       <div>
                                          <span className="block text-[9px] text-[var(--md-sys-color-on-surface-variant)] font-bold mb-0.5">الحملة</span>
                                          <span className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">{o.utmCampaign || '-'}</span>
                                       </div>
                                       <div>
                                          <span className="block text-[9px] text-[var(--md-sys-color-on-surface-variant)] font-bold mb-0.5">Ref</span>
                                          <span className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">{o.ref || '-'}</span>
                                       </div>
                                       <div>
                                          <span className="block text-[9px] text-[var(--md-sys-color-on-surface-variant)] font-bold mb-0.5">كود الإحالة</span>
                                          <span className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">{o.referralCode || '-'}</span>
                                      </div>
                                   </div>
                                </div>

                                {o.extraData && (
                                    <div className="bg-[var(--md-sys-color-surface-container)] p-5 rounded-3xl border border-[var(--md-sys-color-outline-variant)]/20">
                                       <span className="block text-[9px] text-[var(--md-sys-color-on-surface-variant)] font-bold mb-2">بيانات إضافية</span>
                                       <div className="text-[11px] font-mono text-[var(--md-sys-color-on-surface-variant)] break-all bg-[var(--md-sys-color-surface)] p-3 rounded-2xl border border-[var(--md-sys-color-outline-variant)]/20">
                                         {o.extraData}
                                      </div>
                                   </div>
                                )}

                                {o.notes && (
                                   <div className="bg-amber-50/50 dark:bg-amber-900/5 p-5 rounded-3xl border border-amber-100 dark:border-amber-900/20">
                                      <h4 className="text-[10px] font-black text-amber-600 dark:text-amber-500 tracking-wider mb-2 flex items-center gap-1.5">
                                         <ClipboardList size={12} /> ملاحظات
                                      </h4>
                                      <p className="text-xs font-bold text-amber-800 dark:text-amber-200 leading-relaxed">
                                         "{o.notes}"
                                      </p>
                                   </div>
                                )}

                                {/* Shipping Details - bottom of right column */}
                                 <div className="bg-[var(--md-sys-color-surface-container)] p-5 rounded-3xl border border-[var(--md-sys-color-outline-variant)]/20">
                                   <h4 className="text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] tracking-wider mb-4 flex items-center gap-1.5">
                                      <Truck size={12} className="text-sky-500" /> تفاصيل الشحن
                                   </h4>
                                   <div className="grid grid-cols-2 gap-3">
                                      <div>
                                         <span className="block text-[9px] text-[var(--md-sys-color-on-surface-variant)] font-bold mb-0.5">نوع التوصيل</span>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black ${o.shippingMethod === ShippingMethod.LOCAL ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'}`}>
                                           {o.shippingMethod}
                                        </span>
                                     </div>
                                     {o.shippingCompany && (
                                        <div>
                                            <span className="block text-[9px] text-[var(--md-sys-color-on-surface-variant)] font-bold mb-0.5">شركة الشحن</span>
                                            <span className="text-sm font-black text-[var(--md-sys-color-on-surface)]">{o.shippingCompany}</span>
                                        </div>
                                     )}
                                     <div>
                                         <span className="block text-[9px] text-[var(--md-sys-color-on-surface-variant)] font-bold mb-0.5">رسوم الشحن</span>
                                        <span className="text-sm font-black text-sky-600 dark:text-sky-400">{o.shippingCost} ج.م</span>
                                     </div>
                                  </div>
                               </div>
                             </div>
                          </div>

                        {/* Products Table */}
                        <div className="space-y-3">
                           <h4 className="text-sm font-black text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                              <Package size={16} className="text-cyan-500" /> المنتجات ({o.items.length})
                           </h4>
                           <div className="border border-[var(--md-sys-color-outline-variant)]/20 rounded-3xl overflow-x-auto shadow-sm">
                               <table className="w-full text-right min-w-[600px]">
                                  <thead className="bg-[var(--md-sys-color-surface-container)]">
                                     <tr>
                                       <th className="p-3 text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] text-center w-10">الصورة</th>
                                        <th className="p-3 text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)]">المنتج</th>
                                        <th className="p-3 text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)]">الخيار</th>
                                        <th className="p-3 text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] text-center">SKU</th>
                                        <th className="p-3 text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] text-center">الكمية</th>
                                        <th className="p-3 text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] text-center">السعر</th>
                                        <th className="p-3 text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] text-center">الإجمالي</th>
                                      </tr>
                                   </thead>
                                   <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                                      {o.items.map((item, idx) => (
                                         <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="p-3 text-center">
                                               {item.image ? (
                                                 <img
                                                   src={item.image}
                                                   className="w-9 h-9 rounded-lg object-cover border border-gray-100 dark:border-slate-700 cursor-pointer"
                                                   onClick={() => setPreviewImage(item.image)}
                                                   alt=""
                                                 />
                                               ) : (
                                                 <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
                                                   <Image size={14} className="text-gray-300 dark:text-gray-600" />
                                                 </div>
                                               )}
                                            </td>
                                             <td className="p-3 font-black text-sm text-[var(--md-sys-color-on-surface)]">{item.productName}</td>
                                             <td className="p-3">
                                                <span className="inline-flex px-2 py-0.5 bg-[var(--md-sys-color-surface-container)] rounded-lg text-[9px] font-bold text-[var(--md-sys-color-on-surface-variant)]">{item.variantLabel}</span>
                                             </td>
                                             <td className="p-3 text-center">
                                               <span className="font-mono text-[10px] font-bold text-[var(--md-sys-color-on-surface-variant)]">{item.sku || '—'}{item.skuStatus === 'unmatched' && <span className="text-red-500 mr-1" title="SKU غير متطابق">⚠️</span>}</span>
                                            </td>
                                            <td className="p-3 text-center font-black dark:text-white text-xs">{item.quantity}</td>
                                            <td className="p-3 text-center text-gray-500 font-bold text-xs">{item.price} ج.م</td>
                                              <td className={`p-3 text-center font-black text-xs ${getStatusTextColor(o.status)}`}>{((item.price || 0) * (item.quantity || 0)).toLocaleString()} ج.م</td>
                                         </tr>
                                      ))}
                                  </tbody>
                                   <tfoot className="bg-[var(--md-sys-color-surface-container)]">
                                      <tr>
                                         <td colSpan={6} className="p-4">
                                           <div className="flex flex-col items-end gap-1.5 max-w-[240px] mr-auto">
                                              <div className="flex justify-between w-full text-xs">
                                                 <span className="text-[var(--md-sys-color-on-surface-variant)] font-bold">مجموع المنتجات:</span>
                                                 <span className="font-black text-[var(--md-sys-color-on-surface)]">{o.items.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()} ج.م</span>
                                             </div>
                                              <div className="flex justify-between w-full text-xs">
                                                 <span className="text-[var(--md-sys-color-on-surface-variant)] font-bold">الشحن:</span>
                                                 <span className="font-black text-[var(--md-sys-color-on-surface)]">{o.shippingCost} ج.م</span>
                                             </div>
                                             {o.couponDiscount && (
                                                <div className="flex justify-between w-full text-xs text-emerald-600">
                                                   <span className="font-bold">خصم ({o.coupon}):</span>
                                                   <span className="font-black">-{o.couponDiscount} ج.م</span>
                                                </div>
                                             )}
                                              <div className="h-px w-full bg-[var(--md-sys-color-outline-variant)]/20 my-0.5"></div>
                                              <div className="flex justify-between w-full text-sm">
                                                 <span className="font-black text-[var(--md-sys-color-on-surface)]">الإجمالي النهائي:</span>
                                                 <span className={`font-black ${getStatusTextColor(o.status)}`}>{(o.totalAmount || 0).toLocaleString()} ج.م</span>
                                             </div>
                                          </div>
                                       </td>
                                    </tr>
                                 </tfoot>
                              </table>
                           </div>
                        </div>
                     </div>
                     );
                   })()}
                </div>
      </MD3Dialog>
        );
      })()}

      {/* Floating Action Bar for Selected Orders */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ y: 100, x: "-50%", opacity: 0 }}
            animate={{ y: 0, x: "-50%", opacity: 1 }}
            exit={{ y: 100, x: "-50%", opacity: 0 }}
            className="fixed bottom-20 md:bottom-8 left-1/2 z-[260] w-[95vw] max-w-[600px]"
          >
             <div className="bg-white dark:bg-slate-900 px-4 sm:px-6 md:px-8 py-3 md:py-5 rounded-[40px] shadow-lg border border-indigo-500/20 dark:border-slate-700 flex items-center gap-3 sm:gap-4 md:gap-6 lg:gap-8 bg-white/90 dark:bg-slate-900/90 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
              <div className="flex flex-col">
                 <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase">تم تحديد</span>
                 <span className="text-indigo-500 font-black text-xl">{selectedIds.size} <span className="text-xs">طلب</span></span>
              </div>
              
              <div className="w-px h-10 bg-gray-100 dark:bg-slate-800"></div>
              
              {isShippingFilter && (() => {
                const selectedOrders = orders.filter(o => selectedIds.has(o.id));
                const commonTransitions = new Map<string, { label: string; nextStatus: string; color: string }>();
                selectedOrders.forEach(o => {
                  getTransitions(o.status).forEach(t => {
                    if (!commonTransitions.has(t.nextStatus)) {
                      commonTransitions.set(t.nextStatus, { label: t.label, nextStatus: t.nextStatus, color: t.btnClass.split(' ')[0] });
                    }
                  });
                });
                if (commonTransitions.size > 0) return (
                  <div className="flex gap-2 items-center">
                    {Array.from(commonTransitions.values()).map(t => (
                      <button
                        key={t.nextStatus}
                        onClick={() => {
                          if (window.confirm(`تحديث حالة ${selectedIds.size} طلب إلى "${t.label}"؟`)) {
                            const ids = Array.from(selectedIds);
                            if (onUpdateMultipleStatus) onUpdateMultipleStatus(ids, t.nextStatus);
                            else ids.forEach(id => onUpdateStatus(id, t.nextStatus));
                            setSelectedIds(new Set());
                          }
                        }}
                        className={`${t.color} text-white px-4 py-2.5 rounded-2xl font-black text-xs shadow-md`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                );
                return null;
              })()}

              <div className="flex gap-4 items-center">
                <div className="relative">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsBulkStatusOpen(!isBulkStatusOpen)}
                      className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all duration-200 shadow-lg active:scale-95 ${isBulkStatusOpen ? 'bg-white text-indigo-500 border border-indigo-500/20' : 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white'}`}
                    >
                      تغيير الحالة ({selectedIds.size})
                      <ChevronUp size={16} className={`transition-transform duration-300 ${isBulkStatusOpen ? 'rotate-180' : ''}`} />
                    </motion.button>
                    
                    <PopupSheet
                      isOpen={isBulkStatusOpen}
                      onClose={() => setIsBulkStatusOpen(false)}
                      className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-64 bg-white dark:bg-slate-800 rounded-[32px] shadow-lg border border-gray-100 dark:border-slate-700 p-3 z-[70]"
                      title="اختر الحالة الجديدة"
                    >
                      <div className="fixed inset-0 z-[-1]" onClick={() => setIsBulkStatusOpen(false)} />
                      <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
                         <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-3">اختر الحالة الجديدة</div>
                         {Object.values(OrderStatus).map(status => (
                             <button 
                               key={status}
                               onClick={() => {
                                  if (window.confirm(`هل أنت متأكد من تغيير حالة ${selectedIds.size} طلب إلى "${status}"؟`)) {
                                      const ids = Array.from(selectedIds);
                                      if (onUpdateMultipleStatus) {
                                          onUpdateMultipleStatus(ids, status);
                                      } else {
                                          ids.forEach(id => onUpdateStatus(id, status));
                                      }
                                      setSelectedIds(new Set());
                                      setIsBulkStatusOpen(false);
                                  }
                               }}
                               className="w-full text-right px-4 py-3 rounded-2xl text-[11px] font-black text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200 flex items-center justify-between group/item"
                             >
                                <span className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${getStatusStyle(status).split(' ')[0]}`}></div>
                                  {status}
                                </span>
                                <ChevronDown size={12} className="opacity-0 group-hover/item:opacity-100 -rotate-90 transition-opacity duration-200" />
                             </button>
                         ))}
                      </div>
                      {/* Connector Arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-slate-800 rotate-45 -mt-2 border-r border-b border-gray-100 dark:border-slate-700"></div>
                    </PopupSheet>
                </div>

                {canManageOrders && (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsBatchEditOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl font-black hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors duration-200 border border-emerald-100 dark:border-emerald-900/30 active:scale-95"
                >
                  <Pencil size={20} />
                  تعديل جماعي
                </motion.button>
                )}

                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsExportSettingsOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all duration-200 shadow-lg active:scale-95"
                >
                  <Download size={20} />
                  تصدير
                </motion.button>

                {canManageOrders && (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-black hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors duration-200 border border-red-100 dark:border-red-900/30 active:scale-95"
                >
                  <Trash2 size={20} />
                  حذف
                </motion.button>
                )}

                <motion.button 
                  whileHover={{ scale: 1.05, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedIds(new Set())}
                  className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-gray-500 rounded-2xl hover:text-red-500 transition-all duration-200 active:scale-95"
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
        entityName="طلب"
        fields={batchOrderFields}
        onSave={(updates) => {
          onBatchUpdateOrders(Array.from(selectedIds), updates);
          setSelectedIds(new Set());
        }}
      />

      <InvoicePrintModal
        isOpen={isInvoicePrintOpen || !!singlePrintOrderId}
        onClose={() => { setIsInvoicePrintOpen(false); setSinglePrintOrderId(null); }}
        orders={singlePrintOrderId
          ? orders.filter(o => o.id === singlePrintOrderId)
          : orders.filter(o => selectedIds.has(o.id))
        }
        branding={branding}
        invoiceSettings={invoiceSettings}
      />

      <WaybillPrintModal
        isOpen={waybillModalOpen}
        onClose={() => setWaybillModalOpen(false)}
        orders={waybillOrders}
        branding={branding}
        invoiceSettings={invoiceSettings}
      />

      {viewingCustomerFromOrder && (
        <CustomerDetail
          customer={viewingCustomerFromOrder}
          orders={viewingCustomerOrders}
          onClose={() => setViewingCustomerFromOrder(null)}
          onEdit={() => setViewingCustomerFromOrder(null)}
          onDelete={() => setViewingCustomerFromOrder(null)}
        />
      )}

    </motion.div>
  );
};

export default React.memo(Orders);
