import React from "react";
import { Camera, Mail } from "lucide-react"; // 사용하는 아이콘 라이브러리에 맞게 수정하세요

export default function Footer() {
  return (
    <footer className="bg-[#12151c] text-white px-[5%] py-24 font-sans border-t border-white/5">
      <div className="flex flex-col md:flex-row justify-between items-start gap-16 border-b border-white/10 pb-20">
        <div className="max-w-md text-left">
          <img
            src="/resource/image/logo_ft.png"
            alt="Logo"
            className="h-15 mb-[60px]" /* tip: 기본 Tailwind에는 mb-15가 없으므로 mb-[60px]이나 mb-16을 권장합니다 */
          />
          <p className="text-white/40 font-medium leading-relaxed text-xs">
            (주)그라운드코퍼레이션 | 대표이사: 김강태 <br />
            본사: 경기도 시흥시 배곧지구 내 프리미엄 센터 <br />
            문의: groundcoporation@gmail.com
          </p>
        </div>

        <div className="flex gap-20">
          <div>
            <h4 className="text-blue-600 font-black uppercase mb-6 tracking-widest text-xs">
              Business
            </h4>
            <ul className="space-y-4 font-bold text-white/60 text-sm">
              <li>유소년 육성사업</li>
              <li>스포츠 웨어</li>
              <li>스포테인먼트</li>
              <li>IT 솔루션</li>
            </ul>
          </div>
          <div>
            <h4 className="text-blue-600 font-black uppercase mb-6 tracking-widest text-xs">
              SNS
            </h4>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center hover:bg-blue-600 transition-all text-white"
              >
                <Camera size={18} />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center hover:bg-red-600 transition-all text-white"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-10 text-center md:text-left text-[10px] font-black uppercase tracking-[0.4em] text-white/20">
        © 2026 Ground Corporation. All Rights Reserved.
      </div>
    </footer>
  );
}
