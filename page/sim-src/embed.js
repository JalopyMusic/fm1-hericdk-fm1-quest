// embed mode: the page's header owns the sound and MIDI buttons; this only listens for them and reports the sound state back
(function () {
  const real = id => document.getElementById(id);
  addEventListener('message', e => { const m = e.data || {}; if (m.fm1cmd === 'midioff') { (window.__midiAcc || []).forEach(a => { a.onstatechange = null; a.inputs.forEach(p => { p.onmidimessage = null; try { p.close(); } catch (x) {} }); a.outputs.forEach(p => { try { p.close(); } catch (x) {} }); }); return; } if (m.fm1cmd === 'sound' && real('c-sound')) real('c-sound').click(); else if (m.fm1cmd === 'midi' && real('c-usb')) real('c-usb').click(); });
  let last = null; setInterval(() => { const on = !!(real('c-sound') && real('c-sound').classList.contains('on')); if (on !== last) { last = on; parent.postMessage({ fm1state: { snd: on } }, '*'); } }, 400);
})();
