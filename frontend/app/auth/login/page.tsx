"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  // [SECTION] 1. State & Hooks (상태 관리 및 훅)
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  // [SECTION] 2. Utilities (배포 환경 설정)
  // 수정 후 (Vercel 배포용)
  const getBasePath = () => {
    return ""; // 무조건 빈 문자열로 바꿉니다.
  };

  // [SECTION] 3. Auth Logic (로그인 처리 로직)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      let loginEmail = identifier.trim();

      // [Sub-Logic] 아이디 로그인일 경우 이메일 추출
      if (!loginEmail.includes("@")) {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("email")
          .eq("username", loginEmail)
          .maybeSingle<{ email: string }>();

        if (userError || !userData) {
          setErrorMsg("존재하지 않는 아이디입니다.");
          setLoading(false);
          return;
        }
        loginEmail = userData.email;
      }

      // [Sub-Logic] Supabase 최종 인증
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (authError) {
        setErrorMsg("아이디 또는 비밀번호가 일치하지 않습니다.");
        setLoading(false);
        return;
      }

      router.push("/branch/siheung/main");
    } catch (error: any) {
      setErrorMsg("로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2efe9] flex items-center justify-center px-5 py-20">
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 border border-black/5">
        {/* [UI] 상단 헤더 & 로고 */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-[#1a3021] italic uppercase tracking-tighter">
            Welcome Back
          </h2>
          <p className="text-gray-400 font-bold mt-2">
            서비스 이용을 위해 로그인해주세요.
          </p>
        </div>

        {/* [UI] 로그인 입력 폼 */}
        <form onSubmit={handleLogin} className="space-y-6">
          {errorMsg && (
            <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-sm font-bold border border-red-100 text-center">
              {errorMsg}
            </div>
          )}

          {/* 아이디/이메일 입력 구역 */}
          <div className="space-y-2">
            <label className="text-[12px] font-black text-[#1a3021] uppercase ml-2">
              ID / Email
            </label>
            <div className="relative">
              <User
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="아이디 또는 이메일"
                className="w-full bg-[#f8f6f2] border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-[#d35400] transition-all font-medium"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 비밀번호 입력 구역 */}
          <div className="space-y-2">
            <label className="text-[12px] font-black text-[#1a3021] uppercase ml-2">
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full bg-[#f8f6f2] border-none rounded-2xl py-4 pl-12 pr-12 focus:ring-2 focus:ring-[#d35400] transition-all font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* 로그인 실행 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1a3021] text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:bg-[#d35400] transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                LOGIN NOW <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        {/* [UI] 하단 안내 링크 */}
        <div className="mt-10 text-center">
          <p className="text-gray-400 font-bold text-sm">
            아직 회원이 아니신가요?{" "}
            <Link
              href="/auth/signup"
              className="text-[#d35400] hover:underline"
            >
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
