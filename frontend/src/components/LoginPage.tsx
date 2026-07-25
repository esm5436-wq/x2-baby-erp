
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Package, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { API_BASE } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { isMaterial3 } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [brand, setBrand] = useState<{ brandLogo?: string; brandName?: string; brandSlogan?: string }>({});

  useEffect(() => {
    fetch(`${API_BASE}/public/brand`).then(r => r.json()).then(setBrand).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    setError('');
    setLoading(true);
    const success = await login(username.trim(), password);
    setLoading(false);
    if (!success) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  };

  if (isMaterial3) {
    return <MD3LoginPage brand={brand} username={username} setUsername={setUsername} password={password} setPassword={setPassword} error={error} loading={loading} showPassword={showPassword} setShowPassword={setShowPassword} handleSubmit={handleSubmit} />;
  }

  return <ClassicLoginPage brand={brand} username={username} setUsername={setUsername} password={password} setPassword={setPassword} error={error} loading={loading} showPassword={showPassword} setShowPassword={setShowPassword} handleSubmit={handleSubmit} />;
};

/* ═══════════════════════════════════════════════════════════════
   Material Design 3 Login Page
   ═══════════════════════════════════════════════════════════════ */
const MD3LoginPage: React.FC<{
  brand: { brandLogo?: string; brandName?: string; brandSlogan?: string };
  username: string; setUsername: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  error: string; loading: boolean;
  showPassword: boolean; setShowPassword: (v: boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
}> = ({ brand, username, setUsername, password, setPassword, error, loading, showPassword, setShowPassword, handleSubmit }) => {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(160deg, var(--md-sys-color-primary-container) 0%, var(--md-sys-color-surface) 40%, var(--md-sys-color-surface-container-low) 100%)',
        fontFamily: "'Roboto', 'Cairo', sans-serif",
      }}
    >
      <div className="w-full max-w-md" style={{ animation: 'md3-fade-in-up 0.5s cubic-bezier(0.05, 0.7, 0.1, 1)' }}>
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 flex items-center justify-center mx-auto mb-5 overflow-hidden"
            style={{
              borderRadius: 'var(--md-sys-shape-extra-large)',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              boxShadow: 'var(--md-sys-elevation-2)',
            }}
          >
            {brand.brandLogo ? (
              <img src={brand.brandLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Package size={36} style={{ color: 'var(--md-sys-color-primary)' }} />
            )}
          </div>
          <h1 className="text-2xl" style={{ color: 'var(--md-sys-color-on-surface)', fontWeight: 500, letterSpacing: '0px', fontFamily: "'Roboto', 'Cairo', sans-serif" }}>
            {brand.brandName || 'X2 BABY'}
          </h1>
          {brand.brandSlogan && (
            <p className="text-sm mt-2" style={{ color: 'var(--md-sys-color-on-surface-variant)', fontWeight: 400 }}>
              {brand.brandSlogan}
            </p>
          )}
        </div>

        {/* Login Card */}
        <div
          className="p-8"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container-low)',
            borderRadius: 'var(--md-sys-shape-extra-large)',
            boxShadow: 'var(--md-sys-elevation-1)',
          }}
        >
          <h2 className="text-xl mb-6 text-center" style={{ color: 'var(--md-sys-color-on-surface)', fontWeight: 400, fontFamily: "'Roboto', 'Cairo', sans-serif" }}>
            تسجيل الدخول
          </h2>

          {error && (
            <div
              className="flex items-center gap-3 p-4 mb-6"
              style={{
                backgroundColor: 'var(--md-sys-color-error-container)',
                borderRadius: 'var(--md-sys-shape-small)',
                color: 'var(--md-sys-color-on-error-container)',
                fontSize: '14px',
                fontFamily: "'Roboto', 'Cairo', sans-serif",
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Field */}
            <div style={{ position: 'relative', minHeight: '56px' }}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder=" "
                autoFocus
                dir="auto"
                className="w-full"
                style={{
                  padding: '24px 16px 8px',
                  fontSize: '16px',
                  lineHeight: '24px',
                  fontFamily: "'Roboto', 'Cairo', sans-serif",
                  color: 'var(--md-sys-color-on-surface)',
                  backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                  border: 'none',
                  borderRadius: 'var(--md-sys-shape-extra-small)',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-highest)'; }}
              />
              <label
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: username ? '8px' : '50%',
                  transform: username ? 'none' : 'translateY(-50%)',
                  fontSize: username ? '12px' : '16px',
                  lineHeight: username ? '16px' : '24px',
                  color: username ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
                  transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                  pointerEvents: 'none',
                  fontFamily: "'Roboto', 'Cairo', sans-serif",
                }}
              >
                اسم المستخدم
              </label>
            </div>

            {/* Password Field */}
            <div style={{ position: 'relative', minHeight: '56px' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                dir="auto"
                className="w-full"
                style={{
                  padding: '24px 48px 8px 16px',
                  fontSize: '16px',
                  lineHeight: '24px',
                  fontFamily: "'Roboto', 'Cairo', sans-serif",
                  color: 'var(--md-sys-color-on-surface)',
                  backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                  border: 'none',
                  borderRadius: 'var(--md-sys-shape-extra-small)',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
              <label
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: password ? '8px' : '50%',
                  transform: password ? 'none' : 'translateY(-50%)',
                  fontSize: password ? '12px' : '16px',
                  lineHeight: password ? '16px' : '24px',
                  color: password ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
                  transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                  pointerEvents: 'none',
                  fontFamily: "'Roboto', 'Cairo', sans-serif",
                }}
              >
                كلمة المرور
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--md-sys-shape-full)',
                  color: 'var(--md-sys-color-on-surface-variant)',
                  transition: 'background-color 0.2s',
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full"
              style={{
                padding: '10px 24px',
                minHeight: '40px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                border: 'none',
                borderRadius: 'var(--md-sys-shape-full)',
                backgroundColor: 'var(--md-sys-color-primary)',
                color: 'var(--md-sys-color-on-primary)',
                fontSize: '14px',
                fontWeight: 500,
                letterSpacing: '0.1px',
                fontFamily: "'Roboto', 'Cairo', sans-serif",
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'box-shadow 0.2s, filter 0.2s',
                boxShadow: 'var(--md-sys-elevation-0)',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-0)'; }}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : null}
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6" style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', fontFamily: "'Roboto', 'Cairo', sans-serif" }}>
          نظام إدارة المخزون — X2 ERP
        </p>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Classic Login Page (unchanged from original)
   ═══════════════════════════════════════════════════════════════ */
const ClassicLoginPage: React.FC<{
  brand: { brandLogo?: string; brandName?: string; brandSlogan?: string };
  username: string; setUsername: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  error: string; loading: boolean;
  showPassword: boolean; setShowPassword: (v: boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
}> = ({ brand, username, setUsername, password, setPassword, error, loading, showPassword, setShowPassword, handleSubmit }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-500">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-md ring-1 ring-gray-100 dark:ring-slate-800 overflow-hidden">
            {brand.brandLogo ? (
              <img src={brand.brandLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Package size={40} className="text-accent" />
            )}
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">{brand.brandName || 'X2 BABY'}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-bold mt-2">{brand.brandSlogan || 'الجودة، الثقة، والأمان'}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-md ring-1 ring-gray-100 dark:ring-slate-800 space-y-6">
          <h2 className="text-xl font-black text-slate-900 dark:text-white text-center">تسجيل الدخول</h2>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-400 text-sm font-bold">
              <AlertCircle size={20} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">اسم المستخدم</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20 transition-colors duration-200"
              placeholder="أدخل اسم المستخدم"
              autoFocus
              dir="auto"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">كلمة المرور</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20 transition-colors duration-200 pl-12"
                placeholder="أدخل كلمة المرور"
                dir="auto"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-accent hover:bg-accent/90 text-white font-black text-lg rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-accent/25"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : null}
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
