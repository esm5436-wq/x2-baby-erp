import { useState, useEffect } from 'react';

export type Breakpoint = 'compact' | 'medium' | 'expanded';

const BREAKPOINTS: Record<Breakpoint, number> = {
  compact: 0,
  medium: 600,
  expanded: 840,
};

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    const w = window.innerWidth;
    if (w >= BREAKPOINTS.expanded) return 'expanded';
    if (w >= BREAKPOINTS.medium) return 'medium';
    return 'compact';
  });

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      if (w >= BREAKPOINTS.expanded) setBreakpoint('expanded');
      else if (w >= BREAKPOINTS.medium) setBreakpoint('medium');
      else setBreakpoint('compact');
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return breakpoint;
}
