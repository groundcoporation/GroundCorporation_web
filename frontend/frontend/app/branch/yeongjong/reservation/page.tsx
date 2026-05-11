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
  Info,
} from "lucide-react";
import Link from "next/link";

// 보유 이용권 데이터 타입
interface MyPass {
  id: number;
  name: string;
  remaining: number; // 남은 횟수
  total: number; // 전체 횟수
  expiryDate: string;
}

export default function YeongjongBooking() {
  useAOS();
  const [selectedDate, setSelectedDate] = useState<number>(
    new Date().getDate(),
  );
  const [selectedPass, setSelectedPass] = useState<number>(1);
  const [selectedTime, setSelectedTime] = useState<string>("");

  // 1. 보유 이용권 리스트 (Mock Data)
  const myPasses: MyPass[] = [
    {
      id: 1,
      name: "영종 유소년 취미반 (주 2회)",
      remaining: 5,
      total: 8,
      expiryDate: "2026.05.20",
    },
    {
      id: 2,
      name: "1:1 프라이빗 레슨",
      remaining: 2,
      total: 5,
      expiryDate: "2026.06.15",
    },
  ];

  // 2. 예약 가능 시간 (Mock Data)
  const availableTimes = ["14:00", "15:00", "16:00", "17:00", "19:00", "20:00"];

  return (
    <div className="bg-[#f0f7f4] min-h-screen text-[#1b4332] font-sans pb-20">
      {/* Header (기존과 동일하되 로고만 유지) */}
      <header className="fixed top-0 w-full h-[70px] flex justify-between items-center px-[5%] z-[1000] bg-white/80 backdrop-blur-md border-b border-[#2d6a4f]/10">
        <Link href="/">
          <img
            src="/resource/image/logo_green.png"
            alt="Logo"
            className="h-9 md:h-10"
          />
        </Link>
        <Link
          href="/"
          className="text-xs font-black uppercase text-[#1b4332] hover:text-[#52b788]"
        >
          Close
        </Link>
      </header>

      <main className="pt-[110px] px-[5%] md:px-[10%] max-w-6xl mx-auto">
        {/* SECTION 1: 보유 이용권 리스트 */}
        <section className="mb-12" data-aos="fade-down">
          <h2 className="text-xl font-black mb-6 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-[#52b788]" /> 보유 중인
            이용권
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {myPasses.map((pass) => (
              <div
                key={pass.id}
                onClick={() => setSelectedPass(pass.id)}
                className={`cursor-pointer p-6 rounded-[30px] transition-all border-2 ${
                  selectedPass === pass.id
                    ? "bg-[#1b4332] text-white border-[#1b4332] shadow-xl"
                    : "bg-white border-transparent text-[#1b4332]"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <span
                    className={`text-[10px] font-black px-2 py-1 rounded-md ${selectedPass === pass.id ? "bg-[#52b788] text-white" : "bg-[#f0f7f4] text-[#2d6a4f]"}`}
                  >
                    MY PASS
                  </span>
                  <span className="text-sm font-bold opacity-60">
                    ~ {pass.expiryDate} 까지
                  </span>
                </div>
                <h3 className="text-lg font-black mb-2">{pass.name}</h3>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-black text-[#52b788]">
                    {pass.remaining}
                  </span>
                  <span className="text-sm font-bold opacity-60 mb-1">
                    / {pass.total}회 남음
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* SECTION 2: 캘린더 (커스텀 캘린더 UI) */}
          <section data-aos="fade-right">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2">
              <CalendarIcon size={20} className="text-[#52b788]" /> 예약 날짜
              선택
            </h2>
            <div className="bg-white rounded-[40px] p-8 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black italic">MAY 2026</h3>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-[#f0f7f4] rounded-full transition-colors">
                    <ChevronLeft size={20} />
                  </button>
                  <button className="p-2 hover:bg-[#f0f7f4] rounded-full transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center mb-4 text-[11px] font-black text-gray-400">
                {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(day)}
                    className={`aspect-square rounded-2xl flex items-center justify-center text-sm font-bold transition-all ${
                      selectedDate === day
                        ? "bg-[#52b788] text-white shadow-lg scale-110"
                        : "hover:bg-[#f0f7f4]"
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
              <Clock size={20} className="text-[#52b788]" /> 시간 선택
            </h2>
            <div className="bg-white rounded-[40px] p-8 shadow-sm flex flex-col h-full">
              <div className="grid grid-cols-3 gap-3 mb-8">
                {availableTimes.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`py-4 rounded-2xl font-black text-sm transition-all border ${
                      selectedTime === time
                        ? "bg-[#2d6a4f] text-white border-[#2d6a4f]"
                        : "bg-white border-gray-100 hover:border-[#52b788]"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>

              {/* 주의사항 문구 */}
              <div className="bg-[#fff9db] rounded-3xl p-6 mb-8 border border-[#f59f00]/20">
                <h4 className="flex items-center gap-2 text-[#e67700] font-black text-sm mb-3">
                  <AlertCircle size={16} /> 예약 전 꼭 확인해주세요!
                </h4>
                <ul className="text-[13px] text-[#868e96] space-y-2 font-medium leading-relaxed">
                  <li>
                    • 수업 시작 24시간 전까지만 취소 및 변경이 가능합니다.
                  </li>
                  <li>
                    • 당일 무단 결석 시 이용권 회수가 차감되니 유의바랍니다.
                  </li>
                  <li>
                    • 구장 내에서는 반드시 풋살화 또는 운동화를 착용해야 합니다.
                  </li>
                </ul>
              </div>

              <button
                disabled={!selectedTime}
                className={`mt-auto w-full py-6 rounded-[25px] font-black text-lg transition-all ${
                  selectedTime
                    ? "bg-[#1b4332] text-white shadow-2xl hover:scale-[1.02]"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                {selectedTime
                  ? `${selectedDate}일 ${selectedTime} 예약하기`
                  : "시간을 선택해주세요"}
              </button>
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-20 text-center opacity-20 text-[11px] font-black uppercase tracking-[0.4em]">
        &copy; Green Ground Yeongjong Schedule System
      </footer>
    </div>
  );
}
