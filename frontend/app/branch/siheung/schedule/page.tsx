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
} from "lucide-react";
import Link from "next/link";

export default function SiheungSchedule() {
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    AOS.init({ duration: 1000, once: true });
  }, []);

  // 실제 시간표 이미지 경로 (현재는 샘플 이미지입니다)
  const scheduleImageUrl =
    "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=2000";

  return (
    <div className="bg-[#f2efe9] text-[#1a3021] font-sans min-h-screen">
      {/* --- 상단 타이틀 --- */}
      <section className="pt-48 pb-16 px-[5%] md:px-[10%] text-center">
        <div data-aos="fade-down">
          <span className="text-[#d35400] font-black tracking-[0.4em] text-xs uppercase italic mb-6 block">
            Training Program
          </span>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 text-[#1a3021]">
            WEEKLY
            <br />
            <span className="text-[#d35400]">SCHEDULE</span>
          </h1>
          <p className="text-gray-500 font-bold text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            연령별, 수준별 체계적으로 짜여진 시흥 본점의{" "}
            <br className="hidden md:block" />
            최신 수업 시간표를 확인하세요.
          </p>
        </div>
      </section>

      {/* --- 시간표 이미지 섹션 (사용자 요청 사항) --- */}
      <section className="px-[5%] md:px-[10%] pb-24 max-w-[1440px] mx-auto">
        <div
          className="relative group cursor-pointer overflow-hidden rounded-[40px] shadow-2xl bg-white p-4 md:p-8 border border-black/5"
          data-aos="zoom-in"
          onClick={() => setIsZoomed(!isZoomed)}
        >
          {/* 이미지 오버레이 (호버 시 안내) */}
          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
            <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-2 font-black text-sm shadow-xl">
              <Maximize2 size={18} className="text-[#d35400]" />
              이미지 확대해서 보기
            </div>
          </div>

          {/* 실제 시간표 이미지 */}
          <img
            src={scheduleImageUrl}
            alt="시흥 본점 수업 시간표"
            className={`w-full h-auto rounded-[20px] transition-transform duration-500 ${isZoomed ? "scale-110" : "scale-100"}`}
          />

          {/* 하단 툴바 */}
          <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-gray-100 pt-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1a3021] rounded-2xl flex items-center justify-center text-white">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-black uppercase tracking-widest">
                  Last Updated
                </p>
                <p className="text-lg font-black text-[#1a3021]">
                  2026. 04. 25 업데이트
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-6 py-3 bg-gray-100 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-colors">
                <Download size={18} /> 시간표 다운로드
              </button>
              <Link
                href="/branch/siheung/reservation"
                className="flex items-center gap-2 px-8 py-3 bg-[#d35400] text-white rounded-2xl font-black text-sm shadow-lg shadow-orange-900/20 hover:scale-105 transition-transform"
              >
                수업 신청하기 <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- 수업 구성 안내 (추가 권장 섹션) --- */}
      <section className="py-24 bg-[#1a3021] text-white rounded-t-[80px]">
        <div className="px-[5%] md:px-[10%] max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div data-aos="fade-right">
              <div className="flex items-center gap-3 text-[#d35400] mb-6">
                <Info size={24} />
                <span className="font-black tracking-widest uppercase text-sm">
                  Class Information
                </span>
              </div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 leading-tight">
                모든 수업은
                <br />
                전담 코치제로
                <br />
                운영됩니다.
              </h2>
              <div className="space-y-6">
                {[
                  {
                    t: "정원제 수업",
                    d: "한 클래스당 최대 인원을 제한하여 밀착 코칭을 제공합니다.",
                  },
                  {
                    t: "연령별 세분화",
                    d: "아이들의 발달 단계에 맞춘 최적화된 훈련 프로그램을 적용합니다.",
                  },
                  {
                    t: "실시간 피드백",
                    d: "수업 후 학부모님께 당일 훈련 리포트를 전달해 드립니다.",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <CheckCircle2
                      className="text-[#d35400] shrink-0 mt-1"
                      size={20}
                    />
                    <div>
                      <h4 className="text-xl font-black mb-1">{item.t}</h4>
                      <p className="text-white/50 font-medium">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 시각적 요소: 시간 아이콘 레이아웃 */}
            <div className="grid grid-cols-2 gap-4" data-aos="zoom-in">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-10 rounded-[50px] aspect-square flex flex-col justify-center items-center text-center">
                <Clock size={48} className="text-[#d35400] mb-4" />
                <h5 className="text-2xl font-black">평일반</h5>
                <p className="mt-2 text-white/40 text-sm font-medium">
                  14:00 - 20:00
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/10 p-10 rounded-[50px] aspect-square flex flex-col justify-center items-center text-center transform translate-y-12">
                <Calendar size={48} className="text-[#d35400] mb-4" />
                <h5 className="text-2xl font-black">주말반</h5>
                <p className="mt-2 text-white/40 text-sm font-medium">
                  09:00 - 18:00
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- 상담 안내 --- */}
      <section className="py-24 px-[5%] text-center">
        <div
          data-aos="fade-up"
          className="max-w-3xl mx-auto bg-white p-16 rounded-[60px] shadow-xl"
        >
          <h3 className="text-2xl md:text-4xl font-black text-[#1a3021] mb-6 tracking-tighter">
            원하는 시간이 없으신가요?
          </h3>
          <p className="text-gray-500 font-bold mb-10 text-lg">
            개인 레슨 및 단체 대관은 별도로 문의해 주시면
            <br />
            조율 가능한 일정을 안내해 드립니다.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 font-black">
            <Link
              href="tel:031-123-4567"
              className="px-10 py-5 bg-[#1a3021] text-white rounded-full hover:bg-[#d35400] transition-colors"
            >
              전화 상담 : 031-123-4567
            </Link>
            <Link
              href="https://pf.kakao.com"
              className="px-10 py-5 border-2 border-[#1a3021] text-[#1a3021] rounded-full hover:bg-[#1a3021] hover:text-white transition-all"
            >
              카카오톡 문의하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
