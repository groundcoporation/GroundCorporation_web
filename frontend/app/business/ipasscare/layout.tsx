import { Metadata } from "next";

export const metadata: Metadata = {
  title: "아이패스케어 (IPASSCARE) | 실시간 안심 등하원 및 학원 차량 관제",
  description: "아이가 안전한 스포츠 교실의 필수 솔루션! GPS 셔틀버스 실시간 이동 경로 확인, 등하원 안심 알림, 학원비 비대면 수납까지 한 번에 케어하는 스마트 안심 앱 서비스.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
