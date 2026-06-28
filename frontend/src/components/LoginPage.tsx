
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Package, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-500">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-xl ring-1 ring-gray-100 dark:ring-slate-800">
            <Package size={40} className="text-accent" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">X2 BABY ERP</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-bold mt-2">نظام إدارة المخزون والمبيعات</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-xl ring-1 ring-gray-100 dark:ring-slate-800 space-y-6">
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
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20 transition-all"
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
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20 transition-all pl-12"
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
            className="w-full py-4 bg-accent hover:bg-accent/90 text-white font-black text-lg rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-accent/25"
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
