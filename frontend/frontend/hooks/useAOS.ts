import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

export const useAOS = () => {
  useEffect(() => {
    const initAOS = () => {
      AOS.init({
        duration: 1000,
        once: true,
      });
    };

    initAOS();

    // 뒤로가기(bfcache) 대응: 페이지가 나타날 때마다 AOS 갱신
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        AOS.refreshHard(); // 완전히 새로고침하여 위치 재계산
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);
};
