import { Metadata } from "next";

export const metadata: Metadata = {
  title: "무료 체험 수업 및 입단 문의 | 강인한 슛팅스타 영종점 예약",
  description: "체험 후 결정하는 안심 축구 교실! 강인한 슛팅스타 영종점의 수강 신청, 1회 무료 체험 수업 및 상담, 풋살장 대관 예약을 손쉽게 진행하실 수 있습니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
