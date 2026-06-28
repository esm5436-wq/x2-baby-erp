import React from 'react';
import { motion } from 'motion/react';
import { X, User, Phone, Mail, MapPin, Globe, Tag, FileText, Calendar, ShoppingBag, DollarSign, TrendingUp, BarChart3, Star, Copy } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { formatDate } from '../lib/formatDate';
import type { Customer, Order } from '../types';

const CLASSIFICATION_STYLES: Record<string, string> = {
  'ممتاز': 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
  'جيد جداً': 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  'جيد': 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  'تحت المراقبة': 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  'جديد': 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
};

interface CustomerDetailProps {
  customer: Customer;
  orders: Order[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewOrder?: (orderId: string) => void;
}

export default function CustomerDetail({ customer, orders, onClose, onEdit, onDelete, onViewOrder }: CustomerDetailProps) {
  const totalOrders = customer.totalOrders || orders.length;
  const totalSpent = customer.totalSpent || orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const avgOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;
  let tags: string[] = [];
  try { tags = JSON.parse(customer.tags || '[]'); } catch { tags = (customer.tags || '').split(',').map(t => t.trim()).filter(Boolean); }

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-12 overflow-y-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 flex items-center justify-between p-6 pb-4 border-b border-gray-100 dark:border-slate-800">
          <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2"><User size={20} /> {customer.name}</h2>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="px-3 py-1.5 bg-accent/10 text-accent rounded-xl text-[10px] font-black hover:bg-accent/20 transition-colors">تعديل</button>
            <button onClick={onDelete} className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl text-[10px] font-black hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">حذف</button>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"><X size={16} /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 rounded-2xl">
              <ShoppingBag size={18} className="text-blue-500 mb-1" />
              <div className="text-2xl font-black text-gray-900 dark:text-white">{totalOrders}</div>
              <div className="text-[9px] font-black text-blue-500">إجمالي الطلبات</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/10 rounded-2xl">
              <DollarSign size={18} className="text-emerald-500 mb-1" />
              <div className="text-2xl font-black text-gray-900 dark:text-white">{totalSpent.toLocaleString()} <span className="text-[10px] font-black text-gray-400">ج.م</span></div>
              <div className="text-[9px] font-black text-emerald-500">إجمالي الإنفاق</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/10 rounded-2xl">
              <BarChart3 size={18} className="text-purple-500 mb-1" />
              <div className="text-2xl font-black text-gray-900 dark:text-white">{avgOrder.toLocaleString()} <span className="text-[10px] font-black text-gray-400">ج.م</span></div>
              <div className="text-[9px] font-black text-purple-500">متوسط الطلب</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/10 rounded-2xl">
              <Star size={18} className="text-amber-500 mb-1" />
              <div className="text-2xl font-black text-gray-900 dark:text-white">{customer.rating || 0}<span className="text-[10px] font-black text-gray-400">%</span></div>
              <div className="text-[9px] font-black text-amber-500">التقييم</div>
            </div>
          </div>

          {/* Classification Badge */}
          {customer.classification && (
            <div className="flex items-center gap-2">
              <span className={`text-xs font-black px-3 py-1 rounded-full ${CLASSIFICATION_STYLES[customer.classification] || ''}`}>
                {customer.classification}
              </span>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
              <div className="text-[10px] font-black text-gray-400 mb-1.5">رقم الهاتف</div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400">
                <Phone size={13} className="text-gray-400 shrink-0" />
                <span className="font-mono text-sm" dir="ltr">{customer.phone}</span>
                <button onClick={() => navigator.clipboard.writeText(customer.phone || '')} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-blue-500 transition-all" title="نسخ"><Copy size={14} /></button>
                <a href={`tel:${customer.phone}`} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-emerald-500 hover:text-emerald-600 transition-all" title="اتصال"><Phone size={14} /></a>
                <a href={`https://wa.me/20${(customer.phone || '').replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all" title="واتساب"><FaWhatsapp size={15} /></a>
              </div>
            </div>
            {customer.altPhone && (
              <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
                <div className="text-[10px] font-black text-gray-400 mb-1.5">هاتف بديل</div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-500">
                  <Phone size={13} className="text-gray-400 shrink-0" />
                  <span className="font-mono text-sm" dir="ltr">{customer.altPhone}</span>
                  <button onClick={() => navigator.clipboard.writeText(customer.altPhone || '')} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-blue-500 transition-all" title="نسخ"><Copy size={14} /></button>
                  <a href={`tel:${customer.altPhone}`} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-emerald-500 hover:text-emerald-600 transition-all" title="اتصال"><Phone size={14} /></a>
                  <a href={`https://wa.me/20${(customer.altPhone || '').replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all" title="واتساب"><FaWhatsapp size={15} /></a>
                </div>
              </div>
            )}
            {customer.email && (
              <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-2xl flex items-center gap-3">
                <Mail size={16} className="text-gray-400 flex-shrink-0" />
                <div><div className="text-[10px] font-black text-gray-400">البريد الإلكتروني</div><div className="text-sm font-bold text-gray-900 dark:text-white">{customer.email}</div></div>
              </div>
            )}
            {customer.city && (
              <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-2xl flex items-center gap-3">
                <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                <div><div className="text-[10px] font-black text-gray-400">المحافظة</div><div className="text-sm font-bold text-gray-900 dark:text-white">{customer.city}</div></div>
              </div>
            )}
            {customer.source && (
              <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-2xl flex items-center gap-3">
                <Globe size={16} className="text-gray-400 flex-shrink-0" />
                <div><div className="text-[10px] font-black text-gray-400">المصدر</div><div className="text-sm font-bold text-gray-900 dark:text-white">{customer.source}</div></div>
              </div>
            )}
            <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-2xl flex items-center gap-3">
              <Calendar size={16} className="text-gray-400 flex-shrink-0" />
              <div><div className="text-[10px] font-black text-gray-400">تاريخ الإضافة</div><div className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(customer.created_at, 'date')}</div></div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-2xl flex items-center gap-3">
              <Calendar size={16} className="text-gray-400 flex-shrink-0" />
              <div><div className="text-[10px] font-black text-gray-400">آخر طلب</div><div className="text-sm font-bold text-gray-900 dark:text-white">{customer.last_order_date ? formatDate(customer.last_order_date, 'date') : 'لا يوجد'}</div></div>
            </div>
          </div>

          {customer.address && (
            <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
              <div className="text-[10px] font-black text-gray-400 flex items-center gap-1 mb-1"><MapPin size={12} /> العنوان</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">{customer.address}{customer.city ? ` - ${customer.city}` : ''}</div>
            </div>
          )}

          {(customer.map_url || customer.latitude || customer.longitude || customer.city || customer.address) && (
            <div>
              <div className="text-[10px] font-black text-gray-400 flex items-center gap-1 mb-2">
                <Globe size={12} /> موقع العميل على الخريطة
              </div>
              {customer.map_url && (
                <div className="mb-2">
                  <a href={customer.map_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
                    <Globe size={12} /> فتح الخريطة
                  </a>
                </div>
              )}
              <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700">
                <iframe
                  title="موقع العميل"
                  src={
                    (customer.latitude && customer.longitude)
                      ? `https://www.google.com/maps?q=${customer.latitude},${customer.longitude}&z=15&output=embed`
                      : customer.map_url
                      ? customer.map_url
                      : `https://www.google.com/maps?q=${encodeURIComponent(customer.city || customer.address || '')}&z=15&output=embed`
                  }
                  width="100%" height="200" style={{ border: 0 }} allowFullScreen loading="lazy"
                />
              </div>
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <Tag size={14} className="text-gray-400" />
              {tags.map((t, i) => <span key={i} className="px-2.5 py-1 bg-accent/10 text-accent rounded-full text-[10px] font-black">{t}</span>)}
            </div>
          )}

          {customer.admin_notes && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
              <div className="text-[10px] font-black text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-1"><FileText size={12} /> ملاحظات الإدارة</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white whitespace-pre-wrap">{customer.admin_notes}</div>
            </div>
          )}

          {/* Order History */}
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white mb-3 flex items-center gap-2"><ShoppingBag size={16} /> تاريخ الطلبات ({orders.length})</h3>
            {orders.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm font-bold">لا توجد طلبات لهذا العميل</div>
            ) : (
              <div className="space-y-2">
                {orders.map(order => (
                  <div key={order.id} className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">
                        {onViewOrder ? (
                          <button onClick={() => onViewOrder(order.id)} className="text-accent hover:underline font-mono">{order.id}</button>
                        ) : order.id}
                      </div>
                      <div className="text-[10px] font-bold text-gray-400">{formatDate(order.createdAt, 'date')}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-gray-900 dark:text-white">{order.totalAmount?.toLocaleString()} ج.م</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{order.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-[10px] font-bold text-gray-400 text-center">
            تم الإنشاء: {formatDate(customer.created_at, 'full')}
            {customer.updated_at && ` | آخر تحديث: ${formatDate(customer.updated_at, 'full')}`}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
