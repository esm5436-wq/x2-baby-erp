import { useRef, useCallback } from 'react';

export function useUnsavedCheck<T>(formData: T) {
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const initialSnapshot = useRef(JSON.stringify(formData));

  const withUnsavedCheck = useCallback((action: () => void) => {
    const dirty = JSON.stringify(formDataRef.current) !== initialSnapshot.current;
    if (dirty) {
      if (window.confirm('لديك تغييرات غير محفوظة. هل تريد الخروج؟')) {
        action();
      }
    } else {
      action();
    }
  }, []);

  const markClean = useCallback(() => {
    initialSnapshot.current = JSON.stringify(formDataRef.current);
  }, []);

  return { withUnsavedCheck, markClean };
}
