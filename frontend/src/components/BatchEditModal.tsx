
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, ToggleLeft, ToggleRight } from 'lucide-react';

export interface BatchField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: { label: string; value: string }[];
  suggestions?: string[];
}

interface BatchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  entityName: string;
  fields: BatchField[];
  onSave: (updates: Record<string, any>) => void;
}

const BatchEditModal: React.FC<BatchEditModalProps> = ({ isOpen, onClose, selectedCount, entityName, fields, onSave }) => {
  const [activeFields, setActiveFields] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, boolean> = {};
      const initialValues: Record<string, string> = {};
      fields.forEach(f => {
        initial[f.key] = false;
        initialValues[f.key] = '';
      });
      setActiveFields(initial);
      setValues(initialValues);
    }
  }, [isOpen, fields]);

  const toggleField = (key: string) => {
    setActiveFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    const updates: Record<string, any> = {};
    fields.forEach(f => {
      if (activeFields[f.key]) {
        const val = values[f.key];
        if (f.type === 'number') {
          updates[f.key] = parseFloat(val) || 0;
        } else {
          updates[f.key] = val;
        }
      }
    });
    if (Object.keys(updates).length === 0) return;
    onSave(updates);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-lg shadow-2xl border border-white/20 overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500" />

            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">تعديل جماعي</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-bold mt-1">
                    {selectedCount} {entityName} — اختر الحقول المراد تعديلها
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-3 bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500 rounded-2xl hover:text-red-500 transition-all active:scale-95"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar p-1">
                {fields.map(field => (
                  <div
                    key={field.key}
                    className={`p-5 rounded-3xl border-2 transition-all ${
                      activeFields[field.key]
                        ? 'border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/5 dark:border-indigo-500/30'
                        : 'border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-black text-gray-700 dark:text-gray-300">
                        {field.label}
                      </label>
                      <button
                        onClick={() => toggleField(field.key)}
                        className={`transition-all ${
                          activeFields[field.key]
                            ? 'text-indigo-500'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      >
                        {activeFields[field.key] ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      </button>
                    </div>

                    {field.type === 'select' && field.options ? (
                      <select
                        value={values[field.key] || ''}
                        onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                        disabled={!activeFields[field.key]}
                        className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border transition-all ${
                          activeFields[field.key]
                            ? 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200'
                            : 'bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <option value="">اختر {field.label}</option>
                        {field.options.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <>
                        <input
                          type={field.type === 'number' ? 'number' : 'text'}
                          value={values[field.key] || ''}
                          onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={`أدخل ${field.label} الجديد...`}
                          disabled={!activeFields[field.key]}
                          list={field.suggestions ? `suggest-${field.key}` : undefined}
                          className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border transition-all ${
                            activeFields[field.key]
                              ? 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 placeholder:text-gray-400'
                              : 'bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-800 text-gray-400 dark:text-gray-500 cursor-not-allowed placeholder:text-gray-300 dark:placeholder:text-gray-600'
                          }`}
                        />
                        {field.suggestions && (
                          <datalist id={`suggest-${field.key}`}>
                            {field.suggestions.map(s => (
                              <option key={s} value={s} />
                            ))}
                          </datalist>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 px-6 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-4 px-6 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl font-black text-sm hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  تعديل {selectedCount} {entityName}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BatchEditModal;
