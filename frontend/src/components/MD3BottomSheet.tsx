import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';

type SnapPoint = 'fit' | 'half' | 'full';

interface MD3BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  /** Dynamic snap points: 'fit' = content height, 'half' = 50vh, 'full' = 92vh */
  snapPoints?: SnapPoint[];
  initialSnap?: SnapPoint;
  /** Hide the grab handle bar */
  noHandle?: boolean;
  /** Additional className for the sheet content */
  className?: string;
  /** Actions footer */
  actions?: React.ReactNode;
  /** When true, clicking backdrop does not close */
  persistent?: boolean;
  /** Custom max height override (CSS value) */
  maxHeight?: string;
}

const MD3BottomSheet: React.FC<MD3BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  description,
  icon,
  snapPoints = ['fit', 'half', 'full'],
  initialSnap,
  noHandle = false,
  className = '',
  actions,
  persistent = false,
  maxHeight,
}) => {
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentSnap, setCurrentSnap] = useState<SnapPoint>(
    initialSnap || snapPoints[0] || 'fit'
  );
  const [contentHeight, setContentHeight] = useState<number>(0);

  // Measure content height for 'fit' snap point
  useEffect(() => {
    if (!isOpen || !contentRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContentHeight(entry.contentRect.height);
      }
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [isOpen, children]);

  const getMaxHeight = (): string => {
    if (maxHeight) return maxHeight;
    switch (currentSnap) {
      case 'half': return '50vh';
      case 'full': return '92vh';
      case 'fit': return `${Math.min(contentHeight + 120, window.innerHeight * 0.92)}px`;
      default: return '92vh';
    }
  };

  // Escape key
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

  // Android back button
  useEffect(() => {
    if (!isOpen) return;
    const handlePopState = () => onClose();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  const handleScrimClick = () => {
    if (!persistent) onClose();
  };

  const handleDragEnd = (_: any, info: { offset: { y: number }; velocity: { y: number } }) => {
    const shouldClose = info.offset.y > 100 || info.velocity.y > 400;
    if (shouldClose) {
      onClose();
      return;
    }

    // Snap to nearest snap point based on drag direction
    if (info.velocity.y < -200 || info.offset.y < -50) {
      // Dragged up
      const currentIdx = snapPoints.indexOf(currentSnap);
      if (currentIdx < snapPoints.length - 1) {
        setCurrentSnap(snapPoints[currentIdx + 1]);
      }
    } else if (info.velocity.y > 200 || info.offset.y > 50) {
      // Dragged down
      const currentIdx = snapPoints.indexOf(currentSnap);
      if (currentIdx > 0) {
        setCurrentSnap(snapPoints[currentIdx - 1]);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/32 z-[400]"
            onClick={handleScrimClick}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-[401] overflow-hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div
              className={`bg-[var(--md-sys-color-surface-container-low)] rounded-t-[28px] flex flex-col transition-[max-height] duration-300 ease-out ${className}`}
              style={{ maxHeight: getMaxHeight() }}
            >
              {/* Grab Handle */}
              {!noHandle && (
                <div
                  className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing shrink-0 touch-none"
                  onPointerDown={(e) => dragControls.start(e)}
                >
                  <div className="w-10 h-1 rounded-full bg-[var(--md-sys-color-outline-variant)]" />
                </div>
              )}

              {/* Header with icon, title, description */}
              {(title || icon) && (
                <div className="px-5 pt-2 pb-3 flex items-start gap-3 shrink-0">
                  {icon && (
                    <div className="w-10 h-10 rounded-full bg-[var(--md-sys-color-secondary-container)] flex items-center justify-center text-[var(--md-sys-color-on-secondary-container)] shrink-0 mt-0.5">
                      {icon}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {title && (
                      <h2 className="text-lg font-bold text-[var(--md-sys-color-on-surface)]">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p className="text-sm text-[var(--md-sys-color-on-surface-variant)] mt-0.5 leading-relaxed">
                        {description}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Content */}
              <div ref={contentRef} className="overflow-y-auto flex-1 overscroll-behavior-contain px-5">
                {children}
              </div>

              {/* Actions */}
              {actions && (
                <div className="px-5 pb-5 pt-3 shrink-0 border-t border-[var(--md-sys-color-outline-variant)]/30">
                  {actions}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MD3BottomSheet;
