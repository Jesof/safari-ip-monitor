//
//  ViewController.swift
//  Safari IP Monitor
//
//  Главное окно приложения с инструкциями
//

import Cocoa
import SafariServices

class ViewController: NSViewController {
    
    @IBOutlet weak var appNameLabel: NSTextField!
    @IBOutlet weak var instructionLabel: NSTextField!
    @IBOutlet weak var extensionStatusLabel: NSTextField!
    @IBOutlet weak var openPreferencesButton: NSButton!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupUI()
        updateExtensionStatus()
    }
    
    private func setupUI() {
        appNameLabel?.stringValue = "Safari IP Monitor"
        instructionLabel?.stringValue = """
        Это расширение для Safari отображает информацию о безопасности
        соединений и поддержке IPv6 для посещаемых веб-сайтов.
        
        Для использования:
        1. Нажмите кнопку ниже, чтобы открыть настройки Safari
        2. Включите расширение "Safari IP Monitor"
        3. Посетите любой веб-сайт
        4. Нажмите на иконку расширения в тулбаре Safari
        """
    }
    
    @IBAction func openSafariPreferences(_ sender: Any) {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: "com.safari.ipmonitor.extension") { error in
            if let error = error {
                self.showAlert(title: "Ошибка", message: error.localizedDescription)
            }
        }
    }
    
    @IBAction func checkStatus(_ sender: Any) {
        updateExtensionStatus()
    }
    
    private func updateExtensionStatus() {
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: "com.safari.ipmonitor.extension") { (state, error) in
            DispatchQueue.main.async {
                if let error = error {
                    self.extensionStatusLabel?.stringValue = "Ошибка: \(error.localizedDescription)"
                    return
                }
                
                if let state = state {
                    self.extensionStatusLabel?.stringValue = state.isEnabled ? "✓ Включено" : "✗ Отключено"
                    self.extensionStatusLabel?.textColor = state.isEnabled ? .systemGreen : .systemRed
                } else {
                    self.extensionStatusLabel?.stringValue = "Неизвестно"
                }
            }
        }
    }
    
    private func showAlert(title: String, message: String) {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = message
        alert.alertStyle = .informational
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }
}
