import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
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
      toast.error("Could not sign in with Google. Please try again.");
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    if (!auth) return;
    try {
      await signInWithPopup(auth, appleProvider);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      console.error("Apple sign-in failed", error);
      toast.error("Could not sign in with Apple. Please try again.");
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
