import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';

interface MD3BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  /** 'half' = max 50vh, 'full' = max 85vh, 'auto' = fit content up to 85vh */
  height?: 'half' | 'full' | 'auto';
  /** Hide the grab handle bar */
  noHandle?: boolean;
  /** Additional className for the sheet content */
  className?: string;
}

const MD3BottomSheet: React.FC<MD3BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  height = 'auto',
  noHandle = false,
  className = '',
}) => {
  const dragControls = useDragControls();

  const maxHeight = height === 'half' ? '50vh' : height === 'full' ? '85vh' : '85vh';

  // Escape key handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Scrim / Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/32 z-[200]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.15}
            onDragEnd={(_: any, info: { offset: { y: number }; velocity: { y: number } }) => {
              if (info.offset.y > 80 || info.velocity.y > 300) onClose();
            }}
            className="fixed bottom-0 left-0 right-0 z-[201] overflow-hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div
              className={`bg-[var(--md3-surface-container-low)] rounded-t-[28px] flex flex-col ${className}`}
              style={{ maxHeight }}
            >
              {/* Grab Handle — uses framer-motion dragControls for consistency */}
              {!noHandle && (
                <div
                  className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing shrink-0 touch-none"
                  onPointerDown={(e) => {
                    dragControls.start(e);
                  }}
                >
                  <div className="w-10 h-1 rounded-full bg-[var(--md3-outline-variant)]" />
                </div>
              )}

              {/* Title */}
              {title && (
                <div className="px-6 pt-2 pb-2 shrink-0">
                  <h2 className="text-lg font-bold text-[var(--md3-on-surface)]">{title}</h2>
                </div>
              )}

              {/* Content */}
              <div className="overflow-y-auto flex-1 overscroll-behavior-contain">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MD3BottomSheet;
