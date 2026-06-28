import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUnsavedCheck } from '../hooks/useUnsavedCheck';
import { X, Building2, Phone, Mail, MapPin, Tag, Briefcase, Hash, FileText, Navigation, User, Edit2, Star, DollarSign, Package, Clock, Copy, Truck, Activity, ReceiptText } from 'lucide-react';
import { FaWhatsapp, FaTelegram, FaFacebook, FaInstagram, FaTiktok, FaYoutube, FaTwitter, FaLinkedin, FaSnapchat, FaGlobe, FaLink } from 'react-icons/fa';
import { Contact } from '../types';

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

const RATING_COLORS: Record<string, string> = {
  'رخيص': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
  'طبيعي/معقول': 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  'غالي': 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
  'غالي جدا': 'text-red-600 bg-red-50 dark:bg-red-900/20',
  'اعلى جوده': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
  'عاليه': 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  'اقتصاديه': 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
  'رديئه': 'text-red-600 bg-red-50 dark:bg-red-900/20',
  'متعاون جدا': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
  'متعاون': 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  'طبيعي': 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
  'صارم جدا': 'text-red-600 bg-red-50 dark:bg-red-900/20',
  'ممتاز': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
  'جيد': 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  'متوسط': 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
  'سيء': 'text-red-600 bg-red-50 dark:bg-red-900/20',
  'سريع': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
  'بطيء': 'text-red-600 bg-red-50 dark:bg-red-900/20',
  'واسعه': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
  'متوسطه': 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
  'ضيقه': 'text-red-600 bg-red-50 dark:bg-red-900/20',
  'ضعيف': 'text-red-600 bg-red-50 dark:bg-red-900/20',
  'نعم': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
  'لا': 'text-red-600 bg-red-50 dark:bg-red-900/20',
};

function getScore(category: string, level: string, allData?: Record<string, string>): number {
  if (category === 'اقل عدد بيك اب' || category === 'رسوم البيك اب' || category === 'رسوم التحصيل' || category === 'عدد الشحنات' || category === 'سعر الشحن قاهره وجيزه') {
    const n = parseFloat(level);
    if (isNaN(n) || n <= 0) return 100;
    if (n <= 5) return 100;
    if (n <= 10) return 66;
    if (n <= 20) return 33;
    return 0;
  }
  if (category === 'حد أدنى للشحنات') {
    if (level === 'لا') return 100;
    const minShip = parseFloat(allData?.['عدد الشحنات'] || '999');
    if (isNaN(minShip) || minShip <= 0) return 80;
    if (minShip <= 10) return 80;
    if (minShip <= 30) return 50;
    if (minShip <= 50) return 20;
    return 0;
  }
  if (category === 'التحصيل') {
    if (level === 'بدون رسوم') return 100;
    const fee = parseFloat(allData?.['رسوم التحصيل'] || '999');
    if (isNaN(fee) || fee <= 0) return 80;
    if (fee <= 5) return 80;
    if (fee <= 10) return 50;
    return 20;
  }
  if (category === 'التحصيل') {
    if (level === 'بدون رسوم') return 100;
    const fee = parseFloat(allData?.['رسوم التحصيل'] || '999');
    if (isNaN(fee) || fee <= 0) return 100;
    if (fee <= 5) return 80;
    if (fee <= 10) return 50;
    return 20;
  }
  const levels = RATING_CATEGORIES[category];
  if (!levels) return 0;
  const idx = levels.indexOf(level);
  if (idx === -1) return 0;
  if (levels.length === 3) return idx === 0 ? 100 : idx === 1 ? 50 : 0;
  return Math.round(100 - (idx / (levels.length - 1)) * 100);
}

function getOverallPercentage(ratingsData: Record<string, string>): number {
  const allCats = [...Object.keys(RATING_CATEGORIES), ...RATING_SPECIAL];
  const selected = allCats.filter(c => ratingsData[c] && ratingsData[c] !== '');
  if (selected.length === 0) return 0;
  const total = selected.reduce((sum, c) => sum + getScore(c, ratingsData[c], ratingsData), 0);
  return Math.round(total / selected.length);
}

function getCircleColor(percent: number): string {
  if (percent >= 70) return '#10b981';
  if (percent >= 40) return '#f59e0b';
  return '#ef4444';
}

function CircularProgress({ percent }: { percent: number }) {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;
  const color = getCircleColor(percent);

  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" className="dark:stroke-slate-700" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-2xl font-black" style={{ color }}>{percent}%</span>
    </div>
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

interface ContactDetailProps {
  contact: Contact;
  onClose: () => void;
  onEdit: () => void;
}

const CopyBtn: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return (
    <button onClick={e => { e.stopPropagation(); handleCopy(); }} className="shrink-0 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-all text-gray-400 hover:text-teal-500" title="نسخ">
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : <Copy size={12} />}
    </button>
  );
};

interface ContactStats {
  expensesCount: number; expensesTotal: number;
  purchaseCount: number; purchaseTotal: number;
  productsCount: number;
  orders: { totalCount: number; shippingTotal: number; ordersValueTotal: number; inProgress: number; completed: number; cancelledReturned: number; };
}

const ContactDetail: React.FC<ContactDetailProps> = ({ contact, onClose, onEdit }) => {
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const { withUnsavedCheck } = useUnsavedCheck(contact);

  useEffect(() => {
    setStats(null);
    setStatsLoading(true);
    fetch(`/api/contacts/${contact.id}/stats`)
      .then(r => r.json())
      .then(data => { setStats(data); setStatsLoading(false); })
      .catch(() => setStatsLoading(false));
  }, [contact.id]);

  let ratingsData: Record<string, string> = {};
  try { ratingsData = JSON.parse(contact.ratingsData || '{}'); } catch {}
  const overallPercent = contact.ratingsEnabled ? getOverallPercentage(ratingsData) : 0;
  const extraPhonesParsed = (() => {
    try {
      const all = JSON.parse(contact.extraPhones || '[]')
        .filter((ep: any) => ep.phone && ep.phone !== contact.phone);
      return contact.phone2 ? all.filter((ep: any) => ep.phone !== contact.phone2) : all;
    } catch { return []; }
  })();
  const phone2Name = (() => {
    if (!contact.phone2) return '';
    try {
      const all = JSON.parse(contact.extraPhones || '[]');
      const match = all.find((ep: any) => ep.phone === contact.phone2);
      return match?.name || '';
    } catch { return ''; }
  })();

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
          className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 rounded-t-[32px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                <Building2 size={20} className="text-teal-600 dark:text-teal-400" />
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white truncate">{contact.companyName}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onEdit} className="p-2 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded-xl hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-all">
                <Edit2 size={18} />
              </button>
              <button onClick={() => withUnsavedCheck(onClose)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Tags Row */}
            <div className="flex flex-wrap gap-2">
              {contact.entityType && contact.entityType !== 'أخرى' && (
                <span className="text-[11px] font-black px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                  {contact.entityType}
                </span>
              )}
              <span className={`text-[11px] font-black px-3 py-1 rounded-full ${
                contact.status === 'نشط'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}>
                {contact.status}
              </span>
              {contact.specialization && (
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300">
                  {contact.specialization}
                </span>
              )}
            </div>

            {/* Contact Info — moved BEFORE rating */}
            <div className="space-y-2">
              {contact.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={15} className="text-gray-400 shrink-0" />
                  <span className="font-bold text-gray-700 dark:text-gray-200" dir="ltr">{contact.phone}</span>
                  {contact.contactPerson && <span className="text-xs text-gray-400">({contact.contactPerson})</span>}
                  <CopyBtn text={contact.phone} />
                </div>
              )}
              {contact.phone2 && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={15} className="text-gray-400 shrink-0" />
                  <span className="font-bold text-gray-700 dark:text-gray-200" dir="ltr">{contact.phone2}</span>
                  {phone2Name && <span className="text-xs text-gray-400">({phone2Name})</span>}
                  <CopyBtn text={contact.phone2} />
                </div>
              )}
              {extraPhonesParsed.map((ep: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Phone size={15} className="text-gray-400 shrink-0" />
                  <span className="font-bold text-gray-700 dark:text-gray-200" dir="ltr">{ep.phone}</span>
                  {ep.name && <span className="text-xs text-gray-400">({ep.name})</span>}
                  <CopyBtn text={ep.phone} />
                </div>
              ))}
              {(() => {
                let links: {type:string;url:string}[] = [];
                try { links = JSON.parse(contact.links || '[]'); } catch {}
                if (links.length === 0) return null;
                const LINK_MAP: Record<string, {icon:React.ReactNode;label:string}> = {
                  whatsapp: {icon: <FaWhatsapp size={18} className="text-emerald-500 shrink-0" />, label: 'واتساب'},
                  telegram: {icon: <FaTelegram size={18} className="text-sky-500 shrink-0" />, label: 'تيليجرام'},
                  website: {icon: <FaGlobe size={18} className="text-purple-500 shrink-0" />, label: 'موقع'},
                  facebook: {icon: <FaFacebook size={18} className="text-blue-600 shrink-0" />, label: 'فيسبوك'},
                  instagram: {icon: <FaInstagram size={18} className="text-pink-500 shrink-0" />, label: 'إنستغرام'},
                  tiktok: {icon: <FaTiktok size={18} className="text-gray-900 dark:text-gray-100 shrink-0" />, label: 'تيك توك'},
                  youtube: {icon: <FaYoutube size={18} className="text-red-500 shrink-0" />, label: 'يوتيوب'},
                  twitter: {icon: <FaTwitter size={18} className="text-blue-400 shrink-0" />, label: 'تويتر / X'},
                  linkedin: {icon: <FaLinkedin size={18} className="text-blue-700 shrink-0" />, label: 'لينكدإن'},
                  snapchat: {icon: <FaSnapchat size={18} className="text-yellow-500 shrink-0" />, label: 'سناب شات'},
                  other: {icon: <FaLink size={18} className="text-gray-400 shrink-0" />, label: 'رابط'},
                };
                return links.map((link, i) => {
                  const m = LINK_MAP[link.type] || LINK_MAP.other;
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {m.icon}
                      <span className="text-[11px] font-bold text-gray-400 shrink-0">{m.label}:</span>
                      <a href={link.url} target="_blank" rel="noopener noreferrer"
                        className="font-bold text-teal-600 dark:text-teal-400 hover:underline truncate" dir="ltr">
                        {link.url}
                      </a>
                    </div>
                  );
                });
              })()}
              {contact.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={15} className="text-gray-400 shrink-0" />
                  <span className="font-bold text-gray-700 dark:text-gray-200">{contact.email}</span>
                </div>
              )}
              {contact.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin size={15} className="text-gray-400 shrink-0" />
                  <span className="font-bold text-gray-700 dark:text-gray-200">{contact.address}</span>
                </div>
              )}
              {contact.taxId && (
                <div className="flex items-center gap-2 text-sm">
                  <Hash size={15} className="text-gray-400 shrink-0" />
                  <span className="font-bold text-gray-700 dark:text-gray-200">{contact.taxId}</span>
                </div>
              )}
              {contact.commercialRegistry && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText size={15} className="text-gray-400 shrink-0" />
                  <span className="font-bold text-gray-700 dark:text-gray-200">{contact.commercialRegistry}</span>
                </div>
              )}
              {contact.notes && (
                <div className="flex items-start gap-2 text-sm">
                  <FileText size={15} className="text-gray-400 shrink-0 mt-0.5" />
                  <span className="font-bold text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{contact.notes}</span>
                </div>
              )}
              {(contact.mapUrl || (contact.latitude && contact.longitude)) && (
                <div className="flex items-center gap-2 text-sm">
                  <Navigation size={15} className="text-teal-500 shrink-0" />
                  <a
                    href={contact.mapUrl || `https://www.google.com/maps?q=${contact.latitude},${contact.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    عرض على جوجل ماب
                  </a>
                </div>
              )}
            </div>

            {/* Stats Section */}
            {statsLoading ? (
              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-5 text-center">
                <Activity size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2 animate-pulse" />
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500">جاري تحميل الإحصائيات...</p>
              </div>
            ) : stats && (
              <div className="grid grid-cols-2 gap-2">
                {/* Shipping stats - for shipping companies */}
                {(contact.entityType === 'شركة شحن') && stats.orders.totalCount > 0 && (
                  <>
                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Truck size={14} className="text-blue-500" />
                        <span className="text-[9px] font-black text-blue-600 dark:text-blue-400">إجمالي الشحنات</span>
                      </div>
                      <div className="text-lg font-black text-blue-700 dark:text-blue-300">{stats.orders.totalCount}</div>
                      <div className="text-[9px] font-bold text-blue-500/70">بقيمة {stats.orders.ordersValueTotal.toLocaleString('ar-EG')} ج.م</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign size={14} className="text-emerald-500" />
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">مبلغ الشحن</span>
                      </div>
                      <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">{stats.orders.shippingTotal.toLocaleString('ar-EG')} ج.م</div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity size={14} className="text-amber-500" />
                        <span className="text-[9px] font-black text-amber-600 dark:text-amber-400">جاري</span>
                      </div>
                      <div className="text-lg font-black text-amber-700 dark:text-amber-300">{stats.orders.inProgress}</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Package size={14} className="text-emerald-500" />
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">مكتمل</span>
                      </div>
                      <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">{stats.orders.completed}</div>
                    </div>
                    {stats.orders.cancelledReturned > 0 && (
                      <div className="col-span-2 bg-red-50 dark:bg-red-900/10 rounded-2xl p-3">
                        <div className="flex items-center gap-2">
                          <X size={14} className="text-red-500" />
                          <span className="text-[9px] font-black text-red-600 dark:text-red-400">ملغي / مرتجع: {stats.orders.cancelledReturned}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Purchase invoices stats - for suppliers */}
                {(['مصنع', 'تاجر جملة', 'مستورد'].includes(contact.entityType || '')) && (
                  <>
                    <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <ReceiptText size={14} className="text-indigo-500" />
                        <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400">فواتير مشتريات</span>
                      </div>
                      <div className="text-lg font-black text-indigo-700 dark:text-indigo-300">{stats.purchaseCount}</div>
                      {stats.purchaseTotal > 0 && <div className="text-[9px] font-bold text-indigo-500/70">{stats.purchaseTotal.toLocaleString('ar-EG')} ج.م</div>}
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Package size={14} className="text-purple-500" />
                        <span className="text-[9px] font-black text-purple-600 dark:text-purple-400">منتجات مرتبطة</span>
                      </div>
                      <div className="text-lg font-black text-purple-700 dark:text-purple-300">{stats.productsCount}</div>
                    </div>
                  </>
                )}

                {/* Expenses - shown for all entity types with expenses */}
                {stats.expensesCount > 0 && (
                  <div className={`${(['مصنع', 'تاجر جملة', 'مستورد'].includes(contact.entityType || '') || (contact.entityType === 'شركة شحن')) && !(contact.entityType === 'شركة شحن' && stats.orders.totalCount > 0) ? 'col-span-2' : ''} bg-rose-50 dark:bg-rose-900/10 rounded-2xl p-3`}>
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign size={14} className="text-rose-500" />
                      <span className="text-[9px] font-black text-rose-600 dark:text-rose-400">مصروفات</span>
                    </div>
                    <div className="text-lg font-black text-rose-700 dark:text-rose-300">{stats.expensesCount}</div>
                    {stats.expensesTotal > 0 && <div className="text-[9px] font-bold text-rose-500/70">{stats.expensesTotal.toLocaleString('ar-EG')} ج.م</div>}
                  </div>
                )}
              </div>
            )}

            {/* Rating Circle + Breakdown — moved AFTER contact info */}
            {contact.ratingsEnabled ? (
              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-5">
                <div className="flex items-center gap-6">
                  <CircularProgress percent={overallPercent} />
                  <div className="flex-1 space-y-2">
                    {Object.entries(RATING_CATEGORIES).map(([category, levels]) => {
                      const selected = ratingsData[category];
                      if (!selected) return null;
                      const score = getScore(category, selected, ratingsData);
                      return (
                        <div key={category} className="flex items-center justify-between text-sm">
                          <span className="font-black text-gray-600 dark:text-gray-400 text-[11px]">{category}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${RATING_COLORS[selected] || 'text-gray-600 bg-gray-100'}`}>
                              {selected}
                            </span>
                            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 w-6 text-left">{score}%</span>
                          </div>
                        </div>
                      );
                    })}
                    {RATING_SPECIAL.filter(c => ratingsData[c] && ratingsData[c] !== '').map(cat => {
                      if (cat === 'رسوم التحصيل' || cat === 'رسوم البيك اب' || cat === 'عدد الشحنات') return null;
                      const val = ratingsData[cat];
                      let displayVal = val;
                      if (cat === 'اقل عدد بيك اب') displayVal = val + ' شحنة';
                      if (cat === 'التحصيل' && val === 'برسوم' && ratingsData['رسوم التحصيل']) displayVal = `برسوم (${ratingsData['رسوم التحصيل']} ج.م)`;
                      if (cat === 'حد أدنى للشحنات' && val === 'نعم' && ratingsData['عدد الشحنات']) displayVal = `نعم (${ratingsData['عدد الشحنات']} شحنة)`;
                      if (cat === 'سعر الشحن قاهره وجيزه') displayVal = val + ' ج.م';
                      const score = getScore(cat, val, ratingsData);
                      return (
                        <div key={cat} className="flex items-center justify-between text-sm">
                          <span className="font-black text-gray-600 dark:text-gray-400 text-[11px]">{cat}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                              {displayVal}
                            </span>
                            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 w-6 text-left">{score}%</span>
                          </div>
                        </div>
                      );
                    })}
                    {ratingsData['رسوم البيك اب'] && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-black text-gray-600 dark:text-gray-400 text-[11px]">رسوم الشحن اقل من العدد</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                            {ratingsData['رسوم البيك اب']} ج.م
                          </span>
                          <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 w-6 text-left">{getScore('رسوم البيك اب', ratingsData['رسوم البيك اب'], ratingsData)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-5 text-center">
                <Star size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm font-bold text-gray-400 dark:text-gray-500">لم يتم تفعيل التقييم</p>
              </div>
            )}

            {/* Dates */}
            <div className="flex flex-col items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-50 dark:border-slate-800">
              {contact.createdAt && (
                <div className="flex items-center gap-1.5">
                  <Clock size={12} />
                  <span>تاريخ الإضافة: {formatDate(contact.createdAt)}</span>
                </div>
              )}
              {contact.updatedAt && (
                <div className="flex items-center gap-1.5">
                  <Clock size={12} />
                  <span>آخر تحديث: {formatDate(contact.updatedAt)}</span>
                </div>
              )}
            </div>

            {contact.latitude && contact.longitude && (
              <div className="rounded-2xl overflow-hidden border-2 border-gray-100 dark:border-slate-800">
                <iframe
                  title="موقع الخريطة"
                  width="100%"
                  height="200"
                  frameBorder="0"
                  src={`https://www.google.com/maps?q=${contact.latitude},${contact.longitude}&z=15&output=embed`}
                  className="bg-gray-100 dark:bg-slate-800"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ContactDetail;
