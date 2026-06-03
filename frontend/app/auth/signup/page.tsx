"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  User,
  Lock,
  Mail,
  Phone,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

// [SECTION] 1. Type Definition (타입 정의)
interface UserInsertData {
  id: string;
  username: string;
  email: string;
  name: string;
  phone: string;
  birth_date: string;
  branch_id: string;
  role: string;
  referred_by?: string;
  points?: number;
}

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref"); // ?ref=추천인ID 추출

  // [SECTION] 2. State Management (상태 관리)
  const [loading, setLoading] = useState(false); // 전송 로딩 상태
  const [errorMsg, setErrorMsg] = useState(""); // 에러 메시지

  // 입력 필드 상태
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [branchId, setBranchId] = useState("unassigned"); // 기본 지점 미지정

  // UI 제어 상태
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordMatch, setIsPasswordMatch] = useState(true);

  // [SECTION] 3. Input Validation (비밀번호 일치 실시간 체크)
  useEffect(() => {
    setIsPasswordMatch(
      confirmPassword.length === 0 || password === confirmPassword,
    );
  }, [password, confirmPassword]);

  // [SECTION] 4. Formatter Utilities (입력값 자동 포맷팅)
  // 휴대폰 번호 자동 하이픈 생성
  const formatPhoneNumber = (val: string) => {
    const s = val.replace(/\D/g, "");
    if (s.length <= 3) return s;
    if (s.length <= 7) return `${s.slice(0, 3)}-${s.slice(3)}`;
    return `${s.slice(0, 3)}-${s.slice(3, 7)}-${s.slice(7, 11)}`;
  };

  // 생년월일 자동 하이픈 생성 (YYYY-MM-DD)
  const formatBirthDate = (val: string) => {
    const s = val.replace(/\D/g, "");
    if (s.length <= 4) return s;
    if (s.length <= 6) return `${s.slice(0, 4)}-${s.slice(4)}`;
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  };

  // [SECTION] 5. Main Logic: Sign Up (회원가입 처리)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordMatch) return; // 비밀번호 불일치 시 진행 중단

    setLoading(true);
    setErrorMsg("");

    try {
      // [Step 1] 아이디 중복 체크 (users 테이블)
      const { data: exist } = await supabase
        .from("users")
        .select("username")
        .eq("username", username)
        .maybeSingle();

      if (exist) {
        setErrorMsg("이미 사용 중인 아이디입니다.");
        setLoading(false);
        return;
      }

      // [Step 2] Supabase Auth 가입 (이메일/비밀번호 인증 계정 생성)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authError) throw authError;

      // [Step 3] 가입된 Auth UID를 기반으로 Users 테이블 정보 생성
      if (authData.user) {
        let points = 0;
        let referredBy = "";

        // 추천인 코드(아이디)가 있고, 존재하는 사용자인지 확인
        if (referralCode) {
          const { data: referrer } = await supabase
            .from("users")
            .select("id, points")
            .eq("username", referralCode)
            .maybeSingle();

          if (referrer) {
            referredBy = referralCode;
            points = 1000; // 가입자에게 주는 혜택 포인트

            // 추천인에게도 포인트 지급
            await supabase
              .from("users")
              .update({ points: (referrer.points || 0) + 1000 })
              .eq("id", referrer.id);
          }
        }

        const newUser: UserInsertData = {
          id: authData.user.id, // Auth의 고유 ID(UUID)를 FK로 사용
          username: username,
          email: email,
          name: name,
          phone: phone.replace(/-/g, ""), // 하이픈 제거 후 저장
          birth_date: birthDate.replace(/-/g, ""), // 하이픈 제거 후 저장
          branch_id: branchId,
          role: "user",
          referred_by: referredBy,
          points: points,
        };

        // Users 테이블에 최종 데이터 삽입
        const { error: dbError } = await supabase
          .from("users")
          .insert([newUser] as any);

        if (dbError) throw dbError;

        alert("회원가입 완료!");
        router.push("/auth/login");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2efe9] py-12 px-5 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-[40px] shadow-2xl p-10">
        {/* [UI] 상단 뒤로가기 & 타이틀 */}
        <Link
          href="/auth/login"
          className="flex items-center gap-2 text-gray-400 mb-6 font-bold text-sm"
        >
          <ArrowLeft size={16} /> BACK
        </Link>
        <h2 className="text-3xl font-black text-[#1a3021] italic uppercase mb-8">
          Create Account
        </h2>

        {/* [UI] 회원가입 입력 폼 */}
        <form onSubmit={handleSignUp} className="space-y-5">
          {errorMsg && (
            <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-bold text-center">
              {errorMsg}
            </div>
          )}

          {/* 계정 정보 입력 구역 (ID, Email, PW) */}
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="아이디"
              className="p-4 bg-[#f8f6f2] rounded-2xl"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="이메일"
              className="p-4 bg-[#f8f6f2] rounded-2xl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="비밀번호"
                className="w-full p-4 bg-[#f8f6f2] rounded-2xl"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <input
              type="password"
              placeholder="비밀번호 확인"
              className={`p-4 bg-[#f8f6f2] rounded-2xl ${!isPasswordMatch && "ring-2 ring-red-300"}`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {/* 개인 정보 입력 구역 (이름, 연락처, 생일) */}
          <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
            <input
              type="text"
              placeholder="이름"
              className="p-4 bg-[#f8f6f2] rounded-2xl"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="휴대폰"
              className="p-4 bg-[#f8f6f2] rounded-2xl"
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              maxLength={13}
              required
            />
            <input
              type="text"
              placeholder="생년월일(8자리)"
              className="p-4 bg-[#f8f6f2] rounded-2xl"
              value={birthDate}
              onChange={(e) => setBirthDate(formatBirthDate(e.target.value))}
              maxLength={10}
              required
            />
          </div>

          {/* 회원가입 실행 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1a3021] text-white py-4 rounded-2xl font-black hover:bg-[#d35400] transition-all"
          >
            {loading ? <Loader2 className="animate-spin" /> : "SIGN UP NOW"}
          </button>
        </form>
      </div>
    </div>
  );
}
