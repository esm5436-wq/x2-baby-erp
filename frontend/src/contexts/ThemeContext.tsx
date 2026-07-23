import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type ThemeType = 'classic' | 'material3';

interface ThemeContextType {
  uiTheme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (val: boolean) => void;
  isMaterial3: boolean;
  isClassic: boolean;
}

const THEME_STORAGE_KEY = 'erp_theme_mode';
const DARK_MODE_STORAGE_KEY = 'erp_theme';

const ThemeContext = createContext<ThemeContextType>({
  uiTheme: 'classic',
  setTheme: () => {},
  darkMode: false,
  toggleDarkMode: () => {},
  setDarkMode: () => {},
  isMaterial3: false,
  isClassic: true,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [uiTheme, setThemeState] = useState<ThemeType>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'material3' || saved === 'classic') return saved;
    return 'classic';
  });

  const [darkMode, setDarkModeState] = useState(() => {
    return localStorage.getItem(DARK_MODE_STORAGE_KEY) === 'dark';
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
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
