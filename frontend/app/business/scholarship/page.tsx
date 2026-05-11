"use client";

import React, { useState } from "react";
import { useAOS } from "@/hooks/useAOS";
import {
  ArrowRight,
  GraduationCap,
  HeartHandshake,
  Trophy,
  Globe2,
  Quote,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ScholarshipPage() {
  useAOS();

  // 슬라이더 이미지 데이터
  const images = [
    {
      src: "@/../../../resource/image/scholarship1.jpg",
      alt: "Youth player looking forward",
    },
    {
      src: "@/../../../resource/image/scholarship2.jpg",
      alt: "A young soccer player in an action shot",
    },
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 다음 이미지
  const nextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  // 이전 이미지
  const prevImage = () => {
    setCurrentImageIndex(
      (prevIndex) => (prevIndex - 1 + images.length) % images.length,
    );
  };

  // 장학사업 핵심 프로그램 데이터
  const programs = [
    {
      icon: <Trophy size={32} />,
      title: "엘리트 훈련 및 장비 지원",
      desc: "경제적인 제약 없이 오직 훈련에만 집중할 수 있도록, 훈련비, 최고급 스포츠 웨어(V.O.G) 및 필수 훈련 장비를 아낌없이 후원합니다.",
      delay: "100",
    },
    {
      icon: <HeartHandshake size={32} />,
      title: "프로 선수 1:1 멘토링",
      desc: "그라운드코퍼레이션 소속 프로 선수 및 은퇴 레전드들과의 주기적인 멘토링 세션을 통해 멘탈 케어와 실전 노하우를 전수합니다.",
      delay: "200",
    },
    {
      icon: <Globe2 size={32} />,
      title: "글로벌 무대 진출 프로젝트",
      desc: "뛰어난 기량을 가진 유망주들에게 해외 명문 구단 연수 기회와 글로벌 쇼케이스 참가 비용을 전액 지원하여 세계 무대 진출을 돕습니다.",
      delay: "300",
    },
  ];

  return (
    <div className="bg-white text-[#050a14] overflow-x-hidden font-sans">
      <Header />

      {/* 1. 서브페이지 히어로 섹션 */}
      <section className="relative h-[45vh] md:h-[55vh] flex items-center justify-center bg-[#050a14] overflow-hidden">
        {/* 배경 이미지 (유소년/희망/스포츠 관련 이미지) */}
        <div className="absolute inset-0 w-full h-full opacity-40 scale-105">
          <img
            src="https://images.unsplash.com/photo-1518605368461-1e1e38ce81ee?q=80&w=1600"
            alt="Scholarship Background"
            className="w-full h-full object-cover object-top grayscale mix-blend-luminosity"
          />
        </div>

        {/* 다크 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-[#050a14]/80 to-[#050a14]" />

        <div className="relative z-10 text-center text-white px-5 w-full max-w-4xl mx-auto pt-20">
          <span
            data-aos="fade-up"
            className="block text-blue-500 font-black tracking-[0.5em] mb-4 uppercase text-xs md:text-sm"
          >
            Sportainment Unit
          </span>
          <h1
            data-aos="fade-up"
            data-aos-delay="100"
            className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter"
          >
            Ground Corporation{" "}
            <span className="text-blue-600">Scholarship</span>
          </h1>
        </div>
      </section>

      {/* 2. 장학사업 비전 소개 섹션 */}
      <section className="py-24 md:py-32 px-[5%] bg-gray-50 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* 텍스트 영역 */}
            <div data-aos="fade-right">
              <div className="flex items-center gap-3 text-blue-600 font-black uppercase tracking-widest text-sm mb-6">
                <GraduationCap size={20} /> Future Stars
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-8 leading-[1.2] tracking-tighter uppercase italic">
                미래의 별들을 위한 <br />
                <span className="text-blue-600">가장 든든한 러닝메이트</span>
              </h2>

              <div className="space-y-6 text-gray-500 text-lg font-medium leading-relaxed break-keep">
                <p>
                  스포츠의 미래는 지금 이 순간에도 땀방울을 흘리고 있는 유소년
                  선수들에게 달려있습니다. 하지만 뛰어난 재능을 가지고 있음에도
                  불구하고, 환경적인 제약으로 인해 꿈을 포기해야 하는 안타까운
                  상황들이 여전히 존재합니다.
                </p>
                <p>
                  그라운드코퍼레이션 장학사업은 이러한 유망주들이{" "}
                  <strong>자신의 잠재력을 100% 발휘할 수 있도록</strong> 돕기
                  위해 시작되었습니다. 단순한 일회성 재정 지원을 넘어, 선수로서
                  올바르게 성장하고 더 넓은 세계 무대로 나아갈 수 있도록
                  체계적이고 지속적인 매니지먼트를 함께 제공합니다.
                </p>
              </div>

              {/* 인용구 박스 */}
              <div className="mt-10 p-8 bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                <Quote className="text-gray-100 absolute right-4 -bottom-4 w-24 h-24 rotate-12" />
                <p className="relative z-10 text-xl font-bold text-[#050a14] italic tracking-tight break-keep">
                  "선수들의 재능이 환경의 장벽에 부딪히지 않도록,{" "}
                  <br className="hidden sm:block" />
                  그라운드코퍼레이션이 그들의{" "}
                  <span className="text-blue-600">견고한 그라운드</span>가
                  되어주겠습니다."
                </p>
              </div>
            </div>

            {/* 이미지 영역 (슬라이더 적용) */}
            <div className="relative group" data-aos="fade-left">
              {/* 뒷 배경 오프셋 효과 */}
              <div className="absolute inset-0 bg-blue-600 rounded-3xl translate-x-4 translate-y-4 group-hover:translate-x-6 group-hover:translate-y-6 transition-transform duration-500 z-0"></div>

              {/* 이미지 및 컨트롤 컨테이너 */}
              <div className="relative z-10 w-full h-[500px] rounded-3xl overflow-hidden shadow-xl">
                <img
                  src={images[currentImageIndex].src}
                  alt={images[currentImageIndex].alt}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                />

                {/* 내비게이션 버튼 (화살표) */}
                <div className="absolute inset-x-0 bottom-6 px-4 flex justify-center gap-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={prevImage}
                    className="p-3 bg-white/90 backdrop-blur-sm rounded-full text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-lg focus:outline-none"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="p-3 bg-white/90 backdrop-blur-sm rounded-full text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-lg focus:outline-none"
                    aria-label="Next image"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 장학지원 핵심 프로그램 (카드 섹션) */}
      {/* <section className="py-24 px-[5%] bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16" data-aos="fade-up">
            <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tighter uppercase italic text-[#050a14]">
              Core <span className="text-blue-600">Programs</span>
            </h2>
            <p className="mt-4 text-gray-500 font-medium">
              단순한 후원을 넘어선 통합 스포테인먼트 케어
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {programs.map((prog, idx) => (
              <div
                key={idx}
                data-aos="fade-up"
                data-aos-delay={prog.delay}
                className="bg-gray-50 p-10 rounded-3xl border border-gray-100 hover:bg-[#050a14] hover:border-[#050a14] transition-colors duration-500 group"
              >
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-blue-600 mb-8 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                  {prog.icon}
                </div>
                <h3 className="text-2xl font-black text-[#050a14] mb-4 group-hover:text-white transition-colors duration-500">
                  {prog.title}
                </h3>
                <p className="text-gray-500 leading-relaxed font-medium break-keep group-hover:text-gray-400 transition-colors duration-500">
                  {prog.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* 4. 하단 비전 배너 */}
      <section className="py-20 bg-gray-50 border-t border-gray-100 px-[5%]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div data-aos="fade-right">
            <h4 className="text-3xl font-black italic uppercase tracking-tighter mb-2">
              Beyond the Limit,{" "}
              <span className="text-blue-600">Create the Future</span>
            </h4>
            <p className="text-gray-500 font-medium">
              그라운드코퍼레이션의 다양한 비즈니스 영역을 확인해 보세요.
            </p>
          </div>
          <div data-aos="fade-left">
            <a
              href="/#business"
              className="inline-flex items-center gap-4 bg-[#050a14] text-white px-10 py-5 rounded-2xl font-black uppercase text-xs hover:bg-blue-600 transition-all shadow-xl group"
            >
              사업영역 보기
              <ArrowRight
                size={20}
                className="group-hover:translate-x-1 transition-transform"
              />
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
