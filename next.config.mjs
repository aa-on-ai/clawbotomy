/** @type {import('next').NextConfig} */
const upgradeInsecureRequests = process.env.NODE_ENV === 'production' ? '; upgrade-insecure-requests' : '';
const developmentEval = process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'";

const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: {
    '/api/bench/**': ['./bench/prompts/**/*'],
  },
  async redirects() {
    return [
      { source: '/lab/:path*', destination: '/cabinet', permanent: true },
      { source: '/routing', destination: '/cabinet', permanent: true },
      { source: '/trust', destination: '/about', permanent: true },
    ];
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: `default-src 'self'; script-src 'self' 'unsafe-inline'${developmentEval}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'${upgradeInsecureRequests}`,
        },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
      ],
    }];
  },
};

export default nextConfig;
