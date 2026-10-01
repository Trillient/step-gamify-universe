import XCTest
@testable import WoolyWalking

final class NavigationPolicyTests: XCTestCase {
    private func decide(_ s: String, mainFrame: Bool = true, _ context: NavigationPolicy.Context = .main) -> NavigationPolicy.Decision {
        NavigationPolicy.decide(url: URL(string: s), isMainFrame: mainFrame, context: context)
    }

    private func target(_ s: String?) -> NavigationPolicy.NewWindowTarget {
        NavigationPolicy.newWindowTarget(for: s.flatMap(URL.init(string:)))
    }

    func testSiteStaysInApp() {
        XCTAssertEqual(decide("https://steps.woolston.dev/"), .allow)
        XCTAssertEqual(decide("https://steps.woolston.dev/api/health"), .allow)
    }

    func testRedirectSignInHostsStayInApp() {
        XCTAssertEqual(decide("https://accounts.google.com/o/oauth2/auth"), .allow)
        XCTAssertEqual(decide("https://my-proj.firebaseapp.com/__/auth/handler"), .allow)
        XCTAssertEqual(decide("https://my-proj.web.app/__/auth/handler"), .allow)
    }

    func testExternalLinksOpenOutside() {
        XCTAssertEqual(decide("https://example.com/"), .openExternally)
        XCTAssertEqual(decide("https://www.google.com/"), .openExternally)
        XCTAssertEqual(decide("mailto:a@b.com"), .openExternally)
        XCTAssertEqual(decide("tel:+61400000000"), .openExternally)
    }

    func testLookalikeHostsAreNotTrusted() {
        XCTAssertEqual(decide("https://steps.woolston.dev.evil.com/"), .openExternally)
        XCTAssertEqual(decide("https://evilfirebaseapp.com/"), .openExternally)
        XCTAssertEqual(decide("https://accounts.google.com.evil.com/"), .openExternally)
    }

    func testSubframesAreAlwaysAllowed() {
        XCTAssertEqual(decide("https://content.googleapis.com/frame", mainFrame: false), .allow)
    }

    func testPopupAllowsIdentityProviderRedirects() {
        XCTAssertEqual(decide("https://login.microsoftonline.com/x", .popup), .allow)
    }

    func testUnknownSchemesAreCancelled() {
        XCTAssertEqual(decide("javascript:alert(1)"), .cancel)
        XCTAssertEqual(decide("file:///etc/passwd"), .cancel)
        XCTAssertEqual(decide("custom-app://x"), .cancel)
        XCTAssertEqual(NavigationPolicy.decide(url: nil, isMainFrame: true, context: .main), .cancel)
    }

    func testNewWindowRouting() {
        XCTAssertEqual(target(nil), .popup)
        XCTAssertEqual(target("about:blank"), .popup)
        XCTAssertEqual(target("https://steps.woolston.dev/leaderboard"), .mainView)
        XCTAssertEqual(target("https://steps.woolston.dev/__/auth/handler?apiKey=x"), .popup)
        XCTAssertEqual(target("https://accounts.google.com/o/oauth2/auth"), .popup)
        XCTAssertEqual(target("https://my-proj.firebaseapp.com/__/auth/handler"), .popup)
        XCTAssertEqual(target("https://example.com"), .external)
        XCTAssertEqual(target("mailto:a@b.com"), .external)
        XCTAssertEqual(target("javascript:void(0)"), .ignore)
    }

    func testIPhoneUserAgentIsMobileSafari() {
        let ua = SiteConfig.userAgent(isPad: false, osMajor: 18, osMinor: 2)
        XCTAssertEqual(ua, "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1")
        XCTAssertEqual(ua.components(separatedBy: "Mobile/").count, 2, "Mobile token must appear once")
    }

    func testIPadUserAgentIsDesktopSafariWithoutMobileToken() {
        let ua = SiteConfig.userAgent(isPad: true, osMajor: 18, osMinor: 2)
        XCTAssertEqual(ua, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15")
        XCTAssertFalse(ua.contains("Mobile"))
        XCTAssertFalse(ua.contains("iPhone"))
        XCTAssertFalse(ua.contains("15E148"))
    }

    func testCurrentDeviceUserAgentLooksLikeSafari() {
        let ua = SiteConfig.userAgent
        XCTAssertTrue(ua.hasPrefix("Mozilla/5.0 ("))
        XCTAssertTrue(ua.contains("Version/"))
        XCTAssertTrue(ua.contains("Safari/"))
    }
}
