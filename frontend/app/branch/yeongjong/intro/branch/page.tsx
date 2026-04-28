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
  Waves,
} from "lucide-react";
import Link from "next/link";

export default function YeongjongAbout() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    AOS.init({ duration: 1000, once: true });
  }, []);

  // 영종도 지점 전용 시설 데이터
  const facilities = [
    {
      // intro1.jpg: 아무도 없는 깨끗한 구장 전경 사진
      title: "스카이 뷰 메인 그라운드",
      desc: "영종도의 탁 트인 전망을 자랑하는 고규격 풋살 코트입니다. 최고급 친환경 인조잔디와 감각적인 육각형 LED 조명을 완비하여, 낮과 밤 언제든 아이들이 부상 걱정 없이 마음껏 뛰어놀 수 있는 최적의 환경을 제공합니다.",
      image: "/resource/image/yeongjong/intro/intro1.jpg",
    },
    {
      // intro2.jpg: 아이들과 코치님이 함께 있는 수업 사진
      title: "엘리트 퍼포먼스 코칭",
      desc: "아이들의 눈높이에 맞춘 체계적인 커리큘럼이 진행되는 현장입니다. 단순한 기술 습득을 넘어 코치진의 실시간 피드백과 역동적인 훈련을 통해 신체 발달은 물론 협동심과 리더십을 동시에 길러주는 슈팅스타만의 수업 시스템입니다.",
      image: "/resource/image/yeongjong/intro/intro2.jpg",
    },
    {
      // intro3.jpg: 육각형 조명과 테이블이 있는 상담/대기 공간
      title: "프리미엄 페어런츠 라운지",
      desc: "딥 그린 테마의 모던하고 쾌적한 상담 및 참관 공간입니다. 아이들의 수업 과정을 편안하게 지켜보실 수 있으며, 전문 코치진과의 심도 있는 교육 상담을 통해 우리 아이의 성장 과정을 세밀하게 공유받으실 수 있습니다.",
      image: "/resource/image/yeongjong/intro/intro3.jpg",
    },
    {
      // intro1.jpg 활용 (디테일 강조): 구장 안전 시설 강조
      title: "세이프티 가드 시스템",
      desc: "구장 전면에 설치된 고밀도 완충벽과 안전 펜스는 격렬한 움직임 속에서도 아이들을 안전하게 보호합니다. 모든 시설물은 유소년의 활동 반경을 고려하여 설계되어 보호자분들이 안심하고 맡기실 수 있습니다.",
      image: "/resource/image/yeongjong/intro/intro1.jpg",
    },
  ];

  const nextSlide = () =>
    setCurrentSlide((prev) => (prev === facilities.length - 1 ? 0 : prev + 1));
  const prevSlide = () =>
    setCurrentSlide((prev) => (prev === 0 ? facilities.length - 1 : prev - 1));

  return (
    <div className="bg-[#f0f7f4] text-[#1b4332] font-sans overflow-x-hidden">
      {/* --- 상단 타이틀 섹션 --- */}
      <section className="pt-48 pb-24 px-[5%] md:px-[10%] max-w-[1440px] mx-auto text-center">
        <div data-aos="fade-up">
          <span className="text-[#52b788] font-black tracking-[0.4em] text-xs uppercase italic mb-6 block">
            Sea Breeze & Football Performance
          </span>
          <h1 className="text-5xl md:text-8xl font-[1000] tracking-tighter leading-[1.1] mb-10 uppercase italic">
            YEONGJONG
            <br />
            <span className="text-[#52b788]">BRANCH</span>
          </h1>
          <p className="text-gray-500 font-bold text-lg md:text-2xl max-w-3xl mx-auto leading-relaxed">
            영종도의 광활한 에너지를 담은 최고의 그라운드.{" "}
            <br className="hidden md:block" />
            아이들의 꿈이 바다처럼 넓게 펼쳐지는 프리미엄 교육 공간을
            소개합니다.
          </p>
          <div className="mt-12 animate-bounce opacity-30 flex justify-center text-[#52b788]">
            <ArrowDown size={32} />
          </div>
        </div>
      </section>

      {/* --- 시설 사진 슬라이더 --- */}
      <section className="py-24 bg-white relative rounded-t-[60px] md:rounded-t-[100px] shadow-[0_-20px_50px_rgba(27,67,50,0.05)]">
        <div className="px-[5%] md:px-[10%] max-w-[1440px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            {/* 사진 영역 */}
            <div className="w-full lg:w-[60%] relative" data-aos="fade-right">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[60px] shadow-[0_40px_80px_-20px_rgba(27,67,50,0.2)]">
                <img
                  src={facilities[currentSlide].image}
                  alt={facilities[currentSlide].title}
                  className="w-full h-full object-cover"
                />
                {/* 슬라이드 버튼 */}
                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 flex justify-between z-10">
                  <button
                    onClick={prevSlide}
                    className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center text-white hover:bg-[#1b4332] transition-all border border-white/30"
                  >
                    <ChevronLeft size={32} />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center text-white hover:bg-[#1b4332] transition-all border border-white/30"
                  >
                    <ChevronRight size={32} />
                  </button>
                </div>
              </div>
            </div>

            {/* 설명 영역 */}
            <div className="w-full lg:w-[40%] space-y-8" data-aos="fade-left">
              <div className="flex gap-2">
                {facilities.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-500 ${currentSlide === i ? "w-16 bg-[#52b788]" : "w-4 bg-gray-200"}`}
                  />
                ))}
              </div>
              <div>
                <span className="text-[#52b788] font-black text-sm tracking-widest mb-4 block italic">
                  FACILITY 0{currentSlide + 1}
                </span>
                <h3 className="text-4xl md:text-5xl font-[1000] text-[#1b4332] tracking-tighter leading-tight">
                  {facilities[currentSlide].title}
                </h3>
              </div>
              <p className="text-xl font-medium text-gray-500 leading-relaxed">
                {facilities[currentSlide].desc}
              </p>
              <div className="pt-8">
                <div className="flex items-center gap-4 text-[#52b788] font-black uppercase tracking-[0.2em] text-sm italic">
                  <span>Elite Environment</span>
                  <div className="h-[1px] w-24 bg-[#52b788]/30" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- 수업 영상 섹션 --- */}
      <section className="py-24 md:py-40 px-[5%] md:px-[10%] bg-[#1b4332] rounded-b-[100px] relative">
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0] rotate-180">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="relative block w-full h-[60px] fill-white"
          >
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V120H0V28.33c68-20,134-31.13,204.34-30.13C254,1.83,285,13.83,321.39,56.44Z"></path>
          </svg>
        </div>

        <div className="max-w-7xl mx-auto mt-10">
          <div className="text-center mb-20" data-aos="fade-up">
            <h2 className="text-4xl md:text-7xl font-[1000] text-white tracking-tighter italic uppercase">
              YEONGJONG <span className="text-[#52b788]">CLIP</span>
            </h2>
            <p className="text-[#52b788] font-bold mt-4 tracking-[0.3em] uppercase text-sm">
              푸른 바다 곁에서 펼쳐지는 열정의 순간
            </p>
          </div>

          <div className="relative group cursor-pointer" data-aos="zoom-in">
            {/* 오버레이: 평소에는 투명(opacity-0), 마우스 올리면 보임(group-hover:opacity-100) */}

            <video
              className="w-full aspect-video object-cover rounded-[60px] md:rounded-[100px] shadow-2xl bg-black"
              autoPlay
              loop
              muted
              playsInline
            >
              <source
                src="/resource/video/yeongjong/introduce.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </section>

      {/* --- 수치 데이터 섹션 --- */}
      <section className="py-32 px-[5%] md:px-[10%]">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
          {[
            { label: "구장 총 면적", value: "1,500평", icon: <MapPin /> },
            { label: "연간 수강생", value: "1,200+", icon: <Users /> },
            { label: "수석 코치진", value: "12명", icon: <CheckCircle2 /> },
            { label: "지역 연계팀", value: "8개", icon: <Trophy /> },
          ].map((stat, i) => (
            <div
              key={i}
              data-aos="fade-up"
              data-aos-delay={i * 100}
              className="group"
            >
              <div className="w-20 h-20 bg-white rounded-[30px] flex items-center justify-center mx-auto text-[#52b788] shadow-xl group-hover:-translate-y-2 transition-transform">
                {stat.icon}
              </div>
              <h4 className="text-gray-400 font-bold text-xs tracking-[0.4em] uppercase mt-6 mb-2">
                {stat.label}
              </h4>
              <p className="text-4xl md:text-5xl font-[1000] text-[#1b4332] tracking-tighter italic">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* --- 하단 예약 버튼 섹션 --- */}
      <section className="pb-40 px-[5%] text-center">
        <div
          className="bg-[#1b4332] p-16 md:p-24 rounded-[80px] md:rounded-[120px] shadow-2xl inline-block w-full max-w-6xl relative overflow-hidden"
          data-aos="zoom-in"
        >
          {/* 장식용 파도 배경 아이콘 */}
          <Waves
            size={300}
            className="absolute -right-20 -bottom-20 text-white/5 rotate-12"
          />

          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-[1000] tracking-tighter mb-10 leading-tight text-white uppercase italic">
              Experience the
              <br />
              <span className="text-[#52b788]">Green Difference</span>
            </h2>
            <p className="text-white/60 text-lg md:text-xl font-bold mb-12 max-w-2xl mx-auto">
              영종도 최고의 시설을 직접 확인하는 가장 빠른 방법. 지금 무료
              상담을 예약하고 우리 아이의 미래를 설계하세요.
            </p>
            <Link
              href="/branch/yeongjong/reservation"
              className="inline-flex items-center gap-4 bg-[#52b788] text-[#1b4332] px-14 py-7 rounded-full font-black text-xl hover:bg-white transition-all shadow-xl shadow-black/20 group"
            >
              상담 예약 신청하기
              <ChevronRight
                size={24}
                className="group-hover:translate-x-2 transition-transform"
              />
            </Link>
          </div>
        </div>
      </section>

      {/* --- 하단 정보 (푸터 대용) --- */}
      <footer className="py-20 text-center opacity-30">
        <p className="text-xs font-black tracking-[1em] uppercase">
          Football Ground Yeongjong
        </p>
      </footer>
    </div>
  );
}
