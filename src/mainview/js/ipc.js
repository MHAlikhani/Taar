'use strict';

import { Electroview } from 'electrobun/view';

const IpcService = (() => {
  const listeners = { log: [], progress: [], complete: [], stopped: [], exited: [], error: [] };

  function emit(name, arg) {
    listeners[name].forEach((cb) => {
      try { cb(arg); } catch {}
    });
  }

  const rpc = Electroview.defineRPC({
    maxRequestTime: 60000,
    handlers: {
      requests: {},
      messages: {
        botLog: ({ text }) => emit('log', text),
        botProgress: ({ stats }) => emit('progress', stats),
        botComplete: ({ text }) => emit('complete', text),
        botStopped: ({ stats }) => emit('stopped', stats),
        botExited: () => emit('exited'),
        botError: ({ text }) => emit('error', text)
      }
    }
  });

  new Electroview({ rpc }); // eslint-disable-line no-new

  function onLog(cb)       { listeners.log.push(cb); }
  function onProgress(cb)  { listeners.progress.push(cb); }
  function onComplete(cb)  { listeners.complete.push(cb); }
  function onStopped(cb)   { listeners.stopped.push(cb); }
  function onExited(cb)    { listeners.exited.push(cb); }
  function onError(cb)     { listeners.error.push(cb); }

  async function startBrowser()          { return rpc.request.startBrowser({}); }
  async function startAutomation(opts)   { return rpc.request.startAutomation(opts || {}); }
  async function stopAutomation()        { return rpc.request.stopAutomation({}); }
  async function getStatus()             { return rpc.request.getStatus({}); }

  return {
    onLog, onProgress, onComplete, onStopped, onExited, onError,
    startBrowser, startAutomation, stopAutomation, getStatus
  };
})();

window.IpcService = IpcService;
