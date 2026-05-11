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
import Image from "next/image";
// 분리한 Header 컴포넌트 임포트
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function IPassCarePage() {
  useAOS();

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
      {/* 1. 공통 헤더 적용 */}
      <Header />

      {/* 2. 히어로 섹션 */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* 배경 광원 효과 */}
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

            {/* 앱 스토어 버튼 */}
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

            {/* QR 코드 영역 */}
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

          {/* 앱 목업 이미지 영역 */}
          <div className="relative flex justify-center z-10" data-aos="zoom-in">
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-[300px] h-[600px] bg-[#1a1c1e] rounded-[3.5rem] p-3 shadow-[0_50px_100px_-20px_rgba(37,99,235,0.3)] border-[8px] border-[#333] z-10"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#1a1c1e] rounded-b-3xl z-20" />
              <div className="w-full h-full rounded-[2.8rem] overflow-hidden bg-white relative">
                <Image
                  src="/resource/image/ipasscare_image.png"
                  alt="IPASSCARE App Interface"
                  fill
                  className="object-contain"
                  priority
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
      <Footer />
    </div>
  );
}
