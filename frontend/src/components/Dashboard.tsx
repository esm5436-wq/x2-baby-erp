import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { AppState } from '../types';
import { MD3StatCard } from './md3/MD3Misc';
import { MD3Button } from './md3/MD3Button';
import CollapsibleSection from './CollapsibleSection';

interface DashboardProps {
  state: AppState;
}

const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  const { uiTheme } = useTheme();
  const isMD3 = uiTheme === 'material3';
  const navigate = useNavigate();

  const totalProducts = state.products.length;
  const totalOrders = state.orders.length;
  const totalCustomers = state.customers.length;
  const totalSales = state.orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const pendingOrders = state.orders.filter(o => 
    o.status === 'تحت المراجعة' || o.status === 'في انتظار الدفع'
  ).length;

  const recentOrders = [...state.orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const quickLinks = [
    { label: 'المخزون', icon: 'inventory_2', path: '/inventory' },
    { label: 'الطلبات', icon: 'shopping_bag', path: '/orders' },
    { label: 'المشتريات', icon: 'shopping_cart', path: '/purchases' },
    { label: 'العملاء', icon: 'people', path: '/customers' },
    { label: 'الحسابات', icon: 'account_balance', path: '/accounts' },
    { label: 'جهات الاتصال', icon: 'contacts', path: '/contacts' },
  ];

  if (!isMD3) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
        <div className="w-full">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">لوحة التحكم</h1>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500 dark:text-gray-400">المنتجات</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalProducts}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500 dark:text-gray-400">الطلبات</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalOrders}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500 dark:text-gray-400">العملاء</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalCustomers}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500 dark:text-gray-400">إجمالي المبيعات</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalSales)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">روابط سريعة</h2>
              <div className="grid grid-cols-2 gap-3">
                {quickLinks.map(link => (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                  >
                    <span className="material-symbols-rounded text-gray-600 dark:text-gray-300">{link.icon}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{link.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">آخر الطلبات</h2>
              {recentOrders.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">لا توجد طلبات بعد</p>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map(order => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{order.customerName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{order.status}</div>
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(order.totalAmount)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--md-sys-color-surface)]">
      <div className="p-4 md:p-8">
        <div className="w-full">
          
          {/* Stats Grid */}
          <CollapsibleSection title="الإحصائيات" icon={<span className="material-symbols-rounded" style={{ fontSize: 18 }}>bar_chart</span>} mobileOnly defaultOpen={false}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
              <MD3StatCard
                icon={<span className="material-symbols-rounded md3-icon-filled">inventory_2</span>}
                label="المنتجات"
                value={totalProducts}
                iconBg="bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"
              />
              <MD3StatCard
                icon={<span className="material-symbols-rounded md3-icon-filled">shopping_bag</span>}
                label="الطلبات"
                value={totalOrders}
                subtitle={pendingOrders > 0 ? `${pendingOrders} طلب معلق` : undefined}
                iconBg="bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]"
              />
              <MD3StatCard
                icon={<span className="material-symbols-rounded md3-icon-filled">people</span>}
                label="العملاء"
                value={totalCustomers}
                iconBg="bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)]"
              />
              <MD3StatCard
                icon={<span className="material-symbols-rounded md3-icon-filled">payments</span>}
                label="إجمالي المبيعات"
                value={formatCurrency(totalSales)}
                iconBg="bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"
              />
            </div>
          </CollapsibleSection>

          {/* Quick Links */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-[var(--md-sys-color-on-surface)] mb-4">روابط سريعة</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {quickLinks.map(link => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[var(--md-sys-color-surface-container-low)] hover:bg-[var(--md-sys-color-surface-container)] transition-colors group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[var(--md-sys-color-primary-container)] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-rounded text-[var(--md-sys-color-on-primary-container)]">{link.icon}</span>
                  </div>
                  <span className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">{link.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-[var(--md-sys-color-surface-container-low)] rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--md-sys-color-on-surface)]">آخر الطلبات</h2>
              <MD3Button
                variant="text"
                onClick={() => navigate('/orders')}
              >
                عرض الكل
              </MD3Button>
            </div>
            
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-symbols-rounded text-4xl text-[var(--md-sys-color-on-surface-variant)] mb-2">shopping_bag</span>
                <p className="text-sm text-[var(--md-sys-color-on-surface-variant)]">لا توجد طلبات بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map(order => (
                  <div 
                    key={order.id} 
                    className="flex items-center justify-between p-4 rounded-2xl bg-[var(--md-sys-color-surface)] hover:bg-[var(--md-sys-color-surface-container)] transition-colors cursor-pointer"
                    onClick={() => navigate('/orders')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--md-sys-color-primary-container)] flex items-center justify-center">
                        <span className="material-symbols-rounded text-[var(--md-sys-color-on-primary-container)]">person</span>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">{order.customerName}</div>
                        <div className="text-xs text-[var(--md-sys-color-on-surface-variant)]">{order.status}</div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">{formatCurrency(order.totalAmount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default React.memo(Dashboard);
