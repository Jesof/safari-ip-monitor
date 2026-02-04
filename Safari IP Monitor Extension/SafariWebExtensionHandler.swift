//
//  SafariWebExtensionHandler.swift
//  Safari IP Monitor Extension
//
//  Обработчик для коммуникации между нативным приложением и Web Extension
//

import SafariServices
import os.log
import Network

@available(macOS 11.0, *)
class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    
    func beginRequest(with context: NSExtensionContext) {
        NSLog("SafariIPMonitor: beginRequest called")
        
        let request = context.inputItems.first as? NSExtensionItem
        
        guard let message = request?.userInfo?[SFExtensionMessageKey] as? [String: Any],
              let messageName = message["name"] as? String else {
            NSLog("SafariIPMonitor: Invalid message format")
            context.completeRequest(returningItems: nil, completionHandler: nil)
            return
        }
        
        NSLog("SafariIPMonitor: Received message: \(messageName)")
        
        // Обработка сообщений от JavaScript
        switch messageName {
        case "getNativeInfo":
            handleGetNativeInfo(context: context, message: message)
            
        case "performDNSLookup":
            handleDNSLookup(context: context, message: message)
            
        default:
            NSLog("SafariIPMonitor: Unknown message: \(messageName)")
            let response = NSExtensionItem()
            response.userInfo = [
                SFExtensionMessageKey: [
                    "error": "Unknown message type"
                ]
            ]
            context.completeRequest(returningItems: [response], completionHandler: nil)
        }
    }
    
    // MARK: - Message Handlers
    
    /// Возвращает информацию о нативном приложении
    private func handleGetNativeInfo(context: NSExtensionContext, message: [String: Any]) {
        let response = NSExtensionItem()
        response.userInfo = [
            SFExtensionMessageKey: [
                "version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0",
                "platform": "macOS",
                "capabilities": [
                    "dnsLookup": true,
                    "networkMonitoring": false // Safari ограничивает доступ к IP
                ]
            ]
        ]
        
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
    
    /// Выполняет DNS lookup через системный резолвер
    private func handleDNSLookup(context: NSExtensionContext, message: [String: Any]) {
        guard let domain = message["domain"] as? String else {
            sendError(context: context, message: "Domain not specified")
            return
        }
        
        NSLog("SafariIPMonitor: DNS lookup for: \(domain)")
        
        // Используем системный резолвер
        var ipv4Addresses: [String] = []
        var ipv6Addresses: [String] = []
        
        let semaphore = DispatchSemaphore(value: 0)
        
        // Резолвим через getaddrinfo (системный DNS)
        DispatchQueue.global(qos: .userInitiated).async {
            var hints = addrinfo()
            hints.ai_family = AF_UNSPEC // IPv4 и IPv6
            hints.ai_socktype = SOCK_STREAM
            hints.ai_flags = AI_DEFAULT
            
            var result: UnsafeMutablePointer<addrinfo>?
            
            let status = getaddrinfo(domain, nil, &hints, &result)
            
            if status == 0 {
                var addr = result
                while addr != nil {
                    if let currentAddr = addr?.pointee {
                        if currentAddr.ai_family == AF_INET {
                            // IPv4
                            var addr4 = currentAddr.ai_addr.withMemoryRebound(to: sockaddr_in.self, capacity: 1) { $0.pointee }
                            var buffer = [CChar](repeating: 0, count: Int(INET_ADDRSTRLEN))
                            inet_ntop(AF_INET, &addr4.sin_addr, &buffer, socklen_t(INET_ADDRSTRLEN))
                            let ipString = String(cString: buffer)
                            if !ipv4Addresses.contains(ipString) {
                                ipv4Addresses.append(ipString)
                            }
                        } else if currentAddr.ai_family == AF_INET6 {
                            // IPv6
                            var addr6 = currentAddr.ai_addr.withMemoryRebound(to: sockaddr_in6.self, capacity: 1) { $0.pointee }
                            var buffer = [CChar](repeating: 0, count: Int(INET6_ADDRSTRLEN))
                            inet_ntop(AF_INET6, &addr6.sin6_addr, &buffer, socklen_t(INET6_ADDRSTRLEN))
                            let ipString = String(cString: buffer)
                            if !ipv6Addresses.contains(ipString) {
                                ipv6Addresses.append(ipString)
                            }
                        }
                    }
                    addr = addr?.pointee.ai_next
                }
                freeaddrinfo(result)
            } else {
                NSLog("SafariIPMonitor: DNS lookup failed for \(domain) with status \(status)")
            }
            
            semaphore.signal()
        }
        
        // Ждем завершения с таймаутом 5 секунд
        let timeout = DispatchTime.now() + .seconds(5)
        let result = semaphore.wait(timeout: timeout)
        
        if result == .timedOut {
            NSLog("SafariIPMonitor: DNS lookup timeout for \(domain)")
        }
        
        let response = NSExtensionItem()
        response.userInfo = [
            SFExtensionMessageKey: [
                "domain": domain,
                "ipv4": ipv4Addresses,
                "ipv6": ipv6Addresses
            ]
        ]
        
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
    
    // MARK: - Helpers
    
    private func sendError(context: NSExtensionContext, message: String) {
        NSLog("SafariIPMonitor: Error: \(message)")
        
        let response = NSExtensionItem()
        response.userInfo = [
            SFExtensionMessageKey: [
                "error": message
            ]
        ]
        
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
