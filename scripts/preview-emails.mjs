import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { buildOrderEmail, EMAIL_LOGO_CID, EMAIL_PAYMENT_CIDS, EMAIL_SOCIAL_CIDS } from "../lib/email-template.js";
import { pickupRequest, confirmedOrder } from "../tests/fixtures/email-record.mjs";

const logo = await readFile(new URL("../assets/logo-embed-tp.png", import.meta.url));
const output = new URL("../design-previews/emails/", import.meta.url);
await mkdir(output, { recursive: true });
for (const [name, record, emailType] of [
  ["request-received", pickupRequest, "request_received"],
  ["order-confirmed", confirmedOrder, "confirmation"],
  ["order-update", { ...confirmedOrder, status: "ready" }, "status_update"],
]) {
  const email = buildOrderEmail({ record, kind: "orders", emailType });
  let html = email.html.replace(`cid:${EMAIL_LOGO_CID}`, `data:image/png;base64,${logo.toString("base64")}`);
  // Socials and payment marks are attached by CID in a real send; inline them
  // so the preview shows what the customer sees.
  for (const [name, cid] of [...Object.entries(EMAIL_SOCIAL_CIDS), ...Object.entries(EMAIL_PAYMENT_CIDS)]) {
    const icon = await readFile(join(process.cwd(), "assets", `email-${name}.png`));
    html = html.replaceAll(`cid:${cid}`, `data:image/png;base64,${icon.toString("base64")}`);
  }
  await writeFile(new URL(`${name}.html`, output), html);
  console.log(`Built email preview: ${name}`);
}

await writeFile(new URL("index.html", output), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bon Bon's email previews</title><style>body{margin:0;background:#17111d;color:#fff7f0;font:14px Arial,sans-serif;padding:28px}h1{font-size:24px}p{color:#c7b6d0}a{color:#ff9bcc;margin-right:18px}.previews{display:flex;align-items:flex-start;gap:28px;flex-wrap:wrap;margin-top:24px}iframe{border:1px solid #51425a;border-radius:12px;max-width:100%}h2{font-size:14px;font-weight:400;color:#c7b6d0}</style></head><body><h1>Bon Bon's · Customer emails</h1><p>Preview only — fictional order details. The same receipt at desktop and mobile widths.</p><nav><a href="request-received.html">Request received</a><a href="order-confirmed.html">Order confirmed</a><a href="order-update.html">Status update</a></nav><div class="previews"><section><h2>Desktop · 800px</h2><iframe title="Desktop request receipt" src="request-received.html" width="600" height="1500"></iframe></section><section><h2>Mobile · 375px</h2><iframe title="Mobile request receipt" src="request-received.html" width="375" height="1750"></iframe></section></div></body></html>`);
