import { describe, expect, it } from "vitest";
import { chromeIntentUrl, detectEmbeddedBrowser, safariUrl } from "../src/lib/inAppBrowser";

const UA = {
  messengerIosIab:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/490.0;FBBV/1;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/18.1;FBSS/3;FBID/phone;FBLC/en_AU;FBOP/5;FBRV/0;IABMV/1]",
  messengerIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/480.0;FBBV/1]",
  instagram:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0",
  facebookAndroid:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0;]",
  androidWebView: "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36",
  safari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  chromeAndroid: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36",
  chromeIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1",
};

describe("detectEmbeddedBrowser", () => {
  it("flags Messenger, Instagram, Facebook and bare Android web views", () => {
    expect(detectEmbeddedBrowser(UA.messengerIos)).toEqual({ app: "Messenger", android: false });
    expect(detectEmbeddedBrowser(UA.instagram)?.app).toBe("Instagram");
    expect(detectEmbeddedBrowser(UA.messengerIosIab)?.android).toBe(false);
    expect(detectEmbeddedBrowser(UA.facebookAndroid)).toEqual({ app: "Facebook", android: true });
    expect(detectEmbeddedBrowser(UA.androidWebView)?.android).toBe(true);
  });

  it("leaves real browsers (and our Safari-shaped iOS app) alone", () => {
    expect(detectEmbeddedBrowser(UA.safari)).toBeNull();
    expect(detectEmbeddedBrowser(UA.chromeAndroid)).toBeNull();
    expect(detectEmbeddedBrowser(UA.chromeIos)).toBeNull();
  });
});

describe("safariUrl", () => {
  it("swaps https for the x-safari-https scheme", () => {
    expect(safariUrl("https://steps.woolston.dev/#stats")).toBe("x-safari-https://steps.woolston.dev/#stats");
  });
});

describe("chromeIntentUrl", () => {
  it("opens the same page in Chrome with a web fallback", () => {
    const url = chromeIntentUrl("https://steps.woolston.dev/?x=1");
    expect(url.startsWith("intent://steps.woolston.dev/?x=1#Intent;scheme=https;package=com.android.chrome;")).toBe(true);
    expect(url).toContain("S.browser_fallback_url=https%3A%2F%2Fsteps.woolston.dev%2F%3Fx%3D1");
  });
});
