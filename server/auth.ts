import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey, type KeyLike } from "jose";

export interface AuthUser {
  uid: string;
  name: string;
}

export type TokenVerifier = (idToken: string) => Promise<AuthUser>;

/** Google, plus Apple because the App Store requires Sign in with Apple next to Google. */
const ALLOWED_PROVIDERS = new Set(["google.com", "apple.com"]);

const FIREBASE_JWKS_URL = new URL(
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
);

/**
 * Verifies a Firebase ID token: RS256 signature against Google's published
 * keys, issuer/audience pinned to the project, expiry, a non-empty `sub`, and
 * Google or Apple as the sign-in provider (other providers enabled on the
 * project, such as anonymous, are not allowed in).
 */
export function firebaseVerifier(
  projectId: string,
  /** Overridable for tests; defaults to Google's published signing keys. */
  keys: JWTVerifyGetKey | KeyLike | Uint8Array = createRemoteJWKSet(FIREBASE_JWKS_URL, { cooldownDuration: 30_000 }),
): TokenVerifier {
  return async (idToken) => {
    const { payload } = await jwtVerify(idToken, keys as JWTVerifyGetKey, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
    });
    if (typeof payload.sub !== "string" || payload.sub.length === 0 || payload.sub.length > 128) {
      throw new Error("token has no valid subject");
    }
    const firebase = payload.firebase as { sign_in_provider?: unknown } | undefined;
    if (typeof firebase?.sign_in_provider !== "string" || !ALLOWED_PROVIDERS.has(firebase.sign_in_provider)) {
      throw new Error("not a Google or Apple sign-in");
    }
    const authTime = payload.auth_time;
    if (typeof authTime === "number" && authTime > Math.floor(Date.now() / 1000) + 60) {
      throw new Error("auth_time in the future");
    }
    const name = typeof payload.name === "string" ? payload.name : "";
    return { uid: payload.sub, name };
  };
}
