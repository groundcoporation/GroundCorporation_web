import { Metadata } from "next";

export const metadata: Metadata = {
  title: "연령별 맞춤 클래스 일정 | 강인한 슛팅스타 영종점 시간표",
  description: "유치부, 초등부, 주말 취미반부터 엘리트 심화반까지! 연령별 및 학년별 맞춤형 훈련이 구성된 강인한 슛팅스타 영종점의 공식 주간 시간표와 일정을 안내합니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
