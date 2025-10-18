import { useEffect, useMemo, useState, useCallback } from 'react';
import { db } from '../utils/firebase';
import { collection, onSnapshot, serverTimestamp, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { useUser } from '../context/UserContext';
import type { CanvasObject } from './useCanvasObjects';
import { useCanvasObjects } from './useCanvasObjects';

export type ComponentItem = {
  id: string;
  name: string;
  objects: CanvasObject[];
  createdAtMs?: number;
};

function sanitize(obj: CanvasObject): CanvasObject {
  const { updatedAtMs, lastEditedAtMs, lastEditedBy, ...rest } = obj as any;
  const clean: Record<string, unknown> = { ...rest };
  for (const k of Object.keys(clean)) {
    if ((clean as any)[k] === undefined) delete (clean as any)[k];
  }
  return clean as CanvasObject;
}

export function useComponents() {
  const { user } = useUser();
  const { objects, selectedId, selectedIds, addShape, selectMany } = useCanvasObjects();
  const [items, setItems] = useState<ComponentItem[]>([]);

  useEffect(() => {
    if (!user) return;
    const col = collection(db, 'components', user.uid, 'items');
    const unsub = onSnapshot(col, (snap) => {
      const next: ComponentItem[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        next.push({
          id: d.id,
          name: data.name ?? 'Untitled',
          objects: Array.isArray(data.objects) ? (data.objects as any[]) : [],
          createdAtMs: data.createdAt?.toMillis?.(),
        });
      });
      setItems(next);
    });
    return unsub;
  }, [user]);

  const saveSelected = useCallback(async (name: string) => {
    if (!user) return;
    const ids = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
    if (ids.length === 0) return;
    const picked = objects.filter((o) => ids.includes(o.id));
    if (picked.length === 0) return;
    const col = collection(db, 'components', user.uid, 'items');
    const payload = {
      name,
      objects: picked.map((o) => sanitize(o)),
      createdAt: serverTimestamp(),
    } as any;
    await addDoc(col, payload);
  }, [user, selectedId, selectedIds, objects]);

  const insert = useCallback(async (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || item.objects.length === 0) return;
    const objs = item.objects as unknown as CanvasObject[];
    const minX = Math.min(...objs.map((o) => o.x));
    const minY = Math.min(...objs.map((o) => o.y));
    const newIds: string[] = [];
    for (const base of objs) {
      const newId = crypto.randomUUID();
      newIds.push(newId);
      const initial: Partial<CanvasObject> = {
        id: newId,
        x: (base.x ?? 0) - minX + 20,
        y: (base.y ?? 0) - minY + 20,
        width: base.width,
        height: base.height,
        color: base.color,
        rotation: base.rotation,
        text: base.text,
        fontSize: base.fontSize,
        textKind: base.textKind,
      };
      addShape(base.type as any, initial);
    }
    if (newIds.length > 0) selectMany(newIds);
  }, [items, addShape, selectMany]);

  const remove = useCallback(async (itemId: string) => {
    if (!user) return;
    const ref = doc(db, 'components', user.uid, 'items', itemId);
    await deleteDoc(ref);
  }, [user]);

  return useMemo(() => ({ items, saveSelected, insert, remove }), [items, saveSelected, insert, remove]);
}


