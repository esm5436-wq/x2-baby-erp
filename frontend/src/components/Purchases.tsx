import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { API_BASE } from '../lib/api';
import { 
  Plus, 
  Search, 
  ShoppingBag, 
  Calendar, 
  User, 
  Hash, 
  CreditCard, 
  Trash2, 
  ChevronRight,
  Package,
  ArrowRight,
  Upload,
  TrendingDown,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  FileText,
  Code,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';
import { Product, Supplier, PurchaseInvoice, PurchaseInvoiceItem, Category, Branding } from '../types';
import { formatDate } from '../lib/formatDate';
import { variantLabel as vLabel, variantSizeOrDash } from '../lib/variantLabel';
import ProductModal from './ProductModal';
import ContactModal from './ContactModal';
import { exportToExcel, exportToPDF, exportToHTML, exportToCSV, exportToJSON } from '../lib/exportService';
import { compressImage } from '../lib/imageUtils';
import { useImageDropZone } from '../lib/useImageDropZone';
import { Globe } from 'lucide-react';
import { MD3Button, MD3IconButton } from './md3';
import { MD3EmptyState, MD3Badge } from './md3';
import PopupSheet from './PopupSheet';

interface PurchasesProps {
  products: Product[];
  categories: Category[];
  branding?: Branding;
  suppliers: Supplier[];
  contacts?: any[];
  onRefresh: () => void;
  onSaveProduct: (p: Product) => void;
}

const EXPENSE_CATEGORIES = [
  '🛒 عمولة منصة',
  '📢 إعلانات رقمية',
  '📦 تغليف وشحن',
  '🔄 مرتجعات واستبدال',
  '📸 تجهيز منتجات',
  '💻 برمجيات واشتراكات',
  '🏢 إيجار وصيانة',
  '👥 رواتب وعمالة',
  '⚡ خدمات ومرافق',
  '📋 أخرى'
];

const Purchases: React.FC<PurchasesProps> = ({ products, categories, branding, suppliers: initialSuppliers, contacts: initialContacts, onRefresh, onSaveProduct }) => {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [contacts, setContacts] = useState<any[]>(initialContacts || []);
  useEffect(() => {
    setSuppliers(initialSuppliers);
  }, [initialSuppliers]);
  useEffect(() => {
    setContacts(initialContacts || []);
  }, [initialContacts]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [view, setView] = useState<'list' | 'create'>('list');
  const [transactionType, setTransactionType] = useState<'inventory' | 'expense'>('inventory');
  const [isLoading, setIsLoading] = useState(false);
  
  // Create Expense State (Shared logic with Accounts but here for unified entry)
  const [expenseForm, setExpenseForm] = useState({ 
    amount: '', 
    category: 'أخرى', 
    description: '',
    date: new Date().toLocaleDateString('sv-SE'),
    beneficiary_id: ''
  });

  // Create Invoice State
  const [newInvoice, setNewInvoice] = useState<Partial<PurchaseInvoice>>({
    id: `pi-${Date.now()}`,
    supplierId: '',
    invoiceNumber: '',
    date: new Date().toLocaleDateString('sv-SE'),
    paymentMethod: 'نقد',
    items: [],
    totalAmount: 0
  });

  const [showContactModal, setShowContactModal] = useState(false);
  const [contactSpecializations, setContactSpecializations] = useState<string[]>([]);
  
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [itemForm, setItemForm] = useState({ quantity: 1, buyPrice: 0 });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [invRes, supRes, expRes, conRes] = await Promise.all([
        fetch(`${API_BASE}/purchase-invoices`),
        fetch(`${API_BASE}/suppliers`),
        fetch(`${API_BASE}/expenses`),
        fetch(`${API_BASE}/contacts`)
      ]);
      const invData = await invRes.json();
      const supData = await supRes.json();
      const expData = await expRes.json();
      setInvoices(invData);
      setSuppliers(supData);
      setExpenses(expData);
      if (conRes.ok) setContacts(await conRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateInvoice = async () => {
    if (transactionType === 'expense') {
      if (!expenseForm.amount) {
        alert('الرجاء إدخال المبلغ');
        return;
      }
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE}/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(expenseForm.amount),
            category: expenseForm.category,
            description: expenseForm.description,
            date: expenseForm.date,
            beneficiary_id: expenseForm.beneficiary_id || null
          })
        });
        if (response.ok) {
          setView('list');
          fetchData();
          onRefresh();
          setExpenseForm({ amount: '', category: 'أخرى', description: '', date: new Date().toLocaleDateString('sv-SE'), beneficiary_id: '' });
        }
      } catch (error) {
        console.error('Error saving expense:', error);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!newInvoice.supplierId || (newInvoice.items?.length || 0) === 0) {
      alert('الرجاء اختيار مورد وإضافة أصناف للفاتورة');
      return;
    }

    try {
      setIsLoading(true);
      const supplierName = suppliers.find(s => s.id === newInvoice.supplierId)?.name || contacts.find(c => c.id === newInvoice.supplierId)?.companyName;
      const payload = { ...newInvoice, supplierName };
      
      const response = await fetch(`${API_BASE}/purchase-invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setView('list');
        fetchData();
        onRefresh();
        setNewInvoice({
          id: `pi-${Date.now()}`,
          supplierId: '',
          invoiceNumber: '',
          date: new Date().toLocaleDateString('sv-SE'),
          paymentMethod: 'نقد',
          items: [],
          totalAmount: 0
        });
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (window.confirm('هل تريد حذف هذا المصروف؟')) {
      try {
        const response = await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
        if (response.ok) fetchData();
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  const addItemToInvoice = () => {
    if (!selectedProduct || !itemForm.quantity || !itemForm.buyPrice) return;
    
    const newItem: PurchaseInvoiceItem = {
      id: `pii-${Date.now()}`,
      invoiceId: newInvoice.id!,
      productId: selectedProduct.id,
      variantId: selectedVariantId,
      quantity: itemForm.quantity,
      buyPrice: itemForm.buyPrice
    };

    const updatedItems = [...(newInvoice.items || []), newItem];
    const total = updatedItems.reduce((sum, item) => sum + (item.quantity * item.buyPrice), 0);

    setNewInvoice(prev => ({ 
      ...prev, 
      items: updatedItems,
      totalAmount: total
    }));

    setSelectedProduct(null);
    setSelectedVariantId('');
    setItemForm({ quantity: 1, buyPrice: 0 });
    setProductSearch('');
  };

  const removeItem = (itemId: string) => {
    const updatedItems = (newInvoice.items || []).filter(i => i.id !== itemId);
    const total = updatedItems.reduce((sum, item) => sum + (item.quantity * item.buyPrice), 0);
    setNewInvoice(prev => ({ 
      ...prev, 
      items: updatedItems,
      totalAmount: total
    }));
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    const search = productSearch.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(search) ||
      p.category.toLowerCase().includes(search) ||
      (p.categories || []).some(c => c.toLowerCase().includes(search)) ||
      p.tags?.some(t => t.toLowerCase().includes(search))
    ).slice(0, 5);
  }, [products, productSearch]);

  const [listSearch, setListSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'inventory' | 'expense'>('all');
  
  const [sortField, setSortField] = useState<string>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPurchases = async (format: 'excel' | 'pdf' | 'html' | 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const fileName = `purchases_export_${Date.now()}`;
      const sheetName = 'المشتريات والمصروفات';
      const title = `سجل المشتريات والمصروفات - ${new Date().toLocaleDateString('ar-EG')}`;

      const totalAmount = filteredList.reduce((sum, item) => sum + (item.totalAmount || item.amount), 0);

      const summaryData = [
        { label: 'عدد العمليات', value: filteredList.length.toString() },
        { label: 'إجمالي المبالغ', value: formatCurrency(totalAmount), color: 'red' },
        { label: 'متوسط العملية', value: formatCurrency(filteredList.length > 0 ? totalAmount / filteredList.length : 0) },
      ];

      const excelColumns = [
        { header: 'النوع', key: 'typeLabel', width: 15 },
        { header: 'المورد / التصنيف', key: 'name', width: 30 },
        { header: 'البيان', key: 'description', width: 35 },
        { header: 'التاريخ', key: 'date', width: 22 },
        { header: 'المبلغ', key: 'amount', width: 18 },
      ];

      const exportData = filteredList.map(item => ({
        typeLabel: item.type === 'inventory' ? 'بضاعة' : 'مصروف',
        name: item.type === 'inventory' ? (item as any).supplier_name : (item.category || ''),
        description: item.type === 'inventory' ? (item.invoiceNumber || '') : (item.description || ''),
        date: new Date((item as any).date).toLocaleString('ar-EG'),
        amount: item.totalAmount || item.amount,
        amountLabel: formatCurrency(item.totalAmount || item.amount)
      }));

      if (format === 'excel') {
        await exportToExcel(exportData, fileName, sheetName, excelColumns, summaryData, branding, { user: 'المشتريات', status: 'مسجل' });
      } else if (format === 'pdf') {
        const columns = ['النوع', 'المورد / التصنيف', 'البيان', 'التاريخ', 'المبلغ'];
        const keys = ['typeLabel', 'name', 'description', 'date', 'amountLabel'];
        await exportToPDF(exportData, fileName, title, columns, keys, undefined, summaryData, branding);
      } else if (format === 'html') {
        const columns = ['النوع', 'المورد / التصنيف', 'البيان', 'التاريخ', 'المبلغ'];
        const keys = ['typeLabel', 'name', 'description', 'date', 'amountLabel'];
        exportToHTML(exportData, fileName, 'عرض سجل المشتريات التفاعلي', columns, keys, branding);
      } else if (format === 'csv') {
        const columns = ['Type', 'Name', 'Description', 'Date', 'Amount'];
        const keys = ['typeLabel', 'name', 'description', 'date', 'amount'];
        exportToCSV(exportData, fileName, columns, keys);
      } else if (format === 'json') {
        exportToJSON(exportData, fileName);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredList = useMemo(() => {
    let combined = [
      ...invoices.map(inv => ({ ...inv, type: 'inventory' })),
      ...expenses.filter(e => e.category !== 'مشتريات مخزون (Inventory)').map(e => ({ ...e, type: 'expense', date: e.created_at }))
    ];
    
    if (filterType !== 'all') {
      combined = combined.filter(item => item.type === filterType);
    }
    
    if (listSearch) {
      const s = listSearch.toLowerCase();
      combined = combined.filter(item => {
        const name = (item.type === 'inventory' ? (item as any).supplier_name : (item.category || '')).toLowerCase();
        const desc = (item.type === 'inventory' ? (item.invoiceNumber || '') : (item.description || '')).toLowerCase();
        return name.includes(s) || desc.includes(s);
      });
    }
    
    return combined.sort((a, b) => {
      let va: any, vb: any;
      switch (sortField) {
        case 'totalAmount': va = a.totalAmount ?? a.amount ?? 0; vb = b.totalAmount ?? b.amount ?? 0; break;
        case 'type': va = a.type || ''; vb = b.type || ''; break;
        default: va = a.date || ''; vb = b.date || '';
      }
      if (typeof va === 'number' && typeof vb === 'number') return sortAsc ? va - vb : vb - va;
      return sortAsc ? (va || '').localeCompare(vb || '') : (vb || '').localeCompare(va || '');
    });
  }, [invoices, expenses, listSearch, filterType, sortField, sortAsc]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const handleInvoiceFile = async (files: File[] | FileList | null) => {
    const file = files?.[0];
    if (file) {
      try {
        const base64 = await compressImage(file, 800, 0.7);
        setNewInvoice(prev => ({ ...prev, image: base64 }));
      } catch (err) {
        console.error('Error compressing image', err);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleInvoiceFile(e.target.files);
  };

  const { isDragging: invoiceDragging, dropProps: invoiceDropProps } = useImageDropZone(handleInvoiceFile);

  return (
    <AnimatePresence mode="wait">
      {view === 'create' ? (
        <motion.div 
          key="create-view"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="space-y-6 pb-20"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <motion.button 
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setView('list')}
              className="flex items-center gap-2 text-gray-400 dark:text-gray-500 hover:text-accent font-black transition-colors duration-200"
            >
              <ArrowRight size={20} />
              العودة للسجل
            </motion.button>
            
            <div className="flex flex-wrap bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
              <button 
                onClick={() => setTransactionType('inventory')}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-colors duration-200 flex-1 min-w-[140px] ${transactionType === 'inventory' ? 'bg-white dark:bg-slate-700 text-accent shadow-sm' : 'text-gray-400 dark:text-gray-500'}`}
              >
                شراء بضاعة (مورد)
              </button>
              <button 
                onClick={() => setTransactionType('expense')}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-colors duration-200 flex-1 min-w-[140px] ${transactionType === 'expense' ? 'bg-white dark:bg-slate-700 text-accent shadow-sm' : 'text-gray-400 dark:text-gray-500'}`}
              >
                مصروف عام (نثرية)
              </button>
            </div>

            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              {transactionType === 'inventory' ? 'تسجيل فاتورة بضاعة' : 'تسجيل مصروف جديد'}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {transactionType === 'inventory' ? (
                <>
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-2">
                          <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">المورد</label>
                          <div className="flex gap-1">
                            <button onClick={() => { fetch(`${API_BASE}/contacts/specializations`).then(r => r.json()).then(setContactSpecializations).catch(() => {}); setShowContactModal(true); }} className="text-[10px] font-black text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 px-2 py-1 rounded-lg transition-colors duration-200 border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                              <Plus size={12} /> إضافة جهة
                            </button>
                          </div>
                        </div>
                        <select value={newInvoice.supplierId} onChange={(e) => setNewInvoice(prev => ({ ...prev, supplierId: e.target.value }))} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-sm">
                          <option value="">اختر المورد...</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.phone ? `(${s.phone})` : ''}</option>)}
                          {contacts.filter(c => c.entityType === 'مصنع' || c.entityType === 'تاجر جملة').map(c => <option key={c.id} value={c.id}>{c.companyName}{c.contactPerson ? ` - ${c.contactPerson}` : ''} ({c.phone})</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 dark:text-gray-500 px-2 uppercase tracking-widest">تاريخ الشراء</label>
                        <input type="date" value={newInvoice.date} onChange={(e) => setNewInvoice(prev => ({ ...prev, date: e.target.value }))} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 dark:text-gray-500 px-2 uppercase tracking-widest">رقم الفاتورة الورقية</label>
                        <input type="text" placeholder="اختياري..." value={newInvoice.invoiceNumber} onChange={(e) => setNewInvoice(prev => ({ ...prev, invoiceNumber: e.target.value }))} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 dark:text-gray-500 px-2 uppercase tracking-widest">طريقة الدفع</label>
                        <select value={newInvoice.paymentMethod} onChange={(e) => setNewInvoice(prev => ({ ...prev, paymentMethod: e.target.value as any }))} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-sm">
                          <option value="نقد">نقد (كاش)</option>
                          <option value="آجل">آجل</option>
                          <option value="تحويل بنكي">تحويل بنكي</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-sm border border-gray-100 dark:border-slate-800"
                  >
                    <div className="p-8 border-b border-gray-50 dark:border-slate-800"><h3 className="font-black text-lg text-gray-900 dark:text-white">الأصناف المشتراة</h3></div>
                    <div className="p-4 bg-gray-50/50 dark:bg-slate-800/30">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-5 relative">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 block">البحث عن منتج</label>
                            <button onClick={() => setShowProductModal(true)} className="text-[10px] font-black text-accent hover:underline">إضافة منتج جديد +</button>
                          </div>
                          <input type="text" placeholder="اسم المنتج..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm" />
                          <PopupSheet
                            isOpen={filteredProducts.length > 0 && !selectedProduct}
                            onClose={() => setProductSearch('')}
                            className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-md rounded-xl z-20 overflow-hidden divide-y divide-gray-50 dark:divide-slate-800/50"
                            title="منتجات مطابقة"
                          >
                              {filteredProducts.map(p => (
                                <button key={p.id} onClick={() => { setSelectedProduct(p); setProductSearch(p.name); if (p.variants.length === 1) setSelectedVariantId(p.variants[0].id); setItemForm(prev => ({ ...prev, buyPrice: p.wholesalePrice || p.costPrice || 0 })); }} className="w-full text-right p-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"><span className="font-black text-sm">{p.name}</span></button>
                              ))}
                          </PopupSheet>
                        </div>
                        <div className="md:col-span-2">
                           <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 mb-1 block">المتغير</label>
                           <select value={selectedVariantId} onChange={(e) => setSelectedVariantId(e.target.value)} disabled={!selectedProduct} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm disabled:opacity-50">
                            <option value="">اختر...</option>
                            {selectedProduct?.variants.map(v => <option key={v.id} value={v.id}>{vLabel(v)}</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-2"><label className="text-[10px] font-black text-gray-400 dark:text-gray-500 mb-1 block">الكمية</label><input type="number" value={itemForm.quantity} onChange={(e) => setItemForm(prev => ({ ...prev, quantity: Number(e.target.value) }))} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm" /></div>
                        <div className="md:col-span-2">
                          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 mb-1 block">سعر الشراء</label>
                          <input type="number" value={itemForm.buyPrice} onChange={(e) => setItemForm(prev => ({ ...prev, buyPrice: Number(e.target.value) }))} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm" />
                          {itemForm.buyPrice > 0 && (
                            <div className="mt-1 px-1 flex flex-col gap-0.5">
                              <div className="flex items-center gap-1 text-accent animate-pulse-slow">
                                <Sparkles size={10} />
                                <span className="text-[8px] font-black">مقترح البيع: {Math.ceil((itemForm.buyPrice * 1.45) / 5) * 5 - 1} ج.م</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="md:col-span-1"><MD3IconButton icon={<Plus size={20} />} onClick={addItemToInvoice} variant="filled" /></div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-right"><thead className="text-[10px] font-black text-gray-400 dark:text-gray-500 border-b border-gray-50 dark:border-slate-800"><tr><th className="p-5">المنتج</th><th className="p-5">المتغير</th><th className="p-5 text-center">الكمية</th><th className="p-5 text-center">الإجمالي</th><th className="p-5"></th></tr></thead><tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">{(newInvoice.items || []).map(item => { const prod = products.find(p => p.id === item.productId); return (<tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30"><td className="p-5 font-black text-sm">{prod?.name}</td><td className="p-5 text-xs text-gray-500 font-bold">{variantSizeOrDash(prod?.variants.find(v => v.id === item.variantId))}</td><td className="p-5 text-center font-black">{item.quantity}</td><td className="p-5 text-center font-black text-accent">{formatCurrency(item.quantity * item.buyPrice)}</td><td className="p-5 text-center"><button onClick={() => removeItem(item.id)} className="text-gray-500 dark:text-gray-400 hover:text-red-500"><Trash2 size={16} /></button></td></tr>)})}</tbody></table>
                    </div>
                  </motion.div>
                </>
              ) : (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 dark:text-gray-500 px-2 uppercase tracking-widest">نوع المصروف</label>
                      <select 
                        value={expenseForm.category} 
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-sm"
                      >
                        {EXPENSE_CATEGORIES.map(cat => (
                          <option key={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 dark:text-gray-500 px-2 uppercase tracking-widest">التاريخ</label>
                      <input 
                        type="date" 
                        value={expenseForm.date} 
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 dark:text-gray-500 px-2 uppercase tracking-widest">المبلغ</label>
                      <input 
                        type="number" 
                        placeholder="0.00" 
                        value={expenseForm.amount} 
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 dark:text-gray-500 px-2 uppercase tracking-widest">وصف أو ملاحظة</label>
                      <input 
                        type="text" 
                        placeholder="مثال: فاتورة إعلانات فيسبوك..." 
                        value={expenseForm.description} 
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 dark:text-gray-500 px-2 uppercase tracking-widest">الجهة المستفيدة</label>
                      <select
                        value={expenseForm.beneficiary_id}
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, beneficiary_id: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-sm"
                      >
                        <option value="">اختر جهة (اختياري)...</option>
                        {contacts.map(c => (
                          <option key={c.id} value={c.id}>{c.companyName}{c.contactPerson ? ` - ${c.contactPerson}` : ''} {c.phone ? `(${c.phone})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
            <div className="space-y-6">
              <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 block mb-6 uppercase tracking-wider">
                  {transactionType === 'inventory' ? 'صورة الفاتورة الورقية' : 'صورة الإيصال'}
                </label>
                <div onClick={() => document.getElementById('invoice-img')?.click()} {...invoiceDropProps} title="انقر للاختيار أو اسحب الصورة وأفلتها هنا" className={`aspect-square rounded-[24px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer group transition-all duration-200 overflow-hidden relative ${invoiceDragging ? 'border-accent bg-accent/10' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-accent'}`}>
                  {newInvoice.image ? <img src={newInvoice.image} className="w-full h-full object-cover" /> : <Upload className={`group-hover:text-accent transition-colors ${invoiceDragging ? 'text-accent scale-110' : 'text-gray-500 dark:text-gray-400'}`} size={32} />}
                  {invoiceDragging && !newInvoice.image && <span className="absolute bottom-3 text-[10px] font-black text-accent">أفلت الصورة هنا</span>}
                  <input type="file" id="invoice-img" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center italic">انقر لاختيار صورة، أو اسحبها من جهازك وأفلتها في المربع مباشرة.</p>
              </motion.div>
              <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="p-8 rounded-[32px] shadow-md space-y-6" style={{ backgroundColor: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)' }}>
                <div className="space-y-1">
                  <span className="text-[10px] font-black opacity-60 uppercase">المبلغ الإجمالي</span>
                  <h3 className="text-2xl sm:text-4xl font-black italic break-words leading-tight">
                    {formatCurrency(transactionType === 'inventory' ? (newInvoice.totalAmount || 0) : Number(expenseForm.amount || 0))}
                  </h3>
                </div>
                <MD3Button variant="filled" fullWidth onClick={handleCreateInvoice} disabled={isLoading}>
                  {isLoading ? 'جاري الحفظ...' : (transactionType === 'inventory' ? 'حفظ الفاتورة وتحديث المخزن' : 'حفظ وتسجيل المصروف')}
                </MD3Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          key="list-view"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2 rounded-2xl shadow-lg" style={{ backgroundColor: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
                  <ShoppingBag size={24} />
                </div>
                حركة المشتريات
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-bold mt-1 mr-12">إدارة الموردين وتوريدات المنتجات</p>
            </motion.div>
            
            <div className="flex flex-wrap gap-2">
              <MD3IconButton
                icon={<FileSpreadsheet size={18} />}
                onClick={() => handleExportPurchases('excel')}
                disabled={isExporting}
                variant="tonal"
                title="تصدير Excel"
              />
              <MD3IconButton
                icon={<Printer size={18} />}
                onClick={() => handleExportPurchases('pdf')}
                disabled={isExporting}
                variant="filled"
                title="تصدير PDF"
              />
              <MD3IconButton
                icon={<Globe size={18} />}
                onClick={() => handleExportPurchases('html')}
                disabled={isExporting}
                variant="standard"
                title="تصدير ويب تفاعلي"
              />
              <MD3IconButton
                icon={<FileText size={18} />}
                onClick={() => handleExportPurchases('csv' as any)}
                disabled={isExporting}
                variant="outlined"
                title="تصدير CSV"
              />
              <MD3IconButton
                icon={<Code size={18} />}
                onClick={() => handleExportPurchases('json' as any)}
                disabled={isExporting}
                variant="outlined"
                title="تصدير JSON"
              />
              <MD3Button
                variant="filled"
                icon={<Plus size={20} />}
                onClick={() => setView('create')}
              >
                تسجيل مصروف / مشتريات
              </MD3Button>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <h3 className="font-black text-lg text-gray-900 dark:text-white">سجل العمليات المالية (الصرف)</h3>
              
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={14} />
                  <input 
                    type="text" 
                    placeholder="بحث في السجل..." 
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    className="pr-9 pl-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-[11px] font-bold outline-none focus:border-accent w-48"
                  />
                </div>
                
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-[11px] font-black outline-none cursor-pointer"
                >
                  <option value="all">الكل</option>
                  <option value="inventory">بضاعة</option>
                  <option value="expense">مصروفات</option>
                </select>
                
                <div className="relative">
                  <select 
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value)}
                    className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-[11px] font-black outline-none cursor-pointer appearance-none"
                  >
                    <option value="date">التاريخ</option>
                    <option value="totalAmount">المبلغ</option>
                    <option value="type">النوع</option>
                  </select>
                  <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                </div>
                <button onClick={() => setSortAsc(p => !p)} className={`px-3 py-2 rounded-xl flex items-center gap-1.5 font-black text-[11px] transition-colors duration-200 ${sortAsc ? 'bg-accent text-white' : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-slate-700'}`} title={sortAsc ? 'تصاعدي' : 'تنازلي'}>
                  <ArrowUpDown size={14} /> {sortAsc ? '▲' : '▼'}
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-50 dark:border-slate-800">
                  <tr>
                    <th className="p-5 font-black">النوع / المورد</th>
                    <th className="p-5 font-black">البيان / الفاتورة</th>
                    <th className="p-5 text-center font-black">التاريخ</th>
                    <th className="p-5 text-center font-black">الإضافة</th>
                    <th className="p-5 text-center font-black">آخر تعديل</th>
                    <th className="p-5 text-center font-black">التصنيف</th>
                    <th className="p-5 text-center font-black text-red-600 dark:text-red-400">المبلغ</th>
                    <th className="p-5"></th>
                  </tr>
                </thead>
                <motion.tbody 
                  initial="hidden" 
                  animate="show" 
                  key={`${filterType}-${listSearch}`}
                  variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }} 
                  className="divide-y divide-gray-50 dark:divide-slate-800/50"
                >
                  {filteredList.map((item) => (
                    <motion.tr variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} key={item.id} className="group hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors duration-200">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${item.type === 'inventory' ? 'bg-accent/10 text-accent' : 'bg-red-50 dark:bg-red-900/20 text-red-500'}`}>
                            {item.type === 'inventory' ? <ShoppingBag size={14} /> : <TrendingDown size={14} />}
                          </div>
                          <span className="font-bold text-sm text-gray-900 dark:text-white">
                            {item.type === 'inventory' ? (item as any).supplier_name : (item.category || 'مصروف عام')}
                          </span>
                        </div>
                      </td>
                      <td className="p-5 text-xs text-gray-500 font-bold">
                        {item.type === 'inventory' ? (item.invoiceNumber || 'فاتورة بضاعة') : (item.description || 'لا يوجد وصف')}
                      </td>
                      <td className="p-5 text-center text-xs font-bold text-gray-400 dark:text-gray-500">
                        {new Date((item as any).date).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="p-5 text-center text-[10px] font-bold text-gray-300 dark:text-gray-600">
                        {(item as any).createdAt ? formatDate((item as any).createdAt, 'date') : '—'}
                      </td>
                      <td className="p-5 text-center text-[10px] font-bold text-gray-300 dark:text-gray-600">
                        {(item as any).updatedAt ? formatDate((item as any).updatedAt, 'date') : '—'}
                      </td>
                      <td className="p-5 text-center">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${item.type === 'inventory' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                          {item.type === 'inventory' ? 'مشتريات مخزن' : 'مصروفات تشغيل'}
                        </span>
                      </td>
                      <td className="p-5 text-center font-black text-sm text-red-600 dark:text-red-400">
                        {formatCurrency(item.totalAmount || item.amount)}
                      </td>
                      <td className="p-5 text-center">
                        {item.type === 'expense' ? (
                          <button onClick={() => handleDeleteExpense(item.id)} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-colors duration-200"><Trash2 size={14} /></button>
                        ) : (
                          <ChevronRight size={16} className="text-gray-500 dark:text-gray-400 group-hover:text-accent transition-colors duration-200" />
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
              {filteredList.length === 0 && (
                <MD3EmptyState
                  icon={<ShoppingBag size={40} />}
                  title="لا توجد عمليات تطابق البحث"
                />
              )}
            </div>
          </div>
        </motion.div>
      )}

      {showProductModal && (
        <ProductModal 
          categories={categories}
          suppliers={suppliers}
          contacts={contacts}
          onClose={() => setShowProductModal(false)}
          onSave={(p) => { 
            onSaveProduct(p); 
            setSelectedProduct(p);
            setProductSearch(p.name);
            if (p.variants && p.variants.length === 1) {
              setSelectedVariantId(p.variants[0].id);
            }
            setItemForm(prev => ({ ...prev, buyPrice: p.wholesalePrice || p.costPrice || 0 }));
            setShowProductModal(false); 
          }}
          onDeleteAction={() => {}}
          product={{ 
            id: `p-${Date.now()}`, 
            name: '', 
            category: categories[0] || 'عام', 
            price: 0, 
            costPrice: 0, 
            wholesalePrice: 0, 
            packagingCost: 0, 
            image: '', 
            url: '', 
            supplierId: newInvoice.supplierId || '',
            variants: [{ id: 'v-1', size: 'واحد', color: 'متعدد', quantity: 0, price: 0, lowStockThreshold: 2 }] 
          } as any}
        />
      )}

      {showContactModal && (
        <ContactModal
          specializations={contactSpecializations}
          onClose={() => setShowContactModal(false)}
          onSave={async (data) => {
            try {
              await fetch(`${API_BASE}/contacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });
              setShowContactModal(false);
              setContactSpecializations([]);
              const res = await fetch(`${API_BASE}/contacts`);
              if (res.ok) setContacts(await res.json());
            } catch (err) {
              console.error('Failed to save contact:', err);
            }
          }}
        />
      )}
    </AnimatePresence>
  );
};

export default Purchases;
