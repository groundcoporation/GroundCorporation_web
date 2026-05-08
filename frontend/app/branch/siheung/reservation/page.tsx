"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAOS } from "@/hooks/useAOS";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

// [SECTION] 1. Type Definition (데이터 구조 정의)
interface MyPass {
  id: string;
  package_name: string;
  remaining_count: number;
  total_count: number;
  expiry_date: string;
}

interface Schedule {
  id: string;
  target_class: string;
  start_time: string;
  end_time: string;
  min_age: number;
  max_age: number;
  is_active: boolean;
}

export default function SiheungBooking() {
  useAOS();

  // [SECTION] 2. State Management (상태 관리)
  const [myPasses, setMyPasses] = useState<MyPass[]>([]); // 보유 이용권 목록
  const [availableTimes, setAvailableTimes] = useState<Schedule[]>([]); // 선택 날짜의 수업 목록
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // 달력에서 선택된 날짜
  const [selectedPass, setSelectedPass] = useState<string | null>(null); // 사용할 이용권 ID
  const [selectedTimeId, setSelectedTimeId] = useState<string | null>(null); // 예약할 수업 ID
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null); // 로그인 유저의 상세 정보 (나이, 지정반)
  const startDay = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    1,
  ).getDay();
  const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  // [SECTION] 3. Data Fetching: Initial (초기 데이터 로드)
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        // [Step 1] 유저 프로필 조회 (예약 제한 조건인 '지정반' 및 '생년월일' 확인용)
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();
        setUserProfile(profile);

        // [Step 2] 시흥 지점의 활성화된 이용권 조회
        const { data: passes, error } = await supabase
          .from("user_packages")
          .select("*")
          .eq("user_id", authUser.id)
          .eq("branch_id", "branch_1") // 시흥점 ID 고정
          .eq("status", "active")
          .gt("remaining_count", 0); // 잔여 횟수가 1회 이상인 것만

        if (!error && passes) {
          const typedPasses: MyPass[] = passes as MyPass[];
          setMyPasses(typedPasses);
          if (typedPasses.length > 0) {
            setSelectedPass(typedPasses[0].id); // 첫 번째 이용권 자동 선택
          }
        }
      }
      setLoading(false);
    };
    fetchInitialData();
  }, []);

  // [SECTION] 4. Data Fetching: Schedules (수업 목록 로드)
  const fetchSchedules = useCallback(async () => {
    // DB의 요일 형식이 한글("월", "화"...)이므로 해당 날짜의 요일을 한글로 추출
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    const dayName = days[selectedDate.getDay()];

    const { data, error } = await supabase
      .from("class_schedules")
      .select("*")
      .eq("branch_id", "branch_1")
      .eq("day_of_week", dayName) // 선택한 요일에 해당하는 수업만 필터링
      .eq("is_active", true)
      .order("start_time", { ascending: true });

    if (!error && data) {
      setAvailableTimes(data as Schedule[]);
    } else {
      setAvailableTimes([]);
    }
    setSelectedTimeId(null); // 날짜가 바뀌면 기존 선택된 시간 초기화
  }, [selectedDate]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // [SECTION] 5. Logic: Validation (예약 가능 여부 판단)
  /**
   * 나이 계산 함수: 8자리 생년월일을 기준으로 한국 나이 계산
   */
  const calculateAge = (birthDate: string | null) => {
    if (!birthDate || birthDate.length !== 8) return 0;
    const year = parseInt(birthDate.substring(0, 4));
    return new Date().getFullYear() - year + 1;
  };

  /**
   * 수강 대상 체크 로직 (앱 로직과 동일)
   * 1. 유저에게 '지정반(target_class)'이 있다면 해당 수업만 예약 가능
   * 2. 지정반이 없다면 나이 제한(min_age ~ max_age) 이내인 수업만 가능
   */
  const checkCanReserve = (item: Schedule) => {
    if (!userProfile) return false;

    if (userProfile.target_class && userProfile.target_class.trim() !== "") {
      return userProfile.target_class === item.target_class;
    }

    const age = calculateAge(userProfile.birth_date);
    return age >= item.min_age && age <= item.max_age;
  };

  // [SECTION] 6. Main Logic: Booking (예약 실행)
  const handleBooking = async () => {
    if (!userProfile || !selectedPass || !selectedTimeId) return;

    const currentPass = myPasses.find((p) => p.id === selectedPass);
    const selectedTime = availableTimes.find((t) => t.id === selectedTimeId);

    // 횟수 재검증
    if (!currentPass || currentPass.remaining_count <= 0) {
      alert("잔여 횟수가 부족합니다.");
      return;
    }

    if (
      !window.confirm(
        `${selectedDate.getDate()}일 ${selectedTime?.start_time.slice(0, 5)} 수업을 예약하시겠습니까?`,
      )
    )
      return;

    try {
      // [Step 1] 이용권 횟수 차감
      const { error: updateError } = await supabase
        .from("user_packages")
        .update({ remaining_count: currentPass.remaining_count - 1 } as never)
        .eq("id", selectedPass);

      if (updateError) throw updateError;

      // [Step 2] 예약 내역(Reservations) 생성
      const { error: insertError } = await supabase
        .from("reservations")
        .insert([
          {
            user_id: userProfile.id,
            package_id: selectedPass,
            schedule_id: selectedTimeId,
            class_date: selectedDate.toISOString().split("T")[0],
            branch_id: "branch_1",
            status: "pending",
            attendance_status: "yet",
            child_name: userProfile.name, // 웹은 현재 로그인한 사용자 본인 이름 기준
          } as never,
        ]);

      if (insertError) throw insertError;

      alert("예약이 정상적으로 완료되었습니다!");
      window.location.reload(); // 데이터 갱신을 위해 리로드
    } catch (err: any) {
      alert("예약 처리 중 오류가 발생했습니다.");
    }
  };

  // [SECTION] 7. UI Rendering
  const daysInMonth = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1,
    0,
  ).getDate();

  return (
    <div className="bg-[#f8fafc] min-h-screen text-[#0f172a] font-sans pb-20">
      {/* Header 영역 */}
      <header className="fixed top-0 w-full h-[70px] flex justify-between items-center px-[5%] z-[1000] bg-white/90 backdrop-blur-md border-b border-blue-100">
        <Link href="/">
          <img
            src="/resource/image/logo.png"
            alt="Logo"
            className="h-6 md:h-7"
          />
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase border border-blue-100">
            Siheung Branch
          </span>
          <Link
            href="/branch/siheung/main"
            className="text-xs font-black uppercase text-slate-400"
          >
            Close
          </Link>
        </div>
      </header>

      <main className="pt-[110px] px-[5%] md:px-[5%] max-w-7xl mx-auto">
        {/* 이용권 카드 리스트 */}
        <section className="mb-12">
          <h2 className="text-xl font-black mb-6 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-blue-500" /> 보유 중인
            이용권
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myPasses.length > 0 ? (
              myPasses.map((pass) => (
                <div
                  key={pass.id}
                  onClick={() => setSelectedPass(pass.id)}
                  className={`cursor-pointer p-7 rounded-[32px] transition-all border-2 ${
                    selectedPass === pass.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-xl"
                      : "bg-white border-transparent text-slate-800"
                  }`}
                >
                  <span className="text-[10px] font-black px-2 py-1 rounded-md bg-white/20 mb-4 inline-block uppercase tracking-wider">
                    Active
                  </span>
                  <h3 className="text-lg font-black uppercase italic leading-tight">
                    {pass.package_name}
                  </h3>
                  <div className="text-2xl font-black mt-2">
                    {pass.remaining_count} / {pass.total_count}회 남음
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-10 bg-white rounded-[32px] border border-dashed border-slate-200 text-slate-400 font-bold">
                로그인이 필요하거나 사용 가능한 이용권이 없습니다.
              </div>
            )}
          </div>
        </section>

        {/* 하단 2단 레이아웃을 1단 세로형으로 변경하여 가로폭 확보 */}
        <div className="flex flex-col gap-12">
          {/* 달력 섹션 - 가로폭 전체 사용 및 날짜 크기 확대 */}
          <section>
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-xl font-black flex items-center gap-2">
                <CalendarIcon size={22} className="text-blue-500" /> 예약 날짜
                선택
              </h2>
              {/* 현재 연도와 월 표시 */}
              <div className="text-right">
                <span className="text-slate-400 text-xs font-bold block uppercase tracking-widest">
                  {selectedDate.getFullYear()}
                </span>
                <span className="text-2xl font-black text-blue-600 uppercase italic">
                  {selectedDate.toLocaleString("default", { month: "long" })}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-[40px] p-6 md:p-10 shadow-sm border border-slate-100">
              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 gap-2 mb-4 border-b border-slate-50 pb-4">
                {daysOfWeek.map((day) => (
                  <div
                    key={day}
                    className={`text-center text-[10px] font-black tracking-tighter ${day === "SUN" ? "text-red-400" : day === "SAT" ? "text-blue-400" : "text-slate-300"}`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* 날짜 그리드 */}
              <div className="grid grid-cols-7 gap-2 md:gap-4">
                {/* 1일 시작 전 빈 칸 채우기 */}
                {Array.from({ length: startDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* 실제 날짜들 */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                  (day) => {
                    const isSelected = selectedDate.getDate() === day;
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setDate(day);
                          setSelectedDate(newDate);
                        }}
                        className={`relative aspect-square rounded-2xl md:rounded-3xl flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-xl shadow-blue-200 scale-105 z-10"
                            : "bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600"
                        }`}
                      >
                        <span className="text-base md:text-xl font-black">
                          {day}
                        </span>
                        {/* 오늘 날짜 표시용 점 (필요시) */}
                        {new Date().getDate() === day &&
                          new Date().getMonth() === selectedDate.getMonth() &&
                          !isSelected && (
                            <div className="absolute bottom-2 w-1 h-1 bg-blue-400 rounded-full" />
                          )}
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          </section>

          {/* 수업 목록 선택 섹션 - 가로폭을 넓게 쓰고 2열 그리드 적용 */}
          <section>
            <h2 className="text-xl font-black mb-6 flex items-center gap-2">
              <Clock size={20} className="text-blue-500" /> 예약 시간 선택
            </h2>
            <div className="bg-white rounded-[40px] p-6 md:p-10 shadow-sm border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {availableTimes.length > 0 ? (
                  availableTimes.map((item) => {
                    const canReserve = checkCanReserve(item);
                    return (
                      <button
                        key={item.id}
                        disabled={!canReserve}
                        onClick={() => setSelectedTimeId(item.id)}
                        className={`relative w-full p-6 md:p-8 rounded-[28px] text-left transition-all border-2 flex flex-col gap-4 ${
                          !canReserve
                            ? "opacity-40 bg-slate-50 border-slate-100 cursor-not-allowed"
                            : selectedTimeId === item.id
                              ? "bg-slate-900 text-white border-slate-900 shadow-xl scale-[1.02]"
                              : "bg-white border-slate-100 hover:border-blue-200 shadow-sm"
                        }`}
                      >
                        {/* 상태 뱃지 (우측 상단 고정) */}
                        <div className="absolute top-6 right-6">
                          <div
                            className={`text-[10px] font-black px-3 py-1 rounded-full border ${
                              selectedTimeId === item.id
                                ? "border-blue-400 text-blue-400"
                                : "border-current opacity-60"
                            }`}
                          >
                            {canReserve
                              ? selectedTimeId === item.id
                                ? "선택됨"
                                : "예약가능"
                              : "대상아님"}
                          </div>
                        </div>

                        {/* 시간 정보 */}
                        <div className="text-2xl md:text-3xl font-black tracking-tight">
                          {item.start_time.slice(0, 5)} -{" "}
                          {item.end_time.slice(0, 5)}
                        </div>

                        {/* 클래스 정보 */}
                        <div className="space-y-1">
                          <div className="text-lg font-black leading-snug">
                            {item.target_class}
                          </div>
                          <div className="text-sm opacity-60 font-bold">
                            수강 대상: {item.min_age}~{item.max_age}세
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-24 text-slate-300 font-bold text-lg">
                    선택하신 날짜에는 운영되는 수업이 없습니다.
                  </div>
                )}
              </div>

              {/* 하단 정보 및 버튼 영역 */}
              <div className="mt-12 space-y-4">
                <div className="bg-slate-50 rounded-[25px] p-6 border border-slate-100">
                  <h4 className="flex items-center gap-2 text-blue-600 font-black text-base mb-2">
                    <AlertCircle size={18} /> 예약 시 주의사항
                  </h4>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">
                    • 반 배정 상담을 받은 학생만 본인의 지정반 수업으로 예약이
                    가능합니다.
                    <br />• 수강 대상 나이가 일치하지 않거나 지정반 정보가 다를
                    경우 '대상아님'으로 표시됩니다.
                  </p>
                </div>

                <button
                  onClick={handleBooking}
                  disabled={!selectedTimeId || loading}
                  className={`w-full py-8 rounded-[30px] font-black text-xl md:text-2xl transition-all ${
                    selectedTimeId
                      ? "bg-blue-600 text-white shadow-2xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98]"
                      : "bg-slate-100 text-slate-300 cursor-not-allowed"
                  }`}
                >
                  {selectedTimeId
                    ? `${selectedDate.getDate()}일 수업 예약 확정하기`
                    : "목록에서 수업 시간을 선택해주세요"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
