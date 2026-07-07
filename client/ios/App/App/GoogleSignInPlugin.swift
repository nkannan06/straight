import Foundation
import Capacitor
import AuthenticationServices
import CryptoKit

// Google sign-in via the standard OAuth 2.0 Authorization Code + PKCE flow,
// using the system ASWebAuthenticationSession — deliberately not Google's
// native SDK, which would require adding an SPM package dependency. This
// needs a Google Cloud "iOS" OAuth client ID (see README) set as the
// GIDClientID key in Info.plist, plus a matching CFBundleURLTypes entry for
// the reversed-client-id scheme, before it will work.
@objc(GoogleSignInPlugin)
public class GoogleSignInPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "GoogleSignInPlugin"
    public let jsName = "GoogleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise)
    ]

    private var session: ASWebAuthenticationSession?

    private var clientId: String {
        Bundle.main.object(forInfoDictionaryKey: "GIDClientID") as? String ?? ""
    }

    // Google's convention: "com.googleusercontent.apps." + the client ID
    // with its ".apps.googleusercontent.com" suffix stripped — this is
    // exactly the "iOS URL scheme" value shown in Google Cloud Console for
    // an iOS-type OAuth client.
    private var redirectScheme: String {
        let suffix = ".apps.googleusercontent.com"
        let idPrefix = clientId.hasSuffix(suffix) ? String(clientId.dropLast(suffix.count)) : clientId
        return "com.googleusercontent.apps.\(idPrefix)"
    }

    @objc func signIn(_ call: CAPPluginCall) {
        guard !clientId.isEmpty else {
            call.reject("Google sign-in isn't configured yet (missing GIDClientID in Info.plist)")
            return
        }

        let codeVerifier = Self.randomURLSafeString(length: 64)
        let codeChallenge = Self.codeChallenge(for: codeVerifier)
        let redirectUri = "\(redirectScheme):/oauth2redirect"

        var components = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        components.queryItems = [
            URLQueryItem(name: "client_id", value: clientId),
            URLQueryItem(name: "redirect_uri", value: redirectUri),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: "openid email profile"),
            URLQueryItem(name: "code_challenge", value: codeChallenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
        ]

        let authSession = ASWebAuthenticationSession(url: components.url!, callbackURLScheme: redirectScheme) { [weak self] callbackURL, error in
            guard let self = self else { return }
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            guard let callbackURL = callbackURL,
                  let code = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false)?
                    .queryItems?.first(where: { $0.name == "code" })?.value else {
                call.reject("Google sign-in was cancelled")
                return
            }
            self.exchangeCode(code: code, codeVerifier: codeVerifier, redirectUri: redirectUri, call: call)
        }
        authSession.presentationContextProvider = self
        authSession.prefersEphemeralWebBrowserSession = true
        self.session = authSession
        authSession.start()
    }

    private func exchangeCode(code: String, codeVerifier: String, redirectUri: String, call: CAPPluginCall) {
        var request = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        let params = [
            "code": code,
            "client_id": clientId,
            "redirect_uri": redirectUri,
            "grant_type": "authorization_code",
            "code_verifier": codeVerifier,
        ]
        let body = params
            .map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")" }
            .joined(separator: "&")
        request.httpBody = body.data(using: .utf8)

        URLSession.shared.dataTask(with: request) { data, _, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let idToken = json["id_token"] as? String else {
                call.reject("Could not complete Google sign-in")
                return
            }
            call.resolve(["idToken": idToken])
        }.resume()
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return self.bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }

    private static func randomURLSafeString(length: Int) -> String {
        var bytes = [UInt8](repeating: 0, count: length)
        _ = SecRandomCopyBytes(kSecRandomDefault, length, &bytes)
        return Data(bytes).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private static func codeChallenge(for verifier: String) -> String {
        let hash = SHA256.hash(data: Data(verifier.utf8))
        return Data(hash).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
