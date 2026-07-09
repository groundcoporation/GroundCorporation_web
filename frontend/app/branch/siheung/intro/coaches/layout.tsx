import { Metadata } from "next";

export const metadata: Metadata = {
  title: "유소년 전문 스포츠 강사진 | 강인한 슛팅스타 시흥 배곧점 코치소개",
  description: "아이들의 개별 운동 능력을 세심하게 분석하고 최상의 기량으로 끌어올리는 시흥 배곧점의 유소년 축구 지도사 및 엘리트 코치진 프로필을 공개합니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
