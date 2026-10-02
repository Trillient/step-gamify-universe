import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, OAuthProvider, getAuth } from "firebase/auth";

// Client config comes from the build environment (VITE_FIREBASE_*). These
// identify the Firebase project and are not secrets, but they are kept out of
// git so each deployment supplies its own. See .env.example.
const env = import.meta.env;

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

const app = firebaseConfigured ? initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Sign in with Apple stays hidden until the Apple provider is set up in Firebase (see ios/APP_STORE.md).
export const appleSignInEnabled = import.meta.env.VITE_APPLE_SIGNIN === "1";
export const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("name");
