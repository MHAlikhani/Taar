// Electrobun app configuration (must be electrobun.config.ts).
// Docs: https://framework.blackboard.sh/electrobun/guides/quick-start/
export default {
  app: {
    name: 'LinkedIn Assistant',
    identifier: 'com.mhalikhani.linkedin-assistant',
    version: '1.0.0'
  },
  build: {
    // Main process (runs on Bun — full node:child_process support for the bot)
    bun: {
      entrypoint: 'src/bun/index.js'
    },
    // Local webviews served via the views:// scheme
    views: {
      mainview: {
        entrypoint: 'src/mainview/js/ipc.js'
      }
    },
    // Static webview assets (HTML + UI modules + styles); the IPC client
    // itself is bundled from build.views.mainview into index.js
    copy: {
      'src/mainview/index.html': 'views/mainview/index.html',
      'src/mainview/js/logger.js': 'views/mainview/js/logger.js',
      'src/mainview/js/stats.js': 'views/mainview/js/stats.js',
      'src/mainview/js/controls.js': 'views/mainview/js/controls.js',
      'src/mainview/js/app.js': 'views/mainview/js/app.js',
      'src/mainview/styles': 'views/mainview/styles'
    }
  }
};
