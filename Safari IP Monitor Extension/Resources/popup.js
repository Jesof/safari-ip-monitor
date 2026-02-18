// Safari IP Monitor - Popup Script
// Отображает собранную информацию о соединениях

// Элементы DOM
const loadingEl = document.getElementById('loading');
const noDataEl = document.getElementById('no-data');
const contentEl = document.getElementById('content');
const tableBody = document.getElementById('table-body');
const domainCountEl = document.getElementById('domain-count');
const requestCountEl = document.getElementById('request-count');
const secureStatusEl = document.getElementById('secure-status');
const dnsResolverStatusEl = document.getElementById('dns-resolver-status');
const dnsResolveToggle = document.getElementById('dns-resolve-toggle');
const dnsLocalExcludeToggle = document.getElementById('dns-local-exclude-toggle');
const settingsToggleButton = document.getElementById('settings-toggle');
const settingsPanel = document.getElementById('settings-panel');

// Текущая вкладка и интервал обновления
let currentTabId = null;
let updateInterval = null;

// Прослушивание сообщений от background script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TAB_DATA_UPDATED' && message.tabId === currentTabId) {
    // Обновляем данные без перезагрузки всего popup
    refreshData();
  }
});

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Применяем локализацию
    applyLocalization();
    
    // Загружаем настройки
    await loadSettings();
    
    // Обработчики переключателей настроек
    const handleSettingsChange = async () => {
      await saveSetting('dnsResolveEnabled', dnsResolveToggle.checked);
      await saveSetting('dnsExcludeLocal', dnsLocalExcludeToggle.checked);
      
      // Сбрасываем DNS кэш и IP данные для текущей вкладки
      const tabsForClear = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabsForClear && tabsForClear.length > 0) {
        await browser.runtime.sendMessage({
          action: 'clearDnsCache',
          tabId: tabsForClear[0].id
        });
      }
      
      // Очищаем и перезапрашиваем данные
      tableBody.innerHTML = '';
      loadingEl.style.display = 'flex';
      contentEl.style.display = 'none';
      noDataEl.style.display = 'none';
      
      // Перезапрашиваем данные
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0) {
        const response = await browser.runtime.sendMessage({
          action: 'getTabData',
          tabId: tabs[0].id
        });
        
        const hasUserIP = response?.data?.userPublicIP && (response.data.userPublicIP.ipv4 || response.data.userPublicIP.ipv6);
        if (response.success && response.data && (response.data.domains.length > 0 || hasUserIP)) {
          displayData(response.data, tabs[0].id);
        } else {
          showNoData();
        }
      }
    };
    
    dnsResolveToggle.addEventListener('change', handleSettingsChange);
    dnsLocalExcludeToggle.addEventListener('change', handleSettingsChange);
    
    // Получаем текущую вкладку
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      showNoData();
      return;
    }
    
    const currentTab = tabs[0];
    currentTabId = currentTab.id;
    
    // Запрашиваем данные у background script
    const response = await browser.runtime.sendMessage({
      action: 'getTabData',
      tabId: currentTab.id
    });
    
    const hasUserIP = response?.data?.userPublicIP && (response.data.userPublicIP.ipv4 || response.data.userPublicIP.ipv6);
    if (response.success && response.data && (response.data.domains.length > 0 || hasUserIP)) {
      console.log('📊 Получено доменов:', response.data.domains.length);
      console.log('Домены:', response.data.domains.map(d => d.domain));
      displayData(response.data, currentTab.id);
      
      // Запускаем автообновление каждые 2 секунды
      startAutoRefresh();
    } else {
      console.log('❌ Нет данных для отображения');
      showNoData();
    }
    
  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
    showNoData();
  }
});

// Переключение панели настроек
settingsToggleButton.addEventListener('click', () => {
  const isOpen = settingsPanel.classList.toggle('open');
  settingsToggleButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  settingsPanel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
});

// Загрузка настроек
async function loadSettings() {
  const result = await browser.storage.local.get(['dnsResolveEnabled', 'dnsExcludeLocal']);
  
  // По умолчанию DNS резолв включен
  const enabled = result.dnsResolveEnabled !== undefined ? result.dnsResolveEnabled : true;
  dnsResolveToggle.checked = enabled;
  
  // По умолчанию локальные домены исключены
  const excludeLocal = result.dnsExcludeLocal !== undefined ? result.dnsExcludeLocal : true;
  dnsLocalExcludeToggle.checked = excludeLocal;
}

// Сохранение настройки
async function saveSetting(key, value) {
  await browser.storage.local.set({ [key]: value });
}

// Применение локализации
function applyLocalization() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    const message = browser.i18n.getMessage(key);
    if (message) {
      el.textContent = message;
    }
  });
}

// Показать состояние "нет данных"
function showNoData() {
  loadingEl.style.display = 'none';
  contentEl.style.display = 'none';
  noDataEl.style.display = 'flex';
}

// Отобразить данные
function displayData(data, tabId) {
  loadingEl.style.display = 'none';
  noDataEl.style.display = 'none';
  contentEl.style.display = 'block';
  
  const { domains: rawDomains, mainDomain, userPublicIP } = data;
  
  // Создаём копию массива для сортировки
  const domains = [...rawDomains];
  
  // Сортируем домены по количеству запросов (по убыванию)
  domains.sort((a, b) => (b.requestCount || 0) - (a.requestCount || 0));
  
  // Вычисляем статус безопасности из доменов
  const hasSecure = domains.some(d => d.protocol === 'https');
  const hasInsecure = domains.some(d => d.protocol === 'http');
  
  updateUserPublicIPSection(userPublicIP);
  updateDNSResolverStatus(domains);
  
  // Обновляем статистику
  const totalRequests = domains.reduce((sum, d) => sum + d.requestCount, 0);
  domainCountEl.textContent = domains.length;
  requestCountEl.textContent = totalRequests;
  
  // Статус безопасности
  if (hasSecure && !hasInsecure) {
    secureStatusEl.textContent = '✓ HTTPS';
    secureStatusEl.className = 'stat-value secure';
  } else if (hasInsecure && !hasSecure) {
    secureStatusEl.textContent = '✗ HTTP';
    secureStatusEl.className = 'stat-value insecure';
  } else if (hasSecure && hasInsecure) {
    secureStatusEl.textContent = '⚠ ' + browser.i18n.getMessage('statusMixed');
    secureStatusEl.className = 'stat-value mixed';
  } else {
    secureStatusEl.textContent = '-';
    secureStatusEl.className = 'stat-value';
  }
  
  // Заполняем таблицу
  tableBody.innerHTML = '';
  domains.forEach((domain, index) => {
    const row = createDomainRow(domain, mainDomain, tabId);
    tableBody.appendChild(row);
  });
}

// Создание строки таблицы для домена
function createDomainRow(domainData, mainDomain, tabId) {
  const { domain, protocol, isSecure, requestCount, ipAddresses } = domainData;
  
  const row = document.createElement('tr');
  if (domain === mainDomain) {
    row.classList.add('main-domain');
  }
  
  // Колонка домена
  const domainCell = document.createElement('td');
  domainCell.className = 'domain';
  domainCell.textContent = domain;
  domainCell.title = domain;
  domainCell.addEventListener('click', () => copyToClipboard(domain));
  row.appendChild(domainCell);
  
  // Колонка протокола
  const protocolCell = document.createElement('td');
  const protocolBadge = document.createElement('span');
  protocolBadge.className = `protocol-badge ${protocol}`;
  const icon = isSecure ? '🔒' : '⚠️';
  protocolBadge.innerHTML = `<span class="icon">${icon}</span> ${protocol.toUpperCase()}`;
  protocolCell.appendChild(protocolBadge);
  row.appendChild(protocolCell);
  
  // Колонка запросов
  const requestCell = document.createElement('td');
  requestCell.className = 'request-count';
  requestCell.textContent = requestCount;
  row.appendChild(requestCell);
  
  // Колонка IP адресов (заменяем старую колонку IPv6)
  const ipCell = document.createElement('td');
  ipCell.className = 'ip-addresses';
  const ipContainer = createIPAddressesView(domain, ipAddresses, tabId);
  ipCell.appendChild(ipContainer);
  row.appendChild(ipCell);
  
  return row;
}

// Создание представления IP адресов
function createIPAddressesView(domain, ipAddresses, tabId) {
  const container = document.createElement('div');
  container.className = 'ip-container';

  if (!ipAddresses) {
    // IP еще не загружены - запускаем загрузку
    container.innerHTML = '<span class="ip-loading">⏳ ' + browser.i18n.getMessage('ipLoading') + '</span>';

    resolveIPAddresses(domain, tabId)
      .then(ips => {
        updateIPAddressesView(container, ips, domain);
      })
      .catch(error => {
        console.error(`DNS error for ${domain}:`, error);
        container.innerHTML = '<span class="ip-error">⚠️ ' + browser.i18n.getMessage('ipError') + '</span>';
      });

  } else {
    updateIPAddressesView(container, ipAddresses, domain);
  }

  return container;
}

// Обновление отображения IP адресов
function updateIPAddressesView(container, ips, domain) {
  container.innerHTML = '';
  
  // Проверка на локальный домен
  if (ips.isLocal) {
    const localSpan = document.createElement('span');
    localSpan.className = 'ip-local';
    localSpan.textContent = '🏠 ' + browser.i18n.getMessage('ipLocal');
    container.appendChild(localSpan);
    return;
  }
  
  const hasIPv4 = ips.ipv4 && ips.ipv4.length > 0;
  const hasIPv6 = ips.ipv6 && ips.ipv6.length > 0;
  
  if (!hasIPv4 && !hasIPv6) {
    container.innerHTML = '<span class="ip-none">? ' + browser.i18n.getMessage('ipUnknown') + '</span>';
    return;
  }
  
  // IPv4 адреса
  if (hasIPv4) {
    const ipv4Section = document.createElement('div');
    ipv4Section.className = 'ip-section ipv4-section';
    
    const ipv4List = document.createElement('div');
    ipv4List.className = 'ip-list';
    
    ips.ipv4.forEach((ip) => {
      const ipSpan = document.createElement('span');
      ipSpan.className = 'ip-address ipv4-address';
      ipSpan.textContent = ip;
      ipSpan.title = browser.i18n.getMessage('clickToCopy') + ' ' + ip;
      ipSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(ip);
      });
      ipv4List.appendChild(ipSpan);
    });
    
    ipv4Section.appendChild(ipv4List);
    container.appendChild(ipv4Section);
  }
  
  // IPv6 адреса
  if (hasIPv6) {
    const ipv6Section = document.createElement('div');
    ipv6Section.className = 'ip-section ipv6-section';
    
    const ipv6List = document.createElement('div');
    ipv6List.className = 'ip-list';
    
    ips.ipv6.forEach((ip) => {
      const ipSpan = document.createElement('span');
      ipSpan.className = 'ip-address ipv6-address';
      ipSpan.textContent = ip;
      ipSpan.title = browser.i18n.getMessage('clickToCopy') + ' ' + ip;
      ipSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(ip);
      });
      ipv6List.appendChild(ipSpan);
    });
    
    ipv6Section.appendChild(ipv6List);
    container.appendChild(ipv6Section);
  }
}

function getResolverLabel(resolver) {
  switch (resolver) {
    case 'system':
      return browser.i18n.getMessage('resolverSystem');
    case 'doh':
      return browser.i18n.getMessage('resolverDoh');
    default:
      return browser.i18n.getMessage('resolverUnknown');
  }
}

function updateDNSResolverStatus(domains) {
  if (!dnsResolverStatusEl) return;

  const excludeLocalResolvers = dnsLocalExcludeToggle && dnsLocalExcludeToggle.checked;
  const resolvers = new Set();
  domains.forEach(domain => {
    const resolver = domain?.ipAddresses?.resolver;
    if (resolver) {
      if (excludeLocalResolvers && resolver === 'local') {
        return;
      }
      resolvers.add(resolver);
    }
  });

  dnsResolverStatusEl.className = 'stat-value dns-resolver';

  if (resolvers.size === 0) {
    dnsResolverStatusEl.textContent = '-';
    return;
  }

  if (resolvers.size === 1) {
    const resolver = Array.from(resolvers)[0];
    dnsResolverStatusEl.textContent = getResolverLabel(resolver);
    dnsResolverStatusEl.className = `stat-value dns-resolver resolver-badge resolver-${resolver}`;
    return;
  }

  const mixedLabel = browser.i18n.getMessage('dnsResolverMixed') || 'Mixed';
  dnsResolverStatusEl.textContent = mixedLabel;
  dnsResolverStatusEl.className = 'stat-value dns-resolver resolver-badge resolver-unknown';
}

// Резолюция IP адресов для домена
async function resolveIPAddresses(domain, tabId) {
  try {
    const response = await browser.runtime.sendMessage({
      action: 'resolveIPs',
      domain: domain,
      tabId: tabId
    });

    if (!response) {
      console.warn(`Пустой ответ при резолюции IP для ${domain}`);
      return null;
    }

    if (!response.success && response.error) {
      console.error(`Ошибка резолюции IP для ${domain}: ${response.error}`);
      return null;
    }

    return response.success ? response.ips : null;
  } catch (error) {
    // Игнорируем "Extension context invalidated" - это нормально при закрытии popup
    if (error.message !== 'Extension context invalidated.') {
      console.error('Ошибка резолюции IP:', error);
    }
    return null;
  }
}

// Проверка поддержки IPv6 для домена (обратная совместимость)
async function checkIPv6Support(domain, tabId) {
  const ips = await resolveIPAddresses(domain, tabId);
  return ips && ips.ipv6 && ips.ipv6.length > 0;
}

// Копирование в буфер обмена
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    
    // Показываем уведомление (можно улучшить)
    console.log(`Скопировано: ${text}`);
    
    // Визуальная обратная связь
    const event = new CustomEvent('copied', { detail: text });
    document.dispatchEvent(event);
    
  } catch (error) {
    console.error('Ошибка копирования:', error);
  }
}

// Отображение публичного IP пользователя
function displayUserPublicIP(userIP) {
  // Ищем или создаем секцию для публичного IP
  let userIPSection = document.querySelector('.user-ip-section');
  
  if (!userIPSection) {
    userIPSection = document.createElement('div');
    userIPSection.className = 'user-ip-section';
    
    // Вставляем перед статистикой
    const statsEl = document.querySelector('.stats');
    statsEl.parentNode.insertBefore(userIPSection, statsEl);
  }
  
  const ipInfo = [];
  if (userIP.ipv4) {
    ipInfo.push(`<span class="user-ip-label">Your IPv4:</span> <span class="user-ip-value">${userIP.ipv4}</span>`);
  }
  if (userIP.ipv6) {
    ipInfo.push(`<span class="user-ip-label">Your IPv6:</span> <span class="user-ip-value">${userIP.ipv6}</span>`);
  }
  
  userIPSection.innerHTML = `
    <div class="user-ip-content">
      <span class="user-ip-icon">🌐</span>
      <div class="user-ip-details">
        ${ipInfo.join('<br>')}
        ${userIP.ipv6 && userIP.hasIPv6Connectivity ? '<span class="ipv6-enabled">' + browser.i18n.getMessage('ipv6Active') + '</span>' : ''}
      </div>
    </div>
  `;
}

function updateUserPublicIPSection(userPublicIP) {
  if (userPublicIP && (userPublicIP.ipv4 || userPublicIP.ipv6)) {
    displayUserPublicIP(userPublicIP);
    return;
  }

  const existingSection = document.querySelector('.user-ip-section');
  if (existingSection) {
    existingSection.remove();
  }
}

// Обработка события копирования для визуальной обратной связи
document.addEventListener('copied', (event) => {
  // Можно добавить toast уведомление
  console.log('Копирование успешно:', event.detail);
});

// Запуск автообновления данных
function startAutoRefresh() {
  // Очищаем предыдущий интервал, если есть
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  // Обновляем каждые 2 секунды
  updateInterval = setInterval(() => {
    refreshData();
  }, 2000);
}

// Обновление данных без полной перезагрузки
async function refreshData() {
  if (!currentTabId) return;
  
  try {
    const response = await browser.runtime.sendMessage({
      action: 'getTabData',
      tabId: currentTabId
    });
    
    if (response.success && response.data) {
      // Обновляем данные и пересортируем
      updateDisplayData(response.data);
    }
  } catch (error) {
    console.error('Ошибка обновления данных:', error);
  }
}

// Обновление отображаемых данных (без полной перезагрузки)
function updateDisplayData(data) {
  const { domains: rawDomains, mainDomain, userPublicIP } = data;
  
  // Создаём копию массива для сортировки
  const domains = [...rawDomains];
  
  // Сортируем домены по количеству запросов (по убыванию)
  domains.sort((a, b) => (b.requestCount || 0) - (a.requestCount || 0));

  updateUserPublicIPSection(userPublicIP);
  updateDNSResolverStatus(domains);
  
  // Обновляем статистику
  const totalRequests = domains.reduce((sum, d) => sum + d.requestCount, 0);
  domainCountEl.textContent = domains.length;
  requestCountEl.textContent = totalRequests;
  
  // Вычисляем статус безопасности
  const hasSecure = domains.some(d => d.protocol === 'https');
  const hasInsecure = domains.some(d => d.protocol === 'http');
  
  if (hasSecure && !hasInsecure) {
    secureStatusEl.textContent = '✓ HTTPS';
    secureStatusEl.className = 'stat-value secure';
  } else if (hasInsecure && !hasSecure) {
    secureStatusEl.textContent = '✗ HTTP';
    secureStatusEl.className = 'stat-value insecure';
  } else if (hasSecure && hasInsecure) {
    secureStatusEl.textContent = '⚠ ' + browser.i18n.getMessage('statusMixed');
    secureStatusEl.className = 'stat-value mixed';
  } else {
    secureStatusEl.textContent = '-';
    secureStatusEl.className = 'stat-value';
  }
  
  // Обновляем таблицу только если порядок или содержимое изменились
  updateTable(domains, mainDomain);
}

// Обновление таблицы (сохраняя строки, только обновляя счетчики)
function updateTable(domains, mainDomain) {
  const currentRows = Array.from(tableBody.querySelectorAll('tr'));
  const currentDomains = currentRows.map(row => row.querySelector('.domain').textContent);
  const newDomains = domains.map(d => d.domain);
  
  // Проверяем, изменился ли порядок или список доменов
  const needsRebuild = currentDomains.length !== newDomains.length ||
    currentDomains.some((d, i) => d !== newDomains[i]);
  
  if (needsRebuild) {
    // Полная перестройка таблицы
    tableBody.innerHTML = '';
    domains.forEach(domain => {
      const row = createDomainRow(domain, mainDomain, currentTabId);
      tableBody.appendChild(row);
    });
  } else {
    // Обновляем только счетчики запросов
    currentRows.forEach((row, index) => {
      const requestCell = row.querySelector('.request-count');
      if (requestCell) {
        requestCell.textContent = domains[index].requestCount;
      }
    });
  }
}

// Очистка при закрытии popup
window.addEventListener('beforeunload', () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});
