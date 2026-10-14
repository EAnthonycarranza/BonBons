"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const NATIVE_SCROLL = ".drawer, .mobile-menu, [role='dialog'], [data-native-scroll], textarea, select, .pills, .treat-category-nav, .hto-stage";

/** Desktop wheel easing, with native touch, nested controls, and reduced motion. */
export default function SmoothScroll() {
  const pathname = usePathname();
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(hover: hover) and (pointer: fine)");
    let disposed = false, lenis, locks;
    const destroy = () => {
      locks?.disconnect();
      lenis?.destroy();
      locks = lenis = undefined;
    };
    const configure = async () => {
      if (disposed) return;
      if (reduced.matches || !desktop.matches) { destroy(); return; }
      if (lenis) return;
      const { default: Lenis } = await import("lenis");
      if (disposed || reduced.matches || !desktop.matches || lenis) return;
      lenis = new Lenis({
        autoRaf: true,
        lerp: 0.14,
        wheelMultiplier: 0.95,
        smoothWheel: true,
        syncTouch: false,
        respectReducedMotion: true,
        anchors: { duration: 0.9 },
        stopInertiaOnNavigate: true,
        prevent: (node) => node.matches(NATIVE_SCROLL),
        virtualScroll: ({ event }) => !event.shiftKey,
      });
      const syncLock = () => {
        if (!lenis) return;
        const locked = document.body.style.overflow === "hidden" ||
          document.body.classList.contains("mobile-nav-open");
        if (locked && !lenis.isStopped) lenis.stop();
        else if (!locked && lenis.isStopped) lenis.start();
      };
      locks = new MutationObserver(syncLock);
      locks.observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });
      syncLock();
    };
    // A failed enhancement leaves the browser's scrolling available.
    const update = () => { configure().catch(destroy); };
    reduced.addEventListener("change", update);
    desktop.addEventListener("change", update);
    update();
    return () => {
      disposed = true;
      reduced.removeEventListener("change", update);
      desktop.removeEventListener("change", update);
      destroy();
    };
  }, [pathname]);
  return null;
}
