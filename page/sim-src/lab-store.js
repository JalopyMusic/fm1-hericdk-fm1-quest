// FM1 Quest lab — small persistent store (IndexedDB, falls back to localStorage). Holds sprites, rig parts, storyboards, converted video frames.
(function (G) {
'use strict';
let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise(res => {
    if (!window.indexedDB) return res(null);
    try { const rq = indexedDB.open('fm1lab', 1); rq.onupgradeneeded = () => rq.result.createObjectStore('kv'); rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); } catch (e) { res(null); }
  });
  return dbp;
}
const Store = {
  async get(k, def) {
    const db = await open();
    if (db) return new Promise(res => { try { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result === undefined ? def : r.result); r.onerror = () => res(def); } catch (e) { res(def); } });
    try { const v = localStorage.getItem('fm1lab.kv.' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
  },
  async set(k, v) {
    const db = await open();
    if (db) return new Promise(res => { try { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => res(false); } catch (e) { res(false); } });
    try { localStorage.setItem('fm1lab.kv.' + k, JSON.stringify(v)); return true; } catch (e) { return false; }
  },
  debounce(k, getter, ms) { clearTimeout(Store._t[k]); Store._t[k] = setTimeout(() => Store.set(k, getter()), ms || 400); },
  _t: {},
};
G.Store = Store;
})(window);
