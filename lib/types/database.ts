export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CollageElement = {
  id: string;
  type: 'image' | 'video' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  assetId?: string;
  publicPreviewUrl?: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

export interface Database {
  public: {
    Tables: {
      experiences: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          start_at: string;
          end_at: string | null;
          location_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          start_at: string;
          end_at?: string | null;
          location_name?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['experiences']['Insert']>;
      };
      assets: {
        Row: {
          id: string;
          user_id: string;
          experience_id: string;
          kind: 'photo' | 'video' | 'audio';
          storage_path: string;
          original_filename: string | null;
          captured_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          experience_id: string;
          kind: 'photo' | 'video' | 'audio';
          storage_path: string;
          original_filename?: string | null;
          captured_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['assets']['Insert']>;
      };
      journal_entries: {
        Row: {
          id: string;
          user_id: string;
          experience_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          experience_id: string;
          content: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['journal_entries']['Insert']>;
      };
      collage_pages: {
        Row: {
          id: string;
          user_id: string;
          experience_id: string;
          name: string;
          width: number;
          height: number;
          background: string;
          elements: CollageElement[] | Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          experience_id: string;
          name?: string;
          width?: number;
          height?: number;
          background?: string;
          elements: CollageElement[] | Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['collage_pages']['Insert']>;
      };
    };
  };
}

