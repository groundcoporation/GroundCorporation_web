import { Metadata } from "next";

export const metadata: Metadata = {
  title: "대표 김강태의 비전과 인사말 | 그라운드코퍼레이션",
  description: "스포츠 산업의 세계화를 앞장서는 그라운드코퍼레이션 대표 김강태의 메시지입니다. 소속 선수와 파트너들의 꿈을 함께 이뤄내기 위한 도전과 혁신 스토리를 전합니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
