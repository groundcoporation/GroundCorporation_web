"use client";

import React from "react";
import { useAOS } from "@/hooks/useAOS";
import {
  ArrowRight,
  Network,
  Briefcase,
  Target,
  Users,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function OrganizationPage() {
  useAOS();

  // 조직도 부서 데이터 (사업 영역 기반)
  const departments = [
    {
      id: "[id]",
      title: "[제목]",
      icon: <Briefcase size={28} />,
      teams: ["[팀1]", "[팀2]", "[팀3]"],
      delay: "100",
    },
    // {
    //   id: "education",
    //   title: "스포츠교육본부",
    //   icon: <Target size={28} />,
    //   teams: ["강인한 슛팅스타", "교육연구팀", "아카데미운영팀"],
    //   delay: "200",
    // },
    // {
    //   id: "sportainment",
    //   title: "스포테인먼트본부",
    //   icon: <Users size={28} />,
    //   teams: ["에이전시팀", "선수매니지먼트", "장학지원팀"],
    //   delay: "300",
    // },
    // {
    //   id: "brand",
    //   title: "브랜드사업본부",
    //   icon: <ShoppingBag size={28} />,
    //   teams: ["V.O.G SPORTS", "마케팅홍보팀", "글로벌세일즈팀"],
    //   delay: "400",
    // },
    // {
    //   id: "it",
    //   title: "IT 혁신본부",
    //   icon: <ShieldCheck size={28} />,
    //   teams: ["IPASSCARE", "플랫폼개발팀", "데이터분석팀"],
    //   delay: "500",
    // },
  ];

  return (
    <div className="bg-white text-[#050a14] overflow-x-hidden font-sans">
      <Header />

      {/* 1. 서브페이지 히어로 섹션 */}
      <section className="relative h-[45vh] md:h-[55vh] flex items-center justify-center bg-[#050a14] overflow-hidden">
        {/* 배경 이미지 */}
        <div className="absolute inset-0 w-full h-full opacity-30 scale-105">
          <img
            src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1600"
            alt="Organization Background"
            className="w-full h-full object-cover object-center"
          />
        </div>

        {/* 다크 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-[#050a14]/80 to-[#050a14]" />

        <div className="relative z-10 text-center text-white px-5 w-full max-w-4xl mx-auto pt-20">
          <span
            data-aos="fade-up"
            className="block text-blue-500 font-black tracking-[0.5em] mb-4 uppercase text-xs md:text-sm"
          >
            Ground Corporation
          </span>
          <h1
            data-aos="fade-up"
            data-aos-delay="100"
            className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter"
          >
            <span className="text-blue-600">Org</span>anization
          </h1>
        </div>
      </section>

      {/* 2. 조직도 섹션 */}
      <section className="py-24 md:py-32 px-[5%] bg-gray-50 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20" data-aos="fade-up">
            <div className="inline-flex items-center gap-3 text-blue-600 font-black uppercase tracking-widest text-sm mb-4">
              <Network size={20} /> Corporate Structure
            </div>
            <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tighter uppercase italic text-[#050a14]">
              체계적이고 혁신적인 <br className="md:hidden" />
              <span className="text-blue-600">조직 네트워크</span>
            </h2>
          </div>

          {/* 조직도 구조 시작 */}
          <div className="relative flex flex-col items-center">
            {/* 최상단: CEO */}
            <div
              data-aos="zoom-in"
              className="relative z-10 w-full max-w-sm bg-[#050a14] p-8 rounded-3xl shadow-2xl text-center border border-gray-800"
            >
              <p className="text-blue-500 font-black tracking-widest uppercase text-xs mb-2">
                Chief Executive Officer
              </p>
              <h3 className="text-3xl font-black text-white mb-1 tracking-tight">
                대표이사
              </h3>
              <p className="text-gray-400 font-medium">김 강 태</p>
            </div>

            {/* 연결선 (데스크탑에서만 표시) */}
            <div className="hidden lg:block w-px h-16 bg-gray-300"></div>
            <div className="hidden lg:block w-full max-w-5xl h-px bg-gray-300 relative">
              {/* 각 부서로 내려가는 수직선들 */}
              <div className="absolute top-0 left-[10%] w-px h-16 bg-gray-300"></div>
              <div className="absolute top-0 left-[30%] w-px h-16 bg-gray-300"></div>
              <div className="absolute top-0 left-[50%] w-px h-16 bg-gray-300"></div>
              <div className="absolute top-0 left-[70%] w-px h-16 bg-gray-300"></div>
              <div className="absolute top-0 left-[90%] w-px h-16 bg-gray-300"></div>
            </div>

            {/* 본부/부서 그리드 */}
            <div className="w-full mt-10 lg:mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-8 relative z-10">
              {departments.map((dept, index) => (
                <div
                  key={dept.id}
                  data-aos="fade-up"
                  data-aos-delay={dept.delay}
                  className="bg-white rounded-2xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100 hover:-translate-y-2 transition-transform duration-300 group"
                >
                  <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                    {dept.icon}
                  </div>
                  <h4 className="text-xl font-black text-[#050a14] mb-6 tracking-tight break-keep">
                    {dept.title}
                  </h4>
                  <ul className="space-y-3">
                    {dept.teams.map((team, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2 text-gray-500 font-bold text-sm"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-200 group-hover:bg-blue-500 transition-colors" />
                        {team}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. 하단 비전 배너 */}
      <section className="py-20 bg-white border-t border-gray-100 px-[5%]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div data-aos="fade-right">
            <h4 className="text-3xl font-black italic uppercase tracking-tighter mb-2">
              Beyond the Limit,{" "}
              <span className="text-blue-600">Create the Future</span>
            </h4>
            <p className="text-gray-500 font-medium">
              그라운드코퍼레이션의 다양한 비즈니스 영역을 확인해 보세요.
            </p>
          </div>
          <div data-aos="fade-left">
            <a
              href="/#business"
              className="inline-flex items-center gap-4 bg-[#050a14] text-white px-10 py-5 rounded-2xl font-black uppercase text-xs hover:bg-blue-600 transition-all shadow-xl group"
            >
              사업영역 보기
              <ArrowRight
                size={20}
                className="group-hover:translate-x-1 transition-transform"
              />
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
