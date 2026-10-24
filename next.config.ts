import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Vercel maneja el build automáticamente, no necesitamos "standalone"
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Permite que el panel de preview acceda a los recursos /_next/*
  allowedDevOrigins: [
    "https://preview-chat-33b01503-823a-4261-a23e-8d57244c30e2.space-z.ai",
    "*.space-z.ai",
  ],
};

export default nextConfig;
