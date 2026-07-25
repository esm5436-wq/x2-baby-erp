import React from 'react';
import { Phone, Mail, MapPin, Globe, Tag, FileText, Calendar, ShoppingBag, DollarSign, BarChart3, Star, Copy } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { MD3Dialog, MD3StatCard } from './md3';
import { formatDate } from '../lib/formatDate';
import type { Customer, Order } from '../types';

const CLASSIFICATION_STYLES: Record<string, string> = {
  'ممتاز': 'bg-[var(--md-sys-color-success-container)] text-[var(--md-sys-color-on-success-container)]',
  'جيد جداً': 'bg-[var(--md-sys-color-info-container)] text-[var(--md-sys-color-on-info-container)]',
  'جيد': 'bg-[var(--md-sys-color-warning-container)] text-[var(--md-sys-color-on-warning-container)]',
  'تحت المراقبة': 'bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)]',
  'جديد': 'bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)]',
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
    <MD3Dialog
      isOpen={true}
      onClose={onClose}
      title={customer.name}
      icon={<span className="material-symbols-rounded" style={{ fontSize: 24 }}>person</span>}
      maxWidth="lg"
      actions={[
        { label: 'حذف', onClick: onDelete, variant: 'danger' },
        { label: 'تعديل', onClick: onEdit, variant: 'text' }
      ]}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MD3StatCard
            icon={<ShoppingBag size={18} />}
            label="إجمالي الطلبات"
            value={totalOrders}
          />
          <MD3StatCard
            icon={<DollarSign size={18} />}
            label="إجمالي الإنفاق"
            value={totalSpent.toLocaleString()}
            unit="ج.م"
          />
          <MD3StatCard
            icon={<BarChart3 size={18} />}
            label="متوسط الطلب"
            value={avgOrder.toLocaleString()}
            unit="ج.م"
          />
          <MD3StatCard
            icon={<Star size={18} />}
            label="التقييم"
            value={customer.rating || 0}
            unit="%"
          />
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
          <div className="p-3 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl">
            <div className="text-[10px] font-black text-[var(--md-sys-color-outline)] mb-1.5">رقم الهاتف</div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--md-sys-color-on-surface-variant)]">
              <Phone size={13} className="text-[var(--md-sys-color-outline)] shrink-0" />
              <span className="font-mono text-sm text-[var(--md-sys-color-on-surface)]" dir="ltr">{customer.phone}</span>
              <button onClick={() => navigator.clipboard.writeText(customer.phone || '')} className="p-1.5 rounded-lg hover:bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-outline)] hover:text-[var(--md-sys-color-primary)] transition-all" title="نسخ"><Copy size={14} /></button>
              <a href={`tel:${customer.phone}`} className="p-1.5 rounded-lg hover:bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-primary)] transition-all" title="اتصال"><Phone size={14} /></a>
              <a href={`https://wa.me/20${(customer.phone || '').replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-[var(--md-sys-color-success-container)] text-[var(--md-sys-color-success)] hover:text-[var(--md-sys-color-success)] transition-all" title="واتساب"><FaWhatsapp size={15} /></a>
            </div>
          </div>
          {customer.altPhone && (
            <div className="p-3 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl">
              <div className="text-[10px] font-black text-[var(--md-sys-color-outline)] mb-1.5">هاتف بديل</div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--md-sys-color-on-surface-variant)]">
                <Phone size={13} className="text-[var(--md-sys-color-outline)] shrink-0" />
                <span className="font-mono text-sm text-[var(--md-sys-color-on-surface)]" dir="ltr">{customer.altPhone}</span>
                <button onClick={() => navigator.clipboard.writeText(customer.altPhone || '')} className="p-1.5 rounded-lg hover:bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-outline)] hover:text-[var(--md-sys-color-primary)] transition-all" title="نسخ"><Copy size={14} /></button>
                <a href={`tel:${customer.altPhone}`} className="p-1.5 rounded-lg hover:bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-primary)] transition-all" title="اتصال"><Phone size={14} /></a>
                <a href={`https://wa.me/20${(customer.altPhone || '').replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-[var(--md-sys-color-success-container)] text-[var(--md-sys-color-success)] hover:text-[var(--md-sys-color-success)] transition-all" title="واتساب"><FaWhatsapp size={15} /></a>
              </div>
            </div>
          )}
          {customer.email && (
            <div className="p-3 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl flex items-center gap-3">
              <Mail size={16} className="text-[var(--md-sys-color-outline)] flex-shrink-0" />
              <div><div className="text-[10px] font-black text-[var(--md-sys-color-outline)]">البريد الإلكتروني</div><div className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">{customer.email}</div></div>
            </div>
          )}
          {customer.city && (
            <div className="p-3 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl flex items-center gap-3">
              <MapPin size={16} className="text-[var(--md-sys-color-outline)] flex-shrink-0" />
              <div><div className="text-[10px] font-black text-[var(--md-sys-color-outline)]">المحافظة</div><div className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">{customer.city}</div></div>
            </div>
          )}
          {customer.source && (
            <div className="p-3 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl flex items-center gap-3">
              <Globe size={16} className="text-[var(--md-sys-color-outline)] flex-shrink-0" />
              <div><div className="text-[10px] font-black text-[var(--md-sys-color-outline)]">المصدر</div><div className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">{customer.source}</div></div>
            </div>
          )}
          <div className="p-3 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl flex items-center gap-3">
            <Calendar size={16} className="text-[var(--md-sys-color-outline)] flex-shrink-0" />
            <div><div className="text-[10px] font-black text-[var(--md-sys-color-outline)]">تاريخ الإضافة</div><div className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">{formatDate(customer.created_at, 'date')}</div></div>
          </div>
          <div className="p-3 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl flex items-center gap-3">
            <Calendar size={16} className="text-[var(--md-sys-color-outline)] flex-shrink-0" />
            <div><div className="text-[10px] font-black text-[var(--md-sys-color-outline)]">آخر طلب</div><div className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">{customer.last_order_date ? formatDate(customer.last_order_date, 'date') : 'لا يوجد'}</div></div>
          </div>
        </div>

        {customer.address && (
          <div className="p-3 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl">
            <div className="text-[10px] font-black text-[var(--md-sys-color-outline)] flex items-center gap-1 mb-1"><MapPin size={12} /> العنوان</div>
            <div className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">{customer.address}{customer.city ? ` - ${customer.city}` : ''}</div>
          </div>
        )}

        {(customer.map_url || customer.latitude || customer.longitude || customer.city || customer.address) && (
          <div>
            <div className="text-[10px] font-black text-[var(--md-sys-color-outline)] flex items-center gap-1 mb-2">
              <Globe size={12} /> موقع العميل على الخريطة
            </div>
            {customer.map_url && (
              <div className="mb-2">
                <a href={customer.map_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-bold text-[var(--md-sys-color-primary)] hover:underline flex items-center gap-1">
                  <Globe size={12} /> فتح الخريطة
                </a>
              </div>
            )}
            <div className="rounded-2xl overflow-hidden border border-[var(--md-sys-color-outline-variant)]/20">
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
            <Tag size={14} className="text-[var(--md-sys-color-outline)]" />
            {tags.map((t, i) => <span key={i} className="px-2.5 py-1 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] rounded-full text-[10px] font-black">{t}</span>)}
          </div>
        )}

        {customer.admin_notes && (
          <div className="p-3 bg-[var(--md-sys-color-warning-container)] rounded-2xl border border-[var(--md-sys-color-outline-variant)]/20">
            <div className="text-[10px] font-black text-[var(--md-sys-color-on-warning-container)] flex items-center gap-1 mb-1"><FileText size={12} /> ملاحظات الإدارة</div>
            <div className="text-sm font-bold text-[var(--md-sys-color-on-surface)] whitespace-pre-wrap">{customer.admin_notes}</div>
          </div>
        )}

        {/* Order History */}
        <div>
          <h3 className="text-sm font-black text-[var(--md-sys-color-on-surface)] mb-3 flex items-center gap-2"><ShoppingBag size={16} /> تاريخ الطلبات ({orders.length})</h3>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-[var(--md-sys-color-outline)] text-sm font-bold">لا توجد طلبات لهذا العميل</div>
          ) : (
            <div className="space-y-2">
              {orders.map(order => (
                <div key={order.id} className="p-3 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">
                      {onViewOrder ? (
                        <button onClick={() => onViewOrder(order.id)} className="text-[var(--md-sys-color-primary)] hover:underline font-mono">{order.id}</button>
                      ) : order.id}
                    </div>
                    <div className="text-[10px] font-bold text-[var(--md-sys-color-outline)]">{formatDate(order.createdAt, 'date')}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-[var(--md-sys-color-on-surface)]">{order.totalAmount?.toLocaleString()} ج.م</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]">{order.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-[10px] font-bold text-[var(--md-sys-color-outline)] text-center">
          تم الإنشاء: {formatDate(customer.created_at, 'full')}
          {customer.updated_at && ` | آخر تحديث: ${formatDate(customer.updated_at, 'full')}`}
        </div>
      </div>
    </MD3Dialog>
  );
}
