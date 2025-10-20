import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CanvasObjectsContext, newShape } from '../hooks/useCanvasObjects';
import type { CanvasObject, ShapeType } from '../hooks/useCanvasObjects';
import { useFirestoreSync } from '../hooks/useFirestoreSync';
import { useHistory } from '../hooks/useHistory';
import { usePresence } from '../hooks/usePresence';

type LocalCanvasObject = CanvasObject & {
  flashUntil?: number;
  flashColor?: string;
  lastEditorName?: string;
};

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
        const next = new Map<string, LocalCanvasObject>();
        for (const r of remote) {
          const suppressUntil = suppressRemoteRef.current.get(r.id) ?? 0;
          let item: LocalCanvasObject = r as LocalCanvasObject;
          const before = prev.find((p) => p.id === r.id) as LocalCanvasObject | undefined;
          if (suppressUntil > now) {
            const local = before;
            item = local ?? r;
          }
          const lastEditor = item.lastEditedBy as string | undefined;
          const lastEditedAtMs = item.lastEditedAtMs as number | undefined;
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
          // If visual fields are unchanged, reuse previous object reference to avoid full re-render flicker
          const visuallyEqual = !!before && (
            before.type === item.type &&
            before.x === item.x && before.y === item.y &&
            before.width === item.width && before.height === item.height &&
            (before.color ?? '') === (item.color ?? '') &&
            (before.opacity ?? 1) === (item.opacity ?? 1) &&
            (before.rotation ?? 0) === (item.rotation ?? 0) &&
            (before.text ?? '') === (item.text ?? '') &&
            (before.fontSize ?? 0) === (item.fontSize ?? 0) &&
            (before.fontFamily ?? '') === (item.fontFamily ?? '') &&
            (before.isBold ?? false) === (item.isBold ?? false) &&
            (before.order ?? 0) === (item.order ?? 0)
          );

          if (visuallyEqual && suppressUntil <= now) {
            // Reuse previous object reference for unchanged visuals
            next.set(r.id, before as LocalCanvasObject);
          } else {
            next.set(r.id, { ...(item as LocalCanvasObject), flashUntil, flashColor, lastEditorName });
          }
        }
        // Preserve only temporarily suppressed locals; allow real deletions to propagate
        for (const p of prev) {
          if (!next.has(p.id)) {
            const until = suppressRemoteRef.current.get(p.id) ?? 0;
            if (until > now) next.set(p.id, p as LocalCanvasObject);
          }
        }
        return Array.from(next.values()).sort((a, b) => {
          const ao = a.order ?? 0;
          const bo = b.order ?? 0;
          if (ao !== bo) return ao - bo;
          // Stable tiebreaker by id to avoid redraw flicker when order is equal
          return a.id.localeCompare(b.id);
        });
      });
      if (selectedId && !remote.find((o) => o.id === selectedId)) {
        setSelectedId(null);
      }
      setSelectedIds((prev) => prev.filter((id) => remote.some((o) => o.id === id)));
    });
  }, [subscribe, selectedId, others, self]);

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
    suppressRemoteFor([obj.id], 800);
    void writeObject(obj, { immediate: true });
  }, [writeObject, history]);

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
  }, [objects, writeObject, history, suppressRemoteFor]);

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
  }, [selectedId, selectedIds, deleteObject, history]);

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
  }, [objects, selectedId, selectedIds, writeObject, history]);

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
    // Touch the object so others immediately see the halo
    const obj = objects.find((o) => o.id === id);
    if (obj) {
      // Do NOT write on select; it causes lastEdited updates and makes all other clients flash.
      // Only suppress remote echoes if a write will follow (not here).
    }
  }, [objects, writeObject, suppressRemoteFor]);

  const selectMany = useCallback((ids: string[]) => {
    setSelectedIds(ids);
    setSelectedId(ids[0] ?? null);
  }, []);

  const value = useMemo(
    () => ({ objects, selectedId, selectedIds, addShape, updateShape, deleteSelected, copySelected, select, selectMany,
      bringToFront: () => {
        if (selectedIds.length === 0 && !selectedId) return;
        const ids = selectedIds.length ? selectedIds : (selectedId ? [selectedId] : []);
        const maxOrder = Math.max(0, ...objects.map((o) => o.order ?? 0));
        let bump = maxOrder + 1;
        for (const id of ids) {
          const obj = objects.find((o) => o.id === id);
          if (obj) {
            void writeObject({ ...obj, order: bump++ }, { immediate: true });
          }
        }
      },
      sendToBack: () => {
        if (selectedIds.length === 0 && !selectedId) return;
        const ids = selectedIds.length ? selectedIds : (selectedId ? [selectedId] : []);
        const minOrder = Math.min(0, ...objects.map((o) => o.order ?? 0));
        let down = minOrder - ids.length;
        for (const id of ids) {
          const obj = objects.find((o) => o.id === id);
          if (obj) {
            void writeObject({ ...obj, order: down++ }, { immediate: true });
          }
        }
      },
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
    [objects, selectedId, selectedIds, addShape, updateShape, deleteSelected, copySelected, select, selectMany, writeObject, history, suppressRemoteFor]
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


