"use strict";
/* ============================================================
   CASALO — MODUL: PROJEKTE
   1:1 ausgelagert aus der ursprünglichen index.html (Phase 2).
   ============================================================ */

  /* ================= Projekte ================= */
  var currentProjectId = null;
  var projectItemType = 'link';
  var editingProjectId = null; // gesetzt beim Bearbeiten von Name/Notiz/Sparziel eines bestehenden Projekts

  function projectPlannedTotal(p){
    return (p.items||[]).filter(function(it){ return it.type==='cost'; })
      .reduce(function(sum, it){ return sum + (it.amount||0); }, 0);
  }
  function projectTodoCount(p){
    var todos = state.todos.filter(function(t){ return t.projectId===p.id; });
    var done = todos.filter(function(t){ return t.done; }).length;
    return { total: todos.length, done: done };
  }

  function detectProjectEmoji(name){
    var n = (name||'').toLowerCase();
    var map = [
      [['urlaub','reise','ferien','trip','strand','insel','flug'], '🏖️'],
      [['ski','berge','wandern','alpen'], '⛰️'],
      [['auto','wagen','pkw'], '🚗'],
      [['motorrad'], '🏍️'],
      [['fahrrad','rad ','e-bike'], '🚲'],
      [['küche'], '🍳'],
      [['bad','badezimmer'], '🛁'],
      [['garten','balkon'], '🌱'],
      [['hochzeit','heirat'], '💍'],
      [['baby','geburt'], '👶'],
      [['haus','wohnung','umzug','renovier'], '🏠'],
      [['möbel','sofa','couch'], '🛋️'],
      [['handy','laptop','computer','tv','fernseher','technik','pc'], '💻'],
      [['hund','katze','haustier'], '🐾'],
      [['fest','party','feier','geburtstag'], '🎉'],
      [['sport','fitness','gym'], '🏋️'],
      [['weihnacht'], '🎄'],
      [['buch','lesen'], '📚'],
      [['musik','instrument','gitarre','klavier'], '🎸'],
      [['kleid','klamotten','mode'], '👗'],
      [['schule','studium','uni'], '🎓'],
    ];
    for(var i=0;i<map.length;i++){
      for(var j=0;j<map[i][0].length;j++){
        if(n.indexOf(map[i][0][j])!==-1) return map[i][1];
      }
    }
    return '📁';
  }
  function projectCoverHtml(p){
    if(p.coverImage){
      return '<img src="'+p.coverImage+'" style="width:44px; height:44px; border-radius:10px; object-fit:cover; flex-shrink:0;">';
    }
    var emoji = detectProjectEmoji(p.name);
    return '<div style="width:44px; height:44px; border-radius:10px; background:var(--brass-soft); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;">'+emoji+'</div>';
  }
  function projectCoverHtmlLarge(p){
    if(p.coverImage){
      return '<img src="'+p.coverImage+'" style="width:68px; height:68px; max-width:68px; max-height:68px; border-radius:14px; object-fit:cover; flex-shrink:0;">';
    }
    var emoji = detectProjectEmoji(p.name);
    return '<div style="width:68px; height:68px; border-radius:14px; background:var(--brass-soft); display:flex; align-items:center; justify-content:center; font-size:30px; flex-shrink:0;">'+emoji+'</div>';
  }
  function renderProjectList(){
    var el = document.getElementById('projectList');
    if(!el) return;
    if(!state.projects || state.projects.length===0){
      el.innerHTML = '<p class="empty">Noch keine Projekte angelegt.</p>';
      return;
    }
    var sorted = state.projects.slice().sort(function(a,b){ return (b.createdAt||'').localeCompare(a.createdAt||''); });
    el.innerHTML = sorted.map(function(p){
      var total = projectPlannedTotal(p);
      var goal = p.goalId ? state.savings.find(function(g){ return g.id===p.goalId; }) : null;
      var itemCount = (p.items||[]).length + state.todos.filter(function(t){ return t.projectId===p.id; }).length;
      return '<div class="note-card" data-project="'+p.id+'" style="display:flex; gap:12px; align-items:flex-start;">'+
        projectCoverHtml(p) +
        '<div style="flex:1; min-width:0;">'+
          '<div class="ntitle">'+escapeHtml(p.name)+'</div>'+
          (p.note ? '<div class="nsnippet">'+escapeHtml(p.note)+'</div>' : '')+
          '<div style="margin-top:8px; font-size:12.5px; color:var(--ink-soft);">'+
            (total>0 ? 'Geplant: '+fmtEUR(total)+' · ' : '')+
            itemCount+' Einträge'+
            (goal ? ' · Sparziel: '+fmtEUR(goal.saved)+' / '+fmtEUR(goal.target) : '')+
          '</div>'+
        '</div>'+
      '</div>';
    }).join('');
    el.querySelectorAll('[data-project]').forEach(function(c){
      c.addEventListener('click', function(){ openProjectBoard(c.getAttribute('data-project')); });
    });
  }

  function populateProjectGoalSelect(){
    var sel = document.getElementById('projectGoalSelect');
    sel.innerHTML = '<option value="">— Kein Sparziel —</option>' +
      state.savings.map(function(g){ return '<option value="'+g.id+'">'+escapeHtml(g.name)+'</option>'; }).join('');
  }
  var pendingProjectCoverImage = null;
  function resetProjectImagePicker(existingImage){
    pendingProjectCoverImage = existingImage || null;
    var wrap = document.getElementById('projectImagePreviewWrap');
    var img = document.getElementById('projectImagePreview');
    if(pendingProjectCoverImage){
      img.src = pendingProjectCoverImage;
      wrap.style.display = 'block';
    } else {
      img.src = '';
      wrap.style.display = 'none';
    }
  }
  document.getElementById('projectImagePickBtn').addEventListener('click', function(){
    document.getElementById('projectImageInput').click();
  });
  document.getElementById('projectImageInput').addEventListener('change', function(e){
    var file = e.target.files[0];
    if(!file) return;
    resizeImageFile(file, 640, 0.72).then(function(dataUrl){
      resetProjectImagePicker(dataUrl);
    }).catch(function(){
      alert('Foto konnte nicht verarbeitet werden.');
    });
    e.target.value = '';
  });
  document.getElementById('removeProjectImageBtn').addEventListener('click', function(){
    resetProjectImagePicker(null);
  });
  document.getElementById('openNewProjectBtn').addEventListener('click', function(){
    editingProjectId = null;
    document.getElementById('projectModalTitle').textContent = 'Neues Projekt';
    document.getElementById('projectNameInput').value = '';
    document.getElementById('projectNoteInput').value = '';
    populateProjectGoalSelect();
    document.getElementById('projectGoalSelect').value = '';
    resetProjectImagePicker(null);
    document.getElementById('newProjectModal').style.display = 'flex';
  });
  document.getElementById('cancelProjectModalBtn').addEventListener('click', function(){
    document.getElementById('newProjectModal').style.display = 'none';
  });
  document.getElementById('saveProjectBtn').addEventListener('click', function(){
    var name = document.getElementById('projectNameInput').value.trim();
    if(!name) return;
    var note = document.getElementById('projectNoteInput').value.trim();
    var goalId = document.getElementById('projectGoalSelect').value || null;
    if(editingProjectId){
      var p = state.projects.find(function(x){ return x.id===editingProjectId; });
      if(p){ p.name = name; p.note = note; p.goalId = goalId; p.coverImage = pendingProjectCoverImage; }
    } else {
      state.projects.push({
        id: uid(), name: name, note: note, goalId: goalId, coverImage: pendingProjectCoverImage,
        items: [], createdBy: currentUserId, createdAt: new Date().toISOString()
      });
    }
    saveState();
    document.getElementById('newProjectModal').style.display = 'none';
    renderProjectList();
    if(currentProjectId) renderProjectBoard();
  });
  function openEditProjectMetaModal(){
    var p = state.projects.find(function(x){ return x.id===currentProjectId; });
    if(!p) return;
    editingProjectId = p.id;
    document.getElementById('projectModalTitle').textContent = 'Projekt bearbeiten';
    document.getElementById('projectNameInput').value = p.name;
    document.getElementById('projectNoteInput').value = p.note || '';
    populateProjectGoalSelect();
    document.getElementById('projectGoalSelect').value = p.goalId || '';
    resetProjectImagePicker(p.coverImage || null);
    document.getElementById('newProjectModal').style.display = 'flex';
  }

  function openProjectBoard(id){
    currentProjectId = id;
    document.getElementById('projectListWrap').style.display = 'none';
    document.getElementById('projectBoardView').style.display = 'block';
    document.getElementById('projectsBackBtn').textContent = '‹ Projekte';
    window.scrollTo(0,0);
    renderProjectBoard();
  }
  function closeProjectBoard(){
    currentProjectId = null;
    document.getElementById('projectBoardView').style.display = 'none';
    document.getElementById('projectListWrap').style.display = 'block';
    document.getElementById('projectsScreenTitle').textContent = 'Projekte';
    document.getElementById('projectsBackBtn').textContent = '‹ Dashboard';
  }
  document.getElementById('projectsBackBtn').addEventListener('click', function(){
    if(currentProjectId){
      closeProjectBoard();
      renderProjectList();
    } else {
      goHome();
    }
  });
  document.getElementById('deleteProjectBtn').addEventListener('click', function(){
    var p = state.projects.find(function(x){ return x.id===currentProjectId; });
    if(!p) return;
    if(!confirm('"'+p.name+'" wirklich löschen? Verknüpfte Aufgaben bleiben als normale To-Dos erhalten, verlieren aber die Projekt-Zuordnung.')) return;
    state.todos.forEach(function(t){ if(t.projectId===p.id) delete t.projectId; });
    state.projects = state.projects.filter(function(x){ return x.id!==p.id; });
    saveState();
    closeProjectBoard();
    renderProjectList();
  });

  function editIconBtn(id){
    return '<button class="redit" data-pitemedit="'+id+'" aria-label="Bearbeiten"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z"/></svg></button>';
  }
  var PROJECT_FOLDER_META = {
    link:      { label: 'Links',       emoji: '🔗' },
    note:      { label: 'Notizen',     emoji: '📝' },
    cost:      { label: 'Kosten',      emoji: '💰' },
    checklist: { label: 'Checklisten', emoji: '📋' }
  };
  function projectItemRowHtml(it){
    var pin = it.pinned ? '📌 ' : '';
    if(it.type==='link'){
      return '<div class="simple-row"'+personTintStyle(it.createdBy)+'>'+
        '<div class="stext"><a href="'+escapeHtml(it.url)+'" target="_blank" rel="noopener" style="color:var(--brass-strong); font-weight:600; text-decoration:none;">'+pin+'🔗 '+escapeHtml(it.title)+'</a>'+
        '<div class="ssub" style="word-break:break-all;">'+escapeHtml(it.url)+'</div></div>'+
        avatarHtml(it.createdBy)+
        editIconBtn(it.id)+
      '</div>';
    }
    if(it.type==='note'){
      return '<div class="simple-row"'+personTintStyle(it.createdBy)+'>'+
        '<div class="stext"><div class="stitle">'+pin+'📝 '+escapeHtml(it.text)+'</div></div>'+
        avatarHtml(it.createdBy)+
        editIconBtn(it.id)+
      '</div>';
    }
    if(it.type==='cost'){
      return '<div class="simple-row"'+personTintStyle(it.createdBy)+'>'+
        '<div class="stext"><div class="stitle">'+pin+'💰 '+escapeHtml(it.title)+'</div></div>'+
        '<div class="num" style="font-size:14px; flex-shrink:0;">'+fmtEUR(it.amount)+'</div>'+
        avatarHtml(it.createdBy)+
        editIconBtn(it.id)+
      '</div>';
    }
    if(it.type==='image'){
      // Alttyp aus früheren Versionen — wird nur noch dargestellt, kann
      // aber nicht mehr neu angelegt werden.
      return '<div class="simple-row" style="flex-wrap:wrap;'+personTintBg(it.createdBy)+'">'+
        '<img src="'+it.photo+'" style="width:100%; border-radius:10px; order:1;">'+
        (it.caption ? '<div class="stext" style="order:2;"><div class="stitle">'+escapeHtml(it.caption)+'</div></div>' : '<div style="order:2; flex:1;"></div>')+
        avatarHtml(it.createdBy)+
        '<span style="order:3;">'+editIconBtn(it.id)+'</span>'+
      '</div>';
    }
    if(it.type==='checklist'){
      var items = it.items || [];
      var doneCount = items.filter(function(x){ return x.checked; }).length;
      var subHtml = items.map(function(x, i){
        return '<div class="checklist-subitem" data-checkidx="'+i+'" data-checkparent="'+it.id+'" style="display:flex; align-items:center; gap:10px; padding:6px 0 6px 6px; cursor:pointer;">'+
          '<div class="check'+(x.checked?' done':'')+'" style="flex-shrink:0;">'+(x.checked?'✓':'')+'</div>'+
          '<span style="font-size:13.5px;'+(x.checked?' text-decoration:line-through; color:var(--ink-soft);':'')+'">'+escapeHtml(x.text)+'</span>'+
        '</div>';
      }).join('');
      return '<div class="simple-row" style="flex-direction:column; align-items:stretch;"'+personTintStyle(it.createdBy)+'>'+
        '<div style="display:flex; align-items:center; gap:12px;">'+
          '<div class="stext"><div class="stitle">'+pin+'📋 '+escapeHtml(it.title)+'</div>'+
          '<div class="ssub">'+doneCount+'/'+items.length+' erledigt</div></div>'+
          avatarHtml(it.createdBy)+
          editIconBtn(it.id)+
        '</div>'+
        (subHtml ? '<div style="margin-top:4px; padding-left:2px;">'+subHtml+'</div>' : '')+
      '</div>';
    }
    return '';
  }
  function projectTodoRowHtml(t){
    var subParts = [];
    if(t.dueDate) subParts.push('Fällig am '+fmtDate(t.dueDate)+(t.dueTime?', '+t.dueTime+' Uhr':''));
    return '<div class="simple-row"'+personTintStyle(t.createdBy)+'>'+
      '<div class="check'+(t.done?' done':'')+'" data-ptodocheck="'+t.id+'">'+(t.done?'✓':'')+'</div>'+
      '<div class="stext"><div class="stitle'+(t.done?' done':'')+'">✅ '+escapeHtml(t.text)+'</div>'+
      (subParts.length ? '<div class="ssub">'+subParts.join(' · ')+'</div>' : '')+'</div>'+
      avatarHtml(t.createdBy)+
      '<button class="redit" data-ptodoedit="'+t.id+'" aria-label="Bearbeiten"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z"/></svg></button>'+
    '</div>';
  }

  var projectFolderOpen = { link:false, note:false, cost:false };
  function renderProjectBoard(){
    var p = state.projects.find(function(x){ return x.id===currentProjectId; });
    if(!p) return;
    document.getElementById('projectsScreenTitle').textContent = p.name;

    var total = projectPlannedTotal(p);
    var goal = p.goalId ? state.savings.find(function(g){ return g.id===p.goalId; }) : null;
    var summaryEl = document.getElementById('projectSummaryCard');
    var summaryHtml = '<div class="today-card" style="padding:16px 18px; position:relative;">';
    summaryHtml += '<button class="redit" data-pitemedit="meta" aria-label="Bearbeiten" style="position:absolute; top:12px; right:12px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z"/></svg></button>';
    summaryHtml += '<div style="display:flex; gap:14px; align-items:stretch;">';
    summaryHtml += projectCoverHtmlLarge(p);
    summaryHtml += '<div style="flex:1; min-width:0; padding-right:30px; display:flex; flex-direction:column; justify-content:center;">';
    if(p.note) summaryHtml += '<div style="font-size:15px; font-weight:600; color:var(--ink); margin-bottom:4px;">'+escapeHtml(p.note)+'</div>';
    summaryHtml += '<div class="num" style="font-size:22px; font-weight:600;">'+fmtEUR(total)+'</div>';
    summaryHtml += '<div style="font-size:12px; color:var(--ink-soft); margin-top:2px;">Geplante Kosten</div>';
    summaryHtml += '</div>';
    summaryHtml += '</div>';
    if(goal){
      var pct = goal.target>0 ? Math.min(goal.saved/goal.target*100, 100) : 0;
      summaryHtml += '<div style="margin-top:12px; padding-top:12px; border-top:1px dotted var(--line);">'+
        '<div style="font-size:12px; color:var(--ink-soft);">Sparziel „'+escapeHtml(goal.name)+'"</div>'+
        '<div style="font-size:14px; margin:2px 0 6px;">'+fmtEUR(goal.saved)+' von '+fmtEUR(goal.target)+'</div>'+
        '<div class="bar-track"><div class="bar-fill income" style="width:'+pct+'%"></div></div>'+
      '</div>';
    }
    summaryHtml += '</div>';
    summaryEl.innerHTML = summaryHtml;
    var editIconEl = summaryEl.querySelector('[data-pitemedit="meta"]');
    if(editIconEl) editIconEl.addEventListener('click', openEditProjectMetaModal);

    // Todos — mit eigener Überschrift
    var todos = state.todos.filter(function(t){ return t.projectId===p.id; });
    var todosEl = document.getElementById('projectItemsList');
    todosEl.style.display = todos.length ? 'block' : 'none';
    todosEl.innerHTML = todos.length
      ? '<p class="section-title" style="padding:14px 20px 4px;">To-Dos</p>' + todos.map(projectTodoRowHtml).join('')
      : '';
    todosEl.querySelectorAll('[data-ptodoedit]').forEach(function(b){
      b.addEventListener('click', function(){ openEditTodoModal(b.getAttribute('data-ptodoedit')); });
    });
    todosEl.querySelectorAll('[data-ptodocheck]').forEach(function(c){
      c.addEventListener('click', function(){
        var id = c.getAttribute('data-ptodocheck');
        var t = state.todos.find(function(x){ return x.id===id; });
        if(t){ t.done = !t.done; saveState(); renderProjectBoard(); }
      });
    });

    // Angepinnte Einträge — über allem
    var items = p.items || [];
    var pinned = items.filter(function(it){ return it.pinned; });
    var pinnedEl = document.getElementById('projectPinnedWrap');
    if(pinned.length===0){
      pinnedEl.innerHTML = '';
    } else {
      pinnedEl.innerHTML = '<p class="section-title" style="padding:14px 20px 4px;">Angepinnt</p>' +
        pinned.map(projectItemRowHtml).join('');
    }

    // Ordner nach Typ — Link / Notiz / Kosten, je aufklappbar, mit eigener Überschrift
    var foldersEl = document.getElementById('projectFoldersWrap');
    var foldersHtml = '';
    var anyFolder = ['link','note','cost','checklist'].some(function(type){ return items.some(function(it){ return it.type===type; }); });
    if(anyFolder) foldersHtml += '<p class="section-title" style="padding:14px 20px 4px;">Ordner</p>';
    ['link','note','cost','checklist'].forEach(function(type){
      var typeItems = items.filter(function(it){ return it.type===type; });
      if(typeItems.length===0) return;
      var meta = PROJECT_FOLDER_META[type];
      var open = projectFolderOpen[type];
      foldersHtml += '<div class="simple-row" data-folder="'+type+'" style="cursor:pointer;">'+
        '<div class="stext"><div class="stitle">'+meta.emoji+' '+meta.label+'</div></div>'+
        '<div style="color:var(--ink-soft); font-size:13px; flex-shrink:0;">'+typeItems.length+'</div>'+
        '<span style="color:var(--ink-soft); font-size:15px; flex-shrink:0; display:inline-block; transform:rotate('+(open?90:0)+'deg); transition:transform .15s;">›</span>'+
      '</div>';
      foldersHtml += '<div data-folder-items="'+type+'" style="display:'+(open?'block':'none')+';">'+
        typeItems.slice().sort(function(a,b){ return (b.createdAt||'').localeCompare(a.createdAt||''); }).map(projectItemRowHtml).join('') +
      '</div>';
    });
    foldersEl.innerHTML = foldersHtml;

    if(items.length===0 && todos.length===0){
      foldersEl.innerHTML = '<p class="empty">Noch nichts gesammelt — leg mit "+ Hinzufügen" oder "+ Aufgabe" los.</p>';
    }

    foldersEl.querySelectorAll('[data-folder]').forEach(function(row){
      row.addEventListener('click', function(){
        var type = row.getAttribute('data-folder');
        projectFolderOpen[type] = !projectFolderOpen[type];
        renderProjectBoard();
      });
    });
    document.querySelectorAll('#projectPinnedWrap [data-pitemedit], #projectFoldersWrap [data-pitemedit]').forEach(function(b){
      b.addEventListener('click', function(e){
        e.stopPropagation();
        openEditProjectItemModal(b.getAttribute('data-pitemedit'));
      });
    });
    document.querySelectorAll('#projectPinnedWrap [data-checkparent], #projectFoldersWrap [data-checkparent]').forEach(function(row){
      row.addEventListener('click', function(e){
        e.stopPropagation();
        var pr = state.projects.find(function(x){ return x.id===currentProjectId; });
        if(!pr) return;
        var it = pr.items.find(function(x){ return x.id===row.getAttribute('data-checkparent'); });
        if(!it || !it.items) return;
        var idx = parseInt(row.getAttribute('data-checkidx'), 10);
        if(!it.items[idx]) return;
        it.items[idx].checked = !it.items[idx].checked;
        saveState();
        renderProjectBoard();
      });
    });
  }

  function setProjectItemType(t){
    projectItemType = t;
    document.querySelectorAll('#projectItemTypeSwitch button').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-ptype')===t);
    });
    document.getElementById('ptypeFieldsLink').style.display = t==='link' ? 'block' : 'none';
    document.getElementById('ptypeFieldsNote').style.display = t==='note' ? 'block' : 'none';
    document.getElementById('ptypeFieldsCost').style.display = t==='cost' ? 'block' : 'none';
    document.getElementById('ptypeFieldsChecklist').style.display = t==='checklist' ? 'block' : 'none';
  }
  document.querySelectorAll('#projectItemTypeSwitch button').forEach(function(b){
    b.addEventListener('click', function(){ setProjectItemType(b.getAttribute('data-ptype')); });
  });
  var editingProjectItemId = null;
  document.getElementById('openAddProjectItemBtn').addEventListener('click', function(){
    editingProjectItemId = null;
    document.getElementById('projectItemModalTitle').textContent = 'Hinzufügen';
    document.getElementById('saveProjectItemBtn').textContent = 'Hinzufügen';
    document.getElementById('deleteProjectItemBtn').style.display = 'none';
    document.querySelectorAll('#projectItemTypeSwitch button').forEach(function(b){ b.disabled = false; b.style.opacity = ''; });
    setProjectItemType('link');
    document.getElementById('ptLinkTitle').value = '';
    document.getElementById('ptLinkUrl').value = '';
    document.getElementById('ptNoteText').value = '';
    document.getElementById('ptCostTitle').value = '';
    document.getElementById('ptCostAmount').value = '';
    document.getElementById('ptChecklistTitle').value = '';
    document.getElementById('ptChecklistItems').value = '';
    document.getElementById('ptPinnedInput').checked = false;
    document.getElementById('projectItemModal').style.display = 'flex';
  });
  function openEditProjectItemModal(id){
    var p = state.projects.find(function(x){ return x.id===currentProjectId; });
    if(!p) return;
    var it = p.items.find(function(x){ return x.id===id; });
    if(!it) return;
    editingProjectItemId = id;
    document.getElementById('projectItemModalTitle').textContent = 'Eintrag bearbeiten';
    document.getElementById('saveProjectItemBtn').textContent = 'Speichern';
    document.getElementById('deleteProjectItemBtn').style.display = 'block';
    // Typ steht beim Bearbeiten fest (kein Wechsel zwischen Link/Notiz/Kosten/Checkliste)
    document.querySelectorAll('#projectItemTypeSwitch button').forEach(function(b){ b.disabled = true; b.style.opacity = '.4'; });
    setProjectItemType(it.type);
    document.getElementById('ptLinkTitle').value = it.title || '';
    document.getElementById('ptLinkUrl').value = it.url || '';
    document.getElementById('ptNoteText').value = it.text || '';
    document.getElementById('ptCostTitle').value = it.title || '';
    document.getElementById('ptCostAmount').value = it.amount || '';
    document.getElementById('ptChecklistTitle').value = it.title || '';
    document.getElementById('ptChecklistItems').value = (it.items||[]).map(function(x){ return x.text; }).join('\n');
    document.getElementById('ptPinnedInput').checked = !!it.pinned;
    document.getElementById('projectItemModal').style.display = 'flex';
  }
  document.getElementById('deleteProjectItemBtn').addEventListener('click', function(){
    var p = state.projects.find(function(x){ return x.id===currentProjectId; });
    if(!p || !editingProjectItemId) return;
    if(!confirm('Eintrag wirklich löschen?')) return;
    p.items = p.items.filter(function(x){ return x.id!==editingProjectItemId; });
    saveState();
    editingProjectItemId = null;
    document.getElementById('projectItemModal').style.display = 'none';
    renderProjectBoard();
    renderProjectList();
  });
  document.getElementById('cancelProjectItemBtn').addEventListener('click', function(){
    document.getElementById('projectItemModal').style.display = 'none';
    editingProjectItemId = null;
  });
  function parseChecklistItems(rawText, previousItems){
    var prevByText = {};
    (previousItems||[]).forEach(function(x){ prevByText[x.text] = x.checked; });
    return rawText.split('\n').map(function(line){ return line.trim(); }).filter(function(line){ return line.length>0; })
      .map(function(line){ return { text: line, checked: !!prevByText[line] }; });
  }
  document.getElementById('saveProjectItemBtn').addEventListener('click', function(){
    var p = state.projects.find(function(x){ return x.id===currentProjectId; });
    if(!p) return;
    var pinned = document.getElementById('ptPinnedInput').checked;

    if(editingProjectItemId){
      var it = p.items.find(function(x){ return x.id===editingProjectItemId; });
      if(!it) return;
      if(it.type==='link'){
        var title = document.getElementById('ptLinkTitle').value.trim();
        var url = document.getElementById('ptLinkUrl').value.trim();
        if(!title || !url) return;
        if(!/^https?:\/\//i.test(url)) url = 'https://'+url;
        it.title = title; it.url = url;
      } else if(it.type==='note'){
        var text = document.getElementById('ptNoteText').value.trim();
        if(!text) return;
        it.text = text;
      } else if(it.type==='cost'){
        var ctitle = document.getElementById('ptCostTitle').value.trim();
        var amount = parseFloat(document.getElementById('ptCostAmount').value);
        if(!ctitle || !amount || amount<=0) return;
        it.title = ctitle; it.amount = Math.round(amount*100)/100;
      } else if(it.type==='checklist'){
        var cltitle = document.getElementById('ptChecklistTitle').value.trim();
        var clitems = parseChecklistItems(document.getElementById('ptChecklistItems').value, it.items);
        if(!cltitle || clitems.length===0) return;
        it.title = cltitle; it.items = clitems;
      }
      it.pinned = pinned;
      saveState();
      editingProjectItemId = null;
      document.getElementById('projectItemModal').style.display = 'none';
      renderProjectBoard();
      renderProjectList();
      return;
    }

    var base = { id: uid(), type: projectItemType, pinned: pinned, createdBy: currentUserId, createdAt: new Date().toISOString() };
    if(projectItemType==='link'){
      var title2 = document.getElementById('ptLinkTitle').value.trim();
      var url2 = document.getElementById('ptLinkUrl').value.trim();
      if(!title2 || !url2) return;
      if(!/^https?:\/\//i.test(url2)) url2 = 'https://'+url2;
      base.title = title2; base.url = url2;
    } else if(projectItemType==='note'){
      var text2 = document.getElementById('ptNoteText').value.trim();
      if(!text2) return;
      base.text = text2;
    } else if(projectItemType==='cost'){
      var ctitle2 = document.getElementById('ptCostTitle').value.trim();
      var amount2 = parseFloat(document.getElementById('ptCostAmount').value);
      if(!ctitle2 || !amount2 || amount2<=0) return;
      base.title = ctitle2; base.amount = Math.round(amount2*100)/100;
    } else if(projectItemType==='checklist'){
      var cltitle2 = document.getElementById('ptChecklistTitle').value.trim();
      var clitems2 = parseChecklistItems(document.getElementById('ptChecklistItems').value, null);
      if(!cltitle2 || clitems2.length===0) return;
      base.title = cltitle2; base.items = clitems2;
    }
    p.items.push(base);
    saveState();
    document.getElementById('projectItemModal').style.display = 'none';
    renderProjectBoard();
    renderProjectList();
  });

  // "+ Aufgabe" im Projekt: öffnet das normale To-Do-Pop-up wieder, setzt
  // aber vorher, für welches Projekt die neue Aufgabe angelegt wird.
  var pendingProjectIdForTodo = null;
  document.getElementById('openAddProjectTodoBtn').addEventListener('click', function(){
    pendingProjectIdForTodo = currentProjectId;
    document.getElementById('openTodoAddBtn').click();
  });

