import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Image as ImageIcon, X, Eye, EyeOff, Clock } from 'lucide-react';
import { API_BASE, getAuthToken } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/formatDate';
import type { Note } from '../types';
import AddNoteModal from './AddNoteModal';

interface NotesTimelineProps {
  entityType: 'product' | 'order' | 'purchase' | 'contact' | 'customer';
  entityId: string;
  showNoteType?: boolean;
}

const NOTE_TYPE_STYLES: Record<string, { border: string; bg: string; badge: string; badgeText: string }> = {
  customer_note: {
    border: 'border-r-[var(--md-sys-color-primary)]',
    bg: 'bg-[var(--md-sys-color-primary-container)]/30',
    badge: 'bg-[var(--md-sys-color-primary-container)]',
    badgeText: 'text-[var(--md-sys-color-on-primary-container)]',
  },
  internal_note: {
    border: 'border-r-[var(--md-sys-color-tertiary)]',
    bg: 'bg-[var(--md-sys-color-tertiary-container)]/30',
    badge: 'bg-[var(--md-sys-color-tertiary-container)]',
    badgeText: 'text-[var(--md-sys-color-on-tertiary-container)]',
  },
  general: {
    border: 'border-r-[var(--md-sys-color-outline-variant)]',
    bg: 'bg-[var(--md-sys-color-surface-container-low)]',
    badge: 'bg-[var(--md-sys-color-surface-container-highest)]',
    badgeText: 'text-[var(--md-sys-color-on-surface-variant)]',
  },
};

function getNoteStyle(note: Note, showNoteType?: boolean): { border: string; bg: string; badge: string; badgeText: string; label: string } {
  if (showNoteType && note.entity_type === 'order') {
    if (note.show_to_customer === 1) {
      return { ...NOTE_TYPE_STYLES.customer_note, label: 'ملاحظة العميل' };
    }
    return { ...NOTE_TYPE_STYLES.internal_note, label: 'ملاحظة الإدارة' };
  }
  return { ...NOTE_TYPE_STYLES.general, label: '' };
}

function formatNoteDateTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const timePart = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    return `${datePart} - ${timePart}`;
  } catch {
    return '';
  }
}

export default function NotesTimeline({ entityType, entityId, showNoteType }: NotesTimelineProps) {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotes = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/notes?entityType=${entityType}&entityId=${entityId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [entityType, entityId]);

  const handleDelete = async (id: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/notes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== id));
        setDeletingId(null);
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleNoteAdded = (note: Note) => {
    setNotes(prev => [note, ...prev]);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
          <Clock size={16} />
          الملاحظات ({notes.length})
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-full text-xs font-bold hover:shadow-md transition-all"
        >
          <Plus size={14} />
          إضافة ملاحظة
        </button>
      </div>

      {/* Notes List */}
      {loading ? (
        <div className="text-center py-8 text-[var(--md-sys-color-outline)] text-sm font-bold">
          جاري التحميل...
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 text-[var(--md-sys-color-outline)] text-sm font-bold">
          لا توجد ملاحظات بعد
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {notes.map((note) => {
              const style = getNoteStyle(note, showNoteType);
              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`relative p-4 rounded-2xl border-r-4 ${style.border} ${style.bg}`}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[var(--md-sys-color-primary-container)] flex items-center justify-center text-[10px] font-black text-[var(--md-sys-color-on-primary-container)]">
                        {(note.created_by || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="text-xs font-black text-[var(--md-sys-color-on-surface)]">
                          {note.created_by}
                        </span>
                        {style.label && (
                          <span className={`mr-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${style.badge} ${style.badgeText}`}>
                            {note.show_to_customer === 1 ? <Eye size={10} /> : <EyeOff size={10} />}
                            {style.label}
                          </span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => setDeletingId(deletingId === note.id ? null : note.id)}
                        className="p-1.5 rounded-full hover:bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-outline)] hover:text-[var(--md-sys-color-error)] transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Delete confirmation */}
                  <AnimatePresence>
                    {deletingId === note.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-2 p-2 bg-[var(--md-sys-color-error-container)] rounded-xl flex items-center justify-between"
                      >
                        <span className="text-xs font-bold text-[var(--md-sys-color-on-error-container)]">حذف الملاحظة؟</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="px-3 py-1 bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] rounded-lg text-[10px] font-bold"
                          >
                            حذف
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-3 py-1 bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface)] rounded-lg text-[10px] font-bold"
                          >
                            إلغاء
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Content */}
                  <p className="text-sm font-medium text-[var(--md-sys-color-on-surface)] whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </p>

                  {/* Attachment */}
                  {note.attachment && (
                    <div className="mt-3">
                      <button
                        onClick={() => setPreviewImage(note.attachment || null)}
                        className="relative group rounded-xl overflow-hidden border border-[var(--md-sys-color-outline-variant)]/20"
                      >
                        <img
                          src={note.attachment}
                          alt="مرفق"
                          className="w-full max-h-48 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                          <ImageIcon size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="mt-2 text-[10px] font-bold text-[var(--md-sys-color-outline)]">
                    {formatNoteDateTime(note.created_at)}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Note Modal */}
      {showAddModal && (
        <AddNoteModal
          entityType={entityType}
          entityId={entityId}
          onClose={() => setShowAddModal(false)}
          onAdded={handleNoteAdded}
        />
      )}

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-3xl max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-3 -left-3 z-10 w-8 h-8 bg-[var(--md-sys-color-error)] text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
              >
                <X size={16} />
              </button>
              <img src={previewImage} alt="معاينة" className="max-w-full max-h-[85vh] rounded-2xl object-contain" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
