import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { ShoppingBag, ShieldOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, Order, Product } from './types';
import AIAssistant from './components/AIAssistant';
import AppLayout from './components/layout/AppLayout';
import { updateFavicon, updateManifest } from './lib/faviconUtils';

const Inventory = React.lazy(() => import('./components/Inventory'));
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const Orders = React.lazy(() => import('./components/Orders'));
const Purchases = React.lazy(() => import('./components/Purchases'));
const Accounts = React.lazy(() => import('./components/Accounts'));
const Settings = React.lazy(() => import('./components/Settings'));
const Contacts = React.lazy(() => import('./components/Contacts'));
const Customers = React.lazy(() => import('./components/Customers'));
const ActivityLogs = React.lazy(() => import('./components/ActivityLogs'));
const AssistantPage = React.lazy(() => import('./components/AssistantPage'));
import { UndoRedoProvider, useUndoRedo } from './contexts/UndoRedoContext';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import LoginPage from './components/LoginPage';
import { API_BASE } from './lib/api';
import { MD3Dialog, MD3Snackbar, useSnackbar } from './components/md3';

const ProtectedRoute: React.FC<{ section: string; children: React.ReactNode }> = ({ section, children }) => {
  const { canView } = useAuth();
  if (!canView(section)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-16 h-16 bg-[var(--md-sys-color-error-container,#F9DEDC)] rounded-3xl flex items-center justify-center mb-4 text-[var(--md-sys-color-error,#B3261E)]">
          <ShieldOff size={32} />
        </div>
        <h2 className="text-xl font-black text-[var(--md-sys-color-on-surface)] mb-2">غير مصرح بالوصول</h2>
        <p className="text-sm text-[var(--md-sys-color-on-surface-variant)] mb-6">ليس لديك صلاحية لعرض هذه الصفحة.</p>
        <Link to="/" className="px-6 py-2.5 rounded-xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold">العودة للرئيسية</Link>
      </div>
    );
  }
  return <>{children}</>;
};

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
  const { uiTheme } = useTheme();
  const isMD3 = uiTheme === 'material3';
  const toggleDarkMode = () => setDarkMode(!darkMode);

  const pageTitle = (() => {
    const path = location.pathname;
    if (path === '/') return 'لوحة التحكم';
    if (path === '/inventory') return 'المخزون';
    if (path === '/orders') return 'الطلبات';
    if (path === '/purchases') return 'المشتريات';
    if (path === '/accounts') return 'الحسابات والمالية';
    if (path === '/contacts') return 'جهات الاتصال';
    if (path === '/customers') return 'العملاء';
    if (path === '/activity-logs') return 'سجل النشاطات';
    if (path === '/settings') return 'إدارة البيانات';
    if (path === '/assistant') return 'المساعد الذكي';
    return 'X2 ERP';
  })();

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

  const routesElement = (
    <Suspense fallback={
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-[var(--md-sys-color-primary,#6750A4)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
        <Route 
          path="/" 
          element={
            <Dashboard state={state} />
          } 
        />
        <Route 
          path="/inventory" 
          element={
            <ProtectedRoute section="products">
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
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/orders" 
          element={
            <ProtectedRoute section="orders">
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
            </ProtectedRoute>
          } 
        />
        <Route path="/dispatch" element={<Navigate to="/orders" replace />} />
        <Route 
          path="/purchases" 
          element={
            <ProtectedRoute section="purchases">
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
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/accounts" 
          element={
            <ProtectedRoute section="accounts">
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
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/activity-logs" 
          element={
            <ProtectedRoute section="activity-logs">
            <ActivityLogs 
              onRefresh={() => {
                fetch(`${API_BASE}/state`)
                  .then(res => res.json())
                  .then(data => setState(data));
              }} 
            />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/contacts" 
          element={
            <ProtectedRoute section="contacts">
            <Contacts 
              contacts={state.contacts}
              branding={{ 
                logo: state.brandLogo, 
                name: state.brandName, 
                slogan: state.brandSlogan,
                sloganDesign: state.brandSloganDesign
              }}
            />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/customers" 
          element={
            <ProtectedRoute section="customers">
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
            </ProtectedRoute>
          } 
        />
        <Route
          path="/assistant"
          element={
            <AssistantPage state={state} onRefreshState={refreshAppState} />
          }
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute section="settings">
            <Settings state={state} onImport={handleImportState} onUpdateState={(update) => setState(prev => ({ ...prev, ...update }))} />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </AnimatePresence>
    </Suspense>
  );

  return (
    <>
      <AIAssistant 
        state={state} 
        onUpdateOrderStatus={handleUpdateOrderStatus} 
        onAddOrder={handleAddOrder}
        onUpdateProduct={handleUpdateProduct}
        onRefreshState={refreshAppState}
        hidden={location.pathname === '/assistant'}
      />

      <MD3Dialog
        isOpen={showWelcome}
        onClose={() => setShowWelcome(false)}
        title="مرحباً بك في X2 BABY"
        maxWidth="md"
        actions={[
          { label: 'بدء نظام من الصفر', onClick: () => setShowWelcome(false), variant: 'outlined' },
          { label: 'نسخة احتياطية', onClick: () => welcomeFileInputRef.current?.click(), variant: 'filled' }
        ]}
      >
        <div className="text-center space-y-4">
          <div className="w-32 h-32 bg-[var(--md-sys-color-surface-container)] rounded-3xl flex items-center justify-center mx-auto shadow-md overflow-hidden">
            {state.brandLogo ? (
              <img src={state.brandLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <ShoppingBag size={40} className="text-[var(--md-sys-color-primary)]" />
            )}
          </div>
          <p className="text-[var(--md-sys-color-on-surface-variant)] font-medium">
            النظام فارغ حالياً. يمكنك البدء بإضافة منتجات جديدة يدوياً أو استعادة نسخة احتياطية سابقة.
          </p>
        </div>
        <input type="file" accept=".json" ref={welcomeFileInputRef} className="hidden" onChange={handleWelcomeFileChange} />
      </MD3Dialog>

      <AppLayout
        title={pageTitle}
        subtitle={state.brandName || 'X2 BABY'}
        brandLogo={state.brandLogo}
        brandName={state.brandName}
        brandSlogan={state.brandSlogan}
        brandSloganDesign={state.brandSloganDesign}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        logout={() => logout()}
      >
        <div className="p-4 md:p-8">
          {routesElement}
        </div>
      </AppLayout>
    </>
  );
};

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
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
  const [loading, setLoading] = useState(true);
  const [importProductsPreview, setImportProductsPreview] = useState<Product[] | null>(null);
  const [importOrdersPreview, setImportOrdersPreview] = useState<Order[] | null>(null);
  const { messages: snackMessages, show: showSnack, dismiss: dismissSnack } = useSnackbar();

  const welcomeFileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    updateManifest();
  }, []);

  useEffect(() => {
    updateFavicon(state.brandLogo);
  }, [state.brandLogo]);

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
    showSnack(message, { type });
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
      if (data.error) {
        setState(prev => ({ ...prev, orders: prevOrders }));
        showNotification(data.error, 'error');
        return;
      }
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
      if (data.error) {
        showNotification(data.error, 'error');
        return;
      }
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

  const handleAddOrder = async (order: Order): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) });
    const data = await res.json();
    if (data.error) {
      showNotification(data.error, 'error');
      return false;
    }
    if (data.activityLogId) pushUndo(data.activityLogId);
    const finalOrder = data.id ? { ...order, id: data.id } : order;
    setState(prev => ({ ...prev, orders: [finalOrder, ...prev.orders], products: data.products || prev.products }));
    showNotification('تم إضافة الطلب', 'success');
    return true;
  };

  const handleUpdateOrder = async (order: Order): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) });
    const data = await res.json();
    if (data.error) {
      showNotification(data.error, 'error');
      return false;
    }
    if (data.activityLogId) pushUndo(data.activityLogId);
    setState(prev => ({ ...prev, orders: prev.orders.map(o => o.id === order.id ? order : o), products: data.products || prev.products }));
    showNotification('تم تحديث الطلب', 'success');
    return true;
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
    showNotification('تم الحفظ بنجاح', 'success');
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
      <MD3Snackbar messages={snackMessages} onDismiss={dismissSnack} />
      </UndoRedoProvider>
    </HashRouter>
    </>
  );
};

export default App;
