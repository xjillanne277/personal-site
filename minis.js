/* Small toys for the houses in the game. Loaded when the game opens.
   Each one gets a canvas host and a controls host and returns {stop}. */
(() => {
const G = {A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
  ' ': '000000000000000', '.': '000000000000010', ':': '000010000010000', '%': '101001010100101', '+': '000010111010000', '-': '000000111000000', '!': '010010010000010', '?': '110001010000010', '/': '001001010100100', '°': '010101010000000', '$': '011110010011110', ',': '000000000010100', "'": '010010000000000', '#': '101111101111101'};
/* text drawn with a real font on the 3x canvas, so it stays crisp */
function text(c, s, x, y, col, sc = 1, align) {
  s = String(s); c.font = `600 ${Math.round(sc * 6.6)}px "IBM Plex Mono", ui-monospace, monospace`; c.textBaseline = 'top';
  c.textAlign = align === 'c' ? 'center' : align === 'r' ? 'right' : 'left'; c.fillStyle = col; c.fillText(s, x, y - sc * .6);
  const w = c.measureText(s).width; c.textAlign = 'left'; return w;
}
function make(host, W, H, bg, snap) {
  const K = 3, cv = document.createElement('canvas'); cv.width = W * K; cv.height = H * K; cv.className = 'w-mini-cv'; cv.style.background = bg; cv.style.aspectRatio = W + ' / ' + H; if (snap) cv.dataset.snap = String(W); host.appendChild(cv);
  const c = cv.getContext('2d'); c.setTransform(K, 0, 0, K, 0, 0); c.imageSmoothingEnabled = false;
  const P = (x, y, w, h, k) => { c.fillStyle = k; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const pt = e => { const r = cv.getBoundingClientRect(); return {x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H}; };
  return {cv, c, P, pt};
}
function loop(fn) { let on = true, last = performance.now(); const f = now => { if (!on) return; const dt = Math.min(.05, (now - last) / 1000); last = now; fn(dt, now); requestAnimationFrame(f); }; requestAnimationFrame(f); return () => { on = false; }; }
function glow(c, x, y, r, rgb, a) { if (a <= 0) return; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
function disc(P, cx, cy, r, col) { for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); P(cx - w, cy + y, w * 2, 1, col); } }
function hint(ctl) { const h = ctl.querySelector('.w-hint'); let t = 0; return (s, keep) => { h.textContent = s; clearTimeout(t); if (keep) t = setTimeout(() => { h.textContent = keep; }, 4200); }; }
/* a pulsing ring + label on the thing to touch, so the scene is the control */
function cue(c, P, x, y, label, now, reduce) {
  const k = reduce ? .5 : (Math.sin(now / 260) + 1) / 2, r = 8 + k * 3;
  c.strokeStyle = `rgba(255,255,255,${.95 - k * .4})`; c.lineWidth = 1.6; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = `rgba(217,100,74,${.9 - k * .4})`; c.lineWidth = .9; c.beginPath(); c.arc(x, y, r + 1.6, 0, Math.PI * 2); c.stroke();
  c.font = '700 7px "Space Grotesk", system-ui, sans-serif'; const w = c.measureText(label).width + 8, ly = y - r - 12;
  c.fillStyle = 'rgba(31,35,40,.86)'; c.beginPath(); c.roundRect ? c.roundRect(x - w / 2, ly, w, 10, 5) : c.rect(x - w / 2, ly, w, 10); c.fill();
  c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x, ly + 5.3); c.textAlign = 'left'; c.textBaseline = 'top';
}
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const M = {};

/* ---------- Tesla Lighting + room: the LED controller ---------- */
M.led = (host, ctl, X) => {
  const W = 200, H = 110, {cv, c, P, pt} = make(host, W, H, '#1c1e23');
  const L = X.led, NAMES = ['Off', 'Warm', 'Cool', 'Pink', 'Sunset', 'Ocean', 'Rainbow', 'Chase'];
  let sel = -1, seq = [];
  const SY = i => 25 + i * 13;
  ctl.innerHTML = `<div class="w-sl2">${['r', 'g', 'b', 'w'].map(k => `<label class="w-sl"><span>${{r: 'Red', g: 'Green', b: 'Blue', w: 'White'}[k]}</span><input type="range" min="0" max="255" data-k="${k}"><output></output></label>`).join('')}<label class="w-sl w-br"><span>Brightness</span><input type="range" min="0" max="100" data-br><output></output></label></div>
    <div class="w-keys" role="group" aria-label="Presets">${[1, 2, 3, 4, 5, 6, 7].map(n => `<button type="button" class="w-keycap" data-pre="${n}" aria-label="Preset ${n}, ${NAMES[n]}" title="${NAMES[n]}">${n}</button>`).join('')}<button type="button" class="w-keycap w-off" data-pre="0" aria-label="Lights off">Off</button></div>
    <p class="w-hint" aria-live="polite"></p>`;
  const sls = [...ctl.querySelectorAll('input[data-k]')], brs = ctl.querySelector('[data-br]');
  const base = () => sel < 0 ? 'Pick a preset or drag the sliders. Tap a strip to set just that one.' : `Setting strip ${sel + 1} only. Tap it again for all six.`;
  const say = hint(ctl);
  const cur = () => L.strips[sel < 0 ? 0 : sel];
  const sync = () => { sls.forEach(i => { i.value = cur()[i.dataset.k]; i.nextElementSibling.textContent = i.value; }); brs.value = L.br == null ? 100 : L.br; brs.nextElementSibling.textContent = brs.value + '%'; ctl.querySelectorAll('[data-pre]').forEach(b => b.setAttribute('aria-pressed', String(L.pre === +b.dataset.pre))); };
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
  brs.addEventListener('input', () => { L.br = +brs.value; L.touched = true; brs.nextElementSibling.textContent = brs.value + '%'; });
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
  /* a battery cell on the left, a little electric car on the right: wire the car to the cell and it charges, then takes a lap */
  const BX = 14, BY = 52, BW = 72, BH = 26, CX = 118, CY = 60, PORT = {x: CX + 6, y: CY + 13};
  const T = {pos: {x: BX + BW + 6, y: BY + BH / 2}, neg: {x: BX - 5, y: BY + BH / 2}};
  const E = {red: {home: [104, 34], col: '#d7372f', want: 'pos', name: 'Red', dy: -1}, black: {home: [104, 100], col: '#2b2d31', want: 'neg', name: 'Black', dy: 2}};
  Object.values(E).forEach(e => { e.x = e.home[0]; e.y = e.home[1]; e.att = null; });
  let grab = null, sel = null, moved = 0, wrong = 0, charge = 0, powered = false, sparks = [], smoke = [], drive = null, t = 0;
  const snap = (e, k) => { e.att = k; e.x = T[k].x + (k === 'pos' ? 1 : -1); e.y = T[k].y; };
  const back = e => { e.x = e.home[0]; e.y = e.home[1]; e.att = null; };
  if (X.state.cells) powered = true;
  const base = () => powered ? 'Charged! The Tesla Cell Equipment building is glowing on the map. Reset to charge it again.' : 'Charge the car: drag its wires to the cell. Red to +, black to −.';
  say(base());
  function attach(k, t2) {
    const e = E[k];
    if (Object.values(E).some(o => o !== e && o.att === t2)) { back(e); return; }
    if (e.want === t2) {
      snap(e, t2); sel = null; X.tone(880, .05, 'square', .03);
      say(E.red.att && E.black.att ? 'Connected. Charging the car…' : `${e.name} is on. Now the ${k === 'red' ? 'black' : 'red'} one.`);
    } else {
      wrong++; back(e); sel = null; X.tone(90, .2, 'sawtooth', .05);
      for (let n = 0; n < 16; n++) sparks.push({x: T[t2].x, y: T[t2].y, vx: (Math.random() - .5) * 110, vy: -Math.random() * 90, l: .5});
      if (wrong % 3 === 0) { for (let n = 0; n < 9; n++) smoke.push({x: T[t2].x + (Math.random() - .5) * 8, y: T[t2].y - 4, r: 2 + Math.random() * 3, vy: -10 - Math.random() * 10, l: 2}); say('And there goes the magic smoke. Red to +, black to −.', base()); }
      else say('Sparks! Wrong way round, so the car won’t charge.', base());
    }
  }
  function reset() { back(E.red); back(E.black); charge = 0; powered = false; drive = null; X.state.cells = false; sel = null; say(base()); }
  ctl.querySelector('[data-reset]').addEventListener('click', reset);
  const near = (p, o, r) => Math.hypot(o.x - p.x, o.y - p.y) < r;
  cv.addEventListener('pointerdown', e => {
    if (powered || drive) return;
    const p = pt(e); moved = 0;
    const k = Object.keys(E).find(k2 => near(p, E[k2], 11));
    if (k) { if (E[k].att) { E[k].att = null; charge = 0; } grab = k; sel = k; cv.setPointerCapture(e.pointerId); return; }
    const t2 = Object.keys(T).find(k2 => near(p, T[k2], 13)); if (t2 && sel) attach(sel, t2);
  });
  cv.addEventListener('pointermove', e => { if (!grab) return; const p = pt(e), o = E[grab]; moved += Math.hypot(p.x - o.x, p.y - o.y); o.x = Math.max(4, Math.min(W - 4, p.x)); o.y = Math.max(4, Math.min(H - 4, p.y)); });
  const up = e => {
    if (!grab) return; const k = grab; grab = null; const p = pt(e);
    const t2 = Object.keys(T).find(k2 => near(p, T[k2], 14));
    if (t2 && moved > 3) attach(k, t2); else { back(E[k]); if (moved <= 3) { sel = k; say(`${E[k].name} wire picked up. Tap a terminal on the cell.`); } else sel = null; }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.tabIndex = 0; cv.setAttribute('aria-label', 'A battery cell, a little electric car and two wires. Press R or B to pick up a wire, then + or − to connect it to the cell.');
  cv.addEventListener('keydown', e => {
    if (powered || drive) return;
    const k = e.key.toLowerCase();
    if (k === 'r' || k === 'b') { sel = k === 'r' ? 'red' : 'black'; say(`${E[sel].name} wire picked up. Press + or −.`); e.stopPropagation(); }
    else if ((k === '+' || k === '=') && sel) { attach(sel, 'pos'); e.stopPropagation(); }
    else if ((k === '-' || k === '_') && sel) { attach(sel, 'neg'); e.stopPropagation(); }
  });
  // wires run from the car's charge port, so they ride along with it
  const bez = (e, ox, u) => { const x0 = PORT.x + ox, y0 = PORT.y + e.dy, x3 = e.x, y3 = e.y, x1 = x0 - 16, y1 = y0 + 6, x2 = x3 + (x3 < x0 ? 16 : -10), y2 = y3 + 14, m = 1 - u; return [m * m * m * x0 + 3 * m * m * u * x1 + 3 * m * u * u * x2 + u * u * u * x3, m * m * m * y0 + 3 * m * m * u * y1 + 3 * m * u * u * y2 + u * u * u * y3]; };
  function car(ox, lights, spin) {
    const x = CX + ox, y = CY;
    P(x + 4, y + 28, 64, 3, 'rgba(0,0,0,.14)');
    P(x + 2, y + 10, 68, 14, '#3f6fb0'); P(x + 2, y + 10, 68, 2, '#6b94d0'); P(x + 2, y + 22, 68, 2, '#2c4f82');
    P(x + 16, y + 2, 34, 9, '#3f6fb0'); P(x + 20, y, 26, 3, '#3f6fb0'); P(x + 20, y + 3, 11, 7, '#bfe0f5'); P(x + 33, y + 3, 13, 7, '#bfe0f5'); P(x + 31, y + 3, 2, 7, '#2c4f82');
    P(x + 66, y + 13, 4, 4, lights ? '#fff3a0' : '#d7dce0'); P(x + 2, y + 13, 3, 4, lights ? '#ff6b5e' : '#8e3a33');
    P(x + 4, y + 11, 6, 6, '#2c4f82'); P(x + 5, y + 12, 4, 4, charge > 0 && charge < 1 ? '#f2c14e' : powered ? '#47c26a' : '#1d2a3f');
    [x + 16, x + 54].forEach(wx => { disc(P, wx, y + 25, 6, '#1f2125'); disc(P, wx, y + 25, 3, '#9aa1a8'); const a = spin; P(wx + Math.round(Math.cos(a) * 2) - .5, y + 25 + Math.round(Math.sin(a) * 2) - .5, 1, 1, '#1f2125'); });
    if (lights) { c.globalCompositeOperation = 'lighter'; glow(c, x + 70, y + 15, 12, '255,240,170', .45); c.globalCompositeOperation = 'source-over'; }
  }
  const stop = loop((dt, now) => {
    t += dt;
    if (E.red.att && E.black.att && !powered && !drive) { charge = Math.min(1, charge + dt / 1.1); if (charge >= 1) { drive = {t: 0}; back(E.red); back(E.black); X.tone(660, .09, 'square', .035); setTimeout(() => X.tone(660, .12, 'square', .035), 140); say('Fully charged. Off it goes!'); } }
    let ox = 0, spin = 0;
    if (drive) { drive.t += dt * (X.reduce ? 3 : 1); const d = drive.t;
      if (d < 1.1) ox = Math.pow(d / 1.1, 2) * 140; else if (d < 2.5) ox = -150 + 150 * ease(Math.min(1, (d - 1.1) / 1.4)); else { drive = null; powered = true; X.state.cells = true; X.chime(); say(base()); }
      spin = d * 18; }
    P(0, 0, W, H, '#e8edf1'); P(0, 96, W, 14, '#d3dadf'); P(0, 96, W, 1, '#bfc8ce');
    // the cell: black body, copper band, silver ends
    P(BX + 2, BY + BH + 1, BW, 3, 'rgba(0,0,0,.14)');
    P(BX - 3, BY + 6, 4, BH - 12, '#c9ced3'); P(BX - 3, BY + 6, 4, 1, '#eef1f3');
    P(BX, BY, BW, BH, '#1d1f23'); P(BX + BW - 24, BY, 24, BH, '#c27a35');
    P(BX, BY + 3, BW, 2, 'rgba(255,255,255,.22)'); P(BX, BY + BH - 4, BW, 3, 'rgba(0,0,0,.28)'); P(BX + BW - 24, BY, 1, BH, '#8a5422');
    P(BX + BW, BY + 4, 3, BH - 8, '#c9ced3'); P(BX + BW + 3, BY + 8, 4, BH - 16, '#dfe3e6'); P(BX + BW + 3, BY + 8, 4, 1, '#f6f8f9');
    text(c, '+', BX + BW - 12, BY + 8, '#2b1a0a', 1.6, 'c'); text(c, '−', BX + 12, BY + 7, '#c9ced3', 1.6, 'c');
    car(ox, !!drive || powered, spin);
    // charge meter over the car while it charges
    if (charge > 0 && !drive && !powered) { const mx = CX + 16, my = CY - 14; P(mx, my, 40, 9, '#2b2d31'); P(mx + 40, my + 2, 2, 5, '#2b2d31'); for (let k = 0; k < 4; k++) if (charge > k / 4 + .01) P(mx + 2 + k * 9.5, my + 2, 8, 5, charge >= 1 ? '#47c26a' : '#f2c14e');
      if (!X.reduce && Math.floor(now / 300) % 2) { P(mx + 46, my, 3, 4, '#f2c14e'); P(mx + 45, my + 4, 5, 1, '#f2c14e'); P(mx + 46, my + 5, 3, 4, '#f2c14e'); } }
    if (powered && !drive) text(c, 'CHARGED', CX + 36, CY - 13, '#2f7a5f', 1, 'c');
    if (sel && !grab && Math.floor(now / 300) % 2) Object.values(T).forEach(o => { P(o.x - 7, o.y - 9, 14, 1, '#f2c14e'); P(o.x - 7, o.y + 9, 14, 1, '#f2c14e'); });
    // wires (hidden while the car is out on its lap)
    if (!drive && !powered) {
      c.lineWidth = 2.4; c.lineCap = 'round';
      Object.values(E).forEach(e => { c.strokeStyle = e.col; c.beginPath(); for (let u = 0; u <= 1.001; u += .05) { const [x, y] = bez(e, ox, u); u ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); P(e.x - 3, e.y - 3, 6, 6, e.col); P(e.x - 2, e.y - 2, 2, 2, 'rgba(255,255,255,.5)'); if (sel === Object.keys(E).find(k => E[k] === e) && Math.floor(now / 250) % 2) { P(e.x - 5, e.y - 5, 10, 1, '#f2c14e'); P(e.x - 5, e.y + 4, 10, 1, '#f2c14e'); } });
      if (E.red.att && E.black.att && !X.reduce) Object.values(E).forEach((e, j) => { for (let k = 0; k < 4; k++) { const u = ((now / 900) + k / 4 + j * .12) % 1, [x, y] = bez(e, ox, j ? 1 - u : u); P(x - 1, y - 1, 2, 2, '#fff6b0'); } });
      if (!grab) { const nx = sel ? null : !E.red.att ? E.red : !E.black.att ? E.black : null; if (nx) cue(c, P, nx.x, nx.y, 'Drag', now, X.reduce); else if (sel) cue(c, P, T[E[sel].want].x, T[E[sel].want].y, 'Tap', now, X.reduce); }
    }
    sparks = sparks.filter(s => (s.l -= dt) > 0); sparks.forEach(s => { s.vy += 200 * dt; s.x += s.vx * dt; s.y += s.vy * dt; P(s.x, s.y, 1, 1, s.l > .3 ? '#fff3a0' : '#ff9a3c'); });
    smoke = smoke.filter(s => (s.l -= dt) > 0); smoke.forEach(s => { s.y += s.vy * dt; s.r += dt * 3; c.globalAlpha = Math.min(.6, s.l / 2); disc(P, Math.round(s.x), Math.round(s.y), Math.round(s.r), '#8a8f96'); c.globalAlpha = 1; });
  });
  return {stop};
};

/* ---------- Google: the propeller hat ---------- */
M.hat = (host, ctl, X) => {
  const W = 150, H = 84, {cv, c, P} = make(host, W, H, '#cfe9f7', true);
  ctl.innerHTML = `<div class="w-actions"><button type="button" class="w-alt" data-spin>Spin</button><span class="w-stat" aria-live="off"></span></div><p class="w-hint" aria-live="polite"></p>`;
  const say = hint(ctl), stat = ctl.querySelector('.w-stat');
  const base = 'Tap the hat to spin the propeller. Keep tapping.';
  say(base);
  let om = 0, ang = 0, lift = 0, fly = null, flights = 0, t = 0, lastStat = '';
  let tapped = false; const spin = () => { tapped = true; if (fly) return; om = Math.min(64, om + 9); if (om > 14) X.state.hat = true; X.tone(900, .015, 'square', .012); };
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
      else if (fly.phase === 'down') { om = Math.max(18, om - dt * 8); fly.vy = Math.min(55, fly.vy + 40 * dt); fly.y += fly.vy * dt; hx = Math.sin(fly.t * 2.4) * 8 * Math.min(1, -fly.y / 40); if (fly.y >= 0) { fly.y = 0; fly.phase = 'bounce'; fly.vy = -70; fly.b = 0; (X.land || X.thock)(1, 1); } }
      else { om = Math.max(0, om - dt * 20); fly.vy += 400 * dt; fly.y += fly.vy * dt;
        if (fly.y >= 0) { fly.y = 0; fly.b++; fly.vy = -70 * Math.pow(.42, fly.b); (X.land || X.thock)(Math.pow(.55, fly.b), 1 + fly.b * .06); if (fly.b >= 4 || Math.abs(fly.vy) < 6) { fly = null; lift = 0; om = 0; say(flights === 1 ? 'Boing. Safe landing. Spin it again?' : 'Landed. Again?', base); } } }
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
    if (!tapped && !fly) cue(c, P, 75, 40, 'Tap', now, X.reduce);
    X.motor(om, fly ? (fly.phase === 'gone' ? 1 : Math.min(1, -fly.y / 90)) : 0);
    const st = `RPM ${Math.round(om * 60 / (Math.PI * 2))}` + (flights ? ` · Liftoffs ${flights}` : '');
    if (st !== lastStat) { stat.textContent = st; lastStat = st; }
  });
  return {stop: () => { stop(); X.motor(0); }};
};

/* ---------- Level: unlock the door ---------- */
M.lock = (host, ctl, X) => {
  const W = 160, H = 96, {cv, c, P, pt} = make(host, W, H, '#dfe6ea');
  ctl.innerHTML = `<div class="w-actions"><button type="button" class="w-alt" data-act>Unlock</button><span class="w-stat"></span></div><p class="w-hint" aria-live="polite"></p>`;
  const say = hint(ctl), btn = ctl.querySelector('[data-act]'), stat = ctl.querySelector('.w-stat');
  const DX = 44, DY = 8, DW = 72, DH = 84, KY = DY + 34, FLOOR = DY + DH + 2, IN_FLOOR = DY + DH - 5;
  const START = 120, DOORWAY = DX + DW - 12, MH_OUT = 27, MH_IN = 24, MH_WIN = 12;
  // the window is drawn in its own little room coordinates (scaled 1.2 around its centre)
  const WIN_FLOOR = 61, BED_X = 22, BED_TOP = 55.6;
  // timeline (seconds): each step starts when the previous one ends
  const STEPS = [['unlock', .25], ['open', .55], ['toDoor', .75], ['sniff', .35], ['inside', .8], ['winWalk', .75], ['hop', .3], ['sit', .45], ['curl', .45], ['doze', .5], ['close', .5], ['lock', .25]];
  let st, si, tt, bolt, door, beepT = 0, touched = false, lastS = '', meowT = 1.2, bub = 0;
  const reset = () => { X.state.moeHome = false; st = 'wait'; si = -1; tt = 0; bolt = 1; door = 0; btn.disabled = false; btn.textContent = 'Unlock'; say('Moe’s stuck outside. Tap the keypad to let him in.'); };
  reset();
  const buf = document.createElement('canvas'); buf.width = 24; buf.height = 20; const bc = buf.getContext('2d');
  // draws Moe standing on floorY, h tall; f = walk frame
  const moeAt = (x, floorY, h, f, shadow = true) => { bc.clearRect(0, 0, 24, 20); X.moeSprite(bc, 4, 3, f); const w = h * 1.2; if (shadow) P(x + w * .18, floorY - h * .06, w * .58, Math.max(1, h * .08), 'rgba(0,0,0,.14)'); c.drawImage(buf, 0, 0, 24, 20, x, floorY - h * .75, w, h); };
  function loaf(a) { // Moe curled up asleep on the bed (window coordinates)
    c.globalAlpha = a; c.fillStyle = '#f6e7d4'; c.beginPath(); c.ellipse(23, 53.6, 6.4, 3.2, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(17.6, 53.2, 2.8, 0, Math.PI * 2); c.fill(); P(15.6, 49.6, 1.4, 1.6, '#e9b98a'); P(18.6, 49.6, 1.4, 1.6, '#e9b98a');
    P(16.4, 53, 1.4, .6, '#7a5a48'); P(18.8, 53, 1.4, .6, '#7a5a48'); c.strokeStyle = '#e9b98a'; c.lineWidth = 1.4; c.beginPath(); c.arc(24, 55, 5, .2, 2.2); c.stroke(); c.globalAlpha = 1;
  }
  function go() {
    touched = true;
    if (st === 'wait') { st = STEPS[0][0]; si = 0; tt = 0; beepT = .5; btn.disabled = true; [880, 1047, 1319].forEach((f, i) => setTimeout(() => X.tone(f, .06, 'square', .03), i * 70)); X.sfx && setTimeout(() => X.sfx('lock', .32), 60); say('Unlocked.'); }
    else if (st === 'home') reset();
  }
  btn.addEventListener('click', go);
  cv.addEventListener('pointerdown', e => { const p = pt(e); if (p.x > DX - 4 && p.x < DX + DW + 6 && p.y > DY) go(); });
  const stop = loop((dt, now) => {
    beepT = Math.max(0, beepT - dt); bub = Math.max(0, bub - dt);
    if (st === 'wait') { meowT -= dt; if (meowT <= 0) { meowT = 2.6; bub = 1.1; X.meow(); } }
    // advance the timeline
    if (si >= 0 && st !== 'home') { tt += dt * (X.reduce ? 3 : 1); while (si < STEPS.length && tt >= STEPS[si][1]) { tt -= STEPS[si][1]; si++;
        const nx = si < STEPS.length ? STEPS[si][0] : 'home';
        if (nx === 'open' && X.sfx) X.sfx('creak', .22, 1.25, .75, .35); if (nx === 'close' && X.sfx) X.sfx('creak', .16, 1.5, .5, .25); if (nx === 'lock' && X.sfx) X.sfx('lock', .3, .95);
        if (nx === 'sniff') say('A quick sniff…'); if (nx === 'inside') say('In he goes.'); if (nx === 'sit') { say('Bed check: approved.'); X.tone(520, .05, 'triangle', .02); } if (nx === 'doze') X.tone(330, .2, 'sine', .02, 220);
        if (nx === 'home') { X.state.moeHome = true; if (!X.sfx) X.tone(130, .08, 'square', .05); X.chime(); btn.disabled = false; btn.textContent = 'Play again'; say('Welcome home, Moe. The lock locked itself behind him. He’s napping at Home now if you want to visit.'); }
        st = nx; } }
    const u = si >= 0 && si < STEPS.length ? Math.min(1, tt / STEPS[si][1]) : 1;
    // door and bolt follow the timeline
    bolt = st === 'wait' ? 1 : st === 'unlock' ? 1 - u : st === 'lock' ? u : st === 'home' ? 1 : 0;
    door = st === 'open' ? ease(u) : ['toDoor', 'sniff', 'inside', 'winWalk', 'hop', 'sit', 'curl', 'doze'].includes(st) ? 1 : st === 'close' ? 1 - ease(u) : 0;
    // wall, frame, step, ground
    P(0, 0, W, H, '#dfe6ea'); for (let y = 5; y < H; y += 6) P(0, y, W, 1, '#ccd5db');
    P(DX - 6, DY - 6, DW + 12, DH + 6, '#2c3035'); P(0, DY + DH, W, H, '#a8b3ba'); P(DX - 10, DY + DH, DW + 20, 3, '#c3ccd2');
    // window: the room with Moe's bed
    const later = ['winWalk', 'hop', 'sit', 'curl', 'doze', 'close', 'lock', 'home'].includes(st), asleep = ['curl', 'doze', 'close', 'lock', 'home'].includes(st);
    P(4, 24, 34, 42, '#2c3035');
    c.save(); c.translate(21, 45); c.scale(1.2, 1.2); c.translate(-22, -47);
    c.save(); c.beginPath(); c.rect(10, 32, 24, 30); c.clip();
    P(10, 32, 24, 30, door > 0 || later ? '#f6dca8' : '#e9cf9c'); P(10, 32, 24, 2, '#fff1cf'); P(10, 54, 24, 8, '#c99a6b');
    c.fillStyle = '#5f7c93'; c.beginPath(); c.ellipse(BED_X, 57, 9, 3.6, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#7f9cb3'; c.beginPath(); c.ellipse(BED_X, 56.2, 7.4, 2.6, 0, 0, Math.PI * 2); c.fill();
    const sitX = BED_X - MH_WIN * .6, f = Math.floor(now / 120) % 2;
    if (st === 'winWalk') moeAt(32 - (32 - 17) * u, WIN_FLOOR, MH_WIN, f);
    if (st === 'hop') { const x = 17 - (17 - sitX) * u, fl = WIN_FLOOR + (BED_TOP - WIN_FLOOR) * u - Math.sin(u * Math.PI) * 5; moeAt(x, fl, MH_WIN, 0, false); }
    if (st === 'sit') moeAt(sitX, BED_TOP, MH_WIN, 0, false);
    if (st === 'curl') { c.globalAlpha = 1 - u; moeAt(sitX, BED_TOP + u * 1.5, MH_WIN * (1 - u * .25), 0, false); c.globalAlpha = 1; loaf(u); }
    if (['doze', 'close', 'lock', 'home'].includes(st)) { loaf(1); const z = (now / 900) % 1; c.globalAlpha = 1 - z; text(c, 'z', 27 + z * 3, 46 - z * 8, '#5f7a95', 1.1); c.globalAlpha = 1; }
    c.restore();
    P(10, 32, 1.6, 30, '#d9c7e8'); P(32.4, 32, 1.6, 30, '#d9c7e8');
    c.restore(); P(4, 63, 34, 3, '#3a3f46'); P(2, 65, 38, 2, '#2c3035');
    if (asleep) { c.globalCompositeOperation = 'lighter'; glow(c, 21, 45, 28, '255,190,110', .25); c.globalCompositeOperation = 'source-over'; }
    // inside the doorway: warm hallway, Moe walking through (clipped to the opening)
    P(DX, DY, DW, DH, '#f3d9a8'); P(DX, DY + DH - 14, DW, 14, '#c99a6b'); for (let x = DX; x < DX + DW; x += 9) P(x, DY + DH - 14, 1, 14, '#b48654');
    P(DX + 8, DY + DH - 8, 56, 4, '#7f9cb3'); P(DX + DW - 18, DY + 14, 2, 30, '#7a5232'); P(DX + DW - 23, DY + 10, 12, 6, '#fff3c4');
    if (st === 'inside') { c.save(); c.beginPath(); c.rect(DX, DY, DW, DH); c.clip(); const x0 = DOORWAY - 4, x1 = DX - MH_IN * 1.15; moeAt(x0 + (x1 - x0) * u, IN_FLOOR, MH_IN, f); c.restore(); }
    // the door, swinging on its left hinge
    const dw = Math.max(5, Math.round(DW * Math.cos(door * 1.42)));
    P(DX, DY, dw, DH, '#3b3f45'); P(DX, DY, dw, 2, '#4a4f56'); P(DX, DY + 22, dw, 3, '#b88a5a');
    if (dw > 30) { P(DX + 6, DY + 30, dw - 12, 22, 'rgba(0,0,0,.14)'); P(DX + 6, DY + 58, dw - 12, 20, 'rgba(0,0,0,.14)'); }
    if (door > 0) P(DX + dw, DY, Math.max(1, Math.round(5 * Math.sin(door * 1.42))), DH, '#262a2f');
    if (dw > 26) {
      const kx = DX + dw - 20; P(kx, KY, 12, 22, '#1b1d21'); P(kx, KY, 12, 1, '#3a3d44');
      for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) P(kx + 2 + k * 5, KY + 3 + r * 5, 3, 3, beepT > 0 ? '#9fd9ff' : '#4a4e57');
      P(kx + 3, KY + 18, 6, 1, bolt > .5 ? '#e9483c' : '#47c26a'); P(kx - 1, KY + 30, 14, 3, '#b88a5a');
    }
    if (door === 0) { const bl = Math.round(9 * bolt); P(DX + DW - 2, KY + 26, 2 + bl, 4, '#c9d1d8'); P(DX + DW - 2, KY + 26, 2 + bl, 1, '#eef2f5'); }
    // Moe outside on the step, then up to the doorway for a sniff
    if (st === 'wait' || st === 'unlock' || st === 'open') { moeAt(START, FLOOR, MH_OUT, 0); if (bub > 0) { c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.roundRect ? c.roundRect(START + 4, FLOOR - 36, 26, 10, 4) : c.rect(START + 4, FLOOR - 36, 26, 10); c.fill(); P(START + 10, FLOOR - 26, 3, 2, 'rgba(255,255,255,.95)'); text(c, 'meow', START + 17, FLOOR - 34, '#3a3f46', 1, 'c'); } }
    if (st === 'toDoor') { const k = ease(u); moeAt(START - (START - DOORWAY) * k, FLOOR - k * 7, MH_OUT - 3 * k, f); }
    if (st === 'sniff') moeAt(DOORWAY - Math.sin(u * Math.PI * 2) * 1.2, FLOOR - 7, MH_OUT - 3, 0);
    if (st === 'wait' && !touched) cue(c, P, DX + DW - 14, KY + 11, 'Tap', now, X.reduce);
    const ss = st === 'home' ? 'Locked · Moe is home' : bolt > .5 ? 'Locked' : st === 'close' ? 'Locking…' : 'Unlocked';
    if (ss !== lastS) { stat.textContent = ss; lastS = ss; }
  });
  return {stop};
};

/* ---------- Geotab: the pixel dashcam ---------- */
M.dash = (host, ctl, X) => {
  const W = 200, H = 110, {cv, c, P, pt} = make(host, W, H, '#0f1114');
  const F = (x, y, w, h, k) => { c.fillStyle = k; c.fillRect(x, y, w, h); }; // sub-pixel, so moving things glide
  ctl.innerHTML = `<div class="w-actions"><button type="button" class="w-alt" data-brake>Brake</button><button type="button" class="w-alt" data-cam>Cabin camera</button></div><p class="w-hint" aria-live="polite"></p>`;
  const say = hint(ctl), bb = ctl.querySelector('[data-brake]'), cb = ctl.querySelector('[data-cam]');
  let cam = 0, t = 0, pos = 0, spd = 62, brakeT = 0, stopT = 0, look = 'up', saved = 0, hits = 0, touched = false;
  let goose = null, gooseT = 2, feathers = [];
  const base = () => cam ? (X.touch ? 'Drag low on the picture and she checks her phone. Drag high and she watches the road.' : 'Move your mouse low on the picture and she checks her phone. Move it up and she watches the road.') : 'Watch for geese. Tap the road to brake.';
  const sync = () => { cb.textContent = cam ? 'Front camera' : 'Cabin camera'; bb.hidden = !!cam; };
  const brake = () => { if (cam) return; touched = true; brakeT = 1.6; if (goose && goose.mood === 'walk') goose.braked = true; X.tone(220, .12, 'sawtooth', .02, 120); };
  bb.addEventListener('click', brake); cb.addEventListener('click', () => { cam = 1 - cam; look = 'up'; sync(); say(base()); });
  cv.addEventListener('pointerdown', e => { if (cam) { look = pt(e).y > H * .55 ? 'down' : 'up'; return; } brake(); });
  cv.addEventListener('pointermove', e => { if (cam) look = pt(e).y > H * .55 ? 'down' : 'up'; });
  cv.addEventListener('pointerleave', () => { look = 'up'; });
  sync(); say(base());
  const gb = document.createElement('canvas'); gb.width = 24; gb.height = 30; const gx = gb.getContext('2d');
  const mb = document.createElement('canvas'); mb.width = 24; mb.height = 20; const mx = mb.getContext('2d');
  const HOR = 44, half = d => 3 + d * 1.6;
  const trees = Array.from({length: 7}, (_, i) => ({z: 4 + i * 6, side: i % 2 ? 1 : -1}));
  function box(x, y, w, h, col, label) { c.strokeStyle = col; c.lineWidth = 1; c.strokeRect(x, y, w, h); c.font = '600 6px "IBM Plex Mono", monospace'; const tw = c.measureText(label).width + 4; F(x - .5, y - 8, tw, 8, col); c.fillStyle = '#0f1114'; c.textBaseline = 'top'; c.fillText(label, x + 1.5, y - 7); }
  function gooseAt(x, y, k, mood, now) {
    // k = size factor; mood: walk | happy | sad
    const step = Math.floor(now / 160) % 2;
    F(x - 6 * k, y - 7 * k, 12 * k, 5 * k, '#8a6a4a'); F(x - 6 * k, y - 7 * k, 12 * k, 1 * k, '#a8865f');
    F(x - 7 * k, y - 6 * k, 3 * k, 2 * k, '#2b2b2b');
    const nx = mood === 'sad' ? 3 : 4, ny = mood === 'sad' ? -12 : -15;
    F(x + nx * k, y + ny * k, 2 * k, (mood === 'sad' ? 6 : 9) * k, '#1f2126'); F(x + nx * k, y + (ny - 2) * k, 5 * k, 3 * k, '#1f2126'); F(x + (nx + 1) * k, y + ny * k, 2 * k, 2 * k, '#ffffff');
    F(x + (nx + 5) * k, y + (ny - 1) * k, 2 * k, 1 * k, '#e08a2a');
    if (mood !== 'sad') { F(x + (-3 + step) * k, y - 2 * k, 1 * k, 3 * k, '#e08a2a'); F(x + (1 - step) * k, y - 2 * k, 1 * k, 3 * k, '#e08a2a'); }
    if (mood === 'happy') { const hy = y + (ny - 9) * k - (now % 900) / 900 * 4; F(x + 2 * k, hy, 2 * k, 2 * k, '#e9483c'); F(x + 5 * k, hy, 2 * k, 2 * k, '#e9483c'); F(x + 2 * k, hy + 1.5 * k, 5 * k, 2 * k, '#e9483c'); F(x + 3 * k, hy + 3.5 * k, 3 * k, 1 * k, '#e9483c'); }
    if (mood === 'sad') { F(x + 4 * k, y - 18 * k, 10 * k, 3 * k, '#8a949c'); F(x + 6 * k, y - 20 * k, 6 * k, 2 * k, '#8a949c'); for (let r = 0; r < 3; r++) F(x + (5 + r * 3) * k, y + (-14 + ((now / 120 + r * 3) % 6)) * k, .6 * k, 1.4 * k, '#7fb8e6'); F(x + 6 * k, y - 10 * k, .8 * k, 1.5 * k, '#9fd0ff'); }
  }
  function front(now) {
    const sky = c.createLinearGradient(0, 0, 0, HOR); sky.addColorStop(0, '#8cc6ec'); sky.addColorStop(1, '#cfe8f6'); c.fillStyle = sky; c.fillRect(0, 0, W, HOR);
    for (let x = 0; x < W; x++) { const h = 5 + Math.sin(x * .05) * 3 + Math.sin(x * .13) * 1.4; F(x, HOR - h, 1, h, '#8db795'); }
    for (let y = HOR; y < H; y++) {
      const d = y - HOR + 1, z = 150 / d, band = Math.floor(z * .45 + pos) % 2, hw = half(d);
      F(0, y, W, 1, band ? '#86b971' : '#7cae66'); F(100 - hw, y, hw * 2, 1, '#62666b');
      const rw = Math.max(1, d * .1); F(100 - hw - rw, y, rw, 1, '#e9e9e4'); F(100 + hw, y, rw, 1, '#e9e9e4');
      if (!band && d > 2) F(100 - d * .03, y, Math.max(.8, d * .06), 1, '#f4f2e4');
    }
    const draw = trees.map(o => [o.z, () => { const d = 150 / o.z, y = HOR + d, x = 100 + o.side * (half(d) + d * .9), h = d * .9; F(x - d * .04, y - h * .45, Math.max(.8, d * .08), h * .45, '#6b4a35'); c.fillStyle = '#4f9150'; c.beginPath(); c.arc(x, y - h * .62, Math.max(1, d * .32), 0, Math.PI * 2); c.fill(); }]);
    if (goose) draw.push([goose.z, () => { const d = 150 / goose.z, y = HOR + d - goose.lift * Math.max(.4, d / 15), x = 100 + goose.gx * half(d), k = Math.max(.4, d / 15); if (goose.mood === 'hit') { c.save(); c.translate(x, y - 6 * k); c.rotate(goose.rot); gooseAt(0, 6 * k, k, 'walk', now); c.restore(); } else gooseAt(x, y, k, goose.mood, now);
      if (goose.mood === 'walk') { box(x - 10 * k, y - 20 * k, 22 * k, 21 * k, '#4cff7a', 'GOOSE'); } }]);
    draw.sort((a, b) => b[0] - a[0]).forEach(q => q[1]());
    feathers = feathers.filter(f => (f.l -= 1 / 60) > 0); feathers.forEach(f => { f.vy += 40 / 60; f.vx *= .98; f.x += f.vx / 60; f.y += f.vy / 60; f.a += .15; c.save(); c.translate(f.x, f.y); c.rotate(f.a); F(-1.5, -.5, 3, 1, f.col); c.restore(); });
    // hood of the car
    c.fillStyle = '#23262b'; c.beginPath(); c.moveTo(0, H); c.lineTo(30, H - 9); c.quadraticCurveTo(100, H - 14, 170, H - 9); c.lineTo(W, H); c.fill();
    if (goose && goose.mood === 'walk' && goose.z < 30 && !touched) cue(c, P, 100, HOR + 44, 'Tap to brake', now, X.reduce);
  }
  function cabin(now) {
    F(0, 0, W, H, '#2a2d33');
    F(14, 6, 172, 34, '#1d2025');
    c.save(); c.beginPath(); c.rect(18, 9, 164, 28); c.clip();
    F(18, 9, 164, 28, '#bfe3f5'); F(18, 28, 164, 9, '#86ad8f');
    for (let i = 0; i < 9; i++) { const x = ((i * 31 - pos * 40) % 216 + 216) % 216 + 0; F(x, 20, 3, 10, '#6b4a35'); c.fillStyle = '#3f7a4a'; c.beginPath(); c.arc(x + 1.5, 18, 5, 0, Math.PI * 2); c.fill(); }
    F(18, 9, 164, 2, 'rgba(255,255,255,.35)'); c.restore();
    F(40, 46, 56, 64, '#3a3d44'); F(46, 40, 44, 10, '#3a3d44'); F(112, 56, 50, 54, '#3a3d44'); F(118, 50, 38, 9, '#3a3d44');
    const dist = look === 'down';
    gx.clearRect(0, 0, 24, 30); X.girl(gx, 2, 2, 'down', 0, true);
    if (dist) { gx.fillStyle = '#e8bfa0'; gx.fillRect(9, 9, 2, 3); gx.fillRect(13, 9, 2, 3); gx.fillStyle = '#3b2418'; gx.fillRect(9, 11, 2, 1); gx.fillRect(13, 11, 2, 1); }
    c.drawImage(gb, 0, 0, 24, 30, 44, 44 + (dist ? 2 : 0), 48, 60);
    if (dist) { F(70, 90, 9, 13, '#1f2126'); F(71, 91, 7, 10, '#7fc4ff'); }
    mx.clearRect(0, 0, 24, 20); X.moeSprite(mx, 4, 3, 0); c.drawImage(mb, 0, 0, 24, 20, 114, 70, 36, 30);
    if (!X.reduce && Math.floor(now / 1400) % 3 === 0) text(c, 'z', 150, 64, '#ffffff', 1.2);
    c.strokeStyle = '#141518'; c.lineWidth = 4; c.beginPath(); c.arc(68, 116, 26, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
    box(50, 46 + (dist ? 2 : 0), 40, 26, dist ? '#ff4a3d' : '#4cff7a', dist ? 'DISTRACTED' : 'EYES ON ROAD');
  }
  const stop = loop((dt, now) => {
    t += dt; brakeT = Math.max(0, brakeT - dt); stopT = Math.max(0, stopT - dt);
    const want = brakeT > 0 || stopT > 0 ? 0 : 62;
    spd += (want - spd) * Math.min(1, dt * (want ? 1.2 : 3.2));
    const zs = spd * dt * .13; pos += spd * dt * .075;
    trees.forEach(o => { o.z -= zs; if (o.z < 1.6) o.z += 42; });
    if (!goose) { gooseT -= dt; if (gooseT <= 0) { goose = {z: 40, gx: -1.5, mood: 'walk', t: 0, braked: false, lift: 0, rot: 0}; if (!cam) X.tone(1200, .05, 'square', .02); } }
    else {
      goose.t += dt; goose.z -= zs;
      if (goose.mood === 'walk') {
        goose.gx += dt * .5 * (spd < 5 ? 1.8 : 1);
        if (goose.braked && goose.gx < 1.2) brakeT = Math.max(brakeT, .3);
        if (goose.gx > 1.7) { if (goose.braked) { goose.mood = 'happy'; goose.t = 0; saved++; X.tone(700, .1, 'triangle', .04, 900); say(saved === 1 ? 'You stopped. The goose made it across and says thanks.' : `Goose saved. That’s ${saved}.`, base()); } else goose.mood = 'gone'; }
        else if (goose.z < 3 && Math.abs(goose.gx) < 1.05) { goose.mood = 'hit'; goose.t = 0; goose.hz = goose.z; goose.hx = goose.gx; stopT = 2.6; hits++; X.tone(160, .25, 'sawtooth', .04, 90);
          const d = 150 / goose.z, sx = 100 + goose.gx * half(d), sy = HOR + d - 8; for (let n = 0; n < 22; n++) feathers.push({x: sx, y: sy, vx: (Math.random() - .3) * 70, vy: -20 - Math.random() * 50, l: 1.4 + Math.random() * .8, col: n % 3 ? '#f1ece4' : '#8a6a4a', a: Math.random() * 6});
          say('Bonk. The goose is okay, just very sad. Tap the road to brake next time.', base()); }
      }
      if (goose.mood === 'hit') { const u = Math.min(1, goose.t / .7); goose.z = goose.hz + 5 * u; goose.gx = goose.hx + (1.45 - goose.hx) * u; goose.lift = Math.sin(u * Math.PI) * 16; goose.rot = u * Math.PI * 2; if (u >= 1) { goose.mood = 'sad'; goose.t = 0; goose.lift = 0; goose.rot = 0; X.tone(110, .1, 'square', .04); } }
      if (goose.mood === 'happy' || goose.mood === 'sad') { if (goose.mood === 'sad') goose.z = goose.hz + 5; if (goose.t > 2.2) goose.mood = 'gone'; }
      if (goose.mood === 'gone' && goose.z < 1.5 || goose.z < .8) { goose = null; gooseT = 1.5 + Math.random() * 1.5; }
    }
    cv.dataset.goose = goose ? goose.mood : '';
    cam ? cabin(now) : front(now);
    const sc = Math.floor(now / 500) % 2; if (sc) { c.fillStyle = '#ff3b2f'; c.beginPath(); c.arc(7, 8, 2, 0, Math.PI * 2); c.fill(); }
    text(c, 'REC', 12, 5, '#ffffff', 1.1); text(c, cam ? 'CABIN' : 'FRONT', 195, 5, '#ffffff', 1.1, 'r');
    const s2 = Math.floor(t); text(c, `${String(Math.floor(s2 / 60)).padStart(2, '0')}:${String(s2 % 60).padStart(2, '0')}`, 5, H - 10, '#ffffff', 1.1);
    text(c, Math.round(spd) + ' km/h', 195, H - 10, '#ffffff', 1.1, 'r');
  });
  return {stop};
};

/* ---------- Valbruna: scrap to steel bar ---------- */
M.steel = (host, ctl, X) => {
  const W = 288, H = 110, {cv, c, P} = make(host, W, H, '#2f2a28');
  ctl.innerHTML = `<div class="w-actions"><button type="button" class="w-alt" data-act></button></div><p class="w-hint" aria-live="polite"></p>`;
  const say = hint(ctl), btn = ctl.querySelector('[data-act]');
  const LABEL = {ready: 'SCRAP BUCKET', charge: 'CHARGING THE FURNACE', melt: 'ELECTRIC ARC FURNACE', tap: 'TAPPING INTO THE LADLE', move: 'LADLE TO THE CASTER', cast: 'CONTINUOUS CASTER', cut: 'TORCH CUT · ROLLING MILL', drain: 'ROLLING MILL', ship: 'SHIPPING'};
  const ORDER = 3, TORCH = 136, SPEC = 18, TOL = 5, RY = 88, STANDS = [172, 190, 208], BED = 236;
  let st = 'ready', tt = 0, temp = 25, holding = false, pool = 0, fill = 0, tilt = 0, lx = 86, ly = 80, strand = 0, hx = TORCH, bars = X.state.bars || 0, orders = X.state.orders || 0, sparks = [], shine = 0;
  let billets = [], bed = [], good = 0, cutT = 9, stampT = [], truck = W + 4, shipped = 0;
  const scrap = Array.from({length: 9}, (_, i) => ({ox: (i % 5) * 5 - 10, oy: Math.floor(i / 5) * 4, w: 3 + (i * 7) % 4, h: 2 + (i * 5) % 3, col: ['#7d838b', '#9aa0a6', '#6b6f75'][i % 3], y: 0, in: false}));
  function sync() {
    btn.disabled = !(st === 'ready' || st === 'melt' || st === 'cut');
    btn.textContent = st === 'ready' ? 'Charge the furnace' : st === 'melt' ? (holding ? 'Arcing…' : 'Hold for the arc') : st === 'cut' ? 'Cut' : 'Working…';
  }
  function go() { if (st !== 'ready') return; st = 'charge'; tt = 0; scrap.forEach(s => { s.y = 0; s.in = false; }); temp = 25; pool = 0; fill = 0; tilt = 0; lx = 86; ly = 80; strand = 0; hx = TORCH; billets = []; bed = []; good = 0; stampT = []; truck = W + 4; shipped = 0; say('Charging the furnace with scrap.'); sync(); }
  // the torch cuts at TORCH; the billet is whatever has come out past it
  function cut(len, auto) {
    if (st !== 'cut') return;
    const L = len == null ? hx - TORCH : len, ok = !auto && Math.abs(L - SPEC) <= TOL && good + billets.filter(b => b.ok).length < ORDER;
    billets.push({x: hx, len: L, ok, y: RY, vy: 0, a: 1}); hx = TORCH; cutT = 0;
    for (let n = 0; n < 10; n++) sparks.push({x: TORCH + (Math.random() - .5) * 2, y: RY, vx: (Math.random() - .3) * 70, vy: -20 - Math.random() * 50, l: .45});
    X.tone(900 + Math.random() * 200, .09, 'sawtooth', .015);
    if (ok && good + billets.filter(b => b.ok).length >= ORDER) { st = 'drain'; sync(); say('On spec. That’s the last one for this order.'); }
    else if (ok) say('On spec. Off to the rolling mill.');
    else say(L < SPEC ? 'A bit early, that one’s scrap. Wait for the mark to turn green.' : 'A bit late, that one’s scrap. Cut when the mark turns green.');
  }
  const hold = on => { if (st === 'cut') { if (on) cut(); return; } if (st !== 'melt') { if (on && st === 'ready') go(); return; } holding = on; sync(); };
  btn.addEventListener('click', () => { if (st === 'ready') go(); });
  btn.addEventListener('pointerdown', e => { if (st === 'melt' || st === 'cut') { e.preventDefault(); hold(true); } });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(k => btn.addEventListener(k, () => { if (st === 'melt') hold(false); }));
  btn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && (st === 'melt' || st === 'cut')) { e.preventDefault(); if (!e.repeat) hold(true); } });
  btn.addEventListener('keyup', e => { if ((e.key === ' ' || e.key === 'Enter') && st === 'melt') hold(false); });
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); hold(true); });
  ['pointerup', 'pointercancel'].forEach(k => cv.addEventListener(k, () => { if (st === 'melt') hold(false); }));
  sync(); say(orders ? `${orders} order${orders > 1 ? 's' : ''} shipped. Tap the scrap bucket for the next one.` : `New order: ${ORDER} bars. Tap the scrap bucket to charge the furnace.`);
  const stop = loop((dt, now) => {
    tt += dt; cutT += dt; const R = X.reduce ? 3 : 1.6;
    if (st === 'charge') { const k = Math.min(1, tt * R / 1.2); if (k >= .7) scrap.forEach((s, i) => { s.y = Math.min(1, s.y + dt * R * (2 + i * .15)); }); if (tt * R > 1.9) { st = 'melt'; tt = 0; sync(); say('Press and hold the furnace to strike the arc. Get it to 1600 °C.'); } }
    if (st === 'melt') {
      if (holding) { temp = Math.min(1600, temp + dt * 900); if (Math.random() < dt * 30) for (let n = 0; n < 2; n++) sparks.push({x: 58 + (Math.random() - .5) * 20, y: 78, vx: (Math.random() - .5) * 80, vy: -40 - Math.random() * 60, l: .5}); if (Math.random() < dt * 8) X.tone(55 + Math.random() * 20, .12, 'sawtooth', .025); }
      else temp = Math.max(25, temp - dt * 60);
      pool = Math.max(0, Math.min(1, (temp - 1100) / 500));
      if (temp >= 1600) { st = 'tap'; tt = 0; holding = false; sync(); say('Tapping: the furnace tilts and pours into the ladle.'); }
    }
    if (st === 'tap') { tilt = Math.min(1, tt * R / .4); if (tt * R > .4) { fill = Math.min(1, fill + dt * R / 1.1); pool = Math.max(0, 1 - fill); } if (tt * R > 1.6) { st = 'move'; tt = 0; say('The crane takes the ladle to the caster.'); } }
    if (st === 'move') { tilt = Math.max(0, tilt - dt * 3); const k = ease(Math.min(1, tt * R / 1.2)); lx = 86 + k * 31; ly = 80 - k * 46 - Math.sin(k * Math.PI) * 10; if (tt * R > 1.2) { st = 'cast'; tt = 0; say('The steel freezes into a strand. Tap to cut when the mark turns green.'); } }
    if (st === 'cast') { strand = Math.min(1, tt * R / .8); if (strand >= 1) { st = 'cut'; tt = 0; sync(); } }
    if (st === 'cut') {
      hx += dt * (X.reduce ? 7 : 10);
      if (hx - TORCH > SPEC + TOL + 8) cut(hx - TORCH, true);
      fill = Math.max(.08, 1 - (good + billets.filter(b => b.ok).length) / ORDER);
    }
    if (st === 'drain' && !billets.some(b => b.ok)) { st = 'ship'; tt = 0; sync(); say('Order filled. The crane’s loading the truck…'); }
    // billets: good ones run through the mill to the cooling bed, scrap drops into the bin
    billets = billets.filter(b => {
      if (!b.ok) { b.vy += 160 * dt; b.y += b.vy * dt; b.x += dt * 10; if (b.y > 100) b.a -= dt * 6; return b.a > 0; }
      b.x += dt * 46;
      if (b.x - 6 > BED) { good++; bars++; X.state.bars = bars; bed.push(bars % 5 === 0); stampT.push(0); X.thock(.8, 1.25); if (bars % 5 === 0) shine = 2.5; if (good < ORDER) say(bars % 5 === 0 ? `Bar ${good} of ${ORDER} is stamped. This one came out stainless.` : `Bar ${good} of ${ORDER} is stamped and cooling.`); return false; }
      return true;
    });
    stampT = stampT.map(t => t + dt);
    if (st === 'ship') {
      const s = tt * (X.reduce ? 1.6 : 1);
      truck = s < .7 ? W + 4 - (W + 4 - 248) * ease(s / .7) : s < 2.4 ? 248 : 248 + (s - 2.4) * 70 * (s - 2.4 + .4);
      const k2 = ease(Math.min(1, s / 1.2)); lx = 117 - 31 * k2; ly = 34 + 46 * k2 - Math.sin(k2 * Math.PI) * 10; fill = 0;
      if (s > 2.4 && !shipped) { shipped = 1; orders++; X.state.orders = orders; X.chime(); }
      if (s > 3.4) { st = 'ready'; tt = 0; bed = []; stampT = []; sync(); say(`Order #${orders} shipped. Tap the scrap bucket for the next one.`); }
    }
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
    if (st === 'move' || st === 'cast' || st === 'cut' || st === 'drain' || st === 'ship') P(lx + 9, 15, 1, ly - 15, '#9aa0a6');
    P(lx, ly, 20, 16, '#4a4f57'); P(lx + 2, ly + 2, 16, 12, '#2a2220'); if (fill > 0) { P(lx + 2, ly + 14 - fill * 11, 16, fill * 11, '#ff8a2a'); P(lx + 2, ly + 14 - fill * 11, 16, 1, '#ffd36b'); } P(lx - 1, ly, 22, 2, '#7d838b');
    // continuous caster: tundish, mold, strand bending onto the runout
    P(116, 52, 22, 6, '#4a4f57'); P(124, 58, 6, 14, '#7d838b');
    for (let x = 130; x < 230; x += 7) disc(P, x, RY + 6, 1, '#4a4f57');
    const inWin = st === 'cut' && Math.abs(hx - TORCH - SPEC) <= TOL; P(TORCH + SPEC - TOL, RY + 7, TOL * 2 + 1, 1, inWin ? '#7fdc8a' : 'rgba(242,193,78,.45)'); P(TORCH + SPEC, RY + 5, 1, 4, inWin ? '#7fdc8a' : '#f2c14e');
    if (st === 'cast' || st === 'cut' || st === 'drain') {
      const vy = st === 'cast' ? 60 + strand * 30 : RY + 2;
      for (let y = 60; y < Math.min(vy, RY + 2); y += 2) P(125, y, 4, 2, y < 70 ? '#ffd36b' : '#ff8a2a');
      if (st !== 'cast') { P(125, RY - 2, 4, 6, '#ff8a2a'); P(127, RY, hx - 127, 5, '#e8742c'); P(127, RY, hx - 127, 1, '#ffb347'); P(hx - 2, RY, 2, 5, '#c9452a'); }
    }
    // the torch
    P(TORCH - 3, 15, 6, 4, '#5a5f66'); P(TORCH - .5, 19, 1, 58, '#7d838b'); P(TORCH - 2, 77, 4, 6, '#9aa0a6'); P(TORCH - 1, 83, 2, 2, '#5a5f66');
    if (cutT < .22) { c.globalCompositeOperation = 'lighter'; glow(c, TORCH, RY + 1, 10, '255,220,140', .8); c.globalCompositeOperation = 'source-over'; P(TORCH - .5, 85, 1, 6, '#fff3a0'); }
    else if (st === 'cut') P(TORCH - .5, 85, 1, 2, '#7fb2ff');
    // rolling mill: three stands squeeze each billet longer and thinner
    const rolling = billets.some(b => b.ok && b.x > STANDS[0] - 4 && b.x - b.len < STANDS[2] + 4);
    STANDS.forEach((x, i) => { const spin = (rolling ? now / 60 : 0) + i; disc(P, x, 84, 5, '#5a5f66'); disc(P, x, 101, 5, '#5a5f66'); P(x + Math.round(Math.cos(spin) * 3), 84 + Math.round(Math.sin(spin) * 3), 1, 1, '#9aa0a6'); P(x + Math.round(Math.cos(-spin) * 3), 101 + Math.round(Math.sin(-spin) * 3), 1, 1, '#9aa0a6'); P(x - 7, 76, 2, 30, '#4a4440'); P(x + 6, 76, 2, 30, '#4a4440'); });
    billets.forEach(b => {
      if (!b.ok) { c.globalAlpha = Math.max(0, b.a); P(b.x - b.len, b.y, b.len, 5, '#a8442c'); c.globalAlpha = 1; return; }
      const passed = STANDS.filter(s => b.x > s).length, len = b.len + passed * 7, th = 5 - passed;
      P(b.x - len, RY + (5 - th) / 2, len, th, passed < 2 ? '#e06b2c' : passed < 3 ? '#c9552f' : '#a8483a');
    });
    // scrap bin under the runout
    P(140, 100, 24, 9, '#4a4f57'); P(140, 100, 24, 1, '#7d838b'); text(c, 'SCRAP', 152, 102, '#9aa0a6', .7, 'c');
    // cooling bed + the bundle (rides the crane when shipping)
    P(BED - 22, 96, 30, 2, '#5a524d');
    const s = st === 'ship' ? tt * (X.reduce ? 1.6 : 1) : 0;
    let cx = 226, hook = 22, bdx = 0, bdy = 0, onTruck = false;
    if (st === 'ship') {
      const k = (a, b) => ease(Math.max(0, Math.min(1, (s - a) / (b - a))));
      hook = 22 + 64 * k(.5, .8) - 30 * k(.85, 1.1) + 26 * k(1.5, 1.75) - 30 * k(1.85, 2.1);
      cx = 226 + 35 * k(1.1, 1.5);
      if (s > .8 && s < 1.8) { bdx = cx - 226; bdy = hook - 86; }
      if (s >= 1.8) onTruck = true;
    }
    P(cx - 5, 12, 10, 4, '#d9a441'); P(cx, 16, 1, hook - 16, '#9aa0a6'); P(cx - 2, hook, 5, 2, '#c9c1bb');
    const tx = st === 'ship' ? truck : W + 4;
    const drawBundle = (x, y) => bed.forEach((stn, i) => { P(x, y - i * 2, 22, 2, stn ? '#dfe7ee' : i % 2 ? '#8a9097' : '#7a8087'); });
    if (!onTruck) { drawBundle(BED - 20 + bdx, 94 + bdy); if (bdy) { P(BED - 15 + bdx, 90 + bdy, 1, 4, '#c9c1bb'); P(BED - 6 + bdx, 90 + bdy, 1, 4, '#c9c1bb'); } }
    // the truck backs in, gets loaded, drives off
    if (tx < W + 2) {
      P(tx, 92, 28, 3, '#6b6f75'); P(tx, 92, 28, 1, '#8a9097'); [0, 9, 18, 27].forEach(o => P(tx + o, 86, 1, 6, '#6b6f75')); P(tx, 95, 40, 2, '#3a3d42');
      P(tx + 29, 79, 11, 16, '#e0a33a'); P(tx + 29, 79, 11, 1, '#f2c14e'); P(tx + 33, 81, 6, 5, '#9fc2ff'); P(tx + 33, 81, 6, 1, '#d6e6ff'); P(tx + 30, 89, 2, 1, '#b07a22');
      disc(P, tx + 6, 97, 3, '#1f2125'); disc(P, tx + 33, 97, 3, '#1f2125'); P(tx + 6, 97, 1, 1, '#7d838b'); P(tx + 33, 97, 1, 1, '#7d838b');
      if (onTruck) drawBundle(tx + 3, 90);
    }
    if (shine > 0 && !X.reduce) { c.globalCompositeOperation = 'lighter'; glow(c, BED - 9, 90, 14, '220,235,255', .5 * Math.min(1, shine)); c.globalCompositeOperation = 'source-over'; }
    // order ticket: each bar gets a stamp
    P(152, 20, 50, 26, '#efe6d2'); P(152, 20, 50, 1, '#fff8e8'); P(152, 45, 50, 1, '#cbbf9f');
    text(c, `ORDER #${orders + 1 - (st === 'ship' && shipped ? 1 : 0)}`, 156, 22, '#3a332c', .85);
    for (let i = 0; i < ORDER; i++) {
      const bx = 156 + i * 15, done = i < bed.length; P(bx, 32, 11, 10, '#e2d7bd'); P(bx, 32, 11, 1, '#cbbf9f');
      if (done) { const t = stampT[i] || 1, k = t < .18 ? 1.8 - t / .18 * .8 : 1; c.save(); c.translate(bx + 5.5, 37); c.scale(k, k); c.rotate(-.2); c.strokeStyle = '#c4423a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-3, 0); c.lineTo(-1, 2.4); c.lineTo(3.2, -2.6); c.stroke(); c.restore(); }
    }
    if (st === 'ship' && shipped) { c.save(); c.translate(177, 33); c.rotate(-.18); const k = Math.min(1, (s - 2.4) / .15); c.globalAlpha = k; c.strokeStyle = '#c4423a'; c.lineWidth = 1; c.strokeRect(-21, -6, 42, 12); text(c, 'SHIPPED', 0, -3.5, '#c4423a', 1, 'c'); c.restore(); }
    if (st === 'ready') cue(c, P, 21, 30, 'Tap', now, X.reduce); else if (st === 'melt' && !holding) cue(c, P, 58, 78, 'Hold', now, X.reduce);
    else if (st === 'cut' && Math.abs(hx - TORCH - SPEC) <= TOL && cutT > .3) cue(c, P, TORCH, RY + 2, 'Cut now', now, X.reduce);
    sparks = sparks.filter(q => (q.l -= dt) > 0); sparks.forEach(q => { q.vy += 220 * dt; q.x += q.vx * dt; q.y += q.vy * dt; P(q.x, q.y, 1, 1, q.l > .25 ? '#fff3a0' : '#ff8a2a'); });
    if (st === 'melt' || st === 'tap') { text(c, Math.round(temp) + '°C', 4, 104 - 8, temp > 1400 ? '#ffb347' : '#c9c1bb'); P(4, 92, 30, 2, '#4a4440'); P(4, 92, 30 * (temp / 1600), 2, temp > 1400 ? '#ff8a2a' : '#c9452a'); }
    else text(c, 'BARS ' + bars, 4, 101 - 4, '#c9c1bb');
  });
  return {stop};
};

/* ---------- Evercloak: coat the membrane ---------- */
M.mem = (host, ctl, X) => {
  const W = 200, H = 110, {cv, c, P, pt} = make(host, W, H, '#eef3f4');
  ctl.innerHTML = `<div class="w-actions"><button type="button" class="w-alt" data-coat>Coat it</button><button type="button" class="w-alt" data-reset>Reset</button></div><p class="w-hint" aria-live="polite"></p>`;
  const say = hint(ctl), cb = ctl.querySelector('[data-coat]');
  const MX = 100, TOP = 14, BOT = 96;
  let coat = X.state.coat ? 1 : 0, coating = -1, tank = 0, rh = 70, taps = [], moeT = 0, t = 0, spawnT = 0, end = null;
  const mb = document.createElement('canvas'); mb.width = 24; mb.height = 20; const mbc = mb.getContext('2d');
  const base = () => coat ? 'Water vapor slips through the coated membrane. The air bounces back, so the room dries out.' : 'Humid air on the left. Tap the membrane to coat it and see what gets through.';
  const parts = [];
  const add = v => parts.push({x: 10 + Math.random() * 80, y: TOP + 4 + Math.random() * (BOT - TOP - 8), vx: (Math.random() < .5 ? -1 : 1) * (35 + Math.random() * 55), vy: (Math.random() - .5) * 70, v, side: 0});
  for (let i = 0; i < 28; i++) add(i % 2 === 0);
  cb.disabled = !!coat;
  const startCoat = () => { if (coat || coating >= 0) return; coating = 0; cb.disabled = true; X.tone(400, .5, 'sine', .02, 700); say('Coating…'); };
  cb.addEventListener('click', startCoat);
  ctl.querySelector('[data-reset]').addEventListener('click', () => { coat = 0; coating = -1; X.state.coat = false; tank = 0; end = null; cb.disabled = false; parts.forEach(p => { if (p.side) { p.side = 0; p.x = 20 + Math.random() * 60; } }); say(base()); });
  cv.addEventListener('pointerdown', e => {
    const p = pt(e), now = performance.now();
    if (Math.abs(p.x - MX) < 12 && !coat) { startCoat(); return; }
    if (Math.abs(p.x - MX) < 10) { taps.push(now); taps = taps.filter(x => x > now - 2200); if (taps.length >= 5) { taps = []; moeT = 3.5; X.meow(); say('Moe checked. Cats don’t pass through either.', base()); } }
  });
  say(base());
  const stop = loop((dt, now) => {
    t += dt;
    if (coating >= 0) { coating += dt / (X.reduce ? .4 : 1.5); if (coating >= 1) { coating = -1; coat = 1; X.state.coat = true; X.chime(); say(base()); } }
    spawnT -= dt; const leftV = parts.filter(p => p.v && !p.side).length;
    if (spawnT <= 0 && leftV < 16 && !end) { add(true); spawnT = .3; }
    // the bucket is full: Moe comes over for a drink, and that's the end
    if (tank >= 60 && !end) { end = {phase: 'walk', x: W + 12, t: 0}; say('The bucket is full. Someone heard it…'); }
    if (end) { end.t += dt;
      if (end.phase === 'walk') { end.x -= dt * (X.reduce ? 200 : 40); if (end.x <= 168) { end.x = 168; end.phase = 'drink'; end.t = 0; X.meow(); } }
      else if (end.phase === 'drink') { tank = Math.max(18, tank - dt * 9); if (!X.reduce && Math.floor(end.t * 6) % 2 && Math.random() < .3) X.tone(900 + Math.random() * 300, .02, 'sine', .01); if (end.t > 4.5) { end.phase = 'done'; end.t = 0; X.chime(); say('Moe had a drink and he’s happy. All done. Reset to play again.'); } } }
    parts.forEach(p => {
      if (p.side) { p.vy = Math.min(26, p.vy + 30 * dt); p.vx *= .97; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > 96 - 12 * tank / 60) { p.dead = true; if (!end) tank = Math.min(60, tank + 6); } return; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 6) { p.x = 6; p.vx = Math.abs(p.vx); } if (p.y < TOP + 2) { p.y = TOP + 2; p.vy = Math.abs(p.vy); } if (p.y > BOT - 2) { p.y = BOT - 2; p.vy = -Math.abs(p.vy); }
      if (p.x > MX - 5) { if (p.v && coat && Math.random() < .92) { p.side = 1; p.x = MX + 6; p.vx = 22 + Math.random() * 26; p.vy = (Math.random() - .5) * 8; X.tone(1400 + Math.random() * 500, .02, 'sine', .008); } else { p.x = MX - 5; p.vx = -Math.abs(p.vx); } }
    });
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].dead) parts.splice(i, 1);
    const target = 38 + 32 * Math.min(1, parts.filter(p => p.v && !p.side).length / 14); rh += (target - rh) * Math.min(1, dt * .7);
    moeT = Math.max(0, moeT - dt);
    P(0, 0, W, H, '#eef3f4'); P(4, TOP, MX - 6, BOT - TOP, '#e2eef2'); P(MX + 6, TOP, W - MX - 10, BOT - TOP, '#f4f7f8');
    text(c, 'ROOM AIR · RH ' + Math.round(rh) + '%', 6, 5, '#5f7a85'); text(c, 'WATER OUT', 194, 5, '#5f7a85', 1, 'r');
    // collection tank
    P(120, 84, 74, 14, '#c9d4d8'); P(121, 85, 72, 12, '#e8eef0'); P(121, 97 - 12 * tank / 60, 72, 12 * tank / 60, '#5aa9e6'); if (tank) P(121, 97 - 12 * tank / 60, 72, 1, '#9fd0ff');
    // membrane: substrate, coating, sheen
    P(MX - 2, TOP, 6, BOT - TOP, '#b9c1c6'); for (let y = TOP + 2; y < BOT; y += 4) P(MX, y, 1, 1, '#9aa4ab');
    const cv2 = coating >= 0 ? coating : coat;
    if (cv2 > 0) { const h = (BOT - TOP) * cv2; P(MX - 4, TOP, 2, h, '#2aa39a'); if (coat && !X.reduce) for (let y = TOP; y < BOT; y++) { const k = (y * .05 + t * .25) % 1; c.globalAlpha = .55; P(MX - 4, y, 1, 1, `hsl(${Math.round(k * 360)},70%,62%)`); c.globalAlpha = 1; } }
    if (coating >= 0) { const y = TOP + (BOT - TOP) * coating; P(MX - 9, y - 3, 8, 6, '#5f6b70'); P(MX - 4, y - 1, 2, 2, '#2aa39a'); }
    parts.forEach(p => { if (p.v) { P(p.x - 1, p.y - 1, 3, 3, '#3b8fd9'); P(p.x - 1, p.y - 1, 1, 1, '#9fd0ff'); } else { P(p.x - 1, p.y - 1, 3, 3, '#ffffff'); P(p.x - 1, p.y + 1, 3, 1, '#c3ccd1'); } });
    if (moeT > 0) { const k = Math.min(1, moeT, 3.5 - moeT + .001), bx = document.createElement('canvas'); bx.width = 24; bx.height = 20; X.moeSprite(bx.getContext('2d'), 4, 3, 0); c.drawImage(bx, 0, 0, 24, 20, 140, 70 - 16 * Math.min(1, k * 3), 30, 25); P(120, 84, 74, 14, '#c9d4d8'); P(121, 85, 72, 12, '#e8eef0'); P(121, 97 - 12 * tank / 60, 72, 12 * tank / 60, '#5aa9e6'); }
    if (!coat && coating < 0) cue(c, P, MX, 55, 'Tap', now, X.reduce);
    if (end) { mbc.clearRect(0, 0, 24, 20); X.moeSprite(mbc, 4, 3, end.phase === 'walk' ? Math.floor(now / 160) % 2 : 0);
      c.drawImage(mb, 0, 0, 24, 20, end.x - 18, 62 + (end.phase === 'drink' ? 17 + (Math.floor(now / 300) % 2) : 14), 36, 30);
      if (end.phase !== 'walk') { const hy = 70 - ((now / 1000) % 1) * 10; P(end.x - 6, hy, 2, 2, '#e9483c'); P(end.x - 3, hy, 2, 2, '#e9483c'); P(end.x - 6, hy + 1.5, 5, 2, '#e9483c'); P(end.x - 5, hy + 3.5, 3, 1, '#e9483c'); }
      if (end.phase === 'done') text(c, 'ALL DONE', 150, 22, '#2aa39a', 1.4, 'c'); }
    P(4, 100, 3, 3, '#3b8fd9'); text(c, 'WATER VAPOR', 9, 99, '#5f7a85'); P(60, 100, 3, 3, '#ffffff'); P(60, 102, 3, 1, '#c3ccd1'); text(c, 'AIR', 65, 99, '#5f7a85');
  });
  return {stop};
};

/* ---------- Waterloo: the wind-up soccer toy ---------- */
M.toy = (host, ctl, X) => {
  const W = 200, H = 110, {cv, c, P} = make(host, W, H, '#bfe3f5');
  ctl.innerHTML = `<div class="w-actions"><button type="button" class="w-alt" data-wind>Hold to wind</button></div><p class="w-hint" aria-live="polite"></p>`;
  const say = hint(ctl), btn = ctl.querySelector('[data-wind]');
  const base = 'Press and hold the toy to wind it, then let go to kick. Not too much, not too little.';
  say(base);
  const GY = 94, BX = 66;
  let pw = 0, winding = false, keyA = 0, lastClick = 0, leg = 0, kick = null, res = null, resT = 0, goals = X.state.goals || 0, conf = [], cam = 0;
  const ball = {x: BX, y: GY - 3, vx: 0, vy: 0, live: false};
  const mb = document.createElement('canvas'); mb.width = 24; mb.height = 20; const mx = mb.getContext('2d');
  let wound = false; const start = () => { if (ball.live || kick || res) return; winding = true; wound = true; };
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
    if (!wound && !ball.live && !kick) cue(c, P, 41, 78, 'Hold', now, X.reduce);
  });
  return {stop};
};


/* ---------- Waterloo: FrostBot, icing a cupcake ---------- */
M.cake = (host, ctl, X) => {
  const W = 160, H = 96, {cv, c, P} = make(host, W, H, '#f3ebe0');
  const F = (x, y, w, h, k) => { c.fillStyle = k; c.fillRect(x, y, w, h); };
  ctl.innerHTML = `<div class="w-actions"><button type="button" class="w-alt" data-ice>Hold to ice</button><span class="w-stat"></span></div><p class="w-hint" aria-live="polite"></p>`;
  const say = hint(ctl), btn = ctl.querySelector('[data-ice]'), stat = ctl.querySelector('.w-stat');
  const base = 'Press and hold the piston to pipe icing. Let go once the cupcake is iced all the way around.';
  const N = 48, REV = 2.6, CX = 80, TY = 62, RX = 27, RY = 7;
  let rot = 0, holding = false, used = false, done = false, cov, spills, drips, best = X.state.cakeBest || 0, tries = X.state.cakeTries || 0, swap = 0, eat = null, crumbs = [], candle = false;
  const reset = () => { cov = new Float32Array(N); spills = 0; drips = []; done = false; used = false; eat = null; crumbs = []; candle = false; };
  reset(); say(base);
  const mb = document.createElement('canvas'); mb.width = 24; mb.height = 20; const mbc = mb.getContext('2d');
  function finish() {
    const covered = cov.filter(v => v >= .55).length / N, acc = Math.max(0, Math.min(100, Math.round(covered * 100 - spills * 1.5)));
    done = true; tries++; X.state.cakeTries = tries; if (acc > best) { best = acc; X.state.cakeBest = best; }
    stat.textContent = `Accuracy ${acc}% · Best ${best}%`;
    if (acc >= 90) { candle = acc >= 98; eat = {ph: 'walk', t: 0, bites: 0, acc}; X.chime(); say(acc >= 98 ? `${acc}%. That beats FrostBot’s 98%. Someone noticed…` : `${acc}%. Nice icing. Someone noticed…`); }
    else if (covered < .9) say(`${acc}%. Some bare spots. Hold a little longer next time. Tap for another cupcake.`);
    else if (spills) say(`${acc}%. It spilled over the edge. Let go a little sooner. Tap for another cupcake.`);
    else say(`${acc}%. FrostBot hit 98% over 100 trials. Tap for another cupcake.`);
    X.tone(acc >= 90 ? 880 : 520, .12, 'triangle', .04);
  }
  const press = () => { if (eat && eat.ph !== 'happy') return; if (done) { swap = 1; reset(); say(base); return; } if (swap > .2) return; holding = true; used = true; X.tone(300, .08, 'triangle', .03); };
  const release = () => { if (!holding) return; holding = false; if (cov.some(v => v > .05)) finish(); };
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); press(); });
  ['pointerup', 'pointercancel'].forEach(k => cv.addEventListener(k, release));
  btn.addEventListener('pointerdown', e => { e.preventDefault(); press(); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(k => btn.addEventListener(k, release));
  btn.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) press(); } });
  btn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); release(); } });
  stat.textContent = best ? `Best ${best}%` : 'FrostBot: 98%';
  const stop = loop((dt, now) => {
    const sp = Math.PI * 2 / REV; if (!eat) rot = (rot + sp * dt) % (Math.PI * 2); swap = Math.max(0, swap - dt * 4);
    // Moe eats it: walk up, sniff, four bites, lick, heart
    const EDGE0 = CX + RX + 4, EDGE1 = CX - RX - 4, NB = 7, edgeAt = b => EDGE0 - (EDGE0 - EDGE1) * b / NB;
    if (eat) { eat.t += dt;
      if (eat.ph === 'walk' && eat.t > .9) { eat.ph = 'sniff'; eat.t = 0; }
      else if (eat.ph === 'sniff' && eat.t > .5) { eat.ph = 'bite'; eat.t = 0; }
      else if (eat.ph === 'bite' && eat.t > .34) { eat.t = 0; eat.bites++; const bx = edgeAt(eat.bites); X.bite ? X.bite() : X.thock(.7, .75 + eat.bites * .04);
        for (let n = 0; n < 8; n++) crumbs.push({x: bx + Math.random() * 3, y: TY - 4 + Math.random() * 16, vx: 10 + Math.random() * 30, vy: -10 - Math.random() * 25, col: n % 3 ? '#c98a5a' : n % 2 ? '#fff6ee' : '#f2a7bd'});
        if (eat.bites >= NB) { eat.ph = 'lick'; eat.t = 0; X.meow(); } }
      else if (eat.ph === 'lick' && eat.t > .7) { eat.ph = 'happy'; eat.t = 0; say(`${eat.acc}%. Moe ate the whole cupcake. Tap for another.`); } }
    // the nozzle sits over the front of the cupcake; the bin under it gets icing, spread to its neighbours
    if (holding && !done) {
      const a = ((Math.PI / 2 - rot) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2), i = Math.floor(a / (Math.PI * 2) * N) % N, r = N / REV;
      cov[i] += r * dt; if (cov[i] > 1.6 && !(cov[i] - r * dt > 1.6)) { spills++; drips.push({i, y: 0, v: 0}); X.tone(140, .08, 'sine', .03); }
    }
    F(0, 0, W, H, '#f3ebe0'); F(0, 0, W, 4, '#ebe1d3');
    // table, turntable
    F(0, 86, W, 10, '#c79a62'); F(0, 86, W, 1, '#d9b07a');
    c.fillStyle = '#9aa4ab'; c.beginPath(); c.ellipse(CX, 84, 38, 7, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c3ccd1'; c.beginPath(); c.ellipse(CX, 83, 38, 7, 0, 0, Math.PI * 2); c.fill();
    for (let k = 0; k < 8; k++) { const a = rot + k * Math.PI / 4; if (Math.sin(a) > 0) F(CX + Math.cos(a) * 35 - .5, 83 + Math.sin(a) * 6 - .5, 1.4, 1.4, '#8a949c'); }
    // spilled icing on the plate
    drips.forEach(d => { const a = d.i / N * Math.PI * 2 + rot; d.v += 60 * dt; d.y = Math.min(20, d.y + d.v * dt); if (Math.sin(a) > -.2) { const x = CX + Math.cos(a) * (RX + 2), y = TY + Math.sin(a) * RY + d.y; c.fillStyle = '#fff4ea'; c.beginPath(); c.ellipse(x, Math.min(y, 82 + Math.sin(a) * 3), 2.4, d.y >= 20 ? 1.4 : 2, 0, 0, Math.PI * 2); c.fill(); } });
    // the cupcake slides in fresh after each try
    const gone = eat && eat.bites >= NB;
    const edge = eat && eat.ph === 'bite' ? edgeAt(eat.bites) - (edgeAt(eat.bites) - edgeAt(eat.bites + 1)) * ease(Math.min(1, eat.t / .14)) : eat && eat.bites ? edgeAt(eat.bites) : EDGE0;
    c.save(); c.globalAlpha = 1 - swap;
    if (eat && edge < EDGE0) { c.beginPath(); c.moveTo(0, 0); c.lineTo(edge, 0); for (let y = TY - 26; y < 90; y += 7) c.quadraticCurveTo(edge - 4.5, y + 3.5, edge, y + 7); c.lineTo(0, H); c.closePath(); c.clip(); }
    if (!gone) {
    // paper liner with pleats that turn with it
    c.fillStyle = '#f2a7bd'; c.beginPath(); c.moveTo(CX - 22, 81); c.lineTo(CX - RX - 1, TY); c.lineTo(CX + RX + 1, TY); c.lineTo(CX + 22, 81); c.closePath(); c.fill();
    c.fillStyle = '#e58ea8'; c.beginPath(); c.ellipse(CX, 81, 22, 4, 0, 0, Math.PI); c.fill();
    for (let k = 0; k < 14; k++) { const a = rot + k * Math.PI * 2 / 14; if (Math.sin(a) <= 0) continue; const tx = CX + Math.cos(a) * (RX + 1), bx = CX + Math.cos(a) * 22; c.strokeStyle = 'rgba(160,60,90,.35)'; c.lineWidth = .8; c.beginPath(); c.moveTo(tx, TY + Math.sin(a) * 2); c.lineTo(bx, 81 + Math.sin(a) * 3); c.stroke(); }
    // cake top
    c.fillStyle = '#b5774a'; c.beginPath(); c.ellipse(CX, TY, RX + 1, RY + 1, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c98a5a'; c.beginPath(); c.ellipse(CX, TY - 2, RX - 2, RY - 1, 0, 0, Math.PI * 2); c.fill();
    // icing blobs, back to front
    const blobs = []; for (let i = 0; i < N; i++) { if (cov[i] < .05) continue; const a = i / N * Math.PI * 2 + rot; blobs.push([Math.sin(a), i, a, RX - 4]); blobs.push([Math.sin(a) - .01, i, a + .3, RX - 13]); }
    const mean = cov.reduce((q, v) => q + Math.min(1, v), 0) / N; if (mean > .15) { c.fillStyle = `rgba(255,246,238,${Math.min(1, mean * 1.2)})`; c.beginPath(); c.ellipse(CX, TY - 4 - mean * 2, RX - 12, RY - 3, 0, 0, Math.PI * 2); c.fill(); }
    blobs.sort((p, q) => p[0] - q[0]).forEach(([sa, i, a, rr]) => { const v = Math.min(1.7, cov[i]), x = CX + Math.cos(a) * rr, y = TY - 2 + Math.sin(a) * (RY - 1) * rr / (RX - 4) - v * (rr < RX - 6 ? 6 : 4), r = 2.2 + Math.min(1, v) * 2.4;
      c.fillStyle = v > 1.6 ? '#ffe9de' : '#fff6ee'; c.beginPath(); c.ellipse(x, y, r, r * .8, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(220,170,190,.55)'; c.beginPath(); c.ellipse(x + .6, y + r * .45, r * .8, r * .3, 0, 0, Math.PI * 2); c.fill();
      if (i % 4 === 0 && v > .55) F(x - .6, y - r * .4, 1, 1, ['#e35d50', '#5b8ee6', '#f2c14e', '#47a668'][i % 16 / 4 | 0]); });
    }
    if (candle && !gone) { F(CX - 1, TY - 18, 2, 8, '#5b8ee6'); c.fillStyle = '#ffcf5a'; c.beginPath(); c.ellipse(CX, TY - 20, 1.6, 2.6, 0, 0, Math.PI * 2); c.fill(); c.globalCompositeOperation = 'lighter'; glow(c, CX, TY - 20, 8, '255,200,90', .5); c.globalCompositeOperation = 'source-over'; }
    c.restore();
    // FrostBot's piston: grey beam, cylinder, nozzle (fixed)
    F(26, 5, 112, 6, '#8e959c'); for (let x = 30; x < 136; x += 6) { c.fillStyle = '#6f767d'; c.beginPath(); c.arc(x + 1, 8, 1.2, 0, Math.PI * 2); c.fill(); }
    F(130, 11, 6, 76, '#8e959c'); for (let y = 16; y < 84; y += 6) { c.fillStyle = '#6f767d'; c.beginPath(); c.arc(133, y, 1.2, 0, Math.PI * 2); c.fill(); }
    F(CX - 7, 11, 14, 4, '#6f767d');
    const push = holding ? 3 : 0;
    F(CX - 1.5, 12, 3, 6 + push, '#c9ced3');
    F(CX - 6, 18 + push, 12, 18, '#e8ecef'); F(CX - 6, 18 + push, 12, 2, '#ffffff'); F(CX + 4, 18 + push, 2, 18, '#c9ced3');
    F(CX - 4, 22 + push, 8, 11, 'rgba(255,246,238,.9)');
    c.fillStyle = '#9aa4ab'; c.beginPath(); c.moveTo(CX - 6, 36 + push); c.lineTo(CX + 6, 36 + push); c.lineTo(CX + 1.5, 44 + push); c.lineTo(CX - 1.5, 44 + push); c.fill();
    if (holding && !done) { const ty = TY + RY - 6; F(CX - 1.2, 44 + push, 2.4, ty - 44 - push, '#fff6ee'); }
    if (!used && !done) cue(c, P, CX, 28, 'Hold', now, X.reduce);
    // crumbs, then Moe on the table (in front of the frame)
    crumbs = crumbs.filter(q => q.y < 86); crumbs.forEach(q => { q.vy += 160 * dt; q.x += q.vx * dt; q.y += q.vy * dt; F(q.x, q.y, 1.2, 1.2, q.col); });
    if (eat) {
      const h = 33, w = 40, fl = 86; let x = 101, y = fl - h * .75, f = 0;
      const mouth = 7; // Moe's mouth sits ~7px in from the left of his sprite
      if (eat.ph === 'walk') { x = 170 - (170 - (EDGE0 - mouth + 2)) * ease(Math.min(1, eat.t / .9)); f = Math.floor(now / 130) % 2; }
      if (eat.ph === 'sniff') x = EDGE0 - mouth + 2 - Math.sin(eat.t * 18) * .8;
      if (eat.ph === 'bite') { const k = Math.sin(Math.min(1, eat.t / .2) * Math.PI); x = edge - mouth + 2 - k * 3; y -= k * 1.2; f = eat.t < .2 ? 1 : 0; }
      if (eat.ph === 'lick' || eat.ph === 'happy') x = Math.min(101, edge - mouth + 6);
      mbc.clearRect(0, 0, 24, 20); X.moeSprite(mbc, 4, 3, f);
      F(x + 6, fl - 1, w * .6, 2, 'rgba(0,0,0,.14)'); c.drawImage(mb, 0, 0, 24, 20, x, y, w, h);
      if (eat.ph === 'bite' && eat.t < .2) F(x + 8, y + 9, 4, 2, '#7a3a3a');
      if (eat.ph === 'lick' && Math.floor(eat.t * 8) % 2) F(x + 11, y + 11, 3, 2, '#f08a9a');
      if (eat.ph === 'happy') { const hy = y - 4 - (eat.t % 1.2) * 8; F(x + 10, hy, 3, 3, '#e9483c'); F(x + 15, hy, 3, 3, '#e9483c'); F(x + 10, hy + 2, 8, 3, '#e9483c'); F(x + 12, hy + 5, 4, 2, '#e9483c'); }
    }
  });
  return {stop};
};

window.Minis = M;
})();
