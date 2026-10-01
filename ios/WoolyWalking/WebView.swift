import SwiftUI
import WebKit

/// Hosts a controller's WKWebView. Respects the safe area; the page background
/// behind the status bar comes from the SwiftUI layer underneath.
struct WebView: UIViewRepresentable {
    let controller: WebController

    func makeUIView(context: Context) -> WKWebView { controller.webView }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
