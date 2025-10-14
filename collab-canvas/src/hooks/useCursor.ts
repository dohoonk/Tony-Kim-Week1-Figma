import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../utils/firebase';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useUser } from '../context/UserContext';

export type RemoteCursor = {
  uid: string;
  x: number;
  y: number;
  name?: string;
  color?: string;
};

export function useCursor(throttleMs: number = 100) {
  const { user } = useUser();
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  const [selfPos, setSelfPos] = useState<{ x: number; y: number } | null>(null);

  const lastSentAtRef = useRef<number>(0);
  const pendingTimeoutRef = useRef<number | null>(null);
  const latestPosRef = useRef<{ x: number; y: number } | null>(null);

  // Subscribe to all cursors
  useEffect(() => {
    const col = collection(db, 'cursors');
    // eslint-disable-next-line no-console
    console.log('[Cursors] subscribing to /cursors');
    const unsub = onSnapshot(
      col,
      (snap) => {
        const items: RemoteCursor[] = [] as any;
        const ids: string[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          if (!data) return;
          ids.push(d.id);
          items.push({
            uid: d.id,
            x: data.x ?? 0,
            y: data.y ?? 0,
            name: data.name ?? '',
            color: data.color ?? '#5b8def',
          });
        });
        // eslint-disable-next-line no-console
        console.log('[Cursors] snapshot size:', items.length, 'ids:', ids);
        setCursors(items);
      },
      (error) => {
        // eslint-disable-next-line no-console
        console.error('[Firestore] onSnapshot error for \/cursors:', error);
      }
    );
    return unsub;
  }, []);

  const writeCursor = useCallback(async (x: number, y: number) => {
    if (!user) return;
    const ref = doc(db, 'cursors', user.uid);
    try {
      await setDoc(
        ref,
        {
          x,
          y,
          name: user.displayName ?? 'Anon',
          color: '#5b8def',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      // eslint-disable-next-line no-console
      console.log('[Cursors] wrote', { x, y });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Firestore] setDoc failed for', ref.path, error);
    }
  }, [user]);

  // Throttled update function
  const updateCursor = useCallback(
    (x: number, y: number) => {
      if (!user) return;
      latestPosRef.current = { x, y };
      setSelfPos({ x, y });
      const now = Date.now();
      const elapsed = now - lastSentAtRef.current;
      if (elapsed >= throttleMs) {
        lastSentAtRef.current = now;
        void writeCursor(x, y);
        return;
      }
      if (pendingTimeoutRef.current != null) return;
      const delay = throttleMs - elapsed;
      pendingTimeoutRef.current = window.setTimeout(() => {
        pendingTimeoutRef.current = null;
        lastSentAtRef.current = Date.now();
        const latest = latestPosRef.current;
        if (latest) void writeCursor(latest.x, latest.y);
      }, delay);
    },
    [throttleMs, user, writeCursor]
  );

  // Cleanup own cursor doc on unmount or when user changes away
  useEffect(() => {
    return () => {
      if (!user) return;
      const ref = doc(db, 'cursors', user.uid);
      void deleteDoc(ref).catch(() => {});
    };
  }, [user]);

  // Always ensure self cursor is present and uses freshest local position
  const withSelf = useMemo(() => {
    if (!user) return cursors;
    const map = new Map<string, RemoteCursor>();
    for (const c of cursors) map.set(c.uid, c);
    if (selfPos) {
      map.set(user.uid, {
        uid: user.uid,
        x: selfPos.x,
        y: selfPos.y,
        name: user.displayName ?? 'You',
        color: '#5b8def',
      });
    }
    return Array.from(map.values());
  }, [cursors, selfPos, user]);

  return { cursors: withSelf, updateCursor };
}


