export const MANUAL_PASSWORD_MIN_LENGTH = 6;

const MANUAL_AUTH_DOMAIN = "steps.woolston.dev";
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function usernameError(value: string): string | null {
  const username = normalizeUsername(value);
  if (username.length < 3 || username.length > 30 || !USERNAME_PATTERN.test(username)) {
    return "Use 3–30 letters, numbers, underscores or hyphens. Start and end with a letter or number.";
  }
  return null;
}

/** Firebase's password provider requires an email-shaped identifier. This stays internal to auth. */
export function usernameEmail(value: string): string {
  return `${normalizeUsername(value)}@${MANUAL_AUTH_DOMAIN}`;
}
