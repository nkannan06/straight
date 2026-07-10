import UIKit
import Capacitor

// Capacitor 8 (SPM) only auto-registers plugins that ship as their own
// Swift packages (they get listed in capacitor.config.json's
// `packageClassList` by the CLI). Plugins defined directly inside the app
// target — like our AppleSignInPlugin/GoogleSignInPlugin — are compiled into
// the binary but never registered with the bridge, so JS calls to them fail
// with "plugin is not implemented on iOS". Registering them explicitly in
// capacitorDidLoad() is the documented way to wire up app-local plugins.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppleSignInPlugin())
        bridge?.registerPluginInstance(GoogleSignInPlugin())
    }
}
