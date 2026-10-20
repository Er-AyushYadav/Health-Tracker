// Settings: goals, medications, appearance, backup (export and import), and data deletion.

var toCSV = function () {
  var cols = ['date', 'habits_scheduled', 'habits_done', 'score_pct', 'water_glasses', 'sleep_hours', 'sleep_quality', 'mood', 'energy', 'steps',
    'workout_type', 'workout_minutes', 'weight', 'weight_unit', 'fruit_veg_servings', 'resting_hr', 'bp_systolic', 'bp_diastolic', 'symptoms', 'meals', 'note'];
  var q = function (v) { var s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  var rows = [cols.join(',')];
  Object.keys(state.days).sort().forEach(function (k) {
    var d = dayOrEmpty(k), list = habitsForDay(k);
    var done = list.filter(function (h) { return habitDone(d, h); }).length;
    var bp = d.bp || {};
    rows.push([k, list.length, done, Math.round(dayScore(k) * 100), d.water, d.sleep, d.sleepQ || '', d.mood || '', d.energy || '', d.steps,
      d.workout.type, d.workout.min, d.weight, state.goals.weightUnit, d.fruitVeg, d.hr, bp.sys || '', bp.dia || '',
      d.symptoms.join('; '), d.meals.map(function (m) { return m.type + ': ' + m.text; }).join(' | '), String(d.note).replace(/\s+/g, ' ')].map(q).join(','));
  });
  return rows.join('\n');
};

var deliver = async function (name, text) {
  try {
    var c = window.claude;
    var dl = c && typeof c.use === 'function' ? await c.use('downloads') : null;
    if (dl) { await dl.save({ filename: name, data: text }); setStatus('Saved ' + name); return; }
  } catch (err) {
    if (err && err.code === 'declined') { setStatus('Export cancelled.'); return; }
  }
  ui.exportBox = { name: name, text: text };
  render();
};

var viewSettings = function () {
  var g = state.goals;
  var exp = ui.exportBox
    ? '<div class="field"><span>Copy this export (' + esc(ui.exportBox.name) + ')</span><textarea id="export-text" class="export" readonly rows="6">' + esc(ui.exportBox.text) + '</textarea></div>' +
      '<div class="row"><button class="btn" data-act="copy-export">Copy to clipboard</button></div>' : '';
  var clear = ui.clearArmed
    ? '<p class="warn">This deletes all logged days, habits, medicines and goals. It cannot be undone.</p>' +
      '<div class="row"><button class="btn danger" data-act="clear">Yes, delete everything</button><button class="btn" data-act="clear-cancel">Cancel</button></div>'
    : '<div class="row"><button class="btn danger" data-act="clear">Delete all data</button></div>';
  var pill = function (val, label) { return '<button aria-pressed="' + (ui.theme === val) + '" data-act="theme" data-v="' + val + '">' + label + '</button>'; };
  var meds = state.meds.map(function (m) {
    return '<li class="med" style="grid-template-columns:minmax(0,1fr) auto;margin-bottom:8px"><span><strong>' + esc(m.name) + '</strong>' + (m.dose ? ' &middot; ' + esc(m.dose) : '') +
      '<br><span class="hint">' + esc((m.times || []).join(', ') || 'Any time') + ' &middot; ' + (m.active === false ? 'paused' : 'active') + '</span></span>' +
      '<span class="row" style="gap:6px"><button class="timer-btn" data-act="toggle-med" data-id="' + m.id + '">' + (m.active === false ? 'Resume' : 'Pause') + '</button>' +
      '<button class="timer-btn" data-act="del-med" data-id="' + m.id + '">Remove</button></span></li>';
  }).join('');
  return '<section class="card"><h2>Goals</h2><div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))">' +
    '<label class="field"><span>Water (glasses of 250 ml)</span><input type="number" min="1" max="30" step="1" value="' + g.water + '" data-g="water"></label>' +
    '<label class="field"><span>Sleep (hours)</span><input type="number" min="3" max="14" step="0.5" value="' + g.sleep + '" data-g="sleep"></label>' +
    '<label class="field"><span>Steps per day</span><input type="number" min="0" max="100000" step="500" value="' + g.steps + '" data-g="steps"></label>' +
    '<label class="field"><span>Fruit and vegetable servings</span><input type="number" min="0" max="30" step="1" value="' + g.fruitVeg + '" data-g="fruitVeg"></label>' +
    '<label class="field"><span>Exercise minutes per day</span><input type="number" min="0" max="600" step="5" value="' + g.workoutMin + '" data-g="workoutMin"></label>' +
    '<label class="field"><span>Weight unit</span><select data-g="weightUnit"><option value="kg"' + (g.weightUnit === 'kg' ? ' selected' : '') + '>kg</option><option value="lb"' + (g.weightUnit === 'lb' ? ' selected' : '') + '>lb</option></select></label>' +
    '</div></section>' +
    '<section class="card"><h2>Medicines and supplements</h2><p class="hint">Reminders are not sent by this page. They appear on Today so you can tick them off.</p>' +
    (meds ? '<ul style="list-style:none;margin:0;padding:0">' + meds + '</ul>' : '<div class="empty">None added yet.</div>') +
    '<form id="med-form" class="field-row" style="align-items:end">' +
      '<label class="field"><span>Name</span><input name="name" maxlength="60" required placeholder="e.g. Vitamin D"></label>' +
      '<label class="field"><span>Dose</span><input name="dose" maxlength="40" placeholder="e.g. 1000 IU"></label>' +
      '<label class="field"><span>Times</span><input name="times" maxlength="40" placeholder="08:00, 20:00"></label>' +
      '<button class="btn primary" type="submit">Add</button></form></section>' +
    '<section class="card"><h2>Appearance</h2><div class="pills" role="group" aria-label="Theme">' + pill('system', 'Match device') + pill('light', 'Light') + pill('dark', 'Dark') + '</div></section>' +
    '<section class="card"><h2>Backup</h2><p class="hint">Export everything you have logged, or restore from an earlier export.</p>' +
      '<div class="row"><button class="btn" data-act="export-json">Export JSON</button><button class="btn" data-act="export-csv">Export CSV</button>' +
      '<label class="btn">Import JSON<input type="file" accept=".json,application/json" data-f="import" class="sr-only"></label></div>' + exp + '</section>' +
    '<section class="card"><h2>Delete data</h2>' + clear + '</section>' +
    '<section class="card"><p class="hint">' + (remoteRef
      ? 'Your data is saved to your private space in this artifact and follows you across devices.'
      : 'Data is kept on this device. Signed-in viewers get sync across devices.') +
    ' This tracker is for personal record-keeping and is not medical advice. Talk to a clinician about symptoms, medicines or targets.</p><p class="hint credit-line">Developed by Ayush Yadav.</p></section>';
};
