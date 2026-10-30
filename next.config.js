/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Bundle local JSON seed data into serverless functions (Vercel)
    outputFileTracingIncludes: { '/**': ['./data/**/*'] },
  },
  webpack: (config) => {
    // Support Three.js
    config.externals = config.externals ?? [];
    return config;
  },
};

module.exports = nextConfig;
