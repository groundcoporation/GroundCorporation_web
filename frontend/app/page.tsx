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
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header"; // 분리된 헤더 임포트

export default function HomePage() {
  useAOS();
  const [currentSlide, setCurrentSlide] = useState(0);

  // 슬라이더 전용 데이터 (Header와 별개로 슬라이더 로직 유지)
  const allUnits = [
    {
      id: "shootingstar",
      title: "강인한 슛팅스타",
      description: "데이터 기반 프리미엄 유소년 축구 교육 시스템",
      image:
        "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1600",
      icon: <Target className="text-blue-500" size={32} />,
      branches: [
        { name: "시흥 배곧점", link: "/branch/siheung/main" },
        { name: "영종 국제도시점", link: "/branch/yeongjong/main" },
      ],
    },
    {
      id: "vogsports",
      title: "V.O.G SPORTS",
      description: "퍼포먼스를 위한 자체 설계 프리미엄 스포츠 브랜드",
      image:
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1600",
      link: "http://vog-sports.com/",
      icon: <ShoppingBag className="text-blue-500" size={32} />,
    },
    {
      id: "agency",
      title: "에이전시",
      description: "유망주 발굴 및 엘리트 선수 전문 매니지먼트",
      image:
        "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1600",
      link: "/business/agency/",
      icon: <Users className="text-blue-500" size={32} />,
    },
    {
      id: "scholarship",
      title: "장학사업",
      description: "꿈꾸는 유망주들을 위한 후원 및 장학 시스템",
      image:
        "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1600",
      link: "#",
      icon: <GraduationCap className="text-blue-500" size={32} />,
    },
    {
      id: "ipasscare",
      title: "IPASSCARE",
      description: "스포츠 시설 전용 통합 관리 및 예약 솔루션",
      image:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600",
      link: "/business/ipasscare/",
      icon: <ShieldCheck className="text-blue-500" size={32} />,
    },
  ];

  const nextSlide = () =>
    setCurrentSlide((prev) => (prev + 1) % allUnits.length);
  const prevSlide = () =>
    setCurrentSlide((prev) => (prev - 1 + allUnits.length) % allUnits.length);

  return (
    <div className="bg-white text-[#050a14] overflow-x-hidden font-sans">
      <Header />

      {/* 3. 히어로 섹션 */}
      <section className="relative h-[85vh] flex items-center justify-center bg-[#050a14] overflow-hidden">
        {/* 배경 이미지: 4갈래로 정렬된 역동적인 종합 스포츠 이미지 */}
        <div className="absolute inset-0 w-full h-full opacity-50 scale-105">
          <img
            src="/GroundCoropration_web/resource/image/hero_section_image.png"
            alt="Multi-Sports Action"
            className="w-full h-full object-cover object-center"
          />
        </div>

        {/* 다크 그라데이션 오버레이: 로고 시인성 확보 */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050a14]/60 via-transparent to-[#050a14]" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 text-center text-white px-5 w-full max-w-4xl mx-auto">
          <span
            data-aos="fade-up"
            className="block text-blue-500 font-black tracking-[0.5em] mb-8 uppercase text-xs md:text-sm"
          >
            Infrastructure & Performance
          </span>

          {/* 텍스트 대신 로고 이미지로 대체 */}
          <div
            data-aos="fade-up"
            data-aos-delay="100"
            className="flex justify-center items-center"
          >
            <img
              src="/GroundCoropration_web/resource/image/logo.png"
              alt="Ground Corporation Logo"
              className="w-[80%] md:w-full max-w-[700px] h-auto object-contain brightness-0 invert"
              /* brightness-0 invert: 로고가 어두운 색일 경우 흰색으로 반전시켜 히어로 섹션에서 돋보이게 함 */
            />
          </div>

          {/* 하단 슬로건 (선택 사항) */}
          <p
            data-aos="fade-up"
            data-aos-delay="200"
            className="mt-8 text-white/60 text-sm md:text-lg font-medium tracking-widest uppercase italic"
          >
            Beyond the Limit, Create the Future
          </p>
        </div>
      </section>

      {/* 4. 기업 개요 (About) */}
      <section id="about" className="py-32 md:py-48 px-[5%] bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-start">
            <div data-aos="fade-right">
              <div className="flex items-center gap-3 text-blue-600 font-black uppercase tracking-widest text-sm mb-6">
                <Globe size={20} /> Corporate Overview
              </div>
              <h2 className="text-5xl md:text-7xl font-black mb-10 leading-[1.1] tracking-tighter uppercase italic">
                Beyond Education,
                <br />
                Create New{" "}
                <span className="text-blue-600 font-black">Ground</span>
              </h2>
              <div className="space-y-6 text-gray-500 text-lg md:text-xl font-medium leading-relaxed max-w-xl">
                <p>
                  그라운드 코퍼레이션은 현장에서 얻은 데이터를 기반으로 스포츠의
                  미래를 설계하는 <strong>인프라 혁신 기업</strong>입니다.
                </p>
                <p>
                  우리는 교육을 넘어 선수와 시설, 그리고 브랜드를 하나로 잇는
                  글로벌 스포츠 에코시스템을 구축하고 있습니다.
                </p>
                <p className="text-blue-600 font-black italic uppercase tracking-tight">
                  "우리의 모든 활동은 더 나은 스포츠 환경을 위해 존재합니다."
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-6" data-aos="fade-left">
              {[
                {
                  icon: <Zap size={40} />,
                  title: "Innovation",
                  desc: "데이터 기반의 체계적인 교육 솔루션",
                },
                {
                  icon: <Award size={40} />,
                  title: "Premium",
                  desc: "타협하지 않는 최상의 퀄리티 브랜드",
                },
                {
                  icon: <Users size={40} />,
                  title: "Growth",
                  desc: "선수와 함께 꿈꾸는 무한한 성장",
                },
                {
                  icon: <HeartPulse size={40} />,
                  title: "Care",
                  desc: "투명하고 편리한 스마트 매니지먼트",
                },
              ].map((val, idx) => (
                <div
                  key={idx}
                  className={`p-10 rounded-[2.5rem] bg-gray-50 hover:bg-blue-50 transition-colors border border-gray-100 group ${idx % 2 !== 0 ? "sm:mt-12" : ""}`}
                >
                  <div className="text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                    {val.icon}
                  </div>
                  <h4 className="text-2xl font-black mb-4 uppercase italic tracking-tighter">
                    {val.title}
                  </h4>
                  <p className="text-gray-400 font-bold leading-relaxed text-sm">
                    {val.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. 사업 영역 (Business Slider) */}
      <section
        id="business"
        className="relative h-screen bg-[#050a14] overflow-hidden"
      >
        <div className="absolute inset-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              <img
                src={allUnits[currentSlide].image}
                className="w-full h-full object-cover shadow-inner"
                alt="bg"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050a14] via-transparent to-[#050a14]" />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="relative z-10 h-full max-w-[1440px] mx-auto px-[5%] flex flex-col justify-center">
          <div className="mb-12">
            <h2 className="text-white text-5xl md:text-8xl font-black italic uppercase tracking-tighter mb-4 text-white">
              Our <span className="text-blue-600">Business</span>
            </h2>
            <div className="w-20 h-2 bg-blue-600" />
          </div>
          <div className="flex flex-col md:flex-row items-end justify-between gap-10">
            <motion.div
              key={currentSlide + "content"}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              className="max-w-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl text-white">
                  {allUnits[currentSlide].icon}
                </div>
                <span className="text-blue-500 font-black tracking-widest uppercase text-xs">
                  Business Unit 0{currentSlide + 1}
                </span>
              </div>
              <h3 className="text-white text-6xl md:text-[5.5rem] font-black leading-none italic uppercase mb-8 tracking-tighter font-sans text-white">
                {allUnits[currentSlide].title}
              </h3>
              <p className="text-white/60 text-xl md:text-2xl font-bold mb-10 leading-relaxed max-w-xl">
                {allUnits[currentSlide].description}
              </p>
              {allUnits[currentSlide].id === "shootingstar" ? (
                <div className="flex flex-wrap gap-4">
                  {allUnits[currentSlide].branches?.map((branch) => (
                    <Link
                      key={branch.name}
                      href={branch.link}
                      className="group flex items-center gap-3 bg-white text-[#050a14] px-8 py-5 rounded-2xl font-black uppercase text-xs hover:bg-blue-600 hover:text-white transition-all shadow-2xl"
                    >
                      <MapPin size={18} /> {branch.name}{" "}
                      <ArrowRight
                        size={16}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  href={allUnits[currentSlide].link || "#"}
                  className="inline-flex items-center gap-4 bg-white text-[#050a14] px-10 py-5 rounded-2xl font-black uppercase text-xs hover:bg-blue-600 hover:text-white transition-all shadow-2xl"
                >
                  자세히 보기 <ArrowRight size={20} />
                </Link>
              )}
            </motion.div>
            <div className="flex items-center gap-6">
              <button
                onClick={prevSlide}
                className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-blue-600 transition-all"
              >
                <ArrowLeft size={30} />
              </button>
              <div className="text-white font-black text-2xl italic tracking-tighter text-white">
                <span className="text-blue-600">0{currentSlide + 1}</span> / 0
                {allUnits.length}
              </div>
              <button
                onClick={nextSlide}
                className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-blue-600 transition-all"
              >
                <ArrowRight size={30} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-[#12151c] text-white px-[5%] py-24 font-sans border-t border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-start gap-16 border-b border-white/10 pb-20">
          <div className="max-w-md text-left">
            <img
              src="/GroundCoropration_web/resource/image/logo.png"
              alt="Logo"
              className="h-40"
            />
            <p className="text-white/40 font-medium leading-relaxed text-xs text-white/40">
              (주)그라운드코퍼레이션 | 대표이사: 김강태 <br />
              본사: 경기도 시흥시 배곧지구 내 프리미엄 센터 <br />
              문의: groundcoporation@gmail.com
            </p>
          </div>
          <div className="flex gap-20">
            <div>
              <h4 className="text-blue-600 font-black uppercase mb-6 tracking-widest text-xs">
                Business
              </h4>
              <ul className="space-y-4 font-bold text-white/60 text-sm">
                <li>유소년 축구교실</li>
                <li>스포츠 웨어</li>
                <li>스포테인먼트</li>
                <li>IT 솔루션</li>
              </ul>
            </div>
            <div>
              <h4 className="text-blue-600 font-black uppercase mb-6 tracking-widest text-xs">
                SNS
              </h4>
              <div className="flex gap-4">
                <a
                  href="#"
                  className="w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center hover:bg-blue-600 transition-all text-white"
                >
                  <Camera size={18} />
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center hover:bg-red-600 transition-all text-white"
                >
                  <Mail size={18} />
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="pt-10 text-center md:text-left text-[10px] font-black text-white/20 uppercase tracking-[0.4em] text-white/20">
          © 2026 Ground Corporation. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
