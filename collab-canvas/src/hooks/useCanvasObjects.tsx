import { createContext, useContext } from 'react';

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
  // LWW metadata (optional until next write)
  updatedAtMs?: number;
  lastEditedBy?: string;
  lastEditedAtMs?: number;
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

export const CanvasObjectsContext = createContext<CanvasObjectsState | null>(null);

function randomColor() {
  const colors = ['#91c9f9', '#a7f3d0', '#fde68a'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// intentionally kept for external providers; not used directly in this file after refactor
export function newShape(type: ShapeType, idx: number): CanvasObject {
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

export function useCanvasObjects(): CanvasObjectsState {
  const ctx = useContext(CanvasObjectsContext);
  if (!ctx) throw new Error('useCanvasObjects must be used within CanvasObjectsProvider');
  return ctx;
}
