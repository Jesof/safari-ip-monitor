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
        
        // Автоматически закрываем приложение после короткой задержки
        // Расширение Safari продолжит работать в фоновом режиме
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            NSApplication.shared.terminate(nil)
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
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: "com.safari.ipmonitor.extension") { (state, error) in
            if let error = error {
                print("Error checking extension state: \(error.localizedDescription)")
                return
            }
            
            if let state = state {
                print("Extension enabled: \(state.isEnabled)")
            }
        }
    }
}
