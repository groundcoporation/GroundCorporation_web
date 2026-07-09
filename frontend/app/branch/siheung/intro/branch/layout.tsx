import { Metadata } from "next";

export const metadata: Metadata = {
  title: "친환경 실내 잔디 구장 시설 | 강인한 슛팅스타 시흥 배곧점 지점소개",
  description: "미세먼지 걱정 없이 안전하고 마음껏 뛰어노는 쾌적한 실내 스포츠 센터! 시흥 배곧신도시 어린이들을 위한 친환경 스포츠 놀이터와 시설 인프라를 자세히 소개합니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
