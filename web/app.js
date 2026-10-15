'use strict';

// ---------------------------------------------------------------------------
// Config — add/remove metrics here. Keys become fields in the exported JSON.
// ---------------------------------------------------------------------------
const SCHEMA = 2;
const STORE_KEY = 'journo.v1';

const SCALES = [
  { key: 'diet', label: 'Food', min: 0, max: 10, step: 1, start: 5,
    stops: ['#d9483b', '#f08a3e', '#f2c94c', '#6fcf6a', '#2fae74'],
    tiers: [[0, 'junk'], [3, 'meh'], [5, 'mixed'], [7, 'clean'], [9, 'dialed in']] },
];

// Tap-to-pick rows. Stored as the option index, so the last option means "or more".
const PICKS = [
  { key: 'alcohol', label: 'Alcohol', card: 'scales', options: ['0', '1', '2', '3+'] },
  { key: 'sexPartner', label: 'Partner', card: 'intimacy', options: ['0', '1', '2+'] },
  { key: 'sexSolo', label: 'Solo', card: 'intimacy', options: ['0', '1', '2+'] },
];

// Exercise is a set of activities; nothing picked = rest day.
// Day intensity = the hardest thing you did: 2 intense, 1 moderate, 0 rest.
const INTENSITY = [
  { label: 'rest', color: '#8b8a96' },
  { label: 'moderate', color: '#4fb8ab' },
  { label: 'intense', color: '#ef6f5e' },
];
const EXERCISE = [
  { key: 'yoga', emoji: '🐅', label: 'Yoga', intensity: 2 },
  { key: 'bootcamp', emoji: '🏋️', label: 'Boot', intensity: 2 },
  { key: 'orangetheory', emoji: '🍊', label: 'OTF', intensity: 2 },
  { key: 'sweep', emoji: '🧹', label: 'Sweep', intensity: 1 },
  { key: 'other', emoji: '🚶', label: 'Other', intensity: 1 },
];
const dayIntensity = keys => Math.max(0, ...(keys || []).map(k => EXERCISE.find(x => x.key === k)?.intensity ?? 0));

// Simplified Willcox feelings wheel: core → secondary feelings.
const WHEEL = [
  { core: 'happy', color: '#f6c945', leaves: ['playful', 'content', 'interested', 'proud', 'accepted', 'powerful', 'peaceful', 'trusting', 'optimistic'] },
  { core: 'surprised', color: '#f39a4c', leaves: ['startled', 'confused', 'amazed', 'excited'] },
  { core: 'bad', color: '#93c46b', leaves: ['bored', 'busy', 'stressed', 'tired'] },
  { core: 'fearful', color: '#4fb8ab', leaves: ['scared', 'anxious', 'insecure', 'weak', 'rejected', 'threatened'] },
  { core: 'angry', color: '#e2615c', leaves: ['let down', 'humiliated', 'bitter', 'mad', 'aggressive', 'frustrated', 'distant', 'critical'] },
  { core: 'disgusted', color: '#a487d8', leaves: ['disapproving', 'disappointed', 'awful', 'repelled'] },
  { core: 'sad', color: '#5f8fe0', leaves: ['hurt', 'depressed', 'guilty', 'despair', 'vulnerable', 'lonely'] },
];

// ---------------------------------------------------------------------------
// Date helpers (all local time, no timezone surprises)
// ---------------------------------------------------------------------------
const pad = n => String(n).padStart(2, '0');
const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const localStamp = (d = new Date()) => `${localDate(d)}T${localTime(d)}`;
const parseDate = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (iso, n) => { const d = parseDate(iso); d.setDate(d.getDate() + n); return localDate(d); };
const dayDiff = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 864e5);
const prettyDate = iso => parseDate(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
const DEFAULT_SETTINGS = { backup: 'download' };

function newDraft(date = localDate()) {
  const d = { date, wake: null, bed: null, sleepRating: null, dayRating: null, dreams: [], moods: [], notes: [] };
  for (const s of SCALES) d[s.key] = null;
  for (const p of PICKS) d[p.key] = 0;
  d.exercise = [];
  return d;
}

function isEmpty(d) {
  return !d.wake && !d.bed && !d.notes.length && !d.dreams.length && !d.moods.length
    && d.sleepRating == null && d.dayRating == null
    && SCALES.every(s => d[s.key] == null) && PICKS.every(p => !d[p.key]) && !d.exercise?.length;
}

// Upgrades entries saved by earlier versions: exercise always an array (rest = []);
// "housework" → "sweep", "walk"/"misc" → "other"; single note → timestamped notes list; ratings and dreams added.
function migrate(d) {
  const { note, ...rest } = d;
  const renamed = { housework: 'sweep', walk: 'other', misc: 'other' };
  const exercise = (rest.exercise || []).map(k => renamed[k] || k);
  const notes = rest.notes || (note ? [{ t: `${rest.date}T12:00`, text: note }] : []);
  const whole = v => (v == null ? null : Math.ceil(v));
  return { ...rest, sleepRating: whole(rest.sleepRating), dayRating: whole(rest.dayRating), dreams: rest.dreams || [], exercise, notes };
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY));
    if (raw && raw.draft && raw.days) {
      const settings = { ...DEFAULT_SETTINGS, ...raw.settings };
      if (!['download', 'share'].includes(settings.backup)) settings.backup = DEFAULT_SETTINGS.backup;
      delete settings.shortcut;
      const days = Object.fromEntries(Object.entries(raw.days).map(([k, d]) => [k, migrate(d)]));
      return { ...raw, schema: SCHEMA, draft: migrate(raw.draft), days, settings };
    }
  } catch (e) { console.warn(e); }
  return { schema: SCHEMA, draft: newDraft(), days: {}, settings: { ...DEFAULT_SETTINGS } };
}

let db = load();
let draft = db.draft;

function save() {
  db.draft = draft;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
  catch (e) { toast('Could not save! Storage full?'); }
  renderHeader();
}

// An untouched draft from a previous day rolls forward to today (unless you picked that date on purpose).
function rollForward() {
  if (isEmpty(draft) && !draft.manualDate && draft.date < localDate()) { draft.date = localDate(); save(); }
}
rollForward();

navigator.storage?.persist?.();

const unbackedDays = () => Object.values(db.days).filter(d => !d.backedUpAt).map(d => d.date).sort();

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// In-app confirm. Unlike confirm(), the OK tap counts as a fresh gesture, so the share sheet can open after it.
function ask(text, okLabel) {
  return new Promise(resolve => {
    const dlg = $('askDialog');
    $('askText').textContent = text;
    $('askOk').textContent = okLabel;
    const done = v => { dlg.close(); $('askOk').onclick = $('askCancel').onclick = null; resolve(v); };
    $('askOk').onclick = () => done(true);
    $('askCancel').onclick = () => done(false);
    dlg.oncancel = () => done(false);
    dlg.showModal();
  });
}

function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return '#' + A.map((v, i) => pad(Math.round(v + (B[i] - v) * t).toString(16))).join('');
}
function sampleStops(stops, f) {
  const x = Math.min(1, Math.max(0, f)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  return mix(stops[i], stops[i + 1], x - i);
}

// Lets you tap anywhere on a slider to jump there (iOS only drags the thumb natively).
function enhanceRange(input, onChange) {
  input.style.touchAction = 'pan-y';
  const set = e => {
    const r = input.getBoundingClientRect();
    const min = +input.min, max = +input.max, step = +input.step || 1;
    const f = Math.min(1, Math.max(0, (e.clientX - r.left - 15) / (r.width - 30)));
    const v = min + Math.round((f * (max - min)) / step) * step;
    input.value = v;
    onChange(v);
  };
  input.addEventListener('pointerdown', e => { set(e); input.setPointerCapture?.(e.pointerId); });
  input.addEventListener('pointermove', e => { if (e.pressure > 0 || e.buttons) set(e); });
  input.addEventListener('input', () => onChange(+input.value));
}

// ---------------------------------------------------------------------------
// Header & entry date
// ---------------------------------------------------------------------------
function renderHeader() {
  const today = localDate();
  $('draftDate').textContent = prettyDate(draft.date);
  $('dateInput').value = draft.date;
  $('dateInput').max = today;

  const n = Object.keys(db.days).length;
  const pending = unbackedDays().length;
  $('draftSub').textContent = `${n} day${n === 1 ? '' : 's'} archived` + (pending ? ` · ${pending} not backed up` : ' · all backed up');
  $('draftSub').classList.toggle('warn', pending > 0);

  const banner = $('staleBanner');
  banner.hidden = true;
  if (draft.date >= today) return;
  if (draft.manualDate) {
    banner.hidden = false;
    banner.textContent = `Back-filling ${prettyDate(draft.date)}. End day to save it and return to today.`;
  } else if (draft.date < addDays(today, -1) || new Date().getHours() >= 10) {
    banner.hidden = false;
    banner.textContent = `You're still logging ${prettyDate(draft.date)}. Add a bed time and end that day to start today.`;
  }
}

function changeDate(to) {
  const from = draft.date;
  if (!to || to === from) return;
  if (to > localDate()) { toast("Can't log the future"); return renderHeader(); }

  if (db.days[to]) {
    if (!isEmpty(draft)) {
      alert(`${prettyDate(to)} is already saved. End or clear this entry first, then pick that date again to edit it.`);
      return renderHeader();
    }
    if (!confirm(`${prettyDate(to)} is already saved. Open it for editing?`)) return renderHeader();
    return loadSaved(to);
  }

  // Same entry, different date: carry its timestamps along.
  const shift = s => s && addDays(s.slice(0, 10), dayDiff(from, to)) + s.slice(10);
  draft.date = to;
  draft.wake = shift(draft.wake);
  draft.bed = shift(draft.bed);
  draft.moods.forEach(m => { m.t = shift(m.t); });
  draft.manualDate = to !== localDate();
  save();
  renderToday();
  toast(`Now logging ${prettyDate(to)}`);
}

function loadSaved(date) {
  const { savedAt, backedUpAt, backfill, ...d } = db.days[date];
  delete db.days[date];
  draft = { ...newDraft(date), ...d, manualDate: date !== localDate() };
  save();
  renderToday();
  showView('today');
  toast(`Editing ${prettyDate(date)}`);
}

// Live logging uses the real clock; back-filling puts the time on the entry's own date.
function nowStamp() {
  const real = localStamp();
  const today = real.slice(0, 10);
  if (draft.date === today) return real;
  if (addDays(draft.date, 1) === today && new Date().getHours() < 6) return real;
  return `${draft.date}T${localTime()}`;
}

// ---------------------------------------------------------------------------
// Sleep times
// ---------------------------------------------------------------------------
// wake belongs to the draft's date; a bed time before noon is assumed to be after midnight.
function timeToStamp(key, hhmm) {
  if (!hhmm) return null;
  const date = key === 'bed' && +hhmm.slice(0, 2) < 12 ? addDays(draft.date, 1) : draft.date;
  return `${date}T${hhmm}`;
}

const fmt12 = stamp => {
  const h = +stamp.slice(11, 13), m = stamp.slice(14, 16);
  return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
};

function setTime(key, hhmm) {
  draft[key] = timeToStamp(key, hhmm);
  save();
  renderTimes();
}

function bindTimes() {
  for (const key of ['wake', 'bed']) $(key).addEventListener('click', () => openPad(key));
  document.querySelectorAll('[data-now]').forEach(b => b.addEventListener('click', () => {
    const key = b.dataset.now;
    setTime(key, localTime());
    toast(`${key === 'wake' ? 'Wake' : 'Bed'} time set`);
  }));
}

function renderTimes() {
  for (const key of ['wake', 'bed']) {
    $(key).textContent = draft[key] ? fmt12(draft[key]) : 'set time';
    $(key).classList.toggle('notset', !draft[key]);
  }
}

// ---------------------------------------------------------------------------
// Time keypad: type 7-3-0 for 7:30, 1-1-4-5 for 11:45, then AM/PM.
// ---------------------------------------------------------------------------
const pad$ = { key: null, h: '', m: '', pm: false, fresh: false };

// Hours are 1–12. A leading "1" waits to see if it's 10/11/12; minutes are 00–59.
const hourDone = () => pad$.h.length === 2 || (pad$.h !== '' && pad$.h !== '1') || pad$.m.length > 0;

function padValid(d) {
  const { h, m } = pad$;
  if (h === '') return d !== '0';
  if (!hourDone()) return d <= '5'; // after "1": 0–2 → 10–12, 3–5 → 1:3x–1:5x
  if (m.length === 0) return d <= '5';
  return m.length < 2;
}

function padPress(d) {
  if (pad$.fresh) { pad$.h = ''; pad$.m = ''; pad$.fresh = false; }
  if (!padValid(d)) return;
  if (pad$.h === '' || (!hourDone() && d <= '2')) pad$.h += d;
  else pad$.m += d;
  paintPad();
}

function padDelete() {
  pad$.fresh = false;
  if (pad$.m) pad$.m = pad$.m.slice(0, -1);
  else pad$.h = pad$.h.slice(0, -1);
  paintPad();
}

function padLoad(hhmm) {
  const H = +hhmm.slice(0, 2);
  pad$.h = String(H % 12 || 12);
  pad$.m = hhmm.slice(3, 5);
  pad$.pm = H >= 12;
}

function paintPad() {
  const { h, m, fresh } = pad$;
  const ghost = s => `<span class="ghostdigit">${s}</span>`;
  const hh = h || ghost('--');
  const mm = (m || '') + ghost('-'.repeat(2 - m.length)).replace(/<span class="ghostdigit"><\/span>/, '');
  $('padTime').innerHTML = `${hh}:${mm}`;
  $('padTime').style.opacity = fresh ? 0.55 : 1;
  document.querySelectorAll('.ampm button').forEach(b => b.classList.toggle('active', (b.dataset.ap === 'pm') === pad$.pm));
  document.querySelectorAll('#padKeys [data-k]').forEach(b => {
    if (/^\d$/.test(b.dataset.k)) b.disabled = !fresh && !padValid(b.dataset.k);
  });
  $('padSet').disabled = !h || m.length === 1;
}

function openPad(key) {
  pad$.key = key;
  pad$.fresh = !!draft[key];
  if (draft[key]) padLoad(draft[key].slice(11));
  else { pad$.h = ''; pad$.m = ''; pad$.pm = key === 'bed'; }
  $('padTitle').textContent = key === 'wake' ? 'Woke up' : 'Bed time';
  paintPad();
  $('padDialog').showModal();
}

function bindPad() {
  $('padKeys').addEventListener('click', e => {
    const k = e.target.closest('button')?.dataset.k;
    if (!k) return;
    if (k === 'del') padDelete();
    else if (k === 'now') { padLoad(localTime()); pad$.fresh = false; paintPad(); }
    else padPress(k);
  });
  document.querySelectorAll('.ampm button').forEach(b => b.addEventListener('click', () => { pad$.pm = b.dataset.ap === 'pm'; paintPad(); }));
  $('padSet').addEventListener('click', () => {
    const H = (+pad$.h % 12) + (pad$.pm ? 12 : 0);
    setTime(pad$.key, `${pad(H)}:${pad$.m || '00'}`);
    $('padDialog').close();
  });
  $('padClear').addEventListener('click', () => { draft[pad$.key] = null; save(); renderTimes(); $('padDialog').close(); });
  $('padCancel').addEventListener('click', () => $('padDialog').close());
}

// ---------------------------------------------------------------------------
// Sliders, picks & exercise
// ---------------------------------------------------------------------------
const tierOf = (s, v) => s.tiers?.filter(([min]) => v >= min).pop()?.[1];

function scaleEl(s) {
  const wrap = el('div', 'scale');
  const head = el('div', 'scalehead');
  const left = el('span');
  left.append(el('span', 'name', s.label));
  if (s.hint) left.append(el('span', 'hint', s.hint));
  const right = el('span');
  const val = el('span', 'val');
  const clear = el('button', 'clear', '×');
  clear.setAttribute('aria-label', `Clear ${s.label}`);
  right.append(val, clear);
  head.append(left, right);

  const input = el('input', 'grad');
  Object.assign(input, { type: 'range', min: s.min, max: s.max, step: s.step });
  input.style.setProperty('--grad', `linear-gradient(90deg, ${s.stops.join(', ')})`);

  const paint = () => {
    const v = draft[s.key];
    input.classList.toggle('unset', v == null);
    input.value = v ?? s.start;
    val.textContent = v == null ? '—' : [v + (s.unit ? ' ' + s.unit : ''), tierOf(s, v)].filter(Boolean).join(' · ');
    clear.style.visibility = v == null ? 'hidden' : 'visible';
  };
  enhanceRange(input, v => { if (draft[s.key] !== v) { draft[s.key] = v; save(); } paint(); });
  clear.addEventListener('click', () => { draft[s.key] = null; save(); paint(); });

  paint();
  wrap.append(head, input);
  return wrap;
}

function pickEl(p, cls = 'pickrow') {
  const row = el('div', cls);
  const pills = el('div', 'pills');
  const paint = () => pills.querySelectorAll('button').forEach((b, i) => b.classList.toggle('active', i === draft[p.key]));
  p.options.forEach((label, i) => {
    const b = el('button', null, label);
    b.addEventListener('click', () => { draft[p.key] = i; save(); paint(); });
    pills.append(b);
  });
  paint();
  row.append(el('span', 'name', p.label), pills);
  return row;
}

function renderScales() {
  const box = $('scales');
  box.replaceChildren(el('h2', null, 'Today'));
  for (const s of SCALES) box.append(scaleEl(s));
  for (const p of PICKS.filter(p => p.card === 'scales')) box.append(pickEl(p));

  const intimacy = $('intimacy');
  const cols = el('div', 'pickcols');
  for (const p of PICKS.filter(p => p.card === 'intimacy')) cols.append(pickEl(p, 'pickcol'));
  intimacy.replaceChildren(el('h2', null, 'Intimacy'), cols);
}

function renderExercise() {
  const box = $('exercise');
  const list = draft.exercise;
  const level = INTENSITY[dayIntensity(list)];
  const h = el('h2', 'split');
  const tag = el('span', 'intensity', level.label);
  tag.style.color = level.color;
  h.append(el('span', null, 'Movement'), tag);
  box.replaceChildren(h);

  const row = el('div', 'emojis');
  for (const x of EXERCISE) {
    const b = el('button', list.includes(x.key) ? 'emo on' : 'emo');
    b.style.setProperty('--c', INTENSITY[x.intensity].color);
    b.append(el('span', 'e', x.emoji), el('span', 'l', x.label));
    b.addEventListener('click', () => {
      draft.exercise = list.includes(x.key) ? list.filter(k => k !== x.key) : [...list, x.key];
      save();
      renderExercise();
    });
    row.append(b);
  }
  box.append(row);
}

// ---------------------------------------------------------------------------
// Emotion wheel
// ---------------------------------------------------------------------------
const SVGNS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const R_HUB = 30, R_CORE = 92, R_LEAF = 158;
let pick = null; // { core, feeling }

function arcPath(r0, r1, a0, a1) {
  const p = (r, a) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(r1, a0)}A${r1} ${r1} 0 ${large} 1 ${p(r1, a1)}L${p(r0, a1)}A${r0} ${r0} 0 ${large} 0 ${p(r0, a0)}Z`;
}

function radialText(label, r, a, cls) {
  let deg = (a * 180) / Math.PI;
  const norm = ((deg % 360) + 360) % 360;
  if (norm > 90 && norm < 270) deg += 180;
  const x = (r * Math.cos(a)).toFixed(2), y = (r * Math.sin(a)).toFixed(2);
  const t = svg('text', { x, y, class: cls, transform: `rotate(${deg.toFixed(1)} ${x} ${y})` });
  t.textContent = label;
  return t;
}

function feelingColor(core, feeling) {
  const c = WHEEL.find(w => w.core === core);
  if (!c) return '#888';
  return feeling ? mix(c.color, '#ffffff', 0.38) : c.color;
}

function buildWheel() {
  const root = $('wheel');
  const total = WHEEL.reduce((s, c) => s + c.leaves.length, 0);
  const step = (2 * Math.PI) / total;
  let a = -Math.PI / 2;
  for (const c of WHEEL) {
    const a0 = a, a1 = a + step * c.leaves.length;
    const corePath = svg('path', { d: arcPath(R_HUB, R_CORE, a0, a1), fill: c.color });
    corePath.dataset.core = c.core;
    root.append(corePath, radialText(c.core, (R_HUB + R_CORE) / 2 + 4, (a0 + a1) / 2, 'core'));
    c.leaves.forEach((leaf, i) => {
      const b0 = a0 + step * i, b1 = b0 + step;
      const p = svg('path', { d: arcPath(R_CORE, R_LEAF, b0, b1), fill: feelingColor(c.core, leaf) });
      p.dataset.core = c.core;
      p.dataset.feeling = leaf;
      root.append(p, radialText(leaf, (R_CORE + R_LEAF) / 2, (b0 + b1) / 2, 'leaf'));
    });
    a = a1;
  }
  root.append(svg('circle', { r: R_HUB - 1, class: 'hub' }));
  const hub = svg('text', { class: 'hubtext', 'text-anchor': 'middle', 'dominant-baseline': 'middle' });
  hub.textContent = 'feel';
  root.append(hub);

  root.addEventListener('click', e => {
    const p = e.target.closest('path');
    if (!p) return;
    const next = { core: p.dataset.core, feeling: p.dataset.feeling || null };
    pick = pick && pick.core === next.core && pick.feeling === next.feeling ? null : next;
    paintWheel();
  });
}

function paintWheel() {
  for (const p of $('wheel').querySelectorAll('path')) {
    const sel = pick && p.dataset.core === pick.core && (p.dataset.feeling || null) === pick.feeling;
    p.classList.toggle('sel', !!sel);
    p.classList.toggle('dim', !!pick && p.dataset.core !== pick.core);
  }
  $('moodPick').hidden = !pick;
  if (pick) {
    $('moodName').textContent = pick.feeling ? `${pick.feeling} · ${pick.core}` : pick.core;
    $('moodName').style.color = feelingColor(pick.core, pick.feeling);
  }
}

function renderMoods() {
  const list = $('moodList');
  list.replaceChildren();
  draft.moods.forEach((m, idx) => {
    const li = el('li');
    const dot = el('span', 'dot');
    dot.style.background = feelingColor(m.core, m.feeling);
    const del = el('button', null, '×');
    del.addEventListener('click', () => { draft.moods.splice(idx, 1); save(); renderMoods(); });
    li.append(dot, el('span', 't', m.t.slice(11)), el('span', 'f', m.feeling || m.core),
      el('span', 'i', '●'.repeat(m.intensity) + '○'.repeat(5 - m.intensity)), del);
    list.append(li);
  });
}

// ---------------------------------------------------------------------------
// Text logs (notes, dreams): timestamped one-liners
// ---------------------------------------------------------------------------
const LOGS = ['notes', 'dreams'];

function renderLog(key) {
  const list = $(`${key}List`);
  list.replaceChildren();
  draft[key].forEach((n, idx) => {
    const li = el('li');
    const del = el('button', null, '×');
    del.addEventListener('click', () => { draft[key].splice(idx, 1); save(); renderLog(key); });
    li.append(el('span', 't', n.t.slice(11)), el('span', 'txt', n.text), del);
    list.append(li);
  });
}

function bindLog(key) {
  $(`${key}Form`).addEventListener('submit', e => {
    e.preventDefault();
    const input = $(`${key}Input`);
    const text = input.value.trim();
    if (!text) return;
    draft[key].push({ t: nowStamp(), text });
    draft[key].sort((a, b) => a.t.localeCompare(b.t));
    input.value = '';
    input.blur();
    save();
    renderLog(key);
  });
}

// ---------------------------------------------------------------------------
// Ratings: 1–5 whole steps. Tap a symbol (or drag across). Glyph comes from data-glyph (default ★).
// ---------------------------------------------------------------------------
function buildStars(box) {
  const key = box.dataset.rate;
  const track = el('div', 'track');
  for (let i = 0; i < 5; i++) track.append(el('span', 'g', box.dataset.glyph || '★'));
  const val = el('span', 'val');
  const clear = el('button', 'clear', '×');
  clear.setAttribute('aria-label', 'Clear rating');
  box.append(track, val, clear);

  const set = e => {
    const r = track.getBoundingClientRect();
    const v = Math.min(5, Math.max(1, Math.ceil(((e.clientX - r.left) / r.width) * 5)));
    if (draft[key] !== v) { draft[key] = v; save(); paintStars(box); }
  };
  track.style.touchAction = 'pan-y';
  track.addEventListener('pointerdown', e => { set(e); track.setPointerCapture?.(e.pointerId); });
  track.addEventListener('pointermove', e => { if (e.pressure > 0 || e.buttons) set(e); });
  clear.addEventListener('click', () => { draft[key] = null; save(); paintStars(box); });
}

function paintStars(box) {
  const v = draft[box.dataset.rate];
  box.querySelectorAll('.g').forEach((g, i) => g.classList.toggle('on', i < (v || 0)));
  box.querySelector('.val').textContent = v == null ? '—' : String(v);
  box.querySelector('.clear').style.visibility = v == null ? 'hidden' : 'visible';
}

function bindMood() {
  const int = $('moodInt');
  int.style.setProperty('--grad', 'linear-gradient(90deg, #3a3a48, #b9a6ff, #ffffff)');
  enhanceRange(int, v => { $('moodIntVal').textContent = v; });
  $('moodCancel').addEventListener('click', () => { pick = null; paintWheel(); });
  $('moodLog').addEventListener('click', () => {
    if (!pick) return;
    draft.moods.push({ t: nowStamp(), core: pick.core, feeling: pick.feeling, intensity: +int.value });
    draft.moods.sort((a, b) => a.t.localeCompare(b.t));
    save();
    toast(`Logged ${pick.feeling || pick.core}`);
    pick = null;
    paintWheel();
    renderMoods();
  });
}

// ---------------------------------------------------------------------------
// End day
// ---------------------------------------------------------------------------
async function endDay() {
  if (isEmpty(draft)) return toast('Nothing logged yet');
  if (!draft.bed && !await ask('No bed time set. Save the day anyway?', 'Save anyway')) return;
  if (db.days[draft.date] && !await ask(`${prettyDate(draft.date)} is already saved. Replace it?`, 'Replace')) return;

  const { manualDate, ...day } = draft;
  const date = day.date;
  if (localDate() > addDays(date, 1)) day.backfill = true;
  db.days[date] = { ...day, savedAt: new Date().toISOString() };

  const next = addDays(date, 1);
  draft = newDraft(manualDate || next <= localDate() ? localDate() : next);
  save();
  renderToday();
  await backupDay(date);
}

function clearEntry() {
  if (isEmpty(draft) && !draft.manualDate) return toast('Already empty');
  if (!confirm(`Clear everything logged for ${prettyDate(draft.date)}? This does not touch the archive.`)) return;
  draft = newDraft();
  save();
  renderToday();
  toast('Entry cleared');
}

// ---------------------------------------------------------------------------
// Backup: download (iCloud Downloads) or share sheet
// ---------------------------------------------------------------------------
// Sleep hours = this morning's wake minus the previous day's bed time.
// exerciseIntensity comes from the EXERCISE table: 2 intense, 1 moderate, 0 rest.
function withDerived(days) {
  return days.map(d => {
    const prev = db.days[addDays(d.date, -1)];
    const { backedUpAt, ...out } = d;
    out.exerciseIntensity = dayIntensity(d.exercise);
    if (prev?.bed && d.wake) {
      const h = (new Date(d.wake) - new Date(prev.bed)) / 36e5;
      if (h > 0 && h < 24) out.sleepHours = Math.round(h * 100) / 100;
    }
    return out;
  });
}

function payload(range, days, filename) {
  return { filename, app: 'journo', schema: SCHEMA, exportedAt: new Date().toISOString(), range, days: withDerived(days) };
}

const dayPayload = date => payload(date, [db.days[date]], `journo-${date}.json`);

function markBackedUp(dates) {
  const now = new Date().toISOString();
  for (const d of dates) if (db.days[d]) db.days[d].backedUpAt = now;
  save();
  if (!$('view-archive').hidden) renderArchive();
}

function downloadJSON(obj) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
  a.download = obj.filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return true;
}

// Resolves true if the file was handed off, false if cancelled.
async function shareJSON(obj) {
  const text = JSON.stringify(obj, null, 2);
  for (const type of ['application/json', 'text/plain']) {
    const file = new File([text], obj.filename, { type });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return true; }
      catch (e) { if (e.name === 'AbortError') return false; }
    }
  }
  return downloadJSON(obj);
}

const saveFile = obj => (db.settings.backup === 'share' ? shareJSON(obj) : downloadJSON(obj));

async function backupDay(date) {
  if (await saveFile(dayPayload(date))) {
    markBackedUp([date]);
    toast('Saved & backed up. Good night ✦');
  } else {
    toast('Saved on phone · backup cancelled');
  }
}

async function backupAll() {
  const days = sortedDays();
  if (!days.length) return toast('Nothing archived yet');
  const ok = await saveFile(payload('all', days, `journo-all-${localDate()}.json`));
  if (ok) markBackedUp(days.map(d => d.date));
}

async function exportMonth(month) {
  const days = sortedDays().filter(d => d.date.startsWith(month));
  const ok = await saveFile(payload(month, days, `journo-${month}.json`));
  if (ok) markBackedUp(days.map(d => d.date));
}

async function importFile(file) {
  try {
    const data = JSON.parse(await file.text());
    const days = Array.isArray(data.days) ? data.days : data.date ? [data] : [];
    const now = new Date().toISOString();
    let added = 0, skipped = 0;
    for (const d of days) {
      if (!d.date) continue;
      if (db.days[d.date]) { skipped++; continue; }
      const { sleepHours, ...clean } = d;
      db.days[d.date] = { ...clean, backedUpAt: now }; // it already lives in that file
      added++;
    }
    save();
    renderArchive();
    toast(`Imported ${added} day${added === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} existing` : ''}`);
  } catch (e) {
    toast('Could not read that file');
  }
}

// ---------------------------------------------------------------------------
// Archive view
// ---------------------------------------------------------------------------
const sortedDays = () => Object.values(db.days).sort((a, b) => a.date.localeCompare(b.date));

function dayStrip(d) {
  const strip = el('div', 'strip');
  for (const s of SCALES) {
    const seg = el('span');
    if (d[s.key] != null) seg.style.background = sampleStops(s.stops, (d[s.key] - s.min) / (s.max - s.min));
    strip.append(seg);
  }
  for (const k of d.exercise || []) {
    const x = EXERCISE.find(e => e.key === k);
    const seg = el('span');
    if (x) seg.style.background = INTENSITY[x.intensity].color;
    strip.append(seg);
  }
  for (const m of d.moods || []) {
    const seg = el('span');
    seg.style.background = feelingColor(m.core, m.feeling);
    strip.append(seg);
  }
  return strip;
}

function renderBackupSettings() {
  const mode = db.settings.backup;
  document.querySelectorAll('#backupMode button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $('backupHelp').textContent = {
    download: 'End day saves journo-YYYY-MM-DD.json to Files › Downloads (iCloud Drive/Downloads by default).',
    share: 'End day opens the share sheet. Pick Save to Files and a folder; iOS remembers the last one.',
  }[mode];

  const pending = unbackedDays();
  $('unbacked').hidden = !pending.length;
  $('unbackedText').textContent = `${pending.length} day${pending.length === 1 ? '' : 's'} not backed up yet`;
}

function renderArchive() {
  renderBackupSettings();
  const box = $('months');
  box.replaceChildren();
  const days = sortedDays().reverse();
  if (!days.length) { box.append(el('div', 'empty', 'No saved days yet. End your first day tonight.')); return; }

  const byMonth = new Map();
  for (const d of days) {
    const m = d.date.slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m).push(d);
  }
  for (const [month, list] of byMonth) {
    const card = el('section', 'card month');
    const h = el('h2');
    const title = parseDate(`${month}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const btn = el('button', 'ghost', 'Export month');
    btn.addEventListener('click', () => exportMonth(month));
    h.append(el('span', null, `${title} · ${list.length}`), btn);
    card.append(h);
    for (const d of list) {
      const row = el('div', 'dayrow');
      const mark = el('span', d.backedUpAt ? 'bk ok' : 'bk', d.backedUpAt ? '☁︎' : '●');
      mark.title = d.backedUpAt ? 'Backed up' : 'Not backed up yet';
      row.append(el('span', 'd', prettyDate(d.date).replace(/,.*/, '') + ' ' + d.date.slice(8)), dayStrip(d), mark);
      row.addEventListener('click', () => openDay(d.date));
      card.append(row);
    }
    box.append(card);
  }
}

let openDate = null;
function openDay(date) {
  openDate = date;
  $('dayJson').textContent = JSON.stringify(withDerived([db.days[date]])[0], null, 2);
  $('dayDialog').showModal();
}

function bindArchive() {
  document.querySelectorAll('#backupMode button').forEach(b => b.addEventListener('click', () => {
    db.settings.backup = b.dataset.mode;
    save();
    renderBackupSettings();
  }));
  $('backupNow').addEventListener('click', backupAll);

  $('exportAll').addEventListener('click', backupAll);
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', e => { if (e.target.files[0]) importFile(e.target.files[0]); e.target.value = ''; });
  $('clearAll').addEventListener('click', () => {
    if (!confirm('Delete ALL saved days and today\'s draft from this phone?')) return;
    if (!confirm('Really? Export first if you want a backup. This cannot be undone.')) return;
    db = { schema: SCHEMA, draft: newDraft(), days: {}, settings: db.settings };
    draft = db.draft;
    save();
    renderToday();
    renderArchive();
    toast('All data cleared');
  });

  $('dayShare').addEventListener('click', async () => { if (await saveFile(dayPayload(openDate))) markBackedUp([openDate]); });
  $('dayClose').addEventListener('click', () => $('dayDialog').close());
  $('dayDelete').addEventListener('click', () => {
    if (!confirm(`Delete ${prettyDate(openDate)}?`)) return;
    delete db.days[openDate];
    save();
    $('dayDialog').close();
    renderArchive();
  });
  $('dayReopen').addEventListener('click', () => {
    if (!isEmpty(draft) && !confirm('Your current entry will be replaced by this saved day. Continue?')) return;
    $('dayDialog').close();
    loadSaved(openDate);
  });
}

// ---------------------------------------------------------------------------
// Views & boot
// ---------------------------------------------------------------------------
function showView(name) {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  $('view-today').hidden = name !== 'today';
  $('view-archive').hidden = name !== 'archive';
  if (name === 'archive') renderArchive();
  window.scrollTo(0, 0);
}

function renderToday() {
  renderHeader();
  renderTimes();
  renderScales();
  renderExercise();
  renderMoods();
  LOGS.forEach(renderLog);
  document.querySelectorAll('.stars').forEach(paintStars);
}

document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
$('dateInput').addEventListener('change', e => changeDate(e.target.value));
LOGS.forEach(bindLog);
document.querySelectorAll('.stars').forEach(buildStars);
$('endDay').addEventListener('click', endDay);
$('clearEntry').addEventListener('click', clearEntry);

// Coming back to the app after hours away: re-check the date.
document.addEventListener('visibilitychange', () => { if (!document.hidden) { rollForward(); renderHeader(); } });

bindTimes();
buildWheel();
bindMood();
bindPad();
bindArchive();
renderToday();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
