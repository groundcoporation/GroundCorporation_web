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
} from "lucide-react";
import Link from "next/link";

export default function SiheungCoaches() {
  useEffect(() => {
    AOS.init({ duration: 1000, once: true });
  }, []);

  const coaches = [
    {
      role: "Head Director",
      name: "KIM KANG TAE",
      engName: "Director Kim",
      specialty: "전술 전략 및 유소년 총괄 디렉팅",
      quote: "축구는 단순한 스포츠가 아닌, 아이들의 인생을 바꾸는 교육입니다.",
      experience: [
        "AFC 'A' License 지도자 자격",
        "대한축구협회 유소년 전임 지도자 역임",
        "전 K리그 프로 축구 선수 (10년 경력)",
        "네덜란드 아약스 유스 아카데미 지도자 연수",
      ],
      image:
        "https://images.unsplash.com/photo-1519315901367-f34ff9154487?q=80&w=800",
      color: "#d35400",
    },
    {
      role: "Elite Coach",
      name: "LEE MIN HO",
      engName: "Coach Lee",
      specialty: "개인 기술 및 피지컬 트레이닝 전문",
      quote: "기본기가 탄탄할 때 비로소 창의적인 플레이가 나옵니다.",
      experience: [
        "AFC 'B' License 지도자 자격",
        "국가대표 피지컬 트레이너 과정 수료",
        "독일 분데스리가 도르트문트 유스 연수",
        "전문 스포츠 지도사 2급 (축구)",
      ],
      image:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800",
      color: "#1a3021",
    },
    {
      role: "Youth Specialist",
      name: "PARK JI SUNG",
      engName: "Coach Park",
      specialty: "유아/저학년 심리 및 기초 축구 교육",
      quote: "축구장 안에서 아이들이 가장 행복하게 웃는 시간을 만듭니다.",
      experience: [
        "아동 체육 지도사 1급",
        "심리 상담사 자격 보유",
        "유소년 기초 발달 커리큘럼 개발자",
        "생활 스포츠 지도사 (축구)",
      ],
      image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=800",
      color: "#d35400",
    },
  ];

  return (
    <div className="bg-[#f2efe9] text-[#1a3021] font-sans">
      {/* --- Header Section --- */}
      <section className="pt-40 pb-20 px-[5%] md:px-[10%] text-center">
        <div data-aos="fade-down">
          <span className="text-[#d35400] font-black tracking-[0.4em] text-xs uppercase italic mb-4 block">
            Expertise & Passion
          </span>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
            COACHING
            <br />
            <span className="text-[#d35400]">STAFF</span>
          </h1>
          <p className="text-gray-500 font-bold text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            국내외 검증된 자격과 실전 경험을 갖춘 최정상급 코치진이
            <br className="hidden md:block" />
            아이들의 꿈을 위해 함께 달립니다.
          </p>
        </div>
      </section>

      {/* --- Coaching Value (전문성 지표) --- */}
      <section className="px-[5%] md:px-[10%] mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <Award size={32} />,
              title: "전원 자격 보유",
              desc: "AFC 및 국가 공인 지도자 자격증 보유",
            },
            {
              icon: <ShieldCheck size={32} />,
              title: "안전 책임 코칭",
              desc: "응급처치 및 아동 안전 교육 이수",
            },
            {
              icon: <Zap size={32} />,
              title: "글로벌 커리큘럼",
              desc: "유럽 명문 구단 연수 시스템 도입",
            },
          ].map((item, i) => (
            <div
              key={i}
              data-aos="fade-up"
              data-aos-delay={i * 100}
              className="bg-white p-10 rounded-[40px] shadow-sm border border-black/5 flex items-start gap-6"
            >
              <div className="text-[#d35400]">{item.icon}</div>
              <div>
                <h4 className="text-xl font-black mb-1">{item.title}</h4>
                <p className="text-gray-400 font-medium text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- Coach List (상세 카드) --- */}
      <section className="px-[5%] md:px-[10%] pb-40 space-y-20">
        {coaches.map((coach, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-12 items-center`}
          >
            {/* 이미지 영역 */}
            <div
              className="w-full lg:w-1/2 relative"
              data-aos={idx % 2 === 0 ? "fade-right" : "fade-left"}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[50px] shadow-2xl group">
                <img
                  src={coach.image}
                  alt={coach.name}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale group-hover:grayscale-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a3021] via-transparent to-transparent opacity-60"></div>
                <div className="absolute bottom-10 left-10 text-white">
                  <span className="text-[#d35400] font-black text-sm uppercase tracking-widest">
                    {coach.engName}
                  </span>
                  <h3 className="text-4xl font-black mt-2">{coach.name}</h3>
                </div>
              </div>
            </div>

            {/* 정보 영역 */}
            <div
              className="w-full lg:w-1/2 space-y-8"
              data-aos={idx % 2 === 0 ? "fade-left" : "fade-right"}
            >
              <div>
                <span className="bg-[#1a3021] text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6 inline-block">
                  {coach.role}
                </span>
                <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter text-[#1a3021]">
                  {coach.specialty}
                </h2>
                <p className="text-xl font-bold text-[#d35400] italic">
                  "{coach.quote}"
                </p>
              </div>

              <div className="space-y-4">
                <h5 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
                  Core Experience
                </h5>
                {coach.experience.map((exp, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 group cursor-default"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#d35400] transition-all group-hover:w-6" />
                    <span className="text-lg font-bold text-gray-600 group-hover:text-[#1a3021] transition-colors">
                      {exp}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-8 flex gap-4">
                <button className="flex items-center gap-3 px-8 py-4 bg-white rounded-2xl font-black text-sm shadow-md hover:bg-[#1a3021] hover:text-white transition-all">
                  <Camera size={20} />
                  Official Instagram
                </button>
                <button className="w-14 h-14 bg-[#1a3021] text-white rounded-2xl flex items-center justify-center hover:bg-[#d35400] transition-colors shadow-lg">
                  <Mail size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* --- Footer CTA --- */}
      <section className="bg-[#1a3021] py-32 px-[5%] text-center rounded-t-[100px]">
        <div data-aos="zoom-in">
          <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter mb-12">
            최고의 코치와 함께
            <br />
            실력을 <span className="text-[#d35400]">업그레이드</span> 하세요
          </h2>
          <Link
            href="/branch/siheung/reservation"
            className="inline-flex items-center gap-4 bg-[#d35400] text-white px-12 py-6 rounded-full font-black text-xl hover:scale-110 transition-transform shadow-2xl"
          >
            수업 예약하기
            <ChevronRight size={24} />
          </Link>
        </div>
      </section>
    </div>
  );
}
