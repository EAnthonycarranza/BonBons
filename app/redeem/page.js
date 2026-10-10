import Link from "next/link";
import CouponRedemption from "@/components/CouponRedemption";
import { normalizeCouponCode } from "@/lib/coupons";

export const metadata = { title: "Redeem a coupon", robots: { index: false, follow: false } };

export default async function RedeemPage({ searchParams }) {
  const params = await searchParams;
  let initialCode = "";
  try { if (params.code) initialCode = normalizeCouponCode(params.code); } catch {}
  return <div className="coupon-redeem-page">
    <p className="eyebrow">A little extra sweetness</p><h1>Your BonBon&apos;s coupon</h1>
    <div className="coupon-online-option"><h2>Ordering online?</h2><p>Add your treats to your cart and enter the printed code at checkout. Its use is recorded when your order request is saved.</p><Link href="/shop" className="btn btn-ghost">Shop treats</Link></div>
    <CouponRedemption initialCode={initialCode}/>
  </div>;
}
