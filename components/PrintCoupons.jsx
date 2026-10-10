"use client";
export default function PrintCoupons({ ids, shared = false, copies = 1 }) {
  return <div className="coupon-print-actions">{shared ? <form method="get"><input type="hidden" name="ids" value={ids}/><label>Copies per shared code<input type="number" name="copies" min="1" max="200" step="1" defaultValue={copies}/></label><button type="submit">Update sheets</button><small>Single-use codes always print once.</small></form> : null}<button type="button" onClick={() => window.print()}>Print / save PDF</button></div>;
}
