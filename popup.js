function formatTime(isoString) {
  return new Date(isoString).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

function renderLinks(links) {
  const list = document.getElementById('linksList');
  const count = document.getElementById('count');

  count.textContent = links.length;

  if (links.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">🖱️</div>
        <p>Держи <b>Ctrl</b> и кликай на ссылки —<br>они будут собираться здесь,<br>без открытия вкладок.</p>
      </div>`;
    return;
  }

  const recent = [...links].reverse().slice(0, 50);

  list.innerHTML = recent.map((link) => `
    <div class="link-item" data-url="${link.url}">
      <div class="link-title">${link.title || 'Без названия'}</div>
      <div class="link-url">${link.url}</div>
      <div class="link-time">${formatTime(link.timestamp)} · ${link.fromPage || ''}</div>
    </div>
  `).join('');

  list.querySelectorAll('.link-item').forEach(item => {
    item.addEventListener('click', () => {
      chrome.tabs.create({ url: item.dataset.url });
    });
  });
}

// Загружаем ссылки при открытии попапа
chrome.runtime.sendMessage({ action: 'getLinks' }, (response) => {
  renderLinks(response.links || []);
});

// Кнопка экспорта — делаем скачивание прямо из popup (Blob работает здесь, не в service worker)
document.getElementById('exportBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'getLinks' }, (response) => {
    const links = response.links || [];
    if (links.length === 0) {
      alert('Список ссылок пуст!');
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);

    let content = `# Сохранённые ссылки — ${now.toLocaleString('ru-RU')}\n`;
    content += `# Всего: ${links.length} ссылок\n\n`;

    links.forEach((link, i) => {
      const date = new Date(link.timestamp).toLocaleString('ru-RU');
      content += `${i + 1}. ${link.url}\n`;
      if (link.title && link.title !== link.url) {
        content += `   Текст: ${link.title}\n`;
      }
      content += `   Со страницы: ${link.fromPage || link.fromUrl}\n`;
      content += `   Дата: ${date}\n\n`;
    });

    // Popup — обычный контекст, Blob работает нормально
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: url,
      filename: `saved-links-${dateStr}.txt`,
      saveAs: false
    }, () => {
      URL.revokeObjectURL(url);
      const btn = document.getElementById('exportBtn');
      btn.textContent = '✅ Файл скачан!';
      setTimeout(() => btn.textContent = '💾 Скачать .txt файл', 2000);
    });
  });
});

// Кнопка очистки
document.getElementById('clearBtn').addEventListener('click', () => {
  if (confirm('Очистить весь список ссылок?')) {
    chrome.runtime.sendMessage({ action: 'clearLinks' }, () => {
      renderLinks([]);
    });
  }
});
