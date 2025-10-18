import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CanvasObjectsContext, newShape } from '../hooks/useCanvasObjects';
import type { CanvasObject, ShapeType } from '../hooks/useCanvasObjects';
import { useFirestoreSync } from '../hooks/useFirestoreSync';
import { useHistory } from '../hooks/useHistory';

export default function CanvasObjectsProvider({ children }: { children: ReactNode }) {
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const addCountRef = useRef(0);

  const { subscribe, writeObject, deleteObject, flushPending } = useFirestoreSync();
  const history = useHistory();

  // Delegate batching entirely to useFirestoreSync.writeObject

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

  const addShape = useCallback((type: ShapeType, initial?: Partial<CanvasObject>) => {
    const obj = { ...newShape(type, addCountRef.current++), ...(initial ?? {}) } as CanvasObject;
    setObjects((prev) => {
      history.push({
        apply: (list) => [...list, obj],
        revert: (list) => list.filter((o) => o.id !== obj.id),
      });
      return [...prev, obj];
    });
    setSelectedId(obj.id);
    // Persist immediately so a quick refresh does not drop the new object
    void writeObject(obj, { immediate: true });
  }, [writeObject]);

  const updateShape = useCallback((id: string, patch: Partial<CanvasObject>, opts?: { immediate?: boolean }) => {
    setObjects((prev) => {
      const before = prev.find((o) => o.id === id);
      if (before) {
        const after = { ...before, ...patch } as CanvasObject;
        history.push({
          apply: (list) => list.map((o) => (o.id === id ? after : o)),
          revert: (list) => list.map((o) => (o.id === id ? before : o)),
        });
      }
      return prev.map((o) => (o.id === id ? { ...o, ...patch } : o));
    });
    const next = objects.find((o) => o.id === id);
    if (next) void writeObject({ ...next, ...patch }, opts);
  }, [objects, writeObject]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const id = selectedId;
    setObjects((prev) => {
      const deleted = prev.find((o) => o.id === id);
      history.push({
        apply: (list) => list.filter((o) => o.id !== id),
        revert: (list) => (deleted ? [...list, deleted] : list),
      });
      return prev.filter((o) => o.id !== id);
    });
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
    setObjects((prev) => {
      history.push({
        apply: (list) => [...list, dup],
        revert: (list) => list.filter((o) => o.id !== dup.id),
      });
      return [...prev, dup];
    });
    setSelectedId(dup.id);
    // Persist immediately to avoid losing the duplicate on refresh
    void writeObject(dup, { immediate: true });
  }, [objects, selectedId, writeObject]);

  const select = useCallback((id: string | null) => setSelectedId(id), []);

  const value = useMemo(
    () => ({ objects, selectedId, addShape, updateShape, deleteSelected, copySelected, select,
      undo: () => history.undo(objects, setObjects),
      redo: () => history.redo(objects, setObjects),
    }),
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


