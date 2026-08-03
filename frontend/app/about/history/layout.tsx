import { Metadata } from "next";

export const metadata: Metadata = {
  title: "그라운드코퍼레이션 성장 히스토리 | 연혁",
  description: "스포츠 인프라의 새로운 지평을 열어온 그라운드코퍼레이션의 혁신 가득한 발자취와 주요 성과를 소개합니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
