import { Metadata } from "next";

export const metadata: Metadata = {
  title: "유치부 및 초등부 맞춤 시간표 | 강인한 슛팅스타 시흥 배곧점",
  description: "기초 취미반부터 연령별 체계적인 커리큘럼 일정까지! 매월 업데이트되는 강인한 슛팅스타 시흥 배곧점의 정규 클래스별 훈련 배치표와 스케줄 정보입니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
