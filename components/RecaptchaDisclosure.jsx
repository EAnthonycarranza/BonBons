import { hasRecaptchaClientConfig } from "@/lib/recaptcha-client";

export default function RecaptchaDisclosure() {
  if (!hasRecaptchaClientConfig()) return null;
  return (
    <p className="recaptcha-disclosure">
      Protected by reCAPTCHA. Google&apos;s{" "}
      <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>
      {" "}and{" "}
      <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">Terms</a> apply.
    </p>
  );
}
