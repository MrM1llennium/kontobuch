"use strict";
/* ============================================================
   CASALO — CORE: STORAGE
   1:1 ausgelagert aus der ursprünglichen index.html (Phase 2).
   Supabase-Verbindung, Laden/Speichern, Realtime-Sync,
   Offline-Cache, Auto-Resync bei Rückkehr in die App.
   ============================================================ */

  var SUPABASE_URL = 'https://kpugxayvvrzhhhrnibrx.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwdWd4YXl2dnJ6aGhocm5pYnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMTM5MzMsImV4cCI6MjEwMzg4OTkzM30.DV70QpWt6J4-GuwFkrY5UHTw-dKFMv5_p_08V8euiNc';
  var VAPID_PUBLIC_KEY = 'BKC6QxSalbAS_17SFaxvFduYMpIsHxhDdq9LiblpFT-N3ntHOvgyVRJsKULXwHUsPA3N4Dx-UEuTWFzxGxvmL1s';
  var CODE_KEY = 'kontobuch-household-code';
  var sb = null;
  var householdCode = null;
  var realtimeChannel = null;
  var savePending = false;
  var lastFailureWasLoad = false;

  /* ================= Persistenz ================= */
  function cacheStateLocally(){
    try{ localStorage.setItem('kontobuch-cache-'+householdCode, JSON.stringify(state)); }
    catch(e){ /* Speicher evtl. voll — nicht kritisch, nur der Offline-Komfort fehlt dann */ }
  }
  function loadCachedState(){
    try{
      var raw = localStorage.getItem('kontobuch-cache-'+householdCode);
      return raw ? JSON.parse(raw) : null;
    } catch(e){ return null; }
  }

  async function loadState(){
    try{
      var res = await sb.from('households').select('data').eq('code', householdCode).maybeSingle();
      if(res.error) throw res.error;
      if(res.data && res.data.data){
        state = res.data.data;
        applyDefaults();
        if(migrateStartingBalanceToTransaction()){ await saveState(); }
      } else {
        state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        var ins = await sb.from('households').insert({ code: householdCode, data: state });
        if(ins.error) throw ins.error;
      }
      cacheStateLocally();
    } catch(e){
      console.error("Laden fehlgeschlagen", e);
      var cached = loadCachedState();
      if(cached){
        state = cached;
        applyDefaults();
        lastFailureWasLoad = true;
        showSaveBanner("Offline-Ansicht — zeigt den zuletzt gespeicherten Stand, evtl. nicht ganz aktuell. Tippe auf Erneut, sobald du wieder online bist.");
      } else {
        state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        lastFailureWasLoad = true;
        showSaveBanner("Verbindung zur Cloud fehlgeschlagen. Prüfe deine Internetverbindung und tippe auf Erneut.");
      }
    }
  }
  // Wandelt ein altes, separates "Startguthaben" (Zahl ohne Buchung) einmalig
  // in eine echte Buchung um, damit es auch im Monatssaldo auftaucht, nicht
  // nur im Gesamtguthaben. Gibt true zurück, wenn etwas migriert wurde.
  function migrateStartingBalanceToTransaction(){
    if(!state.startingBalance) return false;
    var alreadyMigrated = state.transactions.some(function(t){ return t.isStartingBalance; });
    if(alreadyMigrated){ state.startingBalance = 0; return true; }
    state.transactions.push({
      id: uid(), type: state.startingBalance<0 ? 'expense' : 'income',
      amount: Math.abs(state.startingBalance), category: 'Startguthaben',
      date: todayISO(), note: 'Startguthaben (automatisch übernommen)',
      isStartingBalance: true
    });
    state.startingBalance = 0;
    return true;
  }
  function applyDefaults(){
    if(!state.categories) state.categories = DEFAULT_STATE.categories;
    if(!state.savings) state.savings = [];
    if(!state.budgets) state.budgets = {};
    if(!state.recurring) state.recurring = [];
    if(!state.shopping) state.shopping = [];
    if(!state.todos) state.todos = [];
    if(!state.notes) state.notes = [];
    if(!state.calendar) state.calendar = [];
    if(!state.calendarCategories) state.calendarCategories = [];
    if(!state.users) state.users = [];
    if(!state.recipes) state.recipes = [];
    if(!state.mealPlan) state.mealPlan = [];
    if(!state.pantry) state.pantry = [];
    if(!state.projects) state.projects = [];
    if(typeof state.startingBalance !== 'number') state.startingBalance = 0;
    if(!state.budgetExcludedCategories) state.budgetExcludedCategories = [];
    if(typeof state.budgetManualTotal === 'undefined') state.budgetManualTotal = null;
  }

  async function saveState(){
    savePending = true;
    try{
      var res = await sb.from('households').upsert(
        { code: householdCode, data: state, updated_at: new Date().toISOString() },
        { onConflict: 'code' }
      );
      if(res.error) throw res.error;
      savePending = false;
      lastOwnSaveAt = Date.now();
      lastFailureWasLoad = false;
      hideSaveBanner();
      cacheStateLocally();
      showSaveToast();
      return true;
    } catch(e){
      savePending = false;
      console.error("Speichern fehlgeschlagen", e);
      lastFailureWasLoad = false;
      showSaveBanner("Nicht in der Cloud gespeichert (evtl. keine Verbindung). Änderung bleibt vorerst nur auf diesem Gerät sichtbar.");
      return false;
    }
  }
  var saveToastTimer = null;
  function showSaveToast(){
    var t = document.getElementById('saveToast');
    if(!t) return;
    t.style.display = 'flex';
    if(saveToastTimer) clearTimeout(saveToastTimer);
    saveToastTimer = setTimeout(function(){ t.style.display = 'none'; }, 1600);
  }

  function applyRemoteState(newData){
    if(!newData) return;
    var newStr = JSON.stringify(newData);
    if(newStr === JSON.stringify(state)) return;
    state = newData;
    applyDefaults();
    cacheStateLocally();
    renderCurrentScreen();
  }

  // Kurze Schonfrist nach dem eigenen Speichern: Das "Echo" der eigenen
  // Änderung kommt kurz danach übers Realtime-Abo zurück. Datenbanken
  // garantieren aber keine gleichbleibende Feld-Reihenfolge in JSON-Daten
  // — dadurch kann derselbe Inhalt beim reinen Text-Vergleich fälschlich
  // als "anders" erkannt werden, was einen unnötigen kompletten Neu-
  // Aufbau der ganzen App auslöst (spürbares Ruckeln/kurzes Verschwinden
  // von Einträgen). In diesem kurzen Fenster gehen wir davon aus, dass
  // ein eintreffendes Update höchstwahrscheinlich das eigene Echo ist,
  // und überspringen den Neu-Aufbau — eine echte fremde Änderung holt
  // sich die App spätestens über den nächsten 15-Sekunden-Abgleich.
  var lastOwnSaveAt = 0;
  var OWN_SAVE_GRACE_MS = 4000;

  function subscribeRealtime(){
    if(!sb || !householdCode) return;
    if(realtimeChannel){ sb.removeChannel(realtimeChannel); }
    realtimeChannel = sb.channel('household-'+householdCode)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'households', filter: 'code=eq.'+householdCode },
        function(payload){
          if(savePending) return;
          if(Date.now() - lastOwnSaveAt < OWN_SAVE_GRACE_MS) return;
          if(payload.new && payload.new.data){ applyRemoteState(payload.new.data); }
        }
      )
      .subscribe();
  }

  function startPolling(){
    setInterval(async function(){
      if(!householdCode || savePending) return;
      if(Date.now() - lastOwnSaveAt < OWN_SAVE_GRACE_MS) return;
      try{
        var res = await sb.from('households').select('data').eq('code', householdCode).maybeSingle();
        if(!res.error && res.data){ applyRemoteState(res.data.data); }
      } catch(e){ /* stiller Fallback */ }
    }, 15000);
  }

  // Springt Finanzen-Monat, Kalender-Monat und Essensplan-Woche automatisch
  // auf "jetzt", falls inzwischen ein neuer Monat/eine neue Woche begonnen
  // hat (z. B. App blieb über Mitternacht im Hintergrund offen). Manuelles
  // Navigieren zu einem anderen Monat während der aktiven Nutzung bleibt
  // davon unberührt — die Prüfung greift nur beim Wiederkehren.
  var lastKnownDateStr = todayISO();
  function resyncToCurrentPeriodIfNeeded(){
    var nowStr = todayISO();
    if(nowStr === lastKnownDateStr) return;
    lastKnownDateStr = nowStr;
    viewingDate = new Date(); viewingDate.setDate(1);
    calViewDate = new Date(); calViewDate.setDate(1);
    selectedDayStr = nowStr;
    mealWeekStart = mondayOf(new Date());
    renderAll();
    renderCalendar();
    if(document.getElementById('recipeEditView') && document.getElementById('recipeEditView').style.display==='none' &&
       document.getElementById('recipeViewView') && document.getElementById('recipeViewView').style.display==='none'){
      renderMealPlan();
    }
  }
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible') resyncToCurrentPeriodIfNeeded();
  });
  window.addEventListener('focus', resyncToCurrentPeriodIfNeeded);
  setInterval(resyncToCurrentPeriodIfNeeded, 60000);

  function showSaveBanner(msg){
    var b = document.getElementById('saveBanner');
    if(!b) return;
    if(msg) b.querySelector('span').textContent = msg;
    b.style.display = 'flex';
  }
  function hideSaveBanner(){
    var b = document.getElementById('saveBanner');
    if(!b) return;
    b.style.display = 'none';
  }
