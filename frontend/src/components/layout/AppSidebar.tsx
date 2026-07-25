import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { LogOut, Sun, Moon, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { NAV_ITEMS, NAV_COLORS } from './navConfig';

const SIDEBAR_WIDTH_KEY = 'erp_layout_sidebar_width';
const SIDEBAR_COLLAPSED_KEY = 'erp_layout_sidebar_collapsed';
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 100;
const MAX_WIDTH = 400;
const COLLAPSE_THRESHOLD = 120;
const COLLAPSED_WIDTH = 72;
const RAIL_WIDTH = 80;

export { DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH, COLLAPSE_THRESHOLD, COLLAPSED_WIDTH, RAIL_WIDTH };

/* ═══════════════════════════════════════════════════════════════
   Tooltip
   ═══════════════════════════════════════════════════════════════ */
const Tooltip: React.FC<{
  content: string;
  children: React.ReactNode;
  show: boolean;
}> = ({ content, children, show }) => {
  if (!show) return <>{children}</>;
  return (
    <div className="relative group/tooltip">
      {children}
      <div className="absolute z-[999] whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--md-sys-color-inverse-surface)] text-[var(--md-sys-color-inverse-on-surface)] shadow-lg left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity duration-150">
        {content}
        <div className="absolute w-2 h-2 bg-[var(--md-sys-color-inverse-surface)] rotate-45 right-full top-1/2 -translate-y-1/2 -mr-1" />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MD3 Icon
   ═══════════════════════════════════════════════════════════════ */
const MD3Icon: React.FC<{
  name: string;
  size?: number;
  className?: string;
}> = ({ name, size = 24, className = '' }) => (
  <span
    className={`material-symbols-rounded ${className}`}
    style={{ fontSize: size }}
  >
    {name}
  </span>
);

/* ═══════════════════════════════════════════════════════════════
   AppSidebar — Unified Desktop Sidebar
   ═══════════════════════════════════════════════════════════════ */
interface AppSidebarProps {
  brandLogo?: string;
  brandName?: string;
  brandSlogan?: string;
  brandSloganDesign?: string;
  darkMode: boolean;
  toggleDarkMode: () => void;
  logout: () => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({
  brandLogo,
  brandName,
  brandSlogan,
  brandSloganDesign,
  darkMode,
  toggleDarkMode,
  logout,
}) => {
  const { uiTheme } = useTheme();
  const isMD3 = uiTheme === 'material3';

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parseInt(saved))) : DEFAULT_WIDTH;
  });
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });

  const sidebarWidthRef = useRef(sidebarWidth);
  const isDraggingRef = useRef(false);
  const navRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  sidebarWidthRef.current = sidebarWidth;

  const effectiveWidth = isCollapsed ? COLLAPSED_WIDTH : sidebarWidth;

  useEffect(() => {
    document.documentElement.style.setProperty('--current-sidebar-width', effectiveWidth + 'px');
  }, [effectiveWidth]);

  const handleSidebarDrag = useCallback((e: React.PointerEvent) => {
    if (isCollapsed) return;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    setIsAnimating(false);
    const startX = e.clientX;
    const startWidth = sidebarWidthRef.current;
    const navEl = navRef.current;

    const onMove = (ev: PointerEvent) => {
      const diff = startX - ev.clientX;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(startWidth + diff)));
      sidebarWidthRef.current = newWidth;
      if (navEl) navEl.style.width = newWidth + 'px';
    };

    const onUp = () => {
      isDraggingRef.current = false;
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      document.body.style.userSelect = '';
      const finalWidth = sidebarWidthRef.current;
      if (finalWidth < COLLAPSE_THRESHOLD) {
        setIsCollapsed(true);
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true');
        setIsAnimating(true);
      }
      setSidebarWidth(finalWidth);
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(finalWidth));
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }, [isCollapsed]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      setIsAnimating(true);
      return next;
    });
  }, []);

  const sidebarBg = isMD3
    ? 'var(--md-sys-color-surface-container-low)'
    : darkMode ? '#0f172a' : '#ffffff';
  const borderColor = isMD3
    ? 'var(--md-sys-color-outline-variant)'
    : darkMode ? '#1e293b' : '#e2e8f0';
  const textColor = isMD3
    ? 'var(--md-sys-color-on-surface)'
    : darkMode ? '#f1f5f9' : '#0f172a';
  const textSecondary = isMD3
    ? 'var(--md-sys-color-on-surface-variant)'
    : darkMode ? '#94a3b8' : '#64748b';

  return (
    <nav
      ref={navRef}
      style={{
        width: effectiveWidth,
        transition: isAnimating ? 'width 300ms cubic-bezier(0.2, 0, 0, 1)' : undefined,
        backgroundColor: sidebarBg,
        borderLeft: `1px solid ${borderColor}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
        height: '100dvh',
        position: 'relative',
      }}
    >
      {/* Brand Header */}
      <div style={{
        padding: isCollapsed ? '16px 8px' : '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        borderBottom: `1px solid ${borderColor}`,
        flexShrink: 0,
      }}>
        {isCollapsed ? (
          <Tooltip content={brandName || 'X2 BABY'} show={true}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: isMD3 ? 'var(--md-sys-shape-medium)' : '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
              onClick={toggleCollapse}
            >
              {brandLogo ? (
                <img src={brandLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : isMD3 ? (
                <MD3Icon name="store" size={20} className="text-[var(--md-sys-color-on-primary-container)]" />
              ) : (
                <ShoppingBag size={20} />
              )}
            </div>
          </Tooltip>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginBottom: 12 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: isMD3 ? 'var(--md-sys-shape-medium)' : '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
              }}>
                {brandLogo ? (
                  <img src={brandLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : isMD3 ? (
                  <MD3Icon name="store" size={24} className="text-[var(--md-sys-color-on-primary-container)]" />
                ) : (
                  <ShoppingBag size={24} />
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: isMD3 ? 'var(--md-sys-typescale-title-medium-size)' : '16px',
                  fontWeight: 500,
                  color: textColor,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>{brandName || 'X2 BABY'}</div>
                {brandSlogan && (
                  <div style={{
                    fontSize: isMD3 ? 'var(--md-sys-typescale-body-small-size)' : '12px',
                    color: textSecondary,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>{brandSlogan}</div>
                )}
              </div>
            </div>
            <button
              onClick={toggleCollapse}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: isMD3 ? 'var(--md-sys-shape-full)' : '12px',
                border: 'none',
                background: isMD3 ? 'var(--md-sys-color-surface-container)' : darkMode ? '#1e293b' : '#f1f5f9',
                cursor: 'pointer',
                color: isMD3 ? 'var(--md-sys-color-on-surface-variant)' : textSecondary,
                fontSize: isMD3 ? 'var(--md-sys-typescale-label-medium-size)' : '12px',
                fontWeight: 500,
                fontFamily: 'inherit',
                transition: 'background-color 0.15s',
              }}
            >
              <ChevronRight size={18} />
              <span>طي القائمة</span>
            </button>
          </>
        )}
      </div>

      {/* Navigation Items */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: isCollapsed ? '12px 8px' : '12px 12px',
      }}>
        {NAV_ITEMS.map((item, i) => {
          const navLink = (
            <NavLink
              key={item.to}
              to={item.to}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: isCollapsed ? '12px' : '12px 16px',
                borderRadius: isMD3 ? 'var(--md-sys-shape-full)' : '12px',
                color: isMD3 ? 'var(--md-sys-color-on-surface-variant)' : textSecondary,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                marginBottom: 4,
                transition: 'background-color 0.15s',
                fontWeight: isMD3 ? 500 : 700,
                fontSize: isMD3 ? 'var(--md-sys-typescale-label-large-size)' : '14px',
              }}
              className={({ isActive }) => {
                const base = isMD3
                  ? `md3-sidebar-item ${isActive ? 'md3-sidebar-item-active' : ''}`
                  : `transition-all ${isActive ? `${NAV_COLORS[i]} shadow-sm scale-105` : `hover:${darkMode ? 'bg-slate-800' : 'bg-gray-50'} hover:scale-[1.02]`}`;
                return base;
              }}
            >
              {isMD3 ? (
                <MD3Icon name={item.md3Icon} size={24} />
              ) : (
                item.icon
              )}
              {!isCollapsed && (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
              )}
            </NavLink>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={item.to} content={item.label} show={true}>
                {navLink}
              </Tooltip>
            );
          }
          return <div key={item.to}>{navLink}</div>;
        })}
      </div>

      {/* Bottom Actions */}
      <div style={{
        padding: isCollapsed ? '12px 8px' : '12px',
        borderTop: `1px solid ${borderColor}`,
        flexShrink: 0,
      }}>
        {!isCollapsed && brandSloganDesign && (
          <div style={{
            padding: '8px 12px',
            borderRadius: isMD3 ? 'var(--md-sys-shape-medium)' : '12px',
            backgroundColor: isMD3 ? 'var(--md-sys-color-surface-container)' : darkMode ? '#1e293b' : '#f1f5f9',
            marginBottom: 8,
          }}>
            <img src={brandSloganDesign} alt="Slogan" style={{ width: '100%', maxHeight: 60, objectFit: 'contain' }} />
          </div>
        )}

        {/* Dark Mode Toggle */}
        {isCollapsed ? (
          <Tooltip content={darkMode ? 'الوضع النهاري' : 'الوضع الليلي'} show={true}>
            <button
              onClick={toggleDarkMode}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px',
                borderRadius: isMD3 ? 'var(--md-sys-shape-full)' : '12px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: isMD3 ? 'var(--md-sys-color-primary)' : darkMode ? '#818cf8' : '#6366f1',
                marginBottom: 4,
              }}
            >
              {isMD3 ? (
                <MD3Icon name={darkMode ? 'light_mode' : 'dark_mode'} size={24} />
              ) : (
                darkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-indigo-400" />
              )}
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={toggleDarkMode}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderRadius: isMD3 ? 'var(--md-sys-shape-full)' : '12px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: isMD3 ? 'var(--md-sys-color-on-surface-variant)' : textSecondary,
              fontFamily: 'inherit',
              fontSize: isMD3 ? 'var(--md-sys-typescale-label-large-size)' : '14px',
              fontWeight: 500,
              transition: 'background-color 0.15s',
            }}
          >
            {isMD3 ? (
              <MD3Icon name={darkMode ? 'light_mode' : 'dark_mode'} size={24} className="text-[var(--md-sys-color-primary)]" />
            ) : (
              darkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-indigo-400" />
            )}
            <span>{darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
          </button>
        )}

        {/* Logout */}
        {isCollapsed ? (
          <Tooltip content="تسجيل الخروج" show={true}>
            <button
              onClick={() => logout()}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px',
                borderRadius: isMD3 ? 'var(--md-sys-shape-full)' : '12px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: isMD3 ? 'var(--md-sys-color-error)' : '#ef4444',
              }}
            >
              {isMD3 ? (
                <MD3Icon name="logout" size={24} />
              ) : (
                <LogOut size={20} />
              )}
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={() => logout()}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderRadius: isMD3 ? 'var(--md-sys-shape-full)' : '12px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: isMD3 ? 'var(--md-sys-color-error)' : '#ef4444',
              fontFamily: 'inherit',
              fontSize: isMD3 ? 'var(--md-sys-typescale-label-large-size)' : '14px',
              fontWeight: 500,
              transition: 'background-color 0.15s',
            }}
          >
            {isMD3 ? <MD3Icon name="logout" size={24} /> : <LogOut size={20} />}
            <span>تسجيل الخروج</span>
          </button>
        )}
      </div>

      {/* Drag Handle */}
      {!isCollapsed && (
        <div
          onPointerDown={handleSidebarDrag}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 12,
            zIndex: 50,
            cursor: 'col-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          className="group/drag"
        >
          <div
            style={{
              width: 3,
              height: '100%',
              backgroundColor: darkMode ? '#334155' : '#e2e8f0',
              transition: 'background-color 0.15s',
              borderRadius: 2,
            }}
            className="group-hover/drag:bg-[var(--md-sys-color-primary)] group-active/drag:bg-[var(--md-sys-color-primary)]"
          />
        </div>
      )}
    </nav>
  );
};

export default AppSidebar;
