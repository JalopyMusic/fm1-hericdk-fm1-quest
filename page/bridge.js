/* FM1 Quest · site bridge: runs INSIDE the editor copy (same origin). The page above talks to it by postMessage and reuses the editor's own, already tested USB code
   (connection, sample encoding, upload and erase). Nothing is ever sent to a server: the only path out is the USB cable. */
(function () {
  "use strict";
  const MAXB = 8 * 1024 * 1024, ALLOW = [/\.wav$/i, /\.mp3$/i, /\.ogg$/i, /\.oga$/i, /\.flac$/i, /\.m4a$/i, /\.aac$/i];
  const post = (type, data) => { try { parent.postMessage(Object.assign({ fm1br: type }, data || {}), location.origin); } catch (e) {} };
  const snap = () => ({ prev: [0, 1, 2].map((k) => !!(window.__prev && window.__prev[k])), connected: !!dev, sng: dev && dev.sng ? { songs: dev.sng.songs.map((u) => ({ name: u.name || "", notes: u.notes || 0, bpm: u.bpm || 0 })) } : null, smp: dev && dev.smp ? { slotKiB: dev.smp.slotKiB, slots: dev.smp.slots.map((u) => ({ name: u.name || "", zones: u.zones || 0, kib: u.kib || 0 })) } : null, busy: !!smpBusy });
  let last = "", prog = 0;
  setInterval(() => {
    const s = JSON.stringify(snap()); if (s !== last) { last = s; post("state", snap()); }
    if (window.__brUp != null) { const p = document.querySelector('#smpslots [data-k="' + window.__brUp + '"] progress[max="1"]'); if (p && +p.value !== prog) { prog = +p.value; post("progress", { k: window.__brUp, v: prog }); } }
  }, 250);
  setInterval(async () => {                                                                       /* the FM-1 can change by itself (erase on the device): ask again every 2.5 s while idle */
    if (!dev || busy || smpBusy || window.__brUp != null || window.__brRef) return; window.__brRef = true;
    try { const a = dev.smp ? parse[CMD.SMP_INFO](await rq(req.smpInfo())) : null, g = dev.sng ? parse[CMD.SNG_INFO](await rq(req.sngInfo())) : null; if (dev && !busy) { if (a) dev.smp = a; if (g) dev.sng = g; } } catch (e) { /* the next tick */ } finally { window.__brRef = false; }
  }, 2500);
  const quiet = async (fn) => { const oc = window.confirm; window.confirm = () => true; try { return await fn(); } finally { window.confirm = oc; } };      /* the page above already asked the person */
  window.addEventListener("message", async (e) => {
    if (e.origin !== location.origin || !e.data || !e.data.fm1cmd) return;                      /* only the page of this same site */
    const m = e.data;
    try {
      if (m.fm1cmd === "connect") { await connect(); if (!dev) throw new Error("connect:" + (lastKey || "?") + (lastKey === "error" ? lastArg : "")); post("state", snap()); }
      else if (m.fm1cmd === "disconnect") { if (dev) disconnect(); post("state", snap()); }
      else if (m.fm1cmd === "send-sample") {
        const f = m.file, k = m.k | 0;
        if (!dev || !dev.smp) throw new Error("no-device");
        if (!(f instanceof File) || f.size > MAXB || !ALLOW.some((r) => r.test(f.name))) throw new Error("bad-file");
        const d = smpDraft[k]; d.files = []; d.name = ""; await addFiles(k, [f]);
        if (!d.files.length) throw new Error("decode");
        let bytes = draftBytes(d);
        if (bytes > SMP.MAX_DATA) {                                                                   /* longer than the slot: cut at the limit (a short fade-out), and say so */
          const n = SMP.MAX_DATA * 2 - 2, z = d.files[0], cut = z.s.slice(0, n), fade = Math.min(1200, n >> 1);
          for (let i = 0; i < fade; i++) cut[n - 1 - i] = Math.round(cut[n - 1 - i] * (i / fade));
          z.s = cut; d.files = [z]; bytes = draftBytes(d); post("trimmed", { secs: String(Math.round(n / SMP.RATE)) });
        }
        const pcm = d.files[0] ? d.files[0].s.slice() : null;                                          /* what is about to be written (the preview plays exactly this) */
        window.__brUp = k; prog = 0; post("uploading", { k, bytes });
        const ok = await quiet(() => smpUpload(k, null, false)); d.files = []; d.name = ""; window.__brUp = null; await smpInfo().catch(() => {}); if (ok && pcm) { window.__prev = window.__prev || {}; window.__prev[k] = pcm; } post("uploaded", { k, ok: !!ok }); post("state", snap());
      }
      else if (m.fm1cmd === "send-song") {                                                         /* a .mid -> notes -> the song sector of Piano Hero (kind 0) or FM Hero (kind 1) */
        const f = m.file, kind = m.kind & 1, k = m.k | 0, sid = kind * 6 + k, p = m.p || (kind ? 3 : 2);
        if (!dev) throw new Error("no-device"); if (!dev.sng) throw new Error("no-songs");
        if (!(f instanceof File) || f.size > SNG.MAXFILE || !/\.(mid|midi)$/i.test(f.name) || k < 0 || k > 5) throw new Error("bad-file");
        let song; try { song = buildSong(new Uint8Array(await f.arrayBuffer()), kind, f.name); } catch (err) { throw new Error(err && err.code ? "song:" + err.code : "bad-file"); }
        post("uploading", { k, p, bytes: song.data.length }); busy++;
        try { await songSend(rq, sid, song, (v) => post("progress", { k, p, v })); dev.sng = parse[CMD.SNG_INFO](await rq(req.sngInfo())); post("uploaded", { k, p, ok: true }); }
        catch (err) { try { dev.sng = parse[CMD.SNG_INFO](await rq(req.sngInfo())); } catch (e2) {} throw err; }
        finally { busy--; }
        post("state", snap());
      }
      else if (m.fm1cmd === "erase-song") {
        const kind = m.kind & 1, k = m.k | 0, p = m.p || (kind ? 3 : 2); if (!dev || !dev.sng) throw new Error("no-songs"); if (k < 0 || k > 5) throw new Error("bad-file");
        busy++; try { await songErase(rq, kind * 6 + k); dev.sng = parse[CMD.SNG_INFO](await rq(req.sngInfo())); } finally { busy--; }
        post("erased", { k, p }); post("state", snap());
      }
      else if (m.fm1cmd === "preview") {                                                              /* play / stop the last sample sent to slot k, as the FM-1 stores it */
        const k = m.k | 0, s = window.__prev && window.__prev[k];
        if (window.__pv) { try { window.__pv.src.onended = null; window.__pv.src.stop(); } catch (e) {} const was = window.__pv.k; window.__pv = null; post("preview", { k: was, playing: false }); if (was === k) return; }
        if (!s) throw new Error("no-preview");
        const ac = window.__ac || (window.__ac = new (window.AudioContext || window.webkitAudioContext)()); if (ac.state === "suspended") await ac.resume();
        const buf = ac.createBuffer(1, s.length, SMP.RATE), ch = buf.getChannelData(0); for (let i = 0; i < s.length; i++) ch[i] = s[i] / 32768;
        const src = ac.createBufferSource(); src.buffer = buf; src.connect(ac.destination); src.onended = () => { if (window.__pv && window.__pv.src === src) { window.__pv = null; post("preview", { k, playing: false }); } };
        window.__pv = { k, src }; src.start(); post("preview", { k, playing: true });
      }
      else if (m.fm1cmd === "erase-sample") { if (window.__prev) delete window.__prev[m.k | 0]; await quiet(() => smpErase(m.k | 0)); post("erased", { k: m.k | 0 }); post("state", snap()); }
    } catch (err) { window.__brUp = null; post("error", { cmd: m.fm1cmd, p: m.p || (m.fm1cmd === "send-sample" || m.fm1cmd === "erase-sample" ? 1 : (m.kind ? 3 : 2)), message: String(err && err.message || err) }); }
  });
  post("ready", {});
})();
