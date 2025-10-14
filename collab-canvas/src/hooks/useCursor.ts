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
    const unsub = onSnapshot(
      col,
      (snap) => {
        const items: RemoteCursor[] = [] as any;
        snap.forEach((d) => {
          const data = d.data() as any;
          if (!data) return;
          items.push({
            uid: d.id,
            x: data.x ?? 0,
            y: data.y ?? 0,
            name: data.name ?? '',
            color: data.color ?? '#5b8def',
          });
        });
        // eslint-disable-next-line no-console
        console.debug('[Cursors] snapshot size:', items.length);
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
      console.debug('[Cursors] wrote', { x, y });
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

  // Include local fallback of self cursor if not yet present from Firestore
  const withSelf = useMemo(() => {
    if (!user || !selfPos) return cursors;
    const hasSelf = cursors.some((c) => c.uid === user.uid);
    if (hasSelf) return cursors;
    return [
      ...cursors,
      { uid: user.uid, x: selfPos.x, y: selfPos.y, name: user.displayName ?? 'You', color: '#5b8def' },
    ];
  }, [cursors, selfPos, user]);

  return { cursors: withSelf, updateCursor };
}


