import { useCallback, useRef } from 'react';
import { db } from '../utils/firebase';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import type { CanvasObject } from './useCanvasObjects';
import { useUser } from '../context/UserContext';

export type FirestoreSync = {
  subscribe: (onChange: (objects: CanvasObject[]) => void) => () => void;
  writeObject: (obj: CanvasObject, opts?: { immediate?: boolean }) => Promise<void>;
  deleteObject: (id: string) => Promise<void>;
  flushPending: () => Promise<void>;
};

export function useFirestoreSync(): FirestoreSync {
  const { user } = useUser();
  const pendingMapRef = useRef<Map<string, CanvasObject>>(new Map());
  const flushTimeoutRef = useRef<number | null>(null);
  const lastEnqueueAtRef = useRef<number>(0);
  const offlineQueueRef = useRef<Array<{ obj: CanvasObject; enqueuedAt: number }>>([]);
  const flushTickerRef = useRef<number | null>(null);

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
            opacity: (data.opacity as number) ?? 1,
            rotation: (data.rotation as number) ?? 0,
            updatedAtMs: (data.updatedAt as { toMillis?: () => number } | undefined)?.toMillis?.(),
            lastEditedBy: (data.lastEditedBy as string) ?? undefined,
            lastEditedAtMs: (data.lastEditedAt as { toMillis?: () => number } | undefined)?.toMillis?.(),
            text: (data.text as string) ?? undefined,
            fontSize: (data.fontSize as number) ?? undefined,
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

  const writeObject = useCallback(async (obj: CanvasObject, opts?: { immediate?: boolean }) => {
    // Strip undefined and client-only fields before writing
    const buildPayload = (o: CanvasObject) => {
      const { /* updatedAtMs, lastEditedAtMs, */ ...rest } = o as Record<string, unknown>;
      const base: Record<string, unknown> = { ...rest };
      // Remove undefined keys (Firestore rejects undefined values)
      for (const k of Object.keys(base)) {
        if (base[k] === undefined) delete base[k];
      }
      base.updatedAt = serverTimestamp();
      base.lastEditedBy = user?.uid;
      base.lastEditedAt = serverTimestamp();
      return base;
    };
    const now = Date.now();
    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
    const enqueueOffline = () => {
      // Cap queue to 1 minute from enqueue time
      offlineQueueRef.current = offlineQueueRef.current.filter((item) => now - item.enqueuedAt < 60_000);
      offlineQueueRef.current.push({ obj, enqueuedAt: now });
    };
    if (opts?.immediate) {
      const ref = doc(db, 'canvasObjects', obj.id);
      try {
        if (!isOnline) {
          enqueueOffline();
          return;
        }
        await setDoc(ref, buildPayload(obj), { merge: false });
        lastEnqueueAtRef.current = now;
      } catch {
        // Network/offline or transient: queue for later (max 1 minute)
        enqueueOffline();
      }
      return;
    }
    const recentlyEnqueued = now - lastEnqueueAtRef.current < 40; // slightly tighter cadence to reduce queue window
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
            batch.set(ref, buildPayload(it));
          }
          try {
            await batch.commit();
          } catch (error) {
            console.error('[Firestore] writeBatch commit failed:', error);
          }
        }, 100);
      }
      return;
    }
    // Idle edit → write immediately (no batching, avoids >30ms extra delay)
    const ref = doc(db, 'canvasObjects', obj.id);
    try {
      if (!isOnline) {
        enqueueOffline();
        return;
      }
      await setDoc(ref, buildPayload(obj), { merge: false });
      lastEnqueueAtRef.current = now;
    } catch {
      // Queue for later instead of throwing to keep UI responsive
      offlineQueueRef.current.push({ obj, enqueuedAt: now });
    }
  }, [user]);

  const deleteObject = useCallback(async (id: string) => {
    const ref = doc(db, 'canvasObjects', id);
    try {
      await deleteDoc(ref);
    } catch (error) {
      console.error('[Firestore] deleteDoc failed for', ref.path, error);
      throw error;
    }
  }, []);

  const flushPending = useCallback(async () => {
    // First flush offline queue if we're online
    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
    if (isOnline && offlineQueueRef.current.length > 0) {
      const now = Date.now();
      const batch = writeBatch(db);
      const items = offlineQueueRef.current.filter((item) => now - item.enqueuedAt < 60_000);
      offlineQueueRef.current = [];
      for (const { obj } of items) {
        const ref = doc(db, 'canvasObjects', obj.id);
          const payload = {
          ...( (() => {
            const { /* updatedAtMs, lastEditedAtMs, */ ...rest } = obj as Record<string, unknown>;
            const base: Record<string, unknown> = { ...rest };
            for (const k of Object.keys(base)) if (base[k] === undefined) delete base[k];
            return base;
          })() ),
          updatedAt: serverTimestamp(),
          lastEditedBy: user?.uid,
          lastEditedAt: serverTimestamp(),
        };
        batch.set(ref, payload);
      }
      try {
        await batch.commit();
      } catch {
        // On failure, requeue with current time (give them another minute)
        const requeueAt = Date.now();
        for (const { obj } of offlineQueueRef.current) {
          offlineQueueRef.current.push({ obj, enqueuedAt: requeueAt });
        }
      }
    }
    if (pendingMapRef.current.size === 0) return;
    if (flushTimeoutRef.current != null) {
      window.clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
    const batch = writeBatch(db);
    const items = Array.from(pendingMapRef.current.values());
    pendingMapRef.current.clear();
    // Reuse same sanitizer as writeObject
    const buildPayload = (o: CanvasObject) => {
      const { /* updatedAtMs, lastEditedAtMs, */ ...rest } = o as Record<string, unknown>;
      const base: Record<string, unknown> = { ...rest };
      for (const k of Object.keys(base)) {
        if (base[k] === undefined) delete base[k];
      }
      base.updatedAt = serverTimestamp();
      base.lastEditedBy = user?.uid;
      base.lastEditedAt = serverTimestamp();
      return base;
    };
    for (const it of items) {
      const ref = doc(db, 'canvasObjects', it.id);
      batch.set(ref, buildPayload(it));
    }
    try {
      await batch.commit();
    } catch (error) {
      console.error('[Firestore] flushPending commit failed:', error);
    }
  }, [user]);

  // Background ticker to attempt flushes periodically when online
  if (flushTickerRef.current == null && typeof window !== 'undefined') {
    flushTickerRef.current = window.setInterval(() => {
      const online = typeof navigator === 'undefined' ? true : navigator.onLine;
      if (online) void flushPending();
    }, 2000);
    window.addEventListener('online', () => { void flushPending(); });
  }

  return { subscribe, writeObject, deleteObject, flushPending };
}
