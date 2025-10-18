import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
// Persist auth across reloads
setPersistence(auth, browserLocalPersistence).catch(() => {
  // No-op: fall back to default persistence if setting fails
});

const db = getFirestore(app);
// Enable Firestore local persistence for offline reliability
enableIndexedDbPersistence(db).catch(() => {
  // Ignore: may fail in unsupported browsers or multi-tab; Firestore will still work online
});
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
