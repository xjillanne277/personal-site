/* Jillanne's world: top-down, walkable. Piece 1: map, movement, stops, bottom bar, minimap, tour. */
(() => {
const TS = 16, MW = 48, MH = 24;               // tile size, map size in tiles
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hr = new Date().getHours();
const AUTO = hr >= 20 || hr < 5 ? 'night' : hr < 7 ? 'dawn' : hr < 17 ? 'day' : 'dusk';
const TINTS = {day: null, dawn: 'rgba(255,170,140,.14)', dusk: 'rgba(130,55,95,.26)', night: 'rgba(14,22,60,.52)'};
let PHASE = AUTO, TINT = TINTS[PHASE];
function setPhase(p) { PHASE = p === 'auto' ? AUTO : p; TINT = TINTS[PHASE]; document.querySelectorAll('#tod button').forEach(b => b.setAttribute('aria-pressed', b.dataset.p === p)); }
const rnd = s => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/* ---------------- tiles ---------------- */
const T = {GRASS: 0, CAGRASS: 1, WATER: 2, ROAD: 3, BRIDGE: 4, SAND: 5, OCEAN: 6};
const tiles = new Uint8Array(MW * MH), block = new Uint8Array(MW * MH), nearRoad = new Uint8Array(MW * MH);
const idx = (x, y) => y * MW + x;
const riverX = () => 24;
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
  tiles[idx(x, y)] = x >= 23 && x <= 25 ? T.WATER : x < 23 ? T.GRASS : T.CAGRASS;
  if (x >= 46) tiles[idx(x, y)] = T.OCEAN; else if (x === 45) tiles[idx(x, y)] = T.SAND;
}
/* the path, in order: Ontario climbs to the river, California snakes down to home */
const PATH_ON = [[1.5, 20.6], [4.5, 20.6], [7, 20.4], [8.5, 17], [10.5, 16.6], [12.5, 16.4], [13.5, 13], [15.5, 12.6], [17, 12.4], [18.3, 8], [20.5, 7.6], [22.6, 7.6]];
const PATH_CA = [[26.4, 7.6], [29.5, 7.6], [33, 7.6], [37.5, 7.6], [43.5, 7.8], [44.3, 10], [44.3, 13.6], [42, 14.6], [36, 14.6], [30, 14.6], [27.2, 15.5], [26.7, 19], [27.6, 21.6], [31, 21.6], [36, 21.6], [41, 21.6]];
function markNear(pts) { for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) * 3); for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = Math.floor(x) + dx, Y = Math.floor(y) + dy; if (X >= 0 && Y >= 0 && X < MW && Y < MH) nearRoad[idx(X, Y)] = 1; } } } }
markNear(PATH_ON); markNear(PATH_CA);
for (let i = 0; i < MW * MH; i++) if (tiles[i] === T.OCEAN) block[i] = 1;

/* ---------------- landmarks ---------------- */
const RES = 'resume.pdf';
const L = [
  {id: 'waterloo', label: 'Waterloo', yr: '2022', tx: 2, ty: 16, w: 5, h: 4, spot: [4, 20], kind: 'school', tour: 1,
   card: {title: 'University of Waterloo', meta: 'Mechanical Engineering · started Fall 2022', mini: 'toy', proj: 'waterloo/toy', tabs: [['toy', 'ME100 · Wind-up toy', 'waterloo/toy'], ['cake', 'ME101 · FrostBot', 'waterloo']], blurb: ['Where it started: a wind-up soccer toy for ME100, then FrostBot, a cake-icing robot, for ME101.']}},
  {id: 'evercloak', label: 'Evercloak', yr: '2023', tx: 8, ty: 13, w: 4, h: 3, spot: [10, 16], kind: 'office', tour: 2,
   card: {title: 'Evercloak Inc.', meta: 'Mechanical Engineering Co-op · Kitchener · Winter 2023', mini: 'mem', blurb: ['My first co-op. I designed a prototype dehumidifier enclosure and tested membrane materials for it.']}},
  {id: 'valbruna', label: 'Valbruna', yr: '2023', tx: 13, ty: 8, w: 5, h: 4, spot: [15, 12], kind: 'factory', tour: 3,
   card: {title: 'Valbruna ASW', meta: 'Mechanical Engineering Co-op · Welland · Fall 2023', mini: 'steel', blurb: ['A steel mill in Welland. I modeled how scrap melts inside the electric arc furnace.']}},
  {id: 'geotab', label: 'Geotab', yr: '2024', tx: 18, ty: 4, w: 4, h: 3, spot: [20, 7], kind: 'office', tour: 4,
   card: {title: 'Geotab', meta: 'System Verification Intern · Oakville · Summer 2024', mini: 'dash', blurb: ['A summer of dashcams: I built a rack that kept them cool during testing, and my hackathon team placed 1st of 11.']}},
  {id: 'teslacells', label: 'Tesla Cells', yr: '2025', tx: 27, ty: 3, w: 5, h: 4, spot: [29, 7], kind: 'modern', tour: 5,
   card: {title: 'Tesla, Cell Equipment', meta: 'Mechanical Design Engineering Intern · Palo Alto · Winter 2025', mini: 'cell', blurb: ['Battery cell equipment in Palo Alto: a magnetic clamp for lamination and a foil-stretching machine.']}},
  {id: 'teslalight', label: 'Tesla Lighting', yr: '2025', tx: 35, ty: 3, w: 5, h: 4, spot: [37, 7], kind: 'modern', tour: 6,
   card: {title: 'Tesla, Lighting, Switches & Sensors', meta: 'Mechanical Design Engineering Intern · Fremont · Fall 2025', mini: 'led', proj: 'led', more: 'Read the LED controller story', blurb: ['I designed an interior cabin light, and built an RGBW LED controller for the lighting design studio. Try it.']}},
  {id: 'level', label: 'Level Home', yr: '2026', tx: 40, ty: 11, w: 4, h: 3, spot: [41, 14], kind: 'office', tour: 7,
   card: {title: 'Level Home', meta: 'Product Design Engineering Intern · Redwood City · Winter 2026', mini: 'lock', img: 'img/level-welcome.webp', imgAlt: 'Level welcome box with a hoodie, jacket and water bottle', photo: 'See my welcome box', blurb: ['Four months on smart locks, from a keypad test fixture to the sensor that knows whether the bolt is thrown.']}},
  {id: 'google', label: 'Google', yr: '2026', tx: 31, ty: 10, w: 5, h: 4, spot: [33, 14], kind: 'modern2', tour: 8,
   card: {title: 'Google, Pixel Hardware', meta: 'Product Design Engineering Intern · Mountain View · Summer 2026', mini: 'hat', img: 'img/google-welcome.webp', imgAlt: 'Google intern welcome box with a propeller hat that says Intern, a backpack and a water bottle', photo: 'See my welcome box', blurb: ['Pixel Watch hardware in Mountain View. My welcome box came with a propeller hat, so it has to spin.']}},
  {id: 'next', label: 'Your team?', yr: '2027', tx: 27, ty: 18, w: 4, h: 3, spot: [29, 21], kind: 'plot', tour: 9,
   card: {title: 'Reserved: Summer 2027', meta: 'The next stop on the road', body: ["I'm looking for a Summer 2027 mechanical or product design internship, ideally consumer electronics or robotics."], contact: true}},
  {id: 'cabin', label: 'Home', tx: 33, ty: 17, w: 5, h: 4, spot: [35, 21], kind: 'cabin',
   card: {title: 'Home', meta: 'The cabin', body: ['My room: the workbench, my PC, Moe, and the LED controller running the lights.']}},
  {id: 'mail', label: 'Contact', tx: 38, ty: 20, w: 1, h: 1, spot: [38, 21], kind: 'mail', nolabel: 1,
   card: 'contact'},
  {id: 'nsx', label: 'NSX', tx: 40, ty: 18, w: 2, h: 3, spot: [41, 21], kind: 'nsx', nolabel: 1,
   card: {title: 'Acura NSX', meta: 'Red, first generation, pop-up headlights', body: ['Click it and the headlights pop up.']}},
  {id: 'c5', label: 'C5', tx: 43, ty: 18, w: 2, h: 3, spot: [44, 21], kind: 'c5', nolabel: 1,
   card: {title: 'C5 Corvette', meta: 'Black, pop-up headlights', body: ['Click it and the headlights pop up.']}}
];

L.forEach(l => { if (l.kind === 'plot') return; for (let y = l.ty; y < l.ty + l.h; y++) for (let x = l.tx; x < l.tx + l.w; x++) block[idx(x, y)] = 1; });
const TOUR = L.filter(l => l.tour).sort((a, b) => a.tour - b.tour);

/* Bay Area decor */
const DECOR = [];
DECOR.forEach(d => { if (d.k === 'ladies') for (let y = d.ty; y < d.ty + d.h; y++) for (let x = d.tx; x < d.tx + d.w; x++) block[idx(x, y)] = 1; });
const inDecor = (x, y) => DECOR.some(d => x >= d.tx - 1 && x <= d.tx + d.w && y >= d.ty - 1 && y <= d.ty + d.h);
/* trees + border */
const trees = [];
const freeOf = (x, y, r) => L.every(l => x < l.tx - r || x > l.tx + l.w + r || y < l.ty - r || y > l.ty + l.h + r);
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
  const t = tiles[idx(x, y)]; if (t !== T.GRASS && t !== T.CAGRASS && t !== T.ROAD) continue;
  const edge = x < 1 || y < 1 || x > MW - 2 || y > MH - 2;
  const p = rnd(x * 91 + y * 7);
  if (edge ? p < .85 : (freeOf(x, y, 1) && !nearRoad[idx(x, y)] && Math.abs(x - 24) > 2 && x < 44 && L.every(l => Math.hypot(l.spot[0] - x, l.spot[1] - y) > 2.5) && p < (x > riverX(y) ? .09 : .08))) { trees.push([x, y, x > riverX(y)]); if (edge) block[idx(x, y)] = 1; }
}

/* ---------------- bake the map ---------------- */
const SKIRT = 5; // extra rows of forest below the playable map, so scrolling never shows an empty band
const map = document.createElement('canvas'); map.width = MW * TS; map.height = (MH + SKIRT) * TS;
const m = map.getContext('2d');
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
const lights = [];
function pine(X, Y) { R(m, X + 3, Y + 14, 10, 3, 'rgba(0,0,0,.12)'); R(m, X + 7, Y + 11, 2, 5, '#6b4a35'); for (let i = 0; i < 3; i++) { const w = 4 + i * 3, y0 = Y - 2 + i * 4; R(m, X + 8 - w, y0 + 3, w * 2, 3, '#2f5e46'); R(m, X + 8 - w + 1, y0 + 2, w * 2 - 2, 1, '#3b7155'); R(m, X + 8 - w + 2, y0 + 2, w * 2 - 4, 1, '#f4f8fa'); } R(m, X + 7, Y - 3, 2, 2, '#f4f8fa'); }
function redwood(X, Y) { R(m, X + 3, Y + 14, 10, 3, 'rgba(0,0,0,.14)'); R(m, X + 6, Y + 6, 3, 10, '#8b4a32'); R(m, X + 7, Y + 6, 1, 10, '#a85c3e'); for (let i = 0; i < 5; i++) { const w = 2 + i, y0 = Y - 10 + i * 3; R(m, X + 7 - w, y0, w * 2 + 1, 3, i % 2 ? '#2c5a37' : '#356a42'); } }
function smoothPath(c, pts, sc) { c.beginPath(); c.moveTo(pts[0][0] * sc, pts[0][1] * sc); for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; c.quadraticCurveTo(pts[i][0] * sc, pts[i][1] * sc, mx * sc, my * sc); } const e = pts[pts.length - 1]; c.lineTo(e[0] * sc, e[1] * sc); }
function bake() {
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const t = tiles[idx(x, y)], X = x * TS, Y = y * TS, s = x * 31 + y * 17;
    if (t === T.GRASS || (t === T.ROAD && x < riverX(y))) {
      R(m, X, Y, TS, TS, '#8fbf7f');
      for (let i = 0; i < 5; i++) R(m, X + rnd(s + i) * 15, Y + rnd(s + i + 40) * 15, 1, 1, '#7aad6b');
      for (let py = 0; py < TS; py += 2) for (let px = 0; px < TS; px += 2) {
        const wx = X + px, wy = Y + py, n = Math.sin(wx * .045 + Math.sin(wy * .03) * 2) + Math.sin(wy * .052 - wx * .021) + Math.sin((wx + wy) * .09) * .35;
        if (n > 1.05) R(m, wx, wy, 2, 2, n > 1.25 ? '#f1f5f8' : '#dfe8ee');
      }
    } else if (t === T.CAGRASS || t === T.ROAD) {
      R(m, X, Y, TS, TS, '#d7c98c');
      for (let i = 0; i < 5; i++) R(m, X + rnd(s + i) * 15, Y + rnd(s + i + 40) * 15, 1, 1, '#c4b578');
      if (rnd(s + 99) > .9) { R(m, X + 6, Y + 8, 1, 3, '#9aa55e'); R(m, X + 8, Y + 7, 1, 4, '#9aa55e'); }
      if (rnd(s + 98) > .95) R(m, X + 5 + rnd(s + 5) * 6, Y + 5 + rnd(s + 6) * 6, 2, 2, ['#f2a541', '#f6d36b'][Math.floor(rnd(s + 7) * 2)]);
    } else if (t === T.SAND) { const on = x < 30; R(m, X, Y, TS, TS, on ? '#e2e6e2' : '#ead9a6'); for (let i = 0; i < 3; i++) R(m, X + rnd(s + i) * 15, Y + rnd(s + i + 9) * 15, 1, 1, on ? '#cfd6d4' : '#d8c48e'); }
  }
  const trails = [PATH_ON, PATH_CA];
  m.lineJoin = m.lineCap = 'round';
  trails.forEach(pts => { smoothPath(m, pts, TS); m.strokeStyle = 'rgba(120,96,60,.35)'; m.lineWidth = 15; m.stroke(); });
  trails.forEach((pts, i) => { smoothPath(m, pts, TS); m.strokeStyle = i ? '#ead9b0' : '#d9cdb4'; m.lineWidth = 12; m.stroke(); });
  
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const t = tiles[idx(x, y)], X = x * TS, Y = y * TS, s = x * 31 + y * 17;
    if (t === T.WATER) { R(m, X, Y, TS, TS, '#5b9bd5'); if (rnd(s) > .6) R(m, X + rnd(s + 1) * 10, Y + rnd(s + 2) * 14, 4, 1, '#8fc1ea'); }
    if (t === T.OCEAN) { R(m, X, Y, TS, TS, '#3f7fb8'); if (rnd(s) > .5) R(m, X + rnd(s + 1) * 10, Y + rnd(s + 2) * 14, 5, 1, '#7fb3de'); if (tiles[idx(x - 1, y)] === T.SAND) for (let k = 0; k < TS; k += 3) R(m, X, Y + k, 2, 2, '#e9f3fa'); }
  }
  for (let y = MH; y < MH + SKIRT; y++) for (let x = 0; x < MW; x++) {
    const t = tiles[idx(x, MH - 1)], X = x * TS, Y = y * TS, s = x * 31 + y * 17;
    R(m, X, Y, TS, TS, {0: '#8fbf7f', 1: '#d7c98c', 2: '#5b9bd5', 5: '#ead9a6', 6: '#3f7fb8'}[t] || '#8fbf7f');
    if (t === T.WATER && rnd(s) > .6) R(m, X + rnd(s + 1) * 10, Y + rnd(s + 2) * 14, 4, 1, '#8fc1ea');
  }
  // river banks: one long timber board each side, posts every few metres, and a small dock where the path meets the water
  [[23 * TS - 4, 1], [26 * TS, -1]].forEach(([bx, side]) => {
    R(m, bx, 0, 4, map.height, '#a8794e'); R(m, side > 0 ? bx : bx + 3, 0, 1, map.height, '#c4935f'); R(m, side > 0 ? bx + 3 : bx, 0, 1, map.height, '#6e4a2c');
    for (let y = 10; y < map.height; y += 40) R(m, bx - (side > 0 ? 1 : 0), y, 5, 3, '#6e4a2c');
  });
  { const bx = (MW - 2) * TS, by = 3 * TS; R(m, bx - 4, by + 10, TS * 3 + 8, 4, '#c0392b'); R(m, bx - 4, by + 14, TS * 3 + 8, 1, '#8e2a20'); [bx + 6, bx + 34].forEach(tx => { R(m, tx, by - 18, 4, 34, '#c0392b'); R(m, tx - 1, by - 18, 6, 2, '#8e2a20'); R(m, tx, by - 8, 4, 1, '#8e2a20'); }); m.strokeStyle = '#c0392b'; m.lineWidth = 1; m.beginPath(); m.moveTo(bx - 4, by - 2); m.quadraticCurveTo(bx + 22, by + 14, bx + 50, by - 2); m.stroke(); }
  // trees, sorted by y so lower ones overlap
  bakeBay();
  trees.sort((a, b) => a[1] - b[1]).forEach(([x, y, ca]) => ca ? (x > MW - 9 && rnd(x * 7 + y) > .6 ? drawPalm(x * TS, y * TS) : redwood(x * TS, y * TS)) : pine(x * TS, y * TS));
  L.forEach(drawLandmark);
  for (let y = MH - 1; y < MH + SKIRT; y++) for (let x = 0; x < MW; x++) { const t = tiles[idx(x, Math.min(y, MH - 1))]; if ((t === T.GRASS || t === T.CAGRASS) && rnd(x * 17 + y * 5) < .8 && (y >= MH || block[idx(x, y)])) { if (t === T.GRASS) pine(x * TS, y * TS); else if (x > 42) drawPalm(x * TS, y * TS); else redwood(x * TS, y * TS); } }
}
function bakeBay() {
  // rolling golden-hill contours and poppies on the California side
  for (let y = 0; y < MH * TS; y += 2) for (let x = 0; x < MW * TS; x += 2) {
    const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (tx <= riverX(ty) + 3 || tiles[idx(tx, ty)] === T.OCEAN || tiles[idx(tx, ty)] === T.SAND) continue;
    const n = Math.sin(x * .021 + Math.sin(y * .017) * 2.2) + Math.sin(y * .026 - x * .009) * .9;
    if (n > 1.2) R(m, x, y, 2, 2, '#c9b670'); else if (n < -1.25) R(m, x, y, 2, 2, '#e3d59c');
    if (rnd(x * 7.3 + y * 1.7) > .9965) { R(m, x, y, 2, 2, '#f08a24'); R(m, x + 1, y + 2, 1, 2, '#6f8f3e'); }
  }
  DECOR.forEach(d => {
    const X = d.tx * TS, Y = d.ty * TS;
    if (d.k === 'ladies') { // painted ladies row
      const cols = [['#e9a5b8', '#b65c78'], ['#9fc7e3', '#4f7fae'], ['#f2d27a', '#b98f2c'], ['#b9e0c3', '#5f9a72'], ['#d9c2ef', '#8a6bb0']];
      R(m, X + 2, Y + d.h * TS - 2, d.w * TS - 4, 4, 'rgba(0,0,0,.15)');
      cols.forEach(([wall, trim], i) => { const hx = X + 4 + i * 21, hy = Y + 8, hw = 20, hh = d.h * TS - 10;
        R(m, hx, hy, hw, hh, wall); for (let k = 0; k < 8; k++) R(m, hx + k, hy - k, hw - k * 2, 1, trim);
        R(m, hx + 2, hy + 4, hw - 4, 2, trim); R(m, hx + 3, hy + 9, 5, 8, '#fdf8ef'); R(m, hx + 12, hy + 9, 5, 8, '#fdf8ef'); R(m, hx + 4, hy + 10, 3, 6, '#9cc8e8'); R(m, hx + 13, hy + 10, 3, 6, '#9cc8e8');
        R(m, hx + 7, hy + hh - 11, 6, 11, trim); R(m, hx + 6, hy + hh - 2, 8, 2, '#eae3d6'); lights.push([hx + 5, hy + 13, 10]); lights.push([hx + 14, hy + 13, 10]); });
    }
    if (d.k === 'vines') { for (let r = 0; r < 4; r++) { const ry = Y + 4 + r * 7; R(m, X, ry + 3, d.w * TS, 1, '#8a6a3c'); for (let x = X + 2; x < X + d.w * TS - 2; x += 5) { R(m, x, ry, 4, 4, '#5f8a3a'); R(m, x + 1, ry + 1, 2, 2, '#7aa24d'); if (rnd(x + ry) > .7) R(m, x + 1, ry + 3, 2, 2, '#6b2f5a'); } } }
    if (d.k === 'cable') { // cable car on its track
      const ty2 = Y + 14; R(m, X, ty2, d.w * TS, 2, '#7d7368'); R(m, X, ty2 + 6, d.w * TS, 2, '#7d7368'); for (let x = X; x < X + d.w * TS; x += 6) R(m, x, ty2 - 1, 2, 10, '#8a6a4a'); R(m, X, ty2 + 3, d.w * TS, 1, '#4a4440');
      const cx = X + 56, cy = ty2 - 14; R(m, cx + 2, cy + 22, 40, 3, 'rgba(0,0,0,.18)'); R(m, cx, cy, 44, 20, '#b8342d'); R(m, cx, cy, 44, 3, '#8e2a20'); R(m, cx, cy + 15, 44, 5, '#e8d6a8');
      for (let i = 0; i < 5; i++) R(m, cx + 3 + i * 8, cy + 5, 6, 7, '#9cc8e8'); R(m, cx + 21, cy - 6, 2, 6, '#3a3330'); R(m, cx + 4, cy + 20, 5, 3, '#2b2b2b'); R(m, cx + 35, cy + 20, 5, 3, '#2b2b2b'); lights.push([cx + 22, cy + 8, 22]);
    }
  });
  // fog rolling in over the Pacific
  for (let y = 0; y < 7 * TS; y += 2) for (let x = (MW - 3) * TS; x < MW * TS; x += 2) { const n = Math.sin(x * .05 + y * .03) + Math.sin(y * .08 - x * .02); if (n > .9 - y / (7 * TS)) { m.fillStyle = 'rgba(245,248,250,.55)'; m.fillRect(x, y, 2, 2); } }
}
function disc(c, cx, cy, r, col) { for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); R(c, cx - w, cy + y, w * 2, 1, col); } }
function drawTree(X, Y, big) { R(m, X + 3, Y + 13, 10, 3, 'rgba(0,0,0,.15)'); R(m, X + 6, Y + 9, 4, 6, '#7a5640'); disc(m, X + 8, Y + 6, big ? 8 : 7, '#4f9150'); disc(m, X + 6, Y + 4, big ? 5 : 4, '#6aad62'); R(m, X + 4, Y + 2, 2, 1, '#86c27a'); }
function drawPalm(X, Y) { R(m, X + 3, Y + 13, 10, 3, 'rgba(0,0,0,.12)'); for (let i = 0; i < 14; i++) R(m, X + 7 + Math.round(Math.sin(i / 5)), Y + 14 - i, 2, 1, '#8a6244'); [[-7, 1], [-4, -2], [0, -3], [4, -2], [7, 1]].forEach(([dx, dy]) => { R(m, X + 8 + Math.min(0, dx), Y + dy, Math.abs(dx) + 1, 2, '#5e9e5a'); R(m, X + 7 + dx, Y + dy + 1, 2, 2, '#5e9e5a'); }); }

function house(X, Y, w, h, roof, wall, o = {}) {
  const wallH = Math.round(h * .42), roofH = h - wallH;
  R(m, X + 2, Y + h - 2, w, 4, 'rgba(0,0,0,.18)');
  R(m, X, Y + roofH, w, wallH, wall); for (let yy = Y + roofH + 3; yy < Y + h; yy += 4) R(m, X, yy, w, 1, shade(wall, -18));
  R(m, X - 2, Y, w + 4, roofH + 2, roof); for (let yy = Y + 3; yy < Y + roofH; yy += 4) R(m, X - 2, yy, w + 4, 1, shade(roof, 20)); R(m, X - 2, Y + roofH, w + 4, 2, shade(roof, -30));
  const dw = 10, dx = X + Math.round(w / 2 - dw / 2); R(m, dx, Y + h - 14, dw, 14, o.door || '#6b4a35'); R(m, dx + 7, Y + h - 8, 1, 1, '#f3d36b');
  const ww = 10, cx = X + w / 2, offs = w >= 70 ? [-.34, -.17, .17, .34] : [-.27, .27];
  offs.forEach(f => { const wx = Math.round(cx + f * w - ww / 2); R(m, wx, Y + roofH + 5, ww, 8, o.win || '#bfe0ef'); R(m, wx + 4, Y + roofH + 5, 1, 8, shade(wall, -25)); R(m, wx, Y + roofH + 9, ww, 1, shade(wall, -25)); lights.push([wx + 5, Y + roofH + 9, 16]); });
  if (o.chimney) { R(m, X + w - 16, Y - 8, 8, 12, shade(wall, -20)); }
}
function shade(hex, a) { const n = parseInt(hex.slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, v + a))); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); }
function drawLandmark(l) {
  const _l = l;
  const X = l.tx * TS, Y = l.ty * TS, w = l.w * TS, h = l.h * TS;
  switch (l.kind) {
    case 'cabin': house(X + 4, Y + 4, w - 8, h - 4, '#c9705a', '#e3c39a', {chimney: 1}); break;
    case 'school': { // E7: white fritted-glass panels in a pyramid pattern over a clear glass ground floor
      R(m, X + 2, Y + h - 2, w, 4, 'rgba(0,0,0,.18)');
      R(m, X, Y + 4, w, h - 4, '#e9ecea'); R(m, X, Y, w, 6, '#c9cdcc'); R(m, X + 4, Y + 1, w - 8, 2, '#b5bab9');
      for (let yy = Y + 8; yy < Y + h - 20; yy += 6) for (let xx = X + 2; xx < X + w - 4; xx += 6) { const alt = ((xx - X) / 6 + (yy - Y) / 6) % 2; R(m, xx + 2, yy, 2, 1, alt ? '#9fb3bd' : '#cfd8dc'); R(m, xx + 1, yy + 1, 4, 1, alt ? '#9fb3bd' : '#cfd8dc'); R(m, xx, yy + 2, 6, 2, alt ? '#8ea3ae' : '#c2ccd1'); lights.push([xx + 3, yy + 2, 6]); }
      R(m, X, Y + h - 18, w, 18, '#9cc8e8'); for (let xx = X + 8; xx < X + w; xx += 12) R(m, xx, Y + h - 18, 1, 18, '#7fa7c4'); R(m, X, Y + h - 18, w, 1, '#7fa7c4');
      R(m, X + w / 2 - 6, Y + h - 14, 12, 14, '#4b5b66'); R(m, X + w / 2, Y + h - 14, 1, 14, '#9cc8e8');
      for (let i = 0; i < 5; i++) lights.push([X + 8 + i * 16, Y + h - 9, 14]); break; }
    case 'house': house(X, Y, w, h, l.roof, '#ead6b6'); break;
    case 'factory': { // Valbruna: 1918 red-brick steel mill, sawtooth roof, stacks, furnace glow
      R(m, X + 2, Y + h - 2, w, 4, 'rgba(0,0,0,.2)');
      R(m, X + 6, Y - 16, 7, 30, '#7d6e66'); R(m, X + 6, Y - 16, 7, 2, '#4d433e'); R(m, X + 18, Y - 10, 6, 24, '#7d6e66'); R(m, X + 18, Y - 10, 6, 2, '#4d433e');
      R(m, X, Y + 14, w, h - 14, '#a3462f'); for (let yy = Y + 16; yy < Y + h; yy += 3) for (let xx = X + ((yy / 3) % 2 ? 0 : 3); xx < X + w; xx += 6) R(m, xx, yy, 1, 1, '#8a3826'); for (let yy = Y + 16; yy < Y + h; yy += 3) R(m, X, yy, w, 1, '#b55a40');
      for (let i = 0; i < w; i += 16) for (let k = 0; k < 10; k++) { R(m, X + i + k, Y + 14 - k, 1, k + 1, '#6b6f75'); R(m, X + i + 10, Y + 4, 6, 10, '#9db6c8'); R(m, X + i + 10, Y + 4, 1, 10, '#5a5f66'); }
      R(m, X + w / 2 - 10, Y + h - 22, 20, 22, '#3a2a22'); R(m, X + w / 2 - 8, Y + h - 20, 16, 20, '#ff8a2a'); R(m, X + w / 2 - 6, Y + h - 18, 12, 18, '#ffc35a'); lights.push([X + w / 2, Y + h - 10, 30]);
      for (let i = 0; i < 4; i++) R(m, X + w + 2, Y + h - 4 - i * 3, 14, 2, i % 2 ? '#9aa3ab' : '#b8c0c6'); break; }
    case 'office': {
      const sty = {geotab: {wall: '#e4e9ee', band: '#24365e', glass: '#8fc0e6', roof: '#c3cbd3'}, evercloak: {wall: '#e6ebea', band: '#2aa39a', glass: '#a6d6dc', roof: '#c9d0cf'}, level: {wall: '#3b3f45', band: '#b88a5a', glass: '#9cc3dc', roof: '#2c3035'}}[l.id];
      R(m, X + 2, Y + h - 2, w, 4, 'rgba(0,0,0,.18)');
      R(m, X, Y + 6, w, h - 6, sty.wall); R(m, X - 1, Y, w + 2, 8, sty.roof); R(m, X - 1, Y + 7, w + 2, 1, shade(sty.roof, -30));
      R(m, X, Y + 9, w, 3, sty.band);
      const cols = Math.floor((w - 8) / 9); const gx = X + Math.round((w - cols * 9 + 1) / 2);
      for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) { if (r === 1 && Math.abs(c - (cols - 1) / 2) < 1) continue; const wx = gx + c * 9, wy = Y + 15 + r * 11; R(m, wx, wy, 8, 8, sty.glass); R(m, wx, wy, 8, 1, shade(sty.glass, 30)); lights.push([wx + 4, wy + 4, 9]); }
      R(m, X + w / 2 - 7, Y + h - 14, 14, 14, shade(sty.glass, -40)); R(m, X + w / 2, Y + h - 14, 1, 14, sty.glass); R(m, X + w / 2 - 9, Y + h - 16, 18, 2, sty.band);
      if (l.id === 'geotab') { R(m, X + w - 10, Y - 10, 1, 10, '#8a9aa8'); disc(m, X + w - 10, Y - 11, 2, '#dfe5ea'); R(m, X + 4, Y + 1, 10, 5, '#aab4bd'); }
      if (l.id === 'evercloak') { for (let i = 0; i < 2; i++) { R(m, X + 6 + i * 16, Y - 6, 12, 8, '#b8c2c4'); disc(m, X + 12 + i * 16, Y - 2, 3, '#7d898c'); disc(m, X + 12 + i * 16, Y - 2, 1, '#b8c2c4'); } }
      if (l.id === 'level') { for (let x = X + 2; x < X + w - 2; x += 3) R(m, x, Y + 12, 1, h - 30, '#9a7048'); }
      break; }
    case 'modern': if (l.id === 'teslalight') { // Fremont: huge white factory
        R(m, X + 2, Y + h - 2, w + 8, 4, 'rgba(0,0,0,.18)'); R(m, X - 8, Y, w + 16, h, '#f2f3f4'); R(m, X - 8, Y, w + 16, 10, '#d5d9dc'); for (let i = 0; i < w + 16; i += 10) R(m, X - 8 + i, Y + 2, 6, 6, '#e6eaec');
        R(m, X - 8, Y + 22, w + 16, 3, '#c9cfd3'); for (let i = 0; i < 4; i++) { R(m, X - 4 + i * 24, Y + h - 16, 16, 16, '#7d868c'); for (let k = 0; k < 16; k += 3) R(m, X - 4 + i * 24, Y + h - 16 + k, 16, 1, '#6a7378'); }
        for (let i = 0; i < 6; i++) { R(m, X - 4 + i * 16, Y + 28, 10, 8, '#a9cde6'); lights.push([X + 1 + i * 16, Y + 32, 12]); } break; }
      if (l.id === 'teslacells') { // Palo Alto HQ: white, glass, rooftop solar
        R(m, X + 2, Y + h - 2, w, 4, 'rgba(0,0,0,.18)'); R(m, X, Y, w, h, '#eef1f3'); R(m, X, Y, w, 22, '#d9dee2');
        for (let yy = Y + 3; yy < Y + 20; yy += 6) for (let xx = X + 4; xx < X + w - 6; xx += 9) { R(m, xx, yy, 8, 5, '#26385a'); R(m, xx, yy, 8, 1, '#4d6a96'); }
        R(m, X, Y + 26, w, 20, '#9cc8e8'); for (let xx = X + 10; xx < X + w; xx += 10) R(m, xx, Y + 26, 1, 20, '#7fa7c4'); for (let i = 0; i < 4; i++) lights.push([X + 10 + i * 20, Y + 36, 16]);
        R(m, X + w / 2 - 7, Y + h - 16, 14, 16, '#5b6670'); break; }
      R(m, X + 2, Y + h - 2, w, 4, 'rgba(0,0,0,.18)'); R(m, X, Y, w, h, '#eef1f3'); R(m, X, Y, w, 8, '#cfd6dc'); for (let i = 0; i < 4; i++) { R(m, X + 6 + i * 18, Y + 18, 12, 30, '#9cc8e8'); lights.push([X + 12 + i * 18, Y + 32, 18]); } R(m, X + w / 2 - 7, Y + h - 16, 14, 16, '#5b6670'); break;
    case 'modern2': { // Google Bay View: tent canopies clad in blue-silver dragonscale solar, colourful bikes
      R(m, X + 2, Y + h - 2, w, 4, 'rgba(0,0,0,.18)');
      R(m, X, Y + h - 22, w, 22, '#9cc8e8'); for (let xx = X + 6; xx < X + w; xx += 8) R(m, xx, Y + h - 22, 1, 22, '#7fa7c4');
      const peaks = 2, pw = w / peaks;
      for (let pk = 0; pk < peaks; pk++) for (let row = 0; row < 40; row++) { const half = Math.round(pw / 2 * Math.min(1, row / 22)); const cx = X + pk * pw + pw / 2; for (let xx = cx - half; xx < cx + half; xx += 2) { const t = (Math.floor(xx / 2) + row) % 3; R(m, xx, Y + row, 2, 1, ['#7f9fbf', '#b9cfe0', '#5d7fa1'][t]); } }
      R(m, X + w / 2 - 6, Y + h - 14, 12, 14, '#4b5b66');
      ['#f2c14e', '#e35d50', '#47a668', '#5b8ee6'].forEach((c, i) => { const bx = X + 4 + i * 9, by = Y + h + 4; R(m, bx, by + 3, 7, 1, c); R(m, bx + 1, by, 1, 4, c); R(m, bx + 5, by, 1, 4, c); R(m, bx, by + 4, 2, 2, '#222'); R(m, bx + 5, by + 4, 2, 2, '#222'); });
      for (let i = 0; i < 4; i++) lights.push([X + 10 + i * 20, Y + h - 12, 16]); break; }
    case 'modern2_old': R(m, X + 2, Y + h - 2, w, 4, 'rgba(0,0,0,.18)'); R(m, X, Y, w, h, '#f4f1ea'); R(m, X, Y, w, 8, '#dcd6c8'); ['#5b8ee6', '#e35d50', '#f2c14e', '#47a668'].forEach((c, i) => R(m, X + 6 + i * 18, Y + 3, 14, 3, c)); for (let i = 0; i < 4; i++) { R(m, X + 6 + i * 18, Y + 18, 12, 28, '#a8d2ee'); lights.push([X + 12 + i * 18, Y + 32, 18]); } R(m, X + w / 2 - 7, Y + h - 16, 14, 16, '#5b6670'); break;
    case 'workshop': house(X, Y, w, h, '#6f7f8f', '#b9a089', {door: '#8c7a66'}); disc(m, X + 22, Y + 12, 6, '#d9b24a'); disc(m, X + 22, Y + 12, 2, '#6f7f8f'); break;
    case 'tower': R(m, X + 2, Y + h - 2, w, 4, 'rgba(0,0,0,.18)'); R(m, X + 6, Y + 10, w - 12, h - 10, '#d8cfc0'); for (let yy = Y + 14; yy < Y + h; yy += 5) R(m, X + 6, yy, w - 12, 1, '#c4b9a8'); R(m, X + 2, Y, w - 4, 12, '#8b7aa8'); for (let i = 0; i < 4; i++) R(m, X + 4 + i * 10, Y - 4, 6, 4, '#8b7aa8'); R(m, X + w / 2 - 4, Y + 18, 8, 8, '#ffe39a'); lights.push([X + w / 2, Y + 22, 22]); R(m, X + w / 2 - 5, Y + h - 14, 10, 14, '#6b4a35'); break;
    case 'plot': for (let i = 0; i < w; i += 6) { R(m, X + i, Y, 3, 1, '#7a5232'); R(m, X + i, Y + h - 1, 3, 1, '#7a5232'); } for (let i = 0; i < h; i += 6) { R(m, X, Y + i, 1, 3, '#7a5232'); R(m, X + w - 1, Y + i, 1, 3, '#7a5232'); } R(m, X + w / 2 - 1, Y + 10, 2, 22, '#7a5232'); R(m, X + w / 2 - 14, Y + 6, 28, 12, '#c79a62'); R(m, X + w / 2 - 10, Y + 10, 20, 1, '#7a5232'); R(m, X + w / 2 - 10, Y + 13, 14, 1, '#7a5232'); break;
    case 'mail': R(m, X + 7, Y + 6, 2, 10, '#6b4a35'); R(m, X + 3, Y, 10, 8, '#3f6fb0'); R(m, X + 3, Y, 10, 2, '#5b88c6'); R(m, X + 13, Y - 2, 1, 5, '#d9644a'); R(m, X + 14, Y - 2, 3, 2, '#d9644a'); break;
  }
}
bake();
/* ---------------- sprites ---------------- */
const H = '#2a1a14', H2 = '#4a2e22', S = '#e8bfa0', S2 = '#d6a886', TEE = '#1f2126', J = '#4f6d8f', SH = '#eceff1';
function girl(c, ox, oy, dir, f, noShadow) {
  const P = (x, y, w, h, k) => R(c, ox + x, oy + y, w, h, k);
  if (!noShadow) P(4, 24, 12, 2, 'rgba(0,0,0,.18)');
  const lift = f === 1 ? 1 : 0, lift2 = f === 2 ? 1 : 0;
  if (dir === 'down' || dir === 'up') {
    P(5, 1, 10, 2, H); P(4, 3, 12, 3, H); P(3, 5, 3, 12, H); P(14, 5, 3, 12, H); P(2, 8, 2, 8, H); P(16, 8, 2, 8, H);
    if (dir === 'down') {
      P(6, 5, 8, 7, S); P(6, 5, 3, 1, H); P(11, 5, 3, 1, H); P(6, 6, 1, 2, H); P(13, 6, 1, 2, H);
      P(7, 7, 2, 1, H); P(11, 7, 2, 1, H);
      P(7, 8, 2, 2, '#fff'); P(11, 8, 2, 2, '#fff'); P(8, 8, 1, 2, '#3b2418'); P(11, 8, 1, 2, '#3b2418');
      P(9, 10, 2, 1, '#b5605a'); P(6, 10, 1, 1, '#f0b4a0'); P(13, 10, 1, 1, '#f0b4a0'); P(8, 12, 4, 1, S2);
    } else P(5, 4, 10, 13, H);
    [[5, 2], [13, 2], [4, 7], [15, 7], [3, 11], [16, 11], [4, 15], [15, 15], [7, 3], [12, 3]].forEach(([x, y]) => P(x, y, 1, 1, H2));
    P(6, 13, 8, 6, TEE); P(4, 13, 2, 3, TEE); P(14, 13, 2, 3, TEE); P(4, 16, 2, 3, S); P(14, 16, 2, 3, S);
    P(7, 19, 6, 3, J); P(7, 22 - lift, 2, 2, SH); P(11, 22 - lift2, 2, 2, SH);
  } else {
    const fl = dir === 'left' ? (x, w) => 20 - x - w : x => x;
    const Q = (x, y, w, h, k) => P(fl(x, w), y, w, h, k);
    Q(5, 1, 9, 2, H); Q(4, 3, 11, 2, H); Q(4, 5, 6, 13, H); Q(3, 8, 3, 9, H);
    Q(10, 5, 5, 7, S); Q(10, 5, 2, 3, H); Q(12, 5, 2, 1, H); Q(12, 7, 2, 1, H);
    Q(12, 8, 2, 2, '#fff'); Q(13, 8, 1, 2, '#3b2418'); Q(13, 11, 1, 1, '#b5605a'); Q(10, 12, 3, 1, S2);
    [[5, 2], [9, 2], [5, 7], [4, 10], [6, 13], [4, 15], [7, 4]].forEach(([x, y]) => Q(x, y, 1, 1, H2));
    Q(7, 13, 7, 6, TEE); Q(9, 13, 3, 3, TEE); Q(10, 16, 2, 3, S);
    Q(8, 19, 5, 3, J); Q(f === 1 ? 7 : 8, 22, 2, 2, SH); Q(f === 2 ? 12 : 11, 22, 3, 2, SH);
  }
}
function moeSprite(c, ox, oy, f) {
  const P = (x, y, w, h, k) => R(c, ox + x, oy + y, w, h, k), cr = '#f6e7d4', pt = '#e9b98a';
  P(1, 11, 12, 2, 'rgba(0,0,0,.15)');
  P(2, 4, 10, 7, cr); P(3, 0, 8, 6, cr); P(3, -1, 2, 2, pt); P(9, -1, 2, 2, pt);
  P(5, 2, 4, 3, pt); P(5, 2, 1, 1, '#7fb3e0'); P(8, 2, 1, 1, '#7fb3e0'); P(6, 4, 2, 1, '#f2a0a8');
  P(11, 7 + (f ? 1 : 0), 3, 2, pt); P(13, 5 + (f ? 1 : 0), 2, 3, pt);
  P(3, 10 + (f ? 0 : 1), 2, 2, pt); P(9, 10 + (f ? 1 : 0), 2, 2, pt);
}
const pops = {nsx: 0, c5: 0}, popT = {nsx: 0, c5: 0}; const carClicks = {nsx: 0, c5: 0};
function car(c, X, Y, o, up, noShadow) {
  const P = (x, y, w, h, k) => R(c, X + x, Y + y, w, h, k), B = o.body, D = shade(B, -35), Lt = shade(B, 30);
  if (!noShadow) P(2, 39, 26, 4, 'rgba(0,0,0,.22)');
  P(0, 7, 3, 8, '#141414'); P(27, 7, 3, 8, '#141414'); P(0, 27, 3, 9, '#141414'); P(27, 27, 3, 9, '#141414');
  P(3, 1, 24, 1, B); P(2, 2, 26, 36, B); P(3, 38, 24, 1, D); P(2, 2, 26, 1, Lt);
  if (o.nsx) { P(4, 3, 22, 2, '#5a0f0f'); P(5, 3, 5, 2, '#ff4a3d'); P(20, 3, 5, 2, '#ff4a3d'); P(4, 6, 22, 1, D); }
  else { P(5, 3, 4, 2, '#ff4a3d'); P(21, 3, 4, 2, '#ff4a3d'); P(4, 6, 22, 1, D); P(13, 3, 4, 1, '#bbbbbb'); }
  const ry = o.nsx ? 9 : 8;
  P(6, ry, 18, 8, o.roof); P(7, ry + 1, 16, 1, shade(o.roof, 25));
  P(5, ry + 8, 20, 6, o.glass); P(6, ry + 9, 7, 1, shade(o.glass, 50)); P(4, ry + 8, 1, 6, D); P(25, ry + 8, 1, 6, D);
  P(14, ry + 15, 2, 10, D); P(4, ry + 14, 22, 1, Lt);
  if (up) { P(4, 27, 7, 5, '#18181b'); P(19, 27, 7, 5, '#18181b'); P(5, 30, 5, 2, '#fff7d6'); P(20, 30, 5, 2, '#fff7d6'); P(4, 26, 7, 1, Lt); P(19, 26, 7, 1, Lt); }
  else { P(4, 30, 7, 1, D); P(19, 30, 7, 1, D); P(4, 32, 7, 1, D); P(19, 32, 7, 1, D); }
  P(2, 35, 26, 3, D); P(9, 35, 12, 2, '#1a1a1a'); P(3, 34, 3, 1, '#f3a53b'); P(24, 34, 3, 1, '#f3a53b');
}
const CARS = {nsx: {body: '#c8312c', roof: '#15171b', glass: '#3a4a5c', nsx: 1}, c5: {body: '#1f2026', roof: '#1f2026', glass: '#5d7896'}};

/* ---------------- DOM ---------------- */
const root = document.getElementById('world-ui');
const cv = document.getElementById('world-cv'), g = cv.getContext('2d');
const labelsEl = document.getElementById('world-labels');
const prompt = document.getElementById('world-prompt');
const card = document.getElementById('world-card');
const mini = document.getElementById('minimap'), mg = mini.getContext('2d');
let SC = 3, VW = 0, VH = 0, offX = 0, offY = 0, FIT = true, PADT = 0, PADB = 0;
function cvFull() { Object.assign(cv.style, {left: '0px', top: '0px', width: '100%', height: '100%'}); offX = offY = 0; }
function resize() {
  if (typeof scene !== 'undefined' && scene === 'room') { roomResize(); return; }
  if (typeof scene !== 'undefined' && scene === 'track') { trackResize(); return; }
  const bar = document.getElementById('world-bar'), barH = ((bar && bar.offsetHeight) || 56) + 14;
  const mw = MW * TS, mh = MH * TS;
  SC = Math.max(innerWidth / mw, (innerHeight - barH * .5) / mh, 1.6);
  SC = Math.min(SC, Math.max(innerWidth / (mw * .6), 1.6)); // tall screens: keep at least 60% of the map's width in view
  FIT = innerWidth / SC >= mw * .72;
  root.classList.toggle('fit', FIT);
  VW = Math.ceil(innerWidth / SC); VH = Math.ceil(innerHeight / SC); cv.width = VW; cv.height = VH; g.imageSmoothingEnabled = false; cvFull();
  PADT = 0; PADB = barH / SC;
}
addEventListener('resize', resize);

/* logo plaques (crisp marks on pixel-framed signs) */
const ICON = {evercloak: 4, valbruna: 18, geotab: 1, teslacells: 0, teslalight: 1, level: 2, google: 16};
const iconNodes = Object.keys(ICON).map(id => { const im = document.createElement('img'); im.className = 'w-logo'; im.alt = ''; im.src = 'img/icon-' + (id.startsWith('tesla') ? 'tesla' : id) + '.png'; labelsEl.appendChild(im); return [L.find(l => l.id === id), im]; });
/* labels */
const labelNodes = L.map(l => { const d = document.createElement('button'); d.type = 'button'; d.className = 'w-label' + (l.tour ? ' w-stop' : ''); d.textContent = l.tour ? `${l.tour} · ${l.label} · ${l.yr}` : l.label; if (l.nolabel) d.hidden = true; d.addEventListener('click', () => walkTo(l, true)); labelsEl.appendChild(d); return d; });

/* minimap */
const MS = 5; mini.width = MW * MS; mini.height = MH * MS;
function drawMini() {
  const col = {0: '#93c283', 1: '#d7c98c', 2: '#6aa6dc', 3: '#d7c98c', 4: '#8a5a38', 5: '#e6dcb8', 6: '#4f8cc2'};
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { mg.fillStyle = col[tiles[idx(x, y)]]; mg.fillRect(x * MS, y * MS, MS, MS); }
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (tiles[idx(x, y)] === T.ROAD && x < riverX(y)) { mg.fillStyle = '#93c283'; mg.fillRect(x * MS, y * MS, MS, MS); }
  mg.lineJoin = mg.lineCap = 'round'; [].forEach(pts => { smoothPath(mg, pts.map(([x, y]) => [x + .5, y + .5]), MS); mg.strokeStyle = '#b9a47c'; mg.lineWidth = 6; mg.stroke(); });
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const t = tiles[idx(x, y)]; if (t === T.WATER || t === T.OCEAN) { mg.fillStyle = col[t]; mg.fillRect(x * MS, y * MS, MS, MS); } }
  trees.forEach(([x, y, p]) => { mg.fillStyle = p ? '#3d6a45' : '#3f6a55'; mg.fillRect(x * MS, y * MS, MS, MS); });
  L.forEach(l => { mg.fillStyle = l.tour ? '#7a5232' : l.kind === 'cabin' ? '#c9705a' : '#4a3a6a'; mg.fillRect(l.tx * MS, l.ty * MS, l.w * MS, l.h * MS); });
}
drawMini();
const miniBase = document.createElement('canvas'); miniBase.width = mini.width; miniBase.height = mini.height; miniBase.getContext('2d').drawImage(mini, 0, 0);

/* ---------------- the room: front-facing, detailed ---------------- */
const RMW = 360, RMH = 180, FLOOR = 172;
const room = document.createElement('canvas'); room.width = RMW; room.height = RMH;
const rc = room.getContext('2d');
/* the LED controller: six strips, shared by the room, the Tesla Lighting house and the map; kept until a refresh */
const led = {strips: Array.from({length: 6}, () => ({r: 255, g: 150, b: 70, w: 80})), mode: 'static', pre: 1, touched: false};
const hsl = (h, s, l) => { const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; };
function ledColor(i, now) {
  if (led.mode === 'rainbow') return hsl(((i / 6) + (reduce ? 0 : now / 5000)) % 1, 1, .6);
  if (led.mode === 'chase') { const k = reduce ? 1 : .2 + .8 * Math.max(0, Math.sin(now / 170 - i * 1.05)); return hsl(((i / 6) + (reduce ? 0 : now / 2600)) % 1, 1, .55).map(v => Math.round(v * k)); }
  const s = led.strips[i]; return [s.r, s.g, s.b].map(v => Math.round(Math.min(255, v + s.w * .8)));
}
/* things you change inside the houses that show up out on the map */
const WSTATE = {cells: false, hat: false, shades: false, coat: false, goals: 0, bars: 0, moeHome: false};
const GAL = {
  photos: [['img/ca-sunset-gull.webp', 'Ventura Pier, Santa Barbara, after a long road trip'], ['img/ca-redwoods.webp', 'Muir Woods'], ['img/ca-palms.webp', 'The Pacifica Taco Bell'], ['img/ca-pier.webp', 'Santa Monica Pier'], ['img/ca-coast-night.webp', 'Half Moon Bay, by the Ritz golf course']],
  moe: [["img/moe-1.webp", "My cat"], ["img/moe-2.webp", "My cat"], ["img/moe-3.webp", "My cat"], ["img/moe-4.webp", "My cat"], ["img/moe-5.webp", "My cat"], ["img/moe-6.webp", "My cat"], ["img/moe-7.webp", "My cat"]]
};
const RO = [
  {id: 'door', label: 'Back outside', x: 6, y: 66, w: 28, h: 94, stand: 22, kind: 'door'},
  {id: 'desk', label: 'My setup', x: 40, y: 82, w: 110, h: 46, stand: 92, kind: 'room',
   card: {title: 'My setup', meta: 'The bunny case is non-negotiable', img: 'img/setup.webp', imgAlt: 'Jillanne’s desk setup with a white bunny-eared PC case and two monitors', body: ['Ironside build in a bunny case: Intel Core i5-12400F, GeForce RTX 4060, 32 GB DDR4-3200, 1 TB PCIe 4.0 NVMe, 650 W Gold PSU and individually sleeved cherry-blossom pink cables.', 'Two MSI 27" 1440p 170 Hz monitors.']}},
  {id: 'minimoe', label: 'Mini Moe', x: 80, y: 36, w: 16, h: 20, stand: 88, kind: 'room',
   card: {title: 'Mini Moe', meta: '3D printed', body: ['I missed Moe while I was away on co-op, so I 3D printed him to watch me study.'], img: 'img/minimoe.webp', imgAlt: 'A white 3D-printed cat figure next to a laptop and handwritten notes'}},
  {id: 'led', label: 'LED strip', x: 40, y: 57, w: 110, h: 8, stand: 96, kind: 'led'},
  {id: 'photos', label: 'Photo wall', x: 160, y: 18, w: 56, h: 60, stand: 188, kind: 'gallery', gal: 'photos', title: 'Photo wall', meta: 'Four co-op terms in California'},
  {id: 'tv', label: 'Arcade', x: 304, y: 110, w: 48, h: 50, stand: 334, kind: 'arcade'},
  {id: 'moe', label: 'Moe', x: 116, y: 156, w: 34, h: 18, stand: 108, kind: 'gallery', gal: 'moe', title: 'Moe', meta: 'My cat'}
];
(function bakeRoom() {
  const P_ = (x, y, w, h, k) => R(rc, x, y, w, h, k);
  // wall: warm cream boards over wood wainscot
  P_(0, 0, RMW, RMH, '#e9d6b6'); for (let x = 0; x < RMW; x += 12) P_(x, 0, 1, 120, '#dcc6a1');
  P_(0, 120, RMW, 40, '#b88758'); for (let x = 0; x < RMW; x += 18) P_(x, 120, 1, 40, '#a7774a'); P_(0, 120, RMW, 2, '#946540'); P_(0, 157, RMW, 3, '#6d4a2e');
  // floor planks
  P_(0, 160, RMW, 20, '#c99a6b'); for (let y = 160; y < 180; y += 5) { P_(0, y, RMW, 1, '#b48654'); for (let x = (y / 5) % 2 ? 0 : 30; x < RMW; x += 60) P_(x, y, 1, 5, '#b48654'); }
  // rug
  for (let i = 0; i < 9; i++) { const w = 70 - Math.abs(4 - i) * 6; P_(132 - w / 2, 164 + i, w, 1, i % 4 === 0 ? '#d3dee6' : '#7f9cb3'); }
  // door
  P_(6, 66, 28, 94, '#7a5232'); P_(9, 69, 22, 91, '#8f6440'); P_(12, 74, 16, 30, '#7f5636'); P_(12, 110, 16, 44, '#7f5636'); P_(27, 112, 2, 4, '#e2c27f');
  // desk
  P_(40, 120, 110, 5, '#7a5232'); P_(40, 120, 110, 1, '#946540'); P_(43, 125, 4, 35, '#5a3d28'); P_(143, 125, 4, 35, '#5a3d28'); P_(100, 125, 44, 14, '#6d4a2e'); P_(103, 128, 38, 1, '#8a5f3c'); P_(120, 131, 4, 2, '#d9b483');
  // bunny PC: white case, ears, face, glass side panel with pink glow
  P_(46, 86, 26, 34, '#eef1f3'); P_(46, 86, 26, 1, '#ffffff'); P_(46, 86, 3, 34, '#d7dde1'); P_(50, 74, 6, 13, '#eef1f3'); P_(62, 74, 6, 13, '#eef1f3'); P_(52, 76, 2, 9, '#f3d6dc'); P_(64, 76, 2, 9, '#f3d6dc');
  P_(53, 99, 3, 3, '#263238'); P_(63, 99, 3, 3, '#263238'); P_(54, 99, 1, 1, '#ffffff'); P_(64, 99, 1, 1, '#ffffff'); P_(51, 103, 3, 2, '#f4a7b5'); P_(65, 103, 3, 2, '#f4a7b5'); P_(57, 104, 5, 1, '#263238'); P_(58, 105, 3, 4, '#e57373');
  // headphones hung on the PC
  P_(44, 92, 3, 10, '#2b2b2f'); P_(42, 98, 4, 8, '#2b2b2f');
  // monitors with CAD and PCB
  P_(76, 88, 34, 22, '#1f2328'); P_(78, 90, 30, 18, '#5d6e80'); P_(78, 90, 30, 2, '#8da0b2'); P_(84, 96, 16, 7, '#cfa45a'); P_(84, 96, 16, 2, '#e2c27f'); P_(82, 103, 20, 3, '#3b82c4'); P_(86, 97, 2, 2, '#7a5a2a'); P_(91, 97, 2, 2, '#7a5a2a'); P_(96, 97, 2, 2, '#7a5a2a'); P_(91, 110, 4, 8, '#2a2e33'); P_(86, 118, 14, 2, '#2a2e33');
  P_(112, 88, 34, 22, '#1f2328'); P_(114, 90, 30, 18, '#d9dde2'); P_(114, 90, 30, 2, '#3b6ea8'); P_(114, 92, 5, 16, '#eef1f4'); P_(115, 94, 3, 1, '#9aa4ae'); P_(115, 97, 3, 1, '#9aa4ae'); P_(115, 100, 3, 1, '#9aa4ae'); P_(124, 97, 12, 6, '#9aa7b3'); P_(124, 97, 12, 1, '#c3ccd5'); P_(126, 95, 8, 2, '#b6c0ca'); P_(129, 99, 3, 3, '#6f7c88'); P_(127, 110, 4, 8, '#2a2e33'); P_(122, 118, 14, 2, '#2a2e33');
  // keyboard + mouse + desk mat
  P_(76, 117, 58, 3, '#3a3f47'); P_(86, 116, 30, 2, '#cfd8dc'); for (let x = 87; x < 115; x += 3) P_(x, 116, 2, 1, '#9fb0b8'); P_(122, 116, 4, 2, '#e8eaed');
  // flowers in a vase
  P_(140, 110, 6, 10, '#f3f3f3'); P_(141, 104, 1, 6, '#5e8f52'); P_(144, 102, 1, 8, '#5e8f52'); P_(139, 101, 3, 3, '#e98aa6'); P_(143, 99, 3, 3, '#f2b5c6'); P_(145, 104, 2, 2, '#e98aa6');
  // shelf above desk with trophies
  P_(40, 54, 110, 4, '#7a5232'); P_(40, 54, 110, 1, '#946540'); P_(46, 58, 3, 4, '#5a3d28'); P_(141, 58, 3, 4, '#5a3d28');
  P_(82, 42, 10, 12, '#ffffff'); P_(82, 39, 3, 3, '#ffffff'); P_(89, 39, 3, 3, '#ffffff'); P_(84, 45, 1, 1, '#3949ab'); P_(89, 45, 1, 1, '#3949ab'); P_(86, 48, 2, 1, '#c9b8b8'); P_(91, 50, 4, 3, '#ffffff');
  P_(100, 46, 8, 8, '#e53935'); P_(100, 46, 4, 4, '#fdd835'); P_(104, 50, 4, 4, '#1e88e5'); P_(104, 46, 4, 4, '#43a047'); P_(100, 50, 4, 4, '#fb8c00'); P_(100, 49, 8, 1, '#111111'); P_(103, 46, 1, 8, '#111111');
  P_(114, 44, 22, 10, '#d7b06e'); P_(114, 44, 22, 1, '#e9c88a'); P_(118, 46, 8, 5, '#bfe0ef'); P_(129, 46, 2, 5, '#5c4a3a'); P_(132, 46, 2, 5, '#5c4a3a');
  // 3D printer on the floor
  P_(156, 124, 28, 36, '#2b2d31'); P_(158, 126, 24, 28, '#3d4046'); P_(156, 124, 28, 2, '#55595f'); P_(160, 148, 20, 3, '#9aa0a6'); P_(166, 136, 8, 4, '#e8833a'); P_(169, 140, 2, 6, '#c9cdd1'); P_(167, 146, 6, 2, '#47a668'); P_(160, 154, 20, 4, '#1f2124'); P_(162, 155, 4, 2, '#67d6a0');
  P_(162, 114, 14, 10, '#47a668'); P_(165, 116, 8, 6, '#2b2d31'); P_(168, 118, 2, 2, '#47a668');
  // photo wall: corkboard with pinned photos
  P_(160, 18, 56, 60, '#a8794a'); P_(162, 20, 52, 56, '#c99a6b'); for (let i = 0; i < 40; i++) P_(162 + Math.floor(rnd(i) * 52), 20 + Math.floor(rnd(i + 9) * 56), 1, 1, '#b8885a');
  [[166, 24, '#f2a541', '#2d3b66'], [188, 22, '#3d6a45', '#a6d3a0'], [168, 48, '#e98a5a', '#3a2a3a'], [190, 48, '#4f8cc2', '#e9f3fa']].forEach(([x, y, a, b], i) => { P_(x, y, 20, 22, '#fbfaf6'); P_(x + 2, y + 2, 16, 14, b); P_(x + 2, y + 10, 16, 6, a); P_(x + 9, y - 1, 2, 2, ['#e35d50', '#5b8ee6', '#f2c14e', '#47a668'][i]); });
  // car posters
  [[222, '#c8312c', '#15171b'], [260, '#1f2026', '#5d7896']].forEach(([x, body, roof], i) => { P_(x, 22, 34, 38, '#fbf6ee'); P_(x + 2, 24, 30, 34, i ? '#d9e6f2' : '#f4d9c6'); P_(x + 4, 44, 26, 6, body); P_(x + 9, 40, 14, 4, roof); P_(x + 10, 41, 12, 2, '#9cc8e8'); P_(x + 6, 49, 4, 4, '#111'); P_(x + 23, 49, 4, 4, '#111'); P_(x + 27, 44, 3, 1, '#fff7d6'); P_(x + 4, 28, 14, 2, '#3a2a20'); P_(x + 4, 31, 8, 1, '#7a5232'); });
  // window
  P_(304, 20, 46, 70, '#7a5232'); P_(307, 23, 40, 64, '#bfe0ef'); P_(326, 23, 2, 64, '#7a5232'); P_(307, 54, 40, 2, '#7a5232'); P_(302, 88, 50, 4, '#946540');
  P_(306, 22, 6, 68, '#d9c7e8'); P_(342, 22, 6, 68, '#d9c7e8');
  // workbench
  P_(196, 128, 98, 5, '#5a3d28'); P_(196, 128, 98, 1, '#7a5232'); P_(199, 133, 4, 27, '#4a3222'); P_(287, 133, 4, 27, '#4a3222'); P_(199, 148, 92, 3, '#4a3222');
  P_(198, 104, 94, 24, '#8a6243'); for (let x = 202; x < 290; x += 6) for (let y = 107; y < 126; y += 6) P_(x, y, 1, 1, '#6d4c33');
  P_(214, 108, 2, 8, '#9aa0a6'); P_(226, 110, 2, 6, '#9aa0a6'); P_(240, 107, 8, 2, '#c94f4f'); P_(240, 109, 2, 8, '#b0b6bb'); P_(258, 110, 6, 6, '#e8b04a');
  P_(200, 118, 20, 10, '#30343a'); P_(203, 120, 6, 4, '#e35d50'); P_(212, 120, 5, 5, '#9aa0a6'); P_(221, 112, 2, 16, '#b0b6bb'); P_(219, 111, 6, 2, '#9aa0a6'); P_(223, 113, 10, 1, '#d9b483');
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { P_(238 + c * 8, 114 + r * 6, 7, 5, '#7fb8d9'); P_(239 + c * 8, 115 + r * 6, 5, 1, '#b8dcef'); } P_(236, 113, 34, 1, '#3a4a5a'); P_(236, 126, 34, 2, '#3a4a5a');
  P_(274, 116, 10, 12, '#f2c14e'); P_(275, 117, 8, 4, '#2b2d31'); P_(278, 123, 2, 2, '#30343a'); P_(286, 120, 6, 8, '#1b5e20'); P_(287, 121, 1, 1, '#c9a227');
  // TV cabinet + TV + console
  P_(302, 140, 52, 20, '#7a5232'); P_(304, 142, 22, 16, '#8f6440'); P_(330, 142, 22, 16, '#8f6440'); P_(314, 150, 2, 2, '#e2c27f'); P_(340, 150, 2, 2, '#e2c27f');
  P_(306, 112, 44, 27, '#1f2328'); P_(308, 114, 40, 22, '#2f5f9e'); P_(308, 114, 40, 2, '#5d8fcf'); P_(326, 139, 4, 2, '#1f2328'); P_(334, 132, 12, 7, '#eceff1'); P_(336, 134, 3, 1, '#e35d50');
  // plant
  P_(290, 146, 10, 14, '#c27a4a'); P_(292, 132, 6, 14, '#4f9150'); P_(288, 136, 4, 8, '#6aad62'); P_(297, 134, 4, 9, '#6aad62');
})();
const RP = {x: 22, dir: 1, tx: null, after: null};
let hoverObj = null;
const roomLabel = document.createElement('div'); roomLabel.className = 'w-label w-room-label'; roomLabel.hidden = true; document.getElementById('world-labels').appendChild(roomLabel);
function girlSide(c, ox, oy, f, flip) {
  const S2 = 2, P_ = (x, y, w, h, k) => { const X = flip ? (24 - x - w) : x; R(c, ox + X * S2, oy + y * S2, w * S2, h * S2, k); };
  const HAIR = '#2a1a14', HAIR2 = '#4a2e22', SK = '#e8bfa0';
  P_(6, 3, 12, 3, HAIR); P_(5, 5, 14, 4, HAIR); P_(4, 8, 4, 14, HAIR); P_(16, 8, 4, 14, HAIR); P_(3, 11, 3, 9, HAIR); P_(18, 11, 3, 9, HAIR); P_(5, 20, 3, 4, HAIR); P_(16, 20, 3, 4, HAIR);
  [[6, 4], [10, 3], [14, 4], [5, 9], [18, 9], [4, 13], [19, 13], [5, 17], [18, 17]].forEach(([a, b]) => P_(a, b, 1, 1, HAIR2));
  P_(8, 7, 8, 8, SK); P_(8, 7, 3, 1, HAIR); P_(13, 7, 3, 1, HAIR); P_(8, 8, 1, 2, HAIR); P_(15, 8, 1, 2, HAIR);
  P_(9, 9, 2, 1, '#2a1a14'); P_(13, 9, 2, 1, '#2a1a14'); P_(9, 10, 2, 2, '#ffffff'); P_(13, 10, 2, 2, '#ffffff'); P_(10, 10, 1, 2, '#3b2418'); P_(14, 10, 1, 2, '#3b2418');
  P_(8, 12, 1, 1, '#f0b4a0'); P_(15, 12, 1, 1, '#f0b4a0'); P_(11, 13, 2, 1, '#b5605a'); P_(10, 15, 4, 2, '#d6a886');
  P_(7, 15, 3, 3, HAIR); P_(14, 15, 3, 3, HAIR); P_(3, 20, 4, 4, HAIR); P_(17, 20, 4, 4, HAIR); P_(4, 24, 2, 1, HAIR); P_(18, 24, 2, 1, HAIR);
  P_(7, 17, 10, 9, '#1f2126'); P_(8, 17, 8, 1, '#2c2f36'); P_(10, 17, 4, 1, '#d6a886'); P_(5, 18, 3, 3, '#1f2126'); P_(16, 18, 3, 3, '#1f2126'); P_(6, 21, 2, 5, SK); P_(16, 21, 2, 5, SK);
  P_(9, 26, 6, 3, '#4f6d8f');
  if (f === 0) { P_(9, 29, 2, 2, '#eceff1'); P_(13, 29, 2, 2, '#eceff1'); } else if (f === 1) { P_(9, 29, 2, 1, '#4f6d8f'); P_(8, 30, 3, 1, '#eceff1'); P_(13, 29, 2, 2, '#eceff1'); } else { P_(9, 29, 2, 2, '#eceff1'); P_(13, 29, 2, 1, '#4f6d8f'); P_(13, 30, 3, 1, '#eceff1'); }
  if (WSTATE.shades) { P_(8, 9, 4, 3, '#111111'); P_(12, 10, 1, 1, '#111111'); P_(13, 9, 4, 3, '#111111'); P_(9, 9, 1, 1, '#555555'); P_(14, 9, 1, 1, '#555555'); }
  if (WSTATE.hat) { const C_ = (x, y, w, h, k) => R(c, ox + x * S2, oy + y * S2, w * S2, h * S2, k); cap(C_, 12, 6, 8, 'front', performance.now()); }
}
function moeNap(c, ox, oy, now) {
  const P_ = (x, y, w, h, k) => R(c, ox + x, oy + y, w, h, k), b = reduce ? 0 : Math.floor(now / 900) % 2;
  P_(2, 14, 30, 3, 'rgba(0,0,0,.14)');
  P_(4, 5 - b, 22, 10 + b, '#f6e7d4'); P_(6, 4 - b, 18, 1, '#fbf2e6'); P_(20, 1, 12, 10, '#f6e7d4'); P_(21, -2, 3, 4, '#e9b98a'); P_(29, -2, 3, 4, '#e9b98a'); P_(22, 0, 1, 2, '#f3c6a0'); P_(30, 0, 1, 2, '#f3c6a0');
  P_(23, 4, 8, 5, '#e9b98a'); P_(23, 6, 3, 1, '#7a5a48'); P_(28, 6, 3, 1, '#7a5a48'); P_(26, 8, 2, 1, '#e98a9a');
  P_(0, 11, 10, 3, '#e9b98a'); P_(18, 13, 6, 2, '#e9b98a');
  if (!reduce && Math.floor(now / 1400) % 3 === 0) { P_(33, -6, 3, 1, '#ffffff'); P_(36, -10, 4, 1, '#ffffff'); }
  if (WSTATE.hat) moeCap(P_, 26, 0, now);
}
function roomResize() { cvFull(); SC = Math.max(2, Math.min(6, Math.floor(Math.min(innerWidth / RMW, (innerHeight - 160) / RMH)))); VW = Math.ceil(innerWidth / SC); VH = Math.ceil(innerHeight / SC); cv.width = VW; cv.height = VH; g.imageSmoothingEnabled = false; }
function roomCam() { const U = VH - Math.round(160 / SC); const cx = RMW <= VW ? Math.round((RMW - VW) / 2) : Math.max(0, Math.min(RMW - VW, Math.round(RP.x) - Math.round(VW / 2))); return {x: cx, y: Math.round((RMH - U) / 2) - 2}; }
function roomNearest() { let best = null, bd = 18; RO.forEach(o => { const d = Math.abs(o.stand - RP.x); if (d < bd) { bd = d; best = o; } }); return best; }
function roomOpen(o) {
  if (o.kind === 'arcade') { arcadeCard(); return; }
  if (o.kind === 'door') { exitRoom(); return; }
  if (o.kind === 'led') { ledCard(); return; }
  if (o.kind === 'gallery') { galleryCard(o); return; }
  openCard(Object.assign({}, o, {kind: 'room'}));
}
function galleryCard(o) {
  stopMini(); window.track && track('gallery_open', {gallery: o.gal});
  openId = o.id; cardAt = performance.now(); let i = 0; const list = GAL[o.gal];
  list.forEach(([src]) => { const im = new Image(); im.src = src; });
  card.innerHTML = `<div class="w-card-in" role="dialog" aria-labelledby="w-card-title"><button type="button" class="w-close" aria-label="Close">✕</button>
    <h2 id="w-card-title">${esc(o.title)}</h2><p class="w-meta">${esc(o.meta)}</p>
    <img class="w-img w-gal" src="${list[0][0]}" alt="${esc(list[0][1])}"><p class="w-cap"></p>
    <div class="w-actions"><button type="button" class="w-alt" id="g-prev">Previous</button><button type="button" class="w-go" id="g-next">Next</button></div></div>`;
  const im = card.querySelector('.w-img'), cap = card.querySelector('.w-cap');
  const show = () => { im.src = list[i][0]; im.alt = list[i][1]; cap.textContent = (o.gal === 'moe' ? '' : list[i][1] + ' · ') + (i + 1) + ' of ' + list.length; };
  show();
  card.querySelector('.w-close').addEventListener('click', closeCard);
  card.querySelector('#g-prev').addEventListener('click', () => { i = (i - 1 + list.length) % list.length; show(); });
  card.querySelector('#g-next').addEventListener('click', () => { i = (i + 1) % list.length; show(); });
  card.hidden = false; card.querySelector('#g-next').focus({preventScroll: true});
  // size the frame once, then keep it: every photo is fitted inside the same box
  const capOf = j => (o.gal === 'moe' ? '' : list[j][1] + ' · ') + (j + 1) + ' of ' + list.length;
  const lock = () => { im.style.height = ''; cap.style.minHeight = ''; let mh = 0; list.forEach((_, j) => { cap.textContent = capOf(j); mh = Math.max(mh, cap.offsetHeight); }); cap.textContent = capOf(i); cap.style.minHeight = mh + 'px'; fitCard(); const h = Math.round(im.getBoundingClientRect().height); im.style.height = h + 'px'; im.style.maxHeight = 'none'; };
  if (im.complete) requestAnimationFrame(lock); else im.addEventListener('load', lock, {once: true});
}
function roomStep(dt) {
  let v = 0; if (keys.has('left')) v -= 1; if (keys.has('right')) v += 1;
  if (v) RP.tx = null;
  if (!v && RP.tx != null) { const d = RP.tx - RP.x; if (Math.abs(d) < 2) { RP.tx = null; if (RP.after) { const o = RP.after; RP.after = null; roomOpen(o); } } else v = Math.sign(d); }
  P.moving = !!v;
  if (v) { RP.dir = v; RP.x = Math.max(12, Math.min(RMW - 14, RP.x + v * 140 * dt)); walkT += dt; }
  if (autoId) { const a = RO.find(o => o.id === autoId); if (!a || Math.abs(a.stand - RP.x) > 26) autoId = null; }
  const nn = roomNearest();
}
function drawRoomFront(now) {
  const cam = roomCam();
  g.fillStyle = '#2f2219'; g.fillRect(0, 0, VW, VH);
  g.drawImage(room, -cam.x, -cam.y);
  // window sky by time of day
  const sky = {day: ['#9fd0f0', '#cfe9f7'], dawn: ['#f2b8a0', '#f9dcb8'], dusk: ['#8a6aa8', '#f2a98a'], night: ['#1b2550', '#2d3b6a']}[PHASE];
  R(g, 307 - cam.x, 23 - cam.y, 19, 31, sky[0]); R(g, 328 - cam.x, 23 - cam.y, 19, 31, sky[0]); R(g, 307 - cam.x, 56 - cam.y, 19, 31, sky[1]); R(g, 328 - cam.x, 56 - cam.y, 19, 31, sky[1]);
  if (PHASE === 'night') { [[312, 30], [320, 40], [334, 28], [341, 44], [316, 62]].forEach(([x, y]) => R(g, x - cam.x, y - cam.y, 1, 1, '#ffffff')); R(g, 336 - cam.x, 34 - cam.y, 4, 4, '#f2f0dc'); }
  // LED strip under the shelf
  const seg = x => Math.min(5, Math.floor((x - 42) / 17.7)), lc = [0, 1, 2, 3, 4, 5].map(i => ledColor(i, now));
  for (let x = 42; x < 148; x += 3) R(g, x - cam.x, 58 - cam.y, 2, 1, `rgb(${lc[seg(x)]})`);
  // Moe + Jillanne
  moeNap(g, 116 - cam.x, 158 - cam.y, now); heartAt(142 - cam.x, 148 - cam.y, now);
  const f = P.moving && !reduce ? (Math.floor(walkT * 8) % 2) + 1 : 0, bob = !P.moving && !reduce && Math.floor(now / 500) % 2 ? 1 : 0;
  girlSide(g, Math.round(RP.x) - 24 - cam.x, FLOOR - 62 - cam.y + bob, f, RP.dir < 0);
  // hover outline
  if (hoverObj) { g.strokeStyle = 'rgba(255,248,225,.9)'; g.lineWidth = 1; g.strokeRect(hoverObj.x - cam.x - 1.5, hoverObj.y - cam.y - 1.5, hoverObj.w + 3, hoverObj.h + 3); }
  // lighting
  if (TINT) { g.globalAlpha = .7; g.fillStyle = TINT; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; }
  g.globalCompositeOperation = 'lighter';
  const k = (PHASE === 'night' ? .26 : PHASE === 'day' ? .12 : .2) * .85;
  for (let x = 46; x < 148; x += 16) { const [lr, lg, lb] = lc[seg(x)], gx = x - cam.x, gy = 59 - cam.y, gr = g.createRadialGradient(gx, gy, 0, gx, gy + 8, 24); gr.addColorStop(0, `rgba(${lr},${lg},${lb},${k})`); gr.addColorStop(1, `rgba(${lr},${lg},${lb},0)`); g.fillStyle = gr; g.fillRect(gx - 30, gy - 4, 60, 44); }
  [[93, 99, 26], [129, 99, 26], [328, 125, 30]].forEach(([x, y, r]) => { const gx = x - cam.x, gy = y - cam.y, gr = g.createRadialGradient(gx, gy, 0, gx, gy, r); gr.addColorStop(0, PHASE === 'night' ? 'rgba(150,200,255,.25)' : 'rgba(150,200,255,.1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(gx - r, gy - r, r * 2, r * 2); });
  if (PHASE !== 'night') { const gx = 327 - cam.x, gy = 55 - cam.y, gr = g.createRadialGradient(gx, gy, 0, gx, gy, 60); gr.addColorStop(0, 'rgba(255,240,200,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(gx - 60, gy - 60, 120, 120); }
  g.globalCompositeOperation = 'source-over';
  // DOM: hide world labels, show hover label + prompt
  labelNodes.forEach(n => n.hidden = true); iconNodes.forEach(([, im]) => im.hidden = true);
  if (hoverObj) { roomLabel.hidden = false; roomLabel.textContent = hoverObj.label; const lw = roomLabel.offsetWidth || 80; roomLabel.style.transform = `translate(${Math.round(Math.max(lw / 2 + 6, Math.min(innerWidth - lw / 2 - 6, (hoverObj.x + hoverObj.w / 2 - cam.x) * SC)))}px,${Math.round((hoverObj.y - 3 - cam.y) * SC)}px) translate(-50%,-100%)`; } else roomLabel.hidden = true;
  const n = roomNearest();
  if (n && card.hidden && RP.tx == null) { prompt.hidden = false; prompt.textContent = (touch ? 'Tap to ' : 'Press E to ') + (n.kind === 'door' ? 'go outside' : 'look at ' + n.label.toLowerCase()); const pw = prompt.offsetWidth || 160, rx = (RP.x - cam.x) * SC; prompt.style.transform = `translate(${Math.round(Math.max(pw / 2 + 8, Math.min(innerWidth - pw / 2 - 8, rx)))}px,${Math.round((FLOOR - 70 - cam.y) * SC)}px) translate(-50%,-100%)`; }
  else prompt.hidden = true;
  const mc = mini.getContext('2d'); mc.drawImage(miniBase, 0, 0); mc.fillStyle = '#d9644a'; mc.fillRect(worldPos.x / TS * MS - 3, worldPos.y / TS * MS - 4, 6, 6);
}
function roomHit(e) { const cam = roomCam(), x = e.clientX / SC + cam.x, y = e.clientY / SC + cam.y; return RO.find(o => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) || null; }
cv.addEventListener('pointermove', e => { if (scene !== 'room') { hoverObj = null; return; } hoverObj = roomHit(e); cv.style.cursor = hoverObj ? 'pointer' : 'default'; });

/* ---------------- state ---------------- */
let scene = 'world'; const worldPos = {x: 0, y: 0};
const cur = () => ({L, W: MW, H: MH, block, map});
const P = {x: 1 * TS + 10, y: 20 * TS + 10, dir: 'right', f: 0, moving: false, target: null, after: null, stuck: 0};
const trail = []; const moe = {x: P.x - 14, y: P.y + 6};
const keys = new Set();
let boat = null, boatCool = 0, landDir = 0, boat0dir = 0;
const visited = new Set(); let autoId = null;
let running = false, last = 0, tourIdx = -1, openId = null, walkT = 0, touch = matchMedia('(pointer: coarse)').matches;

function blockedAt(px, py) { const c = cur(), tx = Math.floor(px / TS), ty = Math.floor(py / TS); if (tx < 0 || ty < 0 || tx >= c.W || ty >= c.H) return true; return c.block[ty * c.W + tx] === 1; }
function feetBlocked(x, y) { return blockedAt(x - 3, y - 2) || blockedAt(x + 3, y - 2) || blockedAt(x - 3, y) || blockedAt(x + 3, y); }
function spotPx(l) { return {x: l.spot[0] * TS + 8, y: l.spot[1] * TS + 10}; }
function rectDist(l) { const x0 = l.tx * TS, y0 = l.ty * TS, x1 = (l.tx + l.w) * TS, y1 = (l.ty + l.h) * TS; const dx = Math.max(x0 - P.x, 0, P.x - x1), dy = Math.max(y0 - (P.y - 4), 0, (P.y - 4) - y1); return Math.hypot(dx, dy); }
function nearest(max = 18) { let best = null, bd = max; cur().L.forEach(l => { const d = Math.min(rectDist(l), Math.hypot(spotPx(l).x - P.x, spotPx(l).y - P.y)); if (d < bd) { bd = d; best = l; } }); return best; }

/* click-to-walk finds a route around buildings and trees instead of walking into them */
function passTile(x, y) { return x >= 0 && y >= 0 && x < MW && y < MH && !block[idx(x, y)] && tiles[idx(x, y)] !== T.OCEAN; }
function nearPass(x, y) { if (passTile(x, y)) return [x, y]; for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if ((Math.abs(dx) === r || Math.abs(dy) === r) && passTile(x + dx, y + dy)) return [x + dx, y + dy]; return null; }
function awayFromWater(q) { const wetAt = (px, py) => tiles[idx(Math.floor(px / TS), Math.floor(py / TS))] === T.WATER; if (wetAt(q.x, q.y)) return q; for (let k = 1; k <= 12; k++) { if (wetAt(q.x - k, q.y)) return {x: q.x - k + 13, y: q.y}; if (wetAt(q.x + k, q.y)) return {x: q.x + k - 13, y: q.y}; } return q; }
function findPath(x0, y0, x1, y1) {
  const s = nearPass(Math.floor(x0 / TS), Math.floor(y0 / TS)), e = nearPass(Math.floor(x1 / TS), Math.floor(y1 / TS)); if (!s || !e) return null;
  const N = MW * MH, g = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), done = new Uint8Array(N), open = [];
  const si = idx(s[0], s[1]), ei = idx(e[0], e[1]); g[si] = 0; open.push([Math.hypot(e[0] - s[0], e[1] - s[1]), si]);
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i; const [, cur] = open.splice(bi, 1)[0];
    if (done[cur]) continue; done[cur] = 1; if (cur === ei) break;
    const cx = cur % MW, cy = (cur / MW) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = cx + dx, ny = cy + dy; if (!passTile(nx, ny)) continue; if (dx && dy && (!passTile(cx + dx, cy) || !passTile(cx, cy + dy))) continue;
      const ni = idx(nx, ny), w = tiles[ni] === T.WATER ? 3 : 1, ng = g[cur] + (dx && dy ? 1.414 : 1) * w; if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; open.push([ng + Math.hypot(e[0] - nx, e[1] - ny), ni]); } }
  }
  if (from[ei] < 0 && ei !== si) return null;
  const tilesPath = []; for (let c = ei; c !== -1; c = from[c]) tilesPath.unshift(c);
  // drop water tiles (the boat crosses them) and keep only the corners of the route
  const pts = tilesPath.filter(i => tiles[i] !== T.WATER).map(i => awayFromWater({x: (i % MW) * TS + 8, y: ((i / MW) | 0) * TS + 10}));
  const clear = (a, b) => { const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4); for (let k = 0; k <= n; k++) { const x = a.x + (b.x - a.x) * k / n, y = a.y + (b.y - a.y) * k / n; if (feetBlocked(x, y) || tiles[idx(Math.floor(x / TS), Math.floor(y / TS))] === T.WATER) return false; } return true; };
  const out = []; let a = {x: x0, y: y0}, i = 0;
  while (i < pts.length) { let j = pts.length - 1; while (j > i && !clear(a, pts[j])) j--; out.push(pts[j]); a = pts[j]; i = j + 1; }
  return out;
}
function goTo(x, y, after) {
  ({x, y} = awayFromWater({x, y}));
  const path = findPath(P.x, P.y, x, y); P.stuck = 0; P.after = after || null; P.final = {x, y}; P.retried = false;
  if (path && path.length) { path[path.length - 1] = blockedAt(x, y) ? path[path.length - 1] : {x, y}; P.path = path; P.target = P.path.shift(); }
  else { P.path = null; P.target = {x, y}; }
}
function walkTo(l, open) { closeCard(); const s = spotPx(l); goTo(s.x, s.y, open ? l : null); }
function teleport(l, open) {
  closeCard(); const fade = document.getElementById('fade'); fade.classList.add('on');
  setTimeout(() => { if (scene === 'room') { scene = 'world'; resize(); } const s = spotPx(l); P.x = s.x; P.y = s.y; P.dir = 'up'; P.target = null; moe.x = P.x - 14; moe.y = P.y + 8; trail.length = 0; fade.classList.remove('on'); if (open) openCard(l); }, reduce ? 0 : 260);
}

/* ---------------- cards ---------------- */
const esc = s => s.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const CONTACT = `<div class="w-contact"><code id="w-email">j4yousse@uwaterloo.ca</code><a class="w-mailto" href="mailto:j4yousse@uwaterloo.ca">Email me</a><button type="button" class="w-copy" aria-label="Copy email address">Copy</button><span class="sr-only" role="status" id="w-copy-live"></span></div><p class="w-links"><a href="https://www.linkedin.com/in/jillanne-youssef/" target="_blank" rel="noopener">LinkedIn</a> <a href="${RES}" target="_blank" rel="noopener">Résumé (PDF)</a></p>`;
function enterRoom() {
  hideDrive(); closeCard(); const fade = document.getElementById('fade'); fade.classList.add('on');
  setTimeout(() => { worldPos.x = P.x; worldPos.y = P.y; scene = 'room'; window.track && track('enter_room'); resize(); RP.x = 22; RP.dir = 1; RP.tx = null; P.target = null; autoId = 'door'; trail.length = 0; fade.classList.remove('on'); }, reduce ? 0 : 260);
}
function exitRoom() {
  closeCard(); const fade = document.getElementById('fade'); fade.classList.add('on');
  WSTATE.moeHome = false;
  setTimeout(() => { scene = 'world'; resize(); const s = spotPx(L.find(l => l.id === 'cabin')); P.x = s.x; P.y = s.y + 6; P.dir = 'down'; P.target = null; autoId = 'cabin'; moe.x = P.x - 14; moe.y = P.y + 4; trail.length = 0; fade.classList.remove('on'); }, reduce ? 0 : 260);
}
function ledCard() {
  window.track && track('stop_open', {stop: 'room: led strip'});
  autoId = 'led';
  miniCard('led', {title: 'The LED controller', meta: 'A tiny copy of the one I built at Tesla', mini: 'led', proj: 'led', more: 'Read how I built it', blurb: ['Same presets as the lighting studio. Whatever you pick stays on around the map until you refresh.']});
}
/* mini experiences live in minis.js, loaded once the game opens */
let minisP = null, miniInst = null;
function loadMinis() { return minisP || (minisP = new Promise((res, rej) => { if (window.Minis) { res(window.Minis); return; } const sc = document.createElement('script'); sc.src = 'minis.js?v=12'; sc.onload = () => res(window.Minis); sc.onerror = () => { minisP = null; rej(); }; document.head.appendChild(sc); })); }
const MCTX = {reduce, get touch() { return touch; }, led, ledColor, state: WSTATE, girl, moeSprite,
  tone: (...a) => window.__tone && window.__tone(...a), motor: om => window.__motor && window.__motor.set(om), thock: (v, p) => window.__thock && window.__thock(v, p), chime: () => window.__sfx && window.__sfx('open'), meow: () => window.__meow && window.__meow()};
function stopMini() { window.__motor && window.__motor.stop(); if (miniInst) { try { miniInst.stop(); } catch (e) {} miniInst = null; } }
/* shrink the picture or toy so the whole card fits on screen without scrolling */
function fitCard() {
  const inn = card.querySelector('.w-card-in'); if (!inn || card.hidden) return;
  const el = inn.querySelector('.w-mini:not([hidden]) canvas') || inn.querySelector('.w-img:not([hidden])'); if (!el) return;
  el.style.width = ''; el.style.maxHeight = '';
  for (let k = 0; k < 3; k++) {
    const over = inn.scrollHeight - inn.clientHeight; if (over <= 0) break;
    const h = el.getBoundingClientRect().height, nh = Math.max(96, Math.floor(h - over - 4));
    if (el.tagName === 'CANVAS') el.style.width = Math.floor(nh * el.width / el.height) + 'px'; else el.style.maxHeight = (nh - (el.offsetHeight - el.clientHeight)) + 'px';
  }
  snapCv(el);
}
/* pixel canvases look crisp at whole-number scales; snap down to one when it's at least 2x */
function snapCv(el) { if (el.tagName !== 'CANVAS' || !el.dataset.snap) return; const lw = +el.dataset.snap, bw = el.offsetWidth - el.clientWidth, k = Math.floor((el.getBoundingClientRect().width - bw) / lw); if (k >= 2) el.style.width = (k * lw + bw) + 'px'; }
addEventListener('resize', () => requestAnimationFrame(fitCard));
function miniCard(id, c) {
  stopMini(); openId = id; cardAt = performance.now();
  const more = c.proj ? `<button type="button" class="w-more" data-proj="${c.proj}">${esc(c.more || 'Read the full story')}${touch ? '' : ' <span class="w-key">E</span>'}</button>` : '';
  card.innerHTML = `<div class="w-card-in has-mini" role="dialog" aria-labelledby="w-card-title"><button type="button" class="w-close" aria-label="Close">✕</button>
    <h2 id="w-card-title">${esc(c.title)}</h2><p class="w-meta">${esc(c.meta)}</p>${(c.blurb || []).map(b => `<p class="w-blurb">${esc(b)}</p>`).join('')}
    ${c.tabs ? `<div class="w-tabs" role="tablist">${c.tabs.map(([k, lab], i) => `<button type="button" role="tab" class="w-tab" data-tab="${k}" aria-selected="${i === 0}">${esc(lab)}</button>`).join('')}</div>` : ''}<div class="w-mini" data-mini="${c.mini}"></div>${c.img ? `<img class="w-img w-photo" hidden src="${c.img}" alt="${esc(c.imgAlt || '')}">` : ''}
    <div class="w-ctl"></div>
    ${c.img || more ? `<div class="w-actions w-foot">${c.img ? `<button type="button" class="w-alt" data-photo>${esc(c.photo)}</button>` : ''}${more}</div>` : ''}</div>`;
  card.hidden = false;
  card.querySelector('.w-close').addEventListener('click', closeCard);
  card.querySelectorAll('[data-proj]').forEach(b => b.addEventListener('click', () => { closeCard(); window.__openProject && window.__openProject(b.dataset.proj); }));
  const ph = card.querySelector('[data-photo]');
  if (ph) ph.addEventListener('click', () => { const im = card.querySelector('.w-photo'), mi = card.querySelector('.w-mini'), ct = card.querySelector('.w-ctl'), show = im.hidden; im.hidden = !show; mi.hidden = ct.hidden = show; ph.textContent = show ? 'Back to the toy' : c.photo; if (show && !im.complete) im.onload = fitCard; fitCard(); });
  card.querySelector('.w-close').focus({preventScroll: true});
  const host = card.querySelector('.w-mini'), ctl = card.querySelector('.w-ctl');
  const startMini = (M, key) => { stopMini(); host.innerHTML = ''; ctl.innerHTML = ''; miniInst = M[key](host, ctl, MCTX); fitCard(); requestAnimationFrame(fitCard); };
  card.querySelectorAll('.w-tab').forEach(t => t.addEventListener('click', () => { card.querySelectorAll('.w-tab').forEach(o => o.setAttribute('aria-selected', String(o === t))); const tb = c.tabs.find(x => x[0] === t.dataset.tab), mo = card.querySelector('.w-more'); if (mo && tb[2]) mo.dataset.proj = tb[2]; loadMinis().then(M => { if (openId === id && host.isConnected) startMini(M, t.dataset.tab); }); window.__sfx && window.__sfx('open'); }));
  loadMinis().then(M => { if (openId !== id || !host.isConnected || !M[c.mini]) return; startMini(M, c.mini); }).catch(() => { ctl.innerHTML = '<p class="w-hint">This one didn’t load. Try closing and opening it again.</p>'; });
}
function openCard(l) {
  window.track && l && track('stop_open', {stop: l.id});
  if (l.kind === 'nsx' || l.kind === 'c5') { window.track && track('car_rev', {car: l.kind}); autoId = l.id; window.__engine && window.__engine(l.kind); showDrive(l.kind); return; }
  if (l.kind === 'cabin') { enterRoom(); return; }
  if (l.kind === 'door') { exitRoom(); return; }
  if (l.kind === 'led') { ledCard(); return; }
  openId = l.id; autoId = l.id; cardAt = performance.now(); if (l.tour) { visited.add(l.id); labelNodes[L.indexOf(l)].classList.add('w-visited'); if (visited.size === TOUR.length && !allSent) { allSent = true; window.track && track('game_all_stops_visited'); } }
  if (l.kind === 'nsx' || l.kind === 'c5') { const n = carClicks[l.kind]++ % 3; if (n === 0) pops[l.kind] = 1; else if (n === 1) { pops[l.kind] = 1; window.__engine && window.__engine(l.kind); } else pops[l.kind] = 0; }
  const c = l.card === 'contact' ? {title: 'Say hi', meta: 'Mailbox', body: ["I'm looking for a Summer 2027 internship in mechanical or product design."], contact: true} : l.card;
  if (c.mini) { miniCard(l.id, Object.assign({proj: l.id}, c)); if (TOUR.includes(l)) { tourIdx = TOUR.indexOf(l); updateTour(); } window.__sfx && window.__sfx('open'); return; }
  stopMini();
  const tourBits = '';
  card.innerHTML = `<div class="w-card-in" role="dialog" aria-modal="false" aria-labelledby="w-card-title">
    <button type="button" class="w-close" aria-label="Close">✕</button>${tourBits}
    <h2 id="w-card-title">${esc(c.title)}</h2><p class="w-meta">${esc(c.meta)}</p>
    ${(c.body || []).map(b => `<p>${esc(b)}</p>`).join('')}
    ${c.projects ? `<div class="w-projlist">${c.projects.map(([id, t]) => `<button type="button" class="tw-link" data-proj="${id}">${esc(t)}</button>`).join('')}</div>` : ''}${c.img ? `<img class="w-img" src="${c.img}" alt="${esc(c.imgAlt || '')}">${c.imgCap ? `<p class="w-cap">${esc(c.imgCap)}</p>` : ''}` : ''}${c.contact ? CONTACT : ''}${c.note ? `<p class="w-note">${esc(c.note)}</p>` : ''}
    ${l.id === 'teslalight' ? `<button type="button" class="w-more" data-proj="led">Read the LED controller story${touch ? '' : ' <span class="w-key">E</span>'}</button>` : l.tour && l.id !== 'next' ? `<button type="button" class="w-more" data-proj="${l.id}">Read the full story${touch ? '' : ' <span class="w-key">E</span>'}</button>` : ''}</div>`;
  card.hidden = false;
  card.querySelector('.w-close').addEventListener('click', closeCard);
  card.querySelectorAll('[data-proj]').forEach(b => b.addEventListener('click', () => { closeCard(); window.__openProject && window.__openProject(b.dataset.proj); }));
  const cp = card.querySelector('.w-copy'); if (cp) cp.addEventListener('click', async () => { try { await navigator.clipboard.writeText('j4yousse@uwaterloo.ca'); cp.textContent = 'Copied'; say('Email address copied.'); } catch { const r = document.createRange(); r.selectNodeContents(card.querySelector('#w-email')); getSelection().removeAllRanges(); getSelection().addRange(r); cp.textContent = 'Selected'; say('Couldn’t copy. The address is selected: j4yousse@uwaterloo.ca'); } function say(t) { const lv = card.querySelector('#w-copy-live'); if (lv) { lv.textContent = ''; setTimeout(() => { lv.textContent = t; }, 50); } } });
  card.querySelector('.w-close').focus({preventScroll: true});
  if (TOUR.includes(l)) { tourIdx = TOUR.indexOf(l); updateTour(); }
  if (!(l.kind === 'nsx' || l.kind === 'c5')) window.__sfx && window.__sfx('open');
}
/* ---------------- arcade: a tiny runner on the TV ---------------- */
let arc = null;
function arcadeCard() {
  stopMini(); window.track && track('arcade_open');
  openId = 'arcade'; cardAt = performance.now();
  let best = 0; try { best = +localStorage.getItem('jy-runner-best') || 0; } catch (e) {}
  card.innerHTML = `<div class="w-card-in" role="dialog" aria-labelledby="w-card-title"><button type="button" class="w-close" aria-label="Close">✕</button>
    <h2 id="w-card-title">Commute</h2><p class="w-meta">${touch ? 'Tap the screen to jump' : 'Space or ↑ to jump · Esc to leave'}</p>
    <div style="position:relative"><canvas id="rn" width="240" height="84" style="display:block;width:100%;image-rendering:pixelated;background:#cfe9f7;border:3px solid var(--panel-edge);cursor:pointer;touch-action:manipulation"></canvas><div id="rn-msg" style="position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);font:600 15px var(--f-pixel);color:#fff;background:rgba(31,35,40,.82);padding:7px 14px;border-radius:999px;white-space:nowrap;pointer-events:none"></div></div>
    <p class="w-cap" id="rn-s" style="margin-top:8px">Score 0 · Best ${best}</p></div>`;
  card.hidden = false;
  card.querySelector('.w-close').addEventListener('click', closeCard);
  const c = card.querySelector('#rn'), x = c.getContext('2d'), out = card.querySelector('#rn-s');
  const GY = 70;
  arc = {c, x, out, msg: card.querySelector('#rn-msg'), best, y: 0, vy: 0, obs: [], t: 0, sp: 90, score: 0, over: false, started: false, last: performance.now(), f: 0, spawn: 1};
  const jump = () => { if (arc.over) { Object.assign(arc, {obs: [], y: 0, vy: 0, sp: 90, score: 0, over: false, spawn: 1}); return; } arc.started = true; if (arc.y === 0) arc.vy = 185; };
  arc.jump = jump;
  c.addEventListener('pointerdown', e => { e.preventDefault(); jump(); });
  const P = (px, py, w, h, k) => { x.fillStyle = k; x.fillRect(Math.round(px), Math.round(py), w, h); };
  function frame(now) {
    if (!arc || openId !== 'arcade') return;
    const dt = Math.min(.04, (now - arc.last) / 1000); arc.last = now;
    if (arc.started && !arc.over) {
      arc.vy -= 520 * dt; arc.y = Math.max(0, arc.y + arc.vy * dt); if (arc.y === 0) arc.vy = 0;
      arc.sp += dt * 3; arc.score += dt * 10; arc.spawn -= dt;
      if (arc.spawn <= 0) { arc.obs.push({x: 250, k: Math.random() < .6 ? 'cone' : 'box'}); arc.spawn = .9 + Math.random() * 1.1 - Math.min(.4, arc.sp / 600); }
      arc.obs.forEach(o => o.x -= arc.sp * dt); arc.obs = arc.obs.filter(o => o.x > -20);
      if (arc.obs.some(o => o.x < 40 && o.x + (o.k === 'cone' ? 8 : 12) > 26 && arc.y < (o.k === 'cone' ? 11 : 9))) {
        arc.over = true; if (arc.score > arc.best) { arc.best = Math.floor(arc.score); try { localStorage.setItem('jy-runner-best', arc.best); } catch (e) {} }
      }
      arc.f += dt * 10;
    }
    P(0, 0, 240, 84, '#cfe9f7'); P(170, 10, 18, 4, '#ffffff'); P(174, 7, 10, 3, '#ffffff'); P(40, 16, 14, 3, '#ffffff');
    P(0, GY, 240, 14, '#8fca7c'); P(0, GY, 240, 2, '#6fae5f');
    for (let i = 0; i < 240; i += 12) P((i - (arc.t += 0) - (arc.score * 4) % 12 + 240) % 240, GY + 7, 4, 1, '#6fae5f');
    arc.obs.forEach(o => { if (o.k === 'cone') { P(o.x + 3, GY - 11, 2, 2, '#f08a24'); P(o.x + 2, GY - 9, 4, 3, '#f08a24'); P(o.x + 2, GY - 6, 4, 1, '#ffffff'); P(o.x + 1, GY - 5, 6, 3, '#f08a24'); P(o.x, GY - 2, 8, 2, '#c4651a'); } else { P(o.x, GY - 9, 12, 9, '#a8794e'); P(o.x, GY - 9, 12, 2, '#c4935f'); P(o.x + 5, GY - 9, 2, 9, '#6e4a2c'); } });
    P(25, GY - 1, 13, 2, 'rgba(0,0,0,.18)');
    girl(x, 22, GY - 26 - Math.round(arc.y), 'right', arc.started && !arc.over && arc.y === 0 ? (Math.floor(arc.f) % 2) + 1 : 0, true);
    arc.msg.hidden = arc.started && !arc.over; arc.msg.textContent = !arc.started ? (touch ? 'Tap to start' : 'Press Space to start') : 'Bonk! ' + (touch ? 'Tap' : 'Press Space') + ' to try again';
    arc.out.textContent = `Score ${Math.floor(arc.score)} · Best ${arc.best}`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  card.querySelector('#rn').focus && c.setAttribute('tabindex', '0');
}
let cardAt = 0, allSent = false;
function closeCard() { stopMini(); if (openId && cardAt) { const s = Math.round((performance.now() - cardAt) / 1000); window.track && s > 0 && track('stop_time', {stop: openId, seconds: s, value: s}); cardAt = 0; } if (openId === 'arcade' && arc) { window.track && track('arcade_score', {score: Math.floor(arc.best || 0), value: Math.floor(arc.best || 0)}); arc = null; } if (!card.hidden) { card.hidden = true; openId = null; cv.focus({preventScroll: true}); } }

/* ---------------- tour + bar ---------------- */
const tourPos = document.getElementById('tour-pos');
function updateTour() { tourPos.textContent = tourIdx < 0 ? 'Follow the path · 2022 → 2027' : `Stop ${tourIdx + 1} of ${TOUR.length}: ${TOUR[tourIdx].label}`; document.getElementById('tour-prev').disabled = tourIdx <= 0; document.getElementById('tour-next').textContent = tourIdx < 0 ? 'Start tour' : tourIdx >= TOUR.length - 1 ? 'Restart' : 'Next stop'; }
document.getElementById('tour-next').addEventListener('click', () => { tourIdx = tourIdx >= TOUR.length - 1 ? 0 : tourIdx + 1; updateTour(); window.track && track('tour_step', {stop: TOUR[tourIdx].id, step: tourIdx + 1}); teleport(TOUR[tourIdx], true); });
document.getElementById('tour-prev').addEventListener('click', () => { if (tourIdx > 0) { tourIdx--; updateTour(); teleport(TOUR[tourIdx], true); } });
document.getElementById('go-contact').addEventListener('click', () => { if (scene === 'room') closeCard(); openCard(L.find(l => l.id === 'mail')); });
mini.parentElement.addEventListener('click', () => openBig());
mini.parentElement.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openBig(); } });
updateTour();
const big = document.getElementById('bigmap'), bigImg = document.getElementById('bigmap-img');
function openBig() {
  window.track && track('big_map');
  bigImg.width = map.width / 2; bigImg.height = map.height / 2; const x = bigImg.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(map, 0, 0, bigImg.width, bigImg.height);
  big.hidden = false; big.querySelector('.bm-pins').innerHTML = '';
  // numbered markers on the map + a list of destinations (no overlapping labels, easy to tap)
  const list = big.querySelector('.bm-list'); list.innerHTML = '';
  L.forEach(l => { if (['mail'].includes(l.id)) return;
    const key = l.tour ? String(l.tour) : l.id === 'cabin' ? 'H' : l.label.charAt(0), name = l.yr ? `${l.label} · ${l.yr}` : l.label;
    const go = () => { big.hidden = true; if (TOUR.includes(l)) { tourIdx = TOUR.indexOf(l); updateTour(); } teleport(l, true); };
    const d = document.createElement('button'); d.type = 'button'; d.className = 'bm-dot' + (l.tour ? ' stop' : ''); d.textContent = key; d.title = name; d.setAttribute('aria-label', name); d.tabIndex = -1;
    d.style.left = ((l.tx + l.w / 2) / MW * 100) + '%'; d.style.top = (l.ty / MH * 100) + '%'; d.addEventListener('click', go); big.querySelector('.bm-pins').appendChild(d);
    const li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; b.className = 'bm-pin' + (l.tour ? ' stop' : ''); b.innerHTML = `<i aria-hidden="true">${key}</i><span>${l.label}${l.yr ? `<small>${l.yr}</small>` : ''}</span>`; b.addEventListener('click', go);
    ['mouseenter', 'focus'].forEach(k => b.addEventListener(k, () => d.classList.add('on'))); ['mouseleave', 'blur'].forEach(k => b.addEventListener(k, () => d.classList.remove('on')));
    li.appendChild(b); list.appendChild(li); });
  const you = document.createElement('i'); you.className = 'bm-you'; you.style.left = (P.x / TS / MW * 100) + '%'; you.style.top = (P.y / TS / MH * 100) + '%'; big.querySelector('.bm-pins').appendChild(you);
  big.querySelector('.bm-close').focus();
}
document.getElementById('map-toggle').addEventListener('click', openBig);
big.querySelector('.bm-close').addEventListener('click', () => { big.hidden = true; });
big.addEventListener('click', e => { if (e.target === big) big.hidden = true; });
document.querySelectorAll('#tod button').forEach(b => b.addEventListener('click', () => setPhase(b.dataset.p)));
setPhase('auto');

/* ---------------- input ---------------- */
const KEYMAP = {ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right'};
addEventListener('keydown', e => {
  if (!running || !document.getElementById('proj').hidden) return;
  if (scene === 'track') { if (KEYMAP[e.key]) { e.preventDefault(); keys.add(KEYMAP[e.key]); } return; }
  if (openId === 'arcade' && !card.hidden && arc) { if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key)) { e.preventDefault(); arc.jump(); return; } if (e.key !== 'Escape') { if (KEYMAP[e.key]) e.preventDefault(); return; } }
  if (e.key === 'Escape') { if (!big.hidden) big.hidden = true; else if (!card.hidden) closeCard(); return; }
  // with a card open, E reads the full story (or closes the card if there isn't one)
  if ((e.key === 'e' || e.key === 'E') && !card.hidden && !(e.target.closest && e.target.closest('input'))) { e.preventDefault(); const more = card.querySelector('.w-more'); if (more) more.click(); else closeCard(); return; }
  if (e.target.closest && e.target.closest('input,textarea')) return;
  if (KEYMAP[e.key]) { e.preventDefault(); keys.add(KEYMAP[e.key]); P.target = null; P.path = null; if (!card.hidden) closeCard(); }
  else if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') && card.hidden && (document.activeElement === cv || e.key === 'e' || e.key === 'E') && scene === 'room') { const o = roomNearest(); if (o) { e.preventDefault(); roomOpen(o); } }
  else if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') && card.hidden && (document.activeElement === cv || e.key === 'e' || e.key === 'E')) { const n = nearest(); if (n) { e.preventDefault(); openCard(n); } }
  else if (e.key === 'm' || e.key === 'M') { if (big.hidden) openBig(); else big.hidden = true; }
});
addEventListener('keyup', e => { if (KEYMAP[e.key]) keys.delete(KEYMAP[e.key]); });
addEventListener('blur', () => keys.clear());
cv.addEventListener('pointerdown', e => {
  touch = e.pointerType === 'touch'; closeCard();
  if (scene === 'room') { const o = roomHit(e), cam = roomCam(); if (o && o.id === 'moe') { window.__meow && window.__meow(); moeHeart = performance.now(); } if (o && Math.abs(o.stand - RP.x) < 20) { roomOpen(o); return; } RP.tx = o ? o.stand : Math.max(12, Math.min(RMW - 14, e.clientX / SC + cam.x)); RP.after = o && o.id === 'moe' ? o : null; return; }
  const cam = camera(); const wx = (e.clientX - offX) / SC + cam.x, wy = (e.clientY - offY) / SC + cam.y;
  const mo = scene === 'room' ? {x: roomMoe.x + 8, y: roomMoe.y + 10} : moe;
  if (!WSTATE.moeHome && Math.hypot(wx - mo.x, wy - (mo.y - 10)) < 17) { window.__meow && window.__meow(); moeHeart = performance.now(); return; }
  const hit = cur().L.find(l => wx >= l.tx * TS - 4 && wx <= (l.tx + l.w) * TS + 4 && wy >= l.ty * TS - 8 && wy <= (l.ty + l.h) * TS + 4);
  if (hit) { if (hit.kind !== 'nsx' && hit.kind !== 'c5' && rectDist(hit) < 26) openCard(hit); else walkTo(hit, true); return; }
  goTo(wx, wy);
});
cv.addEventListener('pointermove', e => { if (scene !== 'world' || !(e.buttons & 1) || e.pointerType === 'touch' && !e.isPrimary) return; const cam = camera(); P.target = {x: (e.clientX - offX) / SC + cam.x, y: (e.clientY - offY) / SC + cam.y}; P.path = null; P.after = null; P.stuck = 0; });
prompt.addEventListener('click', () => { if (scene === 'room') { const o = roomNearest(); if (o) roomOpen(o); return; } const n = nearest(); if (n) openCard(n); });

/* ---------------- loop ---------------- */
function camera() {
  const px = Math.round(P.x), py = Math.round(P.y);
  const c = cur();
  if (scene === 'room') { const U = VH - Math.round(150 / SC), rw = c.W * TS, rh = c.H * TS; const cx = rw <= VW ? Math.round((rw - VW) / 2) : Math.max(0, Math.min(rw - VW, px - Math.round(VW / 2))); const cy = rh <= U ? Math.round((rh - U) / 2) - 4 : Math.max(0, Math.min(rh - U, py - Math.round(U / 2))); return {x: cx, y: cy}; }
  const ax = c.W * TS - VW, y0 = 0, y1 = Math.min(c.H * TS - VH + PADB, map.height - VH);
  return {x: ax <= 0 ? Math.round(ax / 2) : Math.max(0, Math.min(ax, px - Math.round(VW / 2))), y: y1 <= y0 ? Math.round((y0 + y1) / 2) : Math.round(Math.max(y0, Math.min(y1, py - (VH - PADB + PADT) / 2)))};
}
function step(now) {
  if (!running) return;
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (scene === 'room') { roomStep(dt); drawRoomFront(now); requestAnimationFrame(step); return; }
  if (scene === 'track') { trackStep(dt); drawTrack(now); requestAnimationFrame(step); return; }
  // pop-up headlights rise when you walk up to a car and drop a minute after you leave
  ['nsx', 'c5'].forEach(k => { const c = L.find(o => o.id === k), near = rectDist(c) < 40; if (near) { pops[k] = 1; popT[k] = now; } else if (pops[k] && now - popT[k] > 60000) pops[k] = 0; });
  if (driveFor && Math.hypot(spotPx(L.find(o => o.id === driveFor)).x - P.x, spotPx(L.find(o => o.id === driveFor)).y - P.y) > 90) hideDrive();
  let vx = 0, vy = 0;
  if (keys.has('left')) vx -= 1; if (keys.has('right')) vx += 1; if (keys.has('up')) vy -= 1; if (keys.has('down')) vy += 1;
  if (!vx && !vy && P.target) {
    const dx = P.target.x - P.x, dy = P.target.y - P.y, d = Math.hypot(dx, dy);
    if (d < 3) { if (P.path && P.path.length) P.target = P.path.shift(); else { P.target = null; P.path = null; if (P.after) { const l = P.after; P.after = null; openCard(l); } } }
    else { vx = dx / d; vy = dy / d; }
  }
  if (boat) {
    boat.t = Math.min(1, boat.t + dt / boat.dur);
    const e = boat.t < .5 ? 2 * boat.t * boat.t : 1 - Math.pow(-2 * boat.t + 2, 2) / 2;
    P.x = Math.round(boat.x0 + (boat.x1 - boat.x0) * e); P.y = Math.round(boat.y0 + (boat.y1 - boat.y0) * Math.min(1, boat.t * 1.6)); P.dir = boat.x1 > boat.x0 ? 'right' : 'left'; P.moving = false;
    moe.x = P.x + (boat.x1 > boat.x0 ? -12 : 12); moe.y = P.y + 2; trail.length = 0;
    const st = Math.floor(boat.t * 3); if (st > boat.strokes && boat.t < .95) { boat.strokes = st; window.__splash && window.__splash(.55); }
    if (boat.t >= 1) { const tg = P.target; boat = null; boatCool = .8; const keep = tg && !(scene === 'world' && tiles[idx(Math.floor(tg.x / TS), Math.floor(tg.y / TS))] === T.WATER) && (tg.x - P.x) * boat0dir >= -4; if (!keep) { if (P.path && P.path.length) { while (P.path.length > 1 && (P.path[0].x - P.x) * boat0dir < 0) P.path.shift(); P.target = P.path.shift(); } else { P.target = null; P.after = null; } } P.stuck = 0; }
    draw(now); requestAnimationFrame(step); return;
  }
  const sp = 175 * dt, len = Math.hypot(vx, vy) || 1;
  P.moving = !!(vx || vy);
  if (P.moving) {
    vx = vx / len * sp; vy = vy / len * sp;
    P.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
    const ox = P.x, oy = P.y;
    const wet = (x, y) => scene === 'world' && tiles[idx(Math.floor(x / TS), Math.floor(y / TS))] === T.WATER;
    boatCool = Math.max(0, boatCool - dt);
    const rxNow = riverX(Math.floor(P.y / TS)) * TS + 8, across = P.target && (P.x - rxNow) * (P.target.x - rxNow) < 0, sx = across ? Math.sign(rxNow - P.x) : Math.sign(vx);
    if (!boatCool && !wet(P.x, P.y) && (P.target ? across : Math.abs(vx) > Math.abs(vy) * .25) && [8, 16, 24, 30].some(k => wet(P.x + sx * k, P.y))) {
      const ty = Math.floor(P.y / TS), rx = riverX(ty) * TS + 8, dirR = P.x < rx ? 1 : -1;
      let tx = Math.floor(P.x / TS) + dirR; while (tx > 0 && tx < MW - 1 && tiles[idx(tx, ty)] === T.WATER) tx += dirR;
      const okLand = (x, y) => y > 0 && y < MH - 1 && tiles[idx(x, y)] !== T.WATER && tiles[idx(x, y)] !== T.OCEAN && !block[idx(x, y)] && !block[idx(x + dirR, y)];
      let ly = null; let x0 = Math.floor(P.x / TS); for (let k = 0; k < 4 && tiles[idx(x0, ty)] !== T.WATER; k++) x0 += dirR; for (const d of [0, 1, -1, 2, -2, 3, -3]) { let x = x0; while (x > 0 && x < MW - 1 && tiles[idx(x, ty + d)] === T.WATER) x += dirR; if (okLand(x, ty + d)) { ly = ty + d; tx = x; break; } }
      if (ly != null && tx > 0 && tx < MW - 1 && (tx - x0) * dirR > 0) { boat = {x0: P.x, x1: tx * TS + 8 + dirR * 7, y0: P.y, y1: ly * TS + 10, t: 0, dur: Math.max(.7, Math.abs(tx * TS - P.x) / 150), strokes: 0}; P.stuck = 0; boat0dir = dirR; window.__splash && window.__splash(1); window.__water && window.__water(boat.dur); }
    }
    if (!boat) {
      const okX = !feetBlocked(P.x + vx, P.y) && !wet(P.x + vx + Math.sign(vx) * 11, P.y), okY = !feetBlocked(P.x, P.y + vy) && !wet(P.x, P.y + vy + Math.sign(vy) * 3) && !wet(P.x - 11, P.y + vy) && !wet(P.x + 11, P.y + vy);
      if (okX) P.x += vx; if (okY) P.y += vy;
      // blocked head-on: nudge sideways toward the nearer open side so corners don't snag
      if (!okX && vx && Math.abs(vx) >= Math.abs(vy) && feetBlocked(P.x + vx, P.y)) { for (let k = 1; k <= 8; k++) { if (!feetBlocked(P.x + vx, P.y - k)) { P.y -= Math.min(k, sp); break; } if (!feetBlocked(P.x + vx, P.y + k)) { P.y += Math.min(k, sp); break; } } }
      if (!okY && vy && Math.abs(vy) > Math.abs(vx) && feetBlocked(P.x, P.y + vy)) { for (let k = 1; k <= 8; k++) { if (!feetBlocked(P.x - k, P.y + vy)) { P.x -= Math.min(k, sp); break; } if (!feetBlocked(P.x + k, P.y + vy)) { P.x += Math.min(k, sp); break; } } }
    }
    if (P.target && !across && Math.hypot(P.x - ox, P.y - oy) < sp * .2) { P.stuck += dt; if (P.stuck > .35 && P.final && !P.retried) { const f = P.final, a = P.after; goTo(f.x, f.y, a); P.retried = true; } else if (P.stuck > .35) { const l = P.after; P.target = null; P.after = null; if (l && Math.hypot(spotPx(l).x - P.x, spotPx(l).y - P.y) < 60) openCard(l); } } else P.stuck = 0;
    walkT += dt; trail.push([P.x, P.y]); if (trail.length > 60) trail.shift();
  }
  // Moe follows a few steps behind (outside only)
  if (scene === 'world') {
  const tg = trail.length > 12 ? trail[trail.length - 12] : [P.x - 18, P.y + 6];
  const mdx = tg[0] - moe.x, mdy = tg[1] - moe.y, md = Math.hypot(mdx, mdy);
  moe.moving = md > 14;
  if (md > 14) { moe.x += mdx / md * Math.min(md - 14, 185 * dt); moe.y += mdy / md * Math.min(md - 14, 185 * dt); }
  }
  // auto-open when you walk up to something
  if (autoId) { const a = cur().L.find(l => l.id === autoId); if (!a || rectDist(a) > 30) autoId = null; }
  const nn = nearest(8);
  draw(now); requestAnimationFrame(step);
}
// forest tile that fills any space beyond the map (tall or very wide screens)
const ftile = document.createElement('canvas'); ftile.width = 48; ftile.height = 40;
{ const fc = ftile.getContext('2d'); fc.fillStyle = '#6f9f63'; fc.fillRect(0, 0, 48, 40); const P = (x, y, w, h, c) => { fc.fillStyle = c; fc.fillRect(x, y, w, h); };
  [[4, 6], [28, 22]].forEach(([x, y]) => { P(x + 3, y + 14, 10, 3, 'rgba(0,0,0,.12)'); P(x + 7, y + 11, 2, 5, '#6b4a35'); for (let i = 0; i < 3; i++) { const ww = 4 + i * 3, y0 = y - 2 + i * 4; P(x + 8 - ww, y0 + 3, ww * 2, 3, '#2f5e46'); P(x + 8 - ww + 1, y0 + 2, ww * 2 - 2, 1, '#3b7155'); } });
  P(22, 4, 1, 1, '#88b87a'); P(40, 12, 1, 1, '#88b87a'); P(14, 32, 1, 1, '#88b87a'); }
const forest = g.createPattern(ftile, 'repeat');
const sbuf = document.createElement('canvas'); sbuf.width = 24; sbuf.height = 38; const sbc = sbuf.getContext('2d'); const GIRL_K = 1.4, MOE_K = 1.6;
/* the Google intern cap: yellow front with "Intern", blue on the wearer's right, red on the left, green bill, bead stem, blue propeller */
const CAP = {Y: ['#f8d22a', '#e2b40e'], B: ['#4a6ee8', '#2f4bb8'], R: ['#e9483c', '#b8322a'], G: ['#38b35a', '#1f7a39'], P: ['#4f71ea', '#7d98f5']};
function cap(P, cx, y0, hw, view, now) {
  // hw = half the crown width; the crown is a dome on rows y0-4 .. y0-1, the bill sits on y0
  const rows = [hw - 4, hw - 2, hw - 1, hw];
  rows.forEach((h, i) => { const y = y0 - 4 + i;
    for (let x = -h; x < h; x++) {
      const edge = x === -h || x === h - 1;
      let k;
      if (view === 'front') k = Math.abs(x + .5) < hw * .45 ? 'Y' : x < 0 ? 'B' : 'R';
      else if (view === 'back') k = x < 0 ? 'R' : 'B';
      else if (view === 'right') k = x >= h - Math.max(2, Math.round(h * .45)) ? 'Y' : 'R';
      else k = x < -h + Math.max(2, Math.round(h * .45)) ? 'Y' : 'B';
      P(cx + x, y, 1, 1, CAP[k][edge ? 1 : 0]);
    } });
  if (view === 'front') { P(cx - Math.round(hw * .3), y0 - 3, 2, 1, 'rgba(255,255,255,.55)'); P(cx - hw - 1, y0, hw * 2 + 2, 1, CAP.G[0]); P(cx - hw, y0 + 1, hw * 2, 1, CAP.G[1]); }
  else if (view === 'right') { P(cx - hw, y0, hw * 2 + 3, 1, CAP.G[0]); P(cx + hw - 1, y0 + 1, 4, 1, CAP.G[1]); }
  else if (view === 'left') { P(cx - hw - 3, y0, hw * 2 + 3, 1, CAP.G[0]); P(cx - hw - 3, y0 + 1, 4, 1, CAP.G[1]); }
  else { P(cx - 1, y0 - 2, 2, 2, '#2a1a14'); P(cx - hw, y0, hw * 2, 1, CAP.R[1]); }
  // stem with beads, then the propeller
  P(cx, y0 - 5, 1, 1, '#f6d36b'); P(cx, y0 - 6, 1, 1, CAP.R[0]); P(cx, y0 - 7, 1, 1, CAP.G[0]);
  const w = reduce ? 4 : Math.round(Math.abs(Math.cos(now / 55)) * 5) + 1;
  P(cx - w, y0 - 8, w, 1, CAP.P[0]); P(cx + 1, y0 - 8, w, 1, CAP.P[1]); P(cx, y0 - 8, 1, 1, '#f6d36b');
}
/* a tiny cap for Moe, between his ears */
function moeCap(P, cx, y0, now) {
  P(cx - 1, y0 - 3, 3, 1, CAP.Y[0]); P(cx - 2, y0 - 2, 1, 1, CAP.B[0]); P(cx - 1, y0 - 2, 3, 1, CAP.Y[0]); P(cx + 2, y0 - 2, 1, 1, CAP.R[0]);
  P(cx - 3, y0 - 1, 2, 1, CAP.B[1]); P(cx - 1, y0 - 1, 3, 1, CAP.Y[1]); P(cx + 2, y0 - 1, 2, 1, CAP.R[1]); P(cx - 3, y0, 7, 1, CAP.G[0]);
  P(cx, y0 - 4, 1, 1, CAP.R[0]); const w = reduce ? 2 : Math.round(Math.abs(Math.cos(now / 50)) * 3) + 1; P(cx - w, y0 - 5, w, 1, CAP.P[0]); P(cx + 1, y0 - 5, w, 1, CAP.P[1]); P(cx, y0 - 5, 1, 1, '#f6d36b');
}
/* easter eggs from the houses, worn on the map: sunglasses (LEDs at full white) and the propeller hat */
function gear(c, dir, now) {
  const Q = (x, y, w, h, k) => R(c, 2 + x, 10 + y, w, h, k);
  if (WSTATE.shades && dir !== 'up') { if (dir === 'down') { Q(6, 7, 4, 3, '#111'); Q(10, 8, 1, 1, '#111'); Q(11, 7, 4, 3, '#111'); Q(7, 7, 1, 1, '#555'); Q(12, 7, 1, 1, '#555'); } else { const x = dir === 'left' ? 4 : 12; Q(x, 7, 4, 3, '#111'); Q(x + (dir === 'left' ? 3 : 0), 7, 1, 1, '#555'); } }
  if (WSTATE.hat) { if (dir === 'down') cap(Q, 10, 3, 7, 'front', now); else if (dir === 'up') cap(Q, 10, 3, 7, 'back', now); else if (dir === 'right') cap(Q, 9, 3, 6, 'right', now); else cap(Q, 11, 3, 6, 'left', now); }
}
/* lights you set in the houses stay on around the map */
function houseLights(cam, now) {
  if (led.touched) {
    const tl = L.find(l => l.id === 'teslalight'), X = tl.tx * TS, Y = tl.ty * TS, cb = L.find(l => l.id === 'cabin'), CX = cb.tx * TS + 4, CY = cb.ty * TS + 4 + Math.round((cb.h * TS - 4) - Math.round((cb.h * TS - 4) * .42)) + 2;
    const cols = [0, 1, 2, 3, 4, 5].map(i => ledColor(i, now));
    cols.forEach((col, i) => { R(g, X - 4 + i * 16 - cam.x, Y + 28 - cam.y, 10, 8, `rgb(${col})`); R(g, X - 4 + i * 16 - cam.x, Y + 28 - cam.y, 10, 1, 'rgba(255,255,255,.5)'); });
    for (let x = 0; x < 72; x += 2) R(g, CX + x - cam.x, CY - cam.y, 1, 1, `rgb(${cols[Math.min(5, Math.floor(x / 12))]})`);
    g.globalCompositeOperation = 'lighter'; const a = PHASE === 'night' ? .55 : PHASE === 'day' ? .22 : .38;
    cols.forEach((col, i) => { const x = X + 1 + i * 16 - cam.x, y = Y + 32 - cam.y, gr = g.createRadialGradient(x, y, 0, x, y, 16); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x - 16, y - 16, 32, 32); });
    for (let i = 0; i < 6; i++) { const x = CX + 6 + i * 12 - cam.x, y = CY + 4 - cam.y, col = cols[i], gr = g.createRadialGradient(x, y, 0, x, y, 10); gr.addColorStop(0, `rgba(${col},${a * .8})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x - 10, y - 10, 20, 20); }
    g.globalCompositeOperation = 'source-over';
  }
  if (WSTATE.cells) {
    const tc = L.find(l => l.id === 'teslacells'), X = tc.tx * TS - cam.x, Y = tc.ty * TS - cam.y, k = reduce ? 1 : .85 + .15 * Math.sin(now / 300);
    g.fillStyle = `rgba(255,120,170,${.45 * k})`; g.fillRect(X, Y + 26, tc.w * TS, 20);
    g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(X + 40, Y + 36, 0, X + 40, Y + 36, 52); gr.addColorStop(0, `rgba(255,110,170,${(PHASE === 'day' ? .25 : .45) * k})`); gr.addColorStop(1, 'rgba(255,110,170,0)'); g.fillStyle = gr; g.fillRect(X - 12, Y - 16, 104, 104); g.globalCompositeOperation = 'source-over';
  }
}
function heartAt(x, y, now) { const u = (now - moeHeart) / 1000; if (u < 0 || u > 1) return; const hy = Math.round(y - u * 10); g.globalAlpha = 1 - u * u; R(g, x - 3, hy, 2, 2, '#e9483c'); R(g, x + 1, hy, 2, 2, '#e9483c'); R(g, x - 3, hy + 1, 6, 2, '#e9483c'); R(g, x - 2, hy + 3, 4, 1, '#e9483c'); R(g, x - 1, hy + 4, 2, 1, '#e9483c'); g.globalAlpha = 1; }
function draw(now) {
  const cam = camera();
  g.fillStyle = forest; forest.setTransform && forest.setTransform(new DOMMatrix().translate(-cam.x, -cam.y)); g.fillRect(0, 0, VW, VH);
  g.drawImage(cur().map, -cam.x, -cam.y);
  // tall screens: repeat the forest band (same river, banks, trees and coast per column) above and below the map
  if (scene === 'world') { const bh = SKIRT * TS, by0 = MH * TS, mp = cur().map;
    for (let y = -cam.y - bh; y > -bh; y -= bh) g.drawImage(mp, 0, by0, mp.width, bh, -cam.x, y, mp.width, bh);
    for (let y = mp.height - cam.y; y < VH; y += bh) g.drawImage(mp, 0, by0, mp.width, bh, -cam.x, y, mp.width, bh); }
  // cars (dynamic so headlights can pop)
  const nsx = L.find(l => l.id === 'nsx'), c5 = L.find(l => l.id === 'c5');
  car(g, nsx.tx * TS + 1 - cam.x, nsx.ty * TS + 2 - cam.y, CARS.nsx, pops.nsx);
  car(g, c5.tx * TS + 1 - cam.x, c5.ty * TS + 2 - cam.y, CARS.c5, pops.c5);
  // sprites, sorted by y
  const f = P.moving && !reduce ? (Math.floor(walkT * 8) % 2) + 1 : 0;
  const bob = !P.moving && !boat && !reduce && Math.floor(now / 500) % 2 ? 1 : 0;
  const mf = Math.floor(now / 220) % 2;
  if (boat) { const bx = Math.round(P.x) - 16 - cam.x, by = Math.round(P.y) - 6 - cam.y;
    R(g, bx + 2, by + 9, 30, 3, 'rgba(20,50,90,.35)'); R(g, bx + 3, by, 26, 9, '#8a5a36'); R(g, bx, by + 1, 32, 6, '#8a5a36'); R(g, bx + 2, by + 2, 28, 4, '#b07a4a'); R(g, bx, by + 1, 32, 1, '#6b4426'); R(g, bx + 3, by + 8, 26, 1, '#5e3a20');
    const oar = Math.floor(now / 220) % 2; R(g, bx + 14, by - 2 + oar * 2, 2, 12, '#d9b483'); R(g, bx + 13, by + 9 + oar * 2, 4, 3, '#d9b483');
    if (!reduce) { const w = Math.floor(now / 120) % 3; R(g, bx - 3 - w, by + 4, 2, 1, '#cfe6f7'); R(g, bx + 34 + w, by + 4, 2, 1, '#cfe6f7'); } }
  const sprites = [[WSTATE.moeHome ? -1e9 : moe.y, () => { if (WSTATE.moeHome) return; sbc.clearRect(0, 0, 24, 38); moeSprite(sbc, 2, 7, moe.moving ? mf : 0); if (WSTATE.hat) moeCap((x, y, w, h, k) => R(sbc, 2 + x, 7 + y, w, h, k), 7, -1, now); g.drawImage(sbuf, 0, 0, 20, 21, Math.round(moe.x - 9 * MOE_K - cam.x), Math.round(moe.y - 18 * MOE_K - cam.y), Math.round(20 * MOE_K), Math.round(21 * MOE_K)); }], [P.y, () => { sbc.clearRect(0, 0, 24, 38); girl(sbc, 2, 10, P.dir, f); gear(sbc, P.dir, now); g.drawImage(sbuf, 0, 0, 24, 38, Math.round(P.x - 12 * GIRL_K - cam.x), Math.round(P.y - 35 * GIRL_K - cam.y + bob), Math.round(24 * GIRL_K), Math.round(38 * GIRL_K)); }]].sort((a, b) => a[0] - b[0]);
  sprites.forEach(s => s[1]());
  if (TINT) {
    g.fillStyle = TINT; g.fillRect(0, 0, VW, VH);
    if (PHASE !== 'day') { g.globalCompositeOperation = 'lighter'; lights.forEach(([lx, ly, r]) => { const x = lx - cam.x, y = ly - cam.y; if (x < -r || y < -r || x > VW + r || y > VH + r) return; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, PHASE === 'night' ? 'rgba(255,205,120,.55)' : 'rgba(255,205,120,.25)'); gr.addColorStop(1, 'rgba(255,205,120,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); });
      ['nsx', 'c5'].forEach(k => { if (!pops[k]) return; const l = L.find(o => o.id === k); const x = l.tx * TS + 18 - cam.x, y = l.ty * TS + 38 - cam.y; const gr = g.createRadialGradient(x, y, 0, x, y + 16, 34); gr.addColorStop(0, 'rgba(255,245,200,.55)'); gr.addColorStop(1, 'rgba(255,245,200,0)'); g.fillStyle = gr; g.fillRect(x - 34, y - 6, 68, 56); });
      g.globalCompositeOperation = 'source-over'; }
  }
  houseLights(cam, now);
  if (!WSTATE.moeHome) heartAt(Math.round(moe.x - cam.x), Math.round(moe.y - 30 - cam.y), now);
  roomLabel.hidden = true; cv.style.cursor = 'default';
  // labels
  // labels stay inside the screen edges and never sit on top of each other
  const placed = [];
  L.forEach((l, i) => {
    let x = offX + (l.tx * TS + l.w * TS / 2 - cam.x) * SC, y = offY + (l.ty * TS - cam.y - (l.kind === 'factory' ? 18 : 6)) * SC;
    const n = labelNodes[i]; const vis = !l.nolabel && x > -40 && x < innerWidth + 40 && y > 8 && y < innerHeight;
    n.hidden = !vis; if (!vis) return;
    const w = n._w || (n._w = n.offsetWidth) || 120, h = n._h || (n._h = n.offsetHeight) || 20;
    x = Math.max(w / 2 + 6, Math.min(innerWidth - w / 2 - 6, x));
    for (let k = 0; k < 4; k++) { const hit = placed.find(r => Math.abs(r.x - x) < (r.w + w) / 2 + 4 && Math.abs(r.y - y) < (r.h + h) / 2 + 2); if (!hit) break; y = hit.y - hit.h - 4; }
    placed.push({x, y, w, h});
    n.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%)`;
  });
  iconNodes.forEach(([l, im]) => { const sz = 15 * SC, x = offX + (l.tx * TS + l.w * TS / 2 - cam.x) * SC, y = offY + (l.ty * TS + ICON[l.id] - cam.y) * SC; const vis = x > -40 && x < innerWidth + 40 && y > -40 && y < innerHeight; im.hidden = !vis; if (vis) { im.style.width = im.style.height = sz + 'px'; im.style.transform = `translate(${Math.round(x - sz / 2)}px,${Math.round(y)}px)`; } });
  drawPrompt(cam);
  // minimap marker
  const mc = mini.getContext('2d'); mc.drawImage(miniBase, 0, 0);
  mc.strokeStyle = 'rgba(0,0,0,.35)'; mc.strokeRect(cam.x / TS * MS + .5, cam.y / TS * MS + .5, VW / TS * MS, VH / TS * MS);
  mc.fillStyle = '#d9644a'; mc.fillRect(P.x / TS * MS - 3, P.y / TS * MS - 4, 6, 6);
}

function drawPrompt(cam) {
  const n = nearest();
  if (n && card.hidden && !P.target && n.kind !== 'nsx' && n.kind !== 'c5') { const verb = n.kind === 'cabin' ? 'go inside' : n.kind === 'door' ? 'go outside' : `open ${n.label}`; prompt.hidden = false; prompt.textContent = touch ? `Tap to ${verb}` : `Press E to ${verb}`; const pw = prompt.offsetWidth || 160, px = Math.max(pw / 2 + 8, Math.min(innerWidth - pw / 2 - 8, offX + (P.x - cam.x) * SC)); prompt.style.transform = `translate(${Math.round(px)}px,${Math.round(Math.max(60, offY + (P.y - 42 - cam.y) * SC))}px) translate(-50%,-100%)`; }
  else prompt.hidden = true;
}
/* ---------------- the drive: free roam on the beach ---------------- */
const DW = 1600, DH = 1000;
const dart = document.createElement('canvas'); dart.width = DW; dart.height = DH;
const skid = document.createElement('canvas'); skid.width = DW; skid.height = DH; const skc = skid.getContext('2d');
const PADS = [[420, 300, 0], [900, 620, Math.PI], [1200, 250, Math.PI / 2], [300, 760, -Math.PI / 4], [760, 160, Math.PI / 4]];
let cones = [];
function resetCones() { cones = []; for (let i = 0; i < 46; i++) { const x = 20 + rnd(i * 4.3 + 1) * (DW - 40), y = 20 + rnd(i * 9.1 + 2) * (DH - 40); cones.push({x, y, vx: 0, vy: 0, spin: 0, a: 0, hit: false}); } }
(function bakeDrive() {
  const a = dart.getContext('2d'); a.imageSmoothingEnabled = false;
  a.fillStyle = '#e3d39c'; a.fillRect(0, 0, DW, DH);
  const TX = Math.PI * 2 / DW, TY = Math.PI * 2 / DH;
  for (let y = 0; y < DH; y += 3) for (let x = 0; x < DW; x += 3) { const n = Math.sin(x * TX * 3 + Math.sin(y * TY * 2) * 2) + Math.sin(y * TY * 3 - x * TX * 2) * .9; if (n > 1.25) { a.fillStyle = '#d6c487'; a.fillRect(x, y, 3, 3); } else if (n < -1.3) { a.fillStyle = '#ece0b2'; a.fillRect(x, y, 3, 3); } }
  // palms, pines and a few beach umbrellas (drive-through, purely decoration)
  for (let i = 0; i < 90; i++) for (const [ox, oy] of [[0, 0], [-DW, 0], [DW, 0], [0, -DH], [0, DH]]) { const x = ox + 20 + rnd(i * 2.7 + 5) * (DW - 40), y = oy + 20 + rnd(i * 6.3 + 9) * (DH - 40);
    if (i % 4 === 0) { a.fillStyle = 'rgba(0,0,0,.12)'; a.fillRect(x - 6, y + 12, 16, 3); a.fillStyle = '#8a6244'; for (let k = 0; k < 16; k++) a.fillRect(x + Math.round(Math.sin(k / 5) * 2), y + 12 - k, 2, 1); a.fillStyle = '#4f9150'; [[-9, 0], [-6, -3], [0, -5], [6, -3], [9, 0]].forEach(([dx, dy]) => { a.fillRect(x + Math.min(0, dx), y - 4 + dy, Math.abs(dx) + 2, 3); a.fillRect(x + dx - 1, y - 2 + dy, 3, 3); }); }
    else if (i % 4 === 1) { a.fillStyle = 'rgba(0,0,0,.12)'; a.fillRect(x - 6, y + 10, 14, 3); a.fillStyle = '#8b4a32'; a.fillRect(x, y + 2, 3, 9); for (let r = 0; r < 4; r++) { a.fillStyle = r % 2 ? '#2c5a37' : '#356a42'; a.fillRect(x + 1 - (3 + r), y - 12 + r * 4, (3 + r) * 2 + 1, 4); } }
    else if (i % 9 === 2) { const c = ['#e35d50', '#5b8ee6', '#f2c14e'][i % 3]; a.fillStyle = '#7a5a3a'; a.fillRect(x, y - 2, 1, 12); a.fillStyle = c; a.fillRect(x - 8, y - 6, 17, 4); a.fillRect(x - 6, y - 8, 13, 2); a.fillStyle = '#fff'; a.fillRect(x - 2, y - 6, 5, 4); } }
  // boost pads
  PADS.forEach(([x, y, r]) => { a.save(); a.translate(x, y); a.rotate(r); a.fillStyle = '#2b2d31'; a.fillRect(-22, -14, 44, 28); for (let k = 0; k < 3; k++) { a.fillStyle = '#ffb02e'; a.beginPath(); a.moveTo(-14 + k * 11, -9); a.lineTo(-4 + k * 11, 0); a.lineTo(-14 + k * 11, 9); a.lineTo(-10 + k * 11, 9); a.lineTo(0 + k * 11, 0); a.lineTo(-10 + k * 11, -9); a.fill(); } a.restore(); });
})();
const carBuf = document.createElement('canvas'); carBuf.width = 32; carBuf.height = 44; const cbx = carBuf.getContext('2d');
let drv = null, driveFor = null, lastGas = 0;
const wrapD = (d, n) => { d = ((d % n) + n) % n; return d > n / 2 ? d - n : d; };
const mod = (v, n) => ((v % n) + n) % n;
const driveBtn = document.createElement('button'); driveBtn.type = 'button'; driveBtn.id = 'drive-btn'; driveBtn.hidden = true; root.appendChild(driveBtn);
const tui = document.createElement('div'); tui.id = 'track-ui'; tui.hidden = true;
const coarse = matchMedia('(pointer: coarse)').matches;
tui.innerHTML = `<div class="tr-hud"><span id="tr-spd">0 km/h</span><span id="tr-top">Top 0</span><span id="tr-cones">Cones 0</span></div>
  <button type="button" class="tr-home">← Back home</button>
  <p class="tr-help">${coarse ? 'Hold ▲ to drive · 🔥 for nitro' : 'Arrows / WASD to drive · Space or double-tap ↑ for nitro'}</p>
  <div class="tr-pad"><button type="button" data-k="left" aria-label="Steer left">◀</button><button type="button" data-k="right" aria-label="Steer right">▶</button><span></span><button type="button" data-k="nitro" aria-label="Nitro">🔥</button><button type="button" data-k="up" aria-label="Gas">▲</button></div>`;
root.appendChild(tui);
tui.querySelector('.tr-home').addEventListener('click', () => leaveTrack());
tui.querySelectorAll('[data-k]').forEach(b => { const k = b.dataset.k; const on = e => { e.preventDefault(); if (k === 'nitro') { nitro(); return; } keys.add(k); }, off = () => keys.delete(k); b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off); });
function nitro() { if (drv && drv.boost <= 0 && drv.tank > .25) { drv.boost = 1.4; drv.tank = Math.max(0, drv.tank - .5); window.__engine && window.__engine(drv.kind); } }
function showDrive(kind) { driveFor = kind; driveBtn.textContent = `Take the ${kind === 'nsx' ? 'NSX' : 'C5'} for a drive →`; driveBtn.hidden = false; }
function hideDrive() { driveFor = null; driveBtn.hidden = true; }
driveBtn.addEventListener('click', () => { const k = driveFor; hideDrive(); enterTrack(k); });
function enterTrack(kind) {
  closeCard(); const fade = document.getElementById('fade'); fade.classList.add('on');
  window.track && track('drive', {car: kind});
  setTimeout(() => {
    worldPos.x = P.x; worldPos.y = P.y; scene = 'track';
    let top = 0; try { top = +localStorage.getItem('jy-top-' + kind) || 0; } catch (e) {}
    drv = {kind, x: 800, y: 500, a: 0, v: 0, top, boost: 0, tank: 1, cones: 0, flame: 0, cx: 800, cy: 500, shake: 0};
    skc.clearRect(0, 0, DW, DH); resetCones();
    keys.clear(); P.target = null; tui.hidden = false; document.getElementById('world-bar').hidden = true; document.getElementById('tod').hidden = true; prompt.hidden = true; roomLabel.hidden = true;
    labelNodes.forEach(n => n.hidden = true); iconNodes.forEach(([, im]) => im.hidden = true);
    resize(); window.__engine && window.__engine(kind); fade.classList.remove('on');
  }, reduce ? 0 : 260);
}
function leaveTrack(now) {
  if (drv) window.track && track('drive_end', {car: drv.kind, top_speed: drv.top, cones: drv.cones});
  const done = () => { scene = 'world'; drv = null; keys.clear(); tui.hidden = true; document.getElementById('world-bar').hidden = false; document.getElementById('tod').hidden = false; resize(); P.x = worldPos.x; P.y = worldPos.y; trail.length = 0; moe.x = P.x - 14; moe.y = P.y + 6; };
  if (now) { done(); return; }
  const fade = document.getElementById('fade'); fade.classList.add('on'); setTimeout(() => { done(); fade.classList.remove('on'); cv.focus({preventScroll: true}); }, reduce ? 0 : 260);
}
function trackResize() { cvFull(); SC = Math.max(1.6, Math.min(3, Math.round(Math.min(innerWidth, innerHeight) / 300 * 2) / 2)); VW = Math.ceil(innerWidth / SC); VH = Math.ceil(innerHeight / SC); cv.width = VW; cv.height = VH; g.imageSmoothingEnabled = false; }
function trackStep(dt) {
  if (!drv) return;
  const up = keys.has('up'), dn = keys.has('down'), lf = keys.has('left'), rt = keys.has('right');
  drv.boost = Math.max(0, drv.boost - dt); drv.tank = Math.min(1, drv.tank + dt * .12);
  const vmax = drv.boost > 0 ? 520 : 300, acc = drv.boost > 0 ? 700 : 340;
  if (up || drv.boost > 0) drv.v += acc * dt; else if (dn) drv.v -= 420 * dt; else drv.v -= Math.sign(drv.v) * Math.min(Math.abs(drv.v), 110 * dt);
  drv.v = Math.max(-120, Math.min(vmax, drv.v)); if (drv.v > vmax) drv.v = vmax;
  const steer = (rt ? 1 : 0) - (lf ? 1 : 0), sp = Math.abs(drv.v);
  drv.a += steer * dt * (2.2 + Math.min(1.4, sp / 220)) * (sp < 8 ? sp / 8 : 1) * Math.sign(drv.v || 1);
  drv.x += Math.cos(drv.a) * drv.v * dt; drv.y += Math.sin(drv.a) * drv.v * dt;
  // skid marks when turning hard at speed
  if (steer && sp > 150) { const bx = Math.cos(drv.a), by = Math.sin(drv.a), px = -by, py = bx; skc.fillStyle = 'rgba(60,50,40,.22)'; [[-1], [1]].forEach(([s]) => skc.fillRect(Math.round(mod(drv.x - bx * 14 + px * 9 * s, DW)), Math.round(mod(drv.y - by * 14 + py * 9 * s, DH)), 3, 3)); }
  // boost pads
  PADS.forEach(([x, y]) => { if (Math.hypot(wrapD(drv.x - x, DW), wrapD(drv.y - y, DH)) < 24 && drv.boost < .9) { drv.boost = 1.1; window.__sfx && window.__sfx(); } });
  // cones fly when hit
  cones.forEach(c => { if (!c.hit && Math.hypot(wrapD(drv.x - c.x, DW), wrapD(drv.y - c.y, DH)) < 16 && sp > 20) { c.hit = true; c.vx = Math.cos(drv.a) * sp * .9 + (Math.random() - .5) * 120; c.vy = Math.sin(drv.a) * sp * .9 + (Math.random() - .5) * 120; c.spin = (Math.random() - .5) * 20; drv.cones++; }
    if (c.hit) { c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= .96; c.vy *= .96; c.a += c.spin * dt; c.spin *= .96; } });
  const kmh = Math.round(sp * .8); if (kmh > drv.top) { drv.top = kmh; try { localStorage.setItem('jy-top-' + drv.kind, kmh); } catch (e) {} }
  drv.flame += dt * 30; drv.shake = Math.max(0, drv.shake - dt);
  // camera leads a little in the direction of travel
  const lx = drv.x + Math.cos(drv.a) * drv.v * .35, ly = drv.y + Math.sin(drv.a) * drv.v * .35; drv.cx += (lx - drv.cx) * Math.min(1, dt * 4); drv.cy += (ly - drv.cy) * Math.min(1, dt * 4);
  tui.querySelector('#tr-spd').textContent = `${kmh} km/h`; tui.querySelector('#tr-top').textContent = `Top ${drv.top}`; tui.querySelector('#tr-cones').textContent = `Cones ${drv.cones}`;
  const bar = tui.querySelector('.tr-hud'); bar.style.setProperty('--tank', drv.tank); bar.classList.toggle('boosting', drv.boost > 0);
}
function drawTrack(now) {
  const sh = 0;
  const cx = Math.round(drv.cx - VW / 2), cy = Math.round(drv.cy - VH / 2);
  g.fillStyle = '#e3d39c'; g.fillRect(0, 0, VW, VH);
  for (let ty = -mod(cy, DH); ty < VH; ty += DH) for (let tx = -mod(cx, DW); tx < VW; tx += DW) { g.drawImage(dart, tx, ty); g.drawImage(skid, tx, ty); }
  cones.forEach(c => { g.save(); g.translate(Math.round(drv.x - cx + wrapD(c.x - drv.x, DW)), Math.round(drv.y - cy + wrapD(c.y - drv.y, DH))); g.rotate(c.a); const P_ = (x, y, w, h, k) => { g.fillStyle = k; g.fillRect(x, y, w, h); }; P_(-4, 3, 9, 2, 'rgba(0,0,0,.18)'); P_(-1, -6, 2, 2, '#f08a24'); P_(-2, -4, 4, 3, '#f08a24'); P_(-2, -1, 4, 1, '#ffffff'); P_(-3, 0, 6, 3, '#f08a24'); P_(-4, 3, 8, 2, '#c4651a'); g.restore(); });
  const bx = drv.x - cx, by = drv.y - cy;
  if (drv.boost > 0) { g.save(); g.translate(bx, by); g.rotate(drv.a - Math.PI / 2); const f = Math.floor(drv.flame) % 3; [['#ffe066', 6 + f], ['#ff8a2a', 10 + f * 2], ['#e8442c', 14 + f * 2]].reverse().forEach(([c, len]) => { g.fillStyle = c; g.fillRect(-7, -22 - len, 4, len); g.fillRect(3, -22 - len, 4, len); }); g.restore(); }
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(Math.round(bx) + 3, Math.round(by) + 5, 17, 17, 0, 0, Math.PI * 2); g.fill();
  cbx.clearRect(0, 0, 32, 44); car(cbx, 1, 0, CARS[drv.kind], 1, true);
  g.save(); g.translate(Math.round(bx), Math.round(by)); g.rotate(drv.a - Math.PI / 2); g.drawImage(carBuf, -16, -22); g.restore();
  if (TINT) { g.fillStyle = TINT; g.fillRect(0, 0, VW, VH); }
}
addEventListener('keydown', e => {
  if (scene !== 'track') return;
  if (e.key === 'Escape') { e.preventDefault(); leaveTrack(); return; }
  if (e.key === ' ' || e.key === 'Shift') { e.preventDefault(); nitro(); return; }
  if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && !e.repeat) { const t = performance.now(); if (t - lastGas < 260) nitro(); lastGas = t; }
});

/* ---------------- public ---------------- */
let welcomed = false; let moeClicks = 0; var moeHeart = 0;
function welcome() {
  welcomed = true;
  const h = document.createElement('div'); h.id = 'w-hint'; h.setAttribute('role', 'status');
  h.innerHTML = touch
    ? '<b>How to move</b><span>Tap somewhere to walk there</span><span>Drag to steer</span><span>Tap a building to open it</span>'
    : '<b>How to move</b><span>WASD or the arrow keys</span><span>Click somewhere to walk there</span><span>Click and drag to steer</span><span>E to open things</span>';
  root.appendChild(h);
  let gone = false;
  const hide = () => { if (gone) return; gone = true; h.classList.add('off'); setTimeout(() => h.remove(), 4000); removeEventListener('keydown', early); cv.removeEventListener('pointerdown', early); };
  const t0 = performance.now(); const early = () => { setTimeout(hide, Math.max(0, 6000 - (performance.now() - t0))); };
  addEventListener('keydown', early); cv.addEventListener('pointerdown', early); setTimeout(hide, 10000);
}
window.__w = {get boat() { return boat; }, goTo, blocked: (x, y) => feetBlocked(x, y), get P() { return P; }, get moe() { return moe; }, get RP() { return RP; }, get scene() { return scene; }, camera: () => scene === 'room' ? roomCam() : camera(), get SC() { return SC; }, RO, roomOpen, led, WSTATE};
window.World = {
  start() { loadMinis().catch(() => {}); if (!welcomed) { const c = L.find(l => l.id === 'cabin'); P.x = (c.tx + c.w + .7) * TS; P.y = (c.ty - .2) * TS; P.dir = 'down'; P.target = null; moe.x = P.x - 14; moe.y = P.y + 4; trail.length = 0; } resize(); root.hidden = false; running = true; last = performance.now(); cv.setAttribute('tabindex', '0'); cv.focus({preventScroll: true}); requestAnimationFrame(step); if (!welcomed) welcome(); },
  stop() { if (scene === 'track') leaveTrack(true); hideDrive(); running = false; root.hidden = true; keys.clear(); closeCard(); }
};
})();
