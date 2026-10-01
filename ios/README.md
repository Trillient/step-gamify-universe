# Wooly Walking iOS

Thin SwiftUI + WKWebView shell around https://steps.woolston.dev. Nothing from the web app is bundled: every launch loads the live site, so a website deploy reaches the app on its next launch, pull-to-refresh, or foreground after 10 minutes away.

Bundle identifier `dev.woolston.steps`, iOS 17+, iPhone and iPad.

## Layout

- `project.yml` is the source of truth; `WoolyWalking.xcodeproj` is generated from it (`brew install xcodegen`, then `xcodegen generate` in `ios/`) and also committed so plain Xcode works.
- `WoolyWalking/NavigationPolicy.swift` decides what stays in-app (site, Firebase/Google auth hosts) and what opens in Safari or the system (other https links, mailto, tel).
- `WoolyWalking/WebController.swift` owns the web view: persistent cookies/storage (default data store), the sign-in popup (window.open / target=_blank gets a second web view, including same-site `/__/auth/*` handler URLs, with window.opener intact, shown in a sheet), JS alert/confirm, load progress, offline/5xx/other failure with Try again, pull-to-refresh.
- `WoolyWalking/PrivacyInfo.xcprivacy`: no tracking, no collected data, no required-reason APIs used by the shell. The website's own data handling is declared separately in App Store Connect.
- `scripts/make-icon.swift` regenerates the app icon.

## Build and test

```sh
cd ios
xcodebuild -project WoolyWalking.xcodeproj -scheme WoolyWalking \
  -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build

xcodebuild -project WoolyWalking.xcodeproj -scheme WoolyWalking \
  -destination 'platform=iOS Simulator,name=<an installed iPhone>' CODE_SIGNING_ALLOWED=NO test
```

On a network that re-signs TLS (for example Netskope), the simulator needs that root CA: `xcrun simctl keychain <device> add-root-cert root.pem`.

## TestFlight

Needs a paid Apple Developer Program team; no team ID is committed.

1. Create `Config/Signing.local.xcconfig` (gitignored) with `DEVELOPMENT_TEAM = <your 10 char team id>`.
2. In App Store Connect, create an app with bundle ID `dev.woolston.steps` (register the identifier first under Certificates, Identifiers & Profiles).
3. Bump `CURRENT_PROJECT_VERSION` in `Config/App.xcconfig` for every upload.
4. Archive and upload:

```sh
cd ios
xcodebuild -project WoolyWalking.xcodeproj -scheme WoolyWalking -configuration Release \
  -destination 'generic/platform=iOS' -archivePath build/WoolyWalking.xcarchive \
  -allowProvisioningUpdates archive
xcodebuild -exportArchive -archivePath build/WoolyWalking.xcarchive \
  -exportOptionsPlist ExportOptions.plist -allowProvisioningUpdates
```

`ExportOptions.plist` (not committed, contains your team): `method` = `app-store-connect`, `destination` = `upload`, `teamID` = your team. Alternatively use Xcode: Product > Archive > Distribute App > App Store Connect.

5. Once processing finishes, add testers under TestFlight. Internal testers need no review; external testers need Beta App Review (provide a Google test account or explain sign-in).

## Google sign-in caveat

The site uses Firebase `signInWithPopup`. Google blocks OAuth in embedded web views it can identify (`disallowed_useragent`), so the shell sets `WKWebView.customUserAgent` to a Safari-shaped string built from the device OS version (`SiteConfig.userAgent`). `applicationNameForUserAgent` was deliberately not used: it only appends a token to the WebKit UA and cannot produce a Safari UA. A spoofed UA is a best effort, not a contract: Google can still detect and block embedded web views, and this is not verifiable without a real Google account on a device: test sign-in on a physical iPhone from a TestFlight build before inviting anyone. If Google rejects it, the supported fix is a web-side change (native Google sign-in or ASWebAuthenticationSession exchanging a credential into Firebase), which this shell deliberately does not do.
