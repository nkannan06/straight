import Foundation
import Capacitor
import AuthenticationServices

// Native Sign in with Apple. No third-party SDK or SPM dependency needed —
// this is all built on the system AuthenticationServices framework. The
// resulting identityToken is verified server-side in server/auth.js against
// Apple's public keys; this plugin's only job is to obtain it.
@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?

    @objc func signIn(_ call: CAPPluginCall) {
        pendingCall = call
        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return self.bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let identityToken = String(data: tokenData, encoding: .utf8) else {
            pendingCall?.reject("Could not read Apple identity token")
            pendingCall = nil
            return
        }

        var result: [String: Any] = ["identityToken": identityToken]
        // Apple only includes the name on the very first authorization for
        // this app — nil on every subsequent sign-in, by design on their end.
        if let fullName = credential.fullName {
            let formatted = PersonNameComponentsFormatter().string(from: fullName)
            if !formatted.isEmpty { result["displayName"] = formatted }
        }

        pendingCall?.resolve(result)
        pendingCall = nil
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        pendingCall?.reject(error.localizedDescription)
        pendingCall = nil
    }
}
