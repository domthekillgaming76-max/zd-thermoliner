/**
 * Publie l'installateur client Windows :
 * 1. Copie locale → public/downloads/ (servi par l'ERP à /downloads/…)
 * 2. Met à jour client_app_releases.download_url en base
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/upload-client-release.mjs
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const version = process.env.CLIENT_VERSION || '1.0.1';
const erpBase = (process.env.ERP_PUBLIC_URL || 'https://erp.zd-thermoliner.fr').replace(/\/$/, '');
const githubRepo = process.env.CLIENT_GITHUB_REPO || 'domthekillgaming76-max/zd-thermoliner';
const githubBranch = process.env.CLIENT_GITHUB_BRANCH || 'main';

const defaultExe = path.join(
  root,
  '..',
  'zd-thermoliner-client',
  'release',
  version,
  'ZD-Thermoliner-Launcher-Windows-1.0.1-Setup.exe',
);

const altExe = path.join(
  root,
  '..',
  'zd-thermoliner-client',
  'release',
  version,
  'Z&D Thermoliner Launcher-Windows-1.0.1-Setup.exe',
);

const exePath = path.resolve(
  process.argv[2] || (fs.existsSync(defaultExe) ? defaultExe : altExe),
);

const fileName = `ZD-Thermoliner-Launcher-Windows-${version}-Setup.exe`;
const publicDir = path.join(root, 'public', 'downloads');
const publicPath = path.join(publicDir, fileName);
const storagePath = `windows/${fileName}`;
const githubRawUrl = `https://github.com/${githubRepo}/raw/${githubBranch}/public/downloads/${fileName}`;
const erpDownloadUrl = `${erpBase}/downloads/${fileName}`;
const changelog =
  `Client Windows Z&D Thermoliner v${version} — tachygraphe RP, carte conducteur, tickets fin de journée.`;

if (!fs.existsSync(exePath)) {
  console.error(`[publish] Fichier introuvable: ${exePath}`);
  process.exit(1);
}

fs.mkdirSync(publicDir, { recursive: true });
fs.copyFileSync(exePath, publicPath);
console.log(`[publish] Copié → public/downloads/${fileName}`);

const fileBuffer = fs.readFileSync(exePath);
const sizeMb = (fileBuffer.length / (1024 * 1024)).toFixed(1);
// GitHub raw : fiable immédiatement (Coolify peut ne pas avoir redéployé /downloads/)
let downloadUrl = githubRawUrl;

console.log(`[publish] Taille: ${sizeMb} Mo`);

async function publishReleaseUrl(finalUrl) {
  const esc = (s) => s.replace(/'/g, "''");
  const sql = `
UPDATE public.client_app_releases SET is_latest = false WHERE is_latest = true;
INSERT INTO public.client_app_releases (version, platform, download_url, changelog, mandatory, is_latest, is_active)
VALUES ('${esc(version)}', 'windows', '${esc(finalUrl)}', '${esc(changelog)}', false, true, true)
ON CONFLICT (version) DO UPDATE SET
  download_url = EXCLUDED.download_url,
  changelog = EXCLUDED.changelog,
  is_latest = true,
  is_active = true,
  platform = EXCLUDED.platform;
`.trim();

  if (serviceKey && url) {
    const supabase = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (fileBuffer.length <= 50 * 1024 * 1024) {
      const { error: uploadError } = await supabase.storage
        .from('client-releases')
        .upload(storagePath, fileBuffer, {
          upsert: true,
          contentType: 'application/octet-stream',
          cacheControl: '3600',
        });

      if (!uploadError) {
        const { data: publicData } = supabase.storage.from('client-releases').getPublicUrl(storagePath);
        finalUrl = publicData.publicUrl;
        console.log('[publish] Storage Supabase OK');
      } else {
        console.warn(`[publish] Storage Supabase ignoré (${uploadError.message}) — URL ERP utilisée`);
      }
    } else {
      console.warn('[publish] Fichier > 50 Mo — hébergement ERP (/downloads/) utilisé (limite plan Free Supabase)');
    }

    await supabase.from('client_app_releases').update({ is_latest: false }).eq('is_latest', true);
    const { error: releaseError } = await supabase.from('client_app_releases').upsert(
      {
        version,
        platform: 'windows',
        download_url: finalUrl,
        changelog,
        mandatory: false,
        is_latest: true,
        is_active: true,
      },
      { onConflict: 'version' },
    );
    if (releaseError) throw new Error(releaseError.message);
    return finalUrl;
  }

  if (fileBuffer.length > 50 * 1024 * 1024) {
    console.warn('[publish] Fichier > 50 Mo — lien GitHub raw utilisé (ERP /downloads/ en secours après redeploy Coolify)');
  }

  const sqlFile = path.join(os.tmpdir(), `zd-publish-${version}.sql`);
  fs.writeFileSync(sqlFile, sql, 'utf8');
  try {
    execSync(`npx supabase db query --linked --yes -f "${sqlFile}"`, {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    });
  } finally {
    fs.unlinkSync(sqlFile);
  }
  return finalUrl;
}

try {
  downloadUrl = await publishReleaseUrl(downloadUrl);
} catch (err) {
  console.error('[publish] Erreur release:', err instanceof Error ? err.message : err);
  process.exit(1);
}

console.log('[publish] OK — lien de téléchargement actif:');
console.log(downloadUrl);
console.log(`[publish] Secours ERP (après redeploy Coolify): ${erpDownloadUrl}`);
