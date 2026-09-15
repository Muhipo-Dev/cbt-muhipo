import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Optimasi Performa & Ringan */
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // Mengizinkan semua origin dinamis (semua IP lokal, semua domain tunnel, localhost, dsb)
  allowedDevOrigins: [
    '*',
    '*.razagopo.my.id',
    'cbt-muhipo.razagopo.my.id',
    '*.ngrok-free.app',
    '*.loca.lt',
    '*.trycloudflare.com',
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        '*',
        '*.razagopo.my.id',
        'cbt-muhipo.razagopo.my.id',
        '*.ngrok-free.app',
        '*.loca.lt',
        '*.trycloudflare.com',
      ],
    },
  },
  // Izinkan akses host eksternal / tunnel
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
