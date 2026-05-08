"use client";

import React, { useState } from "react";
import { Menu, X, ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// 공통 비즈니스 데이터
export const businessCategories = [
  {
    category: "유소년 축구교실",
    units: [
      { id: "shootingstar", title: "강인한 슛팅스타", link: "/#business" },
    ],
  },
  {
    category: "스포츠 웨어",
    units: [
      {
        id: "vogsports",
        title: "V.O.G SPORTS",
        link: "http://vog-sports.com/",
      },
    ],
  },
  {
    category: "스포테인먼트",
    units: [
      { id: "agency", title: "에이전시", link: "/business/agency/" },
      { id: "scholarship", title: "장학사업", link: "#" },
    ],
  },
  {
    category: "IT 솔루션",
    units: [
      { id: "ipasscare", title: "IPASSCARE", link: "/business/ipasscare/" },
    ],
  },
];

export default function Header() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const toggleSidebar = (state: boolean) => {
    setIsSidebarOpen(state);
    if (typeof document !== "undefined") {
      document.body.style.overflow = state ? "hidden" : "auto";
    }
  };

  return (
    <>
      <header
        className="fixed top-0 w-full h-[80px] flex justify-between items-center px-[5%] z-[1000] bg-white/90 backdrop-blur-md border-b border-gray-100"
        onMouseLeave={() => setActiveMenu(null)}
      >
        <Link href="/">
          <img
            src="/GroundCoropration_web/resource/image/logo.png"
            alt="Logo"
            className="h-50"
          />
        </Link>

        <nav className="hidden lg:flex gap-12 h-full items-center font-black text-[14px] uppercase tracking-tighter text-[#050a14]">
          {/* 기업정보 */}
          <div
            className="relative h-full flex items-center"
            onMouseEnter={() => setActiveMenu("about")}
          >
            <button
              className={`flex items-center gap-1 transition-colors ${activeMenu === "about" ? "text-blue-600" : ""}`}
            >
              기업정보{" "}
              <ChevronDown
                size={14}
                className={`transition-transform duration-300 ${activeMenu === "about" ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence>
              {activeMenu === "about" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-[80px] left-1/2 -translate-x-1/2 w-[160px] bg-white border border-gray-100 shadow-2xl rounded-2xl p-2"
                >
                  {["기업 개요", "조직도", "인사말", "연혁"].map((item) => (
                    <Link
                      key={item}
                      href="/#about"
                      onClick={() => setActiveMenu(null)}
                      className="block p-3 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all font-bold text-center"
                    >
                      {item}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 4가지 카테고리 */}
          {businessCategories.map((category) => (
            <div
              key={category.category}
              className="relative h-full flex items-center"
              onMouseEnter={() => setActiveMenu(category.category)}
            >
              <button
                className={`flex items-center gap-1 transition-colors ${activeMenu === category.category ? "text-blue-600" : ""}`}
              >
                {category.category}
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-300 ${activeMenu === category.category ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {activeMenu === category.category && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-[80px] left-1/2 -translate-x-1/2 w-[220px] bg-white border border-gray-100 shadow-2xl rounded-2xl p-2"
                  >
                    {category.units.map((unit) => (
                      <Link
                        key={unit.id}
                        href={unit.link}
                        onClick={() => setActiveMenu(null)}
                        className="w-full text-left p-4 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all group flex items-center justify-between"
                      >
                        <span className="text-[14px] font-bold tracking-tight">
                          {unit.title}
                        </span>
                        <ArrowRight
                          size={14}
                          className="opacity-0 group-hover:opacity-100 transition-all"
                        />
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        <button
          onClick={() => toggleSidebar(true)}
          className="p-2 hover:bg-gray-100 rounded-full transition-all"
        >
          <Menu size={26} className="text-[#050a14]" />
        </button>
      </header>

      {/* 모바일 사이드바 */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => toggleSidebar(false)}
              className="fixed inset-0 bg-black/60 z-[1500] backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed top-0 right-0 w-[80%] max-w-[350px] h-full bg-white z-[2000] p-10 shadow-2xl text-[#050a14]"
            >
              <button
                onClick={() => toggleSidebar(false)}
                className="absolute top-6 right-6 text-gray-400"
              >
                <X size={28} />
              </button>
              <nav className="space-y-8 mt-10">
                <Link
                  href="/#about"
                  onClick={() => toggleSidebar(false)}
                  className="block text-2xl font-black italic uppercase"
                >
                  About Us
                </Link>
                {businessCategories.map((cat) => (
                  <div key={cat.category} className="space-y-4">
                    <p className="text-xs font-black text-gray-300 uppercase tracking-widest">
                      {cat.category}
                    </p>
                    {cat.units.map((unit) => (
                      <Link
                        key={unit.id}
                        href={unit.link}
                        onClick={() => toggleSidebar(false)}
                        className="block text-xl font-bold hover:text-blue-600"
                      >
                        {unit.title}
                      </Link>
                    ))}
                  </div>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
