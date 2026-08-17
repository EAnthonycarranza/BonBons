export function money(n) {
  const v = Math.round(Number(n) * 100) / 100;
  return "$" + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || "").trim());
}

/** Strip the Mongoose document wrapper so results can cross the server/client boundary. */
export function plain(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  o._id = o._id ? String(o._id) : undefined;
  delete o.__v;
  if (o.createdAt) o.createdAt = String(o.createdAt);
  if (o.updatedAt) o.updatedAt = String(o.updatedAt);
  return o;
}
