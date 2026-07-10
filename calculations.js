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

// Formats a number as a fixed two-decimal float, e.g. 85 -> "85.00"
function fmt2(n) {
  return (+n || 0).toFixed(2);
}

// Normalizes subj.internal into an array of components ({name, obtained}).
// Supports:
//  - the new format: { min, max, components:[{name,obtained},...] }
//  - the legacy array form: [{name,min,max,obtained}, ...]
//  - the legacy single-object form: {min,max,obtained}
function internalComponents(subj) {
  const i = subj?.internal;
  if (i && Array.isArray(i.components)) return i.components;
  if (Array.isArray(i)) return i;
  if (i && ((+i.max) || (+i.obtained) || (+i.min))) return [{ name: 'Internal', obtained: i.obtained }];
  return [];
}

// Final IA (internal assessment) min/max for a subject.
// New format stores min/max directly on subj.internal; legacy data derives
// them by summing each component's own min/max.
function internalMinMax(subj) {
  const i = subj?.internal;
  if (i && !Array.isArray(i) && (i.min !== undefined || i.max !== undefined)) {
    return { min: +i.min || 0, max: +i.max || 0 };
  }
  const comps = Array.isArray(i) ? i : [];
  return {
    min: comps.reduce((s, c) => s + (+c.min || 0), 0),
    max: comps.reduce((s, c) => s + (+c.max || 0), 0),
  };
}

// Totals for one subject (internal + external)
function calcSubjectTotal(subj) {
  const comps = internalComponents(subj);
  const intObtained = comps.reduce((s, c) => s + (+c.obtained || 0), 0);
  const { min: intMin, max: intMax } = internalMinMax(subj);
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

// ══════════════════════════════════════════════════
//  TOTALS & GPA/CGPA
// ══════════════════════════════════════════════════

// Marks total (scored/max), excluding audit subjects (pass/fail only, not
// counted toward marks totals or GPA).
function subjectsTotal(subjects) {
  const graded = subjects.filter(s => s.subjectType !== 'audit');
  let scored = 0, max = 0;
  graded.forEach(s => { const t = calcSubjectTotal(s); scored += t.scored; max += t.max; });
  return { scored, max, count: graded.length };
}

// Grade point on a 10-point scale, mirroring the same percentage bands used
// by grade() (O=10, A+=9, A=8, B+=7, B=6, C=5, F=0).
function gradePoint(p) {
  if (p >= 90) return 10;
  if (p >= 80) return 9;
  if (p >= 70) return 8;
  if (p >= 60) return 7;
  if (p >= 50) return 6;
  if (p >= 40) return 5;
  return 0;
}

// GPA for a set of subjects: the average grade point across graded subjects
// (audit subjects excluded). Returned to 2 decimal places.
function subjectsGPA(subjects) {
  const graded = subjects.filter(s => s.subjectType !== 'audit');
  if (!graded.length) return 0;
  const sum = graded.reduce((acc, s) => {
    const t = calcSubjectTotal(s);
    return acc + gradePoint(pct(t.scored, t.max));
  }, 0);
  return Math.round((sum / graded.length) * 100) / 100;
}

function stageTotal(stageId) { return subjectsTotal(stageSubjects(stageId)); }
function termTotal(stageId, termId) { return subjectsTotal(termSubjects(stageId, termId)); }
function stageGPA(stageId) { return subjectsGPA(stageSubjects(stageId)); }
function termGPA(stageId, termId) { return subjectsGPA(termSubjects(stageId, termId)); }

// Overall CGPA across every stage (average grade point over all graded subjects)
function overallCGPA() {
  return subjectsGPA(state.subjects);
}

function getStage(stageId) {
  return state.stages.find(s => s.id === stageId);
}

function stageLabel(stage) {
  if (!stage) return '';
  return stage.label || (STAGE_TYPES[stage.type] || STAGE_TYPES.custom).label;
}
