/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  reactStrictMode: true,
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    return [
      {
        source: '/api/products/:path*',
        destination: `${apiUrl}/products/:path*`,
      },
      {
        source: '/api/users/:path*',
        destination: `${apiUrl}/users/:path*`,
      },
      {
        source: '/api/orders/:path*',
        destination: `${apiUrl}/orders/:path*`,
      },
      {
        source: '/api/promo/:path*',
        destination: `${apiUrl}/promo/:path*`,
      },
      {
        source: '/api/payment/:path*',
        destination: `${apiUrl}/payment/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
