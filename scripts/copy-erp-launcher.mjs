/** Copie le launcher ERP natif dans public/downloads/ avant le build Vite. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const version = process.env.ERP_LAUNCHER_VERSION || '1.0.4';
const fileName = `ZD-Thermoliner-ERP-Windows-${version}.exe`;

const candidates = [
  path.join(root, 'public', 'downloads', fileName),
  path.join(root, 'desktop', 'erp-launcher', 'publish', 'ZD-Thermoliner-ERP.exe'),
];

const destDir = path.join(root, 'public', 'downloads');
const dest = path.join(destDir, fileName);

if (fs.existsSync(dest)) {
  console.log(`[copy-erp-launcher] Déjà présent: public/downloads/${fileName}`);
  process.exit(0);
}

const src = candidates.find((p, i) => i > 0 && fs.existsSync(p));
if (!src) {
  console.log('[copy-erp-launcher] Launcher absent — build avec: npm run build:erp-launcher');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(`[copy-erp-launcher] Copié → public/downloads/${fileName}`);
