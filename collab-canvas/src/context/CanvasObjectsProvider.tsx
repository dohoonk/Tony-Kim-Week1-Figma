import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CanvasObjectsContext, newShape } from '../hooks/useCanvasObjects';
import type { CanvasObject, ShapeType } from '../hooks/useCanvasObjects';
import { useFirestoreSync } from '../hooks/useFirestoreSync';

export default function CanvasObjectsProvider({ children }: { children: ReactNode }) {
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const addCountRef = useRef(0);

  const { subscribe, writeObject, deleteObject } = useFirestoreSync();

  // Dynamic debounce: idle=100ms, active drag=25–50ms via simple cadence heuristic handled in writeObject batching
  const pendingWrite = useRef<Record<string, number>>({});
  const scheduleWrite = useCallback((obj: CanvasObject) => {
    const key = obj.id;
    if (pendingWrite.current[key]) window.clearTimeout(pendingWrite.current[key]);
    const delay = 50; // UI-level debounce; writeObject may still batch at ~30ms during active drags
    pendingWrite.current[key] = window.setTimeout(() => {
      void writeObject(obj);
      delete pendingWrite.current[key];
    }, delay);
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


