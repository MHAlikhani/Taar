'use strict';

const Controls = (() => {
  let els = {};

  function init(elements) {
    els = elements;
  }

  function setStatus(state, text) {
    if (els.statusBadge) {
      els.statusBadge.dataset.state = state;
      const txt = els.statusBadge.querySelector('.status-text');
      if (txt) txt.textContent = text;
    }
  }

  function setLaunchBusy(busy, label) {
    if (!els.launchBtn) return;
    els.launchBtn.disabled = busy;
    const icon = els.launchBtn.querySelector('.btn-icon');
    const labelEl = els.launchBtn.querySelector('.btn-label');
    if (busy) {
      if (icon) icon.classList.add('spinning');
      if (labelEl) labelEl.textContent = label || 'Launching...';
    } else {
      if (icon) icon.classList.remove('spinning');
      if (labelEl) labelEl.textContent = 'Launch Browser';
    }
  }

  function setLaunchReady(launched) {
    if (!els.launchBtn) return;
    if (launched) {
      // Stay clickable: acts as a force-restart for stale sessions
      els.launchBtn.disabled = false;
      const labelEl = els.launchBtn.querySelector('.btn-label');
      const icon = els.launchBtn.querySelector('.btn-icon');
      if (labelEl) labelEl.textContent = 'Restart Browser';
      if (icon) {
        icon.classList.remove('spinning');
        icon.textContent = '↻';
      }
    } else {
      els.launchBtn.disabled = false;
      const labelEl = els.launchBtn.querySelector('.btn-label');
      const icon = els.launchBtn.querySelector('.btn-icon');
      if (labelEl) labelEl.textContent = 'Launch Browser';
      if (icon) {
        icon.classList.remove('spinning');
        icon.textContent = '▶';
      }
    }
  }

  function setStartEnabled(enabled) {
    if (els.startBtn) els.startBtn.disabled = !enabled;
  }

  function setStopEnabled(enabled) {
    if (els.stopBtn) els.stopBtn.disabled = !enabled;
  }

  function getOptions() {
    const maxRequests = parseInt(els.maxRequests?.value, 10);
    if (isNaN(maxRequests) || maxRequests < 1 || maxRequests > 100) {
      throw new Error('Max requests must be between 1 and 100');
    }
    const addNote = els.addNote?.checked || false;
    const noteText = (els.noteText?.value || '').trim();
    if (addNote && noteText.length === 0) {
      throw new Error('Please enter a note or uncheck "Include personalized note"');
    }
    return { maxRequests, addNote, noteText };
  }

  return {
    init, setStatus, setLaunchBusy, setLaunchReady,
    setStartEnabled, setStopEnabled, getOptions
  };
})();

window.Controls = Controls;
