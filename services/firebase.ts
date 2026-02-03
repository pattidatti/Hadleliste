
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Note: In a real production environment, these would be in environment variables.
// These are placeholders - the user will need to provide their own config or 
// the environment will inject them.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSy...",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "your-app.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "your-app",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "your-app.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "12345",
  appId: process.env.FIREBASE_APP_ID || "1:12345:web:6789"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const signIn = () => signInWithPopup(auth, googleProvider);
export const logOut = () => signOut(auth);

export interface ListData {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  collaborators: string[]; // Array of emails
  items: any[];
  updatedAt: number;
}
