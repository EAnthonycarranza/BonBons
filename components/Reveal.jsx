"use client";
import { useEffect } from "react";

/** First paint stays readable; only offscreen sections wait for a scroll reveal. */
export default function Reveal() {
  useEffect(() => {
    const main = document.getElementById("main");
    if (!main) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pending = new Set();
    let io, mutations;
    const visitTargets = (node, visit) => {
      if (node.nodeType !== 1) return;
      if (node.matches(".rv-anim")) visit(node);
      node.querySelectorAll(".rv-anim").forEach(visit);
    };
    const release = (el) => {
      if (el.dataset.reveal === "pending") delete el.dataset.reveal;
      pending.delete(el);
    };
    const stop = () => {
      mutations?.disconnect();
      io?.disconnect();
      pending.forEach(release);
    };
    const enter = (el, delay) => {
      pending.delete(el);
      if (delay !== undefined) el.style.setProperty("--reveal-delay", `${delay}ms`);
      el.dataset.reveal = "entered";
      el.classList.add("in");
    };
    const start = () => {
      stop();
      if (preference.matches || !("IntersectionObserver" in window)) return;
      io = new IntersectionObserver((entries) => {
        const groups = new Map();
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting || target.classList.contains("in")) return;
          const group = target.parentElement;
          const index = groups.get(group) || 0;
          groups.set(group, index + 1);
          enter(target, Math.min(index * 60, 180));
          io.unobserve(target);
        });
      }, { rootMargin: "0px 0px 64px 0px", threshold: 0 });
      const observe = (el) => {
        if (el.classList.contains("in")) return;
        // Do not replay an entrance after server-rendered content is already onscreen.
        if (el.getBoundingClientRect().top < window.innerHeight) {
          enter(el);
          return;
        }
        el.dataset.reveal = "pending";
        pending.add(el);
        io.observe(el);
      };
      visitTargets(main, observe);
      mutations = "MutationObserver" in window ? new MutationObserver((records) => {
        records.forEach(({ removedNodes, addedNodes }) => {
          removedNodes.forEach((node) => visitTargets(node, (el) => {
            io.unobserve(el);
            release(el);
          }));
          addedNodes.forEach((node) => visitTargets(node, observe));
        });
      }) : null;
      mutations?.observe(main, { childList: true, subtree: true });
    };
    start();
    preference.addEventListener("change", start);
    return () => {
      preference.removeEventListener("change", start);
      stop();
    };
  }, []);

  return null;
}
