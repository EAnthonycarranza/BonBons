"use client";
import { useState } from "react";
import { DELIVERY_ZIPS } from "@/lib/sample-data";

export default function ZipChecker() {
  const [value, setValue] = useState("");
  const [result, setResult] = useState(null); // {ok:boolean, msg:string}

  function check(e) {
    e.preventDefault();
    const v = value.trim();
    if (!/^\d{5}$/.test(v)) {
      setResult({ ok: false, msg: "Please enter a 5-digit ZIP code." });
      return;
    }
    setResult(
      DELIVERY_ZIPS.includes(v)
        ? { ok: true, msg: `Good news — we deliver to ${v}. Free over $75.` }
        : { ok: false, msg: `We don't reach ${v} yet — but pickup is always available, and it's worth asking.` }
    );
  }

  return (
    <div className="zip">
      <h3>Do you deliver to me?</h3>
      <p>Enter your ZIP code to check our delivery area.</p>
      <form onSubmit={check}>
        <label className="sr-only" htmlFor="zipInput">ZIP code</label>
        <input
          id="zipInput"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          placeholder="e.g. 78209"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="btn btn-gold btn-sm" type="submit">Check</button>
      </form>
      {result && (
        <div className={`zip-result show ${result.ok ? "yes" : "no"}`} role="status">{result.msg}</div>
      )}
    </div>
  );
}
