// Буфер накопленных ссылок
let pendingLinks = [];
let autoSaveTimer = null;

// Загружаем существующие ссылки при старте
chrome.storage.local.get(['savedLinks'], (result) => {
  pendingLinks = result.savedLinks || [];
});

// Принимаем сообщения от content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveLink') {
    addLink(message);
    sendResponse({ success: true });
  }

  if (message.action === 'getLinks') {
    sendResponse({ links: pendingLinks });
  }

  if (message.action === 'clearLinks') {
    pendingLinks = [];
    chrome.storage.local.set({ savedLinks: [] });
    sendResponse({ success: true });
  }

  if (message.action === 'exportToFile') {
    downloadLinksFile();
    sendResponse({ success: true });
  }

  return true;
});

function addLink(data) {
  const entry = {
    url: data.url,
    title: data.title,
    timestamp: data.timestamp,
    fromPage: data.pageTitle,
    fromUrl: data.pageUrl
  };

  // Не дублируем одинаковые URL
  const alreadyExists = pendingLinks.some(l => l.url === data.url);
  if (!alreadyExists) {
    pendingLinks.push(entry);
    chrome.storage.local.set({ savedLinks: pendingLinks });

    // Показываем уведомление
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: '🔗 Ссылка сохранена',
      message: data.url.length > 80 ? data.url.substring(0, 80) + '...' : data.url,
      silent: false
    });

    // Автосохранение в файл если накопилось 10+ ссылок
    if (pendingLinks.length % 10 === 0) {
      downloadLinksFile();
    }
  } else {
    // Ссылка уже есть — тихое уведомление
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: '⚠️ Уже сохранена',
      message: 'Эта ссылка уже есть в списке',
      silent: true
    });
  }
}

function downloadLinksFile() {
  if (pendingLinks.length === 0) return;

  const now = new Date();
  // Дата в формате ГГГГ-ММ-ДД для имени файла
  const dateStr = now.toISOString().slice(0, 10);

  let content = `# Сохранённые ссылки — ${now.toLocaleString('ru-RU')}\n`;
  content += `# Всего: ${pendingLinks.length} ссылок\n\n`;

  pendingLinks.forEach((link, i) => {
    const date = new Date(link.timestamp).toLocaleString('ru-RU');
    content += `${i + 1}. ${link.url}\n`;
    if (link.title && link.title !== link.url) {
      content += `   Текст: ${link.title}\n`;
    }
    content += `   Со страницы: ${link.fromPage || link.fromUrl}\n`;
    content += `   Дата: ${date}\n\n`;
  });

  // В MV3 service worker нет Blob/URL.createObjectURL — используем data URI
  const base64 = btoa(unescape(encodeURIComponent(content)));
  const dataUrl = `data:text/plain;charset=utf-8;base64,${base64}`;

  chrome.downloads.download({
    url: dataUrl,
    filename: `saved-links-${dateStr}.txt`,
    saveAs: false
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('Download error:', chrome.runtime.lastError.message);
    }
  });
}
