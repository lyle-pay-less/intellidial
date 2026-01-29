import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// Load doctor project .env (parent folder) — one .env for everything
const envPath = path.resolve(process.cwd(), "..", ".env");
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
};

export default nextConfig;
