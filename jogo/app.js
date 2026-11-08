(() => {
'use strict';
/* ============================== util ============================== */
const $ = s => document.querySelector(s);
const P = { ink:'#0d0b1a', night:'#1b1838', dusk:'#2e2a5c', violet:'#4b3f8f', lav:'#7a5fd1', teal:'#2fb9c9', mint:'#8af0e6', cream:'#f4f1de',
  gold:'#ffd23f', orange:'#ff8c2e', red:'#e8435a', pink:'#ff77a8', lime:'#a6e85a', gray:'#9a96b8', dgray:'#55507a', black:'#000000' };
const COLORS = [P.orange, P.teal, P.pink, P.lime, P.gold, P.lav];
const store = {
  get(k, d){ try{ const v = localStorage.getItem('fneon_'+k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('fneon_'+k, JSON.stringify(v)); }catch(e){} }
};
function h(tag, attrs, ...kids){
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs){
    if (k === 'class') el.className = attrs[k];
    else if (k === 'style') el.style.cssText = attrs[k];
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), attrs[k]);
    else el.setAttribute(k, attrs[k]);
  }
  for (const c of kids){ if (c == null || c === false) continue; el.append(c.nodeType ? c : document.createTextNode(String(c))); }
  return el;
}
// texto que os outros jogadores veem: tira links e esconde palavrões
const BAD_WORDS = new Set(['porra','caralho','merda','puta','puto','putaria','fdp','viado','buceta','arrombado','arrombada','cuzao','foder','fodase','foda','fodido','vagabunda','vagabundo','corno','piranha','bosta','desgracado','desgracada','otario','otaria','babaca','vadia','cacete','pqp','vsf','vtnc','krl','prr']);
function publicText(s, n){
  let t = clean(s, n * 2)
    .replace(/(?:https?:\/\/|www\.)\S*/gi, '')
    .replace(/\b[\w-]+\.(?:com|net|org|br|io|xyz|me|link|app|site|online|info|ly|gg|tk|ru)(?:\/\S*)?/gi, '')
    .replace(/@\w{3,}/g, '');
  t = t.split(/(\s+)/).map(w => { const base = w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); return BAD_WORDS.has(base) ? '*'.repeat(w.length) : w; }).join('');
  return t.replace(/\s+/g, ' ').trim().slice(0, n);
}
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f]/g,'').trim().slice(0, n);
let toastT = 0;
function toast(msg, ms = 3000){ const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, ms); }
const SCREENS = ['scrTitle','scrMenu','scrHow','scrUltra','scrSolo','scrLobby','scrRound','scrFinal','scrSoloDone','scrPrize','scrPause','scrWait','scrRank','scrSettings'];
function show(id){ for (const s of SCREENS) $('#'+s).hidden = (s !== id); const stk = $('#stick'); if (stk) stk.hidden = true; if (id === 'scrMenu'){ const w = $('#scrMenu .wrap'); w.classList.remove('enter'); void w.offsetWidth; w.classList.add('enter'); } }
function fmtTime(t){ if (t == null) return '—'; const m = Math.floor(t/60), s = t - m*60; return (m ? m+':'+String(Math.floor(s)).padStart(2,'0') : Math.floor(s)) + '.' + Math.floor((s%1)*10) + 's'; }
function hexRgb(c){ const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mix(a, b, t){ const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }

/* ============================== som (chiptune) ============================== */
let AC = null, lastDot = 0;
function tone(f0, f1, dur, type, vol, delay = 0){
  const now = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, now); o.frequency.exponentialRampToValueAtTime(f1, now + dur);
  g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(g); g.connect(AC.destination); o.start(now); o.stop(now + dur + .02);
}
function sfx(kind){
  if (store.get('mute', false)) return;
  try{
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const now = AC.currentTime;
    if (kind === 'dot'){ if (now - lastDot < 0.05) return; lastDot = now; return tone(1318, 1568, .035, 'square', .02); }
    if (kind === 'thud') return tone(140, 70, .07, 'square', .05);
    if (kind === 'swish') return tone(220, 440, .05, 'square', .025);
    if (kind === 'die'){ tone(392, 98, .35, 'square', .07); return tone(196, 49, .4, 'triangle', .07, .05); }
    if (kind === 'tele'){ tone(300, 1200, .12, 'square', .04); return tone(1200, 300, .12, 'square', .03, .1); }
    if (kind === 'arrow') return tone(660, 990, .05, 'square', .03);
    if (kind === 'zap'){ tone(1800, 120, .25, 'sawtooth', .05); return tone(90, 40, .3, 'square', .05, .05); }
    if (kind === 'lock') return tone(220, 180, .12, 'square', .05);
    if (kind === 'tick') return tone(523, 523, .08, 'square', .05);
    if (kind === 'go') return tone(1046, 1046, .2, 'square', .05);
    if (kind === 'win'){ [523, 659, 784, 1046].forEach((f, i) => tone(f, f, .12, 'square', .05, i * .09)); return; }
    if (kind === 'start'){ [392, 523, 659, 784, 659, 1046].forEach((f, i) => tone(f, f, .1, 'square', .045, i * .07)); return; }
    if (kind === 'paint') return tone(880 + Math.random() * 300, 900, .025, 'square', .012);
  }catch(e){}
}
const buzz = ms => { if (store.get('novib', false)) return; try{ navigator.vibrate && navigator.vibrate(ms); }catch(e){} };

/* ============================== fonte de pixels 5x7 ============================== */
const GLYPH = {};
(() => {
  const src = {
    A:'01110100011000111111100011000110001', B:'11110100011000111110100011000111110', C:'01111100001000010000100001000001111',
    D:'11110100011000110001100011000111110', E:'11111100001000011110100001000011111', F:'11111100001000011110100001000010000',
    G:'01111100001000010011100011000101111', H:'10001100011000111111100011000110001', I:'11111001000010000100001000010011111',
    J:'00111000100001000010000101001001100', K:'10001100101010011000101001001010001', L:'10000100001000010000100001000011111',
    M:'10001110111010110101100011000110001', N:'10001110011010110011100011000110001', O:'01110100011000110001100011000101110',
    P:'11110100011000111110100001000010000', Q:'01110100011000110001101011001001101', R:'11110100011000111110101001001010001',
    S:'01111100001000001110000010000111110', T:'11111001000010000100001000010000100', U:'10001100011000110001100011000101110',
    V:'10001100011000110001100010101000100', W:'10001100011000110101101011010101010', X:'10001100010101000100010101000110001',
    Y:'10001100010101000100001000010000100', Z:'11111000010001000100010001000011111',
    0:'01110100011001110101110011000101110', 1:'00100011000010000100001000010001110', 2:'01110100010000100010001000100011111',
    3:'11110000010000101110000010000111110', 4:'00010001100101010010111110001000010', 5:'11111100001111000001000011000101110',
    6:'00110010001000011110100011000101110', 7:'11111000010001000100010000100001000', 8:'01110100011000101110100011000101110',
    9:'01110100011000101111000010001001100', '.':'00000000000000000000000000110001100', ':':'00000011000110000000011000110000000',
    '/':'00001000100001000100010000100010000', '!':'00100001000010000100001000000000100', '?':'01110100010000100010001000000000100',
    '-':'00000000000000011111000000000000000', '+':'00000001000010011111001000010000000', 'º':'01100100100110000000111100000000000',
    '•':'00000000000111001110011100000000000', '%':'11001110100001000100010000101110011', ' ':'00000000000000000000000000000000000',
  };
  for (const k in src) GLYPH[k] = src[k];
})();
const shortName = n => { n = String(n); return /^jogador\s*\d+$/i.test(n) ? 'J' + n.replace(/\D/g, '') : n.slice(0, 8); };
const normTxt = s => String(s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function textW(s, sc = 1){ return normTxt(s).length * 6 * sc - sc; }
function drawText(g, s, x, y, color, sc = 1, align = 'left', shadow = P.black){
  s = normTxt(s);
  if (align === 'center') x = Math.round(x - textW(s, sc) / 2); else if (align === 'right') x = Math.round(x - textW(s, sc));
  for (const pass of shadow ? [0, 1] : [1]){
    g.fillStyle = pass ? color : shadow; const o = pass ? 0 : sc;
    for (let i = 0; i < s.length; i++){
      const gl = GLYPH[s[i]] || GLYPH['?'];
      for (let p = 0; p < 35; p++) if (gl[p] === '1') g.fillRect(x + i * 6 * sc + (p % 5) * sc + o, y + Math.floor(p / 5) * sc + o, sc, sc);
    }
  }
}

/* ============================== sprites ============================== */
const sprCache = new Map();
function sprite(key, rows, map){
  let c = sprCache.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++){ const col = map[row[x]]; if (col){ g.fillStyle = col; g.fillRect(x, y, 1, 1); } } });
  sprCache.set(key, c); return c;
}
function rot(rows, times){ let r = rows; for (let i = 0; i < times; i++){ const n = r.length; r = Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => r[n - 1 - x][y]).join('')); } return r; }
// o bonequinho: olhos olham para onde ele vai
function playerSpr(color, face, ghost){
  const key = 'pl' + color + face + (ghost ? 'g' : '');
  if (sprCache.has(key)) return sprCache.get(key);
  const R = ['.bbbbbb.', 'bhhbbbbb', 'bhbbbbbb', 'bbbbbbbb', 'bbbbbbbb', 'bbbbbbbb', 'bsbbbbsb', '.ssssss.'].map(r => r.split(''));
  for (const ex of [1, 5]) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++){
    const pupil = face === 0 ? dy === 0 : face === 2 ? dy === 1 : face === 3 ? dx === 0 : dx === 1;
    R[3 + dy][ex + dx] = pupil ? 'p' : 'w';
  }
  if (ghost) for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) R[y][x] = '.';
  return sprite(key, R.map(r => r.join('')), { b: color, h: mix(color, '#ffffff', .45), s: mix(color, '#000000', .4), w: P.cream, p: P.ink });
}
const SPR = {
  spikes: () => sprite('spk', ['........', '..w...w.', '..w...w.', '.wgw.wgw', '.wgw.wgw', 'wgggwggg', 'rrrrrrrr', '.dddddd.'], { w: P.cream, g: P.gray, r: P.red, d: '#6b1a28' }),
  rsDown: () => sprite('rs0', ['........', '........', '........', '........', '........', '.o..o..o', 'rrrrrrrr', '.dddddd.'], { o: P.black, r: P.dgray, d: '#2a2640' }),
  rsWarn: () => sprite('rs1', ['........', '........', '........', '........', '.w..w..w', '.g..g..g', 'rrrrrrrr', '.dddddd.'], { w: P.cream, g: P.gray, r: P.dgray, d: '#2a2640' }),
  rsUp: () => sprite('rs2', ['.w..w..w', '.w..w..w', 'wgwwgwwg', 'wgwwgwwg', '.g..g..g', '.g..g..g', 'rrrrrrrr', '.dddddd.'], { w: P.cream, g: P.gray, r: P.red, d: '#6b1a28' }),
  crusher: () => sprite('cru', ['kkkkkkkk', 'kyykyykk', 'kykyykyk', 'kkyykyyk', 'kykkyyky', 'kyykyyky', 'kkyykyyk', 'kkkkkkkk'], { k: '#1a1408', y: P.gold }),
  door: f => sprite('door' + f, ['..gggg..', '.gGGGGg.', 'gGllllGg', 'gGl' + (f ? 'w' : 'l') + 'lllGg', 'gGllllGg', 'gGll' + (f ? 'l' : 'w') + 'lGg', 'gGllllGg', 'gggggggg'],
    { g: '#a86b00', G: P.gold, l: f ? '#fff3b0' : '#ffe36e', w: '#ffffff' }),
  arrow: (d, f) => sprite('ar' + d + f, rot(['........', '...yy...', '..yyyy..', '.yyyyyy.', '...yy...', '...yy...', '...yy...', '........'], d), { y: f ? P.gold : '#a86b00' }),
  tele: (pair, f) => {
    const C = [[P.lav, P.mint], [P.lime, P.cream], [P.pink, P.gold]][pair % 3];
    const ring = ['..cccc..', '.c....c.', 'c......c', 'c......c', 'c......c', 'c......c', '.c....c.', '..cccc..'].map(r => r.split(''));
    const core = f % 2 ? ['...pp...', '..p..p..', '..p..p..', '...pp...'] : ['..pppp..', '..p..p..', '..p..p..', '..pppp..'];
    core.forEach((r, i) => { for (let x = 0; x < 8; x++) if (r[x] === 'p') ring[2 + i][x] = 'p'; });
    const sp = [[2, 0], [7, 2], [5, 7], [0, 5]][f % 4]; ring[sp[1]][sp[0]] = 'w';
    return sprite('tp' + pair + f, ring.map(r => r.join('')), { c: C[0], p: C[1], w: '#ffffff' });
  },
  hand: () => sprite('hand', ['....kk.....', '...kwwk....', '...kwwk....', '...kwwkkkk.', '.kkkwwkwwkk', 'kwwkwwwwwwk', 'kwwwwwwwwwk', '.kwwwwwwwwk',
    '..kwwwwwwk.', '..kwwwwwwk.', '...kkkkkk..'], { k: P.ink, w: P.cream }),
  bomb: st => sprite('bomb' + st, ['.....ff.', '....k...', '..kkkk..', '.kbbbbk.', '.kwbbbk.', '.kbbbbk.', '..kkkk..', '........'],
    { k: P.black, b: st === 1 ? P.red : '#7b74a6', w: st === 1 ? '#ffd1d6' : P.cream, f: st === 1 ? '#ffffff' : P.orange }),
  ghost: f => sprite('gh' + f, ['..wwww..', '.wwwwww.', 'wwkwwkww', 'wwkwwkww', 'wwwwwwww', 'wwwwwwww', f ? 'ww.ww.ww' : 'w.ww.ww.', f ? 'w..w..w.' : '.w..w..w'],
    { w: '#e4dcff', k: P.ink }),
  glue: () => sprite('glue', ['........', '........', '..gggg..', '.gGggGg.', 'gggggggg', '.gggggg.', '..g..g..', '........'], { g: '#5ac24b', G: '#c8ff9a' }),
  mud: f => sprite('mud' + f, ['........', '........', '.mmmmmm.', 'mm' + (f ? 'M' : 'm') + 'mmmmm', 'mmmmm' + (f ? 'm' : 'M') + 'mm', '.mmmmmm.', '........', '........'], { m: '#5a3a1e', M: '#a07a48' }),
  conf: f => sprite('cf' + f, ['.pppppp.', 'pp.qq.pp', 'p.q..q.p', 'p....q.p', 'p...q..p', 'p......p', 'pp.q..pp', '.pppppp.'], { p: f ? '#7a5fd1' : '#9b84ff', q: P.pink }),
  nozzle: () => sprite('noz', ['........', '.kkkkkk.', '.kggggk.', '.kgoogk.', '.kgoogk.', '.kggggk.', '.kkkkkk.', '........'], { k: P.black, g: P.dgray, o: P.orange }),
  pause: () => sprite('ps', ['.......', '.kk.kk.', '.kk.kk.', '.kk.kk.', '.kk.kk.', '.kk.kk.', '.......'], { k: P.cream }),
  restart: () => sprite('rst', ['..kkk..', '.k...kk', 'k....kk', 'k......', 'k.....k', '.k...k.', '..kkk..'], { k: P.cream }),
};

/* ============================== gerador de labirintos ============================== */
function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(a, R){ for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const WALL = 1;
const DIRS = [[0,-1],[1,0],[0,1],[-1,0]]; // cima, direita, baixo, esquerda
const WORLDS = [
  { name:'Porão',              wall:'#8b4a2b', hi:'#d08a4a', lo:'#4a2414', floor:'#120c0e', speck:'#2b1a17', news:'Espinhos e setas' },
  { name:'Esgoto',             wall:'#2f7a6a', hi:'#6fd6b0', lo:'#143a33', floor:'#08120f', speck:'#15302a', news:'Lasers e portais' },
  { name:'Caverna de Cristal', wall:'#4b3f8f', hi:'#8af0e6', lo:'#221c4a', floor:'#0d0b1a', speck:'#252047', news:'Espinhos que sobem e esmagadores' },
  { name:'Fornalha',           wall:'#a3322b', hi:'#ff9a3e', lo:'#4d1412', floor:'#150808', speck:'#351311', news:'A maré de plasma sobe atrás de você' },
  { name:'Torre de Gelo',      wall:'#3a6ad6', hi:'#d6ecff', lo:'#1b2f6e', floor:'#090e1e', speck:'#1c2a4c', news:'Bombas, e tudo junto mais rápido' },
  { name:'Mansão Assombrada',  wall:'#3b3550', hi:'#b7a6ff', lo:'#1a1626', floor:'#07060c', speck:'#18142a', news:'Vento assombrado e o fantasma caçador' },
  { name:'Pântano',            wall:'#4f6b2a', hi:'#a8d45a', lo:'#24331a', floor:'#0b110a', speck:'#1c2a14', news:'Lama que te deixa lento e cola que te prende' },
  { name:'Fábrica',            wall:'#62606f', hi:'#d0d0dc', lo:'#2c2b36', floor:'#0e0e12', speck:'#202028', news:'Lança-chamas' },
  { name:'Laboratório',        wall:'#8f88b0', hi:'#ffffff', lo:'#4a4468', floor:'#13111d', speck:'#24203a', news:'Poção da confusão: os controles invertem' },
  { name:'Tempestade',         wall:'#3c4a6e', hi:'#ffe066', lo:'#1a2238', floor:'#080a14', speck:'#1a2036', news:'Raios, o fantasma volta e tudo junto' },
];
const worldIdx = idx => Math.floor((idx - 1) / 10) % WORLDS.length;

// desliza a partir de pos na direção d até bater numa parede (setas mudam a direção, portais teletransportam e param)
function slide(L, pos, d, deadly){
  const w = L.w, h = L.h; let x = pos % w, y = (pos / w) | 0; const path = [], steps = []; let guard = 0;
  for(;;){
    if (++guard > 800) return { end: y * w + x, path, steps, loop: true };
    const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) break;
    const n = ny * w + nx;
    if (L.grid[n] === WALL) break;
    x = nx; y = ny; path.push(n); steps.push({ t: n, d });
    if (deadly && L.spikes[n]) return { end: n, path, steps, dead: true };
    if (n === L.exit) return { end: n, path, steps, exit: true };
    const tp = L.tele[n];
    // portal: leva para o outro portal e para em cima dele
    if (tp >= 0){ x = tp % w; y = (tp / w) | 0; path.push(tp); steps.push({ t: tp, d, tp: true }); break; }
    const ar = L.arrow[n]; if (ar) d = ar - 1;
    if (L.glue[n]) break;
  }
  return { end: y * w + x, path, steps };
}
// explora todas as posições de parada alcançáveis
// exitStops: a porta (trancada no modo sozinho) é um lugar onde se para e de onde se sai de novo
function analyze(L, deadly, exitStops = true){
  const seen = new Map([[L.start, 0]]), q = [L.start], edges = new Map(), trav = new Map(), axis = new Map(), exitFrom = []; let loops = 0;
  for (let qi = 0; qi < q.length; qi++){
    const s = q[qi], dep = seen.get(s), out = [];
    for (let d = 0; d < 4; d++){
      const r = slide(L, s, d, deadly);
      if (r.loop){ loops++; continue; }
      if (!r.path.length || r.dead) continue;
      for (const st of r.steps){ if (!trav.has(st.t)) trav.set(st.t, dep + 1); axis.set(st.t, (axis.get(st.t) || 0) | (st.d % 2 ? 1 : 2)); }
      if (r.exit){ exitFrom.push(s); if (!exitStops) continue; }
      out.push(r.end);
      if (!seen.has(r.end)){ seen.set(r.end, dep + 1); q.push(r.end); }
    }
    edges.set(s, out);
  }
  return { seen, edges, trav, axis, exitFrom, loops };
}
// verdadeiro se de qualquer posição alcançável ainda dá pra chegar na saída (ninguém fica preso)
function noTraps(an){
  if (!an.exitFrom.length) return false;
  const rev = new Map();
  for (const [s, outs] of an.edges) for (const o of outs){ if (!rev.has(o)) rev.set(o, []); rev.get(o).push(s); }
  const good = new Set(an.exitFrom), q = [...an.exitFrom];
  while (q.length){ const s = q.pop(); for (const p of (rev.get(s) || [])) if (!good.has(p)){ good.add(p); q.push(p); } }
  return good.size === an.seen.size;
}
// posições de onde NÃO dá para voltar ao início
function unlinked(an){
  const rev = new Map();
  for (const [s, outs] of an.edges) for (const o of outs){ if (!rev.has(o)) rev.set(o, []); rev.get(o).push(s); }
  const start = an.seen.keys().next().value, ok = new Set([start]), q = [start];
  while (q.length){ const s = q.pop(); for (const p of (rev.get(s) || [])) if (!ok.has(p)){ ok.add(p); q.push(p); } }
  return [...an.seen.keys()].filter(s => !ok.has(s));
}
// verdadeiro se de qualquer posição alcançável dá para voltar ao início (e, portanto, a qualquer outra posição)
function allLinked(an){
  const rev = new Map();
  for (const [s, outs] of an.edges) for (const o of outs){ if (!rev.has(o)) rev.set(o, []); rev.get(o).push(s); }
  const start = an.seen.keys().next().value, ok = new Set([start]), q = [start];
  while (q.length){ const s = q.pop(); for (const p of (rev.get(s) || [])) if (!ok.has(p)){ ok.add(p); q.push(p); } }
  return ok.size === an.seen.size;
}
const solid = an => noTraps(an) && allLinked(an);
const genCache = new Map();
function genLevel(idx, seed){
  const key = idx + ':' + seed;
  if (genCache.has(key)) return genCache.get(key);
  let fallback = null;
  for (let attempt = 0; attempt < 80; attempt++){
    const R = rng((seed * 7919 + attempt * 104729 + idx * 31) >>> 0);
    const cw = Math.min(6 + Math.floor(idx / 4), 12), ch = Math.min(10 + Math.floor(idx * 0.9), 36);
    const w = cw * 2 + 1, h = ch * 2 + 1;
    const grid = new Uint8Array(w * h).fill(WALL);
    // labirinto perfeito (backtracker)
    const vis = new Uint8Array(cw * ch), sx = Math.floor(cw / 2), st = [[sx, ch - 1]];
    vis[(ch - 1) * cw + sx] = 1; grid[(2 * (ch - 1) + 1) * w + 2 * sx + 1] = 0;
    while (st.length){
      const [cx, cy] = st[st.length - 1], nb = [];
      for (const [dx, dy] of DIRS){ const nx = cx + dx, ny = cy + dy; if (nx >= 0 && ny >= 0 && nx < cw && ny < ch && !vis[ny * cw + nx]) nb.push([nx, ny, dx, dy]); }
      if (!nb.length){ st.pop(); continue; }
      const [nx, ny, dx, dy] = nb[Math.floor(R() * nb.length)];
      vis[ny * cw + nx] = 1; grid[(2 * cy + 1 + dy) * w + 2 * cx + 1 + dx] = 0; grid[(2 * ny + 1) * w + 2 * nx + 1] = 0; st.push([nx, ny]);
    }
    // mais caminhos: abre passagens (cria voltas para se perder) e algumas salas
    const braid = 0.12 + R() * 0.08 + Math.min(idx, 50) * 0.0015;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++){
      if (grid[y * w + x] !== WALL) continue;
      if (((x % 2 === 0 && y % 2 === 1) || (x % 2 === 1 && y % 2 === 0)) && R() < braid) grid[y * w + x] = 0;
    }
    const rooms = 1 + Math.floor(R() * 3) + Math.floor(idx / 15);
    for (let r = 0; r < rooms; r++){
      const rx = 1 + 2 * Math.floor(R() * (cw - 1)), ry = 1 + 2 * Math.floor(R() * (ch - 2));
      for (let yy = ry; yy <= ry + 2; yy++) for (let xx = rx; xx <= rx + 2; xx++) grid[yy * w + xx] = 0;
    }
    const start = (h - 2) * w + 2 * sx + 1;
    const L = { idx, seed, w, h, grid, start, exit:-1, spikes:new Uint8Array(w * h), dots:new Uint8Array(w * h), arrow:new Uint8Array(w * h),
      tele:new Int32Array(w * h).fill(-1), pairs:[], lasers:[], laserAt:new Map(), rspikes:[], rsAt:new Map(), drones:[], bombs:[], ghost:null, dark:false,
      glue:new Uint8Array(w * h), mud:new Uint8Array(w * h), conf:new Uint8Array(w * h), flames:[], flameAt:new Map(), storm:null,
      theme: WORLDS[worldIdx(idx)], tideSpeed:0, tideDelay:6 };
    let an = analyze(L, false);
    // saída: entre os pontos mais altos, o mais longe do início
    let minY = 1e9; for (const t of an.trav.keys()) minY = Math.min(minY, (t / w) | 0);
    if (minY > Math.max(3, h * 0.15)) continue;
    let best = -1, bd = -1;
    for (const [t, d] of an.trav){ if (t === start || ((t / w) | 0) > minY + 2) continue; if (d > bd){ bd = d; best = t; } }
    if (best < 0) continue;
    L.exit = best;
    an = analyze(L, true);
    if (!an.exitFrom.length) continue;
    // conserto: onde não dá para voltar, abre uma passagem na parede ao lado
    for (let fix = 0; fix < 60 && !solid(an); fix++){
      const bad = unlinked(an), s0 = bad.length ? bad[Math.floor(R() * bad.length)] : [...an.seen.keys()][Math.floor(R() * an.seen.size)];
      const cx = s0 % w, cy = (s0 / w) | 0, cand = [];
      for (const [dx, dy] of DIRS){ const nx = cx + dx, ny = cy + dy, t = ny * w + nx;
        if (nx > 0 && ny > 0 && nx < w - 1 && ny < h - 1 && grid[t] === WALL && ((nx % 2) !== (ny % 2))) cand.push(t); }
      if (!cand.length) break;
      grid[cand[Math.floor(R() * cand.length)]] = 0;
      an = analyze(L, true);
      if (!an.exitFrom.length) break;
    }
    if (!an.exitFrom.length) continue;
    const clean0 = solid(an);
    if (!clean0 && attempt < 70) continue;
    // o labirinto precisa ser quase todo alcançável deslizando
    let floorN = 0; for (const v of grid) if (!v) floorN++;
    if (an.trav.size < floorN * Math.max(0.45, 0.72 - attempt * 0.004)) continue;
    if (analyze(L, true, false).trav.size < floorN * Math.max(0.42, 0.66 - attempt * 0.004)) continue; // a porta não pode esconder metade do mapa
    const base = an.trav.size;
    // cada obstáculo novo não pode fechar pedaços do labirinto (senão some o espaço para se perder)
    const valid = a => a.exitFrom.length > 0 && !a.loops && a.trav.size >= base * 0.95 && (!clean0 || solid(a));
    const special = t => t === start || t === L.exit || L.arrow[t] || L.tele[t] >= 0 || L.spikes[t] || L.glue[t];
    // setas (a partir da fase 6)
    const nAr = idx < 6 ? 0 : Math.min(1 + Math.floor((idx - 6) / 3), 8);
    let tries = 0;
    for (const t of shuffle([...an.trav.keys()], R)){
      if (L.arrow.reduce((a, b) => a + (b ? 1 : 0), 0) >= nAr || tries > 60) break;
      if (an.seen.has(t) || special(t)) continue;
      tries++;
      const tx = t % w, ty = (t / w) | 0;
      for (const d of shuffle([0, 1, 2, 3], R)){
        const nx = tx + DIRS[d][0], ny = ty + DIRS[d][1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || grid[ny * w + nx] === WALL) continue;
        L.arrow[t] = d + 1;
        const a2 = analyze(L, true);
        if (valid(a2)){ an = a2; break; }
        L.arrow[t] = 0;
      }
    }
    // cola (a partir da fase 61): para o deslize na hora
    const nGl = idx < 61 ? 0 : Math.min(2 + Math.floor((idx - 61) / 3), 8);
    tries = 0;
    for (const t of shuffle([...an.trav.keys()], R)){
      if (L.glue.reduce((a, b) => a + b, 0) >= nGl || tries > 40) break;
      if (an.seen.has(t) || special(t)) continue;
      tries++;
      L.glue[t] = 1;
      const a2 = analyze(L, true);
      if (valid(a2)) an = a2; else L.glue[t] = 0;
    }
    // portais (a partir da fase 13)
    const nTp = idx < 13 ? 0 : Math.min(1 + Math.floor((idx - 13) / 8), 3);
    tries = 0;
    while (L.pairs.length < nTp && tries++ < 30){
      const c = [...an.trav.keys()].filter(t => !an.seen.has(t) && !special(t));
      if (c.length < 2) break;
      const A = c[Math.floor(R() * c.length)];
      const far = c.filter(t => Math.abs(t % w - A % w) + Math.abs(((t / w) | 0) - ((A / w) | 0)) >= 12);
      if (!far.length) continue;
      const B = far[Math.floor(R() * far.length)];
      L.tele[A] = B; L.tele[B] = A;
      const a2 = analyze(L, true);
      if (valid(a2)){ an = a2; L.pairs.push([A, B]); } else { L.tele[A] = -1; L.tele[B] = -1; }
    }
    // espinhos fixos
    const nSp = idx < 2 ? 0 : Math.min(2 + Math.floor(idx * 0.6), 24);
    let placed = 0;
    for (const t of shuffle([...an.trav.keys()], R)){
      if (placed >= nSp) break;
      if (special(t)) continue;
      L.spikes[t] = 1;
      const a2 = analyze(L, true);
      if (valid(a2)){ placed++; an = a2; } else L.spikes[t] = 0;
    }
    // perigos com tempo: só em casas de passagem (onde ninguém para)
    const used = new Uint8Array(w * h);
    const free = t => an.trav.has(t) && !an.seen.has(t) && !special(t) && !used[t];
    const pool = shuffle([...an.trav.keys()].filter(free), R);
    const nLa = idx < 11 ? 0 : Math.min(1 + Math.floor((idx - 11) / 2), 10);
    const nRs = idx < 21 ? 0 : Math.min(2 + Math.floor((idx - 21) / 2), 10);
    const nDr = idx < 24 ? 0 : Math.min(1 + Math.floor((idx - 24) / 2), 8);
    // lança-chamas (a partir da fase 71): bocal na parede solta fogo por até 3 casas
    const nFl = idx < 71 ? 0 : Math.min(1 + Math.floor((idx - 71) / 2), 8);
    const sx0 = start % w, sy0 = (start / w) | 0;
    const flameOk = tt => an.trav.has(tt) && !special(tt) && !used[tt] && Math.abs(tt % w - sx0) + Math.abs(((tt / w) | 0) - sy0) >= 4;
    for (const t of shuffle([...an.trav.keys()], R)){
      if (L.flames.length >= nFl) break;
      if (!flameOk(t)) continue;
      const cx = t % w, cy = (t / w) | 0;
      for (const d of shuffle([0, 1, 2, 3], R)){
        const ex = cx - DIRS[d][0], ey = cy - DIRS[d][1];
        if (ex < 0 || ey < 0 || ex >= w || ey >= h || grid[ey * w + ex] !== WALL) continue;
        const tiles = [];
        for (let k = 0; k < 3; k++){ const tx = cx + DIRS[d][0] * k, ty = cy + DIRS[d][1] * k, tt = ty * w + tx;
          if (tx < 0 || ty < 0 || tx >= w || ty >= h || grid[tt] === WALL || !flameOk(tt)) break; tiles.push(tt); }
        if (tiles.length < 2) continue;
        const f = { ex, ey, d, tiles, period: 2.4 + R() * 0.8, on: 0.36, phase: R() * 3 };
        for (const tt of tiles){ used[tt] = 1; L.flameAt.set(tt, f); }
        L.flames.push(f); break;
      }
    }
    for (const t of pool){
      if (L.lasers.length >= nLa) break;
      const ax = an.axis.get(t); if (ax === 3 || used[t]) continue;
      used[t] = 1;
      const g = { t, x: t % w, y: (t / w) | 0, horiz: ax === 2, period: 1.5 + R() * 0.8, on: Math.min(0.42 + idx * 0.004, 0.62), phase: R() * 3 };
      L.lasers.push(g); L.laserAt.set(t, g);
    }
    for (const t of pool){
      if (L.rspikes.length >= nRs) break;
      if (used[t]) continue;
      used[t] = 1;
      const g = { t, x: t % w, y: (t / w) | 0, period: 1.8 + R() * 0.8, on: Math.min(0.4 + idx * 0.004, 0.6), phase: R() * 3 };
      L.rspikes.push(g); L.rsAt.set(t, g);
    }
    for (const t of pool){
      if (L.drones.length >= nDr) break;
      const ax = an.axis.get(t); if (ax === 3 || used[t]) continue;
      const cx = t % w, cy = (t / w) | 0;
      const sides = ax === 2 ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
      const sd = sides.find(([dx, dy]) => { const px = cx + dx, py = cy + dy; return px > 0 && py > 0 && px < w - 1 && py < h - 1 && grid[py * w + px] === WALL; });
      if (!sd) continue;
      used[t] = 1;
      L.drones.push({ ax: cx + sd[0], ay: cy + sd[1], bx: cx, by: cy, speed: 2.2 + Math.min(idx, 50) * 0.03, phase: R() * 6.3 });
    }
    // bombas (a partir da fase 41): piscam e explodem em cruz
    const nBo = idx < 41 ? 0 : Math.min(2 + Math.floor((idx - 41) / 2), 8);
    const sxy = [start % w, (start / w) | 0], exy = [L.exit % w, (L.exit / w) | 0];
    for (const t of pool){
      if (L.bombs.length >= nBo) break;
      if (used[t]) continue;
      const bx = t % w, by = (t / w) | 0;
      if (Math.abs(bx - sxy[0]) + Math.abs(by - sxy[1]) < 4 || Math.abs(bx - exy[0]) + Math.abs(by - exy[1]) < 3) continue;
      used[t] = 1;
      L.bombs.push({ t, x: bx, y: by, period: 3 + R() * 1.4, phase: R() * 4 });
    }
    if (idx >= 31 && idx <= 50) L.tideSpeed = 0.22 + Math.min(idx - 31, 30) * 0.009;
    // fantasma caçador (51-60 e 91-100) e vento assombrado (51-60)
    if ((idx >= 51 && idx <= 60) || idx >= 91) L.ghost = { sx: 1, sy: 1, speed: 0.8 + Math.min(idx >= 91 ? idx - 91 : idx - 51, 9) * 0.04, delay: 4 };
    if (idx >= 51 && idx <= 60) L.wind = { every: 6.5 - Math.min(idx - 51, 9) * 0.25, warn: 1.3 };
    // raios (a partir da fase 91): caem perto de você depois de um aviso
    if (idx >= 91) L.storm = { every: 3.6 - Math.min(idx - 91, 9) * 0.15, warn: 1.1 };
    // lama (61+) e poção da confusão (81+): não mudam o caminho, só o jeito de andar
    const rest = shuffle([...an.trav.keys()].filter(t => !special(t) && !used[t]), R);
    const nMud = idx < 61 ? 0 : Math.min(4 + (idx - 61), 16), nCf = idx < 81 ? 0 : Math.min(2 + Math.floor((idx - 81) / 3), 6);
    let mi = 0;
    for (; mi < rest.length && mi < nMud; mi++){ L.mud[rest[mi]] = 1; used[rest[mi]] = 1; }
    for (let k = 0; k < nCf && mi < rest.length; k++, mi++){ L.conf[rest[mi]] = 1; used[rest[mi]] = 1; }
    const anDots = analyze(L, true, false);
    if (anDots.trav.size < floorN * 0.4 && attempt < 70) continue;
    for (const t of anDots.trav.keys()) if (t !== L.exit && !L.spikes[t] && L.tele[t] < 0 && !L.arrow[t]) L.dots[t] = 1;
    L.dots[start] = 0;
    L.totalDots = L.dots.reduce((a, b) => a + b, 0);
    if (clean0){ genCache.set(key, L); return L; }
    fallback = fallback || L;
  }
  genCache.set(key, fallback);
  return fallback;
}
/* ---------- Ultra Labirinto: labirinto gigante, visão completa, para nos cruzamentos ---------- */
const ULTRA_LEVELS = 10;
// 10 estilos visuais (um por fase); "dark" = fundo escuro, jogadores em cores claras
const ULTRA_THEMES = [
  { name:'Papel',      wall:'#e2552f', wall2:'#f07a52', floor:'#f3ecdc', pat:'plain', exitA:'#2f6a1a', exitB:'#a6e85a', halo:'#d99a00', dark:false, look:'solid' },
  { name:'Planta',     wall:'#ffffff', wall2:'#cfe3ff', floor:'#1d4f9c', pat:'grid',  exitA:'#ffd23f', exitB:'#ffffff', halo:'#ffd23f', dark:true,  look:'solid' },
  { name:'Neon',       wall:'#141030', wall2:'#56f0ff', floor:'#07060f', pat:'plain', exitA:'#ff77a8', exitB:'#ffd1e3', halo:'#ff77a8', dark:true,  look:'glow' },
  { name:'Jardim',     wall:'#2f7a2a', wall2:'#5ac24b', floor:'#d9e8a6', pat:'noise', exitA:'#c2185b', exitB:'#ff77a8', halo:'#c2185b', dark:false, look:'hedge' },
  { name:'Doce',       wall:'#ff77a8', wall2:'#ffd1e3', floor:'#d6f5ec', pat:'dots',  exitA:'#5a3fd1', exitB:'#b7a6ff', halo:'#5a3fd1', dark:false, look:'bevel' },
  { name:'Gelo',       wall:'#7fc4ff', wall2:'#e6f4ff', floor:'#f7fbff', pat:'plain', exitA:'#127a86', exitB:'#56f0ff', halo:'#127a86', dark:false, look:'bevel' },
  { name:'Lava',       wall:'#2a0f0a', wall2:'#ff8c2e', floor:'#120604', pat:'noise', exitA:'#ffd23f', exitB:'#ffffff', halo:'#ffd23f', dark:true,  look:'glow' },
  { name:'Deserto',    wall:'#b9772f', wall2:'#e0a45a', floor:'#f4dfae', pat:'noise', exitA:'#127a86', exitB:'#56f0ff', halo:'#127a86', dark:false, look:'brick' },
  { name:'Terminal',   wall:'#0b1f0b', wall2:'#33ff66', floor:'#020802', pat:'grid',  exitA:'#ffffff', exitB:'#33ff66', halo:'#33ff66', dark:true,  look:'glow' },
  { name:'Galáxia',    wall:'#4b3f8f', wall2:'#b7a6ff', floor:'#0d0b1a', pat:'stars', exitA:'#ffd23f', exitB:'#ffffff', halo:'#ffd23f', dark:true,  look:'bevel' },
];
const ULTRA_COLORS = ['#2e2a5c', '#127a86', '#c2185b', '#2f6a1a', '#a86b00', '#5a3fd1'];
const ULTRA_COLORS_DARK = ['#ffffff', '#56f0ff', '#ff77a8', '#a6e85a', '#ffd23f', '#b7a6ff'];
const ultraColor = (L, i) => (L.theme.dark ? ULTRA_COLORS_DARK : ULTRA_COLORS)[i % 6];
// tamanho de cada quadrado por fase (em pixels do jogo): fases maiores = quadrados menores = mais corredores
const ULTRA_TS = [8, 7, 6, 5, 5, 4, 4, 3, 3, 2];
// área de referência da sala online (celular em pé), para todos jogarem o mesmo labirinto
const ULTRA_ONLINE_AREA = { aw: 126, ah: 252 };
function ultraArea(){ return { aw: Math.max(40, BW - 4), ah: Math.max(60, BH - HUDH - SAFE_T - SAFE_B - 4) }; }
function blankFields(w, h){
  return { spikes:new Uint8Array(w * h), dots:new Uint8Array(w * h), arrow:new Uint8Array(w * h), tele:new Int32Array(w * h).fill(-1), pairs:[],
    lasers:[], laserAt:new Map(), rspikes:[], rsAt:new Map(), drones:[], bombs:[], ghost:null, glue:new Uint8Array(w * h), mud:new Uint8Array(w * h),
    conf:new Uint8Array(w * h), flames:[], flameAt:new Map(), storm:null, wind:null, tideSpeed:0, tideDelay:6, totalDots:0 };
}
function genUltra(n, seed, area = ULTRA_ONLINE_AREA){
  const key = 'u' + n + ':' + seed + ':' + area.aw + 'x' + area.ah; if (genCache.has(key)) return genCache.get(key);
  const R = rng((seed * 131 + n * 977) >>> 0), ts = ULTRA_TS[Math.min(ULTRA_TS.length, n) - 1];
  // ocupa a tela toda: quantos quadrados cabem na largura e na altura (sempre ímpar)
  let w = Math.floor(area.aw / ts), h = Math.floor(area.ah / ts);
  if (w % 2 === 0) w--; if (h % 2 === 0) h--;
  w = Math.max(9, w); h = Math.max(9, h);
  const cw = (w - 1) / 2, ch = (h - 1) / 2;
  const grid = new Uint8Array(w * h).fill(WALL), vis = new Uint8Array(cw * ch);
  // começa embaixo à esquerda
  const st = [[0, ch - 1]]; vis[(ch - 1) * cw] = 1; grid[(h - 2) * w + 1] = 0;
  while (st.length){
    const [cx, cy] = st[st.length - 1], nb = [];
    for (const [dx, dy] of DIRS){ const nx = cx + dx, ny = cy + dy; if (nx >= 0 && ny >= 0 && nx < cw && ny < ch && !vis[ny * cw + nx]) nb.push([nx, ny, dx, dy]); }
    if (!nb.length){ st.pop(); continue; }
    const [nx, ny, dx, dy] = nb[Math.floor(R() * nb.length)];
    vis[ny * cw + nx] = 1; grid[(2 * cy + 1 + dy) * w + 2 * cx + 1 + dx] = 0; grid[(2 * ny + 1) * w + 2 * nx + 1] = 0; st.push([nx, ny]);
  }
  // poucas voltas extras: continua sendo labirinto de verdade
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++)
    if (grid[y * w + x] === WALL && ((x % 2) !== (y % 2)) && R() < 0.035) grid[y * w + x] = 0;
  const start = (h - 2) * w + 1, exit = 0 * w + (w - 2);
  grid[exit] = 0; // saída no alto, à direita: sempre de baixo para cima
  const theme = ULTRA_THEMES[(n - 1) % ULTRA_THEMES.length];
  const L = Object.assign(blankFields(w, h), { ultra: true, idx: n, seed, w, h, grid, start, exit, theme, uts: ts });
  genCache.set(key, L); return L;
}
function slideUltra(L, pos, d){
  const w = L.w, h = L.h; let x = pos % w, y = (pos / w) | 0; const path = [], steps = [];
  const open = (x, y) => x >= 0 && y >= 0 && x < w && y < h && L.grid[y * w + x] !== WALL;
  for(;;){
    const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
    if (!open(nx, ny)) break;
    x = nx; y = ny; const t = y * w + x; path.push(t); steps.push({ t, d });
    if (t === L.exit) return { end: t, path, steps, exit: true };
    const a = DIRS[(d + 1) % 4], b = DIRS[(d + 3) % 4];
    if (open(x + a[0], y + a[1]) || open(x + b[0], y + b[1])) break; // cruzamento: para para você escolher
  }
  return { end: y * w + x, path, steps };
}
const mover = L => L.ultra ? (l, p, d) => slideUltra(l, p, d) : (l, p, d) => slide(l, p, d, true);
// bomba: 0 parada, 1 piscando (vai explodir), 2 explodindo
function bombState(b, clock){ const t = (clock + b.phase) % b.period; return t > b.period - .35 ? 2 : t > b.period - 1.35 ? 1 : 0; }
// menor tempo possível para sair da fase: soma das casas do caminho mais curto até a porta / velocidade
function minFinishTime(L){
  if (L._minT != null) return L._minT;
  const dist = new Map([[L.start, 0]]), q = [[0, L.start]]; let best = Infinity;
  while (q.length){
    q.sort((a, b) => a[0] - b[0]); const [d0, s] = q.shift();
    if (d0 > (dist.get(s) ?? Infinity) || d0 >= best) continue;
    for (let d = 0; d < 4; d++){
      const r = mover(L)(L, s, d); if (!r.steps.length || r.dead || r.loop) continue;
      const nd = d0 + r.steps.length;
      if (r.exit){ best = Math.min(best, nd); continue; }
      if (nd < (dist.get(r.end) ?? Infinity)){ dist.set(r.end, nd); q.push([nd, r.end]); }
    }
  }
  return (L._minT = isFinite(best) ? best / (L.ultra ? ULTRA_SPEED : 18) : 0);
}
const timedOn = (g, clock) => (((clock + g.phase) % g.period) / g.period) < g.on;
const timedPhase = (g, clock) => ((clock + g.phase) % g.period) / g.period;
function dronePos(dr, clock){
  const f = Math.max(0, Math.min(1, Math.sin(dr.phase + clock * dr.speed) * 1.3));
  return [dr.ax + (dr.bx - dr.ax) * f, dr.ay + (dr.by - dr.ay) * f, f];
}

/* ============================== o bonequinho ============================== */
const SPEED = 18; // casas por segundo
const ULTRA_SPEED = 13;
class Runner {
  constructor(L, id, name, color){
    this.L = L; this.id = id; this.name = name; this.color = color;
    this.got = new Uint8Array(L.w * L.h); this.dots = 0; this.deaths = 0; this.finished = false; this.time = 0;
    this.trail = []; this.face = 0; this.squash = 0; this.camX = null; this.camY = null; this.place = 0;
    this.need = game.mode === 'solo' && !L.ultra ? Math.ceil(L.totalDots * 0.8) : 0; this.lockMsg = 0; this.confT = 0;
    this.speed = L.ultra ? ULTRA_SPEED : SPEED; this.visited = new Uint8Array(L.w * L.h); this.visited[L.start] = 1;
    this.respawn();
  }
  respawn(){
    const L = this.L; this.pos = L.start; this.x = L.start % L.w; this.y = (L.start / L.w) | 0;
    this.moving = null; this.queued = null; this.dead = 0; this.tide = L.h + 2; this.tideT = 0; this.trail.length = 0; this.spawnFx = 1;
    if (L.ghost){ this.gx = L.ghost.sx; this.gy = L.ghost.sy; this.gT = 0; }
    this.strikes = []; this.stormT = 0; this.confT = 0; this.windT = 0; this.windDir = null;
  }
  locked(){ return this.need > 0 && this.dots < this.need; }
  swipe(d){
    if (this.finished || this.dead > 0) return;
    if (this.confT > 0) d = (d + 2) % 4;
    if (this.moving){ this.queued = d; return; }
    this.go(d);
  }
  go(d){
    const r = mover(this.L)(this.L, this.pos, d);
    this.face = d;
    if (!r.steps.length){ this.bump = { d, t: .12 }; return; }
    if (r.loop){ const seen = new Set(); let cut = r.steps.length; r.steps.forEach((st, i) => { const k = st.t * 4 + st.d; if (seen.has(k) && cut === r.steps.length) cut = i; seen.add(k); }); r.steps = r.steps.slice(0, Math.max(1, cut)); }
    this.moving = { steps: r.steps, prog: 0, from: this.pos };
    sfx('swish');
  }
  kill(voluntary){
    if (this.dead > 0 || this.finished) return;
    this.dead = 0.8; if (!voluntary) this.deaths++; this.moving = null; this.queued = null;
    burst(this.x, this.y, this.color, 24); burst(this.x, this.y, P.cream, 8); sfx('die'); buzz(60);
  }
  reach(st){
    const L = this.L, t = st.t;
    this.visited[t] = 1;
    if (L.dots[t] && !this.got[t]){ this.got[t] = 1; this.dots++; sfx('dot'); }
    if (st.tp){ burst(this.x, this.y, P.mint, 10); sfx('tele'); }
    if (L.arrow[t]) sfx('arrow');
    if (L.conf[t]){ if (this.confT <= 0) sfx('tele'); this.confT = 6; }
    const hit = L.spikes[t] || (L.laserAt.has(t) && timedOn(L.laserAt.get(t), game.clock)) || (L.rsAt.has(t) && timedOn(L.rsAt.get(t), game.clock))
      || (L.flameAt.has(t) && timedOn(L.flameAt.get(t), game.clock));
    if (hit){ this.x = t % L.w; this.y = (t / L.w) | 0; this.kill(); return true; }
    if (t === L.exit && this.locked()){
      // porta trancada: para aqui e avisa quantos pontinhos faltam
      this.x = t % L.w; this.y = (t / L.w) | 0; this.pos = t; this.moving = null; this.squash = 1; this.lockMsg = 2.2; sfx('lock'); buzz(25);
      if (this.queued != null){ const q = this.queued; this.queued = null; this.go(q); }
      return true;
    }
    if (t === L.exit){
      this.x = t % L.w; this.y = (t / L.w) | 0; this.moving = null; this.finished = true;
      burst(this.x, this.y, P.gold, 36); burst(this.x, this.y, P.cream, 12); sfx('win'); buzz([30, 40, 30]);
      onRunnerFinish(this); return true;
    }
    return false;
  }
  update(dt){
    if (this.bump){ this.bump.t -= dt; if (this.bump.t <= 0) this.bump = null; }
    this.squash = Math.max(0, this.squash - dt * 6);
    this.spawnFx = Math.max(0, (this.spawnFx || 0) - dt * 2);
    if (this.finished) return;
    this.time += dt;
    this.lockMsg = Math.max(0, this.lockMsg - dt); this.confT = Math.max(0, this.confT - dt);
    if (this.dead > 0){ this.dead -= dt; if (this.dead <= 0) this.respawn(); return; }
    const L = this.L;
    if (this.moving){
      const m = this.moving, n = m.steps.length, old = m.prog;
      const cur = m.steps[Math.min(n - 1, Math.floor(m.prog))].t;
      m.prog = Math.min(n, m.prog + this.speed * (L.mud[cur] ? 0.33 : 1) * dt);
      for (let k = Math.floor(old); k < Math.floor(m.prog); k++) if (this.reach(m.steps[k])) return;
      const k = Math.floor(m.prog);
      if (k >= n){
        const t = m.steps[n - 1].t; this.x = t % L.w; this.y = (t / L.w) | 0;
        this.pos = t; this.moving = null; this.squash = 1; sfx('thud');
        if (this.queued != null){ const q = this.queued; this.queued = null; this.go(q); }
      } else {
        const to = m.steps[k], from = k === 0 ? m.from : m.steps[k - 1].t, f = m.prog - k;
        const fx = from % L.w, fy = (from / L.w) | 0, tx = to.t % L.w, ty = (to.t / L.w) | 0;
        if (to.tp){ this.x = fx; this.y = fy; } else { this.x = fx + (tx - fx) * f; this.y = fy + (ty - fy) * f; }
        this.face = to.d;
      }
      this.trail.push([this.x, this.y]); if (this.trail.length > 6) this.trail.shift();
    } else if (this.trail.length) this.trail.shift();
    for (const dr of L.drones){ const [ex, ey] = dronePos(dr, game.clock); if (Math.abs(ex - this.x) < 0.62 && Math.abs(ey - this.y) < 0.62){ this.kill(); return; } }
    if (L.flames.length){ const ft = Math.round(this.y) * L.w + Math.round(this.x), f = L.flameAt.get(ft);
      if (f && timedOn(f, game.clock) && Math.abs(this.x - Math.round(this.x)) < .4 && Math.abs(this.y - Math.round(this.y)) < .4){ this.kill(); return; } }
    for (const b of L.bombs){
      if (bombState(b, game.clock) !== 2) continue;
      const dx = Math.abs(b.x - this.x), dy = Math.abs(b.y - this.y);
      if ((dx < .6 && dy < 1.6) || (dy < .6 && dx < 1.6)){ this.kill(); return; }
    }
    if (L.storm){
      this.stormT += dt;
      if (this.stormT >= L.storm.every){
        this.stormT = 0;
        const px = Math.round(this.x), py = Math.round(this.y), opts = [];
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++){
          const x = px + dx, y = py + dy; if (Math.abs(dx) + Math.abs(dy) > 4 || x < 0 || y < 0 || x >= L.w || y >= L.h) continue;
          const t = y * L.w + x; if (L.grid[t] !== WALL && t !== L.exit && t !== L.start) opts.push([x, y]);
        }
        const pick = Math.random() < .35 ? [px, py] : opts[Math.floor(Math.random() * opts.length)];
        if (pick) this.strikes.push({ x: pick[0], y: pick[1], warn: L.storm.warn, boom: 0 });
      }
      for (const s of this.strikes){
        if (s.warn > 0){ s.warn -= dt; if (s.warn <= 0){ s.boom = .3; sfx('zap');
          if (Math.abs(s.x - this.x) < .6 && Math.abs(s.y - this.y) < .6){ this.kill(); return; } } }
        else s.boom -= dt;
      }
      this.strikes = this.strikes.filter(s => s.warn > 0 || s.boom > 0);
    }
    // vento assombrado: avisa a direção e empurra quem estiver parado (só para direções seguras)
    if (L.wind){
      this.windT = (this.windT || 0) + dt;
      if (this.windDir == null && this.windT >= L.wind.every - L.wind.warn){
        const opts = [0, 1, 2, 3].filter(d => { const r = slide(L, this.pos, d, true); return r.steps.length && !r.dead && !r.loop; });
        if (opts.length){ this.windDir = opts[Math.floor(Math.random() * opts.length)]; this.windWarn = L.wind.warn; sfx('swish'); }
        else this.windT = 0;
      }
      if (this.windDir != null){
        this.windWarn -= dt;
        if (this.windWarn <= 0){
          if (!this.moving){ const r = slide(L, this.pos, this.windDir, true); if (r.steps.length && !r.dead && !r.loop) this.go(this.windDir); }
          this.windDir = null; this.windT = 0;
        }
      }
    }
    if (L.ghost){
      this.gT += dt;
      if (this.gT > L.ghost.delay){
        const dx = this.x - this.gx, dy = this.y - this.gy, d = Math.hypot(dx, dy) || 1;
        const st = Math.min(d, L.ghost.speed * dt); this.gx += dx / d * st; this.gy += dy / d * st;
        if (d < .6){ this.kill(); return; }
      }
    }
    if (L.tideSpeed){
      this.tideT += dt;
      if (this.tideT > L.tideDelay) this.tide -= L.tideSpeed * dt;
      if (this.y + 0.35 > this.tide) this.kill();
    }
  }
}

/* ============================== partículas ============================== */
let parts = [];
function burst(x, y, color, n){
  for (let i = 0; i < n; i++){ const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 7;
    parts.push({ x: x + .5, y: y + .5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .5 + Math.random() * .5, color }); }
}

/* ============================== sala (quem cria a sala manda) ============================== */
class Room {
  constructor(out){ this.out = out; this.players = []; this.rounds = 3; this.bet = null; this.phase = 'lobby'; this.timer = 0; this.lastDots = {}; }
  add(id, name){
    const used = new Set(this.players.map(p => p.color)); let c = 0; while (used.has(c)) c++;
    this.players.push({ id, name: publicText(name, 14) || 'Jogador ' + (this.players.length + 1), color: c, on: true });
    this.sync();
  }
  leave(id){
    const p = this.players.find(p => p.id === id); if (!p || this.dead) return;
    if (this.phase === 'lobby'){ this.players = this.players.filter(q => q.id !== id); if (this.bet){ delete this.bet.votes[id]; if (this.bet.by === id) this.bet = null; } }
    else {
      p.on = false;
      // sobrou uma pessoa só: a partida acaba e todo mundo volta para a sala
      if ((this.phase === 'play' || this.phase === 'inter') && this.players.filter(q => q.on).length < 2){
        this.abort('Os outros jogadores saíram. A partida foi encerrada.'); return;
      }
      this.checkAllDone();
    }
    this.sync();
  }
  abort(why){
    clearTimeout(this.timer); this.phase = 'lobby'; this.players = this.players.filter(q => q.on);
    this.out(null, { t:'aborted', why }); this.sync();
  }
  destroy(){ clearTimeout(this.timer); this.dead = true; this.out = () => {}; }
  snap(){ return { t:'lobby', players: this.players, rounds: this.rounds, kind: this.kind || 'classic', bet: this.bet, phase: this.phase }; }
  sync(){ this.out(null, this.snap()); }
  handle(id, m){
    if (this.dead || !m || typeof m !== 'object' || typeof m.t !== 'string' || m.t.length > 12) return;
    (this.seen = this.seen || {})[id] = Date.now();
    if (m.t === 'hb') return;
    // limite: até 40 mensagens por segundo por jogador; nome, aposta e voto no máximo a cada 0,8 s
    const now = Date.now(), rl = (this.rl = this.rl || {}), b = rl[id] || (rl[id] = { t: now, n: 0, last: 0 });
    if (now - b.t > 1000){ b.t = now; b.n = 0; }
    if (++b.n > 40) return;
    if (m.t === 'name' || m.t === 'bet' || m.t === 'vote' || m.t === 'unbet'){ if (now - b.last < 800) return; b.last = now; }
    const p = this.players.find(p => p.id === id);
    if (!p && m.t !== 'hello') return;
    const isHost = id === this.players[0]?.id;
    switch (m.t){
      case 'hello':
        if (p) return;
        if (this.phase !== 'lobby'){ this.out(id, { t:'reject', why:'A partida já começou. Espere acabar e entre de novo.' }); return; }
        if (this.players.length >= 6){ this.out(id, { t:'reject', why:'A sala está cheia (6 pessoas).' }); return; }
        this.out(id, { t:'you', id }); this.add(id, m.name); break;
      case 'name': p.name = publicText(m.name, 14) || p.name; this.sync(); break;
      case 'rounds': if (isHost && [3,5,7].includes(m.n)){ this.rounds = m.n; this.sync(); } break;
      case 'kind': if (isHost && this.phase === 'lobby' && (m.k === 'classic' || m.k === 'ultra')){ this.kind = m.k; this.sync(); } break;
      case 'bet': {
        const text = publicText(m.text, 120); if (!text || this.phase !== 'lobby') return;
        this.bet = { text, by: id, votes: { [id]: true } }; this.sync(); break; }
      case 'vote': if (this.bet && this.phase === 'lobby'){ this.bet.votes[id] = !!m.yes; this.sync(); } break;
      case 'unbet': if (this.bet && (this.bet.by === id || isHost) && this.phase === 'lobby'){ this.bet = null; this.sync(); } break;
      case 'start': if (isHost && this.phase === 'lobby') this.startMatch(); break;
      case 'kick': {
        const target = this.players.find(q => q.id === m.id);
        if (!isHost || this.phase !== 'lobby' || !target || target.id === id || target.id === this.players[0].id) return;
        this.out(target.id, { t:'reject', why:'Quem criou a sala removeu você.' });
        this.leave(target.id); if (this.onKick) this.onKick(target.id); break; }
      case 'again': if (isHost && this.phase === 'final'){ this.phase = 'lobby'; this.players = this.players.filter(p => p.on); this.sync(); this.out(null, { t:'toLobby' }); } break;
      case 'pos': if (this.phase === 'play'){ this.lastDots[id] = m.g | 0; this.out(null, { t:'pos', id, x: +m.x || 0, y: +m.y || 0, d: m.d ? 1 : 0, f: m.f ? 1 : 0 }, id); } break;
      case 'finish': this.finish(id, m); break;
    }
  }
  startMatch(){
    this.phase = 'play'; this.seed = Math.floor(Math.random() * 1e9); this.round = 0; this.totals = {};
    for (const p of this.players) this.totals[p.id] = { pts:0, wins:0, time:0, dots:0 };
    this.sync(); this.nextRound();
  }
  nextRound(){
    this.round++; this.fin = []; this.lastDots = {}; this.phase = 'play'; this.ending = false;
    // cada rodada tem tempo máximo; labirintos maiores ganham mais tempo
    const ultra = this.kind === 'ultra';
    const idx = ultra ? Math.min(ULTRA_LEVELS, 2 + (this.round - 1) * 2) : Math.min(95, 3 + (this.round - 1) * 14);
    const limit = ultra ? 60 + idx * 15 : Math.round(Math.min(270, 120 + idx * 1.5));
    const seed = (this.seed + this.round * 977) >>> 0;
    this.out(null, { t:'round', round: this.round, rounds: this.rounds, idx, limit, seed, kind: ultra ? 'ultra' : 'classic' });
    this.roundStartAt = Date.now() + 3200; this.minTime = minFinishTime(ultra ? genUltra(idx, seed, ULTRA_ONLINE_AREA) : genLevel(idx, seed));
    clearTimeout(this.timer); this.timer = setTimeout(() => this.endRound(), (3.2 + limit) * 1000 + 600);
  }
  finish(id, m){
    if (this.phase !== 'play' || this.fin.some(f => f.id === id)) return;
    // chegada mais rápida que o caminho mais curto possível = recusada
    const elapsed = (Date.now() - (this.roundStartAt || 0)) / 1000;
    if (this.minTime && elapsed < this.minTime * 0.85 - 0.5) return;
    this.fin.push({ id, time: Math.max(0, +m.time || 0), dots: m.g | 0 });
    this.out(null, { t:'finished', id, place: this.fin.length, time: +m.time || 0 });
    this.checkAllDone();
  }
  // 2 jogadores: acaba quando o primeiro chega. 3 ou mais: acaba quando o penúltimo chega.
  checkAllDone(){
    if (this.phase !== 'play' || !this.fin || this.ending) return;
    const active = this.players.filter(p => p.on), done = this.fin.filter(f => active.some(p => p.id === f.id)).length;
    const needed = active.length <= 2 ? 1 : active.length - 1;
    if (done > 0 && done >= needed){ this.ending = true; clearTimeout(this.timer); this.timer = setTimeout(() => this.endRound(), 1400); }
  }
  ranking(){
    return this.players.map(p => ({ id: p.id, ...this.totals[p.id] })).sort((a, b) => b.pts - a.pts || b.wins - a.wins || a.time - b.time || b.dots - a.dots);
  }
  endRound(){
    if (this.phase !== 'play') return;
    clearTimeout(this.timer);
    const n = this.players.length, isVoid = this.fin.length === 0; // ninguém chegou no tempo: a rodada não conta
    const results = this.players.map(p => {
      const i = this.fin.findIndex(f => f.id === p.id), f = this.fin[i];
      const pts = i >= 0 ? n - i : 0, T = this.totals[p.id];
      if (!isVoid){ T.pts += pts; if (i === 0) T.wins++; T.time += f ? f.time : 300; T.dots += f ? f.dots : (this.lastDots[p.id] || 0); }
      return { id: p.id, place: i >= 0 ? i + 1 : 0, time: f ? f.time : null, pts };
    }).sort((a, b) => (a.place || 99) - (b.place || 99));
    const last = this.round >= this.rounds;
    this.out(null, { t:'roundEnd', round: this.round, rounds: this.rounds, results, totals: this.ranking(), last, void: isVoid });
    if (last){ this.phase = 'final'; this.timer = setTimeout(() => this.final(), 3800); }
    else { this.phase = 'inter'; this.timer = setTimeout(() => this.nextRound(), 4800); }
  }
  final(){
    const rk = this.ranking();
    let bet = null;
    if (this.bet){
      const ins = rk.filter(r => this.bet.votes[r.id] === true && this.players.find(p => p.id === r.id));
      bet = { text: this.bet.text, ins: ins.map(r => r.id), winner: ins.length >= 2 ? ins[0].id : null, loser: ins.length >= 2 ? ins[ins.length - 1].id : null };
    }
    this.out(null, { t:'final', ranking: rk, bet });
    this.sync();
  }
}

/* ============================== sessão / rede ============================== */
const game = {
  mode: null,            // 'solo' | 'online'
  host: false, me: [], lobby: null, code: null,
  room: null, peer: null, conns: new Map(), hostConn: null,
  phase: 'menu',         // menu | lobby | play | solodone
  level: null, runners: [], ghosts: {}, clock: 0, countdown: 0, roundInfo: null, deadline: null, paused: false,
  soloLevel: 1,
};
const soloMax = () => store.get('soloMax', 1);
function player(id){ return game.lobby?.players.find(p => p.id === id); }
function pname(id){ return player(id)?.name || '?'; }
function pcolor(id){ const p = player(id); return p ? COLORS[p.color] : '#888'; }

function send(pid, msg){
  if (game.host) queueMicrotask(() => game.room && game.room.handle(pid, msg));
  else if (game.hostConn && game.hostConn.open){ try{ game.hostConn.send(msg); }catch(e){} }
}
// saída da sala: alvo null = todos; except = não mandar de volta pra quem enviou
function roomOut(target, msg, except){
  const local = target == null ? !game.me.includes(except) : game.me.includes(target);
  if (local) queueMicrotask(() => onMsg(msg));
  for (const [pid, conn] of game.conns){
    if (pid === except) continue;
    if (target != null && target !== pid) continue;
    if (conn.open){ try{ conn.send(msg); }catch(e){} }
  }
}
function peerOpts(){
  const q = new URLSearchParams(location.search).get('peer');
  if (q && /^(127\.0\.0\.1|localhost)$/.test(location.hostname)){ const [host, port] = q.split(':'); return { host, port: +port || 9000, path: '/', secure: false, debug: 1 }; }
  return { debug: 0 };
}
function randCode(){ const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
function myName(){ return clean($('#inName').value, 14) || 'Jogador'; }

function teardown(){
  try{ clearInterval(game.hbTimer); }catch(e){}
  try{ game.room && game.room.destroy(); }catch(e){}
  try{ for (const c of game.conns.values()) c.close(); }catch(e){}
  try{ game.hostConn && game.hostConn.close(); }catch(e){}
  try{ game.peer && game.peer.destroy(); }catch(e){}
  Object.assign(game, { mode:null, host:false, me:[], lobby:null, code:null, room:null, peer:null, hostConn:null, phase:'menu', level:null, runners:[], ghosts:{}, paused:false });
  game.conns = new Map();
}
function toMenu(msg){ teardown(); show('scrMenu'); refreshMenu(); if (msg) toast(msg, 4000); }


function createOnline(tries = 0){
  if (typeof Peer === 'undefined'){ toast('Não consegui carregar o modo online. Confira a internet e recarregue.'); return; }
  teardown();
  const code = randCode();
  $('#wtTitle').textContent = 'Criando a sala…'; $('#wtNote').textContent = 'Isso leva poucos segundos.'; show('scrWait');
  const peer = new Peer('fuganeon-' + code.toLowerCase(), peerOpts());
  game.peer = peer;
  peer.on('open', () => {
    game.mode = 'online'; game.host = true; game.me = ['h']; game.code = code;
    game.room = new Room(roomOut);
    // sinal de vida a cada 2 s; quem some por 9 s sai da sala
    game.hbTimer = setInterval(() => {
      if (!game.room) return;
      roomOut(null, { t:'hb' });
      const now = Date.now();
      for (const [pid, c] of game.conns) if (now - ((game.room.seen || {})[pid] || now) > 9000){ game.conns.delete(pid); try{ c.close(); }catch(e){} game.room.leave(pid); }
    }, 2000);
    game.room.onKick = pid => setTimeout(() => { const c = game.conns.get(pid); if (c) try{ c.close(); }catch(e){} }, 400);
    game.phase = 'lobby'; show('scrLobby');
    game.room.add('h', myName());
  });
  let n = 0;
  peer.on('connection', conn => {
    const pid = 'c' + (++n) + Math.random().toString(36).slice(2, 5);
    conn.on('open', () => { game.conns.set(pid, conn); if (game.room) (game.room.seen = game.room.seen || {})[pid] = Date.now(); });
    conn.on('data', m => game.room && game.room.handle(pid, m));
    conn.on('close', () => { game.conns.delete(pid); game.room && game.room.leave(pid); });
    conn.on('error', () => {});
  });
  peer.on('disconnected', () => { try{ peer.reconnect(); }catch(e){} });
  peer.on('error', e => {
    if (e.type === 'unavailable-id' && tries < 4){ peer.destroy(); createOnline(tries + 1); return; }
    if (game.phase === 'menu' || !game.room) toMenu(netError(e));
    else toast(netError(e));
  });
}
function netError(e){
  const t = e && e.type;
  if (t === 'peer-unavailable') return 'Sala não encontrada. Confira o código e se a sala ainda está aberta.';
  if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') return 'Sem conexão com o servidor de salas. Os dois celulares precisam de internet para se encontrar.';
  if (t === 'browser-incompatible') return 'Este navegador não tem suporte ao modo online. Tente o Chrome ou o Safari atualizados.';
  return 'Deu um problema na conexão. Tente de novo.';
}
function joinOnline(code){
  code = clean(code, 4).toUpperCase();
  if (code.length !== 4){ toast('O código tem 4 letras.'); return; }
  if (typeof Peer === 'undefined'){ toast('Não consegui carregar o modo online. Confira a internet e recarregue.'); return; }
  teardown();
  $('#wtTitle').textContent = 'Entrando na sala ' + code + '…'; $('#wtNote').textContent = 'Procurando quem criou a sala.'; show('scrWait');
  const peer = new Peer(undefined, peerOpts());
  game.peer = peer; game.mode = 'online'; game.code = code;
  const giveUp = setTimeout(() => { if (game.phase === 'menu') toMenu('Não achei a sala ' + code + '. Confira o código.'); }, 15000);
  peer.on('open', () => {
    const conn = peer.connect('fuganeon-' + code.toLowerCase(), { reliable: true });
    game.hostConn = conn;
    conn.on('open', () => {
      clearTimeout(giveUp); conn.send({ t:'hello', name: myName() }); game.hostSeen = Date.now();
      game.hbTimer = setInterval(() => {
        try{ conn.open && conn.send({ t:'hb' }); }catch(e){}
        if (Date.now() - game.hostSeen > 10000) toMenu('Perdemos a conexão com a sala.');
      }, 2000);
    });
    conn.on('data', m => { game.hostSeen = Date.now(); onMsg(m); });
    conn.on('close', () => { if (game.mode === 'online' && !game.host) toMenu('A sala foi fechada por quem criou.'); });
    conn.on('error', () => {});
  });
  peer.on('error', e => { clearTimeout(giveUp); if (game.phase === 'menu') toMenu(netError(e)); else toast(netError(e)); });
}

function onMsg(m){
  if (!game.mode || !m || typeof m.t !== 'string') return;
  switch (m.t){
    case 'hb': break;
    case 'aborted': game.phase = 'lobby'; game.level = null; game.runners = []; show('scrLobby'); renderLobby(); toast(clean(m.why, 120), 4500); break;
    case 'you': game.me = [m.id]; break;
    case 'reject': toMenu(m.why); break;
    case 'lobby':
      game.lobby = m;
      if (game.phase === 'menu' && game.me.length){ game.phase = 'lobby'; show('scrLobby'); }
      if (game.phase === 'lobby') renderLobby();
      break;
    case 'toLobby': game.phase = 'lobby'; game.level = null; show('scrLobby'); renderLobby(); break;
    case 'round': startRound(m); break;
    case 'pos': {
      if (game.me.includes(m.id) || game.phase !== 'play') return;
      const g = game.ghosts[m.id] || (game.ghosts[m.id] = { x: m.x, y: m.y, tx: m.x, ty: m.y });
      g.tx = m.x; g.ty = m.y; g.dead = m.d; g.fin = m.f; g.seen = performance.now();
      break; }
    case 'finished': {
      const r = game.runners.find(r => r.id === m.id); if (r) r.place = m.place;
      const g = game.ghosts[m.id]; if (g){ g.fin = 1; g.place = m.place; }
      break; }
    case 'roundEnd': showRoundEnd(m); break;
    case 'final': showFinal(m); break;
  }
}

/* ============================== rodadas ============================== */
function startRound(m){
  game.phase = 'play'; game.roundInfo = m; game.paused = false;
  const L = m.kind === 'ultra' ? genUltra(Math.min(ULTRA_LEVELS, Math.max(1, m.idx | 0)), m.seed, ULTRA_ONLINE_AREA) : genLevel(m.idx, m.seed); game.level = L;
  game.runners = game.me.map(id => new Runner(L, id, pname(id), L.ultra ? ultraColor(L, player(id)?.color || 0) : pcolor(id)));
  game.ghosts = {}; game.deadline = null; game.countdown = 3.2; game.clock = 0; parts = [];
  game.roundEndsAt = performance.now() + (3.2 + (m.limit || 180)) * 1000;
  show(null); sfx('tick');
}
function startUltra(n){
  teardown();
  game.mode = 'solo'; game.soloKind = 'ultra'; game.soloLevel = n; game.me = ['solo']; game.phase = 'play'; game.paused = false;
  const L = genUltra(n, 5000 + n * 17, ultraArea()); game.level = L;
  game.runners = [new Runner(L, 'solo', myName(), ultraColor(L, 0))];
  game.ghosts = {}; game.countdown = 1.2; game.clock = 0; game.roundInfo = null; game.deadline = null; game.roundEndsAt = null; parts = [];
  show(null);
}
function startSolo(n){
  teardown();
  game.soloKind = 'classic';
  game.mode = 'solo'; game.soloLevel = n; game.me = ['solo']; game.phase = 'play'; game.paused = false;
  const L = genLevel(n, 1000 + n * 13); game.level = L;
  game.runners = [new Runner(L, 'solo', myName(), COLORS[0])];
  game.ghosts = {}; game.countdown = 1.2; game.clock = 0; game.roundInfo = null; game.deadline = null; game.roundEndsAt = null; parts = [];
  show(null);
}
/* ---------- desafio: registro das fases concluídas (com assinatura para dificultar edição manual) ---------- */
const PRIZE_LEVELS = 100, WA_NUMBER = '5598970050096';
function fnv(str){ let h = 0x811c9dc5; for (let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const campSig = c => fnv('pxf|' + JSON.stringify(c) + '|60-fases-r$50').toString(36);
function loadCamp(){
  const c = store.get('camp', null);
  if (!c || typeof c !== 'object' || !c.l || store.get('campSig', '') !== campSig(c)) return { v: 1, l: {} };
  return c;
}
function saveCamp(c){ store.set('camp', c); store.set('campSig', campSig(c)); }
// guarda o melhor resultado da fase: [tempo, voltas ao início, % de pontinhos]
function recordLevel(n, r){
  if (r.time < 2) return;
  const c = loadCamp(), old = c.l[n], pct = Math.floor(r.dots / Math.max(1, r.L.totalDots) * 100);
  const cur = [Math.round(r.time * 10) / 10, r.deaths, pct];
  if (!old || (old[2] || 0) < pct || ((old[2] || 0) === pct && cur[0] < old[0])) c.l[n] = cur;
  saveCamp(c);
}
const CHALLENGE_PCT = 90; // a fase conta para o desafio com pelo menos 90% dos pontinhos
const perfect = e => !!e && (e[2] || 0) >= CHALLENGE_PCT;
function campDone(c = loadCamp()){ let k = 0; for (let i = 1; i <= PRIZE_LEVELS; i++) if (perfect(c.l[i])) k++; return k; }
function prizeCode(c, name){
  const parts = []; for (let i = 1; i <= PRIZE_LEVELS; i++) parts.push(c.l[i] ? c.l[i].join(':') : '-');
  const a = fnv(name.toLowerCase() + '|' + parts.join(',')).toString(36).toUpperCase().padStart(7, '0'), b = fnv(parts.join(',') + '|pxf').toString(36).toUpperCase().padStart(7, '0');
  return (a.slice(0, 4) + '-' + b.slice(0, 4));
}
function prizeTotals(c){ let t = 0, d = 0; for (let i = 1; i <= PRIZE_LEVELS; i++) if (c.l[i]){ t += c.l[i][0]; d += c.l[i][1]; } return { t, d }; }
function updatePrizeLink(){
  const c = loadCamp(), name = clean($('#pzName').value, 30) || myName(), code = prizeCode(c, name), tot = prizeTotals(c);
  const msg = 'Olá, @jonsousax! Zerei as 100 fases do Pixel Lab com pelo menos 90% dos pontinhos e ganhei o desafio de R$ 50! 🏆\n'
    + 'Nome: ' + name + '\nTempo somado: ' + fmtTime(tot.t) + '\nVoltas ao início: ' + tot.d + '\nCódigo: ' + code;
  $('#pzWa').href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg);
  $('#pzCode2').textContent = code;
}
function showPrize(){
  const c = loadCamp(); if (campDone(c) < PRIZE_LEVELS) return;
  const tot = prizeTotals(c);
  if (!$('#pzName').value) $('#pzName').value = store.get('name', '') || '';
  $('#pzStats').replaceChildren(statRow('Fases com 90% ou mais', PRIZE_LEVELS + ' de ' + PRIZE_LEVELS), statRow('Tempo somado', fmtTime(tot.t)), statRow('Voltas pro início', String(tot.d)));
  updatePrizeLink(); sfx('win');
  show('scrPrize');
}
function refreshPrize(){
  const k = campDone();
  $('#pzBar').style.width = (k / PRIZE_LEVELS * 100) + '%'; $('#pzBarBox').setAttribute('aria-valuenow', k);
  $('#pzProg').textContent = k + ' de ' + PRIZE_LEVELS + ' fases com 90% ou mais' + (k >= PRIZE_LEVELS ? '. Você ganhou!' : '');
  $('#pzShort').textContent = k >= PRIZE_LEVELS ? 'Você zerou! Toque para resgatar o prêmio.' : k ? 'Você já tem ' + k + ' de 100 fases com 90% ou mais. Toque para ver.' : 'Zere as 100 fases com pelo menos 90% dos pontinhos e ganhe R$ 50. Toque para ver.';
  $('#btClaim').hidden = k < PRIZE_LEVELS;
}
function onRunnerFinish(r){
  if (game.mode === 'solo' && game.level.ultra){
    const n = game.soloLevel, best = store.get('ultraBest', {}), prev = best[n];
    if (!prev || r.time < prev) best[n] = Math.round(r.time * 10) / 10;
    store.set('ultraBest', best); store.set('ultraMax', Math.max(store.get('ultraMax', 1), Math.min(ULTRA_LEVELS, n + 1)));
    rankSync(true); cloudBackup(true);
    setTimeout(() => {
      if (game.mode !== 'solo') return;
      game.phase = 'solodone';
      $('#sdLevel').textContent = 'Ultra Labirinto ' + n;
      $('#sdStats').replaceChildren(statRow('Tempo', fmtTime(r.time)), statRow('Seu recorde', fmtTime(best[n])));
      $('#btNext').hidden = n >= ULTRA_LEVELS;
      show('scrSoloDone');
    }, 900);
    return;
  }
  if (game.mode === 'solo'){
    $('#btNext').hidden = false;
    store.set('soloMax', Math.max(soloMax(), game.soloLevel + 1));
    recordLevel(game.soloLevel, r);
    rankSync(true); cloudBackup(true);
    const L = game.level, pct = Math.floor(r.dots / Math.max(1, L.totalDots) * 100);
    setTimeout(() => {
      if (game.mode !== 'solo') return;
      game.phase = 'solodone';
      if (pct >= CHALLENGE_PCT && campDone() >= PRIZE_LEVELS && (game.soloLevel === PRIZE_LEVELS || !store.get('prizeSeen', false))){ store.set('prizeSeen', true); showPrize(); return; }
      $('#sdLevel').textContent = 'Fase ' + game.soloLevel;
      $('#sdStats').replaceChildren(
        statRow('Tempo', fmtTime(r.time)), statRow('Pontinhos', r.dots + ' de ' + L.totalDots + ' (' + pct + '%)'), statRow('Voltas pro início', String(r.deaths)),
        h('p', { class:'note' }, pct >= CHALLENGE_PCT ? 'Esta fase já conta para o Desafio R$ 50.' : 'Para esta fase contar no Desafio R$ 50, termine com pelo menos 90% dos pontinhos.'));
      show('scrSoloDone');
    }, 900);
    return;
  }
  send(r.id, { t:'finish', time: +r.time.toFixed(2), g: r.dots });
}
function statRow(k, v){ return h('div', { class:'rk', style:'grid-template-columns:1fr auto' }, h('span', { class:'nm' }, k), h('span', { class:'pts' }, v)); }
function rankRow(pos, id, main, sub, first){
  return h('div', { class:'rk' + (first ? ' first' : '') }, h('span', { class:'pos' }, pos), h('span', { class:'sw', style:'background:' + pcolor(id) }),
    h('span', { class:'nm' }, pname(id)), h('span', { class:'pts' }, main, sub ? h('small', null, sub) : null));
}
function showRoundEnd(m){
  game.phase = 'inter';
  $('#rdTitle').textContent = 'Rodada ' + m.round + ' de ' + m.rounds + (m.void ? ': não contou' : '');
  if (m.void) $('#rdThis').replaceChildren(h('p', { class:'note' }, 'O tempo acabou e ninguém chegou na porta. Esta rodada não vale ponto para ninguém.'));
  else $('#rdThis').replaceChildren(...m.results.map(r => rankRow(r.place ? r.place + 'º' : '—', r.id, '+' + r.pts, r.time != null ? fmtTime(r.time) : 'não chegou', r.place === 1)));
  $('#rdTotal').replaceChildren(...m.totals.map((t, i) => rankRow((i + 1) + 'º', t.id, t.pts + (t.pts === 1 ? ' pt' : ' pts'), null, i === 0)));
  $('#rdNext').textContent = m.last ? 'Calculando o resultado final…' : 'Próximo labirinto já já…';
  show('scrRound');
}
function showFinal(m){
  game.phase = 'final';
  const rk = m.ranking, w = rk[0];
  $('#fnWinner').textContent = w ? pname(w.id) + ' venceu!' : 'Fim!';
  $('#fnRank').replaceChildren(...rk.map((t, i) => rankRow((i + 1) + 'º', t.id, t.pts + (t.pts === 1 ? ' pt' : ' pts'), t.wins ? t.wins + (t.wins > 1 ? ' vitórias' : ' vitória') : null, i === 0)));
  const fb = $('#fnBet');
  if (m.bet){
    fb.hidden = false;
    const kids = [h('h3', null, 'A aposta'), h('div', { class:'quote' }, m.bet.text)];
    if (m.bet.loser){
      kids.push(h('div', { class:'verdict' }, 'Quem ganhou: ', h('b', null, pname(m.bet.winner)), h('br'), 'Quem perdeu: ', h('b', { style:'color:var(--hot)' }, pname(m.bet.loser))));
      kids.push(h('p', { class:'note' }, 'Valeu para quem topou: ' + m.bet.ins.map(pname).join(', ') + '.'));
    } else kids.push(h('p', { class:'note' }, 'Menos de duas pessoas toparam, então a aposta não valeu.'));
    fb.replaceChildren(...kids);
  } else fb.hidden = true;
  $('#btAgain').hidden = !game.host; $('#fnWait').hidden = game.host;
  show('scrFinal');
}

/* ============================== lobby ============================== */
function renderLobby(){
  const lb = game.lobby; if (!lb) return;
  if (game.code) $('#btShare').href = waInvite();
  $('#codeCard').hidden = game.mode !== 'online';
  $('#lbCode').textContent = game.code || '----';
  // jogadores
  const box = $('#lbPlayers'); const focusId = document.activeElement && document.activeElement.id;
  box.replaceChildren(...lb.players.map((p, i) => {
    const mine = game.me.includes(p.id);
    let nameEl;
    if (mine){
      nameEl = h('input', { id:'nm_' + p.id, maxlength:'14', value: p.name, 'aria-label':'Nome' });
      nameEl.addEventListener('change', () => { send(p.id, { t:'name', name: nameEl.value }); if (game.mode === 'online') { $('#inName').value = nameEl.value; store.set('name', clean(nameEl.value, 14)); } });
    } else nameEl = h('span', { class:'nm' }, p.name);
    return h('div', { class:'pl' }, h('span', { class:'sw', style:'background:' + COLORS[p.color] + ';color:' + COLORS[p.color] }), h('div', { class:'grow', style:'min-width:0;display:flex' }, nameEl),
      i === 0 && game.mode === 'online' ? h('span', { class:'pill host' }, 'criou') : null, mine && game.mode === 'online' ? h('span', { class:'pill' }, 'você') : null,
      game.mode === 'online' && game.host && i > 0 && lb.phase === 'lobby' ? h('button', { class:'small ghost', 'aria-label':'Remover ' + p.name, onclick: () => send(game.me[0], { t:'kick', id: p.id }) }, 'Remover') : null);
  }));
  if (focusId && document.getElementById(focusId)) document.getElementById(focusId).focus();
  // rodadas
  for (const b of document.querySelectorAll('#segKind button')){ b.setAttribute('aria-pressed', String(b.dataset.k === (lb.kind || 'classic'))); b.disabled = !game.host; }
  for (const b of document.querySelectorAll('#segRounds button')){ b.setAttribute('aria-pressed', String(+b.dataset.r === lb.rounds)); b.disabled = !game.host; }
  // aposta
  renderBet(lb);
  const enough = lb.players.length >= 2;
  $('#btStart').hidden = !game.host; $('#lbWait').hidden = game.host;
  $('#btStart').disabled = !enough;
  $('#btStart').textContent = enough ? 'Começar partida' : 'Esperando mais alguém entrar…';
}
function renderBet(lb){
  const c = $('#betCard'), bet = lb.bet;
  const draft = $('#betText') ? $('#betText').value : '';
  if (!bet){
    const ta = h('textarea', { id:'betText', maxlength:'120', placeholder:'Ex.: quem perder paga o açaí' }); ta.value = draft;
    c.replaceChildren(h('h3', null, 'Quer apostar alguma coisa?'), ta,
      h('button', { class:'hot', onclick: () => { const t = clean(ta.value, 120); if (!t){ toast('Escreva o que vale a aposta.'); return; } send(game.me[0], { t:'bet', text: t }); } }, 'Propor aposta'),
      h('p', { class:'note' }, 'Cada um confirma se topa. No fim, o jogo mostra quem ganhou e quem perdeu entre quem topou. É só um combinado entre vocês: o jogo não mexe com dinheiro.'));
    return;
  }
  const rows = lb.players.map(p => {
    const v = bet.votes[p.id], mine = game.me.includes(p.id);
    const pill = v === true ? h('span', { class:'pill yes' }, 'topou') : v === false ? h('span', { class:'pill no' }, 'tô fora') : h('span', { class:'pill' }, 'pensando…');
    const btns = mine && p.id !== bet.by ? h('div', { class:'row', style:'gap:6px' },
      h('button', { class:'small', onclick: () => send(p.id, { t:'vote', yes: true }) }, 'Topo'),
      h('button', { class:'small ghost', onclick: () => send(p.id, { t:'vote', yes: false }) }, 'Tô fora')) : null;
    return h('div', { class:'pl' }, h('span', { class:'sw', style:'background:' + COLORS[p.color] + ';color:' + COLORS[p.color] }), h('span', { class:'nm' }, p.name), btns, pill);
  });
  const yes = lb.players.filter(p => bet.votes[p.id] === true).length;
  const canCancel = game.me.includes(bet.by) || game.host;
  c.replaceChildren(h('h3', null, 'Aposta proposta por ' + (lb.players.find(p => p.id === bet.by)?.name || '?')), h('div', { class:'quote' }, bet.text),
    h('div', { class:'players' }, ...rows),
    h('p', { class:'note' }, yes + ' de ' + lb.players.length + ' toparam. No fim, quem ficar em último entre quem topou perde a aposta.'),
    canCancel ? h('button', { class:'small ghost', onclick: () => send(game.me.includes(bet.by) ? bet.by : game.me[0], { t:'unbet' }) }, 'Cancelar aposta') : null);
}


/* ============================== desenho em pixels ============================== */
// Tudo é desenhado num buffer de baixa resolução (8 px por casa) e ampliado sem suavizar.
const TS = 8, HUDH = 20;
const cv = $('#cv'), ctx = cv.getContext('2d');
const buf = document.createElement('canvas'), bg = buf.getContext('2d');
let DPR = 1, K = 3, BW = 0, BH = 0, SAFE_T = 0, SAFE_B = 0;
function resize(){
  DPR = Math.min(3, window.devicePixelRatio || 1);
  cv.width = Math.round(innerWidth * DPR); cv.height = Math.round(innerHeight * DPR);
  K = Math.max(2, Math.round(Math.min(cv.width, cv.height * 0.62) / 136));
  BW = Math.ceil(cv.width / K); BH = Math.ceil(cv.height / K); buf.width = BW; buf.height = BH;
  const cs = getComputedStyle($('#probe'));
  SAFE_T = Math.ceil((parseFloat(cs.paddingTop) || 0) * DPR / K); SAFE_B = Math.ceil((parseFloat(cs.paddingBottom) || 0) * DPR / K);
  for (const r of game.runners){ r.camX = null; r.camY = null; }
}
addEventListener('resize', resize);
function viewports(){ return [{ x:0, y:0, w:BW, h:BH, rot:false, r: game.runners[0], top: SAFE_T, bot: SAFE_B }]; }
// fundo fixo da fase: tijolos, chão e espinhos
function bake(L){
  if (L._bake) return L._bake;
  const W = L.w * TS, H = L.h * TS, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), img = g.createImageData(W, H), D = img.data, T = L.theme;
  const C = { wall: hexRgb(T.wall), hi: hexRgb(T.hi), lo: hexRgb(T.lo), floor: hexRgb(T.floor), speck: hexRgb(T.speck),
    mortar: hexRgb(mix(T.wall, '#000000', .35)), shadow: hexRgb(mix(T.floor, '#000000', .55)) };
  const isW = (x, y) => x < 0 || y < 0 || x >= L.w || y >= L.h || L.grid[y * L.w + x] === WALL;
  for (let ty = 0; ty < L.h; ty++) for (let tx = 0; tx < L.w; tx++){
    const wall = isW(tx, ty), fS = !isW(tx, ty + 1), fN = !isW(tx, ty - 1), fW = !isW(tx - 1, ty), fE = !isW(tx + 1, ty), wN = isW(tx, ty - 1);
    for (let py = 0; py < TS; py++) for (let pxl = 0; pxl < TS; pxl++){
      const gx = tx * TS + pxl, gy = ty * TS + py; let col;
      if (wall){
        const off = ((gy >> 2) & 1) ? 4 : 0;
        col = ((gy & 3) === 3 || ((gx + off) & 7) === 7) ? C.mortar : C.wall;
        if (fS && py >= 6) col = C.lo;
        if (fN && py === 0) col = C.hi;
        if (fW && pxl === 0) col = C.hi;
        if (fE && pxl === 7) col = C.lo;
      } else {
        col = ((((gx * 73856093) ^ (gy * 19349663)) >>> 0) % 29 === 0) ? C.speck : C.floor;
        if (wN && py <= 1) col = C.shadow;
      }
      const i = (gy * W + gx) * 4; D[i] = col[0]; D[i + 1] = col[1]; D[i + 2] = col[2]; D[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  for (let t = 0; t < L.spikes.length; t++) if (L.spikes[t]) g.drawImage(SPR.spikes(), (t % L.w) * TS, ((t / L.w) | 0) * TS);
  L._pairOf = new Map(); L.pairs.forEach(([a, b], i) => { L._pairOf.set(a, i); L._pairOf.set(b, i); });
  L._bake = c; return c;
}
function bakeUltra(L, ts){
  if (L._ub && L._ub.ts === ts) return L._ub.c;
  const T = L.theme, W = L.w, H = L.h, c = document.createElement('canvas'); c.width = W * ts; c.height = H * ts; const g = c.getContext('2d');
  const isW = (x, y) => x < 0 || y < 0 || x >= W || y >= H || L.grid[y * W + x] === WALL;
  // chão com padrão
  g.fillStyle = T.floor; g.fillRect(0, 0, W * ts, H * ts);
  const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0);
  if (T.pat === 'grid'){ g.fillStyle = mix(T.floor, T.wall2, .22); for (let y = 0; y < H; y += 2) g.fillRect(0, y * ts, W * ts, 1); for (let x = 0; x < W; x += 2) g.fillRect(x * ts, 0, 1, H * ts); }
  if (T.pat === 'dots'){ g.fillStyle = mix(T.floor, T.wall, .35); for (let y = 1; y < H; y += 2) for (let x = 1; x < W; x += 2) if (!isW(x, y) && ts >= 3) g.fillRect(x * ts + (ts >> 1), y * ts + (ts >> 1), 1, 1); }
  if (T.pat === 'noise' || T.pat === 'stars'){ g.fillStyle = T.pat === 'stars' ? '#ffffff' : mix(T.floor, T.wall, .25);
    for (let y = 0; y < H * ts; y++) for (let x = 0; x < W * ts; x++) if (hash(x, y) % (T.pat === 'stars' ? 97 : 23) === 0) g.fillRect(x, y, 1, 1); }
  // paredes no estilo do tema
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    if (!isW(x, y)) continue; const X = x * ts, Y = y * ts;
    g.fillStyle = T.wall; g.fillRect(X, Y, ts, ts);
    if (ts < 3) continue;
    if (T.look === 'bevel'){ g.fillStyle = T.wall2; if (!isW(x, y - 1)) g.fillRect(X, Y, ts, 1); if (!isW(x - 1, y)) g.fillRect(X, Y, 1, ts); g.fillStyle = mix(T.wall, '#000000', .3); if (!isW(x, y + 1)) g.fillRect(X, Y + ts - 1, ts, 1); if (!isW(x + 1, y)) g.fillRect(X + ts - 1, Y, 1, ts); }
    if (T.look === 'glow'){ g.fillStyle = T.wall2; if (!isW(x, y - 1)) g.fillRect(X, Y, ts, 1); if (!isW(x, y + 1)) g.fillRect(X, Y + ts - 1, ts, 1); if (!isW(x - 1, y)) g.fillRect(X, Y, 1, ts); if (!isW(x + 1, y)) g.fillRect(X + ts - 1, Y, 1, ts); }
    if (T.look === 'hedge'){ g.fillStyle = T.wall2; for (let k = 0; k < ts; k++) if (hash(X + k, Y + k * 3) % 3 === 0) g.fillRect(X + (hash(X, Y + k) % ts), Y + k, 1, 1); }
    if (T.look === 'brick'){ g.fillStyle = mix(T.wall, '#000000', .25); g.fillRect(X, Y + ts - 1, ts, 1); g.fillRect(X + ((y % 2) ? ts - 1 : 0), Y, 1, ts); g.fillStyle = T.wall2; g.fillRect(X, Y, ts, 1); }
  }
  L._ub = { ts, c }; return c;
}
function drawUltra(vp){
  const g = bg, L = game.level, r = vp.r, top = HUDH + vp.top, avail = vp.h - top - vp.bot - 4;
  const ts = Math.max(1, Math.floor(Math.min((vp.w - 4) / L.w, avail / L.h)));
  const ox = Math.floor((vp.w - L.w * ts) / 2), oy = top + 2 + Math.floor((avail - L.h * ts) / 2);
  const now = performance.now() / 1000, fr = Math.floor(now * 6);
  const T = L.theme;
  g.fillStyle = mix(T.floor, T.wall, .12); g.fillRect(0, 0, vp.w, vp.h);
  g.drawImage(bakeUltra(L, ts), ox, oy);
  // rastro: por onde você já passou
  g.globalAlpha = .38; g.fillStyle = r.color;
  for (let t = 0; t < r.visited.length; t++) if (r.visited[t]) g.fillRect(ox + (t % L.w) * ts, oy + ((t / L.w) | 0) * ts, ts, ts);
  g.globalAlpha = 1;
  // saída piscando no alto
  const EX = ox + (L.exit % L.w) * ts, EY = oy + ((L.exit / L.w) | 0) * ts;
  g.fillStyle = fr % 2 ? T.exitA : T.exitB; g.fillRect(EX, EY, ts, ts);
  if (EY - ts - 1 >= top){ g.fillRect(EX, EY - Math.max(2, ts) - 1, ts, Math.max(2, ts)); }
  // outros jogadores
  const others = [];
  for (const o of game.runners) if (o !== r) others.push({ x: o.x, y: o.y, color: o.color });
  for (const id in game.ghosts){ const gh = game.ghosts[id]; others.push({ x: gh.x, y: gh.y, color: ultraColor(L, player(id)?.color || 0) }); }
  for (const o of others){ g.globalAlpha = .55; g.fillStyle = o.color; g.fillRect(Math.round(ox + o.x * ts), Math.round(oy + o.y * ts), ts, ts); }
  g.globalAlpha = 1;
  // você (pisca ao voltar ao início)
  if (!(game.countdown <= 0 && r.spawnFx > .3 && fr % 2)){
    const X = Math.round(ox + r.x * ts), Y = Math.round(oy + r.y * ts), sz = Math.max(ts, 2);
    // contorno dourado pulsando para achar o bonequinho no labirinto gigante
    const halo = Math.max(2, ts) + (fr % 4 < 2 ? 2 : 3);
    g.strokeStyle = T.halo; g.lineWidth = 1; g.strokeRect(X + ts / 2 - halo + .5, Y + ts / 2 - halo + .5, halo * 2 - 1, halo * 2 - 1);
    g.fillStyle = r.color; g.fillRect(X - (sz - ts) / 2, Y - (sz - ts) / 2, sz, sz);
    if (ts >= 4){ g.fillStyle = '#ffffff'; g.fillRect(X + 1, Y + 1, 1, 1); g.fillRect(X + ts - 2, Y + 1, 1, 1); }
  }
  for (const p of parts){ g.fillStyle = p.color; g.fillRect(Math.round(ox + p.x * ts), Math.round(oy + p.y * ts), 1, 1); }
}
function drawWorld(vp){
  if (game.level.ultra) return drawUltra(vp);
  const g = bg, L = game.level, r = vp.r, T = L.theme, WW = L.w * TS, WH = L.h * TS;
  const bot = vp.bot;
  const top = HUDH + vp.top, avail = vp.h - top - bot;
  const px = r.x * TS + 4, py = r.y * TS + 4;
  const tx = WW <= vp.w ? -Math.floor((vp.w - WW) / 2) : Math.max(0, Math.min(WW - vp.w, px - vp.w / 2));
  const ty = WH <= avail ? -top - Math.floor((avail - WH) / 2) : Math.max(-top, Math.min(WH - vp.h + bot, py - top - avail * 0.55));
  const k = Math.min(1, game.dt * 9);
  r.camX = r.camX == null ? tx : r.camX + (tx - r.camX) * k;
  r.camY = r.camY == null ? ty : r.camY + (ty - r.camY) * k;
  const ox = -Math.round(r.camX), oy = -Math.round(r.camY);
  g.fillStyle = T.lo; g.fillRect(0, 0, vp.w, vp.h);
  g.drawImage(bake(L), ox, oy);
  const x0 = Math.max(0, Math.floor(-ox / TS)), x1 = Math.min(L.w, Math.ceil((vp.w - ox) / TS) + 1);
  const y0 = Math.max(0, Math.floor(-oy / TS)), y1 = Math.min(L.h, Math.ceil((vp.h - oy) / TS) + 1);
  const now = performance.now() / 1000, fr = Math.floor(now * 6);
  // pontinhos, setas e portais
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++){
    const t = y * L.w + x, X = ox + x * TS, Y = oy + y * TS;
    if (L.dots[t] && !r.got[t]){ g.fillStyle = P.cream; g.fillRect(X + 3, Y + 3, 2, 2); }
    if (L.arrow[t]) g.drawImage(SPR.arrow(L.arrow[t] - 1, fr % 2), X, Y);
    if (L.tele[t] >= 0) g.drawImage(SPR.tele(L._pairOf.get(t) || 0, fr % 4), X, Y);
    if (L.mud[t]) g.drawImage(SPR.mud(fr % 2), X, Y);
    if (L.glue[t]) g.drawImage(SPR.glue(), X, Y);
    if (L.conf[t]) g.drawImage(SPR.conf(fr % 2), X, Y);
    if (L.dots[t] && !r.got[t] && (L.mud[t] || L.conf[t])){ g.fillStyle = P.cream; g.fillRect(X + 3, Y + 3, 2, 2); }
  }
  // lança-chamas
  for (const f of L.flames){
    const EX = ox + f.ex * TS, EY = oy + f.ey * TS;
    if (EY < -24 || EY > vp.h + 24) continue;
    g.drawImage(SPR.nozzle(), EX, EY);
    const on = timedOn(f, game.clock), warn = !on && timedPhase(f, game.clock) > .8;
    if (on) for (const tt of f.tiles){ const X = ox + (tt % L.w) * TS, Y = oy + ((tt / L.w) | 0) * TS;
      for (let i = 0; i < 26; i++){ g.fillStyle = [P.gold, P.orange, P.red, '#ffffff'][(i + fr) % 4]; g.fillRect(X + ((i * 29 + fr * 13) % 8), Y + ((i * 47 + fr * 5) % 8), 1, 1); } }
    else if (warn && fr % 2){ g.fillStyle = P.orange; g.fillRect(EX + 3 + DIRS[f.d][0] * 4, EY + 3 + DIRS[f.d][1] * 4, 2, 2); }
  }
  // raios: aviso piscando e depois o raio
  for (const st of (r.strikes || [])){
    const X = ox + st.x * TS, Y = oy + st.y * TS;
    if (st.warn > 0){ if (fr % 2 || st.warn < .4){ g.fillStyle = P.gold; g.fillRect(X, Y, 8, 1); g.fillRect(X, Y + 7, 8, 1); g.fillRect(X, Y, 1, 8); g.fillRect(X + 7, Y, 1, 8); } }
    else {
      g.fillStyle = '#ffffff'; g.fillRect(X, Y, 8, 8);
      g.fillStyle = '#fff6b0'; let bx = X + 4;
      for (let y = Y + 4; y > -4; y -= 3){ g.fillRect(bx, y - 3, 1, 3); bx += ((y * 7 + fr) % 3) - 1; }
    }
  }
  // lasers
  for (const la of L.lasers){
    if (la.y < y0 || la.y > y1 || la.x < x0 || la.x > x1) continue;
    const X = ox + la.x * TS, Y = oy + la.y * TS, on = timedOn(la, game.clock), warn = !on && timedPhase(la, game.clock) > .82;
    g.fillStyle = '#6b1a28';
    if (la.horiz){ g.fillRect(X, Y + 3, 1, 2); g.fillRect(X + 7, Y + 3, 1, 2); } else { g.fillRect(X + 3, Y, 2, 1); g.fillRect(X + 3, Y + 7, 2, 1); }
    if (on){ g.fillStyle = P.pink; if (la.horiz) g.fillRect(X, Y + 3, 8, 2); else g.fillRect(X + 3, Y, 2, 8); g.fillStyle = '#ffffff'; if (la.horiz) g.fillRect(X + 1, Y + 3, 6, 1); else g.fillRect(X + 3, Y + 1, 1, 6); }
    else if (warn && fr % 2){ g.fillStyle = P.red; if (la.horiz) g.fillRect(X + 1, Y + 4, 6, 1); else g.fillRect(X + 4, Y + 1, 1, 6); }
  }
  // espinhos que sobem
  for (const rs of L.rspikes){
    if (rs.y < y0 || rs.y > y1 || rs.x < x0 || rs.x > x1) continue;
    const on = timedOn(rs, game.clock), ph = timedPhase(rs, game.clock);
    g.drawImage(on ? SPR.rsUp() : ph > .82 ? SPR.rsWarn() : SPR.rsDown(), ox + rs.x * TS, oy + rs.y * TS);
  }
  // bombas
  for (const b of L.bombs){
    if (b.y < y0 - 1 || b.y > y1 + 1 || b.x < x0 - 1 || b.x > x1 + 1) continue;
    const st = bombState(b, game.clock), X = ox + b.x * TS, Y = oy + b.y * TS;
    if (st === 2){
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]){
        const nx = b.x + dx, ny = b.y + dy; if (nx < 0 || ny < 0 || nx >= L.w || ny >= L.h || L.grid[ny * L.w + nx] === WALL) continue;
        for (let i = 0; i < 18; i++){ g.fillStyle = [P.gold, P.orange, '#ffffff', P.red][(i + fr) % 4]; g.fillRect(X + dx * TS + ((i * 37 + fr * 11) % 8), Y + dy * TS + ((i * 53 + fr * 7) % 8), 1, 1); }
      }
    } else g.drawImage(SPR.bomb(st === 1 && fr % 2 ? 1 : 0), X, Y);
  }
  // porta de saída
  { const X = ox + (L.exit % L.w) * TS, Y = oy + ((L.exit / L.w) | 0) * TS;
    if (r.locked && r.locked()){
      g.globalAlpha = .45; g.drawImage(SPR.door(0), X, Y); g.globalAlpha = 1;
      g.fillStyle = P.black; g.fillRect(X + 2, Y + 3, 4, 4); g.fillStyle = P.gray; g.fillRect(X + 3, Y + 1, 2, 1); g.fillRect(X + 2, Y + 2, 1, 2); g.fillRect(X + 5, Y + 2, 1, 2);
      g.fillStyle = P.gold; g.fillRect(X + 3, Y + 4, 2, 2);
    } else g.drawImage(SPR.door(fr % 2), X, Y);
    g.fillStyle = P.gold; const s = fr % 8; g.fillRect(X + [-2, 9, 4, -1, 8, 2, 10, -3][s], Y + [1, 4, -3, 7, -1, 9, 6, 3][s], 1, 1); }
  // esmagadores
  for (const dr of L.drones){
    const [dx, dy] = dronePos(dr, game.clock); const X = Math.round(ox + dx * TS), Y = Math.round(oy + dy * TS);
    if (Y < -16 || Y > vp.h + 16) continue;
    const AX = ox + dr.ax * TS, AY = oy + dr.ay * TS;
    g.fillStyle = P.dgray;
    if (dr.ax !== dr.bx) g.fillRect(Math.min(AX, X) + 2, Y + 3, Math.abs(X - AX) + 4, 2); else g.fillRect(X + 3, Math.min(AY, Y) + 2, 2, Math.abs(Y - AY) + 4);
    g.drawImage(SPR.crusher(), X, Y);
  }
  // outros jogadores (fantasminhas com transparência em xadrez)
  const others = [];
  for (const o of game.runners) if (o !== r) others.push({ x: o.x, y: o.y, color: o.color, name: o.name, dead: o.dead > 0, face: o.face });
  for (const id in game.ghosts){ const gh = game.ghosts[id]; others.push({ x: gh.x, y: gh.y, color: pcolor(id), name: pname(id), dead: gh.dead, face: gh.face || 0 }); }
  for (const o of others){
    if (o.dead) continue;
    const X = Math.round(ox + o.x * TS), Y = Math.round(oy + o.y * TS); if (Y < -20 || Y > vp.h + 20) continue;
    g.drawImage(playerSpr(o.color, o.face, true), X, Y);
    drawText(g, shortName(o.name), X + 4, Y - 9, o.color, 1, 'center');
  }
  // rastro e jogador
  if (r.dead <= 0){
    for (let i = 0; i < r.trail.length; i++){ const [ttx, tty] = r.trail[i]; g.globalAlpha = (i + 1) / r.trail.length * .5; g.fillStyle = r.color; g.fillRect(Math.round(ox + ttx * TS) + 2, Math.round(oy + tty * TS) + 2, 4, 4); }
    g.globalAlpha = 1;
    let bx = 0, by = 0;
    if (r.bump){ bx = DIRS[r.bump.d][0]; by = DIRS[r.bump.d][1]; }
    else if (r.squash > .5){ bx = DIRS[r.face][0]; by = DIRS[r.face][1]; }
    const blink = r.spawnFx > .3 && fr % 2;
    if (!blink) g.drawImage(playerSpr(r.color, r.face, false), Math.round(ox + r.x * TS) + bx, Math.round(oy + r.y * TS) + by);
  }
  for (const p of parts){ g.fillStyle = p.color; g.fillRect(Math.round(ox + p.x * TS), Math.round(oy + p.y * TS), 1, 1); }
  // maré de plasma
  if (L.tideSpeed && r.tide < L.h + 1){
    const Y = Math.round(oy + r.tide * TS);
    if (Y < vp.h){
      for (let c = 0; c < vp.w; c++){
        const w = Math.round(Math.sin(c * .25 + now * 5) * 1.5), yy = Y + w;
        g.fillStyle = '#ffd1e3'; g.fillRect(c, yy, 1, 1);
        g.fillStyle = P.pink; g.fillRect(c, yy + 1, 1, 3);
        g.fillStyle = '#b02a6b'; g.fillRect(c, yy + 4, 1, 6);
        g.fillStyle = '#5c1038'; g.fillRect(c, yy + 10, 1, vp.h);
      }
      g.fillStyle = '#ffd1e3'; for (let b = 0; b < 6; b++){ const bxp = (b * 23 + Math.floor(now * 7) * 3) % vp.w; g.fillRect(bxp, Y + 5 + ((b * 5 + fr) % 9), 1, 1); }
    }
  }
  // vento assombrado: aviso com setas e rajadas cruzando a tela
  if (L.wind && r.windDir != null){
    const d = r.windDir, k = Math.max(0, r.windWarn);
    g.globalAlpha = .55; g.fillStyle = '#d9d0ff';
    for (let i = 0; i < 14; i++){
      const t2 = (now * 2.2 + i * 0.37) % 1, len = 10 + (i % 3) * 6;
      const lx = d % 2 ? (d === 1 ? t2 * vp.w : vp.w - t2 * vp.w) : ((i * 47) % vp.w), ly = d % 2 ? (30 + (i * 53) % (vp.h - 40)) : (d === 2 ? t2 * vp.h : vp.h - t2 * vp.h);
      if (d % 2) g.fillRect(Math.round(lx), Math.round(ly), len, 1); else g.fillRect(Math.round(lx), Math.round(ly), 1, len);
    }
    g.globalAlpha = 1;
    if (k > 0) drawText(g, 'VENTO ' + ['CIMA', 'DIREITA', 'BAIXO', 'ESQUERDA'][d] + '!', Math.round(vp.w / 2), HUDH + vp.top + 4, '#d9d0ff', 1, 'center');
  }
  if (L.ghost && r.gT > L.ghost.delay - 1.5 && r.dead <= 0){
    g.globalAlpha = r.gT < L.ghost.delay ? (fr % 2 ? .3 : .6) : .85;
    g.drawImage(SPR.ghost(fr % 2), Math.round(ox + r.gx * TS), Math.round(oy + r.gy * TS));
    g.globalAlpha = 1;
  }
}
const darkCv = document.createElement('canvas');
function drawHUD(vp){
  const g = bg, r = vp.r, L = game.level, T = L.ultra ? { hi: L.theme.dark ? L.theme.wall2 : L.theme.wall, name: L.theme.name } : L.theme, top = vp.top;
  g.fillStyle = P.ink; g.fillRect(0, 0, vp.w, top + HUDH);
  g.fillStyle = T.hi; g.fillRect(0, top + HUDH - 1, vp.w, 1);
  g.drawImage(SPR.pause(), 3, top + 3); g.drawImage(SPR.restart(), vp.w - 10, top + 3);
  vp.btnPause = [0, top, 16, top + HUDH]; vp.btnRestart = [vp.w - 16, top, vp.w, top + HUDH];
  const label = game.mode === 'solo' ? (L.ultra ? 'ULTRA ' : 'FASE ') + game.soloLevel : 'RODADA ' + game.roundInfo.round + '/' + game.roundInfo.rounds;
  drawText(g, label, 14, top + 3, T.hi);
  if (game.mode === 'solo' || !game.roundEndsAt) drawText(g, fmtTime(r.time).replace('s', ''), vp.w - 14, top + 3, P.cream, 1, 'right');
  else { const left = Math.max(0, (game.roundEndsAt - performance.now()) / 1000); drawText(g, fmtTime(left).replace('s', ''), vp.w - 14, top + 3, left < 20 && Math.floor(left * 2) % 2 ? P.red : P.gold, 1, 'right'); }
  if (L.ultra){ if (game.runners.length <= 1) drawText(g, 'ULTRA - ' + L.theme.name, 14, top + 11, L.theme.dark ? L.theme.wall2 : L.theme.wall); }
  else drawText(g, '•' + r.dots + '/' + L.totalDots, 14, top + 11, P.gold);
  if (L.ultra){ if (game.runners.length > 1) drawText(g, shortName(r.name), vp.w - 14, top + 11, P.gray, 1, 'right'); }
  else if (game.mode === 'solo'){
    const pct = Math.floor(r.dots / Math.max(1, L.totalDots) * 100);
    drawText(g, pct + '%', vp.w - 14, top + 11, pct >= 100 ? '#ffffff' : pct >= 80 ? P.lime : P.pink, 1, 'right');
  } else drawText(g, game.runners.length > 1 ? shortName(r.name) : T.name.split(' ')[0], vp.w - 14, top + 11, P.gray, 1, 'right');
  const cx = Math.round(vp.w / 2), cy = Math.round(vp.h * .4);
  if (game.countdown > 0){
    const n = Math.ceil(game.countdown - .2);
    if (n > 0) drawText(g, String(n), cx, cy - 14, P.gold, 5, 'center');
    else drawText(g, 'VAI!', cx, cy - 10, P.gold, 3, 'center');
  } else if (r.finished && game.mode !== 'solo'){
    drawText(g, r.place ? 'CHEGOU EM ' + r.place + 'º!' : 'CHEGOU!', cx, cy, P.gold, 1, 'center');
    drawText(g, 'ESPERANDO OS OUTROS', cx, cy + 12, P.cream, 1, 'center');
  } else if (r.dead > 0){
    drawText(g, 'DE VOLTA AO INICIO', cx, cy, P.pink, 1, 'center');
  } else if (r.lockMsg > 0){
    drawText(g, 'PORTA TRANCADA', cx, cy - 6, P.gold, 1, 'center');
    drawText(g, 'PEGUE 80% DOS PONTOS', cx, cy + 4, P.cream, 1, 'center');
    drawText(g, 'FALTAM ' + Math.max(0, r.need - r.dots), cx, cy + 14, P.pink, 1, 'center');
  }
  if (r.confT > 0) drawText(g, 'INVERTIDO ' + Math.ceil(r.confT) + 'S', cx, top + HUDH + 3, '#9b84ff', 1, 'center');
  else if (game.mode !== 'solo' && game.roundEndsAt && game.countdown <= 0 && game.roundEndsAt - performance.now() < 20000 && !r.finished)
    drawText(g, 'O TEMPO ESTA ACABANDO', cx, top + HUDH + 3, P.red, 1, 'center');
}
function render(){
  bg.setTransform(1, 0, 0, 1, 0, 0); bg.fillStyle = P.ink; bg.fillRect(0, 0, BW, BH);
  if (game.level && game.runners.length){
    const vps = viewports(); game.vps = vps;
    for (const vp of vps){
      bg.save();
      bg.beginPath(); bg.rect(vp.x, vp.y, vp.w, vp.h); bg.clip();
      if (vp.rot){ bg.translate(vp.x + vp.w, vp.y + vp.h); bg.rotate(Math.PI); } else bg.translate(vp.x, vp.y);
      drawWorld(vp); drawHUD(vp);
      bg.restore();
    }
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buf, 0, 0, BW * K, BH * K);
}

/* ============================== tela inicial animada ============================== */
const tcv = $('#tcv'), tg = tcv.getContext('2d');
const title = { cells: [], t: 0, STEP: .028, stars: [], floor: null, lastK: 0 };
(function buildTitle(){
  [['PIXEL', 10, P.gold], ['LAB', 44, P.teal]].forEach(([word, y0, col]) => {
    const x0 = Math.floor((136 - (word.length * 6 - 1) * 4) / 2);
    [...word].forEach((ch, i) => {
      const gl = GLYPH[ch], pts = [];
      for (let p = 0; p < 35; p++) if (gl[p] === '1') pts.push({ cx: p % 5, cy: Math.floor(p / 5) });
      // caminho do pincel: sempre para o vizinho mais perto (traça a letra como se estivesse desenhando)
      let cur = pts.reduce((a, b) => (b.cy * 10 + b.cx < a.cy * 10 + a.cx ? b : a));
      const ord = [];
      while (pts.length){
        let bi = 0, bd = 1e9;
        pts.forEach((q, j) => { const d = Math.abs(q.cx - cur.cx) + Math.abs(q.cy - cur.cy); if (d < bd){ bd = d; bi = j; } });
        cur = pts.splice(bi, 1)[0]; ord.push(cur);
      }
      for (const o of ord) title.cells.push({ x: x0 + (i * 6 + o.cx) * 4, y: y0 + o.cy * 4, col });
    });
  });
  const R = rng(7);
  for (let i = 0; i < 46; i++) title.stars.push([Math.floor(R() * 136), Math.floor(R() * 78), R() * 6]);
  const fc = document.createElement('canvas'); fc.width = 136; fc.height = 14; const fg = fc.getContext('2d'), Wd = WORLDS[0];
  for (let y = 0; y < 14; y++) for (let x = 0; x < 136; x++){
    const off = ((y >> 2) & 1) ? 4 : 0; fg.fillStyle = y === 0 ? Wd.hi : ((y & 3) === 3 || ((x + off) & 7) === 7) ? mix(Wd.wall, '#000000', .35) : Wd.wall; fg.fillRect(x, y, 1, 1);
  }
  title.floor = fc;
})();
function drawTitle(dt){
  const g = tg, cells = title.cells, n = cells.length, now = performance.now() / 1000;
  title.t += dt;
  g.fillStyle = P.ink; g.fillRect(0, 0, 136, 96);
  for (const [x, y, ph] of title.stars){ const b = Math.sin(now * 2 + ph); if (b > -.3){ g.fillStyle = b > .7 ? P.cream : P.dusk; g.fillRect(x, y, 1, 1); } }
  g.drawImage(title.floor, 0, 82);
  const k = Math.min(n, Math.floor(title.t / title.STEP));
  if (k > title.lastK){ if (k < n && k % 2) sfx('paint'); title.lastK = k; }
  const done = k >= n;
  for (let i = 0; i < k; i++){
    const c = cells[i], age = (i === k - 1 && !done) ? 0 : 1;
    let col = c.col;
    if (done && ((c.x + Math.floor(now * 90)) % 150) < 8) col = '#ffffff';
    if (age === 0) col = '#ffffff';
    g.fillStyle = mix(col, '#000000', .45); g.fillRect(c.x + 1, c.y + 1, 4, 4);
    g.fillStyle = col; g.fillRect(c.x, c.y, 3, 3);
    g.fillStyle = mix(col, '#ffffff', .5); g.fillRect(c.x, c.y, 1, 1);
  }
  // o bonequinho: pinta as letras e depois desce para o chão
  let bx, by, face = 1;
  if (!done){
    const a = cells[Math.max(0, k - 1)], b = cells[Math.min(n - 1, k)], f = (title.t / title.STEP) - k;
    const jump = Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 6;
    bx = a.x + (b.x - a.x) * f - 2; by = a.y + (b.y - a.y) * f - 3 - (jump ? Math.sin(f * Math.PI) * 6 : 0);
    face = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) ? (b.x >= a.x ? 1 : 3) : (b.y > a.y ? 2 : 0);
  } else {
    const t2 = title.t - n * title.STEP, last = cells[n - 1], fx = 64, fy = 74;
    if (t2 < .6){ const f = t2 / .6; bx = last.x - 2 + (fx - last.x + 2) * f; by = last.y - 3 + (fy - last.y + 3) * f - Math.sin(f * Math.PI) * 14; face = 2; }
    else { const b = Math.abs(Math.sin((t2 - .6) * 3.2)); bx = fx; by = fy - Math.round(b * 4); face = [1, 2, 3, 2][Math.floor((t2 - .6) / 1.3) % 4]; }
  }
  g.drawImage(playerSpr(P.orange, face, false), Math.round(bx), Math.round(by));
}
tcv.addEventListener('click', () => { if (title.t < title.cells.length * title.STEP) title.t = title.cells.length * title.STEP; });

/* ============================== laço principal ============================== */
let lastT = performance.now(), posT = 0;
game.dt = 0.016;
function frame(t){
  const dt = Math.max(0, Math.min(0.05, (t - lastT) / 1000)); lastT = t; game.dt = dt;
  if (!$('#scrTitle').hidden) drawTitle(dt);
  if (game.phase === 'play' && !(game.paused && game.mode === 'solo')){
    if (game.countdown > 0){
      const before = Math.ceil(game.countdown - .2); game.countdown -= dt; const after = Math.ceil(game.countdown - .2);
      if (after !== before) sfx(after > 0 ? 'tick' : 'go');
      if (game.countdown <= 0) game.countdown = 0;
    } else {
      game.clock += dt;
      for (const r of game.runners) r.update(dt);
    }
    for (const p of parts){ p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .9; p.vy *= .9; p.life -= dt; }
    parts = parts.filter(p => p.life > 0);
    for (const id in game.ghosts){
      const g = game.ghosts[id], k = Math.min(1, dt * 14), dx = g.tx - g.x, dy = g.ty - g.y;
      if (Math.abs(dx) > .05 || Math.abs(dy) > .05) g.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
      if (Math.abs(dx) + Math.abs(dy) > 3){ g.x = g.tx; g.y = g.ty; } else { g.x += dx * k; g.y += dy * k; }
    }
    posT += dt;
    if (game.mode !== 'solo' && posT > 0.08){
      posT = 0;
      for (const r of game.runners) send(r.id, { t:'pos', x: +r.x.toFixed(2), y: +r.y.toFixed(2), d: r.dead > 0 ? 1 : 0, f: r.finished ? 1 : 0, g: r.dots });
    }
  }
  if (game.level && (game.phase === 'play' || game.phase === 'inter' || game.phase === 'final' || game.phase === 'solodone')) render();
  else { ctx.fillStyle = P.ink; ctx.fillRect(0, 0, cv.width, cv.height); }
  requestAnimationFrame(frame);
}

/* ============================== controles ============================== */
const touches = new Map();
const ctrlMode = () => store.get('ctrl', 'swipe') === 'stick' ? 'stick' : 'swipe';
function toLocal(vp, ax, ay){ return vp.rot ? [vp.w - (ax - vp.x), vp.h - (ay - vp.y)] : [ax - vp.x, ay - vp.y]; }
function vpAt(ax, ay){ for (const vp of (game.vps || [])) if (ax >= vp.x && ax < vp.x + vp.w && ay >= vp.y && ay < vp.y + vp.h) return vp; return null; }
const artXY = e => [e.clientX * DPR / K, e.clientY * DPR / K];
cv.addEventListener('pointerdown', e => {
  if (game.phase !== 'play') return;
  const [ax, ay] = artXY(e), vp = vpAt(ax, ay); if (!vp) return;
  try{ cv.setPointerCapture(e.pointerId); }catch(_){}
  const [lx, ly] = toLocal(vp, ax, ay);
  touches.set(e.pointerId, { vp, sx: lx, sy: ly, ox: lx, oy: ly, moved: false, cx: e.clientX, cy: e.clientY });
  if (ctrlMode() === 'stick'){ const st = $('#stick'); st.style.left = e.clientX + 'px'; st.style.top = e.clientY + 'px'; st.firstChild.style.transform = ''; st.hidden = false; }
  if (AC == null) sfx('none');
});
cv.addEventListener('pointermove', e => {
  const tc = touches.get(e.pointerId); if (!tc) return;
  if (ctrlMode() === 'stick'){
    // bolinha: a direção é para onde a bolinha está em relação ao centro (o centro não anda)
    let dx = e.clientX - tc.cx, dy = e.clientY - tc.cy; const dist = Math.hypot(dx, dy), R = 40;
    if (tc.vp.rot){ dx = -dx; dy = -dy; }
    const k = dist > R ? R / dist : 1; $('#stick').firstChild.style.transform = 'translate(' + (e.clientX - tc.cx) * k + 'px,' + (e.clientY - tc.cy) * k + 'px)';
    if (dist < 12){ tc.lastD = null; return; }
    if (dist > 18){
      const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
      if (game.countdown <= 0 && d !== tc.lastD){ tc.vp.r.swipe(d); tc.lastD = d; }
      tc.moved = true;
    }
    return;
  }
  const [ax, ay] = artXY(e), [lx, ly] = toLocal(tc.vp, ax, ay);
  const dx = lx - tc.sx, dy = ly - tc.sy, TH = 20 * DPR / K;
  if (Math.hypot(dx, dy) > TH){
    const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
    // o mesmo dedo continuando na mesma direção não conta como outro deslize
    if (game.countdown <= 0 && d !== tc.lastD){ tc.vp.r.swipe(d); tc.lastD = d; }
    tc.sx = lx; tc.sy = ly; tc.moved = true;
  }
});
function endTouch(e){
  const tc = touches.get(e.pointerId); touches.delete(e.pointerId); if (!touches.size) $('#stick').hidden = true; if (!tc || tc.moved) return;
  const vp = tc.vp, x = tc.ox, y = tc.oy, inR = b => b && x >= b[0] && y >= b[1] && x < b[2] && y < b[3];
  if (inR(vp.btnPause)) openPause();
  else if (inR(vp.btnRestart) && game.countdown <= 0){ const r = vp.r; if (!r.finished && r.dead <= 0) r.kill(true); }
}
cv.addEventListener('pointerup', endTouch);
cv.addEventListener('pointercancel', e => { touches.delete(e.pointerId); if (!touches.size) $('#stick').hidden = true; });
addEventListener('keydown', e => {
  if (!$('#scrTitle').hidden && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); $('#btPlay').click(); return; }
  if (game.phase !== 'play' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'Escape' || e.key === 'p'){ openPause(); return; }
  if (game.countdown > 0) return;
  const KEYS = { ArrowUp:0, ArrowRight:1, ArrowDown:2, ArrowLeft:3, w:0, d:1, s:2, a:3, W:0, D:1, S:2, A:3 };
  const r1 = game.runners[0];
  if (e.key in KEYS && r1){ e.preventDefault(); r1.swipe(KEYS[e.key]); }
});
function openPause(){
  if (game.phase !== 'play') return;
  game.paused = true;
  $('#psNote').textContent = game.mode === 'solo' ? 'O tempo está parado.' : 'A partida continua rolando para os outros.';
  show('scrPause');
}

/* ============================== telas ============================== */
const MAX_LEVEL = 100;
function refreshMenu(){
  refreshPrize(); updateRankMe(); cloudBackup(false); rankSync(false).then(r => { if (r && r.ok) loadTop(true); }); loadTop(false);
  const n = Math.min(soloMax(), store.get('soloLast', 1));
  $('#soloSub').textContent = 'Fase ' + n + ' · Mundo ' + (worldIdx(n) + 1) + ': ' + WORLDS[worldIdx(n)].name;
}
function renderUltra(){
  const max = store.get('ultraMax', 1), best = store.get('ultraBest', {});
  $('#ultraGrid').replaceChildren(...Array.from({ length: ULTRA_LEVELS }, (_, i) => {
    const k = i + 1, b = h('button', { class: best[k] ? 'done' : '', 'aria-label': 'Ultra ' + k + (best[k] ? ', recorde ' + fmtTime(best[k]) : '') }, k > max ? '--' : String(k));
    if (k > max) b.disabled = true; else b.addEventListener('click', () => startUltra(k));
    return b;
  }));
  const done = Object.keys(best).length;
  $('#ultraNote').textContent = done ? 'Você já fez ' + done + ' de ' + ULTRA_LEVELS + ' fases. Toque numa fase para tentar bater seu recorde.' : 'Cada fase é maior que a anterior. Termine uma para abrir a próxima.';
}
function renderWorlds(){
  const max = soloMax(), last = store.get('soloLast', 1), box = $('#worlds'), camp = loadCamp();
  const sections = WORLDS.map((W, wi) => {
    const btns = Array.from({ length: 10 }, (_, i) => {
      const k = wi * 10 + i + 1;
      const b = h('button', { class: k === last ? 'cur' : perfect(camp.l[k]) ? 'perfect' : camp.l[k] ? 'done' : '', 'aria-label': 'Fase ' + k + (perfect(camp.l[k]) ? ', vale para o desafio' : camp.l[k] ? ', concluída' : '') }, k > max ? '--' : String(k));
      if (k > max) b.disabled = true; else b.addEventListener('click', () => { store.set('soloLast', k); startSolo(k); });
      return b;
    });
    return h('div', { class:'card world' },
      h('div', { class:'wh' }, h('i', { style:'background:' + W.wall + ';border:2px solid ' + W.hi }), h('h3', null, 'Mundo ' + (wi + 1) + ' · ' + W.name)),
      h('p', { class:'note' }, W.news + '.'), h('div', { class:'levels' }, ...btns));
  });
  if (max > MAX_LEVEL){
    const extra = Array.from({ length: max - MAX_LEVEL }, (_, i) => { const k = MAX_LEVEL + 1 + i; return h('button', { class: k === last ? 'cur' : '', onclick: () => { store.set('soloLast', k); startSolo(k); } }, String(k)); });
    sections.push(h('div', { class:'card world' }, h('h3', null, 'Fases extras'), h('p', { class:'note' }, 'Você passou dos 10 mundos. Daqui para frente, cada fase é um labirinto novo.'), h('div', { class:'levels' }, ...extra)));
  }
  box.replaceChildren(...sections);
}
function buildLegend(){
  const mk = draw => { const c = document.createElement('canvas'); c.width = 8; c.height = 8; draw(c.getContext('2d')); return c.toDataURL(); };
  const items = [
    [mk(g => g.drawImage(playerSpr(P.orange, 1, false), 0, 0)), '<b>Você.</b> Desliza até bater na parede.'],
    [mk(g => { g.fillStyle = P.cream; g.fillRect(3, 3, 2, 2); }), '<b>Pontinhos.</b> Pegue 80% para abrir a porta. Com 90% a fase vale para o desafio.'],
    [mk(g => g.drawImage(SPR.door(0), 0, 0)), '<b>Porta dourada.</b> A saída. Com cadeado, ainda faltam pontinhos.'],
    [mk(g => g.drawImage(SPR.spikes(), 0, 0)), '<b>1. Espinhos</b> (fase 2+). Tocou, volta pro início.'],
    [mk(g => g.drawImage(SPR.arrow(1, 1), 0, 0)), '<b>2. Setas</b> (fase 6+). Mudam sua direção no meio do caminho.'],
    [mk(g => { g.fillStyle = '#6b1a28'; g.fillRect(0, 3, 1, 2); g.fillRect(7, 3, 1, 2); g.fillStyle = P.pink; g.fillRect(1, 3, 6, 2); g.fillStyle = '#fff'; g.fillRect(1, 3, 6, 1); }), '<b>3. Lasers</b> (fase 11+). Ligam e desligam. Passe no apagado.'],
    [mk(g => g.drawImage(SPR.tele(0, 0), 0, 0)), '<b>4. Portais</b> (fase 13+). Te levam para o outro portal da mesma cor, e você para em cima dele.'],
    [mk(g => g.drawImage(SPR.rsUp(), 0, 0)), '<b>5. Espinhos que sobem</b> (fase 21+). Fique de olho no ritmo.'],
    [mk(g => g.drawImage(SPR.crusher(), 0, 0)), '<b>6. Esmagadores</b> (fase 24+). Saem da parede e voltam.'],
    [mk(g => { g.fillStyle = '#ffd1e3'; g.fillRect(0, 2, 8, 1); g.fillStyle = P.pink; g.fillRect(0, 3, 8, 2); g.fillStyle = '#b02a6b'; g.fillRect(0, 5, 8, 3); }), '<b>7. Maré de plasma</b> (fases 31 a 50). Sobe atrás de você.'],
    [mk(g => g.drawImage(SPR.bomb(1), 0, 0)), '<b>8. Bombas</b> (fase 41+). Piscam e explodem em cruz.'],
    [mk(g => g.drawImage(SPR.ghost(0), 0, 0)), '<b>9. Fantasma</b> (fases 51 a 60 e 91+). Atravessa paredes e vem atrás de você.'],
    [mk(g => { g.fillStyle = '#d9d0ff'; g.fillRect(0, 1, 5, 1); g.fillRect(2, 3, 6, 1); g.fillRect(0, 5, 4, 1); g.fillRect(3, 7, 5, 1); }), '<b>10. Vento assombrado</b> (fases 51 a 60). Avisa a direção e te empurra se você estiver parado.'],
    [mk(g => g.drawImage(SPR.mud(0), 0, 0)), '<b>11. Lama</b> (fase 61+). Você atravessa bem mais devagar.'],
    [mk(g => g.drawImage(SPR.glue(), 0, 0)), '<b>12. Cola</b> (fase 61+). Te prende na hora: o deslize para ali.'],
    [mk(g => { g.drawImage(SPR.nozzle(), 0, 0); g.fillStyle = P.orange; g.fillRect(3, 0, 2, 2); }), '<b>13. Lança-chamas</b> (fase 71+). Solta fogo por até 3 casas.'],
    [mk(g => g.drawImage(SPR.conf(0), 0, 0)), '<b>14. Poção da confusão</b> (fase 81+). Inverte os controles por 6 segundos.'],
    [mk(g => { g.fillStyle = P.gold; g.fillRect(0, 0, 8, 1); g.fillRect(0, 7, 8, 1); g.fillRect(0, 0, 1, 8); g.fillRect(7, 0, 1, 8); g.fillStyle = '#fff6b0'; g.fillRect(4, 1, 1, 3); g.fillRect(3, 3, 1, 3); }), '<b>15. Raios</b> (fase 91+). A casa pisca e o raio cai. Saia de lá!'],
  ];
  $('#legend').replaceChildren(...items.flatMap(([src, html]) => { const m = /^<b>(.*?)<\/b>\s*(.*)$/.exec(html); return [h('img', { src, alt: '' }), h('span', null, h('b', null, m ? m[1] : ''), m ? ' ' + m[2] : html)]; }));
}
/* ============================== ranking ============================== */
// Todo jogador com apelido aparece no ranking. Só o apelido e as fases são públicos.
const RANK_URL = 'https://vpldivsicywvnvyczkhz.supabase.co/functions/v1/pixelfuga-ranking';
function deviceId(){
  let d = store.get('dev', '');
  if (typeof d !== 'string' || !/^[A-Za-z0-9_-]{20,100}$/.test(d)){
    const b = new Uint8Array(24); crypto.getRandomValues(b);
    d = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    store.set('dev', d);
  }
  return d;
}
// apelido válido para o ranking (o mesmo que aparece nas salas)
function rankName(){ const n = publicText(store.get('name', ''), 14); return n.length >= 2 ? n : null; }
function rankProgress(){
  const c = loadCamp(); let done = 0, t = 0;
  for (const k in c.l){ done++; t += +c.l[k][0] || 0; }
  return { current_level: Math.min(1000, Math.max(1, soloMax())), levels_done: Math.min(1000, done), challenge_levels: campDone(c),
    ultra_done: Math.min(10, Object.keys(store.get('ultraBest', {})).length), total_time_s: Math.min(1e8, Math.round(t)) };
}
async function rankCall(body){
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), 9000);
  try{
    const res = await fetch(RANK_URL, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ac.signal } : { signal: ac.signal, cache: 'no-store' });
    let data = null; try{ data = await res.json(); }catch(_){}
    return { ok: res.ok, status: res.status, data: data || {} };
  }catch(e){ return { ok: false, status: 0, data: { error: 'Sem conexão. Confira a internet e tente de novo.' } }; }
  finally{ clearTimeout(to); }
}
let rankBusy = false, rankLast = 0, rankLastName = '';
// manda apelido e fase (ao trocar o apelido, depois de cada fase e ao abrir o menu, no máximo a cada 20 s)
async function rankSync(force){
  const name = rankName(); if (!name || rankBusy || (!force && name === rankLastName && Date.now() - rankLast < 20000)) return null;
  rankBusy = true; rankLast = Date.now();
  try{
    const r = await rankCall({ device: deviceId(), action: 'save', name, progress: rankProgress() });
    if (r.ok){
      rankLastName = name;
      const old = store.get('rankPos', null), pos = r.data.pos || null;
      store.set('rankPos', pos);
      if (old && pos && pos < old && pos <= 3) toast('Você subiu para o ' + pos + 'º lugar do ranking!');
      updateRankMe();
    }
    return r;
  } finally { rankBusy = false; }
}
function updateRankMe(){
  const name = rankName(), pos = store.get('rankPos', null);
  $('#podMe').textContent = !name ? 'Digite seu apelido acima para entrar no ranking.' : pos ? name + ', você está em ' + pos + 'º lugar.' : name + ', jogue uma fase para subir no ranking.';
}
function requireName(){
  if (rankName()) return true;
  const i = $('#inName'); i.classList.remove('shake'); void i.offsetWidth; i.classList.add('shake'); i.focus();
  toast('Digite seu apelido (2 letras ou mais) para jogar e aparecer no ranking.');
  return false;
}
// pódio do menu: 2º, 1º e 3º lugar com o bonequinho de cada um
const POD_COLORS = [P.gold, '#c9d1e8', '#e08a4a'];
const sprURL = (c, face) => playerSpr(c, face, false).toDataURL();
let crownURL = '';
function crown(){
  if (crownURL) return crownURL;
  const c = document.createElement('canvas'); c.width = 8; c.height = 5; const g = c.getContext('2d');
  g.fillStyle = P.gold; ['x...x...x', 'xx.xxx.xx', 'xxxxxxxxx'].forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'x' && x < 8) g.fillRect(x, y + 1, 1, 1); }));
  g.fillRect(0, 4, 8, 1); g.fillStyle = P.red; g.fillRect(3, 3, 2, 1);
  return crownURL = c.toDataURL();
}
let topRows = null, topLast = 0;
function renderPodium(){
  const box = $('#podCols'), rows = topRows || [];
  const cols = [1, 0, 2].map(i => {
    const r = rows[i], place = i + 1;
    return h('div', { class: 'pod p' + place + (r ? '' : ' empty'), style: '--d:' + [0.15, 0, 0.3][i] + 's' },
      place === 1 && r ? h('img', { class: 'crown', src: crown(), alt: '' }) : null,
      h('img', { class: 'pav', src: sprURL(r ? POD_COLORS[i] : P.dgray, r ? [1, 0, 3][i] : 2), alt: '' }),
      h('span', { class: 'pnm' }, r ? String(r.name) : 'Vago'),
      h('span', { class: 'plv' }, r ? 'Fase ' + r.current_level : '—'),
      h('div', { class: 'pbar' }, h('b', null, String(place))));
  });
  box.replaceChildren(...cols);
  box.classList.remove('go'); void box.offsetWidth; box.classList.add('go');
  $('#podTotal').textContent = topRows ? (rows.length ? (topRows.total || rows.length) + (topRows.total === 1 ? ' jogador' : ' jogadores') : 'Seja o primeiro!') : '';
}
async function loadTop(force){
  if (!force && topRows && Date.now() - topLast < 15000) return;
  topLast = Date.now();
  const r = await rankCall(null);
  if (!r.ok || !Array.isArray(r.data.rows)){ if (!topRows) $('#podTotal').textContent = 'Sem conexão'; return; }
  const sig = JSON.stringify(r.data.rows.slice(0, 3)), changed = !topRows || sig !== JSON.stringify(topRows.slice(0, 3));
  topRows = r.data.rows.slice(0, 3); topRows.total = r.data.total; allRows = r.data;
  if (changed) renderPodium(); else $('#podTotal').textContent = (r.data.total || 0) + (r.data.total === 1 ? ' jogador' : ' jogadores');
}
setInterval(() => { if (!$('#scrMenu').hidden && !document.hidden) loadTop(true); }, 30000);
let allRows = null;
function rankRow(r, mine){
  const pos = Number.isInteger(r.pos) ? r.pos : null;
  const sub = [r.levels_done + (r.levels_done === 1 ? ' concluída' : ' concluídas')];
  if (r.challenge_levels) sub.push(r.challenge_levels + ' no desafio');
  if (r.ultra_done) sub.push(r.ultra_done + ' ultra');
  return h('div', { class: 'rrow' + (pos && pos <= 3 ? ' top t' + pos : '') + (mine ? ' me' : ''), style: '--d:' + Math.min(20, (pos || 1) - 1) * 0.03 + 's' },
    h('span', { class: 'pos' }, pos ? pos + 'º' : '-'),
    h('span', { class: 'nm' }, String(r.name || ''), r.won ? h('span', { class: 'pill yes' }, 'R$ 50') : null),
    h('span', { class: 'lv' }, 'Fase ' + r.current_level),
    h('span', { class: 'sub' }, sub.join(' · ')));
}
async function loadRanking(){
  const list = $('#rkList');
  list.replaceChildren(h('p', { class: 'note' }, 'Carregando…'));
  const r = await rankCall(null);
  if (!r.ok || !Array.isArray(r.data.rows)){
    list.replaceChildren(h('p', { class: 'note err' }, r.data.error || 'Não consegui carregar o ranking. Tente de novo.'));
    return;
  }
  const myPos = store.get('rankPos', null);
  $('#rkTotal').textContent = r.data.total === 1 ? '1 jogador' : (r.data.total || 0) + ' jogadores';
  list.replaceChildren(...(r.data.rows.length ? r.data.rows.map(x => rankRow(x, myPos && x.pos === myPos && x.name === rankName()))
    : [h('p', { class: 'note' }, 'Ninguém entrou ainda. Seja o primeiro!')]));
}
function rankMeText(){
  const name = rankName(), pos = store.get('rankPos', null), p = rankProgress();
  $('#rkStatusText').textContent = !name ? 'Você ainda não tem apelido. Volte ao menu e digite um para aparecer aqui.'
    : name + (pos ? ', ' + pos + 'º lugar' : '') + '. Fase ' + p.current_level + ', ' + p.levels_done + (p.levels_done === 1 ? ' concluída.' : ' concluídas.');
}
async function openRanking(){
  show('scrRank'); $('#scrRank').scrollTop = 0;
  rankMeText(); loadRanking();
  const r = await rankSync(true);
  if (r && r.ok){ rankMeText(); loadRanking(); }
}
$('#rkReload').addEventListener('click', loadRanking);
$('#btRankAll').addEventListener('click', openRanking);
/* ============================== configurações ============================== */
const CTRL_NOTES = {
  swipe: 'Deslizar: passe o dedo para cima, baixo, esquerda ou direita em qualquer lugar da tela.',
  stick: 'Bolinha: encoste o dedo na tela e uma bolinha aparece. Arraste a bolinha para o lado que quer ir, sem tirar o dedo, como no controle do videogame.'
};
function segSet(id, v){ for (const b of $(id).querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === v)); }
function renderSettings(){
  segSet('#segSound', store.get('mute', false) ? 'off' : 'on');
  segSet('#segVib', store.get('novib', false) ? 'off' : 'on');
  segSet('#segCtrl', ctrlMode()); $('#ctrlNote').textContent = CTRL_NOTES[ctrlMode()];
  const code = fmtCode(rcode());
  $('#svCode').textContent = code;
  $('#svWa').href = 'https://wa.me/?text=' + encodeURIComponent('Meu código de recuperação do Pixel Lab (não mostre para ninguém): ' + code);
}
let settingsFrom = 'scrMenu';
function openSettings(from){
  settingsFrom = from; renderSettings(); show('scrSettings'); $('#scrSettings').scrollTop = 0;
  $('#svStatus').textContent = 'Salvando na nuvem…';
  cloudBackup(true).then(r => { $('#svStatus').textContent = r && r.ok ? 'Progresso salvo na nuvem agora.' : 'Sem conexão: o progresso será salvo quando a internet voltar.'; });
}
function closeSettings(){ if (settingsFrom === 'scrPause') show('scrPause'); else { show('scrMenu'); refreshMenu(); } }
$('#segSound').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; store.set('mute', b.dataset.v === 'off'); renderSettings(); sfx('go'); });
$('#segVib').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; store.set('novib', b.dataset.v === 'off'); renderSettings(); buzz(40); });
$('#segCtrl').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; store.set('ctrl', b.dataset.v); renderSettings(); });
$('#btSettings').addEventListener('click', () => openSettings('scrMenu'));
$('#btPauseSettings').addEventListener('click', () => openSettings('scrPause'));
$('#btSettingsBack').addEventListener('click', closeSettings);
$('#svCopy').addEventListener('click', () => navigator.clipboard?.writeText(fmtCode(rcode())).then(() => toast('Código copiado. Guarde num lugar seguro.'), () => toast('Segure o código para copiar.')));

// código de recuperação curto: 8 letras e números sem os que se confundem (I, L, O, 0, 1)
const CODE_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;
function newCode(){
  let c = ''; const b = new Uint8Array(32);
  while (c.length < 8){ crypto.getRandomValues(b); for (const x of b){ if (x < 248 && c.length < 8) c += CODE_ABC[x % 31]; } }
  return c;
}
function rcode(){ let c = store.get('rcode', ''); if (typeof c !== 'string' || !CODE_RE.test(c)){ c = newCode(); store.set('rcode', c); } return c; }
const fmtCode = c => c.slice(0, 4) + '-' + c.slice(4);
const normCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
// cópia do progresso na nuvem, ligada ao código de recuperação
const SAVE_KEYS = ['soloMax', 'soloLast', 'ultraMax', 'ultraBest', 'camp', 'name', 'prizeSeen'];
function saveSnapshot(){
  const d = { v: 1 }; for (const k of SAVE_KEYS){ const v = store.get(k, null); if (v != null) d[k] = v; }
  d.camp = loadCamp(); return d;
}
let lastBackup = 0, backupBusy = false;
async function cloudBackup(force){
  if (backupBusy || (!force && Date.now() - lastBackup < 20000)) return null;
  backupBusy = true; lastBackup = Date.now();
  try{
    let r = await rankCall({ device: deviceId(), action: 'backup', code: rcode(), data: saveSnapshot() });
    if (r.status === 409 && r.data.retry){ store.set('rcode', newCode()); r = await rankCall({ device: deviceId(), action: 'backup', code: rcode(), data: saveSnapshot() }); if (!$('#scrSettings').hidden) renderSettings(); }
    return r;
  } finally { backupBusy = false; }
}
const posInt = (v, max) => Number.isInteger(v) && v >= 1 && v <= max ? v : 0;
// junta o progresso salvo com o do aparelho, ficando sempre com o melhor de cada fase
function mergeSave(d){
  if (!d || typeof d !== 'object') return false;
  store.set('soloMax', Math.max(soloMax(), posInt(d.soloMax, 1000)));
  store.set('ultraMax', Math.max(store.get('ultraMax', 1), posInt(d.ultraMax, ULTRA_LEVELS)));
  if (posInt(d.soloLast, 1000)) store.set('soloLast', Math.min(soloMax(), d.soloLast));
  const ub = store.get('ultraBest', {});
  if (d.ultraBest && typeof d.ultraBest === 'object') for (const k in d.ultraBest){
    const n = +k, t = +d.ultraBest[k]; if (posInt(n, ULTRA_LEVELS) && t > 0 && t < 1e5 && (!ub[n] || t < ub[n])) ub[n] = Math.round(t * 10) / 10;
  }
  store.set('ultraBest', ub);
  const c = loadCamp();
  if (d.camp && d.camp.l && typeof d.camp.l === 'object') for (const k in d.camp.l){
    const n = +k, e = d.camp.l[k];
    if (!posInt(n, 1000) || !Array.isArray(e) || e.length < 3) continue;
    const cur = [+e[0] || 0, Math.max(0, e[1] | 0), Math.min(100, Math.max(0, e[2] | 0))], old = c.l[n];
    if (cur[0] < 2) continue;
    if (!old || (old[2] || 0) < cur[2] || ((old[2] || 0) === cur[2] && cur[0] < old[0])) c.l[n] = cur;
  }
  saveCamp(c);
  if (typeof d.name === 'string' && !store.get('name', '')) store.set('name', clean(d.name, 14));
  if (d.prizeSeen) store.set('prizeSeen', true);
  return true;
}
$('#svLoad').addEventListener('click', async () => {
  const raw = $('#svIn').value.trim(), short = normCode(raw), legacy = raw.replace(/[\s]+/g, '');
  const isShort = CODE_RE.test(short), isLegacy = !isShort && /^[A-Za-z0-9_-]{20,100}$/.test(legacy);
  if (!isShort && !isLegacy) return toast('Código inválido. Ele tem 8 letras e números, como ABCD-EFGH.');
  if (isShort ? short === rcode() : legacy === deviceId()) return toast('Esse já é o código deste aparelho.');
  if (!confirm('Recuperar o progresso desse código? Ele será juntado com o deste aparelho, e este celular fica com a posição do ranking do outro.')) return;
  const bt = $('#svLoad'); bt.disabled = true;
  const r = await rankCall(isShort ? { device: deviceId(), action: 'restore', code: short } : { device: legacy, action: 'restore' });
  bt.disabled = false;
  if (!r.ok) return toast(r.data.error || 'Não deu certo. Tente de novo.', 4500);
  mergeSave(r.data.data); store.set('rankPos', null);
  if (isShort) store.set('rcode', short); else store.set('dev', legacy);
  $('#inName').value = store.get('name', ''); $('#svIn').value = '';
  renderSettings(); cloudBackup(true); rankSync(true).then(() => loadTop(true));
  toast('Progresso recuperado! Fase ' + soloMax() + ' liberada.');
});
$('#inName').value = store.get('name', '');
$('#inName').addEventListener('animationend', e => e.target.classList.remove('shake'));
$('#inName').addEventListener('change', async () => {
  store.set('name', clean($('#inName').value, 14)); updateRankMe();
  const r = await rankSync(true); if (r && r.ok){ loadTop(true); toast('Apelido salvo no ranking!'); } else if (r) toast(r.data.error || 'Não consegui salvar no ranking agora.');
});
$('#btPlay').addEventListener('click', () => { sfx('start'); show('scrMenu'); refreshMenu(); });
$('#btToTitle').addEventListener('click', () => show('scrTitle'));
$('#btSolo').addEventListener('click', () => { if (!requireName()) return; renderWorlds(); show('scrSolo'); });
for (const b of document.querySelectorAll('[data-back]')) b.addEventListener('click', () => { show('scrMenu'); refreshMenu(); });
$('#btCreate').addEventListener('click', () => { if (requireName()) createOnline(); });
$('#btJoin').addEventListener('click', () => { if (requireName()) joinOnline($('#inCode').value); });
$('#inCode').addEventListener('keydown', e => { if (e.key === 'Enter' && requireName()) joinOnline($('#inCode').value); });
$('#inCode').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); });
$('#segKind').addEventListener('click', e => { const b = e.target.closest('button'); if (b && game.host) send(game.me[0], { t:'kind', k: b.dataset.k }); });
$('#btUltra').addEventListener('click', () => { if (!requireName()) return; renderUltra(); show('scrUltra'); });
$('#segRounds').addEventListener('click', e => { const b = e.target.closest('button'); if (b && game.host) send(game.me[0], { t:'rounds', n: +b.dataset.r }); });
$('#btStart').addEventListener('click', () => send(game.me[0], { t:'start' }));
$('#btLeave').addEventListener('click', () => toMenu());
$('#btWaitCancel').addEventListener('click', () => toMenu());
$('#btAgain').addEventListener('click', () => send(game.me[0], { t:'again' }));
$('#btFinalExit').addEventListener('click', () => toMenu());
$('#btNext').addEventListener('click', () => { const n = game.soloLevel + 1; if (game.soloKind === 'ultra') return startUltra(n); store.set('soloLast', n); startSolo(n); });
$('#btSoloMenu').addEventListener('click', () => toMenu());
$('#btClaim').addEventListener('click', showPrize);
$('#pzToggle').addEventListener('click', () => { const b = $('#pzToggle'), open = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', String(open)); $('#pzBody').hidden = !open; $('#pzShort').hidden = open; });
$('#btHow').addEventListener('click', () => { show('scrHow'); $('#scrHow').scrollTop = 0; });
$('#btPrizeBack').addEventListener('click', () => toMenu());
$('#pzName').addEventListener('input', updatePrizeLink);
$('#btResume').addEventListener('click', () => { game.paused = false; show(null); });
$('#btQuit').addEventListener('click', () => toMenu());
const PUBLIC_URL = 'https://pixellabirinto.vercel.app/';
function inviteLink(){ const base = /^https?:$/.test(location.protocol) ? location.origin + location.pathname : PUBLIC_URL; return base + '?sala=' + game.code; }
$('#btCopy').addEventListener('click', () => {
  const txt = 'Bora jogar Pixel Lab! Código da sala: ' + game.code + ' — ' + inviteLink();
  navigator.clipboard?.writeText(txt).then(() => toast('Convite copiado. Cole no WhatsApp.'), () => toast('Código: ' + game.code));
});
function waInvite(){ return 'https://wa.me/?text=' + encodeURIComponent('Bora jogar Pixel Lab comigo! 🎮\nEntra na minha sala com o código ' + game.code + ':\n' + inviteLink()); }

// botão voltar do celular (app Android): devolve true quando o jogo tratou
window.__fneonBack = () => {
  const vis = SCREENS.find(s => !$('#' + s).hidden);
  if (game.phase === 'play' && !vis){ openPause(); return true; }
  if (vis === 'scrPause'){ game.paused = false; show(null); return true; }
  if (vis === 'scrSettings'){ closeSettings(); return true; }
  if (vis === 'scrSolo' || vis === 'scrPrize' || vis === 'scrHow' || vis === 'scrUltra' || vis === 'scrRank'){ show('scrMenu'); refreshMenu(); return true; }
  if (vis === 'scrMenu'){ show('scrTitle'); return true; }
  if (vis && vis !== 'scrTitle'){ toMenu(); return true; }
  return false;
};
const IN_APP = /FugaNeonApp/.test(navigator.userAgent);
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (!IN_APP){ $('#appCard').hidden = false; $('#appAndroid').hidden = IS_IOS; $('#appIos').hidden = !IS_IOS; }

// endereço novo (Pixel Lab): quem abre o endereço antigo no navegador vai para o novo levando o progresso.
// O app Android continua no endereço antigo (o progresso dele fica lá) até sair uma versão nova do app.
const MAIN_HOST = 'pixellabirinto.vercel.app', OLD_HOSTS = ['pixelfuga.vercel.app', 'fuga-neon.vercel.app', 'pixellab8bit.vercel.app', 'pixellabgame.vercel.app'];
async function moveToNewHome(){
  if (IN_APP || !OLD_HOSTS.includes(location.hostname)) return;
  const has = soloMax() > 1 || store.get('name', '') || Object.keys(loadCamp().l).length || Object.keys(store.get('ultraBest', {})).length;
  let hash = '';
  if (has){ const r = await cloudBackup(true); if (!r || !r.ok) return; hash = '#migrar=' + deviceId(); } // sem internet: fica aqui por enquanto
  location.replace('https://' + MAIN_HOST + '/' + location.search + hash);
}
async function finishMove(){
  const m = /^#migrar=([A-Za-z0-9_-]{20,100})$/.exec(location.hash); if (!m) return;
  history.replaceState(null, '', location.pathname + location.search); // tira o código do endereço na hora
  if (m[1] === store.get('dev', '')) return;
  const r = await rankCall({ device: m[1], action: 'restore' });
  if (!r.ok) return toast('Não consegui trazer seu progresso. Use o código de recuperação em Configurações.', 5000);
  mergeSave(r.data.data); store.set('dev', m[1]); store.set('rankPos', null);
  $('#inName').value = store.get('name', ''); refreshMenu();
  toast('Bem-vindo ao Pixel Lab! Seu progresso veio junto.', 4000);
}
moveToNewHome(); finishMove();

buildLegend(); resize(); refreshMenu(); show('scrTitle');
// abrir pelo link de convite: vai direto para o menu com o código preenchido
const qs = new URLSearchParams(location.search).get('sala');
if (qs){ $('#inCode').value = clean(qs, 4).toUpperCase(); show('scrMenu'); setTimeout(() => { $('#inName').focus(); toast('Digite seu nome e toque em Entrar.'); }, 300); }
// guarda o jogo no aparelho (funciona sem internet depois da primeira visita)
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
requestAnimationFrame(frame);
// ferramentas de teste: só em ambiente local, nunca em produção
if (/^(127\.0\.0\.1|localhost)$/.test(location.hostname)){
  window.__fneon = { game, genLevel, analyze, noTraps, slide };
  Object.assign(window, { startSolo, startUltra, genUltra, slideUltra, toMenu, recordLevel, showPrize, onRunnerFinish, refreshMenu, Room, title });
}
})();
