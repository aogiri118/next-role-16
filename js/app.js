/* NEXT ROLE 16 — メインロジック */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const Q = QUESTIONS;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const r1 = v => Math.round(v * 10) / 10;
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ================= 状態 ================= */
let idx = 0, ans = {}, timers = [], rafs = [], runOrder = {}, current = 's-top', lastResult = null;
const clearRun = () => { timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = []; rafs.forEach(cancelAnimationFrame); rafs = []; };
const inProgress = () => current === 's-quiz' && Object.keys(ans).length > 0;
function resetQuiz() { clearRun(); ans = {}; idx = 0; runOrder = {}; combo = 0; Q.forEach(q => delete q._hyped); $('#combo').classList.remove('on'); }

/* ================= 画面遷移 ================= */
function show(id) {
  if (id === 's-quiz' && current !== 's-quiz') { if (!Object.keys(ans).length) idx = 0; }
  current = id;
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.go === id || (id === 's-result' && b.dataset.go === 's-quiz')));
  if (id !== 's-quiz') { clearRun(); $('#combo').classList.remove('on'); }
  if (id === 's-quiz') render();
  if (id === 's-stats') renderStats();
  window.scrollTo(0, 0);
}
function guardedGo(id) {
  if (id === current) return;
  if (inProgress()) {
    confirmBox(() => { resetQuiz(); show(id); });
  } else show(id);
}
function confirmBox(onYes) {
  const m = $('#confirmModal'); m.classList.add('show'); m.setAttribute('aria-hidden', 'false');
  const close = () => { m.classList.remove('show'); m.setAttribute('aria-hidden', 'true'); };
  $('#cfNo').onclick = close;
  $('#cfYes').onclick = () => { close(); onYes(); };
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-go]'); if (!b) return;
  const id = b.dataset.go;
  if (id === 's-quiz' && current === 's-result') { resetQuiz(); }
  guardedGo(id);
});
$('#logoBtn').onclick = () => guardedGo('s-top');
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); }

/* ================= サウンド ================= */
let AC = null, muted = false;
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
document.addEventListener('pointerdown', e => { px = e.clientX; py = e.clientY; ac(); }, true);
$('#muteBtn').onclick = () => { muted = !muted; $('#muteBtn').textContent = muted ? '🔇' : '🔊'; };
function tone(f, d = .12, type = 'sine', vol = .12, slide = 0, at = 0) {
  const a = ac(); if (!a || muted) return;
  const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02);
}
function noise(d = .3, vol = .2, at = 0, freq = 1200) {
  const a = ac(); if (!a || muted) return;
  const b = a.createBuffer(1, a.sampleRate * d, a.sampleRate), c = b.getChannelData(0);
  for (let i = 0; i < c.length; i++) c[i] = (Math.random() * 2 - 1) * (1 - i / c.length);
  const n = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = freq; n.buffer = b; g.gain.value = vol;
  n.connect(f).connect(g).connect(a.destination); n.start(a.currentTime + at);
}
const SND = {
  pop: c => { const f = 520 * Math.pow(2, Math.min(c, 12) / 12); tone(f, .13, 'triangle', .16, 1.8); tone(f * 1.5, .1, 'sine', .06, 1.5, .05); },
  slam: () => { tone(90, .45, 'sawtooth', .16, .4); noise(.3, .25); },
  swoosh: () => noise(.22, .1, 0, 2400),
  scan: () => { tone(300, .5, 'sine', .07, 4); },
  fanfare: () => [523, 659, 784, 1047].forEach((f, i) => { tone(f, .38, 'square', .05, 0, i * .11); tone(f / 2, .38, 'triangle', .07, 0, i * .11); }),
  tick: () => tone(1500, .03, 'square', .04),
  detent: () => tone(880, .05, 'sine', .08)
};

/* ================= パーティクル ================= */
const cv = $('#fx'), cx = cv.getContext('2d'); let parts = [], fxOn = false, px = innerWidth / 2, py = innerHeight / 2;
function rs() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; cx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); }
rs(); addEventListener('resize', rs);
let COLS = ['#F28C38', '#2FA36B', '#3A7BD5', '#8E5CD9', '#3BD1FF', '#FFD23F'];
function startLoop() { if (!fxOn) { fxOn = true; requestAnimationFrame(loop); } }
function burst(x, y, n = 20, pow = 8, grav = .3) { if (RM) return; for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = pow * (.4 + Math.random()); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - pow * .4, g: grav, r: Math.random() * 6, vr: (Math.random() - .5) * .4, s: 3 + Math.random() * 5, c: COLS[i % COLS.length], l: 1, sh: Math.random() < .5 }); } startLoop(); }
function rain(n = 160, cols) { if (RM) return; const C = cols || COLS; for (let i = 0; i < n; i++) parts.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * .6, vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 4, g: .06, r: 0, vr: (Math.random() - .5) * .3, s: 6 + Math.random() * 7, c: C[i % C.length], l: 1.6, sh: true }); startLoop(); }
function loop() {
  cx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter(p => p.l > 0 && p.y < innerHeight + 40);
  parts.forEach(p => { p.vy += p.g; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.l -= .012; cx.save(); cx.globalAlpha = Math.min(1, p.l); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; if (p.sh) cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); else { cx.beginPath(); cx.arc(0, 0, p.s / 2.5, 0, 7); cx.fill(); } cx.restore(); });
  if (parts.length) requestAnimationFrame(loop); else { fxOn = false; cx.clearRect(0, 0, innerWidth, innerHeight); }
}
function shake(el = document.body) { if (RM) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
function cutin(main, sub = 'NEXT ROLE SCAN') { const c = $('#cutin'); $('#ciMain').textContent = main; $('#ciSub').textContent = sub; c.classList.remove('go'); void c.offsetWidth; c.classList.add('go'); SND.slam(); shake(); }

/* COMBO */
let combo = 0, qStart = 0;
function hype(first) {
  const fast = Date.now() - qStart < 7000;
  if (first) combo = fast ? combo + 1 : 1;
  SND.pop(combo); burst(px, py, 10 + Math.min(combo, 10) * 3, 5 + Math.min(combo, 10) * .8);
  const c = $('#combo');
  if (combo >= 3) {
    c.textContent = combo + ' COMBO!'; c.classList.add('on'); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
    if (first && combo % 5 === 0) { shake(); tone(880, .3, 'square', .06, 2); }
  } else c.classList.remove('on');
}

/* ================= 回答 ================= */
function setAns(q, score, raw, fx = true) {
  const s = r1(Math.max(-3, Math.min(3, score)));
  const first = !ans[q.id];
  const same = !first && ans[q.id].score === s && JSON.stringify(ans[q.id].raw) === JSON.stringify(raw);
  ans[q.id] = { score: s, raw };
  $('#nextBtn').disabled = false; updateHint(q);
  if (fx && !same) hype(first);
}
function unset(q) { delete ans[q.id]; $('#nextBtn').disabled = true; updateHint(q); }

/* ================= 開発メモ ================= */
$('#devToggle').onclick = () => {
  const on = document.body.classList.toggle('dev');
  $('#devToggle').classList.toggle('on', on); $('#devToggle').textContent = '開発メモ：' + (on ? 'ON' : 'OFF');
};
function dirText(q) {
  const a = AXES[q.axis];
  if (q.type === 'scale') return `そう思う＝${q.dir > 0 ? a.pos : a.neg}（${q.dir > 0 ? a.pn : a.nn}）／${q.text.length > 45 ? '5' : '7'}段階`;
  if (q.type === 'ab') return `左（A）＝${q.aPole > 0 ? a.pos : a.neg}／右（B）＝${q.aPole > 0 ? a.neg : a.pos}。中央±5で吸着`;
  if (q.type === 'choice') return `選択肢ごとに＋＝${a.pos}、−＝${a.neg}` + (q.flip ? '（表示順を逆にして−側を上に）' : '');
  return {
    photo: '得点＝中心性(端0/中寄1/中央2)×2＋前方度(後0/中1/前2)−3',
    wave: 'A（刺激で増幅）＋3／B（一定）＋1／C（揺れて戻る）−1／D（ほぼ揺れない）−3。並びは毎回ランダム。4秒で選択可',
    tako: '定番（タコ・ネギ・紅しょうが・天かす）＝S＋1、変わり種（チーズ・キムチ・チョコ・明太マヨ）＝N−1。3つの合計',
    bonus: '基本：−3＋6×(A−B)/10500。合計3万円かつ|A−B|≦2000なら理由で −1／−3',
    line: 'T系＋1・F系−1。結論が1通目＋1／2通目0／3通目−1。合計±3',
    seat: '横：通路＋2／真ん中−1／窓−2（翼の上の窓は−1.5）＋前後：1列目＋1〜10列目−1。±3に収める。どこでもいい＝−1、時間切れ＝0',
    swipe: 'カード1・3＝J（アリで＋1）、カード2＝P（アリで−1）。時間切れ0。1枚5秒'
  }[q.type];
}
function updateHint(q) {
  const h = $('#devhint'); if (!h) return; const a = ans[q.id];
  h.innerHTML = `<b>${AXES[q.axis].label}（${q.axis}）第${q.no}問</b>：${dirText(q)}<br>今の点数：${a ? a.score : '未回答'}`;
}

/* ================= 描画 ================= */
function render() {
  clearRun();
  const q = Q[idx], a = AXES[q.axis];
  $('#pbar').style.width = (idx / Q.length * 100) + '%';
  $('#pnum').textContent = `${idx + 1} / ${Q.length}`;
  $('#pstage').innerHTML = q.special ? '<span class="stage sp">SPECIAL STAGE</span>' : '<span class="stage">STANDARD</span>';
  const c = $('#qcard');
  c.innerHTML = `<div class="qhead"><span class="chip dev" style="background:${a.color}">${q.axis}</span>${q.special ? `<span class="chip sp">◆ ${q.special}</span>` : ''}</div><p class="qtext"></p><div id="qbody"></div><div class="devhint" id="devhint"></div>`;
  c.querySelector('.qtext').textContent = q.text;
  $('#backBtn').disabled = idx === 0;
  $('#nextBtn').disabled = !ans[q.id];
  $('#nextBtn').textContent = idx === Q.length - 1 ? '結果を見る' : '次へ';
  R[q.type](q, $('#qbody'));
  updateHint(q); qStart = Date.now();
  c.classList.remove('enter'); void c.offsetWidth; c.classList.add('enter'); SND.swoosh();
}

function nScale(el, q) {
  const n = q.text.length > 45 ? 5 : 7;
  const vals = n === 7 ? [-3, -2, -1, 0, 1, 2, 3] : [-3, -1.5, 0, 1.5, 3];
  const sizes = n === 7 ? [46, 38, 30, 24, 30, 38, 46] : [46, 36, 26, 36, 46];
  const mid = (n - 1) / 2;
  el.insertAdjacentHTML('beforeend', `<div class="scale"><span class="lbl l">そう<br>思わない</span><div class="circles"></div><span class="lbl r">そう<br>思う</span></div>`);
  const box = el.querySelector('.circles'); const prev = ans[q.id] ? ans[q.id].raw : null;
  sizes.forEach((s, i) => {
    const b = document.createElement('button'); b.className = 'circ' + (prev === i ? ' on' : '');
    const col = i > mid ? 'var(--agree)' : i < mid ? 'var(--disagree)' : '#AEB5C6';
    b.style.cssText = `width:${s}px;height:${s}px;border-color:${col};color:${col};background:${prev === i ? col : '#fff'}`;
    b.setAttribute('aria-label', `${n}段階中${i + 1}`);
    b.onclick = () => { box.querySelectorAll('.circ').forEach(x => { x.style.background = '#fff'; x.classList.remove('on'); }); b.style.background = col; b.classList.add('on'); b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); setAns(q, vals[i] * q.dir, i); };
    box.appendChild(b);
  });
}

function focusIntro(el, title, msg, onStart) {
  el.innerHTML = `<div class="focus-intro"><div class="fi-t">READY?</div><b style="font-size:18px">${title}</b><p>${msg}</p><button class="btn glow">スタート</button></div>`;
  el.querySelector('.btn').onclick = onStart;
}

const R = {
  scale(q, el) { nScale(el, q); },

  ab(q, el) {
    const prev = ans[q.id] ? ans[q.id].raw : null;
    el.innerHTML = `<div class="ablabels"><div class="a"><i>A</i></div><div class="b"><i>B</i></div></div>
      <div class="sl ${prev === null ? 'untouched' : ''} ${prev === 50 ? 'center' : ''}"><span class="notch"></span><input type="range" min="0" max="100" step="1" value="${prev === null ? 50 : prev}" aria-label="AとBのどちらに近いか"></div>
      <div class="ticks"><span>Aそのもの</span><span>どっちも</span><span>Bそのもの</span></div><div class="slread"></div>`;
    el.querySelector('.a').append(q.a); el.querySelector('.b').append(q.b);
    const inp = el.querySelector('input'), wrap = el.querySelector('.sl'), rd = el.querySelector('.slread');
    const DET = 5; let inDet = prev === 50, lastStep = null, touched = prev !== null;
    const read = x => { rd.textContent = x === 50 ? 'ちょうど真ん中（どちらとも言えない）' : (x < 50 ? 'A' : 'B') + '寄り ' + Math.round(50 + Math.abs(x - 50)) + '%'; };
    if (prev !== null) read(prev); else rd.textContent = 'つまみに触れると回答になります';
    const commit = (fx) => {
      let x = +inp.value;
      if (Math.abs(x - 50) <= DET) { x = 50; inp.value = 50; if (!inDet) { inDet = true; SND.detent(); if (navigator.vibrate) navigator.vibrate(8); } }
      else inDet = false;
      wrap.classList.toggle('center', x === 50); wrap.classList.remove('untouched');
      read(x);
      const st = Math.round(x / 10); if (st !== lastStep) { lastStep = st; if (!inDet) SND.tick(); }
      setAns(q, (50 - x) / 50 * 3 * q.aPole, x, fx);
    };
    inp.addEventListener('pointerdown', () => { if (!touched) { touched = true; commit(false); } });
    inp.addEventListener('keydown', () => { touched = true; });
    inp.addEventListener('input', () => { touched = true; commit(false); });
    inp.addEventListener('change', () => { commit(false); hype(!q._hyped); q._hyped = true; });
  },

  choice(q, el) {
    const opts = q.flip ? [...q.opts].reverse() : q.opts;
    el.innerHTML = '<div class="opts"></div>'; const box = el.firstChild;
    opts.forEach(([p, t]) => {
      const b = document.createElement('button'); b.className = 'opt' + (ans[q.id] && ans[q.id].raw === t ? ' sel' : '');
      b.textContent = t; const sm = document.createElement('small'); sm.textContent = (p > 0 ? '+' : '') + p; b.appendChild(sm);
      b.onclick = () => { box.querySelectorAll('.opt').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); setAns(q, p, t); };
      box.appendChild(b);
    });
  },

  photo(q, el) {
    const rows = [['back', '後列（段差の上）'], ['mid', '中列（立ち）'], ['front', '前列（しゃがみ）']]; const cen = [0, 1, 2, 1, 0];
    el.innerHTML = `<div class="photo">${rows.map(([k, l], r) => `<div class="rowlbl">${l}</div><div class="prow ${k}">${[0, 1, 2, 3, 4].map(ci => `<button class="spot" data-r="${r}" data-c="${ci}" aria-label="${l}・左から${ci + 1}番目">👣</button>`).join('')}</div>`).join('')}<div class="cam">📷 カメラ</div><div class="flash"></div></div>`;
    const prev = ans[q.id] && ans[q.id].raw;
    el.querySelectorAll('.spot').forEach(s => {
      const r = +s.dataset.r, ci = +s.dataset.c;
      if (prev && prev.r === r && prev.c === ci) { s.classList.add('sel'); s.textContent = '🙂'; }
      s.onclick = () => {
        el.querySelectorAll('.spot').forEach(x => { x.classList.remove('sel'); x.textContent = '👣'; });
        s.classList.add('sel'); s.textContent = '🙂';
        const f = el.querySelector('.flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); noise(.08, .2, 0, 4000);
        setAns(q, cen[ci] * 2 + r - 3, { r, c: ci });
      };
    });
  },

  wave(q, el) {
    if (!runOrder[q.id]) runOrder[q.id] = shuffle(['A', 'B', 'C', 'D']);
    const order = runOrder[q.id], pts = { A: 3, B: 1, C: -1, D: -3 }, labels = ['ア', 'イ', 'ウ', 'エ'];
    el.innerHTML = `<div class="waves">${order.map((k, i) => `<button class="wcard" data-k="${k}" disabled><b>${labels[i]}</b><canvas width="300" height="70"></canvas></button>`).join('')}</div><p class="waitmsg">1周（約4秒）見てから選べます…</p>`;
    const cards = [...el.querySelectorAll('.wcard')], prev = ans[q.id] && ans[q.id].raw;
    cards.forEach(b => { if (prev === b.dataset.k) b.classList.add('sel'); b.onclick = () => { cards.forEach(x => x.classList.remove('sel')); b.classList.add('sel'); setAns(q, pts[b.dataset.k], b.dataset.k); }; });
    const enable = () => { cards.forEach(b => b.disabled = false); const m = el.querySelector('.waitmsg'); if (m) m.textContent = 'しっくりくる波をタップ'; };
    if (prev || RM) enable(); else timers.push(setTimeout(enable, 4000));
    const H = [1, 2.33, 3.67], L = 4;
    const f = {
      A: t => { let amp = 4; H.forEach(h => { if (t > h) amp += 7 * (1 - Math.exp(-(t - h) * 6)); }); return amp * Math.sin(2 * Math.PI * 3 * t); },
      B: t => 10 * Math.sin(2 * Math.PI * .75 * t),
      C: t => { let y = 8 * Math.sin(2 * Math.PI * .5 * t); H.forEach(h => { if (t > h) y += 7 * Math.exp(-(t - h) * 7) * Math.sin(2 * Math.PI * 6 * (t - h)); }); return y; },
      D: t => 3 * Math.sin(2 * Math.PI * .25 * t)
    };
    const t0 = performance.now();
    const draw = () => {
      const now = RM ? L - .001 : ((performance.now() - t0) / 1000) % L;
      cards.forEach(b => {
        const c = b.querySelector('canvas'), x = c.getContext('2d'), W = c.width, Hh = c.height; x.clearRect(0, 0, W, Hh);
        x.setLineDash([3, 4]); x.strokeStyle = 'rgba(59,209,255,.35)'; x.lineWidth = 1;
        H.forEach(h => { if (h <= now) { const p = h / L * W; x.beginPath(); x.moveTo(p, 0); x.lineTo(p, Hh); x.stroke(); x.fillStyle = '#FFD23F'; x.beginPath(); x.arc(p, 5, 3, 0, 7); x.fill(); } });
        x.setLineDash([]); x.strokeStyle = '#3BD1FF'; x.lineWidth = 2; x.shadowColor = '#3BD1FF'; x.shadowBlur = 6; x.beginPath();
        for (let p = 0; p <= now / L * W; p += 1.5) { const y = Hh / 2 - f[b.dataset.k](p / W * L) * 1.4; p ? x.lineTo(p, y) : x.moveTo(p, y); }
        x.stroke(); x.shadowBlur = 0;
      });
      if (!RM) rafs[0] = requestAnimationFrame(draw);
    };
    draw();
  },

  tako(q, el) {
    const base = [['タコ', 1], ['ネギ', 1], ['紅しょうが', 1], ['天かす', 1], ['チーズ', -1], ['キムチ', -1], ['チョコ', -1], ['明太マヨ', -1]];
    if (!runOrder[q.id]) runOrder[q.id] = shuffle(base);
    const items = runOrder[q.id];
    let sel = ans[q.id] ? [...ans[q.id].raw] : [];
    el.innerHTML = '<div class="tako"></div><div class="counter"></div>'; const box = el.firstChild, cnt = el.lastChild;
    const paint = () => {
      box.innerHTML = '';
      items.forEach(([n]) => {
        const b = document.createElement('button'); b.className = 'ing' + (sel.includes(n) ? ' sel' : ''); b.textContent = n;
        b.onclick = () => { if (sel.includes(n)) sel = sel.filter(x => x !== n); else if (sel.length < 3) sel.push(n); else { toast('3つまで選べます'); return; } paint(); };
        box.appendChild(b);
      });
      cnt.textContent = `${sel.length} / 3 個えらびました`;
      if (sel.length === 3) setAns(q, sel.reduce((s, n) => s + items.find(i => i[0] === n)[1], 0), [...sel]); else unset(q);
    };
    paint();
  },

  bonus(q, el) {
    const st = ans[q.id] ? { ...ans[q.id].raw } : { A: 0, B: 0, C: 0, why: null };
    const staff = [['A', 'Aさん', '売上への働きが一番大きい（貢献 50%）'], ['B', 'Bさん', '学費のためにバイト代が必要。ただ、卒論と実習でシフトは少なめ（貢献 15%）'], ['C', 'Cさん', '平均的に関わっている（貢献 35%）']];
    el.innerHTML = `<div class="staff">${staff.map(([k, n, d]) => `<div class="srow"><div><b>${n}</b><span>${d}</span></div><div class="step"><button data-k="${k}" data-d="-1" aria-label="${n}を1000円減らす">−</button><output id="o${k}"></output><button data-k="${k}" data-d="1" aria-label="${n}を1000円増やす">＋</button></div></div>`).join('')}</div><div class="remain" id="remain"></div>
    <div class="reason" id="reason"><p style="font-weight:700;margin:0 0 6px">AさんとBさんがほぼ同じ額ですね。その理由に近いのは？</p><div class="opts"><button class="opt" data-w="1">揉めない、一番公平な分け方だから</button><button class="opt" data-w="2">誰も寂しい思いをしないから</button></div></div>`;
    const upd = (fx) => {
      ['A', 'B', 'C'].forEach(k => el.querySelector('#o' + k).textContent = st[k].toLocaleString() + '円');
      const r = 30000 - st.A - st.B - st.C, near = Math.abs(st.A - st.B) <= 2000;
      el.querySelector('#remain').textContent = r === 0 ? '✓ 3万円を分け終わりました' : `残り ${r.toLocaleString()}円`;
      const rsn = el.querySelector('#reason'); rsn.classList.toggle('show', r === 0 && near);
      if (!(r === 0 && near)) st.why = null;
      rsn.querySelectorAll('.opt').forEach(o => o.classList.toggle('sel', +o.dataset.w === st.why));
      if (r === 0 && (!near || st.why)) setAns(q, near ? (st.why === 1 ? -1 : -3) : -3 + 6 * ((st.A - st.B) / 10500), { ...st }, fx);
      else unset(q);
    };
    el.querySelectorAll('.step button').forEach(b => b.onclick = () => {
      const k = b.dataset.k, d = +b.dataset.d * 1000, tot = st.A + st.B + st.C;
      if (d > 0 && tot >= 30000) { toast('3万円を配りきりました'); return; }
      st[k] = Math.max(0, st[k] + d); SND.tick(); upd(true);
    });
    el.querySelectorAll('#reason .opt').forEach(o => o.onclick = () => { st.why = +o.dataset.w; upd(true); });
    upd(false);
  },

  line(q, el) {
    const msgs = [{ k: 'end', t: '今回の新歓企画は、別の案でいくことになったよ。', req: 1 }, { k: 'T1', t: '決め手は予算と準備期間。今の人数だと当日までに回しきれないと判断したんだ。', p: 1 }, { k: 'T2', t: '次に出すときは、費用の見積もりを先につけると通りやすいと思う！', p: 1 }, { k: 'F1', t: '時間かけて考えてくれて、本当にありがとう！', p: -1 }, { k: 'F2', t: 'がっかりさせたらごめんね。また一緒に企画考えよう！', p: -1 }];
    if (!runOrder[q.id]) runOrder[q.id] = [msgs[0], ...shuffle(msgs.slice(1))];
    const list = runOrder[q.id];
    let seq = ans[q.id] ? [...ans[q.id].raw] : [];
    el.innerHTML = '<div class="chat"></div><div class="pick"></div><div class="center"><button class="linkbtn">やり直す</button></div>';
    const chat = el.querySelector('.chat'), pick = el.querySelector('.pick');
    el.querySelector('.linkbtn').onclick = () => { seq = []; unset(q); paint(); };
    const paint = () => {
      chat.innerHTML = seq.length ? '' : '<div class="empty">ここに送るメッセージが並びます</div>';
      seq.forEach(k => { const d = document.createElement('div'); d.className = 'bub'; d.textContent = msgs.find(m => m.k === k).t; chat.appendChild(d); });
      pick.innerHTML = ''; const needEnd = !seq.includes('end') && seq.length === 2;
      list.forEach(m => {
        const b = document.createElement('button'); b.className = 'pcard' + (m.req ? ' req' : ''); b.textContent = (m.req ? '【必須】' : '') + m.t;
        b.disabled = seq.includes(m.k) || seq.length >= 3 || (needEnd && !m.req);
        b.onclick = () => {
          seq.push(m.k); tone(1200, .06, 'sine', .08); paint();
          if (seq.length === 3) { const pos = seq.indexOf('end'); setAns(q, (pos === 0 ? 1 : pos === 2 ? -1 : 0) + seq.filter(k => k !== 'end').reduce((a, k) => a + msgs.find(x => x.k === k).p, 0), [...seq]); }
        };
        pick.appendChild(b);
      });
    };
    paint();
  },

  seat(q, el) {
    const ROWS = 10, LIM = 10;
    const taken = new Set(['1A', '1B', '2E', '2F', '3C', '4A', '4B', '5E', '6D', '7B', '7F', '8C', '8E', '9A', '10D', '10E', '3F', '6A']);
    const wingRows = [5, 6, 7], colPt = { A: -2, F: -2, B: -1, E: -1, C: 2, D: 2 };
    const calc = (r, c) => { let v = colPt[c]; if ((c === 'A' || c === 'F') && wingRows.includes(r)) v = -1.5; v += 1 - 2 * (r - 1) / (ROWS - 1); return v; };
    const desc = (r, c) => `${r}${c}　${c === 'A' || c === 'F' ? (wingRows.includes(r) ? '窓側（翼の上）' : '窓側') : c === 'C' || c === 'D' ? '通路側' : '真ん中'}・${r <= 3 ? '前方' : r >= 8 ? '後方' : '中ほど'}`;
    const names = { any: 'どこでもいい', time: '時間切れ' };
    const seatBtn = (r, c) => `<button class="cs ${taken.has(r + c) ? 'taken' : ''}" data-r="${r}" data-c="${c}" ${taken.has(r + c) ? 'disabled' : ''} aria-label="${r}${c}"></button>`;
    const cabin = () => `<div class="cabinwrap"><div class="cabin"><div class="nose">✈ 前方（降り口）</div><div class="wing l"></div><div class="wing r"></div>${Array.from({ length: ROWS }, (_, k) => { const r = k + 1; return (r === 6 ? '<div class="exitrow">◀ 非常口 ▶</div>' : '') + `<div class="crow"><span class="rn">${r}</span>${['A', 'B', 'C'].map(c => seatBtn(r, c)).join('')}<span class="aisle">通路</span>${['D', 'E', 'F'].map(c => seatBtn(r, c)).join('')}</div>`; }).join('')}<div class="nose" style="position:static;margin-top:6px">後方（トイレ）</div></div></div>`;
    const doneView = () => {
      const a = ans[q.id].raw;
      el.innerHTML = `<div class="done">あなたの席：${a.r ? desc(a.r, a.c) : names[a]}</div><div class="center" style="margin-top:10px"><button class="linkbtn">もう一度やる</button></div>`;
      el.querySelector('.linkbtn').onclick = () => { unset(q); startView(); };
    };
    const startView = () => focusIntro(el, '集中してね！', `スタートを押すと${LIM}秒のカウントが始まります。<br>パッと座りたい席をタップしてください。`, play);
    const play = () => {
      el.style.position = 'relative';
      el.innerHTML = `<div class="timer"><div id="tb"></div></div>${cabin()}<div class="seatread" id="sread">空いている席をタップ！</div><button class="btn ghost sm anybtn" data-any="1">どこでもいい</button><div class="count" id="cnt"></div>`;
      const tb = el.querySelector('#tb'); if (tb.animate) tb.animate([{ width: '100%' }, { width: '0%' }], { duration: LIM * 1000, fill: 'forwards' });
      const fin = v => { clearRun(); if (v === 'time') cutin('TIME UP', 'SEAT SCAN'); setAns(q, v === 'time' ? 0 : v === 'any' ? -1 : calc(v.r, v.c), v); doneView(); };
      el.querySelectorAll('.cs:not(.taken)').forEach(b => b.onclick = () => { if (ans[q.id]) return; const r = +b.dataset.r, c = b.dataset.c; b.classList.add('sel'); el.querySelector('#sread').textContent = desc(r, c); clearRun(); timers.push(setTimeout(() => fin({ r, c }), 350)); });
      el.querySelector('[data-any]').onclick = () => fin('any');
      for (let k = 3; k >= 1; k--) timers.push(setTimeout(() => { const n = el.querySelector('#cnt'); if (!n) return; n.textContent = k; n.classList.remove('go'); void n.offsetWidth; n.classList.add('go'); tone(660 + (3 - k) * 220, .15, 'square', .08); }, (LIM - k) * 1000));
      timers.push(setTimeout(() => { if (!ans[q.id]) fin('time'); }, LIM * 1000));
    };
    ans[q.id] ? doneView() : startView();
  },

  swipe(q, el) {
    const SEC = 5;
    const cards = [{ t: '来月の連休、分刻みでおいしい店と観光地を巡る完璧な旅のしおり作ったよ！', p: 1, e: '🗺️', bg: '#FFF1D6' }, { t: '今日の夜、急に予定空いたからノープランでドライブ行かない？', p: -1, e: '🚗', bg: '#E3F1FB' }, { t: '気になってたお店、1ヶ月前から予約してコースも全部決めておいたよ！', p: 1, e: '🍽️', bg: '#FCE6EC' }];
    const doneView = () => {
      const r = ans[q.id].raw;
      el.innerHTML = `<div class="done">${r.map((v, i) => `カード${i + 1}：${v === 1 ? 'アリ！' : v === -1 ? 'イマイチ' : '時間切れ'}`).join('<br>')}</div><div class="center" style="margin-top:10px"><button class="linkbtn">もう一度やる</button></div>`;
      el.querySelector('.linkbtn').onclick = () => { unset(q); startView(); };
    };
    const startView = () => focusIntro(el, '集中してね！', `カードが3枚、1枚${SEC}秒ずつ出てきます。<br>右（アリ）か左（イマイチ）に、直感でスワイプしてください。`, () => play(0, []));
    const play = (i, res) => {
      if (i >= cards.length) { clearRun(); setAns(q, res.reduce((a, v, k) => a + v * cards[k].p, 0), res); doneView(); return; }
      const cd = cards[i];
      el.innerHTML = `<div class="timer"><div id="tb"></div></div><div class="swipearea"><div class="scard"><div class="pic" style="background:${cd.bg}">${cd.e}</div><p></p><span class="mono" style="font-size:11px;color:var(--sub)">${i + 1} / 3</span></div></div><div class="swbtns"><button class="no">← イマイチ</button><button class="yes">アリ！ →</button></div>`;
      el.querySelector('.scard p').textContent = cd.t;
      const tb = el.querySelector('#tb'); if (tb.animate) tb.animate([{ width: '100%' }, { width: '0%' }], { duration: SEC * 1000, fill: 'forwards' });
      let decided = false; const card = el.querySelector('.scard');
      const decide = v => { if (decided) return; decided = true; clearRun(); if (v) { SND.pop(1); } card.style.transform = `translateX(${v * 420}px) rotate(${v * 20}deg)`; timers.push(setTimeout(() => play(i + 1, [...res, v]), v ? 260 : 0)); };
      el.querySelector('.no').onclick = () => decide(-1); el.querySelector('.yes').onclick = () => decide(1);
      let sx = null;
      card.onpointerdown = e => { sx = e.clientX; card.style.transition = 'none'; card.setPointerCapture(e.pointerId); };
      card.onpointermove = e => { if (sx === null) return; const dx = e.clientX - sx; card.style.transform = `translateX(${dx}px) rotate(${dx / 15}deg)`; };
      card.onpointerup = e => { if (sx === null) return; const dx = e.clientX - sx; sx = null; card.style.transition = ''; if (Math.abs(dx) > 80) decide(dx > 0 ? 1 : -1); else card.style.transform = ''; };
      timers.push(setTimeout(() => decide(0), SEC * 1000));
    };
    ans[q.id] ? doneView() : startView();
  }
};

/* ================= 進行 ================= */
function go(d) {
  const n = idx + d; if (n < 0) return;
  if (n >= Q.length) { finish(); return; }
  idx = n; render();
  if (d > 0) {
    const q = Q[n], L = Q.length;
    const ms = { [Math.round(L * .25)]: ['25% CLEAR', 'PROGRESS'], [Math.round(L * .5)]: ['HALF WAY', 'PROGRESS 50%'], [Math.round(L * .75)]: ['75% CLEAR', 'PROGRESS'], [L - 3]: ['LAST 3', 'FINAL SCAN'] };
    if (q.special && !ans[q.id]) cutin('SPECIAL STAGE', '◆ ' + q.special);
    else if (ms[n]) cutin(ms[n][0], ms[n][1]);
  }
}
$('#nextBtn').onclick = () => go(1);
$('#backBtn').onclick = () => go(-1);
$('#startBtn').onclick = () => { if (current === 's-quiz') return; resetQuiz(); show('s-quiz'); };
$('#retryBtn').onclick = () => { resetQuiz(); show('s-quiz'); };

/* ================= 採点 ================= */
function calc(A) {
  return Object.entries(AXES).map(([k, a]) => {
    const qs = Q.filter(q => q.axis === k);
    const sum = r1(qs.reduce((s, q) => s + (A[q.id] ? A[q.id].score : 0), 0));
    const max = qs.length * 3;
    let letter = sum > 0 ? a.pos : sum < 0 ? a.neg : null, tie = false;
    if (!letter) { tie = true; const t = A[a.tie]; letter = t && t.score < 0 ? a.neg : a.pos; }
    return { k, a, sum, max, pct: Math.round(50 + 50 * sum / max), letter, tie, n: qs.length };
  });
}
function finish() {
  clearRun(); $('#combo').classList.remove('on');
  const r = calc(ans), code = r.map(x => x.letter).join('');
  recordStat(code, r);
  reveal(code, () => showResult(code, r));
}

/* ================= 結果発表 ================= */
function reveal(code, done) {
  const rv = $('#reveal'), sl = $('#rvSlots'), msg = $('#rvMsg'), nm = $('#rvName');
  const t = TYPES[code], g = GROUPS[t.group];
  rv.classList.add('show'); msg.textContent = 'SCANNING YOUR ROLE...'; nm.classList.remove('on'); nm.textContent = '';
  if (RM) { setTimeout(() => { rv.classList.remove('show'); done(); }, 600); return; }
  SND.scan();
  sl.innerHTML = [0, 1, 2, 3].map(() => '<div class="sl4">?</div>').join('');
  const boxes = [...sl.children], pool = 'ESTJINFP';
  const spin = setInterval(() => { boxes.forEach(b => { if (!b.classList.contains('lock')) b.textContent = pool[Math.random() * 8 | 0]; }); SND.tick(); }, 60);
  const lockColors = [AXES.EI.color, AXES.SN.color, AXES.TF.color, AXES.JP.color];
  [...code].forEach((ch, i) => setTimeout(() => {
    const b = boxes[i]; b.style.setProperty('--lc', i === 3 ? g.color : lockColors[i]); b.classList.add('lock'); b.textContent = ch;
    SND.slam(); shake(rv);
    const fw = $('#rvFlash'); fw.classList.remove('go'); void fw.offsetWidth; fw.classList.add('go');
    const bb = b.getBoundingClientRect(); burst(bb.left + bb.width / 2, bb.top + bb.height / 2, 30, 10);
    if (i === 3) {
      clearInterval(spin);
      boxes.forEach(x => x.style.setProperty('--lc', g.color));
      msg.textContent = 'ROLE IDENTIFIED';
      setTimeout(() => { SND.fanfare(); rain(200, [g.color, '#FFFFFF', '#3BD1FF', '#FFD23F']); nm.textContent = `${t.name}タイプ`; nm.classList.add('on'); setTimeout(() => { rv.classList.remove('show'); done(); }, 1500); }, 450);
    }
  }, 1300 + i * 700));
}

/* 画像（フォールバック付き） */
function imgHTML(code, cls = '') {
  const t = TYPES[code];
  return `<img class="${cls}" src="${t.img}" alt="${t.name}タイプのキャラクター" loading="lazy" onerror="this.outerHTML='<div class=&quot;imgfb&quot;>${code}<small>${t.name}タイプ</small></div>'">`;
}

function detailCards(code, inModal) {
  const t = TYPES[code];
  const partner = c => { const p = TYPES[c], gc = GROUPS[p.group].color; return `<button class="pbtn" data-type="${c}" style="--pc:${gc}"><img src="${p.img}" alt="" onerror="this.outerHTML='<span class=&quot;mini&quot;>${c}</span>'"><span><small>${c}</small>${p.name}タイプ</span></button>`; };
  return `
    <div class="glass dcard wide"><h3><span class="mono">CHARACTER</span>性格・働き方の特徴</h3><p>${t.feature}</p></div>
    <div class="glass dcard"><h3><span class="mono">STRENGTH</span>強み</h3><p>${t.strengths}</p></div>
    <div class="glass dcard"><h3><span class="mono">WATCH OUT</span>弱み（気をつけたいところ）</h3><p>${t.weaknesses}</p></div>
    <div class="glass dcard wide"><h3><span class="mono">CAREER HINT</span>就活のヒント</h3><dl><dt>向いていそうな職種の例</dt><dd>${t.jobs}</dd><dt>自己PRの切り口</dt><dd>「${t.pr}」を具体的なエピソードで話してみよう</dd></dl></div>
    <div class="glass dcard"><h3><span class="mono">PARTNER</span>補い合えるタイプ</h3><div class="partners">${t.partners.map(partner).join('')}</div>${inModal ? '' : '<p style="font-size:12px;color:var(--sub);margin-top:8px">タップすると詳しく見られます</p>'}</div>
    <div class="glass dcard"><h3><span class="mono">DESIGN</span>キャラクター造形の秘密</h3><p>${t.look}</p></div>`;
}

function showResult(code, r, isPreview) {
  const t = TYPES[code], g = GROUPS[t.group];
  lastResult = code;
  const sec = $('#s-result'); sec.dataset.group = t.group;
  $('#rGroup').textContent = `${t.group} GROUP // ${g.label}`;
  $('#rCode').textContent = code;
  const ri = $('#rImg').parentNode; ri.innerHTML = imgHTML(code) + '<span class="ring" aria-hidden="true"></span>';
  $('#rYomi').textContent = t.yomi;
  $('#rName').textContent = `${t.name}タイプ`;
  $('#rCatch').textContent = t.catch;
  $('#rBars').innerHTML = '<h3 style="margin:0 0 4px;font-size:15px">4つの軸のバランス</h3>' + r.map(x => {
    const pos = x.letter === x.a.pos, p = pos ? x.pct : 100 - x.pct;
    const near = p <= 55;
    return `<div class="bar"><div class="t"><span style="color:${pos ? x.a.color : 'var(--sub)'}">${x.a.pn}（${x.a.pos}）</span><span class="mid">${x.a.label}</span><span style="color:${pos ? 'var(--sub)' : x.a.color}">${x.a.nn}（${x.a.neg}）</span></div><div class="track"><div class="fill" style="background:${x.a.color};color:${x.a.color};${pos ? 'left:0' : 'right:0'};width:0"></div></div><div class="pct">${pos ? x.a.pn : x.a.nn} <b>${p}%</b>${x.tie ? '（同点のため、この軸の1問目の答えで判定）' : near ? '　<span class="note">→ どちらの面もあるタイプ</span>' : ''}</div></div>`;
  }).join('');
  setTimeout(() => $$('#rBars .fill').forEach((f, i) => { const x = r[i]; f.style.width = (x.letter === x.a.pos ? x.pct : 100 - x.pct) + '%'; }), 80);
  $('#rDetail').innerHTML = detailCards(code);
  $('#devtable').innerHTML = '<tr><th>軸</th><th>問題数</th><th>合計点</th><th>満点</th><th>＋側の割合</th><th>判定</th></tr>' + r.map(x => `<tr><td>${x.k}</td><td>${x.n}</td><td>${x.sum}</td><td>±${x.max}</td><td>${x.pct}%</td><td>${x.letter}${x.tie ? '（同点）' : ''}</td></tr>`).join('') + (isPreview ? '<tr><td colspan="6">※開発用プレビュー（集計には含めていません）</td></tr>' : '');
  $('#pbar').style.width = '100%';
  show('s-result');
}

/* ================= モーダル ================= */
function openType(code) {
  const t = TYPES[code], g = GROUPS[t.group], m = $('#typeModal');
  m.dataset.group = t.group;
  $('#modalBody').innerHTML = `<div class="m-head"><div class="m-img">${imgHTML(code)}</div><div><span class="gbadge">${t.group} GROUP // ${g.label}</span><div class="rcode mono">${code}</div><div class="r-yomi">${t.yomi}</div><div class="r-name">${t.name}タイプ</div><p class="r-catch">${t.catch}</p></div></div><div class="dgrid">${detailCards(code, true)}</div>`;
  m.classList.add('show'); m.setAttribute('aria-hidden', 'false'); m.querySelector('.modal-box').scrollTop = 0;
  SND.swoosh();
}
function closeModal() { const m = $('#typeModal'); m.classList.remove('show'); m.setAttribute('aria-hidden', 'true'); }
$('#typeModal').addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); $('#confirmModal').classList.remove('show'); } });
document.addEventListener('click', e => { const b = e.target.closest('[data-type]'); if (b) openType(b.dataset.type); });

/* ================= 図鑑 ================= */
function renderDex(f = 'ALL') {
  $('#dexGrid').innerHTML = TYPE_ORDER.filter(c => f === 'ALL' || TYPES[c].group === f).map(c => {
    const t = TYPES[c], gc = GROUPS[t.group].color;
    return `<button class="glass dcell" data-type="${c}" style="--gc:${gc}"><div class="dimg">${imgHTML(c)}</div><div class="code">${c}</div><div class="nm">${t.name}タイプ</div><div class="cp">${t.catch}</div></button>`;
  }).join('');
}
$('#dexFilter').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $$('#dexFilter button').forEach(x => x.classList.toggle('on', x === b)); renderDex(b.dataset.f); });

/* ================= みんなの結果（集計） ================= */
const LS_KEY = 'nr16_results';
const localRecs = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { return []; } };
function recordStat(code, r) {
  const rec = { t: new Date().toISOString(), code, ei: r[0].pct, sn: r[1].pct, tf: r[2].pct, jp: r[3].pct };
  try { const a = localRecs(); a.push(rec); localStorage.setItem(LS_KEY, JSON.stringify(a)); } catch (e) {}
  if (CONFIG.STATS_URL) { try { fetch(CONFIG.STATS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(rec) }).catch(() => {}); } catch (e) {} }
}
async function getStats() {
  if (CONFIG.STATS_URL) {
    try {
      const res = await fetch(CONFIG.STATS_URL + (CONFIG.STATS_URL.includes('?') ? '&' : '?') + 'mode=stats&_=' + Date.now());
      const j = await res.json();
      if (j && j.counts) return { shared: true, counts: j.counts, total: j.total, axes: j.axes };
    } catch (e) {}
  }
  const a = localRecs(), counts = {}; let ax = { ei: 0, sn: 0, tf: 0, jp: 0 };
  a.forEach(x => { counts[x.code] = (counts[x.code] || 0) + 1; if (x.code[0] === 'E') ax.ei++; if (x.code[1] === 'S') ax.sn++; if (x.code[2] === 'T') ax.tf++; if (x.code[3] === 'J') ax.jp++; });
  return { shared: false, counts, total: a.length, axes: ax };
}
async function renderStats() {
  $('#statsNote').textContent = '読み込み中…';
  const s = await getStats(); if (current !== 's-stats') return;
  $('#statsNote').textContent = s.shared ? 'これまでに診断したみんなの結果を、リアルタイムで集計しています。' : 'この端末で診断した結果を集計しています（全体集計の設定は gas/README.md 参照）。';
  const total = s.total || 0;
  const pc = n => total ? Math.round(n / total * 1000) / 10 : 0;
  const grp = { NT: 0, NF: 0, SJ: 0, SP: 0 }; TYPE_ORDER.forEach(c => grp[TYPES[c].group] += s.counts[c] || 0);
  const top = TYPE_ORDER.slice().sort((a, b) => (s.counts[b] || 0) - (s.counts[a] || 0))[0];
  $('#statSum').innerHTML = `<div><b>${total}</b><span>診断した人数</span></div><div><b>${total ? top : '—'}</b><span>いちばん多いタイプ</span></div>${lastResult ? `<div><b>${lastResult}</b><span>あなたのタイプ（${pc(s.counts[lastResult] || 0)}%）</span></div>` : ''}`;
  if (!total) { ['#statTypes', '#statGroups', '#statAxes'].forEach(id => $(id).innerHTML = '<div class="empty-s">まだデータがありません。診断するとここに表示されます。</div>'); return; }
  const sorted = TYPE_ORDER.slice().sort((a, b) => (s.counts[b] || 0) - (s.counts[a] || 0));
  $('#statTypes').innerHTML = sorted.map(c => { const t = TYPES[c], gc = GROUPS[t.group].color, p = pc(s.counts[c] || 0); return `<div class="srank ${c === lastResult ? 'mine' : ''}" style="--gc:${gc}"><img src="${t.img}" alt="" onerror="this.outerHTML='<span class=&quot;mini&quot;></span>'"><div><div class="nm"><span>${t.name}タイプ${c === lastResult ? '（あなた）' : ''}</span><span class="mono">${c}</span></div><div class="tr"><i data-w="${total ? (s.counts[c] || 0) / Math.max(...Object.values(s.counts)) * 100 : 0}"></i></div></div><div class="pc">${p}%</div></div>`; }).join('');
  $('#statGroups').innerHTML = `<div class="gbar">${Object.keys(grp).map(k => `<div style="flex:${grp[k] || 0.0001};background:${GROUPS[k].color}">${grp[k] ? k + ' ' + pc(grp[k]) + '%' : ''}</div>`).join('')}</div><div class="glegend">${Object.keys(grp).map(k => `<span><i style="background:${GROUPS[k].color}"></i>${k}：${GROUPS[k].label}（${grp[k]}人）</span>`).join('')}</div>`;
  const axv = { EI: s.axes.ei, SN: s.axes.sn, TF: s.axes.tf, JP: s.axes.jp };
  $('#statAxes').innerHTML = Object.entries(AXES).map(([k, a]) => { const p = pc(axv[k]); return `<div class="bar"><div class="t"><span style="color:${a.color}">${a.pn}（${a.pos}） ${p}%</span><span class="mid">${a.label}</span><span>${a.nn}（${a.neg}） ${Math.round((100 - p) * 10) / 10}%</span></div><div class="track"><div class="fill" style="background:${a.color};color:${a.color};left:0;width:0" data-w="${p}"></div></div></div>`; }).join('');
  setTimeout(() => { $$('#statTypes .tr i').forEach(i => i.style.width = i.dataset.w + '%'); $$('#statAxes .fill').forEach(f => f.style.width = f.dataset.w + '%'); }, 60);
}
$('#devCsv').onclick = () => {
  const a = localRecs(); if (!a.length) { toast('記録がありません'); return; }
  const csv = 'time,code,EI(E%),SN(S%),TF(T%),JP(J%)\n' + a.map(x => [x.t, x.code, x.ei, x.sn, x.tf, x.jp].join(',')).join('\n');
  const u = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); const l = document.createElement('a'); l.href = u; l.download = 'nextrole16_results.csv'; l.click(); URL.revokeObjectURL(u);
};
$('#devClear').onclick = () => { try { localStorage.removeItem(LS_KEY); } catch (e) {} renderStats(); toast('この端末の記録を消去しました'); };

/* ================= トップ・開発用 ================= */
$('#axesIntro').innerHTML = Object.entries(AXES).map(([k, a]) => `<div class="glass axcard" style="border-top-color:${a.color}"><span class="ax-l" style="color:${a.color}">${a.pos} / ${a.neg}</span><b>${a.label}</b><p>${a.pn}（${a.pos}）⇔ ${a.nn}（${a.neg}）<br>${a.desc}</p></div>`).join('');
$('#devType').innerHTML = TYPE_ORDER.map(c => `<option value="${c}">${c}｜${TYPES[c].name}タイプ（${TYPES[c].group}）</option>`).join('');
$('#devRandom').onclick = () => { resetQuiz(); Q.forEach(q => { ans[q.id] = { score: Math.floor(Math.random() * 7) - 3, raw: null }; }); current = 's-quiz'; finish(); };
$('#devPreview').onclick = () => {
  const code = $('#devType').value;
  const fake = Object.entries(AXES).map(([k, a], i) => { const posSide = code[i] === a.pos, pct = posSide ? 68 : 32; return { k, a, sum: posSide ? 10 : -10, max: Q.filter(q => q.axis === k).length * 3, pct, letter: code[i], tie: false, n: Q.filter(q => q.axis === k).length }; });
  reveal(code, () => showResult(code, fake, true));
};

renderDex();
})();
