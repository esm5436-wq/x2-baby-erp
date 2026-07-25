
import React, { useState, useEffect } from 'react';
import { MD3Dialog, MD3Switch, MD3TextField, MD3Select } from './md3';

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
    <MD3Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`تعديل جماعي — ${selectedCount} ${entityName}`}
      icon={<span className="material-symbols-rounded" style={{ fontSize: 24 }}>edit</span>}
      maxWidth="md"
      actions={[
        { label: 'إلغاء', onClick: onClose, variant: 'text' },
        { label: 'حفظ التعديلات', onClick: handleSave, variant: 'filled' }
      ]}
    >
      <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar p-1">
        {fields.map(field => (
          <div
            key={field.key}
            className={`p-5 rounded-2xl border-2 transition-all ${
              activeFields[field.key]
                ? 'border-[var(--md-sys-color-primary)]/30 bg-[var(--md-sys-color-primary)]/5'
                : 'border-[var(--md-sys-color-outline-variant)]/30 bg-[var(--md-sys-color-surface-container-low)]'
            }`}
          >
            <MD3Switch
              checked={activeFields[field.key]}
              onCheckedChange={() => toggleField(field.key)}
              label={field.label}
            />

            <div className="mt-3">
              {field.type === 'select' && field.options ? (
                <MD3Select
                  label={field.label}
                  value={values[field.key] || ''}
                  onChange={(v) => setValues(prev => ({ ...prev, [field.key]: v }))}
                  options={field.options}
                  disabled={!activeFields[field.key]}
                  fullWidth
                />
              ) : (
                <MD3TextField
                  label={field.label}
                  value={values[field.key] || ''}
                  onChange={(v) => setValues(prev => ({ ...prev, [field.key]: v }))}
                  variant="outlined"
                  fullWidth
                  disabled={!activeFields[field.key]}
                  type={field.type === 'number' ? 'number' : 'text'}
                  placeholder={activeFields[field.key] ? `أدخل ${field.label} الجديد...` : ''}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </MD3Dialog>
  );
};

export default BatchEditModal;
