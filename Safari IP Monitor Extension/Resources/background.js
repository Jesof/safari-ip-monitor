// Safari IP Monitor - Background Service Worker
// Отслеживает сетевые запросы и собирает информацию о соединениях

// Хранилище данных о соединениях для каждой вкладки
const tabData = new Map();

// Кэш DNS результатов (домен -> {ipv4: [], ipv6: [], timestamp})
const dnsCache = new Map();
const DNS_CACHE_TTL = 300000; // 5 минут

// Информация о публичном IP пользователя (через WebRTC)
let userPublicIP = {
  ipv4: null,
  ipv6: null,
  hasIPv6Connectivity: false,
  timestamp: null
};

// Восстановление данных из storage при пробуждении service worker
async function restoreTabData() {
  try {
    // Пытаемся использовать session storage, если недоступен - используем local
    const storage = browser.storage.session || browser.storage.local;
    const result = await storage.get('tabData');
    if (result.tabData) {
      const stored = JSON.parse(result.tabData);
      const now = Date.now();
      const MAX_AGE = 1800000; // 30 минут - максимальный возраст данных
      
      for (const [tabId, data] of Object.entries(stored)) {
        // Проверяем актуальность данных (не старше 5 минут)
        if (data.timestamp && (now - data.timestamp) > MAX_AGE) {
          continue; // Пропускаем устаревшие данные
        }
        
        const restored = {
          domains: new Map(data.domains.map(d => [d.domain, {
            ...d,
            types: new Set(d.types)
          }])),
          mainDomain: data.mainDomain,
          url: data.url,
          timestamp: data.timestamp
        };
        tabData.set(parseInt(tabId), restored);
      }
    }
  } catch (error) {
    console.log('Не удалось восстановить данные:', error);
  }
}

// Сохранение данных в storage
async function saveTabData() {
  try {
    const toStore = {};
    for (const [tabId, data] of tabData.entries()) {
      toStore[tabId] = {
        domains: Array.from(data.domains.values()).map(d => ({
          ...d,
          types: Array.from(d.types)
        })),
        mainDomain: data.mainDomain,
        url: data.url,
        timestamp: data.timestamp
      };
    }
    // Пытаемся использовать session storage, если недоступен - используем local
    const storage = browser.storage.session || browser.storage.local;
    await storage.set({ tabData: JSON.stringify(toStore) });
  } catch (error) {
    console.log('Не удалось сохранить данные:', error);
  }
}

// Инициализация при установке
browser.runtime.onInstalled.addListener(() => {
  console.log('Safari IP Monitor установлен');
});

// Восстановление данных при запуске
restoreTabData();

// Обработка запросов перед отправкой
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    const { tabId, url, type, initiator, documentUrl, originUrl } = details;
    
    if (tabId < 0) return; // Игнорируем фоновые запросы
    
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const protocol = urlObj.protocol.replace(':', '');
      
      // Отладка: логируем все запросы к fonts.googleapis.com
      if (domain.includes('googleapis')) {
        console.log('🔍 Запрос к Google API:', {
          domain,
          url,
          type,
          tabId,
          initiator,
          documentUrl
        });
      }
      
      // Игнорируем запросы от самого расширения
      if (initiator && (initiator.startsWith('safari-web-extension://') || initiator.startsWith('safari-extension://'))) {
        return;
      }
      
      // Дополнительная проверка через documentUrl
      if (documentUrl && (documentUrl.startsWith('safari-web-extension://') || documentUrl.startsWith('safari-extension://'))) {
        return;
      }
      
      // Игнорируем запросы расширения через originUrl
      if (originUrl && (originUrl.startsWith('safari-web-extension://') || originUrl.startsWith('safari-extension://'))) {
        return;
      }
      
      // Игнорируем служебные домены используемые расширением
      const EXTENSION_DOMAINS = ['dns.google', 'stun.l.google.com', 'stun1.l.google.com', 'stun2.l.google.com', 
                                  'stun3.l.google.com', 'stun4.l.google.com', 'ipv6.google.com'];
      if (EXTENSION_DOMAINS.includes(domain)) {
        return;
      }
      
      // Инициализируем данные для вкладки если нужно
      if (!tabData.has(tabId)) {
        tabData.set(tabId, {
          domains: new Map(),
          mainDomain: null,
          url: null,
          timestamp: Date.now()
        });
      }
      
      const data = tabData.get(tabId);
      
      // Сохраняем главный домен (первый запрос типа main_frame)
      if (type === 'main_frame') {
        data.mainDomain = domain;
        data.url = url;
        data.timestamp = Date.now();
      }
      
      // Обновляем или создаем запись для домена
      if (!data.domains.has(domain)) {
        data.domains.set(domain, {
          domain: domain,
          protocol: protocol,
          isSecure: protocol === 'https',
          requestCount: 0,
          types: new Set(),
          ipv6Support: null // null = неизвестно, true/false = известно
        });
      }
      
      const domainData = data.domains.get(domain);
      domainData.requestCount++;
      domainData.types.add(type);
      
      // Отладка: логируем добавление доменов
      if (domain.includes('googleapis') || domain.includes('google')) {
        console.log('✅ Домен добавлен:', domain, 'запросов:', domainData.requestCount, 'типы:', Array.from(domainData.types));
      }
      
      // Сохраняем данные в storage
      saveTabData();
      
      // Уведомляем popup об обновлении данных (если открыт)
      notifyPopupUpdate(tabId);
      
    } catch (error) {
      console.error('Ошибка обработки запроса:', error);
    }
  },
  { urls: ['<all_urls>'] }
);

// Обработка завершенных запросов (можно получить дополнительную информацию)
browser.webRequest.onCompleted.addListener(
  (details) => {
    const { tabId } = details;
    
    if (tabId < 0) return;
    
    // Обновляем иконку для вкладки
    updateTabIcon(tabId);
  },
  { urls: ['<all_urls>'] }
);

// Уведомление popup об обновлении данных
function notifyPopupUpdate(tabId) {
  // Отправляем сообщение в runtime для всех слушателей (включая popup)
  browser.runtime.sendMessage({
    type: 'TAB_DATA_UPDATED',
    tabId: tabId
  }).catch(() => {
    // Popup может быть закрыт, игнорируем ошибку
  });
}

// Обновление иконки расширения в зависимости от статуса соединений
async function updateTabIcon(tabId) {
  if (!tabData.has(tabId)) {
    return;
  }
  
  const data = tabData.get(tabId);
  
  // Проверяем реальное состояние всех доменов
  let hasAnySecure = false;
  let hasAnyInsecure = false;
  
  for (const domainData of data.domains.values()) {
    if (domainData.protocol === 'https') {
      hasAnySecure = true;
    } else if (domainData.protocol === 'http') {
      hasAnyInsecure = true;
    }
  }
  
  try {
    // Safari не поддерживает изменение цвета badge - используем только title
    if (hasAnySecure && !hasAnyInsecure) {
      // Все соединения защищены
      await browser.action.setBadgeText({ tabId, text: '' });
      await browser.action.setTitle({ 
        tabId, 
        title: browser.i18n.getMessage('allConnectionsSecure')
      });
    } else if (hasAnyInsecure) {
      // Есть незащищенные соединения
      await browser.action.setBadgeText({ tabId, text: '' });
      await browser.action.setTitle({ 
        tabId, 
        title: browser.i18n.getMessage('insecureConnectionsDetected')
      });
    } else {
      // Нет данных
      await browser.action.setBadgeText({ tabId, text: '' });
      await browser.action.setTitle({ 
        tabId, 
        title: 'Safari IP Monitor' 
      });
    }
  } catch (error) {
    console.error('Ошибка обновления иконки:', error);
  }
}

// Очистка данных при закрытии вкладки
browser.tabs.onRemoved.addListener((tabId) => {
  tabData.delete(tabId);
  // DNS кэш сохраняем для производительности
});

// Очистка данных при обновлении вкладки
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    // Новая навигация или обновление - очищаем старые данные
    tabData.delete(tabId);
    saveTabData();
    
    // Сбрасываем badge
    browser.action.setBadgeText({ tabId, text: '' }).catch(() => {});
    browser.action.setTitle({ 
      tabId, 
      title: 'Safari IP Monitor' 
    }).catch(() => {});
  }
});

// API для получения данных из popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Получение публичного IP пользователя от content script
  if (message.type === 'USER_IP_DETECTED') {
    userPublicIP = {
      ipv4: message.data.ipv4,
      ipv6: message.data.ipv6,
      hasIPv6Connectivity: message.data.hasIPv6Connectivity,
      timestamp: message.data.timestamp
    };
    
    console.log('Публичный IP пользователя:', userPublicIP);
    return false; // Синхронный ответ
  }
  
  if (message.action === 'getTabData') {
    const { tabId } = message;
    
    // Восстанавливаем данные из storage если их нет в памяти
    if (!tabData.has(tabId)) {
      restoreTabData().then(async () => {
        if (tabData.has(tabId)) {
          // Проверяем, что URL вкладки совпадает с сохраненным
          try {
            const tab = await browser.tabs.get(tabId);
            const data = tabData.get(tabId);
            
            // Если URL изменился - данные устарели, удаляем их
            if (data.url && tab.url && !tab.url.startsWith(data.url.split('?')[0])) {
              tabData.delete(tabId);
              saveTabData();
              sendResponse({
                success: false,
                data: null
              });
              return;
            }
            
            const domains = Array.from(data.domains.values()).map(d => ({
              ...d,
              types: Array.from(d.types)
            }));
            
            sendResponse({
              success: true,
              data: {
                domains,
                mainDomain: data.mainDomain,
                userPublicIP: userPublicIP
              }
            });
          } catch (error) {
            console.log('Ошибка проверки URL вкладки:', error);
            sendResponse({
              success: false,
              data: null
            });
          }
        } else {
          sendResponse({
            success: false,
            data: null
          });
        }
      });
      return true; // Асинхронный ответ
    }
    
    if (tabData.has(tabId)) {
      const data = tabData.get(tabId);
      // Конвертируем Map в массив для передачи
      const domains = Array.from(data.domains.values()).map(d => ({
        ...d,
        types: Array.from(d.types)
      }));
      
      sendResponse({
        success: true,
        data: {
          domains,
          mainDomain: data.mainDomain,
          userPublicIP: userPublicIP // Добавляем информацию о публичном IP
        }
      });
    } else {
      sendResponse({
        success: false,
        data: null
      });
    }
    
    return true; // Асинхронный ответ
  }
  
  // Проверка IPv6 поддержки для домена (обратная совместимость)
  if (message.action === 'checkIPv6Support') {
    const { domain, tabId } = message;
    
    checkIPv6Support(domain).then(supported => {
      // Обновляем кэш
      if (tabData.has(tabId)) {
        const data = tabData.get(tabId);
        if (data.domains.has(domain)) {
          data.domains.get(domain).ipv6Support = supported;
        }
      }
      
      sendResponse({ success: true, supported });
    }).catch(error => {
      console.error('Ошибка проверки IPv6:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Асинхронный ответ
  }
  
  // Резолюция IP адресов для домена
  if (message.action === 'resolveIPs') {
    const { domain, tabId } = message;
    
    // Проверяем настройку DNS резолва
    browser.storage.local.get(['dnsResolveEnabled', 'dnsExcludeLocal']).then(result => {
      const dnsEnabled = result.dnsResolveEnabled !== undefined ? result.dnsResolveEnabled : true;
      const excludeLocalDomains = result.dnsExcludeLocal !== undefined ? result.dnsExcludeLocal : true;
      
      if (!dnsEnabled) {
        // DNS резолв выключен - возвращаем пустой результат
        sendResponse({ success: true, ips: { ipv4: [], ipv6: [], timestamp: Date.now() } });
        return;
      }
      
      // DNS резолв включен - выполняем резолюцию
      resolveIPAddresses(domain, { excludeLocalDomains }).then(ips => {
        // Обновляем кэш
        if (tabData.has(tabId)) {
          const data = tabData.get(tabId);
          if (data.domains.has(domain)) {
            const domainData = data.domains.get(domain);
            domainData.ipAddresses = ips;
            domainData.ipv6Support = ips.ipv6.length > 0;
          }
        }
        
        sendResponse({ success: true, ips });
      }).catch(error => {
        console.error('Ошибка резолюции IP:', error);
        sendResponse({ success: false, error: error.message });
      });
    });
    
    return true; // Асинхронный ответ
  }

  // Очистка DNS кэша и IP данных (для обновления после смены настроек)
  if (message.action === 'clearDnsCache') {
    const { tabId } = message;
    
    dnsCache.clear();
    
    if (tabId && tabData.has(tabId)) {
      const data = tabData.get(tabId);
      for (const domainData of data.domains.values()) {
        delete domainData.ipAddresses;
        domainData.ipv6Support = null;
      }
    }
    
    sendResponse({ success: true });
    return false;
  }
});

// Проверка является ли домен локальным
function isLocalDomain(domain) {
  // Localhost
  if (domain === 'localhost' || domain === '127.0.0.1' || domain === '::1') {
    return true;
  }
  
  // .local, .home, .lan, .internal, .lab TLDs
  if (domain.endsWith('.local') || domain.endsWith('.home') || 
      domain.endsWith('.lan') || domain.endsWith('.internal') ||
      domain.endsWith('.lab')) {
    return true;
  }
  
  // Приватные IP диапазоны
  const ipv4Regex = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/;
  const match = domain.match(ipv4Regex);
  if (match) {
    const [, a, b, c, d] = match.map(Number);
    // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16
    if (a === 10 || 
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 169 && b === 254)) {
      return true;
    }
  }
  
  // IPv6 link-local (fe80::), unique local (fc00::/7)
  if (domain.startsWith('fe80:') || domain.startsWith('fc') || domain.startsWith('fd')) {
    return true;
  }
  
  return false;
}

// Резолюция IP адресов через системный резолвер (native)
// Примечание: Safari не предоставляет прямой доступ к фактически использованным IP
// Эта функция показывает все доступные IP адреса домена через DNS
async function resolveIPAddresses(domain, options = {}) {
  try {
    const { excludeLocalDomains = true } = options;
    const isLocal = isLocalDomain(domain);
    
    // Если исключение включено и домен локальный — не используем кэш с IP
    if (excludeLocalDomains && isLocal) {
      const results = {
        ipv4: [],
        ipv6: [],
        isLocal: true,
        resolver: 'local',
        timestamp: Date.now()
      };
      dnsCache.set(domain, results);
      return results;
    }
    
    // Проверяем кэш
    const cached = dnsCache.get(domain);
    if (cached && (Date.now() - cached.timestamp) < DNS_CACHE_TTL) {
      if (cached.isLocal) {
        if (excludeLocalDomains) {
          return cached;
        }
        // Исключение выключено — не используем кэш локального домена
      } else {
        return cached;
      }
    }
    
    // Пытаемся использовать системный резолвер через native messaging
    const nativeResults = await resolveIPAddressesNative(domain);
    if (nativeResults) {
      cacheDNSResult(domain, nativeResults);
      return nativeResults;
    }
    
    // Fallback: DNS-over-HTTPS
    // Никогда не отправляем локальные домены в DoH
    if (isLocal) {
      const results = {
        ipv4: [],
        ipv6: [],
        isLocal: true,
        resolver: 'local',
        timestamp: Date.now()
      };
      cacheDNSResult(domain, results);
      return results;
    }
    
    const dohResults = await resolveIPAddressesDoH(domain);
    cacheDNSResult(domain, dohResults);
    return dohResults;
    
  } catch (error) {
    console.log('Ошибка DNS lookup:', error);
    return { ipv4: [], ipv6: [], resolver: 'unknown', timestamp: Date.now() };
  }
}

// Резолюция через нативный системный резолвер
async function resolveIPAddressesNative(domain) {
  if (!browser?.runtime?.sendNativeMessage) {
    return null;
  }
  
  const message = { name: 'performDNSLookup', domain };
  
  try {
    const response = await sendNativeMessage(message);
    if (!response || response.error) {
      if (response?.error) {
        console.log('Native DNS error:', response.error);
      }
      return null;
    }
    
    return {
      ipv4: Array.isArray(response.ipv4) ? response.ipv4 : [],
      ipv6: Array.isArray(response.ipv6) ? response.ipv6 : [],
      isLocal: false,
      resolver: 'system',
      timestamp: Date.now()
    };
  } catch (error) {
    console.log('Native DNS lookup failed:', error);
    return null;
  }
}

// Резолюция IP через DNS-over-HTTPS (fallback)
async function resolveIPAddressesDoH(domain) {
  if (isLocalDomain(domain)) {
    return {
      ipv4: [],
      ipv6: [],
      isLocal: true,
      resolver: 'local',
      timestamp: Date.now()
    };
  }
  const results = {
    ipv4: [],
    ipv6: [],
    isLocal: false,
    resolver: 'doh',
    timestamp: Date.now()
  };
  
  // Параллельные запросы для IPv4 и IPv6
  const [ipv4Response, ipv6Response] = await Promise.all([
    fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
      { method: 'GET', headers: { 'Accept': 'application/dns-json' } }
    ).catch(() => null),
    fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=AAAA`,
      { method: 'GET', headers: { 'Accept': 'application/dns-json' } }
    ).catch(() => null)
  ]);
  
  // Обработка IPv4 (A записи)
  if (ipv4Response?.ok) {
    const ipv4Data = await ipv4Response.json();
    if (ipv4Data.Answer) {
      results.ipv4 = ipv4Data.Answer
        .filter(a => a.type === 1) // Тип A
        .map(a => a.data);
    }
  }
  
  // Обработка IPv6 (AAAA записи)
  if (ipv6Response?.ok) {
    const ipv6Data = await ipv6Response.json();
    if (ipv6Data.Answer) {
      results.ipv6 = ipv6Data.Answer
        .filter(a => a.type === 28) // Тип AAAA
        .map(a => a.data);
    }
  }
  
  return results;
}

// Единая точка отправки native сообщений (совместимость)
async function sendNativeMessage(message) {
  if (typeof browser?.runtime?.sendNativeMessage !== 'function') {
    throw new Error('sendNativeMessage not available');
  }
  
  // Если API требует appId, пробуем его; иначе отправляем только сообщение
  if (browser.runtime.sendNativeMessage.length >= 2) {
    return browser.runtime.sendNativeMessage('ru.jesof.safari.ipmonitor.extension', message);
  }
  
  return browser.runtime.sendNativeMessage(message);
}

function cacheDNSResult(domain, results) {
  dnsCache.set(domain, results);
  
  // Очистка старых записей кэша (максимум 100 доменов)
  if (dnsCache.size > 100) {
    const oldestKey = dnsCache.keys().next().value;
    dnsCache.delete(oldestKey);
  }
}

// Обратная совместимость: проверка только IPv6
async function checkIPv6Support(domain) {
  const ips = await resolveIPAddresses(domain);
  return ips.ipv6.length > 0;
}

// Экспорт функций для тестирования (если нужно)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { checkIPv6Support, resolveIPAddresses };
}
