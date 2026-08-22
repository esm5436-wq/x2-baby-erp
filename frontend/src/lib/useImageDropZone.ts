import { useCallback, useRef, useState, type DragEvent } from 'react';

/**
 * Hook موحّد لتفعيل السحب والإفلات (Drag & Drop) للصور على أي عنصر.
 * يعيد isDragging للتغذية البصرية و dropProps لانتشارها على العنصر المستهدف.
 * يصفّي الملفات غير الصورية تلقائياً ويمنع سلوك المتصفح الافتراضي.
 */
export function useImageDropZone(onFiles: (files: File[]) => void) {
  const [isDragging, setIsDragging] = useState(false);
  const depthRef = useRef(0);

  const onDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    depthRef.current += 1;
    if (Array.from(e.dataTransfer?.types || []).some(t => t === 'Files')) setIsDragging(true);
  }, []);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    depthRef.current -= 1;
    if (depthRef.current <= 0) { depthRef.current = 0; setIsDragging(false); }
  }, []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    depthRef.current = 0;
    setIsDragging(false);
    const files: File[] = [];
    for (let i = 0; i < (e.dataTransfer?.files?.length || 0); i++) {
      const f = e.dataTransfer!.files[i];
      if (f.type.startsWith('image/')) files.push(f);
    }
    if (files.length > 0) onFiles(files);
  }, [onFiles]);

  return { isDragging, dropProps: { onDragEnter, onDragOver, onDragLeave, onDrop } };
}
