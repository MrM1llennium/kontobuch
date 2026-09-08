"use strict";
/* ============================================================
   CASALO — CORE: APP
   1:1 ausgelagert aus der ursprünglichen index.html (Phase 2).
   App-weite Bausteine, die im Original zwischen den Modul-
   Abschnitten verstreut lagen: Theme-/Style-Umschaltung,
   Nutzerverwaltung, Sidebar, Home<->Modul-Navigation, Dashboard
   ("Heute"), Push-Infrastruktur, Backup/Haushalt, App-Start.
   Reihenfolge der einzelnen Blöcke entspricht ihrer ursprüng-
   lichen Position in der Datei — nur andere Modul-Abschnitte
   (Finanzen/Kalender/...) wurden dazwischen herausgenommen.
   ============================================================ */

  var CURRENT_USER_KEY = 'kontobuch-current-user-id';

  /* ---- Theme/Style-Umschaltung ---- */
  /* ================= Design/Style/Theme ================= */
  var THEME_KEY = 'kontobuch-theme';
  var STYLE_KEY = 'kontobuch-style';
  var VALID_THEMES_BY_STYLE = { modern: ['signature','forest','lilac'], kawaii: ['bubblegum'] };
  var DEFAULT_THEME_BY_STYLE = { modern: 'signature', kawaii: 'bubblegum' };

  function applyStyle(style){
    if(style!=='kawaii') style = 'modern';
    if(style==='kawaii'){
      document.documentElement.setAttribute('data-style', 'kawaii');
    } else {
      document.documentElement.removeAttribute('data-style');
    }
    document.querySelectorAll('#styleSwitch button').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-style-choice')===style);
    });
    // Nur die zum Style passenden Farboptionen anzeigen
    document.querySelectorAll('#themeSwitch button').forEach(function(b){
      b.style.display = b.getAttribute('data-theme-style')===style ? '' : 'none';
    });
    // Falls die aktuell gewählte Farbe zum neuen Style nicht passt, auf die
    // Standardfarbe dieses Styles wechseln.
    var currentTheme = localStorage.getItem(THEME_KEY) || 'signature';
    if(VALID_THEMES_BY_STYLE[style].indexOf(currentTheme)===-1){
      currentTheme = DEFAULT_THEME_BY_STYLE[style];
      localStorage.setItem(THEME_KEY, currentTheme);
    }
    applyTheme(currentTheme);
  }
  function applyTheme(theme){
    if(theme==='lilac' || theme==='bubblegum' || theme==='forest'){
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
      theme = 'signature';
    }
    document.querySelectorAll('#themeSwitch button').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-theme-choice')===theme);
    });
  }
  document.querySelectorAll('#styleSwitch button').forEach(function(b){
    b.addEventListener('click', function(){
      var style = b.getAttribute('data-style-choice');
      localStorage.setItem(STYLE_KEY, style);
      applyStyle(style);
    });
  });
  document.querySelectorAll('#themeSwitch button').forEach(function(b){
    b.addEventListener('click', function(){
      var theme = b.getAttribute('data-theme-choice');
      localStorage.setItem(THEME_KEY, theme);
      applyTheme(theme);
    });
  });
  applyStyle(localStorage.getItem(STYLE_KEY) || 'modern');

  /* ---- Nutzerverwaltung: Grundlagen ---- */
  var currentUserId = localStorage.getItem(CURRENT_USER_KEY) || null;
  var LAST_CODE_KEY = 'kontobuch-last-code';
  var LAST_NAME_KEY = 'kontobuch-last-name';
  var USER_COLORS = ['#A03A2C','#2E6B52','#A8813F','#5C6B8C','#7A4E8C','#3F7A6B','#B0562F','#6E5C9E','#8C4E6B','#4E7A3F'];
  var USER_COLORS_PASTEL = ['#E8A79C','#A8D5BE','#E8CFA0','#AEC0DB','#CDB8DC','#A8D4CB','#F0C4A8','#C6C0E8','#DCB8C8','#C9D4A8'];
  var photoTargetUserId = null;
  document.getElementById('userPhotoInput').addEventListener('change', function(e){
    var file = e.target.files[0];
    if(!file || !photoTargetUserId){ photoTargetUserId = null; return; }
    var targetId = photoTargetUserId;
    resizeImageFile(file, 128, 0.75).then(function(dataUrl){
      var user = state.users.find(function(x){ return x.id===targetId; });
      if(user){
        user.photo = dataUrl;
        saveState();
        renderUsers();
        renderCurrentScreen();
      }
    }).catch(function(){
      alert('Foto konnte nicht verarbeitet werden. Bitte ein anderes Bild versuchen.');
    }).finally(function(){
      photoTargetUserId = null;
      e.target.value = '';
    });
  });


  /* ---- Nutzerverwaltung: Benachrichtigungs-Präferenzen & Liste ---- */

  // Benachrichtigungs-Einstellungen: pro Nutzer eigene Präferenzen, im
  // gemeinsamen state gespeichert (damit die Edge Function serverseitig
  // beim Versenden nachschauen kann, wer was möchte).
  function getNotificationPrefs(userId){
    if(!state.notificationPrefs) state.notificationPrefs = {};
    if(!state.notificationPrefs[userId]){
      state.notificationPrefs[userId] = { assignedEvent:true, assignedTodo:true, dailySummary:true };
    }
    return state.notificationPrefs[userId];
  }
  function loadNotificationPrefsUI(){
    var prefs = getNotificationPrefs(currentUserId);
    document.getElementById('notifyAssignedEventInput').checked = prefs.assignedEvent!==false;
    document.getElementById('notifyAssignedTodoInput').checked = prefs.assignedTodo!==false;
    document.getElementById('notifyDailySummaryInput').checked = prefs.dailySummary!==false;
  }
  document.getElementById('notifyAssignedEventInput').addEventListener('change', function(){
    getNotificationPrefs(currentUserId).assignedEvent = this.checked;
    saveState();
  });
  document.getElementById('notifyAssignedTodoInput').addEventListener('change', function(){
    getNotificationPrefs(currentUserId).assignedTodo = this.checked;
    saveState();
  });
  document.getElementById('notifyDailySummaryInput').addEventListener('change', function(){
    getNotificationPrefs(currentUserId).dailySummary = this.checked;
    saveState();
  });

  function renderUsers(){
    var el = document.getElementById('userList');
    if(!el) return;
    if(!state.users || state.users.length===0){
      el.innerHTML = '<p class="empty">Noch keine Nutzer angelegt.</p>';
    } else {
      el.innerHTML = state.users.map(function(u){
        var isMe = u.id===currentUserId;
        return '<div class="simple-row" style="align-items:center; flex-wrap:wrap; border-left:4px solid '+u.color+';">'+
          avatarHtml(u.id, 26)+
          '<div class="stext"><div class="stitle">'+escapeHtml(u.name)+'</div></div>'+
          (isMe ? '<button type="button" class="link-btn" data-photo="'+u.id+'" style="flex-shrink:0;">Foto</button>' : '')+
          (isMe && u.photo ? '<button type="button" class="link-btn" data-removephoto="'+u.id+'" style="flex-shrink:0;">Entfernen</button>' : '')+
          (isMe ? '<button type="button" class="link-btn" data-editcolor="'+u.id+'" style="flex-shrink:0;">Farbe</button>' : '')+
          '<button type="button" class="sdel" data-del="'+u.id+'">×</button>'+
          '<div class="color-palette-group" id="colorpick-'+u.id+'" style="display:none; width:100%;"></div>'+
        '</div>';
      }).join('');
      el.querySelectorAll('[data-photo]').forEach(function(b){
        b.addEventListener('click', function(){
          photoTargetUserId = b.getAttribute('data-photo');
          document.getElementById('userPhotoInput').click();
        });
      });
      el.querySelectorAll('[data-removephoto]').forEach(function(b){
        b.addEventListener('click', function(){
          var userId = b.getAttribute('data-removephoto');
          var user = state.users.find(function(x){ return x.id===userId; });
          if(user){
            delete user.photo;
            saveState();
            renderUsers();
            renderCurrentScreen();
          }
        });
      });
      el.querySelectorAll('[data-del]').forEach(function(b){
        b.addEventListener('click', function(){
          var id = b.getAttribute('data-del');
          var user = state.users.find(function(u){ return u.id===id; });
          var name = user ? user.name : 'diesen Nutzer';
          if(!confirm('"'+name+'" wirklich löschen? Bereits vorhandene Einträge behalten Farbe/Foto, verlieren aber die Zuordnung zum Namen.')) return;
          state.users = state.users.filter(function(u){ return u.id!==id; });
          if(currentUserId===id){ currentUserId=null; localStorage.removeItem(CURRENT_USER_KEY); }
          saveState();
          renderUsers();
        });
      });
      el.querySelectorAll('[data-editcolor]').forEach(function(b){
        b.addEventListener('click', function(){
          var userId = b.getAttribute('data-editcolor');
          var wrap = document.getElementById('colorpick-'+userId);
          var willOpen = wrap.style.display!=='block';
          el.querySelectorAll('.color-palette-group').forEach(function(p){ p.style.display='none'; });
          if(!willOpen) return;
          var user = state.users.find(function(x){ return x.id===userId; });
          renderColorPalette(wrap, user.color, function(color){
            user.color = color;
            saveState();
            renderUsers();
            renderCurrentScreen();
          });
          wrap.style.display = 'block';
        });
      });
    }
  }

  /* ================= Sidebar ================= */  document.querySelectorAll('[data-open-sidebar]').forEach(function(b){
    b.addEventListener('click', openSidebar);
  });
  document.getElementById('sidebarBackdrop').addEventListener('click', closeSidebar);
  document.querySelectorAll('.sidebar-item[data-module]').forEach(function(b){
    b.addEventListener('click', function(){
      var mod = b.getAttribute('data-module');
      closeSidebar();
      if(mod==='home') goHome(); else openModule(mod);
    });
  });
  function openSidebar(){
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarBackdrop').classList.add('open');
    updateSidebarActive();
  }
  function closeSidebar(){
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarBackdrop').classList.remove('open');
  }
  function updateSidebarActive(){
    document.querySelectorAll('.sidebar-item[data-module]').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-module')===currentScreen);
    });
  }

  /* ================= Navigation: Home <-> Module ================= */
  var currentScreen = 'home';
  document.querySelectorAll('.tile').forEach(function(t){
    t.addEventListener('click', function(){ openModule(t.getAttribute('data-module')); });
  });
  document.querySelectorAll('[data-back]').forEach(function(b){
    b.addEventListener('click', goHome);
  });
  function goHome(){
    document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
    document.getElementById('screen-home').classList.add('active');
    currentScreen = 'home';
    window.scrollTo(0, 0);
    updateSidebarActive();
    renderTodayOverview();
  }
  function openModule(name){
    document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
    document.getElementById('screen-'+name).classList.add('active');
    currentScreen = name;
    window.scrollTo(0, 0);
    updateSidebarActive();
    if(name==='finance') switchView('overview');
    if(name==='todos') renderTodos();
    if(name==='notes') renderNotesList();
    if(name==='calendar'){ document.getElementById('calDateInput').value = selectedDayStr; renderCalendar(); }
    if(name==='mealplan') renderMealPlan();
    if(name==='projects'){ closeProjectBoard(); renderProjectList(); }
    if(name==='settings'){
      renderUsers(); renderCategoryManage();
      var sbTx = state.transactions.find(function(t){ return t.isStartingBalance; });
      var sbVal = sbTx ? (sbTx.type==='expense' ? -sbTx.amount : sbTx.amount) : 0;
      document.getElementById('startingBalanceInput').value = sbVal || '';
      loadNotificationPrefsUI();
    }
  }
  function renderCurrentScreen(){
    renderAll();
    renderShopping();
    renderTodos();
    if(document.getElementById('noteEditView').style.display==='none') renderNotesList();
    renderCalendar();
    if(document.getElementById('recipeEditView').style.display==='none' && document.getElementById('recipeViewView').style.display==='none') renderMealPlan();
    renderUsers();
    renderCategoryManage();
    renderTodayOverview();
  }

  function todayIconSvg(type){
    if(type==='cal') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>';
    if(type==='todo') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l2 2 4-4"/><rect x="3.5" y="3.5" width="17" height="17" rx="3"/></svg>';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12h4l2 6 4-14 2 8h6"/></svg>';
  }

  function renderTodayOverview(){
    var el = document.getElementById('todayOverview');
    if(!el) return;
    if(!state){ el.innerHTML = '<p class="empty">Lädt…</p>'; return; }
    var todayStr = todayISO();
    var rows = [];

    if(typeof eventsForDate === 'function'){
      eventsForDate(todayStr).forEach(function(ev){
        var avatars = (ev.assignedTo||[]).map(function(uid_){ return avatarHtml(uid_); }).join('');
        var cat = (typeof calCategoryOf === 'function') ? calCategoryOf(ev) : null;
        var emojiPrefix = (ev.priority==='high'?'❗':'') + ((cat && cat.emoji) ? cat.emoji+' ' : '');
        rows.push(
          todayIconSvg('cal') + '<span>'+emojiPrefix+escapeHtml(ev.title)+(ev.time?' · '+ev.time+' Uhr':'')+'</span>' +
          (avatars ? '<div class="today-avatars">'+avatars+'</div>' : '')
        );
      });
    }

    state.todos.filter(function(t){ return t.dueDate===todayStr && !t.done; }).forEach(function(t){
      var avatars = (t.assignedTo||[]).map(function(uid_){ return avatarHtml(uid_); }).join('');
      rows.push(
        todayIconSvg('todo') + '<span>'+escapeHtml(t.text)+(t.dueTime?' · '+t.dueTime+' Uhr':'')+'</span>' +
        (avatars ? '<div class="today-avatars">'+avatars+'</div>' : '')
      );
    });

    state.transactions.filter(function(t){ return t.auto && t.date===todayStr; }).forEach(function(t){
      rows.push(
        todayIconSvg(t.type) + '<span>'+escapeHtml(t.category)+'</span>'+
        '<span class="tamt '+t.type+'">'+(t.type==='income'?'+':'−')+fmtEUR(t.amount)+'</span>'
      );
    });

    if(rows.length===0){
      el.innerHTML = '<p class="empty">Heute steht nichts an.</p>';
      return;
    }
    el.innerHTML = rows.map(function(r){ return '<div class="today-row">'+r+'</div>'; }).join('');
  }

  /* ================= Push-Benachrichtigungen ================= */
  function urlBase64ToUint8Array(base64String){
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for(var i=0; i<rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }


  async function enablePush(btn){
    try{
      if(!('serviceWorker' in navigator) || !('PushManager' in window)){
        alert('Push-Benachrichtigungen werden auf diesem Gerät/Browser nicht unterstützt.');
        return;
      }
      var permission = await Notification.requestPermission();
      if(permission !== 'granted'){
        alert('Ohne Erlaubnis kann ich dich leider nicht benachrichtigen.');
        return;
      }
      if(btn) btn.textContent = 'Aktiviere…';
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      await sb.from('push_subscriptions').upsert({
        code: householdCode,
        endpoint: sub.endpoint,
        subscription: sub.toJSON(),
        user_id: currentUserId
      }, { onConflict: 'endpoint' });
      updatePushBanner();
    } catch(e){
      console.error('Push-Anmeldung fehlgeschlagen', e);
      alert('Push-Anmeldung hat nicht geklappt. Bitte später erneut versuchen.');
      if(btn) btn.textContent = 'Benachrichtigungen aktivieren';
    }
  }
  document.getElementById('enablePushBtn').addEventListener('click', function(){ enablePush(this); });
  document.getElementById('enablePushBtnTodos').addEventListener('click', function(){ enablePush(this); });

  /* ================= Backup / Haushalt ================= */
  document.getElementById('retrySaveBtn').addEventListener('click', async function(){
    if(lastFailureWasLoad){
      await loadState();
      renderCurrentScreen();
    } else {
      saveState();
    }
  });

  document.getElementById('showBackup').addEventListener('click', function(){
    var panel = document.getElementById('backupPanel');
    panel.style.display = panel.style.display==='block' ? 'none' : 'block';
    if(panel.style.display==='block'){
      document.getElementById('backupOut').value = JSON.stringify(state);
    }
  });
  document.getElementById('copyBackupBtn').addEventListener('click', async function(){
    var ta = document.getElementById('backupOut');
    ta.select();
    var btn = document.getElementById('copyBackupBtn');
    try{
      await navigator.clipboard.writeText(ta.value);
      btn.textContent = 'Kopiert ✓';
    } catch(e){
      btn.textContent = 'Bitte manuell markieren & kopieren';
    }
    setTimeout(function(){ btn.textContent = 'In Zwischenablage kopieren'; }, 2200);
  });
  document.getElementById('restoreBackupBtn').addEventListener('click', function(){
    var raw = document.getElementById('backupIn').value.trim();
    if(!raw) return;
    try{
      var parsed = JSON.parse(raw);
      if(!parsed.transactions || !parsed.categories){ throw new Error('Ungültiges Format'); }
      state = parsed;
      applyDefaults();
      saveState();
      renderCurrentScreen();
      document.getElementById('backupIn').value = '';
      document.getElementById('restoreBackupBtn').textContent = 'Wiederhergestellt ✓';
      setTimeout(function(){ document.getElementById('restoreBackupBtn').textContent = 'Wiederherstellen (überschreibt aktuellen Stand)'; }, 2200);
    } catch(e){
      alert('Der eingefügte Text ist kein gültiger Sicherungs-Code.');
    }
  });

  document.getElementById('codeSubmitBtn').addEventListener('click', async function(){
    var val = document.getElementById('codeInput').value.trim();
    var nameVal = document.getElementById('nameGateInput').value.trim();
    var errEl = document.getElementById('codeError');
    if(!val || !nameVal){
      errEl.textContent = !val ? 'Bitte einen Code eingeben.' : 'Bitte deinen Namen eingeben.';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';
    var btn = document.getElementById('codeSubmitBtn');
    btn.textContent = 'Verbinde…';
    var rememberForNextTime = document.getElementById('rememberLoginInput').checked;
    householdCode = val.toLowerCase().trim().replace(/\s+/g,'-');
    localStorage.setItem(CODE_KEY, householdCode);
    if(rememberForNextTime){
      localStorage.setItem(LAST_CODE_KEY, householdCode);
      localStorage.setItem(LAST_NAME_KEY, nameVal);
    } else {
      localStorage.removeItem(LAST_CODE_KEY);
      localStorage.removeItem(LAST_NAME_KEY);
    }
    document.getElementById('codeGate').style.display = 'none';
    await startApp(nameVal);
  });
  document.getElementById('nameGateInput').addEventListener('keydown', function(e){
    if(e.key === 'Enter') document.getElementById('codeSubmitBtn').click();
  });

  function logoutHousehold(){
    if(confirm('Abmelden? Du wirst nach Haushalts-Code und Namen gefragt.')){
      localStorage.removeItem(CODE_KEY);
      localStorage.removeItem(CURRENT_USER_KEY);
      location.reload();
    }
  }
  document.getElementById('sidebarLogoutBtn').addEventListener('click', logoutHousehold);

  // Ordnet das aktuelle Gerät einem Profil zu: gibt es schon einen Nutzer
  // mit diesem Namen, wird dessen Profil übernommen, sonst wird ein neues
  // angelegt. Wird beim erstmaligen Anmelden aufgerufen (Name kommt vom
  // Code-Gate), sowie beim späteren "Person wechseln" in den Einstellungen.
  async function resolveIdentity(name){
    name = (name||'').trim();
    if(!name) return;
    var existing = state.users.find(function(u){ return u.name.trim().toLowerCase()===name.toLowerCase(); });
    if(existing){
      currentUserId = existing.id;
    } else {
      var newUser = { id: uid(), name: name, color: nextUserColor() };
      state.users.push(newUser);
      currentUserId = newUser.id;
      await saveState();
    }
    localStorage.setItem(CURRENT_USER_KEY, currentUserId);
  }


  async function startApp(nameForIdentity){
    document.getElementById('app').style.display = 'flex';
    await loadState();
    if(nameForIdentity){ await resolveIdentity(nameForIdentity); }
    await generateDueRecurring();
    setType('expense');
    renderCurrentScreen();
    window.scrollTo(0, 0);
    var startMonthText = MONTH_NAMES[viewingDate.getMonth()] + " " + viewingDate.getFullYear();
    document.getElementById('statsMonthNavLabel').textContent = startMonthText;
    document.getElementById('budgetMonthNavLabel').textContent = startMonthText;
    subscribeRealtime();
    startPolling();
  }


  /* ================= Init ================= */
  (async function init(){
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('service-worker.js').then(function(reg){
        reg.update(); // erzwingt bei jedem Start eine Prüfung auf eine neuere Version
      }).catch(function(e){
        console.error('Service Worker Registrierung fehlgeschlagen', e);
      });
    }
    var savedCode = localStorage.getItem(CODE_KEY);
    if(savedCode){
      householdCode = savedCode;
      await startApp();
    } else {
      var lastCode = localStorage.getItem(LAST_CODE_KEY);
      var lastName = localStorage.getItem(LAST_NAME_KEY);
      if(lastCode) document.getElementById('codeInput').value = lastCode;
      if(lastName) document.getElementById('nameGateInput').value = lastName;
      document.getElementById('codeGate').style.display = 'flex';
    }
  })();
