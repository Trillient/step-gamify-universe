import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  OAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { hasNativeAppleSignIn, nativeAppleSignIn } from "@/lib/native";
import { toast } from "sonner";
import { appleProvider, auth, firebaseConfigured, googleProvider } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  /** Drop the Firebase account too (best effort), then sign out. Call after the API delete. */
  forgetAccount: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

/** Plain-language reason, with the code so a screenshot tells us what went wrong. */
function signInMessage(code: string | undefined): string {
  switch (code) {
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow pop-ups for this site, then try again.";
    case "auth/network-request-failed":
      return "No connection to Google. Check your internet and try again.";
    case "auth/web-storage-unsupported":
    case "auth/operation-not-supported-in-this-environment":
      return "This browser can't do Google sign-in. Open the link in Safari or Chrome instead.";
    case "auth/user-disabled":
      return "That Google account has been disabled.";
    default:
      return `Could not sign in. Please try again in Safari or Chrome. (${code ?? "unknown error"})`;
  }
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) return;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      console.error("Google sign-in failed", error);
      toast.error(signInMessage(code), { duration: 10_000 });
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    if (!auth) return;
    try {
      if (hasNativeAppleSignIn()) {
        // iOS app: system Sign in with Apple sheet, then exchange the token with Firebase.
        const r = await nativeAppleSignIn();
        const { user } = await signInWithCredential(
          auth,
          new OAuthProvider("apple.com").credential({ idToken: r.idToken, rawNonce: r.rawNonce }),
        );
        const name = [r.givenName, r.familyName].filter(Boolean).join(" ");
        if (name && !user.displayName) {
          // Apple only shares the name on first sign-in; keep it and refresh the token so the server sees it.
          await updateProfile(user, { displayName: name });
          await user.getIdToken(true);
        }
      } else {
        await signInWithPopup(auth, appleProvider);
      }
    } catch (error) {
      const code = (error as { code?: string; message?: string }).code ?? (error as Error).message;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request" || code === "cancelled") return;
      console.error("Apple sign-in failed", error);
      toast.error(signInMessage(code), { duration: 10_000 });
    }
  }, []);

  const logout = useCallback(async () => {
    if (auth) await signOut(auth);
  }, []);

  const forgetAccount = useCallback(async () => {
    if (!auth) return;
    // Firebase may want a recent sign-in to delete the user; the app data is already gone either way.
    await auth.currentUser?.delete().catch(() => undefined);
    await signOut(auth).catch(() => undefined);
  }, []);

  const getToken = useCallback(async () => (auth?.currentUser ? auth.currentUser.getIdToken() : null), []);

  const value = useMemo(
    () => ({ user, loading, configured: firebaseConfigured, signInWithGoogle, signInWithApple, logout, forgetAccount, getToken }),
    [user, loading, signInWithGoogle, signInWithApple, logout, forgetAccount, getToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
