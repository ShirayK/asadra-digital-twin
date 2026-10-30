/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {},
  webpack: (config) => {
    // Support Three.js
    config.externals = config.externals ?? [];
    return config;
  },
};

module.exports = nextConfig;
