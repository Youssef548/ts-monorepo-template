import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @app/ui ships raw TypeScript rather than a build output, so Next compiles it.
  transpilePackages: ['@app/ui'],
};

export default nextConfig;
