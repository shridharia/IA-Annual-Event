// Renders brand icons from SVG → PNG with sharp. Run: npm run icons
import sharp from "sharp";
const INK = "#0A0B10", BONE = "#F1ECE2", COBALT = "#264CD7", FLARE = "#FF6A3D";
// Two monoliths ("11") with a lit doorway between them.
const mark = (size, pad) => {
  const s = size, h = s * (1 - pad * 2), w = h * 0.2, gap = h * 0.16, total = w * 2 + gap;
  const x0 = (s - total) / 2, y0 = (s - h) / 2;
  return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${w * 0.08}" fill="${BONE}"/>
    <rect x="${x0 + w + gap}" y="${y0}" width="${w}" height="${h}" rx="${w * 0.08}" fill="${BONE}"/>
    <rect x="${x0 + w + gap * 0.35}" y="${y0 + h * 0.06}" width="${gap * 0.3}" height="${h * 0.88}" fill="${FLARE}"/>`;
};
const icon = (s, pad, bg = true) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  ${bg ? `<rect width="${s}" height="${s}" fill="${INK}"/><circle cx="${s * 0.5}" cy="${s * 1.05}" r="${s * 0.6}" fill="${COBALT}" opacity=".55"/>` : ""}${mark(s, pad)}</svg>`;
const out = (name, svg, size) => sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/${name}`);
await out("icon-192.png", icon(512, 0.22), 192);
await out("icon-512.png", icon(512, 0.22), 512);
await out("icon-maskable-512.png", icon(512, 0.3), 512); // extra safe-zone padding for maskable
await out("apple-touch-icon.png", icon(512, 0.22), 180);
await out("badge-96.png", `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><g fill="#fff"><rect x="26" y="16" width="16" height="64" rx="2"/><rect x="54" y="16" width="16" height="64" rx="2"/></g></svg>`, 96);
await sharp(Buffer.from(icon(512, 0.2))).resize(48, 48).png().toFile("public/favicon.png");
console.log("icons done");
