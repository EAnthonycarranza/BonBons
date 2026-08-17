const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://bonbons.example.com";

export default function robots() {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/cart"] },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
