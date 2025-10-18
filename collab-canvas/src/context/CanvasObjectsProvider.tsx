import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CanvasObjectsContext, newShape } from '../hooks/useCanvasObjects';
import type { CanvasObject, ShapeType } from '../hooks/useCanvasObjects';
import { useFirestoreSync } from '../hooks/useFirestoreSync';
import { useHistory } from '../hooks/useHistory';
import { usePresence } from '../hooks/usePresence';

export default function CanvasObjectsProvider({ children }: { children: ReactNode }) {
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const addCountRef = useRef(0);
  const dragOriginRef = useRef<{ [id: string]: { x: number; y: number } } | null>(null);
  // Suppress brief remote echoes after optimistic local commits to avoid flicker/ghosting
  const suppressRemoteRef = useRef<Map<string, number>>(new Map());
  const suppressRemoteFor = useCallback((ids: string[], ms = 300) => {
    const until = Date.now() + ms;
    const map = suppressRemoteRef.current;
    for (const id of ids) map.set(id, until);
  }, []);

  const { subscribe, writeObject, deleteObject, flushPending } = useFirestoreSync();
  const history = useHistory();
  const { self, others } = usePresence();

  // Delegate batching entirely to useFirestoreSync.writeObject

  // ID index to prevent ghost/duplicate merges
  const idIndexRef = useRef<Set<string>>(new Set());

  // Realtime subscription with merge that preserves local selection and prevents duplicates
  useEffect(() => {
    return subscribe((remote) => {
      idIndexRef.current.clear();
      for (const o of remote) idIndexRef.current.add(o.id);
      setObjects((prev) => {
        const now = Date.now();
        const next = new Map<string, typeof prev[number]>();
        for (const r of remote) {
          const suppressUntil = suppressRemoteRef.current.get(r.id) ?? 0;
          let item: any = r;
          if (suppressUntil > now) {
            const local = prev.find((p) => p.id === r.id);
            item = local ?? r;
          }
          const before = prev.find((p) => p.id === r.id) as any;
          const lastEditor = (item as any).lastEditedBy as string | undefined;
          const lastEditedAtMs = (item as any).lastEditedAtMs as number | undefined;
          let flashUntil: number | undefined = before?.flashUntil;
          let flashColor: string | undefined = before?.flashColor;
          let lastEditorName: string | undefined = before?.lastEditorName;
          if (lastEditor) {
            const p = (others || []).find((o) => o.uid === lastEditor) || (self && self.uid === lastEditor ? self : undefined);
            if (p) {
              flashColor = p.color;
              lastEditorName = p.name;
            }
          }
          if (before && lastEditedAtMs && before.lastEditedAtMs !== lastEditedAtMs) {
            if (lastEditor && lastEditor !== self?.uid) {
              flashUntil = now + 1500;
            }
          }
          next.set(r.id, { ...(item as any), flashUntil, flashColor, lastEditorName } as any);
        }
        // If any local IDs not present remotely (e.g., optimistic), keep them
        for (const p of prev) if (!next.has(p.id)) next.set(p.id, p);
        return Array.from(next.values());
      });
      if (selectedId && !remote.find((o) => o.id === selectedId)) {
        setSelectedId(null);
      }
      setSelectedIds((prev) => prev.filter((id) => remote.some((o) => o.id === id)));
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
    setSelectedIds([obj.id]);
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
    if (next) {
      suppressRemoteFor([id]);
      void writeObject({ ...next, ...patch }, opts);
    }
  }, [objects, writeObject]);

  const deleteSelected = useCallback(() => {
    const ids = selectedIds.length > 0 ? [...selectedIds] : (selectedId ? [selectedId] : []);
    if (ids.length === 0) return;
    setObjects((prev) => {
      const deletedMap = new Map(prev.filter((o) => ids.includes(o.id)).map((o) => [o.id, o] as const));
      history.push({
        apply: (list) => list.filter((o) => !ids.includes(o.id)),
        revert: (list) => {
          const restored: CanvasObject[] = [];
          for (const o of list) restored.push(o);
          for (const id of ids) {
            const d = deletedMap.get(id);
            if (d && !restored.find((x) => x.id === id)) restored.push(d);
          }
          return restored;
        },
      });
      return prev.filter((o) => !ids.includes(o.id));
    });
    setSelectedId(null);
    setSelectedIds([]);
    for (const id of ids) void deleteObject(id);
  }, [selectedId, selectedIds, deleteObject]);

  const copySelected = useCallback(() => {
    const ids = selectedIds.length > 0 ? [...selectedIds] : (selectedId ? [selectedId] : []);
    if (ids.length === 0) return;
    const sources = objects.filter((o) => ids.includes(o.id));
    if (sources.length === 0) return;
    const dups: CanvasObject[] = sources.map((s) => ({
      ...s,
      id: crypto.randomUUID(),
      x: s.x + 24,
      y: s.y + 24,
      rotation: s.rotation,
    }));
    setObjects((prev) => {
      history.push({
        apply: (list) => [...list, ...dups],
        revert: (list) => list.filter((o) => !dups.some((d) => d.id === o.id)),
      });
      return [...prev, ...dups];
    });
    setSelectedId(dups[0].id);
    setSelectedIds(dups.map((d) => d.id));
    for (const dup of dups) void writeObject(dup, { immediate: true });
  }, [objects, selectedId, selectedIds, writeObject]);

  const select = useCallback((id: string | null, additive?: boolean) => {
    if (id == null) {
      setSelectedId(null);
      setSelectedIds([]);
      return;
    }
    setSelectedId(id);
    setSelectedIds((prev) => {
      if (!additive) return [id];
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    });
  }, []);

  const selectMany = useCallback((ids: string[]) => {
    setSelectedIds(ids);
    setSelectedId(ids[0] ?? null);
  }, []);

  const value = useMemo(
    () => ({ objects, selectedId, selectedIds, addShape, updateShape, deleteSelected, copySelected, select, selectMany,
      beginGroupDrag: (anchorId: string) => {
        if (!selectedIds.includes(anchorId) || selectedIds.length <= 1) {
          dragOriginRef.current = null;
          return;
        }
        const origins: { [id: string]: { x: number; y: number } } = {};
        for (const id of selectedIds) {
          const o = objects.find((x) => x.id === id);
          if (o) origins[id] = { x: o.x, y: o.y };
        }
        dragOriginRef.current = origins;
      },
      updateGroupDrag: (_anchorId: string, dx: number, dy: number) => {
        const origins = dragOriginRef.current;
        if (!origins) return;
        setObjects((prev) => prev.map((o) => (origins[o.id] ? { ...o, x: origins[o.id].x + dx, y: origins[o.id].y + dy } : o)));
      },
      commitGroupDrag: (_anchorId: string, dx: number, dy: number) => {
        const origins = dragOriginRef.current;
        if (!origins) return;
        const changed: CanvasObject[] = [];
        setObjects((prev) => prev.map((o) => {
          if (!origins[o.id]) return o;
          const next = { ...o, x: origins[o.id].x + dx, y: origins[o.id].y + dy };
          changed.push(next);
          return next;
        }));
        // Single history entry for the group
        history.push({
          apply: (list) => list.map((o) => (origins[o.id] ? { ...o, x: origins[o.id].x + dx, y: origins[o.id].y + dy } : o)),
          revert: (list) => list.map((o) => (origins[o.id] ? { ...o, x: origins[o.id].x, y: origins[o.id].y } : o)),
        });
        suppressRemoteFor(changed.map((c) => c.id));
        for (const obj of changed) {
          void writeObject(obj, { immediate: true });
        }
        dragOriginRef.current = null;
      },
      undo: () => history.undo(objects, setObjects),
      redo: () => history.redo(objects, setObjects),
    }),
    [objects, selectedId, selectedIds, addShape, updateShape, deleteSelected, copySelected, select]
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


