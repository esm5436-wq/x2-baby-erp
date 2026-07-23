import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  mobileOnly?: boolean;
  headerClassName?: string;
  className?: string;
  children: React.ReactNode;
}

export default React.memo(function CollapsibleSection({
  title,
  icon,
  mobileOnly = false,
  defaultOpen = !mobileOnly,
  headerClassName = '',
  className = '',
  children
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setOpen(prev => !prev), []);

  return (
    <div className={className}>
      <button
        onClick={toggle}
        className={`flex items-center gap-2 w-full text-right ${mobileOnly ? 'md:hidden' : ''} ${headerClassName}`}
      >
        {icon}
        <h2 className="text-2xl font-bold flex-1">{title}</h2>
        <motion.div
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} className="text-gray-400" />
        </motion.div>
      </button>

      {mobileOnly ? (
        <>
          <div className="hidden md:block">{children}</div>
          <div className="md:hidden">
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  {children}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      ) : (
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="content"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
});
