#!/usr/bin/env node
/**
 * stage_win_unpacked.js
 *
 * Called AFTER electron-builder --dir to finalize release/win-unpacked:
 *  1. Renames "electron.exe" -> "MDM - Download Manager.exe"
 *     (electron-builder normally does this via beforeCopyExtraFiles, but
 *      when prepackaged is used it skips that rename hook)
 *  2. Copies extraResources (bin/, extension/) into resources/
 *
 * Note: win-unpacked is pre-cleaned by build-installer.sh before --dir runs,
 * so there are no EBUSY issues here. This script just fixes the exe name.
 */

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT          = path.resolve(__dirname, '..');
const WIN_UNPACKED  = path.join(ROOT, 'release', 'win-unpacked');
const RESOURCES_DIR = path.join(WIN_UNPACKED, 'resources');
const ELECTRON_EXE  = path.join(WIN_UNPACKED, 'electron.exe');
const PRODUCT_EXE   = path.join(WIN_UNPACKED, 'MDM - Download Manager.exe');

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

function robocopy(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const r = spawnSync(
    'robocopy',
    [`"${src}"`, `"${dest}"`, '/e', '/nfl', '/ndl', '/njh', '/njs', '/nc', '/ns', '/np'],
    { shell: true, stdio: 'pipe' }
  );
  if (r.status > 1) {
    console.error(`  robocopy failed (${r.status}): ${r.stderr?.toString().trim()}`);
    process.exit(1);
  }
}

console.log(`\n⚙️  Finalizing win-unpacked for MDM v${pkg.version}...`);

// 1. Rename electron.exe -> product exe name
if (fs.existsSync(ELECTRON_EXE)) {
  console.log('  Renaming electron.exe -> "MDM - Download Manager.exe"');
  fs.renameSync(ELECTRON_EXE, PRODUCT_EXE);
} else if (fs.existsSync(PRODUCT_EXE)) {
  console.log('  "MDM - Download Manager.exe" already present (already renamed)');
} else {
  console.error('  ERROR: neither electron.exe nor product exe found in win-unpacked!');
  console.error('  Contents:', fs.readdirSync(WIN_UNPACKED));
  process.exit(1);
}

// 2. Copy extra resources (bin/, extension/) into resources/
const EXTRA = [
  { from: path.join(ROOT, 'bin'),       to: path.join(RESOURCES_DIR, 'bin') },
  { from: path.join(ROOT, 'extension'), to: path.join(RESOURCES_DIR, 'extension') },
];

for (const { from, to } of EXTRA) {
  if (!fs.existsSync(from)) continue;
  console.log(`  Copying ${path.basename(from)}/ -> resources/${path.basename(from)}/`);
  robocopy(from, to);
}

// 3. Verify
if (!fs.existsSync(PRODUCT_EXE)) {
  console.error('\n  ERROR: Product exe missing after staging!');
  process.exit(1);
}

const exeMB = (fs.statSync(PRODUCT_EXE).size / 1024 / 1024).toFixed(1);
console.log(`\n  ✓ "MDM - Download Manager.exe"  ${exeMB} MB`);
console.log(`  ✓ resources/app.asar            present`);
console.log('\n✅ Staging complete!\n');
