import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { API_BASE } from '../lib/api';

interface UndoRedoContextType {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  undoStack: number[];
  redoStack: number[];
  pushUndo: (id: number) => void;
  clearStacks: () => void;
  refreshLogs: () => void;
  setOnRefreshState: (cb: (() => Promise<void>) | null) => void;
  refreshKey: number;
}

const UndoRedoContext = createContext<UndoRedoContextType>({
  undo: async () => {},
  redo: async () => {},
  canUndo: false,
  canRedo: false,
  undoStack: [],
  redoStack: [],
  pushUndo: () => {},
  clearStacks: () => {},
  refreshLogs: () => {},
  setOnRefreshState: () => {},
  refreshKey: 0,
});

export const useUndoRedo = () => useContext(UndoRedoContext);

export const UndoRedoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [undoStack, setUndoStack] = useState<number[]>([]);
  const [redoStack, setRedoStack] = useState<number[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const stackRef = useRef<number[]>([]);
  const redoRef = useRef<number[]>([]);
  const onRefreshStateRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => { stackRef.current = undoStack; }, [undoStack]);
  useEffect(() => { redoRef.current = redoStack; }, [redoStack]);

  const pushUndo = useCallback((id: number) => {
    setUndoStack(prev => [id, ...prev]);
    setRedoStack([]);
  }, []);

  const clearStacks = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const refreshLogs = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const setOnRefreshState = useCallback((cb: (() => Promise<void>) | null) => {
    onRefreshStateRef.current = cb;
  }, []);

  const undo = useCallback(async () => {
    if (stackRef.current.length === 0) return;
    const id = stackRef.current[0];
    try {
      const res = await fetch(`${API_BASE}/activity-logs/${id}/undo`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setUndoStack(prev => {
          const [first, ...rest] = prev;
          setRedoStack(r => [first, ...r]);
          return rest;
        });
        refreshLogs();
        onRefreshStateRef.current?.();
        return data.message;
      } else {
        throw new Error(data.error || 'فشل التراجع');
      }
    } catch (err) {
      console.error('Undo failed:', err);
    }
  }, [refreshLogs]);

  const redo = useCallback(async () => {
    if (redoRef.current.length === 0) return;
    const id = redoRef.current[0];
    try {
      const res = await fetch(`${API_BASE}/activity-logs/${id}/undo`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setRedoStack(prev => {
          const [first, ...rest] = prev;
          setUndoStack(u => [first, ...u]);
          return rest;
        });
        refreshLogs();
        onRefreshStateRef.current?.();
        return data.message;
      } else {
        throw new Error(data.error || 'فشل إعادة التنفيذ');
      }
    } catch (err) {
      console.error('Redo failed:', err);
    }
  }, [refreshLogs]);

  return (
    <UndoRedoContext.Provider value={{
      undo,
      redo,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
      undoStack,
      redoStack,
      pushUndo,
      clearStacks,
      refreshLogs,
      setOnRefreshState,
      refreshKey,
    }}>
      {children}
    </UndoRedoContext.Provider>
  );
};
