import React, { useState, useEffect, useRef } from 'react';
import { User, Phone, Check, Search, Loader2 } from 'lucide-react';
import { API_BASE } from '../lib/api';

interface CustomerResult {
  id: string;
  name: string;
  phone: string;
  alt_phone?: string;
  address?: string;
  city?: string;
  total_orders: number;
}

interface CustomerPickerProps {
  phone: string;
  onPhoneChange: (val: string) => void;
  name: string;
  onNameChange: (val: string) => void;
  altPhone: string;
  onAltPhoneChange: (val: string) => void;
  address: string;
  onAddressChange: (val: string) => void;
  city: string;
  onCityChange: (val: string) => void;
  onCustomerLinked: (customerId: string) => void;
  customerId?: string;
}

export default function CustomerPicker({
  phone, onPhoneChange,
  name, onNameChange,
  altPhone, onAltPhoneChange,
  address, onAddressChange,
  city, onCityChange,
  onCustomerLinked,
  customerId
}: CustomerPickerProps) {
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<any>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePhoneInput = (val: string) => {
    onPhoneChange(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.length < 3) { setResults([]); setShowDropdown(false); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API_BASE}/customers/search?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setResults(data || []);
        setShowDropdown(data && data.length > 0);
      } catch {}
      setSearching(false);
    }, 500);
  };

  const selectCustomer = (c: CustomerResult) => {
    onNameChange(c.name);
    onPhoneChange(c.phone);
    if (c.alt_phone) onAltPhoneChange(c.alt_phone);
    if (c.address) onAddressChange(c.address);
    if (c.city) onCityChange(c.city);
    onCustomerLinked(c.id);
    setShowDropdown(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-500 dark:text-gray-400 pr-1 flex items-center gap-1.5">
            <User size={14} /> اسم العميل
            {customerId && <Check size={14} className="text-emerald-500" />}
          </label>
          <input required className="w-full pr-9 pl-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 transition-all text-sm font-bold" placeholder="الاسم الثلاثي" value={name} onChange={e => onNameChange(e.target.value)} />
        </div>
        <div className="space-y-2 relative" ref={dropdownRef}>
          <label className="text-xs font-black text-gray-500 dark:text-gray-400 pr-1 flex items-center gap-1.5">
            <Phone size={14} /> رقم الهاتف
            {searching && <Loader2 size={12} className="animate-spin text-accent" />}
          </label>
          <div className="relative">
            <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input required type="tel" className="w-full pr-9 pl-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none text-gray-900 dark:text-white font-mono text-sm font-bold" placeholder="01xxxxxxxxx" value={phone} onChange={e => handlePhoneInput(e.target.value)} />
          </div>
          {showDropdown && (
            <div className="absolute top-full right-0 left-0 mt-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
              {results.map(c => (
                <button type="button" key={c.id} onClick={() => selectCustomer(c)} className="w-full text-right px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-50 dark:border-slate-700 last:border-0 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{c.name}</div>
                    <div className="text-[10px] font-bold text-gray-400">{c.phone} {c.city ? `- ${c.city}` : ''}</div>
                  </div>
                  <div className="text-[9px] font-black text-gray-400 dark:text-gray-500 flex-shrink-0">{c.total_orders} طلب</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
