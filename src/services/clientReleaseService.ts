import { supabase } from '../lib/supabase';
import type { ClientAppRelease, ClientReleaseForm } from '../lib/clientReleaseTypes';

export async function fetchLatestClientRelease(): Promise<ClientAppRelease | null> {
  const { data, error } = await supabase
    .from('client_app_releases')
    .select('*')
    .eq('is_latest', true)
    .maybeSingle();

  if (error) throw error;
  return data as ClientAppRelease | null;
}

export async function fetchClientReleaseHistory(limit = 10): Promise<ClientAppRelease[]> {
  const { data, error } = await supabase
    .from('client_app_releases')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as ClientAppRelease[];
}

export async function publishClientRelease(form: ClientReleaseForm): Promise<void> {
  const version = form.version.trim();
  const downloadUrl = form.download_url.trim();
  if (!version) throw new Error('Version requise');
  if (!downloadUrl) throw new Error('Lien de téléchargement requis');

  await supabase
    .from('client_app_releases')
    .update({ is_latest: false })
    .eq('is_latest', true);

  const { error } = await supabase.from('client_app_releases').upsert(
    {
      version,
      platform: 'windows',
      download_url: downloadUrl,
      changelog: form.changelog.trim() || 'Mise à jour du client Windows Z&D Thermoliner.',
      mandatory: form.mandatory,
      is_latest: true,
      is_active: true,
    },
    { onConflict: 'version' },
  );

  if (error) throw error;
}
