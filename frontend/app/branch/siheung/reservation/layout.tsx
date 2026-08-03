import { Metadata } from "next";

export const metadata: Metadata = {
  title: "수강 신청 및 입단 무료 체험 예약 | 강인한 슛팅스타 시흥 배곧점",
  description: "시흥 배곧신도시 유아/초등 축구교실 수강 상담 신청 및 수업 무료 참관 예약! 우리 아이의 숨은 운동 세포를 깨워줄 체험 레슨을 예약하세요.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
