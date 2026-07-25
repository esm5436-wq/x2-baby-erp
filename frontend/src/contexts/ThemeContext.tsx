import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type ThemeType = 'classic' | 'material3';

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

function luminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function mix(hex1: string, hex2: string, weight: number): string {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const r = Math.round(r1 + (r2 - r1) * weight);
  const g = Math.round(g1 + (g2 - g1) * weight);
  const b = Math.round(b1 + (b2 - b1) * weight);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function generateOnColor(bg: string): string {
  const [r, g, b] = hexToRgb(bg);
  return luminance(r, g, b) > 0.179 ? '#1B1B1F' : '#FFFFFF';
}

function generateContainer(base: string, dark: boolean): string {
  return dark ? mix(base, '#1B1B1F', 0.3) : mix(base, '#FFFFFF', 0.88);
}

function generateOnContainer(base: string, dark: boolean): string {
  return dark ? mix(base, '#FFFFFF', 0.8) : mix(base, '#1B1B1F', 0.7);
}

function generateThemeColors(hex: string, dark: boolean) {
  const [r, g, b] = hexToRgb(hex);
  const on = generateOnColor(hex);
  const container = generateContainer(hex, dark);
  const onContainer = generateOnContainer(hex, dark);
  return {
    base: hex,
    on,
    container,
    onContainer,
    rgb: `${r}, ${g}, ${b}`,
  };
}

function applyCustomColors(primary: string, secondary: string, dark: boolean) {
  const root = document.documentElement;
  const p = generateThemeColors(primary, dark);
  const s = generateThemeColors(secondary, dark);
  root.style.setProperty('--md-sys-color-primary', p.base);
  root.style.setProperty('--md-sys-color-on-primary', p.on);
  root.style.setProperty('--md-sys-color-primary-container', p.container);
  root.style.setProperty('--md-sys-color-on-primary-container', p.onContainer);
  root.style.setProperty('--md-sys-color-primary-rgb', p.rgb);
  root.style.setProperty('--md-sys-color-secondary', s.base);
  root.style.setProperty('--md-sys-color-on-secondary', s.on);
  root.style.setProperty('--md-sys-color-secondary-container', s.container);
  root.style.setProperty('--md-sys-color-on-secondary-container', s.onContainer);
}

function clearCustomColors() {
  const root = document.documentElement;
  ['--md-sys-color-primary', '--md-sys-color-on-primary', '--md-sys-color-primary-container', '--md-sys-color-on-primary-container', '--md-sys-color-primary-rgb', '--md-sys-color-secondary', '--md-sys-color-on-secondary', '--md-sys-color-secondary-container', '--md-sys-color-on-secondary-container'].forEach(p => root.style.removeProperty(p));
}

const DEFAULT_PRIMARY = '#C1DBFD';
const DEFAULT_SECONDARY = '#F3D0D0';

interface ThemeContextType {
  uiTheme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (val: boolean) => void;
  isMaterial3: boolean;
  isClassic: boolean;
  primaryColor: string;
  secondaryColor: string;
  setPrimaryColor: (hex: string) => void;
  setSecondaryColor: (hex: string) => void;
  resetColors: () => void;
}

const THEME_STORAGE_KEY = 'erp_theme_mode';
const DARK_MODE_STORAGE_KEY = 'erp_theme';
const PRIMARY_COLOR_KEY = 'erp_md3_primary_color';
const SECONDARY_COLOR_KEY = 'erp_md3_secondary_color';

const ThemeContext = createContext<ThemeContextType>({
  uiTheme: 'material3',
  setTheme: () => {},
  darkMode: false,
  toggleDarkMode: () => {},
  setDarkMode: () => {},
  isMaterial3: true,
  isClassic: false,
  primaryColor: DEFAULT_PRIMARY,
  secondaryColor: DEFAULT_SECONDARY,
  setPrimaryColor: () => {},
  setSecondaryColor: () => {},
  resetColors: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [uiTheme, setThemeState] = useState<ThemeType>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'material3' || saved === 'classic') return saved;
    return 'material3';
  });

  const [darkMode, setDarkModeState] = useState(() => {
    return localStorage.getItem(DARK_MODE_STORAGE_KEY) === 'dark';
  });

  const [primaryColor, setPrimaryColorState] = useState(() => {
    return localStorage.getItem(PRIMARY_COLOR_KEY) || DEFAULT_PRIMARY;
  });

  const [secondaryColor, setSecondaryColorState] = useState(() => {
    return localStorage.getItem(SECONDARY_COLOR_KEY) || DEFAULT_SECONDARY;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', uiTheme);
  }, [uiTheme]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(DARK_MODE_STORAGE_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(DARK_MODE_STORAGE_KEY, 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    if (uiTheme === 'material3') {
      applyCustomColors(primaryColor, secondaryColor, darkMode);
    } else {
      clearCustomColors();
    }
  }, [uiTheme, primaryColor, secondaryColor, darkMode]);

  const setTheme = useCallback((newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkModeState(prev => !prev);
  }, []);

  const setDarkMode = useCallback((val: boolean) => {
    setDarkModeState(val);
  }, []);

  const setPrimaryColor = useCallback((hex: string) => {
    setPrimaryColorState(hex);
    localStorage.setItem(PRIMARY_COLOR_KEY, hex);
  }, []);

  const setSecondaryColor = useCallback((hex: string) => {
    setSecondaryColorState(hex);
    localStorage.setItem(SECONDARY_COLOR_KEY, hex);
  }, []);

  const resetColors = useCallback(() => {
    setPrimaryColorState(DEFAULT_PRIMARY);
    setSecondaryColorState(DEFAULT_SECONDARY);
    localStorage.removeItem(PRIMARY_COLOR_KEY);
    localStorage.removeItem(SECONDARY_COLOR_KEY);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        uiTheme,
        setTheme,
        darkMode,
        toggleDarkMode,
        setDarkMode,
        isMaterial3: uiTheme === 'material3',
        isClassic: uiTheme === 'classic',
        primaryColor,
        secondaryColor,
        setPrimaryColor,
        setSecondaryColor,
        resetColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
