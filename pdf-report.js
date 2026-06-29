async function generatePDFReport() {
  try {
    const now = new Date().toLocaleString('en-IN');
    const reportDate = new Date().toISOString().slice(0, 10);

    // ═══════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════

    function calculateSubject(subj) {
      let internalScored = 0;
      let internalMax = 0;

      if (subj.components && subj.components.length) {
        subj.components.forEach(comp => {
          internalScored += Number(comp.scored || 0);
          internalMax += Number(comp.max || 0);
        });
      }

      const externalScored = Number(subj.external?.scored || 0);
      const externalMax = Number(subj.external?.max || 0);

      const totalScored = internalScored + externalScored;
      const totalMax = internalMax + externalMax;

      const percentage = totalMax
        ? ((totalScored / totalMax) * 100).toFixed(1)
        : "0";

      return {
        internalScored,
        internalMax,
        externalScored,
        externalMax,
        totalScored,
        totalMax,
        percentage
      };
    }

    function getGrade(p) {
      p = Number(p);

      if (p >= 90) return 'O';
      if (p >= 80) return 'A+';
      if (p >= 70) return 'A';
      if (p >= 60) return 'B+';
      if (p >= 50) return 'B';
      if (p >= 40) return 'C';

      return 'F';
    }

    function stageAverage(subjects, isSSLC = false) {
      if (!subjects.length) return "0";

      let scored = 0;
      let max = 0;

      subjects.forEach(subj => {
        if (isSSLC) {
          scored += Number(subj.scored || 0);
          max += Number(subj.max || 0);
        } else {
          const calc = calculateSubject(subj);

          scored += calc.totalScored;
          max += calc.totalMax;
        }
      });

      return max
        ? ((scored / max) * 100).toFixed(1)
        : "0";
    }

    // ═══════════════════════════════════════
    // Build SSLC Table
    // ═══════════════════════════════════════

    function buildSSLCSection() {
      if (!state.sslc.length) {
        return `
          <div class="section-block">
            <h2>SSLC</h2>
            <p>No subjects available</p>
          </div>
        `;
      }

      let rows = '';

      state.sslc.forEach(subj => {
        let intScored = 0, intMax = 0;
        const comps = subj.components || [];
        comps.forEach(c => { intScored += Number(c.scored||0); intMax += Number(c.max||0); });
        const extScored = Number(subj.external?.scored || 0);
        const extMax    = Number(subj.external?.max    || 0);
        const totalS = intScored + extScored;
        const totalM = intMax    + extMax;
        // Legacy fallback
        const finalS = totalM > 0 ? totalS : Number(subj.scored || 0);
        const finalM = totalM > 0 ? totalM : Number(subj.max    || 0);
        const percentage = finalM ? ((finalS / finalM) * 100).toFixed(1) : 0;

        const internalDetail = comps.length
          ? comps.map(c => `${c.name}: ${c.scored}/${c.max}`).join('<br>')
          : (totalM === 0 ? `${subj.scored||0}/${subj.max||0}` : `${intScored}/${intMax}`);

        const extDisplay = extMax > 0 ? `${extScored}/${extMax}` : '—';

        rows += `
          <tr>
            <td>${subj.name}</td>
            <td>${internalDetail}</td>
            <td>${extDisplay}</td>
            <td>${finalS}/${finalM}</td>
            <td>${percentage}%</td>
            <td>${getGrade(percentage)}</td>
          </tr>
        `;
      });

      return `
        <div class="section-block">
          <h2>SSLC</h2>

          <div class="summary">
            Overall Percentage: ${stageAverage(state.sslc, true)}%
          </div>

          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Internal Components</th>
                <th>External</th>
                <th>Total</th>
                <th>%</th>
                <th>Grade</th>
              </tr>
            </thead>

            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    }

    // ═══════════════════════════════════════
    // Build Diploma / Engineering
    // ═══════════════════════════════════════

    function buildAdvancedSection(title, subjects) {
      if (!subjects.length) {
        return `
          <div class="section-block">
            <h2>${title}</h2>
            <p>No subjects available</p>
          </div>
        `;
      }

      let rows = '';

      subjects.forEach(subj => {
        const calc = calculateSubject(subj);

        const internalDetails = (subj.components || [])
          .map(c =>
            `${c.name}: ${c.scored}/${c.max}`
          )
          .join('<br>');

        rows += `
          <tr>
            <td>${subj.sem || '-'}</td>

            <td>
              <strong>${subj.name}</strong>
              <br>
              <small>${subj.examType || 'regular'}</small>
            </td>

            <td>
              ${internalDetails || '-'}
            </td>

            <td>
              ${calc.internalScored}/${calc.internalMax}
            </td>

            <td>
              ${calc.externalScored}/${calc.externalMax}
            </td>

            <td>
              ${calc.totalScored}/${calc.totalMax}
            </td>

            <td>
              ${calc.percentage}%
            </td>

            <td>
              ${getGrade(calc.percentage)}
            </td>
          </tr>
        `;
      });

      return `
        <div class="section-block">
          <h2>${title}</h2>

          <div class="summary">
            Overall Percentage: ${stageAverage(subjects)}%
          </div>

          <table>
            <thead>
              <tr>
                <th>Semester</th>
                <th>Subject</th>
                <th>Internal Components</th>
                <th>Internal Total</th>
                <th>External</th>
                <th>Total</th>
                <th>%</th>
                <th>Grade</th>
              </tr>
            </thead>

            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    }

    // ═══════════════════════════════════════
    // User Details
    // ═══════════════════════════════════════

    const profileName =
      userProfile.name ||
      localStorage.getItem('userName') ||
      'Student';

    const profileEmail =
      userProfile.email ||
      localStorage.getItem('userEmail') ||
      'No Email';

    // ═══════════════════════════════════════
    // Full HTML
    // ═══════════════════════════════════════

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">

        <style>
        body {
        font-family: 'Segoe UI', sans-serif;
        background: #0b0b0b;
        color: #f5f5f5;
        padding: 24px;
        line-height: 1.5;
        }
        
        h1 {
        text-align: center;
        color: #22c55e;
        font-size: 32px;
        margin-bottom: 4px;
        letter-spacing: 1px;
        }
        
        .subtitle {
        text-align: center;
        color: #999;
        margin-bottom: 30px;
        font-size: 14px;
        }
        
        .info-box {
        background: #161616;
        border: 1px solid #2c2c2c;
        border-left: 4px solid #22c55e;
        border-radius: 10px;
        padding: 16px;
        margin-bottom: 30px;
        }
        
        .info-box div {
        margin-bottom: 8px;
        font-size: 14px;
        }
        
        .section-block {
        margin-top: 40px;
        }
        
        h2 {
        background: #22c55e;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 12px;
        font-size: 20px;
        }
        
        .summary {
        margin-bottom: 14px;
        color: #d6d6d6;
        font-size: 14px;
        font-weight: bold;
        }
        
        table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
        font-size: 11px;
        background: #121212;
        border-radius: 8px;
        overflow: hidden;
        }
        
        thead {
        background: #1d1d1d;
        }
        
        th {
        color: #22c55e;
        font-weight: 600;
        padding: 10px;
        border: 1px solid #2e2e2e;
        text-align: left;
        }
        
        td {
        padding: 9px;
        border: 1px solid #2a2a2a;
        vertical-align: top;
        color: #eee;
        }
        
        tr:nth-child(even) {
        background: #151515;
        }
        
        small {
        color: #999;
        }
        
        .footer {
        margin-top: 50px;
        text-align: center;
        color: #888;
        font-size: 12px;
        }
        
        .grade-o  { color: #4ade80; font-weight: bold; }
        .grade-a  { color: #60a5fa; font-weight: bold; }
        .grade-b  { color: #facc15; font-weight: bold; }
        .grade-f  { color: #f87171; font-weight: bold; }
        
        .subject-name {
        font-weight: 600;
        color: white;
        margin-bottom: 4px;
        }
        
        .exam-type {
        color: #888;
        font-size: 10px;
        text-transform: uppercase;
        }
        
        .marks-good {
        color: #4ade80;
        font-weight: bold;
        }
        
        .marks-mid {
        color: #facc15;
        font-weight: bold;
        }
        
        .marks-low {
        color: #f87171;
        font-weight: bold;
        }
        </style>
      </head>

      <body>

        <h1>REDUNDANT Academic Report</h1>

        <div class="subtitle">
          Complete Academic Performance Record
        </div>

        <div class="info-box">
          <div><strong>Name:</strong> ${profileName}</div>
          <div><strong>Email:</strong> ${profileEmail}</div>
          <div><strong>Generated:</strong> ${now}</div>
          <div><strong>Report ID:</strong> ${reportDate}</div>
        </div>

        ${buildSSLCSection()}

        ${buildAdvancedSection(
          'Diploma',
          state.diploma
        )}

        ${buildAdvancedSection(
          'Engineering',
          state.engineering
        )}

        <div class="footer">
          Developed by <strong>Microintel</strong>
        </div>

      </body>
      </html>
    `;

    // ═══════════════════════════════════════
    // Create Temp Element
    // ═══════════════════════════════════════

    const tempContainer =
      document.createElement('div');

    tempContainer.innerHTML = htmlContent;

    document.body.appendChild(tempContainer);...