// ══════════════════════════════════════════════════
//  PDF REPORT — built natively with jsPDF + autoTable
//  (real vector text/tables drawn into the PDF — not an
//  HTML screenshot — so it stays crisp, small and selectable)
// ══════════════════════════════════════════════════

const PDF_COLORS = {
  ink:    [26, 28, 32],
  dim:    [110, 116, 124],
  faint:  [150, 155, 162],
  rule:   [226, 228, 232],
  panel:  [247, 248, 246],
  dark:   [22, 24, 28],
  accent: [34, 153, 84],   // green — matches app accent
  gold:   [200, 146, 42],
  high:   [34, 153, 84],
  mid:    [201, 153, 22],
  low:    [196, 64, 64],
};

function gradeColorPdf(p) {
  if (p >= 70) return PDF_COLORS.high;
  if (p >= 50) return PDF_COLORS.mid;
  return PDF_COLORS.low;
}

// Loads an (often cross-origin) image URL and returns a PNG data URL that's
// cropped into a circle, with the surrounding square filled to match the
// panel background so it blends in seamlessly once placed in the PDF.
function loadImageAsCircularDataURL(url, size, bgColor) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Fill background to match the panel so any anti-aliased edge blends in
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, size, size);

        // Clip to a circle, then cover-fit the source image inside it
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        const scale = Math.max(size / img.width, size / img.height);
        const iw = img.width * scale, ih = img.height * scale;
        ctx.drawImage(img, (size - iw) / 2, (size - ih) / 2, iw, ih);
        ctx.restore();

        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function generatePDFReport() {
  if (!state.stages.length) { toast('Add a stage with subjects first'); return; }
  if (typeof window.jspdf === 'undefined') { toast('PDF library failed to load'); return; }

  toast('Generating report…');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const MX = 14;          // left/right margin
  const TOP = 16;         // top safe area below header band
  const BOTTOM = PH - 16; // bottom safe area above footer

  const overallPct = state.subjects.length
    ? stageAvg(state.subjects.filter(s => s.subjectType !== 'audit'))
    : 0;
  const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  // ── small drawing helpers ──────────────────────────
  function setColor(c) { doc.setTextColor(c[0], c[1], c[2]); }
  function setFill(c) { doc.setFillColor(c[0], c[1], c[2]); }
  function setDraw(c) { doc.setDrawColor(c[0], c[1], c[2]); }

  function pageHeader(title, sub) {
    setFill(PDF_COLORS.dark);
    doc.rect(0, 0, PW, 22, 'F');
    setFill(PDF_COLORS.accent);
    doc.rect(0, 22, PW, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    setColor([255, 255, 255]);
    doc.text(title, MX, 13);
    if (sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setColor([195, 200, 205]);
      doc.text(sub, MX, 18.5);
    }
  }

  function footer(pageNum, pageCount) {
    setDraw(PDF_COLORS.rule);
    doc.setLineWidth(0.2);
    doc.line(MX, PH - 12, PW - MX, PH - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setColor(PDF_COLORS.faint);
    doc.text('Developed by Microintel', MX, PH - 7);
    doc.text(`Page ${pageNum} of ${pageCount}`, PW - MX, PH - 7, { align: 'right' });
  }

  function sectionTitle(y, text, accentColor = PDF_COLORS.accent) {
    setFill(accentColor);
    doc.rect(MX, y - 3.6, 2, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    setColor(PDF_COLORS.ink);
    doc.text(text, MX + 5, y);
    return y + 4;
  }

  function ensureSpace(y, needed) {
    if (y + needed > BOTTOM) {
      doc.addPage();
      pageHeader('Anka', `Academic Report · Generated ${now}`);
      return TOP + 14;
    }
    return y;
  }

  // ── PAGE 1 : Cover / Profile ───────────────────────
  pageHeader('Anka', `Academic Report · Generated ${now}`);
  let y = TOP + 16;

  // profile panel
  const panelH = 26;
  setFill(PDF_COLORS.panel);
  setDraw(PDF_COLORS.rule);
  doc.setLineWidth(0.3);
  doc.roundedRect(MX, y, PW - MX * 2, panelH, 2, 2, 'FD');

  // avatar circle — use the signed-in Google photo if available, else initials
  const cx = MX + 13, cy = y + panelH / 2, r = 9;
  let avatarDataUrl = null;
  const photoURL = currentUser && currentUser.photoURL;
  if (photoURL) {
    try {
      avatarDataUrl = await loadImageAsCircularDataURL(photoURL, 160, `rgb(${PDF_COLORS.panel.join(',')})`);
    } catch (e) {
      avatarDataUrl = null; // CORS or network failure — fall back to initials below
    }
  }
  if (avatarDataUrl) {
    doc.addImage(avatarDataUrl, 'PNG', cx - r, cy - r, r * 2, r * 2);
  } else {
    setFill(PDF_COLORS.accent);
    doc.circle(cx, cy, r, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setColor([255, 255, 255]);
    doc.text(((userProfile.name || 'U')[0] || 'U').toUpperCase(), cx, cy + 1.4, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setColor(PDF_COLORS.ink);
  doc.text(userProfile.name || 'User', MX + 27, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setColor(PDF_COLORS.dim);
  doc.text(`${userProfile.email || ''}${userProfile.createdDate ? ' · Member since ' + userProfile.createdDate : ''}`, MX + 27, y + 16);

  // stat boxes on the right of the panel
  const stats = [
    { label: 'STAGES', value: String(state.stages.length), color: PDF_COLORS.ink },
    { label: 'SUBJECTS', value: String(state.subjects.length), color: PDF_COLORS.ink },
    { label: 'OVERALL', value: overallPct + '%', color: PDF_COLORS.accent },
  ];
  const statW = 26;
  let sx = PW - MX - statW * stats.length;
  stats.forEach(st => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    setColor(st.color);
    doc.text(st.value, sx + statW / 2, y + 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    setColor(PDF_COLORS.faint);
    doc.text(st.label, sx + statW / 2, y + 18, { align: 'center' });
    sx += statW;
  });

  y += panelH + 12;

  // ── Stage Order overview table ──
  y = sectionTitle(y, 'Stage Order & Summary');
  const orderRows = state.stages.map((s, i) => {
    const subs = stageSubjects(s.id);
    const avg = stageAvg(subs);
    return [String(i + 1), stageLabel(s), s.mode === 'annual' ? 'Annual' : 'Semester-wise', String(subs.length), avg + '%'];
  });
  doc.autoTable({
    startY: y,
    margin: { left: MX, right: MX },
    head: [['#', 'Stage', 'Mode', 'Subjects', 'Avg %']],
    body: orderRows,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 8.8, textColor: PDF_COLORS.ink, cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 } },
    headStyles: { fillColor: PDF_COLORS.dark, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: PDF_COLORS.panel },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const p = parseFloat(data.cell.text[0]);
        data.cell.styles.textColor = gradeColorPdf(p);
      }
    },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── PER-STAGE DETAIL ────────────────────────────────
  state.stages.forEach((stage, idx) => {
    const subs = stageSubjects(stage.id);
    if (!subs.length) return;
    const avg = stageAvg(subs);

    y = ensureSpace(y, 24);
    y = sectionTitle(y, `${idx + 1}. ${stageLabel(stage)}  —  ${stage.mode === 'annual' ? 'Annual' : 'Semester-wise'}  ·  ${avg}% overall`);

    const groups = stage.mode === 'annual'
      ? [{ label: null, subs: termSubjects(stage.id, stage.terms[0]?.id) }]
      : stage.terms.map(t => ({ label: t.label, avg: termAvg(stage.id, t.id), subs: termSubjects(stage.id, t.id) })).filter(g => g.subs.length);

    groups.forEach(g => {
      if (g.label) {
        y = ensureSpace(y, 10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        setColor(PDF_COLORS.gold);
        doc.text(`${g.label} — ${g.avg}%`, MX, y);
        y += 4;
      }
      y = drawSubjectTable(doc, g.subs, y, MX, PW);
      y += 6;

      // internal-component breakdown for every subject that has them
      // (component rows show only name + obtained; a Final IA row per
      // subject carries the overall internal min/max/obtained)
      const breakdown = [];
      g.subs.forEach(s => {
        const comps = internalComponents(s);
        const { min, max } = internalMinMax(s);
        const rowsForSubj = [];
        comps.forEach((c, ci) => rowsForSubj.push([
          ci === 0 ? s.name : '',
          c.name || 'Internal',
          fmt2(c.obtained),
        ]));
        if (max) {
          const totalObt = comps.reduce((sum, c) => sum + (+c.obtained || 0), 0);
          rowsForSubj.push([
            rowsForSubj.length ? '' : s.name,
            `Final IA (Min ${fmt2(min)} / Max ${fmt2(max)})`,
            fmt2(totalObt),
          ]);
        }
        breakdown.push(...rowsForSubj);
      });
      if (breakdown.length) {
        y = ensureSpace(y, 14);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        setColor(PDF_COLORS.dim);
        doc.text('Internal Marks Breakdown', MX, y);
        y += 2;
        doc.autoTable({
          startY: y,
          margin: { left: MX, right: MX },
          head: [['Subject', 'Component', 'Obtained']],
          body: breakdown,
          theme: 'plain',
          styles: { font: 'helvetica', fontSize: 7.8, textColor: PDF_COLORS.dim, cellPadding: 1.6 },
          headStyles: { fillColor: PDF_COLORS.panel, textColor: PDF_COLORS.ink, fontStyle: 'bold', fontSize: 7.5 },
          columnStyles: { 0: { fontStyle: 'bold', textColor: PDF_COLORS.ink }, 2: { halign: 'center' } },
          didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 0 && data.cell.raw) {
              setDraw(PDF_COLORS.rule);
              doc.setLineWidth(0.15);
              doc.line(MX, data.cell.y, MX + (PW - MX * 2), data.cell.y);
            }
          },
        });
        y = doc.lastAutoTable.finalY + 8;
      }
    });
  });

  // ── footers on every page ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    footer(p, pageCount);
  }

  doc.save(`academic_report_${Date.now()}.pdf`);
  toast('✓ Report generated');
}

// Draws a styled subject table at (x, y) and returns the new y position.
function drawSubjectTable(doc, subs, y, MX, PW) {
  const rows = subs.map(s => {
    const t = calcSubjectTotal(s);
    const p = pct(t.scored, t.max);
    const passed = subjectPass(s);
    const result = s.subjectType === 'audit'
      ? (passed ? 'Satisfactory' : 'Not Satisfactory')
      : `${grade(p)}${passed ? '' : ' · Fail'}`;
    return {
      cells: [s.name, s.subjectType, `${fmt2(t.intObtained)}/${fmt2(t.intMax)}`, `${fmt2(t.extObtained)}/${fmt2(t.extMax)}`, `${fmt2(t.scored)}/${fmt2(t.max)}`, p + '%', result],
      pct: p, passed,
    };
  });

  doc.autoTable({
    startY: y,
    margin: { left: MX, right: MX },
    head: [['Subject', 'Type', 'Internal', 'External', 'Total', '%', 'Result']],
    body: rows.map(r => r.cells),
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 8.3, textColor: PDF_COLORS.ink, cellPadding: { top: 2, bottom: 2, left: 2.2, right: 2.2 } },
    headStyles: { fillColor: PDF_COLORS.dark, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.8 },
    alternateRowStyles: { fillColor: PDF_COLORS.panel },
    columnStyles: {
      1: { cellWidth: 20, textTransform: 'capitalize' },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 22 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', cellWidth: 28 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        data.cell.text = data.cell.text.map(t => t.charAt(0).toUpperCase() + t.slice(1));
      }
      if (data.section === 'body' && (data.column.index === 5 || data.column.index === 6)) {
        const r = rows[data.row.index];
        const c = data.column.index === 6 && !r.passed ? PDF_COLORS.low : gradeColorPdf(r.pct);
        data.cell.styles.textColor = c;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  return doc.lastAutoTable.finalY;
}
