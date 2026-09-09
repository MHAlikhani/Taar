'use strict';

const appSchema = {
  bun: {
    requests: {
      startBrowser: { params: {}, response: {} },
      startAutomation: {
        params: { maxRequests: 0, addNote: false, noteText: '' },
        response: {}
      },
      stopAutomation: { params: {}, response: {} },
      getStatus: { params: {}, response: {} }
    },
    messages: {}
  },
  webview: {
    requests: {},
    messages: {
      botLog: { text: '' },
      botProgress: { stats: { sent: 0, skipped: 0, errors: 0 } },
      botComplete: { text: '' },
      botStopped: { stats: { sent: 0, skipped: 0, errors: 0 } },
      botExited: {},
      botError: { text: '' }
    }
  }
};

module.exports = { appSchema };
