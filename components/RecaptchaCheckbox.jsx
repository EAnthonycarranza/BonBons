"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { RECAPTCHA_SITE_KEY } from "@/lib/recaptcha-client";
import { RECAPTCHA_ACTIONS } from "@/lib/recaptcha-actions";

export default function RecaptchaCheckbox({ onChange, resetKey, error }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [size, setSize] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    const container = containerRef.current;
    if (!RECAPTCHA_SITE_KEY || !container) return;

    // Use Google's compact layout when the form is narrower than its 304px widget.
    const measure = () => setSize(container.clientWidth < 304 ? "compact" : "normal");
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY || scriptReady) return;
    const timeout = window.setTimeout(() => setState("error"), 15000);
    return () => window.clearTimeout(timeout);
  }, [scriptReady]);

  useEffect(() => {
    if (!scriptReady || !size || !containerRef.current) return;
    const enterprise = window.grecaptcha?.enterprise;
    if (!enterprise) {
      setState("error");
      return;
    }

    let disposed = false;
    // A fresh host prevents duplicate widgets during Strict Mode or route remounts.
    const host = document.createElement("div");
    containerRef.current.appendChild(host);
    setState("loading");
    onChange("");

    enterprise.ready(() => {
      if (disposed) return;
      try {
        widgetRef.current = enterprise.render(host, {
          sitekey: RECAPTCHA_SITE_KEY,
          action: RECAPTCHA_ACTIONS.order,
          theme: "dark",
          size,
          callback: (token) => {
            if (disposed) return;
            setState("verified");
            onChange(token);
          },
          "expired-callback": () => {
            if (disposed) return;
            setState("expired");
            onChange("");
          },
          "error-callback": () => {
            if (disposed) return;
            setState("error");
            onChange("");
          },
        });
        setState("ready");
      } catch {
        setState("error");
        onChange("");
      }
    });

    return () => {
      disposed = true;
      if (widgetRef.current !== null) {
        enterprise.reset(widgetRef.current);
        widgetRef.current = null;
      }
      host.remove();
    };
  }, [scriptReady, size, onChange]);

  useEffect(() => {
    if (!resetKey || widgetRef.current === null) return;
    window.grecaptcha?.enterprise?.reset(widgetRef.current);
    setState("ready");
    onChange("");
  }, [resetKey, onChange]);

  const message = !RECAPTCHA_SITE_KEY
    ? "Verification is not available yet. Please contact the shop to request your order."
    : state === "error"
      ? "Verification could not load. Check your connection or content blocker, then refresh this page."
      : state === "expired"
        ? "Your verification expired. Please check the box again."
        : error;

  return (
    <div className="recaptcha-check" id="c-captcha" tabIndex={-1} aria-labelledby="c-captcha-label" aria-describedby={message ? "c-captcha-error" : undefined}>
      <p className="recaptcha-label" id="c-captcha-label">Security check <span aria-hidden="true">*</span></p>
      {RECAPTCHA_SITE_KEY && (
        <Script
          id="bonbons-recaptcha-enterprise"
          src="https://www.google.com/recaptcha/enterprise.js?render=explicit"
          strategy="afterInteractive"
          onReady={() => setScriptReady(true)}
          onError={() => { setState("error"); onChange(""); }}
        />
      )}
      <div ref={containerRef} className="recaptcha-widget" />
      {RECAPTCHA_SITE_KEY && state === "loading" && <p className="recaptcha-help" role="status">Loading security check…</p>}
      {message && <p className="recaptcha-error" id="c-captcha-error" role="alert">{message}</p>}
    </div>
  );
}
