import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Layers,
  Target,
  Zap,
  BarChart2,
  Calendar,
  ShoppingBag,
  AlertCircle,
  Plus,
  Trash2,
  Filter,
  Save,
  HelpCircle,
  Info,
  Package,
  Sparkles,
  CheckCircle2,
  Printer,
  RefreshCw,
  Globe,
  FileText,
  Code,
  ChevronDown,
  Download
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  ReferenceDot,
  AreaChart,
  Area,
  ComposedChart,
  Legend
} from 'recharts';
import { Order, OrderStatus, Product, FinancialTarget, Branding } from '../types';
import { exportToExcel, exportToPDF, exportToHTML, exportToCSV, exportToJSON } from '../lib/exportService';

interface AccountsProps {
  orders: Order[];
  products: Product[];
  contacts?: any[];
  branding?: Branding;
  targets: FinancialTarget[];
  taxEnabled: boolean;
  taxRate: number;
  onSaveTarget: (target: FinancialTarget) => void;
  onDeleteTarget: (id: string) => void;
}

interface ProductStats {
  name: string;
  id: string;
  isDeleted: boolean;
  totalSold: number;
  revenue: number;
  profit: number;
}

interface FinancialData {
  totalSales: number;
  totalCOGS: number;
  grossProfit: number;
  totalOPEX: number;
  netProfit: number;
  profitMargin: number;
  ordersCount: number;
  lifetimeTotalSpend?: number;
  lifetimeSales?: number;
}

interface Expense {
  id: number;
  amount: number;
  category: string;
  description: string;
  created_at: string;
}

const Accounts: React.FC<AccountsProps> = ({ 
  orders, 
  products, 
  contacts: initialContacts,
  branding,
  targets, 
  taxEnabled, 
  taxRate, 
  onSaveTarget, 
  onDeleteTarget 
}) => {
  const [contacts] = useState<any[]>(initialContacts || []);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'month' | 'custom'>('month');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [financialData, setFinancialData] = useState<FinancialData>({
    totalSales: 0,
    totalCOGS: 0,
    grossProfit: 0,
    totalOPEX: 0,
    netProfit: 0,
    profitMargin: 0,
    ordersCount: 0,
    lifetimeTotalSpend: 0,
    lifetimeSales: 0
  });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState<FinancialTarget | null>(null);
  
  const [targetForm, setTargetForm] = useState({
    title: '',
    amount: '',
    startDate: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    category: 'net_profit' as 'net_profit' | 'total_sales'
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [activeExplainModal, setActiveExplainModal] = useState<{
    title: string;
    description: string;
    example: string;
    safetyRule: string;
    color: string;
    icon: React.ReactNode;
  } | null>(null);

  const API_BASE = '/api';

  const fetchFinancialData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      let start = dateRange.start;
      let end = dateRange.end;

      if (dateFilter === 'today') {
        const now = new Date();
        start = now.toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
      } else if (dateFilter === 'month') {
        const now = new Date();
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      }

      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);

      // طلب بيانات الفلتر الحالي
      const [finRes, expRes] = await Promise.all([
        fetch(`${API_BASE}/financial-summary?${params}`),
        fetch(`${API_BASE}/expenses?${params}`)
      ]);
      
      const finData = await finRes.json();
      const expData = await expRes.json();
      
      setFinancialData(finData);
      
      // تطبيق الضريبة إذا كانت مفعلة لبيانات الفلتر
      if (taxEnabled && taxRate > 0) {
        setFinancialData(prev => {
          const preTaxProfit = prev.netProfit;
          const taxAmount = preTaxProfit > 0 ? (preTaxProfit * (taxRate / 100)) : 0;
          return {
            ...prev,
            netProfit: preTaxProfit - taxAmount,
            taxAmount: taxAmount
          };
        });
      }

      setExpenses(expData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, [dateFilter, dateRange]);

  const handleSaveTargetAction = () => {
    if (!targetForm.title || !targetForm.amount) return;
    const target: FinancialTarget = {
      id: editingTarget?.id || `target-${Date.now()}`,
      title: targetForm.title,
      amount: parseFloat(targetForm.amount),
      startDate: targetForm.startDate,
      deadline: targetForm.deadline,
      category: targetForm.category,
      createdAt: editingTarget?.createdAt || new Date().toISOString()
    };
    onSaveTarget(target);
    setShowTargetModal(false);
    setEditingTarget(null);
    setTargetForm({
      title: '',
      amount: '',
      startDate: new Date().toISOString().split('T')[0],
      deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      category: 'net_profit'
    });
  };

  const openEditTarget = (target: FinancialTarget) => {
    setEditingTarget(target);
    setTargetForm({
      title: target.title,
      amount: target.amount.toString(),
      startDate: target.startDate || target.createdAt.split('T')[0],
      deadline: target.deadline,
      category: target.category
    });
    setShowTargetModal(true);
  };

  // بيانات الرسم البياني لنقطة التعادل
  const breakEvenChartData = useMemo(() => {
    const avgPrice = financialData.totalSales / (financialData.ordersCount || 1) || 100;
    const avgCost = financialData.totalCOGS / (financialData.ordersCount || 1) || 60;
    const fixedCosts = financialData.totalOPEX;
    
    // عدد القطع للتعادل
    const bepUnits = fixedCosts / (avgPrice - avgCost || 1);
    const maxUnits = Math.max(bepUnits * 2, (financialData.ordersCount || 0) * 1.5, 10);
    
    const data = [];
    const step = maxUnits / 5;
    
    for (let i = 0; i <= 5; i++) {
      const units = Math.round(i * step);
      data.push({
        units,
        revenue: units * avgPrice,
        totalCost: fixedCosts + (units * avgCost),
        fixedCost: fixedCosts
      });
    }
    return data;
  }, [financialData]);

  const handleDeleteExpense = async (id: number) => {
    if (window.confirm('هل تريد حذف هذا المصروف؟')) {
      try {
        const response = await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
        if (response.ok) fetchFinancialData();
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  const productPerformance = useMemo(() => {
    const perfMap = new Map<string, ProductStats>();
    
    // Filtro temporal para el rendimiento de productos basado en el dateFilter
    const activeOrders = orders.filter(o => {
      if (o.status === OrderStatus.CANCELED) return false;
      
      const orderDate = new Date(o.createdAt);
      const now = new Date();
      
      if (dateFilter === 'today') {
        return orderDate.toDateString() === now.toDateString();
      }
      if (dateFilter === 'month') {
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      }
      if (dateFilter === 'custom') {
        const start = dateRange.start ? new Date(dateRange.start) : null;
        const end = dateRange.end ? new Date(dateRange.end) : null;
        if (start && orderDate < start) return false;
        if (end) {
          const endDay = new Date(end);
          endDay.setHours(23, 59, 59, 999);
          if (orderDate > endDay) return false;
        }
      }
      return true;
    });

    activeOrders.forEach(order => {
      order.items.forEach(item => {
        if (!item.productId) return;
        const existing = perfMap.get(item.productId) || {
          name: item.productName,
          id: item.productId,
          isDeleted: !!item.isProductDeleted,
          totalSold: 0,
          revenue: 0,
          profit: 0
        };

        existing.totalSold += (item.quantity || 0);
        existing.revenue += ((item.price || 0) * (item.quantity || 0));
        existing.profit += (((item.price || 0) - (item.costPrice || 0)) * (item.quantity || 0));
        
        perfMap.set(item.productId, existing);
      });
    });

    return Array.from(perfMap.values()).sort((a, b) => b.revenue - a.revenue);
  }, [orders, dateFilter, dateRange]);

  const handleExportStats = async (format: 'excel' | 'pdf' | 'html' | 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const fileName = `financial_report_${dateFilter}_${Date.now()}`;
      const title = `تقرير الأداء المالي - ${dateFilter === 'today' ? 'اليوم' : dateFilter === 'month' ? 'هذا الشهر' : 'فترة مخصصة'}`;

      const summaryData = [
        { label: 'إجمالي المبيعات', value: formatCurrency(financialData.totalSales), color: 'blue' },
        { label: 'تكلفة المنتجات', value: formatCurrency(financialData.totalCOGS) },
        { label: 'صافي الربح', value: formatCurrency(financialData.netProfit), color: financialData.netProfit >= 0 ? 'green' : 'red' },
        { label: 'عدد الطلبات', value: financialData.ordersCount.toString() },
        { label: 'هامش الربح', value: `${financialData.profitMargin.toFixed(1)}%` },
      ];

      const productPerfData = productPerformance.map(p => ({
        name: p.name,
        sold: p.totalSold,
        revenue: p.revenue,
        profit: p.profit,
        revenueLabel: formatCurrency(p.revenue),
        profitLabel: formatCurrency(p.profit),
        margin: p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) + '%' : '0%'
      }));

      const excelColumns = [
        { header: 'اسم المنتج', key: 'name', width: 35 },
        { header: 'الكمية المباعة', key: 'sold', width: 15 },
        { header: 'الإيرادات', key: 'revenue', width: 18 },
        { header: 'الربح الصافي', key: 'profit', width: 18 },
        { header: 'نسبة الهامش', key: 'margin', width: 12 },
      ];

      if (format === 'excel') {
        await exportToExcel(productPerfData, fileName, 'الملخص المالي', excelColumns, summaryData, branding, { user: 'المحاسب', status: 'نهائي' });
      } else if (format === 'pdf') {
        const columns = ['اسم المنتج', 'المباع', 'الإيرادات', 'الربح', 'الهامش'];
        const keys = ['name', 'sold', 'revenueLabel', 'profitLabel', 'margin'];
        
        await exportToPDF(productPerfData, fileName, title, columns, keys, undefined, summaryData, branding);
      } else if (format === 'html') {
        const columns = ['اسم المنتج', 'الكمية المباعة', 'الإيرادات', 'صافي الربح', 'نسبة الهامش'];
        const keys = ['name', 'sold', 'revenueLabel', 'profitLabel', 'margin'];
        
        exportToHTML(productPerfData, fileName, 'عرض الأداء المالي التفاعلي', columns, keys, branding);
      } else if (format === 'csv') {
        const columns = ['Product', 'Sold', 'Revenue', 'Profit', 'Margin'];
        const keys = ['name', 'sold', 'revenue', 'profit', 'margin'];
        exportToCSV(productPerfData, fileName, columns, keys);
      } else if (format === 'json') {
        exportToJSON(productPerfData, fileName);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4 animate-pulse">
        <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center">
          <BarChart3 className="text-accent animate-bounce" size={32} />
        </div>
        <p className="text-sm font-black text-gray-400 dark:text-gray-500">جاري تحميل البيانات المالية...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4 pb-20"
    >
      {/* Global Explanation Modal */}
      <AnimatePresence>
        {activeExplainModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200000] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              className="absolute inset-0 cursor-pointer" 
              onClick={() => setActiveExplainModal(null)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[40px] shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden relative z-10"
            >
            <button 
              onClick={() => setActiveExplainModal(null)}
              className="absolute top-6 left-6 p-2 bg-gray-100 dark:bg-slate-800 rounded-full text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors z-20"
            >
              <Trash2 size={20} className="rotate-45" />
            </button>

            <div className="p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-${activeExplainModal.color}-100 dark:bg-${activeExplainModal.color}-900/30`}>
                  {activeExplainModal.icon}
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">{activeExplainModal.title}</h3>
                  <p className="text-xs text-gray-500 font-bold mt-0.5 uppercase tracking-widest">كن خبيراً في أرقام مشروعك</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-5 bg-gray-50 dark:bg-slate-800/50 rounded-[24px] border border-gray-100 dark:border-slate-700/50">
                  <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Info size={14} className="text-accent" />
                    ما هو هذا الرقم؟
                  </h4>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-relaxed text-right">
                    {activeExplainModal.description}
                  </p>
                </div>

                <div className="p-5 bg-blue-50 dark:bg-blue-900/10 rounded-[24px] border border-blue-100 dark:border-blue-900/30">
                  <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Zap size={14} className="fill-blue-500" />
                    مثال توضيحي
                  </h4>
                  <p className="text-sm font-bold text-blue-900 dark:text-blue-300 leading-relaxed text-right">
                    {activeExplainModal.example}
                  </p>
                </div>

                <div className="p-5 bg-emerald-50 dark:bg-emerald-900/10 rounded-[24px] border border-emerald-100 dark:border-emerald-900/30">
                  <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Target size={14} className="text-emerald-500" />
                    قاعدة الأمان المالية
                  </h4>
                  <p className="text-sm font-black text-emerald-800 dark:text-emerald-400 leading-relaxed text-right">
                    {activeExplainModal.safetyRule}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setActiveExplainModal(null)}
                className="w-full mt-8 py-4 bg-accent text-white font-black rounded-2xl shadow-lg shadow-accent/20 hover:scale-[1.02] transition-transform"
              >
                فهمت الأرقام، شكراً!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <motion.div 
              whileHover={{ rotate: 10, scale: 1.1 }}
              className="p-2 bg-accent rounded-2xl shadow-lg shadow-accent/20"
            >
              <BarChart3 className="text-white" size={24} />
            </motion.div>
            الحسابات والمالية ✨
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-bold mt-1 mr-12">تقرير الأداء المالي والمصروفات بكل حب</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-2 items-center"
        >
          <div className="flex bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-sm border border-gray-100 dark:border-slate-800">
            <button 
              onClick={() => setDateFilter('today')}
              className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${dateFilter === 'today' ? 'bg-accent text-white shadow-md' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
              اليوم
            </button>
            <button 
              onClick={() => setDateFilter('month')}
              className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${dateFilter === 'month' ? 'bg-accent text-white shadow-md' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
              هذا الشهر
            </button>
            <button 
              onClick={() => setDateFilter('all')}
              className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${dateFilter === 'all' ? 'bg-accent text-white shadow-md' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
              الكل
            </button>
            <button 
              onClick={() => setDateFilter('custom')}
              className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${dateFilter === 'custom' ? 'bg-accent text-white shadow-md' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
              مخصص
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowExportDropdown(prev => !prev)}
              onBlur={() => setTimeout(() => setShowExportDropdown(false), 200)}
              disabled={isExporting}
              className="px-4 py-3 bg-accent text-white rounded-2xl shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-xs font-black"
            >
              <Download size={16} />
              تصدير
              <ChevronDown size={14} />
            </button>
            {showExportDropdown && (
              <div className="absolute top-full left-0 mt-1 w-40 z-50">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-1.5">
                  <button onClick={() => { handleExportStats('excel'); setShowExportDropdown(false); }} className="w-full text-right px-3 py-2 rounded-xl text-[10px] font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2">
                    <BarChart2 size={14} className="text-emerald-500" /> Excel
                  </button>
                  <button onClick={() => { handleExportStats('pdf'); setShowExportDropdown(false); }} className="w-full text-right px-3 py-2 rounded-xl text-[10px] font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2">
                    <Printer size={14} className="text-red-500" /> PDF
                  </button>
                  <button onClick={() => { handleExportStats('html'); setShowExportDropdown(false); }} className="w-full text-right px-3 py-2 rounded-xl text-[10px] font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2">
                    <Globe size={14} className="text-accent" /> ويب تفاعلي
                  </button>
                  <button onClick={() => { handleExportStats('csv' as any); setShowExportDropdown(false); }} className="w-full text-right px-3 py-2 rounded-xl text-[10px] font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2">
                    <FileText size={14} className="text-slate-500" /> CSV
                  </button>
                  <button onClick={() => { handleExportStats('json' as any); setShowExportDropdown(false); }} className="w-full text-right px-3 py-2 rounded-xl text-[10px] font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2">
                    <Code size={14} className="text-slate-800" /> JSON
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {dateFilter === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 animate-in slide-in-from-top-2">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 dark:text-gray-400 mr-2">تاريخ البداية</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-3 border border-gray-100 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 dark:text-gray-400 mr-2">تاريخ النهاية</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-3 border border-gray-100 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white font-bold"
            />
          </div>
        </div>
      )}

      {/* Main KPI Cards - Reorganized for flow */}
      <motion.div 
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.08,
              delayChildren: 0.2
            }
          }
        }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6"
      >
          <motion.div 
            variants={{
              hidden: { opacity: 0, scale: 0.9, y: 20 },
              show: { opacity: 1, scale: 1, y: 0 }
            }}
            whileHover={{ y: -8, scale: 1.03, boxShadow: "0 20px 40px -10px rgba(59, 130, 246, 0.1)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveExplainModal({
              title: "إجمالي المبيعات المحققة",
              description: "هي مجموع المبالغ النقدية الكلية التي دخلت خزينة متجرك مقابل بيع المنتجات. هذا هو الدخل الخام قبل خصم أي تكاليف.",
              example: "إذا بعت 10 قطع بسعر 100 ج.م للواحدة، فإن إجمالي مبيعاتك هو 1000 ج.م.",
              safetyRule: "الأمان: يجب أن يكون هذا الرقم دائماً أكبر من (مبيعات التعادل) لضمان عدم استنزاف رأس مالك في المصاريف.",
              color: "blue",
              icon: <DollarSign size={24} className="text-blue-600" />
            })}
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 group relative cursor-pointer overflow-hidden transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <DollarSign size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest block mb-0.5">إجمالي المبيعات 💰</span>
                  <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <HelpCircle size={14} className="text-accent" />
                  </motion.div>
                </div>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black">{financialData.ordersCount} طلب</p>
              </div>
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white tabular-nums">{formatCurrency(financialData.totalSales)}</h3>
          </motion.div>

          <motion.div 
            variants={{
              hidden: { opacity: 0, scale: 0.9, y: 20 },
              show: { opacity: 1, scale: 1, y: 0 }
            }}
            whileHover={{ y: -8, scale: 1.03, boxShadow: "0 20px 40px -10px rgba(249, 115, 22, 0.1)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveExplainModal({
              title: "تكلفة المنتجات المباعة (COGS)",
              description: "يمثل هذا الرقم 'ثمن البضاعة' الأصلي الذي دفعته للمورد. هي السيولة المجمدة في المخزن والتي تحولت الآن إلى مبيعات.",
              example: "إذا اشتريت قطعة بـ 60 ج.م وبعتها بـ 100 ج.م، فإن الـ 60 ج.م هي التكلفة (COGS) والـ 40 ج.م هي ربحك الأولي.",
              safetyRule: "الأمان: مراقبة هذا الرقم تساعدك في معرفة هل تشتري بضاعتك بسعر مناسب أم أن المورد يرفع عليك السعر.",
              color: "orange",
              icon: <TrendingDown size={24} className="text-orange-600" />
            })}
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 group relative cursor-pointer overflow-hidden transition-colors hover:bg-orange-50/50 dark:hover:bg-orange-900/10"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <TrendingDown size={20} className="text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest block mb-0.5">تكلفة المنتجات 📦</span>
                  <HelpCircle size={14} className="text-accent" />
                </div>
                <p className="text-[10px] text-orange-600 dark:text-orange-400 font-black">
                  {financialData.totalSales > 0 ? ((financialData.totalCOGS / financialData.totalSales) * 100).toFixed(1) : 0}% من الدخل
                </p>
              </div>
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white tabular-nums">{formatCurrency(financialData.totalCOGS)}</h3>
          </motion.div>

          <motion.div 
            variants={{
              hidden: { opacity: 0, scale: 0.9, y: 20 },
              show: { opacity: 1, scale: 1, y: 0 }
            }}
            whileHover={{ y: -8, scale: 1.03, boxShadow: "0 20px 40px -10px rgba(71, 85, 105, 0.1)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveExplainModal({
              title: "إجمالي الاستثمار والمنصرف الكلي",
              description: "هذا الرقم يمثل كل قرش خرج من خزينة المشروع منذ اليوم الأول حتى الآن، سواء كان ثمن بضاعة من موردين أو مصروفات جانبية وإعلانات. هو إجمالي حجم الاستثمار النقدي في العمل.",
              example: "إذا اشتريت بضاعة بـ 10,000 ج.م وصرفت إعلانات وتغليف بـ 2,000 ج.م، فإن إجمالي استثمارك هو 12,000 ج.م.",
              safetyRule: "الأمان: مراقبة هذا الرقم تساعدك في معرفة 'متى سأسترد رأس مالي؟'. يجب أن تبدأ أرباحك الصافية التراكمية في الاقتراب من هذا الرقم لتصل لمرحلة استرداد الاستثمار.",
              color: "slate",
              icon: <Package size={24} className="text-slate-600 dark:text-slate-400" />
            })}
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 group relative cursor-pointer overflow-hidden transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <Package size={20} className="text-slate-600 dark:text-slate-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest block mb-0.5">الاستثمار الكلي 📉</span>
                  <HelpCircle size={14} className="text-accent" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black truncate">كافة مبالغ الشراء والصرف</p>
              </div>
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white tabular-nums">{formatCurrency(financialData.lifetimeTotalSpend || 0)}</h3>
          </motion.div>

          <motion.div 
            variants={{
              hidden: { opacity: 0, scale: 0.9, y: 20 },
              show: { opacity: 1, scale: 1, y: 0 }
            }}
            whileHover={{ y: -8, scale: 1.03, boxShadow: "0 20px 40px -10px rgba(99, 102, 241, 0.1)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const recovery = financialData.lifetimeSales || 0;
              const spend = financialData.lifetimeTotalSpend || 0;
              const remains = Math.max(0, spend - recovery);
              const percent = spend > 0 ? Math.min(100, (recovery / spend) * 100) : 0;
              
              setActiveExplainModal({
                title: "مؤشر استرداد رأس المال (Break-even)",
                description: `هذا المؤشر يخبرك بمدى قربك من استرداد كافة المبالغ التي استثمرتها في المشروع. لقد استرددت ${percent.toFixed(1)}% من استثمارك حتى الآن.`,
                example: `إذا كان إجمالي صرفك 10,000 ج.م وإجمالي مبيعاتك 8,000 ج.م، فأنت استرددت 80% من رأس مالك ويتبقى لك 2,000 ج.م لتصل لنقطة التعادل.`,
                safetyRule: "القاعدة الذهبية: بمجرد وصول إجمالي المبيعات لتغطية المنصرفات الكلية، يصبح كل قرش ربح صافي هو ربح حقيقي 100% خارج مخاطرة رأس المال.",
                color: "indigo",
                icon: <Sparkles size={24} className="text-indigo-600" />
              });
            }}
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 group relative cursor-pointer overflow-hidden transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <Sparkles size={20} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest block mb-0.5">استرداد رأس المال 🔄</span>
                  <HelpCircle size={14} className="text-accent" />
                </div>
                <p className="text-[10px] text-indigo-600 font-black">
                  {Math.min(100, ((financialData.lifetimeSales || 0) / (financialData.lifetimeTotalSpend || 1)) * 100).toFixed(1)}% تم استرداده
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, ((financialData.lifetimeSales || 0) / (financialData.lifetimeTotalSpend || 1)) * 100)}%` }}
                  className="h-full bg-indigo-500 rounded-full"
                />
              </div>
            </div>
          </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Unified Net Profit Card */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, scale: 0.9, y: 20 },
                show: { opacity: 1, scale: 1, y: 0 }
              }}
              whileHover={{ 
                scale: 1.02, 
                boxShadow: financialData.netProfit >= 0 
                  ? "0 25px 50px -12px rgba(16, 185, 129, 0.4)" 
                  : "0 25px 50px -12px rgba(239, 68, 68, 0.4)" 
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveExplainModal({
                title: "صافي الربح النهائي (Net Profit)",
                description: "هذا هو 'المال الحلال' الذي دخل جيبك بعد سداد كل الالتزامات. هو الرقم الذي يحدد هل مشروعك ناجح وينمو أم يغرق.",
                example: "مبيعاتك 1000، صرفت 800 (بضاعة وفواتير)، ربحك الصافي هو 200 ج.م.",
                safetyRule: "الأمان: إذا كان هذا الرقم سالباً (باللون الأحمر)، فأنت تسحب من رأس مالك الخاص لتغطية خسائر المحل ويجب التحرك فوراً لزيادة المبيعات أو تقليل المصاريف.",
                color: "emerald",
                icon: <TrendingUp size={24} className="text-white" />
              })}
              className={`p-5 rounded-[32px] shadow-xl relative cursor-pointer border-2 group overflow-hidden h-full flex flex-col justify-center ${
                financialData.netProfit >= 0 
                  ? 'bg-emerald-500 border-emerald-400' 
                  : 'bg-red-500 border-red-400'
              }`}
            >
              <motion.div 
                animate={{ opacity: [0.1, 0.2, 0.1] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="absolute inset-0 bg-white/20 blur-3xl pointer-events-none"
              />
              <div className="relative z-10 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">صافي الربح النهائي 🏆</span>
                    <HelpCircle size={14} className="opacity-80" />
                  </div>
                  <motion.div
                    animate={financialData.netProfit >= 0 ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <TrendingUp size={24} className={financialData.netProfit >= 0 ? "text-emerald-200" : "text-red-200"} />
                  </motion.div>
                </div>
                <h3 className="text-3xl font-black mb-1 italic tabular-nums">{formatCurrency(financialData.netProfit)}</h3>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-white/20 rounded-lg text-xs font-black">
                    {financialData.profitMargin.toFixed(1)}% هامش
                  </span>
                  <p className="text-[10px] font-bold opacity-70">بعد خصم كافة التكاليف</p>
                </div>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <TrendingUp size={120} />
              </div>
            </motion.div>

            {/* Financial Targets Card - Now side-by-side with Profit */}
            <div className="md:col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden relative">
              <div className="flex items-center justify-between mb-6">
                <h3 
                  onClick={() => setActiveExplainModal({
                    title: "الأهداف المالية الذكية",
                    description: "الأهداف تساعدك على تحويل طموحاتك إلى أرقام حقيقية. يمكنك مراقبة 'إجمالي المبيعات' أو 'صافي الأرباح' لفترة محددة.",
                    example: "إضافة هدف 'صافي ربح 5000 ج.م' خلال شهر رمضان لمراقبة الأداء.",
                    safetyRule: "القاعدة: الأهداف المتواضعة التي تتحقق، أفضل من الأهداف الخيالية التي تحبطك. ابدأ بهدف ممكن.",
                    color: "accent",
                    icon: <Target size={24} className="text-accent" />
                  })}
                  className="font-black text-gray-900 dark:text-white text-base flex items-center gap-2 cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Target size={16} className="text-accent" />
                  </div>
                  تحقيق الأهداف 🎯
                </h3>
                <button 
                  onClick={() => {
                    setEditingTarget(null);
                    setTargetForm({
                      title: '',
                      amount: '',
                      startDate: new Date().toISOString().split('T')[0],
                      deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                      category: 'net_profit'
                    });
                    setShowTargetModal(true);
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-accent text-white rounded-lg font-black shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all text-xs"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {targets.length === 0 ? (
                  <div className="col-span-full py-10 text-center border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-3xl">
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500">لا توجد أهداف حالية. 🎯</p>
                  </div>
                ) : (
                  targets.map(target => {
                    const targetOrders = orders.filter(o => {
                      const orderDate = o.createdAt.split('T')[0];
                      return orderDate >= (target.startDate || '2000-01-01') && orderDate <= target.deadline && o.status !== OrderStatus.CANCELED;
                    });
                    const targetSales = targetOrders.reduce((sum, o) => sum + o.totalAmount, 0);
                    const targetGrossProfit = targetOrders.reduce((sum, o) => sum + (o.totalAmount - o.totalCost), 0);
                    const currentValue = target.category === 'net_profit' ? targetGrossProfit : targetSales;
                    const progress = Math.min(100, Math.max(0, (currentValue / target.amount) * 100));
                    return (
                      <motion.div 
                        key={target.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-gray-50/50 dark:bg-slate-800/40 rounded-2xl border border-transparent hover:border-accent/10 flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-black text-gray-900 dark:text-white text-[10px] truncate max-w-[120px]">{target.title}</h4>
                          <span className="text-[10px] font-black text-accent">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="h-1 bg-white dark:bg-slate-900 rounded-full overflow-hidden mb-2">
                          <div className={`h-full transition-all duration-1000 ${progress >= 100 ? 'bg-emerald-500' : 'bg-accent'}`} style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500">{formatCurrency(target.amount)}</span>
                          <div className="flex gap-1">
                            <button onClick={() => openEditTarget(target)} className="p-1 text-gray-400 dark:text-gray-500 hover:text-accent"><Zap size={10} /></button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-8 mt-8 border-t border-gray-100 dark:border-slate-800 pt-8">
            <div className="flex flex-col gap-8">
              {/* Coverage & Break-even simplified */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div 
                  whileHover={{ scale: 1.02, y: -2 }}
                  onClick={() => setActiveExplainModal({
                    title: "نسبة التغطية (Coverage Ratio)",
                    description: "توضح هذه النسبة المئوية مقدار ما تم سداده من المصروفات التشغيلية باستخدام أرباح بيع المنتجات.",
                    example: "إذا كانت مصاريفك 1000 ج.م وأرباحك 480 ج.م، فنسبة التغطية 48%.",
                    safetyRule: "الهدف هو الوصول لـ 100% بأسرع وقت. فوق 100% = صافي ربح حقيقي.",
                    color: "accent",
                    icon: <Layers size={24} className="text-accent" />
                  })}
                  className="p-6 bg-white dark:bg-slate-900 rounded-[32px] border border-gray-100 dark:border-slate-800 shadow-sm cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">نسبة التغطية 📊</span>
                    <HelpCircle size={14} className="text-accent" />
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">
                      {Math.round((financialData.grossProfit / (financialData.totalOPEX || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (financialData.grossProfit / (financialData.totalOPEX || 1)) * 100)}%` }}
                      className={`h-full rounded-full ${Math.round((financialData.grossProfit / (financialData.totalOPEX || 1)) * 100) >= 100 ? 'bg-emerald-500' : 'bg-accent'}`}
                    />
                  </div>
                </motion.div>

                <motion.div 
                  whileHover={{ scale: 1.02, y: -2 }}
                  onClick={() => { const beSales = financialData.totalSales > 0 && financialData.grossProfit > 0 ? financialData.totalOPEX / (financialData.grossProfit / financialData.totalSales) : 0; setActiveExplainModal({
                    title: "مبيعات التعادل",
                    description: "رقم المبيعات الذي إذا حققته، تغطي أرباح منتجاتك كل مصاريفك التشغيلية.",
                    example: "مصاريفك 500 ج.م وهامش ربحك 25%، تحتاج مبيعات 2000 ج.م للتعادل.",
                    safetyRule: "تجاوز هذا الرقم = أرباح حقيقية في جيبك.",
                    color: "accent",
                    icon: <Target size={24} className="text-accent" />
                  });}}
                  className="p-6 bg-white dark:bg-slate-900 rounded-[32px] border border-gray-100 dark:border-slate-800 shadow-sm cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">هدف التعادل 🎯</span>
                    <HelpCircle size={14} className="text-accent" />
                  </div>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">
                    {formatCurrency(financialData.totalSales > 0 && financialData.grossProfit > 0 ? (financialData.totalOPEX / (financialData.grossProfit / financialData.totalSales)) : 0)}
                  </p>
                  <div className="mt-3 flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">باقي:</span>
                    <span className="text-xs font-black text-accent">
                      {formatCurrency(Math.max(0, (financialData.totalSales > 0 && financialData.grossProfit > 0 ? (financialData.totalOPEX / (financialData.grossProfit / financialData.totalSales)) : 0) - financialData.totalSales))}
                    </span>
                  </div>
                </motion.div>

                <motion.div 
                  whileHover={{ scale: 1.02, y: -2 }}
                  onClick={() => setActiveExplainModal({
                    title: financialData.netProfit >= 0 ? "تغطية كاملة" : "عجز التغطية",
                    description: financialData.netProfit >= 0 ? "مشروعك يغطي كل تكاليفه من أرباح البيع." : "المبلغ المتبقي لتسديد فواتير المتجر.",
                    example: financialData.netProfit >= 0 ? "مبيعاتك تغطي كل التكاليف وزيادة." : "فواتيرك 1000 وأرباحك 800 = عجز 200 ج.م.",
                    safetyRule: "لا تسحب مبالغ شخصية والمتجر في عجز.",
                    color: financialData.netProfit >= 0 ? "emerald" : "orange",
                    icon: <DollarSign size={24} className={financialData.netProfit >= 0 ? "text-emerald-500" : "text-orange-500"} />
                  })}
                  className="p-6 bg-white dark:bg-slate-900 rounded-[32px] border border-gray-100 dark:border-slate-800 shadow-sm cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">حالة التغطية 📉</span>
                    <HelpCircle size={14} className="text-accent" />
                  </div>
                  <p className={`text-2xl font-black ${financialData.netProfit >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {financialData.netProfit >= 0 ? '✅ تغطية كاملة' : formatCurrency(financialData.totalOPEX - financialData.grossProfit)}
                  </p>
                  <div className="mt-3 flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">الحالة:</span>
                    <span className={`text-[10px] font-black ${financialData.netProfit >= 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                      {financialData.netProfit >= 0 ? '🟢 أمان مالي' : '🟡 مرحلة تعافي'}
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Solid Area Chart View */}
              <div className="bg-white dark:bg-slate-900 border-2 border-gray-50 dark:border-slate-800 rounded-[48px] overflow-hidden flex flex-col min-h-[500px] shadow-2xl relative group">
                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setActiveExplainModal({
                    title: "تحليل محاكاة نقطة التعادل",
                    description: "هذا رسم بياني محاكي يعرض السيناريو النظري للعلاقة بين 'المبيعات' (المنطقة الزرقاء) و 'إجمالي التكاليف' (المنطقة البرتقالية) بناءً على متوسط أسعار منتجاتك. النقطة التي يتقاطع فيها الخطان هي 'نقطة التعادل'.",
                    example: "كلما كانت المنطقة الزرقاء فوق البرتقالية، فهذه هي مساحة الأرباح الصافية الحقيقية.",
                    safetyRule: "الأمان: استهدف توسيع المساحة الزرقاء عن طريق زيادة المبيعات أو تقليل التكاليف المتغيرة.",
                    color: "blue",
                    icon: <BarChart2 size={24} className="text-blue-500" />
                  })}
                  className="p-10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-6 cursor-pointer z-10"
                >
                  <div>
                    <h5 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3 relative">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        <BarChart2 size={24} className="text-blue-500" />
                      </div>
                      خريطة نقطة التعادل الاستراتيجية 🗺️
                    </h5>
                    <p className="text-xs text-gray-500 font-bold mt-2 mr-14">تحليل بصري دقيق للمسافات بين المبيعات والمصروفات</p>
                  </div>
                  
                  <div className="flex items-center gap-6 bg-gray-50 dark:bg-slate-800/80 p-3 px-6 rounded-3xl border border-gray-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
                      <span className="text-xs font-black text-gray-600 dark:text-gray-400">منطقة المبيعات</span>
                    </div>
                    <div className="w-px h-4 bg-gray-200 dark:bg-slate-700" />
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.6)]" />
                      <span className="text-xs font-black text-gray-600 dark:text-gray-400">منطقة التكاليف</span>
                    </div>
                  </div>
                </motion.div>
                
                <div className="w-full h-[450px] mt-8 relative overflow-hidden px-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={breakEvenChartData} margin={{ top: 20, right: 30, left: 10, bottom: 30 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        </linearGradient>
                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.7}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.2} />
                      <XAxis 
                        dataKey="units" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: '900', fill: '#94A3B8'}}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        width={60}
                        tick={{fontSize: 10, fontWeight: '900', fill: '#94A3B8'}} 
                        tickFormatter={(val) => `${val}`}
                      />
                      <RechartsTooltip 
                        cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '6 6' }}
                        contentStyle={{ 
                          borderRadius: '24px', 
                          border: 'none', 
                          boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                          backgroundColor: 'rgba(15, 23, 42, 0.98)',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: '900',
                          textAlign: 'right',
                          padding: '16px 20px'
                        }} 
                        itemStyle={{ color: '#fff', padding: '4px 0' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3b82f6" 
                        strokeWidth={5} 
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                        name="إجمالي المبيعات المحققة" 
                        activeDot={{ r: 10, stroke: '#fff', strokeWidth: 4 }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="totalCost" 
                        stroke="#f97316" 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#colorCost)" 
                        name="إجمالي التكاليف الكلية" 
                        strokeDasharray="10 8" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="fixedCost" 
                        stroke="#cbd5e1" 
                        strokeWidth={2} 
                        strokeDasharray="8 8" 
                        name="المصروفات الثابتة" 
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Bottom Education Bar */}
                <div className="bg-gray-50 dark:bg-slate-800/50 p-6 border-t border-gray-100 dark:border-slate-800 mt-4">
                  <div className="flex items-center gap-4 text-xs font-black text-blue-600 dark:text-blue-400">
                    <HelpCircle size={20} />
                    <span>نصيحة: كلما ابتعد الخط الأزرق (المبيعات) عن الخط البرتقالي (التكاليف) للأعلى، زاد صافي ربحك الحقيقي وتضاعف نمو مشروعك.</span>
                  </div>
                </div>
              </div>

              {/* Performance Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 
                    onClick={() => setActiveExplainModal({
                      title: "أداء المنتجات الأكثر مبيعاً",
                      description: "يوضح هذا الجدول المنتجات التي 'تحمل مشروعك على كتفيها'. يتم ترتيبها حسب الإيرادات والربح الصافي الذي تحققه كل قطعة.",
                      example: "قد تكتشف أن منتجاً رخيصاً يُباع منه الكثير هو المربح الحقيقي أكثر من منتج غالي الثمن.",
                      safetyRule: "القاعدة: ركز مخزونك وسيولتك دائماً على 'أفضل 3 منتجات' في هذا الجدول لضمان سرعة دوران رأس المال.",
                      color: "accent",
                      icon: <ShoppingBag size={24} className="text-accent" />
                    })}
                    className="font-black text-gray-900 dark:text-white text-lg flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                      <ShoppingBag size={18} className="text-accent" />
                    </div>
                    أداء المنتجات الأكثر مبيعاً
                    <HelpCircle size={14} className="text-accent animate-pulse" />
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="text-gray-400 dark:text-slate-400 text-[10px] font-black uppercase border-b border-gray-50 dark:border-slate-800/50">
                      <tr>
                        <th className="pb-4 text-right pr-2">المنتج</th>
                        <th className="pb-4 text-center">الكمية</th>
                        <th className="pb-4 text-center">الإيرادات</th>
                        <th className="pb-4 text-center">الربح</th>
                      </tr>
                    </thead>
                    <motion.tbody 
                      variants={{
                        show: {
                          transition: { staggerChildren: 0.05 }
                        }
                      }}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true }}
                    >
                      {productPerformance.slice(0, 8).map(prod => (
                        <motion.tr 
                          key={prod.id}
                          variants={{
                            hidden: { opacity: 0, x: -10 },
                            show: { opacity: 1, x: 0 }
                          }}
                          className="group hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-all"
                        >
                          <td className="py-3 pr-2">
                            <div className="flex flex-col">
                              <span className="font-black text-sm text-gray-800 dark:text-gray-200 group-hover:text-accent transition-colors">{prod.name}</span>
                              {prod.isDeleted && (
                                <span className="text-[9px] text-red-500 font-black mt-0.5 flex items-center gap-1">
                                  <AlertCircle size={10} /> غير متاح حالياً
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <span className="font-bold text-sm text-gray-500 dark:text-gray-400">{prod.totalSold}</span>
                          </td>
                          <td className="py-3 text-center font-black text-sm text-gray-900 dark:text-white">
                            {formatCurrency(prod.revenue)}
                          </td>
                          <td className="py-3 text-center">
                            <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(prod.profit)}</span>
                          </td>
                        </motion.tr>
                      ))}
                    </motion.tbody>
                  </table>
                </div>
              </div>

              {/* Expenses Display */}
              <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                      <TrendingDown size={18} className="text-red-500" />
                    </div>
                    <h3 className="font-black text-gray-900 dark:text-white text-base">سجل المصروفات</h3>
                  </div>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setActiveExplainModal({
                      title: "المصروفات التشغيلية (OPEX)",
                      description: "هي المصاريف 'غير المتعلقة بالبضاعة' ولكنها ضرورية لفتح المحل يومياً (مثل الإعلانات، الرواتب، الإيجار، الكهرباء، الشحن، الفواقد).",
                      example: "مثلاً: إعلانات شهرية 500 ج.م، إيجار محل 1000 ج.م، رواتب 2000 ج.م.",
                      safetyRule: "الأمان: القاعدة الذهبية هي أن تُغطي أرباحك هذه المصاريف بالكامل.",
                      color: "amber",
                      icon: <Zap size={24} className="text-amber-600" />
                    })}
                    className="bg-amber-50 dark:bg-amber-900/10 px-4 py-2 rounded-xl border border-amber-100 dark:border-amber-900/30 cursor-pointer group flex items-center gap-2"
                  >
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400">إجمالي الصرف</span>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white tabular-nums">{formatCurrency(financialData.totalOPEX)}</h4>
                    <HelpCircle size={12} className="text-amber-400" />
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {expenses.length === 0 ? (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-3xl">
                      <p className="text-xs font-bold text-gray-400 dark:text-gray-500">لا يوجد سجل مصروفات حالياً. 👀</p>
                    </div>
                  ) : (
                    expenses.map(exp => (
                      <motion.div 
                        key={exp.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-gray-50/50 dark:bg-slate-800/40 border-r-4 border-red-500 rounded-2xl flex justify-between items-center group hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black text-gray-800 dark:text-gray-200">{exp.category}</span>
                            <span className="text-[9px] text-gray-400 dark:text-gray-500">{new Date(exp.created_at).toLocaleDateString('ar-EG')}</span>
                          </div>
                          {exp.description && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold line-clamp-1">{exp.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-red-500">{formatCurrency(exp.amount)}</span>
                          <button onClick={() => { if(window.confirm('حذف المصروف؟')) handleDeleteExpense(exp.id); }} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Target Modal */}
      <AnimatePresence>
        {showTargetModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200000] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl relative"
            >
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Target size={20} className="text-accent" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">
                    {editingTarget ? 'تعديل الهدف 🎯' : 'إضافة هدف جديد 🎯'}
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase mb-2 mr-1">عنوان الهدف</label>
                    <input 
                      type="text"
                      value={targetForm.title}
                      onChange={(e) => setTargetForm({...targetForm, title: e.target.value})}
                      placeholder="مثلاً: مبيعات الصيف"
                      className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-accent font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
<label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase mb-2 mr-1">المبلغ (ج.م)</label>
                      <input 
                        type="number"
                        value={targetForm.amount}
                        onChange={(e) => setTargetForm({...targetForm, amount: e.target.value})}
                        className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-accent font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase mb-2 mr-1">النوع</label>
                      <select 
                        value={targetForm.category}
                        onChange={(e) => setTargetForm({...targetForm, category: e.target.value as any})}
                        className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-accent font-bold"
                      >
                        <option value="net_profit">صافي الربح</option>
                        <option value="total_sales">إجمالي المبيعات</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase mb-2 mr-1">تاريخ البدء</label>
                      <input 
                        type="date"
                        value={targetForm.startDate}
                        onChange={(e) => setTargetForm({...targetForm, startDate: e.target.value})}
                        className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-accent font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase mb-2 mr-1">الموعد النهائي</label>
                      <input 
                        type="date"
                        value={targetForm.deadline}
                        onChange={(e) => setTargetForm({...targetForm, deadline: e.target.value})}
                        className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-accent font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    onClick={handleSaveTargetAction}
                    className="flex-1 py-4 bg-accent text-white font-black rounded-2xl shadow-lg shadow-accent/20 hover:opacity-90"
                  >
                    {editingTarget ? 'حفظ التغييرات' : 'إضافة الهدف'}
                  </button>
                  <button 
                    onClick={() => setShowTargetModal(false)}
                    className="px-6 py-4 bg-gray-100 dark:bg-slate-800 text-gray-500 font-black rounded-2xl"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


    </motion.div>
  );
};

export default Accounts;
