import { Metadata } from "next";

export const metadata: Metadata = {
  title: "엘리트 출신 전문 지도자 | 강인한 슛팅스타 영종점 코치소개",
  description: "체계적인 아동 발달 맞춤 축구 훈련을 제공하는 영종점 대표 강사진! 아이들의 바른 인성과 신체 성장을 책임질 전문 코치진 프로필을 확인하세요.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
