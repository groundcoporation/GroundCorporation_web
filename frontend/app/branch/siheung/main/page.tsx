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
  LogOut,
} from "lucide-react";
import Link from "next/link";
// supabase 클라이언트가 설정되어 있다고 가정합니다.
import { supabase } from "@/lib/supabase";

export default function SiheungBranch() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // 인증 상태 관리
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. AOS 초기화[cite: 1]
    AOS.init({
      duration: 1000,
      once: true,
      easing: "ease-out-cubic",
    });

    // 2. 인증 세션 확인
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };
    checkAuth();

    // 3. 인증 상태 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // 뒤로가기 시 애니메이션 멈춤 방지 로직[cite: 1]
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) AOS.refresh();
    };
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      subscription.unsubscribe();
    };
  }, []);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      videoRef.current.controls = true;
      setIsPlaying(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    alert("로그아웃 되었습니다.");
  };

  // 네비게이션 메뉴 데이터[cite: 1]
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
      {/* --- HEADER ---[cite: 1] */}
      <header className="fixed top-0 w-full h-[80px] flex justify-between items-center px-[5%] z-[1000] bg-white/95 backdrop-blur-md border-b border-black/5">
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

        {/* 메인 네비게이션 (데스크탑)[cite: 1] */}
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

        {/* 우측 버튼 세션 (인증 연동)[cite: 1] */}
        <div className="flex items-center gap-3">
          {!loading &&
            (user ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/mypage"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-[13px] text-[#1a3021] border-2 border-[#1a3021] hover:bg-[#1a3021] hover:text-white transition-all uppercase tracking-tighter"
                >
                  <User size={16} />
                  My Page
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-[13px] text-[#1a3021] border-2 border-[#1a3021] hover:bg-[#1a3021] hover:text-white transition-all uppercase tracking-tighter"
              >
                <User size={16} />
                Login
              </Link>
            ))}
        </div>
      </header>

      {/* --- HERO SECTION ---[cite: 1] */}
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

      {/* --- ABOUT SECTION ---[cite: 1] */}
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

      {/* --- GALLERY & VIDEO ---[cite: 1] */}
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
          {/* 갤러리 이미지 생략 (기존 구조와 동일)[cite: 1] */}
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

      {/* --- LOCATION SECTION ---[cite: 1] */}
      <section className="px-[5%] md:px-[10%] py-24 md:py-40 bg-[#1a3021] rounded-t-[60px] md:rounded-t-[120px]">
        <div className="max-w-7xl mx-auto">
          {/* 위치 정보 및 지도 생략 (기존 구조와 동일)[cite: 1] */}
        </div>
      </section>

      {/* --- FOOTER ---[cite: 1] */}
      <footer className="py-20 bg-[#0a0a0a] text-center border-t border-white/5">
        <p className="text-white/20 text-[10px] tracking-[0.8em] font-black uppercase">
          &copy; 2026 FOOTBALL GROUND SIHEUNG. ALL RIGHTS RESERVED.
        </p>
      </footer>
    </div>
  );
}
