import type { NextConfig } from "next";

// No FormData/file-upload Server Actions in this app (unlike admin-web's
// image uploads), so the default body-size limit is fine as-is.
const nextConfig: NextConfig = {};

export default nextConfig;
