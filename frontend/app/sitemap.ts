import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  // 우리 사이트의 모든 주소 목록을 여기에 적습니다.
  return [
    {
      url: 'https://www.groundcorporation.com', // 메인 홈페이지
      lastModified: new Date(),
      changeFrequency: 'weekly', // 얼마나 자주 업데이트되는지 (주 단위)
      priority: 1, // 검색 엔진에게 알려주는 중요도 (1이 최고점)
    },
    {
      url: 'https://www.groundcorporation.com/branch/siheung/main', // 시흥점
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://www.groundcorporation.com/branch/yeongjong/main', // 영종점
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // 나중에 지점이 더 생기면 아래에 똑같은 형식으로 추가만 해주면 됩니다!
  ];
}