import { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.groundcorporation.com";

  // 검색 엔진에 등록되어야 할 주요 공개 페이지 경로들입니다. (로그인 등은 제외)
  const routes = [
    "", // 메인 페이지
    "/about/greeting/",
    "/about/history/",
    "/about/organization/",
    "/business/scholarship/",
    "/business/ipasscare/",
    "/business/agency/",
    "/branch/yeongjong/main/",
    "/branch/yeongjong/intro/branch/",
    "/branch/yeongjong/intro/coaches/",
    "/branch/yeongjong/reservation/",
    "/branch/yeongjong/schedule/",
    "/branch/yeongjong/booking/",
    "/branch/siheung/main/",
    "/branch/siheung/intro/branch/",
    "/branch/siheung/intro/coaches/",
    "/branch/siheung/reservation/",
    "/branch/siheung/schedule/",
    "/branch/siheung/booking/",
  ];

  return routes.map((route) => {
    const isMain = route === "";
    const isIPassCare = route === "/business/ipasscare/";
    
    return {
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: isMain || isIPassCare ? "daily" : "weekly",
      priority: isMain || isIPassCare ? 1.0 : 0.8,
    };
  });
}
