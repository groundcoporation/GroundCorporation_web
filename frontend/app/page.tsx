"use client";

import React, { useState } from "react";
import { useAOS } from "@/hooks/useAOS";
import {
  ArrowRight,
  ArrowLeft,
  Target,
  ShoppingBag,
  Users,
  ShieldCheck,
  Globe,
  Camera,
  Mail,
  MapPin,
  Award,
  Zap,
  HeartPulse,
  GraduationCap,
  Trophy,
  Database,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function HomePage() {
  useAOS();

  // 상태 관리 (사업 영역 슬라이더용)
  const [currentUnit, setCurrentUnit] = useState(0);

  // 통합 6대 비즈니스 데이터
  const businessUnits = [
    {
      id: "shootingstar",
      category: "Sports Education",
      title: "강인한 슛팅스타",
      description:
        "데이터 기반 프리미엄 유소년 축구교실 '강인한 슛팅스타' 운영 및 체계적인 유망주 육성 시스템",
      image:
        "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1600",
      icon: <Target size={28} />,
      branches: [
        { name: "시흥 배곧점", link: "/branch/siheung/main" },
        { name: "영종 국제도시점", link: "/branch/yeongjong/main" },
      ],
    },
    {
      id: "vogsports",
      category: "Sports Wear",
      title: "보그스포츠 (V.O.G SPORTS)",
      description:
        "퍼포먼스 향상을 위한 자체 설계 프리미엄 스포츠 브랜드 '보그스포츠(V.O.G SPORTS)' 전개 및 용품 유통",
      image: "/resource/image/vogsports_image.png",
      link: "http://vog-sports.com/",
      icon: <ShoppingBag size={28} />,
    },
    {
      id: "agency",
      category: "Management",
      title: "우수 선수 매니지먼트",
      description:
        "재능 있는 유망주 발굴부터 프로 구단 입단, 글로벌 무대 진출까지 책임지는 전문 매니지먼트",
      image:
        "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1600",
      link: "/business/agency/",
      icon: <Users size={28} />,
    },
    {
      id: "scholarship",
      category: "CSR",
      title: "우수 선수 장학사업",
      description:
        "미래의 별들이 환경의 제약 없이 꿈을 펼칠 수 있도록 돕는 체계적인 후원 및 장학금 지원",
      image:
        "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1600",
      link: "#",
      icon: <GraduationCap size={28} />,
    },
    {
      id: "ipasscare",
      category: "IT Solution",
      title: "아이패스케어 (IPASSCARE)",
      description:
        "스포츠 시설 전용 통합 관리 플랫폼 '아이패스케어(IPASSCARE)' 솔루션 및 데이터 기반 교육 콘텐츠 제공",
      image:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600",
      link: "/business/ipasscare/",
      icon: <Database size={28} />,
    },
    {
      id: "club",
      category: "Infrastructure",
      title: "스포츠단 운영",
      description:
        "그라운드코퍼레이션만의 흔들림 없는 철학이 담긴 전문적인 스포츠팀 인프라 구축 및 클럽 운영",
      image:
        "https://images.unsplash.com/photo-1518605368461-1e1e38ce81ee?q=80&w=1600",
      link: "#",
      icon: <Trophy size={28} />,
    },
  ];

  const handleNext = () =>
    setCurrentUnit((prev) => (prev + 1) % businessUnits.length);
  const handlePrev = () =>
    setCurrentUnit(
      (prev) => (prev - 1 + businessUnits.length) % businessUnits.length,
    );

  return (
    <div className="bg-white text-[#050a14] overflow-x-hidden font-sans">
      <Header />

      {/* 3. 히어로 섹션 (수정 불가 요청 사항 - 완벽 유지) */}
      <section className="relative h-[85vh] flex items-center justify-center bg-[#050a14] overflow-hidden">
        <div className="absolute inset-0 w-full h-full opacity-50 scale-105">
          <img
            src="/resource/image/hero_section_image.png"
            alt="Multi-Sports Action"
            className="w-full h-full object-cover object-center"
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-[#050a14]/60 via-transparent to-[#050a14]" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 text-center text-white px-5 w-full max-w-4xl mx-auto">
          <span
            data-aos="fade-up"
            className="block text-blue-500 font-black tracking-[0.5em] mb-8 uppercase text-xs md:text-sm"
          >
            Infrastructure & Performance
          </span>

          <div
            data-aos="fade-up"
            data-aos-delay="100"
            className="flex justify-center items-center"
          >
            <img
              src="/resource/image/logo.png"
              alt="Ground Corporation Logo"
              className="w-[80%] md:w-full max-w-[700px] h-auto object-contain brightness-0 invert"
            />
          </div>

          <p
            data-aos="fade-up"
            data-aos-delay="200"
            className="mt-8 text-white/60 text-sm md:text-lg font-medium tracking-widest uppercase italic"
          >
            Beyond the Limit, Create the Future
          </p>
        </div>
      </section>

      {/* 4. 기업 개요 (About) - 애플/하이엔드 스타일의 미니멀 비주얼 레이아웃 */}
      <section id="about" className="py-24 md:py-32 px-[5%] bg-white">
        <div className="max-w-7xl mx-auto">
          {/* 타이포그래피 영역 */}
          <div
            className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 md:mb-20"
            data-aos="fade-up"
          >
            <div>
              <span className="text-blue-600 font-bold uppercase tracking-widest text-xs mb-4 block">
                Corporate Overview
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight leading-[1.3] break-keep">
                현장의 노하우와 데이터의 결합, <br />
                스포츠 비즈니스의 새로운 표준.
              </h2>
            </div>
            <div className="md:max-w-md">
              <p className="text-gray-500 text-base md:text-lg font-medium leading-relaxed break-keep">
                단순한 에이전시를 넘어 교육, 시설, 브랜드를 하나로 잇습니다.
                그라운드코퍼레이션만의 독보적인 글로벌 에코시스템으로 선수의
                성장을 지원합니다.
              </p>
            </div>
          </div>

          {/* 벤토 그리드 (시각 자료 위주) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 auto-rows-[280px] md:auto-rows-[360px]">
            {/* Box 1: 통합 에코시스템 (메인 이미지) */}
            <div
              className="md:col-span-2 md:row-span-2 rounded-[2rem] overflow-hidden relative group shadow-sm"
              data-aos="fade-up"
            >
              <img
                src="https://images.unsplash.com/photo-1510074377623-8cf13fb86c08?q=80&w=1600"
                alt="Global Ecosystem"
                className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050a14]/90 via-[#050a14]/20 to-transparent" />
              <div className="absolute bottom-8 left-8 md:bottom-12 md:left-12">
                <div className="flex items-center gap-3 mb-3">
                  <Globe size={20} className="text-blue-500" />
                  <span className="text-blue-500 font-bold tracking-widest text-xs uppercase">
                    Global Ecosystem
                  </span>
                </div>
                <h3 className="text-white text-3xl md:text-5xl font-bold tracking-tight mb-4">
                  통합 인프라 네트워크
                </h3>
                <p className="text-white/80 text-base md:text-lg font-medium max-w-sm break-keep">
                  유소년 아카데미부터 엘리트 매니지먼트, IT 솔루션까지 완벽하게
                  이어지는 밸류체인.
                </p>
              </div>
            </div>

            {/* Box 2: 핵심 가치 - 혁신과 프리미엄 (이미지 추가됨) */}
            <div
              className="rounded-[2rem] overflow-hidden relative group shadow-sm"
              data-aos="fade-left"
              data-aos-delay="100"
            >
              <img
                src="https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=800"
                alt="Innovation & Premium"
                className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
              <div className="absolute bottom-8 left-8 md:bottom-10 md:left-10 pr-8">
                <Zap size={28} className="text-white mb-4" />
                <h3 className="text-white text-2xl font-bold tracking-tight mb-2">
                  Innovation & Premium
                </h3>
                <p className="text-white/80 text-sm md:text-base font-medium break-keep">
                  데이터 기반 혁신과 타협하지 않는 최상의 퀄리티.
                </p>
              </div>
            </div>

            {/* Box 3: 핵심 가치 - 성장과 케어 */}
            <div
              className="rounded-[2rem] overflow-hidden relative group shadow-sm"
              data-aos="fade-left"
              data-aos-delay="200"
            >
              <img
                src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=800"
                alt="Care & Growth"
                className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
              <div className="absolute bottom-8 left-8 md:bottom-10 md:left-10 pr-8">
                <Users size={28} className="text-white mb-4" />
                <h3 className="text-white text-2xl font-bold tracking-tight mb-2">
                  Growth & Care
                </h3>
                <p className="text-white/80 text-sm md:text-base font-medium break-keep">
                  선수들과 함께 나아가는 스마트 매니지먼트.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 주요 사업 영역 (전체화면 배경 + 화이트 카드 UI - 유지) */}
      <section
        id="business"
        className="relative h-screen min-h-[800px] flex items-center bg-gray-900 overflow-hidden"
      >
        <div className="absolute inset-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentUnit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <img
                src={businessUnits[currentUnit].image}
                className="w-full h-full object-cover"
                alt={businessUnits[currentUnit].title}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-[5%] h-full flex items-end md:items-center pb-24 md:pb-0">
          <div className="w-full max-w-xl">
            <div className="mb-8" data-aos="fade-up">
              <span className="text-white shadow-sm font-bold uppercase tracking-widest text-sm mb-2 block">
                Business Portfolio
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white drop-shadow-md">
                주요 사업 영역
              </h2>
            </div>

            <div
              data-aos="fade-up"
              data-aos-delay="100"
              className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden min-h-[380px]"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentUnit + "content"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col h-full justify-between"
                >
                  <div>
                    <div className="text-blue-600 mb-6 bg-blue-50 w-14 h-14 flex items-center justify-center rounded-xl">
                      {businessUnits[currentUnit].icon}
                    </div>

                    <span className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2 block">
                      {businessUnits[currentUnit].category}
                    </span>

                    <h3 className="text-2xl md:text-3xl font-bold text-[#050a14] mb-4 break-keep">
                      {businessUnits[currentUnit].title}
                    </h3>

                    <p className="text-gray-600 text-base md:text-lg leading-relaxed font-medium mb-8 break-keep">
                      {businessUnits[currentUnit].description}
                    </p>
                  </div>

                  <div>
                    {businessUnits[currentUnit].id === "shootingstar" ? (
                      <div className="flex flex-wrap gap-2">
                        {businessUnits[currentUnit].branches?.map((branch) => (
                          <Link
                            key={branch.name}
                            href={branch.link}
                            className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-700 px-5 py-3 rounded-full font-bold text-sm hover:border-blue-600 hover:text-blue-600 transition-colors"
                          >
                            <MapPin size={16} /> {branch.name}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <Link
                        href={businessUnits[currentUnit].link || "#"}
                        className="inline-flex items-center gap-3 bg-[#050a14] text-white px-8 py-4 rounded-full font-bold text-sm hover:bg-blue-600 transition-colors"
                      >
                        자세히 보기 <ArrowRight size={18} />
                      </Link>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="absolute bottom-8 right-8 md:bottom-12 md:right-12 flex gap-3 z-20">
                <button
                  onClick={handlePrev}
                  className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-full text-gray-600 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={handleNext}
                  className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-full text-gray-600 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>

            <div className="mt-8 flex gap-2">
              {businessUnits.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentUnit(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentUnit
                      ? "w-8 bg-blue-500"
                      : "w-2 bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
