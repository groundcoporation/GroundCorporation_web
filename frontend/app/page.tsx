"use client";

import React, { useState } from "react";
import { useAOS } from "@/hooks/useAOS";
import {
  Menu,
  X,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Target,
  Users,
  ShieldCheck,
  Globe,
  Camera,
  Mail,
  MapPin,
  Award,
  Zap,
  HeartPulse,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function HomePage() {
  useAOS();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const businessUnits = [
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
      id: "ipasscare",
      title: "IPASSCARE",
      description: "스포츠 시설 전용 통합 관리 및 예약 솔루션",
      image:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600",
      link: "/business/ipasscare/",
      icon: <ShieldCheck className="text-blue-500" size={32} />,
    },
  ];

  const toggleSidebar = (state: boolean) => {
    setIsSidebarOpen(state);
    if (typeof document !== "undefined") {
      document.body.style.overflow = state ? "hidden" : "auto";
    }
  };

  const handleBusinessClick = (idx: number) => {
    const target = document.getElementById("business");
    target?.scrollIntoView({ behavior: "smooth" });
    setCurrentSlide(idx);
    setActiveMenu(null);
  };

  const nextSlide = () =>
    setCurrentSlide((prev) => (prev + 1) % businessUnits.length);
  const prevSlide = () =>
    setCurrentSlide(
      (prev) => (prev - 1 + businessUnits.length) % businessUnits.length,
    );

  return (
    <div className="bg-white text-[#050a14] overflow-x-hidden font-sans">
      {/* 1. 헤더 (소개, 사업 드롭다운) */}
      <header
        className="fixed top-0 w-full h-[80px] flex justify-between items-center px-[5%] z-[1000] bg-white/90 backdrop-blur-md border-b border-gray-100"
        onMouseLeave={() => setActiveMenu(null)}
      >
        <Link href="/">
          <img src="/resource/image/logo.png" alt="Logo" className="h-7" />
        </Link>

        <nav className="hidden lg:flex gap-16 h-full items-center font-black text-[15px] uppercase tracking-tighter">
          {/* 소개 드롭다운 */}
          <div
            className="relative h-full flex items-center"
            onMouseEnter={() => setActiveMenu("about")}
          >
            <button
              className={`flex items-center gap-1 transition-colors ${activeMenu === "about" ? "text-blue-600" : ""}`}
            >
              기업정보{" "}
              <ChevronDown
                size={14}
                className={`transition-transform duration-300 ${activeMenu === "about" ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence>
              {activeMenu === "about" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-[80px] left-1/2 -translate-x-1/2 w-[180px] bg-white border border-gray-100 shadow-2xl rounded-2xl p-2"
                >
                  <Link
                    href="#about"
                    onClick={() => setActiveMenu(null)}
                    className="block p-4 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all font-bold"
                  >
                    기업 개요
                  </Link>
                  <Link
                    href="#"
                    onClick={() => setActiveMenu(null)}
                    className="block p-4 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all font-bold"
                  >
                    조직도
                  </Link>
                  <Link
                    href="#"
                    onClick={() => setActiveMenu(null)}
                    className="block p-4 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all font-bold"
                  >
                    인사말
                  </Link>
                  <Link
                    href="#"
                    onClick={() => setActiveMenu(null)}
                    className="block p-4 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all font-bold"
                  >
                    연혁
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 사업 드롭다운 */}
          <div
            className="relative h-full flex items-center"
            onMouseEnter={() => setActiveMenu("business")}
          >
            <button
              className={`flex items-center gap-1 transition-colors ${activeMenu === "business" ? "text-blue-600" : ""}`}
            >
              사업분야{" "}
              <ChevronDown
                size={14}
                className={`transition-transform duration-300 ${activeMenu === "business" ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence>
              {activeMenu === "business" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-[80px] left-1/2 -translate-x-1/2 w-[260px] bg-white border border-gray-100 shadow-2xl rounded-2xl p-2"
                >
                  {businessUnits.map((unit, idx) => (
                    <button
                      key={unit.id}
                      onClick={() => handleBusinessClick(idx)}
                      className="w-full flex items-center justify-between p-4 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all group"
                    >
                      <span className="text-sm font-black tracking-tight">
                        {unit.title}
                      </span>
                      <ArrowRight
                        size={14}
                        className="opacity-0 group-hover:opacity-100 transition-all"
                      />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        <button
          onClick={() => toggleSidebar(true)}
          className="p-2 hover:bg-gray-100 rounded-full transition-all"
        >
          <Menu size={26} />
        </button>
      </header>

      {/* 2. 사이드바 (모바일) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => toggleSidebar(false)}
              className="fixed inset-0 bg-black/60 z-[1500] backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 w-[80%] max-w-[350px] h-full bg-white z-[2000] p-10 shadow-2xl font-sans"
            >
              <button
                onClick={() => toggleSidebar(false)}
                className="absolute top-6 right-6 text-gray-400"
              >
                <X size={28} />
              </button>
              <h3 className="text-2xl font-black mb-10 text-blue-600 italic uppercase">
                Navigation
              </h3>
              <nav className="space-y-8">
                <Link
                  href="#about"
                  onClick={() => toggleSidebar(false)}
                  className="block text-2xl font-black hover:text-blue-600 uppercase italic tracking-tighter"
                >
                  About Us
                </Link>
                <div className="space-y-4">
                  <p className="text-xs font-black text-gray-300 uppercase tracking-widest">
                    Business Units
                  </p>
                  {businessUnits.map((unit, idx) => (
                    <button
                      key={unit.id}
                      onClick={() => {
                        handleBusinessClick(idx);
                        toggleSidebar(false);
                      }}
                      className="block text-xl font-bold hover:text-blue-600"
                    >
                      {unit.title}
                    </button>
                  ))}
                </div>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 3. 히어로 섹션 */}
      <section className="relative h-[85vh] flex items-center justify-center bg-[#050a14]">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        >
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-playing-soccer-in-the-stadium-14250-large.mp4"
            type="video/mp4"
          />
        </video>
        <div className="relative z-10 text-center text-white px-5">
          <span
            data-aos="fade-up"
            className="block text-blue-500 font-black tracking-[0.5em] mb-4 uppercase text-xs"
          >
            Innovation in Sports
          </span>
          <h1
            data-aos="fade-up"
            data-aos-delay="100"
            className="text-6xl md:text-[7.5rem] font-black leading-none tracking-tighter mb-8 italic uppercase"
          >
            GROUND
            <br />
            <span className="text-blue-600 text-[0.85em]">CORPORATION</span>
          </h1>
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
                  미래를 설계하는 **인프라 혁신 기업**입니다.
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
                src={businessUnits[currentSlide].image}
                className="w-full h-full object-cover shadow-inner"
                alt="bg"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050a14] via-transparent to-[#050a14]" />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative z-10 h-full max-w-[1440px] mx-auto px-[5%] flex flex-col justify-center">
          <div className="mb-12">
            <h2 className="text-white text-5xl md:text-8xl font-black italic uppercase tracking-tighter mb-4">
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
                  {businessUnits[currentSlide].icon}
                </div>
                <span className="text-blue-500 font-black tracking-widest uppercase text-xs">
                  Business Unit 0{currentSlide + 1}
                </span>
              </div>
              <h3 className="text-white text-6xl md:text-[5.5rem] font-black leading-none italic uppercase mb-8 tracking-tighter font-sans">
                {businessUnits[currentSlide].title}
              </h3>
              <p className="text-white/60 text-xl md:text-2xl font-bold mb-10 leading-relaxed max-w-xl">
                {businessUnits[currentSlide].description}
              </p>

              {businessUnits[currentSlide].id === "shootingstar" ? (
                <div className="flex flex-wrap gap-4">
                  {businessUnits[currentSlide].branches?.map((branch) => (
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
                  href={businessUnits[currentSlide].link || "#"}
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
              <div className="text-white font-black text-2xl italic tracking-tighter">
                <span className="text-blue-600">0{currentSlide + 1}</span> / 0
                {businessUnits.length}
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

      {/* 6. 푸터 */}
      <footer className="bg-[#050a14] text-white px-[5%] py-24 font-sans">
        <div className="flex flex-col md:flex-row justify-between items-start gap-16 border-b border-white/10 pb-20">
          <div className="max-w-md text-left">
            <h2 className="text-4xl font-black tracking-tighter mb-8 italic uppercase">
              GROUND <span className="text-blue-600">CORP</span>
            </h2>
            <p className="text-white/40 font-medium leading-relaxed text-xs">
              (주)그라운드 코퍼레이션 | 대표이사: OOO <br />
              본사: 경기도 시흥시 배곧지구 내 프리미엄 센터 <br />
              문의: contact@groundcorp.com
            </p>
          </div>
          <div className="flex gap-20">
            <div>
              <h4 className="text-blue-600 font-black uppercase mb-6 tracking-widest text-xs">
                Business
              </h4>
              <ul className="space-y-4 font-bold text-white/60 text-sm">
                <li>슈팅스타 축구교실</li>
                <li>V.O.G SPORTS</li>
                <li>그라운드 에이전시</li>
                <li>IPASSCARE</li>
              </ul>
            </div>
            <div>
              <h4 className="text-blue-600 font-black uppercase mb-6 tracking-widest text-xs">
                SNS
              </h4>
              <div className="flex gap-4">
                <a
                  href="#"
                  className="w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center hover:bg-blue-600 transition-all"
                >
                  <Camera size={18} />
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center hover:bg-red-600 transition-all"
                >
                  <Mail size={18} />
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="pt-10 text-center md:text-left text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">
          © 2026 Ground Corporation. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
