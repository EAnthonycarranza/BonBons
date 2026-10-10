import Link from "next/link";
import Image from "next/image";
import { isAdmin } from "@/lib/auth";
import { callBonbonsAdmin } from "@/lib/supabase-data";
import { toCoupon, couponStatus } from "@/lib/coupons";
import { money } from "@/lib/format";
import { SITE } from "@/lib/sample-data";
import PrintCoupons from "@/components/PrintCoupons";
import "./print.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Print coupons", robots: { index: false, follow: false } };

function CouponCard({ coupon: c, website }) {
  const available = couponStatus(c) === "Available";
  return <article className="physical-coupon">
    <div className={`physical-coupon-design${c.discountAmount === 1 ? " with-artwork" : ""}`}>
      {c.discountAmount === 1 ? <Image className="physical-coupon-artwork" src="/coupons/one-dollar-off.png" alt="BonBon’s Sweets & More — Making Every Celebration Sweeter. $1 OFF Your Next Purchase! One coupon per customer. Not valid with any other offers." width={1536} height={1024} unoptimized priority/> : <div className="physical-coupon-standard"><Image src="/logo-transparent.png" alt="BonBon’s Sweets & More" width={100} height={100}/><h2>{money(c.discountAmount)} OFF</h2><p>Your Next Purchase!</p><small>One coupon per customer. No other offers.</small></div>}
      <div className="physical-coupon-code" aria-label={`Coupon code ${c.code}`}><span className={c.code.length > 24 ? "long-code" : ""}>{c.code}</span></div>
      {!available ? <div className="physical-coupon-unavailable">{couponStatus(c)} — do not distribute</div> : null}
    </div>
    <div className="physical-coupon-details"><p>Online checkout or redeem in person<br/><b>{website}/redeem</b><br/>Questions? {SITE.email}</p><p>{c.maxRedemptions === 1 ? "Single-use code" : `${c.maxRedemptions} uses total; 1 per customer`} · {c.expiresOn ? `Expires ${c.expiresOn}` : "No expiration"}{c.minimumSubtotal > 0 ? ` · ${money(c.minimumSubtotal)} minimum` : ""}<br/>One use per email per promotion. No cash value.</p></div>
    <i className="crop-corner top-left"/><i className="crop-corner top-right"/><i className="crop-corner bottom-left"/><i className="crop-corner bottom-right"/>
  </article>;
}

export default async function CouponPrintPage({ searchParams }) {
  if (!(await isAdmin())) return <div className="coupon-print-toolbar"><p>Sign in to the Shop Desk to print coupons.</p><Link href="/admin">Go to Shop Desk</Link></div>;
  const params = await searchParams;
  const website = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const ids = new Set(String(params.ids || "").split(",").filter(id => /^\d+$/.test(id)));
  let coupons = []; let error = "";
  try { coupons = (await callBonbonsAdmin("coupon_list")).filter(c => ids.has(String(c.id))).map(toCoupon); }
  catch { error = "Could not load coupons. Please return to the Shop Desk and try again."; }
  const requestedCopies = Number(params.copies || 1);
  const copies = Number.isInteger(requestedCopies) && requestedCopies >= 1 && requestedCopies <= 200 ? requestedCopies : 1;
  const printed = coupons.flatMap(c => Array.from({ length: c.maxRedemptions > 1 ? copies : 1 }, () => c));
  const sheets = Array.from({ length: Math.ceil(printed.length / 12) }, (_, i) => printed.slice(i * 12, i * 12 + 12));
  return <section className="coupon-print-page">
    <div className="coupon-print-toolbar"><div><h1>Print your coupons</h1><p>{printed.length} {printed.length === 1 ? "coupon" : "coupons"} · {sheets.length} {sheets.length === 1 ? "sheet" : "sheets"} · 3 across × 4 down</p><p>8 × 11-inch cardstock · Actual size / 100% · Background graphics on · Headers and footers off · Trim at the corner guides</p></div>{coupons.length ? <PrintCoupons ids={[...ids].join(",")} shared={coupons.some(c => c.maxRedemptions > 1)} copies={copies}/> : null}<Link href="/admin">Back to Shop Desk</Link></div>
    {error ? <p role="alert">{error}</p> : null}
    {!error && !coupons.length ? <p>Select coupons in the Shop Desk first.</p> : null}
    {coupons.some(c => couponStatus(c) !== "Available") ? <p className="coupon-print-warning">Some selected codes are unavailable. They are marked so you can remove them before handing out the sheet.</p> : null}
    <div className="coupon-sheets">{sheets.map((sheet, index) => <div className="coupon-print-sheet" key={index} aria-label={`Coupon sheet ${index + 1}`}>{sheet.map((c, cardIndex) => <CouponCard coupon={c} website={website} key={`${c.id}-${cardIndex}`}/>)}</div>)}</div>
  </section>;
}
