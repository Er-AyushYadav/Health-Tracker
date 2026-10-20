// Habits: cards for Today, the habit editor sheet, templates, and the Habits tab manager.
var DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

var scheduleLabel = function (h) {
  var d = h.days.slice().sort();
  if (d.length === 7) return 'Every day';
  if (d.join() === '1,2,3,4,5') return 'Weekdays';
  if (d.join() === '0,6') return 'Weekends';
  return d.map(function (n) { return DAY_NAMES[n]; }).join(' ');
};

// ----- sheet -----
var openSheet = function (title, bodyHtml, focusSel) {
  var el = document.getElementById('sheet');
  el.innerHTML = '<div class="sheet-panel" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">' +
    '<div class="sheet-head"><h2>' + esc(title) + '</h2><button class="btn ghost" data-sheet="close" aria-label="Close">Close</button></div>' +
    bodyHtml + '</div>';
  el.hidden = false;
  ui.sheet = title;
  var target = focusSel ? el.querySelector(focusSel) : el.querySelector('input, select, button');
  if (target) target.focus();
};
var closeSheet = function () {
  var el = document.getElementById('sheet');
  el.hidden = true;
  el.innerHTML = '';
  ui.sheet = null;
  if (ui.focus.timer && !ui.focus.running) { clearInterval(ui.focus.timer); ui.focus.timer = null; }
};

// ----- Today card -----
var habitCardHtml = function (h, k, d) {
  var n = habitNumbers(d, h), done = habitDone(d, h), p = Math.round(habitProgress(d, h) * 100);
  var s = streakFor(h, k);
  var streak = s > 1 ? '<span class="streak">' + s + ' day streak</span>' : '';
  var cc = 'style="--cc:' + colorVar(h.color) + '"';
  var control = '';
  var meta = h.category + ' &middot; ' + scheduleLabel(h);
  if (h.link === 'water' || h.link === 'fruitVeg') {
    var m = h.link;
    control = '<div class="counter"><button data-act="metric" data-m="' + m + '" data-v="-1" aria-label="Remove one">&minus;</button>' +
      '<output aria-live="polite">' + n.v + '/' + n.t + '</output>' +
      '<button data-act="metric" data-m="' + m + '" data-v="1" aria-label="Add one">+</button></div>';
  } else if (h.link === 'workout') {
    control = '<div class="counter"><button class="timer-btn" data-act="focus-open" data-id="' + h.id + '">Focus</button>' +
      '<button class="timer-btn" data-act="metric" data-m="workout" data-v="5">+5</button>' +
      '<output aria-live="polite">' + n.v + '/' + n.t + ' min</output></div>';
  } else if (h.link === 'sleep') {
    control = '<label class="sr-only" for="q-sleep">Hours slept</label><input id="q-sleep" type="number" min="0" max="24" step="0.25" data-f="sleep" value="' + (d.sleep == null ? '' : d.sleep) + '" style="width:84px" aria-label="Hours slept">';
  } else if (h.link === 'steps') {
    control = '<input type="number" min="0" max="200000" step="500" data-f="steps" value="' + (d.steps == null ? '' : d.steps) + '" style="width:110px" aria-label="Steps">';
  } else if (h.kind === 'check') {
    control = '<button class="check-btn" data-act="toggle" data-id="' + h.id + '" aria-pressed="' + done + '" aria-label="' + esc(h.name) + ': ' + (done ? 'done' : 'not done') + '">' + (done ? '&#10003;' : '') + '</button>';
  } else if (h.kind === 'count') {
    control = '<div class="counter"><button data-act="count" data-id="' + h.id + '" data-v="-1" aria-label="Remove one">&minus;</button>' +
      '<output aria-live="polite">' + n.v + '/' + n.t + '</output>' +
      '<button data-act="count" data-id="' + h.id + '" data-v="1" aria-label="Add one">+</button></div>';
  } else {
    var mins = Math.round(n.v / 60);
    control = '<div class="counter"><button class="timer-btn" data-act="focus-open" data-id="' + h.id + '" aria-label="Open focus timer for ' + esc(h.name) + '">Focus</button>' +
      '<button class="timer-btn" data-act="timer-add" data-id="' + h.id + '" data-v="5">+5</button>' +
      '<output aria-live="polite">' + mins + '/' + Math.round(n.t / 60) + ' min</output></div>';
  }
  var bar = '<div class="bar-track"><span style="width:' + p + '%"></span></div>';
  return '<div class="habit-card' + (done ? ' done' : '') + '" ' + cc + ' data-hid="' + h.id + '">' +
    '<div class="icon-chip" aria-hidden="true">' + esc(h.icon) + '</div>' +
    '<div class="habit-main"><div class="habit-name">' + esc(h.name) + '</div>' +
    '<div class="habit-meta"><span>' + meta + '</span>' + streak + '</div>' + bar + '</div>' +
    '<div>' + control + '</div></div>';
};

// ----- editor -----
var habitEditorHtml = function (h, isNew) {
  var v = h || { name: '', icon: ICONS[0], color: COLORS[0], kind: 'check', target: 1, unit: '', days: [0, 1, 2, 3, 4, 5, 6], category: 'Custom', link: '', note: '' };
  var pickers = function (list, cur, attr, cls) {
    return list.map(function (x) {
      return '<button type="button" class="chip ' + cls + '" data-act="pick" data-field="' + attr + '" data-v="' + x + '" aria-pressed="' + (cur === x) + '" aria-label="' + (attr === 'color' ? 'Colour ' + x : 'Icon ' + x) + '">' +
        (cls === 'swatch' ? '<span class="sw" style="background:' + colorVar(x) + '"></span>' : esc(x)) + '</button>';
    }).join('');
  };
  var dayBoxes = DAY_NAMES.map(function (n, i) {
    return '<label class="chip" style="display:inline-flex;align-items:center;gap:6px"><input type="checkbox" name="days" value="' + i + '"' + (v.days.indexOf(i) >= 0 ? ' checked' : '') + ' style="width:auto;min-height:0;margin:0">' + n + '</label>';
  }).join('');
  var linkOpts = [['', 'None (I check it off)'], ['water', 'Water glasses'], ['sleep', 'Sleep hours'], ['steps', 'Steps'], ['fruitVeg', 'Fruit and veg'], ['workout', 'Exercise minutes']];
  return '<form id="habit-form" class="stack" style="gap:12px">' +
    '<input type="hidden" name="id" value="' + (isNew ? '' : esc(v.id || '')) + '">' +
    '<input type="hidden" name="icon" value="' + esc(v.icon) + '">' +
    '<input type="hidden" name="color" value="' + esc(v.color) + '">' +
    '<label class="field"><span>Name</span><input name="name" maxlength="80" required value="' + esc(v.name) + '" placeholder="e.g. Practise the piano"></label>' +
    '<div class="field"><span>Icon</span><div class="chips">' + pickers(ICONS, v.icon, 'icon', 'icon') + '</div></div>' +
    '<div class="field"><span>Colour</span><div class="chips">' + pickers(COLORS, v.color, 'color', 'swatch') + '</div></div>' +
    '<div class="field-row">' +
      '<label class="field"><span>Category</span><select name="category">' + CATEGORIES.map(function (c) { return '<option' + (c === v.category ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></label>' +
      '<label class="field"><span>Tracking</span><select name="kind" id="habit-kind"' + (v.link ? ' disabled' : '') + '>' +
        [['check', 'Tick off'], ['count', 'Count (e.g. glasses)'], ['timer', 'Minutes (timed)']].map(function (o) { return '<option value="' + o[0] + '"' + (v.kind === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
      '</select></label></div>' +
    '<div class="field-row">' +
      '<label class="field"><span>Daily target</span><input name="target" type="number" min="1" max="1440" step="1" value="' + (v.target || 1) + '"></label>' +
      '<label class="field"><span>Unit</span><input name="unit" maxlength="20" value="' + esc(v.unit) + '" placeholder="glasses, pages, min"></label></div>' +
    '<label class="field"><span>Connect to a tracked measure</span><select name="link">' +
      linkOpts.map(function (o) { return '<option value="' + o[0] + '"' + ((v.link || '') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
    '</select></label>' +
    '<div class="field"><span>Repeats on</span><div class="chips">' + dayBoxes + '</div></div>' +
    '<label class="field"><span>Note (optional)</span><input name="note" maxlength="200" value="' + esc(v.note) + '" placeholder="Why this matters to you"></label>' +
    '<div class="row" style="justify-content:space-between">' +
      (isNew ? '<span></span>' : '<button type="button" class="btn danger" data-act="archive" data-id="' + esc(v.id) + '">' + (v.archived ? 'Restore' : 'Archive') + '</button>') +
      '<div class="row"><button type="button" class="btn" data-sheet="close">Cancel</button><button class="btn primary" type="submit">Save habit</button></div></div>' +
    '</form>';
};

var templatesHtml = function () {
  return '<p class="hint">Start from a template, or build your own.</p><div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))">' +
    HABIT_TEMPLATES.map(function (t, i) {
      return '<button class="btn" style="text-align:left;display:grid;gap:4px" data-act="use-template" data-v="' + i + '"><span style="color:' + colorVar(t.color) + ';font-weight:800">' + esc(t.icon) + '</span>' +
        '<span>' + esc(t.name) + '</span><span class="hint">' + (t.kind === 'timer' ? t.target + ' min' : t.kind === 'count' ? t.target + ' ' + t.unit : 'Tick off') + '</span></button>';
    }).join('') + '</div>' +
    '<div class="row"><button class="btn primary" data-act="custom-habit">Build my own</button></div>';
};

var openHabitEditor = function (id) {
  var h = id ? state.habits.filter(function (x) { return x.id === id; })[0] : null;
  if (id && !h) return;
  openSheet(h ? 'Edit habit' : 'New habit', habitEditorHtml(h, !h), '#habit-form input[name="name"]');
};

var saveHabitForm = function (form) {
  var fd = new FormData(form);
  var name = String(fd.get('name') || '').trim().slice(0, 80);
  if (!name) { toast('Give the habit a name.'); return; }
  var days = fd.getAll('days').map(Number);
  if (!days.length) { toast('Choose at least one day.'); return; }
  var id = String(fd.get('id') || '') || ('h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
  var prev = state.habits.filter(function (x) { return x.id === id; })[0];
  var h = sanitizeHabit({
    id: id, name: name, icon: fd.get('icon'), color: fd.get('color'), kind: fd.get('kind') || (prev && prev.kind),
    target: Number(fd.get('target')) || 1, unit: fd.get('unit'), days: days, category: fd.get('category'),
    link: fd.get('link') || null, note: fd.get('note'), archived: prev ? prev.archived : false
  });
  if (prev) state.habits[state.habits.indexOf(prev)] = h; else state.habits.push(h);
  persist();
  closeSheet();
  render();
  toast(prev ? 'Habit updated.' : 'Habit added.');
};

// ----- Habits tab -----
var viewHabits = function () {
  var active = state.habits.filter(function (h) { return !h.archived; });
  var rows = active.map(function (h, i) {
    var s = streakFor(h, currentKey), best = bestStreak(h);
    return '<li class="habit-card" style="--cc:' + colorVar(h.color) + ';grid-template-columns:auto minmax(0,1fr) auto">' +
      '<div class="icon-chip" aria-hidden="true">' + esc(h.icon) + '</div>' +
      '<div class="habit-main"><div class="habit-name">' + esc(h.name) + '</div>' +
      '<div class="habit-meta"><span>' + h.category + ' &middot; ' + scheduleLabel(h) + '</span><span>Streak ' + s + ' &middot; best ' + best + '</span></div>' +
      '<div class="row" style="gap:6px">' +
        '<button class="timer-btn" data-act="edit-habit" data-id="' + h.id + '">Edit</button>' +
        '<button class="timer-btn" data-act="hmove" data-id="' + h.id + '" data-v="-1"' + (i === 0 ? ' disabled' : '') + ' aria-label="Move up">&#8593;</button>' +
        '<button class="timer-btn" data-act="hmove" data-id="' + h.id + '" data-v="1"' + (i === active.length - 1 ? ' disabled' : '') + ' aria-label="Move down">&#8595;</button>' +
      '</div></div><span></span></li>';
  }).join('');
  var archived = state.habits.filter(function (h) { return h.archived; }).map(function (h) {
    return '<li class="row" style="justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)"><span>' + esc(h.name) + '</span>' +
      '<button class="timer-btn" data-act="archive" data-id="' + h.id + '">Restore</button></li>';
  }).join('');
  return '<section class="card"><div class="card-head"><div><h2>Your habits</h2><p class="hint">' + active.length + ' active. Edit schedule, targets and connections, or reorder.</p></div>' +
    '<button class="btn primary" data-act="new-habit">New habit</button></div>' +
    (rows ? '<ul class="habit-list" style="list-style:none;margin:0;padding:0">' + rows + '</ul>' : '<div class="empty">No active habits. Add one to get started.</div>') +
    '</section>' +
    (archived ? '<section class="card"><h2>Archived</h2><p class="hint">Archived habits keep their history and stop appearing on Today.</p><ul style="list-style:none;margin:0;padding:0">' + archived + '</ul></section>' : '') +
    '<section class="card"><h2>Templates</h2>' + templatesHtml() + '</section>';
};
