import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, User, Phone, Mail, MapPin, Globe, Tag, FileText, Navigation, RefreshCw } from 'lucide-react';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    onSave(form);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-lg shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-6 pb-0">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">{title || 'بيانات العميل'}</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 pr-1 flex items-center gap-1"><User size={12} /> الاسم <span className="text-red-400">*</span></label>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none text-gray-900 dark:text-white text-sm font-bold" placeholder="اسم العميل" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 pr-1 flex items-center gap-1"><Phone size={12} /> الهاتف <span className="text-red-400">*</span></label>
                  <input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none text-gray-900 dark:text-white text-sm font-bold font-mono" placeholder="01xxxxxxxxx" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 pr-1">هاتف بديل</label>
                  <input value={form.altPhone} onChange={e => setForm({...form, altPhone: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none text-gray-900 dark:text-white text-sm font-bold font-mono" placeholder="01xxxxxxxxx" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 pr-1 flex items-center gap-1"><Mail size={12} /> البريد الإلكتروني</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none text-gray-900 dark:text-white text-sm font-bold" placeholder="email@example.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 pr-1 flex items-center gap-1"><MapPin size={12} /> المحافظة</label>
                  <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none text-gray-900 dark:text-white text-sm font-bold" placeholder="المحافظة" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 pr-1 flex items-center gap-1"><Globe size={12} /> المصدر</label>
                  <select value={form.source} onChange={e => setForm({...form, source: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none text-gray-900 dark:text-white text-sm font-bold">
                    <option value="">اختر المصدر</option>
                    {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 pr-1 flex items-center gap-1"><MapPin size={12} /> العنوان</label>
                <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none text-gray-900 dark:text-white text-sm font-bold" placeholder="العنوان التفصيلي" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 pr-1 flex items-center gap-1"><Navigation size={12} /> رابط خريطة جوجل</label>
                <input value={form.mapUrl} onChange={e => extractMapCoords(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none text-gray-900 dark:text-white text-sm font-bold font-mono" placeholder="https://maps.google.com/?q=30.0444,31.2357" />
                {(form.latitude && form.longitude) && (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                    <Globe size={10} /> {form.latitude}, {form.longitude}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 pr-1 flex items-center gap-1"><Tag size={12} /> الوسوم (Tags)</label>
                <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none text-gray-900 dark:text-white text-sm font-bold" placeholder="وسم1, وسم2, وسم3" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 pr-1 flex items-center gap-1"><FileText size={12} /> ملاحظات الإدارة</label>
                <textarea value={form.adminNotes} onChange={e => setForm({...form, adminNotes: e.target.value})} rows={2} className="w-full px-3 py-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl outline-none text-gray-900 dark:text-white text-sm font-bold resize-none" placeholder="ملاحظات داخلية للإدارة..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2"><Save size={16} /> حفظ</button>
                <button type="button" onClick={onClose} className="px-6 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 rounded-xl font-black text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-all">إلغاء</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
