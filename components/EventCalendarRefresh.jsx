"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Refresh an already-open calendar when its next event ends, without polling.
export default function EventCalendarRefresh({ endsAt }) {
  const router = useRouter();
  useEffect(() => {
    const end = Date.parse(endsAt);
    if (!Number.isFinite(end)) return;
    let timer, refreshed = false;
    function check() {
      if (Date.now() < end) {
        timer = setTimeout(check, Math.min(end - Date.now() + 100, 2147483647));
      } else if (!refreshed) {
        refreshed = true;
        router.refresh();
      }
    }
    function catchUp() {
      if (document.visibilityState === "visible" && Date.now() >= end) check();
    }
    check();
    document.addEventListener("visibilitychange", catchUp);
    window.addEventListener("focus", catchUp);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", catchUp);
      window.removeEventListener("focus", catchUp);
    };
  }, [endsAt, router]);
  return null;
}
