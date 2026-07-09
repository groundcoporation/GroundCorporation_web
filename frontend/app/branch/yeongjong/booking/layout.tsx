import { Metadata } from "next";

export const metadata: Metadata = {
  title: "정규 수업 수강권 신청 및 결제 | 강인한 슛팅스타 영종점 예약",
  description: "강인한 슛팅스타 영종점의 베이직 기초 훈련반, 스카이 엘리트반, 마스터 클래스 1:1 수강권을 장바구니에 담아 바로 신속하게 예약 및 신청하실 수 있습니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
