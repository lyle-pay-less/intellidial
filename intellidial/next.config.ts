import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// Load doctor project .env (parent folder) — use __dirname so resolution stays in intellidial
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    });
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Keep module resolution in this package (fixes "resolve tailwindcss in C:\code\doctor")
  experimental: {
    serverComponentsExternalPackages: [],
  },
  webpack: (config, { isServer }) => {
    config.resolve.modules = [path.join(__dirname, "node_modules"), "node_modules"];
    return config;
  },
};

export default nextConfig;
