//애니메이션 부분 코드. 네이버, 구글 노출위해서 분리

"use client";

import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

export default function AOSInit() {
  useEffect(() => {
    // 페이지 이동 시에도 AOS가 정상 작동하도록 설정
    AOS.init({
      duration: 1000,
      once: true,
    });

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) AOS.refresh();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null; // 화면에 그릴 건 없고 기능만 켭니다.
}