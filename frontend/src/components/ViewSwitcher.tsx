
import React from 'react';
import { ViewMode } from '../types';

interface ViewSwitcherProps {
  current: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const views: { mode: ViewMode; label: string; icon: string }[] = [
  { mode: 'grid', label: 'شبكة', icon: '▦' },
  { mode: 'list', label: 'جدول', icon: '☰' },
  { mode: 'compact', label: 'مدمج', icon: '⊞' },
  { mode: 'detailed', label: 'مفصل', icon: '⊟' },
];

export default function ViewSwitcher({ current, onChange }: ViewSwitcherProps) {
  return (
    <div
      className="flex rounded-xl p-1 gap-1"
      style={{
        backgroundColor: 'var(--md-sys-color-surface-container-highest)',
      }}
      dir="ltr"
    >
      {views.map(v => (
        <button
          key={v.mode}
          onClick={() => onChange(v.mode)}
          className="px-3 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center gap-1"
          style={{
            backgroundColor: current === v.mode ? 'var(--md-sys-color-surface)' : 'transparent',
            color: current === v.mode ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
            boxShadow: current === v.mode ? 'var(--md-sys-elevation-1)' : 'none',
          }}
          title={v.label}
        >
          <span className="text-xs">{v.icon}</span>
          <span className="hidden sm:inline">{v.label}</span>
        </button>
      ))}
    </div>
  );
}
