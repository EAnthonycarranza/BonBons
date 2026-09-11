/**
 * Renders the payment marks to PNG for the emails.
 *
 * Email clients will not draw inline SVG - Gmail strips it and Outlook ignores
 * it - so the marks that ship as vectors on the website have to be raster
 * images attached to the message, the same way the logo and social icons are.
 *
 * The paths are read out of components/PaymentMarks.jsx rather than copied, so
 * the email can never end up showing a different logo from the site.
 *
 *   node scripts/build-payment-email-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "components", "PaymentMarks.jsx");
const OUT = path.join(ROOT, "assets");

// Displayed at this height in the email; rendered at 2x so it stays sharp on
// the retina screens most people read mail on.
const DISPLAY_HEIGHT = 28;
const SCALE = 2;

const source = readFileSync(SOURCE, "utf8");

function readMark(name) {
  const block = source.slice(source.indexOf(`  ${name}: {`));
  const grab = (key, re) => {
    const match = block.slice(0, 4000).match(re);
    if (!match) throw new Error(`Could not read ${key} for ${name} from PaymentMarks.jsx`);
    return match[1];
  };
  return {
    hex: grab("hex", /hex:\s*"([^"]+)"/),
    box: JSON.parse(grab("box", /box:\s*(\[[^\]]+\])/)),
    wordmark: /wordmark:\s*true/.test(block.slice(0, 900)),
    d: grab("d", /d:\s*"([^"]+)"/),
  };
}

// Mirrors the geometry in PaymentMarks.jsx: square glyphs sit at 70% of the
// tile, the wordmark is set by height so its tile grows sideways.
const SQUARE_INSET = 0.7;
const WORDMARK_HEIGHT = 0.44;
const WORDMARK_PADDING = 8;

function svgFor(mark) {
  const size = 24;
  const [x, y, w, h] = mark.box;
  const scale = mark.wordmark
    ? (size * WORDMARK_HEIGHT) / h
    : (size * SQUARE_INSET) / Math.max(w, h);
  const width = mark.wordmark ? Math.round(w * scale + WORDMARK_PADDING * 2) : size;
  const tx = (width - w * scale) / 2 - x * scale;
  const ty = (size - h * scale) / 2 - y * scale;

  return {
    width,
    height: size,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${size}" viewBox="0 0 ${width} ${size}">
  <rect width="${width}" height="${size}" rx="6" fill="${mark.hex}"/>
  <g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})"><path d="${mark.d}" fill="#ffffff"/></g>
</svg>`,
  };
}

const sizes = {};
for (const name of ["venmo", "cashapp", "zelle"]) {
  const mark = readMark(name);
  const { width, height, svg } = svgFor(mark);
  const outWidth = Math.round((width / height) * DISPLAY_HEIGHT);
  const png = await sharp(Buffer.from(svg))
    .resize({ width: outWidth * SCALE, height: DISPLAY_HEIGHT * SCALE, fit: "fill" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const file = path.join(OUT, `email-${name}.png`);
  writeFileSync(file, png);
  sizes[name] = { width: outWidth, height: DISPLAY_HEIGHT, bytes: png.length };
  console.log(`  ✓ email-${name}.png  ${outWidth}x${DISPLAY_HEIGHT} (@${SCALE}x)  ${(png.length / 1024).toFixed(1)} KB`);
}

writeFileSync(path.join(OUT, "email-payment-sizes.json"), `${JSON.stringify(sizes, null, 2)}\n`);
console.log("\nDisplay sizes written to assets/email-payment-sizes.json");
