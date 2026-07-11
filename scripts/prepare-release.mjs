/**
 * Prépare le dossier distribution/Z&D-Thermoliner-ERP prêt à partager.
 * Usage: npm run pack:release
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'distribution', 'Z&D-Thermoliner-ERP');
const distTemplate = path.join(root, 'distribution');

const COPY_DIRS = ['server', 'public'];
const COPY_FILES = [
  'package.json',
  'package-lock.json',
  '.env.example',
];

const DIST_DOCS = [
  'LISEZMOI.md',
  'INSTALLATION.md',
  'install.bat',
  'start.bat',
  '.env.example',
];

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

console.log('[Z&D] Build production...');
execSync('npm run build', { cwd: root, stdio: 'inherit' });

console.log('[Z&D] Préparation dossier partageable...');
rmrf(outDir);
fs.mkdirSync(outDir, { recursive: true });

for (const dir of COPY_DIRS) {
  const src = path.join(root, dir);
  if (fs.existsSync(src)) copyDir(src, path.join(outDir, dir));
}

copyDir(path.join(root, 'dist'), path.join(outDir, 'dist'));

for (const file of COPY_FILES) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(outDir, file));
}

for (const doc of DIST_DOCS) {
  const src = path.join(distTemplate, doc);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(outDir, doc));
}

const readme = `# Dossier prêt à partager

Généré le ${new Date().toLocaleString('fr-FR')}

1. Zippez ce dossier \`Z&D-Thermoliner-ERP\`
2. Partagez-le (sans fichier .env)
3. Le destinataire : install.bat → configure .env → start.bat

Voir LISEZMOI.md et INSTALLATION.md
`;
fs.writeFileSync(path.join(outDir, 'PARTAGER.txt'), readme, 'utf8');

console.log(`[Z&D] Terminé → ${outDir}`);
console.log('[Z&D] Zippez le dossier et partagez-le (sans .env)');
