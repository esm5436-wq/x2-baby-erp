import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smartphone, Monitor, Share2, Plus, Download } from 'lucide-react';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ isOpen, onClose }) => {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-sm shadow-2xl border border-white/20 overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500" />
            <div className="p-6 pt-8">
              <button
                onClick={onClose}
                className="absolute top-4 left-4 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center">
                  <Download size={24} className="text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">إضافة التطبيق</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">إلى الشاشة الرئيسية</p>
                </div>
              </div>

              {isIOS && !isSafari ? (
                // iOS but not Safari (Chrome/Firefox on iOS)
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    المتصفح الحالي لا يدعم تثبيت التطبيق مباشرة. اتبع الخطوات التالية:
                  </p>
                  <ol className="space-y-3">
                    <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <span className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center text-xs font-bold text-accent shrink-0 mt-0.5">1</span>
                      <span>اضغط على زر <strong>مشاركة</strong> <Share2 size={14} className="inline text-accent" /> في شريط العنوان</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <span className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center text-xs font-bold text-accent shrink-0 mt-0.5">2</span>
                      <span>اختر <strong>إضافة إلى الشاشة الرئيسية</strong></span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <span className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center text-xs font-bold text-accent shrink-0 mt-0.5">3</span>
                      <span>اضغط <strong>إضافة</strong> في أعلى الشاشة</span>
                    </li>
                  </ol>
                </div>
              ) : isIOS || isSafari ? (
                // Safari (including iOS Safari)
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    اتبع الخطوات التالية لإضافة التطبيق إلى الشاشة الرئيسية:
                  </p>
                  <ol className="space-y-3">
                    <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <span className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center text-xs font-bold text-accent shrink-0 mt-0.5">1</span>
                      <span>اضغط على زر <strong>مشاركة</strong> <Share2 size={14} className="inline text-accent" /> في شريط العنوان</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <span className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center text-xs font-bold text-accent shrink-0 mt-0.5">2</span>
                      <span>مرّر لأسفل واختر <strong>إضافة إلى الشاشة الرئيسية</strong></span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <span className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center text-xs font-bold text-accent shrink-0 mt-0.5">3</span>
                      <span>اضغط <strong>إضافة</strong> في أعلى الشاشة</span>
                    </li>
                  </ol>
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      تأكد من استخدام متصفح Safari للحصول على أفضل تجربة تثبيت على أجهزة Apple.
                    </p>
                  </div>
                </div>
              ) : (
                // Android / Desktop Chrome
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    يمكنك تثبيت التطبيق بسهولة من خلال المتصفح:
                  </p>
                  <ol className="space-y-3">
                    <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <span className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center text-xs font-bold text-accent shrink-0 mt-0.5">1</span>
                      <span>اضغط على زر <strong>القائمة</strong> <Monitor size={14} className="inline text-accent" /> (ثلاث نقاط)</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <span className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center text-xs font-bold text-accent shrink-0 mt-0.5">2</span>
                      <span>اختر <strong>تثبيت التطبيق</strong> أو <strong>إضافة إلى الشاشة الرئيسية</strong></span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <span className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center text-xs font-bold text-accent shrink-0 mt-0.5">3</span>
                      <span>اضغط <strong>تثبيت</strong> لتأكيد العملية</span>
                    </li>
                  </ol>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full mt-6 py-3 bg-accent hover:bg-accent/90 text-white rounded-2xl font-bold text-sm transition-colors active:scale-95"
              >
                فهمت
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InstallGuideModal;
