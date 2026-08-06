import React from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';
import MD3BottomSheet from './MD3BottomSheet';

interface PopupSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Desktop: container classes for the anchored dropdown */
  className?: string;
  /** Mobile: sheet header title */
  title?: string;
  children: React.ReactNode;
}

const PopupSheet: React.FC<PopupSheetProps> = ({ isOpen, onClose, className = '', title, children }) => {
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'compact';

  if (!isMobile) {
    return <>{isOpen ? <div className={className}>{children}</div> : null}</>;
  }

  return (
    <MD3BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      {children}
    </MD3BottomSheet>
  );
};

export default PopupSheet;
