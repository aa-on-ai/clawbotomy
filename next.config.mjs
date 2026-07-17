/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      '/api/bench/**': ['./bench/prompts/**/*'],
    },
  },
};

export default nextConfig;
