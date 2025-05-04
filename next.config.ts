import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ["i.imgur.com"],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      got: false,
      'csv-parse': false,
      'csv-stringify': false
    }
    return config;
  }
  
};

export default nextConfig;
