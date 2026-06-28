export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getAuthToken(): string | null {
  return sessionStorage.getItem('auth_token');
}

export function setAuthToken(token: string, username: string): void {
  sessionStorage.setItem('auth_token', token);
  sessionStorage.setItem('auth_username', username);
}

export function clearAuthToken(): void {
  sessionStorage.removeItem('auth_token');
  sessionStorage.removeItem('auth_username');
}

export function getAuthUsername(): string | null {
  return sessionStorage.getItem('auth_username');
}
