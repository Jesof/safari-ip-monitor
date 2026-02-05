// Safari IP Monitor - Content Script
// Определяет публичный IP пользователя через WebRTC

(async function() {
  'use strict';

  function isValidIPv4(ip) {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
      if (!/^\d{1,3}$/.test(part)) return false;
      const num = Number(part);
      return num >= 0 && num <= 255;
    });
  }

  function isPrivateOrReservedIPv4(ip) {
    if (!isValidIPv4(ip)) return true;
    const [a, b] = ip.split('.').map(Number);

    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT

    return false;
  }

  function normalizeIPv6(ip) {
    return ip.split('%')[0].toLowerCase();
  }

  function isValidIPv6(ip) {
    if (!ip || ip.indexOf(':') === -1) return false;
    return /^[0-9a-f:]+$/i.test(ip);
  }

  function isPrivateOrReservedIPv6(ip) {
    const normalized = normalizeIPv6(ip);

    if (!isValidIPv6(normalized)) return true;
    if (normalized === '::1') return true;
    if (normalized.startsWith('fe80:')) return true; // link-local
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // ULA
    if (normalized.startsWith('2001:db8')) return true; // documentation

    return false;
  }

  function getCandidateAddress(candidate) {
    const parts = candidate.trim().split(/\s+/);
    if (parts.length >= 6) {
      return parts[4];
    }
    return null;
  }
  
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
          const address = getCandidateAddress(candidate);

          if (!address) {
            return;
          }

          if (address.includes('.')) {
            if (!isValidIPv4(address)) {
              return;
            }

            if (isPrivateOrReservedIPv4(address)) {
              result.local.push(address);
              return;
            }

            result.ipv4 = address;
            return;
          }

          if (address.includes(':')) {
            const normalized = normalizeIPv6(address);
            if (isPrivateOrReservedIPv6(normalized)) {
              result.local.push(normalized);
              return;
            }

            result.ipv6 = normalized;
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
