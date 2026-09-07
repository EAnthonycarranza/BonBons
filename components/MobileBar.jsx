"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileBar() {
  const pathname = usePathname();
  if (["/cart", "/build-a-box", "/admin"].includes(pathname)) return null;
  return (
    <div className="mbar">
      <Link className="btn btn-ghost" href="/shop">
        $4 Singles
      </Link>
      <Link className="btn btn-pink" href="/build-a-box">
        4 for $10
      </Link>
    </div>
  );
}
