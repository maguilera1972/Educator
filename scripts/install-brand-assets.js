#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const [logoSrc, faviconSrc] = process.argv.slice(2);
if (!logoSrc || !faviconSrc) {
  console.error('Usage: node scripts/install-brand-assets.js <logo> <favicon>');
  console.error('Exemple : node scripts/install-brand-assets.js logo.png favicon.png');
  process.exit(1);
}

for (const src of [logoSrc, faviconSrc]) {
  if (!fs.existsSync(src)) {
    console.error(`Fichier introuvable : ${src}`);
    process.exit(1);
  }
}

const destDir = path.join(__dirname, '..', 'public', 'images');
fs.mkdirSync(destDir, { recursive: true });

function extOf(file) {
  return path.extname(file).toLowerCase() || '.png';
}

const logoExt = extOf(logoSrc);
const faviconExt = extOf(faviconSrc);

fs.copyFileSync(logoSrc, path.join(destDir, `logo${logoExt}`));
fs.copyFileSync(faviconSrc, path.join(destDir, `favicon${faviconExt}`));

console.log(`Logo installé : public/images/logo${logoExt}`);
console.log(`Favicon installé : public/images/favicon${faviconExt}`);
console.log('Mettez à jour public/js/config.js si l’extension diffère de .svg');
