"use client";

import React from "react";
import { useAOS } from "@/hooks/useAOS";
import {
  Scale,
  Code2,
  Trophy,
  Shirt,
  Handshake,
  Users,
  ChevronRight,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// --- Types ---
interface DeptData {
  title: string;
  icon: React.ReactNode;
  leader: string;
  teams: string[];
}

interface DeptCardProps {
  data: DeptData;
  isCore?: boolean;
  isSmall?: boolean;
}

// --- Component: Simplified Dept Card ---
function DeptCard({ data, isCore = false, isSmall = false }: DeptCardProps) {
  return (
    <div
      data-aos="fade-up"
      className={`w-full group bg-white transition-all duration-500 relative z-10
      ${isCore ? "scale-105" : "hover:-translate-y-1"}`}
    >
      <div
        className={`p-6 rounded-2xl border-t-4 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border-x border-b border-gray-100
        ${isCore ? "border-t-blue-600 shadow-blue-900/5" : "border-t-gray-800 hover:border-t-blue-500"}`}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
            ${isCore ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-400 group-hover:text-blue-500"}`}
          >
            {data.icon}
          </div>
          <div>
            <h4
              className={`${isSmall ? "text-sm" : "text-base"} font-bold text-gray-900 tracking-tight`}
            >
              {data.title}
            </h4>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
              {data.leader}
            </p>
          </div>
        </div>

        <ul className="space-y-1.5">
          {data.teams.map((team, idx) => (
            <li
              key={idx}
              className="flex items-center text-[11px] text-gray-500 font-semibold"
            >
              <ChevronRight
                size={10}
                className="mr-1 text-gray-300 group-hover:text-blue-500 transition-colors"
              />
              {team}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// --- Main Page ---
export default function OrganizationPage() {
  useAOS();

  const organization = {
    legal: {
      title: "법률·자문 고문",
      icon: <Scale size={18} />,
      leader: "Advisory Board",
      teams: ["법률 자문", "리스크 관리"],
    },
    dev: {
      title: "개발본부",
      icon: <Code2 size={18} />,
      leader: "Director",
      teams: ["Software Engineering", "AI Dev Team"],
    },
    business: [
      {
        title: "스포테인먼트",
        icon: <Trophy size={16} />,
        leader: "Agent Team",
        teams: ["매니지먼트", "콘텐츠 기획", "에이전트"],
      },
      {
        title: "의류사업부",
        icon: <Shirt size={16} />,
        leader: "Apparel Team",
        teams: ["브랜드 디자인", "유통 물류", "V.O.G 운영"],
      },
      {
        title: "대외협력",
        icon: <Users size={16} />,
        leader: "PR Team",
        teams: ["파트너십", "대외 홍보"],
      },
      {
        title: "경영지원",
        icon: <Handshake size={16} />,
        leader: "Support Team",
        teams: ["인사/회계", "전략 지원"],
      },
    ],
  };

  return (
    <div className="bg-[#fcfcfc] text-[#1a1a1a] font-sans">
      <Header />

      <section className="py-32 px-[5%]">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-24" data-aos="fade-down">
            <span className="text-blue-600 font-black text-xs tracking-[0.3em] uppercase mb-4 block">
              Structure
            </span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-gray-900 mb-4">
              Ground <span className="text-gray-300">Network</span>
            </h2>
            <div className="w-12 h-1 bg-blue-600 mx-auto rounded-full" />
          </div>

          <div className="relative flex flex-col items-center">
            {/* [Level 1] CEO */}
            <div className="relative z-30" data-aos="zoom-in">
              <div className="bg-white px-12 py-8 rounded-2xl border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-center">
                <p className="text-blue-600 font-bold text-[10px] tracking-widest uppercase mb-1">
                  Chief Executive Officer
                </p>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  김 강 태
                </h3>
              </div>
              <div className="hidden xl:block absolute left-1/2 top-full w-[2px] h-20 bg-gray-200 -translate-x-1/2"></div>
            </div>

            {/* [Level 2] Branch Area */}
            <div className="w-full relative pt-20">
              {/* 상단 메인 가로선 (법률 ~ 개발 연결) */}
              <div className="hidden xl:block absolute top-0 left-[10%] right-[10%] h-[2px] bg-gray-200"></div>

              <div className="flex flex-col xl:flex-row items-start justify-center gap-8 xl:gap-0 w-full">
                {/* 좌측: 법률 자문 */}
                <div className="w-full xl:w-[20%] flex flex-col items-center px-4 relative">
                  <div className="hidden xl:block absolute top-[-80px] w-[2px] h-20 bg-gray-200"></div>
                  <DeptCard data={organization.legal} />
                </div>

                {/* 중앙: 비즈니스 운영 */}
                <div className="w-full xl:w-[60%] flex flex-col items-center px-4 relative">
                  <div className="hidden xl:block absolute top-[-80px] w-[2px] h-20 bg-blue-500"></div>

                  <div className="bg-blue-50 text-blue-600 px-6 py-2 rounded-full mb-12 z-20 font-bold text-[10px] tracking-widest border border-blue-100">
                    BUSINESS OPERATION
                  </div>

                  {/* 하위 4개 팀 뿌리 수정 영역 */}
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 relative">
                    {/* [수정] 4개 카드일 때 첫 번째 카드 중앙(12.5%)에서 마지막 카드 중앙(87.5%)까지 가로선 연장 */}
                    <div className="hidden xl:block absolute top-[-24px] left-[12.5%] right-[12.5%] h-[2px] bg-blue-100"></div>

                    {organization.business.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col items-center relative"
                      >
                        {/* 각 팀 수직선 */}
                        <div className="hidden xl:block absolute top-[-24px] w-[2px] h-6 bg-blue-100"></div>
                        <DeptCard data={item} isSmall />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 우측: 개발본부 */}
                <div className="w-full xl:w-[20%] flex flex-col items-center px-4 relative">
                  <div className="hidden xl:block absolute top-[-80px] w-[2px] h-20 bg-gray-200"></div>
                  <DeptCard data={organization.dev} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
