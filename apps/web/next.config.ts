import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone builds for Docker deployment
  output: "standalone",
  
  // Experimental features
  experimental: {
    // Enable server components
    serverComponentsExternalPackages: ["pg"],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
