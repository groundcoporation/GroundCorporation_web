"use client";

import React from "react";
import { useAOS } from "@/hooks/useAOS";
import { Quote, ArrowRight, Globe } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function GreetingPage() {
  useAOS();

  return (
    <div className="bg-white text-[#050a14] overflow-x-hidden font-sans">
      <Header />

      {/* 1. 서브페이지 히어로 섹션 */}
      <section className="relative h-[45vh] md:h-[55vh] flex items-center justify-center bg-[#050a14] overflow-hidden">
        {/* 배경 이미지 */}
        <div className="absolute inset-0 w-full h-full opacity-40 scale-105">
          <img
            src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1600"
            alt="CEO Greeting Background"
            className="w-full h-full object-cover object-center"
          />
        </div>

        {/* 다크 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050a14] via-[#050a14]/60 to-transparent" />

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
            CEO <span className="text-blue-600">Message</span>
          </h1>
        </div>
      </section>

      {/* 2. 인사말 본문 섹션 (매거진 레이아웃) */}
      <section className="py-24 md:py-32 px-[5%] bg-white relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-16 lg:gap-24 items-start">
            {/* 좌측: 대표 이미지 및 타이틀 */}
            <div className="lg:col-span-5" data-aos="fade-right">
              <div className="sticky top-32">
                <div className="flex items-center gap-3 text-blue-600 font-black uppercase tracking-widest text-sm mb-6">
                  <Globe size={20} /> Welcome
                </div>
                <h2 className="text-4xl md:text-6xl font-black mb-8 leading-[1.1] tracking-tighter uppercase italic">
                  Create <br />
                  <span className="text-blue-600">New Ground</span>
                </h2>

                {/* 대표님 사진 영역 */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl group">
                  <div className="absolute inset-0 bg-blue-600/20 group-hover:bg-transparent transition-colors duration-500 z-10 mix-blend-multiply" />
                  <img
                    src="https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800" // 실제 대표님 사진 경로로 변경하세요 ("/resource/image/ceo.png" 등)
                    alt="김강태 대표이사"
                    className="w-full h-[500px] object-cover grayscale group-hover:grayscale-0 transition-all duration-700 transform group-hover:scale-105"
                  />
                  <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/90 to-transparent z-20">
                    <p className="text-white/60 font-black tracking-widest uppercase text-xs mb-1">
                      Chief Executive Officer
                    </p>
                    <p className="text-white text-2xl font-black">
                      김 강 태{" "}
                      <span className="text-lg font-medium text-white/80 ml-2">
                        Kim Kang Tae
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 우측: 인사말 텍스트 */}
            <div className="lg:col-span-7 pt-4 lg:pt-20" data-aos="fade-left">
              {/* 인용구 */}
              <div className="relative mb-16">
                <Quote
                  className="absolute -top-6 -left-6 md:-top-10 md:-left-10 text-gray-100 rotate-180"
                  size={80}
                />
                <h3 className="relative z-10 text-2xl md:text-3xl font-black leading-snug tracking-tight text-[#050a14] break-keep">
                  "저희의 인프라와 노하우로 <br className="hidden md:block" />
                  선수들의{" "}
                  <span className="text-blue-600">꿈과 목표를 함께</span>{" "}
                  이뤄냅니다."
                </h3>
              </div>

              {/* 본문 단락들 */}
              <div className="space-y-10 text-gray-500 text-lg font-medium leading-relaxed break-keep">
                <p>
                  대한민국 스포테인먼트 산업의 세계화를 앞장서는
                  (주)그라운드코퍼레이션의 대표 김강태 입니다.
                </p>

                <p>
                  국내, 외 선수들을 매니지먼트, 프로 구단 입단 기회 부여, 구단
                  이적, 언론 홍보 등 소속 선수들이 자신의 기량을 세계무대에 널리
                  펼치기 위해서 저는 최선의 노력을 다하고 있습니다.
                </p>

                <p>
                  저희의 인프라와 노하우로 선수들의 축구 인생의 컨설팅과 함께
                  선수들의 꿈과 목표를 함께 이뤄내고 있습니다.
                </p>

                <p className="text-[#050a14] font-bold text-xl pt-4">
                  그라운드코퍼레이션이 열어갈 새로운 미래에 앞으로도 많은 기대와
                  동참 부탁드립니다. 감사합니다.
                </p>

                {/* 서명 영역 */}
                <div className="pt-10 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-blue-600 tracking-widest uppercase mb-1">
                      Ground Corporation
                    </span>
                    <span className="text-gray-900 font-black text-xl">
                      대표 김 강 태
                    </span>
                  </div>
                  {/* 자필 서명 이미지가 있다면 여기에 넣으면 멋스럽습니다 */}
                  <div className="text-4xl font-black italic text-gray-200 uppercase tracking-tighter">
                    K.T.KIM
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 하단 비전 배너 */}
      <section className="py-20 bg-gray-50 border-t border-gray-100 px-[5%]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div data-aos="fade-up">
            <h4 className="text-3xl font-black italic uppercase tracking-tighter mb-2">
              Beyond the Limit,{" "}
              <span className="text-blue-600">Create the Future</span>
            </h4>
            <p className="text-gray-500 font-medium">
              그라운드코퍼레이션의 다양한 비즈니스 영역을 확인해 보세요.
            </p>
          </div>
          <div data-aos="fade-up" data-aos-delay="100">
            {/* Business 페이지나 메인 페이지로 이동하는 버튼 */}
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
