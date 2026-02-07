import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// Load .env and .env.local from repo root (doctor/) so service account / Firebase Admin vars are available
// In Cloud Run, environment variables come from Secret Manager (set in Cloud Run config)
const rootDir = path.resolve(__dirname, "..");
for (const name of [".env", ".env.local"]) {
  const envPath = path.join(rootDir, name);
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf8")
      .split("\n")
      .forEach((line) => {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) process.env[m[1].trim()] = m[2].trim();
      });
  }
}

const nextConfig: NextConfig = {
  // Hide the dev overlay "N" button in bottom-left (only in dev)
  devIndicators: false,
  // Keep module resolution in this package (fixes "resolve tailwindcss in C:\code\doctor")
  serverExternalPackages: [],
  // Enable standalone output for Docker
  output: 'standalone',
  webpack: (config, { isServer }) => {
    config.resolve.modules = [path.join(__dirname, "node_modules"), "node_modules"];
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.join(__dirname, "src"),
    };
    return config;
  },
};

export default nextConfig;
