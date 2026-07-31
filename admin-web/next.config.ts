import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image uploads (up to 5MB per backend/src/uploads/image-upload.options.ts)
  // go through a Server Action's FormData; the default 1MB body limit would
  // reject them.
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;
