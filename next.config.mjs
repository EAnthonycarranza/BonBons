/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "slerrjoiowaskmvgykxt.supabase.co", pathname: "/storage/v1/object/public/menu-photos/**" }],
  },
  outputFileTracingIncludes: {
    "/api/orders": ["./assets/logo-embed-tp.png", "./assets/email-*.png"],
    "/api/admin/email": ["./assets/logo-embed-tp.png", "./assets/email-*.png"],
  },
};

export default nextConfig;
