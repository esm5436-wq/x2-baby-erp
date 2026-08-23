import { Package, ShoppingBag, BarChart3, Settings, Users, UserCheck, Activity, Sparkles } from 'lucide-react';
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export interface NavItem {
  to: string;
  icon: React.ReactNode;
  md3Icon: string;
  label: string;
  shortLabel: string;
  section?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: React.createElement(BarChart3, { size: 20 }), md3Icon: 'home', label: 'الرئيسية', shortLabel: 'الرئيسية' },
  { to: '/assistant', icon: React.createElement(Sparkles, { size: 20 }), md3Icon: 'smart_toy', label: 'المساعد الذكي', shortLabel: 'المساعد' },
  { to: '/inventory', icon: React.createElement(Package, { size: 20 }), md3Icon: 'inventory_2', label: 'المخزون', shortLabel: 'المخزون', section: 'products' },
  { to: '/orders', icon: React.createElement(ShoppingBag, { size: 20 }), md3Icon: 'shopping_bag', label: 'الطلبات', shortLabel: 'الطلبات', section: 'orders' },
  { to: '/purchases', icon: React.createElement(ShoppingBag, { size: 20 }), md3Icon: 'shopping_cart', label: 'المشتريات', shortLabel: 'مشتريات', section: 'purchases' },
  { to: '/accounts', icon: React.createElement(BarChart3, { size: 20 }), md3Icon: 'account_balance', label: 'الحسابات والمالية', shortLabel: 'الحسابات', section: 'accounts' },
  { to: '/contacts', icon: React.createElement(Users, { size: 20 }), md3Icon: 'contacts', label: 'جهات الاتصال', shortLabel: 'جهات', section: 'contacts' },
  { to: '/customers', icon: React.createElement(UserCheck, { size: 20 }), md3Icon: 'people', label: 'العملاء', shortLabel: 'عملاء', section: 'customers' },
  { to: '/activity-logs', icon: React.createElement(Activity, { size: 20 }), md3Icon: 'history', label: 'سجل النشاطات', shortLabel: 'نشاطات', section: 'activity-logs' },
  { to: '/settings', icon: React.createElement(Settings, { size: 20 }), md3Icon: 'settings', label: 'إدارة البيانات', shortLabel: 'البيانات', section: 'settings' },
];

export const BOTTOM_NAV_PRIMARY_ROUTES = ['/', '/inventory', '/orders', '/customers'];
export const BOTTOM_NAV_MORE_ROUTES = ['/assistant', '/purchases', '/accounts', '/contacts', '/activity-logs', '/settings'];

export function useVisibleNavItems(): NavItem[] {
  const { canView } = useAuth();
  return NAV_ITEMS.filter(item => !item.section || canView(item.section));
}

export const NAV_COLORS = [
  'bg-primary text-blue-900',
  'bg-violet-50 text-violet-900',
  'bg-secondary text-red-900',
  'bg-indigo-50 text-indigo-900',
  'bg-accent text-white',
  'bg-teal-50 text-teal-900',
  'bg-pink-50 text-pink-900',
  'bg-amber-50 text-amber-900',
  'bg-indigo-50 text-indigo-900',
  'bg-gray-200 text-gray-900',
];
