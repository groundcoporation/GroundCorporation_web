/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // 저장소 이름이 GroundCoropration_web 이 맞는지 꼭 확인!
  basePath: "",
  assetPrefix: "",
  trailingSlash: true,
};

module.exports = nextConfig;
