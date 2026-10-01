import Foundation

/// Decides what the web view may load in-app. Pure logic so it can be unit tested.
enum NavigationPolicy {
    static let siteHost = "steps.woolston.dev"

    enum Context {
        /// The main site web view.
        case main
        /// A window.open() / target=_blank web view, used for the Google sign-in popup.
        case popup
    }

    enum Decision: Equatable {
        case allow
        case openExternally
        case cancel
    }

    enum NewWindowTarget: Equatable {
        /// Same-site link: load it in the main web view.
        case mainView
        /// Auth popup: present a second web view that keeps window.opener.
        case popup
        case external
        case ignore
    }

    /// Hosts the main web view may navigate to: the site and the Firebase/Google
    /// pages used by a redirect-style sign-in.
    private static let authHostSuffixes = ["firebaseapp.com", "web.app"]
    private static let authHosts = ["accounts.google.com"]
    private static let externalSchemes: Set<String> = ["mailto", "tel", "sms", "facetime", "itms-apps"]

    static func isSiteOrAuthHost(_ host: String, siteHost: String = siteHost) -> Bool {
        let host = host.lowercased()
        if host == siteHost || authHosts.contains(host) { return true }
        return authHostSuffixes.contains { host == $0 || host.hasSuffix("." + $0) }
    }

    static func decide(url: URL?, isMainFrame: Bool, context: Context, siteHost: String = siteHost) -> Decision {
        guard let url, let scheme = url.scheme?.lowercased() else { return .cancel }
        switch scheme {
        case "about", "blob":
            return .allow
        case "https", "http":
            // Embedded frames (Firebase/Google auth iframes) are not user navigations.
            if !isMainFrame { return .allow }
            // The popup is an isolated sign-in sandbox: IdP redirects may leave Google.
            if context == .popup { return .allow }
            guard let host = url.host else { return .cancel }
            return isSiteOrAuthHost(host, siteHost: siteHost) ? .allow : .openExternally
        default:
            return externalSchemes.contains(scheme) ? .openExternally : .cancel
        }
    }

    static func newWindowTarget(for url: URL?, siteHost: String = siteHost) -> NewWindowTarget {
        // window.open('') followed by a script-driven location change.
        guard let url, url.scheme?.lowercased() != "about" else { return .popup }
        guard let scheme = url.scheme?.lowercased() else { return .ignore }
        if scheme == "https" || scheme == "http" {
            guard let host = url.host?.lowercased() else { return .ignore }
            // Firebase may serve its auth handler from the site's own domain
            // (authDomain = steps.woolston.dev); that must stay a popup.
            if host == siteHost { return url.path.hasPrefix("/__/auth/") ? .popup : .mainView }
            return isSiteOrAuthHost(host, siteHost: siteHost) ? .popup : .external
        }
        return externalSchemes.contains(scheme) ? .external : .ignore
    }
}
