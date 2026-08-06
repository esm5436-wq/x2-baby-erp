
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE, getAuthToken, setAuthToken, clearAuthToken, getAuthUsername } from '../lib/api';

interface AuthContextType {
  token: string | null;
  username: string | null;
  role: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

function getRoleFromToken(token: string | null): string {
  if (!token) return 'user';
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    return payload.role || 'user';
  } catch {
    return 'user';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getAuthToken);
  const [username, setUsername] = useState<string | null>(getAuthUsername);
  const [role, setRole] = useState<string>(() => getRoleFromToken(getAuthToken()));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = getAuthToken();
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    fetch(`${API_BASE}/auth/verify`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.valid) {
          clearAuthToken();
          setToken(null);
          setUsername(null);
          setRole('user');
        }
      })
      .catch(() => {
        clearAuthToken();
        setToken(null);
        setUsername(null);
        setRole('user');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      setAuthToken(data.token, data.username);
      setToken(data.token);
      setUsername(data.username);
      setRole(getRoleFromToken(data.token));
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    clearAuthToken();
    setToken(null);
    setUsername(null);
    setRole('user');
  };

  return (
    <AuthContext.Provider value={{ token, username, role, isAuthenticated: !!token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
