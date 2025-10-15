import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../utils/firebase';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useUser } from '../context/UserContext';

export type PresenceUser = {
  uid: string;
  name: string;
  color: string;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? 'A';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}

export function usePresence() {
  const { user } = useUser();
  const [active, setActive] = useState<PresenceUser[]>([]);
  const hbRef = useRef<number | null>(null);

  // Subscribe to presence list
  useEffect(() => {
    if (!user) return;
    const col = collection(db, 'presence');
    const unsub = onSnapshot(
      col,
      (snap) => {
        const now = Date.now();
        const freshnessMs = 3 * 60 * 1000; // 3 minutes
        const list: PresenceUser[] = [] as any;
        const ids: string[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          const updatedAt: any = data.updatedAt ?? data.expiresAt;
          const updatedAtMs = updatedAt?.toMillis ? updatedAt.toMillis() : 0;
          if (now - updatedAtMs > freshnessMs) return; // stale presence hidden
          ids.push(d.id);
          list.push({
            uid: d.id,
            name: data.name || 'Anon',
            color: data.color || '#5b8def',
          });
        });
        // eslint-disable-next-line no-console
        console.log('[Presence] snapshot size (fresh):', list.length, 'ids:', ids);
        setActive(list);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error('[Presence] onSnapshot error', err);
      }
    );
    return unsub;
  }, [user]);

  // Write own presence and heartbeat
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'presence', user.uid);
    const write = async () => {
      await setDoc(
        ref,
        {
          name: user.displayName ?? user.email?.split('@')[0] ?? user.uid.slice(0, 6),
          color: '#5b8def',
          updatedAt: serverTimestamp(),
          expiresAt: serverTimestamp(), // TTL index handles cleanup; we won't display it
        },
        { merge: true }
      );
      // eslint-disable-next-line no-console
      console.log('[Presence] wrote presence for', user.uid);
    };
    void write();
    hbRef.current = window.setInterval(write, 60_000); // 1-minute heartbeat
    return () => {
      if (hbRef.current != null) window.clearInterval(hbRef.current);
      void deleteDoc(ref).catch(() => {});
    };
  }, [user]);

  const others = useMemo(() => active.filter((p) => p.uid !== (user?.uid ?? '')), [active, user]);
  const self = useMemo(() => {
    if (!user) return null;
    const name = user.displayName ?? user.email?.split('@')[0] ?? user.uid.slice(0, 6);
    return { uid: user.uid, name, color: '#5b8def' } as PresenceUser;
  }, [user]);

  return { self, others, getInitials };
}


