import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useFirestoreSync } from './useFirestoreSync';

export type ShapeType = 'rectangle' | 'circle' | 'triangle';

export type CanvasObject = {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
};

export type CanvasObjectsState = {
  objects: CanvasObject[];
  selectedId: string | null;
  addShape: (type: ShapeType) => void;
  updateShape: (id: string, patch: Partial<CanvasObject>) => void;
  deleteSelected: () => void;
  copySelected: () => void;
  select: (id: string | null) => void;
};

const CanvasObjectsContext = createContext<CanvasObjectsState | null>(null);

function randomColor() {
  const colors = ['#91c9f9', '#a7f3d0', '#fde68a'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function newShape(type: ShapeType, idx: number): CanvasObject {
  const base = { width: 160, height: 100 };
  const offset = idx * 24;
  return {
    id: crypto.randomUUID(),
    type,
    x: 120 + offset,
    y: 120 + offset,
    width: type === 'circle' ? 120 : base.width,
    height: type === 'circle' ? 120 : base.height,
    color: randomColor(),
    rotation: 0,
  };
}

export function CanvasObjectsProvider({ children }: { children: ReactNode }) {
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const addCountRef = useRef(0);

  const { subscribe, writeObject, deleteObject } = useFirestoreSync();

  // Debounce writes during drag/resize
  const pendingWrite = useRef<Record<string, number>>({});
  const scheduleWrite = useCallback((obj: CanvasObject) => {
    const key = obj.id;
    if (pendingWrite.current[key]) window.clearTimeout(pendingWrite.current[key]);
    pendingWrite.current[key] = window.setTimeout(() => {
      void writeObject(obj);
      delete pendingWrite.current[key];
    }, 100);
  }, [writeObject]);

  // Realtime subscription
  useEffect(() => {
    return subscribe((remote) => {
      setObjects(remote);
      if (selectedId && !remote.find((o) => o.id === selectedId)) {
        setSelectedId(null);
      }
    });
  }, [subscribe, selectedId]);

  const addShape = useCallback((type: ShapeType) => {
    const obj = newShape(type, addCountRef.current++);
    setObjects((prev) => [...prev, obj]);
    setSelectedId(obj.id);
    scheduleWrite(obj);
  }, [scheduleWrite]);

  const updateShape = useCallback((id: string, patch: Partial<CanvasObject>) => {
    setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    const next = objects.find((o) => o.id === id);
    if (next) scheduleWrite({ ...next, ...patch });
  }, [objects, scheduleWrite]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const id = selectedId;
    setObjects((prev) => prev.filter((o) => o.id !== id));
    setSelectedId(null);
    void deleteObject(id);
  }, [selectedId, deleteObject]);

  const copySelected = useCallback(() => {
    if (!selectedId) return;
    const source = objects.find((o) => o.id === selectedId);
    if (!source) return;
    const dup: CanvasObject = {
      ...source,
      id: crypto.randomUUID(),
      x: source.x + 24,
      y: source.y + 24,
    };
    setObjects((prev) => [...prev, dup]);
    setSelectedId(dup.id);
    scheduleWrite(dup);
  }, [objects, selectedId, scheduleWrite]);

  const select = useCallback((id: string | null) => setSelectedId(id), []);

  const value = useMemo(
    () => ({ objects, selectedId, addShape, updateShape, deleteSelected, copySelected, select }),
    [objects, selectedId, addShape, updateShape, deleteSelected, copySelected, select]
  );

  return <CanvasObjectsContext.Provider value={value}>{children}</CanvasObjectsContext.Provider>;
}

export function useCanvasObjects(): CanvasObjectsState {
  const ctx = useContext(CanvasObjectsContext);
  if (!ctx) throw new Error('useCanvasObjects must be used within CanvasObjectsProvider');
  return ctx;
}
