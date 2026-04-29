"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Users,
  Handshake,
  CheckCircle2,
  ArrowRight,
  Menu,
  X,
  Globe,
  Camera,
  Mail,
} from "lucide-react";
import Link from "next/link";

export default function AgencyPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 사이드바 토글 함수
  const toggleSidebar = (state: boolean) => {
    setIsSidebarOpen(state);
    if (typeof document !== "undefined") {
      document.body.style.overflow = state ? "hidden" : "auto";
    }
  };

  return (
    <div className="bg-white text-[#050a14] font-sans overflow-x-hidden">
      {/* --- 1. 헤더 (Header) --- */}
      <header className="fixed top-0 w-full h-[80px] flex justify-between items-center px-[5%] z-[1000] bg-white/90 backdrop-blur-md border-b border-gray-100">
        <Link href="/">
          <img src="/resource/image/logo.png" alt="Logo" className="h-7" />
        </Link>
        <nav className="hidden lg:flex gap-10 font-black text-[14px] uppercase tracking-tighter text-[#050a14]">
          <Link
            href="/#about"
            className="hover:text-blue-600 transition-colors"
          >
            기업 개요
          </Link>
          <Link
            href="/#business"
            className="hover:text-blue-600 transition-colors"
          >
            사업 영역
          </Link>
          <Link
            href="/branch/siheung/main"
            className="text-blue-500 hover:text-blue-700"
          >
            슈팅스타
          </Link>
          <Link
            href="http://vog-sports.com/"
            target="_blank"
            className="hover:text-blue-600"
          >
            V.O.G SHOP
          </Link>
        </nav>
        <button
          onClick={() => toggleSidebar(true)}
          className="p-2 hover:bg-gray-100 rounded-full transition-all"
        >
          <Menu size={26} />
        </button>
      </header>

      {/* --- 2. 사이드바 (Sidebar) --- */}
      <div
        className={`fixed inset-0 bg-black/60 z-[1500] backdrop-blur-sm transition-opacity duration-500 ${isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => toggleSidebar(false)}
      />
      <aside
        className={`fixed top-0 right-0 w-[80%] max-w-[350px] h-full bg-white z-[2000] p-10 transition-transform duration-500 shadow-2xl ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <button
          onClick={() => toggleSidebar(false)}
          className="absolute top-6 right-6 text-gray-400"
        >
          <X size={28} />
        </button>
        <h3 className="text-2xl font-black mb-10 text-blue-600 italic uppercase">
          Menu
        </h3>
        <nav className="space-y-6">
          <Link
            href="/"
            className="block text-xl font-bold hover:text-blue-600"
          >
            Home
          </Link>
          <Link
            href="/agency"
            className="block text-xl font-bold text-blue-600"
          >
            Ground Agency
          </Link>
          <Link
            href="http://vog-sports.com/"
            className="block text-xl font-bold hover:text-blue-600"
          >
            V.O.G Sports
          </Link>
        </nav>
      </aside>

      {/* --- 3. 히어로 섹션 (Hero) --- */}
      <section className="relative pt-[120px] pb-20 px-[5%] bg-gray-50 overflow-hidden">
        <div className="absolute right-[-10%] top-0 opacity-[0.03] pointer-events-none">
          <Users size={800} />
        </div>
        <div className="max-w-7xl w-full mx-auto relative z-10">
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-blue-600 font-black tracking-widest uppercase text-sm mb-4 block"
          >
            Elite Management System
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter leading-tight mb-6"
          >
            GROUND <span className="text-blue-600 font-black">AGENCY</span>
          </motion.h1>
          <p className="text-gray-500 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
            데이터 기반의 유망주 발굴 시스템과 차별화된 브랜딩 전략으로
            <br />
            스포츠 비즈니스의 새로운 스탠다드를 제시합니다.
          </p>
        </div>
      </section>

      {/* --- 4. 스포츠 마케팅 (상세 펼침) --- */}
      <section className="py-32 px-[5%] border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-16 items-center">
          <div className="flex-1">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
            <h2 className="text-4xl md:text-5xl font-black italic uppercase mb-8 tracking-tighter">
              Sports Marketing
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8 font-medium">
              단순한 선수 관리를 넘어, V.O.G SPORTS와 연계하여 독자적인 미디어
              노출 시스템과 스폰서십을 구축합니다. 선수의 스토리를 가치 있는
              브랜드로 만듭니다.
            </p>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 font-bold text-gray-800">
              {[
                "독점 브랜딩 전략",
                "글로벌 스폰서십",
                "미디어 매니지먼트",
                "이미지 권리 보호",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle2 className="text-blue-600" size={18} /> {f}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-gray-100 rounded-[3rem] aspect-video overflow-hidden shadow-xl">
            <img
              src="https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=1600"
              className="w-full h-full object-cover"
              alt="Marketing"
            />
          </div>
        </div>
      </section>

      {/* --- 5. 소속 선수 (그리드 노출) --- */}
      <section className="py-32 px-[5%] bg-gray-50">
        <div className="max-w-7xl mx-auto mb-16">
          <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-4">
            Our Players
          </h2>
          <div className="w-20 h-1.5 bg-blue-600" />
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="group bg-white rounded-[2.5rem] overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500"
            >
              <div className="aspect-[4/5] overflow-hidden relative">
                <img
                  src={`https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800`}
                  alt="Player"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-8 left-8">
                  <p className="text-blue-400 font-black text-xs uppercase mb-1">
                    Position / Team Name
                  </p>
                  <h4 className="text-white text-3xl font-black italic uppercase tracking-tighter">
                    Elite Player {i}
                  </h4>
                </div>
              </div>
              <div className="p-8">
                <p className="text-gray-500 font-medium text-sm leading-relaxed italic">
                  "그라운드 에이전시와 함께하는 여정은 선수의 가치를 단순한 성적
                  그 이상으로 증명해줍니다."
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- 6. 계약 사례 (리스트 펼침) --- */}
      <section className="py-32 px-[5%]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black italic uppercase mb-12 tracking-tighter">
            Contract Cases
          </h2>
          <div className="space-y-4">
            {[
              {
                title: "K리그1 상위 구단 프로 입단 계약 체결",
                club: "A FC",
                type: "Pro Contract",
              },
              {
                title: "유럽 주요 리그 이적 협상 및 매니지먼트",
                club: "B City FC",
                type: "Transfer",
              },
              {
                title: "V.O.G SPORTS 글로벌 브랜드 앰버서더 발탁",
                club: "V.O.G",
                type: "Sponsorship",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col md:flex-row md:items-center justify-between p-10 rounded-3xl border border-gray-100 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-start gap-6">
                  <div className="hidden md:flex w-14 h-14 rounded-2xl bg-gray-50 items-center justify-center font-black text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    0{idx + 1}
                  </div>
                  <div>
                    <span className="text-blue-600 font-black text-xs uppercase tracking-widest">
                      {item.type}
                    </span>
                    <h4 className="text-xl md:text-2xl font-black uppercase mt-1 tracking-tight text-gray-800">
                      {item.title}
                    </h4>
                    <p className="text-gray-400 font-bold text-sm">
                      {item.club}
                    </p>
                  </div>
                </div>
                <div className="mt-6 md:mt-0">
                  <div className="inline-flex items-center gap-2 text-sm font-black uppercase text-gray-400 group-hover:text-blue-600 transition-colors">
                    Case Study <ArrowRight size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- 7. 푸터 (Footer) --- */}
      <footer className="bg-[#050a14] text-white px-[5%] py-24">
        <div className="flex flex-col md:flex-row justify-between items-start gap-16 border-b border-white/10 pb-20">
          <div className="max-w-md">
            <h2 className="text-4xl font-black tracking-tighter mb-8 italic uppercase">
              GROUND <span className="text-blue-600 font-black">CORP</span>
            </h2>
            <p className="text-white/40 font-medium leading-relaxed">
              (주)그라운드 코퍼레이션 | 대표이사: OOO <br />
              본사: 경기도 시흥시 배곧지구 내 프리미엄 센터 <br />
              문의: contact@groundcorp.com
            </p>
          </div>
          <div className="flex gap-20">
            <div>
              <h4 className="text-blue-600 font-black uppercase mb-6 tracking-widest text-xs">
                Social
              </h4>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center hover:bg-blue-600 transition-all">
                  <Camera size={18} />
                </div>
                <div className="w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center hover:bg-blue-600 transition-all">
                  <Mail size={18} />
                </div>
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
