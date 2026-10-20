// Core for v2: constants, state model, scoring, storage and sync. Loaded first.
var CATEGORIES = ['Body', 'Sleep', 'Nutrition', 'Mind', 'Custom'];
var COLORS = ['c1', 'c2', 'c3', 'c4', 'c5'];
var ICONS = ['●', '◆', '▲', '■', '★', '♥', '☀', '☾', '✎', '✚', '♪', '◌'];
var WATER_ML = 250;
var DEFAULT_GOALS = { water: 8, sleep: 7, steps: 8000, fruitVeg: 5, workoutMin: 30, weightUnit: 'kg' };
var DEFAULT_HABITS = [
  { id: 'water', name: 'Drink water', icon: '●', color: 'c2', kind: 'count', target: 8, unit: 'glasses', category: 'Nutrition', link: 'water' },
  { id: 'sleep', name: 'Sleep to goal', icon: '☾', color: 'c3', kind: 'check', category: 'Sleep', link: 'sleep' },
  { id: 'steps', name: 'Hit step goal', icon: '▲', color: 'c2', kind: 'check', category: 'Body', link: 'steps' },
  { id: 'produce', name: 'Fruit and vegetables', icon: '◆', color: 'c5', kind: 'count', target: 5, unit: 'servings', category: 'Nutrition', link: 'fruitVeg' },
  { id: 'workout', name: 'Exercise or train', icon: '■', color: 'c1', kind: 'timer', target: 30, unit: 'min', category: 'Body', link: 'workout' },
  { id: 'meditate', name: 'Meditate', icon: '◌', color: 'c5', kind: 'timer', target: 10, unit: 'min', category: 'Mind' },
  { id: 'read', name: 'Read', icon: '✎', color: 'c4', kind: 'timer', target: 20, unit: 'min', category: 'Mind' },
  { id: 'screens', name: 'No screens before bed', icon: '◐', color: 'c3', kind: 'check', category: 'Sleep' },
  { id: 'stretch', name: 'Stretch or mobility', icon: '✚', color: 'c2', kind: 'check', category: 'Body' },
  { id: 'outside', name: 'Time outdoors', icon: '☀', color: 'c1', kind: 'check', category: 'Body' },
  { id: 'gratitude', name: 'Three gratitudes', icon: '♥', color: 'c4', kind: 'check', category: 'Mind' },
  { id: 'vitamins', name: 'Supplements taken', icon: '★', color: 'c5', kind: 'check', category: 'Nutrition' }
];
var HABIT_TEMPLATES = [
  { name: 'Morning walk', kind: 'timer', target: 20, unit: 'min', category: 'Body', icon: '▲', color: 'c2' },
  { name: 'Journal before bed', kind: 'check', category: 'Mind', icon: '✎', color: 'c4' },
  { name: 'Practise a hobby', kind: 'timer', target: 30, unit: 'min', category: 'Mind', icon: '♪', color: 'c3' },
  { name: 'Cook at home', kind: 'count', target: 1, unit: 'meal', category: 'Nutrition', icon: '◆', color: 'c5' },
  { name: 'Tea without sugar', kind: 'count', target: 2, unit: 'cups', category: 'Nutrition', icon: '●', color: 'c1' },
  { name: 'Call someone you care about', kind: 'check', category: 'Mind', icon: '♥', color: 'c4' },
  { name: 'Floss', kind: 'check', category: 'Body', icon: '✚', color: 'c5' },
  { name: 'Tidy one space', kind: 'check', category: 'Custom', icon: '■', color: 'c2' }
];
var SYMPTOMS = ['Headache', 'Tired', 'Stress', 'Good energy', 'Sore muscles', 'Stomach upset', 'Poor appetite', 'Congestion'];
var MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
var WORKOUT_TYPES = ['', 'Walk', 'Run', 'Cycle', 'Strength', 'Yoga', 'Swim', 'Sport', 'Other'];
var MOOD_LABELS = ['Very low', 'Low', 'Okay', 'Good', 'Great'];
var TABS = [['today', 'Today'], ['habits', 'Habits'], ['tools', 'Tools'], ['progress', 'Progress'], ['settings', 'Settings']];
var BREATH = {
  box: { name: 'Box 4-4-4-4', steps: [['Breathe in', 4], ['Hold', 4], ['Breathe out', 4], ['Hold', 4]] },
  calm: { name: 'Calm 5-5', steps: [['Breathe in', 5], ['Breathe out', 5]] },
  relax: { name: '4-7-8', steps: [['Breathe in', 4], ['Hold', 7], ['Breathe out', 8]] }
};
var TIPS = [
  'Drinking water steadily through the day is easier than catching up in the evening.',
  'A consistent wake-up time does more for sleep quality than a consistent bedtime alone.',
  'A short walk after meals can help blood sugar settle.',
  'Strength work two days a week supports muscle and bone health for most adults.',
  'Morning daylight helps set your body clock for the night ahead.',
  'Eating a mix of colours across the week covers a wider range of nutrients.',
  'Two minutes of slow breathing can calm stress in the moment.',
  'Keep a glass of water where you work so drinking takes no effort.',
  'Charging your phone outside the bedroom makes the screen-free hour easier.',
  'A missed day is not a failed week. Start again with the next small action.'
];

// ---------- helpers ----------
var $ = function (s, r) { return (r || document).querySelector(s); };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
var pad = function (n) { return String(n).padStart(2, '0'); };
var fmtKey = function (dt) { return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()); };
var parseKey = function (k) { var p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
var addDays = function (k, n) { var dt = parseKey(k); dt.setDate(dt.getDate() + n); return fmtKey(dt); };
var todayKey = function () { return fmtKey(new Date()); };
var weekdayOf = function (k) { return parseKey(k).getDay(); };
var dayIndex = function (k) { return Math.floor(parseKey(k).getTime() / 864e5); };
var num = function (v) { var n = parseFloat(v); return isFinite(n) ? n : null; };
var clamp = function (n, a, b) { return Math.min(b, Math.max(a, n)); };
var avg = function (arr) { var v = arr.filter(function (x) { return x != null && isFinite(x); }); return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null; };
var shortLabel = function (k) { return parseKey(k).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };
var rangeKeys = function (n) { var out = [], t = todayKey(); for (var i = n - 1; i >= 0; i--) out.push(addDays(t, -i)); return out; };
var colorVar = function (c) { return 'var(--' + (COLORS.indexOf(c) >= 0 ? c : 'c1') + ')'; };

// ---------- state ----------
var LS_KEY = 'health-tracker-v1';
var state = null;
var currentKey = todayKey();
var tab = 'today';
var range = 30;
var ui = {
  status: 'Saved on this device', theme: 'system', clearArmed: false, exportBox: null,
  breathe: { on: false, pattern: 'box', cycles: 0, timer: null },
  focus: { mins: 25, left: 1500, running: false, timer: null, habitId: '' },
  sheet: null
};

var emptyDay = function () {
  return { habits: {}, meds: {}, water: 0, sleep: null, sleepQ: 0, mood: 0, energy: 0, steps: null, workout: { type: '', min: 0 }, weight: null, fruitVeg: 0, note: '', bp: null, hr: null, symptoms: [], meals: [] };
};
var isEmptyDay = function (d) {
  return !Object.keys(d.habits).some(function (k) { return !!d.habits[k]; }) && !Object.keys(d.meds).some(function (k) { return !!d.meds[k]; }) &&
    !d.water && d.sleep == null && !d.sleepQ && !d.mood && !d.energy && d.steps == null && !d.workout.min && !d.workout.type &&
    d.weight == null && !d.fruitVeg && !String(d.note || '').trim() && !d.bp && d.hr == null && !d.symptoms.length && !d.meals.length;
};
var dayOrEmpty = function (k) {
  var e = emptyDay(), d = state.days[k];
  if (!d) return e;
  return Object.assign(e, d, {
    habits: Object.assign({}, d.habits || {}), meds: Object.assign({}, d.meds || {}),
    workout: Object.assign({}, e.workout, d.workout || {}),
    symptoms: Array.isArray(d.symptoms) ? d.symptoms.slice() : [], meals: Array.isArray(d.meals) ? d.meals.slice() : []
  });
};
var ensureDay = function (k) {
  var d = dayOrEmpty(k);
  state.days[k] = d;
  return d;
};
var prune = function () {
  Object.keys(state.days).forEach(function (k) { if (isEmptyDay(dayOrEmpty(k))) delete state.days[k]; });
};

var sanitizeHabit = function (h) {
  if (!h || !h.id || !h.name) return null;
  var base = DEFAULT_HABITS.filter(function (x) { return x.id === h.id; })[0] || {};
  var link = h.link || h.auto || base.link || null;
  var kind = ['check', 'count', 'timer'].indexOf(h.kind) >= 0 ? h.kind : (base.kind || 'check');
  var days = Array.isArray(h.days) && h.days.length ? h.days.filter(function (n) { return n >= 0 && n <= 6; }) : [0, 1, 2, 3, 4, 5, 6];
  return {
    id: String(h.id), name: String(h.name).slice(0, 80),
    icon: String(h.icon || base.icon || '●').slice(0, 2),
    color: COLORS.indexOf(h.color) >= 0 ? h.color : (base.color || 'c1'),
    kind: kind, target: Number(h.target) || base.target || 1,
    unit: String(h.unit || base.unit || '').slice(0, 20),
    days: days.length ? days : [0, 1, 2, 3, 4, 5, 6],
    category: CATEGORIES.indexOf(h.category) >= 0 ? h.category : (base.category || 'Custom'),
    link: link, archived: !!h.archived, note: String(h.note || '').slice(0, 200)
  };
};
var defaultHabits = function () { return DEFAULT_HABITS.map(sanitizeHabit); };
var migrate = function (raw) {
  var s = { v: 2, habits: [], goals: Object.assign({}, DEFAULT_GOALS), meds: [], targets: [], days: {} };
  if (!raw || typeof raw !== 'object') { s.habits = defaultHabits(); return s; }
  if (raw.goals && typeof raw.goals === 'object') s.goals = Object.assign({}, DEFAULT_GOALS, raw.goals);
  if (raw.days && typeof raw.days === 'object') s.days = raw.days;
  if (Array.isArray(raw.meds)) s.meds = raw.meds.filter(function (m) { return m && m.id && m.name; });
  if (Array.isArray(raw.targets)) s.targets = raw.targets.filter(function (t) { return t && t.id && t.habitId; });
  if (Array.isArray(raw.habits) && raw.habits.length) s.habits = raw.habits.map(sanitizeHabit).filter(Boolean);
  if (!s.habits.length) s.habits = defaultHabits();
  return s;
};

// ---------- habit logic ----------
var activeHabits = function () { return state.habits.filter(function (h) { return !h.archived; }); };
var scheduledOn = function (h, k) { return h.days.indexOf(weekdayOf(k)) >= 0; };
var habitsForDay = function (k) { return activeHabits().filter(function (h) { return scheduledOn(h, k); }); };
var linkValue = function (d, link) {
  switch (link) {
    case 'water': return d.water;
    case 'sleep': return d.sleep || 0;
    case 'steps': return d.steps || 0;
    case 'fruitVeg': return d.fruitVeg;
    case 'workout': return d.workout.min;
  }
  return 0;
};
var linkGoal = function (link) {
  var g = state.goals;
  return { water: g.water, sleep: g.sleep, steps: g.steps, fruitVeg: g.fruitVeg, workout: g.workoutMin }[link] || 0;
};
// Returns { v, t } in the habit's own unit: check 0/1, count units, timer seconds, linked metrics in their unit.
var habitNumbers = function (d, h) {
  if (h.link) return { v: linkValue(d, h.link), t: linkGoal(h.link) };
  var raw = d.habits[h.id];
  if (h.kind === 'check') return { v: raw ? 1 : 0, t: 1 };
  if (h.kind === 'count') return { v: Number(raw) || 0, t: h.target || 1 };
  return { v: Number(raw) || 0, t: (h.target || 1) * 60 };
};
var habitDone = function (d, h) { var n = habitNumbers(d, h); return n.t > 0 && n.v >= n.t; };
var habitProgress = function (d, h) { var n = habitNumbers(d, h); return n.t > 0 ? Math.min(1, n.v / n.t) : 0; };
var dayScore = function (k) {
  var list = habitsForDay(k);
  if (!list.length) return 0;
  var d = dayOrEmpty(k);
  return list.filter(function (h) { return habitDone(d, h); }).length / list.length;
};
var streakFor = function (h, k) {
  var cur = k, n = 0, guard = 0;
  if (scheduledOn(h, cur) && !habitDone(dayOrEmpty(cur), h)) cur = addDays(cur, -1);
  while (guard++ < 3650) {
    if (!scheduledOn(h, cur)) { cur = addDays(cur, -1); continue; }
    if (habitDone(dayOrEmpty(cur), h)) { n++; cur = addDays(cur, -1); } else break;
  }
  return n;
};
var bestStreak = function (h) {
  var keys = Object.keys(state.days).sort();
  if (!keys.length) return 0;
  var k = keys[0], end = todayKey(), best = 0, cur = 0, guard = 0;
  while (k <= end && guard++ < 5000) {
    if (scheduledOn(h, k)) {
      if (habitDone(dayOrEmpty(k), h)) { cur++; if (cur > best) best = cur; } else cur = 0;
    }
    k = addDays(k, 1);
  }
  return best;
};
var autoLabel = function (h, d) {
  var n = habitNumbers(d, h);
  var unit = h.link === 'water' ? 'glasses' : h.link === 'sleep' ? 'h' : h.link === 'steps' ? 'steps' : h.link === 'workout' ? 'min' : h.unit;
  var fmt = function (x) { return h.link === 'steps' ? Math.round(x).toLocaleString('en-IN') : (Math.round(x * 10) / 10).toString(); };
  return fmt(n.v) + ' of ' + fmt(n.t) + ' ' + unit;
};
var periodKeys = function (period) {
  var today = todayKey(), out = [];
  var start = period === 'month' ? today.slice(0, 8) + '01' : addDays(today, -((weekdayOf(today) + 6) % 7));
  for (var k = start; k <= today; k = addDays(k, 1)) out.push(k);
  return out;
};
var targetProgress = function (t) {
  var h = state.habits.filter(function (x) { return x.id === t.habitId; })[0];
  if (!h) return { done: 0, target: t.target, pct: 0, missing: true };
  var keys = periodKeys(t.period || 'week');
  var done = keys.filter(function (k) { return scheduledOn(h, k) && habitDone(dayOrEmpty(k), h); }).length;
  return { done: done, target: t.target, pct: Math.min(1, done / Math.max(1, t.target)), missing: false };
};
var medsForDay = function (k) {
  var wd = weekdayOf(k);
  return state.meds.filter(function (m) { return m.active !== false && (!m.days || m.days.indexOf(wd) >= 0); });
};

// ---------- feedback and theme ----------
var setStatus = function (m) {
  ui.status = m;
  var el = document.getElementById('status');
  if (el) el.textContent = m;
};
var toast = function (msg) {
  var box = document.getElementById('toasts');
  if (!box) return;
  var t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(function () { t.remove(); }, 2600);
};
var saveLocal = function () { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* blocked */ } };
var loadLocal = function () { try { var r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } };
var applyTheme = function (v) {
  var root = document.documentElement;
  if (v === 'light' || v === 'dark') root.setAttribute('data-theme', v); else root.removeAttribute('data-theme');
  ui.theme = v;
  try { localStorage.setItem('ht-theme', v); } catch (e) { /* ignore */ }
};

// ---------- sync ----------
var remoteRef = null, pendingTimer = null, writeChain = Promise.resolve();
var writeNow = function () {
  if (!remoteRef) return;
  clearTimeout(pendingTimer); pendingTimer = null;
  var body = JSON.parse(JSON.stringify(state));
  writeChain = writeChain.then(function () { return remoteRef.set(body); })
    .then(function () { setStatus('Synced to your account'); })
    .catch(function (err) {
      setStatus(err && err.code === 'quota_exceeded' ? 'Account storage is full. Export a backup and remove old days.' : 'Could not sync. Saved on this device.');
    });
};
var persist = function () {
  prune();
  saveLocal();
  if (remoteRef) { clearTimeout(pendingTimer); pendingTimer = setTimeout(writeNow, 700); }
};
var connect = async function () {
  try {
    var c = window.claude;
    if (!c || typeof c.use !== 'function') { setStatus('Saved on this device'); return; }
    var db = await c.use('db');
    var user = await c.use('user');
    var uid = db && user ? await user.id() : null;
    if (!uid) { setStatus('Saved on this device'); return; }
    remoteRef = db.doc('data/users/' + uid + '/tracker');
    var snap = await remoteRef.get();
    if (snap.exists && snap.data()) {
      state = migrate(snap.data());
      saveLocal();
      render();
      setStatus('Synced to your account');
    } else {
      setStatus('Synced to your account');
      if (Object.keys(state.days).length) writeNow();
    }
  } catch (err) {
    remoteRef = null;
    setStatus('Saved on this device');
  }
};
window.addEventListener('pagehide', function () { if (pendingTimer) writeNow(); });
