import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'photos.zillowstatic.com',
      },
      {
        protocol: 'https',
        hostname: '**.realtor.com',
      },
      {
        protocol: 'https',
        hostname: 'scontent.**.fbcdn.net',
      },
    ],
  },
};

export default nextConfig;
