// Перехватчик Ctrl+Click на всех страницах
document.addEventListener('click', function(e) {
  // Проверяем: зажат Ctrl И нажата левая кнопка мыши
  if (!e.ctrlKey || e.button !== 0) return;

  // Ищем ссылку — либо сам элемент, либо его родитель
  const link = e.target.closest('a');
  if (!link || !link.href) return;

  const url = link.href;

  // Игнорируем пустые и javascript: ссылки
  if (!url || url.startsWith('javascript:') || url === '#') return;

  // Блокируем стандартное поведение браузера (открытие в новой вкладке)
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  // Отправляем URL в background script для сохранения
  chrome.runtime.sendMessage({
    action: 'saveLink',
    url: url,
    title: link.textContent.trim() || link.title || url,
    timestamp: new Date().toISOString(),
    pageUrl: window.location.href,
    pageTitle: document.title
  });

}, true); // true = capture phase, чтобы поймать до других обработчиков
