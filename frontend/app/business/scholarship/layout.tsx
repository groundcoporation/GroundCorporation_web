import { Metadata } from "next";

export const metadata: Metadata = {
  title: "미래 스포츠 인재 육성 | 그라운드코퍼레이션 장학사업",
  description: "스포츠 꿈나무들의 멈추지 않는 도전을 응원하고, 건강한 스포츠 성장을 적극 지원하는 그라운드코퍼레이션 사회공헌 장학사업을 소개합니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
