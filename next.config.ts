import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typedRoutes: true,
  serverActions: {
    bodySizeLimit: '10mb',
  },
};

export default nextConfig;
