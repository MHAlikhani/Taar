'use strict';

const Logger = (() => {
  const MAX_ENTRIES = 1000;
  const THROTTLE_MS = 50; // 20 msgs/sec max

  let container = null;
  let queue = [];
  let lastFlush = 0;
  let rafId = null;

  function init(containerEl) {
    container = containerEl;
    add('Ready. Click "Launch Browser" to begin.', 'system');
  }

  function timestamp() {
    const d = new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map(n => String(n).padStart(2, '0')).join(':');
  }

  function classify(text) {
    if (text.startsWith('✅') || /success/i.test(text)) return 'success';
    if (text.startsWith('❌') || /error/i.test(text))    return 'error';
    if (text.startsWith('⚠') || /warning/i.test(text))  return 'warning';
    if (text.startsWith('🧠') || /decision/i.test(text)) return 'decision';
    if (text.startsWith('🔹') || text.startsWith('🚀') ||
        text.startsWith('💾') || text.startsWith('📂'))  return 'system';
    return '';
  }

  function createEntry(text, type) {
    const el = document.createElement('div');
    el.className = `log-entry ${type || ''} animate-slide-in`;
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = `[${timestamp()}]`;
    el.appendChild(timeSpan);
    el.appendChild(document.createTextNode(' ' + text));
    return el;
  }

  function flush() {
    if (!container || queue.length === 0) return;
    const frag = document.createDocumentFragment();
    queue.forEach(item => frag.appendChild(createEntry(item.text, item.type)));
    container.appendChild(frag);
    while (container.children.length > MAX_ENTRIES) {
      container.removeChild(container.firstChild);
    }
    container.scrollTop = container.scrollHeight;
    queue = [];
  }

  function add(text, forceType) {
    if (!container) return;
    const type = forceType || classify(text);
    queue.push({ text, type });

    const now = performance.now();
    if (now - lastFlush >= THROTTLE_MS) {
      lastFlush = now;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(flush);
    } else if (!rafId) {
      rafId = requestAnimationFrame(() => {
        const elapsed = performance.now() - lastFlush;
        if (elapsed >= THROTTLE_MS) {
          lastFlush = performance.now();
          flush();
        }
        rafId = null;
      });
    }
  }

  function clear() {
    if (!container) return;
    container.innerHTML = '';
    queue = [];
    add('Log cleared.', 'system');
  }

  return { init, add, clear };
})();

window.Logger = Logger;
