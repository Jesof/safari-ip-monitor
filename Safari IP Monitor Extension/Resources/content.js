// Safari IP Monitor - Content Script
// Определяет публичный IP пользователя через WebRTC

(async function() {
  'use strict';
  
  // Определение публичного IP через WebRTC STUN
  async function detectPublicIP() {
    return new Promise((resolve) => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        
        const result = {
          ipv4: null,
          ipv6: null,
          local: []
        };
        
        // Создаем пустой data channel
        pc.createDataChannel('');
        
        // Создаем offer для инициализации ICE
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
        
        // Слушаем ICE candidates
        pc.onicecandidate = (ice) => {
          if (!ice || !ice.candidate || !ice.candidate.candidate) {
            return;
          }
          
          const candidate = ice.candidate.candidate;
          
          // Регулярные выражения для поиска IP
          const ipv4Regex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
          const ipv6Regex = /([a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/i;
          
          // Проверяем IPv4
          const ipv4Match = candidate.match(ipv4Regex);
          if (ipv4Match) {
            const ip = ipv4Match[1];
            // Проверяем, не локальный ли это адрес
            if (!ip.startsWith('192.168.') && 
                !ip.startsWith('10.') && 
                !ip.startsWith('172.') &&
                !ip.startsWith('127.')) {
              result.ipv4 = ip;
            } else {
              result.local.push(ip);
            }
          }
          
          // Проверяем IPv6
          const ipv6Match = candidate.match(ipv6Regex);
          if (ipv6Match) {
            const ip = ipv6Match[1];
            // Проверяем, не локальный ли это адрес (fe80:: и т.д.)
            if (!ip.toLowerCase().startsWith('fe80:') && 
                !ip.toLowerCase().startsWith('::1')) {
              result.ipv6 = ip;
            } else {
              result.local.push(ip);
            }
          }
          
          // Если нашли оба типа адресов, завершаем
          if (result.ipv4 && result.ipv6) {
            pc.close();
            resolve(result);
          }
        };
        
        // Таймаут на случай если не удастся получить IP
        setTimeout(() => {
          pc.close();
          resolve(result);
        }, 5000);
        
      } catch (error) {
        console.error('WebRTC IP detection failed:', error);
        resolve(null);
      }
    });
  }
  
  // Проверка IPv6 connectivity
  async function checkIPv6Connectivity() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      
      // Пытаемся подключиться к известному IPv6-only сервису
      await fetch('https://ipv6.google.com/', {
        mode: 'no-cors',
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // Определяем IP при загрузке страницы
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detectAndSend);
  } else {
    detectAndSend();
  }
  
  async function detectAndSend() {
    // Определяем публичный IP
    const ipInfo = await detectPublicIP();
    
    // Проверяем IPv6 connectivity
    const hasIPv6 = await checkIPv6Connectivity();
    
    // Отправляем в background script
    if (ipInfo) {
      try {
        browser.runtime.sendMessage({
          type: 'USER_IP_DETECTED',
          data: {
            ipv4: ipInfo.ipv4,
            ipv6: ipInfo.ipv6,
            local: ipInfo.local,
            hasIPv6Connectivity: hasIPv6,
            url: window.location.href,
            timestamp: Date.now()
          }
        });
      } catch (error) {
        console.error('Failed to send IP info to background:', error);
      }
    }
  }
  
})();
