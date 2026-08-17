"use client";
import { useEffect } from "react";

/**
 * Adds the scroll-reveal behaviour to elements marked `.rv-anim`.
 *
 * The hiding CSS is scoped to `html.reveal-ready`, which is only added here —
 * so if this never runs, content stays visible instead of being stuck at
 * opacity 0. The timeout and visibilitychange handler cover the case where the
 * observer is paused (a background tab) and would otherwise never fire.
 */
export default function Reveal() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = Array.from(document.querySelectorAll(".rv-anim"));
    if (!targets.length) return;

    const revealAll = () => targets.forEach((el) => el.classList.add("in"));

    if (reduce || !("IntersectionObserver" in window)) {
      revealAll();
      return;
    }

    document.documentElement.classList.add("reveal-ready");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -60px 0px", threshold: 0.08 }
    );
    targets.forEach((el) => io.observe(el));

    const safety = setTimeout(revealAll, 3000);
    const onVisible = () => { if (!document.hidden) setTimeout(revealAll, 400); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(safety);
      document.removeEventListener("visibilitychange", onVisible);
      io.disconnect();
      document.documentElement.classList.remove("reveal-ready");
    };
  }, []);

  return null;
}
