// Everything that would normally be an image file is drawn at load time:
// baked ground shadows/AO, the sign atlas, the fence mesh, soft blobs.
import * as THREE from './three.js';
import { SUN } from './config.js';

export const DISPLAY_FONT = '"Big Shoulders Display", "Arial Narrow", "Roboto Condensed", Impact, sans-serif';

// ---------------------------------------------------------------- shadows
function hull(points) {
  const P = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (P.length < 3) return P;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  up.pop(); lo.pop();
  return lo.concat(up);
}

function casterPoints(c) {
  const pts = [];
  if (c.t === 'box') {
    for (const x of [c.x0, c.x1]) for (const y of [c.y0, c.y1]) for (const z of [c.z0, c.z1]) pts.push([x, y, z]);
  } else if (c.t === 'gable') {
    for (const x of [c.x0, c.x1]) for (const y of [c.y0, c.y1]) for (const z of [c.z0, c.z1]) pts.push([x, y, z]);
    if (c.axis === 'x') { const zc = (c.z0 + c.z1) / 2; pts.push([c.x0, c.y1 + c.h, zc], [c.x1, c.y1 + c.h, zc]); }
    else { const xc = (c.x0 + c.x1) / 2; pts.push([xc, c.y1 + c.h, c.z0], [xc, c.y1 + c.h, c.z1]); }
  } else if (c.t === 'sphere') {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      for (const yy of [-0.55, 0, 0.55]) {
        const rr = c.r * Math.sqrt(1 - yy * yy);
        pts.push([c.x + Math.cos(a) * rr, c.y + yy * c.r * c.sy, c.z + Math.sin(a) * rr]);
      }
    }
    pts.push([c.x, c.y + c.r * c.sy, c.z], [c.x, c.y - c.r * c.sy, c.z]);
  } else if (c.t === 'pole') {
    const w = c.w / 2;
    for (const x of [c.x - w, c.x + w]) for (const y of [0, c.h]) for (const z of [c.z - w, c.z + w]) pts.push([x, y, z]);
  }
  return pts;
}

function boxBlur(src, dst, W, H, r) {
  // horizontal then vertical running-sum blur, written back into src
  const k = 1 / (2 * r + 1);
  for (let y = 0; y < H; y++) {
    let acc = 0;
    const row = y * W;
    for (let x = -r; x <= r; x++) acc += src[row + Math.min(W - 1, Math.max(0, x))];
    for (let x = 0; x < W; x++) {
      dst[row + x] = acc * k;
      acc += src[row + Math.min(W - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < W; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += dst[Math.min(H - 1, Math.max(0, y)) * W + x];
    for (let y = 0; y < H; y++) {
      src[y * W + x] = acc * k;
      acc += dst[Math.min(H - 1, y + r + 1) * W + x] - dst[Math.max(0, y - r) * W + x];
    }
  }
}

// Baked sun shadows and ambient occlusion for the town, Norrholmen (north of it) and Söderholmen
// (south, v1.6): 3.2 px/m.
export function makeShadowMap(layout, W = 1024, H = 2496, rect = { x0: -160, z0: -480, w: 320, h: 780 }) {
  const k = W / rect.w;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  const draw = (filter, color) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, W, H);
    g.fillStyle = color;
    for (const c of layout.casters) {
      if (!filter(c)) continue;
      const proj = casterPoints(c).map(([x, y, z]) => [(x - SUN.x * (y / SUN.y) - rect.x0) * k, (z - SUN.z * (y / SUN.y) - rect.z0) * k]);
      const h = hull(proj);
      if (h.length < 3) continue;
      g.beginPath();
      h.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z)));
      g.closePath();
      g.fill();
    }
    return g.getImageData(0, 0, W, H).data;
  };
  const n = W * H;
  const sh = new Float32Array(n), ao = new Float32Array(n), tmp = new Float32Array(n);
  let px = draw(() => true, '#000000');
  for (let i = 0; i < n; i++) sh[i] = px[i * 4];
  // ambient occlusion: footprints of things standing on the ground, heavily blurred
  px = draw((c) => (c.t === 'box' || c.t === 'gable') && c.y0 < 0.5 && c.y1 > 0.9, '#000000');
  for (let i = 0; i < n; i++) ao[i] = px[i * 4];
  // trees: small dark disc under the crown
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#5a5a5a';
  for (const c of layout.casters) {
    if (c.t !== 'sphere') continue;
    g.beginPath(); g.arc((c.x - rect.x0) * k, (c.z - rect.z0) * k, c.r * 0.9 * k, 0, Math.PI * 2); g.fill();
  }
  px = g.getImageData(0, 0, W, H).data;
  for (let i = 0; i < n; i++) ao[i] = Math.min(ao[i], px[i * 4]);
  boxBlur(sh, tmp, W, H, 1); boxBlur(sh, tmp, W, H, 1);
  boxBlur(ao, tmp, W, H, 4); boxBlur(ao, tmp, W, H, 3);
  const data = new Uint8Array(n * 2);
  for (let i = 0; i < n; i++) {
    data[i * 2] = sh[i];
    data[i * 2 + 1] = 255 - (255 - ao[i]) * 0.62;
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return { tex, data, W, H, rect };
}

// ---------------------------------------------------------------- sign atlas
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

function fitText(g, text, maxW, size, weight = 800) {
  let s = size;
  g.font = `${weight} ${s}px ${DISPLAY_FONT}`;
  while (g.measureText(text).width > maxW && s > 6) { s *= 0.94; g.font = `${weight} ${s}px ${DISPLAY_FONT}`; }
  return s;
}

const PAINTERS = {
  text(g, d, x, y, w, h) {
    g.fillStyle = d.bg || '#ffffff';
    g.fillRect(x, y, w, h);
    if (d.border) { g.strokeStyle = d.border; g.lineWidth = Math.max(3, h * 0.07); g.strokeRect(x + g.lineWidth / 2, y + g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth); }
    if (d.stripe) {
      // lighter band along the bottom edge
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fillRect(x, y + h * 0.84, w, h * 0.16);
    }
    const lines = d.lines || [];
    g.fillStyle = d.fg || '#111';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (lines.length === 1) {
      fitText(g, lines[0], w * 0.9, h * (d.font ? d.font * 1.25 : 0.7));
      g.fillText(lines[0], x + w / 2, y + h * 0.54);
    } else if (d.rows) {
      // (v1.11) a heading and a column of rows under it: the psalm board in the chapel
      const top = h * 0.24, n = lines.length - 1, rh = (h - top - h * 0.07) / n;
      fitText(g, lines[0], w * 0.8, h * 0.13);
      g.fillText(lines[0], x + w / 2, y + top * 0.6);
      g.fillStyle = 'rgba(255,255,255,0.08)';
      for (let i = 0; i < n; i++) g.fillRect(x + w * 0.12, y + top + rh * i + rh * 0.08, w * 0.76, rh * 0.84);
      g.fillStyle = d.fg || '#111';
      for (let i = 0; i < n; i++) { fitText(g, lines[i + 1], w * 0.7, rh * 0.74); g.fillText(lines[i + 1], x + w / 2, y + top + rh * (i + 0.53)); }
    } else if (lines.length >= 3) {
      // (v1.11) three lines: the first two as usual, a smaller third at the bottom (it used to be left out)
      fitText(g, lines[0], w * 0.9, h * (d.font ? d.font * 0.9 : 0.42));
      g.fillText(lines[0], x + w / 2, y + h * 0.3);
      fitText(g, lines[1], w * 0.88, h * 0.24, 700);
      g.fillText(lines[1], x + w / 2, y + h * 0.58);
      fitText(g, lines[2], w * 0.8, h * 0.18, 600);
      g.fillText(lines[2], x + w / 2, y + h * 0.81);
    } else {
      fitText(g, lines[0], w * 0.9, h * (d.font ? d.font * 1.05 : 0.5));
      g.fillText(lines[0], x + w / 2, y + h * 0.36);
      fitText(g, lines[1], w * 0.88, h * 0.27, 600);
      g.fillText(lines[1], x + w / 2, y + h * 0.76);
    }
  },
  flag(g, d, x, y, w, h) {
    g.fillStyle = '#006aa7'; g.fillRect(x, y, w, h);
    g.fillStyle = '#fecc02';
    const cx = d.mirror ? x + w - (w * 5) / 16 - (w * 2) / 16 : x + (w * 5) / 16;
    g.fillRect(cx, y, (w * 2) / 16, h);
    g.fillRect(x, y + (h * 4) / 10, w, (h * 2) / 10);
  },
  parking(g, d, x, y, w, h) {
    g.fillStyle = '#ffffff'; g.fillRect(x, y, w, h);
    g.fillStyle = '#1d5fa8'; roundRect(g, x + w * 0.06, y + h * 0.06, w * 0.88, h * 0.88, w * 0.08); g.fill();
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 ${h * 0.72}px ${DISPLAY_FONT}`; g.fillText('P', x + w / 2, y + h * 0.54);
  },
  bus(g, d, x, y, w, h) {
    g.fillStyle = '#f2c200'; g.fillRect(x, y, w, h);
    g.strokeStyle = '#2e7a46'; g.lineWidth = w * 0.08; g.strokeRect(x + w * 0.06, y + h * 0.06, w * 0.88, h * 0.88);
    g.fillStyle = '#2e7a46';
    roundRect(g, x + w * 0.24, y + h * 0.24, w * 0.52, h * 0.36, w * 0.05); g.fill();
    g.fillStyle = '#f2c200'; g.fillRect(x + w * 0.29, y + h * 0.29, w * 0.42, h * 0.12);
    g.fillStyle = '#2e7a46';
    g.beginPath(); g.arc(x + w * 0.34, y + h * 0.64, w * 0.06, 0, 7); g.arc(x + w * 0.66, y + h * 0.64, w * 0.06, 0, 7); g.fill();
    g.font = `800 ${h * 0.17}px ${DISPLAY_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('BUSS', x + w / 2, y + h * 0.82);
  },
  price(g, d, x, y, w, h) {
    g.fillStyle = '#1b1d21'; g.fillRect(x, y, w, h);
    g.fillStyle = '#d2342c'; g.fillRect(x, y, w, h * 0.24);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitText(g, 'MACKEN', w * 0.8, h * 0.18); g.fillText('MACKEN', x + w / 2, y + h * 0.125);
    const rows = [['95', '19,47'], ['DIESEL', '18,92'], ['TVÄTT', '200 KR']];
    rows.forEach(([a, b], i) => {
      const yy = y + h * (0.38 + i * 0.22);
      g.textAlign = 'left'; g.fillStyle = '#ffffff';
      g.font = `700 ${h * 0.12}px ${DISPLAY_FONT}`; g.fillText(a, x + w * 0.07, yy);
      g.textAlign = 'right'; g.fillStyle = '#ffcf3a';
      g.font = `800 ${h * 0.16}px ${DISPLAY_FONT}`; g.fillText(b, x + w * 0.93, yy);
    });
  },
  warning(g, d, x, y, w, h) {
    g.fillStyle = '#f5c400'; g.fillRect(x, y, w, h);
    g.strokeStyle = '#111'; g.lineWidth = h * 0.06; g.strokeRect(x + h * 0.06, y + h * 0.06, w - h * 0.12, h - h * 0.12);
    g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitText(g, d.lines[0], w * 0.84, h * 0.3); g.fillText(d.lines[0], x + w / 2, y + h * 0.38);
    if (d.lines[1]) { fitText(g, d.lines[1], w * 0.84, h * 0.2, 700); g.fillText(d.lines[1], x + w / 2, y + h * 0.68); }
  },
  // (v1.8) "A + G 1971" carved in an old oak stump in the park: bark, a heart cut in, the letters
  carving(g, d, x, y, w, h) {
    g.fillStyle = '#5d4330'; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(30,20,12,0.45)'; g.lineWidth = Math.max(1, w * 0.02);
    for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(x + (i + 0.5) * w / 7, y); g.lineTo(x + (i + 0.3) * w / 7, y + h); g.stroke(); }
    const cx = x + w / 2, cy = y + h * 0.5, s = w * 0.42;
    g.fillStyle = '#c49a6a';
    g.beginPath(); g.moveTo(cx, cy + s * 0.75);
    g.bezierCurveTo(cx - s * 1.2, cy - s * 0.1, cx - s * 0.55, cy - s * 0.95, cx, cy - s * 0.35);
    g.bezierCurveTo(cx + s * 0.55, cy - s * 0.95, cx + s * 1.2, cy - s * 0.1, cx, cy + s * 0.75); g.fill();
    g.fillStyle = '#3a2618'; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitText(g, 'A + G', s * 1.1, h * 0.19); g.fillText('A + G', cx, cy - s * 0.1);
    fitText(g, '1971', s * 0.98, h * 0.17, 800); g.fillText('1971', cx, cy + s * 0.3);   // (v1.11: bigger – it is a code now)
  },
  // (v1.14) the photo on the konditori's wall: Sjuby's bun championship, 1985. A faded print in a white
  // border – the banner, the judges' table, Arne in the middle holding the golden bun up high, Gun beside
  // him, young Bengt clapping, and Dahlgren at the far right edge with his arms crossed. A caption in ink.
  photo1985(g, d, x, y, w, h) {
    g.fillStyle = '#f4efe2'; g.fillRect(x, y, w, h);
    const px = x + w * 0.05, py = y + h * 0.06, pw = w * 0.9, ph = h * 0.74;
    const grd = g.createLinearGradient(0, py, 0, py + ph);
    grd.addColorStop(0, '#c9b48a'); grd.addColorStop(0.55, '#b39b70'); grd.addColorStop(1, '#8a7452');
    g.fillStyle = grd; g.fillRect(px, py, pw, ph);
    // the brick facade behind, and the banner
    g.fillStyle = 'rgba(110,70,45,0.35)';
    for (let r = 0; r < 6; r++) for (let c = 0; c < 14; c++) g.fillRect(px + (c + (r % 2) * 0.5) * pw / 14, py + r * ph * 0.07, pw / 14 - 2, ph * 0.07 - 2);
    g.fillStyle = '#efe4c8'; g.fillRect(px + pw * 0.14, py + ph * 0.05, pw * 0.72, ph * 0.13);
    g.fillStyle = '#6b4a2e'; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitText(g, 'SJUBYS BULLMÄSTERSKAP 1985', pw * 0.66, ph * 0.09, 800); g.fillText('SJUBYS BULLMÄSTERSKAP 1985', px + pw / 2, py + ph * 0.115);
    // the judges' table across the bottom
    g.fillStyle = '#e8dcc0'; g.fillRect(px, py + ph * 0.78, pw, ph * 0.22);
    g.fillStyle = 'rgba(80,55,35,0.4)'; g.fillRect(px, py + ph * 0.78, pw, ph * 0.025);
    // people: [x along the photo, height, body colour, head colour, hair colour, what they do]
    const person = (fx, hk, body, hair, pose) => {
      const cx = px + pw * fx, top = py + ph * (0.78 - 0.5 * hk), bw = pw * 0.1, hr = pw * 0.036;
      const sh = top + hr * 2.3, foot = py + ph * 0.78;
      // arms first (behind the body when they hang), in a darker shade, with a hand at the end
      const arm = (x1, y1) => {
        g.strokeStyle = 'rgba(40,28,18,0.55)'; g.lineWidth = bw * 0.36; g.lineCap = 'round';
        g.beginPath(); g.moveTo(cx + Math.sign(x1 - cx) * bw * 0.32, sh + hr * 0.3); g.lineTo(x1, y1); g.stroke();
        g.strokeStyle = body; g.lineWidth = bw * 0.26;
        g.beginPath(); g.moveTo(cx + Math.sign(x1 - cx) * bw * 0.32, sh + hr * 0.3); g.lineTo(x1, y1); g.stroke();
        g.fillStyle = '#e2c8a0'; g.beginPath(); g.arc(x1, y1, bw * 0.15, 0, 7); g.fill();
      };
      if (pose === 'up') { arm(cx - bw * 0.62, top - hr * 1.2); arm(cx + bw * 0.62, top - hr * 1.2); }
      g.fillStyle = body; roundRect(g, cx - bw / 2, top + hr * 1.7, bw, foot - (top + hr * 1.7), bw * 0.35); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(cx - bw / 2, top + hr * 1.7 + (foot - top) * 0.45, bw, 2);  // a belt
      g.fillStyle = '#e2c8a0'; g.beginPath(); g.arc(cx, top + hr, hr, 0, 7); g.fill();
      g.fillStyle = hair; g.beginPath(); g.arc(cx, top + hr * 0.8, hr * 1.04, Math.PI * 1.05, Math.PI * 1.95); g.fill();
      g.fillStyle = '#3a2a1a'; for (const s2 of [-1, 1]) { g.beginPath(); g.arc(cx + s2 * hr * 0.38, top + hr * 1.05, hr * 0.11, 0, 7); g.fill(); }
      if (pose === 'clap') { arm(cx - bw * 0.05, sh + hr * 1.2); arm(cx + bw * 0.05, sh + hr * 1.2); }
      else if (pose === 'cross') { arm(cx + bw * 0.42, sh + hr * 1.5); arm(cx - bw * 0.42, sh + hr * 1.5); g.strokeStyle = 'rgba(40,28,18,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - hr * 0.4, top + hr * 1.5); g.lineTo(cx + hr * 0.4, top + hr * 1.35); g.stroke(); } // (and a frown)
      else if (pose === 'up') { g.strokeStyle = 'rgba(40,28,18,0.6)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, top + hr * 1.3, hr * 0.35, 0.2, Math.PI - 0.2); g.stroke(); } // (a big smile)
      return { cx, top, hr };
    };
    person(0.12, 0.84, '#6e6a60', '#3a2c20', 'clap');
    person(0.27, 0.9, '#d8d2c2', '#4a3a2a', 'clap');                       // young Bengt in his baker's whites
    const gun = person(0.43, 0.82, '#9a7fb0', '#6b4a2a', 'clap');          // Gun, in a lilac dress
    const arne = person(0.55, 0.98, '#f2ede0', '#2a2018', 'up');           // Arne in his white jacket
    person(0.7, 0.86, '#5a6a7a', '#8a8a8a', 'clap');
    person(0.92, 0.95, '#3a3c41', '#5a5048', 'cross');                     // Dahlgren, sulking at the edge
    void gun;
    // the golden bun held up high on its wooden foot
    const tx = arne.cx, ty = arne.top - arne.hr * 1.4;
    g.fillStyle = '#5a3a22'; g.fillRect(tx - pw * 0.035, ty, pw * 0.07, ph * 0.05);
    g.fillStyle = '#e8c04a'; g.beginPath(); g.ellipse(tx, ty - ph * 0.015, pw * 0.045, ph * 0.04, 0, 0, 7); g.fill();
    g.strokeStyle = '#a07a1a'; g.lineWidth = 2; g.beginPath();
    for (let t = 0; t < 10; t += 0.2) { const r = (t / 10) * pw * 0.035; const qx = tx + Math.cos(t) * r, qy = ty - ph * 0.015 + Math.sin(t) * r * 0.85; t ? g.lineTo(qx, qy) : g.moveTo(qx, qy); }
    g.stroke();
    g.fillStyle = 'rgba(255,240,170,0.55)'; for (const [a, l] of [[-1.2, 0.09], [-0.6, 0.1], [-2.0, 0.09], [-2.6, 0.08]]) { g.save(); g.translate(tx, ty - ph * 0.02); g.rotate(a); g.fillRect(pw * 0.05, -1, pw * l, 2); g.restore(); }
    // age: a vignette and a few scratches
    const vg = g.createRadialGradient(px + pw / 2, py + ph / 2, ph * 0.2, px + pw / 2, py + ph / 2, pw * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(60,40,20,0.45)');
    g.fillStyle = vg; g.fillRect(px, py, pw, ph);
    g.strokeStyle = 'rgba(255,250,235,0.35)'; g.lineWidth = 1;
    for (const [a, b, c2, e] of [[0.2, 0.1, 0.25, 0.6], [0.8, 0.3, 0.76, 0.9], [0.6, 0.05, 0.62, 0.3]]) { g.beginPath(); g.moveTo(px + pw * a, py + ph * b); g.lineTo(px + pw * c2, py + ph * e); g.stroke(); }
    // the caption, in ink on the white border
    g.fillStyle = '#2a3a6a'; g.font = `italic 600 ${h * 0.09}px Georgia, serif`;
    g.fillText('Arne vinner! Sjuby, juni 1985', x + w / 2, y + h * 0.9);
  },
  // (v1.6) the arch over the tivoli gate on Söderholmen: the name in yellow with bulbs round it
  lyckoland(g, d, x, y, w, h) {
    g.fillStyle = '#1d2f6b'; g.fillRect(x, y, w, h);
    const n = Math.round(w / (h * 0.16));
    for (let i = 0; i < n; i++) {
      const bx = x + ((i + 0.5) * w) / n;
      for (const by of [y + h * 0.09, y + h * 0.91]) { g.fillStyle = i % 2 ? '#ffe08a' : '#ff7a5c'; g.beginPath(); g.arc(bx, by, h * 0.045, 0, 7); g.fill(); }
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    fitText(g, 'TIVOLI', w * 0.3, h * 0.2, 700); g.fillStyle = '#ffffff'; g.fillText('TIVOLI', x + w / 2, y + h * 0.29);
    fitText(g, 'LYCKOLAND', w * 0.86, h * 0.48);
    g.fillStyle = '#c0302a'; g.fillText('LYCKOLAND', x + w / 2 + h * 0.03, y + h * 0.65 + h * 0.03);
    g.fillStyle = '#ffd34d'; g.fillText('LYCKOLAND', x + w / 2, y + h * 0.65);
  },
  closed(g, d, x, y, w, h) {
    const n = 10;
    for (let i = 0; i < n; i++) {
      g.fillStyle = i % 2 ? '#ffffff' : '#d2342c';
      g.beginPath();
      g.moveTo(x + (i / n) * w, y); g.lineTo(x + ((i + 1) / n) * w, y);
      g.lineTo(x + ((i + 1) / n) * w - h * 0.4, y + h); g.lineTo(x + (i / n) * w - h * 0.4, y + h);
      g.closePath(); g.fill();
    }
    g.fillStyle = '#ffffff';
    roundRect(g, x + w * 0.16, y + h * 0.12, w * 0.68, h * 0.76, h * 0.08); g.fill();
    g.fillStyle = '#d2342c'; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitText(g, 'AVSTÄNGT', w * 0.6, h * 0.36); g.fillText('AVSTÄNGT', x + w / 2, y + h * 0.38);
    g.fillStyle = '#1d1f22';
    const sub = d.sub || 'Öppnar i nästa version';
    fitText(g, sub, w * 0.6, h * 0.2, 700); g.fillText(sub, x + w / 2, y + h * 0.68);
  },
  lasse(g, d, x, y, w, h) {
    g.fillStyle = '#1d1f22'; g.fillRect(x, y, w, h);
    g.strokeStyle = '#e5b923'; g.lineWidth = h * 0.05; g.strokeRect(x + h * 0.06, y + h * 0.06, w - h * 0.12, h - h * 0.12);
    // wrench icons
    const wrench = (cx, cy, s, rot) => {
      g.save(); g.translate(cx, cy); g.rotate(rot); g.fillStyle = '#e5b923';
      g.fillRect(-s * 0.09, -s * 0.42, s * 0.18, s * 0.84);
      g.beginPath(); g.arc(0, -s * 0.42, s * 0.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1d1f22'; g.fillRect(-s * 0.07, -s * 0.66, s * 0.14, s * 0.24);
      g.restore();
    };
    wrench(x + h * 0.55, y + h / 2, h * 0.75, 0.7);
    wrench(x + w - h * 0.55, y + h / 2, h * 0.75, -0.7);
    g.fillStyle = '#e5b923'; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitText(g, 'LASSES VERKSTAD', w - h * 2.4, h * 0.72);
    g.fillText('LASSES VERKSTAD', x + w / 2, y + h * 0.54);
  },
  pizzatak(g, d, x, y, w, h) {
    g.fillStyle = '#2e7a46'; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(x, y + h * 0.82, w, h * 0.18);
    // a slice of pizza
    const sx = x + h * 0.18, sy = y + h * 0.16, s = h * 0.7;
    g.fillStyle = '#e9b44c';
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + s, sy + s * 0.32); g.lineTo(sx + s * 0.3, sy + s); g.closePath(); g.fill();
    g.fillStyle = '#c0392b';
    for (const [a, b] of [[0.35, 0.3], [0.62, 0.42], [0.36, 0.62]]) { g.beginPath(); g.arc(sx + s * a, sy + s * b, s * 0.08, 0, 7); g.fill(); }
    g.fillStyle = '#fff6e0'; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitText(g, 'PIZZA', w - h * 1.3, h * 0.78, 900);
    g.fillText('PIZZA', x + h * 0.9 + (w - h * 0.9) / 2, y + h * 0.53);
  },
  bullbil(g, d, x, y, w, h) {
    g.fillStyle = '#f6ead2'; roundRect(g, x, y, w, h, h * 0.12); g.fill();
    g.strokeStyle = '#8a4b22'; g.lineWidth = h * 0.04; roundRect(g, x + h * 0.05, y + h * 0.05, w - h * 0.1, h - h * 0.1, h * 0.1); g.stroke();
    // cinnamon bun
    const cx = x + h * 0.55, cy = y + h * 0.5, R = h * 0.34;
    g.fillStyle = '#c0782f'; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#7a3f17'; g.lineWidth = h * 0.045; g.beginPath();
    for (let t = 0; t < 14; t += 0.1) { const r = (t / 14) * R * 0.92; const px = cx + Math.cos(t) * r, py = cy + Math.sin(t) * r; t ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.stroke();
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 9; i++) { const a = i * 0.7; g.fillRect(cx + Math.cos(a) * R * 0.6, cy + Math.sin(a) * R * 0.6, h * 0.03, h * 0.03); }
    g.fillStyle = '#b8261f'; g.textAlign = 'left'; g.textBaseline = 'middle';
    fitText(g, 'BULLBILEN', w - h * 1.25, h * 0.42);
    g.fillText('BULLBILEN', x + h * 1.05, y + h * 0.42);
    g.fillStyle = '#7a3f17';
    fitText(g, 'Nybakat varje dag', w - h * 1.25, h * 0.2, 600);
    g.fillText('Nybakat varje dag', x + h * 1.05, y + h * 0.74);
  },
};

export function makeSignAtlas(signs) {
  const W = 1024, H = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, W, H);
  const all = {
    ...signs, bullbil: { kind: 'bullbil', w: 2.2, h: 1.0 }, pizzatak: { kind: 'pizzatak', w: 2.6, h: 0.8 },
    konditori: { lines: ['SJUBY', 'Konditori · sedan 1952'], bg: '#f1e3c4', fg: '#7a4a26', border: '#7a4a26', w: 2.2, h: 1.0 }, // Arne's bike
    festbanner: { lines: ['BULLFESTEN'], bg: '#e58fa8', fg: '#ffffff', border: '#f6ead2', font: 0.62, w: 3.9, h: 0.7 }, // the bun party (v1.0)
    // (v1.14) the bun championship on the square: the judges' banner and the two name cards
    bmbanner: { lines: ['BULLMÄSTERSKAPET'], bg: '#f2c21b', fg: '#7a3f17', border: '#f6ead2', font: 0.6, w: 3.9, h: 0.7 },
    bmbengt: { lines: ['BAGAR-BENGT'], bg: '#f6ead2', fg: '#b8261f', font: 0.6, w: 0.9, h: 0.24 },
    bmdahl: { lines: ['DIREKTÖR DAHLGREN'], bg: '#f6ead2', fg: '#2b2e35', font: 0.6, w: 0.9, h: 0.24 },
  };
  // identical signs (both faces of a flag, the two MACKEN boards…) share one slot
  const byKey = new Map();
  for (const [id, d] of Object.entries(all)) {
    const key = JSON.stringify(d);
    if (!byKey.has(key)) {
      const ppm = Math.min(d.ppm || 72, 900 / d.w, 260 / d.h);   // ((v1.11) d.ppm: sharper, for a sign you read up close)
      byKey.set(key, { ids: [], d, pw: Math.ceil(d.w * ppm), ph: Math.ceil(d.h * ppm) });
    }
    byKey.get(key).ids.push(id);
  }
  const items = [...byKey.values()].sort((a, b) => b.ph - a.ph);
  const uv = {};
  let x = 2, y = 2, rowH = 0;
  for (const it of items) {
    if (x + it.pw + 2 > W) { x = 2; y += rowH + 4; rowH = 0; }
    if (y + it.ph + 2 > H) { console.warn('sign atlas full', it.ids[0]); break; }
    g.save();
    g.beginPath(); g.rect(x, y, it.pw, it.ph); g.clip();
    (PAINTERS[it.d.kind] || PAINTERS.text)(g, it.d, x, y, it.pw, it.ph);
    g.restore();
    const inset = 0.5;
    const r = [(x + inset) / W, 1 - (y + it.ph - inset) / H, (x + it.pw - inset) / W, 1 - (y + inset) / H];
    for (const id of it.ids) uv[id] = r;
    x += it.pw + 4;
    rowH = Math.max(rowH, it.ph);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return { tex, uv, canvas };
}

// ---------------------------------------------------------------- small textures
export function blobTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 4, 32, 32, 31);
  grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(0.55, 'rgba(0,0,0,0.75)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

export function fenceTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(200,205,210,1)'; g.lineWidth = 4;
  for (const v of [2, 34]) { g.beginPath(); g.moveTo(v, 0); g.lineTo(v, 64); g.stroke(); }
  g.lineWidth = 3;
  for (const v of [2, 34]) { g.beginPath(); g.moveTo(0, v); g.lineTo(64, v); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function softTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.5, 'rgba(255,255,255,0.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// tileable fractal value noise, sampled by the ground shaders instead of computing noise per pixel
export function noiseTexture(size = 128) {
  let seed = 1234567;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const octave = (cells) => {
    const v = new Float32Array(cells * cells);
    for (let i = 0; i < v.length; i++) v[i] = rnd();
    return (x, y) => {
      const fx = (x / size) * cells, fy = (y / size) * cells;
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      let tx = fx - x0, ty = fy - y0;
      tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      const at = (i, j) => v[((j + cells) % cells) * cells + ((i + cells) % cells)];
      const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
      return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
    };
  };
  const o = [octave(4), octave(8), octave(16), octave(32)];
  const w = [0.45, 0.28, 0.17, 0.1];
  const data = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let n = 0;
    for (let k = 0; k < 4; k++) n += o[k](x, y) * w[k];
    data[y * size + x] = Math.max(0, Math.min(255, Math.round(((n - 0.5) * 1.8 + 0.5) * 255)));
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
