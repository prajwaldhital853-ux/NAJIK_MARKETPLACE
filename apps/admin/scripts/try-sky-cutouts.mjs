import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const TMP = "d:/NAJIK_MARKETPLACE/apps/admin/scripts/.tmp";

const CANDIDATES = {
  office: ["1486406146926-c627a92ad1ab", "1554469384-e58fac16e23a", "1464082354059-27db6ce50048"],
  car: ["1568605114967-8130f3a36994", "1502877338535-766e1452684a", "1494976388531-d1058494cdd8"],
  tools: ["1416879595882-3373a0480b5b", "1581094794329-c8112a89af12", "1503387762-abdf1167b7bf"],
  shop: ["1441986300917-64674bd600d8", "1604719312566-8912e9227c6a", "1567449303078-57ad995bd17f"],
};

function idx(x, y, w) {
  return (y * w + x) * 4;
}

/** Clear sky: bright / bluish pixels connected to the top edge. */
function cutSky(data, w, h) {
  const isSky = (i) => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const bright = (r + g + b) / 3 > 150;
    const bluish = b >= r - 6 && b >= g - 12;
    return bright && bluish;
  };
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) {
    const i = idx(x, 0, w);
    if (isSky(i)) {
      seen[x] = 1;
      stack.push(x, 0);
    }
  }
  let cleared = 0;
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    const i = idx(x, y, w);
    data[i + 3] = 0;
    cleared++;
    const step = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
      const p = ny * w + nx;
      if (seen[p]) return;
      if (!isSky(idx(nx, ny, w))) return;
      seen[p] = 1;
      stack.push(nx, ny);
    };
    step(x + 1, y);
    step(x - 1, y);
    step(x, y + 1);
    step(x, y - 1);
  }
  return cleared / (w * h);
}

await mkdir(TMP, { recursive: true });

for (const [sector, ids] of Object.entries(CANDIDATES)) {
  for (let n = 0; n < ids.length; n++) {
    const url = `https://images.unsplash.com/photo-${ids[n]}?w=1000&q=85`;
    let buf;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.log(`${sector}${n}: http ${res.status}`);
        continue;
      }
      buf = Buffer.from(await res.arrayBuffer());
    } catch (err) {
      console.log(`${sector}${n}: ${err.message}`);
      continue;
    }

    const { data, info } = await sharp(buf).resize({ width: 700 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const share = cutSky(data, info.width, info.height);
    const cut = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
    const preview = await sharp({
      create: { width: info.width, height: info.height, channels: 4, background: { r: 0, g: 78, b: 56, alpha: 1 } },
    })
      .composite([{ input: cut, left: 0, top: 0 }])
      .png()
      .toBuffer();
    await writeFile(path.join(TMP, `try-${sector}${n}.png`), preview);
    console.log(`${sector}${n} (${ids[n]}): sky ${(share * 100).toFixed(1)}%`);
  }
}
