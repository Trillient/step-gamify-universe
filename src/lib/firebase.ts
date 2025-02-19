
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBb4rm_OFBvwXy5UB85dBOOL5SR5PYU8j4",
  authDomain: "testt-9c1b7.firebaseapp.com",
  projectId: "testt-9c1b7",
  storageBucket: "testt-9c1b7.firebasestorage.app",
  messagingSenderId: "450261223656",
  appId: "1:450261223656:web:d45b3b072884dbd926a15d",
  measurementId: "G-7L1451B3KD"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export const googleProvider = new GoogleAuthProvider();
