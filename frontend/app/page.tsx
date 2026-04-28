"use client";

import React, { useState } from "react";
import { useAOS } from "@/hooks/useAOS";
import {
  Menu,
  X,
  ArrowRight,
  ShoppingBag,
  Camera,
  Mail,
  MapPin,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  useAOS();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = (state: boolean) => {
    setIsSidebarOpen(state);
    if (typeof document !== "undefined") {
      document.body.style.overflow = state ? "hidden" : "auto";
    }
  };

  return (
    <div className="bg-white text-[#050a14] overflow-x-hidden font-sans">
      {/* 1. 사이드바 (지점 선택) */}
      <div
        className={`fixed inset-0 bg-black/60 z-[1500] backdrop-blur-sm transition-opacity duration-500 ${
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => toggleSidebar(false)}
      />
      <aside
        className={`fixed top-0 right-0 w-[80%] max-w-[350px] h-full bg-white z-[2000] p-10 transition-transform duration-500 shadow-2xl ${
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          onClick={() => toggleSidebar(false)}
          className="absolute top-6 right-6 text-gray-400 hover:text-black"
        >
          <X size={28} />
        </button>
        <h3 className="text-3xl font-black mb-10 tracking-tighter text-blue-600 italic uppercase">
          Branches
        </h3>
        <nav className="space-y-6">
          <Link
            href="/branch/siheung/main"
            className="flex items-center justify-between text-xl font-bold hover:text-blue-500 group transition-colors"
          >
            그라운드 시흥{" "}
            <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-400 ml-2 font-black uppercase">
              Siheung
            </span>
            <ArrowRight className="group-hover:translate-x-2 transition-transform" />
          </Link>
          <Link
            href="/branch/yeongjong/main"
            className="flex items-center justify-between text-xl font-bold hover:text-blue-500 group transition-colors"
          >
            그라운드 영종{" "}
            <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-400 ml-2 font-black uppercase">
              Yeongjong
            </span>
            <ArrowRight className="group-hover:translate-x-2 transition-transform" />
          </Link>
        </nav>
      </aside>

      {/* 2. 헤더 */}
      <header className="fixed top-0 w-full h-[70px] md:h-[80px] flex justify-between items-center px-[5%] z-[1000] bg-white/95 backdrop-blur-md border-b border-gray-100">
        <Link href="/" className="z-[1001]">
          <img
            src="/resource/image/logo.png"
            alt="Ground Corp Logo"
            className="h-6 md:h-7"
          />
        </Link>
        <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 gap-12 font-extrabold text-[15px] tracking-tight uppercase">
          <a href="#about" className="hover:text-blue-500 transition-colors">
            기업 철학
          </a>
          <a href="#branches" className="hover:text-blue-500 transition-colors">
            지점 안내
          </a>
          <a
            href="#shop"
            className="hover:text-blue-600 text-blue-500 flex items-center gap-1.5 group"
          >
            <ShoppingBag size={18} className="group-hover:animate-bounce" />{" "}
            V.O.G SHOP
          </a>
        </nav>
        <div className="flex items-center gap-6">
          <button
            onClick={() => toggleSidebar(true)}
            className="p-2 hover:bg-gray-50 rounded-full transition-all"
          >
            <Menu size={26} />
          </button>
        </div>
      </header>

      {/* 3. 히어로 섹션 */}
      <section className="relative h-screen flex items-center justify-center bg-[#050a14]">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        >
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-playing-soccer-in-the-stadium-14250-large.mp4"
            type="video/mp4"
          />
        </video>
        <div className="relative z-10 text-center text-white px-5">
          <h1
            data-aos="fade-up"
            className="text-6xl md:text-[8rem] font-black leading-[0.85] tracking-tighter mb-8 italic uppercase"
          >
            GROUND
            <br />
            <span className="text-blue-600">CORPORATION</span>
          </h1>
          <p
            data-aos="fade-up"
            data-aos-delay="200"
            className="text-lg md:text-2xl font-light opacity-80 mb-10 tracking-widest"
          >
            스포츠 그 이상의 가치를 만드는 프리미엄 교육 네트워크
          </p>
          <div
            className="flex flex-col md:flex-row gap-4 justify-center items-center"
            data-aos="fade-up"
            data-aos-delay="400"
          >
            <a
              href="#branches"
              className="px-12 py-4 bg-white text-black font-black rounded-full hover:scale-105 transition-transform"
            >
              지점 둘러보기
            </a>
            <a
              href="#shop"
              className="px-12 py-4 bg-blue-600 text-white font-black rounded-full hover:scale-105 transition-transform shadow-lg shadow-blue-600/30"
            >
              V.O.G SPORTS 스토어
            </a>
          </div>
        </div>
      </section>

      {/* 4. 기업 철학 */}
      <section
        id="about"
        className="px-[5%] md:px-[8%] py-24 md:py-40 grid lg:grid-cols-2 gap-20 items-center"
      >
        <div data-aos="fade-right" className="relative">
          <div className="aspect-[4/5] bg-[url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1600')] bg-center bg-cover rounded-[2rem] shadow-2xl" />
          <div className="absolute -bottom-10 -right-10 hidden md:block w-40 h-40 bg-blue-600 rounded-3xl -z-10 animate-pulse" />
        </div>
        <div data-aos="fade-left">
          <span className="text-blue-600 font-black text-sm tracking-[0.3em] uppercase mb-6 block">
            Corporate Mission
          </span>
          <h2 className="text-5xl md:text-7xl font-black mb-8 leading-[1.1] tracking-tighter">
            아이들의 성장을 위한
            <br />
            <span className="text-blue-600">완벽한 기반</span>
          </h2>
          <p className="text-gray-500 text-xl leading-relaxed mb-10 font-medium">
            그라운드 코퍼레이션은 모든 아이들이 평등하고 전문적인 스포츠 교육을
            받을 수 있는 환경을 구축합니다. 단순한 교육을 넘어, 아이들이 삶의
            '그라운드'에서도 승리할 수 있도록 올바른 가치관을 심어줍니다.
          </p>
          <div className="inline-flex items-center gap-2 font-black text-lg border-b-4 border-blue-600 pb-1 cursor-default uppercase">
            GROUND CORP VALUES
          </div>
        </div>
      </section>

      {/* 5. NEW: 지점 안내 섹션 (철학과 홈쇼핑 사이) */}
      <section
        id="branches"
        className="py-24 md:py-40 px-[5%] md:px-[10%] bg-[#050a14] text-white"
      >
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <div data-aos="fade-right">
            <span className="text-blue-500 font-black text-sm tracking-[0.3em] uppercase mb-4 block">
              Ground Network
            </span>
            <h2 className="text-5xl md:text-8xl font-black tracking-tighter italic uppercase leading-none">
              OUR <span className="text-blue-500">BRANCHES</span>
            </h2>
          </div>
          <p
            className="text-white/40 max-w-md font-bold text-lg leading-relaxed"
            data-aos="fade-left"
          >
            그라운드 코퍼레이션의 철학이 담긴 프리미엄 센터를 소개합니다. 각
            지점은 동일한 교육 퀄리티와 특색 있는 시설을 제공합니다.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {/* 시흥 지점 카드 */}
          <Link
            href="/branch/siheung/main"
            className="group relative overflow-hidden rounded-[3rem] bg-zinc-900 aspect-[16/10] md:aspect-square lg:aspect-[16/10]"
            data-aos="zoom-in-up"
          >
            <img
              src="/resource/image/intro1.jpg"
              alt="Siheung"
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 group-hover:opacity-40 transition-all duration-700"
            />
            <div className="absolute inset-0 p-10 flex flex-col justify-end">
              <span className="text-blue-500 font-black tracking-widest text-sm mb-2">
                Gyeonggi-do
              </span>
              <h3 className="text-4xl md:text-5xl font-black mb-6 italic uppercase">
                Ground Siheung
              </h3>
              <div className="flex flex-wrap gap-4 opacity-0 group-hover:opacity-100 translate-y-10 group-hover:translate-y-0 transition-all duration-500">
                <span className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold">
                  <MapPin size={14} /> 시흥 배곧지구
                </span>
                <span className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold">
                  <Users size={14} /> 엘리트 유소년반
                </span>
                <span className="flex items-center gap-2 bg-blue-600 px-4 py-2 rounded-full text-xs font-bold uppercase italic">
                  <Zap size={14} /> New Open
                </span>
              </div>
            </div>
          </Link>

          {/* 영종 지점 카드 */}
          <Link
            href="/branch/yeongjong/main"
            className="group relative overflow-hidden rounded-[3rem] bg-zinc-900 aspect-[16/10] md:aspect-square lg:aspect-[16/10]"
            data-aos="zoom-in-up"
            data-aos-delay="200"
          >
            <img
              src="/resource/image/intro2.jpg"
              alt="Yeongjong"
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 group-hover:opacity-40 transition-all duration-700"
            />
            <div className="absolute inset-0 p-10 flex flex-col justify-end">
              <span className="text-blue-500 font-black tracking-widest text-sm mb-2">
                Incheon
              </span>
              <h3 className="text-4xl md:text-5xl font-black mb-6 italic uppercase">
                Ground Yeongjong
              </h3>
              <div className="flex flex-wrap gap-4 opacity-0 group-hover:opacity-100 translate-y-10 group-hover:translate-y-0 transition-all duration-500">
                <span className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold">
                  <MapPin size={14} /> 영종 국제도시
                </span>
                <span className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold">
                  <Users size={14} /> 유소년/성인반
                </span>
                <span className="flex items-center gap-2 bg-blue-600 px-4 py-2 rounded-full text-xs font-bold uppercase italic">
                  <Zap size={14} /> Premium Center
                </span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* 6. V.O.G SPORTS 홈쇼핑 */}
      <section
        id="shop"
        className="py-24 md:py-40 bg-gray-50 px-[5%] md:px-[10%]"
      >
        <div
          className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6"
          data-aos="fade-up"
        >
          <div>
            <span className="text-blue-600 font-black text-sm tracking-[0.3em] uppercase mb-4 block">
              Official Brand by Ground Corp
            </span>
            <h2 className="text-5xl md:text-8xl font-black tracking-tighter italic uppercase leading-none">
              V.O.G <span className="text-blue-600">SPORTS</span>
            </h2>
          </div>
          <Link
            href="http://vog-sports.com/"
            className="group flex items-center gap-3 bg-[#050a14] text-white px-10 py-5 rounded-2xl font-black hover:bg-blue-600 transition-all"
          >
            공식 스토어 방문{" "}
            <ArrowRight
              size={20}
              className="group-hover:translate-x-2 transition-transform"
            />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              name: "Pro Elite Knit Cleats",
              price: "₩189,000",
              tag: "NEW",
              img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800",
            },
            {
              name: "V.O.G Training Bibs",
              price: "₩25,000",
              tag: "BEST",
              img: "https://images.unsplash.com/photo-1511886929837-354d827aae26?q=80&w=800",
            },
            {
              name: "Phantom Sports Bag",
              price: "₩85,000",
              tag: "HOT",
              img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800",
            },
            {
              name: "Elite Compression Socks",
              price: "₩18,000",
              tag: "SALE",
              img: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=800",
            },
          ].map((product, idx) => (
            <div
              key={idx}
              className="group"
              data-aos="fade-up"
              data-aos-delay={idx * 100}
            >
              <div className="relative aspect-[3/4] rounded-[2.5rem] overflow-hidden bg-white mb-6 shadow-sm group-hover:shadow-2xl transition-all duration-500 border border-gray-100">
                <img
                  src={product.img}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute top-6 left-6">
                  <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                    {product.tag}
                  </span>
                </div>
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button className="bg-white text-black font-black px-8 py-3 rounded-xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                    상세보기
                  </button>
                </div>
              </div>
              <h4 className="text-xl font-black tracking-tight mb-1 group-hover:text-blue-600 transition-colors uppercase italic">
                {product.name}
              </h4>
              <p className="text-gray-400 font-bold text-lg">{product.price}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. 푸터 */}
      <footer className="bg-[#050a14] text-white px-[5%] md:px-[10%] py-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-16 border-b border-white/10 pb-20">
          <div className="lg:col-span-2">
            <h2 className="text-5xl font-black tracking-tighter mb-8 italic uppercase">
              GROUND
              <br />
              <span className="text-blue-600">CORP</span>
            </h2>
            <p className="text-white/40 max-w-sm font-medium leading-relaxed">
              그라운드 코퍼레이션은 국내 최고의 유소년 스포츠 인프라를 구축하고,
              시흥과 영종도를 시작으로 전국적인 스포츠 교육 네트워크를 확장해
              나가고 있습니다.
            </p>
          </div>
          <div>
            <h4 className="text-blue-600 font-black uppercase tracking-widest mb-6">
              Explore
            </h4>
            <ul className="space-y-4 font-bold text-white/60">
              <li>
                <a href="#about" className="hover:text-white transition-colors">
                  기업 개요
                </a>
              </li>
              <li>
                <a
                  href="#branches"
                  className="hover:text-white transition-colors"
                >
                  전체 지점
                </a>
              </li>
              <li>
                <a href="#shop" className="hover:text-white transition-colors">
                  V.O.G SHOP
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-blue-600 font-black uppercase tracking-widest mb-6">
              Follow Us
            </h4>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-blue-600 hover:border-blue-600 transition-all"
              >
                <Camera size={20} />
              </a>
              <a
                href="#"
                className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-red-600 hover:border-red-600 transition-all"
              >
                <Mail size={20} />
              </a>
            </div>
          </div>
        </div>
        <div className="pt-10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-white/20 uppercase tracking-[0.3em]">
          <p>© 2026 Ground Corporation. All Rights Reserved.</p>
          <p>Innovating the Future of Sports Education</p>
        </div>
      </footer>
    </div>
  );
}
