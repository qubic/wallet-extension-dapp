import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/wallet-extension-dapp",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
