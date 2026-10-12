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
    "/api/internal/order-notifications": ["./assets/logo-embed-tp.png"],
    "/api/admin/orders/[id]/notification": ["./assets/logo-embed-tp.png"],
    "/api/orders": ["./assets/logo-embed-tp.png", "./assets/email-*.png"],
    "/api/admin/email": ["./assets/logo-embed-tp.png", "./assets/email-*.png"],
    "/api/subscribe": ["./assets/logo-embed-tp.png"],
    "/api/admin/events/emails/[id]/send": ["./assets/logo-embed-tp.png"],
  },
};

export default nextConfig;
