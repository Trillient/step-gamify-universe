import SwiftUI

struct ContentView: View {
    @StateObject private var web = WebController()
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ZStack {
            Color("Background").ignoresSafeArea()
            WebView(controller: web)
            ProgressBar(progress: web.progress, visible: web.phase == .loading && web.hasCommitted)
            if case .failed(let failure) = web.phase {
                FailureView(failure: failure, retry: web.retry)
                    .transition(.opacity)
            }
            if !web.hasCommitted, web.phase == .loading {
                SplashView().transition(.opacity)
            }
        }
        .animation(.easeOut(duration: 0.2), value: web.phase)
        .animation(.easeOut(duration: 0.2), value: web.hasCommitted)
        .sheet(item: $web.popup) { popup in
            PopupView(controller: popup)
        }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .background: web.sceneDidEnterBackground()
            case .active: web.sceneDidBecomeActive()
            default: break
            }
        }
    }
}

private struct ProgressBar: View {
    let progress: Double
    let visible: Bool

    var body: some View {
        VStack(spacing: 0) {
            GeometryReader { proxy in
                Rectangle()
                    .fill(Color.accentColor)
                    .frame(width: proxy.size.width * progress)
            }
            .frame(height: 2)
            Spacer()
        }
        .opacity(visible ? 1 : 0)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

private struct SplashView: View {
    var body: some View {
        ZStack {
            Color("Background").ignoresSafeArea()
            VStack(spacing: 16) {
                Text("Wooly Walking")
                    .font(.system(.title, design: .rounded, weight: .bold))
                    .foregroundStyle(Color.accentColor)
                ProgressView()
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Loading Wooly Walking")
    }
}

private struct FailureView: View {
    let failure: WebController.Failure
    let retry: () -> Void

    private var icon: String {
        failure == .offline ? "wifi.slash" : "exclamationmark.triangle"
    }

    private var title: String {
        failure == .offline ? "You're offline" : "Can't load the challenge"
    }

    private var message: String {
        switch failure {
        case .offline: "Check your connection and try again."
        case .server: "The site is having trouble right now. Try again in a moment."
        case .other: "Something went wrong loading the page. Try again."
        }
    }

    var body: some View {
        ZStack {
            Color("Background").ignoresSafeArea()
            VStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.system(size: 44))
                    .foregroundStyle(.secondary)
                Text(title).font(.title2.weight(.semibold))
                Text(message)
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                Button("Try again", action: retry)
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .padding(.top, 6)
            }
            .padding(32)
            .frame(maxWidth: 420)
        }
    }
}

/// Sign-in popup (window.open) shown over the site. The page closes it itself
/// with window.close() once Google returns the credential.
struct PopupView: View {
    @ObservedObject var controller: WebController

    var body: some View {
        NavigationStack {
            WebView(controller: controller)
                .navigationTitle(controller.webView.url?.host ?? controller.title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Close") { controller.closePopup() }
                    }
                }
        }
    }
}
