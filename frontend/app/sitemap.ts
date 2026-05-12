import type { MetadataRoute } from 'next';

/**
 * [사이트맵 자동 생성 설정]
 * 이 함수는 배포 시 /sitemap.xml 페이지를 자동으로 생성합니다.
 * 네이버나 구글 같은 검색 엔진 로봇이 이 파일을 읽어 사이트의 모든 구조를 파악합니다.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 실제 서비스되는 도메인 주소
  const baseUrl = 'https://www.groundcorporation.com';

  return [
    {
      url: baseUrl, // 메인 페이지
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1, // 가장 높은 중요도
    },
    {
      url: `${baseUrl}/branch/siheung/main/`, // 시흥점
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/branch/yeongjong/main/`, // 영종점
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    /**
     * 나중에 새로운 지점이 추가되면 아래와 같은 형식으로 계속 추가해 주시면 됩니다.
     * {
     *   url: `${baseUrl}/branch/new-location/main/`,
     *   lastModified: new Date(),
     *   changeFrequency: 'monthly',
     *   priority: 0.8,
     * },
     */
  ];
}