import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    
    return [
      {
        source: "/t/:slug/api/:path*",
        destination: `${apiUrl}/t/:slug/api/:path*`,
      },
      {
        source: "/t/:slug/portal/:path*",
        destination: `${apiUrl}/t/:slug/portal/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
