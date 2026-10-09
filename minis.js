/* Small toys for the houses in the game. Loaded when the game opens.
   Each one gets a canvas host and a controls host and returns {stop}. */
(() => {
const G = {A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
  ' ': '000000000000000', '.': '000000000000010', ':': '000010000010000', '%': '101001010100101', '+': '000010111010000', '-': '000000111000000', '!': '010010010000010', '?': '110001010000010', '/': '001001010100100', '°': '010101010000000', '$': '011110010011110', ',': '000000000010100', "'": '010010000000000', '#': '101111101111101'};
function text(c, s, x, y, col, sc = 1, align) {
  s = String(s).toUpperCase(); const w = s.length * 4 * sc - sc;
  if (align === 'c') x -= Math.floor(w / 2); else if (align === 'r') x -= w;
  c.fillStyle = col;
  for (let i = 0; i < s.length; i++) { const g = G[s[i]]; if (!g) continue; for (let k = 0; k < 15; k++) if (g[k] === '1') c.fillRect(Math.round(x + i * 4 * sc + (k % 3) * sc), Math.round(y + Math.floor(k / 3) * sc), sc, sc); }
  return w;
}
function make(host, W, H, bg, snap) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.className = 'w-mini-cv'; cv.style.background = bg; if (snap) cv.dataset.snap = '1'; host.appendChild(cv);
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  const P = (x, y, w, h, k) => { c.fillStyle = k; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const pt = e => { const r = cv.getBoundingClientRect(); return {x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H}; };
  return {cv, c, P, pt};
}
function loop(fn) { let on = true, last = performance.now(); const f = now => { if (!on) return; const dt = Math.min(.05, (now - last) / 1000); last = now; fn(dt, now); requestAnimationFrame(f); }; requestAnimationFrame(f); return () => { on = false; }; }
function glow(c, x, y, r, rgb, a) { if (a <= 0) return; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
function disc(P, cx, cy, r, col) { for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); P(cx - w, cy + y, w * 2, 1, col); } }
function hint(ctl) { const h = ctl.querySelector('.w-hint'); let t = 0; return (s, keep) => { h.textContent = s; clearTimeout(t); if (keep) t = setTimeout(() => { h.textContent = keep; }, 4200); }; }
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const M = {};

/* ---------- Tesla Lighting + room: the LED controller ---------- */
M.led = (host, ctl, X) => {
  const W = 200, H = 110, {cv, c, P, pt} = make(host, W, H, '#1c1e23');
  const L = X.led, NAMES = ['Off', 'Warm', 'Cool', 'Pink', 'Sunset', 'Ocean', 'Rainbow', 'Chase'];
  let sel = -1, seq = [];
  const SY = i => 25 + i * 13;
  ctl.innerHTML = `<div class="w-sl2">${['r', 'g', 'b', 'w'].map(k => `<label class="w-sl"><span>${{r: 'Red', g: 'Green', b: 'Blue', w: 'White'}[k]}</span><input type="range" min="0" max="255" data-k="${k}"><output></output></label>`).join('')}</div>
    <div class="w-keys" role="group" aria-label="Presets">${[1, 2, 3, 4, 5, 6, 7].map(n => `<button type="button" class="w-keycap" data-pre="${n}" aria-label="Preset ${n}, ${NAMES[n]}" title="${NAMES[n]}">${n}</button>`).join('')}<button type="button" class="w-keycap w-off" data-pre="0" aria-label="Lights off">Off</button></div>
    <p class="w-hint" aria-live="polite"></p>`;
  const sls = [...ctl.querySelectorAll('input')];
  const base = () => sel < 0 ? 'Pick a preset or drag the sliders. Tap a strip to set just that one.' : `Setting strip ${sel + 1} only. Tap it again for all six.`;
  const say = hint(ctl);
  const cur = () => L.strips[sel < 0 ? 0 : sel];
  const sync = () => { sls.forEach(i => { i.value = cur()[i.dataset.k]; i.nextElementSibling.textContent = i.value; }); ctl.querySelectorAll('[data-pre]').forEach(b => b.setAttribute('aria-pressed', String(L.pre === +b.dataset.pre))); };
  const set = (s, v) => Object.assign(s, {r: v[0], g: v[1], b: v[2], w: v[3]});
  const fill = v => { L.strips.forEach(s => set(s, v)); L.mode = 'static'; };
  const grad = a => { a.forEach((v, i) => set(L.strips[i], v)); L.mode = 'static'; };
  const PRE = {0: () => fill([0, 0, 0, 0]), 1: () => fill([255, 150, 70, 80]), 2: () => fill([110, 180, 255, 70]), 3: () => fill([255, 50, 150, 10]),
    4: () => grad([[255, 120, 30, 20], [255, 85, 50, 10], [245, 60, 100, 0], [205, 50, 160, 0], [150, 50, 205, 0], [95, 45, 210, 0]]),
    5: () => grad([[0, 225, 200, 10], [0, 195, 230, 10], [0, 155, 255, 0], [30, 115, 255, 0], [60, 85, 235, 0], [85, 65, 205, 0]]),
    6: () => { fill([255, 255, 255, 0]); L.mode = 'rainbow'; }, 7: () => { fill([255, 255, 255, 0]); L.mode = 'chase'; }};
  function shades() {
    const max = L.mode === 'static' && L.strips.every(s => s.r === 255 && s.g === 255 && s.b === 255 && s.w === 255);
    if (max && !X.state.shades) { X.state.shades = true; say('Everything at 255. Sunglasses on.', base()); }
    else if (!max) X.state.shades = false;
  }
  function preset(n) {
    PRE[n](); L.pre = n; L.touched = true; X.tone(300 + n * 60, .07, 'square', .03);
    seq.push(n); seq = seq.slice(-7);
    if (seq.join('') === '1234567') { L.strips.forEach((s, i) => set(s, i % 2 ? [233, 160, 110, 0] : [255, 236, 214, 40])); L.mode = 'static'; L.pre = 'moe'; X.meow(); say('Secret preset unlocked: Moe.', base()); seq = []; }
    else say(n ? `Preset ${n}: ${NAMES[n]}. It stays on around the map.` : 'Lights off.', base());
    shades(); sync();
  }
  sls.forEach(i => i.addEventListener('input', () => { const k = i.dataset.k, v = +i.value; (sel < 0 ? L.strips : [L.strips[sel]]).forEach(s => { s[k] = v; }); i.nextElementSibling.textContent = v; L.mode = 'static'; L.pre = 'custom'; L.touched = true; shades(); ctl.querySelectorAll('[data-pre]').forEach(b => b.setAttribute('aria-pressed', 'false')); }));
  ctl.querySelectorAll('[data-pre]').forEach(b => b.addEventListener('click', () => preset(+b.dataset.pre)));
  cv.addEventListener('pointerdown', e => {
    const p = pt(e);
    if (p.x > 80) { const i = [0, 1, 2, 3, 4, 5].find(k => Math.abs(p.y - SY(k)) < 6.5); if (i != null) { sel = sel === i ? -1 : i; X.tone(560, .04, 'triangle', .03); sync(); say(base()); } return; }
    if (p.x >= 27 && p.x <= 37 && p.y >= 21 && p.y < 21 + 7 * 10) { preset(Math.min(7, Math.floor((p.y - 21) / 10) + 1)); return; }
    if (p.x > 38 && p.x < 70 && p.y > 22 && p.y < 66) preset(typeof L.pre === 'number' && L.pre >= 1 && L.pre < 7 ? L.pre + 1 : 1);
  });
  say(base()); sync();
  const stop = loop((dt, now) => {
    P(0, 0, W, H, '#1c1e23'); for (let x = 0; x < W; x += 10) P(x, 0, 1, H, '#202329');
    // the controller: translucent enclosure, four sliders, seven keys, a screen
    P(5, 13, 66, 86, 'rgba(0,0,0,.35)'); P(4, 11, 66, 86, '#d8d5ce'); P(5, 12, 64, 84, '#e7e4dd'); P(5, 12, 64, 1, '#f6f4ef'); P(4, 95, 66, 2, '#b5b1a9');
    const s = cur();
    ['r', 'g', 'b', 'w'].forEach((k, i) => { const y = 25 + i * 17; P(9, y, 16, 2, '#2b2d31'); const kx = 8 + Math.round(s[k] / 255 * 14); P(kx, y - 3, 5, 8, '#1f2126'); P(kx, y - 3, 5, 1, '#454952'); P(kx + 1, y - 1, 3, 1, '#2f3238'); });
    for (let i = 0; i < 7; i++) { const y = 21 + i * 10, on = L.pre === i + 1; P(28, y, 8, 8, on ? '#33363d' : '#1f2126'); P(28, y, 8, 1, '#4a4e57'); if (on) P(30, y + 6, 4, 1, '#7fd1ff'); }
    P(39, 22, 29, 44, '#0c0f14'); P(40, 23, 27, 42, '#151a22');
    const scr = L.pre === 'moe' ? 'MOE' : L.pre === 'custom' ? 'CUSTOM' : L.pre === 0 ? 'OFF' : 'PRESET';
    text(c, scr, 53, 27, '#8fa6bd', 1, 'c');
    if (typeof L.pre === 'number' && L.pre > 0) text(c, L.pre, 53, 37, '#ffffff', 3, 'c');
    else if (L.pre === 'custom' || L.pre === 'moe') for (let i = 0; i < 6; i++) P(43 + i * 4, 40, 3, 12, `rgb(${X.ledColor(i, now)})`);
    if (X.state.shades) { P(44, 56, 7, 4, '#000'); P(55, 56, 7, 4, '#000'); P(51, 57, 4, 1, '#000'); P(45, 57, 2, 1, '#555'); P(56, 57, 2, 1, '#555'); }
    else text(c, NAMES[L.pre] && typeof L.pre === 'number' ? NAMES[L.pre] : L.pre === 'moe' ? 'MEOW' : 'RGBW', 53, 57, '#5f7a95', 1, 'c');
    // harness out to six strips
    P(70, 20, 6, 74, '#2a2c31');
    for (let i = 0; i < 6; i++) { const y = SY(i); P(70, y - 1, 14, 2, '#e8e8ea'); P(70, y + 1, 14, 1, '#b9b9bd'); }
    const cols = [0, 1, 2, 3, 4, 5].map(i => X.ledColor(i, now));
    for (let i = 0; i < 6; i++) {
      const y = SY(i), col = cols[i];
      P(84, y - 3, 114, 6, '#efefec'); P(84, y + 2, 114, 1, '#c6c6c0'); P(82, y - 3, 4, 6, '#d9d9d6');
      for (let x = 87; x < 196; x += 7) { P(x, y - 2, 4, 4, `rgb(${col})`); P(x + 5, y - 1, 1, 2, '#6a6a6a'); }
      if (sel === i) { P(80, y - 5, 120, 1, '#f2c14e'); P(80, y + 5, 120, 1, '#f2c14e'); }
    }
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { const [r, g, b] = cols[i], k = (r + g + b) / 765; for (let x = 89; x < 196; x += 14) glow(c, x, SY(i), 10, `${r},${g},${b}`, .32 * k); }
    c.globalCompositeOperation = 'source-over';
  });
  return {stop};
};

/* ---------- Tesla Cells: wire up the cell ---------- */
M.cell = (host, ctl, X) => {
  const W = 200, H = 110, {cv, c, P, pt} = make(host, W, H, '#e8edf1');
  ctl.innerHTML = `<div class="w-actions"><button type="button" class="w-alt" data-reset>Reset</button></div><p class="w-hint" aria-live="polite"></p>`;
  const say = hint(ctl);
  const T = {pos: {x: 184, y: 64}, neg: {x: 100, y: 64}};
  const E = {red: {hx: 61, hy: 63, home: [80, 40], col: '#d7372f', want: 'pos', name: 'Red'}, black: {hx: 61, hy: 81, home: [80, 99], col: '#2b2d31', want: 'neg', name: 'Black'}};
  Object.values(E).forEach(e => { e.x = e.home[0]; e.y = e.home[1]; e.att = null; });
  let grab = null, sel = null, moved = 0, wrong = 0, charge = 0, powered = false, sparks = [], smoke = [], t = 0;
  const snap = (e, k) => { e.att = k; e.x = T[k].x + (k === 'pos' ? 3 : -4); e.y = T[k].y; };
  if (X.state.cells) { snap(E.red, 'pos'); snap(E.black, 'neg'); charge = 1; powered = true; }
  const back = e => { e.x = e.home[0]; e.y = e.home[1]; e.att = null; };
  const base = () => powered ? 'Powered up. The Tesla Cells building is glowing on the map.' : 'Drag each wire to a terminal. Red goes to +, black to −.';
  say(base());
  function attach(k, t2) {
    const e = E[k];
    if (Object.values(E).some(o => o !== e && o.att === t2)) { back(e); return; }
    if (e.want === t2) {
      snap(e, t2); sel = null; X.tone(880, .05, 'square', .03);
      say(E.red.att && E.black.att ? 'Circuit closed. Charging…' : `${e.name} is on. Now the ${k === 'red' ? 'black' : 'red'} one.`);
    } else {
      wrong++; back(e); sel = null; X.tone(90, .2, 'sawtooth', .05);
      for (let n = 0; n < 16; n++) sparks.push({x: T[t2].x, y: T[t2].y, vx: (Math.random() - .5) * 110, vy: -Math.random() * 90, l: .5});
      if (wrong % 3 === 0) { for (let n = 0; n < 9; n++) smoke.push({x: T[t2].x + (Math.random() - .5) * 8, y: T[t2].y - 4, r: 2 + Math.random() * 3, vy: -10 - Math.random() * 10, l: 2}); say('And there goes the magic smoke. Red to +, black to −.', base()); }
      else say('Sparks! That is the wrong terminal.', base());
    }
  }
  function reset() { back(E.red); back(E.black); charge = 0; powered = false; X.state.cells = false; sel = null; say(base()); }
  ctl.querySelector('[data-reset]').addEventListener('click', reset);
  const near = (p, o, r) => Math.hypot(o.x - p.x, o.y - p.y) < r;
  cv.addEventListener('pointerdown', e => {
    const p = pt(e); moved = 0;
    const k = Object.keys(E).find(k2 => near(p, E[k2], 11));
    if (k) { if (powered) return; if (E[k].att) { E[k].att = null; charge = 0; } grab = k; sel = k; cv.setPointerCapture(e.pointerId); return; }
    const t2 = Object.keys(T).find(k2 => near(p, T[k2], 13)); if (t2 && sel) attach(sel, t2);
  });
  cv.addEventListener('pointermove', e => { if (!grab) return; const p = pt(e), o = E[grab]; moved += Math.hypot(p.x - o.x, p.y - o.y); o.x = Math.max(4, Math.min(W - 4, p.x)); o.y = Math.max(4, Math.min(H - 4, p.y)); });
  const up = e => {
    if (!grab) return; const k = grab; grab = null; const p = pt(e);
    const t2 = Object.keys(T).find(k2 => near(p, T[k2], 14));
    if (t2 && moved > 3) attach(k, t2); else { back(E[k]); if (moved <= 3) { sel = k; say(`${E[k].name} wire picked up. Tap a terminal.`); } else sel = null; }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.tabIndex = 0; cv.setAttribute('aria-label', 'A battery cell and two wires. Press R or B to pick up a wire, then + or − to connect it.');
  cv.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === 'r' || k === 'b') { sel = k === 'r' ? 'red' : 'black'; say(`${E[sel].name} wire picked up. Press + or −.`); e.stopPropagation(); }
    else if ((k === '+' || k === '=') && sel) { attach(sel, 'pos'); e.stopPropagation(); }
    else if ((k === '-' || k === '_') && sel) { attach(sel, 'neg'); e.stopPropagation(); }
  });
  const bez = (e, u) => { const x0 = e.hx, y0 = e.hy, x3 = e.x, y3 = e.y, x1 = x0 + 22, y1 = y0 + 4, x2 = x3 - (x3 > x0 ? 18 : -10), y2 = y3 + 14, m = 1 - u; return [m * m * m * x0 + 3 * m * m * u * x1 + 3 * m * u * u * x2 + u * u * u * x3, m * m * m * y0 + 3 * m * m * u * y1 + 3 * m * u * u * y2 + u * u * u * y3]; };
  const stop = loop((dt, now) => {
    t += dt;
    if (E.red.att && E.black.att && !powered) { charge = Math.min(1, charge + dt / 1.6); if (charge >= 1) { powered = true; X.state.cells = true; X.chime(); say(base()); } }
    P(0, 0, W, H, '#e8edf1'); P(0, 96, W, 14, '#d3dadf'); P(0, 96, W, 1, '#bfc8ce');
    // the building
    P(8, 92, 56, 4, 'rgba(0,0,0,.12)'); P(6, 34, 56, 60, '#f3f5f6'); P(6, 34, 56, 16, '#d9dee2');
    for (let y = 36; y < 48; y += 5) for (let x = 9; x < 58; x += 8) { P(x, y, 7, 4, '#26385a'); P(x, y, 7, 1, '#4d6a96'); }
    const lit = powered ? 1 : charge * .4, pulse = powered && !X.reduce ? .85 + .15 * Math.sin(now / 300) : 1;
    P(6, 54, 56, 18, lit ? `rgb(${Math.round(42 + 213 * lit * pulse)},${Math.round(52 + 90 * lit * pulse)},${Math.round(70 + 110 * lit * pulse)})` : '#2a3446');
    for (let x = 14; x < 62; x += 8) P(x, 54, 1, 18, '#7fa7c4');
    P(28, 78, 12, 16, '#5b6670'); P(33, 78, 1, 16, '#9cc8e8');
    P(61, 60, 4, 6, '#3a3d44'); P(61, 78, 4, 6, '#3a3d44');
    // the cell
    P(104, 79, 78, 4, 'rgba(0,0,0,.14)'); P(104, 50, 76, 28, '#c4ccd3'); P(104, 50, 76, 3, '#e3e8ec'); P(104, 74, 76, 4, '#9aa4ad');
    P(100, 52, 4, 24, '#b3bcc4'); P(180, 59, 5, 10, '#dde3e8'); P(180, 59, 5, 1, '#f3f6f8');
    P(114, 57, 56, 14, '#25282e'); P(116, 59, 52 * charge, 10, charge >= 1 ? '#47c26a' : '#f2c14e');
    text(c, charge >= 1 ? 'CHARGED' : charge > 0 ? Math.round(charge * 100) + '%' : 'CELL', 142, 62, charge > 0 ? '#111' : '#9aa4ad', 1, 'c');
    text(c, '+', 186, 46, '#d7372f', 2, 'c'); text(c, '-', 99, 46, '#2b2d31', 2, 'c');
    if (sel && !grab && Math.floor(now / 300) % 2) Object.values(T).forEach(o => { P(o.x - 7, o.y - 9, 14, 1, '#f2c14e'); P(o.x - 7, o.y + 9, 14, 1, '#f2c14e'); });
    // wires
    c.lineWidth = 2.4; c.lineCap = 'round';
    Object.values(E).forEach(e => { c.strokeStyle = e.col; c.beginPath(); for (let u = 0; u <= 1.001; u += .05) { const [x, y] = bez(e, u); u ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); P(e.x - 3, e.y - 3, 6, 6, e.col); P(e.x - 2, e.y - 2, 2, 2, 'rgba(255,255,255,.5)'); if (sel === Object.keys(E).find(k => E[k] === e) && Math.floor(now / 250) % 2) { P(e.x - 5, e.y - 5, 10, 1, '#f2c14e'); P(e.x - 5, e.y + 4, 10, 1, '#f2c14e'); } });
    if (E.red.att && E.black.att && !X.reduce) Object.values(E).forEach((e, j) => { for (let k = 0; k < 4; k++) { const u = ((now / 900) + k / 4 + j * .12) % 1, [x, y] = bez(e, j ? u : 1 - u); P(x - 1, y - 1, 2, 2, '#fff6b0'); } });
    // sparks + smoke
    sparks = sparks.filter(s => (s.l -= dt) > 0); sparks.forEach(s => { s.vy += 200 * dt; s.x += s.vx * dt; s.y += s.vy * dt; P(s.x, s.y, 1, 1, s.l > .3 ? '#fff3a0' : '#ff9a3c'); });
    smoke = smoke.filter(s => (s.l -= dt) > 0); smoke.forEach(s => { s.y += s.vy * dt; s.r += dt * 3; c.globalAlpha = Math.min(.6, s.l / 2); disc(P, Math.round(s.x), Math.round(s.y), Math.round(s.r), '#8a8f96'); c.globalAlpha = 1; });
    if (powered) { c.globalCompositeOperation = 'lighter'; glow(c, 34, 63, 34, '255,120,170', .35 * pulse); c.globalCompositeOperation = 'source-over'; if (!X.reduce) for (let k = 0; k < 3; k++) { const a = now / 600 + k * 2.1; P(34 + Math.cos(a) * 30, 40 + Math.sin(a * 1.3) * 8, 1, 1, '#ffd1e3'); } }
  });
  return {stop};
};

/* ---------- Google: the propeller hat ---------- */
M.hat = (host, ctl, X) => {
  const W = 150, H = 84, {cv, c, P} = make(host, W, H, '#cfe9f7', true);
  ctl.innerHTML = `<div class="w-actions"><button type="button" class="w-go" data-spin>Spin it</button><span class="w-stat" aria-live="off"></span></div><p class="w-hint" aria-live="polite"></p>`;
  const say = hint(ctl), stat = ctl.querySelector('.w-stat');
  const base = 'Tap the hat to spin the propeller. Keep tapping.';
  say(base);
  let om = 0, ang = 0, lift = 0, fly = null, flights = 0, t = 0, lastStat = '';
  const spin = () => { if (fly) return; om = Math.min(64, om + 9); if (om > 14) X.state.hat = true; X.tone(240 + om * 9, .05, 'triangle', .035); };
  cv.addEventListener('pointerdown', spin); ctl.querySelector('[data-spin]').addEventListener('click', spin);
  // "Intern", embroidered like the real hat
  const GL = {I: ['111', '010', '010', '010', '010', '010', '111'], n: ['0000', '0000', '1110', '1001', '1001', '1001', '1001'], t: ['010', '010', '111', '010', '010', '010', '011'], e: ['0000', '0000', '0110', '1001', '1111', '1000', '0111'], r: ['0000', '0000', '1011', '1100', '1000', '1000', '1000']};
  const WORD = [['I', '#3f7be0'], ['n', '#e0453a'], ['t', '#ffffff'], ['e', '#3f7be0'], ['r', '#2f9e4f'], ['n', '#e0453a']];
  function word(x, y) { let cx = x; WORD.forEach(([ch, col]) => { const g = GL[ch]; g.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) if (row[rx] === '1') { P(cx + rx + 1, y + ry + 1, 1, 1, 'rgba(120,80,0,.35)'); P(cx + rx, y + ry, 1, 1, col); } }); cx += g[0].length + 1; }); }
  const YEL = ['#f8d22a', '#f2c414', '#dcae0c'], BLU = ['#4a6ee8', '#3557d4', '#2943a8'], RED = ['#e9483c', '#d23a2f', '#a92b22'], GRN = ['#38b35a', '#2c9a4b', '#1f7a39'];
  function hat(cx, by, now) {
    // crown: six panels, front yellow, wearer's right blue, wearer's left red
    const cw = 36, ch = 28, top = by - ch;
    for (let r = 0; r < ch; r++) {
      const tt = (r + 1) / ch, half = Math.round(cw * Math.pow(1 - Math.pow(1 - tt, 2.2), 1 / 2.2));
      for (let x = -half; x < half; x++) {
        const fx = x / half, front = Math.abs(fx) < .5, shadeI = Math.abs(fx) > .82 ? 2 : (fx < -.6 || fx > .66 || r > ch - 4) ? 1 : 0;
        let col = front ? YEL[shadeI] : x < 0 ? BLU[shadeI] : RED[shadeI];
        if (Math.abs(Math.abs(fx) - .5) < .035) col = front ? YEL[2] : x < 0 ? BLU[2] : RED[2];
        P(cx + x, top + r, 1, 1, col);
      }
      const sx = Math.round(half * .5); if (r % 2 === 0 && r > 3) { P(cx - sx - 2, top + r, 1, 1, 'rgba(255,255,255,.45)'); P(cx + sx + 1, top + r, 1, 1, 'rgba(255,255,255,.45)'); }
    }
    for (let r = 4; r < 14; r++) P(cx - 13 + Math.round(r * .3), top + r, 3, 1, 'rgba(255,255,255,.28)');
    P(cx - cw, by - 1, cw * 2, 1, 'rgba(0,0,0,.12)');
    // bill: sticks out in front only, seen from a little above, with the colored stitching
    const brx = 39, bry = 17, bcy = by - 3;
    const bf = y => .93 + .07 * Math.min(1, y / (bry * .4));
    for (let y = 0; y <= bry; y++) { const w = Math.round(brx * bf(y) * Math.sqrt(1 - (y / bry) ** 2)); P(cx - w, bcy + y, w * 2, 1, y > bry - 2 ? GRN[2] : y > bry - 5 ? GRN[1] : GRN[0]); }
    [[35, 14, '#f08a24'], [31, 11.6, '#f6d36b'], [27, 9.4, '#5b8ee6']].forEach(([rx, ry, col]) => { for (let a = .1; a < Math.PI - .1; a += .03) { if (Math.floor(a / .03) % 3 === 2) continue; const yy = Math.sin(a) * ry; P(cx + Math.cos(a) * rx * bf(yy * bry / ry), bcy + yy, 1, 1, col); } });
    word(cx - 13, top + 13);
    P(cx - 2, top - 1, 4, 2, YEL[2]);
    // propeller: bead stem and two blue blades spinning flat
    const beads = [BLU[0], '#f6d36b', RED[0], GRN[0]];
    beads.forEach((col, i) => { const y = top - 4 - i * 3; P(cx - 1, y, 3, 3, col); P(cx - 1, y, 1, 1, 'rgba(255,255,255,.7)'); });
    P(cx, top - 15, 1, 3, '#b9c0c6');
    const py = top - 16, L = 30, k = Math.cos(ang), s = Math.sin(ang);
    if (om > 30) { c.globalAlpha = Math.min(.5, (om - 30) / 40); for (let x = -L; x <= L; x++) P(cx + x, py + (Math.abs(x) < L * .9 ? 0 : 1), 1, 2, '#6f8ff0'); c.globalAlpha = 1; }
    const blade = (dir, col, edge) => { const len = Math.round(L * Math.abs(k)), sgn = Math.sign(k * dir) || 1, w = 4; for (let i = 1; i <= len; i++) { const yy = py - 1 + Math.round(s * dir * i / L * 2); P(cx + sgn * i - (sgn < 0 ? 0 : 0), yy, 1, i > len - 3 ? w - 1 : w, i % 5 === 0 ? edge : col); } };
    if (s * 1 >= 0) { blade(-1, '#3d5fd8', '#5a7cf0'); blade(1, '#4f71ea', '#7d98f5'); } else { blade(1, '#4f71ea', '#7d98f5'); blade(-1, '#3d5fd8', '#5a7cf0'); }
    P(cx - 1, py - 1, 3, 3, '#f6d36b'); P(cx - 1, py - 1, 1, 1, '#fff');
  }
  const stop = loop((dt, now) => {
    t += dt; ang += om * dt;
    if (!fly) {
      om = Math.max(0, om - (.6 + om * .3) * dt);
      if (om > 38) lift += dt; else lift = Math.max(0, lift - dt * 2);
      if (lift > .35) { fly = {y: 0, vy: 0, phase: 'up', t: 0, b: 0}; flights++; X.tone(300, .5, 'triangle', .04, 1100); say(flights === 1 ? 'Liftoff! There it goes…' : `Liftoff number ${flights}.`); }
    }
    let hy = 0, hx = 0;
    if (fly) {
      fly.t += dt;
      if (fly.phase === 'up') { om = 64; fly.vy -= 160 * dt; fly.y += fly.vy * dt; hx = Math.sin(fly.t * 5) * 4 * Math.min(1, fly.t * 2); if (fly.y < -100) { fly.phase = 'gone'; fly.t = 0; say('Gone. Give it a second…'); } }
      else if (fly.phase === 'gone') { om = 30; if (fly.t > (X.reduce ? .3 : 1.3)) { fly.phase = 'down'; fly.t = 0; fly.y = -100; fly.vy = 0; } }
      else if (fly.phase === 'down') { om = Math.max(18, om - dt * 8); fly.vy = Math.min(55, fly.vy + 40 * dt); fly.y += fly.vy * dt; hx = Math.sin(fly.t * 2.4) * 8 * Math.min(1, -fly.y / 40); if (fly.y >= 0) { fly.y = 0; fly.phase = 'bounce'; fly.vy = -70; fly.b = 0; X.tone(150, .09, 'square', .05); } }
      else { om = Math.max(0, om - dt * 20); fly.vy += 400 * dt; fly.y += fly.vy * dt;
        if (fly.y >= 0) { fly.y = 0; fly.b++; fly.vy = -70 * Math.pow(.42, fly.b); X.tone(180 + fly.b * 40, .06, 'square', .04); if (fly.b >= 4 || Math.abs(fly.vy) < 6) { fly = null; lift = 0; om = 0; say(flights === 1 ? 'Boing. Safe landing. Spin it again?' : 'Landed. Again?', base); } } }
      if (fly) hy = Math.round(fly.y);
    }
    const sq = fly && fly.phase === 'bounce' && fly.y > -1.5 ? 1 : 0;
    const jit = om > 34 && !X.reduce && !fly ? Math.round(Math.sin(t * 40) * (om - 34) / 16) : 0;
    // sky, smooth clouds, desk, box
    P(0, 0, W, 50, '#cfe9f7'); P(0, 50, W, 20, '#e3f2fb');
    c.fillStyle = '#ffffff';
    [[20, 12, 0], [104, 8, 1], [70, 24, 2]].forEach(([x, y, i]) => { const cx = (x + t * (2 + i)) % 180 - 15; c.fillRect(cx, y, 16, 4); c.fillRect(cx + 3, y - 3, 9, 3); });
    P(0, 70, W, 14, '#e8dccb'); P(0, 70, W, 1, '#d4c4ad');
    P(28, 68, 94, 16, '#c79a62'); P(28, 68, 94, 2, '#d9b07a'); P(72, 68, 6, 16, '#e3c494'); P(32, 78, 14, 1, '#a87d48');
    const shw = Math.max(16, 80 + Math.max(-100, hy) * .6); P(75 - shw / 2, 72, shw, 2, `rgba(90,60,30,${fly ? .2 : .28})`);
    hat(Math.round(75 + hx + jit), 58 + hy + sq, now);
    const st = `RPM ${Math.round(om * 60 / (Math.PI * 2))}` + (flights ? ` · Liftoffs ${flights}` : '');
    if (st !== lastStat) { stat.textContent = st; lastStat = st; }
  });
  return {stop};
};

/* ---------- Level: unlock the door ---------- */
M.lock = (host, ctl, X) => {
  const W = 200, H = 110, {cv, c, P, pt} = make(host, W, H, '#dfe6ea');
  ctl.innerHTML = `<div class="w-actions"><button type="button" class="w-go" data-act>Unlock</button></div><p class="w-hint" aria-live="polite"></p>`;
  const say = hint(ctl), btn = ctl.querySelector('[data-act]');
  const base = 'Tap the lock on the door to unlock it.';
  say(base);
  let st = 'locked', bolt = 1, door = 0, led = '#d7372f', beepT = 0, taps = [], opens = 0;
  const buf = document.createElement('canvas'); buf.width = 24; buf.height = 20; const bc = buf.getContext('2d');
  function unlock() { if (st !== 'locked') return; st = 'unlocking'; led = '#47c26a'; beepT = .5; [880, 1047, 1319].forEach((f, i) => setTimeout(() => X.tone(f, .06, 'square', .03), i * 70)); btn.disabled = true; }
  function lockUp() { if (st !== 'open') return; st = 'closing'; btn.disabled = true; }
  btn.addEventListener('click', () => st === 'locked' ? unlock() : lockUp());
  cv.addEventListener('pointerdown', e => {
    const p = pt(e), now = performance.now();
    if (p.x > 70 && p.x < 124 && p.y > 22) {
      taps.push(now); taps = taps.filter(x => x > now - 1600);
      if (taps.length >= 8) { taps = []; say('Mash it all you want. No dropped presses on this keypad.', st === 'open' ? 'Tap the door to close and lock it.' : base); }
      if (st === 'locked') unlock(); else if (st === 'open') lockUp(); else X.tone(990, .03, 'square', .02);
    }
  });
  const stop = loop((dt, now) => {
    beepT = Math.max(0, beepT - dt);
    if (st === 'unlocking') { if (bolt > 0) bolt = Math.max(0, bolt - dt / .35); else { door = Math.min(1, door + dt / (X.reduce ? .2 : .9)); if (door >= 1) { st = 'open'; opens++; btn.disabled = false; btn.textContent = 'Close and lock'; if (opens === 1) X.meow(); say(opens === 1 ? 'Unlocked. Moe was waiting inside.' : 'Unlocked. Tap the door to close and lock it.'); } } }
    if (st === 'closing') { if (door > 0) door = Math.max(0, door - dt / (X.reduce ? .2 : .7)); else { bolt = Math.min(1, bolt + dt / .3); if (bolt >= 1) { st = 'locked'; led = '#d7372f'; btn.disabled = false; btn.textContent = 'Unlock'; X.tone(130, .08, 'square', .05); say('Locked. Bolt thrown.', base); } } }
    // wall and step
    P(0, 0, W, H, '#dfe6ea'); for (let y = 4; y < 104; y += 6) P(0, y, W, 1, '#ccd5db');
    P(0, 104, W, 6, '#a8b3ba'); P(64, 102, 62, 4, '#b9c3c9');
    P(66, 18, 60, 88, '#2c3035');
    // inside: warm room with Moe
    P(72, 24, 48, 80, '#f3d9a8'); P(72, 90, 48, 14, '#c99a6b'); for (let x = 72; x < 120; x += 8) P(x, 90, 1, 14, '#b48654'); P(80, 96, 32, 4, '#7f9cb3');
    P(106, 34, 2, 22, '#7a5232'); P(102, 30, 10, 6, '#fff3c4'); P(84, 40, 14, 12, '#a8794e'); P(85, 41, 12, 10, '#9cc8e8');
    bc.clearRect(0, 0, 24, 20); X.moeSprite(bc, 4, 3, Math.floor(now / 500) % 2); c.drawImage(buf, 0, 0, 24, 20, 74, 56, 48, 40);
    if (door > 0) { c.globalCompositeOperation = 'lighter'; glow(c, 100, 60, 44, '255,196,120', .35 * door); c.globalCompositeOperation = 'source-over'; }
    // the door, swinging on its left hinge
    const dw = Math.max(5, Math.round(48 * Math.cos(door * 1.42))), sh = Math.round(40 * door);
    P(72, 24, dw, 80, `rgb(${59 - sh / 3},${63 - sh / 3},${69 - sh / 3})`); P(72, 34, dw, 3, '#b88a5a');
    if (dw > 20) { P(76, 42, dw - 8, 22, 'rgba(0,0,0,.12)'); P(76, 70, dw - 8, 28, 'rgba(0,0,0,.12)'); }
    if (door > 0) P(72 + dw, 24, Math.max(1, Math.round(4 * Math.sin(door * 1.42))), 80, '#262a2f');
    if (dw > 18) {
      const lx = 72 + dw - 12;
      P(lx, 52, 8, 22, '#1f2126'); P(lx, 52, 8, 1, '#3a3d44');
      for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) P(lx + 1 + k * 4, 56 + r * 5, 2, 2, beepT > 0 ? '#9fd9ff' : '#4a4e57');
      P(lx + 2, 72, 4, 1, led); P(lx - 2, 78, 8, 2, '#b88a5a');
      if (st === 'locked' && !X.reduce && Math.floor(now / 700) % 2) { P(lx - 2, 50, 12, 1, '#f2c14e'); P(lx - 2, 75, 12, 1, '#f2c14e'); }
    }
    // the x-ray view of the bolt
    P(132, 30, 64, 64, '#2c3035'); P(134, 32, 60, 60, '#f4f6f7');
    text(c, 'INSIDE', 164, 35, '#8a949c', 1, 'c');
    P(136, 50, 18, 30, '#9aa4ad'); P(170, 46, 22, 38, '#c9d1d8'); P(172, 58, 12, 14, '#5f6b74');
    const bx = 146, bl = 10 + Math.round(26 * bolt);
    P(bx, 60, bl, 10, '#dfe5ea'); P(bx, 60, bl, 1, '#ffffff'); P(bx, 69, bl, 1, '#a9b3bb');
    P(bx + 2 + Math.round(4 * bolt), 72, 5, 4, '#d7372f'); P(bx + 4 + Math.round(4 * bolt), 72, 3, 4, '#3b6ea8');
    P(140, 82, 8, 5, '#1f2126'); for (let k = 0; k < 4; k++) P(140 + k * 2, 87, 1, 2, '#9aa0a6');
    const fld = .35 + .65 * bolt; P(152, 84, 34, 4, '#dfe5ea'); P(152, 84, Math.round(34 * fld), 4, bolt > .5 ? '#d7372f' : '#47c26a');
    text(c, bolt > .5 ? 'THROWN' : 'RETRACTED', 164, 43, bolt > .5 ? '#c0392b' : '#2e8b57', 1, 'c');
    text(c, st === 'locked' ? 'LOCKED' : st === 'open' ? 'WELCOME HOME' : st === 'unlocking' ? 'UNLOCKING' : 'LOCKING', 34, 8, st === 'locked' ? '#c0392b' : '#2e8b57', 1, 'c');
  });
  return {stop};
};

/* ---------- Geotab: the pixel dashcam ---------- */
M.dash = (host, ctl, X) => {
  const W = 200, H = 110, {cv, c, P} = make(host, W, H, '#0f1114');
  ctl.innerHTML = `<div class="w-actions"><button type="button" class="w-go" data-play></button><button type="button" class="w-alt" data-cam>Cabin camera</button></div><p class="w-hint" aria-live="polite"></p>`;
  const say = hint(ctl), pb = ctl.querySelector('[data-play]'), cb = ctl.querySelector('[data-cam]');
  let play = !X.reduce, cam = 0, t = 0, pos = 0, spd = 62, goose = null, gooseT = 5, dist = 0, distT = 6, geese = 0;
  const base = () => cam ? 'Cabin camera. It flags the driver when she looks away.' : 'Front camera. Keep an eye out for wildlife.';
  const sync = () => { pb.textContent = play ? 'Pause' : 'Play'; cb.textContent = cam ? 'Front camera' : 'Cabin camera'; };
  pb.addEventListener('click', () => { play = !play; sync(); }); cb.addEventListener('click', () => { cam = 1 - cam; sync(); say(base()); });
  cv.addEventListener('pointerdown', () => { play = !play; sync(); });
  sync(); say(base());
  const objs = Array.from({length: 8}, (_, i) => ({z: 3 + i * 5, side: i % 2 ? 1 : -1, k: i % 3}));
  const cars = [{base: 13, lane: -.45, col: '#c8312c', ph: 0}, {base: 24, lane: .45, col: '#3b6ea8', ph: 2}];
  const gb = document.createElement('canvas'); gb.width = 24; gb.height = 30; const gx = gb.getContext('2d');
  const mb = document.createElement('canvas'); mb.width = 24; mb.height = 20; const mx = mb.getContext('2d');
  const HOR = 42, half = d => 3 + d * 1.5;
  function box(x, y, w, h, col, label) { c.strokeStyle = col; c.lineWidth = 1; c.strokeRect(Math.round(x) + .5, Math.round(y) + .5, Math.round(w), Math.round(h)); const tw = label.length * 4 + 2; P(x, y - 7, tw, 7, col); text(c, label, x + 1, y - 6, '#0f1114'); }
  function front(now) {
    for (let y = 0; y < HOR; y++) P(0, y, W, 1, y < 20 ? '#8fc6ea' : '#b9ddf2');
    for (let x = 0; x < W; x++) { const h = Math.round(5 + Math.sin(x * .06) * 3 + Math.sin(x * .17) * 1.5); P(x, HOR - h, 1, h, '#86ad8f'); }
    for (let y = HOR; y < H; y++) {
      const d = y - HOR + 1, z = 150 / d, band = Math.floor(z * .45 + pos) % 2, hw = half(d);
      P(0, y, W, 1, band ? '#7fb36a' : '#74a85f'); P(100 - hw, y, hw * 2, 1, '#5d6166');
      const rw = Math.max(1, d * .12); P(100 - hw - rw, y, rw, 1, band ? '#ececec' : '#d7372f'); P(100 + hw, y, rw, 1, band ? '#ececec' : '#d7372f');
      if (!band && d > 2) P(100 - Math.max(.5, d * .03), y, Math.max(1, d * .06), 1, '#f2f2e6');
    }
    const draw = [];
    objs.forEach(o => draw.push([o.z, () => { const d = 150 / o.z, y = HOR + d, x = 100 + o.side * (half(d) + d * .7), h = d * (o.k === 2 ? 1.4 : .9); if (o.k === 2) { P(x, y - h, Math.max(1, d * .05), h, '#8a8f96'); P(x - d * .1 * o.side, y - h, d * .2, Math.max(1, d * .04), '#8a8f96'); } else { P(x - d * .04, y - h * .45, Math.max(1, d * .08), h * .45, '#6b4a35'); disc(P, Math.round(x), Math.round(y - h * .62), Math.max(1, Math.round(d * .32)), o.k ? '#3f7a4a' : '#4f9150'); } }]));
    cars.forEach(cr => { const z = cr.base + Math.sin(t * .25 + cr.ph) * 5; draw.push([z, () => { const d = 150 / z, y = HOR + d, x = 100 + cr.lane * half(d) * 1.1, w = d * 1.1, h = d * .6; P(x - w / 2 + 1, y - 1, w, Math.max(1, d * .08), 'rgba(0,0,0,.25)'); P(x - w / 2, y - h, w, h, cr.col); P(x - w / 2 + w * .15, y - h * .9, w * .7, h * .35, '#2a3440'); P(x - w / 2, y - h * .4, Math.max(1, w * .15), Math.max(1, h * .15), '#ff3b2f'); P(x + w / 2 - Math.max(1, w * .15), y - h * .4, Math.max(1, w * .15), Math.max(1, h * .15), '#ff3b2f'); }]); });
    draw.sort((a, b) => b[0] - a[0]).forEach(d => d[1]());
    if (goose) {
      const d = 150 / 7, y = HOR + d, x = goose.x, step = Math.floor(goose.x / 3) % 2;
      P(x - 6, y - 7, 12, 5, '#8a6a4a'); P(x - 6, y - 7, 12, 1, '#a8865f'); P(x + 4, y - 15, 2, 9, '#1f2126'); P(x + 4, y - 17, 5, 3, '#1f2126'); P(x + 5, y - 15, 2, 2, '#ffffff'); P(x + 9, y - 16, 2, 1, '#3a3330'); P(x - 7, y - 6, 3, 2, '#2b2b2b');
      P(x - 3 + step, y - 2, 1, 3, '#3a3330'); P(x + 1 - step, y - 2, 1, 3, '#3a3330');
      if (Math.floor(now / 250) % 2 || X.reduce) box(x - 10, y - 20, 22, 21, '#4cff7a', 'GOOSE 72%');
    }
  }
  function cabin(now) {
    P(0, 0, W, H, '#2a2d33'); P(14, 6, 172, 34, '#1d2025');
    P(18, 9, 164, 28, '#bfe3f5'); P(18, 28, 164, 9, '#86ad8f');
    for (let i = 0; i < 9; i++) { const x = ((i * 31 - pos * 40) % 200 + 200) % 200 - 10; P(x, 20, 3, 10, '#6b4a35'); disc(P, Math.round(x + 1), 18, 5, '#3f7a4a'); }
    P(18, 9, 164, 2, 'rgba(255,255,255,.4)');
    P(40, 46, 56, 64, '#3a3d44'); P(46, 40, 44, 10, '#3a3d44'); P(112, 56, 50, 54, '#3a3d44'); P(118, 50, 38, 9, '#3a3d44');
    gx.clearRect(0, 0, 24, 30); X.girl(gx, 2, 2, 'down', 0, true);
    if (dist > 0) { gx.fillStyle = '#e8bfa0'; gx.fillRect(9, 9, 2, 3); gx.fillRect(13, 9, 2, 3); gx.fillStyle = '#3b2418'; gx.fillRect(9, 11, 2, 1); gx.fillRect(13, 11, 2, 1); }
    c.drawImage(gb, 0, 0, 24, 30, 44, 44, 48, 60);
    if (dist > 0) { P(70, 92, 8, 12, '#1f2126'); P(71, 93, 6, 9, '#7fc4ff'); }
    mx.clearRect(0, 0, 24, 20); X.moeSprite(mx, 4, 3, 0); c.drawImage(mb, 0, 0, 24, 20, 114, 70, 36, 30);
    if (!X.reduce && Math.floor(now / 1400) % 3 === 0) text(c, 'Z', 150, 66, '#ffffff');
    c.strokeStyle = '#141518'; c.lineWidth = 4; c.beginPath(); c.arc(68, 116, 26, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
    const fx = 48, fy = 44;
    box(fx + 2, fy + 2, 40, 26, dist > 0 ? '#ff4a3d' : '#4cff7a', dist > 0 ? 'DISTRACTED' : 'ATTENTIVE');
  }
  const stop = loop((dt, now) => {
    if (play) {
      t += dt;
      if (goose) { goose.x += 28 * dt; const onRoad = cam === 0 && Math.abs(goose.x - 100) < half(150 / 7) + 8; spd += ((onRoad ? 0 : 62) - spd) * Math.min(1, dt * 3); if (goose.x > 214) { goose = null; gooseT = 9 + Math.random() * 6; } }
      else { spd += (62 - spd) * Math.min(1, dt * 1.5); gooseT -= dt; if (gooseT <= 0) { goose = {x: -14}; geese++; if (cam === 0) X.tone(1200, .05, 'square', .02); } }
      pos += spd * dt * .03;
      objs.forEach(o => { o.z -= spd * dt * .05; if (o.z < 1.6) o.z += 40; });
      if (dist > 0) dist -= dt; else { distT -= dt; if (distT <= 0) { dist = 1.8; distT = 7 + Math.random() * 5; if (cam === 1) X.tone(1500, .12, 'square', .03); } }
    }
    cam ? cabin(now) : front(now);
    c.globalAlpha = .18; P(0, 0, W, 3, '#000'); P(0, H - 3, W, 3, '#000'); c.globalAlpha = 1;
    if (play && Math.floor(now / 500) % 2) disc(P, 7, 8, 2, '#ff3b2f');
    text(c, 'REC', 12, 6, '#ffffff'); text(c, cam ? 'CAM 2 CABIN' : 'CAM 1 FRONT', 195, 6, '#ffffff', 1, 'r');
    const s = Math.floor(t); text(c, `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`, 5, H - 9, '#ffffff');
    text(c, Math.round(spd) + ' KM/H', 195, H - 9, '#ffffff', 1, 'r');
    if (!play) { P(92, 45, 5, 18, 'rgba(255,255,255,.85)'); P(103, 45, 5, 18, 'rgba(255,255,255,.85)'); text(c, 'PAUSED', 100, 68, '#ffffff', 1, 'c'); }
    if (goose && cam === 0 && spd < 20) text(c, 'BRAKING FOR GOOSE', 100, 14, '#f2c14e', 1, 'c');
    else if (geese >= 3 && goose && cam === 0) text(c, 'ANOTHER ONE', 100, 14, '#f2c14e', 1, 'c');
  });
  return {stop};
};

/* ---------- Valbruna: scrap to steel bar ---------- */
M.steel = (host, ctl, X) => {
  const W = 240, H = 110, {cv, c, P} = make(host, W, H, '#2f2a28');
  ctl.innerHTML = `<div class="w-actions"><button type="button" class="w-go" data-act></button></div><p class="w-hint" aria-live="polite"></p>`;
  const say = hint(ctl), btn = ctl.querySelector('[data-act]');
  const LABEL = {ready: 'SCRAP BUCKET', charge: 'CHARGING THE FURNACE', melt: 'ELECTRIC ARC FURNACE', tap: 'TAPPING INTO THE LADLE', move: 'LADLE TO THE CASTER', cast: 'CONTINUOUS CASTER', roll: 'ROLLING MILL', done: 'COOLING BED'};
  let st = 'ready', tt = 0, temp = 25, holding = false, pool = 0, fill = 0, tilt = 0, lx = 86, ly = 80, strand = 0, bx = 0, bars = X.state.bars || 0, sparks = [], shine = 0;
  const scrap = Array.from({length: 9}, (_, i) => ({ox: (i % 5) * 5 - 10, oy: Math.floor(i / 5) * 4, w: 3 + (i * 7) % 4, h: 2 + (i * 5) % 3, col: ['#7d838b', '#9aa0a6', '#6b6f75'][i % 3], y: 0, in: false}));
  function sync() {
    btn.disabled = !(st === 'ready' || st === 'melt');
    btn.textContent = st === 'ready' ? 'Charge the furnace' : st === 'melt' ? (holding ? 'Arcing…' : 'Hold to strike the arc') : 'Working…';
  }
  function go() { if (st !== 'ready') return; st = 'charge'; tt = 0; scrap.forEach(s => { s.y = 0; s.in = false; }); temp = 25; pool = 0; fill = 0; tilt = 0; lx = 86; ly = 80; strand = 0; bx = 0; say('Charging the furnace with scrap.'); sync(); }
  const hold = on => { if (st !== 'melt') { if (on && st === 'ready') go(); return; } holding = on; sync(); };
  btn.addEventListener('click', () => { if (st === 'ready') go(); });
  btn.addEventListener('pointerdown', e => { if (st === 'melt') { e.preventDefault(); hold(true); } });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(k => btn.addEventListener(k, () => hold(false)));
  btn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && st === 'melt') { e.preventDefault(); if (!e.repeat) hold(true); } });
  btn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') hold(false); });
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); hold(true); });
  ['pointerup', 'pointercancel'].forEach(k => cv.addEventListener(k, () => hold(false)));
  sync(); say(bars ? `${bars} bar${bars > 1 ? 's' : ''} so far. Charge the furnace for another.` : 'Turn scrap into steel bar. Start by charging the furnace.');
  const stop = loop((dt, now) => {
    tt += dt; const R = X.reduce ? 3 : 1;
    if (st === 'charge') { const k = Math.min(1, tt * R / 1.2); if (k >= .7) scrap.forEach((s, i) => { s.y = Math.min(1, s.y + dt * R * (2 + i * .15)); }); if (tt * R > 1.9) { st = 'melt'; tt = 0; sync(); say('Hold to lower the electrodes and strike the arc. Get it to 1600 °C.'); } }
    if (st === 'melt') {
      if (holding) { temp = Math.min(1600, temp + dt * 520); if (Math.random() < dt * 30) for (let n = 0; n < 2; n++) sparks.push({x: 58 + (Math.random() - .5) * 20, y: 78, vx: (Math.random() - .5) * 80, vy: -40 - Math.random() * 60, l: .5}); if (Math.random() < dt * 8) X.tone(55 + Math.random() * 20, .12, 'sawtooth', .025); }
      else temp = Math.max(25, temp - dt * 60);
      pool = Math.max(0, Math.min(1, (temp - 1100) / 500));
      if (temp >= 1600) { st = 'tap'; tt = 0; holding = false; sync(); say('Tapping: the furnace tilts and pours into the ladle.'); }
    }
    if (st === 'tap') { tilt = Math.min(1, tt * R / .4); if (tt * R > .4) { fill = Math.min(1, fill + dt * R / 1.1); pool = Math.max(0, 1 - fill); } if (tt * R > 1.6) { st = 'move'; tt = 0; say('The crane takes the ladle to the caster.'); } }
    if (st === 'move') { tilt = Math.max(0, tilt - dt * 3); const k = ease(Math.min(1, tt * R / 1.2)); lx = 86 + k * 28; ly = 80 - Math.sin(k * Math.PI) * 26; if (tt * R > 1.2) { st = 'cast'; tt = 0; say('Continuous casting: the steel freezes into a strand, then gets cut into a billet.'); } }
    if (st === 'cast') { strand = Math.min(1, tt * R / 2); fill = Math.max(0, 1 - strand); if (tt * R > 2.3) { st = 'roll'; tt = 0; bx = 0; say('The rolling mill squeezes the billet longer and thinner, pass by pass.'); } }
    if (st === 'roll') { bx = Math.min(1, tt * R / 1.9); if (bx >= 1) { st = 'done'; tt = 0; bars++; X.state.bars = bars; X.chime(); shine = bars % 5 === 0 ? 2.5 : 0; say(bars % 5 === 0 ? `Bar ${bars}. This one came out stainless.` : `Bar ${bars} is on the cooling bed.`); } }
    if (st === 'done' && tt * R > 1) { st = 'ready'; tt = 0; sync(); }
    shine = Math.max(0, shine - dt);
    // the mill
    P(0, 0, W, H, '#2f2a28'); for (let x = 0; x < W; x += 20) P(x, 14, 2, 84, '#38322f'); P(0, 12, W, 3, '#4a4440');
    P(0, 98, W, 12, '#3d3734'); P(0, 98, W, 1, '#5a524d');
    text(c, LABEL[st], W / 2, 3, '#f2c14e', 1, 'c');
    // crane + scrap bucket
    const bkx = st === 'ready' ? 10 : st === 'charge' ? 10 + ease(Math.min(1, tt * R / .7)) * 34 : -40;
    if (bkx > -30) { P(bkx + 10, 15, 1, 10, '#9aa0a6'); P(bkx, 25, 22, 12, '#5a5f66'); P(bkx, 25, 22, 2, '#7d838b'); scrap.forEach(s => { if (s.y === 0) P(bkx + 11 + s.ox * .6, 22 + s.oy * .5, s.w, s.h, s.col); }); }
    // electric arc furnace
    c.save(); if (tilt) { c.translate(76, 92); c.rotate(tilt * .35); c.translate(-76, -92); }
    P(38, 66, 40, 30, '#4a4f57'); P(40, 68, 36, 26, '#6a4a3e'); P(42, 70, 32, 22, '#2a2220');
    scrap.forEach(s => { if (s.y > 0) { const y = 30 + s.y * 52; const shrink = Math.max(0, 1 - Math.max(0, temp - 800) / 700); if (shrink > 0) P(56 + s.ox, Math.min(y + s.oy, 88 - s.h), s.w * shrink + .5, s.h, temp > 900 ? '#d9772f' : s.col); } });
    if (pool > 0) { P(42, 92 - pool * 14, 32, pool * 14, '#ff8a2a'); P(42, 92 - pool * 14, 32, 1, '#ffd36b'); }
    P(40, 58, 36, 8, '#5a5f66'); P(40, 58, 36, 1, '#7d838b'); P(76, 74, 6, 3, '#4a4f57');
    const low = holding ? 10 : st === 'melt' ? 2 : 0;
    [50, 58, 66].forEach(x => { P(x - 1, 30, 3, 30 + low, '#2b2d31'); P(x - 1, 30, 1, 30 + low, '#4a4e57'); });
    c.restore();
    if (holding) {
      c.globalCompositeOperation = 'lighter'; glow(c, 58, 76, 40, '170,200,255', .45); glow(c, 58, 80, 18, '255,255,255', .5); c.globalCompositeOperation = 'source-over';
      [50, 58, 66].forEach(x => { let px = x, py = 60 + low; c.strokeStyle = Math.random() < .5 ? '#e6f0ff' : '#9fc2ff'; c.lineWidth = 1; c.beginPath(); c.moveTo(px + .5, py); for (let k = 0; k < 4; k++) { px += (Math.random() - .5) * 6; py += 3; c.lineTo(px + .5, py); } c.stroke(); });
    }
    if (pool > .3) { c.globalCompositeOperation = 'lighter'; glow(c, 58, 84, 26, '255,140,40', .3 * pool); c.globalCompositeOperation = 'source-over'; }
    if (st === 'tap' && tt * R > .4) { for (let y = 78; y < 86; y++) P(82 + (y - 78) * .4, y, 2, 1, '#ffb347'); }
    // ladle on the crane
    if (st === 'move' || st === 'cast') P(lx + 9, 15, 1, ly - 15, '#9aa0a6');
    P(lx, ly, 20, 16, '#4a4f57'); P(lx + 2, ly + 2, 16, 12, '#2a2220'); if (fill > 0) { P(lx + 2, ly + 14 - fill * 11, 16, fill * 11, '#ff8a2a'); P(lx + 2, ly + 14 - fill * 11, 16, 1, '#ffd36b'); } P(lx - 1, ly, 22, 2, '#7d838b');
    // continuous caster: tundish, mold, bending strand
    P(116, 52, 22, 6, '#4a4f57'); P(124, 58, 6, 14, '#7d838b');
    if (st === 'cast' || st === 'roll' || st === 'done') {
      const n = Math.round((st === 'cast' ? strand : 1) * 40);
      for (let i = 0; i < n; i++) { const a = Math.min(1, i / 22), x = i < 14 ? 126 : 126 + (i - 14) * 1.2, y = i < 14 ? 60 + i * 2 : 88 + Math.min(4, (i - 14) * .25); const age = (n - i) / 40; P(x - 2, y, 4, 4, age < .2 ? '#ffd36b' : age < .45 ? '#ff8a2a' : age < .7 ? '#c9452a' : '#6b6f75'); if (a < 0) break; }
    }
    if ((st === 'cast' && strand > .85) || st === 'roll' && bx < .05) { P(150, 88, 16, 6, '#d9682c'); P(150, 88, 16, 1, '#ffb347'); }
    if (st === 'cast' && strand > .9 && !X.reduce) for (let k = 0; k < 3; k++) P(156 + Math.random() * 4, 90 + Math.random() * 4, 1, 1, '#fff3a0');
    // rolling mill: three stands
    const stands = [168, 186, 204];
    stands.forEach((x, i) => { const spin = (st === 'roll' ? now / 60 : 0) + i; disc(P, x, 84, 5, '#5a5f66'); disc(P, x, 100, 5, '#5a5f66'); P(x + Math.round(Math.cos(spin) * 3), 84 + Math.round(Math.sin(spin) * 3), 1, 1, '#9aa0a6'); P(x + Math.round(Math.cos(-spin) * 3), 100 + Math.round(Math.sin(-spin) * 3), 1, 1, '#9aa0a6'); P(x - 7, 76, 2, 30, '#4a4440'); P(x + 6, 76, 2, 30, '#4a4440'); });
    if (st === 'roll') { const x = 150 + bx * 70, passed = stands.filter(s => x > s).length, len = 14 + passed * 9, th = 6 - passed; P(x - len, 92 - th / 2, len, th, passed < 2 ? '#e06b2c' : '#b0503a'); }
    // cooling bed with finished bars
    P(212, 96, 26, 2, '#5a524d');
    for (let i = 0; i < Math.min(bars, 12); i++) { const r = Math.floor(i / 4), k = i % 4, isS = (i + 1) % 5 === 0; P(213 + k * 6, 94 - r * 3, 5, 2, isS ? '#dfe7ee' : '#8a9097'); }
    if (shine > 0 && !X.reduce) { c.globalCompositeOperation = 'lighter'; glow(c, 225, 88, 14, '220,235,255', .5 * Math.min(1, shine)); c.globalCompositeOperation = 'source-over'; }
    sparks = sparks.filter(s => (s.l -= dt) > 0); sparks.forEach(s => { s.vy += 220 * dt; s.x += s.vx * dt; s.y += s.vy * dt; P(s.x, s.y, 1, 1, s.l > .25 ? '#fff3a0' : '#ff8a2a'); });
    if (st === 'melt' || st === 'tap') { text(c, Math.round(temp) + '°C', 4, 104 - 8, temp > 1400 ? '#ffb347' : '#c9c1bb'); P(4, 92, 30, 2, '#4a4440'); P(4, 92, 30 * (temp / 1600), 2, temp > 1400 ? '#ff8a2a' : '#c9452a'); }
    else text(c, 'BARS ' + bars, 4, 101 - 4, '#c9c1bb');
  });
  return {stop};
};

/* ---------- Evercloak: coat the membrane ---------- */
M.mem = (host, ctl, X) => {
  const W = 200, H = 110, {cv, c, P, pt} = make(host, W, H, '#eef3f4');
  ctl.innerHTML = `<div class="w-actions"><button type="button" class="w-go" data-coat>Coat the membrane</button><button type="button" class="w-alt" data-reset>Reset</button></div><p class="w-hint" aria-live="polite"></p>`;
  const say = hint(ctl), cb = ctl.querySelector('[data-coat]');
  const MX = 100, TOP = 14, BOT = 96;
  let coat = X.state.coat ? 1 : 0, coating = -1, tank = 0, rh = 70, taps = [], moeT = 0, t = 0, spawnT = 0;
  const base = () => coat ? 'Water vapor slips through the coated membrane. The air bounces back, so the room dries out.' : 'Humid air on the left. Coat the membrane and see what gets through.';
  const parts = [];
  const add = v => parts.push({x: 10 + Math.random() * 80, y: TOP + 4 + Math.random() * (BOT - TOP - 8), vx: (Math.random() < .5 ? -1 : 1) * (35 + Math.random() * 55), vy: (Math.random() - .5) * 70, v, side: 0});
  for (let i = 0; i < 28; i++) add(i % 2 === 0);
  cb.disabled = !!coat;
  cb.addEventListener('click', () => { if (coat || coating >= 0) return; coating = 0; cb.disabled = true; X.tone(400, .5, 'sine', .02, 700); say('Coating…'); });
  ctl.querySelector('[data-reset]').addEventListener('click', () => { coat = 0; coating = -1; X.state.coat = false; tank = 0; cb.disabled = false; parts.forEach(p => { if (p.side) { p.side = 0; p.x = 20 + Math.random() * 60; } }); say(base()); });
  cv.addEventListener('pointerdown', e => {
    const p = pt(e), now = performance.now();
    if (Math.abs(p.x - MX) < 10) { taps.push(now); taps = taps.filter(x => x > now - 2200); if (taps.length >= 5) { taps = []; moeT = 3.5; X.meow(); say('Moe checked. Cats don’t pass through either.', base()); } }
  });
  say(base());
  const stop = loop((dt, now) => {
    t += dt;
    if (coating >= 0) { coating += dt / (X.reduce ? .4 : 1.5); if (coating >= 1) { coating = -1; coat = 1; X.state.coat = true; X.chime(); say(base()); } }
    spawnT -= dt; const leftV = parts.filter(p => p.v && !p.side).length;
    if (spawnT <= 0 && leftV < 12) { add(true); spawnT = .6; }
    parts.forEach(p => {
      if (p.side) { p.vy = Math.min(26, p.vy + 30 * dt); p.vx *= .97; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > 96 - 12 * tank / 60) { p.dead = true; tank = Math.min(60, tank + 2); } return; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 6) { p.x = 6; p.vx = Math.abs(p.vx); } if (p.y < TOP + 2) { p.y = TOP + 2; p.vy = Math.abs(p.vy); } if (p.y > BOT - 2) { p.y = BOT - 2; p.vy = -Math.abs(p.vy); }
      if (p.x > MX - 5) { if (p.v && coat && Math.random() < .8) { p.side = 1; p.x = MX + 6; p.vx = 22 + Math.random() * 26; p.vy = (Math.random() - .5) * 8; X.tone(1400 + Math.random() * 500, .02, 'sine', .008); } else { p.x = MX - 5; p.vx = -Math.abs(p.vx); } }
    });
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].dead) parts.splice(i, 1);
    const target = 38 + 32 * Math.min(1, parts.filter(p => p.v && !p.side).length / 14); rh += (target - rh) * Math.min(1, dt * .7);
    moeT = Math.max(0, moeT - dt);
    P(0, 0, W, H, '#eef3f4'); P(4, TOP, MX - 6, BOT - TOP, '#e2eef2'); P(MX + 6, TOP, W - MX - 10, BOT - TOP, '#f4f7f8');
    text(c, 'ROOM AIR', 6, 5, '#5f7a85'); text(c, 'WATER OUT', 194, 5, '#5f7a85', 1, 'r');
    // collection tank
    P(120, 84, 74, 14, '#c9d4d8'); P(121, 85, 72, 12, '#e8eef0'); P(121, 97 - 12 * tank / 60, 72, 12 * tank / 60, '#5aa9e6'); if (tank) P(121, 97 - 12 * tank / 60, 72, 1, '#9fd0ff');
    // membrane: substrate, coating, sheen
    P(MX - 2, TOP, 6, BOT - TOP, '#b9c1c6'); for (let y = TOP + 2; y < BOT; y += 4) P(MX, y, 1, 1, '#9aa4ab');
    const cv2 = coating >= 0 ? coating : coat;
    if (cv2 > 0) { const h = (BOT - TOP) * cv2; P(MX - 4, TOP, 2, h, '#2aa39a'); if (coat && !X.reduce) for (let y = TOP; y < BOT; y++) { const k = (y * .05 + t * .25) % 1; c.globalAlpha = .55; P(MX - 4, y, 1, 1, `hsl(${Math.round(k * 360)},70%,62%)`); c.globalAlpha = 1; } }
    if (coating >= 0) { const y = TOP + (BOT - TOP) * coating; P(MX - 9, y - 3, 8, 6, '#5f6b70'); P(MX - 4, y - 1, 2, 2, '#2aa39a'); }
    parts.forEach(p => { if (p.v) { P(p.x - 1, p.y - 1, 3, 3, '#3b8fd9'); P(p.x - 1, p.y - 1, 1, 1, '#9fd0ff'); } else { P(p.x - 1, p.y - 1, 3, 3, '#ffffff'); P(p.x - 1, p.y + 1, 3, 1, '#c3ccd1'); } });
    if (moeT > 0) { const k = Math.min(1, moeT, 3.5 - moeT + .001), bx = document.createElement('canvas'); bx.width = 24; bx.height = 20; X.moeSprite(bx.getContext('2d'), 4, 3, 0); c.drawImage(bx, 0, 0, 24, 20, 140, 70 - 16 * Math.min(1, k * 3), 30, 25); P(120, 84, 74, 14, '#c9d4d8'); P(121, 85, 72, 12, '#e8eef0'); P(121, 97 - 12 * tank / 60, 72, 12 * tank / 60, '#5aa9e6'); }
    P(4, 100, 3, 3, '#3b8fd9'); text(c, 'WATER VAPOR', 9, 99, '#5f7a85'); P(60, 100, 3, 3, '#ffffff'); P(60, 102, 3, 1, '#c3ccd1'); text(c, 'AIR', 65, 99, '#5f7a85');
    text(c, 'RH ' + Math.round(rh) + '%', 92, 99, '#1f5f8b', 1, 'r');
  });
  return {stop};
};

/* ---------- Waterloo: the wind-up soccer toy ---------- */
M.toy = (host, ctl, X) => {
  const W = 200, H = 110, {cv, c, P} = make(host, W, H, '#bfe3f5');
  ctl.innerHTML = `<div class="w-actions"><button type="button" class="w-go" data-wind>Hold to wind</button></div><p class="w-hint" aria-live="polite"></p>`;
  const say = hint(ctl), btn = ctl.querySelector('[data-wind]');
  const base = 'Hold to wind it up, then let go to kick. Not too much, not too little.';
  say(base);
  const GY = 94, BX = 66;
  let pw = 0, winding = false, keyA = 0, lastClick = 0, leg = 0, kick = null, res = null, resT = 0, goals = X.state.goals || 0, conf = [], cam = 0;
  const ball = {x: BX, y: GY - 3, vx: 0, vy: 0, live: false};
  const mb = document.createElement('canvas'); mb.width = 24; mb.height = 20; const mx = mb.getContext('2d');
  const start = () => { if (ball.live || kick || res) return; winding = true; };
  const release = () => { if (!winding) return; winding = false; if (pw < .06) { pw = 0; return; } kick = {t: 0, p: pw}; X.tone(220, .14, 'square', .03, 520); };
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); start(); });
  ['pointerup', 'pointercancel'].forEach(k => cv.addEventListener(k, release));
  btn.addEventListener('pointerdown', e => { e.preventDefault(); start(); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(k => btn.addEventListener(k, release));
  btn.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) start(); } });
  btn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); release(); } });
  function finish(r) {
    res = r; resT = 0;
    if (r === 'goal') { goals++; X.state.goals = goals; X.chime(); for (let i = 0; i < 40; i++) conf.push({x: 186, y: 60, vx: (Math.random() - .7) * 140, vy: -Math.random() * 140, l: 1.6, col: ['#e35d50', '#f2c14e', '#47a668', '#5b8ee6', '#ffffff'][i % 5]}); say(goals === 3 ? 'Goal number 3. Uh oh, the cheering woke up Moe.' : goals === 1 ? 'GOAL! First try?' : `Goal! That makes ${goals}.`, base); }
    else if (r === 'over') say('Over the bar. Ease off the winding a little.', base);
    else if (r === 'saved') { X.meow(); say('Saved by Moe. Of course.', base); }
    else say(ball.x < 120 ? 'Barely rolled. Wind it more.' : 'So close. A bit more wind.', base);
  }
  const stop = loop((dt, now) => {
    if (winding) { pw = Math.min(1, pw + dt * .7); keyA += dt * 8; if (keyA - lastClick > 1.2) { lastClick = keyA; X.tone(1800 + pw * 600, .02, 'square', .02); } }
    if (kick) {
      kick.t += dt; keyA -= dt * 14 * kick.p; pw = Math.max(0, pw - dt * 3);
      if (kick.t < .15) leg = -.55 * kick.p * (kick.t / .15);
      else if (kick.t < .3) { leg = -.55 * kick.p + (1.25 + .55 * kick.p) * ((kick.t - .15) / .15); if (!ball.live && kick.t > .22) { ball.live = true; ball.vx = 40 + kick.p * 150; ball.vy = -(20 + kick.p * 150); X.tone(520, .05, 'triangle', .05); } }
      else { leg = Math.max(0, leg - dt * 3); if (leg === 0) kick = null; }
    }
    if (ball.live) {
      ball.vy += 300 * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.y > GY - 3) { ball.y = GY - 3; if (Math.abs(ball.vy) > 35) { ball.vy *= -.42; ball.vx *= .85; X.tone(700, .02, 'triangle', .02); } else ball.vy = 0; }
      if (ball.vy === 0 && ball.y >= GY - 3) ball.vx -= Math.sign(ball.vx) * Math.min(Math.abs(ball.vx), 55 * dt);
      if (!res && ball.x >= 176 && ball.vx > 0) {
        if (ball.y < 52) finish('over');
        else if (goals >= 3 && ball.y > GY - 18 && Math.random() < .4) { ball.vx = -Math.abs(ball.vx) * .45; ball.x = 175; finish('saved'); }
        else finish('goal');
      }
      if (res === 'goal') { ball.vx *= .9; if (ball.x > 192) { ball.x = 192; ball.vx = 0; } }
      if (!res && Math.abs(ball.vx) < 2 && ball.vy === 0) finish('short');
    }
    if (res) { resT += dt; if (resT > 1.8) { res = null; ball.live = false; ball.x = BX; ball.y = GY - 3; ball.vx = ball.vy = 0; } }
    // scene
    P(0, 0, W, H, '#bfe3f5'); P(20, 12, 18, 4, '#fff'); P(24, 9, 9, 3, '#fff'); P(130, 16, 22, 4, '#fff'); P(136, 13, 10, 3, '#fff');
    for (let x = 0; x < W; x += 3) P(x, 38 + (x * 7) % 5, 2, 4, ['#e35d50', '#f2c14e', '#5b8ee6', '#ffffff', '#47a668'][(x / 3) % 5]);
    P(0, 44, W, 6, '#8a9aa8');
    for (let x = 0; x < W; x += 16) P(x, 50, 16, H - 50, (x / 16) % 2 ? '#7fbf6a' : '#74b35f');
    P(0, GY, W, 1, 'rgba(255,255,255,.5)');
    // goal: back net, Moe the keeper, front post
    for (let y = 52; y < GY; y += 4) P(178, y, 18, 1, 'rgba(255,255,255,.55)'); for (let x = 178; x < 196; x += 4) P(x, 52, 1, GY - 52, 'rgba(255,255,255,.55)');
    P(194, 50, 2, GY - 50, '#ffffff');
    if (goals >= 3) { mx.clearRect(0, 0, 24, 20); X.moeSprite(mx, 4, 3, Math.floor(now / 400) % 2); c.drawImage(mb, 0, 0, 24, 20, 178, GY - 22, 24, 20); }
    P(176, 52, 20, 2, '#ffffff'); P(176, 52, 2, GY - 52, '#ffffff');
    // the toy: laser-cut box, wind-up key, cam window, acrylic leg
    P(26, 91, 32, 4, 'rgba(0,0,0,.15)');
    P(28, 66, 26, 26, '#d9b483'); P(28, 66, 26, 2, '#e8c99b'); for (let y = 68; y < 92; y += 6) { P(28, y, 2, 3, '#b88d5a'); P(52, y + 3, 2, 3, '#b88d5a'); }
    P(34, 72, 14, 12, '#a8794e'); disc(P, 41, 78, 4, '#e8e2d6'); const ca = keyA * 1.4; P(41 + Math.round(Math.cos(ca) * 2.5) - 1, 78 + Math.round(Math.sin(ca) * 2.5) - 1, 3, 3, '#7a5232');
    P(40, 60, 2, 6, '#9aa0a6'); const kw = Math.max(1, Math.round(Math.abs(Math.cos(keyA)) * 6)); P(41 - kw, 56, kw * 2, 4, '#c9cdd1'); P(41 - kw, 56, kw * 2, 1, '#e8eaed');
    const a = leg, Ll = 22; for (let i = 0; i <= Ll; i += 2) { const x = 54 + Math.sin(a) * i, y = 75 + Math.cos(a) * i; P(x - 1, y - 1, 3, 3, 'rgba(160,210,240,.9)'); }
    P(52, 73, 4, 4, '#5f6b74');
    P(28, 98, 26, 3, '#2b2d31'); P(28, 98, 26 * pw, 3, pw >= 1 && Math.floor(now / 150) % 2 ? '#ffffff' : '#f2c14e');
    // ball + shadow
    const sh = Math.max(1, 5 - (GY - 3 - ball.y) / 12); P(ball.x - sh / 2, GY - 1, sh, 1, 'rgba(0,0,0,.2)');
    P(ball.x - 2, ball.y - 2, 5, 5, '#ffffff'); P(ball.x - 2, ball.y + 2, 5, 1, '#d8dde0'); P(ball.x + 1, ball.y - 1, 1, 1, '#f08a24');
    conf = conf.filter(p => (p.l -= dt) > 0); conf.forEach(p => { p.vy += 160 * dt; p.x += p.vx * dt; p.y += p.vy * dt; P(p.x, p.y, 2, 1, p.col); });
    if (res === 'goal' && Math.floor(resT * 6) % 2 === 0) { text(c, 'GOAL!', 101, 21, 'rgba(0,0,0,.35)', 3, 'c'); text(c, 'GOAL!', 100, 20, '#ffffff', 3, 'c'); }
    text(c, 'GOALS ' + goals, 4, 4, '#1f2126');
    if (winding && pw >= 1) text(c, 'FULLY WOUND', 41, 104, '#1f2126', 1, 'c');
  });
  return {stop};
};

window.Minis = M;
})();
