import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const DIST_DIR = path.resolve(process.cwd(), 'dist/assets');
const MAX_ENTRY_GZIP_BYTES = 250 * 1024; // 250 KB

if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ dist/assets directory not found. Run `npm run build` first.');
  process.exit(1);
}

const files = fs.readdirSync(DIST_DIR);
const jsFiles = files.filter((f) => f.endsWith('.js'));

if (jsFiles.length === 0) {
  console.error('❌ No JavaScript assets found in dist/assets.');
  process.exit(1);
}

console.log('📦 Bundle Size Check (Target: initial JS <= 250 KB gzipped):');
let passed = true;

// Find entry chunk (typically index-*.js)
const entryFile = jsFiles.find((f) => f.startsWith('index-')) || jsFiles[0];

for (const file of jsFiles) {
  const filePath = path.join(DIST_DIR, file);
  const content = fs.readFileSync(filePath);
  const rawBytes = content.length;
  const gzipBytes = zlib.gzipSync(content).length;

  const rawKb = (rawBytes / 1024).toFixed(2);
  const gzipKb = (gzipBytes / 1024).toFixed(2);

  const isEntry = file === entryFile;
  const tag = isEntry ? ' [ENTRY]' : '';

  console.log(`  - ${file}${tag}: ${rawKb} KB raw / ${gzipKb} KB gzipped`);

  if (isEntry && gzipBytes > MAX_ENTRY_GZIP_BYTES) {
    console.error(`\n❌ Entry chunk ${file} exceeded budget: ${gzipKb} KB > 250 KB`);
    passed = false;
  }
}

if (!passed) {
  process.exit(1);
}

console.log('\n✅ All bundle size budgets passed.');
