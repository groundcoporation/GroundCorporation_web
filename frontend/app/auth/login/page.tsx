"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  // 배포 환경과 로컬 환경의 basePath 대응
  const getBasePath = () => {
    return process.env.NODE_ENV === "production"
      ? "/GroundCoropration_web"
      : "";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // 로그인 성공 시 메인 페이지로 이동
      router.push(`${getBasePath()}/`);
    } catch (error: any) {
      setErrorMsg(error.message || "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2efe9] flex items-center justify-center px-5 py-20">
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 border border-black/5">
        <div className="text-center mb-10">
          <Link href="/">
            <img
              src={`${getBasePath()}/resource/image/logo.png`}
              alt="Logo"
              className="h-10 mx-auto mb-6"
            />
          </Link>
          <h2 className="text-3xl font-black text-[#1a3021] italic uppercase tracking-tighter">
            Welcome Back
          </h2>
          <p className="text-gray-400 font-bold mt-2">
            서비스 이용을 위해 로그인해주세요.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {errorMsg && (
            <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-sm font-bold border border-red-100">
              {errorMsg}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[12px] font-black text-[#1a3021] uppercase ml-2">
              Email Address
            </label>
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="email"
                placeholder="example@email.com"
                className="w-full bg-[#f8f6f2] border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-[#d35400] transition-all font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

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
                type="password"
                placeholder="••••••••"
                className="w-full bg-[#f8f6f2] border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-[#d35400] transition-all font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

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

        <div className="mt-10 text-center space-y-4">
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
