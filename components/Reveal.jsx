"use client";
import { useEffect } from "react";

/**
 * Adds the scroll-reveal behaviour to elements marked `.rv-anim`.
 *
 * Content is visible by default; entering the viewport only starts a finite
 * animation. This component lives in the persistent root layout, so watch for
 * new route content (including streamed sections), not just the initial page.
 */
export default function Reveal() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const main = document.getElementById("main");
    if (!main || reduce || !("IntersectionObserver" in window)) return;

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
    const visitTargets = (node, visit) => {
      if (node.nodeType !== 1) return;
      if (node.matches(".rv-anim")) visit(node);
      node.querySelectorAll(".rv-anim").forEach(visit);
    };
    const observe = (el) => {
      if (!el.classList.contains("in")) io.observe(el);
    };
    visitTargets(main, observe);

    const mutations = "MutationObserver" in window ? new MutationObserver((records) => {
      records.forEach(({ removedNodes, addedNodes }) => {
        removedNodes.forEach((node) => visitTargets(node, (el) => io.unobserve(el)));
        addedNodes.forEach((node) => visitTargets(node, observe));
      });
    }) : null;
    mutations?.observe(main, { childList: true, subtree: true });

    return () => {
      mutations?.disconnect();
      io.disconnect();
    };
  }, []);

  return null;
}
