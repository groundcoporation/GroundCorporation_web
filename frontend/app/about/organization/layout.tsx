import { Metadata } from "next";

export const metadata: Metadata = {
  title: "프로페셔널 팀 소개 | 그라운드코퍼레이션 조직도",
  description: "체계적인 스포츠 매니지먼트와 혁신적 IT 기술력을 결합한 그라운드코퍼레이션의 핵심 부서와 프로페셔널한 인재 구조를 소개합니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
