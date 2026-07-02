import { createClient } from "@supabase/supabase-js";

// 환경 변수 가져오기 및 공백 제거
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase 환경 변수가 누락되었습니다. .env.local을 확인하세요.",
  );
}

// 중요: URL 끝에 슬래시가 있다면 제거하여 404 에러(Invalid path) 방지
const sanitizedUrl = supabaseUrl.replace(/\/$/, "");

// 전역 변수를 사용하여 인스턴스 중복 생성 방지 (Multiple instances 경고 해결)
const globalForSupabase = global as unknown as {
  supabase: ReturnType<typeof createClient>;
};

export const supabase =
  globalForSupabase.supabase ||
  createClient(sanitizedUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

if (process.env.NODE_ENV !== "production")
  globalForSupabase.supabase = supabase;
