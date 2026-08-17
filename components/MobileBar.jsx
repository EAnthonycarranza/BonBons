import Link from "next/link";

export default function MobileBar() {
  return (
    <div className="mbar">
      <Link className="btn btn-ghost" href="/shop">Shop</Link>
      <Link className="btn btn-pink" href="/quote">Get a Quote</Link>
    </div>
  );
}
