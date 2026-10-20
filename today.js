// Today: hero progress, habit cards grouped by category, and the daily log cards.

var greetingFor = function () {
  var h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

var heroText = function (list, d, p) {
  if (!list.length) return 'Nothing is scheduled for this day. Add habits in the Habits tab, or just log how you feel.';
  var left = list.filter(function (h) { return !habitDone(d, h); }).length;
  if (p === 1) return 'Every habit is done. That is a complete day.';
  if (left === 1) return 'One habit left. You are close.';
  return left + ' habits left today. Start with the quickest one.';
};

var viewToday = function () {
  var k = currentKey, d = dayOrEmpty(k), p = dayScore(k), list = habitsForDay(k);
  var doneN = list.filter(function (h) { return habitDone(d, h); }).length;
  var streaks = activeHabits().filter(function (h) { return streakFor(h, k) >= 2; }).length;
  var unscheduled = activeHabits().length - list.length;
  var note = k !== todayKey() ? '<p class="hint">You are editing a past day. Changes save automatically.</p>' : '';

  var hero = '<section class="card"><div class="hero">' + ringHtml(p) +
    '<div class="hero-text"><h2>' + greetingFor() + '</h2><p>' + esc(heroText(list, d, p)) + '</p>' +
    '<div class="chips"><span class="chip" style="cursor:default">' + doneN + ' of ' + list.length + ' done</span>' +
    '<span class="chip" style="cursor:default">' + streaks + ' active streaks</span>' +
    (unscheduled > 0 ? '<span class="chip" style="cursor:default">' + unscheduled + ' not scheduled today</span>' : '') +
    '</div></div></div></section>';

  var groups = CATEGORIES.map(function (cat) {
    var items = list.filter(function (h) { return h.category === cat; });
    if (!items.length) return '';
    return '<div><div class="cat-title"><span>' + cat + '</span></div><div class="habit-list" style="margin-top:8px">' +
      items.map(function (h) { return habitCardHtml(h, k, d); }).join('') + '</div></div>';
  }).join('');
  var habitsSection = '<section class="card"><div class="card-head"><h2>Today&rsquo;s habits</h2><button class="timer-btn" data-act="tab" data-v="tools">Breathing and focus</button></div>' +
    (groups || '<div class="empty">No habits are scheduled for this day.</div>') + '</section>';

  var meds = medsForDay(k);
  var medCard = '<section class="card"><h2>Medications and supplements</h2>' +
    (meds.length ? '<div style="display:grid;gap:8px">' + meds.map(function (m) {
      var on = !!d.meds[m.id];
      return '<button class="med" data-act="med" data-id="' + m.id + '" aria-pressed="' + on + '" style="border:0;cursor:pointer;text-align:left;color:inherit;font:inherit;' + (on ? 'background:var(--accent-soft)' : '') + '">' +
        '<span class="check-btn" style="width:34px;height:34px;--cc:var(--accent);pointer-events:none;font-size:14px">' + (on ? '&#10003;' : '') + '</span>' +
        '<span><strong>' + esc(m.name) + '</strong>' + (m.dose ? ' <span class="muted">&middot; ' + esc(m.dose) + '</span>' : '') +
        '<br><span class="hint">' + esc((m.times || []).join(', ') || 'Any time') + '</span></span></button>';
    }).join('') + '</div>' : '<div class="empty">Add medicines or supplements in Settings and they will appear here.</div>') + '</section>';

  var sleepCard = '<section class="card"><h2>Sleep quality</h2>' +
    '<div class="seg" role="group" aria-label="Sleep quality">' + [1, 2, 3, 4, 5].map(function (q) {
      return '<button aria-pressed="' + (d.sleepQ === q) + '" data-act="sleepq" data-v="' + q + '">' + q + '</button>';
    }).join('') + '</div><p class="hint">' + (d.sleepQ ? 'Rated ' + d.sleepQ + ' of 5' : 'Rate how restful it felt, from 1 to 5') + '. Goal ' + state.goals.sleep + ' hours.</p></section>';

  var scale = function (key, label, val) {
    return '<div class="field"><span>' + label + '</span><div class="seg" role="group" aria-label="' + label + '">' +
      [1, 2, 3, 4, 5].map(function (n) { return '<button aria-pressed="' + (val === n) + '" data-act="' + key + '" data-v="' + n + '" aria-label="' + n + ' of 5">' + n + '</button>'; }).join('') +
      '</div><span class="seg-label">' + (val ? MOOD_LABELS[val - 1] : 'Not logged yet') + '</span></div>';
  };
  var moodCard = '<section class="card"><h2>Mood and energy</h2>' + scale('mood', 'Mood', d.mood) + scale('energy', 'Energy', d.energy) + '</section>';

  var bp = d.bp || {};
  var bodyCard = '<section class="card"><h2>Vitals and body</h2><div class="field-row">' +
    '<label class="field"><span>Weight (' + state.goals.weightUnit + ')</span><input type="number" inputmode="decimal" min="20" max="400" step="0.1" data-f="weight" value="' + (d.weight == null ? '' : d.weight) + '"></label>' +
    '<label class="field"><span>Resting heart rate</span><input type="number" inputmode="numeric" min="25" max="220" step="1" data-f="hr" value="' + (d.hr == null ? '' : d.hr) + '" placeholder="bpm"></label></div>' +
    '<div class="field-row"><label class="field"><span>Blood pressure, top</span><input type="number" inputmode="numeric" min="60" max="260" step="1" data-f="bpSys" value="' + (bp.sys || '') + '" placeholder="systolic"></label>' +
    '<label class="field"><span>Blood pressure, bottom</span><input type="number" inputmode="numeric" min="30" max="160" step="1" data-f="bpDia" value="' + (bp.dia || '') + '" placeholder="diastolic"></label></div>' +
    '<p class="hint">Record readings when you take them. Share trends with a clinician rather than acting on single values.</p></section>';

  var activityCard = '<section class="card"><h2>Activity log</h2>' +
    '<div class="field-row"><label class="field"><span>Steps</span><input type="number" inputmode="numeric" min="0" max="200000" step="100" data-f="steps" value="' + (d.steps == null ? '' : d.steps) + '"></label>' +
    '<label class="field"><span>Workout type</span><select data-f="workoutType">' + WORKOUT_TYPES.map(function (t) {
      return '<option value="' + t + '"' + (t === d.workout.type ? ' selected' : '') + '>' + (t || 'None') + '</option>';
    }).join('') + '</select></label></div>' +
    '<div class="meter" aria-hidden="true"><span style="width:' + (d.steps == null ? 0 : Math.min(100, Math.round(d.steps / state.goals.steps * 100))) + '%"></span></div>' +
    '<p class="hint">Goal ' + state.goals.steps.toLocaleString('en-IN') + ' steps. Exercise minutes are logged on the exercise habit above.</p></section>';

  var symptomCard = '<section class="card"><h2>How you feel</h2><div class="chips" role="group" aria-label="Symptoms and feelings">' +
    SYMPTOMS.map(function (s) {
      var on = d.symptoms.indexOf(s) >= 0;
      return '<button class="chip" aria-pressed="' + on + '" data-act="symptom" data-v="' + esc(s) + '">' + esc(s) + '</button>';
    }).join('') + '</div></section>';

  var mealList = d.meals.map(function (m, i) {
    return '<li class="meal"><span class="meal-type">' + esc(m.type) + '</span><span>' + esc(m.text) + '</span>' +
      '<button class="timer-btn" data-act="meal-del" data-v="' + i + '" aria-label="Remove meal">Remove</button></li>';
  }).join('');
  var mealCard = '<section class="card"><h2>Meals</h2>' +
    (mealList ? '<ul style="list-style:none;margin:0;padding:0;display:grid;gap:8px">' + mealList + '</ul>' : '<p class="hint">Note what you ate, in your own words. There is no calorie counting here.</p>') +
    '<form id="meal-form" class="field-row" style="align-items:end"><label class="field"><span>Meal</span><select name="type">' + MEAL_TYPES.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></label>' +
    '<label class="field" style="flex:2 1 200px"><span>What did you have?</span><input name="text" maxlength="200" placeholder="e.g. Dal, rice and salad"></label>' +
    '<button class="btn" type="submit">Add</button></form></section>';

  var journalCard = '<section class="card"><h2>Journal</h2><label class="field"><span>How did today go?</span>' +
    '<textarea rows="4" maxlength="2000" data-f="note" placeholder="A win, a struggle, something you noticed about your body or mood">' + esc(d.note) + '</textarea></label></section>';
  var tipCard = '<section class="card tip"><h2>Tip for the day</h2><p>' + esc(TIPS[dayIndex(k) % TIPS.length]) + '</p></section>';

  return note + hero + '<div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))">' + habitsSection + '<div class="stack" style="gap:16px">' +
    medCard + moodCard + sleepCard + '</div></div>' +
    '<div class="cards">' + activityCard + bodyCard + symptomCard + mealCard + journalCard + tipCard + '</div>';
};

var ringHtml = function (p) {
  var r = 40, c = 2 * Math.PI * r, pc = Math.round(p * 100);
  return '<svg class="ring" viewBox="0 0 96 96" role="img" aria-label="' + pc + '% of habits done">' +
    '<circle class="ring-bg" cx="48" cy="48" r="' + r + '"/>' +
    '<circle class="ring-fg" cx="48" cy="48" r="' + r + '" stroke-dasharray="' + (c * p).toFixed(2) + ' ' + c.toFixed(2) + '" transform="rotate(-90 48 48)"/>' +
    '<text class="ring-text" x="48" y="54" text-anchor="middle">' + pc + '%</text></svg>';
};
