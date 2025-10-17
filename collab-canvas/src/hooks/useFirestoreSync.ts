import { useCallback, useRef } from 'react';
import { db } from '../utils/firebase';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import type { CanvasObject } from './useCanvasObjects';
import { useUser } from '../context/UserContext';

export type FirestoreSync = {
  subscribe: (onChange: (objects: CanvasObject[]) => void) => () => void;
  writeObject: (obj: CanvasObject) => Promise<void>;
  deleteObject: (id: string) => Promise<void>;
};

export function useFirestoreSync(): FirestoreSync {
  const { user } = useUser();
  const pendingMapRef = useRef<Map<string, CanvasObject>>(new Map());
  const flushTimeoutRef = useRef<number | null>(null);
  const lastEnqueueAtRef = useRef<number>(0);

  const subscribe = useCallback((onChange: (objects: CanvasObject[]) => void) => {
    if (!user) {
      console.warn('[Firestore] subscribe skipped: not authenticated');
      return () => {};
    }
    const col = collection(db, 'canvasObjects');
    const q = query(col, orderBy('updatedAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: CanvasObject[] = [];
        snap.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          items.push({
            id: d.id,
            type: data.type as CanvasObject['type'],
            x: (data.x as number) ?? 0,
            y: (data.y as number) ?? 0,
            width: (data.width as number) ?? 0,
            height: (data.height as number) ?? 0,
            color: (data.color as string) ?? '#cccccc',
            rotation: (data.rotation as number) ?? 0,
          });
        });
        onChange(items);
      },
      (error) => {
        // Surface subscription issues (e.g., permission errors) in the console
        // so they are visible during manual testing.
        console.error('[Firestore] onSnapshot error for /canvasObjects:', error);
      }
    );
    return unsub;
  }, [user]);

  const writeObject = useCallback(async (obj: CanvasObject) => {
    const now = Date.now();
    const recentlyEnqueued = now - lastEnqueueAtRef.current < 60; // simple cadence heuristic
    if (recentlyEnqueued) {
      // Active drag/resize → queue + batch flush with small delay (~30ms)
      lastEnqueueAtRef.current = now;
      pendingMapRef.current.set(obj.id, obj);
      if (flushTimeoutRef.current == null) {
        flushTimeoutRef.current = window.setTimeout(async () => {
          const batch = writeBatch(db);
          const items = Array.from(pendingMapRef.current.values());
          pendingMapRef.current.clear();
          flushTimeoutRef.current = null;
          for (const it of items) {
            const ref = doc(db, 'canvasObjects', it.id);
            batch.set(ref, { ...it, updatedAt: serverTimestamp() });
          }
          try {
            await batch.commit();
          } catch (error) {
            console.error('[Firestore] writeBatch commit failed:', error);
          }
        }, 30);
      }
      return;
    }
    // Idle edit → write immediately (no batching, avoids >30ms extra delay)
    const ref = doc(db, 'canvasObjects', obj.id);
    try {
      await setDoc(ref, { ...obj, updatedAt: serverTimestamp() }, { merge: false });
      lastEnqueueAtRef.current = now;
    } catch (error) {
      console.error('[Firestore] setDoc failed for', ref.path, error);
      throw error;
    }
  }, []);

  const deleteObject = useCallback(async (id: string) => {
    const ref = doc(db, 'canvasObjects', id);
    try {
      await deleteDoc(ref);
    } catch (error) {
      console.error('[Firestore] deleteDoc failed for', ref.path, error);
      throw error;
    }
  }, []);

  return { subscribe, writeObject, deleteObject };
}
