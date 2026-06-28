import { useRef, useCallback, useMemo } from 'react';

export function useUnsavedCheck<T>(formData: T) {
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const initialSnapshot = useRef(JSON.stringify(formData));

  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== initialSnapshot.current;
  }, [formData]);

  const withUnsavedCheck = useCallback((action: () => void) => {
    if (isDirty) {
      if (window.confirm('لديك تغييرات غير محفوظة. هل تريد الخروج؟')) {
        action();
      }
    } else {
      action();
    }
  }, [isDirty]);

  const markClean = useCallback(() => {
    initialSnapshot.current = JSON.stringify(formDataRef.current);
  }, []);

  return { isDirty, withUnsavedCheck, markClean };
}
