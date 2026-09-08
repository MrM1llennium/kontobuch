"use strict";
/* ============================================================
   CASALO — MODUL: TO-DOS
   1:1 ausgelagert aus der ursprünglichen index.html (Phase 2).
   ============================================================ */

  /* ================= To-Dos ================= */
  function todoOffsetLabel(mins){
    if(!mins) return 'zum Zeitpunkt';
    if(mins < 60) return mins+' Min. vorher';
    if(mins < 1440) return Math.round(mins/60)+' Std. vorher';
    return Math.round(mins/1440)+' Tag(e) vorher';
  }
  function todoRepeatLabel(interval, unit){
    var unitLabel = { days:'Tag(e)', weeks:'Woche(n)', months:'Monat(e)' }[unit] || unit;
    return 'Alle '+interval+' '+unitLabel;
  }
  function advanceDateStr(dateStr, interval, unit){
    var d = dateStr ? new Date(dateStr+'T00:00:00') : new Date();
    if(unit==='weeks') d.setDate(d.getDate()+interval*7);
    else if(unit==='months') d.setMonth(d.getMonth()+interval);
    else d.setDate(d.getDate()+interval);
    return dateToISOStr(d);
  }
  function renderTodoAssignList(selectedIds){
    var el = document.getElementById('todoAssignList');
    if(!el) return;
    selectedIds = selectedIds || [];
    if(!state.users || state.users.length===0){
      el.innerHTML = '<p class="empty" style="padding:6px 0;">Noch keine Nutzer angelegt (siehe Einstellungen).</p>';
      return;
    }
    el.innerHTML = state.users.map(function(u){
      var checked = selectedIds.indexOf(u.id)!==-1;
      return '<label style="display:flex; align-items:center; gap:10px; padding:8px 0; border-top:1px dotted var(--line);">'+
        '<input type="checkbox" value="'+u.id+'" '+(checked?'checked':'')+' style="width:19px;height:19px;">'+
        avatarHtml(u.id, 22)+
        '<span style="font-size:14px;">'+escapeHtml(u.name)+'</span>'+
      '</label>';
    }).join('');
  }
  function renderTodos(){
    var el = document.getElementById('todoList');
    if(!el) return;
    renderTodoAssignList();
    if(state.todos.length===0){
      el.innerHTML = '<p class="empty">Keine Aufgaben.</p>';
      updatePushBanner();
      return;
    }
    var sorted = state.todos.slice().sort(function(a,b){
      if(a.done!==b.done) return a.done?1:-1;
      return (a.dueDate||'9999').localeCompare(b.dueDate||'9999');
    });
    el.innerHTML = sorted.map(function(t){
      var subParts = [];
      if(t.dueDate) subParts.push('Fällig am '+fmtDate(t.dueDate)+(t.dueTime?', '+t.dueTime+' Uhr':''));
      if(t.repeatUnit) subParts.push('🔁 '+todoRepeatLabel(t.repeatInterval||1, t.repeatUnit));
      if(t.remind) subParts.push('🔔 '+todoOffsetLabel(t.remindOffset));
      if(t.projectId){
        var proj = state.projects.find(function(p){ return p.id===t.projectId; });
        if(proj) subParts.push('📁 '+escapeHtml(proj.name));
      }
      var assignedAvatars = (t.assignedTo||[]).map(function(uid_){ return avatarHtml(uid_); }).join('');
      return '<div class="simple-row"'+personTintStyle(t.createdBy)+'>'+
        '<div class="check'+(t.done?' done':'')+'" data-id="'+t.id+'">'+(t.done?'✓':'')+'</div>'+
        '<div class="stext"><div class="stitle'+(t.done?' done':'')+'">'+escapeHtml(t.text)+'</div>'+
        (subParts.length ? '<div class="ssub">'+subParts.join(' · ')+'</div>' : '')+'</div>'+
        (assignedAvatars || avatarHtml(t.createdBy)) +
        '<button class="redit" data-id="'+t.id+'" aria-label="Bearbeiten"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z"/></svg></button>'+
      '</div>';
    }).join('');
    el.querySelectorAll('.check').forEach(function(c){
      c.addEventListener('click', function(){
        var id = c.getAttribute('data-id');
        var t = state.todos.find(function(x){ return x.id===id; });
        if(t.repeatUnit && !t.done){
          // Wiederkehrend: statt abzuhaken, Fälligkeit auf die nächste Ausprägung verschieben
          t.dueDate = advanceDateStr(t.dueDate, t.repeatInterval||1, t.repeatUnit);
        } else {
          t.done = !t.done;
        }
        saveState();
        renderTodos();
      });
    });
    el.querySelectorAll('.redit').forEach(function(b){
      b.addEventListener('click', function(){ openEditTodoModal(b.getAttribute('data-id')); });
    });
    updatePushBanner();
  }
  document.getElementById('todoRemindInput').addEventListener('change', function(){
    document.getElementById('todoRemindOffsetWrap').style.display = this.checked ? 'block' : 'none';
  });
  document.getElementById('todoRepeatInput').addEventListener('change', function(){
    document.getElementById('todoRepeatWrap').style.display = this.checked ? 'block' : 'none';
  });
  var editingTodoId = null;
  document.getElementById('openTodoAddBtn').addEventListener('click', function(){
    editingTodoId = null;
    document.getElementById('todoModalTitle').textContent = 'Neue Aufgabe';
    document.getElementById('addTodoBtn').textContent = 'Hinzufügen';
    document.getElementById('deleteTodoBtn').style.display = 'none';
    document.getElementById('todoTextInput').value = '';
    document.getElementById('todoDueInput').value = '';
    document.getElementById('todoDueTimeInput').value = '';
    document.getElementById('todoRemindInput').checked = false;
    document.getElementById('todoRemindOffsetWrap').style.display = 'none';
    document.getElementById('todoRepeatInput').checked = false;
    document.getElementById('todoRepeatWrap').style.display = 'none';
    document.getElementById('todoRepeatInterval').value = '1';
    renderTodoAssignList();
    document.getElementById('todoAddModal').style.display = 'flex';
  });
  function openEditTodoModal(id){
    var t = state.todos.find(function(x){ return x.id===id; });
    if(!t) return;
    editingTodoId = id;
    document.getElementById('todoModalTitle').textContent = 'Aufgabe bearbeiten';
    document.getElementById('addTodoBtn').textContent = 'Speichern';
    document.getElementById('deleteTodoBtn').style.display = 'block';
    document.getElementById('todoTextInput').value = t.text;
    document.getElementById('todoDueInput').value = t.dueDate || '';
    document.getElementById('todoDueTimeInput').value = t.dueTime || '';
    document.getElementById('todoRemindInput').checked = !!t.remind;
    document.getElementById('todoRemindOffsetWrap').style.display = t.remind ? 'block' : 'none';
    document.getElementById('todoRemindOffsetInput').value = t.remindOffset || 1440;
    document.getElementById('todoRepeatInput').checked = !!t.repeatUnit;
    document.getElementById('todoRepeatWrap').style.display = t.repeatUnit ? 'block' : 'none';
    document.getElementById('todoRepeatInterval').value = t.repeatInterval || 1;
    if(t.repeatUnit) document.getElementById('todoRepeatUnit').value = t.repeatUnit;
    renderTodoAssignList(t.assignedTo||[]);
    document.getElementById('todoAddModal').style.display = 'flex';
  }
  document.getElementById('deleteTodoBtn').addEventListener('click', function(){
    if(!editingTodoId) return;
    if(!confirm('Aufgabe wirklich löschen?')) return;
    state.todos = state.todos.filter(function(x){ return x.id!==editingTodoId; });
    saveState();
    editingTodoId = null;
    document.getElementById('todoAddModal').style.display = 'none';
    renderTodos();
    if(typeof currentProjectId!=='undefined' && currentProjectId) renderProjectBoard();
  });
  document.getElementById('cancelTodoAddBtn').addEventListener('click', function(){
    document.getElementById('todoAddModal').style.display = 'none';
    pendingProjectIdForTodo = null;
    editingTodoId = null;
  });
  document.getElementById('addTodoBtn').addEventListener('click', function(){
    var textInput = document.getElementById('todoTextInput');
    var dueInput = document.getElementById('todoDueInput');
    var timeInput = document.getElementById('todoDueTimeInput');
    var remindInput = document.getElementById('todoRemindInput');
    var offsetInput = document.getElementById('todoRemindOffsetInput');
    var repeatInput = document.getElementById('todoRepeatInput');
    var repeatIntervalInput = document.getElementById('todoRepeatInterval');
    var repeatUnitInput = document.getElementById('todoRepeatUnit');
    var val = textInput.value.trim();
    if(!val) return;
    var remind = remindInput.checked && !!dueInput.value;
    var repeatOn = repeatInput.checked;
    var assignedTo = Array.prototype.slice.call(document.querySelectorAll('#todoAssignList input:checked')).map(function(cb){ return cb.value; });

    if(editingTodoId){
      var t = state.todos.find(function(x){ return x.id===editingTodoId; });
      if(t){
        var oldAssigned = (t.assignedTo||[]).slice().sort().join(',');
        var newAssigned = assignedTo.slice().sort().join(',');
        t.text = val;
        t.dueDate = dueInput.value || null;
        t.dueTime = timeInput.value || null;
        t.remind = remind;
        t.remindOffset = remind ? parseInt(offsetInput.value,10) : 0;
        t.repeatInterval = repeatOn ? Math.max(1, parseInt(repeatIntervalInput.value,10)||1) : null;
        t.repeatUnit = repeatOn ? repeatUnitInput.value : null;
        t.assignedTo = assignedTo;
        if(newAssigned !== oldAssigned && assignedTo.length>0) t.assignedAt = new Date().toISOString();
      }
      saveState();
      editingTodoId = null;
      document.getElementById('todoAddModal').style.display = 'none';
      renderTodos();
      if(typeof currentProjectId!=='undefined' && currentProjectId) renderProjectBoard();
      return;
    }

    var newTodo = {
      id: uid(), text: val, done: false,
      dueDate: dueInput.value || null, dueTime: timeInput.value || null,
      remind: remind, remindOffset: remind ? parseInt(offsetInput.value,10) : 0,
      repeatInterval: repeatOn ? Math.max(1, parseInt(repeatIntervalInput.value,10)||1) : null,
      repeatUnit: repeatOn ? repeatUnitInput.value : null,
      assignedTo: assignedTo,
      assignedAt: assignedTo.length>0 ? new Date().toISOString() : null,
      createdBy: currentUserId
    };
    if(pendingProjectIdForTodo){ newTodo.projectId = pendingProjectIdForTodo; }
    state.todos.push(newTodo);
    saveState();
    textInput.value = '';
    dueInput.value = '';
    timeInput.value = '';
    remindInput.checked = false;
    document.getElementById('todoRemindOffsetWrap').style.display = 'none';
    repeatInput.checked = false;
    document.getElementById('todoRepeatWrap').style.display = 'none';
    repeatIntervalInput.value = '1';
    renderTodoAssignList();
    document.getElementById('todoAddModal').style.display = 'none';
    renderTodos();
    if(pendingProjectIdForTodo){
      pendingProjectIdForTodo = null;
      if(typeof currentProjectId!=='undefined' && currentProjectId) renderProjectBoard();
      if(typeof renderProjectList==='function') renderProjectList();
    }
  });

