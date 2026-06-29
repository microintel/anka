// ══════════════════════════════════════════════════
//  EXPORT / IMPORT
// ══════════════════════════════════════════════════
function exportJSON() {
  const data = { 
    sslc: state.sslc, 
    diploma: state.diploma, 
    engineering: state.engineering, 
    semesters: state.semesters,
    profile: {
      name: userProfile.name,
      email: userProfile.email,
      photo: userProfile.photo,
      createdDate: userProfile.createdDate
    },
    exportedAt: new Date().toISOString() 
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `redundant_backup_${userProfile.name.replace(/\s+/g, '_')}_${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
  toast('✓ Backup exported with profile');
}
async function importJSON(event) {

  const file = event.target.files[0];

  if (!file) return;

  const text = await file.text();

  try {

    const data =
      JSON.parse(text);

    // Validate backup
    if (
      !Array.isArray(data.sslc) ||
      !Array.isArray(data.diploma) ||
      !Array.isArray(data.engineering)
    ) {
      throw new Error(
        'Invalid backup format'
      );
    }

    // Save for import
    window.pendingImportData =
      data;

    const profileInfo =
      data.profile
      ? `
      <br><br>
      <strong>Profile:</strong>
      <br>👤 Name:
      ${escHtml(
        data.profile.name || 'User'
      )}
      `
      : '';

    openModal(
      'Import Backup',
      `
      <div style="
        line-height:1.8;
      ">

        <p>
          This will replace
          all current data.
        </p>

        <p>
          <strong>
            Subjects:
          </strong>
          ${
            (data.sslc?.length || 0) +
            (data.diploma?.length || 0) +
            (data.engineering?.length || 0)
          }
        </p>

        ${profileInfo}

      </div>
      `
    );

    setModalFooter([
      {
        label:'Cancel',
        cls:'btn-ghost',
        fn:'closeModal()'
      },

      {
        label:
          'Import & Replace',

        cls:'btn-danger',

        fn:'performImport()'
      }
    ]);

  } catch (e) {

    console.error(e);

    toast(
      'Invalid backup file'
    );
  }

  event.target.value = '';
}
async function performImport() {
  try {
    const data = window.pendingImportData;

    if (!data)
      throw new Error('No import data');

    // Clear DB
    for (const store of [
      'sslc',
      'diploma',
      'engineering',
      'meta'
    ]) {

      const tx =
        DB.transaction(store, 'readwrite');

      tx.objectStore(store).clear();

      await new Promise(
        r => tx.oncomplete = r
      );
    }

    // Restore data
    for (const s of (data.sslc || []))
      await dbPut('sslc', s);

    for (const s of (data.diploma || []))
      await dbPut('diploma', s);

    for (const s of (data.engineering || []))
      await dbPut('engineering', s);

    state.sslc =
      data.sslc || [];

    state.diploma =
      data.diploma || [];

    state.engineering =
      data.engineering || [];

    // Restore semesters
    if (data.semesters) {
      state.semesters =
        data.semesters;

      await saveSemesters();
    }

    // Restore profile
    if (data.profile) {

      saveUserProfile(
        data.profile.name || 'User',
        data.profile.email ||
          'user@example.com',
        data.profile.photo || null
      );

      if (
        data.profile.createdDate
      ) {

        userProfile.createdDate =
          data.profile.createdDate;

        localStorage.setItem(
          'userCreatedDate',
          data.profile.createdDate
        );
      }
    }

    window.pendingImportData =
      null;

    closeModal();

    renderDashboard();
    renderSSLC();
    renderStage('diploma');
    renderStage('engineering');

    toast(
      '✓ Data & profile imported successfully'
    );

  } catch (e) {

    console.error(e);

    toast(
      'Import failed: ' +
      e.message
    );
  }
}
function exportHTMLReport() {

  const now = new Date().toLocaleDateString(
    'en-IN',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
  );

  // Load profile name
  const profile = {
    name:
      localStorage.getItem(
        'userName'
      ) || 'User'
  };

  // Profile section (only name)
  const profileHTML = `
  <div style="
    padding:12px 0;
    margin-bottom:15px;
    border-bottom:2px solid #ddd;
  ">

    <h2 style="
      margin:0;
      color:#166534;
      font-size:1.5rem;
    ">
      ${escHtml(profile.name)}
    </h2>

  </div>
  `;

  // SSLC rows
  const sslcRows = state.sslc.map(s => {

    const p = pct(
      +s.scored || 0,
      +s.max || 0
    );

    return `
    <tr>
      <td>${escHtml(s.name)}</td>
      <td>${s.scored}/${s.max}</td>
      <td>${p}%</td>
      <td>${grade(p)}</td>
    </tr>
    `;

  }).join('');

  // Diploma + Engineering
  const renderStageReport = (stage) => {

    return state.semesters[stage]
      .map(sem => {

      const subjs =
        semSubjects(stage, sem.id);

      if (!subjs.length)
        return '';

      const rows = subjs
        .map(s => {

        const t =
          calcSubjectTotal(s);

        const p = pct(
          t.scored,
          t.max
        );

        return `
        <tr>
          <td>${escHtml(s.name)}</td>
          <td>${t.intScored}/${t.intMax}</td>
          <td>${t.extS}/${t.extM}</td>
          <td>${t.scored}/${t.max}</td>
          <td>${p}%</td>
          <td>${grade(p)}</td>
        </tr>
        `;

      }).join('');

      return `
      <h3>
        ${escHtml(sem.label)}
      </h3>

      <table
        border="1"
        cellpadding="6"
        style="
          width:100%;
          border-collapse:collapse;
          margin-bottom:20px;
        "
      >

        <thead>
          <tr>
            <th>Subject</th>
            <th>Internal</th>
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
      `;

    }).join('');
  };

  // Final HTML
  const html = `
  <!DOCTYPE html>

  <html>

  <head>

    <meta charset="UTF-8">

    <title>
      REDUNDANT Report
    </title>

    <style>

      body{
        font-family:Georgia,serif;
        max-width:900px;
        margin:2rem auto;
        padding:2rem;
        background:#fff;
        color:#222;
      }

      h1{
        border-bottom:
          3px solid #22c55e;
        padding-bottom:8px;
      }

      h2{
        color:#166534;
      }

      h3{
        color:#555;
        margin-top:20px;
      }

      table{
        width:100%;
        border-collapse:collapse;
        margin-bottom:20px;
      }

      th, td{
        border:1px solid #ddd;
        padding:8px;
        text-align:left;
      }

      th{
        background:#f5f0e8;
      }

      .meta{
        color:#777;
        font-size:0.8rem;
      }

    </style>

  </head>

  <body>

    ${profileHTML}

    <h1>
      REDUNDANT —
      Academic Report
    </h1>

    <p class="meta">
      Generated ${now}
    </p>

    <h2>SSLC</h2>

    <table>

      <thead>
        <tr>
          <th>Subject</th>
          <th>Marks</th>
          <th>%</th>
          <th>Grade</th>
        </tr>
      </thead>

      <tbody>
        ${sslcRows}
      </tbody>

    </table>

    <h2>Diploma</h2>

    ${renderStageReport(
      'diploma'
    )}

    <h2>Engineering</h2>

    ${renderStageReport(
      'engineering'
    )}

  </body>

  </html>
  `;

  const blob = new Blob(
    [html],
    {
      type: 'text/html'
    }
  );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement('a');

  a.href = url;

  a.download =
    `REDUNDANT_report_${Date.now()}.html`;

  a.click();

  URL.revokeObjectURL(url);

  toast(
    'Report card exported'
  );
}
