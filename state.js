// ══════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════
let DB;
const DB_NAME = 'redundant_vault';
const DB_VER  = 1;

let state = {
  sslc: [],          // [{id, name, scored, max}]
  diploma: [],       // [{id, sem, name, components:[{name,scored,max}], external:{scored,max}}]
  engineering: [],   // [{id, sem, name, examType, components:[...], external:{scored,max}}]
  semesters: {
    diploma: [],     // [{id, label}] — ordered list of sems
    engineering: []
  }
};

// ══════════════════════════════════════════════════
//  INDEXEDDB
// ══════════════════════════════════════════════════
function initDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      ['sslc','diploma','engineering','meta'].forEach(s => {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, {keyPath:'id'});
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
  state.sslc        = await dbGetAll('sslc');
  state.diploma     = await dbGetAll('diploma');
  state.engineering = await dbGetAll('engineering');
  const meta = await dbGetAll('meta');
  const semMeta = meta.find(m => m.id === 'semesters');
  if (semMeta) {
    state.semesters = semMeta.data;
  } else {
    // defaults
    state.semesters = {
      diploma: [{id:'d1',label:'Semester 1'},{id:'d2',label:'Semester 2'},{id:'d3',label:'Semester 3'},{id:'d4',label:'Semester 4'},{id:'d5',label:'Semester 5'},{id:'d6',label:'Semester 6'}],
      engineering: [{id:'e1',label:'Semester 1'},{id:'e2',label:'Semester 2'},{id:'e3',label:'Semester 3'},{id:'e4',label:'Semester 4'},{id:'e5',label:'Semester 5'},{id:'e6',label:'Semester 6'},{id:'e7',label:'Semester 7'},{id:'e8',label:'Semester 8'}]
    };
    await saveSemesters();
  }
}

async function saveSemesters() {
  await dbPut('meta', {id:'semesters', data: state.semesters});
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

