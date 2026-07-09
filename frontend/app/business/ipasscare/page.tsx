"use client";

import React from "react";
import { useAOS } from "@/hooks/useAOS";
import {
  ShieldCheck,
  Navigation, // 실시간 관제 아이콘
  MapPin, // 위치 소통 아이콘
  Heart, // 케어 아이콘
  CreditCard,
  QrCode,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function IPassCarePage() {
  useAOS();

  // 아이콘을 컴포넌트 자체로 전달하여 타입 에러 방지
  const features = [
    {
      icon: ShieldCheck,
      title: "실시간 안심 등하원",
      desc: "아이가 시설에 입실하거나 퇴실하는 즉시 부모님께 푸시 알림을 전송하여 안전을 확인합니다.",
    },
    {
      icon: Navigation,
      title: "라이브 위치 관제 시스템",
      desc: "단순 위치 확인을 넘어 고정밀 GPS로 셔틀의 실시간 이동 경로를 3초 단위로 부모님께 공유합니다.",
    },
    {
      icon: MapPin,
      title: "고퀄리티 실시간 소통",
      desc: "지도 위에서 확인하는 실시간 소통 채널로 아이의 상태를 기사님과 즉각적으로 묻고 답할 수 있습니다.",
    },
    {
      icon: Heart,
      title: "맞춤형 케어 리포트",
      desc: "오늘의 활동 사진과 교육 내용을 앱으로 공유받아 아이의 성장을 실시간으로 함께 확인합니다.",
    },
    {
      icon: CreditCard,
      title: "비대면 스마트 결제",
      desc: "직접 방문할 필요 없이 앱에서 교육비 수납을 안전하고 투명하게 처리할 수 있습니다.",
    },
  ];

  return (
    <div className="bg-[#050a14] text-white overflow-x-hidden font-sans pt-[80px]">
      {/* 1. 공통 헤더 */}
      <Header />

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

            <div className="flex flex-wrap gap-4 mb-12 relative z-10">

<Link
                href="https://play.google.com/store/apps/details?id=com.goundcorp.ipasscare&pcampaignid=web_share"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <img
                  src="/resource/image/google_play_btn.png"
                  alt="Google Play"
                  className="h-[52px]"
                />
              </Link>


              <Link href="https://apps.apple.com/kr/app/아이패스케어-ipasscare/id6785789500"
             target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity">
    <img
      src="/resource/image/app_store_btn.png"
      alt="App Store"
      className="h-[52px]"
    />
  </Link>
              
            </div>

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

      {/* 3. 특장점 섹션 (안전 타이틀 강조 및 5개 레이아웃) */}
      <section className="py-32 bg-white text-[#050a14] rounded-t-[4rem]">
        <div className="max-w-[1400px] mx-auto px-[5%]">
          {" "}
          {/* 전체 너비를 조금 더 넓게 설정 */}
          <div className="text-center mb-24" data-aos="fade-up">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter italic uppercase mb-8 text-[#050a14] leading-tight">
              LESS WORK, <br className="md:hidden" />
              <span className="text-blue-600">MORE SAFETY</span>
            </h2>
            <p className="text-xl md:text-2xl font-bold text-gray-800 tracking-tight">
              관리 업무는 줄이고,{" "}
              <span className="text-blue-600 text-2xl md:text-3xl underline underline-offset-4 font-black">
                학부모 아이 걱정은 더 줄이고.
              </span>
            </p>
          </div>
          {/* lg:grid-cols-5 설정을 통해 가로 1열 배치 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {features.map((feature, idx) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={idx}
                  data-aos="fade-up"
                  data-aos-delay={idx * 100}
                  className="p-6 rounded-[2rem] bg-gray-50 border border-gray-100 hover:border-blue-200 transition-all group hover:shadow-2xl hover:-translate-y-2 duration-300 flex flex-col items-start"
                >
                  <div className="mb-6 p-3 bg-white rounded-xl w-fit shadow-md group-hover:bg-blue-600 transition-all duration-300">
                    <IconComponent
                      size={28}
                      className="text-blue-600 group-hover:text-white transition-colors duration-300"
                    />
                  </div>
                  <h4 className="text-xl font-black mb-3 tracking-tight text-[#050a14] break-keep">
                    {feature.title}
                  </h4>
                  <p className="text-gray-500 font-bold text-[13px] leading-relaxed break-keep">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. 푸터 */}
      <Footer />
    </div>
  );
}
