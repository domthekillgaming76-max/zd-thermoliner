export interface ClientAppRelease {
  id: string;
  version: string;
  platform?: string;
  download_url: string | null;
  changelog: string;
  mandatory: boolean;
  is_latest: boolean;
  is_active?: boolean;
  created_at: string;
}

export interface ClientReleaseForm {
  version: string;
  download_url: string;
  changelog: string;
  mandatory: boolean;
}
