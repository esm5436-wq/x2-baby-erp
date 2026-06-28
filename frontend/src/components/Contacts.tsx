import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Users, Search, Plus, X, Building2, Phone, Mail, MapPin, Tag, Briefcase, Hash, FileText, CheckCircle, XCircle, Edit2, Trash2, ChevronDown, Navigation, Star, Copy, ArrowUpDown } from 'lucide-react';
import { FaWhatsapp, FaTelegram, FaFacebook, FaInstagram, FaTiktok, FaYoutube, FaTwitter, FaLinkedin, FaSnapchat, FaGlobe, FaLink } from 'react-icons/fa';
import { Contact, Branding } from '../types';
import ContactModal from './ContactModal';
import ContactDetail from './ContactDetail';
import { formatDate } from '../lib/formatDate';

const API_BASE = '/api';

interface ContactsProps {
  contacts: Contact[];
  branding?: Branding;
}

const ENTITY_TYPES = ['all', 'مصنع', 'تاجر جملة', 'مقدم خدمة', 'مستورد', 'شركة شحن', 'شركة تسويق', 'شركات الطباعه و التغليف', 'أخرى'];

const CopyBtn: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return (
    <button onClick={e => { e.stopPropagation(); handleCopy(); }}
      className="shrink-0 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-all text-gray-300 hover:text-teal-500"
      title="نسخ"
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : <Copy size={12} />}
    </button>
  );
};

const Contacts: React.FC<ContactsProps> = ({ contacts: initialContacts, branding }) => {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [specFilter, setSpecFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailContact, setDetailContact] = useState<Contact | undefined>(undefined);
  const [editContact, setEditContact] = useState<Contact | undefined>(undefined);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => { setContacts(initialContacts); }, [initialContacts]);

  useEffect(() => {
    fetch(`${API_BASE}/contacts/specializations`)
      .then(r => r.json())
      .then(setSpecializations)
      .catch(() => {});
  }, []);

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const entityId = searchParams.get('entityId');
    if (entityId && contacts.length > 0) {
      const found = contacts.find(c => c.id === entityId);
      if (found) { setDetailContact(found); setDetailOpen(true); }
    }
  }, [searchParams, contacts]);

  const refreshContacts = async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (entityFilter !== 'all') params.set('entityType', entityFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (specFilter !== 'all') params.set('specialization', specFilter);
    const res = await fetch(`${API_BASE}/contacts?${params}`);
    if (res.ok) {
      const data = await res.json();
      setContacts(data);
    }
  };

  useEffect(() => {
    const timer = setTimeout(refreshContacts, 300);
    return () => clearTimeout(timer);
  }, [search, entityFilter, statusFilter, specFilter]);

  const allSpecs = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach(c => { if (c.specialization) set.add(c.specialization); });
    return Array.from(set).sort();
  }, [contacts]);

  const handleSave = async (data: any) => {
    try {
      const url = editContact
        ? `${API_BASE}/contacts/${editContact.id}`
        : `${API_BASE}/contacts`;
      const method = editContact ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (res.ok) {
        setModalOpen(false);
        setEditContact(undefined);
        refreshContacts();
        fetch(`${API_BASE}/contacts/specializations`).then(r => r.json()).then(setSpecializations).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to save contact:', err);
    }
  };

  const handleDeleteSpecialization = async (name: string) => {
    try {
      await fetch(`${API_BASE}/contacts/specializations/${encodeURIComponent(name)}`, { method: 'DELETE' });
      setSpecializations(prev => prev.filter(s => s !== name));
    } catch (err) {
      console.error('Failed to delete specialization:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE}/contacts/${id}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      refreshContacts();
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  };

  const toggleStatus = async (contact: Contact) => {
    const newStatus = contact.status === 'نشط' ? 'غير نشط' : 'نشط';
    await fetch(`${API_BASE}/contacts/${contact.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...contact, status: newStatus })
    });
    refreshContacts();
  };

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

  function getOverallPercentage(ratingsDataStr: string): number {
    try {
      const ratingsData = JSON.parse(ratingsDataStr || '{}');
      const allCats = [...Object.keys(RATING_CATEGORIES), ...RATING_SPECIAL];
      const selected = allCats.filter(c => ratingsData[c] && ratingsData[c] !== '');
      if (selected.length === 0) return 0;
      const total = selected.reduce((sum, c) => sum + getScore(c, ratingsData[c], ratingsData), 0);
      return Math.round(total / selected.length);
    } catch { return 0; }
  }

  function getCircleColor(percent: number): string {
    if (percent >= 70) return '#10b981';
    if (percent >= 40) return '#f59e0b';
    return '#ef4444';
  }

  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => {
      let va: any, vb: any;
      switch (sortField) {
        case 'companyName': va = a.companyName; vb = b.companyName; break;
        case 'entityType': va = a.entityType || ''; vb = b.entityType || ''; break;
        case 'specialization': va = a.specialization || ''; vb = b.specialization || ''; break;
        case 'status': va = a.status || ''; vb = b.status || ''; break;
        default: va = a.createdAt || ''; vb = b.createdAt || '';
      }
      if (typeof va === 'number' && typeof vb === 'number') return sortAsc ? va - vb : vb - va;
      return sortAsc ? (va || '').localeCompare(vb || '') : (vb || '').localeCompare(va || '');
    });
  }, [contacts, sortField, sortAsc]);

  const hasActiveFilters = search || entityFilter !== 'all' || statusFilter !== 'all' || specFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setEntityFilter('all');
    setStatusFilter('all');
    setSpecFilter('all');
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 items-center">
        <motion.h2
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="text-2xl font-black flex items-center gap-3 text-gray-900 dark:text-white shrink-0"
        >
          <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.8 }}>
            <Users className="text-teal-500" size={32} />
          </motion.div>
          جهات الاتصال والشركات
        </motion.h2>
        <div className="flex flex-wrap gap-4 w-full lg:w-auto items-center justify-center lg:justify-end">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            className="relative flex-1 md:min-w-72 md:w-72"
          >
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
            <input
              className="w-full pr-12 pl-4 py-3.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-gray-900 dark:text-white focus:border-teal-500 shadow-sm"
              placeholder="ابحث عن جهة اتصال..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </motion.div>
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setEditContact(undefined); setModalOpen(true); }}
            className="bg-teal-600 text-white px-6 py-3.5 rounded-2xl flex items-center gap-2 font-black shadow-md hover:bg-teal-700 transition-all active:scale-95 text-xs md:text-sm"
          >
            <Plus size={20} /> إضافة جهة
          </motion.button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-widest px-2">
          <Tag size={14} /> فلاتر:
        </div>

        <div className="relative">
          <select
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl outline-none font-black text-[11px] text-gray-700 dark:text-gray-200 focus:border-teal-500 shadow-sm cursor-pointer appearance-none"
          >
            <option value="all">كل الأنواع</option>
            {ENTITY_TYPES.filter(t => t !== 'all').map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
        </div>

        <div className="relative">
          <select
            value={specFilter}
            onChange={e => setSpecFilter(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl outline-none font-black text-[11px] text-gray-700 dark:text-gray-200 focus:border-teal-500 shadow-sm cursor-pointer appearance-none"
          >
            <option value="all">كل التخصصات</option>
            {allSpecs.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl outline-none font-black text-[11px] text-gray-700 dark:text-gray-200 focus:border-teal-500 shadow-sm cursor-pointer appearance-none"
          >
            <option value="all">كل الحالات</option>
            <option value="نشط">نشط</option>
            <option value="غير نشط">غير نشط</option>
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
        </div>

        {/* Sort */}
        <div className="w-px h-6 bg-gray-200 dark:bg-slate-700" />
        <div className="relative">
          <select value={sortField} onChange={e => setSortField(e.target.value)} className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl outline-none font-black text-[11px] text-gray-700 dark:text-gray-200 focus:border-teal-500 shadow-sm cursor-pointer appearance-none">
            <option value="created_at">الأحدث أولاً</option>
            <option value="companyName">الاسم</option>
            <option value="entityType">النوع</option>
            <option value="specialization">التخصص</option>
            <option value="status">الحالة</option>
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
        </div>
        <button onClick={() => setSortAsc(p => !p)} className={`px-3 py-2.5 rounded-xl flex items-center gap-1.5 font-black text-[11px] transition-all ${sortAsc ? 'bg-accent text-white' : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-slate-800'}`} title={sortAsc ? 'تصاعدي' : 'تنازلي'}>
          <ArrowUpDown size={14} /> {sortAsc ? '▲' : '▼'}
        </button>

        {hasActiveFilters && (
          <button onClick={resetFilters} className="text-[10px] font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-xl transition-all flex items-center gap-1">
            <X size={12} /> رسيت الفلاتر
          </button>
        )}
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap gap-4 md:gap-8 justify-center lg:justify-start items-center bg-white dark:bg-slate-900 p-4 md:px-8 rounded-[32px] border border-gray-50 dark:border-slate-800 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600">
            <Building2 size={20} />
          </div>
          <div>
            <div className="text-[10px] font-black text-gray-400 dark:text-gray-500">إجمالي الجهات</div>
            <div className="text-lg font-black text-gray-900 dark:text-white">{contacts.length}</div>
          </div>
        </div>
        <div className="w-px h-10 bg-gray-100 dark:bg-slate-800"></div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
            <CheckCircle size={20} />
          </div>
          <div>
            <div className="text-[10px] font-black text-gray-400 dark:text-gray-500">نشط</div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{contacts.filter(c => c.status === 'نشط').length}</div>
          </div>
        </div>
        <div className="w-px h-10 bg-gray-100 dark:bg-slate-800"></div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600">
            <XCircle size={20} />
          </div>
          <div>
            <div className="text-[10px] font-black text-gray-400 dark:text-gray-500">غير نشط</div>
            <div className="text-lg font-black text-red-600 dark:text-red-400">{contacts.filter(c => c.status === 'غير نشط').length}</div>
          </div>
        </div>
      </motion.div>

      {/* Contacts Grid */}
      {contacts.length === 0 ? (
        <div className="text-center py-20">
          <Users size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-xl font-black text-gray-400 dark:text-gray-500">لا توجد جهات اتصال مطابقة</p>
          <button onClick={() => { setEditContact(undefined); setModalOpen(true); }}
            className="mt-4 px-6 py-3 bg-teal-600 text-white rounded-2xl font-black hover:bg-teal-700 transition-all"
          >
            إضافة أول جهة اتصال
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          {sortedContacts.map((contact, idx) => {
            const pct = contact.ratingsEnabled ? getOverallPercentage(contact.ratingsData || '{}') : 0;
            const circleColor = getCircleColor(pct);
            const circR = 18;
            const circC = 2 * Math.PI * circR;
            const circOff = circC - (pct / 100) * circC;

            return (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => { setDetailContact(contact); setDetailOpen(true); }}
              className="bg-white dark:bg-slate-900 rounded-[20px] p-3 border border-gray-100 dark:border-slate-800 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                    <Building2 size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-gray-900 dark:text-white text-sm truncate">{contact.companyName}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {contact.entityType && contact.entityType !== 'أخرى' && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                          {contact.entityType}
                        </span>
                      )}
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                        contact.status === 'نشط'
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      }`}>
                        {contact.status}
                      </span>
                      {contact.specialization && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300">
                          {contact.specialization}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {contact.ratingsEnabled ? (
                    <div className="w-9 h-9 relative flex items-center justify-center" title={`التقييم: ${pct}%`}>
                      <svg width="36" height="36" viewBox="0 0 44 44">
                        <circle cx="22" cy="22" r={circR} fill="none" stroke="#e5e7eb" strokeWidth="4" className="dark:stroke-slate-700" />
                        <circle
                          cx="22" cy="22" r={circR}
                          fill="none"
                          stroke={circleColor}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={circC}
                          strokeDashoffset={circOff}
                          transform="rotate(-90 22 22)"
                          className="transition-all duration-700"
                        />
                      </svg>
                      <span className="absolute text-[8px] font-black" style={{ color: circleColor }}>{pct}</span>
                    </div>
                  ) : null}
                  <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStatus(contact); }}
                      className={`p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-all ${
                        contact.status === 'نشط' ? 'text-red-400' : 'text-emerald-400'
                      }`}
                      title={contact.status === 'نشط' ? 'تعطيل' : 'تفعيل'}
                    >
                      {contact.status === 'نشط' ? <XCircle size={14} /> : <CheckCircle size={14} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditContact(contact); setModalOpen(true); }}
                      className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-all text-gray-400 hover:text-blue-500"
                      title="تعديل"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(contact.id); }}
                      className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-all text-gray-400 hover:text-red-500"
                      title="حذف"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap text-xs text-gray-500 dark:text-gray-400 font-bold">
                  {contact.phone && (
                    <>
                      <Phone size={12} className="shrink-0" />
                      <span dir="ltr" className="inline-flex items-center gap-0.5">
                        {contact.phone}
                        <CopyBtn text={contact.phone} />
                      </span>
                      {contact.contactPerson && <span className="text-[10px] text-gray-400 dark:text-gray-500">({contact.contactPerson})</span>}
                    </>
                  )}
                  {(() => {
                    let extraList: {phone:string;name?:string}[] = [];
                    try { extraList = JSON.parse(contact.extraPhones || '[]').filter((ep: any) => ep.phone && ep.phone !== contact.phone); } catch {}
                    const phone2Name = contact.phone2 ? extraList.find((ep: any) => ep.phone === contact.phone2)?.name : '';
                    const filteredExtra = contact.phone2 ? extraList.filter((ep: any) => ep.phone !== contact.phone2) : extraList;
                    return (
                      <>
                        {contact.phone2 && (
                          <>
                            <span className="text-gray-300 dark:text-gray-600 mx-0.5">·</span>
                            <Phone size={12} className="shrink-0" />
                            <span dir="ltr" className="inline-flex items-center gap-0.5">
                              {contact.phone2}
                              <CopyBtn text={contact.phone2} />
                            </span>
                            {phone2Name && <span className="text-[10px] text-gray-400 dark:text-gray-500">({phone2Name})</span>}
                          </>
                        )}
                        {filteredExtra.map((ep: any, i: number) => (
                          <React.Fragment key={i}>
                            <span className="text-gray-300 dark:text-gray-600 mx-0.5">·</span>
                            <Phone size={12} className="shrink-0" />
                            <span dir="ltr" className="inline-flex items-center gap-0.5">
                              {ep.phone}
                              <CopyBtn text={ep.phone} />
                            </span>
                            {ep.name && <span className="text-[10px] text-gray-400 dark:text-gray-500">({ep.name})</span>}
                          </React.Fragment>
                        ))}
                      </>
                    );
                  })()}
                  {(() => {
                    let extraList: {phone:string;name?:string}[] = [];
                    try { extraList = JSON.parse(contact.extraPhones || '[]').filter((ep: any) => ep.phone && ep.phone !== contact.phone); } catch {}
                    const hasAnyPhone = !!(contact.phone || contact.phone2 || extraList.some((ep: any) => contact.phone2 ? ep.phone !== contact.phone2 : true));
                    return hasAnyPhone && contact.address ? <span className="text-gray-300 dark:text-gray-600 mx-0.5">·</span> : null;
                  })()}
                  {contact.address && (
                    <>
                      <MapPin size={12} className="shrink-0" />
                      <span className="truncate text-xs">{contact.address}</span>
                    </>
                  )}
                </div>

                {contact.email && (
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 font-bold truncate">
                    <Mail size={12} className="shrink-0" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(contact.mapUrl || (contact.latitude && contact.longitude)) && (
                    <div className="flex items-center gap-1.5 text-xs text-teal-600 dark:text-teal-400 font-bold">
                      <Navigation size={12} className="shrink-0" />
                      <a
                        href={contact.mapUrl || `https://www.google.com/maps?q=${contact.latitude},${contact.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline truncate"
                      >
                        عرض على جوجل ماب
                      </a>
                    </div>
                  )}
                  {(() => {
                    let links: {type:string;url:string}[] = [];
                    try { links = JSON.parse(contact.links || '[]'); } catch {}
                    if (links.length === 0) return null;
                    const LINK_ICONS: Record<string, {icon:React.ReactNode;color:string}> = {
                      whatsapp: {icon: <FaWhatsapp size={14} />, color: 'text-emerald-500 hover:text-emerald-600'},
                      telegram: {icon: <FaTelegram size={14} />, color: 'text-sky-500 hover:text-sky-600'},
                      website: {icon: <FaGlobe size={14} />, color: 'text-purple-500 hover:text-purple-600'},
                      facebook: {icon: <FaFacebook size={14} />, color: 'text-blue-600 hover:text-blue-700'},
                      instagram: {icon: <FaInstagram size={14} />, color: 'text-pink-500 hover:text-pink-600'},
                      tiktok: {icon: <FaTiktok size={14} />, color: 'text-gray-900 dark:text-gray-100 hover:text-gray-600'},
                      youtube: {icon: <FaYoutube size={14} />, color: 'text-red-500 hover:text-red-600'},
                      twitter: {icon: <FaTwitter size={14} />, color: 'text-blue-400 hover:text-blue-500'},
                      linkedin: {icon: <FaLinkedin size={14} />, color: 'text-blue-700 hover:text-blue-800'},
                      snapchat: {icon: <FaSnapchat size={14} />, color: 'text-yellow-500 hover:text-yellow-600'},
                      other: {icon: <FaLink size={14} />, color: 'text-gray-400 hover:text-gray-600'},
                    };
                    return (
                      <>
                        {(contact.mapUrl || (contact.latitude && contact.longitude)) && (
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                        )}
                        <span className="text-gray-300 dark:text-gray-600 text-[11px]">|</span>
                        {links.map((link, i) => {
                          const lc = LINK_ICONS[link.type] || LINK_ICONS.other;
                          return (
                            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className={`${lc.color} transition-all p-0.5`}
                              title={link.url}>
                              {lc.icon}
                            </a>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-300 dark:text-gray-600 font-bold mt-2 pt-2 border-t border-gray-50 dark:border-slate-800">
                <span>تاريخ الإضافة: {formatDate(contact.createdAt, 'date')}</span>
                {contact.updatedAt && <><span className="opacity-40">|</span><span>آخر تعديل: {formatDate(contact.updatedAt, 'date')}</span></>}
              </div>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirm === contact.id && (
                <div onClick={e => e.stopPropagation()} className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-red-500 mb-2">تأكيد حذف هذه الجهة؟</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleDelete(contact.id)} className="flex-1 px-3 py-1.5 bg-red-500 text-white rounded-xl font-black text-[11px] hover:bg-red-600 transition-all">حذف</button>
                    <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-500 rounded-xl font-black text-[11px] hover:bg-gray-200 transition-all">إلغاء</button>
                  </div>
                </div>
              )}
            </motion.div>
          );})}
        </div>
      )}

      {/* Modals */}
      {modalOpen && (
        <ContactModal
          contact={editContact}
          specializations={specializations}
          onClose={() => { setModalOpen(false); setEditContact(undefined); }}
          onSave={handleSave}
          onDeleteSpecialization={handleDeleteSpecialization}
        />
      )}
      {detailOpen && detailContact && (
        <ContactDetail
          contact={detailContact}
          onClose={() => { setDetailOpen(false); setDetailContact(undefined); }}
          onEdit={() => { setDetailOpen(false); setEditContact(detailContact); setModalOpen(true); }}
        />
      )}
    </div>
  );
};

export default Contacts;
