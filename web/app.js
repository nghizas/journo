'use strict';

// ---------------------------------------------------------------------------
// Config — add/remove metrics here. Keys become fields in the exported JSON.
// ---------------------------------------------------------------------------
const SCHEMA = 5;
const STORE_KEY = 'journo.v1';

// Each meal is skipped (null, the default) or a 0–4 rating: trash, junk, mixed, clean, dialed.
const MEALS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'other', label: 'Other' },
];
const FOOD = {
  tiers: ['trash', 'junk', 'mixed', 'clean', 'dialed'],
  stops: ['#d9483b', '#f08a3e', '#f2c94c', '#6fcf6a', '#2fae74'],
};
const emptyMeals = () => Object.fromEntries(MEALS.map(m => [m.key, null]));

// Pages read: 0–50 in steps of 5; 50 means 50+.
const PAGES = { max: 50, step: 5 };

// Drinks are logged one tap at a time with the time you had them; the count comes from the list.
const DRINKS = [
  { key: 'caffeineLog', count: 'caffeine', emoji: '☕', label: 'Caffeine' },
  { key: 'alcoholLog', count: 'alcohol', emoji: '🍷', label: 'Alcohol' },
];

// Productivity: one end-of-day score, 0–4. null = not rated.
const PRODUCTIVITY = {
  tiers: ['jack shit', 'phoned it in', 'got by', 'crushed it', 'full scale domination'],
  emojis: ['💩', '☎️', '👍', '💪', '👑'],
  stops: ['#4b5563', '#55707f', '#4f95a6', '#2fc6d6', '#00f0ff'],
};

// Social: one entry per interaction that mattered. effect −2 drained … +2 recharged. No entries = a day alone.
const SOCIAL = {
  who: ['partner', 'family', 'friends', 'work', 'new people'],
  effects: [[-2, 'drained', '#5f8fe0'], [-1, 'flat', '#8b8a96'], [0, 'fine', '#c9c6d4'], [1, 'good', '#93c46b'], [2, 'recharged', '#f6c945']],
};

const DREAM_RECALL = [['none', 'none'], ['forgot', 'yes, forgot'], ['remember', 'yes, remember']];

// Starting tag list; you can add/remove tags in the app (kept in settings, not per day).
const DEFAULT_TAGS = ['sick', 'headache', 'hungover', 'injured', 'day off', 'travel', 'late night', 'ate out', 'big screen day'];

// Thayer's energy model: energy (tired 1 → energized 5) × tension (calm 1 → tense 5), tapped on a 5×5 square.
// Corner colors: calm-energy, tense-energy, calm-tired, tense-tired.
const ENERGY = { size: 5, corners: { tl: '#f6c945', tr: '#e2615c', bl: '#7fd6a0', br: '#5f8fe0' } };

// Tap-to-pick rows. Stored as the option index, so the last option means "or more".
const PICKS = [
  { key: 'sexPartner', label: 'Partner', card: 'intimacy', options: ['0', '1', '2+'] },
  { key: 'sexSolo', label: 'Solo', card: 'intimacy', options: ['0', '1', '2+'] },
];

// Exercise: a list of sessions { t, type, minutes, effort }. null = not logged, [] = rest day.
// Activities (type, emoji, default minutes/effort) are editable in the app and kept in settings.
const EFFORT = [
  { label: 'easy', color: '#7fb6e0' },
  { label: 'moderate', color: '#4fb8ab' },
  { label: 'hard', color: '#ef6f5e' },
];
const REST_COLOR = '#4a4a56';
const MINUTE_STEPS = [10, 15, 20, 30, 45, 60, 75, 90, 120];
const STARTER_ACTIVITIES = [
  { key: 'walk', emoji: '🚶', label: 'Walk', minutes: 30, effort: 0 },
  { key: 'run', emoji: '🏃', label: 'Run', minutes: 30, effort: 2 },
  { key: 'bike', emoji: '🚴', label: 'Bike', minutes: 45, effort: 1 },
  { key: 'lift', emoji: '🏋️', label: 'Lift', minutes: 45, effort: 2 },
  { key: 'yoga', emoji: '🧘', label: 'Yoga', minutes: 60, effort: 1 },
  { key: 'swim', emoji: '🏊', label: 'Swim', minutes: 30, effort: 1 },
  { key: 'sport', emoji: '⚽', label: 'Sport', minutes: 60, effort: 2 },
  { key: 'other', emoji: '➕', label: 'Other', minutes: 30, effort: 1 },
];
// The set this app grew up with; used instead of the starter set if your history already has these.
const ORIGINAL_ACTIVITIES = [
  { key: 'yoga', emoji: '🐅', label: 'Yoga', minutes: 60, effort: 2 },
  { key: 'bootcamp', emoji: '🏋️', label: 'Boot', minutes: 45, effort: 2 },
  { key: 'orangetheory', emoji: '🍊', label: 'OTF', minutes: 60, effort: 2 },
  { key: 'other', emoji: '🚶', label: 'Other', minutes: 30, effort: 1 },
];
// Effort for days logged before sessions existed (a list of activity names).
const LEGACY_EFFORT = { yoga: 2, bootcamp: 2, orangetheory: 2, sweep: 1, other: 1 };
const dayEffort = list => (list?.length ? Math.max(...list.map(x => x.effort)) : null);
const dayMinutes = list => (list || []).reduce((s, x) => s + (x.minutes || 0), 0);

// Willcox feelings wheel: core → feeling (wheel ring) → nuance (chips after you pick a feeling).
// "calm" is our addition: the original wheel has no low-energy, okay-to-good states.
const WHEEL = [
  { core: 'happy', color: '#f6c945', leaves: {
    playful: ['aroused', 'cheeky'], content: ['free', 'joyful'], interested: ['curious', 'inquisitive'],
    proud: ['successful', 'confident'], accepted: ['respected', 'valued'], powerful: ['courageous', 'creative'],
    peaceful: ['loving', 'thankful'], trusting: ['sensitive', 'intimate'], optimistic: ['hopeful', 'inspired'] } },
  { core: 'surprised', color: '#f39a4c', leaves: {
    startled: ['shocked', 'dismayed'], confused: ['disillusioned', 'perplexed'],
    amazed: ['astonished', 'awe'], excited: ['eager', 'energetic'] } },
  { core: 'bad', color: '#93c46b', leaves: {
    bored: ['indifferent', 'apathetic'], busy: ['pressured', 'rushed'],
    stressed: ['overwhelmed', 'out of control'], tired: ['sleepy', 'unfocused'] } },
  { core: 'fearful', color: '#4fb8ab', leaves: {
    scared: ['helpless', 'frightened'], anxious: ['overwhelmed', 'worried'], insecure: ['inadequate', 'inferior'],
    weak: ['worthless', 'insignificant'], rejected: ['excluded', 'persecuted'], threatened: ['nervous', 'exposed'] } },
  { core: 'angry', color: '#e2615c', leaves: {
    'let down': ['betrayed', 'resentful'], humiliated: ['disrespected', 'ridiculed'], bitter: ['indignant', 'violated'],
    mad: ['furious', 'jealous'], aggressive: ['provoked', 'hostile'], frustrated: ['infuriated', 'annoyed'],
    distant: ['withdrawn', 'numb'], critical: ['skeptical', 'dismissive'] } },
  { core: 'disgusted', color: '#a487d8', leaves: {
    disapproving: ['judgmental', 'embarrassed'], disappointed: ['appalled', 'revolted'],
    awful: ['nauseated', 'detestable'], repelled: ['horrified', 'hesitant'] } },
  { core: 'sad', color: '#5f8fe0', leaves: {
    hurt: ['embarrassed', 'disappointed'], depressed: ['inferior', 'empty'], guilty: ['remorseful', 'ashamed'],
    despair: ['powerless', 'grief'], vulnerable: ['fragile', 'victimized'], lonely: ['abandoned', 'isolated'] } },
  { core: 'calm', color: '#7fd6a0', leaves: {
    relaxed: ['at ease', 'unhurried'], rested: ['refreshed', 'recharged'], focused: ['absorbed', 'in flow'],
    relieved: ['lighter', 'released'], grounded: ['present', 'steady'], neutral: ['okay', 'meh'] } },
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
const DEFAULT_SETTINGS = { tags: DEFAULT_TAGS, activities: STARTER_ACTIVITIES };

function newDraft(date = localDate()) {
  const d = { date, wake: null, bed: null, sleepRating: null, dayRating: null, dreamRecall: null, dreams: [], moods: [], energy: [], social: [], notes: [], tags: [], productivity: null };
  d.meals = emptyMeals();
  d.pages = 0;
  for (const x of DRINKS) d[x.key] = [];
  for (const p of PICKS) d[p.key] = 0;
  d.exercise = null;
  return d;
}

function isEmpty(d) {
  return !d.wake && !d.bed && !d.notes.length && !d.dreams.length && !d.moods.length
    && d.sleepRating == null && d.dayRating == null
    && d.diet == null && Object.values(d.meals || {}).every(v => v == null) && !d.pages
    && !d.dreamRecall && !d.energy?.length && !d.social?.length && d.productivity == null && !d.tags?.length && DRINKS.every(x => !d[x.key]?.length) && !d.alcohol
    && PICKS.every(p => !d[p.key]) && d.exercise == null;
}

// Upgrades entries saved by earlier versions: exercise names become sessions with no time or length
// ("housework" → "sweep", "walk"/"misc" → "other"; [] stays a rest day); single note → timestamped notes list;
// ratings and dreams added.
function migrate(d) {
  const { note, ...rest } = d;
  const renamed = { housework: 'sweep', walk: 'other', misc: 'other' };
  const exercise = rest.exercise === null ? null : (rest.exercise || []).map(x => {
    if (typeof x !== 'string') return x;
    const type = renamed[x] || x;
    return { t: null, type, minutes: null, effort: LEGACY_EFFORT[type] ?? 1 };
  });
  const notes = rest.notes || (note ? [{ t: `${rest.date}T12:00`, text: note }] : []);
  const whole = v => (v == null ? null : Math.ceil(v));
  return { ...rest, sleepRating: whole(rest.sleepRating), dayRating: whole(rest.dayRating), dreams: rest.dreams || [], exercise, notes };
}

// Fills in fields added since the entry was made. An old 0–3 alcohol count becomes that many noon entries.
function upgradeDraft(d, schema = SCHEMA) {
  const { alcohol, ...rest } = migrate(d);
  if (schema < 5 && !rest.exercise?.length) rest.exercise = null; // [] used to be the untouched default
  const out = { ...newDraft(rest.date), ...rest };
  if (!rest.alcoholLog && alcohol) out.alcoholLog = Array.from({ length: alcohol }, () => ({ t: `${rest.date}T12:00` }));
  return out;
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY));
    if (raw && raw.draft && raw.days) {
      const settings = { ...DEFAULT_SETTINGS, ...raw.settings };
      delete settings.shortcut;
      delete settings.backup; // exports always go through the share sheet now
      const days = Object.fromEntries(Object.entries(raw.days).map(([k, d]) => [k, migrate(d)]));
      // Older drafts predate meals/pages; archived days keep what they had (old days have a single 0–10 "diet").
      const draft = upgradeDraft(raw.draft, raw.schema);
      settings.tags ||= [...DEFAULT_TAGS];
      if (!raw.settings?.activities) {
        const used = new Set([raw.draft, ...Object.values(raw.days)].flatMap(d => d.exercise || []).map(x => x.type || x));
        settings.activities = structuredClone(['yoga', 'bootcamp', 'orangetheory'].some(k => used.has(k)) ? ORIGINAL_ACTIVITIES : STARTER_ACTIVITIES);
      }
      return { ...raw, schema: SCHEMA, draft, days, settings };
    }
  } catch (e) { console.warn(e); }
  return { schema: SCHEMA, draft: newDraft(), days: {}, settings: structuredClone(DEFAULT_SETTINGS) };
}

let db = load();
let draft = db.draft;

function save() {
  db.draft = draft;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
  catch (e) { toast('Could not save! Storage full?'); }
  renderHeader();
  renderChecklist();
}

// An untouched draft from a previous day rolls forward to today (unless you picked that date on purpose).
function rollForward() {
  if (isEmpty(draft) && !draft.manualDate && draft.date < localDate()) { draft.date = localDate(); save(); }
}
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
  $('draftSub').textContent = `${n} day${n === 1 ? '' : 's'} archived` + (pending ? ` · ${pending} not exported` : n ? ' · all exported' : '');
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
  draft = { ...upgradeDraft(d), manualDate: date !== localDate() };
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
  for (const key of ['wake', 'bed']) $(key).addEventListener('click', () => openTimePad(key));
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

// opts: { title, value: 'HH:MM' | null, pm (AM/PM default when empty), onSet(hhmm), onClear?, clearLabel? }
function openPad(opts) {
  pad$.opts = opts;
  pad$.fresh = !!opts.value;
  if (opts.value) padLoad(opts.value);
  else { pad$.h = ''; pad$.m = ''; pad$.pm = !!opts.pm; }
  $('padTitle').textContent = opts.title;
  $('padClear').style.visibility = opts.onClear ? 'visible' : 'hidden';
  $('padClear').textContent = opts.clearLabel || 'Clear time';
  paintPad();
  $('padDialog').showModal();
}

function openTimePad(key) {
  openPad({
    title: key === 'wake' ? 'Woke up' : 'Bed time',
    value: draft[key]?.slice(11),
    pm: key === 'bed',
    onSet: hhmm => setTime(key, hhmm),
    onClear: () => { draft[key] = null; save(); renderTimes(); },
  });
}

// Mood/note/dream times: anything before 5am belongs to the night after the entry's date.
const entryStamp = hhmm => `${+hhmm.slice(0, 2) < 5 ? addDays(draft.date, 1) : draft.date}T${hhmm}`;

function entryTimeButton(list, item, title, rerender, cls = 't') {
  const b = el('button', cls, fmt12(item.t));
  b.setAttribute('aria-label', `Change time of ${title}`);
  b.addEventListener('click', () => openPad({
    title,
    value: item.t.slice(11),
    onSet: hhmm => {
      item.t = entryStamp(hhmm);
      list.sort((a, b) => a.t.localeCompare(b.t));
      save();
      rerender();
    },
  }));
  return b;
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
    pad$.opts.onSet(`${pad(H)}:${pad$.m || '00'}`);
    $('padDialog').close();
  });
  $('padClear').addEventListener('click', () => { pad$.opts.onClear?.(); $('padDialog').close(); });
  $('padCancel').addEventListener('click', () => $('padDialog').close());
}

// ---------------------------------------------------------------------------
// Sliders, picks & exercise
// ---------------------------------------------------------------------------
// A 5-step word slider. With offLabel (meals: "skipped") a toggle button shows the empty state;
// without it, a × clears back to unrated. With emojis, the tier's emoji rides on the thumb and sits by the words.
function tierSlider({ label, cls, tiers, stops, emojis, get, set, offLabel }) {
  const wrap = el('div', `scale ${cls}`);
  const head = el('div', 'scalehead');
  const val = el('span', 'val');
  const off = offLabel ? el('button', 'skip', offLabel) : el('button', 'clear', '×');
  if (!offLabel) off.setAttribute('aria-label', `Clear ${label}`);
  const right = el('span', 'right');
  right.append(val, off);
  head.append(el('span', 'name', label), right);

  const input = el('input', 'grad');
  Object.assign(input, { type: 'range', min: 0, max: tiers.length - 1, step: 1 });
  input.style.setProperty('--grad', `linear-gradient(90deg, ${stops.join(', ')})`);
  input.setAttribute('aria-label', label);
  const track = el('div', 'track');
  const rider = emojis && el('span', 'rider');
  track.append(input);
  if (rider) track.append(rider);

  const paint = () => {
    const v = get();
    const shown = v ?? Math.floor(tiers.length / 2);
    input.classList.toggle('unset', v == null);
    input.value = shown;
    val.textContent = v == null ? (offLabel ? '' : '—') : tiers[v];
    if (emojis) {
      if (v != null) val.prepend(el('span', 'tieremo', emojis[v]));
      rider.textContent = emojis[shown];
      rider.classList.toggle('unset', v == null);
      rider.style.setProperty('--f', shown / (tiers.length - 1));
    }
    val.style.color = v == null ? '' : mix(stops[v], '#ecebf0', 0.3); // lifted so the darkest tier stays readable
    if (offLabel) off.classList.toggle('on', v == null);
    else off.style.visibility = v == null ? 'hidden' : 'visible';
  };
  enhanceRange(input, v => { if (get() !== v) { set(v); save(); } paint(); });
  off.addEventListener('click', () => { set(null); save(); paint(); });

  paint();
  wrap.append(head, track);
  return wrap;
}

// One slider per meal. Skipped (the default) dims the slider; touching it logs a rating.
const mealEl = m => tierSlider({
  label: m.label, cls: 'meal', ...FOOD, offLabel: 'skipped',
  get: () => draft.meals[m.key], set: v => { draft.meals[m.key] = v; },
});

function renderProductivity() {
  $('productivity').replaceChildren(tierSlider({
    label: 'Productivity', cls: 'prod', ...PRODUCTIVITY,
    get: () => draft.productivity, set: v => { draft.productivity = v; },
  }));
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

// One row per drink: tap + to log one now; tap a time to change it or delete it.
function drinkEl(x) {
  const row = el('div', 'drinkrow');
  const list = draft[x.key];
  const head = el('div', 'drinkhead');
  head.append(el('span', 'name', `${x.emoji} ${x.label}`), el('span', list.length ? 'n' : 'n zero', String(list.length)));
  const add = el('button', 'plus', '+');
  add.setAttribute('aria-label', `Log ${x.label.toLowerCase()} now`);
  add.addEventListener('click', () => {
    list.push({ t: nowStamp() });
    list.sort((a, b) => a.t.localeCompare(b.t));
    save();
    renderScales();
    toast(`${x.emoji} logged at ${fmt12(nowStamp())}`);
  });
  head.append(add);

  const times = el('div', 'drinktimes');
  for (const item of list) {
    const b = el('button', 'chip', fmt12(item.t));
    b.addEventListener('click', () => openPad({
      title: x.label,
      value: item.t.slice(11),
      clearLabel: 'Delete',
      onSet: hhmm => { item.t = entryStamp(hhmm); list.sort((a, b) => a.t.localeCompare(b.t)); save(); renderScales(); },
      onClear: () => { list.splice(list.indexOf(item), 1); save(); renderScales(); },
    }));
    times.append(b);
  }
  row.append(head);
  if (list.length) row.append(times);
  return row;
}

function renderScales() {
  const box = $('scales');
  box.replaceChildren(el('h2', null, 'Food & drink'));
  for (const m of MEALS) box.append(mealEl(m));
  for (const x of DRINKS) box.append(drinkEl(x));

  const intimacy = $('intimacy');
  const cols = el('div', 'pickcols');
  for (const p of PICKS.filter(p => p.card === 'intimacy')) cols.append(pickEl(p, 'pickcol'));
  intimacy.replaceChildren(el('h2', null, 'Intimacy'), cols);
}

const activity = type => db.settings.activities.find(a => a.key === type)
  || { key: type, emoji: '•', label: type, minutes: 30, effort: 1 }; // removed from the list, or from old data

// Tap an activity to log a session now with its defaults; adjust length/effort on the session row.
function renderExercise() {
  const box = $('exercise');
  const list = draft.exercise;
  const effort = dayEffort(list);
  const h = el('h2', 'split');
  const tag = el('span', 'intensity', list == null ? '' : effort == null ? 'rest' : EFFORT[effort].label);
  tag.style.color = effort == null ? 'var(--muted)' : EFFORT[effort].color;
  h.append(el('span', null, 'Exercise'), tag);
  box.replaceChildren(h);

  const row = el('div', 'emojis');
  const chip = (cls, emoji, label, color, onClick) => {
    const b = el('button', cls);
    b.style.setProperty('--c', color);
    b.append(el('span', 'e', emoji), el('span', 'l', label));
    b.addEventListener('click', onClick);
    row.append(b);
    return b;
  };
  for (const a of db.settings.activities) {
    const n = (list || []).filter(x => x.type === a.key).length;
    const b = chip(n ? 'emo on' : 'emo', a.emoji, a.label, EFFORT[a.effort].color, () => {
      draft.exercise = [...(draft.exercise || []), { t: nowStamp(), type: a.key, minutes: a.minutes, effort: a.effort }]
        .sort((x, y) => (x.t || '').localeCompare(y.t || ''));
      save();
      renderExercise();
    });
    if (n > 1) b.append(el('span', 'badge', `×${n}`));
  }
  const resting = Array.isArray(list) && !list.length;
  const rest = chip(resting ? 'emo on' : 'emo', '😴', 'Rest', REST_COLOR, () => {
    draft.exercise = resting ? null : [];
    save();
    renderExercise();
  });
  rest.disabled = !!list?.length;
  chip('emo edit', '⚙︎', 'Edit', REST_COLOR, openActivities);
  box.append(row);

  const ul = el('ul', 'moodlist sessions');
  (list || []).forEach((x, idx) => {
    const a = activity(x.type);
    const li = el('li');
    const time = x.t ? entryTimeButton(list, x, a.label, renderExercise) : el('button', 't', '—');
    if (!x.t) time.addEventListener('click', () => openPad({
      title: a.label, value: null,
      onSet: hhmm => { x.t = entryStamp(hhmm); list.sort((p, q) => (p.t || '').localeCompare(q.t || '')); save(); renderExercise(); },
    }));
    const mins = el('button', 'cyc', x.minutes ? `${x.minutes}m` : '—m');
    mins.setAttribute('aria-label', 'Change length');
    mins.addEventListener('click', () => {
      x.minutes = MINUTE_STEPS.find(m => m > (x.minutes || 0)) ?? MINUTE_STEPS[0];
      save();
      renderExercise();
    });
    const eff = el('button', 'cyc', EFFORT[x.effort].label);
    eff.style.color = EFFORT[x.effort].color;
    eff.setAttribute('aria-label', 'Change effort');
    eff.addEventListener('click', () => { x.effort = (x.effort + 1) % EFFORT.length; save(); renderExercise(); });
    const del = el('button', null, '×');
    del.addEventListener('click', () => {
      list.splice(idx, 1);
      if (!list.length) draft.exercise = null;
      save();
      renderExercise();
    });
    li.append(time, el('span', 'f', `${a.emoji} ${a.label}`), mins, eff, del);
    ul.append(li);
  });
  box.append(ul);
}

// ---------------------------------------------------------------------------
// Activity list editor: emoji, name, default length and effort. Keys never change, so renaming is safe.
// ---------------------------------------------------------------------------
const slug = text => text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'activity';

function openActivities() {
  paintActivities();
  $('actDialog').showModal();
}

function paintActivities() {
  const box = $('actList');
  box.replaceChildren();
  const commit = () => { save(); renderExercise(); };
  db.settings.activities.forEach((a, idx) => {
    const row = el('div', 'actrow');
    const emoji = el('input', 'actemoji');
    Object.assign(emoji, { type: 'text', value: a.emoji, ariaLabel: 'Emoji' });
    emoji.addEventListener('change', () => {
      const first = [...new Intl.Segmenter().segment(emoji.value.trim())][0]?.segment;
      a.emoji = first || a.emoji;
      emoji.value = a.emoji;
      commit();
    });
    const name = el('input', 'actname');
    Object.assign(name, { type: 'text', value: a.label, ariaLabel: 'Name' });
    name.addEventListener('change', () => { a.label = name.value.trim() || a.label; name.value = a.label; commit(); });
    const mins = el('select');
    for (const m of MINUTE_STEPS) mins.append(new Option(`${m}m`, m, false, m === a.minutes));
    mins.addEventListener('change', () => { a.minutes = +mins.value; commit(); });
    const eff = el('select');
    EFFORT.forEach((e, i) => eff.append(new Option(e.label, i, false, i === a.effort)));
    eff.addEventListener('change', () => { a.effort = +eff.value; commit(); });
    const del = el('button', 'actdel', '×');
    del.setAttribute('aria-label', `Remove ${a.label}`);
    del.addEventListener('click', () => {
      db.settings.activities.splice(idx, 1);
      commit();
      paintActivities();
    });
    row.append(emoji, name, mins, eff, del);
    box.append(row);
  });
}

function bindActivities() {
  $('actAdd').addEventListener('click', () => {
    const keys = new Set(db.settings.activities.map(a => a.key));
    let key = 'new', n = 2;
    while (keys.has(key)) key = `new-${n++}`;
    db.settings.activities.push({ key, emoji: '🏅', label: 'New', minutes: 30, effort: 1, fresh: true });
    save();
    renderExercise();
    paintActivities();
    const names = $('actList').querySelectorAll('.actname');
    names[names.length - 1].select();
  });
  // A new activity takes its key from the name it's first given, then keeps it.
  $('actDone').addEventListener('click', () => {
    const keys = new Set();
    for (const a of db.settings.activities) {
      if (a.fresh) {
        let key = slug(a.label), n = 2;
        while (keys.has(key)) key = `${slug(a.label)}-${n++}`;
        if (draft.exercise) for (const x of draft.exercise) if (x.type === a.key) x.type = key;
        a.key = key;
        delete a.fresh;
      }
      keys.add(a.key);
    }
    save();
    renderExercise();
    $('actDialog').close();
  });
}

// ---------------------------------------------------------------------------
// Emotion wheel
// ---------------------------------------------------------------------------
const SVGNS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const R_HUB = 30, R_CORE = 92, R_LEAF = 158;
let pick = null; // { core, feeling, nuance }

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
  const total = WHEEL.reduce((s, c) => s + Object.keys(c.leaves).length, 0);
  const step = (2 * Math.PI) / total;
  let a = -Math.PI / 2;
  for (const c of WHEEL) {
    const leaves = Object.keys(c.leaves);
    const a0 = a, a1 = a + step * leaves.length;
    const corePath = svg('path', { d: arcPath(R_HUB, R_CORE, a0, a1), fill: c.color });
    corePath.dataset.core = c.core;
    root.append(corePath, radialText(c.core, (R_HUB + R_CORE) / 2 + 4, (a0 + a1) / 2, 'core'));
    leaves.forEach((leaf, i) => {
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
    const next = { core: p.dataset.core, feeling: p.dataset.feeling || null, nuance: null };
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
  if (!pick) return;
  $('moodName').textContent = [pick.nuance, pick.feeling, pick.core].filter(Boolean).join(' · ');
  $('moodName').style.color = feelingColor(pick.core, pick.feeling);

  // Optional third level: narrow the feeling down to a more exact word.
  const box = $('moodNuance');
  const words = pick.feeling ? WHEEL.find(w => w.core === pick.core).leaves[pick.feeling] : [];
  box.hidden = !words.length;
  box.replaceChildren();
  box.style.setProperty('--c', feelingColor(pick.core, pick.feeling));
  for (const w of words) {
    const b = el('button', w === pick.nuance ? 'on' : null, w);
    b.addEventListener('click', () => { pick.nuance = pick.nuance === w ? null : w; paintWheel(); });
    box.append(b);
  }
}

const moodWord = m => m.nuance || m.feeling || m.core;

function renderMoods() {
  const list = $('moodList');
  list.replaceChildren();
  draft.moods.forEach((m, idx) => {
    const li = el('li');
    const dot = el('span', 'dot');
    dot.style.background = feelingColor(m.core, m.feeling);
    const del = el('button', null, '×');
    del.addEventListener('click', () => { draft.moods.splice(idx, 1); save(); renderMoods(); });
    li.append(dot, entryTimeButton(draft.moods, m, moodWord(m), renderMoods), el('span', 'f', moodWord(m)),
      el('span', 'i', '●'.repeat(m.intensity) + '○'.repeat(5 - m.intensity)), del);
    list.append(li);
  });
}

// ---------------------------------------------------------------------------
// Reading dial: drag around the arc (or tap −/+). 270° gauge, open at the bottom.
// ---------------------------------------------------------------------------
const DIAL = { r: 68, a0: 135, sweep: 270 }; // degrees, clockwise from 3 o'clock
const dialAngle = v => ((DIAL.a0 + (v / PAGES.max) * DIAL.sweep) * Math.PI) / 180;
const dialPoint = (r, a) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
const dialArc = (v0, v1) => {
  const a0 = dialAngle(v0), a1 = dialAngle(v1);
  return `M${dialPoint(DIAL.r, a0)}A${DIAL.r} ${DIAL.r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${dialPoint(DIAL.r, a1)}`;
};
const pagesLabel = v => (v >= PAGES.max ? `${PAGES.max}+` : String(v));

function setPages(v) {
  v = Math.min(PAGES.max, Math.max(0, v));
  if (draft.pages === v) return;
  draft.pages = v;
  save();
  paintDial();
}

function buildDial() {
  const root = $('dial');
  root.append(svg('path', { d: dialArc(0, PAGES.max), class: 'track' }), svg('path', { class: 'fill' }));
  for (let v = 0; v <= PAGES.max; v += PAGES.step) {
    const a = dialAngle(v), major = v % 10 === 0;
    const [x1, y1] = dialPoint(DIAL.r - 15, a).split(' '), [x2, y2] = dialPoint(DIAL.r - (major ? 22 : 19), a).split(' ');
    root.append(svg('line', { x1, y1, x2, y2, class: major ? 'tick major' : 'tick' }));
    if (major) {
      const [x, y] = dialPoint(DIAL.r + 20, a).split(' ');
      const t = svg('text', { x, y, class: 'lbl' });
      t.textContent = pagesLabel(v);
      root.append(t);
    }
  }
  const num = svg('text', { x: 0, y: -2, class: 'num' });
  const unit = svg('text', { x: 0, y: 26, class: 'unit' });
  unit.textContent = 'pages';
  root.append(num, unit, svg('circle', { r: 12, class: 'knob' }));

  // Pointer angle → nearest step. In the gap at the bottom, stay pinned to whichever end you came from.
  const offset = e => {
    const r = root.getBoundingClientRect(), vb = root.viewBox.baseVal, k = vb.width / r.width;
    return [(e.clientX - r.left) * k + vb.x, (e.clientY - r.top) * k + vb.y]; // in dial units
  };
  const set = e => {
    const [dx, dy] = offset(e);
    const rel = ((Math.atan2(dy, dx) * 180) / Math.PI - DIAL.a0 + 720) % 360;
    const v = rel > DIAL.sweep ? (draft.pages >= PAGES.max / 2 ? PAGES.max : 0)
      : Math.round((rel / DIAL.sweep) * (PAGES.max / PAGES.step)) * PAGES.step;
    setPages(v);
  };
  let dragging = false;
  root.addEventListener('pointerdown', e => {
    dragging = Math.hypot(...offset(e)) > DIAL.r - 30; // taps on the number in the middle do nothing
    if (dragging) { set(e); root.setPointerCapture?.(e.pointerId); }
  });
  root.addEventListener('pointermove', e => { if (dragging && (e.pressure > 0 || e.buttons)) set(e); });
  root.addEventListener('pointerup', () => { dragging = false; });
  $('pagesLess').addEventListener('click', () => setPages(draft.pages - PAGES.step));
  $('pagesMore').addEventListener('click', () => setPages(draft.pages + PAGES.step));
}

function paintDial() {
  const root = $('dial');
  const v = draft.pages || 0;
  root.querySelector('.fill').setAttribute('d', v ? dialArc(0, v) : '');
  root.querySelector('.num').textContent = pagesLabel(v);
  const [cx, cy] = dialPoint(DIAL.r, dialAngle(v)).split(' ');
  Object.entries({ cx, cy }).forEach(([k, x]) => root.querySelector('.knob').setAttribute(k, x));
  root.classList.toggle('zero', !v);
  $('pagesLess').disabled = !v;
  $('pagesMore').disabled = v >= PAGES.max;
}

// ---------------------------------------------------------------------------
// Dream recall: none / yes, forgot / yes, remember. The dream box opens on "remember".
// ---------------------------------------------------------------------------
function renderDreamRecall() {
  const pills = $('dreamRecall');
  pills.replaceChildren();
  for (const [key, label] of DREAM_RECALL) {
    const b = el('button', draft.dreamRecall === key ? 'active' : null, label);
    b.addEventListener('click', () => {
      draft.dreamRecall = draft.dreamRecall === key ? null : key;
      save();
      renderDreamRecall();
      if (draft.dreamRecall === 'remember') $('dreamsInput').focus();
    });
    pills.append(b);
  }
  $('dreamsForm').hidden = draft.dreamRecall !== 'remember';
}

// ---------------------------------------------------------------------------
// Tags: only the day's tags show; the full list lives behind a sheet.
// ---------------------------------------------------------------------------
let tagEditing = false;

function renderTags() {
  const box = $('tagChips');
  box.replaceChildren();
  for (const t of draft.tags) box.append(el('span', 'chip on', t));
  $('tagOpen').textContent = draft.tags.length ? 'edit' : '+ tags';
}

function paintTagSheet() {
  const all = [...new Set([...db.settings.tags, ...draft.tags])];
  const box = $('tagAll');
  box.replaceChildren();
  box.classList.toggle('editing', tagEditing);
  for (const t of all) {
    const b = el('button', draft.tags.includes(t) ? 'chip on' : 'chip', t);
    if (tagEditing) b.append(el('span', 'x', '×'));
    b.addEventListener('click', () => {
      if (tagEditing) db.settings.tags = db.settings.tags.filter(x => x !== t);
      else draft.tags = draft.tags.includes(t) ? draft.tags.filter(x => x !== t) : [...draft.tags, t];
      save();
      paintTagSheet();
      renderTags();
    });
    box.append(b);
  }
  $('tagEdit').textContent = tagEditing ? 'done editing' : 'edit list';
}

function bindTags() {
  $('tagOpen').addEventListener('click', () => { tagEditing = false; paintTagSheet(); $('tagDialog').showModal(); });
  $('tagChips').addEventListener('click', () => $('tagOpen').click());
  $('tagEdit').addEventListener('click', () => { tagEditing = !tagEditing; paintTagSheet(); });
  $('tagDone').addEventListener('click', () => $('tagDialog').close());
  $('tagForm').addEventListener('submit', e => {
    e.preventDefault();
    const t = $('tagInput').value.trim().toLowerCase();
    if (!t) return;
    if (!db.settings.tags.includes(t)) db.settings.tags = [...db.settings.tags, t];
    if (!draft.tags.includes(t)) draft.tags = [...draft.tags, t];
    $('tagInput').value = '';
    save();
    paintTagSheet();
    renderTags();
  });
}

// ---------------------------------------------------------------------------
// Energy (Thayer): one tap on the square logs energy × tension at the current time.
// ---------------------------------------------------------------------------
const ENERGY_PAD = 200; // square side in SVG units
const energyCell = ENERGY_PAD / ENERGY.size;

function energyColor(energy, tension) {
  const { tl, tr, bl, br } = ENERGY.corners;
  const fx = (tension - 1) / (ENERGY.size - 1), fy = (energy - 1) / (ENERGY.size - 1);
  return mix(mix(bl, br, fx), mix(tl, tr, fx), fy);
}

function energyWord(e) {
  const words = [e.tension <= 2 ? 'calm' : e.tension >= 4 ? 'tense' : '', e.energy >= 4 ? 'energized' : e.energy <= 2 ? 'tired' : ''];
  return words.filter(Boolean).join(' · ') || 'neutral';
}

// Square center of a cell: energy runs bottom → top, tension left → right.
const energyXY = e => [(e.tension - 0.5) * energyCell, (ENERGY.size - e.energy + 0.5) * energyCell];

function buildEnergy() {
  const root = $('energyPad');
  for (let energy = 1; energy <= ENERGY.size; energy++) {
    for (let tension = 1; tension <= ENERGY.size; tension++) {
      const [cx, cy] = energyXY({ energy, tension });
      root.append(svg('rect', {
        x: cx - energyCell / 2, y: cy - energyCell / 2, width: energyCell, height: energyCell,
        fill: energyColor(energy, tension), class: 'cell',
      }));
    }
  }
  const half = ENERGY_PAD / 2;
  for (const [x, y, label] of [[8, 14, 'calm energy'], [192, 14, 'tense energy'], [8, 190, 'calm tired'], [192, 190, 'tense tired']]) {
    const t = svg('text', { x, y, class: 'corner', 'text-anchor': x < half ? 'start' : 'end' });
    t.textContent = label;
    root.append(t);
  }
  root.append(svg('polyline', { class: 'trail' }), svg('g', { class: 'dots' }));

  root.addEventListener('click', e => {
    const r = root.getBoundingClientRect();
    const col = Math.min(ENERGY.size - 1, Math.floor(((e.clientX - r.left) / r.width) * ENERGY.size));
    const row = Math.min(ENERGY.size - 1, Math.floor(((e.clientY - r.top) / r.height) * ENERGY.size));
    const entry = { t: nowStamp(), energy: ENERGY.size - row, tension: col + 1 };
    draft.energy.push(entry);
    draft.energy.sort((a, b) => a.t.localeCompare(b.t));
    save();
    renderEnergy();
    toast(`Logged ${energyWord(entry)}`);
  });
}

function renderEnergy() {
  const root = $('energyPad');
  const pts = draft.energy.map(energyXY);
  root.querySelector('.trail').setAttribute('points', pts.map(p => p.join(',')).join(' '));
  const dots = root.querySelector('.dots');
  dots.replaceChildren();
  pts.forEach(([cx, cy], i) => dots.append(svg('circle', { cx, cy, r: i === pts.length - 1 ? 9 : 6, class: i === pts.length - 1 ? 'last' : '' })));

  const list = $('energyList');
  list.replaceChildren();
  draft.energy.forEach((e, idx) => {
    const li = el('li');
    const dot = el('span', 'dot');
    dot.style.background = energyColor(e.energy, e.tension);
    const del = el('button', null, '×');
    del.addEventListener('click', () => { draft.energy.splice(idx, 1); save(); renderEnergy(); });
    li.append(dot, entryTimeButton(draft.energy, e, 'Energy', renderEnergy), el('span', 'f', energyWord(e)),
      el('span', 'i', `E${e.energy} T${e.tension}`), del);
    list.append(li);
  });
}

// ---------------------------------------------------------------------------
// Social: pick who, then tap how it left you to log it.
// ---------------------------------------------------------------------------
let socialWho = [];

function renderSocial() {
  const who = $('socialWho');
  who.replaceChildren();
  for (const w of SOCIAL.who) {
    const b = el('button', socialWho.includes(w) ? 'chip on' : 'chip', w);
    b.addEventListener('click', () => {
      socialWho = socialWho.includes(w) ? socialWho.filter(x => x !== w) : [...socialWho, w];
      renderSocial();
    });
    who.append(b);
  }

  const fx = $('socialEffect');
  fx.hidden = !socialWho.length;
  fx.replaceChildren(el('span', 'lead', 'left me'));
  const row = el('div', 'effects');
  for (const [effect, label, color] of SOCIAL.effects) {
    const b = el('button', null, label);
    b.style.setProperty('--c', color);
    b.addEventListener('click', () => {
      draft.social.push({ t: nowStamp(), who: SOCIAL.who.filter(w => socialWho.includes(w)), effect });
      draft.social.sort((a, b) => a.t.localeCompare(b.t));
      socialWho = [];
      save();
      renderSocial();
      toast(`Logged · ${label}`);
    });
    row.append(b);
  }
  fx.append(row);

  const list = $('socialList');
  list.replaceChildren();
  draft.social.forEach((x, idx) => {
    const [, label, color] = SOCIAL.effects.find(([e]) => e === x.effect);
    const li = el('li');
    const dot = el('span', 'dot');
    dot.style.background = color;
    const del = el('button', null, '×');
    del.addEventListener('click', () => { draft.social.splice(idx, 1); save(); renderSocial(); });
    li.append(dot, entryTimeButton(draft.social, x, 'Social', renderSocial), el('span', 'f', x.who.join(', ')), el('span', 'i', label), del);
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
    li.append(entryTimeButton(draft[key], n, key === 'dreams' ? 'Dream' : 'Note', () => renderLog(key)), el('span', 'txt', n.text), del);
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
    if (key === 'dreams') { draft.dreamRecall = 'remember'; renderDreamRecall(); }
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
    const { core, feeling, nuance } = pick;
    draft.moods.push({ t: nowStamp(), core, feeling, ...(nuance && { nuance }), intensity: +int.value });
    draft.moods.sort((a, b) => a.t.localeCompare(b.t));
    save();
    toast(`Logged ${moodWord(pick)}`);
    pick = null;
    paintWheel();
    renderMoods();
  });
}

// ---------------------------------------------------------------------------
// End day
// ---------------------------------------------------------------------------
// The core daily fields. Never blocks saving; just shows what's still open above End day.
const CHECKS = [
  { label: 'wake time', ok: d => d.wake, target: '#wake' },
  { label: 'sleep', ok: d => d.sleepRating != null, target: '[data-rate="sleepRating"]' },
  { label: 'food', ok: d => Object.values(d.meals).some(v => v != null), target: '#scales .meal' },
  { label: 'exercise', ok: d => d.exercise != null, target: '#exercise .emojis' },
  { label: 'mood', ok: d => d.moods.length, target: '#wheel' },
  { label: 'bed time', ok: d => d.bed, target: '#bed' },
  { label: 'productivity', ok: d => d.productivity != null, target: '#productivity .scale' },
  { label: 'day rating', ok: d => d.dayRating != null, target: '[data-rate="dayRating"]' },
];

function renderChecklist() {
  const box = $('checklist');
  const missing = CHECKS.filter(c => !c.ok(draft));
  box.classList.toggle('done', !missing.length);
  if (!missing.length) { box.replaceChildren(el('span', null, '✓ Everything logged')); return; }
  box.replaceChildren(el('span', 'lead', 'Still open:'));
  for (const c of missing) {
    const b = el('button', null, c.label);
    b.addEventListener('click', () => {
      const target = document.querySelector(c.target);
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.remove('flash');
      void target.offsetWidth; // restart the animation
      target.classList.add('flash');
    });
    box.append(b);
  }
}

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
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast(`${prettyDate(date)} saved ✦`);
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
// Export & import (share sheet). Files carry your tag and activity lists so they can be restored.
// ---------------------------------------------------------------------------
// Sleep hours = this morning's wake minus the previous day's bed time.
// exerciseEffort = hardest session (0 easy, 1 moderate, 2 hard); exerciseMinutes = total length.
function withDerived(days) {
  return days.map(d => {
    const prev = db.days[addDays(d.date, -1)];
    const { backedUpAt, ...out } = d;
    if (d.exercise) {
      out.exerciseEffort = dayEffort(d.exercise);
      out.exerciseMinutes = d.exercise.every(x => x.minutes) ? dayMinutes(d.exercise) : null; // null = some length unknown
    }
    for (const x of DRINKS) if (d[x.key]) out[x.count] = d[x.key].length;
    if (prev?.bed && d.wake) {
      const h = (new Date(d.wake) - new Date(prev.bed)) / 36e5;
      if (h > 0 && h < 24) out.sleepHours = Math.round(h * 100) / 100;
    }
    return out;
  });
}

const exportSettings = () => ({
  tags: db.settings.tags,
  activities: db.settings.activities.map(({ fresh, ...a }) => a),
});

function payload(range, days, filename) {
  return { filename, app: 'journo', schema: SCHEMA, exportedAt: new Date().toISOString(), range, settings: exportSettings(), days: withDerived(days) };
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

// Resolves true if the file was handed off, false if cancelled. Browsers that can't share files download it.
async function saveFile(obj) {
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

async function exportAll() {
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
    // Settings: add any tags/activities you don't have yet; never overwrite yours.
    const tags = data.settings?.tags || [], acts = data.settings?.activities || [];
    db.settings.tags = [...new Set([...db.settings.tags, ...tags])];
    for (const a of acts) if (a.key && !db.settings.activities.some(x => x.key === a.key)) db.settings.activities.push(a);
    for (const d of days) {
      if (!d.date) continue;
      if (db.days[d.date]) { skipped++; continue; }
      const { sleepHours, ...clean } = d;
      db.days[d.date] = { ...clean, backedUpAt: now }; // it already lives in that file
      added++;
    }
    save();
    renderArchive();
    renderToday();
    toast(`Imported ${added} day${added === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} existing` : ''}`);
  } catch (e) {
    toast('Could not read that file');
  }
}

// ---------------------------------------------------------------------------
// Archive view
// ---------------------------------------------------------------------------
const sortedDays = () => Object.values(db.days).sort((a, b) => a.date.localeCompare(b.date));

// Fixed slots so days line up like a chart: sleep | mood through the day | food | movement | drinks.
// Unlogged slots stay dim. Grid columns are shared with the legend row (.daybar in CSS).
const BAR_SLOTS = ['sleep', 'mood', 'food', 'move', 'drinks', 'read'];
const BAR_ICONS = { sleep: '💤', mood: '🙂', food: '🍽️', move: '🏃', drinks: '🍷', read: '📖' };
const SKIPPED = '#33333d';

// Meals sit side by side in the food slot (skipped = dark); days from before meals use their single 0–10 diet.
function foodColor(d) {
  if (d.meals && Object.values(d.meals).some(v => v != null)) {
    const n = MEALS.length;
    return `linear-gradient(90deg, ${MEALS.map((m, i) => {
      const v = d.meals[m.key];
      return `${v == null ? SKIPPED : FOOD.stops[v]} ${(i * 100) / n}% ${((i + 1) * 100) / n}%`;
    }).join(', ')})`;
  }
  return d.diet == null ? null : sampleStops(FOOD.stops, d.diet / 10);
}

// Days before schema 4 store a plain 0–3 alcohol count instead of a log.
const drinkCount = (d, count) => {
  const x = DRINKS.find(x => x.count === count);
  return d[x.key] ? d[x.key].length : d[count] || 0;
};

// Hardest effort sets the color; more minutes = brighter (an hour or more is full). Rest = dark grey.
function moveColor(list) {
  if (list == null) return null;
  if (!list.length) return REST_COLOR;
  const color = EFFORT[dayEffort(list)].color;
  const known = list.every(x => x.minutes);
  return known ? mix('#26262e', color, 0.4 + 0.6 * Math.min(1, dayMinutes(list) / 60)) : color;
}

function barColors(d) {
  const moods = d.moods || [];
  const moodColors = moods.map(m => feelingColor(m.core, m.feeling));
  return {
    sleep: d.sleepRating == null ? null : mix('#2b2350', '#c9b8ff', (d.sleepRating - 1) / 4),
    mood: !moods.length ? null
      : moods.length === 1 ? moodColors[0]
      : `linear-gradient(90deg, ${moodColors.join(', ')})`,
    food: foodColor(d),
    move: moveColor(d.exercise),
    drinks: !drinkCount(d, 'alcohol') ? null : mix('#5a3d12', '#f2a93b', Math.min(1, (drinkCount(d, 'alcohol') - 1) / 2)),
    read: !d.pages ? null : mix('#4a4030', '#f3dca6', d.pages / PAGES.max),
  };
}

function dayStrip(d) {
  const bar = el('div', 'daybar');
  const colors = barColors(d);
  for (const slot of BAR_SLOTS) {
    const seg = el('span', colors[slot] ? slot : `${slot} off`);
    if (colors[slot]) seg.style.background = colors[slot];
    bar.append(seg);
  }
  return bar;
}

function renderExportStatus() {
  const pending = unbackedDays();
  $('unbacked').hidden = !pending.length;
  $('unbackedText').textContent = `${pending.length} day${pending.length === 1 ? '' : 's'} not exported yet`;
}

function renderArchive() {
  renderExportStatus();
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
    const legend = el('div', 'dayrow legend');
    const labels = el('div', 'daybar');
    for (const slot of BAR_SLOTS) {
      const icon = el('span', slot, BAR_ICONS[slot]);
      icon.title = slot;
      labels.append(icon);
    }
    legend.append(el('span', 'd'), labels, el('span', 'r'), el('span', 'bk'));
    card.append(h, legend);
    for (const d of list) {
      const row = el('div', 'dayrow');
      const mark = el('span', d.backedUpAt ? 'bk ok' : 'bk', d.backedUpAt ? '☁︎' : '●');
      mark.title = d.backedUpAt ? 'Exported' : 'Not exported yet';
      const rating = el('span', 'r', d.dayRating == null ? '' : `★${d.dayRating}`);
      row.append(el('span', 'd', prettyDate(d.date).replace(/,.*/, '') + ' ' + d.date.slice(8)), dayStrip(d), rating, mark);
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
  $('exportAll').addEventListener('click', exportAll);
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
  paintDial();
  renderEnergy();
  renderMoods();
  renderDreamRecall();
  renderTags();
  renderSocial();
  renderProductivity();
  LOGS.forEach(renderLog);
  document.querySelectorAll('.stars').forEach(paintStars);
  renderChecklist();
}

document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
$('dateInput').addEventListener('change', e => changeDate(e.target.value));
LOGS.forEach(bindLog);
document.querySelectorAll('.stars').forEach(buildStars);
$('endDay').addEventListener('click', endDay);
$('clearEntry').addEventListener('click', clearEntry);

// Coming back to the app after hours away: re-check the date.
document.addEventListener('visibilitychange', () => { if (!document.hidden) { rollForward(); renderHeader(); } });

rollForward();
bindTimes();
buildWheel();
buildDial();
buildEnergy();
bindTags();
bindActivities();
bindMood();
bindPad();
bindArchive();
renderToday();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
