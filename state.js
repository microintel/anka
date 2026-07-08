// ══════════════════════════════════════════════════
//  STATE  (fully dynamic: stages + subjects)
// ══════════════════════════════════════════════════
let DB;
const DB_NAME = 'redundant_vault_v2'; // internal DB name kept stable so existing data isn't lost on rename
const DB_VER  = 1;

let state = {
  stages: [],    // [{id, type, label, mode:'annual'|'semester', terms:[{id,label}]}]
  subjects: []   // [{id, stageId, termId, name, subjectType:'theory'|'practical'|'audit',
                 //   internal:{min,max,obtained}, external:{min,max,obtained}}]
};

// ══════════════════════════════════════════════════
//  STAGE TYPE DEFINITIONS
// ══════════════════════════════════════════════════
const STAGE_TYPES = {
  sslc:        { label: 'SSLC',                    icon: '<i class="bi bi-mortarboard-fill"></i>', defaultMode: 'annual'   },
  puc:         { label: 'PUC / Pre-University',     icon: '<i class="bi bi-book-fill"></i>',         defaultMode: 'annual'   },
  diploma:     { label: 'Diploma',                  icon: '<i class="bi bi-tools"></i>',             defaultMode: 'semester' },
  engineering: { label: 'Engineering (B.E/B.Tech)', icon: '<i class="bi bi-gear-fill"></i>',         defaultMode: 'semester' },
  medical:     { label: 'Medical (MBBS / Allied)',  icon: '<i class="bi bi-heart-pulse-fill"></i>',  defaultMode: 'semester' },
  iti:         { label: 'ITI',                      icon: '<i class="bi bi-wrench-adjustable"></i>',defaultMode: 'semester' },
  custom:      { label: 'Custom',                   icon: '<i class="bi bi-journal-bookmark-fill"></i>', defaultMode: 'semester' },
};

// ══════════════════════════════════════════════════
//  INDEXEDDB
// ══════════════════════════════════════════════════
function initDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      ['stages', 'subjects'].forEach(s => {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
      });
    };
    req.onsuccess = e => { DB = e.target.result; res(); };
    req.onerror = () => rej(req.error);
  });
}

function dbGetAll(store) {
  return new Promise((res, rej) => {
    const tx = DB.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

function dbPut(store, obj) {
  return new Promise((res, rej) => {
    const tx = DB.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(obj);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

function dbDelete(store, id) {
  return new Promise((res, rej) => {
    const tx = DB.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

async function loadAll() {
  state.stages   = await dbGetAll('stages');
  state.subjects = await dbGetAll('subjects');
  state.stages.forEach((s, i) => { if (s.order === undefined || s.order === null) s.order = i; });
  sortStages();
}

function sortStages() {
  state.stages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }



// ══════════════════════════════════════════════════
//  FIREBASE AUTH + FIRESTORE
// ══════════════════════════════════════════════════
let auth, firestoreDB, currentUser = null;

function initFirebaseAuth() {
  auth = firebase.auth();
  firestoreDB = firebase.firestore();

  auth.onAuthStateChanged(user => {
    currentUser = user;
    if (typeof renderAccountPage === 'function' && currentSection === 'account') {
      renderAccountPage();
    }
    if (user) {
      // sync display name/email into local profile if still default
      if (userProfile.email === 'user@example.com') {
        saveUserProfile(user.displayName || user.email || 'User', user.email || '');
      }
      // cloud data is no longer auto-pulled on sign-in/reload — use the
      // "Restore from Cloud" button on the Account page to pull manually
    }
  });
}