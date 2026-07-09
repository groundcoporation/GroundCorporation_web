import { Metadata } from "next";

export const metadata: Metadata = {
  title: "프리미엄 풋살장 및 훈련 시설 | 강인한 슛팅스타 영종점 지점소개",
  description: "날씨 걱정 없이 365일 마음껏 뛰어노는 최첨단 실내외 풋살 구장! 안전 펜스와 최고급 친환경 인조잔디가 완비된 강인한 슛팅스타 영종점의 우수한 인프라를 안내합니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
