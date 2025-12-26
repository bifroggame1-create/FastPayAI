/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/products/:path*',
        destination: 'http://localhost:3001/products/:path*',
      },
      {
        source: '/users/:path*',
        destination: 'http://localhost:3001/users/:path*',
      },
      {
        source: '/orders/:path*',
        destination: 'http://localhost:3001/orders/:path*',
      },
      {
        source: '/promo/:path*',
        destination: 'http://localhost:3001/promo/:path*',
      },
      {
        source: '/payment/:path*',
        destination: 'http://localhost:3001/payment/:path*',
      },
    ]
  },
}

module.exports = nextConfig
