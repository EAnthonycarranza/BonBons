/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /quote became the cart-rental page; old links and bookmarks still land.
  async redirects() {
    return [{ source: "/quote", destination: "/rent-a-cart", permanent: true }];
  },
  images: {
    qualities: [75, 90],
    remotePatterns: [{ protocol: "https", hostname: "slerrjoiowaskmvgykxt.supabase.co", pathname: "/storage/v1/object/public/menu-photos/**" }],
  },
  outputFileTracingIncludes: {
    "/api/orders": ["./assets/logo-embed-tp.png", "./assets/email-*.png"],
    "/api/admin/email": ["./assets/logo-embed-tp.png", "./assets/email-*.png"],
  },
};

export default nextConfig;
