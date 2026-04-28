"use client";

import React, { useEffect, useRef, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  Play,
  MapPin,
  Phone,
  Car,
  Navigation,
  ChevronDown,
  User,
  CheckCircle2,
  ChevronRight,
  Waves,
} from "lucide-react";
import Link from "next/link";

export default function YeongjongBranch() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // AOS 초기화
    AOS.init({
      duration: 1000,
      once: true,
      easing: "ease-out-cubic",
    });

    // 뒤로가기 시 애니메이션 멈춤 방지
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

  // 영종도 전용 네비게이션 메뉴 데이터
  const navItems = [
    {
      title: "소개",
      submenu: [
        { name: "지점 소개", href: "/branch/yeongjong/intro/branch" },
        { name: "코치 소개", href: "/branch/yeongjong/intro/coaches" },
      ],
    },
    {
      title: "시간표",
      submenu: [{ name: "전체 시간표", href: "/branch/yeongjong/schedule" }],
    },
    {
      title: "예약",
      submenu: [
        { name: "이용권 구매", href: "/branch/yeongjong/shop" },
        { name: "예약하기", href: "/branch/yeongjong/reservation" },
      ],
    },
  ];

  return (
    <div className="bg-[#f0f7f4] text-[#1b4332] font-sans overflow-x-hidden leading-relaxed">
      {/* --- HEADER (시흥 스타일 드롭다운 + 영종 컬러) --- */}
      <header className="fixed top-0 w-full h-[80px] flex justify-between items-center px-[5%] z-[1000] bg-white/95 backdrop-blur-md border-b border-[#d8f3dc]">
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

        {/* 메인 네비게이션 */}
        <nav className="hidden lg:flex items-center absolute left-1/2 -translate-x-1/2">
          <ul className="flex gap-12">
            {navItems.map((item) => (
              <li key={item.title} className="relative group py-7">
                <button className="flex items-center gap-1 font-black text-[15px] text-[#1b4332] group-hover:text-[#52b788] transition-colors uppercase tracking-tight">
                  {item.title}
                  <ChevronDown
                    size={14}
                    className="group-hover:rotate-180 transition-transform duration-300 text-[#52b788]"
                  />
                </button>

                {/* 드롭다운 메뉴 */}
                <ul className="absolute top-[80px] left-1/2 -translate-x-1/2 w-[170px] bg-white border border-[#d8f3dc] shadow-[0_20px_40px_rgba(27,67,50,0.1)] rounded-2xl py-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:top-[75px] transition-all duration-300 ease-out">
                  {item.submenu.map((sub) => (
                    <li key={sub.name}>
                      <Link
                        href={sub.href}
                        className="block px-6 py-2.5 text-[14px] font-bold text-gray-500 hover:text-[#1b4332] hover:bg-[#f0f7f4] transition-all"
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
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-[13px] text-[#1b4332] border-2 border-[#1b4332] hover:bg-[#1b4332] hover:text-white transition-all uppercase"
          >
            <User size={16} />
            Login
          </Link>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="mt-[80px] h-[75vh] min-h-[550px] relative flex flex-col justify-center items-center text-white text-center px-5 bg-[url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1600')] bg-center bg-cover">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1b4332]/80 to-[#1b4332]" />
        <div className="relative z-10 max-w-5xl">
          <div
            data-aos="fade-down"
            className="bg-[#52b788] px-5 py-1.5 rounded-full font-black text-[10px] mb-6 inline-block shadow-lg uppercase tracking-[0.2em]"
          >
            Yeongjong Branch
          </div>
          <h1
            data-aos="fade-up"
            className="text-6xl md:text-9xl font-[1000] leading-[0.9] tracking-tighter uppercase italic"
          >
            SEA BREEZE
            <br />
            <span className="text-[#52b788]">& GROUND</span>
          </h1>
          <p
            data-aos="fade-up"
            data-aos-delay="200"
            className="mt-10 opacity-80 text-base md:text-2xl font-medium tracking-tight max-w-3xl mx-auto"
          >
            영종도의 쾌적한 에너지가 머무는 곳, 탁 트인 시야와 함께
            <br className="hidden md:block" />
            프리미엄 풋볼 퍼포먼스의 정수를 경험하세요.
          </p>
        </div>
      </section>

      {/* --- ABOUT SECTION --- */}
      <section className="px-[5%] md:px-[10%] py-24 md:py-40 grid lg:grid-cols-2 gap-20 items-center max-w-[1440px] mx-auto">
        <div className="relative" data-aos="fade-right">
          <div className="aspect-square bg-gray-200 rounded-[60px] overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-700">
            <img
              src="https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=1000"
              className="w-full h-full object-cover"
              alt="Facility"
            />
          </div>
          <div className="absolute -bottom-10 -right-10 hidden md:block bg-white p-10 rounded-[40px] shadow-2xl border border-[#d8f3dc]">
            <p className="text-[#52b788] font-[1000] text-5xl mb-1 italic">
              1,200평
            </p>
            <p className="text-gray-400 font-bold text-sm tracking-widest uppercase">
              Total Ground Area
            </p>
          </div>
        </div>

        <div data-aos="fade-left">
          <span className="text-[#52b788] font-black text-sm tracking-[0.3em] uppercase italic">
            Nature & Performance
          </span>
          <h2 className="mt-6 text-4xl md:text-7xl font-[1000] leading-[1.05] mb-8 text-[#1b4332] tracking-tighter">
            영종도 최대 규모의
            <br />
            하이엔드 구장
          </h2>
          <p className="text-gray-500 text-lg mb-12 leading-relaxed font-medium">
            영종 브랜치는 인천국제공항 인근의 쾌적한 공기를 바탕으로
            설계되었습니다. 국제 규격에 준하는 최고급 인조잔디와 훈련 후 완벽한
            휴식을 위한 프라이빗 라운지를 제공합니다.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            {[
              ["최상급 안전 잔디", "충격 흡수 소재 전문 시공"],
              ["쾌적한 자연 환경", "바닷바람과 탁 트인 시야"],
              ["대규모 주차장", "센터 전용 넓은 주차 공간"],
              ["프리미엄 라운지", "학부모 전용 관람 공간"],
            ].map(([title, desc], idx) => (
              <div key={idx} className="flex gap-4 group">
                <CheckCircle2
                  className="text-[#52b788] shrink-0 group-hover:scale-110 transition-transform"
                  size={24}
                />
                <div>
                  <strong className="block text-lg font-black text-[#1b4332]">
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
      <section className="bg-white px-[5%] md:px-[10%] py-24 md:py-40 rounded-t-[60px] md:rounded-t-[120px]">
        <div className="max-w-[1440px] mx-auto">
          <div className="text-center mb-24" data-aos="fade-up">
            <span className="text-[#52b788] font-black tracking-[0.4em] text-sm uppercase italic">
              Live Activity
            </span>
            <h2 className="text-5xl md:text-8xl font-[1000] mt-4 text-[#1b4332] tracking-tighter leading-none uppercase">
              Moments of
              <br />
              <span className="text-[#52b788]">Growth</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-24 h-[500px] md:h-[750px]">
            <div
              data-aos="zoom-in"
              className="col-span-2 row-span-2 relative overflow-hidden rounded-[50px] group border border-black/5"
            >
              <img
                src="https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=1000"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                alt="1"
              />
            </div>
            <div
              data-aos="fade-up"
              className="relative overflow-hidden rounded-[40px] group border border-black/5"
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
              className="relative overflow-hidden rounded-[40px] group border border-black/5"
            >
              <img
                src="https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?q=80&w=600"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                alt="3"
              />
            </div>
            <div
              data-aos="fade-up"
              className="col-span-2 relative overflow-hidden rounded-[50px] group border border-black/5"
            >
              <img
                src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                alt="4"
              />
            </div>
          </div>

          <div
            className="relative rounded-[60px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(27,67,50,0.3)] group"
            data-aos="fade-up"
          >
            {!isPlaying && (
              <div
                className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 cursor-pointer"
                onClick={handlePlay}
              >
                <div className="w-24 h-24 bg-[#52b788] rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform">
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
        </div>
      </section>

      {/* --- LOCATION SECTION --- */}
      <section className="px-[5%] md:px-[10%] py-24 md:py-40 bg-[#1b4332] rounded-t-[60px] md:rounded-t-[120px] relative z-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div data-aos="fade-right">
              <span className="text-[#52b788] font-black text-sm tracking-[0.3em] uppercase italic">
                Visit Us
              </span>
              <h2 className="text-5xl md:text-8xl font-[1000] mt-6 text-white tracking-tighter italic uppercase leading-none">
                오시는 길
              </h2>
            </div>
            <p
              data-aos="fade-left"
              className="text-white/40 font-bold text-lg text-right hidden md:block leading-tight uppercase tracking-widest"
            >
              Yeongjong International City
              <br />
              Football Ground Branch
            </p>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10">
            <div
              data-aos="zoom-in"
              className="h-[500px] md:h-[650px] bg-[#2d6a4f] rounded-[60px] overflow-hidden shadow-2xl relative border border-white/5 group"
            >
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1200')] opacity-20 grayscale transition-transform duration-1000 group-hover:scale-110" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10 p-10 text-center">
                <MapPin
                  size={80}
                  strokeWidth={1}
                  className="mb-6 opacity-30 text-[#52b788]"
                />
                <span className="text-2xl font-black tracking-[0.2em] uppercase italic">
                  MAP SYSTEM PREPARING
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-6" data-aos="fade-left">
              <div className="bg-white p-10 rounded-[50px] shadow-2xl transform hover:-translate-y-2 transition-transform">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-[#52b788] p-4 rounded-2xl text-white shadow-lg shadow-[#52b788]/20">
                    <MapPin size={28} />
                  </div>
                  <h4 className="text-2xl font-black text-[#1b4332]">
                    Address
                  </h4>
                </div>
                <p className="text-gray-500 font-bold text-xl leading-snug">
                  인천광역시 중구 영종대로 123
                  <br />
                  <span className="text-[#52b788] mt-1 block font-[1000]">
                    그린빌딩 5층 (영종하늘도시)
                  </span>
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-xl p-10 rounded-[50px] border border-white/10 text-white transform hover:-translate-y-2 transition-transform">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-white/10 p-4 rounded-2xl text-[#52b788]">
                    <Car size={28} />
                  </div>
                  <h4 className="text-2xl font-black">Parking</h4>
                </div>
                <p className="text-white/60 font-bold text-xl italic underline decoration-[#52b788] decoration-4 underline-offset-8">
                  건물 전용 무료 주차장 완비 (최대 3시간)
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-xl p-10 rounded-[50px] border border-white/10 text-white transform hover:-translate-y-2 transition-transform">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-white/10 p-4 rounded-2xl text-[#52b788]">
                    <Phone size={28} />
                  </div>
                  <h4 className="text-2xl font-black">Contact</h4>
                </div>
                <p className="text-4xl font-[1000] tracking-tighter text-white">
                  032-456-7890
                </p>
              </div>

              <a
                href="https://map.naver.com"
                target="_blank"
                className="flex items-center justify-center gap-4 w-full bg-white text-[#1b4332] py-8 rounded-[35px] font-black text-2xl shadow-2xl hover:bg-[#52b788] hover:text-white transition-all transform hover:scale-[1.02] active:scale-95"
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
          &copy; 2026 GREEN GROUND YEONGJONG. ALL RIGHTS RESERVED.
        </p>
      </footer>
    </div>
  );
}
