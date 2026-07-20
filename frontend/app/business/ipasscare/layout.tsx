import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "아이패스케어 (IPASSCARE) - 스포츠 학원 안심 등하원 & 실시간 케어 솔루션",
  description:
    "그라운드코퍼레이션의 스포츠 학원 전용 스마트 관리 어플 아이패스케어(IPASSCARE). 실시간 안심 등하원 알림, 고정밀 GPS 셔틀 라이브 위치 관제, 맞춤 케어 리포트 및 스마트 결제 제공. 구글 플레이스토어 및 앱스토어에서 다운로드 가능.",
  keywords: [
    "아이패스케어",
    "IPASSCARE",
    "ipasscare",
    "아이패스케어 앱",
    "아이패스케어 어플",
    "아이패스케어 다운로드",
    "그라운드코퍼레이션",
    "스포츠 학원 관리 앱",
    "등하원 안심 알림",
    "학원 셔틀버스 위치관제",
    "유소년 축구 학원 앱",
  ],
  alternates: {
    canonical: "https://www.groundcorporation.com/business/ipasscare/",
  },
  openGraph: {
    type: "website",
    url: "https://www.groundcorporation.com/business/ipasscare/",
    title: "아이패스케어 (IPASSCARE) | 스포츠 학원 안심 케어 솔루션 어플",
    description:
      "실시간 안심 등하원 알림 & 고정밀 셔틀 라이브 위치관제 어플 아이패스케어. 지금 구글 플레이스토어와 앱스토어에서 다운로드하세요.",
    siteName: "그라운드코퍼레이션",
    images: [
      {
        url: "https://www.groundcorporation.com/resource/image/logo.png",
        width: 1200,
        height: 630,
        alt: "아이패스케어 IPASSCARE 어플 로고",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "아이패스케어 (IPASSCARE) | 스포츠 학원 안심 케어 어플",
    description:
      "스포츠 시설 전용 통합 관리 플랫폼 IPASSCARE. 실시간 등하원 및 셔틀 관제 어플.",
    images: ["https://www.groundcorporation.com/resource/image/logo.png"],
  },
  other: {
    "al:android:url":
      "https://play.google.com/store/apps/details?id=com.goundcorp.ipasscare",
    "al:android:app_name": "아이패스케어",
    "al:android:package": "com.goundcorp.ipasscare",
    "al:ios:url":
      "https://apps.apple.com/kr/app/아이패스케어-ipasscare/id6785789500",
    "al:ios:app_store_id": "6785789500",
    "al:ios:app_name": "아이패스케어 (IPASSCARE)",
  },
};

export default function IPassCareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 네이버 & 구글 전용 SoftwareApplication Schema.org JSON-LD 스키마
  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "아이패스케어",
    "alternateName": ["IPASSCARE", "ipasscare", "아이패스케어 어플", "아이패스케어 앱"],
    "operatingSystem": "ANDROID, IOS",
    "applicationCategory": "EducationalApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "KRW"
    },
    "author": {
      "@type": "Organization",
      "name": "그라운드코퍼레이션",
      "url": "https://www.groundcorporation.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "그라운드코퍼레이션",
      "url": "https://www.groundcorporation.com"
    },
    "installUrl": [
      "https://play.google.com/store/apps/details?id=com.goundcorp.ipasscare",
      "https://apps.apple.com/kr/app/아이패스케어-ipasscare/id6785789500"
    ],
    "downloadUrl": "https://play.google.com/store/apps/details?id=com.goundcorp.ipasscare",
    "featureList": "실시간 안심 등하원 알림, 고정밀 GPS 라이브 셔틀 위치 관제, 실시간 케어 리포트, 비대면 스마트 결제",
    "description": "스포츠 시설 및 학원 운영 전용 스마트 케어 플랫폼. 학부모 안심 등하원 및 라이브 셔틀 위치관제를 제공하는 아이패스케어 공식 어플리케이션입니다."
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />
      {children}
    </>
  );
}
