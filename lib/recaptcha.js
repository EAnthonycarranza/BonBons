import "server-only";

const SITE_KEY = String(process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY || "").trim();
const PROJECT_ID = String(process.env.GOOGLE_CLOUD_PROJECT_ID || "").trim();
const API_KEY = String(process.env.GOOGLE_RECAPTCHA_API_KEY || "").trim();

export function hasRecaptchaServerConfig() {
  return Boolean(SITE_KEY && PROJECT_ID && API_KEY);
}

function minimumScore() {
  const configured = Number(process.env.RECAPTCHA_MIN_SCORE);
  if (!Number.isFinite(configured)) return 0.5;
  return Math.min(1, Math.max(0, configured));
}

function requestIp(request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "";
}

export async function verifyRecaptcha({ request, token, expectedAction }) {
  // Never accept an unverified order because a deployment is missing settings.
  if (!hasRecaptchaServerConfig()) {
    return { ok: false, configured: false, reason: "not-configured", unavailable: true };
  }

  if (typeof token !== "string" || !token.trim()) {
    return { ok: false, configured: true, reason: "missing-token" };
  }

  const event = {
    token: String(token),
    siteKey: SITE_KEY,
    expectedAction,
    userAgent: request.headers.get("user-agent") || "",
  };
  const ip = requestIp(request);
  if (ip) event.userIpAddress = ip;

  try {
    const response = await fetch(
      `https://recaptchaenterprise.googleapis.com/v1/projects/${encodeURIComponent(PROJECT_ID)}/assessments?key=${encodeURIComponent(API_KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ event }),
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }
    );
    const assessment = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("reCAPTCHA assessment request failed:", response.status, assessment.error?.status || "unknown");
      return { ok: false, configured: true, reason: "assessment-unavailable", unavailable: true };
    }

    const valid = assessment.tokenProperties?.valid === true;
    const actionMatches = assessment.tokenProperties?.action === expectedAction;
    const score = Number(assessment.riskAnalysis?.score);
    const scorePasses = Number.isFinite(score) && score >= minimumScore();

    return {
      ok: valid && actionMatches && scorePasses,
      configured: true,
      reason: !valid ? "invalid-token" : !actionMatches ? "action-mismatch" : !scorePasses ? "low-score" : "verified",
      score: Number.isFinite(score) ? score : null,
    };
  } catch (error) {
    console.error("reCAPTCHA assessment failed:", error.message);
    return { ok: false, configured: true, reason: "assessment-unavailable", unavailable: true };
  }
}
