import { useRef, useCallback } from 'react';

export function useUnsavedCheck<T>(formData: T, onDirtyConfirm?: (message: string) => Promise<boolean>) {
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const initialSnapshot = useRef(JSON.stringify(formData));

  const withUnsavedCheck = useCallback((action: () => void) => {
    const dirty = JSON.stringify(formDataRef.current) !== initialSnapshot.current;
    if (dirty) {
      if (onDirtyConfirm) {
        onDirtyConfirm('لديك تغييرات غير محفوظة. هل تريد الخروج؟').then(ok => { if (ok) action(); });
      } else {
        if (window.confirm('لديك تغييرات غير محفوظة. هل تريد الخروج؟')) {
          action();
        }
      }
    } else {
      action();
    }
  }, [onDirtyConfirm]);

  const markClean = useCallback(() => {
    initialSnapshot.current = JSON.stringify(formDataRef.current);
  }, []);

  const isDirty = useCallback(() => {
    return JSON.stringify(formDataRef.current) !== initialSnapshot.current;
  }, []);

  return { withUnsavedCheck, markClean, isDirty };
}
