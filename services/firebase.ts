import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  query,
  where,
  addDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
  deleteDoc,
  writeBatch,
  orderBy,
  serverTimestamp,
  collectionGroup,
  or,
  and,
  getDoc
} from "firebase/firestore";

// Firebase config loaded from environment variables (set in GitHub Secrets)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Enable Auth Persistence (Local Storage)
// This ensures the user stays logged in across refreshes/closed tabs
import { setPersistence, browserLocalPersistence } from "firebase/auth";
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Auth persistence error:", error);
});

export const db = getFirestore(app);

// Enable Firestore Offline Persistence
// This caches data in IndexedDB so the app works offline or on bad networks
// and loads instantly on refresh.
import { enableIndexedDbPersistence } from "firebase/firestore";
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a a time.
    // ...
    console.warn("Firestore persistence failed: Multiple tabs open");
  } else if (err.code == 'unimplemented') {
    // The current browser does not support all of the
    // features required to enable persistence
    // ...
    console.warn("Firestore persistence not supported");
  }
});
export const googleProvider = new GoogleAuthProvider();

export const signIn = () => signInWithPopup(auth, googleProvider);
export const logOut = () => signOut(auth);

// Re-export Firebase functions for use in other files
export {
  onAuthStateChanged,
  collection,
  doc,
  onSnapshot,
  updateDoc,
  addDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  deleteDoc,
  setDoc,
  getDocs,
  writeBatch,
  orderBy,
  serverTimestamp,
  collectionGroup,
  or,
  and,
  getDoc
};
export type { User };

export interface ListData {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  collaborators: string[];
  items: any[];
  updatedAt: number;
}
