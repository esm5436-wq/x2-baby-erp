import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUnsavedCheck } from '../hooks/useUnsavedCheck';
import { X, Save, Building2, Phone, Mail, MapPin, Tag, FileText, Briefcase, Hash, ChevronDown, Plus, Trash2, Navigation, User, DollarSign, Package, Truck, MessageCircle, Send, Globe, ExternalLink, Link2 } from 'lucide-react';
import { FaWhatsapp, FaTelegram, FaFacebook, FaInstagram, FaTiktok, FaYoutube, FaTwitter, FaLinkedin, FaSnapchat, FaGlobe, FaLink } from 'react-icons/fa';
import { Contact } from '../types';
import { formatDate } from '../lib/formatDate';

const ENTITY_TYPES = ['مصنع', 'تاجر جملة', 'مقدم خدمة', 'مستورد', 'شركة شحن', 'شركة تسويق', 'شركات الطباعه و التغليف', 'أخرى'];

const RATING_CATEGORIES: Record<string, string[]> = {
  'السعر': ['رخيص', 'طبيعي/معقول', 'غالي', 'غالي جدا'],
  'الجوده': ['اعلى جوده', 'عاليه', 'اقتصاديه', 'رديئه'],
  'المرونه': ['متعاون جدا', 'متعاون', 'طبيعي', 'صارم جدا'],
  'الالتزام بالمواعيد': ['ممتاز', 'جيد', 'متوسط', 'سيء'],
  'سرعة الرد': ['سريع', 'متوسط', 'بطيء'],
  'تنوع المنتجات': ['ممتاز', 'جيد', 'متوسط', 'ضعيف'],
  'الاداء': ['ممتاز', 'جيد', 'متوسط', 'ضعيف'],
  'سرعة التوصيل': ['سريع', 'متوسط', 'بطيء'],
  'تغطية المحافظات': ['واسعه', 'متوسطه', 'ضيقه'],
  'الحفاظ على المنتج': ['ممتاز', 'جيد', 'متوسط', 'سيء'],
  'سهولة التتبع و التواصل': ['ممتاز', 'جيد', 'متوسط', 'سيء'],
  'تسليم جزئي': ['نعم', 'لا'],
  'امكانية استلام مصاريف الشحن فقط': ['نعم', 'لا'],
  'الاستبدال': ['نعم', 'لا'],
  'رأي العملاء السابقين': ['إيجابي', 'محايد', 'سلبي'],
};

const RATING_SPECIAL = ['التحصيل', 'اقل عدد بيك اب', 'رسوم البيك اب', 'رسوم التحصيل', 'حد أدنى للشحنات', 'عدد الشحنات', 'سعر الشحن قاهره وجيزه'];

const ENTITY_RATING_MAP: Record<string, string[]> = {
  'مصنع': ['السعر', 'الجوده', 'المرونه', 'الالتزام بالمواعيد', 'سرعة الرد', 'تنوع المنتجات'],
  'تاجر جملة': ['السعر', 'الجوده', 'المرونه', 'الالتزام بالمواعيد', 'سرعة الرد', 'تنوع المنتجات'],
  'مقدم خدمة': ['المرونه', 'الالتزام بالمواعيد', 'سرعة الرد'],
  'مستورد': ['السعر', 'الجوده', 'الالتزام بالمواعيد'],
  'شركة شحن': ['السعر', 'المرونه', 'الالتزام بالمواعيد', 'سرعة الرد', 'سرعة التوصيل', 'تغطية المحافظات', 'الحفاظ على المنتج', 'سهولة التتبع و التواصل', 'التحصيل', 'اقل عدد بيك اب', 'رسوم البيك اب', 'حد أدنى للشحنات', 'سعر الشحن قاهره وجيزه', 'تسليم جزئي', 'امكانية استلام مصاريف الشحن فقط', 'الاستبدال', 'رأي العملاء السابقين'],
  'شركة تسويق': ['السعر', 'المرونه', 'الالتزام بالمواعيد', 'سرعة الرد', 'الاداء'],
  'شركات الطباعه و التغليف': ['السعر', 'الجوده', 'المرونه', 'الالتزام بالمواعيد', 'سرعة الرد', 'تنوع المنتجات'],
  'أخرى': ['السعر', 'الجوده', 'المرونه', 'الالتزام بالمواعيد', 'سرعة الرد', 'تنوع المنتجات'],
};

const ALL_RATING_COLORS: Record<string, string> = {
  'رخيص': 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700',
  'طبيعي/معقول': 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700',
  'غالي': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700',
  'غالي جدا': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700',
  'اعلى جوده': 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700',
  'عاليه': 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700',
  'اقتصاديه': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700',
  'رديئه': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700',
  'متعاون جدا': 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700',
  'متعاون': 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700',
  'طبيعي': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700',
  'صارم جدا': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700',
  'ممتاز': 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700',
  'جيد': 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700',
  'متوسط': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700',
  'سيء': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700',
  'سريع': 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700',
  'بطيء': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700',
  'واسعه': 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700',
  'متوسطه': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700',
  'ضيقه': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700',
  'ضعيف': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700',
  'نعم': 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700',
  'لا': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700',
};

interface ContactModalProps {
  contact?: Contact;
  specializations: string[];
  onClose: () => void;
  onSave: (data: any) => void;
  onDeleteSpecialization?: (name: string) => void;
}

function parseGoogleMapsUrl(url: string): { lat: string; lng: string } | null {
  if (!url) return null;

  const patterns = [
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /\/maps\/place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];

  for (const p of patterns) {
    const m = url.match(p);
    if (m) return { lat: m[1], lng: m[2] };
  }
  return null;
}

const ContactModal: React.FC<ContactModalProps> = ({ contact, specializations, onClose, onSave, onDeleteSpecialization }) => {
  const [form, setForm] = useState({
    companyName: '', phone: '', phone2: '', contactPerson: '', extraPhones: '[]',
    email: '', address: '', specialization: '', entityType: 'أخرى',
    taxId: '', commercialRegistry: '', notes: '', status: 'نشط',
    latitude: '', longitude: '', mapUrl: '',
    ratingsEnabled: false, ratingsData: '{}'
  });
  const [extraPhonesList, setExtraPhonesList] = useState<{ phone: string; name: string }[]>([]);
  const [linksList, setLinksList] = useState<{ type: string; url: string; label?: string }[]>([]);
  const [newLinkType, setNewLinkType] = useState('whatsapp');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [ratingsDataObj, setRatingsDataObj] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSpecs, setShowSpecs] = useState(false);
  const [specFilter, setSpecFilter] = useState('');
  const specRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contact) {
      const parsed = contact.extraPhones ? JSON.parse(contact.extraPhones) : [];
      setForm({
        companyName: contact.companyName || '',
        phone: contact.phone || '',
        phone2: contact.phone2 || '',
        contactPerson: contact.contactPerson || '',
        extraPhones: contact.extraPhones || '[]',
        email: contact.email || '',
        address: contact.address || '',
        specialization: contact.specialization || '',
        entityType: contact.entityType || 'أخرى',
        taxId: contact.taxId || '',
        commercialRegistry: contact.commercialRegistry || '',
        notes: contact.notes || '',
        status: contact.status || 'نشط',
        latitude: contact.latitude || '',
        longitude: contact.longitude || '',
        mapUrl: contact.mapUrl || '',
        ratingsEnabled: contact.ratingsEnabled ? true : false,
        ratingsData: contact.ratingsData || '{}',
      });
      setExtraPhonesList(parsed);
      try {
        const linksParsed = contact.links ? JSON.parse(contact.links) : [];
        setLinksList(linksParsed);
      } catch { setLinksList([]); }
      try { setRatingsDataObj(JSON.parse(contact.ratingsData || '{}')); } catch { setRatingsDataObj({}); }
    }
  }, [contact]);

  const visibleCategories = useMemo(() => {
    return ENTITY_RATING_MAP[form.entityType] || ENTITY_RATING_MAP['أخرى'];
  }, [form.entityType]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (specRef.current && !specRef.current.contains(e.target as Node)) {
        setShowSpecs(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (form.ratingsEnabled) {
      setRatingsDataObj(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(RATING_CATEGORIES).forEach(cat => {
          if (!visibleCategories.includes(cat) && next[cat]) {
            delete next[cat];
            changed = true;
          }
        });
        RATING_SPECIAL.forEach(cat => {
          if (!visibleCategories.includes(cat) && next[cat]) {
            delete next[cat];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [form.entityType]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.companyName.trim()) errs.companyName = 'اسم الشركة مطلوب';
    if (form.phone && !/^01[0-9]{9}$/.test(form.phone)) errs.phone = 'رقم هاتف غير صالح (11 رقم، يبدأ 01)';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'بريد إلكتروني غير صالح';

    extraPhonesList.forEach((ep, i) => {
      if (ep.phone && !/^01[0-9]{9}$/.test(ep.phone)) errs[`extraPhone-${i}`] = `الرقم ${i + 1} غير صالح`;
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const cleanRatings = Object.fromEntries(
      Object.entries(ratingsDataObj).filter(([_, v]) => v !== '')
    );
    onSave({
      ...form,
      extraPhones: JSON.stringify(extraPhonesList.filter(ep => ep.phone)),
      ratingsData: JSON.stringify(cleanRatings),
      links: JSON.stringify(linksList),
    });
  };

  const filteredSpecs = specializations.filter(s =>
    s.toLowerCase().includes(specFilter.toLowerCase())
  );

  const handleMapUrlChange = (url: string) => {
    setForm(prev => ({ ...prev, mapUrl: url }));
    const coords = parseGoogleMapsUrl(url);
    if (coords) {
      setForm(prev => ({ ...prev, mapUrl: url, latitude: coords.lat, longitude: coords.lng }));
    }
  };

  const addExtraPhone = () => {
    setExtraPhonesList(prev => [...prev, { phone: '', name: '' }]);
  };
  const removeExtraPhone = (i: number) => {
    setExtraPhonesList(prev => prev.filter((_, idx) => idx !== i));
  };
  const updateExtraPhone = (i: number, field: 'phone' | 'name', val: string) => {
    setExtraPhonesList(prev => prev.map((ep, idx) => idx === i ? { ...ep, [field]: val } : ep));
  };

  const addLink = () => {
    if (!newLinkUrl.trim()) return;
    setLinksList(prev => [...prev, { type: newLinkType, url: newLinkUrl.trim(), label: undefined }]);
    setNewLinkUrl('');
  };
  const removeLink = (i: number) => {
    setLinksList(prev => prev.filter((_, idx) => idx !== i));
  };
  const generateLink = (type: string) => {
    const phone = form.phone || form.phone2;
    if (!phone) return;
    const cleaned = phone.replace(/[^0-9]/g, '').replace(/^0/, '20');
    const url = type === 'whatsapp' ? `https://wa.me/${cleaned}` : `https://t.me/${cleaned}`;
    const exists = linksList.some(l => l.type === type && l.url === url);
    if (!exists) setLinksList(prev => [...prev, { type, url }]);
  };
  const detectLinkType = (url: string): string => {
    if (/wa\.me|whatsapp/i.test(url)) return 'whatsapp';
    if (/t\.me|telegram/i.test(url)) return 'telegram';
    if (/facebook\.com|fb\.com/i.test(url)) return 'facebook';
    if (/instagram\.com|instagr\.am/i.test(url)) return 'instagram';
    if (/tiktok\.com|vm\.tiktok/i.test(url)) return 'tiktok';
    if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
    if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
    if (/linkedin\.com/i.test(url)) return 'linkedin';
    if (/snapchat\.com/i.test(url)) return 'snapchat';
    if (/^https?:\/\//i.test(url)) return 'website';
    return 'other';
  };

  const LINK_ICONS: Record<string, React.ReactNode> = {
    whatsapp: <FaWhatsapp size={16} className="text-emerald-500" />,
    telegram: <FaTelegram size={16} className="text-sky-500" />,
    website: <FaGlobe size={16} className="text-purple-500" />,
    facebook: <FaFacebook size={16} className="text-blue-600" />,
    instagram: <FaInstagram size={16} className="text-pink-500" />,
    tiktok: <FaTiktok size={16} className="text-gray-900 dark:text-gray-100" />,
    youtube: <FaYoutube size={16} className="text-red-500" />,
    twitter: <FaTwitter size={16} className="text-blue-400" />,
    linkedin: <FaLinkedin size={16} className="text-blue-700" />,
    snapchat: <FaSnapchat size={16} className="text-yellow-500" />,
    other: <FaLink size={16} className="text-gray-400" />,
  };

  const { withUnsavedCheck } = useUnsavedCheck(form);

  const hasCoords = form.latitude && form.longitude;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => withUnsavedCheck(onClose)}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 rounded-t-[32px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                <Building2 size={20} className="text-teal-600 dark:text-teal-400" />
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">
                {contact ? 'تعديل جهة اتصال' : 'إضافة جهة اتصال جديدة'}
              </h2>
            </div>
            <button onClick={() => withUnsavedCheck(onClose)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all">
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          {contact && (
            <div className="px-6 pt-2 pb-0">
              <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 dark:text-gray-500">
                <span>تاريخ الإضافة: {formatDate(contact.createdAt, 'full')}</span>
                {contact.updatedAt && <><span className="opacity-40">|</span><span>آخر تعديل: {formatDate(contact.updatedAt, 'full')}</span></>}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Company Name */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 flex items-center gap-1.5">
                <Building2 size={14} /> اسم الشركة أو الجهة <span className="text-red-500">*</span>
              </label>
              <input
                value={form.companyName}
                onChange={e => setForm({ ...form, companyName: e.target.value })}
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 rounded-2xl outline-none font-bold text-gray-900 dark:text-white focus:border-accent transition-all ${errors.companyName ? 'border-red-300 dark:border-red-700' : 'border-gray-100 dark:border-slate-700'}`}
                placeholder="أدخل اسم الشركة"
              />
              {errors.companyName && <p className="text-[11px] text-red-500 font-bold pr-2">{errors.companyName}</p>}
            </div>

            {/* Primary Phone + Contact Person */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 flex items-center gap-1.5">
                  <Phone size={14} /> رقم الهاتف الأساسي
                </label>
                <input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  onBlur={() => {
                    const phone = form.phone?.replace(/[^0-9]/g, '').replace(/^0/, '20');
                    if (phone && phone.length >= 10) {
                      const url = `https://wa.me/${phone}`;
                      const exists = linksList.some(l => l.type === 'whatsapp' && l.url === url);
                      if (!exists) setLinksList(prev => [...prev, { type: 'whatsapp', url }]);
                    }
                  }}
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 rounded-2xl outline-none font-bold text-gray-900 dark:text-white focus:border-accent transition-all ${errors.phone ? 'border-red-300 dark:border-red-700' : 'border-gray-100 dark:border-slate-700'}`}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                />
                {errors.phone && <p className="text-[11px] text-red-500 font-bold pr-2">{errors.phone}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 flex items-center gap-1.5">
                  <User size={14} /> اسم المسؤول عن الرقم
                </label>
                <input
                  value={form.contactPerson}
                  onChange={e => setForm({ ...form, contactPerson: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-gray-900 dark:text-white focus:border-accent transition-all"
                  placeholder="مثال: أحمد علي"
                />
              </div>
            </div>

            {/* Extra Phones */}
            {(extraPhonesList.length > 0) && (
              <div className="space-y-3 pr-2">
                {extraPhonesList.map((ep, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
                    <input
                      value={ep.phone}
                      onChange={e => updateExtraPhone(i, 'phone', e.target.value)}
                      placeholder="رقم إضافي"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border-2 rounded-2xl outline-none font-bold text-sm text-gray-900 dark:text-white focus:border-accent transition-all border-gray-100 dark:border-slate-700"
                      dir="ltr"
                    />
                    <div className="flex gap-2">
                      <input
                        value={ep.name}
                        onChange={e => updateExtraPhone(i, 'name', e.target.value)}
                        placeholder="اسم المسؤول"
                        className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm text-gray-900 dark:text-white focus:border-accent transition-all"
                      />
                      <button type="button" onClick={() => removeExtraPhone(i)}
                        className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Phone Button */}
            <button type="button" onClick={addExtraPhone}
              className="text-[11px] font-black text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 border border-teal-200 dark:border-teal-800">
              <Plus size={14} /> إضافة رقم آخر
            </button>

            {/* Social Links */}
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 flex items-center gap-1.5">
                <Link2 size={14} /> روابط التواصل
              </label>

              {/* Generate quick links from phone */}
              {(form.phone || form.phone2) && (
                <div className="flex gap-2 flex-wrap">
                  <button type="button" onClick={() => generateLink('whatsapp')}
                    className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all flex items-center gap-1">
                    <MessageCircle size={12} /> إنشاء رابط واتساب
                  </button>
                  <button type="button" onClick={() => generateLink('telegram')}
                    className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-all flex items-center gap-1">
                    <Send size={12} /> إنشاء رابط تيليجرام
                  </button>
                </div>
              )}

              {/* Add new link */}
              <div className="flex flex-wrap gap-2 items-end">
                <input value={newLinkUrl} onChange={e => {
                  const val = e.target.value;
                  setNewLinkUrl(val);
                  setNewLinkType(detectLinkType(val));
                }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
                  placeholder="لصق الرابط - يتم التعرف على النوع تلقائياً..."
                  className="flex-1 min-w-[200px] px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-xl outline-none font-bold text-xs text-gray-900 dark:text-white focus:border-accent transition-all"
                />
                {newLinkUrl && (
                  <div className="text-[10px] font-black text-gray-400 dark:text-gray-500">
                    {LINK_ICONS[newLinkType] || LINK_ICONS.other}
                  </div>
                )}
                <button type="button" onClick={addLink}
                  className="px-4 py-2.5 bg-accent text-white rounded-xl font-black text-xs hover:bg-accent/90 transition-all flex items-center gap-1.5">
                  <Plus size={14} /> إضافة
                </button>
              </div>

              {/* Links list */}
              {linksList.length > 0 && (
                <div className="space-y-1.5 pr-1">
                  {linksList.map((link, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-slate-800/50 rounded-xl px-3 py-2">
                      {LINK_ICONS[link.type] || LINK_ICONS.other}
                      <span className="font-bold text-gray-700 dark:text-gray-200 truncate flex-1" dir="ltr">
                      {link.type === 'whatsapp' && 'واتساب: '}
                        {link.type === 'telegram' && 'تيليجرام: '}
                        {link.type === 'website' && 'موقع: '}
                        {link.type === 'facebook' && 'فيسبوك: '}
                        {link.type === 'instagram' && 'إنستغرام: '}
                        {link.type === 'tiktok' && 'تيك توك: '}
                        {link.type === 'youtube' && 'يوتيوب: '}
                        {link.type === 'twitter' && 'تويتر / X: '}
                        {link.type === 'linkedin' && 'لينكدإن: '}
                        {link.type === 'snapchat' && 'سناب شات: '}
                        {link.type === 'other' && (link.label || 'رابط: ')}
                        {link.url}
                      </span>
                      <button type="button" onClick={() => removeLink(i)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Email + Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 flex items-center gap-1.5">
                  <Mail size={14} /> البريد الإلكتروني
                </label>
                <input
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 rounded-2xl outline-none font-bold text-gray-900 dark:text-white focus:border-accent transition-all ${errors.email ? 'border-red-300 dark:border-red-700' : 'border-gray-100 dark:border-slate-700'}`}
                  placeholder="email@example.com"
                  dir="ltr"
                />
                {errors.email && <p className="text-[11px] text-red-500 font-bold pr-2">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 flex items-center gap-1.5">
                  <MapPin size={14} /> العنوان
                </label>
                <input
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-gray-900 dark:text-white focus:border-accent transition-all"
                  placeholder="العنوان بالتفصيل"
                />
              </div>
            </div>

            {/* Specialization + Entity Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 flex items-center gap-1.5">
                  <Tag size={14} /> التخصص أو مجال العمل
                </label>
                <div ref={specRef} className="relative">
                  <input
                    value={specFilter || form.specialization}
                    onChange={e => {
                      setSpecFilter(e.target.value);
                      setForm({ ...form, specialization: e.target.value });
                      setShowSpecs(true);
                    }}
                    onFocus={() => setShowSpecs(true)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-gray-900 dark:text-white focus:border-accent transition-all"
                    placeholder="مثال: مورد قطع غيار، شركة شحن..."
                  />
                  {showSpecs && filteredSpecs.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto">
                      {filteredSpecs.map(s => (
                        <div key={s} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 group">
                          <button
                            type="button"
                            onClick={() => {
                              setForm({ ...form, specialization: s });
                              setSpecFilter('');
                              setShowSpecs(false);
                            }}
                            className="text-sm font-bold text-gray-700 dark:text-gray-200 flex-1 text-right"
                          >
                            {s}
                          </button>
                          {onDeleteSpecialization && (
                            <button
                              type="button"
                              onClick={(ev) => { ev.stopPropagation(); onDeleteSpecialization(s); }}
                              className="text-gray-300 dark:text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                              title="حذف التخصص"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 flex items-center gap-1.5">
                  <Briefcase size={14} /> نوع الكيان
                </label>
                <div className="relative">
                  <select
                    value={form.entityType}
                    onChange={e => setForm({ ...form, entityType: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-gray-900 dark:text-white focus:border-accent transition-all appearance-none cursor-pointer"
                  >
                    {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                </div>
              </div>
            </div>

            {/* Tax ID + Commercial Registry */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 flex items-center gap-1.5">
                  <Hash size={14} /> الرقم الضريبي
                </label>
                <input
                  value={form.taxId}
                  onChange={e => setForm({ ...form, taxId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-gray-900 dark:text-white focus:border-accent transition-all"
                  placeholder="اختياري"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 flex items-center gap-1.5">
                  <FileText size={14} /> السجل التجاري
                </label>
                <input
                  value={form.commercialRegistry}
                  onChange={e => setForm({ ...form, commercialRegistry: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-gray-900 dark:text-white focus:border-accent transition-all"
                  placeholder="اختياري"
                />
              </div>
            </div>

            {/* Google Maps URL + Map Preview */}
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 flex items-center gap-1.5">
                <Navigation size={14} /> رابط خريطة جوجل
              </label>
              <input
                value={form.mapUrl}
                onChange={e => handleMapUrlChange(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm text-gray-900 dark:text-white focus:border-teal-500 transition-all font-mono"
                placeholder="https://maps.google.com/?q=30.0444,31.2357"
                dir="ltr"
              />
              <p className="text-[10px] text-gray-400 dark:text-gray-500 pr-1 font-bold">
                الصق رابط جوجل ماب وسيتم تحديد الموقع تلقائياً
              </p>
              {hasCoords && (
                <div className="rounded-2xl overflow-hidden border-2 border-teal-200 dark:border-teal-800">
                  <iframe
                    title="موقع الخريطة"
                    width="100%"
                    height="250"
                    frameBorder="0"
                    src={`https://www.google.com/maps?q=${form.latitude},${form.longitude}&z=15&output=embed`}
                    className="bg-gray-100 dark:bg-slate-800"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}
              {form.mapUrl && !hasCoords && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold pr-1 flex items-center gap-1">
                  <MapPin size={12} /> لم نتمكن من استخراج الإحداثيات من الرابط، تأكد من صيغة الرابط
                </p>
              )}
            </div>

            {/* Notes + Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 flex items-center gap-1.5">
                  <FileText size={14} /> ملاحظات إضافية
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-gray-900 dark:text-white focus:border-accent transition-all resize-none"
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-600 dark:text-gray-400 pr-1 flex items-center gap-1.5">
                  <Briefcase size={14} /> حالة الجهة
                </label>
                <div className="flex gap-3 pt-1">
                  {['نشط', 'غير نشط'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setForm({ ...form, status: st })}
                      className={`flex-1 px-4 py-3 rounded-2xl font-black text-sm border-2 transition-all ${
                        form.status === st
                          ? st === 'نشط'
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
                          : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-slate-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ratings Section */}
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-5 space-y-4 border border-gray-100 dark:border-slate-700">
              <div
                onClick={() => setForm({ ...form, ratingsEnabled: !form.ratingsEnabled })}
                className="flex items-center gap-3 cursor-pointer"
              >
                <div
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                    form.ratingsEnabled
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800'
                  }`}
                >
                  {form.ratingsEnabled && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-black text-gray-700 dark:text-gray-200">تفعيل التقيم</span>
              </div>

              {form.ratingsEnabled && (
                <div className="space-y-5 pr-1">
                  {/* Regular level-based categories */}
                  {visibleCategories.filter(c => !RATING_SPECIAL.includes(c)).map(category => {
                    const levels = RATING_CATEGORIES[category];
                    if (!levels) return null;
                    const isActive = ratingsDataObj[category] !== undefined;
                    return (
                      <div key={category}>
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            onClick={() => {
                              setRatingsDataObj(prev => {
                                if (prev[category] !== undefined) {
                                  const n = { ...prev };
                                  delete n[category];
                                  return n;
                                }
                                return { ...prev, [category]: '' };
                              });
                            }}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              isActive
                                ? 'bg-teal-600 border-teal-600 text-white'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800'
                            }`}
                          >
                            {isActive && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <span className="text-xs font-black text-gray-600 dark:text-gray-400">{category}</span>
                        </div>
                        {isActive && (
                          <div className="flex flex-wrap gap-1.5 pr-7">
                            {levels.map(level => {
                              const isSelected = ratingsDataObj[category] === level;
                              return (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => setRatingsDataObj(prev => ({ ...prev, [category]: isSelected ? '' : level }))}
                                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black border-2 transition-all ${
                                    isSelected
                                      ? ALL_RATING_COLORS[level] || 'bg-teal-600 text-white border-teal-600'
                                      : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-gray-300'
                                  }`}
                                >
                                  {level}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* التحصيل special field */}
                  {visibleCategories.includes('التحصيل') && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          onClick={() => {
                            setRatingsDataObj(prev => {
                              if (prev['التحصيل'] !== undefined) {
                                const n = { ...prev };
                                delete n['التحصيل'];
                                delete n['رسوم التحصيل'];
                                return n;
                              }
                              return { ...prev, 'التحصيل': '', 'رسوم التحصيل': '' };
                            });
                          }}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                            ratingsDataObj['التحصيل'] !== undefined
                              ? 'bg-teal-600 border-teal-600 text-white'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {ratingsDataObj['التحصيل'] !== undefined && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <DollarSign size={14} className="text-gray-400" />
                        <span className="text-xs font-black text-gray-600 dark:text-gray-400">التحصيل</span>
                      </div>
                      {ratingsDataObj['التحصيل'] !== undefined && (
                        <div className="pr-7 space-y-2">
                          <div className="flex gap-2">
                            {['برسوم', 'بدون رسوم'].map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setRatingsDataObj(prev => ({ ...prev, 'التحصيل': opt, 'رسوم التحصيل': opt === 'بدون رسوم' ? '' : (prev['رسوم التحصيل'] || '') }))}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-black border-2 transition-all ${
                                  ratingsDataObj['التحصيل'] === opt
                                    ? opt === 'برسوم'
                                      ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                      : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                    : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-gray-300'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                          {ratingsDataObj['التحصيل'] === 'برسوم' && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-gray-400">رسوم التحصيل:</span>
                              <input
                                type="number"
                                min="0"
                                dir="ltr"
                                value={ratingsDataObj['رسوم التحصيل'] || ''}
                                onChange={e => setRatingsDataObj(prev => ({ ...prev, 'رسوم التحصيل': e.target.value }))}
                                className="w-24 px-3 py-1.5 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm text-gray-900 dark:text-white focus:border-teal-500 transition-all"
                                placeholder="0"
                              />
                              <span className="text-[10px] font-black text-gray-400">ج.م</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* اقل عدد بيك اب special field */}
                  {visibleCategories.includes('اقل عدد بيك اب') && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          onClick={() => {
                            setRatingsDataObj(prev => {
                              if (prev['اقل عدد بيك اب'] !== undefined) {
                                const n = { ...prev };
                                delete n['اقل عدد بيك اب'];
                                delete n['رسوم البيك اب'];
                                return n;
                              }
                              return { ...prev, 'اقل عدد بيك اب': '', 'رسوم البيك اب': '' };
                            });
                          }}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                            ratingsDataObj['اقل عدد بيك اب'] !== undefined
                              ? 'bg-teal-600 border-teal-600 text-white'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {ratingsDataObj['اقل عدد بيك اب'] !== undefined && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <Package size={14} className="text-gray-400" />
                        <span className="text-xs font-black text-gray-600 dark:text-gray-400">اقل عدد شحنات للبيك اب</span>
                      </div>
                      {ratingsDataObj['اقل عدد بيك اب'] !== undefined && (
                        <div className="pr-7 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              dir="ltr"
                              value={ratingsDataObj['اقل عدد بيك اب'] || ''}
                              onChange={e => setRatingsDataObj(prev => ({ ...prev, 'اقل عدد بيك اب': e.target.value }))}
                              className="w-24 px-3 py-1.5 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm text-gray-900 dark:text-white focus:border-teal-500 transition-all"
                              placeholder="0"
                            />
                            <span className="text-[10px] font-black text-gray-400">شحنة</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-gray-400">رسوم الشحن اقل من العدد:</span>
                            <input
                              type="number"
                              min="0"
                              dir="ltr"
                              value={ratingsDataObj['رسوم البيك اب'] || ''}
                              onChange={e => setRatingsDataObj(prev => ({ ...prev, 'رسوم البيك اب': e.target.value }))}
                              className="w-24 px-3 py-1.5 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm text-gray-900 dark:text-white focus:border-teal-500 transition-all"
                              placeholder="0"
                            />
                            <span className="text-[10px] font-black text-gray-400">ج.م</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* حد أدنى للشحنات special field */}
                  {visibleCategories.includes('حد أدنى للشحنات') && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          onClick={() => {
                            setRatingsDataObj(prev => {
                              if (prev['حد أدنى للشحنات'] !== undefined) {
                                const n = { ...prev };
                                delete n['حد أدنى للشحنات'];
                                delete n['عدد الشحنات'];
                                return n;
                              }
                              return { ...prev, 'حد أدنى للشحنات': '', 'عدد الشحنات': '' };
                            });
                          }}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                            ratingsDataObj['حد أدنى للشحنات'] !== undefined
                              ? 'bg-teal-600 border-teal-600 text-white'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {ratingsDataObj['حد أدنى للشحنات'] !== undefined && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <Package size={14} className="text-gray-400" />
                        <span className="text-xs font-black text-gray-600 dark:text-gray-400">حد أدنى للشحنات</span>
                      </div>
                      {ratingsDataObj['حد أدنى للشحنات'] !== undefined && (
                        <div className="pr-7 space-y-2">
                          <div className="flex gap-2">
                            {['لا', 'نعم'].map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setRatingsDataObj(prev => ({ ...prev, 'حد أدنى للشحنات': opt, 'عدد الشحنات': opt === 'لا' ? '' : (prev['عدد الشحنات'] || '') }))}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-black border-2 transition-all ${
                                  ratingsDataObj['حد أدنى للشحنات'] === opt
                                    ? opt === 'نعم'
                                      ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                      : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                    : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-gray-300'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                          {ratingsDataObj['حد أدنى للشحنات'] === 'نعم' && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-gray-400">عدد الشحنات شهرياً:</span>
                              <input
                                type="number"
                                min="0"
                                dir="ltr"
                                value={ratingsDataObj['عدد الشحنات'] || ''}
                                onChange={e => setRatingsDataObj(prev => ({ ...prev, 'عدد الشحنات': e.target.value }))}
                                className="w-24 px-3 py-1.5 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm text-gray-900 dark:text-white focus:border-teal-500 transition-all"
                                placeholder="0"
                              />
                              <span className="text-[10px] font-black text-gray-400">شحنة</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* سعر الشحن قاهره وجيزه special field */}
                  {visibleCategories.includes('سعر الشحن قاهره وجيزه') && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          onClick={() => {
                            setRatingsDataObj(prev => {
                              if (prev['سعر الشحن قاهره وجيزه'] !== undefined) {
                                const n = { ...prev };
                                delete n['سعر الشحن قاهره وجيزه'];
                                return n;
                              }
                              return { ...prev, 'سعر الشحن قاهره وجيزه': '' };
                            });
                          }}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                            ratingsDataObj['سعر الشحن قاهره وجيزه'] !== undefined
                              ? 'bg-teal-600 border-teal-600 text-white'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {ratingsDataObj['سعر الشحن قاهره وجيزه'] !== undefined && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <DollarSign size={14} className="text-gray-400" />
                        <span className="text-xs font-black text-gray-600 dark:text-gray-400">سعر الشحن قاهره وجيزه</span>
                      </div>
                      {ratingsDataObj['سعر الشحن قاهره وجيزه'] !== undefined && (
                        <div className="pr-7 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              dir="ltr"
                              value={ratingsDataObj['سعر الشحن قاهره وجيزه'] || ''}
                              onChange={e => setRatingsDataObj(prev => ({ ...prev, 'سعر الشحن قاهره وجيزه': e.target.value }))}
                              className="w-24 px-3 py-1.5 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm text-gray-900 dark:text-white focus:border-teal-500 transition-all"
                              placeholder="0"
                            />
                            <span className="text-[10px] font-black text-gray-400">ج.م</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-2xl shadow-lg shadow-teal-200 dark:shadow-none transition-all flex items-center justify-center gap-2 text-lg"
            >
              <Save size={20} strokeWidth={3} />
              {contact ? 'حفظ التعديلات' : 'إضافة الجهة'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ContactModal;
