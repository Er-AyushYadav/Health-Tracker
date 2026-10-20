// Progress: stats, charts, habit consistency, week grid, custom targets, badges and insights.

var barChart = function (ds, valFn, goal, hitFn, fmt) {
  var vals = ds.map(function (x) { return valFn(x); });
  var nums = vals.filter(function (v) { return v != null; });
  var max = Math.max.apply(null, [goal || 0, 1].concat(nums)) * 1.15;
  var cols = ds.map(function (x, i) {
    var v = vals[i], hgt = v == null ? 0 : Math.max(3, v / max * 100);
    var title = shortLabel(x.k) + ': ' + (v == null ? 'not logged' : fmt(v));
    return '<div class="bar-col" title="' + esc(title) + '"><div class="bar' + (v != null && hitFn(v) ? ' hit' : '') + '" style="height:' + hgt.toFixed(1) + '%"></div></div>';
  }).join('');
  var line = goal ? '<div class="goal-line" style="bottom:' + (goal / max * 100).toFixed(1) + '%"></div>' : '';
  return '<div class="chart" role="img" aria-label="Bar chart over ' + ds.length + ' days">' + cols + line + '</div>' +
    '<div class="axis"><span>' + shortLabel(ds[0].k) + '</span><span>' + shortLabel(ds[ds.length - 1].k) + '</span></div>';
};

var spark = function (vals) {
  var pts = [];
  vals.forEach(function (v, i) { if (v != null) pts.push([i, v]); });
  if (pts.length < 2) return '<p class="hint">Log at least two weigh-ins to see a trend.</p>';
  var n = Math.max(vals.length - 1, 1), ys = pts.map(function (p) { return p[1]; });
  var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys), span = (hi - lo) || 1;
  var xy = pts.map(function (p) { return (p[0] / n * 300).toFixed(1) + ',' + (72 - (p[1] - lo) / span * 60 - 6).toFixed(1); });
  return '<svg class="spark" viewBox="0 0 300 80" preserveAspectRatio="none" role="img" aria-label="Weight trend"><polyline points="' + xy.join(' ') + '"/></svg>' +
    '<div class="axis"><span>Low ' + lo.toFixed(1) + '</span><span>High ' + hi.toFixed(1) + '</span></div>';
};

var cellValueFor = function (h, on) {
  if (!on) return 0;
  return h.kind === 'check' ? true : h.kind === 'count' ? h.target : h.target;
};

var weekGridHtml = function () {
  var keys = rangeKeys(7), manual = activeHabits();
  var head = keys.map(function (k) {
    var dt = parseKey(k);
    return '<th><button class="linkish" data-act="day" data-v="' + k + '" aria-label="Open ' + shortLabel(k) + '">' +
      dt.toLocaleDateString('en-IN', { weekday: 'short' }) + '<br><span class="muted">' + dt.getDate() + '</span></button></th>';
  }).join('');
  var rows = manual.map(function (h) {
    return '<tr><th scope="row"><span style="color:' + colorVar(h.color) + '">' + esc(h.icon) + '</span> ' + esc(h.name) + '</th>' + keys.map(function (k) {
      if (!scheduledOn(h, k)) return '<td><span class="muted" aria-label="not scheduled">&ndash;</span></td>';
      var d = dayOrEmpty(k), on = habitDone(d, h);
      if (h.link) return '<td><span aria-label="' + (on ? 'done' : 'not done') + '">' + (on ? '&#9679;' : '&#9675;') + '</span></td>';
      return '<td><button class="cellbtn' + (on ? ' on' : '') + '" data-act="wcell" data-id="' + h.id + '" data-v="' + k + '" aria-pressed="' + on + '" aria-label="' + esc(h.name) + ' on ' + shortLabel(k) + '" style="background:' + (on ? colorVar(h.color) : 'var(--surface-2)') + '">' + (on ? '&#10003;' : '') + '</button></td>';
    }).join('') + '</tr>';
  }).join('');
  var scores = keys.map(function (k) { return '<td>' + Math.round(dayScore(k) * 100) + '%</td>'; }).join('');
  return '<div class="table-scroll"><table class="wk"><thead><tr><th></th>' + head + '</tr></thead><tbody>' + rows +
    '<tr class="total"><th scope="row">Day score</th>' + scores + '</tr></tbody></table></div>' +
    '<p class="hint">Tap a box to mark a habit on that day. Habits connected to a measure fill in from your logs.</p>';
};

var badgesFor = function (ds) {
  var maxBest = 0;
  activeHabits().forEach(function (h) { var b = bestStreak(h); if (b > maxBest) maxBest = b; });
  var anyPerfect = Object.keys(state.days).some(function (k) { return habitsForDay(k).length && dayScore(k) === 1; });
  var anyDone = Object.keys(state.days).some(function (k) { return dayScore(k) > 0; });
  var logged = Object.keys(state.days).filter(function (k) { return !isEmptyDay(dayOrEmpty(k)); }).length;
  var list = [
    ['First step', 'Completed a habit', anyDone],
    ['Perfect day', 'Every habit done in one day', anyPerfect],
    ['Three in a row', 'A three-day streak', maxBest >= 3],
    ['One full week', 'A seven-day streak', maxBest >= 7],
    ['Thirty days', 'A thirty-day streak', maxBest >= 30],
    ['Hundred days', 'A hundred-day streak', maxBest >= 100],
    ['Two weeks of logging', 'Logged on 14 days', logged >= 14],
    ['Two months of logging', 'Logged on 60 days', logged >= 60]
  ];
  return list.map(function (b) {
    return '<div class="stat" style="' + (b[2] ? '' : 'opacity:.55') + '"><span class="label">' + (b[2] ? 'Earned' : 'Locked') + '</span><strong style="font-size:17px">' + b[0] + '</strong><span class="hint">' + b[1] + '</span></div>';
  }).join('');
};

var targetsHtml = function () {
  var list = state.targets.map(function (t) {
    var p = targetProgress(t), h = state.habits.filter(function (x) { return x.id === t.habitId; })[0];
    return '<li class="field" style="padding:10px 0;border-bottom:1px solid var(--line)"><div class="rate-top"><span>' + (h ? esc(h.name) : 'Removed habit') + ' &middot; ' + (t.period === 'month' ? 'this month' : 'this week') + '</span>' +
      '<span>' + p.done + ' of ' + p.target + ' days</span></div><div class="meter"><span style="width:' + Math.round(p.pct * 100) + '%"></span></div>' +
      '<div><button class="timer-btn" data-act="del-target" data-id="' + t.id + '">Remove goal</button></div></li>';
  }).join('');
  var opts = activeHabits().map(function (h) { return '<option value="' + h.id + '">' + esc(h.name) + '</option>'; }).join('');
  return (list ? '<ul style="list-style:none;margin:0;padding:0">' + list + '</ul>' : '<div class="empty">Set a goal such as "meditate on 5 days this week".</div>') +
    (opts ? '<form id="target-form" class="field-row" style="align-items:end"><label class="field"><span>Habit</span><select name="habitId">' + opts + '</select></label>' +
      '<label class="field"><span>Days</span><input name="target" type="number" min="1" max="31" value="5"></label>' +
      '<label class="field"><span>Period</span><select name="period"><option value="week">Week</option><option value="month">Month</option></select></label>' +
      '<button class="btn primary" type="submit">Add goal</button></form>' : '');
};

var insightsFor = function (ds, logged) {
  var out = [], g = state.goals;
  if (!logged.length) return ['Log a few days to see patterns here.'];
  var sl = ds.map(function (x) { return x.d.sleep; }).filter(function (v) { return v != null; });
  if (sl.length >= 3) {
    var a = avg(sl);
    out.push(a >= g.sleep ? 'You average ' + a.toFixed(1) + ' h of sleep, meeting your ' + g.sleep + ' h goal.' :
      'You average ' + a.toFixed(1) + ' h of sleep, under your ' + g.sleep + ' h goal. A fixed wake-up time is often the easiest lever.');
  }
  var st = ds.map(function (x) { return x.d.steps; }).filter(function (v) { return v != null; });
  if (st.length >= 3) {
    var s = avg(st);
    out.push(s >= g.steps ? 'Steps average ' + Math.round(s).toLocaleString('en-IN') + ' a day, above your goal.' :
      'Steps average ' + Math.round(s).toLocaleString('en-IN') + ' a day, below your ' + g.steps.toLocaleString('en-IN') + ' goal.');
  }
  var totalMin = ds.reduce(function (acc, x) { return acc + x.d.workout.min; }, 0);
  var weekly = ds.length ? totalMin / ds.length * 7 : 0;
  out.push(weekly >= 150 ? 'Activity averages about ' + Math.round(weekly) + ' minutes a week, in line with the common guideline of 150 minutes of moderate activity.' :
    'Activity averages about ' + Math.round(weekly) + ' minutes a week. The common guideline is 150 minutes of moderate activity.');
  var good = logged.filter(function (x) { return x.d.sleep != null && x.d.sleep >= g.sleep && x.d.mood > 0; }).map(function (x) { return x.d.mood; });
  var poor = logged.filter(function (x) { return x.d.sleep != null && x.d.sleep < g.sleep && x.d.mood > 0; }).map(function (x) { return x.d.mood; });
  if (good.length >= 2 && poor.length >= 2 && Math.abs(avg(good) - avg(poor)) >= 0.5) {
    out.push('Your mood averages ' + avg(good).toFixed(1) + ' of 5 on days you met your sleep goal, compared with ' + avg(poor).toFixed(1) + ' on other days.');
  }
  var rated = activeHabits().map(function (h) {
    var sched = ds.filter(function (x) { return scheduledOn(h, x.k); });
    return { h: h, r: sched.length ? sched.filter(function (x) { return habitDone(x.d, h); }).length / sched.length : null, n: sched.length };
  }).filter(function (x) { return x.r != null && x.n >= 3; }).sort(function (p, q) { return p.r - q.r; });
  if (rated.length) out.push('"' + rated[0].h.name + '" is your least consistent habit, done on ' + Math.round(rated[0].r * 100) + '% of its scheduled days.');
  return out;
};

var viewProgress = function () {
  var g = state.goals, keys = rangeKeys(range);
  var ds = keys.map(function (k) { var d = dayOrEmpty(k); return { k: k, d: d, has: !isEmptyDay(d) }; });
  var logged = ds.filter(function (x) { return x.has; });
  var sl = ds.map(function (x) { return x.d.sleep; });
  var water = avg(ds.map(function (x) { return x.d.water > 0 ? x.d.water : null; }));
  var steps = avg(ds.map(function (x) { return x.d.steps; }));
  var mood = avg(ds.map(function (x) { return x.d.mood || null; }));
  var score = avg(logged.map(function (x) { return dayScore(x.k); }));
  var perfect = ds.filter(function (x) { return habitsForDay(x.k).length && dayScore(x.k) === 1; }).length;
  var wts = ds.filter(function (x) { return x.d.weight != null; });
  var wChange = wts.length > 1 ? wts[wts.length - 1].d.weight - wts[0].d.weight : null;
  var workMin = ds.reduce(function (acc, x) { return acc + x.d.workout.min; }, 0);
  var f1 = function (v) { return v == null ? '–' : v.toFixed(1); };
  var fi = function (v) { return v == null ? '–' : Math.round(v).toLocaleString('en-IN'); };
  var stat = function (label, val, sub) { return '<div class="stat"><span class="label">' + label + '</span><strong>' + val + '</strong><span class="hint">' + sub + '</span></div>'; };
  var stats = '<div class="stats">' +
    stat('Habit score', score == null ? '–' : Math.round(score * 100) + '%', logged.length + ' of ' + ds.length + ' days logged') +
    stat('Perfect days', perfect, 'every habit done') +
    stat('Avg sleep', sl.some(function (v) { return v != null; }) ? f1(avg(sl)) + ' h' : '–', ds.filter(function (x) { return x.d.sleep != null && x.d.sleep >= g.sleep; }).length + ' days at goal') +
    stat('Avg steps', fi(steps), 'goal ' + fi(g.steps)) +
    stat('Avg water', water == null ? '–' : water.toFixed(1) + ' glasses', 'on logged days') +
    stat('Mood', mood == null ? '–' : mood.toFixed(1) + ' / 5', 'average') +
    stat('Exercise', workMin + ' min', 'total in range') +
    stat('Weight', wChange == null ? '–' : (wChange > 0 ? '+' : '') + wChange.toFixed(1) + ' ' + g.weightUnit, 'change in range') + '</div>';

  var rates = activeHabits().map(function (h) {
    var sched = ds.filter(function (x) { return scheduledOn(h, x.k); });
    var r = sched.length ? sched.filter(function (x) { return habitDone(x.d, h); }).length / sched.length : 0;
    return { h: h, r: r, n: sched.length };
  }).sort(function (p, q) { return q.r - p.r; });
  var rateList = rates.map(function (x) {
    var pc = Math.round(x.r * 100);
    return '<li><div class="rate-top"><span>' + esc(x.h.name) + '</span><span>' + (x.n ? pc + '%' : 'not scheduled') + '</span></div><div class="meter"><span style="width:' + pc + '%;background:' + colorVar(x.h.color) + '"></span></div></li>';
  }).join('');

  var heatKeys = rangeKeys(90), hh = ui.heatHabit !== 'all' ? activeHabits().filter(function (h) { return h.id === ui.heatHabit; })[0] : null;
  var heat = heatKeys.map(function (k) {
    var s, title;
    if (hh) { if (!scheduledOn(hh, k)) { s = -1; } else s = habitDone(dayOrEmpty(k), hh) ? 1 : 0; title = shortLabel(k) + ': ' + (s < 0 ? 'not scheduled' : s ? 'done' : 'missed'); }
    else { s = dayScore(k); title = shortLabel(k) + ': ' + Math.round(s * 100) + '%'; }
    var bg = s < 0 ? 'repeating-linear-gradient(45deg,var(--line) 0 2px,transparent 2px 5px)' : 'color-mix(in srgb, var(--accent) ' + (s === 0 ? 0 : Math.max(18, Math.round(s * 100))) + '%, var(--surface-2))';
    return '<i style="background:' + bg + '" title="' + esc(title) + '"></i>';
  }).join('');
  var heatOpts = '<option value="all"' + (ui.heatHabit === 'all' ? ' selected' : '') + '>All habits</option>' + activeHabits().map(function (h) {
    return '<option value="' + h.id + '"' + (ui.heatHabit === h.id ? ' selected' : '') + '>' + esc(h.name) + '</option>';
  }).join('');

  var pills = '<div class="pills" role="group" aria-label="Date range">' + [7, 30, 90].map(function (n) {
    return '<button aria-pressed="' + (range === n) + '" data-act="range" data-v="' + n + '">Last ' + n + ' days</button>';
  }).join('') + '</div>';

  var review = '<section class="card"><h2>Weekly review</h2><p class="hint">' + (function () {
    var wk = rangeKeys(7), wScore = avg(wk.map(function (k) { return dayScore(k); }));
    var wPerfect = wk.filter(function (k) { return habitsForDay(k).length && dayScore(k) === 1; }).length;
    var best = activeHabits().map(function (h) { return { h: h, n: wk.filter(function (k) { return scheduledOn(h, k) && habitDone(dayOrEmpty(k), h); }).length }; }).sort(function (p, q) { return q.n - p.n; })[0];
    return 'This week your habit score is ' + (wScore == null ? '–' : Math.round(wScore * 100) + '%') + ' with ' + wPerfect + ' perfect ' + (wPerfect === 1 ? 'day' : 'days') +
      (best && best.n ? '. Strongest habit: ' + best.h.name + ' (' + best.n + ' days).' : '.');
  })() + '</p><div class="table-scroll" style="margin-top:8px">' + weekGridHtml() + '</div></section>';

  return '<div class="stack">' + pills + stats + review +
    '<div class="cards">' +
    '<section class="card"><h2>Sleep hours</h2>' + barChart(ds, function (x) { return x.d.sleep; }, g.sleep, function (v) { return v >= g.sleep; }, function (v) { return v.toFixed(1) + ' h'; }) +
      '<p class="hint">Dashed line is your ' + g.sleep + '-hour goal.</p></section>' +
    '<section class="card"><h2>Steps</h2>' + barChart(ds, function (x) { return x.d.steps; }, g.steps, function (v) { return v >= g.steps; }, function (v) { return v.toLocaleString('en-IN') + ' steps'; }) +
      '<p class="hint">Dashed line is your ' + g.steps.toLocaleString('en-IN') + ' step goal.</p></section>' +
    '<section class="card"><h2>Weight</h2>' + spark(ds.map(function (x) { return x.d.weight; })) + '</section>' +
    '<section class="card"><div class="card-head"><h2>Consistency, 90 days</h2><label class="field" style="min-width:160px"><span>Show</span><select data-f="heatHabit">' + heatOpts + '</select></label></div>' +
      '<div class="heat" role="img" aria-label="Consistency per day">' + heat + '</div><p class="hint">Darker means more done. Hatched days were not scheduled.</p></section>' +
    '<section class="card"><h2>Habit consistency</h2><ul class="rates">' + rateList + '</ul></section>' +
    '<section class="card"><h2>Goals</h2>' + targetsHtml() + '</section>' +
    '<section class="card"><h2>Badges</h2><div class="stats">' + badgesFor(ds) + '</div></section>' +
    '</div>' +
    '<section class="card"><h2>Insights</h2><ul class="insights">' + insightsFor(ds, logged).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
    '<p class="hint">These are patterns from your own logs, not medical advice.</p></section></div>';
};
