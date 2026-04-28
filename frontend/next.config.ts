/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // 이 줄을 추가하세요!
  images: {
    unoptimized: true, // GitHub Pages는 이미지 최적화를 지원하지 않으므로 설정 필요
  },
};

module.exports = nextConfig;
