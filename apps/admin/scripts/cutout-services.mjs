import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const OUT = "d:/NAJIK_MARKETPLACE/apps/mobile/assets/hero";
const TMP = "d:/NAJIK_MARKETPLACE/apps/admin/scripts/.tmp";
const GEN = "C:/Users/Dell/.cursor/projects/d-NAJIK-MARKETPLACE/assets";

const SOURCES = {
  office: `${GEN}/hero-office.png`,
  car: `${GEN}/hero-car.png`,
  tools: `${GEN}/hero-tools.png`,
  shop: `${GEN}/hero-shop.png`,
};

/** Matches house.png: 1.35 wide canvas with the subject flush to the bottom. */
const ASPECT = 1.35;
const TARGET_W = 900;

function idx(x, y, w) {
  return (y * w + x) * 4;
}

/** Clear the sky: bright bluish pixels reachable from the top edge. */
function cutSky(data, w, h) {
  const isSky = (i) => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Blue-only: anything neutral-bright is subject (white cars, pale walls), never sky.
    return b >= r + 18 && b >= g + 8 && (r + g + b) / 3 > 60;
  };
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) {
    if (isSky(idx(x, 0, w))) {
      seen[x] = 1;
      stack.push(x, 0);
    }
  }
  let cleared = 0;
  const step = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (seen[p] || !isSky(idx(x, y, w))) return;
    seen[p] = 1;
    stack.push(x, y);
  };
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    data[idx(x, y, w) + 3] = 0;
    cleared++;
    step(x + 1, y);
    step(x - 1, y);
    step(x, y + 1);
    step(x, y - 1);
  }
  return cleared / (w * h);
}

function alphaBox(data, w, h) {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[idx(x, y, w) + 3] > 12) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

await mkdir(TMP, { recursive: true });

for (const [name, file] of Object.entries(SOURCES)) {
  const { data, info } = await sharp(file).resize({ width: 1100 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const share = cutSky(data, info.width, info.height);
  const box = alphaBox(data, info.width, info.height);
  if (!box) {
    console.log(`${name}: nothing left, skipping`);
    continue;
  }

  const subject = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract(box)
    .png()
    .toBuffer();

  const canvasW = Math.max(box.width, Math.round(box.height * ASPECT));
  const canvasH = Math.round(canvasW / ASPECT);
  const padded = await sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: subject, left: Math.round((canvasW - box.width) / 2), top: canvasH - box.height }])
    .png()
    .toBuffer();

  await sharp(padded).resize({ width: TARGET_W }).png({ compressionLevel: 9 }).toFile(path.join(OUT, `${name}.png`));

  const preview = await sharp({
    create: { width: 600, height: Math.round(600 / ASPECT), channels: 4, background: { r: 0, g: 78, b: 56, alpha: 1 } },
  })
    .composite([
      {
        input: await sharp(padded)
          .resize({ width: 600, height: Math.round(600 / ASPECT), fit: "inside" })
          .toBuffer(),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
  await writeFile(path.join(TMP, `${name}-preview.png`), preview);

  console.log(`${name}: sky ${(share * 100).toFixed(1)}% -> ${box.width}x${box.height}`);
}
