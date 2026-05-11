"use client";

import React, { useEffect, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  ChevronRight,
  ChevronLeft,
  Play,
  CheckCircle2,
  MapPin,
  Users,
  Trophy,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";

export default function SiheungAbout() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    AOS.init({ duration: 1000, once: true });
  }, []);

  // 지점 사진 및 설명 데이터
  const facilities = [
    {
      title: "메인 그라운드 (A구장)",
      desc: "국제 규격의 고밀도 친환경 인조잔디가 완비된 메인 경기장입니다. 전문적인 전술 훈련과 정규 경기가 가능합니다.",
      image:
        "https://images.unsplash.com/photo-1556056504-5c7696c4c28d?q=80&w=1200",
    },
    {
      title: "세이프티 트레이닝 존",
      desc: "벽면 전체에 고탄성 완충 매트를 설치하여, 아이들이 거친 몸싸움이나 훈련 중에도 부상 걱정 없이 뛰어놀 수 있습니다.",
      image:
        "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?q=80&w=1200",
    },
    {
      title: "프리미엄 부모님 라운지",
      desc: "전면 통유리를 통해 아이들의 훈련 과정을 한눈에 관람하실 수 있습니다. 쾌적한 냉난방 시설과 카페테리아 서비스가 제공됩니다.",
      image:
        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200",
    },
    {
      title: "스마트 라커룸",
      desc: "훈련 전후 개인 소지품을 안전하게 보관하고 쾌적하게 환복할 수 있는 청결한 라커 시설입니다.",
      image:
        "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200",
    },
  ];

  const nextSlide = () =>
    setCurrentSlide((prev) => (prev === facilities.length - 1 ? 0 : prev + 1));
  const prevSlide = () =>
    setCurrentSlide((prev) => (prev === 0 ? facilities.length - 1 : prev - 1));

  return (
    <div className="bg-[#f2efe9] text-[#1a3021] font-sans overflow-x-hidden">
      {/* --- 상단 타이틀 섹션 --- */}
      <section className="pt-48 pb-24 px-[5%] md:px-[10%] max-w-[1440px] mx-auto text-center">
        <div data-aos="fade-up">
          <span className="text-[#d35400] font-black tracking-[0.4em] text-xs uppercase italic mb-6 block">
            The Heart of Football Ground
          </span>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[1.1] mb-10">
            시흥 본점,
            <br />
            축구의 새로운 <span className="text-[#d35400]">기준</span>
          </h1>
          <p className="text-gray-500 font-bold text-lg md:text-2xl max-w-3xl mx-auto leading-relaxed">
            최고의 시설이 최고의 선수를 만듭니다.{" "}
            <br className="hidden md:block" />
            단순한 경기장을 넘어, 축구의 가치를 경험하는 프리미엄 공간을
            소개합니다.
          </p>
          <div className="mt-12 animate-bounce opacity-30 flex justify-center">
            <ArrowDown size={32} />
          </div>
        </div>
      </section>

      {/* --- 시설 사진 슬라이더 (사용자 요청 사항) --- */}
      <section className="py-24 bg-white relative">
        <div className="px-[5%] md:px-[10%] max-w-[1440px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            {/* 사진 영역 */}
            <div className="w-full lg:w-[65%] relative" data-aos="fade-right">
              <div className="relative aspect-video overflow-hidden rounded-[50px] shadow-2xl">
                <img
                  src={facilities[currentSlide].image}
                  alt={facilities[currentSlide].title}
                  className="w-full h-full object-cover transition-transform duration-1000"
                />
                {/* 슬라이드 버튼 */}
                <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 flex justify-between z-10">
                  <button
                    onClick={prevSlide}
                    className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-[#d35400] transition-all"
                  >
                    <ChevronLeft size={30} />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-[#d35400] transition-all"
                  >
                    <ChevronRight size={30} />
                  </button>
                </div>
              </div>
            </div>

            {/* 설명 영역 */}
            <div className="w-full lg:w-[35%] space-y-6" data-aos="fade-left">
              <div className="flex gap-2">
                {facilities.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all ${currentSlide === i ? "w-12 bg-[#d35400]" : "w-4 bg-gray-200"}`}
                  />
                ))}
              </div>
              <h3 className="text-4xl font-black text-[#1a3021] tracking-tighter">
                {facilities[currentSlide].title}
              </h3>
              <p className="text-xl font-medium text-gray-500 leading-relaxed">
                {facilities[currentSlide].desc}
              </p>
              <div className="pt-8">
                <div className="flex items-center gap-4 text-[#d35400] font-black uppercase tracking-widest text-sm italic">
                  <span>Explore Detail</span>
                  <div className="h-[1px] w-20 bg-[#d35400]/30" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- 수업 영상 섹션 (사용자 요청 사항) --- */}
      <section className="py-24 md:py-40 px-[5%] md:px-[10%] bg-[#1a3021] rounded-b-[100px]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16" data-aos="fade-up">
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter italic">
              TRAINING CLIP
            </h2>
            <p className="text-white/40 font-bold mt-4 tracking-widest uppercase">
              실제 수업 현장의 뜨거운 열기를 확인하세요
            </p>
          </div>

          <div className="relative group cursor-pointer" data-aos="zoom-in">
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all z-10 flex items-center justify-center rounded-[60px]">
              <div className="w-24 h-24 bg-[#d35400] text-white rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                <Play size={40} fill="currentColor" />
              </div>
            </div>
            <video
              className="w-full aspect-video object-cover rounded-[60px] shadow-2xl"
              poster="https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=1200"
            >
              <source
                src="https://assets.mixkit.co/videos/preview/mixkit-boys-playing-football-in-the-stadium-14251-large.mp4"
                type="video/mp4"
              />
            </video>
          </div>
        </div>
      </section>

      {/* --- 추가 섹션: 지점 정보 수치 (Trust) --- */}
      <section className="py-32 px-[5%] md:px-[10%]">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
          {[
            { label: "구장 면적", value: "1,200평", icon: <MapPin /> },
            { label: "누적 수강생", value: "3,000+", icon: <Users /> },
            { label: "보유 코치진", value: "15명", icon: <CheckCircle2 /> },
            { label: "대회 우승", value: "24회", icon: <Trophy /> },
          ].map((stat, i) => (
            <div
              key={i}
              data-aos="fade-up"
              data-aos-delay={i * 100}
              className="space-y-4"
            >
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto text-[#d35400] shadow-lg">
                {stat.icon}
              </div>
              <h4 className="text-gray-400 font-bold text-sm tracking-widest uppercase">
                {stat.label}
              </h4>
              <p className="text-4xl font-black text-[#1a3021] tracking-tighter">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* --- 하단 예약 버튼 --- */}
      <section className="pb-32 px-[5%] text-center">
        <div
          className="bg-white p-20 rounded-[80px] shadow-2xl inline-block w-full max-w-5xl"
          data-aos="zoom-in"
        >
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-8 leading-tight text-[#1a3021]">
            백문이 불여일견입니다.
            <br />
            직접 방문하여 시설을 확인해보세요.
          </h2>
          <Link
            href="/branch/siheung/reservation"
            className="inline-flex items-center gap-4 bg-[#d35400] text-white px-12 py-6 rounded-full font-black text-xl hover:scale-110 transition-transform shadow-xl shadow-orange-900/20"
          >
            방문 상담 예약하기
          </Link>
        </div>
      </section>
    </div>
  );
}
