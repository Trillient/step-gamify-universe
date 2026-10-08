/**
 * Social sign-in can't work inside embedded browsers (Messenger, Instagram and co):
 * they can't open the Firebase sign-in popup, so iOS Messenger throws it out
 * to Safari, which has none of the page's state and shows "Unable to process
 * request due to missing initial state". Google also refuses OAuth in many web
 * views outright ("403 disallowed_useragent"). So send people to a real browser.
 * Our own iOS app is not one of these: it sends a Safari user agent.
 */
const EMBEDDED = [
  ["Messenger", "Messenger"],
  ["FBAN", "Facebook"],
  ["FBAV", "Facebook"],
  ["FB_IAB", "Facebook"],
  ["Instagram", "Instagram"],
  ["Snapchat", "Snapchat"],
  ["musical_ly", "TikTok"],
  ["BytedanceWebview", "TikTok"],
  ["LinkedInApp", "LinkedIn"],
  ["Line/", "LINE"],
  ["MicroMessenger", "WeChat"],
  ["Twitter", "X"],
] as const;

export interface EmbeddedBrowser {
  app: string;
  android: boolean;
}

export function detectEmbeddedBrowser(
  ua: string = (globalThis as { navigator?: { userAgent?: string } }).navigator?.userAgent ?? "",
): EmbeddedBrowser | null {
  const hit = EMBEDDED.find(([token]) => ua.includes(token));
  if (hit) return { app: hit[1], android: /Android/i.test(ua) };
  // Generic Android WebView ("; wv)") that isn't Chrome itself
  if (/Android/i.test(ua) && /; wv\)/.test(ua)) return { app: "this app", android: true };
  return null;
}

/** iOS 17+ opens this scheme straight in Safari, even from an in-app browser. */
export function safariUrl(url: string): string {
  return url.replace(/^https:\/\//, "x-safari-https://");
}

/** Android can hand the page to Chrome directly. */
export function chromeIntentUrl(url: string): string {
  const u = new URL(url);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
}
