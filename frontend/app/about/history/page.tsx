"use client";

import React from "react";
import { useAOS } from "@/hooks/useAOS";
import { ArrowRight, History, Flag, Milestone } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function HistoryPage() {
  useAOS();

  // 연혁 데이터 (최신순 정렬)
  const historyData = [
    {
      year: "2026",
      title: "[제목]",
      events: ["[내용1]", "[내용2]"],
    },
    // {
    //   year: "2025",
    //   title: "IT 솔루션 및 장학사업 출범",
    //   events: [
    //     "스포츠 시설 전용 통합 관리 솔루션 'IPASSCARE' 공식 런칭",
    //     "그라운드코퍼레이션 장학지원 시스템 구축 및 후원 사업 개시",
    //   ],
    // },
    // {
    //   year: "2024",
    //   title: "브랜드 런칭 및 매니지먼트 확대",
    //   events: [
    //     "프리미엄 스포츠 웨어 브랜드 'V.O.G SPORTS' 런칭",
    //     "그라운드코퍼레이션 에이전시 출범 및 엘리트 선수 매니지먼트 계약 체결",
    //   ],
    // },
    // {
    //   year: "2023",
    //   title: "교육 인프라 확장",
    //   events: [
    //     "유소년 축구교실 '강인한 슛팅스타' 영종 국제도시점 신규 오픈",
    //     "데이터 기반 프리미엄 교육 시스템 고도화",
    //   ],
    // },
    // {
    //   year: "2021",
    //   title: "그라운드코퍼레이션 설립",
    //   events: [
    //     "그라운드 코퍼레이션(그라운드코퍼레이션) 법인 설립",
    //     "유소년 축구교실 '강인한 슛팅스타' 시흥 배곧 본점 오픈",
    //   ],
    // },
  ];

  return (
    <div className="bg-white text-[#050a14] overflow-x-hidden font-sans">
      <Header />

      {/* 1. 서브페이지 히어로 섹션 */}
      <section className="relative h-[45vh] md:h-[55vh] flex items-center justify-center bg-[#050a14] overflow-hidden">
        {/* 배경 이미지 */}
        <div className="absolute inset-0 w-full h-full opacity-40 scale-105">
          <img
            src="https://images.unsplash.com/photo-1519326844853-631165ee2cc5?q=80&w=1600"
            alt="History Background"
            className="w-full h-full object-cover object-center grayscale mix-blend-luminosity"
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
            Our <span className="text-blue-600">History</span>
          </h1>
        </div>
      </section>

      {/* 2. 연혁 타임라인 섹션 */}
      <section className="py-24 md:py-32 px-[5%] bg-gray-50 relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-24" data-aos="fade-up">
            <div className="inline-flex items-center gap-3 text-blue-600 font-black uppercase tracking-widest text-sm mb-4">
              <History size={20} /> Corporate Journey
            </div>
            <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tighter uppercase italic text-[#050a14]">
              끊임없는 혁신으로 <br className="md:hidden" />
              <span className="text-blue-600">새로운 역사</span>를 씁니다
            </h2>
          </div>

          {/* 타임라인 래퍼 */}
          <div className="relative">
            {/* 중앙 수직선 (모바일에서는 좌측, 데스크탑에서는 중앙) */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gray-200 -translate-x-1/2"></div>

            <div className="space-y-16 md:space-y-24">
              {historyData.map((item, index) => {
                // 짝수 인덱스는 왼쪽에, 홀수 인덱스는 오른쪽에 배치 (데스크탑 기준)
                const isEven = index % 2 === 0;

                return (
                  <div
                    key={item.year}
                    className={`relative flex flex-col md:flex-row items-start md:items-center ${
                      isEven ? "md:flex-row-reverse" : ""
                    }`}
                  >
                    {/* 중앙 연도 노드 (마커) */}
                    <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-white border-4 border-gray-50 flex items-center justify-center z-10 shadow-lg mt-0 md:mt-0">
                      <div className="w-4 h-4 rounded-full bg-blue-600" />
                    </div>

                    {/* 여백 (데스크탑에서 한쪽을 비우기 위함) */}
                    <div className="hidden md:block md:w-1/2" />

                    {/* 콘텐츠 박스 */}
                    <div
                      data-aos={isEven ? "fade-left" : "fade-right"}
                      className={`ml-20 md:ml-0 w-full md:w-1/2 ${
                        isEven ? "md:pl-16" : "md:pr-16 text-left md:text-right"
                      }`}
                    >
                      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:border-blue-100 hover:shadow-[0_8px_30px_rgb(37,99,235,0.08)] transition-all duration-300 group">
                        <div
                          className={`flex flex-col ${isEven ? "items-start" : "items-start md:items-end"} mb-6`}
                        >
                          <h3 className="text-5xl font-black italic tracking-tighter text-blue-600 mb-2">
                            {item.year}
                          </h3>
                          <h4 className="text-xl font-bold text-[#050a14]">
                            {item.title}
                          </h4>
                        </div>

                        <ul
                          className={`space-y-4 ${isEven ? "" : "md:flex md:flex-col md:items-end"}`}
                        >
                          {item.events.map((event, idx) => (
                            <li
                              key={idx}
                              className={`flex items-start gap-3 text-gray-500 font-medium leading-relaxed ${
                                isEven
                                  ? ""
                                  : "md:flex-row-reverse text-left md:text-right"
                              }`}
                            >
                              <div className="mt-1.5 min-w-[6px]">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-300 group-hover:bg-blue-600 transition-colors" />
                              </div>
                              <span className="break-keep">{event}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 타임라인 시작점 아이콘 (가장 하단) */}
            <div className="absolute left-6 md:left-1/2 bottom-[-40px] -translate-x-1/2 w-12 h-12 flex items-center justify-center text-gray-300">
              <Flag size={24} />
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
