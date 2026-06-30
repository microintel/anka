// ══════════════════════════════════════════════════
//  CALCULATIONS
// ══════════════════════════════════════════════════
function pct(scored, max) {
  if (!max) return 0;
  return Math.round((scored / max) * 100 * 10) / 10;
}

function grade(p) {
  if (p >= 90) return 'O';
  if (p >= 80) return 'A+';
  if (p >= 70) return 'A';
  if (p >= 60) return 'B+';
  if (p >= 50) return 'B';
  if (p >= 40) return 'C';
  return 'F';
}

function pctClass(p) {
  if (p >= 70) return 'pct-high';
  if (p >= 50) return 'pct-mid';
  return 'pct-low';
}

// Normalizes subj.internal into an array of components.
// Supports the new array form ([{name,min,max,obtained}, ...]) as well as
// the legacy single-object form ({min,max,obtained}) for old saved data.
function internalComponents(subj) {
  const i = subj?.internal;
  if (Array.isArray(i)) return i;
  if (i && ((+i.max) || (+i.obtained) || (+i.min))) return [{ name: 'Internal', ...i }];
  return [];
}

// Totals for one subject (internal + external)
function calcSubjectTotal(subj) {
  const comps = internalComponents(subj);
  const intObtained = comps.reduce((s, c) => s + (+c.obtained || 0), 0);
  const intMax = comps.reduce((s, c) => s + (+c.max || 0), 0);
  const intMin = comps.reduce((s, c) => s + (+c.min || 0), 0);
  const e = subj.external || { min: 0, max: 0, obtained: 0 };
  const extObtained = +e.obtained || 0;
  const extMax = +e.max || 0;
  return {
    scored: intObtained + extObtained,
    max: intMax + extMax,
    intObtained, intMax, extObtained, extMax,
    intMin, extMin: +e.min || 0,
  };
}

// Whether a subject clears both internal & external minimums
function subjectPass(subj) {
  const t = calcSubjectTotal(subj);
  const intOk = t.intMax ? t.intObtained >= t.intMin : true;
  const extOk = t.extMax ? t.extObtained >= t.extMin : true;
  return intOk && extOk;
}

function stageSubjects(stageId) {
  return state.subjects.filter(s => s.stageId === stageId);
}

function termSubjects(stageId, termId) {
  return state.subjects.filter(s => s.stageId === stageId && s.termId === termId);
}

// Average %, excluding audit subjects (audit = pass/fail only, not counted in %)
function stageAvg(subjects) {
  const graded = subjects.filter(s => s.subjectType !== 'audit');
  if (!graded.length) return 0;
  let ts = 0, tm = 0;
  graded.forEach(s => { const t = calcSubjectTotal(s); ts += t.scored; tm += t.max; });
  return tm ? pct(ts, tm) : 0;
}

function termAvg(stageId, termId) {
  return stageAvg(termSubjects(stageId, termId));
}

function getStage(stageId) {
  return state.stages.find(s => s.id === stageId);
}

function stageLabel(stage) {
  if (!stage) return '';
  return stage.label || (STAGE_TYPES[stage.type] || STAGE_TYPES.custom).label;
}
