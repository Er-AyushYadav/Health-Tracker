// Tools: breathing guide, focus timer that logs to a habit, and a grounding exercise.

// ----- logging helpers used by habit cards and the timer -----
var logMinutes = function (habitId, mins) {
  var h = state.habits.filter(function (x) { return x.id === habitId; })[0];
  if (!h) return false;
  var d = ensureDay(currentKey);
  if (h.link === 'workout') d.workout.min = clamp(d.workout.min + mins, 0, 600);
  else if (h.kind === 'timer' && !h.link) d.habits[h.id] = (Number(d.habits[h.id]) || 0) + mins * 60;
  else return false;
  persist();
  return true;
};
var metricStep = function (m, delta) {
  var d = ensureDay(currentKey);
  if (m === 'water') d.water = clamp(d.water + delta, 0, 30);
  else if (m === 'fruitVeg') d.fruitVeg = clamp(d.fruitVeg + delta, 0, 30);
  else if (m === 'workout') d.workout.min = clamp(d.workout.min + delta, 0, 600);
  persist();
};
var timerHabits = function () {
  return activeHabits().filter(function (h) { return !h.link && h.kind === 'timer'; });
};

// ----- focus timer -----
var fmtClock = function (s) { return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };
var updateFocusDisplay = function () {
  var el = document.getElementById('focus-time');
  if (el) el.textContent = fmtClock(ui.focus.left);
  var btn = document.getElementById('focus-toggle');
  if (btn) btn.textContent = ui.focus.running ? 'Pause' : (ui.focus.left < ui.focus.mins * 60 && ui.focus.left > 0 ? 'Resume' : 'Start');
};
var focusTick = function () {
  var f = ui.focus;
  f.left -= 1;
  if (f.left <= 0) {
    f.left = 0; f.running = false; f.done = true;
    clearInterval(f.timer); f.timer = null;
    toast('Focus session complete.');
    render();
    return;
  }
  updateFocusDisplay();
};
var focusToggle = function () {
  var f = ui.focus;
  if (f.running) { f.running = false; clearInterval(f.timer); f.timer = null; updateFocusDisplay(); return; }
  if (f.left <= 0) { f.left = f.mins * 60; f.done = false; }
  f.running = true;
  f.timer = setInterval(focusTick, 1000);
  updateFocusDisplay();
};
var focusReset = function () {
  var f = ui.focus;
  clearInterval(f.timer); f.timer = null;
  f.running = false; f.done = false; f.left = f.mins * 60;
  updateFocusDisplay();
};
var focusSetMins = function (m) {
  var f = ui.focus;
  if (f.running) return;
  f.mins = m; f.left = m * 60; f.done = false;
};

// ----- breathing -----
var breathStep = function (i) {
  var b = ui.breathe;
  if (!b.on) return;
  var steps = BREATH[b.pattern].steps, step = steps[i % steps.length];
  if (i > 0 && i % steps.length === 0) b.cycles++;
  b.index = i;
  var orb = document.getElementById('breath-orb'), label = document.getElementById('breath-label');
  var cyc = document.getElementById('breath-cycles');
  if (orb) {
    orb.style.setProperty('--dur', step[1] + 's');
    if (step[0] === 'Breathe in') orb.classList.add('in');
    else if (step[0] === 'Breathe out') orb.classList.remove('in');
  }
  if (label) label.textContent = step[0] + ' for ' + step[1] + ' seconds';
  if (cyc) cyc.textContent = b.cycles + (b.cycles === 1 ? ' cycle' : ' cycles') + ' completed';
  b.timer = setTimeout(function () { breathStep(i + 1); }, step[1] * 1000);
};
var breathStart = function () {
  var b = ui.breathe;
  if (b.on) return;
  b.on = true; b.cycles = 0;
  breathStep(0);
  render();
};
var breathStop = function () {
  var b = ui.breathe;
  clearTimeout(b.timer); b.timer = null; b.on = false;
};
var breathCycleSeconds = function (pattern) {
  return BREATH[pattern].steps.reduce(function (a, s) { return a + s[1]; }, 0);
};

var viewTools = function () {
  var f = ui.focus, b = ui.breathe;
  var tHabits = timerHabits();
  var habitOpts = '<option value="">No habit</option>' + tHabits.map(function (h) {
    return '<option value="' + h.id + '"' + (f.habitId === h.id ? ' selected' : '') + '>' + esc(h.name) + '</option>';
  }).join('');
  var patternPills = Object.keys(BREATH).map(function (k) {
    return '<button aria-pressed="' + (b.pattern === k) + '" data-act="breath-pattern" data-v="' + k + '"' + (b.on ? ' disabled' : '') + '>' + BREATH[k].name + '</button>';
  }).join('');
  var durPills = [5, 10, 15, 25, 45].map(function (m) {
    return '<button aria-pressed="' + (f.mins === m) + '" data-act="focus-mins" data-v="' + m + '"' + (f.running ? ' disabled' : '') + '>' + m + ' min</button>';
  }).join('');

  var breathing = '<section class="card"><div class="card-head"><h2>Breathing</h2><div class="pills">' + patternPills + '</div></div>' +
    '<div class="breath-stage"><div class="breath-orb' + (b.on ? ' in' : '') + '" id="breath-orb" aria-hidden="true"></div></div>' +
    '<p class="big-time" style="font-size:18px;margin:0" id="breath-label" aria-live="polite">' + (b.on ? 'Starting' : 'Ready when you are') + '</p>' +
    '<p class="hint" id="breath-cycles" style="text-align:center">' + b.cycles + (b.cycles === 1 ? ' cycle' : ' cycles') + ' completed</p>' +
    '<div class="row" style="justify-content:center"><button class="btn primary" data-act="breath-toggle">' + (b.on ? 'Stop' : 'Start breathing') + '</button></div>' +
    '<div class="field-row"><label class="field"><span>Log this session to</span><select id="breath-habit">' + habitOpts + '</select></label>' +
    '<div class="field" style="align-self:end"><button class="btn" data-act="breath-log"' + (b.cycles ? '' : ' disabled') + '>Log ' + Math.max(1, Math.round(b.cycles * breathCycleSeconds(b.pattern) / 60)) + ' min</button></div></div>' +
    '</section>';

  var focus = '<section class="card"><div class="card-head"><h2>Focus timer</h2><div class="pills">' + durPills + '</div></div>' +
    '<p class="big-time" id="focus-time" aria-live="off">' + fmtClock(f.left) + '</p>' +
    '<div class="row" style="justify-content:center">' +
      '<button class="btn primary" id="focus-toggle" data-act="focus-toggle">' + (f.running ? 'Pause' : (f.left < f.mins * 60 && f.left > 0 ? 'Resume' : 'Start')) + '</button>' +
      '<button class="btn" data-act="focus-reset">Reset</button></div>' +
    '<label class="field"><span>Count this session toward</span><select data-f="focusHabit">' + habitOpts + '</select></label>' +
    (f.done ? '<div class="row" style="justify-content:center"><button class="btn primary" data-act="focus-log"' + (f.habitId ? '' : ' disabled') + '>Log ' + f.mins + ' min</button></div>' +
      (f.habitId ? '' : '<p class="hint" style="text-align:center">Choose a habit above to log this session.</p>') : '') +
    '<p class="hint">The timer keeps running while you use other parts of the tracker.</p></section>';

  var grounding = '<section class="card"><h2>Grounding: 5-4-3-2-1</h2><p class="hint">Use this when your mind is racing. Take your time with each step.</p>' +
    '<ol style="margin:0;padding-left:20px;display:grid;gap:6px">' +
    '<li>Name 5 things you can see.</li><li>Name 4 things you can feel.</li><li>Name 3 things you can hear.</li>' +
    '<li>Name 2 things you can smell.</li><li>Name 1 thing you can taste.</li></ol></section>';

  return '<div class="cards">' + breathing + focus + grounding + '</div>';
};
