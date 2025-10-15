import { useCallback } from 'react';
import { db } from '../utils/firebase';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import type { CanvasObject } from './useCanvasObjects';
import { useUser } from '../context/UserContext';

export type FirestoreSync = {
  subscribe: (onChange: (objects: CanvasObject[]) => void) => () => void;
  writeObject: (obj: CanvasObject) => Promise<void>;
  deleteObject: (id: string) => Promise<void>;
};

export function useFirestoreSync(): FirestoreSync {
  const { user } = useUser();

  const subscribe = useCallback((onChange: (objects: CanvasObject[]) => void) => {
    if (!user) {
      // eslint-disable-next-line no-console
      console.warn('[Firestore] subscribe skipped: not authenticated');
      return () => {};
    }
    const col = collection(db, 'canvasObjects');
    const q = query(col, orderBy('updatedAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: CanvasObject[] = [] as any;
        snap.forEach((d) => {
          const data = d.data() as any;
          items.push({
            id: d.id,
            type: data.type,
            x: data.x,
            y: data.y,
            width: data.width,
            height: data.height,
            color: data.color,
            rotation: data.rotation ?? 0,
          });
        });
        onChange(items);
      },
      (error) => {
        // Surface subscription issues (e.g., permission errors) in the console
        // so they are visible during manual testing.
        // eslint-disable-next-line no-console
        console.error('[Firestore] onSnapshot error for \/canvasObjects:', error);
      }
    );
    return unsub;
  }, [user]);

  const writeObject = useCallback(async (obj: CanvasObject) => {
    const ref = doc(db, 'canvasObjects', obj.id);
    try {
      await setDoc(ref, { ...obj, updatedAt: serverTimestamp() }, { merge: false });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Firestore] setDoc failed for', ref.path, error);
      throw error;
    }
  }, []);

  const deleteObject = useCallback(async (id: string) => {
    const ref = doc(db, 'canvasObjects', id);
    try {
      await deleteDoc(ref);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Firestore] deleteDoc failed for', ref.path, error);
      throw error;
    }
  }, []);

  return { subscribe, writeObject, deleteObject };
}
