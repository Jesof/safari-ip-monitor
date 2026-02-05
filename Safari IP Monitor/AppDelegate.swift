//
//  AppDelegate.swift
//  Safari IP Monitor
//
//  Главный делегат приложения
//

import Cocoa
import SafariServices

@main
class AppDelegate: NSObject, NSApplicationDelegate {
    
    func applicationDidFinishLaunching(_ notification: Notification) {
        // Проверяем состояние расширения при запуске
        checkExtensionState()
        
        // Приложение должно оставаться запущенным для работы Safari Web Extension
        // Минимизируем окно
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            NSApp.windows.first?.miniaturize(nil)
        }
    }
    
    func applicationWillTerminate(_ notification: Notification) {
        // Очистка перед закрытием
    }
    
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        // Закрываем приложение когда последнее окно закрыто
        return true
    }
    
    func applicationSupportsSecureRestorableState(_ app: NSApplication) -> Bool {
        return true
    }
    
    // MARK: - Extension State
    
    private func checkExtensionState() {
        let extensionIdentifier = "ru.jesof.safari.ipmonitor.extension"
        print("🔍 Checking extension state for: \(extensionIdentifier)")
        
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionIdentifier) { (state, error) in
            DispatchQueue.main.async {
                if let error = error {
                    let nsError = error as NSError
                    print("⚠️ Extension state check error: \(error.localizedDescription)")
                    print("   Domain: \(nsError.domain), Code: \(nsError.code)")
                    print("   💡 This is normal if Safari hasn't loaded the extension yet.")
                    print("   👉 Open Safari → Settings → Extensions to enable the extension.")
                    return
                }
                
                if let state = state {
                    if state.isEnabled {
                        print("✅ Extension is ENABLED")
                    } else {
                        print("⚠️ Extension is installed but DISABLED")
                        print("   👉 Enable it in Safari → Settings → Extensions")
                    }
                } else {
                    print("❓ Extension state is unknown")
                }
            }
        }
    }
}
