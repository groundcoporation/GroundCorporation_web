"use client";

import React, { useState, useEffect } from "react";
import { useAOS } from "@/hooks/useAOS";
import {
  ShieldCheck,
  Calendar,
  CreditCard,
  Bell,
  Smartphone,
  QrCode,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function IPassCarePage() {
  useAOS();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // 스크롤이 조금이라도 내려가면 배경색을 하얗게 만듭니다.
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: <Calendar className="text-blue-500" size={32} />,
      title: "실시간 통합 예약",
      desc: "시설 이용 및 강습 예약을 단 몇 번의 터치로 간편하게 처리합니다.",
    },
    {
      icon: <CreditCard className="text-blue-500" size={32} />,
      title: "스마트 결제 관리",
      desc: "이용권 구매부터 자동 결제까지 투명하고 안전한 정산 시스템을 제공합니다.",
    },
    {
      icon: <Bell className="text-blue-500" size={32} />,
      title: "맞춤형 알림 서비스",
      desc: "수업 일정 및 예약 현황을 푸시 알림으로 실시간으로 받아보세요.",
    },
    {
      icon: <Smartphone className="text-blue-500" size={32} />,
      title: "모바일 디지털 패스",
      desc: "종이 회원권 없이 앱 하나로 시설 출입과 인증이 가능합니다.",
    },
  ];

  return (
    <div className="bg-[#050a14] text-white overflow-x-hidden font-sans pt-[80px]">
      {/* 1. 헤더 - 하얀색 배경으로 수정 */}
      <header
        className={`fixed top-0 w-full h-[80px] flex justify-between items-center px-[5%] z-[1000] transition-all duration-300 bg-white shadow-md border-b border-gray-100`}
      >
        <Link href="/">
          <img
            src="/resource/image/logo.png"
            alt="Logo"
            className="h-6 object-contain"
            // 하얀 배경이므로 밝기 조절(brightness-200)을 제거합니다.
            // 로고 자체가 어두운 색이어야 잘 보입니다.
          />
        </Link>
        <div className="hidden md:flex gap-8 items-center">
          <span className="text-blue-600 font-black tracking-tighter italic text-lg">
            IPASSCARE SOLUTION
          </span>
          <Link
            href="#contact"
            className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-blue-700 transition-colors"
          >
            도입 문의
          </Link>
        </div>
      </header>

      {/* 2. 히어로 섹션 */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute top-1/4 -right-20 w-[500px] h-[500px] bg-blue-600/20 blur-[150px] rounded-full" />

        <div className="max-w-7xl mx-auto px-[5%] w-full grid lg:grid-cols-2 gap-16 items-center">
          <div data-aos="fade-right">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-500 mb-8">
              <ShieldCheck size={16} />
              <span className="text-xs font-black tracking-widest uppercase">
                Next Gen Sports Admin
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tighter mb-8 italic uppercase text-white relative z-10">
              SMART CARE
              <br />
              FOR YOUR{" "}
              <span className="text-blue-600 underline underline-offset-8">
                CHILDREN
              </span>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl font-medium leading-relaxed mb-10 max-w-lg relative z-10">
              IPASSCARE는 스포츠 시설 운영의 모든 과정을 디지털로 전환합니다.
              지금 바로 앱을 다운로드하고 스마트한 관리를 시작하세요.
            </p>

            {/* 앱 스토어 버튼 링크 형식 */}
            <div className="flex flex-wrap gap-4 mb-12 relative z-10">
              <Link href="#" className="hover:opacity-80 transition-opacity">
                <img
                  src="/resource/image/app_store_btn.png"
                  alt="App Store"
                  className="h-[52px]"
                />
              </Link>
              <Link href="#" className="hover:opacity-80 transition-opacity">
                <img
                  src="/resource/image/google_play_btn.png"
                  alt="Google Play"
                  className="h-[52px]"
                />
              </Link>
            </div>

            {/* QR 코드 다운로드 안내 */}
            <div className="flex items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/10 w-fit relative z-10">
              <div className="bg-white p-2 rounded-xl">
                <QrCode className="text-black" size={80} />
              </div>
              <div>
                <p className="text-blue-500 font-black text-sm mb-1 uppercase tracking-tighter">
                  Quick Access
                </p>
                <p className="text-white font-bold text-lg leading-tight">
                  QR 코드를 스캔하여
                  <br />앱 설치 페이지로 이동
                </p>
              </div>
            </div>
          </div>

          {/* 앱 목업 이미지 */}
          <div className="relative flex justify-center z-10" data-aos="zoom-in">
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-[300px] h-[600px] bg-[#1a1c1e] rounded-[3.5rem] p-3 shadow-[0_50px_100px_-20px_rgba(37,99,235,0.3)] border-[8px] border-[#333] z-10"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#1a1c1e] rounded-b-3xl z-20" />
              <div className="w-full h-full rounded-[2.8rem] overflow-hidden bg-white">
                <img
                  src="/resource/image/ipasscare_image.png"
                  alt="IPASSCARE App Interface"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. 특장점 섹션 */}
      <section className="py-32 bg-white text-[#050a14] rounded-t-[4rem]">
        <div className="max-w-7xl mx-auto px-[5%]">
          <div className="text-center mb-24" data-aos="fade-up">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter italic uppercase mb-6 text-[#050a14]">
              System <span className="text-blue-600">Features</span>
            </h2>
            <p className="text-gray-600 text-lg font-medium">
              관리 업무는 줄이고, 서비스 가치는 높입니다.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                data-aos="fade-up"
                data-aos-delay={idx * 100}
                className="p-10 rounded-[2.5rem] bg-gray-50 border border-gray-100 hover:border-blue-200 transition-all group hover:shadow-xl hover:-translate-y-2 duration-300"
              >
                <div className="mb-8 p-4 bg-white rounded-2xl w-fit shadow-sm group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h4 className="text-2xl font-black mb-4 tracking-tight text-[#050a14]">
                  {feature.title}
                </h4>
                <p className="text-gray-500 font-bold text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. 푸터 */}
      <footer
        id="contact"
        className="bg-[#050a14] text-white px-[5%] py-24 border-t border-white/5"
      >
        <div className="flex flex-col md:flex-row justify-between items-start gap-16 border-b border-white/10 pb-20 max-w-7xl mx-auto">
          <div className="max-w-md">
            <h2 className="text-4xl font-black tracking-tighter mb-8 italic uppercase text-white">
              GROUND <span className="text-blue-600">CORP</span>
            </h2>
            <p className="text-white/40 font-medium leading-relaxed text-xs underline underline-offset-4 tracking-wide">
              (주)그라운드 코퍼레이션 | 대표이사: OOO <br />
              본사: 경기도 시흥시 배곧지구 내 프리미엄 센터 <br />
              문의: contact@groundcorp.com
            </p>
          </div>
        </div>
        <div className="pt-10 flex justify-between items-center max-w-7xl mx-auto">
          <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">
            © 2026 GROUND CORPORATION. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
