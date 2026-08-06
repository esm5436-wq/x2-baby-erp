import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface SnackbarMessage {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface MD3SnackbarProps {
  messages: SnackbarMessage[];
  onDismiss: (id: string) => void;
  /** Max visible stacked toasts */
  maxVisible?: number;
}

const typeStyles: Record<string, { bg: string; text: string; icon: string }> = {
  success: {
    bg: 'var(--md-sys-color-inverse-surface)',
    text: 'var(--md-sys-color-inverse-on-surface)',
    icon: 'check_circle',
  },
  error: {
    bg: 'var(--md-sys-color-error)',
    text: 'var(--md-sys-color-on-error)',
    icon: 'error',
  },
  info: {
    bg: 'var(--md-sys-color-inverse-surface)',
    text: 'var(--md-sys-color-inverse-on-surface)',
    icon: 'info',
  },
};

const SingleSnackbar: React.FC<{
  msg: SnackbarMessage;
  onDismiss: (id: string) => void;
}> = ({ msg, onDismiss }) => {
  const style = typeStyles[msg.type || 'info'];
  const duration = msg.duration || 4000;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(msg.id), duration);
    return () => clearTimeout(timer);
  }, [msg.id, duration, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg max-w-sm w-full pointer-events-auto"
      style={{ backgroundColor: style.bg, color: style.text }}
      role="status"
      aria-live="polite"
    >
      <span className="material-symbols-rounded shrink-0" style={{ fontSize: 20 }}>
        {style.icon}
      </span>
      <span className="text-sm font-medium flex-1 min-w-0">{msg.message}</span>
      {msg.action && (
        <button
          onClick={() => { msg.action!.onClick(); onDismiss(msg.id); }}
          className="text-sm font-bold shrink-0 underline hover:no-underline opacity-90"
        >
          {msg.action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(msg.id)}
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="إغلاق"
      >
        <span className="material-symbols-rounded" style={{ fontSize: 18 }}>close</span>
      </button>
    </motion.div>
  );
};

const MD3Snackbar: React.FC<MD3SnackbarProps> = ({
  messages,
  onDismiss,
  maxVisible = 3,
}) => {
  const visible = messages.slice(0, maxVisible);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[700] flex flex-col-reverse gap-2 items-center pointer-events-none">
      <AnimatePresence mode="popLayout">
        {visible.map((msg) => (
          <SingleSnackbar key={msg.id} msg={msg} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Simple hook for managing snackbar state
export function useSnackbar() {
  const [messages, setMessages] = useState<SnackbarMessage[]>([]);

  const show = useCallback((
    message: string,
    options?: { type?: 'success' | 'error' | 'info'; action?: { label: string; onClick: () => void }; duration?: number }
  ) => {
    const id = `snack-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setMessages((prev) => [...prev, { id, message, ...options }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const success = useCallback((msg: string) => show(msg, { type: 'success' }), [show]);
  const error = useCallback((msg: string) => show(msg, { type: 'error' }), [show]);
  const info = useCallback((msg: string) => show(msg, { type: 'info' }), [show]);

  return { messages, show, dismiss, success, error, info };
}

export { MD3Snackbar };
