
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { 
  Check, AlertCircle, Package, Upload, Plus, ShoppingBag, 
  BarChart3, Settings as SettingsIcon, Save, Sun, Moon, TrendingUp, Truck, Activity, ArrowRightLeft, Download
} from 'lucide-react';
import { Users, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, Order, OrderStatus, Product, Variant } from './types';
import Inventory from './components/Inventory';
import Orders from './components/Orders';
import Purchases from './components/Purchases';
import Accounts from './components/Accounts';
import Settings from './components/Settings';
import AIAssistant from './components/AIAssistant';
import Contacts from './components/Contacts';
import Customers from './components/Customers';
import ActivityLogs from './components/ActivityLogs';
import EasyOrdersPanel from './components/EasyOrdersPanel';
import InstallGuideModal from './components/InstallGuideModal';
import { UndoRedoProvider, useUndoRedo } from './contexts/UndoRedoContext';
import { useAuth } from './contexts/AuthContext';
import { LogOut } from 'lucide-react';
import LoginPage from './components/LoginPage';
import * as XLSX from 'xlsx';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const MainLayout: React.FC<{
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  loading: boolean;
  notification: {message: string, type: 'success' | 'error'} | null;
  showWelcome: boolean;
  setShowWelcome: (val: boolean) => void;
  welcomeFileInputRef: React.RefObject<HTMLInputElement>;
  handleWelcomeFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpdateOrderStatus: (id: string, st: string) => void;
  handleUpdateMultipleOrderStatus: (ids: string[], st: string) => void;
  handleAddOrder: (o: Order) => void;
  handleUpdateOrder: (o: Order) => void;
  handleDeleteOrder: (id: string) => void;
  handleDeleteMultipleOrders: (ids: string[]) => void;
  handleBatchUpdateOrders: (ids: string[], updates: Record<string, any>) => void;
  handleUpdateProduct: (p: Product) => void;
  handleSaveProduct: (p: Product) => void;
  handleDeleteProduct: (id: string) => void;
  handleDeleteMultipleProducts: (ids: string[]) => void;
  handleBatchUpdateProducts: (ids: string[], updates: Record<string, any>) => void;
  importProductsPreview: Product[] | null;
  setImportProductsPreview: (ps: Product[] | null) => void;
  onImportProductsFetch: (source: 'url' | 'file', data: string | Product[]) => Promise<void>;
  onImportProductsConfirm: (products: Product[]) => Promise<void>;
  importOrdersPreview: Order[] | null;
  setImportOrdersPreview: (os: Order[] | null) => void;
  onImportOrdersFetch: (source: 'url' | 'file', data: string | Order[]) => Promise<void>;
  onImportOrdersConfirm: (orders: Order[]) => Promise<void>;
  handleSaveTarget: (t: any) => void;
  handleDeleteTarget: (id: string) => void;
  handleImportState: (s: AppState) => void;
  setPushUndo: (fn: (id: number) => void) => void;
}> = ({ 
  state, setState, darkMode, setDarkMode, loading, notification, showWelcome, setShowWelcome, 
  welcomeFileInputRef, handleWelcomeFileChange, handleUpdateOrderStatus, handleUpdateMultipleOrderStatus, handleAddOrder, handleUpdateOrder,
  handleDeleteOrder, handleDeleteMultipleOrders, handleBatchUpdateOrders, handleUpdateProduct,
  handleSaveProduct, handleDeleteProduct, handleDeleteMultipleProducts, handleBatchUpdateProducts,
  importProductsPreview, setImportProductsPreview, onImportProductsFetch, onImportProductsConfirm,
  importOrdersPreview, setImportOrdersPreview, onImportOrdersFetch, onImportOrdersConfirm,
  handleSaveTarget, handleDeleteTarget, handleImportState, setPushUndo: setParentPushUndo
}) => {
  const location = useLocation();
  const { logout } = useAuth();
  const toggleDarkMode = () => setDarkMode(!darkMode);

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('erp_sidebar_width');
    return saved ? Math.max(180, Math.min(400, parseInt(saved))) : 256;
  });
  const sidebarWidthRef = useRef(sidebarWidth);
  const isDraggingRef = useRef(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isCollapsed = sidebarWidth < 120;
  sidebarWidthRef.current = sidebarWidth;

  const handleSidebarDrag = useCallback((e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidthRef.current;
    const sidebarEl = sidebarRef.current;

    const onMove = (e: PointerEvent) => {
      const diff = startX - e.clientX;
      const newWidth = Math.max(100, Math.min(400, Math.round(startWidth + diff)));
      sidebarWidthRef.current = newWidth;
      if (sidebarEl) sidebarEl.style.width = newWidth + 'px';
      document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
    };

    const onUp = () => {
      isDraggingRef.current = false;
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      document.body.style.userSelect = '';
      const finalWidth = sidebarWidthRef.current;
      setSidebarWidth(finalWidth);
      localStorage.setItem('erp_sidebar_width', String(finalWidth));
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }, []);

  const [isLg, setIsLg] = useState(window.innerWidth >= 1024);
  useEffect(() => {
    const onResize = () => setIsLg(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', sidebarWidth + 'px');
  }, [sidebarWidth]);

  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstallPrompt(null));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const [installDismissed, setInstallDismissed] = useState(false);
  const [showInstallToast, setShowInstallToast] = useState(false);
  const [toastProgress, setToastProgress] = useState(100);
  const [showInstallModal, setShowInstallModal] = useState(false);

  const isMobile = typeof window !== 'undefined' && (window.innerWidth < 900 || 'ontouchstart' in window);

  useEffect(() => {
    // Show toast on mobile always; on desktop only when beforeinstallprompt fires
    if (installDismissed || !isMobile) return;
    setShowInstallToast(true);
    setToastProgress(100);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / 5000) * 100);
      setToastProgress(remaining);
      if (remaining <= 0) { clearInterval(interval); setShowInstallToast(false); setInstallDismissed(true); }
    }, 16);
    return () => clearInterval(interval);
  }, [isMobile]);

  useEffect(() => {
    if (installDismissed || !installPrompt || showInstallToast) return;
    setShowInstallToast(true);
    setToastProgress(100);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / 5000) * 100);
      setToastProgress(remaining);
      if (remaining <= 0) { clearInterval(interval); setShowInstallToast(false); setInstallDismissed(true); }
    }, 16);
    return () => clearInterval(interval);
  }, [installPrompt]);

  const handleInstall = () => {
    if (installPrompt) {
      (installPrompt as any).prompt();
      (installPrompt as any).userChoice.then(() => { setInstallPrompt(null); });
      setInstallDismissed(true);
      setShowInstallToast(false);
    } else if (typeof navigator.share === 'function') {
      navigator.share({ url: window.location.href }).catch(() => {});
      setInstallDismissed(true);
      setShowInstallToast(false);
    } else {
      setShowInstallModal(true);
    }
  };

  const { pushUndo: undoPush, setOnRefreshState } = useUndoRedo();
  useEffect(() => { setParentPushUndo(() => undoPush); }, [undoPush, setParentPushUndo]);

  const refreshAppState = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/state`);
      const data = await res.json();
      setState(data);
    } catch {}
  }, [setState]);

  useEffect(() => {
    setOnRefreshState(refreshAppState);
    return () => setOnRefreshState(null);
  }, [setOnRefreshState, refreshAppState]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-500 overflow-x-hidden pb-16 md:pb-0 transition-[padding-right] duration-150 ease-out"
      style={{ paddingRight: isLg ? 'var(--sidebar-width, 256px)' : undefined }}>
      <AIAssistant 
        state={state} 
        onUpdateOrderStatus={handleUpdateOrderStatus} 
        onAddOrder={handleAddOrder}
        onUpdateProduct={handleUpdateProduct}
        onRefreshState={refreshAppState}
      />

      {/* Custom Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={`fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-[300] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-black text-sm ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
          >
            {notification.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcome && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
              onClick={() => setShowWelcome(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative bg-white dark:bg-slate-900 rounded-[48px] w-full max-w-xl shadow-2xl overflow-hidden border border-white/20"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"></div>
              
              <div className="p-10 text-center space-y-6">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="w-44 h-44 bg-white rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-xl overflow-hidden ring-4 ring-accent/5"
                >
                  {state.brandLogo ? (
                    <img src={state.brandLogo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBag size={40} className="text-accent" />
                  )}
                </motion.div>
                
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white">مرحباً بك في X2 BABY</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-lg font-medium max-w-md mx-auto">
                    النظام فارغ حالياً. يمكنك البدء بإضافة منتجات جديدة يدوياً أو استعادة نسخة احتياطية سابقة.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
                   <button 
                     onClick={() => welcomeFileInputRef.current?.click()}
                     className="group relative p-6 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl hover:border-accent dark:hover:border-accent transition-all hover:bg-blue-50 dark:hover:bg-slate-800/80"
                   >
                     <div className="flex flex-col items-center gap-3">
                       <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                         <Upload size={24} className="text-accent" />
                       </div>
                       <div className="text-center">
                         <h3 className="font-bold text-slate-900 dark:text-white">رفع نسخة احتياطية</h3>
                         <p className="text-xs text-slate-400 font-bold mt-1">ملف JSON سابق</p>
                       </div>
                     </div>
                   </button>

                   <button 
                     onClick={() => setShowWelcome(false)}
                     className="group relative p-6 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl hover:border-emerald-500 dark:hover:border-emerald-500 transition-all hover:bg-emerald-50 dark:hover:bg-slate-800/80"
                   >
                     <div className="flex flex-col items-center gap-3">
                       <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                         <Plus size={24} className="text-emerald-500" />
                       </div>
                       <div className="text-center">
                         <h3 className="font-bold text-slate-900 dark:text-white">بدء نظام من الصفر</h3>
                         <p className="text-xs text-slate-400 font-bold mt-1">إنشاء مخزون فارغ</p>
                       </div>
                     </div>
                   </button>
                </div>
              </div>
              
              <input 
                type="file" 
                accept=".json" 
                ref={welcomeFileInputRef} 
                className="hidden" 
                onChange={handleWelcomeFileChange} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.nav 
        ref={sidebarRef}
        initial={{ x: 300 }}
        animate={{ x: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 bg-white dark:bg-slate-900 border-l border-gray-100 dark:border-slate-800 hidden lg:flex flex-col p-6 z-50"
        style={{ width: sidebarWidth }}
      >
        <div className="flex-shrink-0 mb-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-3 text-center"
          >
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 2 }}
              className={`${isCollapsed ? 'w-10 h-10' : 'w-24 h-24'} bg-white rounded-[32px] flex items-center justify-center shadow-md overflow-hidden ring-1 ring-gray-100 dark:ring-slate-800 transition-all`}
            >
              {state.brandLogo ? (
                <img src={state.brandLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <ShoppingBag size={isCollapsed ? 18 : 32} />
              )}
            </motion.div>
            <motion.div
              animate={{ width: isCollapsed ? 0 : 'auto', opacity: isCollapsed ? 0 : 1 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden whitespace-nowrap"
            >
              <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{state.brandName || 'X2 BABY'}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-bold">{state.brandSlogan || 'نظام إدارة المخزون'}</p>
              {state.brandSloganDesign && (
                <div className="mt-2 p-1.5 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
                  <img src={state.brandSloganDesign} alt="Slogan Design" className="w-full h-auto object-contain max-h-[60px] mx-auto" />
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>

        <div className="flex flex-col gap-2 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar min-h-0 py-2">
          {[
            { to: "/", icon: <Package size={20} />, label: "المخزون", color: "bg-primary text-blue-900" },
            { to: "/orders", icon: <ShoppingBag size={20} />, label: "الطلبات", color: "bg-secondary text-red-900" },
            { to: "/purchases", icon: <ShoppingBag size={20} className="text-indigo-500" />, label: "المشتريات", color: "bg-indigo-50 text-indigo-900" },
            { to: "/accounts", icon: <BarChart3 size={20} />, label: "الحسابات والمالية", color: "bg-accent text-white" },
            { to: "/contacts", icon: <Users size={20} />, label: "جهات الاتصال", color: "bg-teal-50 text-teal-900" },
            { to: "/customers", icon: <UserCheck size={20} />, label: "العملاء", color: "bg-pink-50 text-pink-900" },
            { to: "/activity-logs", icon: <Activity size={20} />, label: "سجل النشاطات", color: "bg-amber-50 text-amber-900" },
            { to: "/easy-orders", icon: <ArrowRightLeft size={20} />, label: "Easy Orders", color: "bg-indigo-50 text-indigo-900" },
            { to: "/settings", icon: <SettingsIcon size={20} />, label: "إدارة البيانات", color: "bg-gray-200 text-gray-900" }
          ].map((link, i) => (
            <motion.div
              key={link.to}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + (i * 0.05) }}
            >
              <NavLink 
                to={link.to} 
                className={({ isActive }) => `flex items-center p-3 rounded-xl transition-all font-bold ${isCollapsed ? 'justify-center gap-0 [&>svg]:scale-125' : 'gap-3'} ${isActive ? `${link.color} shadow-sm scale-105` : 'text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:scale-[1.02]'}`}
              >
                {link.icon}
                <motion.span
                  animate={{ width: isCollapsed ? 0 : 'auto', opacity: isCollapsed ? 0 : 1 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {link.label}
                </motion.span>
              </NavLink>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-3 flex-shrink-0"
        >
          <motion.div
            animate={{ height: isCollapsed ? 0 : 'auto', opacity: isCollapsed ? 0 : 1 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {state.brandSlogan && !state.brandSloganDesign && (
              <div className="p-3 bg-accent/5 dark:bg-accent/10 rounded-2xl border border-accent/10 dark:border-accent/20 text-center space-y-1">
                <div className="text-[8px] font-black text-accent uppercase tracking-widest leading-none">الهوية التجارية</div>
                <div className="text-[10px] font-black text-slate-900 dark:text-white leading-tight italic">
                  " {state.brandSlogan} "
                </div>
              </div>
            )}
          </motion.div>

          <button 
            onClick={toggleDarkMode}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-3 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:opacity-90 transition-all font-bold text-sm`}
          >
            <span className={`flex items-center ${isCollapsed ? 'gap-0 [&>svg]:scale-125' : 'gap-3'}`}>
              {darkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-indigo-400" />}
              <motion.span
                animate={{ width: isCollapsed ? 0 : 'auto', opacity: isCollapsed ? 0 : 1 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden whitespace-nowrap"
              >
                {darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
              </motion.span>
            </span>
          </button>

          <button
            onClick={() => logout()}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all font-bold text-sm`}
          >
            <span className={`flex items-center ${isCollapsed ? 'gap-0 [&>svg]:scale-125' : 'gap-3'}`}>
              <LogOut size={20} />
              <motion.span
                animate={{ width: isCollapsed ? 0 : 'auto', opacity: isCollapsed ? 0 : 1 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden whitespace-nowrap"
              >
                تسجيل الخروج
              </motion.span>
            </span>
          </button>
        </motion.div>

        {/* Drag Handle */}
        <div
          onPointerDown={handleSidebarDrag}
          className="absolute -left-4 top-0 bottom-0 w-8 z-50 cursor-col-resize group touch-none"
        >
          <div className="absolute left-1/2 top-0 bottom-0 w-[3px] -translate-x-1/2 bg-gray-200 dark:bg-slate-700 group-hover:bg-accent group-active:bg-accent transition-colors rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-12 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex flex-col gap-0.5 items-center">
              <div className="w-0.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600" />
              <div className="w-0.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600" />
              <div className="w-0.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600" />
            </div>
          </div>
        </div>
      </motion.nav>

      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex md:hidden justify-around items-center px-4 z-50 shadow-lg">
        <NavLink to="/" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-accent font-bold' : 'text-gray-400 dark:text-gray-500 font-medium'}`}>
          <Package size={22} />
          <span className="text-[10px]">المخزون</span>
        </NavLink>
        <NavLink to="/orders" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-accent font-bold' : 'text-gray-400 dark:text-gray-500 font-medium'}`}>
          <ShoppingBag size={22} />
          <span className="text-[10px]">الطلبات</span>
        </NavLink>
        <NavLink to="/purchases" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-accent font-bold' : 'text-gray-400 dark:text-gray-500 font-medium'}`}>
          <ShoppingBag size={22} />
          <span className="text-[10px]">مشتريات</span>
        </NavLink>
        <NavLink to="/accounts" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-accent font-bold' : 'text-gray-400 dark:text-gray-500 font-medium'}`}>
          <BarChart3 size={22} />
          <span className="text-[10px]">الحسابات</span>
        </NavLink>
        <NavLink to="/contacts" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-accent font-bold' : 'text-gray-400 dark:text-gray-500 font-medium'}`}>
          <Users size={22} />
          <span className="text-[10px]">جهات</span>
        </NavLink>
        <NavLink to="/customers" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-accent font-bold' : 'text-gray-400 dark:text-gray-500 font-medium'}`}>
          <UserCheck size={22} />
          <span className="text-[10px]">عملاء</span>
        </NavLink>
        <NavLink to="/activity-logs" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-accent font-bold' : 'text-gray-400 dark:text-gray-500 font-medium'}`}>
          <Activity size={22} />
          <span className="text-[10px]">نشاطات</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-accent font-bold' : 'text-gray-400 dark:text-gray-500 font-medium'}`}>
          <SettingsIcon size={22} />
          <span className="text-[10px]">البيانات</span>
        </NavLink>
      </nav>

      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route 
              path="/" 
              element={
                <Inventory 
                  products={state.products} 
                  categories={state.categories}
                  branding={{ 
                    logo: state.brandLogo, 
                    name: state.brandName, 
                    slogan: state.brandSlogan,
                    sloganDesign: state.brandSloganDesign
                  }}
                  onUpdateProduct={handleUpdateProduct} 
                  onSaveProduct={handleSaveProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onDeleteMultipleProducts={handleDeleteMultipleProducts}
                  onBatchUpdateProducts={handleBatchUpdateProducts}
                  isLoading={loading}
                  importProductsPreview={importProductsPreview}
                  onImportProductsFetch={onImportProductsFetch}
                  onImportProductsConfirm={onImportProductsConfirm}
                  onImportProductsClose={() => setImportProductsPreview(null)}
                  suppliers={state.suppliers || []}
                  contacts={state.contacts || []}
                  orders={state.orders}
                />
              } 
            />
            <Route 
              path="/orders" 
              element={
                <Orders 
                  orders={state.orders} 
                  products={state.products} 
                  branding={{ 
                    logo: state.brandLogo, 
                    name: state.brandName, 
                    slogan: state.brandSlogan,
                    sloganDesign: state.brandSloganDesign
                  }}
                  invoiceSettings={state.invoiceSettings}
                  onAddOrder={handleAddOrder} 
                  onUpdateOrder={handleUpdateOrder}
                  onDeleteOrder={handleDeleteOrder}
                  onDeleteMultipleOrders={handleDeleteMultipleOrders}
                  onBatchUpdateOrders={handleBatchUpdateOrders}
                  onUpdateStatus={handleUpdateOrderStatus}
                  onUpdateMultipleStatus={handleUpdateMultipleOrderStatus}
                  isLoading={loading}
                  importOrdersPreview={importOrdersPreview}
                  onImportOrdersFetch={onImportOrdersFetch}
                  onImportOrdersConfirm={onImportOrdersConfirm}
                  onImportOrdersClose={() => setImportOrdersPreview(null)}
                />
              } 
            />
            <Route path="/dispatch" element={<Navigate to="/orders" replace />} />
            <Route 
              path="/purchases" 
              element={
                <Purchases 
                  products={state.products} 
                  categories={state.categories}
                  suppliers={state.suppliers}
                  contacts={state.contacts || []}
                  branding={{ 
                    logo: state.brandLogo, 
                    name: state.brandName, 
                    slogan: state.brandSlogan,
                    sloganDesign: state.brandSloganDesign
                  }}
                  onSaveProduct={handleSaveProduct}
                  onRefresh={() => {
                    fetch(`${API_BASE}/state`)
                      .then(res => res.json())
                      .then(data => setState(data));
                  }} 
                />
              } 
            />
            <Route 
              path="/accounts" 
              element={
                <Accounts 
                  orders={state.orders} 
                  products={state.products}
                  contacts={state.contacts || []}
                  targets={state.targets || []}
                  branding={{ 
                    logo: state.brandLogo, 
                    name: state.brandName, 
                    slogan: state.brandSlogan,
                    sloganDesign: state.brandSloganDesign
                  }}
                  taxEnabled={state.taxEnabled}
                  taxRate={state.taxRate}
                  onSaveTarget={handleSaveTarget}
                  onDeleteTarget={handleDeleteTarget}
                />
              } 
            />
            <Route 
              path="/activity-logs" 
              element={
                <ActivityLogs 
                  onRefresh={() => {
                    fetch(`${API_BASE}/state`)
                      .then(res => res.json())
                      .then(data => setState(data));
                  }} 
                />
              } 
            />
            <Route 
              path="/contacts" 
              element={
                <Contacts 
                  contacts={state.contacts}
                  branding={{ 
                    logo: state.brandLogo, 
                    name: state.brandName, 
                    slogan: state.brandSlogan,
                    sloganDesign: state.brandSloganDesign
                  }}
                />
              } 
            />
            <Route 
              path="/customers" 
              element={
                <Customers 
                  customers={state.customers}
                  orders={state.orders}
                  branding={{ 
                    logo: state.brandLogo, 
                    name: state.brandName, 
                    slogan: state.brandSlogan,
                    sloganDesign: state.brandSloganDesign
                  }}
                />
              } 
            />
            <Route 
              path="/settings" 
              element={<Settings state={state} onImport={handleImportState} onUpdateState={(update) => setState(prev => ({ ...prev, ...update }))} />} 
            />
            <Route 
              path="/easy-orders" 
              element={<EasyOrdersPanel state={state} onUpdateState={(update) => setState(prev => ({ ...prev, ...update }))} />} 
            />
          </Routes>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showInstallToast && !installDismissed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: 'calc(-50% - 10px)' }}
            exit={{ opacity: 0, scale: 0.95, x: '-50%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={handleInstall}
            className="fixed top-6 left-1/2 z-[100] cursor-pointer bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-accent/20 overflow-hidden w-[90vw] max-w-[400px] active:scale-[0.97] active:opacity-80 transition-all duration-150"
          >
            <div className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Download size={20} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white">إضافة إلى الشاشة الرئيسية</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">للوصول السريع والتشغيل كتطبيق مستقل</p>
              </div>
            </div>
            <div className="h-1 bg-accent transition-none" style={{ width: toastProgress + '%' }} />
          </motion.div>
        )}
      </AnimatePresence>

      <InstallGuideModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />
    </div>
  );
};

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [pushUndo, setPushUndo] = useState<(id: number) => void>(() => () => {});

  // All hooks MUST be declared unconditionally (Rules of Hooks)
  const [state, setState] = useState<AppState>({
    products: [],
    orders: [],
    customers: [],
    isManualMode: false,
    categories: [],
    brandLogo: '',
    brandName: 'X2 BABY',
    brandSlogan: 'الجودة، الثقة، والأمان',
    brandSloganDesign: '',
    suppliers: [],
    contacts: [],
    targets: [],
    taxEnabled: false,
    taxRate: 0,
    invoiceSettings: {
      exchangeReturnUrl: '',
      shippingUrl: '',
      showExchangeReturnQr: true,
      showShippingQr: true,
      footerText: '',
      showFooterText: true,
      thankYouImage: '',
      socialLinks: [],
      showSocialQr: true,
    }
  });

  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('erp_theme') === 'dark');
  const [loading, setLoading] = useState(true);
  const [importProductsPreview, setImportProductsPreview] = useState<Product[] | null>(null);
  const [importOrdersPreview, setImportOrdersPreview] = useState<Order[] | null>(null);
  const [themeReady, setThemeReady] = useState(false);

  const welcomeFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('erp_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('erp_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`${API_BASE}/state`)
      .then(res => res.json())
      .then(data => {
        const validCats = new Set<string>();
        if (Array.isArray(data.categories)) {
          const catMap = new Map(data.categories.map((c: any) => [c.id, c]));
          data.categories.forEach((cat: any) => {
            let current = cat;
            let path = [cat.name];
            let depth = 0;
            while (current.parentId && catMap.has(current.parentId) && depth < 10) {
              current = catMap.get(current.parentId)!;
              path.unshift(current.name);
              depth++;
            }
            validCats.add(path.join(' > '));
            if (!cat.parentId) validCats.add(cat.name);
          });
        }

        const sanitizedProducts = data.products?.map((p: any) => {
          if (p.category && !validCats.has(p.category)) {
            return { ...p, category: '' };
          }
          return p;
        });

        // Migrate old storeUrl to socialLinks
        if (data.invoiceSettings?.storeUrl) {
          const hasStoreLink = data.invoiceSettings.socialLinks?.some((l: any) => l.platform === 'store');
          if (!hasStoreLink) {
            data.invoiceSettings.socialLinks = [...(data.invoiceSettings.socialLinks || []), { platform: 'store', url: data.invoiceSettings.storeUrl }];
          }
          delete data.invoiceSettings.storeUrl;
          delete data.invoiceSettings.showStoreQr;
        }

        setState({
          ...data,
          products: sanitizedProducts || [],
          targets: Array.isArray(data.targets) ? data.targets : []
        });
        if (data.products && data.products.length === 0) {
          setShowWelcome(true);
        }
      })
      .catch(err => console.error("Failed to fetch state:", err))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-gray-400">جاري التحقق من الحساب...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    const prevOrders = state.orders;
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o),
    }));
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.activityLogId) pushUndo(data.activityLogId);
      if (data.products) {
        setState(prev => ({ ...prev, products: data.products }));
      }
    } catch (err) {
      setState(prev => ({ ...prev, orders: prevOrders }));
      console.error('Failed to update order status:', err);
    }
  };

  const handleUpdateMultipleOrderStatus = async (orderIds: string[], newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/orders/batch/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds, status: newStatus })
      });
      const data = await res.json();
      if (data.activityLogId) pushUndo(data.activityLogId);
      if (data.products) {
        setState(prev => ({
          ...prev,
          orders: prev.orders.map(o => orderIds.includes(o.id) ? { ...o, status: newStatus as any } : o),
          products: data.products
        }));
      }
      showNotification(`تم تحديث حالة ${orderIds.length} طلب بنجاح`, 'success');
    } catch (err) {
      showNotification('حدث خطأ أثناء تحديث الحالات', 'error');
    }
  };

  const handleAddOrder = async (order: Order) => {
    const res = await fetch(`${API_BASE}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) });
    const data = await res.json();
    if (data.activityLogId) pushUndo(data.activityLogId);
    const finalOrder = data.id ? { ...order, id: data.id } : order;
    setState(prev => ({ ...prev, orders: [finalOrder, ...prev.orders], products: data.products || prev.products }));
    showNotification('تم إضافة الطلب', 'success');
  };

  const handleUpdateOrder = async (order: Order) => {
    const res = await fetch(`${API_BASE}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) });
    const data = await res.json();
    if (data.activityLogId) pushUndo(data.activityLogId);
    setState(prev => ({ ...prev, orders: prev.orders.map(o => o.id === order.id ? order : o), products: data.products || prev.products }));
    showNotification('تم تحديث الطلب', 'success');
  };

  const handleDeleteOrder = async (id: string) => {
    const res = await fetch(`${API_BASE}/orders/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.activityLogId) pushUndo(data.activityLogId);
    setState(prev => ({ ...prev, orders: prev.orders.filter(o => o.id !== id), products: data.products || prev.products }));
  };

  const handleDeleteMultipleOrders = async (ids: string[]) => {
    const res = await fetch(`${API_BASE}/orders/bulk-delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
    const data = await res.json();
    if (data.activityLogId) pushUndo(data.activityLogId);
    setState(prev => ({ ...prev, orders: prev.orders.filter(o => !ids.includes(o.id)), products: data.products || prev.products }));
  };

  const handleSaveProduct = async (product: Product) => {
    const res = await fetch(`${API_BASE}/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(product) });
    const data = await res.json();
    if (data.activityLogId) pushUndo(data.activityLogId);
    setState(prev => {
      const exists = prev.products.some(p => p.id === product.id);
      return { ...prev, products: exists ? prev.products.map(p => p.id === product.id ? product : p) : [product, ...prev.products] };
    });
  };

  const handleDeleteProduct = async (id: string) => {
    const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.activityLogId) pushUndo(data.activityLogId);
    setState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }));
  };

  const handleDeleteMultipleProducts = async (ids: string[]) => {
    const res = await fetch(`${API_BASE}/products/bulk-delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
    const data = await res.json();
    if (data.activityLogId) pushUndo(data.activityLogId);
    setState(prev => ({ ...prev, products: prev.products.filter(p => !ids.includes(p.id)) }));
  };

  const handleBatchUpdateProducts = async (ids: string[], updates: Record<string, any>) => {
    const res = await fetch(`${API_BASE}/products/batch`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, updates })
    });
    const data = await res.json();
    if (data.activityLogId) pushUndo(data.activityLogId);
    setState(prev => ({
      ...prev,
      products: prev.products.map(p => ids.includes(p.id) ? { ...p, ...updates } : p)
    }));
    showNotification(`تم تعديل ${ids.length} منتج`, 'success');
  };

  const handleBatchUpdateOrders = async (ids: string[], updates: Record<string, any>) => {
    const res = await fetch(`${API_BASE}/orders/batch`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, updates })
    });
    const data = await res.json();
    if (data.activityLogId) pushUndo(data.activityLogId);
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o => ids.includes(o.id) ? { ...o, ...updates } : o),
      products: data.products || prev.products
    }));
    showNotification(`تم تعديل ${ids.length} طلب`, 'success');
  };

  const handleImportProductsFetch = async (source: 'url' | 'file', data: string | Product[]) => {
    const body = source === 'url' ? { url: data } : { file: data };
    try {
      const res = await fetch(`${API_BASE}/import/products/fetch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const result = await res.json();
      if (result.success) setImportProductsPreview(result.products);
      else showNotification(result.error || 'فشل استيراد المنتجات', 'error');
    } catch (err: any) {
      showNotification('خطأ في الاتصال بالسيرفر', 'error');
    }
  };

  const handleImportProductsConfirm = async (products: Product[]) => {
    try {
      const res = await fetch(`${API_BASE}/import/products/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products })
      });
      const data = await res.json();
      if (data.activityLogId) pushUndo(data.activityLogId);
      setImportProductsPreview(null);
      const stateRes = await fetch(`${API_BASE}/state`);
      const stateData = await stateRes.json();
      setState(prev => ({ ...prev, products: stateData.products || [] }));
      showNotification(`تم استيراد ${data.count} منتج بنجاح`, 'success');
    } catch (err: any) {
      showNotification('خطأ في حفظ المنتجات', 'error');
    }
  };

  const handleImportOrdersFetch = async (source: 'url' | 'file', data: string | Order[]) => {
    const body = source === 'url' ? { url: data } : { file: data };
    try {
      const res = await fetch(`${API_BASE}/import/orders/fetch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const result = await res.json();
      if (result.success) setImportOrdersPreview(result.orders);
      else showNotification(result.error || 'فشل استيراد الطلبات', 'error');
    } catch (err: any) {
      showNotification('خطأ في الاتصال بالسيرفر', 'error');
    }
  };

  const handleImportOrdersConfirm = async (orders: Order[]) => {
    try {
      const res = await fetch(`${API_BASE}/import/orders/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orders })
      });
      const data = await res.json();
      if (data.activityLogId) pushUndo(data.activityLogId);
      setImportOrdersPreview(null);
      const stateRes = await fetch(`${API_BASE}/state`);
      const stateData = await stateRes.json();
      setState(prev => ({ ...prev, orders: stateData.orders || [] }));
      showNotification(`تم استيراد ${data.count} طلب بنجاح`, 'success');
    } catch (err: any) {
      showNotification('خطأ في حفظ الطلبات', 'error');
    }
  };

  const handleSaveTarget = async (t: any) => {
    const res = await fetch(`${API_BASE}/targets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) });
    const data = await res.json();
    if (data.activityLogId) pushUndo(data.activityLogId);
    setState(prev => ({ ...prev, targets: [...(prev.targets || []).filter(x => x.id !== t.id), t] }));
  };

  const handleDeleteTarget = async (id: string) => {
    const res = await fetch(`${API_BASE}/targets/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.activityLogId) pushUndo(data.activityLogId);
    setState(prev => ({ ...prev, targets: (prev.targets || []).filter(x => x.id !== id) }));
  };

  const handleImportState = async (s: AppState) => {
    const res = await fetch(`${API_BASE}/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) });
    const data = await res.json();
    if (data.activityLogId) pushUndo(data.activityLogId);
    setState(s);
  };

  const handleWelcomeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const parsed = JSON.parse(event.target?.result as string);
      handleImportState(parsed);
      setShowWelcome(false);
    };
    reader.readAsText(file);
  };

  return (
    <>
    {themeReady ? (
    <HashRouter>
      <UndoRedoProvider>
      <MainLayout 
        state={state} setState={setState} darkMode={darkMode} setDarkMode={setDarkMode} 
        loading={loading} notification={notification} showWelcome={showWelcome} 
        setShowWelcome={setShowWelcome} welcomeFileInputRef={welcomeFileInputRef} 
        handleWelcomeFileChange={handleWelcomeFileChange} handleUpdateOrderStatus={handleUpdateOrderStatus}
        handleUpdateMultipleOrderStatus={handleUpdateMultipleOrderStatus}
        handleAddOrder={handleAddOrder} handleUpdateOrder={handleUpdateOrder} handleDeleteOrder={handleDeleteOrder}
        handleDeleteMultipleOrders={handleDeleteMultipleOrders} handleBatchUpdateOrders={handleBatchUpdateOrders}
        handleUpdateProduct={handleSaveProduct} handleSaveProduct={handleSaveProduct}
        handleDeleteProduct={handleDeleteProduct} handleDeleteMultipleProducts={handleDeleteMultipleProducts} handleBatchUpdateProducts={handleBatchUpdateProducts}
        importProductsPreview={importProductsPreview} setImportProductsPreview={setImportProductsPreview}
        onImportProductsFetch={handleImportProductsFetch} onImportProductsConfirm={handleImportProductsConfirm}
        importOrdersPreview={importOrdersPreview} setImportOrdersPreview={setImportOrdersPreview}
        onImportOrdersFetch={handleImportOrdersFetch} onImportOrdersConfirm={handleImportOrdersConfirm}
        handleSaveTarget={handleSaveTarget} handleDeleteTarget={handleDeleteTarget} handleImportState={handleImportState}
        setPushUndo={setPushUndo}
      />
      </UndoRedoProvider>
    </HashRouter>
    ) : (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-gray-400">جاري تحميل النظام...</p>
        </div>
      </div>
    )}
    </>
  );
};

export default App;
