import React, { useState, useEffect } from 'react';
import { MD3Dialog, MD3Button, MD3TextField } from './md3';
import { Globe } from 'lucide-react';

const SOURCE_OPTIONS = ['فيسبوك', 'تيك توك', 'جوجل', 'توصية', 'انستجرام', 'سناب شات', 'إعلان', 'زيارة', 'أخرى'];

interface CustomerForm {
  name: string;
  phone: string;
  altPhone: string;
  email: string;
  address: string;
  city: string;
  source: string;
  tags: string;
  notes: string;
  adminNotes: string;
  mapUrl: string;
  latitude: string;
  longitude: string;
}

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CustomerForm) => void;
  initialData?: Partial<CustomerForm>;
  title?: string;
}

export default function CustomerModal({ isOpen, onClose, onSave, initialData, title }: CustomerModalProps) {
  const [form, setForm] = useState<CustomerForm>({
    name: '',
    phone: '',
    altPhone: '',
    email: '',
    address: '',
    city: '',
    source: '',
    tags: '',
    notes: '',
    adminNotes: '',
    mapUrl: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: initialData?.name || '',
        phone: initialData?.phone || '',
        altPhone: initialData?.altPhone || '',
        email: initialData?.email || '',
        address: initialData?.address || '',
        city: initialData?.city || '',
        source: initialData?.source || '',
        tags: initialData?.tags || '',
        notes: initialData?.notes || '',
        adminNotes: initialData?.adminNotes || '',
        mapUrl: initialData?.mapUrl || '',
        latitude: initialData?.latitude || '',
        longitude: initialData?.longitude || '',
      });
    }
  }, [isOpen]);

  const extractMapCoords = (url: string) => {
    const match = url.match(/[?&]q=([-\d.]+),([-\d.]+)/);
    if (match) {
      setForm(prev => ({ ...prev, mapUrl: url, latitude: match[1], longitude: match[2] }));
    } else {
      setForm(prev => ({ ...prev, mapUrl: url }));
    }
  };

  return (
    <MD3Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title || 'بيانات العميل'}
      icon={<span className="material-symbols-rounded" style={{ fontSize: 24 }}>person</span>}
      maxWidth="md"
      actions={[
        { label: 'إلغاء', onClick: onClose, variant: 'text' },
        { label: 'حفظ', onClick: () => { if (!form.name || !form.phone) return; onSave(form); }, variant: 'filled' }
      ]}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MD3TextField label="الاسم *" value={form.name} onChange={(v) => setForm({...form, name: v})} required fullWidth icon={<span className="material-symbols-rounded" style={{ fontSize: 20 }}>person</span>} />
          <MD3TextField label="الهاتف *" value={form.phone} onChange={(v) => setForm({...form, phone: v})} required fullWidth icon={<span className="material-symbols-rounded" style={{ fontSize: 20 }}>phone</span>} />
          <MD3TextField label="هاتف بديل" value={form.altPhone} onChange={(v) => setForm({...form, altPhone: v})} fullWidth />
          <MD3TextField label="البريد الإلكتروني" type="email" value={form.email} onChange={(v) => setForm({...form, email: v})} fullWidth />
          <MD3TextField label="المحافظة" value={form.city} onChange={(v) => setForm({...form, city: v})} fullWidth />
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[var(--md-sys-color-on-surface-variant)]">المصدر</label>
            <select value={form.source} onChange={e => setForm({...form, source: e.target.value})} className="w-full px-4 py-3 bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline)] rounded-xl outline-none text-[14px] font-medium text-[var(--md-sys-color-on-surface)]">
              <option value="">اختر المصدر</option>
              {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <MD3TextField label="العنوان" value={form.address} onChange={(v) => setForm({...form, address: v})} fullWidth />
        <MD3TextField label="رابط خريطة جوجل" value={form.mapUrl} onChange={(v) => extractMapCoords(v)} fullWidth />
        {(form.latitude && form.longitude) && (
          <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--md-sys-color-on-surface-variant)]">
            <Globe size={14} /> {form.latitude}, {form.longitude}
          </div>
        )}
        <MD3TextField label="الوسوم" value={form.tags} onChange={(v) => setForm({...form, tags: v})} fullWidth />
        <MD3TextField label="ملاحظات الإدارة" value={form.adminNotes} onChange={(v) => setForm({...form, adminNotes: v})} fullWidth />
      </div>
    </MD3Dialog>
  );
}
