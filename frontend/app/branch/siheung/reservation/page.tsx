"use client";

import React, { useState } from "react";
import { useAOS } from "@/hooks/useAOS";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

// 보유 이용권 데이터 타입
interface MyPass {
  id: number;
  name: string;
  remaining: number;
  total: number;
  expiryDate: string;
}

export default function SiheungBooking() {
  useAOS();
  const [selectedDate, setSelectedDate] = useState<number>(
    new Date().getDate(),
  );
  const [selectedPass, setSelectedPass] = useState<number>(1);
  const [selectedTime, setSelectedTime] = useState<string>("");

  // 1. 시흥 지점 보유 이용권 리스트 (Mock Data)
  const myPasses: MyPass[] = [
    {
      id: 1,
      name: "시흥 엘리트 유소년반 (주 2회)",
      remaining: 12,
      total: 20,
      expiryDate: "2026.08.15",
    },
    {
      id: 2,
      name: "성인 야간 정기 대관",
      remaining: 3,
      total: 4,
      expiryDate: "2026.05.30",
    },
  ];

  // 2. 예약 가능 시간 (시흥 지점 스케줄)
  const availableTimes = ["10:00", "13:00", "15:00", "17:00", "19:00", "21:00"];

  return (
    <div className="bg-[#f8fafc] min-h-screen text-[#0f172a] font-sans pb-20">
      {/* Header: 시흥 지점 블루 테마 */}
      <header className="fixed top-0 w-full h-[70px] flex justify-between items-center px-[5%] z-[1000] bg-white/90 backdrop-blur-md border-b border-blue-100">
        <Link href="/">
          <img
            src="/resource/image/logo.png" // 시흥은 기존 메인 로고 사용
            alt="Logo"
            className="h-6 md:h-7"
          />
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100">
            Siheung Branch
          </span>
          <Link
            href="/"
            className="text-xs font-black uppercase text-slate-400 hover:text-blue-600 transition-colors"
          >
            Close
          </Link>
        </div>
      </header>

      <main className="pt-[110px] px-[5%] md:px-[10%] max-w-6xl mx-auto">
        {/* SECTION 1: 보유 이용권 (시흥 블루 테마) */}
        <section className="mb-12" data-aos="fade-down">
          <h2 className="text-xl font-black mb-6 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-blue-500" /> 보유 중인
            이용권
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {myPasses.map((pass) => (
              <div
                key={pass.id}
                onClick={() => setSelectedPass(pass.id)}
                className={`cursor-pointer p-7 rounded-[32px] transition-all border-2 ${
                  selectedPass === pass.id
                    ? "bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-200"
                    : "bg-white border-transparent text-slate-800 shadow-sm hover:border-blue-200"
                }`}
              >
                <div className="flex justify-between items-start mb-5">
                  <span
                    className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                      selectedPass === pass.id
                        ? "bg-white/20 text-white"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    ACTIVE PASS
                  </span>
                  <span
                    className={`text-xs font-bold ${selectedPass === pass.id ? "text-white/60" : "text-slate-400"}`}
                  >
                    유효기간: {pass.expiryDate}
                  </span>
                </div>
                <h3 className="text-lg font-black mb-3 italic uppercase">
                  {pass.name}
                </h3>
                <div className="flex items-end gap-1">
                  <span
                    className={`text-4xl font-black ${selectedPass === pass.id ? "text-white" : "text-blue-600"}`}
                  >
                    {pass.remaining}
                  </span>
                  <span
                    className={`text-sm font-bold mb-1.5 ${selectedPass === pass.id ? "text-white/60" : "text-slate-400"}`}
                  >
                    / {pass.total}회 남음
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* SECTION 2: 캘린더 (시흥 블루 스타일) */}
          <section data-aos="fade-right">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2">
              <CalendarIcon size={20} className="text-blue-500" /> 예약 날짜
              선택
            </h2>
            <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-8 px-2">
                <h3 className="text-2xl font-black tracking-tighter uppercase italic">
                  May 2026
                </h3>
                <div className="flex gap-1">
                  <button className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-blue-600">
                    <ChevronLeft size={20} />
                  </button>
                  <button className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-blue-600">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center mb-6 text-[11px] font-black text-slate-300">
                {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
                  <div key={d} className="tracking-widest">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-3">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(day)}
                    className={`aspect-square rounded-2xl flex items-center justify-center text-sm font-bold transition-all ${
                      selectedDate === day
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110"
                        : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 3: 시간 선택 및 주의사항 */}
          <section data-aos="fade-left">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2">
              <Clock size={20} className="text-blue-500" /> 예약 시간 선택
            </h2>
            <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-col h-full">
              <div className="grid grid-cols-3 gap-3 mb-10">
                {availableTimes.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`py-4 rounded-2xl font-black text-sm transition-all border-2 ${
                      selectedTime === time
                        ? "bg-slate-900 text-white border-slate-900 shadow-lg"
                        : "bg-white border-slate-50 text-slate-400 hover:border-blue-200 hover:text-blue-600"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>

              {/* 주의사항 (시흥 스타일: Soft Blue/Slate) */}
              <div className="bg-slate-50 rounded-[30px] p-7 mb-10 border border-slate-100">
                <h4 className="flex items-center gap-2 text-blue-600 font-black text-sm mb-4">
                  <AlertCircle size={16} /> 시흥점 예약 필독 사항
                </h4>
                <ul className="text-[13px] text-slate-500 space-y-2.5 font-bold leading-relaxed">
                  <li className="flex gap-2">
                    <span>•</span> 수업 1일 전까지만 취소 및 변경이 가능합니다.
                  </li>
                  <li className="flex gap-2 text-red-400">
                    <span>•</span> 당일 취소 시 이용권 1회가 자동 차감됩니다.
                  </li>
                  <li className="flex gap-2">
                    <span>•</span> 쾌적한 환경을 위해 실내 전용 풋살화를
                    권장합니다.
                  </li>
                </ul>
              </div>

              <button
                disabled={!selectedTime}
                className={`mt-auto w-full py-6 rounded-[25px] font-black text-lg transition-all ${
                  selectedTime
                    ? "bg-blue-600 text-white shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02]"
                    : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
              >
                {selectedTime
                  ? `${selectedDate}일 ${selectedTime} 예약 완료하기`
                  : "날짜와 시간을 선택해주세요"}
              </button>
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-20 text-center opacity-30 text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
        &copy; Ground Siheung Branch Schedule System
      </footer>
    </div>
  );
}
