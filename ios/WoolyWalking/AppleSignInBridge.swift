import AuthenticationServices
import CryptoKit
import Foundation
import WebKit

/// Native Sign in with Apple for the site, so sign-in never depends on a web popup.
/// JS: `await window.webkit.messageHandlers.appleSignIn.postMessage({})` resolves to
/// `{ idToken, rawNonce, givenName, familyName }`; the site exchanges it with Firebase
/// (`OAuthProvider("apple.com").credential({ idToken, rawNonce })`).
final class AppleSignInBridge: NSObject, WKScriptMessageHandlerWithReply {
    static let name = "appleSignIn"
    private var pending: CheckedContinuation<ASAuthorization, Error>?
    private var controller: ASAuthorizationController?

    @MainActor
    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) async -> (Any?, String?) {
        guard message.frameInfo.isMainFrame,
              message.frameInfo.securityOrigin.host.lowercased() == NavigationPolicy.siteHost else {
            return (nil, "not-allowed")
        }
        guard pending == nil else { return (nil, "busy") }

        let rawNonce = AppleSignInBridge.randomNonce()
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName]
        request.nonce = AppleSignInBridge.sha256(rawNonce)

        do {
            let authorization = try await withCheckedThrowingContinuation { continuation in
                pending = continuation
                let controller = ASAuthorizationController(authorizationRequests: [request])
                controller.delegate = self
                controller.presentationContextProvider = self
                self.controller = controller
                controller.performRequests()
            }
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = credential.identityToken,
                  let idToken = String(data: tokenData, encoding: .utf8) else {
                return (nil, "no-token")
            }
            return ([
                "idToken": idToken,
                "rawNonce": rawNonce,
                "givenName": credential.fullName?.givenName ?? "",
                "familyName": credential.fullName?.familyName ?? "",
            ], nil)
        } catch let error as ASAuthorizationError where error.code == .canceled {
            return (nil, "cancelled")
        } catch {
            return (nil, "failed")
        }
    }

    static func randomNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var generator = SystemRandomNumberGenerator()
        return String((0..<length).map { _ in charset.randomElement(using: &generator)! })
    }

    static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

extension AppleSignInBridge: ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        pending?.resume(returning: authorization)
        pending = nil
        self.controller = nil
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        pending?.resume(throwing: error)
        pending = nil
        self.controller = nil
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.keyWindow }
            .first ?? ASPresentationAnchor()
    }
}
