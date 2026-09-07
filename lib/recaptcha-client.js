export const RECAPTCHA_SITE_KEY = String(process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY || "").trim();

export function hasRecaptchaClientConfig() {
  return Boolean(RECAPTCHA_SITE_KEY);
}
