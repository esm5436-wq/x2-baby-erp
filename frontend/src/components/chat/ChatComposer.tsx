import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Paperclip } from 'lucide-react';
import {
  IoSend,
  IoBarChart,
  IoCube,
  IoReceipt,
  IoWarning,
  IoDocumentText,
  IoCash,
  IoPeople,
  IoPricetags
} from 'react-icons/io5';
import type { IconType } from 'react-icons';
import { AttachmentData } from '../../hooks/useAIChat';
import { useImageDropZone } from '../../lib/useImageDropZone';

export interface QuickAction {
  label: string;
  prompt: string;
  Icon: IconType;
}

export const QUICK_ACTIONS: QuickAction[] = [
  { label: 'ملخص مالي', prompt: 'إديني ملخص مالي كامل للأرباح والمبيعات والمصروفات', Icon: IoBarChart },
  { label: 'المخزون', prompt: 'عرض ملخص المخزون بالكامل', Icon: IoCube },
  { label: 'آخر الطلبات', prompt: 'وريني آخر 10 طلبات وحالاتها', Icon: IoReceipt },
  { label: 'النواقص', prompt: 'إيه المنتجات اللي قربت تخلص في المخزون؟', Icon: IoWarning },
  { label: 'تقرير شامل', prompt: 'عرض تقرير شامل: المخزون، المبيعات، الأرباح، المصروفات، وأخر الطلبات', Icon: IoDocumentText },
  { label: 'المصروفات', prompt: 'عرض كل المصروفات المسجلة', Icon: IoCash },
  { label: 'جهات الاتصال', prompt: 'عرض كل جهات الاتصال المسجلة', Icon: IoPeople },
  { label: 'الكوبونات', prompt: 'عرض كل الكوبونات المخزنة', Icon: IoPricetags },
];

interface ChatComposerProps {
  input: string;
  setInput: (v: string) => void;
  attachment: AttachmentData | null;
  removeAttachment: () => void;
  onAttachFile: (file: File) => void;
  onSend: () => void;
  isLoading: boolean;
  showQuickActions?: boolean;
  onQuickAction?: (prompt: string) => void;
  autoFocus?: boolean;
}

const MAX_TEXTAREA_HEIGHT = 144;

const ChatComposer: React.FC<ChatComposerProps> = ({
  input,
  setInput,
  attachment,
  removeAttachment,
  onAttachFile,
  onSend,
  isLoading,
  showQuickActions = false,
  onQuickAction,
  autoFocus = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
  };

  useEffect(() => {
    resizeTextarea();
  }, [input]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const { isDragging, dropProps } = useImageDropZone(files => onAttachFile(files[0]));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          onAttachFile(file);
          return;
        }
      }
    }
  };

  const canSend = !input.trim() && !attachment;

  return (
    <div {...dropProps} className={`relative p-3 bg-white dark:bg-slate-900 border-t space-y-3 shrink-0 transition-colors duration-200 ${isDragging ? 'border-accent bg-accent/5' : 'border-gray-100 dark:border-slate-700'}`}>
      {isDragging && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm pointer-events-none">
          <span className="text-xs font-black text-accent bg-accent/10 border-2 border-dashed border-accent rounded-xl px-4 py-2">أفلت الصورة لإرفاقها بالرسالة</span>
        </div>
      )}
      <AnimatePresence>
        {showQuickActions && !attachment && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"
          >
            {QUICK_ACTIONS.map((action, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onQuickAction?.(action.prompt)}
                className="whitespace-nowrap px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-full text-[10px] font-black text-gray-600 dark:text-gray-300 hover:bg-accent/10 hover:text-accent transition-colors duration-200 flex items-center gap-1.5 shadow-sm"
              >
                <action.Icon size={13} className="shrink-0" aria-hidden />
                <span>{action.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {attachment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl"
          >
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600">
                <img src={`data:${attachment.mimeType};base64,${attachment.data}`} className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">صورة مرفقة</span>
            </div>
            <button onClick={removeAttachment} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full text-gray-500">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          className="flex-1 resize-none pl-4 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white focus:border-accent focus:bg-white dark:focus:bg-slate-900 transition-colors duration-200 shadow-inner leading-relaxed"
          placeholder="اكتب رسالتك هنا... (Shift+Enter لسطر جديد)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={isLoading}
        />
        <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full flex items-center justify-center transition-colors duration-200"
            title="إرفاق صورة"
            disabled={isLoading}
          >
            <Paperclip size={18} />
          </button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSend}
            disabled={canSend || isLoading}
            className="w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-transform shadow-md"
            title="إرسال"
            aria-label="إرسال"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <IoSend size={20} style={{ transform: 'scaleX(-1)' }} aria-hidden />}
          </motion.button>
        </div>
      </div>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onAttachFile(file);
        if (e.target) e.target.value = '';
      }} />
    </div>
  );
};

export default ChatComposer;
