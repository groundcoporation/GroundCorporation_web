import { createClient } from "@supabase/supabase-js";

// 환경 변수 가져오기 및 공백 제거
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co").trim().replace(/\/$/, "");
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key").trim();

// 전역 변수를 사용하여 인스턴스 중복 생성 방지 (Multiple instances 경고 해결)
const globalForSupabase = global as unknown as {
  supabase: ReturnType<typeof createClient>;
};

export const supabase =
  globalForSupabase.supabase ||
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

if (process.env.NODE_ENV !== "production")
  globalForSupabase.supabase = supabase;

