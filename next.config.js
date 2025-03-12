/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Configuración simplificada sin optimizeCss
  experimental: {
    // Mantener solo las opciones necesarias
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Actualizamos la configuración de imágenes para usar remotePatterns
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  // Ignorar errores de ESLint y TypeScript durante la compilación
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig

