import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize or reuse the singleton FirebaseApp configured from firebase-applet-config.json
export const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Explicitly pass the configured app instance and database ID if present
const databaseId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
export const db: Firestore = databaseId
  ? getFirestore(app, databaseId)
  : getFirestore(app);

// Auth instance associated with the same configured Firebase App instance
export const auth: Auth = getAuth(app);
