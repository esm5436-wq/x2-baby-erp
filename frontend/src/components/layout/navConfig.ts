import { Package, ShoppingBag, BarChart3, Settings, Users, UserCheck, Activity, ArrowRightLeft } from 'lucide-react';
import React from 'react';

export interface NavItem {
  to: string;
  icon: React.ReactNode;
  md3Icon: string;
  label: string;
  shortLabel: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: React.createElement(BarChart3, { size: 20 }), md3Icon: 'home', label: 'الرئيسية', shortLabel: 'الرئيسية' },
  { to: '/inventory', icon: React.createElement(Package, { size: 20 }), md3Icon: 'inventory_2', label: 'المخزون', shortLabel: 'المخزون' },
  { to: '/orders', icon: React.createElement(ShoppingBag, { size: 20 }), md3Icon: 'shopping_bag', label: 'الطلبات', shortLabel: 'الطلبات' },
  { to: '/purchases', icon: React.createElement(ShoppingBag, { size: 20 }), md3Icon: 'shopping_cart', label: 'المشتريات', shortLabel: 'مشتريات' },
  { to: '/accounts', icon: React.createElement(BarChart3, { size: 20 }), md3Icon: 'account_balance', label: 'الحسابات والمالية', shortLabel: 'الحسابات' },
  { to: '/contacts', icon: React.createElement(Users, { size: 20 }), md3Icon: 'contacts', label: 'جهات الاتصال', shortLabel: 'جهات' },
  { to: '/customers', icon: React.createElement(UserCheck, { size: 20 }), md3Icon: 'people', label: 'العملاء', shortLabel: 'عملاء' },
  { to: '/activity-logs', icon: React.createElement(Activity, { size: 20 }), md3Icon: 'history', label: 'سجل النشاطات', shortLabel: 'نشاطات' },
  { to: '/easy-orders', icon: React.createElement(ArrowRightLeft, { size: 20 }), md3Icon: 'swap_horiz', label: 'Easy Orders', shortLabel: 'Easy Orders' },
  { to: '/settings', icon: React.createElement(Settings, { size: 20 }), md3Icon: 'settings', label: 'إدارة البيانات', shortLabel: 'البيانات' },
];

export const BOTTOM_NAV_PRIMARY_INDICES = [0, 1, 2, 6];
export const BOTTOM_NAV_MORE_INDICES = [3, 4, 5, 7, 8, 9];

export const NAV_COLORS = [
  'bg-primary text-blue-900',
  'bg-secondary text-red-900',
  'bg-indigo-50 text-indigo-900',
  'bg-accent text-white',
  'bg-teal-50 text-teal-900',
  'bg-pink-50 text-pink-900',
  'bg-amber-50 text-amber-900',
  'bg-indigo-50 text-indigo-900',
  'bg-gray-200 text-gray-900',
  'bg-gray-200 text-gray-900',
];
