import type { Metadata } from "next";
import AOSInit from "./aos-init"; // 애니메이션(AOS) 엔진 불러오기
import "./globals.css"; // Tailwind CSS 및 전역 스타일

// =====================================================================
// [핵심 SEO 및 오픈 그래프 설정]
// 카카오톡 미리보기, 네이버/구글 검색 결과에 뜨는 정보는 모두 여기서 관리합니다.
// 나중에 텍스트나 이미지를 바꿀 때는 이 안의 내용만 수정하시면 됩니다!
// =====================================================================
export const metadata: Metadata = {
  // 1. 브라우저 탭 이름 & 검색 엔진 기본 제목
  title: "그라운드코퍼레이션 | 공식 홈페이지",
  
  // 2. 검색 엔진(네이버, 구글)에서 제목 아래에 뜨는 기본 설명글
  description: "혁신적인 스포츠 솔루션을 제공하는 그라운드코퍼레이션의 공식 웹사이트입니다.",

  // 3. 오픈 그래프(Open Graph): 카카오톡, 슬랙, 페이스북 등에 링크 공유 시 뜨는 미리보기 카드 설정
  openGraph: {
    type: "website",
    url: "https://www.groundcorporation.com",
    
    // 👉 카톡 공유 시 굵은 글씨로 나오는 '제목'입니다.
    title: "그라운드코퍼레이션 | 공식 홈페이지",
    
    // 👉 카톡 공유 시 제목 아래에 나오는 '회색 설명글'입니다. (바꾸고 싶으면 여기를 수정!)
    description: "혁신적인 스포츠 솔루션을 제공하는 그라운드코퍼레이션의 공식 웹사이트입니다.",
    siteName: "그라운드코퍼레이션",
    
    // 👉 카톡 공유 시 나타나는 '로고 이미지' 설정입니다.
    images: [
      {
        // 파일 이름이나 경로가 바뀌면 아래 url 주소만 똑같이 바꿔주시면 됩니다.
        url: "https://www.groundcorporation.com/resource/image/logo.png",
        width: 1200,  // 권장 가로 사이즈
        height: 630,  // 권장 세로 사이즈
        alt: "그라운드코퍼레이션 공식 로고", // 시각장애인용 읽기 도구나 엑스박스 뜰 때 나오는 대체 텍스트
      },
    ],
  },

  // 4. 트위터(X) 공유용 카드 설정 (오픈 그래프와 동일하게 맞춰줍니다)
  twitter: {
    card: "summary_large_image",
    title: "그라운드코퍼레이션 | 공식 홈페이지",
    description: "혁신적인 스포츠 솔루션을 제공하는 그라운드코퍼레이션의 공식 웹사이트입니다.",
    images: ["https://www.groundcorporation.com/resource/image/logo.png"],
    // @ts-ignore (Next.js 타입 버그 우회용)
    domain: "그라운드코퍼레이션", 
  },

  // 5. 네이버 서치어드바이저 사이트 소유권 확인 키 (건드리지 마세요!)
  verification: {
    other: {
      "naver-site-verification": "ae097be7b20202252666741b4564a783c1506cc0",
    },
  },

  // 6. 검색 로봇 긁어가기 허용 (index: 검색 노출 허용, follow: 사이트 내 링크 타기 허용)
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* 폰트어썸 등 외부 링크는 여기에 그대로 둡니다 */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
        />
      </head>
      <body>
        {/* 분리해둔 클라이언트 컴포넌트(AOS 애니메이션)를 여기서 실행합니다 */}
        <AOSInit />
        {children}
      </body>
    </html>
  );
}