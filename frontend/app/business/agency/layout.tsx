import { Metadata } from "next";

export const metadata: Metadata = {
  title: "글로벌 스포츠 매니지먼트 및 에이전시 | 그라운드코퍼레이션",
  description: "프로 구단 입단 기회 부여, 구단 이적, 미디어 홍보 및 브랜딩까지 전문 에이전시의 노하우와 압도적인 글로벌 인프라로 선수 맞춤형 성공 컨설팅을 제공합니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
