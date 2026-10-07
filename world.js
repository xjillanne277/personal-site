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
   card: {title: 'University of Waterloo', meta: 'Mechanical Engineering · started Fall 2022', body: ['Where it starts. Two first-year design courses, two builds:', 'ME100 · Wind-up soccer toy: a cam-and-follower kicker in a laser-cut enclosure, built on a $50 budget.', 'ME101 · FrostBot (Summer 2023): a cake-frosting robot with a worm-drive piston, spinning plate and EV3 brick. 98% icing accuracy over 100 trials.']}},
  {id: 'evercloak', label: 'Evercloak', yr: '2023', tx: 8, ty: 13, w: 4, h: 3, spot: [10, 16], kind: 'office', tour: 2,
   card: {title: 'Evercloak Inc.', meta: 'Mechanical Engineering Co-op · Kitchener · Winter 2023', body: ['Designed a prototype dehumidifier enclosure, applying DFMA and GD&T so it could be sealed and manufactured off-site.', 'Improved dehumidification performance 40% through membrane material selection, designing custom tests for absorption, evaporation rate and elongation.']}},
  {id: 'valbruna', label: 'Valbruna', yr: '2023', tx: 13, ty: 8, w: 5, h: 4, spot: [15, 12], kind: 'factory', tour: 3,
   card: {title: 'Valbruna ASW', meta: 'Mechanical Engineering Co-op · Welland · Fall 2023', body: ['Saved $900K CAD in potential scrap losses by modelling scrap melting in an electric arc furnace in ANSYS Fluent and finding thermal inefficiencies.', 'Reverse-engineered arc furnace parts in SolidWorks with GD&T to capture the original design intent.', 'Redesigned a 100,000 CFM fan enclosure to meet the Ontario Building Code, saving $45K CAD per unit.']}},
  {id: 'geotab', label: 'Geotab', yr: '2024', tx: 18, ty: 4, w: 4, h: 3, spot: [20, 7], kind: 'office', tour: 4,
   card: {title: 'Geotab', meta: 'System Verification Intern · Oakville · Summer 2024', body: ['Designed a closed-loop, air-cooled test rack for dashcams, with 3D-printed mounts and low-cost PC fans in a modular enclosure, holding them at 26 °C.', 'Built an ML model for an AI dashcam: 72% obstacle detection with 6% false positives. 1st of 11 teams in a 7-day company hackathon.', 'Moved AI dashcam testing to historical feed data, cutting 32.4 t of CO₂ a year.']}},
  {id: 'teslacells', label: 'Tesla Cells', yr: '2025', tx: 27, ty: 3, w: 5, h: 4, spot: [29, 7], kind: 'modern', tour: 5,
   card: {title: 'Tesla, Cell Equipment', meta: 'Mechanical Design Engineering Intern · Palo Alto · Winter 2025', body: ['Designed a high-temp magnetic clamping assembly for cell lamination: 0.1 mm clearance through tolerance stack-ups and vibration-resistant design, yield up 15%, setup cut from 30 to 5 seconds.', 'Led the mechanical, electrical and controls design of a modular foil-stretching machine with load-cell tension control, halving wrinkling and creasing failures.', 'Built the control box: Arduino, load cell, amplifier and signal conditioner for closed-loop pneumatic nip rollers, holding force within ±2%.']}},
  {id: 'teslalight', label: 'Tesla Lighting', yr: '2025', tx: 35, ty: 3, w: 5, h: 4, spot: [37, 7], kind: 'modern', tour: 6,
   card: {title: 'Tesla, Lighting, Switches & Sensors', meta: 'Mechanical Design Engineering Intern · Fremont · Fall 2025', body: ['Led the design of a new-program interior cabin light in CATIA V6, with Class A surfaces for injection moulding.', 'Designed a 2-layer mixed-signal PCB from scratch in KiCad, then hand-soldered and assembled it.', 'Proposed and built an RGBW LED controller for the design studio: custom PCB, SLA-printed enclosure and ESP32, driving 6× more LEDs per controller.']}},
  {id: 'level', label: 'Level Home', yr: '2026', tx: 40, ty: 11, w: 4, h: 3, spot: [41, 14], kind: 'office', tour: 7,
   card: {title: 'Level Home', meta: 'Product Design Engineering Intern · Redwood City · Winter 2026', body: ['Cut $12 per unit by replacing two accelerometers and their flex circuits with magnetometers and insert-moulded magnets for lock position: $12M projected savings.', 'Designed an automated solenoid test fixture and PCBA for capacitive touch, resolving 14 issues across 2M+ validation cycles for 100% functional success.', 'Fixed bolt binding by defining datums to the bolt travel path and tightening critical tolerances: actuation-force variability down 25%, pass rate up 15%.', 'Led DFM on 20+ moulded and die-cast parts, moving parting lines and gates off cosmetic surfaces and cutting tooling cost 8%.']}},
  {id: 'google', label: 'Google', yr: '2026', tx: 31, ty: 10, w: 5, h: 4, spot: [33, 14], kind: 'modern2', tour: 8,
   card: {title: 'Google, Pixel Hardware', meta: 'Product Design Engineering Intern · Mountain View · Summer 2026', body: ['Owned the design and validation of the Pixel Watch screen geometry for precision-moulded glass, eliminating optical distortion within wall-thickness and draft limits.', 'Saved $15K in vendor testing with a production-representative test coupon and fixture recreating a titanium-to-resin interface.', 'Developed an installed-condition drop test for dynamic FEA of a watch baffle, avoiding the loss of 15 prototypes per cycle and saving $20K+.', 'Engineered a universal strain-test jig used across 4 global suppliers.']}},
  {id: 'next', label: 'Your team?', yr: '2027', tx: 27, ty: 18, w: 4, h: 3, spot: [29, 21], kind: 'plot', tour: 9,
   card: {title: 'Reserved: Summer 2027', meta: 'The next stop on the road', body: ["I'm looking for a Summer 2027 mechanical or product design role, ideally consumer electronics or robotics."], contact: true}},
  {id: 'cabin', label: 'Home', tx: 33, ty: 17, w: 5, h: 4, spot: [35, 21], kind: 'cabin',
   card: {title: 'Home', meta: 'The cabin', body: ['This is where your room goes: the workbench, the PC, Moe, and the LED controller running the lights.']}},
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
const map = document.createElement('canvas'); map.width = MW * TS; map.height = MH * TS;
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
  // river banks: one long timber board each side, posts every few metres, and a small dock where the path meets the water
  [[23 * TS - 4, 1], [26 * TS, -1]].forEach(([bx, side]) => {
    R(m, bx, 0, 4, MH * TS, '#a8794e'); R(m, side > 0 ? bx : bx + 3, 0, 1, MH * TS, '#c4935f'); R(m, side > 0 ? bx + 3 : bx, 0, 1, MH * TS, '#6e4a2c');
    for (let y = 10; y < MH * TS; y += 40) R(m, bx - (side > 0 ? 1 : 0), y, 5, 3, '#6e4a2c');
  });
  [[23 * TS - 4, 23 * TS + 10], [26 * TS - 10, 26 * TS + 4]].forEach(([x0, x1]) => { for (let x = x0; x < x1; x += 3) { R(m, x, 7 * TS + 3, 2, 12, '#b98a5c'); R(m, x + 2, 7 * TS + 3, 1, 12, '#8a6040'); } R(m, x0, 7 * TS + 15, x1 - x0, 1, '#6e4a2c'); });
  { const bx = (MW - 2) * TS, by = 3 * TS; R(m, bx - 4, by + 10, TS * 3 + 8, 4, '#c0392b'); R(m, bx - 4, by + 14, TS * 3 + 8, 1, '#8e2a20'); [bx + 6, bx + 34].forEach(tx => { R(m, tx, by - 18, 4, 34, '#c0392b'); R(m, tx - 1, by - 18, 6, 2, '#8e2a20'); R(m, tx, by - 8, 4, 1, '#8e2a20'); }); m.strokeStyle = '#c0392b'; m.lineWidth = 1; m.beginPath(); m.moveTo(bx - 4, by - 2); m.quadraticCurveTo(bx + 22, by + 14, bx + 50, by - 2); m.stroke(); }
  // trees, sorted by y so lower ones overlap
  bakeBay();
  trees.sort((a, b) => a[1] - b[1]).forEach(([x, y, ca]) => ca ? (x > MW - 9 && rnd(x * 7 + y) > .6 ? drawPalm(x * TS, y * TS) : redwood(x * TS, y * TS)) : pine(x * TS, y * TS));
  L.forEach(drawLandmark);
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
function girl(c, ox, oy, dir, f) {
  const P = (x, y, w, h, k) => R(c, ox + x, oy + y, w, h, k);
  P(4, 24, 12, 2, 'rgba(0,0,0,.18)');
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
const pops = {nsx: 0, c5: 0}; const carClicks = {nsx: 0, c5: 0};
function car(c, X, Y, o, up) {
  const P = (x, y, w, h, k) => R(c, X + x, Y + y, w, h, k), B = o.body, D = shade(B, -35), Lt = shade(B, 30);
  P(2, 39, 26, 4, 'rgba(0,0,0,.22)');
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
let SC = 3, VW = 0, VH = 0, offX = 0, offY = 0, FIT = true;
function cvFull() { Object.assign(cv.style, {left: '0px', top: '0px', width: '100%', height: '100%'}); offX = offY = 0; }
function resize() {
  if (typeof scene !== 'undefined' && scene === 'room') { roomResize(); return; }
  const bar = document.getElementById('world-bar'), barH = (bar && bar.offsetHeight) || 130, topH = 56;
  const fit = Math.min(innerWidth / (MW * TS), (innerHeight - barH - topH) / (MH * TS));
  FIT = fit >= 1.3; root.classList.toggle('fit', FIT);
  if (FIT) {
    SC = fit; VW = MW * TS; VH = MH * TS; cv.width = VW; cv.height = VH; g.imageSmoothingEnabled = false;
    offX = Math.round((innerWidth - VW * SC) / 2); offY = Math.round(topH + (innerHeight - barH - topH - VH * SC) / 2);
    Object.assign(cv.style, {left: offX + 'px', top: offY + 'px', width: Math.round(VW * SC) + 'px', height: Math.round(VH * SC) + 'px'});
  } else {
    SC = 2; VW = Math.ceil(innerWidth / SC); VH = Math.ceil(innerHeight / SC); cv.width = VW; cv.height = VH; g.imageSmoothingEnabled = false; cvFull();
  }
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
const led = {r: 255, g: 190, b: 140, w: 60, br: 80};
function ledRGB() { const k = .35 + .65 * led.br / 100, mx = c => Math.round(Math.min(255, c + led.w * .8) * k); return [mx(led.r), mx(led.g), mx(led.b)]; }
const GAL = {
  photos: [['img/ca-sunset-gull.webp', 'Ventura Pier, Santa Barbara, after a long road trip'], ['img/ca-redwoods.webp', 'Muir Woods'], ['img/ca-palms.webp', 'The Pacifica Taco Bell'], ['img/ca-pier.webp', 'Santa Monica Pier'], ['img/ca-coast-night.webp', 'Half Moon Bay, by the Ritz golf course']],
  moe: [['img/moe-window.webp', 'Moe at the window'], ['img/moe-rug.webp', 'Moe on the rug'], ['img/moe-stare.webp', 'Moe, unimpressed'], ['img/moe-bath.webp', 'Bath day. He did not enjoy it.']]
};
const RO = [
  {id: 'door', label: 'Back outside', x: 6, y: 66, w: 28, h: 94, stand: 22, kind: 'door'},
  {id: 'desk', label: 'My setup', x: 40, y: 82, w: 110, h: 46, stand: 92, kind: 'room',
   card: {title: 'My setup', meta: 'The bunny case is non-negotiable', img: 'img/setup.webp', imgAlt: 'Jillanne’s desk setup with a white bunny-eared PC case and two monitors', body: ['Ironside build in a bunny case: Intel Core i5-12400F, GeForce RTX 4060, 32 GB DDR4-3200, 1 TB PCIe 4.0 NVMe, 650 W Gold PSU and individually sleeved cherry-blossom pink cables.', 'Two MSI 27" 1440p 170 Hz monitors, currently showing the LED controller enclosure and its PCB layout.']}},
  {id: 'trophy', label: 'Trophy shelf', x: 42, y: 30, w: 34, h: 26, stand: 60, kind: 'room',
   card: {title: '1st place, Geotab Intern Innovation Challenge', meta: 'Summer 2024 · 1st of 11 teams', body: ['A 7-day company hackathon on AI video telematics. I had never trained a model, so I spent two days learning, then built the in-cabin computer vision model that detects distracted driving.', 'We were the only team with a fully working demo.'], img: 'img/gt-cert.webp', imgAlt: 'Certificate of Achievement, first place, Geotab 10th Intern Innovation Challenge'}},
  {id: 'minimoe', label: 'Mini Moe', x: 80, y: 36, w: 16, h: 20, stand: 88, kind: 'room',
   card: {title: 'Mini Moe', meta: '3D printed', body: ['I missed Moe while I was away on co-op, so I 3D printed him to watch me study.'], img: 'img/minimoe.webp', imgAlt: 'A white 3D-printed cat figure next to a laptop and handwritten notes'}},
  {id: 'led', label: 'LED strip', x: 40, y: 57, w: 110, h: 8, stand: 96, kind: 'led'},
  {id: 'printer', label: '3D printer', x: 156, y: 122, w: 28, h: 40, stand: 170, kind: 'room',
   card: {title: '3D printer', meta: 'Where prototypes start', body: ['Fixtures, enclosures, test parts, and one very specific cat.']}},
  {id: 'photos', label: 'Photo wall', x: 160, y: 18, w: 56, h: 60, stand: 188, kind: 'gallery', gal: 'photos', title: 'Photo wall', meta: 'Four co-op terms in California'},
  {id: 'posters', label: 'Car posters', x: 222, y: 22, w: 72, h: 38, stand: 258, kind: 'room',
   card: {title: 'NSX and C5', meta: 'Pop-up headlights, always', body: ['An original Acura NSX in red and a C5 Corvette in black. The real ones are parked outside, and yes, the headlights work.']}},
  {id: 'bench', label: 'Workbench', x: 196, y: 104, w: 98, h: 58, stand: 244, kind: 'room',
   card: {title: 'On the bench', meta: 'Current project', body: ['A modular spinal pressure-relief system for wheelchairs and beds, for people with spinal cord injuries.', 'Soldering station, helping hands and a multimeter for everything else.']}},
  {id: 'moe', label: 'Moe', x: 116, y: 156, w: 34, h: 18, stand: 108, kind: 'gallery', gal: 'moe', title: 'Moe', meta: 'Cream, blue eyes, professional napper'}
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
  P_(112, 88, 34, 22, '#1f2328'); P_(114, 90, 30, 18, '#0f2a17'); P_(116, 92, 26, 14, '#1b5e20'); for (let i = 0; i < 6; i++) P_(118, 93 + i * 2, 1, 1, '#c9a227'); P_(121, 95, 12, 1, '#e57373'); P_(132, 95, 1, 7, '#e57373'); P_(126, 101, 7, 1, '#e57373'); P_(136, 94, 4, 3, '#111111'); P_(123, 99, 3, 3, '#c9a227'); P_(127, 110, 4, 8, '#2a2e33'); P_(122, 118, 14, 2, '#2a2e33');
  // keyboard + mouse + desk mat
  P_(76, 117, 58, 3, '#3a3f47'); P_(86, 116, 30, 2, '#cfd8dc'); for (let x = 87; x < 115; x += 3) P_(x, 116, 2, 1, '#9fb0b8'); P_(122, 116, 4, 2, '#e8eaed');
  // flowers in a vase
  P_(140, 110, 6, 10, '#f3f3f3'); P_(141, 104, 1, 6, '#5e8f52'); P_(144, 102, 1, 8, '#5e8f52'); P_(139, 101, 3, 3, '#e98aa6'); P_(143, 99, 3, 3, '#f2b5c6'); P_(145, 104, 2, 2, '#e98aa6');
  // shelf above desk with trophies
  P_(40, 54, 110, 4, '#7a5232'); P_(40, 54, 110, 1, '#946540'); P_(46, 58, 3, 4, '#5a3d28'); P_(141, 58, 3, 4, '#5a3d28');
  P_(44, 32, 30, 22, '#c9a227'); P_(46, 34, 26, 18, '#fbf6e6'); P_(49, 37, 20, 2, '#3a3f47'); P_(51, 41, 16, 1, '#9aa0a6'); P_(51, 44, 12, 1, '#9aa0a6'); P_(61, 46, 6, 6, '#d9a62a'); P_(63, 48, 2, 2, '#f2d27a');
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
}
function moeNap(c, ox, oy, now) {
  const P_ = (x, y, w, h, k) => R(c, ox + x, oy + y, w, h, k), b = reduce ? 0 : Math.floor(now / 900) % 2;
  P_(2, 14, 30, 3, 'rgba(0,0,0,.14)');
  P_(4, 5 - b, 22, 10 + b, '#f6e7d4'); P_(6, 4 - b, 18, 1, '#fbf2e6'); P_(20, 1, 12, 10, '#f6e7d4'); P_(21, -2, 3, 4, '#e9b98a'); P_(29, -2, 3, 4, '#e9b98a'); P_(22, 0, 1, 2, '#f3c6a0'); P_(30, 0, 1, 2, '#f3c6a0');
  P_(23, 4, 8, 5, '#e9b98a'); P_(23, 6, 3, 1, '#7a5a48'); P_(28, 6, 3, 1, '#7a5a48'); P_(26, 8, 2, 1, '#e98a9a');
  P_(0, 11, 10, 3, '#e9b98a'); P_(18, 13, 6, 2, '#e9b98a');
  if (!reduce && Math.floor(now / 1400) % 3 === 0) { P_(33, -6, 3, 1, '#ffffff'); P_(36, -10, 4, 1, '#ffffff'); }
}
function roomResize() { cvFull(); SC = Math.max(2, Math.min(6, Math.floor(Math.min(innerWidth / RMW, (innerHeight - 160) / RMH)))); VW = Math.ceil(innerWidth / SC); VH = Math.ceil(innerHeight / SC); cv.width = VW; cv.height = VH; g.imageSmoothingEnabled = false; }
function roomCam() { const U = VH - Math.round(160 / SC); const cx = RMW <= VW ? Math.round((RMW - VW) / 2) : Math.max(0, Math.min(RMW - VW, Math.round(RP.x) - Math.round(VW / 2))); return {x: cx, y: Math.round((RMH - U) / 2) - 2}; }
function roomNearest() { let best = null, bd = 18; RO.forEach(o => { const d = Math.abs(o.stand - RP.x); if (d < bd) { bd = d; best = o; } }); return best; }
function roomOpen(o) {
  if (o.kind === 'door') { exitRoom(); return; }
  if (o.kind === 'led') { ledCard(); return; }
  if (o.kind === 'gallery') { galleryCard(o); return; }
  openCard(Object.assign({}, o, {kind: 'room'}));
}
function galleryCard(o) {
  openId = o.id; let i = 0; const list = GAL[o.gal];
  const render = () => {
    card.innerHTML = `<div class="w-card-in" role="dialog" aria-labelledby="w-card-title"><button type="button" class="w-close" aria-label="Close">✕</button>
      <h2 id="w-card-title">${esc(o.title)}</h2><p class="w-meta">${esc(o.meta)}</p>
      <img class="w-img" src="${list[i][0]}" alt="${esc(list[i][1])}"><p class="w-cap">${esc(list[i][1])} · ${i + 1} of ${list.length}</p>
      <div class="w-actions"><button type="button" class="w-alt" id="g-prev">Previous</button><button type="button" class="w-go" id="g-next">Next</button></div></div>`;
    card.querySelector('.w-close').addEventListener('click', closeCard);
    card.querySelector('#g-prev').addEventListener('click', () => { i = (i - 1 + list.length) % list.length; render(); card.querySelector('#g-prev').focus(); });
    card.querySelector('#g-next').addEventListener('click', () => { i = (i + 1) % list.length; render(); card.querySelector('#g-next').focus(); });
  };
  render(); card.hidden = false; card.querySelector('#g-next').focus({preventScroll: true});
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
  const [lr, lg, lb] = ledRGB();
  // window sky by time of day
  const sky = {day: ['#9fd0f0', '#cfe9f7'], dawn: ['#f2b8a0', '#f9dcb8'], dusk: ['#8a6aa8', '#f2a98a'], night: ['#1b2550', '#2d3b6a']}[PHASE];
  R(g, 307 - cam.x, 23 - cam.y, 19, 31, sky[0]); R(g, 328 - cam.x, 23 - cam.y, 19, 31, sky[0]); R(g, 307 - cam.x, 56 - cam.y, 19, 31, sky[1]); R(g, 328 - cam.x, 56 - cam.y, 19, 31, sky[1]);
  if (PHASE === 'night') { [[312, 30], [320, 40], [334, 28], [341, 44], [316, 62]].forEach(([x, y]) => R(g, x - cam.x, y - cam.y, 1, 1, '#ffffff')); R(g, 336 - cam.x, 34 - cam.y, 4, 4, '#f2f0dc'); }
  // LED strip under the shelf
  for (let x = 42; x < 148; x += 3) R(g, x - cam.x, 58 - cam.y, 2, 1, `rgb(${lr},${lg},${lb})`);
  // Moe + Jillanne
  moeNap(g, 116 - cam.x, 158 - cam.y, now);
  const f = P.moving && !reduce ? (Math.floor(walkT * 8) % 2) + 1 : 0, bob = !P.moving && !reduce && Math.floor(now / 500) % 2 ? 1 : 0;
  girlSide(g, Math.round(RP.x) - 24 - cam.x, FLOOR - 62 - cam.y + bob, f, RP.dir < 0);
  // hover outline
  if (hoverObj) { g.strokeStyle = 'rgba(255,248,225,.9)'; g.lineWidth = 1; g.strokeRect(hoverObj.x - cam.x - 1.5, hoverObj.y - cam.y - 1.5, hoverObj.w + 3, hoverObj.h + 3); }
  // lighting
  if (TINT) { g.globalAlpha = .7; g.fillStyle = TINT; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; }
  g.globalCompositeOperation = 'lighter';
  const k = PHASE === 'night' ? .26 : PHASE === 'day' ? .12 : .2;
  for (let x = 46; x < 148; x += 16) { const gx = x - cam.x, gy = 59 - cam.y, gr = g.createRadialGradient(gx, gy, 0, gx, gy + 8, 24); gr.addColorStop(0, `rgba(${lr},${lg},${lb},${k})`); gr.addColorStop(1, `rgba(${lr},${lg},${lb},0)`); g.fillStyle = gr; g.fillRect(gx - 30, gy - 4, 60, 44); }
  [[93, 99, 26], [129, 99, 26], [328, 125, 30]].forEach(([x, y, r]) => { const gx = x - cam.x, gy = y - cam.y, gr = g.createRadialGradient(gx, gy, 0, gx, gy, r); gr.addColorStop(0, PHASE === 'night' ? 'rgba(150,200,255,.25)' : 'rgba(150,200,255,.1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(gx - r, gy - r, r * 2, r * 2); });
  if (PHASE !== 'night') { const gx = 327 - cam.x, gy = 55 - cam.y, gr = g.createRadialGradient(gx, gy, 0, gx, gy, 60); gr.addColorStop(0, 'rgba(255,240,200,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(gx - 60, gy - 60, 120, 120); }
  g.globalCompositeOperation = 'source-over';
  // DOM: hide world labels, show hover label + prompt
  labelNodes.forEach(n => n.hidden = true); iconNodes.forEach(([, im]) => im.hidden = true);
  if (hoverObj) { roomLabel.hidden = false; roomLabel.textContent = hoverObj.label; roomLabel.style.transform = `translate(${Math.round((hoverObj.x + hoverObj.w / 2 - cam.x) * SC)}px,${Math.round((hoverObj.y - 3 - cam.y) * SC)}px) translate(-50%,-100%)`; } else roomLabel.hidden = true;
  const n = roomNearest();
  if (n && card.hidden && RP.tx == null) { prompt.hidden = false; prompt.textContent = (touch ? 'Tap to ' : 'Press E to ') + (n.kind === 'door' ? 'go outside' : 'look at ' + n.label.toLowerCase()); prompt.style.transform = `translate(${Math.round((RP.x - cam.x) * SC)}px,${Math.round((FLOOR - 70 - cam.y) * SC)}px) translate(-50%,-100%)`; }
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
let boat = null, boatCool = 0;
const visited = new Set(); let autoId = null;
let running = false, last = 0, tourIdx = -1, openId = null, walkT = 0, touch = matchMedia('(pointer: coarse)').matches;

function blockedAt(px, py) { const c = cur(), tx = Math.floor(px / TS), ty = Math.floor(py / TS); if (tx < 0 || ty < 0 || tx >= c.W || ty >= c.H) return true; return c.block[ty * c.W + tx] === 1; }
function feetBlocked(x, y) { return blockedAt(x - 4, y - 3) || blockedAt(x + 4, y - 3) || blockedAt(x - 4, y) || blockedAt(x + 4, y); }
function spotPx(l) { return {x: l.spot[0] * TS + 8, y: l.spot[1] * TS + 10}; }
function rectDist(l) { const x0 = l.tx * TS, y0 = l.ty * TS, x1 = (l.tx + l.w) * TS, y1 = (l.ty + l.h) * TS; const dx = Math.max(x0 - P.x, 0, P.x - x1), dy = Math.max(y0 - (P.y - 4), 0, (P.y - 4) - y1); return Math.hypot(dx, dy); }
function nearest(max = 18) { let best = null, bd = max; cur().L.forEach(l => { const d = Math.min(rectDist(l), Math.hypot(spotPx(l).x - P.x, spotPx(l).y - P.y)); if (d < bd) { bd = d; best = l; } }); return best; }

function walkTo(l, open) { closeCard(); const s = spotPx(l); P.target = s; P.after = open ? l : null; P.stuck = 0; }
function teleport(l, open) {
  closeCard(); const fade = document.getElementById('fade'); fade.classList.add('on');
  setTimeout(() => { if (scene === 'room') { scene = 'world'; resize(); } const s = spotPx(l); P.x = s.x; P.y = s.y; P.dir = 'up'; P.target = null; moe.x = P.x - 14; moe.y = P.y + 8; trail.length = 0; fade.classList.remove('on'); if (open) openCard(l); }, reduce ? 0 : 260);
}

/* ---------------- cards ---------------- */
const esc = s => s.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const CONTACT = `<div class="w-contact"><code id="w-email">j4yousse@uwaterloo.ca</code><button type="button" class="w-copy">Copy</button></div><p class="w-links"><a href="https://www.linkedin.com/in/jillanne-youssef/" target="_blank" rel="noopener">LinkedIn</a> <a href="${RES}" target="_blank" rel="noopener">Résumé (PDF)</a></p>`;
function enterRoom() {
  closeCard(); const fade = document.getElementById('fade'); fade.classList.add('on');
  setTimeout(() => { worldPos.x = P.x; worldPos.y = P.y; scene = 'room'; window.track && track('enter_room'); resize(); RP.x = 22; RP.dir = 1; RP.tx = null; P.target = null; autoId = 'door'; trail.length = 0; fade.classList.remove('on'); }, reduce ? 0 : 260);
}
function exitRoom() {
  closeCard(); const fade = document.getElementById('fade'); fade.classList.add('on');
  setTimeout(() => { scene = 'world'; resize(); const s = spotPx(L.find(l => l.id === 'cabin')); P.x = s.x; P.y = s.y + 6; P.dir = 'down'; P.target = null; autoId = 'cabin'; moe.x = P.x - 14; moe.y = P.y + 4; trail.length = 0; fade.classList.remove('on'); }, reduce ? 0 : 260);
}
function ledCard() {
  openId = 'led'; autoId = 'led';
  const row = (k, lab, max) => `<label class="w-sl" for="led-${k}"><span>${lab}</span><input type="range" id="led-${k}" min="0" max="${max}" value="${led[k]}"><output id="led-${k}-v">${led[k]}</output></label>`;
  card.innerHTML = `<div class="w-card-in" role="dialog" aria-labelledby="w-card-title"><button type="button" class="w-close" aria-label="Close">✕</button>
    <h2 id="w-card-title">The LED controller</h2><p class="w-meta">Same controls the lighting studio uses</p>
    <p>I built this for Tesla's interior lighting design studio so designers could set RGBW values without a firmware engineer. Drag the sliders and the room's light strip follows.</p>
    <p><button type="button" class="w-more" data-proj="led">Read how I built it</button></p>
    ${row('r', 'R', 255)}${row('g', 'G', 255)}${row('b', 'B', 255)}${row('w', 'W', 255)}${row('br', 'Brightness', 100)}
    <div class="w-actions"><button type="button" class="w-alt" data-p="255,190,140,60">Warm</button><button type="button" class="w-alt" data-p="120,200,255,40">Cool</button><button type="button" class="w-alt" data-p="255,70,150,0">Pink</button><button type="button" class="w-alt" data-p="60,255,140,0">Green</button></div></div>`;
  card.hidden = false;
  card.querySelector('.w-close').addEventListener('click', closeCard);
  card.querySelectorAll('[data-proj]').forEach(b => b.addEventListener('click', () => { closeCard(); window.__openProject && window.__openProject(b.dataset.proj); }));
  ['r', 'g', 'b', 'w', 'br'].forEach(k => { const i = card.querySelector('#led-' + k); i.addEventListener('input', () => { led[k] = +i.value; card.querySelector('#led-' + k + '-v').textContent = i.value; }); });
  card.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { const [r, g2, b2, w] = b.dataset.p.split(',').map(Number); Object.assign(led, {r, g: g2, b: b2, w}); ['r', 'g', 'b', 'w'].forEach(k => { card.querySelector('#led-' + k).value = led[k]; card.querySelector('#led-' + k + '-v').textContent = led[k]; }); }));
  card.querySelector('#led-r').focus({preventScroll: true});
}
function openCard(l) {
  window.track && l && track('stop_open', {stop: l.id});
  if (l.kind === 'nsx' || l.kind === 'c5') { autoId = l.id; const n = carClicks[l.kind]++ % 3; if (n === 0) pops[l.kind] = 1; else if (n === 1) { pops[l.kind] = 1; window.__engine && window.__engine(l.kind); } else pops[l.kind] = 0; return; }
  if (l.kind === 'cabin') { enterRoom(); return; }
  if (l.kind === 'door') { exitRoom(); return; }
  if (l.kind === 'led') { ledCard(); return; }
  openId = l.id; autoId = l.id; if (l.tour) { visited.add(l.id); labelNodes[L.indexOf(l)].classList.add('w-visited'); }
  if (l.kind === 'nsx' || l.kind === 'c5') { const n = carClicks[l.kind]++ % 3; if (n === 0) pops[l.kind] = 1; else if (n === 1) { pops[l.kind] = 1; window.__engine && window.__engine(l.kind); } else pops[l.kind] = 0; }
  const c = l.card === 'contact' ? {title: 'Say hi', meta: 'Mailbox', body: ["I'm looking for a Summer 2027 role in mechanical or product design."], contact: true} : l.card;
  const ti = TOUR.indexOf(l); const tourBits = ti >= 0 ? `<p class="w-tourpos">Stop ${ti + 1} of ${TOUR.length}</p>` : '';
  card.innerHTML = `<div class="w-card-in" role="dialog" aria-modal="false" aria-labelledby="w-card-title">
    <button type="button" class="w-close" aria-label="Close">✕</button>${tourBits}
    <h2 id="w-card-title">${esc(c.title)}</h2><p class="w-meta">${esc(c.meta)}</p>
    ${(c.body || []).map(b => `<p>${esc(b)}</p>`).join('')}
    ${c.projects ? `<div class="w-projlist">${c.projects.map(([id, t]) => `<button type="button" class="tw-link" data-proj="${id}">${esc(t)}</button>`).join('')}</div>` : ''}${c.img ? `<img class="w-img" src="${c.img}" alt="${esc(c.imgAlt || '')}">` : ''}${c.contact ? CONTACT : ''}${c.note ? `<p class="w-note">${esc(c.note)}</p>` : ''}
    ${l.id === 'teslalight' ? '<button type="button" class="w-more" data-proj="led">Read the LED controller story</button>' : l.tour && l.id !== 'next' ? `<button type="button" class="w-more" data-proj="${l.id}">Read the full story</button>` : ''}</div>`;
  card.hidden = false;
  card.querySelector('.w-close').addEventListener('click', closeCard);
  card.querySelectorAll('[data-proj]').forEach(b => b.addEventListener('click', () => { closeCard(); window.__openProject && window.__openProject(b.dataset.proj); }));
  const cp = card.querySelector('.w-copy'); if (cp) cp.addEventListener('click', async () => { try { await navigator.clipboard.writeText('j4yousse@uwaterloo.ca'); cp.textContent = 'Copied'; } catch { const r = document.createRange(); r.selectNodeContents(card.querySelector('#w-email')); getSelection().removeAllRanges(); getSelection().addRange(r); cp.textContent = 'Selected'; } });
  card.querySelector('.w-close').focus({preventScroll: true});
  if (TOUR.includes(l)) { tourIdx = TOUR.indexOf(l); updateTour(); }
  if (!(l.kind === 'nsx' || l.kind === 'c5')) window.__sfx && window.__sfx('open');
}
function closeCard() { if (!card.hidden) { card.hidden = true; openId = null; cv.focus({preventScroll: true}); } }

/* ---------------- tour + bar ---------------- */
const tourPos = document.getElementById('tour-pos');
function updateTour() { tourPos.textContent = tourIdx < 0 ? 'Follow the path · 2022 → 2027' : `Stop ${tourIdx + 1} of ${TOUR.length}: ${TOUR[tourIdx].label}`; document.getElementById('tour-prev').disabled = tourIdx <= 0; document.getElementById('tour-next').textContent = tourIdx < 0 ? 'Start tour' : tourIdx >= TOUR.length - 1 ? 'Restart' : 'Next stop'; }
document.getElementById('tour-next').addEventListener('click', () => { tourIdx = tourIdx >= TOUR.length - 1 ? 0 : tourIdx + 1; updateTour(); teleport(TOUR[tourIdx], true); });
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
  L.forEach(l => { if (['mail'].includes(l.id)) return; const b = document.createElement('button'); b.type = 'button'; b.className = 'bm-pin' + (l.tour ? ' stop' : ''); b.textContent = l.yr ? `${l.label} · ${l.yr}` : l.label; b.style.left = ((l.tx + l.w / 2) / MW * 100) + '%'; b.style.top = (l.ty / MH * 100) + '%'; b.addEventListener('click', () => { big.hidden = true; if (TOUR.includes(l)) { tourIdx = TOUR.indexOf(l); updateTour(); } teleport(l, true); }); big.querySelector('.bm-pins').appendChild(b); });
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
  if (e.key === 'Escape') { if (!big.hidden) big.hidden = true; else if (!card.hidden) closeCard(); return; }
  if (e.target.closest && e.target.closest('input,textarea')) return;
  if (KEYMAP[e.key]) { e.preventDefault(); keys.add(KEYMAP[e.key]); P.target = null; if (!card.hidden) closeCard(); }
  else if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') && card.hidden && document.activeElement === cv && scene === 'room') { const o = roomNearest(); if (o) { e.preventDefault(); roomOpen(o); } }
  else if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') && card.hidden && document.activeElement === cv) { const n = nearest(); if (n) { e.preventDefault(); openCard(n); } }
  else if (e.key === 'm' || e.key === 'M') { if (big.hidden) openBig(); else big.hidden = true; }
});
addEventListener('keyup', e => { if (KEYMAP[e.key]) keys.delete(KEYMAP[e.key]); });
addEventListener('blur', () => keys.clear());
cv.addEventListener('pointerdown', e => {
  touch = e.pointerType === 'touch'; closeCard();
  if (scene === 'room') { const o = roomHit(e), cam = roomCam(); if (o && o.id === 'moe' && ++moeClicks % 3 === 1) window.__meow && window.__meow(); RP.tx = o ? o.stand : Math.max(12, Math.min(RMW - 14, e.clientX / SC + cam.x)); RP.after = o; return; }
  const cam = camera(); const wx = (e.clientX - offX) / SC + cam.x, wy = (e.clientY - offY) / SC + cam.y;
  const mo = scene === 'room' ? {x: roomMoe.x + 8, y: roomMoe.y + 10} : moe;
  if (Math.hypot(wx - mo.x, wy - (mo.y - 5)) < 11) { if (++moeClicks % 3 === 1) window.__meow && window.__meow(); return; }
  const hit = cur().L.find(l => wx >= l.tx * TS - 4 && wx <= (l.tx + l.w) * TS + 4 && wy >= l.ty * TS - 8 && wy <= (l.ty + l.h) * TS + 4);
  if (hit) { walkTo(hit, true); return; }
  P.target = {x: wx, y: wy}; P.after = null; P.stuck = 0;
});
prompt.addEventListener('click', () => { if (scene === 'room') { const o = roomNearest(); if (o) roomOpen(o); return; } const n = nearest(); if (n) openCard(n); });

/* ---------------- loop ---------------- */
function camera() {
  const px = Math.round(P.x), py = Math.round(P.y);
  const c = cur();
  if (scene === 'room') { const U = VH - Math.round(150 / SC), rw = c.W * TS, rh = c.H * TS; const cx = rw <= VW ? Math.round((rw - VW) / 2) : Math.max(0, Math.min(rw - VW, px - Math.round(VW / 2))); const cy = rh <= U ? Math.round((rh - U) / 2) - 4 : Math.max(0, Math.min(rh - U, py - Math.round(U / 2))); return {x: cx, y: cy}; }
  if (FIT) return {x: 0, y: 0};
  const ax = c.W * TS - VW, ay = c.H * TS - VH;
  return {x: ax <= 0 ? Math.round(ax / 2) : Math.max(0, Math.min(ax, px - Math.round(VW / 2))), y: ay <= 0 ? Math.round(ay / 2) : Math.max(0, Math.min(ay, py - Math.round(VH / 2) + 10))};
}
function step(now) {
  if (!running) return;
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (scene === 'room') { roomStep(dt); drawRoomFront(now); requestAnimationFrame(step); return; }
  let vx = 0, vy = 0;
  if (keys.has('left')) vx -= 1; if (keys.has('right')) vx += 1; if (keys.has('up')) vy -= 1; if (keys.has('down')) vy += 1;
  if (!vx && !vy && P.target) {
    const dx = P.target.x - P.x, dy = P.target.y - P.y, d = Math.hypot(dx, dy);
    if (d < 3) { P.target = null; if (P.after) { const l = P.after; P.after = null; openCard(l); } }
    else { vx = dx / d; vy = dy / d; }
  }
  if (boat) {
    boat.t = Math.min(1, boat.t + dt / boat.dur);
    const e = boat.t < .5 ? 2 * boat.t * boat.t : 1 - Math.pow(-2 * boat.t + 2, 2) / 2;
    P.x = boat.x0 + (boat.x1 - boat.x0) * e; P.y = boat.y0 + (boat.y1 - boat.y0) * e; P.dir = boat.x1 > boat.x0 ? 'right' : 'left'; P.moving = false;
    moe.x = P.x + (boat.x1 > boat.x0 ? -12 : 12); moe.y = P.y + 2; trail.length = 0;
    if (boat.t >= 1) { boat = null; boatCool = .8; }
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
    if (!boatCool && !wet(P.x, P.y) && Math.abs(vx) > Math.abs(vy) * .6 && wet(P.x + vx * 3 + Math.sign(vx) * 5, P.y)) {
      const ty = Math.floor(P.y / TS), rx = riverX(ty) * TS + 8, dirR = P.x < rx ? 1 : -1;
      let tx = Math.floor(P.x / TS) + dirR; while (tx > 0 && tx < MW - 1 && tiles[idx(tx, ty)] === T.WATER) tx += dirR;
      const okLand = (x, y) => y > 0 && y < MH - 1 && tiles[idx(x, y)] !== T.WATER && tiles[idx(x, y)] !== T.OCEAN && !block[idx(x, y)] && !block[idx(x + dirR, y)];
      let ly = null; for (const d of [0, 1, -1, 2, -2, 3, -3]) { let x = Math.floor(P.x / TS) + dirR; while (x > 0 && x < MW - 1 && tiles[idx(x, ty + d)] === T.WATER) x += dirR; if (okLand(x, ty + d)) { ly = ty + d; tx = x; break; } }
      if (ly != null && tx > 0 && tx < MW - 1) { boat = {x0: P.x, x1: tx * TS + 8 + dirR * 2, y0: P.y, y1: ly * TS + 10, t: 0, dur: Math.abs(tx * TS - P.x) / 80}; P.stuck = 0; }
    }
    if (!boat) {
      if (!feetBlocked(P.x + vx, P.y) && !wet(P.x + vx + Math.sign(vx) * 4, P.y)) P.x += vx;
      if (!feetBlocked(P.x, P.y + vy) && !wet(P.x, P.y + vy + Math.sign(vy) * 3)) P.y += vy;
    }
    if (P.target && Math.hypot(P.x - ox, P.y - oy) < sp * .2) { P.stuck += dt; if (P.stuck > .35) { const l = P.after; P.target = null; P.after = null; if (l && Math.hypot(spotPx(l).x - P.x, spotPx(l).y - P.y) < 60) openCard(l); } } else P.stuck = 0;
    walkT += dt; trail.push([P.x, P.y]); if (trail.length > 60) trail.shift();
  }
  // Moe follows a few steps behind (outside only)
  if (scene === 'world') {
  const tg = trail.length > 14 ? trail[trail.length - 14] : [P.x - 14, P.y + 6];
  const mdx = tg[0] - moe.x, mdy = tg[1] - moe.y, md = Math.hypot(mdx, mdy);
  moe.moving = md > 10;
  if (md > 10) { moe.x += mdx / md * Math.min(md - 10, 185 * dt); moe.y += mdy / md * Math.min(md - 10, 185 * dt); }
  }
  // auto-open when you walk up to something
  if (autoId) { const a = cur().L.find(l => l.id === autoId); if (!a || rectDist(a) > 30) autoId = null; }
  const nn = nearest(8);
  draw(now); requestAnimationFrame(step);
}
function draw(now) {
  const cam = camera();
  g.fillStyle = '#2f5e46'; g.fillRect(0, 0, VW, VH);
  g.drawImage(cur().map, cam.x, cam.y, VW, VH, 0, 0, VW, VH);
  // cars (dynamic so headlights can pop)
  const nsx = L.find(l => l.id === 'nsx'), c5 = L.find(l => l.id === 'c5');
  car(g, nsx.tx * TS + 1 - cam.x, nsx.ty * TS + 2 - cam.y, CARS.nsx, pops.nsx);
  car(g, c5.tx * TS + 1 - cam.x, c5.ty * TS + 2 - cam.y, CARS.c5, pops.c5);
  // sprites, sorted by y
  const f = P.moving && !reduce ? (Math.floor(walkT * 8) % 2) + 1 : 0;
  const bob = !P.moving && !reduce && Math.floor(now / 500) % 2 ? 1 : 0;
  const mf = Math.floor(now / 220) % 2;
  if (boat) { const bx = Math.round(P.x) - 16 - cam.x, by = Math.round(P.y) - 6 - cam.y;
    R(g, bx + 2, by + 9, 30, 3, 'rgba(20,50,90,.35)'); R(g, bx + 3, by, 26, 9, '#8a5a36'); R(g, bx, by + 1, 32, 6, '#8a5a36'); R(g, bx + 2, by + 2, 28, 4, '#b07a4a'); R(g, bx, by + 1, 32, 1, '#6b4426'); R(g, bx + 3, by + 8, 26, 1, '#5e3a20');
    const oar = Math.floor(now / 220) % 2; R(g, bx + 14, by - 2 + oar * 2, 2, 12, '#d9b483'); R(g, bx + 13, by + 9 + oar * 2, 4, 3, '#d9b483');
    if (!reduce) { const w = Math.floor(now / 120) % 3; R(g, bx - 3 - w, by + 4, 2, 1, '#cfe6f7'); R(g, bx + 34 + w, by + 4, 2, 1, '#cfe6f7'); } }
  const sprites = [[moe.y, () => moeSprite(g, Math.round(moe.x) - 7 - cam.x, Math.round(moe.y) - 11 - cam.y, moe.moving ? mf : 0)], [P.y, () => girl(g, Math.round(P.x) - 10 - cam.x, Math.round(P.y) - 25 - cam.y + bob, P.dir, f)]].sort((a, b) => a[0] - b[0]);
  sprites.forEach(s => s[1]());
  if (TINT) {
    g.fillStyle = TINT; g.fillRect(0, 0, VW, VH);
    if (PHASE !== 'day') { g.globalCompositeOperation = 'lighter'; lights.forEach(([lx, ly, r]) => { const x = lx - cam.x, y = ly - cam.y; if (x < -r || y < -r || x > VW + r || y > VH + r) return; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, PHASE === 'night' ? 'rgba(255,205,120,.55)' : 'rgba(255,205,120,.25)'); gr.addColorStop(1, 'rgba(255,205,120,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); });
      ['nsx', 'c5'].forEach(k => { if (!pops[k]) return; const l = L.find(o => o.id === k); const x = l.tx * TS + 18 - cam.x, y = l.ty * TS + 38 - cam.y; const gr = g.createRadialGradient(x, y, 0, x, y + 16, 34); gr.addColorStop(0, 'rgba(255,245,200,.55)'); gr.addColorStop(1, 'rgba(255,245,200,0)'); g.fillStyle = gr; g.fillRect(x - 34, y - 6, 68, 56); });
      g.globalCompositeOperation = 'source-over'; }
  }
  roomLabel.hidden = true; cv.style.cursor = 'default';
  // labels
  L.forEach((l, i) => {
    const x = offX + (l.tx * TS + l.w * TS / 2 - cam.x) * SC, y = offY + (l.ty * TS - cam.y - (l.kind === 'factory' ? 18 : 6)) * SC;
    const n = labelNodes[i]; const vis = !l.nolabel && x > -80 && x < innerWidth + 80 && y > -30 && y < innerHeight;
    n.hidden = !vis; if (vis) n.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%)`;
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
  if (n && card.hidden && !P.target && n.kind !== 'nsx' && n.kind !== 'c5') { const verb = n.kind === 'cabin' ? 'go inside' : n.kind === 'door' ? 'go outside' : `open ${n.label}`; prompt.hidden = false; prompt.textContent = touch ? `Tap to ${verb}` : `Press E to ${verb}`; const pw = prompt.offsetWidth || 160, px = Math.max(pw / 2 + 8, Math.min(innerWidth - pw / 2 - 8, offX + (P.x - cam.x) * SC)); prompt.style.transform = `translate(${Math.round(px)}px,${Math.round(Math.max(60, offY + (P.y - 30 - cam.y) * SC))}px) translate(-50%,-100%)`; }
  else prompt.hidden = true;
}
/* ---------------- public ---------------- */
let welcomed = false; let moeClicks = 0;
function welcome() {
  welcomed = true;
  const h = document.createElement('div'); h.id = 'w-hint'; h.setAttribute('role', 'status');
  h.textContent = touch ? 'Follow the numbered path · tap a building to visit' : 'Follow the numbered path · arrow keys to walk, or click a building';
  root.appendChild(h);
  const hide = () => { h.classList.add('off'); setTimeout(() => h.remove(), 700); removeEventListener('keydown', hide); cv.removeEventListener('pointerdown', hide); };
  addEventListener('keydown', hide); cv.addEventListener('pointerdown', hide); setTimeout(hide, 7000);
}
window.World = {
  start() { resize(); root.hidden = false; running = true; last = performance.now(); cv.setAttribute('tabindex', '0'); cv.focus({preventScroll: true}); requestAnimationFrame(step); if (!welcomed) welcome(); },
  stop() { running = false; root.hidden = true; keys.clear(); closeCard(); }
};
})();
