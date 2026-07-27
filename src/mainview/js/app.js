'use strict';

(function () {
  const dom = {
    launchBtn: document.getElementById('launchBtn'),
    startBtn: document.getElementById('startBtn'),
    stopBtn: document.getElementById('stopBtn'),
    clearLogBtn: document.getElementById('clearLogBtn'),
    addNote: document.getElementById('addNote'),
    noteGroup: document.getElementById('noteGroup'),
    noteText: document.getElementById('noteText'),
    charCount: document.getElementById('charCount'),
    maxRequests: document.getElementById('maxRequests'),
    logContainer: document.getElementById('logContainer'),
    statusBadge: document.getElementById('statusBadge'),
    sentCount: document.getElementById('sentCount'),
    skippedCount: document.getElementById('skippedCount'),
    errorCount: document.getElementById('errorCount')
  };

  Logger.init(dom.logContainer);
  Stats.init(dom.sentCount, dom.skippedCount, dom.errorCount);
  Controls.init(dom);
  Controls.setStatus('ready', 'Ready');

  let isRunning = false;
  let isLaunching = false;

  dom.launchBtn.addEventListener('click', async () => {
    Controls.setLaunchBusy(true, 'Launching...');
    Controls.setStatus('running', 'Launching...');
    isLaunching = true;
    Logger.add('🔹 Launching browser process...', 'system');

    try {
      const result = await IpcService.startBrowser();
      isLaunching = false;
      if (result && result.success) {
        Controls.setLaunchReady(true);
        Controls.setStartEnabled(true);
        Controls.setStatus('ready', 'Browser Ready');
        Logger.add('✅ Browser launched. Please log in to LinkedIn and go to People Search.', 'success');
      } else {
        throw new Error(result?.error || 'Unknown error');
      }
    } catch (err) {
      isLaunching = false;
      Logger.add('❌ Launch failed: ' + err.message, 'error');
      Controls.setLaunchReady(false);
      Controls.setStatus('error', 'Launch Failed');
    }
  });

  dom.startBtn.addEventListener('click', async () => {
    let options;
    try {
      options = Controls.getOptions();
    } catch (err) {
      Logger.add('⚠️ ' + err.message, 'warning');
      return;
    }

    isRunning = true;
    Controls.setStartEnabled(false);
    Controls.setStopEnabled(true);
    Controls.setStatus('running', 'Running');
    Logger.add(`🚀 Starting automation: ${options.maxRequests} requests${options.addNote ? ' with note' : ''}`, 'system');

    try {
      const result = await IpcService.startAutomation(options);
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to start');
      }
    } catch (err) {
      Logger.add('❌ ' + err.message, 'error');
      isRunning = false;
      Controls.setStartEnabled(true);
      Controls.setStopEnabled(false);
      Controls.setStatus('error', 'Error');
    }
  });

  dom.stopBtn.addEventListener('click', async () => {
    Controls.setStopEnabled(false);
    Controls.setStatus('stopped', 'Stopping...');
    Logger.add('🛑 Requesting graceful stop...', 'warning');
    try {
      await IpcService.stopAutomation();
    } catch (err) {
      Logger.add('⚠️ Stop error: ' + err.message, 'warning');
    }
  });

  dom.clearLogBtn.addEventListener('click', () => {
    Logger.clear();
  });

  const guideDialog = document.getElementById('guideDialog');
  document.getElementById('guideBtn')?.addEventListener('click', () => {
    if (guideDialog && !guideDialog.open) guideDialog.showModal();
  });
  document.getElementById('guideCloseBtn')?.addEventListener('click', () => {
    guideDialog?.close();
  });
  guideDialog?.addEventListener('click', (e) => {
    if (e.target === guideDialog) guideDialog.close(); // click on backdrop
  });

  dom.addNote.addEventListener('change', () => {
    if (dom.addNote.checked) {
      dom.noteGroup.removeAttribute('hidden');
    } else {
      dom.noteGroup.setAttribute('hidden', '');
    }
  });

  dom.noteText.addEventListener('input', () => {
    const len = dom.noteText.value.length;
    dom.charCount.textContent = String(len);
    const counter = dom.charCount.parentElement;
    counter.classList.remove('warn', 'danger');
    if (len > 180) counter.classList.add('danger');
    else if (len > 150) counter.classList.add('warn');
  });

  function resetToReady(statusText) {
    isRunning = false;
    Controls.setLaunchReady(false);
    Controls.setStartEnabled(false);
    Controls.setStopEnabled(false);
    Controls.setStatus('ready', statusText || 'Ready');
  }

  IpcService.onLog((text) => {
    Logger.add(text);

    if (text.includes('Browser window was closed')) {
      resetToReady('Ready');
    }

    if (text.includes('People Search') || text.includes('navigated to')) {
      setTimeout(() => {
        Logger.add('💡 Tip: Navigate to linkedin.com/search/results/people in the browser window.', 'system');
      }, 500);
    }
  });

  IpcService.onProgress((stats) => {
    Stats.update(stats);
  });

  IpcService.onComplete(() => {
    isRunning = false;
    Controls.setStartEnabled(true);
    Controls.setStopEnabled(false);
    Controls.setStatus('ready', 'Completed');
  });

  IpcService.onStopped((stats) => {
    Stats.update(stats);
    isRunning = false;
    Controls.setStartEnabled(true);
    Controls.setStopEnabled(false);
    Controls.setStatus('stopped', 'Stopped');
  });

  IpcService.onExited(() => {
    Logger.add('🔄 Browser session closed. Ready for a new session.', 'system');
    isRunning = false;
    Controls.setLaunchReady(false);
    Controls.setStartEnabled(false);
    Controls.setStopEnabled(false);
    Controls.setStatus('ready', 'Ready');
  });

  IpcService.onError((text) => {
    Logger.add('❌ ' + text, 'error');
    if (!isRunning) {
      Controls.setStatus('error', 'Error');
    }
  });

  setInterval(async () => {
    try {
      const s = await IpcService.getStatus();
      if (s && !s.running && !isRunning && !isLaunching) {
        Controls.setLaunchReady(false);
        Controls.setStopEnabled(false);
      }
    } catch {}
  }, 4000);

  window.addEventListener('beforeunload', () => {
    IpcService.disposeAll();
  });
})();
