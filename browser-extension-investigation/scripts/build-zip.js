// scripts/build-zip.js
// Creates a distributable ZIP for the extension.

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

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

function addToArchive(archive, srcPath, archivePath) {
  const stat = fs.statSync(srcPath);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(srcPath)) {
      addToArchive(archive, path.join(srcPath, entry), archivePath + '/' + entry);
    }
  } else {
    archive.file(srcPath, { name: archivePath });
  }
}

function buildZip() {
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  output.on('close', () => {
    console.log('Created', zipPath);
  });
  archive.on('error', err => { throw err; });
  archive.pipe(output);

  for (const f of filesToInclude) {
    const srcPath = path.join(root, f);
    const archivePath = f.replace(/\\/g, '/');
    addToArchive(archive, srcPath, archivePath);
  }

  archive.finalize();
}

buildZip();
