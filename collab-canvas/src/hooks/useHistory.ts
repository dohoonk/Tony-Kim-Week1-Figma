import { useRef } from 'react';
import type { CanvasObject } from './useCanvasObjects';

export type HistoryEntry = {
  apply: (objects: CanvasObject[]) => CanvasObject[];
  revert: (objects: CanvasObject[]) => CanvasObject[];
};

export function useHistory() {
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);

  function push(entry: HistoryEntry) {
    undoStack.current.push(entry);
    redoStack.current = [];
  }

  function undo(objects: CanvasObject[], setObjects: (next: CanvasObject[]) => void) {
    const entry = undoStack.current.pop();
    if (!entry) return;
    const next = entry.revert(objects);
    redoStack.current.push(entry);
    setObjects(next);
  }

  function redo(objects: CanvasObject[], setObjects: (next: CanvasObject[]) => void) {
    const entry = redoStack.current.pop();
    if (!entry) return;
    const next = entry.apply(objects);
    undoStack.current.push(entry);
    setObjects(next);
  }

  return { push, undo, redo };
}


