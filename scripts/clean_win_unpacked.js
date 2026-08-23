#!/usr/bin/env node
/**
 * clean_win_unpacked.js
 *
 * Force-clears release/win-unpacked using a robocopy mirror trick to handle
 * Windows Defender EBUSY locks on files like app.asar and default_app.asar.
 * Called from build-installer.sh before electron-builder --dir runs.
 */

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT         = path.resolve(__dirname, '..');
const WIN_UNPACKED = path.join(ROOT, 'release', 'win-unpacked');
const WU_TMP       = WIN_UNPACKED + '.tmp';

function forceDeleteDir(dir) {
  if (!fs.existsSync(dir)) return;

  const emptyTmp = dir + '.__empty__';

  // Create a fresh empty dir
  try { fs.mkdirSync(emptyTmp, { recursive: true }); } catch (_) {}

  // Robocopy mirror: copies nothing but deletes everything in dest
  spawnSync('robocopy', [emptyTmp, dir, '/mir', '/nfl', '/ndl', '/njh', '/njs', '/nc', '/ns', '/np'], {
    stdio: 'pipe',
    windowsHide: true,
    // spawnSync passes args as array — no shell path mangling
  });

  // Remove the temp empty dir
  try { fs.rmSync(emptyTmp, { recursive: true, force: true }); } catch (_) {}

  // Now rmdir the (now-empty) target
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    // If still locked just warn — electron-builder --dir will overwrite it
    console.warn(`  Warning: could not fully remove ${path.basename(dir)}: ${e.code}`);
  }
}

console.log('  Cleaning release/win-unpacked...');
forceDeleteDir(WIN_UNPACKED);
forceDeleteDir(WU_TMP);
console.log('  Done.');
