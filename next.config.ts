import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  typedRoutes: true,
  serverActions: {
    bodySizeLimit: '10mb',
  },
};

export default nextConfig;
