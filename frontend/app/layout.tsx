import type { Metadata } from "next";
import AOSInit from "./aos-init"; // 애니메이션(AOS) 엔진 불러오기
import "./globals.css"; // Tailwind CSS 및 전역 스타일

// =====================================================================
// [핵심 SEO 및 오픈 그래프 설정]
// 네이버/구글 검색 엔진 최적화 및 카카오톡 미리보기 설정
// =====================================================================
export const metadata: Metadata = {
  metadataBase: new URL("https://www.groundcorporation.com"),

  // 1. 브라우저 탭 이름 & 검색 엔진 기본 제목
  title: {
    default: "그라운드코퍼레이션 (Ground Corporation) | 공식 홈페이지",
    template: "%s | 그라운드코퍼레이션",
  },
  
  // 2. 검색 엔진(네이버, 구글)에서 제목 아래에 뜨는 기본 설명글
  description: "그라운드코퍼레이션 공식 웹사이트. 스포츠 학원 안심 케어 어플 '아이패스케어(IPASSCARE)', 유소년 축구교실 '강인한 슛팅스타', V.O.G SPORTS, 선수 매니지먼트 및 장학 사업 제공.",

  // 3. 검색 키워드 (네이버 및 구글 수집용)
  keywords: [
    "그라운드코퍼레이션",
    "Ground Corporation",
    "groundcorporation",
    "아이패스케어",
    "IPASSCARE",
    "ipasscare",
    "아이패스케어 앱",
    "강인한 슛팅스타",
    "VOG SPORTS",
    "스포츠 학원 관리 앱",
    "등하원 안심 알림",
    "학원 셔틀버스 위치관제",
    "스포츠 매니지먼트",
    "유소년 축구교실",
  ],

  // 4. 대표 URL (Canonical 태그) - 네이버 중복색인 방지 및 표준 URL 설정
  alternates: {
    canonical: "https://www.groundcorporation.com",
  },

  // 5. 오픈 그래프(Open Graph): 카카오톡, 페이스북, 네이버 블로그 등 공유 카드 설정
  openGraph: {
    type: "website",
    url: "https://www.groundcorporation.com",
    title: "그라운드코퍼레이션 (Ground Corporation) | 공식 홈페이지",
    description: "그라운드코퍼레이션 공식 웹사이트. 스포츠 학원 안심 케어 어플 '아이패스케어(IPASSCARE)', 유소년 축구교실 '강인한 슛팅스타', 스포츠 콘텐츠 및 솔루션 제공.",
    siteName: "그라운드코퍼레이션",
    locale: "ko_KR",
    images: [
      {
        url: "https://www.groundcorporation.com/resource/image/logo.png",
        width: 1200,
        height: 630,
        alt: "그라운드코퍼레이션 공식 로고",
      },
    ],
  },

  // 6. 트위터(X) 공유용 카드 설정
  twitter: {
    card: "summary_large_image",
    title: "그라운드코퍼레이션 (Ground Corporation) | 공식 홈페이지",
    description: "그라운드코퍼레이션 공식 웹사이트. 스포츠 학원 안심 관리 어플 '아이패스케어(IPASSCARE)' 및 스포츠 전문 솔루션 제공.",
    images: ["https://www.groundcorporation.com/resource/image/logo.png"],
  },

  // 7. 네이버 서치어드바이저 사이트 소유권 확인 키
  verification: {
    other: {
      "naver-site-verification": "043c6d332d798b713e9475152413b73d89e20e67",
    },
  },

  // 8. 검색 로봇 허용 설정
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Schema.org JSON-LD 구조화 데이터 (네이버 & 구글 공식 기업 식별 및 연관검색 데이터)
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.groundcorporation.com/#organization",
        "name": "그라운드코퍼레이션",
        "alternateName": [
          "Ground Corporation",
          "groundcorporation",
          "아이패스케어",
          "IPASSCARE"
        ],
        "url": "https://www.groundcorporation.com",
        "logo": "https://www.groundcorporation.com/resource/image/logo.png",
        "sameAs": [
          "https://play.google.com/store/apps/details?id=com.goundcorp.ipasscare",
          "https://apps.apple.com/kr/app/아이패스케어-ipasscare/id6785789500"
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://www.groundcorporation.com/#website",
        "url": "https://www.groundcorporation.com",
        "name": "그라운드코퍼레이션",
        "alternateName": "Ground Corporation",
        "publisher": {
          "@id": "https://www.groundcorporation.com/#organization"
        },
        "inLanguage": "ko-KR"
      }
    ]
  };

  return (
    <html lang="ko">
      <head>
        {/* 폰트어썸 등 외부 링크 */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
        />
        {/* 네이버 & 구글용 Schema.org JSON-LD 구조화 데이터 주입 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {/* 클라이언트 컴포넌트(AOS 애니메이션) 실행 */}
        <AOSInit />
        {children}
      </body>
    </html>
  );
}