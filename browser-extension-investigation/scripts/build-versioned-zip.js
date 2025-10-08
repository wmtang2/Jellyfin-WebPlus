// scripts/build-versioned-zip.js
// Builds a versioned Firefox submission zip ensuring forward slash paths.

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const root = path.resolve(__dirname, '..');
const outName = 'jellyfin-webplus-1.1.1.zip';
const outPath = path.join(root, outName);
if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

const files = [
  'manifest.json',
  'contentScript.js',
  'options.html',
  'options.js',
  'styles.css',
  'src'
];

function addRecursive(archive, base, rel) {
  const full = path.join(base, rel);
  const stat = fs.statSync(full);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(full)) {
      addRecursive(archive, base, path.join(rel, entry));
    }
  } else {
    archive.file(full, { name: rel.replace(/\\/g, '/') });
  }
}

function build() {
  const output = fs.createWriteStream(outPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  output.on('close', () => console.log('Created', outPath));
  archive.on('error', err => { throw err; });
  archive.pipe(output);

  for (const f of files) {
    const full = path.join(root, f);
    if (!fs.existsSync(full)) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) addRecursive(archive, root, f);
    else archive.file(full, { name: f });
  }

  archive.finalize();
}

build();
