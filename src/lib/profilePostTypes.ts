export type ProfilePostMediaType = 'text' | 'photo' | 'video';

export interface ProfilePost {
  id: string;
  author_id: string;
  content: string;
  media_url: string | null;
  media_type: ProfilePostMediaType;
  created_at: string;
  updated_at: string;
}

export interface CreateProfilePostInput {
  content: string;
  media_file?: File;
  media_url?: string;
  media_type?: ProfilePostMediaType;
}
