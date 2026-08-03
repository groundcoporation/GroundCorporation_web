import { Metadata } from "next";

export const metadata: Metadata = {
  title: "정규 수업 수강권 신청 및 결제 | 강인한 슛팅스타 시흥 배곧점 예약",
  description: "강인한 슛팅스타 시흥 배곧점 유치부 및 초등부, 취미/엘리트 패키지 수강권을 온라인에서 간편하게 예약 결제하고 신청하실 수 있습니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
