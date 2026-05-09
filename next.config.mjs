/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['@prisma/client'] },
  images: { domains: ['avatars.githubusercontent.com'] },
}

export default nextConfig
