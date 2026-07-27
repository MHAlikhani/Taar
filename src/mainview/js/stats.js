'use strict';

const Stats = (() => {
  let sentEl = null;
  let skippedEl = null;
  let errorEl = null;
  let pendingRaf = null;
  let pendingStats = null;

  function init(sent, skipped, errors) {
    sentEl = sent;
    skippedEl = skipped;
    errorEl = errors;
  }

  function render() {
    if (!pendingStats) return;
    applyValue(sentEl, pendingStats.sent);
    applyValue(skippedEl, pendingStats.skipped);
    applyValue(errorEl, pendingStats.errors);
    pendingStats = null;
    pendingRaf = null;
  }

  function applyValue(el, value) {
    const current = parseInt(el.textContent, 10) || 0;
    if (current !== value) {
      el.textContent = String(value);
      el.classList.remove('pulse');
      void el.offsetWidth;
      el.classList.add('pulse');
    }
  }

  function update(stats) {
    pendingStats = stats;
    if (!pendingRaf) {
      pendingRaf = requestAnimationFrame(render);
    }
  }

  function reset() {
    if (sentEl) sentEl.textContent = '0';
    if (skippedEl) skippedEl.textContent = '0';
    if (errorEl) errorEl.textContent = '0';
  }

  return { init, update, reset };
})();

window.Stats = Stats;
