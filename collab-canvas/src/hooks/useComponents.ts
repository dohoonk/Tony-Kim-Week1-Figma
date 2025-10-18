import { useEffect, useMemo, useState, useCallback } from 'react';
import { db } from '../utils/firebase';
import { collection, doc, onSnapshot, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
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
  const { objects, selectedId, addShape } = useCanvasObjects();
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
    if (!user || !selectedId) return;
    const obj = objects.find((o) => o.id === selectedId);
    if (!obj) return;
    const col = collection(db, 'components', user.uid, 'items');
    const payload = {
      name,
      objects: [sanitize(obj)],
      createdAt: serverTimestamp(),
    } as any;
    await addDoc(col, payload);
  }, [user, selectedId, objects]);

  const insert = useCallback(async (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || item.objects.length === 0) return;
    // For now, insert the first object only; offset slightly.
    // Important: do NOT pass the saved id back in, let addShape generate a new one.
    const base = item.objects[0] as any;
    const initial = {
      x: (base.x ?? 0) + 20,
      y: (base.y ?? 0) + 20,
      width: base.width,
      height: base.height,
      color: base.color,
      rotation: base.rotation,
      text: base.text,
      fontSize: base.fontSize,
      textKind: base.textKind,
    } as Partial<CanvasObject>;
    addShape(base.type as any, initial);
  }, [items, addShape]);

  return useMemo(() => ({ items, saveSelected, insert }), [items, saveSelected, insert]);
}


