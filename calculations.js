// ══════════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════════
function pct(scored, max) {
  if (!max) return 0;
  return Math.round((scored/max)*100*10)/10;
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

function calcSubjectTotal(subj) {
  const intTotal = (subj.components||[]).reduce((a,c)=>a+(+c.scored||0),0);
  const intMax   = (subj.components||[]).reduce((a,c)=>a+(+c.max||0),0);
  const extS = +(subj.external?.scored||0);
  const extM = +(subj.external?.max||0);
  return { scored: intTotal+extS, max: intMax+extM, intScored:intTotal, intMax, extS, extM };
}

function stageAvg(subjects) {
  if (!subjects.length) return 0;
  let ts=0, tm=0;
  subjects.forEach(s => { const t=calcSubjectTotal(s); ts+=t.scored; tm+=t.max; });
  return tm ? pct(ts,tm) : 0;
}

function semSubjects(stage, semId) {
  return state[stage].filter(s => s.sem === semId);
}

function semAvg(stage, semId) {
  return stageAvg(semSubjects(stage, semId));
}

