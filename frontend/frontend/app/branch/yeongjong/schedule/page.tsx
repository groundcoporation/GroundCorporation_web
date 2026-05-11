"use client";

import React, { useEffect, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  Calendar,
  Clock,
  Download,
  Maximize2,
  Info,
  CheckCircle2,
  ChevronRight,
  Waves,
} from "lucide-react";
import Link from "next/link";

export default function YeongjongSchedule() {
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    AOS.init({ duration: 1000, once: true });
  }, []);

  // 영종도 지점 전용 시간표 이미지 (관리자 페이지에서 업로드한 이미지 경로로 대체 가능)
  const scheduleImageUrl = "/resource/image/yeongjong/schedule/schedule.jpg";

  return (
    <div className="bg-[#f0f7f4] text-[#1b4332] font-sans min-h-screen">
      {/* --- 상단 타이틀 --- */}
      <section className="pt-48 pb-16 px-[5%] md:px-[10%] text-center relative overflow-hidden">
        <Waves className="absolute -top-10 -left-10 text-[#52b788]/10 w-64 h-64 rotate-12" />
        <div data-aos="fade-down" className="relative z-10">
          <span className="text-[#52b788] font-black tracking-[0.4em] text-xs uppercase italic mb-6 block">
            Elite Training Plan
          </span>
          <h1 className="text-6xl md:text-9xl font-[1000] tracking-tighter leading-[0.9] mb-8 text-[#1b4332] italic uppercase">
            WEEKLY
            <br />
            <span className="text-[#52b788]">SCHEDULE</span>
          </h1>
          <p className="text-gray-500 font-bold text-lg md:text-2xl max-w-2xl mx-auto leading-relaxed">
            영종도의 맑은 공기 속에서 진행되는{" "}
            <br className="hidden md:block" />
            프리미엄 커리큘럼의 상세 일정을 확인하세요.
          </p>
        </div>
      </section>

      {/* --- 시간표 이미지 섹션 --- */}
      <section className="px-[5%] md:px-[10%] pb-32 max-w-[1440px] mx-auto">
        <div
          className="relative group cursor-pointer overflow-hidden rounded-[60px] shadow-[0_40px_100px_-20px_rgba(27,67,50,0.15)] bg-white p-5 md:p-10 border border-[#d8f3dc]"
          data-aos="zoom-in"
          onClick={() => setIsZoomed(!isZoomed)}
        >
          {/* 이미지 오버레이 */}
          <div className="absolute inset-0 bg-[#1b4332]/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
            <div className="bg-white/90 backdrop-blur-md px-8 py-4 rounded-full flex items-center gap-3 font-black text-sm shadow-2xl text-[#1b4332]">
              <Maximize2 size={20} className="text-[#52b788]" />
              전체 화면으로 확대하기
            </div>
          </div>

          {/* 실제 시간표 이미지 */}
          <div className="overflow-hidden rounded-[40px]">
            <img
              src={scheduleImageUrl}
              alt="영종도 지점 수업 시간표"
              className={`w-full h-auto transition-transform duration-700 ease-out ${isZoomed ? "scale-110" : "scale-100"}`}
            />
          </div>

          {/* 하단 툴바 */}
          <div className="mt-10 flex flex-col md:flex-row justify-between items-center gap-8 border-t border-[#f0f7f4] pt-10">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-[#1b4332] rounded-[20px] flex items-center justify-center text-[#52b788] shadow-lg">
                <Calendar size={28} />
              </div>
              <div>
                <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest mb-1">
                  Yeongjong Edition
                </p>
                <p className="text-xl font-[1000] text-[#1b4332] tracking-tighter italic">
                  2026. 04. 29 VERSION
                </p>
              </div>
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-[#f0f7f4] text-[#1b4332] rounded-2xl font-bold text-sm hover:bg-[#d8f3dc] transition-colors border border-[#d8f3dc]">
                <Download size={18} /> PDF 저장
              </button>
              <Link
                href="/branch/yeongjong/reservation"
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-10 py-4 bg-[#52b788] text-[#1b4332] rounded-2xl font-[1000] text-sm shadow-lg shadow-[#52b788]/20 hover:scale-105 transition-transform"
              >
                수업 신청하기 <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- 수업 구성 안내 --- */}
      <section className="py-32 bg-[#1b4332] text-white rounded-t-[100px] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-5">
          <Waves size={300} />
        </div>

        <div className="px-[5%] md:px-[10%] max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <div data-aos="fade-right">
              <div className="flex items-center gap-3 text-[#52b788] mb-8">
                <Info size={28} />
                <span className="font-black tracking-[0.3em] uppercase text-sm italic">
                  Yeongjong Policy
                </span>
              </div>
              <h2 className="text-5xl md:text-7xl font-[1000] tracking-tighter mb-10 leading-[0.9] italic uppercase">
                ELITE
                <br />
                <span className="text-[#52b788]">SYSTEM</span>
              </h2>
              <div className="space-y-8">
                {[
                  {
                    t: "소수 정예(Max 8)",
                    d: "영종도 지점은 더 깊이 있는 코칭을 위해 클래스당 인원을 엄격히 제한합니다.",
                  },
                  {
                    t: "글로벌 커리큘럼",
                    d: "해외 선진 유스 시스템을 도입하여 창의적인 플레이어 성장을 돕습니다.",
                  },
                  {
                    t: "스마트 피드백",
                    d: "매주 업로드되는 훈련 영상을 통해 아이의 성장 과정을 시각적으로 확인하세요.",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-5 items-start group">
                    <div className="w-6 h-6 rounded-full bg-[#52b788]/20 flex items-center justify-center shrink-0 mt-1">
                      <CheckCircle2 className="text-[#52b788]" size={16} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black mb-2 group-hover:text-[#52b788] transition-colors">
                        {item.t}
                      </h4>
                      <p className="text-white/40 font-bold leading-relaxed">
                        {item.d}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 시각적 요소: 시간 아이콘 */}
            <div className="grid grid-cols-2 gap-6" data-aos="zoom-in">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-12 rounded-[60px] aspect-square flex flex-col justify-center items-center text-center group hover:bg-[#52b788]/10 transition-colors">
                <Clock
                  size={60}
                  className="text-[#52b788] mb-6 group-hover:animate-pulse"
                />
                <h5 className="text-3xl font-[1000] italic">WEEKDAY</h5>
                <p className="mt-3 text-white/30 text-lg font-bold tracking-tighter">
                  15:00 - 21:00
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-12 rounded-[60px] aspect-square flex flex-col justify-center items-center text-center transform translate-y-16 group hover:bg-[#52b788]/10 transition-colors">
                <Calendar
                  size={60}
                  className="text-[#52b788] mb-6 group-hover:animate-pulse"
                />
                <h5 className="text-3xl font-[1000] italic">WEEKEND</h5>
                <p className="mt-3 text-white/30 text-lg font-bold tracking-tighter">
                  10:00 - 17:00
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- 상담 안내 --- */}
      <section className="py-32 px-[5%] text-center">
        <div
          data-aos="fade-up"
          className="max-w-4xl mx-auto bg-white p-12 md:p-20 rounded-[80px] shadow-[0_50px_100px_-20px_rgba(27,67,50,0.1)] border border-[#d8f3dc]"
        >
          <h3 className="text-4xl md:text-5xl font-[1000] text-[#1b4332] mb-8 tracking-tighter italic uppercase">
            NEED A <span className="text-[#52b788]">CUSTOM</span> SLOT?
          </h3>
          <p className="text-gray-400 font-bold mb-12 text-lg md:text-xl leading-relaxed">
            영종도 지점은 선발반 및 개인 레슨 일정을 상시 조율하고 있습니다.
            <br className="hidden md:block" />
            전용 데스크로 문의하시면 가장 빠른 상담이 가능합니다.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-5">
            <Link
              href="tel:032-123-4567"
              className="px-12 py-6 bg-[#1b4332] text-white rounded-3xl font-[1000] text-lg hover:bg-[#52b788] transition-all shadow-xl shadow-[#1b4332]/20 transform hover:-translate-y-1"
            >
              상담 센터 : 032-123-4567
            </Link>
            <Link
              href="https://pf.kakao.com"
              className="px-12 py-6 border-2 border-[#1b4332] text-[#1b4332] rounded-3xl font-[1000] text-lg hover:bg-[#1b4332] hover:text-white transition-all transform hover:-translate-y-1"
            >
              카카오톡 영종채널
            </Link>
          </div>
        </div>
      </section>

      <footer className="pb-20 text-center opacity-20 text-[10px] font-black uppercase tracking-[1em]">
        &copy; Football Ground Yeongjong. All Rights Reserved.
      </footer>
    </div>
  );
}
