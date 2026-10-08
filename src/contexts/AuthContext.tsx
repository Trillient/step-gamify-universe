import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  EmailAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  revokeAccessToken,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { hasNativeAppleSignIn, nativeAppleSignIn } from "@/lib/native";
import { toast } from "sonner";
import { appleProvider, auth, firebaseConfigured, googleProvider } from "@/lib/firebase";
import { MANUAL_PASSWORD_MIN_LENGTH, normalizeUsername, usernameEmail, usernameError } from "@/lib/manualAuth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithPassword: (username: string, password: string) => Promise<void>;
  createManualAccount: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-authenticate a password account before deleting any server data. */
  reauthenticateForDeletion: (password?: string) => Promise<void>;
  /** Drop the Firebase account too, then sign out. Call after the API delete. */
  forgetAccount: () => Promise<void>;
  /**
   * Apple requires revoking Sign in with Apple when an account is deleted. Re-confirms with Apple
   * and revokes; resolves without doing anything for Google users. Throws if revocation fails.
   */
  revokeAppleIfNeeded: () => Promise<void>;
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

function manualAuthMessage(code: string | undefined): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "That username is already taken. Try signing in instead.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "That username or password is wrong.";
    case "auth/weak-password":
      return `Use at least ${MANUAL_PASSWORD_MIN_LENGTH} characters for your password.`;
    case "auth/operation-not-allowed":
      return "Username sign-in is not enabled yet. Try again shortly.";
    case "auth/network-request-failed":
      return "No connection to the sign-in service. Check your internet and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment, then try again.";
    default:
      return `Could not sign in. Please try again (${code ?? "unknown error"})`;
  }
}

function validateManualCredentials(username: string, password: string): string | null {
  return (
    usernameError(username) ??
    (password.length < MANUAL_PASSWORD_MIN_LENGTH
      ? `Use at least ${MANUAL_PASSWORD_MIN_LENGTH} characters for your password.`
      : null)
  );
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

  const signInWithPassword = useCallback(async (username: string, password: string) => {
    if (!auth) return;
    const validationError = validateManualCredentials(username, password);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      const { user: signedInUser } = await signInWithEmailAndPassword(
        auth,
        usernameEmail(username),
        password,
      );
      if (!signedInUser.displayName) {
        await updateProfile(signedInUser, { displayName: normalizeUsername(username) });
        await signedInUser.getIdToken(true);
      }
    } catch (error) {
      const code = (error as { code?: string }).code;
      console.error("Username sign-in failed", error);
      toast.error(manualAuthMessage(code), { duration: 10_000 });
    }
  }, []);

  const createManualAccount = useCallback(async (username: string, password: string) => {
    if (!auth) return;
    const validationError = validateManualCredentials(username, password);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      const { user: createdUser } = await createUserWithEmailAndPassword(auth, usernameEmail(username), password);
      await updateProfile(createdUser, { displayName: normalizeUsername(username) });
      await createdUser.getIdToken(true);
    } catch (error) {
      const code = (error as { code?: string }).code;
      console.error("Username account creation failed", error);
      toast.error(manualAuthMessage(code), { duration: 10_000 });
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
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request" || code === "cancelled")
        return;
      console.error("Apple sign-in failed", error);
      toast.error(signInMessage(code), { duration: 10_000 });
    }
  }, []);

  const logout = useCallback(async () => {
    if (auth) await signOut(auth);
  }, []);

  const reauthenticateForDeletion = useCallback(async (password?: string) => {
    const currentUser = auth?.currentUser;
    if (!currentUser) return;
    if (!currentUser.providerData.some((provider) => provider.providerId === "password")) return;
    if (!currentUser.email || !password) throw new Error("password-required");
    await reauthenticateWithCredential(currentUser, EmailAuthProvider.credential(currentUser.email, password));
  }, []);

  const forgetAccount = useCallback(async () => {
    if (!auth) return;
    await auth.currentUser?.delete();
    await signOut(auth);
  }, []);

  const revokeAppleIfNeeded = useCallback(async () => {
    const user = auth?.currentUser;
    if (!auth || !user || !user.providerData.some((p) => p.providerId === "apple.com")) return;
    if (hasNativeAppleSignIn()) {
      // iOS app: fresh Apple authorization, then revoke with its authorization code the way
      // Firebase's iOS SDK does (identitytoolkit accounts:revokeToken, tokenType CODE).
      const r = await nativeAppleSignIn();
      await reauthenticateWithCredential(
        user,
        new OAuthProvider("apple.com").credential({ idToken: r.idToken, rawNonce: r.rawNonce }),
      );
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v2/accounts:revokeToken?key=${encodeURIComponent(auth.app.options.apiKey ?? "")}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerId: "apple.com",
            tokenType: "CODE",
            token: r.authorizationCode,
            idToken: await user.getIdToken(true),
          }),
        },
      );
      if (!res.ok) throw new Error(`apple-revoke-${res.status}`);
    } else {
      const result = await reauthenticateWithPopup(user, appleProvider);
      const accessToken = OAuthProvider.credentialFromResult(result)?.accessToken;
      if (!accessToken) throw new Error("apple-revoke-no-token");
      await revokeAccessToken(auth, accessToken);
    }
  }, []);

  const getToken = useCallback(async () => (auth?.currentUser ? auth.currentUser.getIdToken() : null), []);

  const value = useMemo(
    () => ({
      user,
      loading,
      configured: firebaseConfigured,
      signInWithGoogle,
      signInWithApple,
      signInWithPassword,
      createManualAccount,
      logout,
      reauthenticateForDeletion,
      forgetAccount,
      revokeAppleIfNeeded,
      getToken,
    }),
    [
      user,
      loading,
      signInWithGoogle,
      signInWithApple,
      signInWithPassword,
      createManualAccount,
      logout,
      reauthenticateForDeletion,
      forgetAccount,
      revokeAppleIfNeeded,
      getToken,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
