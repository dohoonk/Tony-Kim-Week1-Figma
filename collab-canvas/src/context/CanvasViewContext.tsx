import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

export type CanvasViewState = {
  stageWidth: number;
  stageHeight: number;
  scale: number;
  positionX: number;
  positionY: number;
  getStage?: () => any | null;
};

const CanvasViewContext = createContext<CanvasViewState | null>(null);

export function CanvasViewProvider({ value, children }: { value: CanvasViewState; children: ReactNode }) {
  return <CanvasViewContext.Provider value={value}>{children}</CanvasViewContext.Provider>;
}

export function useCanvasView(): CanvasViewState {
  const ctx = useContext(CanvasViewContext);
  if (!ctx) throw new Error('useCanvasView must be used within CanvasViewProvider');
  return ctx;
}


