"use client";

import React, { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  CheckCircle2,
  Camera,
  Mail,
  ChevronRight,
  Award,
  ShieldCheck,
  Zap,
  Waves,
} from "lucide-react";
import Link from "next/link";

export default function YeongjongCoaches() {
  useEffect(() => {
    AOS.init({ duration: 1000, once: true });
  }, []);

  const coaches = [
    {
      role: "Technical Director",
      name: "KIM KANG TAE",
      engName: "Director Kim",
      specialty: "영종도 지점 총괄 및 엘리트 퍼포먼스 디렉팅",
      quote: "바다처럼 넓은 시야를 가진 선수가 경기장 전체를 지배합니다.",
      experience: [
        "AFC 'A' License 지도자 자격 보유",
        "유럽 프로리그(Eredivisie) 기술 연수 수료",
        "전 K리그 프로 축구 선수 (10년 경력)",
        "영종도 지역 유소년 축구 발전 위원",
      ],
      image:
        "https://images.unsplash.com/photo-1519315901367-f34ff9154487?q=80&w=800",
    },
    {
      role: "Senior Coach",
      name: "LEE MIN HO",
      engName: "Coach Lee",
      specialty: "개인 전술 및 고강도 피지컬 트레이닝",
      quote: "거친 바닷바람을 이겨내는 강인한 신체가 기술의 완성입니다.",
      experience: [
        "AFC 'B' License 지도자 자격",
        "전문 스포츠 지도사 2급 (축구)",
        "국가대표급 피지컬 강화 프로그램 이수",
        "해외 유스팀 피지컬 코칭 시스템 도입",
      ],
      image:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800",
    },
    {
      role: "Growth Specialist",
      name: "PARK JI SUNG",
      engName: "Coach Park",
      specialty: "유소년 기초 심리 및 사회성 발달 축구",
      quote:
        "아이들의 웃음소리가 영종 그라운드를 가득 채울 때 보람을 느낍니다.",
      experience: [
        "아동 체육 지도사 1급 보유",
        "심리 상담 및 아동 발달 센터 협업",
        "영종도 유치부 특화 커리큘럼 설계자",
        "생활 스포츠 지도사 (축구)",
      ],
      image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=800",
    },
  ];

  return (
    <div className="bg-[#f0f7f4] text-[#1b4332] font-sans overflow-x-hidden">
      {/* --- Header Section --- */}
      <section className="pt-48 pb-24 px-[5%] md:px-[10%] text-center">
        <div data-aos="fade-down">
          <span className="text-[#52b788] font-black tracking-[0.4em] text-xs uppercase italic mb-6 block">
            Elite Coaching System
          </span>
          <h1 className="text-6xl md:text-9xl font-[1000] tracking-tighter leading-[0.9] mb-10 uppercase italic">
            ELITE
            <br />
            <span className="text-[#52b788]">COACHES</span>
          </h1>
          <p className="text-gray-500 font-bold text-lg md:text-2xl max-w-3xl mx-auto leading-relaxed">
            영종도의 특별한 환경에서 아이들의 잠재력을 깨우는
            <br className="hidden md:block" />
            최정상급 코치진의 전문적인 지도를 경험하세요.
          </p>
        </div>
      </section>

      {/* --- Coaching Value (전문성 지표) --- */}
      <section className="px-[5%] md:px-[10%] mb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Award size={36} />,
              title: "Global Standards",
              desc: "AFC 및 국제 공인 지도자 자격 보유",
            },
            {
              icon: <ShieldCheck size={36} />,
              title: "Safety First",
              desc: "영종도 지점 전담 안전/응급 관리 시스템",
            },
            {
              icon: <Zap size={36} />,
              title: "Smart Analysis",
              desc: "데이터 기반의 맞춤형 성장 피드백",
            },
          ].map((item, i) => (
            <div
              key={i}
              data-aos="fade-up"
              data-aos-delay={i * 100}
              className="bg-white p-12 rounded-[50px] shadow-[0_20px_40px_rgba(27,67,50,0.05)] border border-[#d8f3dc] flex flex-col items-center text-center gap-6 group hover:-translate-y-2 transition-transform"
            >
              <div className="text-[#52b788] group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <div>
                <h4 className="text-2xl font-black text-[#1b4332] mb-2">
                  {item.title}
                </h4>
                <p className="text-gray-400 font-bold text-sm tracking-tight">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- Coach List (상세 카드) --- */}
      <section className="px-[5%] md:px-[10%] pb-48 space-y-32">
        {coaches.map((coach, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-16 items-center`}
          >
            {/* 이미지 영역 */}
            <div
              className="w-full lg:w-1/2 relative"
              data-aos={idx % 2 === 0 ? "fade-right" : "fade-left"}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[60px] shadow-[0_50px_100px_-20px_rgba(27,67,50,0.3)] group">
                <img
                  src={coach.image}
                  alt={coach.name}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-50 group-hover:grayscale-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1b4332] via-transparent to-transparent opacity-70"></div>
                <div className="absolute bottom-12 left-12 text-white">
                  <div className="bg-[#52b788] px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 inline-block">
                    {coach.engName}
                  </div>
                  <h3 className="text-5xl font-[1000] tracking-tighter uppercase italic">
                    {coach.name}
                  </h3>
                </div>
              </div>
            </div>

            {/* 정보 영역 */}
            <div
              className="w-full lg:w-1/2 space-y-10"
              data-aos={idx % 2 === 0 ? "fade-left" : "fade-right"}
            >
              <div>
                <span className="text-[#52b788] font-black text-sm tracking-[0.4em] uppercase italic mb-6 block">
                  {coach.role}
                </span>
                <h2 className="text-4xl md:text-6xl font-[1000] mb-6 tracking-tighter text-[#1b4332] leading-tight">
                  {coach.specialty}
                </h2>
                <p className="text-2xl font-bold text-[#52b788] italic leading-relaxed">
                  "{coach.quote}"
                </p>
              </div>

              <div className="space-y-5">
                <h5 className="text-xs font-black text-gray-300 uppercase tracking-[0.3em] mb-6">
                  Professional Experience
                </h5>
                {coach.experience.map((exp, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-5 group cursor-default"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#52b788] transition-all group-hover:w-8" />
                    <span className="text-xl font-bold text-gray-500 group-hover:text-[#1b4332] transition-colors">
                      {exp}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-10 flex gap-4">
                <button className="flex items-center gap-4 px-10 py-5 bg-[#1b4332] text-white rounded-[25px] font-black text-sm shadow-xl hover:bg-[#52b788] transition-all transform hover:-translate-y-1">
                  <Camera size={22} />
                  VIEW MOMENTS
                </button>
                <button className="w-16 h-16 border-2 border-[#1b4332] text-[#1b4332] rounded-[25px] flex items-center justify-center hover:bg-[#1b4332] hover:text-white transition-all shadow-lg">
                  <Mail size={22} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* --- Footer CTA --- */}
      <section className="bg-[#1b4332] py-40 px-[5%] text-center rounded-t-[80px] md:rounded-t-[120px] relative overflow-hidden">
        <Waves
          size={400}
          className="absolute -right-20 -bottom-20 text-white/5 rotate-12"
        />
        <div data-aos="zoom-in" className="relative z-10">
          <h2 className="text-5xl md:text-8xl font-[1000] text-white tracking-tighter mb-12 uppercase italic">
            JOIN OUR
            <br />
            <span className="text-[#52b788]">DREAM TEAM</span>
          </h2>
          <p className="text-white/50 font-bold text-xl mb-16 max-w-2xl mx-auto">
            국가대표급 코칭 스태프가 아이들의 성장을 책임집니다.
            <br />
            지금 바로 영종 브랜치의 프리미엄 교육을 예약하세요.
          </p>
          <Link
            href="/branch/yeongjong/reservation"
            className="inline-flex items-center gap-4 bg-[#52b788] text-[#1b4332] px-16 py-8 rounded-full font-black text-2xl hover:bg-white hover:scale-110 transition-all shadow-2xl"
          >
            수업 신청하기
            <ChevronRight size={28} />
          </Link>
        </div>
      </section>
    </div>
  );
}
