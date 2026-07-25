import React from 'react';
import { Share2, Monitor } from 'lucide-react';
import { MD3Dialog } from './md3';
import { MD3Button } from './md3';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ isOpen, onClose }) => {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);

  return (
    <MD3Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="إضافة التطبيق"
      description="إلى الشاشة الرئيسية"
      icon={<span className="material-symbols-rounded" style={{ fontSize: 24 }}>download</span>}
      maxWidth="sm"
      closeButton
    >
      {isIOS && !isSafari ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            المتصفح الحالي لا يدعم تثبيت التطبيق مباشرة. اتبع الخطوات التالية:
          </p>
          <ol className="space-y-3">
            <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
              <span className="w-6 h-6 bg-[var(--md-sys-color-primary-container)] rounded-full flex items-center justify-center text-xs font-bold text-[var(--md-sys-color-primary)] shrink-0 mt-0.5">1</span>
              <span>اضغط على زر <strong>مشاركة</strong> <Share2 size={14} className="inline text-[var(--md-sys-color-primary)]" /> في شريط العنوان</span>
            </li>
            <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
              <span className="w-6 h-6 bg-[var(--md-sys-color-primary-container)] rounded-full flex items-center justify-center text-xs font-bold text-[var(--md-sys-color-primary)] shrink-0 mt-0.5">2</span>
              <span>اختر <strong>إضافة إلى الشاشة الرئيسية</strong></span>
            </li>
            <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
              <span className="w-6 h-6 bg-[var(--md-sys-color-primary-container)] rounded-full flex items-center justify-center text-xs font-bold text-[var(--md-sys-color-primary)] shrink-0 mt-0.5">3</span>
              <span>اضغط <strong>إضافة</strong> في أعلى الشاشة</span>
            </li>
          </ol>
        </div>
      ) : isIOS || isSafari ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            اتبع الخطوات التالية لإضافة التطبيق إلى الشاشة الرئيسية:
          </p>
          <ol className="space-y-3">
            <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
              <span className="w-6 h-6 bg-[var(--md-sys-color-primary-container)] rounded-full flex items-center justify-center text-xs font-bold text-[var(--md-sys-color-primary)] shrink-0 mt-0.5">1</span>
              <span>اضغط على زر <strong>مشاركة</strong> <Share2 size={14} className="inline text-[var(--md-sys-color-primary)]" /> في شريط العنوان</span>
            </li>
            <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
              <span className="w-6 h-6 bg-[var(--md-sys-color-primary-container)] rounded-full flex items-center justify-center text-xs font-bold text-[var(--md-sys-color-primary)] shrink-0 mt-0.5">2</span>
              <span>مرّر لأسفل واختر <strong>إضافة إلى الشاشة الرئيسية</strong></span>
            </li>
            <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
              <span className="w-6 h-6 bg-[var(--md-sys-color-primary-container)] rounded-full flex items-center justify-center text-xs font-bold text-[var(--md-sys-color-primary)] shrink-0 mt-0.5">3</span>
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
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            يمكنك تثبيت التطبيق بسهولة من خلال المتصفح:
          </p>
          <ol className="space-y-3">
            <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
              <span className="w-6 h-6 bg-[var(--md-sys-color-primary-container)] rounded-full flex items-center justify-center text-xs font-bold text-[var(--md-sys-color-primary)] shrink-0 mt-0.5">1</span>
              <span>اضغط على زر <strong>القائمة</strong> <Monitor size={14} className="inline text-[var(--md-sys-color-primary)]" /> (ثلاث نقاط)</span>
            </li>
            <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
              <span className="w-6 h-6 bg-[var(--md-sys-color-primary-container)] rounded-full flex items-center justify-center text-xs font-bold text-[var(--md-sys-color-primary)] shrink-0 mt-0.5">2</span>
              <span>اختر <strong>تثبيت التطبيق</strong> أو <strong>إضافة إلى الشاشة الرئيسية</strong></span>
            </li>
            <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
              <span className="w-6 h-6 bg-[var(--md-sys-color-primary-container)] rounded-full flex items-center justify-center text-xs font-bold text-[var(--md-sys-color-primary)] shrink-0 mt-0.5">3</span>
              <span>اضغط <strong>تثبيت</strong> لتأكيد العملية</span>
            </li>
          </ol>
        </div>
      )}

      <div className="mt-6">
        <MD3Button variant="filled" fullWidth onClick={onClose}>فهمت</MD3Button>
      </div>
    </MD3Dialog>
  );
};

export default InstallGuideModal;
