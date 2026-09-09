'use strict';

const { execSync } = require('child_process');
const fs = require('fs');

const COMMON_PATHS_WIN = [
  'C:\\Program Files\\nodejs\\node.exe',
  'C:\\Program Files (x86)\\nodejs\\node.exe',
  process.env.PROGRAMFILES + '\\nodejs\\node.exe',
  process.env.LOCALAPPDATA + '\\Programs\\nodejs\\node.exe',
  process.env.APPDATA + '\\nvm\\current\\node.exe'
];

const COMMON_PATHS_UNIX = [
  '/usr/bin/node',
  '/usr/local/bin/node',
  '/opt/homebrew/bin/node',
  process.env.HOME + '/.nvm/versions/node/*/bin/node'
];

const COMMON_BUN_PATHS_WIN = [
  process.env.USERPROFILE + '\\.bun\\bin\\bun.exe',
  'C:\\Program Files\\bun\\bun.exe'
];

const COMMON_BUN_PATHS_UNIX = [
  process.env.HOME + '/.bun/bin/bun',
  '/usr/local/bin/bun',
  '/opt/homebrew/bin/bun'
];

let cachedNodePath = null;
let cachedBunPath = null;

function resolveNodePath() {
  if (cachedNodePath) return cachedNodePath;

  const isWindows = process.platform === 'win32';

  try {
    const cmd = isWindows ? 'where node' : 'which node';
    const out = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000
    });
    const firstLine = out.trim().split(/\r?\n/)[0];
    if (firstLine && fs.existsSync(firstLine)) {
      cachedNodePath = firstLine;
      return cachedNodePath;
    }
  } catch {
  }

  const paths = isWindows ? COMMON_PATHS_WIN : COMMON_PATHS_UNIX;
  for (const candidate of paths) {
    if (candidate.includes('*')) {
      continue;
    }
    if (candidate && fs.existsSync(candidate)) {
      cachedNodePath = candidate;
      return cachedNodePath;
    }
  }

  cachedNodePath = 'node';
  return cachedNodePath;
}

function resolveBunPath() {
  if (cachedBunPath !== null) return cachedBunPath;

  const isWindows = process.platform === 'win32';

  try {
    const cmd = isWindows ? 'where bun' : 'which bun';
    const out = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000
    });
    const firstLine = out.trim().split(/\r?\n/)[0];
    if (firstLine && fs.existsSync(firstLine)) {
      cachedBunPath = firstLine;
      return cachedBunPath;
    }
  } catch {
  }

  const paths = isWindows ? COMMON_BUN_PATHS_WIN : COMMON_BUN_PATHS_UNIX;
  for (const candidate of paths) {
    if (candidate && fs.existsSync(candidate)) {
      cachedBunPath = candidate;
      return cachedBunPath;
    }
  }

  cachedBunPath = null;
  return null;
}

function verifyBunVersion(bunPath) {
  try {
    const out = execSync(`"${bunPath}" --version`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000
    });
    const match = out.match(/(\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      return major > 1 || (major === 1 && minor >= 1);
    }
  } catch {
  }
  return false;
}

function verifyNodeVersion(nodePath) {
  try {
    const out = execSync(`"${nodePath}" --version`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000
    });
    const match = out.match(/v?(\d+)\./);
    if (match) {
      const major = parseInt(match[1], 10);
      return major >= 20;
    }
  } catch {
  }
  return true;
}

function resetCache() {
  cachedNodePath = null;
  cachedBunPath = null;
}

module.exports = { resolveNodePath, verifyNodeVersion, resolveBunPath, verifyBunVersion, resetCache };
