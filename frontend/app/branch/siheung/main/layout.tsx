import { Metadata } from "next";

export const metadata: Metadata = {
  title: "강인한 슛팅스타 시흥 배곧점 | 시흥 어린이 실내 축구교실",
  description: "시흥 배곧신도시 유소년 축구 교육의 명가! 쾌적하고 안전한 최고급 실내 스포츠 공간에서 체력을 기르고 협동심과 사회성을 배우는 강인한 슛팅스타 시흥점 공식 홈화면입니다.",
  openGraph: {
    title: "강인한 슛팅스타 시흥 배곧점 | 시흥 어린이 실내 축구교실",
    description: "시흥 배곧신도시 유소년 축구 교육의 명가! 쾌적하고 안전한 최고급 실내 스포츠 공간에서 체력을 기르고 협동심과 사회성을 배우는 강인한 슛팅스타 시흥점 공식 홈화면입니다.",
    images: ["https://www.groundcorporation.com/resource/image/logo.png"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}