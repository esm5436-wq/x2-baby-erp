import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Paperclip, X, Send, Image as ImageIcon } from 'lucide-react';
import { API_BASE, getAuthToken } from '../lib/api';
import { compressImage } from '../lib/imageUtils';
import { useImageDropZone } from '../lib/useImageDropZone';
import { getAuthUsername } from '../lib/api';
import { MD3Dialog } from './md3';
import { MD3TextArea } from './md3';
import { MD3Checkbox } from './md3';
import type { Note } from '../types';

interface AddNoteModalProps {
  entityType: 'product' | 'order' | 'purchase' | 'contact' | 'customer';
  entityId: string;
  onClose: () => void;
  onAdded: (note: Note) => void;
}

export default function AddNoteModal({ entityType, entityId, onClose, onAdded }: AddNoteModalProps) {
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [showToCustomer, setShowToCustomer] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOrder = entityType === 'order';

  const handleNoteFile = async (files: File[] | FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 800, 0.7);
      setAttachment(compressed);
    } catch (err) {
      console.error('Error compressing image:', err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleNoteFile(e.target.files);
  };

  const { isDragging: noteDragging, dropProps: noteDropProps } = useImageDropZone(handleNoteFile);

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('اكتب ملاحظتك أولاً');
      return;
    }
    setSending(true);
    setError('');
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entityType,
          entityId,
          content: content.trim(),
          attachment,
          showToCustomer: isOrder ? showToCustomer : false,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add note');
      }
      const note = await res.json();
      onAdded(note);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إضافة الملاحظة');
    } finally {
      setSending(false);
    }
  };

  return (
    <MD3Dialog
      isOpen={true}
      onClose={onClose}
      title="إضافة ملاحظة جديدة"
      icon={<Send size={20} />}
      maxWidth="sm"
      actions={[
        { label: 'إلغاء', onClick: onClose, variant: 'text' },
        {
          label: sending ? 'جاري الإضافة...' : 'إضافة الملاحظة',
          onClick: handleSubmit,
          variant: 'filled',
          disabled: sending || !content.trim(),
        },
      ]}
    >
      <div {...noteDropProps} className={`relative space-y-4 rounded-2xl transition-all duration-200 ${noteDragging ? 'outline outline-2 outline-offset-4 outline-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container)]' : ''}`}>
        {noteDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <span className="text-xs font-black text-[var(--md-sys-color-primary)] bg-surface px-4 py-2 rounded-full shadow-lg">أفلت الصورة لإرفاقها بالملاحظة</span>
          </div>
        )}
        {/* Show to Customer Checkbox - Orders only */}
        {isOrder && (
          <div className="p-3 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl">
            <MD3Checkbox
              checked={showToCustomer}
              onCheckedChange={setShowToCustomer}
              label="تظهر هذه الملاحظة للمشتري"
            />
            <p className="text-[10px] font-bold text-[var(--md-sys-color-outline)] mt-1 pr-8">
              عند التفعيل، ستكون هذه الملاحظة مرئية للعميل في الموقع الخارجي
            </p>
          </div>
        )}

        {/* Note Content */}
        <MD3TextArea
          label="الملاحظة"
          value={content}
          onChange={setContent}
          placeholder="اكتب ملاحظتك هنا..."
          rows={4}
          fullWidth
          error={error}
        />

        {/* Attachment Preview */}
        {attachment && (
          <div className="relative inline-block">
            <img
              src={attachment}
              alt="مرفق"
              className="w-full max-h-40 object-cover rounded-xl border border-[var(--md-sys-color-outline-variant)]/20"
            />
            <button
              onClick={() => setAttachment(null)}
              className="absolute top-2 left-2 w-6 h-6 bg-[var(--md-sys-color-error)] text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Attach Image Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface-variant)] rounded-xl text-xs font-bold hover:bg-[var(--md-sys-color-surface-container-high)] transition-all"
        >
          <Paperclip size={14} />
          إرفاق صورة
        </button>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">يمكنك أيضاً سحب صورة من جهازك وإفلتها في أي مكان بالنافذة.</p>
      </div>
    </MD3Dialog>
  );
}
