"use strict";
/* ============================================================
   CASALO — SHARED: UTILS
   1:1 ausgelagert aus der ursprünglichen index.html (Phase 2).
   Zustandslose Helper-Funktionen, von allen Modulen genutzt.
   ============================================================ */

  if('scrollRestoration' in history){ history.scrollRestoration = 'manual'; }
  window.addEventListener('pageshow', function(){ window.scrollTo(0,0); });

  // Haptik: funktioniert nur dort, wo der Browser die Vibration-API
  // unterstützt (Android u. a.) — iOS Safari/PWA unterstützt das leider
  // grundsätzlich nicht, dort bleibt es beim rein visuellen Feedback.
  function triggerHaptic(strength){
    if(navigator.vibrate){
      navigator.vibrate(strength==='medium' ? 15 : strength==='strong' ? 25 : 8);
    }
  }
  document.addEventListener('click', function(e){
    var t = e.target.closest('.btn, .check, .tile, .tabbar button, .sidebar-item, .rec-card, .note-card, .cal-card');
    if(t) triggerHaptic(t.classList.contains('check') ? 'medium' : 'light');
  }, true);

  function fmtEUR(n){
    return n.toLocaleString('de-DE', {minimumFractionDigits:2, maximumFractionDigits:2}) + " €";
  }
  function monthKey(d){
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0");
  }
  function dateToKey(dateStr){
    return dateStr.slice(0,7);
  }
  function todayISO(){
    var d = new Date();
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }
  function uid(){
    return Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  }
  function escapeHtml(s){
    return s.replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function fmtDate(dateStr){
    var d = new Date(dateStr+'T00:00:00');
    return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+d.getFullYear();
  }
