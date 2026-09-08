"use strict";
/* ============================================================
   CASALO — MODUL: NOTIZEN
   1:1 ausgelagert aus der ursprünglichen index.html (Phase 2).
   ============================================================ */

  /* ================= Notizen ================= */
  function renderNotesList(){
    var el = document.getElementById('noteList');
    if(!el) return;
    if(state.notes.length===0){
      el.innerHTML = '<p class="empty">Noch keine Notizen.</p>';
      return;
    }
    var sorted = state.notes.slice().sort(function(a,b){ return (b.updatedAt||'').localeCompare(a.updatedAt||''); });
    el.innerHTML = sorted.map(function(n){
      var snippet = n.locked
        ? '<span style="color:var(--ink-soft);">Geschützt — zum Anzeigen antippen</span>'
        : escapeHtml(n.text||'');
      return '<div class="note-card" data-id="'+n.id+'" style="position:relative;'+personTintBg(n.updatedBy||n.createdBy)+'">'+
        '<div style="position:absolute; top:14px; right:16px;">'+avatarHtml(n.updatedBy||n.createdBy)+'</div>'+
        '<div class="ntitle" style="padding-right:26px;">'+(n.locked?'🔒 ':'')+escapeHtml(n.title||'Ohne Titel')+'</div>'+
        '<div class="nsnippet">'+snippet+'</div>'+
      '</div>';
    }).join('');
    el.querySelectorAll('.note-card').forEach(function(c){
      c.addEventListener('click', function(){ requestOpenNoteEdit(c.getAttribute('data-id')); });
    });
  }

  /* ---- PIN-Schutz für Notizen: ein gemeinsamer 4-stelliger PIN gilt für
     alle als "geschützt" markierten Notizen. Setup läuft zweistufig
     (neuer PIN + Bestätigung), damit sich kein Tippfehler einschleicht. ---- */
  var notePinCallback = null;
  var notePinStage = 'verify'; // 'verify' | 'setup-new' | 'setup-confirm'
  var notePinFirstEntry = null;
  function openNotePinModal(mode, onSuccess){
    notePinCallback = onSuccess;
    notePinStage = mode==='setup' ? 'setup-new' : 'verify';
    notePinFirstEntry = null;
    renderNotePinModalStage();
    document.getElementById('notePinModal').style.display = 'flex';
  }
  function renderNotePinModalStage(){
    document.getElementById('notePinInput').value = '';
    document.getElementById('notePinError').style.display = 'none';
    if(notePinStage==='verify'){
      document.getElementById('notePinTitle').textContent = 'PIN eingeben';
      document.getElementById('notePinSub').textContent = 'Zum Fortfahren PIN eingeben.';
    } else if(notePinStage==='setup-new'){
      document.getElementById('notePinTitle').textContent = 'Neuen PIN festlegen';
      document.getElementById('notePinSub').textContent = 'Dieser PIN gilt für alle geschützten Notizen — merkt ihn euch beide.';
    } else if(notePinStage==='setup-confirm'){
      document.getElementById('notePinTitle').textContent = 'PIN bestätigen';
      document.getElementById('notePinSub').textContent = 'Gebt den PIN zur Sicherheit nochmal ein.';
    }
  }
  document.getElementById('cancelNotePinBtn').addEventListener('click', function(){
    document.getElementById('notePinModal').style.display = 'none';
    notePinCallback = null;
  });
  document.getElementById('confirmNotePinBtn').addEventListener('click', function(){
    var val = document.getElementById('notePinInput').value.trim();
    var errEl = document.getElementById('notePinError');
    if(!/^\d{4}$/.test(val)){
      errEl.textContent = 'Bitte genau 4 Ziffern eingeben.';
      errEl.style.display = 'block';
      return;
    }
    if(notePinStage==='verify'){
      if(val === state.notesPin){
        document.getElementById('notePinModal').style.display = 'none';
        var cb = notePinCallback; notePinCallback = null;
        if(cb) cb();
      } else {
        errEl.textContent = 'Falscher PIN.';
        errEl.style.display = 'block';
        document.getElementById('notePinInput').value = '';
      }
    } else if(notePinStage==='setup-new'){
      notePinFirstEntry = val;
      notePinStage = 'setup-confirm';
      renderNotePinModalStage();
    } else if(notePinStage==='setup-confirm'){
      if(val === notePinFirstEntry){
        state.notesPin = val;
        saveState();
        document.getElementById('notePinModal').style.display = 'none';
        var cb2 = notePinCallback; notePinCallback = null;
        if(cb2) cb2();
      } else {
        notePinStage = 'setup-new';
        notePinFirstEntry = null;
        renderNotePinModalStage();
        errEl.textContent = 'PINs stimmten nicht überein — nochmal von vorn.';
        errEl.style.display = 'block';
      }
    }
  });

  document.getElementById('changeNotesPinBtn').addEventListener('click', function(){
    if(!state.notesPin){
      openNotePinModal('setup', function(){ alert('PIN gespeichert.'); });
      return;
    }
    openNotePinModal('verify', function(){
      openNotePinModal('setup', function(){ alert('PIN geändert.'); });
    });
  });
  document.getElementById('forgotNotesPinBtn').addEventListener('click', function(){
    if(!state.notesPin){
      alert('Es ist noch gar kein PIN eingerichtet.');
      return;
    }
    if(!confirm('PIN zurücksetzen? Alle bisher geschützten Notizen werden dabei entsperrt — der Inhalt bleibt erhalten, nur der PIN-Schutz fällt weg. Ihr könnt danach jederzeit einen neuen PIN festlegen. Fortfahren?')) return;
    state.notesPin = null;
    state.notes.forEach(function(n){ n.locked = false; });
    saveState();
    renderNotesList();
    alert('PIN zurückgesetzt — alle Notizen sind jetzt wieder frei zugänglich.');
  });

  function requestOpenNoteEdit(id){
    var n = id ? state.notes.find(function(x){ return x.id===id; }) : null;
    if(n && n.locked){
      openNotePinModal('verify', function(){ openNoteEdit(id); });
    } else {
      openNoteEdit(id);
    }
  }
  function openNoteEdit(id){
    editingNoteId = id;
    var n = id ? state.notes.find(function(x){ return x.id===id; }) : { title:'', text:'', locked:false };
    document.getElementById('noteTitleInput').value = n.title || '';
    document.getElementById('noteTextInput').value = n.text || '';
    document.getElementById('noteLockToggle').checked = !!n.locked;
    document.getElementById('notesListView').style.display = 'none';
    document.getElementById('noteEditView').style.display = 'block';
    document.getElementById('deleteNoteBtn').style.display = id ? 'block' : 'none';
  }
  function closeNoteEdit(){
    editingNoteId = null;
    document.getElementById('notesListView').style.display = 'block';
    document.getElementById('noteEditView').style.display = 'none';
    renderNotesList();
  }
  document.getElementById('newNoteBtn').addEventListener('click', function(){ openNoteEdit(null); });
  document.getElementById('cancelNoteBtn').addEventListener('click', closeNoteEdit);
  document.getElementById('saveNoteBtn').addEventListener('click', function(){
    var title = document.getElementById('noteTitleInput').value.trim();
    var text = document.getElementById('noteTextInput').value.trim();
    var wantsLock = document.getElementById('noteLockToggle').checked;
    if(!title && !text){ closeNoteEdit(); return; }
    function doSave(){
      if(editingNoteId){
        var n = state.notes.find(function(x){ return x.id===editingNoteId; });
        n.title = title; n.text = text; n.locked = wantsLock; n.updatedAt = new Date().toISOString(); n.updatedBy = currentUserId;
      } else {
        state.notes.push({ id: uid(), title: title, text: text, locked: wantsLock, updatedAt: new Date().toISOString(), createdBy: currentUserId });
      }
      saveState();
      closeNoteEdit();
    }
    if(wantsLock && !state.notesPin){
      openNotePinModal('setup', doSave);
    } else {
      doSave();
    }
  });
  document.getElementById('deleteNoteBtn').addEventListener('click', function(){
    if(!editingNoteId) return;
    state.notes = state.notes.filter(function(x){ return x.id!==editingNoteId; });
    saveState();
    closeNoteEdit();
  });

