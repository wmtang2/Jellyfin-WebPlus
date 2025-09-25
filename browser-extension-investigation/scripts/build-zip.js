// scripts/build-zip.js
// Creates a distributable ZIP for the extension.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

const filesToInclude = [
  'manifest.json',
  'contentScript.js',
  'styles.css',
  'src',
  'LICENSE'
].filter(f => fs.existsSync(path.join(root, f)));

const zipName = 'jellyfin-movie-attributes.zip';
const zipPath = path.join(distDir, zipName);
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

// Use powershell Compress-Archive if on Windows else fallback to zip
function buildZip() {
  if (process.platform === 'win32') {
    const psList = filesToInclude.map(f => `'${f}'`).join(',');
    // Copy to a temp staging dir to avoid nested structure issues
    const staging = path.join(distDir, 'staging');
    if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
    fs.mkdirSync(staging);
    for (const f of filesToInclude) {
      const srcPath = path.join(root, f);
      const destPath = path.join(staging, f);
      const stat = fs.statSync(srcPath);
      if (stat.isDirectory()) {
        fs.cpSync(srcPath, destPath, { recursive: true });
      } else {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(srcPath, destPath);
      }
    }
    // Run powershell compression
    execSync(`powershell -NoLogo -NoProfile -Command "Compress-Archive -Path '${staging}/*' -DestinationPath '${zipPath}'"`);
    fs.rmSync(staging, { recursive: true, force: true });
  } else {
    const args = filesToInclude.map(f => `'${f}'`).join(' ');
    execSync(`cd '${root}' && zip -r '${zipPath}' ${args}`, { stdio: 'inherit' });
  }
  console.log('Created', zipPath);
}

buildZip();
