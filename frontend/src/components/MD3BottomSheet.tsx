import React, { useRef, useEffect, useCallback, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'motion/react';

type Snap = 'fit' | number;

interface MD3BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  /** Custom header rendered below the drag handle (overrides title/description/icon) */
  header?: React.ReactNode;
  /** Footer slot, non-scrolling (e.g. chat input, action buttons) */
  actions?: React.ReactNode;
  /** Snap heights as viewport percentages. Default [30, 60, 90] */
  snapPoints?: number[];
  /** Initial height: 'fit' = content height (capped at 90%), or a percent */
  initialSnap?: Snap;
  noHandle?: boolean;
  persistent?: boolean;
  className?: string;
  sheetRef?: React.Ref<HTMLDivElement>;
}

const MD3BottomSheet: React.FC<MD3BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  description,
  icon,
  header,
  actions,
  snapPoints = [30, 60, 90],
  initialSnap = 'fit',
  noHandle = false,
  persistent = false,
  className = '',
  sheetRef,
}) => {
  const dragControls = useDragControls();
  const outerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [currentSnap, setCurrentSnap] = useState<Snap>(initialSnap);
  const [fitHeight, setFitHeight] = useState(0);

  useEffect(() => {
    if (isOpen) setCurrentSnap(initialSnap);
  }, [isOpen, initialSnap]);

  // Measure natural content height for the 'fit' snap
  useLayoutEffect(() => {
    if (!isOpen) return;
    const measure = () => {
      const vh = window.innerHeight;
      const content = measureRef.current ? measureRef.current.offsetHeight : 0;
      const chrome =
        (handleRef.current?.offsetHeight ?? 0) +
        (headerRef.current?.offsetHeight ?? 0) +
        (actionsRef.current?.offsetHeight ?? 0);
      setFitHeight(Math.min(content + chrome, vh * 0.9));
    };
    measure();
    const targets = [measureRef.current, handleRef.current, headerRef.current, actionsRef.current].filter(Boolean) as HTMLElement[];
    const ro = new ResizeObserver(measure);
    targets.forEach((t) => ro.observe(t));
    return () => ro.disconnect();
  }, [isOpen, children, actions, header, title, description]);

  const heightPx =
    currentSnap === 'fit'
      ? fitHeight || window.innerHeight * 0.5
      : (currentSnap / 100) * window.innerHeight;

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
    const { offset, velocity } = info;
    const vh = window.innerHeight;
    const currentPct = (heightPx / vh) * 100;
    const sorted = [...snapPoints].sort((a, b) => a - b);

    if (offset.y > 140 || velocity.y > 500) {
      onClose();
      return;
    }
    if (velocity.y < -200 || offset.y < -60) {
      const target = sorted.find((p) => p > currentPct + 2);
      setCurrentSnap(target ?? sorted[sorted.length - 1]);
    } else if (velocity.y > 200 || offset.y > 60) {
      const below = sorted.filter((p) => p < currentPct - 2);
      if (below.length > 0) {
        setCurrentSnap(below[below.length - 1]);
      } else if (currentPct <= sorted[0] + 2) {
        onClose();
      } else {
        setCurrentSnap(sorted[0]);
      }
    }
  };

  const mergedRef = (node: HTMLDivElement | null) => {
    outerRef.current = node;
    if (typeof sheetRef === 'function') sheetRef(node);
    else if (sheetRef) (sheetRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-[600]"
            onClick={handleScrimClick}
            aria-hidden="true"
          />
          <motion.div
            ref={mergedRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragElastic={0.4}
            dragMomentum={false}
            dragSnapToOrigin
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-[601] overflow-hidden"
            style={{ height: heightPx, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            onMouseDownCapture={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
          >
            <div className={`flex flex-col h-full bg-[var(--md-sys-color-surface-container-low)] rounded-t-[28px] overflow-hidden shadow-[0_-8px_32px_rgba(0,0,0,0.15)] ${className}`}>
              {/* Drag handle */}
              {!noHandle && (
                <div
                  ref={handleRef}
                  className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing touch-none"
                  onPointerDown={(e) => dragControls.start(e)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="w-10 h-1 rounded-full bg-[var(--md-sys-color-outline-variant)]" />
                </div>
              )}

              {/* Header */}
              {header ? (
                <div ref={headerRef} className="shrink-0">{header}</div>
              ) : (title || icon) ? (
                <div
                  ref={headerRef}
                  className="px-5 pt-2 pb-3 flex items-start gap-3 shrink-0 cursor-grab active:cursor-grabbing touch-none"
                  onPointerDown={(e) => dragControls.start(e)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {icon && (
                    <div className="w-10 h-10 rounded-full bg-[var(--md-sys-color-secondary-container)] flex items-center justify-center text-[var(--md-sys-color-on-secondary-container)] shrink-0 mt-0.5">
                      {icon}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {title && (
                      <h2 className="text-lg font-bold text-[var(--md-sys-color-on-surface)]">{title}</h2>
                    )}
                    {description && (
                      <p className="text-sm text-[var(--md-sys-color-on-surface-variant)] mt-0.5 leading-relaxed">{description}</p>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Content */}
              <div ref={contentRef} className="flex-1 min-h-0 overflow-y-auto overscroll-behavior-contain custom-scrollbar">
                <div ref={measureRef}>{children}</div>
              </div>

              {/* Actions */}
              {actions && (
                <div ref={actionsRef} className="shrink-0 border-t border-[var(--md-sys-color-outline-variant)]/30">
                  {actions}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default MD3BottomSheet;
