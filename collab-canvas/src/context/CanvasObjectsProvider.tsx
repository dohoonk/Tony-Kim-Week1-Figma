import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CanvasObjectsContext, newShape } from '../hooks/useCanvasObjects';
import type { CanvasObject, ShapeType } from '../hooks/useCanvasObjects';
import { useFirestoreSync } from '../hooks/useFirestoreSync';

export default function CanvasObjectsProvider({ children }: { children: ReactNode }) {
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const addCountRef = useRef(0);

  const { subscribe, writeObject, deleteObject, flushPending } = useFirestoreSync();

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

  // ID index to prevent ghost/duplicate merges
  const idIndexRef = useRef<Set<string>>(new Set());

  // Realtime subscription with merge that preserves local selection and prevents duplicates
  useEffect(() => {
    return subscribe((remote) => {
      idIndexRef.current.clear();
      for (const o of remote) idIndexRef.current.add(o.id);
      setObjects((prev) => {
        const next = new Map<string, typeof prev[number]>();
        for (const r of remote) next.set(r.id, r);
        // If any local IDs not present remotely (e.g., optimistic), keep them
        for (const p of prev) if (!next.has(p.id)) next.set(p.id, p);
        return Array.from(next.values());
      });
      if (selectedId && !remote.find((o) => o.id === selectedId)) {
        setSelectedId(null);
      }
    });
  }, [subscribe, selectedId]);

  const addShape = useCallback((type: ShapeType) => {
    const obj = newShape(type, addCountRef.current++);
    setObjects((prev) => [...prev, obj]);
    setSelectedId(obj.id);
    // Persist immediately so a quick refresh does not drop the new object
    void writeObject(obj, { immediate: true });
  }, [writeObject]);

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
    // Persist immediately to avoid losing the duplicate on refresh
    void writeObject(dup, { immediate: true });
  }, [objects, selectedId, writeObject]);

  const select = useCallback((id: string | null) => setSelectedId(id), []);

  const value = useMemo(
    () => ({ objects, selectedId, addShape, updateShape, deleteSelected, copySelected, select }),
    [objects, selectedId, addShape, updateShape, deleteSelected, copySelected, select]
  );

  // Flush any pending batched writes when the tab goes hidden or unloads
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) void flushPending();
    };
    const onPageHide = () => { void flushPending(); };
    window.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);
    return () => {
      window.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
    };
  }, [flushPending]);

  return <CanvasObjectsContext.Provider value={value}>{children}</CanvasObjectsContext.Provider>;
}


