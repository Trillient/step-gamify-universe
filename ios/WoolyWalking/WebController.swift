import Combine
import SwiftUI
import UIKit
import WebKit

enum SiteConfig {
    static let url = URL(string: "https://\(NavigationPolicy.siteHost)")!
    /// Auto-reload when the app returns after being away this long, so a new
    /// website deploy shows up without killing the app.
    static let reloadAfterBackground: TimeInterval = 10 * 60
    /// Google rejects OAuth in webviews it can identify ("disallowed_useragent").
    /// `applicationNameForUserAgent` only appends to the WebKit UA, so the full
    /// string is set through `customUserAgent` instead, shaped like Safari's.
    /// This is a best effort, not a guarantee Google accepts the shell.
    static var userAgent: String {
        let os = ProcessInfo.processInfo.operatingSystemVersion
        let version = "\(os.majorVersion).\(os.minorVersion)"
        let platform: String
        if UIDevice.current.userInterfaceIdiom == .pad {
            // iPadOS Safari presents the desktop (Macintosh) UA.
            platform = "Macintosh; Intel Mac OS X 10_15_7"
        } else {
            platform = "iPhone; CPU iPhone OS \(os.majorVersion)_\(os.minorVersion) like Mac OS X"
        }
        return "Mozilla/5.0 (\(platform)) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/\(version) Mobile/15E148 Safari/604.1"
    }
}

/// Owns one WKWebView plus its loading state. A second instance is created for
/// each popup window the page opens.
@MainActor
final class WebController: NSObject, ObservableObject, Identifiable, WKNavigationDelegate, WKUIDelegate {
    enum Failure: Equatable {
        case offline
        case server
        case other
    }

    enum Phase: Equatable {
        case loading
        case loaded
        case failed(Failure)
    }

    let id = UUID()
    let webView: WKWebView
    let context: NavigationPolicy.Context

    @Published private(set) var phase: Phase = .loading
    @Published private(set) var progress: Double = 0
    @Published private(set) var hasCommitted = false
    @Published private(set) var title = ""
    @Published var popup: WebController?

    private weak var parent: WebController?
    private var failedURL: URL?
    private var backgroundedAt: Date?
    private var cancellables = Set<AnyCancellable>()
    private let refreshControl = UIRefreshControl()

    /// Main web view.
    convenience override init() {
        let configuration = WKWebViewConfiguration()
        // The default data store persists cookies, localStorage and IndexedDB,
        // which is where Firebase keeps the signed-in session.
        configuration.websiteDataStore = .default()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = true
        self.init(configuration: configuration, context: .main, parent: nil)
        load(SiteConfig.url)
    }

    /// Popup web view; WebKit supplies the configuration so window.opener works.
    init(configuration: WKWebViewConfiguration, context: NavigationPolicy.Context, parent: WebController?) {
        self.webView = WKWebView(frame: .zero, configuration: configuration)
        self.context = context
        self.parent = parent
        super.init()

        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.customUserAgent = SiteConfig.userAgent
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.underPageBackgroundColor = UIColor(named: "Background") ?? .systemBackground
        #if DEBUG
        webView.isInspectable = true
        #endif

        if context == .main {
            refreshControl.addTarget(self, action: #selector(pullToRefresh), for: .valueChanged)
            webView.scrollView.refreshControl = refreshControl
        }

        webView.publisher(for: \.estimatedProgress)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] in self?.progress = $0 }
            .store(in: &cancellables)
        webView.publisher(for: \.title)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] in self?.title = $0 ?? "" }
            .store(in: &cancellables)
    }

    // MARK: actions

    func load(_ url: URL) {
        phase = .loading
        webView.load(URLRequest(url: url))
    }

    func retry() {
        phase = .loading
        if webView.url != nil, failedURL == nil {
            webView.reload()
        } else {
            load(failedURL ?? SiteConfig.url)
        }
    }

    @objc private func pullToRefresh() {
        if webView.url != nil { webView.reload() } else { load(SiteConfig.url) }
    }

    func sceneDidEnterBackground() {
        backgroundedAt = Date()
    }

    func sceneDidBecomeActive() {
        defer { backgroundedAt = nil }
        guard let backgroundedAt, Date().timeIntervalSince(backgroundedAt) > SiteConfig.reloadAfterBackground else { return }
        retry()
    }

    // MARK: WKNavigationDelegate

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void) {
        let url = navigationAction.request.url
        let decision = NavigationPolicy.decide(url: url, isMainFrame: navigationAction.targetFrame?.isMainFrame ?? false, context: context)
        switch decision {
        case .allow:
            decisionHandler(.allow)
        case .openExternally:
            if let url { UIApplication.shared.open(url) }
            decisionHandler(.cancel)
        case .cancel:
            decisionHandler(.cancel)
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse,
                 decisionHandler: @escaping @MainActor @Sendable (WKNavigationResponsePolicy) -> Void) {
        if navigationResponse.isForMainFrame, let http = navigationResponse.response as? HTTPURLResponse, http.statusCode >= 500 {
            failedURL = http.url
            phase = .failed(.server)
            refreshControl.endRefreshing()
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        if phase != .loaded { phase = .loading }
    }

    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
        hasCommitted = true
        failedURL = nil
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        phase = .loaded
        refreshControl.endRefreshing()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        handle(error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        handle(error)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        // A dead sign-in popup cannot be resumed; closing makes the opener see it closed.
        if context == .popup { closePopup() } else { retry() }
    }

    private func handle(_ error: Error) {
        refreshControl.endRefreshing()
        let nsError = error as NSError
        // Cancelled loads (our own policy decisions, user taps during load) are not failures.
        // 102 is WebKit's "frame load interrupted" from a cancelled policy decision.
        if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled { return }
        if nsError.domain == "WebKitErrorDomain" && nsError.code == 102 { return }
        failedURL = nsError.userInfo[NSURLErrorFailingURLErrorKey] as? URL ?? webView.url
        switch nsError.code {
        case NSURLErrorNotConnectedToInternet, NSURLErrorNetworkConnectionLost, NSURLErrorDataNotAllowed:
            phase = .failed(.offline)
        default:
            phase = .failed(.other)
        }
    }

    // MARK: WKUIDelegate

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        let url = navigationAction.request.url
        switch NavigationPolicy.newWindowTarget(for: url) {
        case .mainView:
            if let url { load(url) }
            return nil
        case .external:
            if let url { UIApplication.shared.open(url) }
            return nil
        case .ignore:
            return nil
        case .popup:
            let child = WebController(configuration: configuration, context: .popup, parent: self)
            popup = child
            return child.webView
        }
    }

    func webViewDidClose(_ webView: WKWebView) {
        parent?.popup = nil
    }

    func closePopup() {
        parent?.popup = nil
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping @MainActor @Sendable () -> Void) {
        present(title: frame.request.url?.host, message: message, actions: [("OK", .default, { completionHandler() })])
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping @MainActor @Sendable (Bool) -> Void) {
        present(title: frame.request.url?.host, message: message, actions: [
            ("Cancel", .cancel, { completionHandler(false) }),
            ("OK", .default, { completionHandler(true) }),
        ])
    }

    private func present(title: String?, message: String, actions: [(String, UIAlertAction.Style, () -> Void)]) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        for (label, style, handler) in actions {
            alert.addAction(UIAlertAction(title: label, style: style) { _ in handler() })
        }
        guard var top = UIApplication.shared.connectedScenes
            .compactMap({ ($0 as? UIWindowScene)?.keyWindow?.rootViewController }).first else {
            actions.last?.2()
            return
        }
        while let presented = top.presentedViewController { top = presented }
        top.present(alert, animated: true)
    }
}
