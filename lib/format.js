export function money(n) {
  const v = Math.round(Number(n) * 100) / 100;
  return "$" + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || "").trim());
}

export function isPhone(v) {
  return String(v || "").replace(/\D/g, "").length >= 10;
}
