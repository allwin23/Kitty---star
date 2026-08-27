import { createClient } from '@supabase/supabase-js';

// Access variables injected at compile-time by esbuild or fallback to placeholders
declare const process: {
  env: {
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
  };
};

export const SUPABASE_URL = process.env.SUPABASE_URL || "https://your-project-id.supabase.co";
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "your-anon-public-key";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
