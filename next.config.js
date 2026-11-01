/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Bundle local JSON seed data into serverless functions (Vercel)
    outputFileTracingIncludes: { '/**': ['./data/**/*'] },
  },
  async redirects() {
    return [
      // Redirect root and all Hebrew paths to /en/twin
      {
        source: '/he',
        destination: '/en/twin',
        permanent: false,
      },
      {
        source: '/he/twin',
        destination: '/en/twin',
        permanent: false,
      },
    ];
  },
  webpack: (config) => {
    // Support Three.js
    config.externals = config.externals ?? [];
    return config;
  },
};

module.exports = nextConfig;
