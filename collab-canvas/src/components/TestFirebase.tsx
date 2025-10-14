import { useCallback, useEffect, useState } from 'react';
import { auth, db, googleProvider } from '../utils/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

export default function TestFirebase() {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<string>('Idle');

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  const handleLogin = useCallback(async () => {
    setStatus('Signing in...');
    await signInWithPopup(auth, googleProvider);
    setStatus('Signed in');
  }, []);

  const handleLogout = useCallback(async () => {
    setStatus('Signing out...');
    await signOut(auth);
    setStatus('Signed out');
  }, []);

  const testFirestore = useCallback(async () => {
    try {
      setStatus('Writing test doc...');
      const testRef = doc(db, 'canvasObjects', 'sanity');
      await setDoc(testRef, { ok: true, at: serverTimestamp() }, { merge: true });
      setStatus('Reading test doc...');
      const snap = await getDoc(testRef);
      setStatus(snap.exists() ? 'Firestore OK' : 'Firestore read failed');
    } catch (e: any) {
      setStatus('Error: ' + e?.message);
    }
  }, []);

  return (
    <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 8, marginTop: 16 }}>
      <strong>Firebase sanity check</strong>
      <div style={{ marginTop: 8 }}>Status: {status}</div>
      <div style={{ marginTop: 8 }}>
        {user ? (
          <>
            <span>Signed in as {user.displayName || user.email}</span>
            <button style={{ marginLeft: 8 }} onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <button onClick={handleLogin}>Login with Google</button>
        )}
        <button style={{ marginLeft: 8 }} onClick={testFirestore}>Test Firestore</button>
      </div>
    </div>
  );
}
