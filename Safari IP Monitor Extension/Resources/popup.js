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
const dnsResolveToggle = document.getElementById('dns-resolve-toggle');

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Применяем локализацию
    applyLocalization();
    
    // Загружаем настройки
    await loadSettings();
    
    // Обработчик переключателя DNS
    dnsResolveToggle.addEventListener('change', async () => {
      await saveSetting('dnsResolveEnabled', dnsResolveToggle.checked);
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
        
        if (response.success && response.data && response.data.domains.length > 0) {
          displayData(response.data, tabs[0].id);
        } else {
          showNoData();
        }
      }
    });
    
    // Получаем текущую вкладку
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      showNoData();
      return;
    }
    
    const currentTab = tabs[0];
    
    // Запрашиваем данные у background script
    const response = await browser.runtime.sendMessage({
      action: 'getTabData',
      tabId: currentTab.id
    });
    
    if (response.success && response.data && response.data.domains.length > 0) {
      console.log('📊 Получено доменов:', response.data.domains.length);
      console.log('Домены:', response.data.domains.map(d => d.domain));
      displayData(response.data, currentTab.id);
    } else {
      console.log('❌ Нет данных для отображения');
      showNoData();
    }
    
  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
    showNoData();
  }
});

// Загрузка настроек
async function loadSettings() {
  const result = await browser.storage.local.get('dnsResolveEnabled');
  // По умолчанию включено
  const enabled = result.dnsResolveEnabled !== undefined ? result.dnsResolveEnabled : true;
  dnsResolveToggle.checked = enabled;
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
  
  const { domains, mainDomain, userPublicIP } = data;
  
  // Вычисляем статус безопасности из доменов
  const hasSecure = domains.some(d => d.protocol === 'https');
  const hasInsecure = domains.some(d => d.protocol === 'http');
  
  // Отображаем публичный IP пользователя (если есть)
  if (userPublicIP && (userPublicIP.ipv4 || userPublicIP.ipv6)) {
    displayUserPublicIP(userPublicIP);
  }
  
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
    secureStatusEl.textContent = '⚠ Смешанный';
    secureStatusEl.className = 'stat-value mixed';
  } else {
    secureStatusEl.textContent = '-';
    secureStatusEl.className = 'stat-value';
  }
  
  // Сортируем домены: главный первым, затем по количеству запросов
  domains.sort((a, b) => {
    if (a.domain === mainDomain) return -1;
    if (b.domain === mainDomain) return 1;
    return b.requestCount - a.requestCount;
  });
  
  // Заполняем таблицу
  tableBody.innerHTML = '';
  domains.forEach(domain => {
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
    container.innerHTML = '<span class="ip-loading">⏳ Загрузка...</span>';
    
    resolveIPAddresses(domain, tabId).then(ips => {
      updateIPAddressesView(container, ips, domain);
    }).catch(() => {
      container.innerHTML = '<span class="ip-error">⚠️ Ошибка</span>';
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
    container.innerHTML = '<span class="ip-local">🏠 Локальный домен</span>';
    return;
  }
  
  const hasIPv4 = ips.ipv4 && ips.ipv4.length > 0;
  const hasIPv6 = ips.ipv6 && ips.ipv6.length > 0;
  
  if (!hasIPv4 && !hasIPv6) {
    container.innerHTML = '<span class="ip-none">? Неизвестно</span>';
    return;
  }
  
  // IPv4 адреса
  if (hasIPv4) {
    const ipv4Section = document.createElement('div');
    ipv4Section.className = 'ip-section ipv4-section';
    
    const ipv4Label = document.createElement('span');
    ipv4Label.className = 'ip-label';
    ipv4Label.textContent = 'IPv4:';
    ipv4Section.appendChild(ipv4Label);
    
    const ipv4List = document.createElement('div');
    ipv4List.className = 'ip-list';
    
    ips.ipv4.forEach((ip) => {
      const ipSpan = document.createElement('span');
      ipSpan.className = 'ip-address ipv4-address';
      ipSpan.textContent = ip;
      ipSpan.title = `Кликните чтобы скопировать ${ip}`;
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
    
    const ipv6Label = document.createElement('span');
    ipv6Label.className = 'ip-label';
    ipv6Label.textContent = 'IPv6:';
    ipv6Section.appendChild(ipv6Label);
    
    const ipv6List = document.createElement('div');
    ipv6List.className = 'ip-list';
    
    ips.ipv6.forEach((ip) => {
      const ipSpan = document.createElement('span');
      ipSpan.className = 'ip-address ipv6-address';
      ipSpan.textContent = ip;
      ipSpan.title = `Кликните чтобы скопировать ${ip}`;
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

// Резолюция IP адресов для домена
async function resolveIPAddresses(domain, tabId) {
  try {
    const response = await browser.runtime.sendMessage({
      action: 'resolveIPs',
      domain: domain,
      tabId: tabId
    });
    
    return response.success ? response.ips : null;
  } catch (error) {
    console.error('Ошибка резолюции IP:', error);
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
        ${userIP.hasIPv6Connectivity ? '<span class="ipv6-enabled">✓ IPv6 активен</span>' : ''}
      </div>
    </div>
  `;
}

// Обработка события копирования для визуальной обратной связи
document.addEventListener('copied', (event) => {
  // Можно добавить toast уведомление
  console.log('Копирование успешно:', event.detail);
});
