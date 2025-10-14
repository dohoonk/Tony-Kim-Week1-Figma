import { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from 'react';

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

  const addShape = useCallback((type: ShapeType) => {
    const obj = newShape(type, addCountRef.current++);
    setObjects((prev) => [...prev, obj]);
    setSelectedId(obj.id);
  }, []);

  const updateShape = useCallback((id: string, patch: Partial<CanvasObject>) => {
    setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setObjects((prev) => prev.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  const select = useCallback((id: string | null) => setSelectedId(id), []);

  const value = useMemo(
    () => ({ objects, selectedId, addShape, updateShape, deleteSelected, select }),
    [objects, selectedId, addShape, updateShape, deleteSelected, select]
  );

  return <CanvasObjectsContext.Provider value={value}>{children}</CanvasObjectsContext.Provider>;
}

export function useCanvasObjects(): CanvasObjectsState {
  const ctx = useContext(CanvasObjectsContext);
  if (!ctx) throw new Error('useCanvasObjects must be used within CanvasObjectsProvider');
  return ctx;
}
