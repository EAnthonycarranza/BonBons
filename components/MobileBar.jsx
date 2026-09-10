"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrices } from "./PricesProvider";

export default function MobileBar() {
  const pathname = usePathname();
  const { singleLabel, packLabel } = usePrices();
  if (["/cart", "/build-a-box", "/box-of-the-week", "/admin"].includes(pathname)) return null;
  return (
    <div className="mbar">
      <Link className="btn btn-ghost" href="/shop">
        {singleLabel} Singles
      </Link>
      <Link className="btn btn-pink" href="/build-a-box">
        4 for {packLabel}
      </Link>
    </div>
  );
}
