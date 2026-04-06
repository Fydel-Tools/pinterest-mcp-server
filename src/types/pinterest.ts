// Pinterest API v5 shared TypeScript interfaces

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  access_token_expires_at: number; // Unix timestamp (seconds)
  refresh_token_expires_at: number; // Unix timestamp (seconds)
  scope: string;
  updated_at: string; // ISO 8601
}

export interface PinterestApiError {
  code: number;
  message: string;
  status?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  bookmark: string | null;
}

export interface ImageData {
  width: number;
  height: number;
  url: string;
}

export interface PinImage {
  "150x150"?: ImageData;
  "400x300"?: ImageData;
  "600x"?: ImageData;
  "1200x"?: ImageData;
  originals?: ImageData;
}

export interface PinMediaSource {
  source_type: "image_url" | "image_base64" | "video_id" | "pin_url" | "multiple_image_urls" | "multiple_media_ids";
  url?: string;
  content_type?: string;
  data?: string;
  media_id?: string;
  pin_url?: string;
  items?: Array<{ source_type: string; url?: string; media_id?: string }>;
}

export interface Pin {
  id: string;
  created_at?: string;
  link?: string;
  title?: string;
  description?: string;
  alt_text?: string;
  board_id?: string;
  board_section_id?: string;
  board_owner?: { username: string };
  dominant_color?: string;
  media?: { media_type: string; images?: PinImage };
  media_source?: PinMediaSource;
  note?: string;
  pin_metrics?: Record<string, unknown>;
  creative_type?: string;
  is_owner?: boolean;
  is_standard?: boolean;
  has_been_promoted?: boolean;
}

export interface Board {
  id: string;
  created_at?: string;
  board_pins_modified_at?: string;
  name: string;
  description?: string;
  collaborator_count?: number;
  pin_count?: number;
  follower_count?: number;
  media?: { image_cover_url?: string; pin_thumbnail_urls?: string[] };
  owner?: { username: string };
  privacy?: "PUBLIC" | "PROTECTED" | "SECRET";
}

export interface BoardSection {
  id: string;
  name: string;
}

export interface UserAccount {
  username: string;
  account_type?: string;
  profile_image?: string;
  website_url?: string;
  about?: string;
  business_name?: string;
  board_count?: number;
  pin_count?: number;
  follower_count?: number;
  following_count?: number;
  monthly_views?: number;
}

export interface MediaUpload {
  media_id: string;
  media_type: string;
  status: "pending" | "failed" | "succeeded" | "processing";
  upload_url?: string;
  upload_parameters?: Record<string, string>;
}
