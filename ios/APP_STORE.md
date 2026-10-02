# Wooly Walking: App Store submission kit

Status (2 Oct 2026): the app and website are ready on our side. Submission is blocked only on an active Apple Developer Program membership.

## Why it's blocked

- Ben's team `UAWRH53TM4` has an expired membership. Renew at developer.apple.com/account (A$149/yr, Account Holder only).
- Richard Slatter's team `8F87P9YMNW` gives Ben App Store Connect Admin, but no Certificates, Identifiers & Profiles access, so Ben's Apple ID can't sign or upload for it (the developer site shows only Ben's own team). Only Richard could build and upload from that team.

## Review guideline checklist

| Guideline | Status |
|---|---|
| 4.2 Minimum functionality (not just a website) | Done: native Apple Health weekly step import (`HealthBridge.swift`), pull to refresh, offline/error screens |
| 5.1.1(v) Account deletion in app | Done: Settings > Delete my account (`DELETE /api/me`) |
| 5.1.1(i) Privacy policy in app and listing | Done: https://steps.woolston.dev/privacy, linked from sign-in and Settings |
| 5.1.3 Health data | Done: read-only step count, used only to fill the weekly total, explained in the policy and `NSHealthShareUsageDescription` |
| 4.8 Login services | **Code ready, switched off**: native Sign in with Apple in the app, web popup in browsers, server accepts it; finish the Apple/Firebase setup below after renewal |
| 2.1 App completeness | Provide a reviewer Google account (a fresh Gmail with no real data) in App Review notes |
| Google OAuth in a web view | Risk: the shell uses a Safari user agent so Google allows the popup. Native Sign in with Apple gives reviewers a path that never touches Google |

## Sign in with Apple (after renewal)

Code is done: the iOS app shows the system Sign in with Apple sheet (`AppleSignInBridge.swift`, entitlement `com.apple.developer.applesignin`), browsers use Firebase's web popup, and the server accepts `apple.com` tokens. To switch it on:

1. developer.apple.com > Identifiers: on App ID `dev.woolston.steps` enable **Sign in with Apple** (Xcode's automatic signing does this on the first archive). For the website, create a Services ID (e.g. `dev.woolston.steps.web`) with domain `wooly-walking-challenge-2026.firebaseapp.com` and return URL `https://wooly-walking-challenge-2026.firebaseapp.com/__/auth/handler`, and create a Sign in with Apple key.
2. Firebase console > Project settings: add an iOS app with bundle ID `dev.woolston.steps` (lets Firebase accept the app's native Apple tokens). Then Authentication > Sign-in method > Apple: enable it with the Services ID, team ID, key ID and private key.
3. On the server add `VITE_APPLE_SIGNIN=1` to `/root/steps-fb.env`, add `--build-arg VITE_APPLE_SIGNIN` to `/opt/lab/build/deploy-steps.sh`, and redeploy. The "Continue with Apple" button then appears on the sign-in page.
4. Test on a phone: Continue with Apple in the app (native sheet) and in Safari (web popup).

Reviewers can then sign in with their own Apple ID, so no demo account is needed; still list the Google test account as a fallback.

## Upload

```sh
cd ios
printf 'DEVELOPMENT_TEAM = UAWRH53TM4\n' > Config/Signing.local.xcconfig
./scripts/testflight.sh
```

Create the app in App Store Connect first (iOS, name "Wooly Walking", bundle `dev.woolston.steps`, SKU `woolywalking`).

## Screenshots

`ios/AppStore/screenshots/` holds six 1320x2868 PNGs (6.9" iPhone, the only size App Store Connect requires): home with Apple Health import, journey + leaderboard, stats, weekly effort, the blind final stretch and sign-in. The app is iPhone-only, so no iPad set is needed. Regenerate with the scratch preview harness and Playwright (see HANDOVER).

## Listing

- Name: Wooly Walking
- Subtitle: Family step challenge
- Category: Health & Fitness
- Age rating: 4+
- Promotional text: Twelve weeks, one family, every step counts.
- Description:
  Wooly Walking is our family's 12-week step challenge, 1 October to 20 December.
  Log one step total a week (or import it from Apple Health), watch your progress and see where you sit on the family leaderboard. The last four weeks are blind, so the result is a surprise until the big reveal.
  Private by design: other walkers only see your name and totals once you pass 1,000 steps, your email is never shown, and you can delete your account any time.
- Keywords: steps,walking,family,challenge,pedometer,leaderboard,fitness
- Support URL / Marketing URL: https://steps.woolston.dev
- Privacy policy URL: https://steps.woolston.dev/privacy

## App Privacy answers

- Data linked to the user: Name (display name), User ID (Firebase account ID), Fitness (weekly step totals). Purpose: App Functionality.
- Health: step count is read on device to fill the weekly total; only the total is uploaded (declare under Fitness / Health as App Functionality).
- No tracking, no third-party advertising, no data sold.

## Review notes (paste into App Review Information)

Wooly Walking is a private family step challenge. Sign in with the provided Google account (or Sign in with Apple). Enter a weekly step total on Home, or tap "Import from Apple Health" to fill it from Health. Settings has name change, privacy policy and account deletion. The leaderboard shows other walkers only once they pass 1,000 steps, and hides everyone else from 26 Nov to 20 Dec by design.
