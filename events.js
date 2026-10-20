// Events, shell rendering and startup. Handlers are delegated on document so the sheet and the app both work.

var header = function () {
  var isToday = currentKey === todayKey();
  var label = parseKey(currentKey).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  return '<header class="top"><div><h1>Health Tracker</h1><p class="sub" id="status" role="status">' + esc(ui.status) + '</p></div>' +
    '<div class="datebar"><button class="btn ghost" data-act="shift" data-v="-1" aria-label="Previous day">&#8249;</button>' +
    '<div class="datelabel">' + (isToday ? '<strong>Today</strong> &middot; ' : '') + esc(label) + '</div>' +
    '<button class="btn ghost" data-act="shift" data-v="1" aria-label="Next day"' + (isToday ? ' disabled' : '') + '>&#8250;</button></div></header>';
};

var render = function () {
  var app = document.getElementById('app');
  var body = tab === 'today' ? viewToday() : tab === 'habits' ? viewHabits() : tab === 'tools' ? viewTools() : tab === 'progress' ? viewProgress() : viewSettings();
  var tabs = '<nav class="tabs" role="tablist" aria-label="Sections">' + TABS.map(function (t) {
    return '<button role="tab" class="tab" aria-selected="' + (tab === t[0]) + '" data-act="tab" data-v="' + t[0] + '">' + t[1] + '</button>';
  }).join('') + '</nav>';
  app.innerHTML = header() + tabs + '<main class="stack" id="view">' + body + '</main>';
};

// ----- writers -----
var setDayField = function (f, el) {
  var d = ensureDay(currentKey), raw = el.value, n = num(raw);
  var bpSet = function (key, v, lo, hi) {
    var o = Object.assign({}, d.bp || {});
    if (v == null) delete o[key]; else o[key] = clamp(Math.round(v), lo, hi);
    d.bp = (o.sys || o.dia) ? o : null;
  };
  switch (f) {
    case 'sleep': d.sleep = n == null ? null : clamp(n, 0, 24); break;
    case 'steps': d.steps = n == null ? null : clamp(Math.round(n), 0, 200000); break;
    case 'weight': d.weight = n == null ? null : clamp(n, 20, 400); break;
    case 'hr': d.hr = n == null ? null : clamp(Math.round(n), 25, 220); break;
    case 'bpSys': bpSet('sys', n, 60, 260); break;
    case 'bpDia': bpSet('dia', n, 30, 160); break;
    case 'workoutType': d.workout.type = raw.slice(0, 30); break;
    case 'note': d.note = raw.slice(0, 2000); break;
  }
};

var setGoal = function (key, raw) {
  var g = state.goals;
  if (key === 'weightUnit') { g.weightUnit = raw === 'lb' ? 'lb' : 'kg'; return; }
  var lim = { water: [1, 30], sleep: [3, 14], steps: [0, 100000], fruitVeg: [0, 30], workoutMin: [0, 600] }[key];
  var n = num(raw);
  if (n == null || !lim) return;
  g[key] = clamp(key === 'sleep' ? n : Math.round(n), lim[0], lim[1]);
};

var moveHabit = function (id, dir) {
  var act = state.habits.filter(function (h) { return !h.archived; });
  var i = act.findIndex(function (h) { return h.id === id; }), j = i + dir;
  if (i < 0 || j < 0 || j >= act.length) return;
  var a = state.habits.indexOf(act[i]), b = state.habits.indexOf(act[j]);
  var t = state.habits[a]; state.habits[a] = state.habits[b]; state.habits[b] = t;
};

var toggleInList = function (arr, v) {
  var i = arr.indexOf(v);
  if (i >= 0) arr.splice(i, 1); else arr.push(v);
};

var importFile = function (file) {
  var r = new FileReader();
  r.onload = function () {
    try {
      var raw = JSON.parse(r.result);
      if (!raw || typeof raw !== 'object' || !raw.days) throw new Error('not an export');
      state = migrate(raw);
      persist();
      render();
      setStatus('Import complete.');
    } catch (e) { toast('That file is not a Health Tracker export.'); }
  };
  r.readAsText(file);
};

var copyExport = function () {
  var ta = document.getElementById('export-text');
  if (!ta) return;
  try {
    navigator.clipboard.writeText(ta.value).then(function () { toast('Copied.'); }, function () { ta.focus(); ta.select(); toast('Press Ctrl or Cmd + C to copy.'); });
  } catch (e) { ta.focus(); ta.select(); toast('Press Ctrl or Cmd + C to copy.'); }
};

// ----- click routing -----
var handleAct = function (act, el) {
  var v = el.getAttribute('data-v'), id = el.getAttribute('data-id'), m = el.getAttribute('data-m');
  var changed = false, d, h;
  switch (act) {
    case 'tab':
      if (ui.breathe.on) breathStop();
      tab = v; ui.clearArmed = false; ui.exportBox = null; break;
    case 'shift':
      var n = v === '0' ? todayKey() : addDays(currentKey, +v);
      currentKey = n > todayKey() ? todayKey() : n; break;
    case 'day': currentKey = v; tab = 'today'; break;
    case 'range': range = +v; break;
    case 'toggle': d = ensureDay(currentKey); d.habits[id] = !d.habits[id]; changed = true; break;
    case 'count':
      d = ensureDay(currentKey); d.habits[id] = clamp((Number(d.habits[id]) || 0) + (+v), 0, 999); changed = true; break;
    case 'timer-add': logMinutes(id, +v); break;
    case 'metric': metricStep(m, +v); break;
    case 'focus-open':
      h = state.habits.filter(function (x) { return x.id === id; })[0];
      ui.focus.habitId = id;
      if (h && !ui.focus.running && h.target) { ui.focus.mins = h.target; ui.focus.left = h.target * 60; ui.focus.done = false; }
      tab = 'tools'; break;
    case 'sleepq': d = ensureDay(currentKey); d.sleepQ = d.sleepQ === +v ? 0 : +v; changed = true; break;
    case 'mood': case 'energy': d = ensureDay(currentKey); d[act] = d[act] === +v ? 0 : +v; changed = true; break;
    case 'symptom': d = ensureDay(currentKey); toggleInList(d.symptoms, v); changed = true; break;
    case 'meal-del': d = ensureDay(currentKey); d.meals.splice(+v, 1); changed = true; break;
    case 'med': d = ensureDay(currentKey); d.meds[id] = !d.meds[id]; changed = true; break;
    case 'hmove': moveHabit(id, +v); changed = true; break;
    case 'edit-habit': openHabitEditor(id); return;
    case 'new-habit': case 'custom-habit': openHabitEditor(null); return;
    case 'use-template':
      var t = HABIT_TEMPLATES[+v];
      openSheet('New habit', habitEditorHtml(Object.assign({ days: [0, 1, 2, 3, 4, 5, 6], link: '', note: '', target: t.target || 1, unit: t.unit || '' }, t, { id: '', archived: false }), true), '#habit-form input[name="name"]');
      return;
    case 'archive':
      h = state.habits.filter(function (x) { return x.id === id; })[0];
      if (h) h.archived = !h.archived;
      closeSheet(); changed = true; break;
    case 'toggle-med':
      var mm = state.meds.filter(function (x) { return x.id === id; })[0];
      if (mm) mm.active = mm.active === false;
      changed = true; break;
    case 'del-med': state.meds = state.meds.filter(function (x) { return x.id !== id; }); changed = true; break;
    case 'del-target': state.targets = state.targets.filter(function (x) { return x.id !== id; }); changed = true; break;
    case 'theme': applyTheme(v); break;
    case 'export-json': deliver('health-tracker-' + todayKey() + '.json', JSON.stringify(Object.assign({ exportedAt: new Date().toISOString() }, state), null, 2)); return;
    case 'export-csv': deliver('health-tracker-' + todayKey() + '.csv', toCSV()); return;
    case 'copy-export': copyExport(); return;
    case 'clear':
      if (!ui.clearArmed) { ui.clearArmed = true; break; }
      if (ui.breathe.on) breathStop();
      state = migrate(null); ui.clearArmed = false; ui.exportBox = null; changed = true; break;
    case 'clear-cancel': ui.clearArmed = false; break;
    case 'breath-pattern': if (!ui.breathe.on) ui.breathe.pattern = v; break;
    case 'breath-toggle': if (ui.breathe.on) breathStop(); else breathStart(); break;
    case 'breath-log':
      var sel = document.getElementById('breath-habit'), hid = sel ? sel.value : '';
      var mins = Math.max(1, Math.round(ui.breathe.cycles * breathCycleSeconds(ui.breathe.pattern) / 60));
      if (!hid) { toast('Choose a habit to log to.'); return; }
      if (logMinutes(hid, mins)) { toast('Logged ' + mins + ' min.'); ui.breathe.cycles = 0; changed = true; }
      break;
    case 'focus-mins': focusSetMins(+v); break;
    case 'focus-toggle': focusToggle(); return;
    case 'focus-reset': focusReset(); break;
    case 'focus-log':
      if (logMinutes(ui.focus.habitId, ui.focus.mins)) { toast('Logged ' + ui.focus.mins + ' min.'); ui.focus.done = false; ui.focus.left = ui.focus.mins * 60; }
      changed = true; break;
    case 'wcell':
      h = state.habits.filter(function (x) { return x.id === id; })[0];
      if (!h) return;
      d = ensureDay(v);
      var on = habitDone(d, h);
      if (h.kind === 'check') d.habits[id] = !on;
      else if (h.kind === 'count') d.habits[id] = on ? 0 : h.target;
      else d.habits[id] = on ? 0 : h.target * 60;
      changed = true; break;
    case 'sheet-close': closeSheet(); return;
    case 'pick':
      var form = document.getElementById('habit-form');
      if (form) {
        var field = form.querySelector('input[name="' + el.getAttribute('data-field') + '"]');
        if (field) field.value = v;
        el.parentNode.querySelectorAll('[data-act="pick"]').forEach(function (b) { b.setAttribute('aria-pressed', b === el ? 'true' : 'false'); });
      }
      return;
    default: return;
  }
  if (changed) persist();
  render();
};

document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-act], [data-sheet]');
  if (!el || el.disabled) return;
  if (el.hasAttribute('data-sheet')) { closeSheet(); return; }
  handleAct(el.getAttribute('data-act'), el);
});

document.addEventListener('input', function (e) {
  var el = e.target;
  if (el.getAttribute && el.getAttribute('data-f') === 'note') { setDayField('note', el); persist(); }
});

document.addEventListener('change', function (e) {
  var el = e.target, f = el.getAttribute('data-f'), g = el.getAttribute('data-g');
  if (g) { setGoal(g, el.value); persist(); render(); return; }
  if (!f || f === 'note') return;
  if (f === 'import') { if (el.files && el.files[0]) importFile(el.files[0]); el.value = ''; return; }
  if (f === 'focusHabit') { ui.focus.habitId = el.value; render(); return; }
  if (f === 'heatHabit') { ui.heatHabit = el.value; render(); return; }
  setDayField(f, el);
  persist();
  render();
});

document.addEventListener('submit', function (e) {
  var form = e.target;
  if (form.id === 'habit-form') { e.preventDefault(); saveHabitForm(form); return; }
  if (form.id === 'meal-form') {
    e.preventDefault();
    var text = String(new FormData(form).get('text') || '').trim().slice(0, 200);
    if (!text) { toast('Describe the meal first.'); return; }
    var d = ensureDay(currentKey);
    d.meals.push({ type: String(new FormData(form).get('type') || 'Snack'), text: text });
    persist(); render(); return;
  }
  if (form.id === 'med-form') {
    e.preventDefault();
    var fd = new FormData(form), name = String(fd.get('name') || '').trim().slice(0, 60);
    if (!name) { toast('Give the medicine a name.'); return; }
    var times = String(fd.get('times') || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 6);
    state.meds.push({ id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: name, dose: String(fd.get('dose') || '').slice(0, 40), times: times, active: true });
    persist(); render(); toast('Added to Today.'); return;
  }
  if (form.id === 'target-form') {
    e.preventDefault();
    var tf = new FormData(form), tgt = clamp(Math.round(Number(tf.get('target')) || 1), 1, 31);
    state.targets.push({ id: 't' + Date.now().toString(36), habitId: String(tf.get('habitId')), target: tgt, period: tf.get('period') === 'month' ? 'month' : 'week' });
    persist(); render(); return;
  }
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && ui.sheet) closeSheet();
});

// ----- startup -----
ui.heatHabit = 'all';
try { ui.theme = localStorage.getItem('ht-theme') || 'system'; } catch (e) { ui.theme = 'system'; }
applyTheme(ui.theme);
state = migrate(loadLocal());
render();
connect();
