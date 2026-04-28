"use client";

import React, { useEffect, useRef, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  Play,
  MapPin,
  Clock,
  Phone,
  Car,
  Navigation,
  ChevronDown,
  User,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export default function SiheungBranch() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // AOS 초기화
    AOS.init({
      duration: 1000,
      once: true,
      easing: "ease-out-cubic",
    });

    // 뒤로가기 시 애니메이션 멈춤 방지 로직
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) AOS.refresh();
    };
    window.addEventListener("pageshow", handlePageShow);

    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      videoRef.current.controls = true;
      setIsPlaying(true);
    }
  };

  // 네비게이션 메뉴 데이터
  const navItems = [
    {
      title: "소개",
      submenu: [
        { name: "지점 소개", href: "/branch/siheung/intro/branch" },
        { name: "코치 소개", href: "/branch/siheung/intro/coaches" },
      ],
    },
    {
      title: "시간표",
      submenu: [{ name: "전체 시간표", href: "/branch/siheung/schedule" }],
    },
    {
      title: "예약",
      submenu: [
        { name: "이용권 구매", href: "/branch/siheung/shop" },
        { name: "예약하기", href: "/branch/siheung/reservation" },
      ],
    },
  ];

  return (
    <div className="bg-[#f2efe9] text-[#0f0f0f] font-sans overflow-x-hidden leading-relaxed">
      {/* --- HEADER --- */}
      <header className="fixed top-0 w-full h-[80px] flex justify-between items-center px-[5%] z-[1000] bg-white/95 backdrop-blur-md border-b border-black/5">
        {/* 로고 */}
        <Link
          href="/"
          className="flex-shrink-0 transition-transform hover:scale-105"
        >
          <img
            src="/resource/image/logo.png"
            alt="Logo"
            className="h-10 md:h-11"
          />
        </Link>

        {/* 메인 네비게이션 (데스크탑) */}
        <nav className="hidden lg:flex items-center absolute left-1/2 -translate-x-1/2">
          <ul className="flex gap-12">
            {navItems.map((item) => (
              <li key={item.title} className="relative group py-7">
                <button className="flex items-center gap-1 font-black text-[15px] text-[#1a3021] group-hover:text-[#d35400] transition-colors uppercase tracking-tight">
                  {item.title}
                  <ChevronDown
                    size={14}
                    className="group-hover:rotate-180 transition-transform duration-300"
                  />
                </button>

                {/* 드롭다운 메뉴 */}
                <ul className="absolute top-[80px] left-1/2 -translate-x-1/2 w-[170px] bg-white border border-black/5 shadow-[0_20px_40px_rgba(0,0,0,0.1)] rounded-2xl py-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:top-[75px] transition-all duration-300 ease-out">
                  {item.submenu.map((sub) => (
                    <li key={sub.name}>
                      <Link
                        href={sub.href}
                        className="block px-6 py-2.5 text-[14px] font-bold text-gray-500 hover:text-[#d35400] hover:bg-orange-50 transition-all"
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        {/* 우측 버튼 세션 */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-[13px] text-[#1a3021] border-2 border-[#1a3021] hover:bg-[#1a3021] hover:text-white transition-all uppercase tracking-tighter"
          >
            <User size={16} />
            Login
          </Link>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="mt-[80px] h-[70vh] min-h-[500px] relative flex flex-col justify-center items-center text-white text-center px-5 bg-[url('https://images.unsplash.com/photo-1526232761682-d26e03ac148e?q=80&w=1600')] bg-center bg-cover">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a3021]/80 to-[#1a3021]" />
        <div className="relative z-10 max-w-4xl">
          <div
            data-aos="fade-down"
            className="bg-[#d35400] px-5 py-1.5 rounded-full font-black text-[10px] mb-6 inline-block shadow-lg uppercase tracking-[0.2em]"
          >
            Headquarters
          </div>
          <h1
            data-aos="fade-up"
            className="text-6xl md:text-9xl font-black leading-[0.9] tracking-tighter uppercase italic"
          >
            SIHEUNG
            <br />
            BRANCH
          </h1>
          <p
            data-aos="fade-up"
            data-aos-delay="200"
            className="mt-8 opacity-80 text-base md:text-xl font-medium tracking-tight"
          >
            축구, 그 이상의 가치를 전하는 풋볼 그라운드의 심장.
            <br className="hidden md:block" /> 시흥 본점에서 프리미엄 교육의
            정수를 경험하세요.
          </p>
        </div>
      </section>

      {/* --- ABOUT SECTION --- */}
      <section className="px-[5%] md:px-[10%] py-24 md:py-40 grid lg:grid-cols-2 gap-20 items-center max-w-[1440px] mx-auto">
        <div className="relative" data-aos="fade-right">
          <img
            src="https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=1000"
            className="rounded-[40px] shadow-2xl w-full aspect-square object-cover"
            alt="Facility"
          />
          <div className="absolute -bottom-10 -right-10 hidden md:block bg-white p-8 rounded-[30px] shadow-xl border border-black/5">
            <p className="text-[#d35400] font-black text-4xl mb-1">60+</p>
            <p className="text-gray-400 font-bold text-sm tracking-tighter">
              동시 주차 가능 여유 공간
            </p>
          </div>
        </div>

        <div data-aos="fade-left">
          <span className="text-[#d35400] font-black text-sm tracking-[0.3em] uppercase italic">
            Premium Space
          </span>
          <h2 className="mt-6 text-4xl md:text-6xl font-black leading-[1.1] mb-8 text-[#1a3021]">
            가장 안전하고
            <br />
            역동적인 그라운드
          </h2>
          <p className="text-gray-600 text-lg mb-12 leading-relaxed font-medium">
            아이들이 부상 걱정 없이 마음껏 뛰어놀 수 있도록, 시흥 본점은 국제
            표준 규격의 친환경 인조잔디와 4중 세이프티 펜스 시스템을
            구축했습니다.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            {[
              ["최고급 친환경 잔디", "충격 흡수 및 부상 방지"],
              ["올인원 세이프티 존", "완충벽 및 안전 펜스"],
              ["부모님 통유리 라운지", "전 구역 시야 확보"],
              ["실내 냉난방 시스템", "사계절 쾌적한 환경"],
            ].map(([title, desc], idx) => (
              <div key={idx} className="flex gap-4">
                <CheckCircle2 className="text-[#d35400] shrink-0" size={24} />
                <div>
                  <strong className="block text-lg font-black text-[#1a3021]">
                    {title}
                  </strong>
                  <span className="text-sm text-gray-400 font-semibold leading-tight">
                    {desc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- GALLERY & VIDEO --- */}
      <section className="bg-white px-[5%] md:px-[10%] py-24 md:py-40">
        <div className="text-center mb-20" data-aos="fade-up">
          <span className="text-[#d35400] font-black tracking-[0.3em] text-sm uppercase italic">
            Live Activity
          </span>
          <h2 className="text-5xl md:text-7xl font-black mt-4 text-[#1a3021]">
            그라운드 위의 기록
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20 h-[500px] md:h-[700px]">
          <div
            data-aos="zoom-in"
            className="col-span-2 row-span-2 relative overflow-hidden rounded-3xl group"
          >
            <img
              src="https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=1000"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              alt="1"
            />
          </div>
          <div
            data-aos="fade-up"
            className="relative overflow-hidden rounded-3xl group"
          >
            <img
              src="https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?q=80&w=600"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              alt="2"
            />
          </div>
          <div
            data-aos="fade-up"
            data-aos-delay="100"
            className="relative overflow-hidden rounded-3xl group"
          >
            <img
              src="https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?q=80&w=600"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              alt="3"
            />
          </div>
          <div
            data-aos="fade-up"
            className="col-span-2 relative overflow-hidden rounded-3xl group"
          >
            <img
              src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              alt="4"
            />
          </div>
        </div>

        <div
          className="relative rounded-[40px] overflow-hidden shadow-2xl group"
          data-aos="fade-up"
        >
          {!isPlaying && (
            <div
              className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 cursor-pointer"
              onClick={handlePlay}
            >
              <div className="w-24 h-24 bg-[#d35400] rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform">
                <Play size={40} fill="currentColor" />
              </div>
            </div>
          )}
          <video
            ref={videoRef}
            className="w-full aspect-video object-cover block"
            poster="https://images.unsplash.com/photo-1526232761682-d26e03ac148e?q=80&w=1200"
          >
            <source
              src="https://assets.mixkit.co/videos/preview/mixkit-playing-soccer-in-the-stadium-14250-large.mp4"
              type="video/mp4"
            />
          </video>
        </div>
      </section>

      {/* --- LOCATION SECTION --- */}
      <section className="px-[5%] md:px-[10%] py-24 md:py-40 bg-[#1a3021] rounded-t-[60px] md:rounded-t-[120px]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div data-aos="fade-right">
              <span className="text-[#d35400] font-black text-sm tracking-[0.3em] uppercase italic">
                Visit Us
              </span>
              <h2 className="text-5xl md:text-7xl font-black mt-6 text-white tracking-tighter italic">
                오시는 길
              </h2>
            </div>
            <p
              data-aos="fade-left"
              className="text-white/40 font-bold text-lg text-right hidden md:block leading-tight uppercase tracking-widest"
            >
              Siheung Baegot New City
              <br />
              Football Ground HQ
            </p>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10">
            {/* 지도 박스 */}
            <div
              data-aos="zoom-in"
              className="h-[500px] md:h-[650px] bg-[#2a4533] rounded-[50px] overflow-hidden shadow-2xl relative border border-white/5 group"
            >
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1200')] opacity-20 grayscale transition-transform duration-1000 group-hover:scale-110" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10 p-10 text-center">
                <MapPin
                  size={80}
                  strokeWidth={1}
                  className="mb-6 opacity-30 text-[#d35400]"
                />
                <span className="text-2xl font-black tracking-[0.2em] uppercase italic">
                  MAP SYSTEM PREPARING
                </span>
              </div>
            </div>

            {/* 정보 카드 */}
            <div className="flex flex-col gap-6" data-aos="fade-left">
              <div className="bg-white p-10 rounded-[50px] shadow-2xl transform hover:-translate-y-2 transition-transform">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-[#d35400] p-4 rounded-2xl text-white shadow-lg shadow-orange-900/20">
                    <MapPin size={28} />
                  </div>
                  <h4 className="text-2xl font-black text-[#1a3021] tracking-tight">
                    Address
                  </h4>
                </div>
                <p className="text-gray-500 font-bold text-xl leading-snug">
                  경기도 시흥시 서울대학로278번길 61
                  <br />
                  <span className="text-[#d35400] mt-1 block">
                    풋볼 그라운드 빌딩 4층
                  </span>
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-xl p-10 rounded-[50px] border border-white/10 text-white transform hover:-translate-y-2 transition-transform">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-white/10 p-4 rounded-2xl text-[#d35400]">
                    <Car size={28} />
                  </div>
                  <h4 className="text-2xl font-black tracking-tight">
                    Parking
                  </h4>
                </div>
                <p className="text-white/60 font-bold text-xl italic underline decoration-[#d35400] decoration-4 underline-offset-8">
                  건물 내 지하 1~2층 무료 주차 가능
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-xl p-10 rounded-[50px] border border-white/10 text-white transform hover:-translate-y-2 transition-transform">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-white/10 p-4 rounded-2xl text-[#d35400]">
                    <Phone size={28} />
                  </div>
                  <h4 className="text-2xl font-black tracking-tight">
                    Contact
                  </h4>
                </div>
                <p className="text-4xl font-black tracking-tighter text-white">
                  031-123-4567
                </p>
              </div>

              <a
                href="https://map.naver.com"
                target="_blank"
                className="flex items-center justify-center gap-4 w-full bg-white text-[#1a3021] py-8 rounded-[30px] font-black text-2xl shadow-2xl hover:bg-[#d35400] hover:text-white transition-all transform hover:scale-105 active:scale-95"
              >
                <Navigation size={28} /> 네이버 지도로 길찾기
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-20 bg-[#0a0a0a] text-center border-t border-white/5">
        <div className="mb-10 opacity-20 hover:opacity-50 transition-opacity">
          <img
            src="/resource/image/logo.png"
            alt="Logo"
            className="h-8 mx-auto brightness-0 invert"
          />
        </div>
        <p className="text-white/20 text-[10px] tracking-[0.8em] font-black uppercase">
          &copy; 2026 FOOTBALL GROUND SIHEUNG. ALL RIGHTS RESERVED.
        </p>
      </footer>
    </div>
  );
}
