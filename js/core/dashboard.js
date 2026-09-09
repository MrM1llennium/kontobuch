"use strict";
/* ============================================================
   CASALO — CORE: DASHBOARD
   Neu ab Redesign-Phase C. Enthält die Logik für die neue
   Zwei-Ansichten-Dashboard-Struktur (Heute ↔ Mein Casalo) aus der
   UI/UX-Spezifikation:
     - Horizontaler Swipe zwischen den beiden Ansichten
     - Floating Switch (alternative Navigation, zeigt das Ziel)
     - Transformation des Floating Switch beim vertikalen Scrollen
       (Pille -> runder Button)
     - Heute-Widget (aktuell noch die bisherige einfache Logik —
       die neue 4-Stufen-Prioritätslogik aus der Spezifikation folgt
       in Phase D)
   ============================================================ */

  /* ---- Heute-Widget ----
     Ab Redesign-Phase D: 4-stufige Prioritätslogik statt einer
     flachen Liste (Spezifikation Abschnitt 18–25). Reihenfolge trägt
     die Bedeutung, keine sichtbaren Abschnitts-Labels.

     Stufe 1 — zeitkritisch / hoch priorisiert:
       Kalendertermine mit ev.priority==='high', wichtige Finanz-
       ereignisse (heute automatisch gebuchte wiederkehrende Buchungen)
     Stufe 2 — braucht Aufmerksamkeit:
       überfällige To-Dos, heute fällige To-Dos, normale Kalendertermine
     Stufe 3 — Tageskontext:
       heutiger Essensplan, reduziert dargestellt
     Stufe 4 — Zusammenfassung untergeordneter Dinge:
       aktuell: offene Einkaufslisten-Artikel als eine Zeile.
       Bewusst KEINE feste Maximalanzahl, die Wichtiges verstecken
       könnte — Stufe 1–3 zeigen immer alles Relevante einzeln,
       Stufe 4 fasst nur zusammen, was ohnehin nicht zeitgebunden ist. */
  function todayIconSvg(type){
    if(type==='cal') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>';
    if(type==='todo') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l2 2 4-4"/><rect x="3.5" y="3.5" width="17" height="17" rx="3"/></svg>';
    if(type==='meal') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 3v7M4 3v4a3 3 0 0 0 6 0V3M7 10v11M15 13c0-4 2-8 4-9v17M15 13a4 2 0 0 0 4 2"/></svg>';
    if(type==='shopping') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6h15l-2 9H8L6 6Zm0 0-1-3H2"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12h4l2 6 4-14 2 8h6"/></svg>';
  }

  function renderTodayOverview(){
    var el = document.getElementById('todayOverview');
    if(!el) return;
    if(!state){ el.innerHTML = '<p class="empty">Lädt…</p>'; return; }
    var todayStr = todayISO();

    var tier1 = [], tier2 = [], tier3 = [];

    /* ---- Kalendertermine heute: hoch priorisiert -> Stufe 1, sonst Stufe 2 ---- */
    var todaysEvents = (typeof eventsForDate === 'function') ? eventsForDate(todayStr) : [];
    todaysEvents = todaysEvents.slice().sort(function(a,b){ return (a.time||'').localeCompare(b.time||''); });
    todaysEvents.forEach(function(ev){
      var avatars = (ev.assignedTo||[]).map(function(uid_){ return avatarHtml(uid_); }).join('');
      var cat = (typeof calCategoryOf === 'function') ? calCategoryOf(ev) : null;
      var emojiPrefix = (ev.priority==='high'?'❗':'') + ((cat && cat.emoji) ? cat.emoji+' ' : '');
      var rowHtml = '<div class="today-row" data-todaycal="'+ev.id+'">' +
        todayIconSvg('cal') + '<span>'+emojiPrefix+escapeHtml(ev.title)+(ev.time?' · '+ev.time+' Uhr':'')+'</span>' +
        (avatars ? '<div class="today-avatars">'+avatars+'</div>' : '') +
      '</div>';
      (ev.priority==='high' ? tier1 : tier2).push(rowHtml);
    });

    /* ---- Heute automatisch gebuchte wiederkehrende Buchungen -> Stufe 1 ---- */
    state.transactions.filter(function(t){ return t.auto && t.date===todayStr; }).forEach(function(t){
      tier1.push(
        '<div class="today-row">' +
        todayIconSvg(t.type) + '<span>'+escapeHtml(t.category)+'</span>'+
        '<span class="tamt '+t.type+'">'+(t.type==='income'?'+':'−')+fmtEUR(t.amount)+'</span>' +
        '</div>'
      );
    });

    /* ---- To-Dos: überfällig zuerst, dann heute fällig -> Stufe 2 ---- */
    var overdueTodos = state.todos.filter(function(t){ return !t.done && t.dueDate && t.dueDate < todayStr; })
      .sort(function(a,b){ return a.dueDate.localeCompare(b.dueDate); });
    var dueTodayTodos = state.todos.filter(function(t){ return !t.done && t.dueDate === todayStr; })
      .sort(function(a,b){ return (a.dueTime||'').localeCompare(b.dueTime||''); });
    overdueTodos.forEach(function(t){
      var avatars = (t.assignedTo||[]).map(function(uid_){ return avatarHtml(uid_); }).join('');
      tier2.push(
        '<div class="today-row" data-todaytodo="'+t.id+'">' +
        todayIconSvg('todo') + '<span>'+escapeHtml(t.text)+' · überfällig</span>' +
        (avatars ? '<div class="today-avatars">'+avatars+'</div>' : '') +
        '</div>'
      );
    });
    dueTodayTodos.forEach(function(t){
      var avatars = (t.assignedTo||[]).map(function(uid_){ return avatarHtml(uid_); }).join('');
      tier2.push(
        '<div class="today-row" data-todaytodo="'+t.id+'">' +
        todayIconSvg('todo') + '<span>'+escapeHtml(t.text)+(t.dueTime?' · '+t.dueTime+' Uhr':'')+'</span>' +
        (avatars ? '<div class="today-avatars">'+avatars+'</div>' : '') +
        '</div>'
      );
    });

    /* ---- Essensplan heute, reduziert -> Stufe 3 ----
       Hinweis: Die App unterscheidet aktuell nicht zwischen "Mittag"/
       "Abend" (kein Zeitslot-Feld im Essensplan-Datenmodell) — deshalb
       hier bewusst ohne erfundenes Label, nur der/die Namen. */
    var todaysMeals = (state.mealPlan||[]).filter(function(m){ return m.date===todayStr; });
    if(todaysMeals.length>0){
      tier3.push(
        '<div class="today-row">' +
        todayIconSvg('meal') + '<span>'+escapeHtml(todaysMeals.map(function(m){ return m.name; }).join(' · '))+'</span>' +
        '</div>'
      );
    }

    /* ---- Stufe 4: untergeordnete Zusammenfassung (aktuell: Einkaufsliste) ---- */
    var openShopping = (state.shopping||[]).filter(function(s){ return !s.checked; });
    var tier4Html = '';
    if(openShopping.length>0){
      tier4Html = '<div class="today-row today-row-summary" data-todayshopping="1">' +
        todayIconSvg('shopping') + '<span>'+openShopping.length+' Artikel auf der Einkaufsliste</span>' +
        '</div>';
    }

    var html = tier1.join('') + tier2.join('') + tier3.join('') + tier4Html;
    if(!html){
      el.innerHTML = '<p class="empty">Heute steht nichts an.</p>';
      return;
    }
    el.innerHTML = html;

    /* ---- Tap-Interaktion (Spezifikation Abschnitt 25) ---- */
    el.querySelectorAll('[data-todaycal]').forEach(function(row){
      row.addEventListener('click', function(){
        if(typeof openModule==='function') openModule('calendar');
        if(typeof selectedDayStr!=='undefined'){ selectedDayStr = todayISO(); }
        if(typeof renderCalendarMonth==='function') renderCalendarMonth();
      });
    });
    el.querySelectorAll('[data-todaytodo]').forEach(function(row){
      row.addEventListener('click', function(){
        if(typeof openModule==='function') openModule('todos');
        if(typeof openEditTodoModal==='function') openEditTodoModal(row.getAttribute('data-todaytodo'));
      });
    });
    el.querySelectorAll('[data-todayshopping]').forEach(function(row){
      row.addEventListener('click', function(){
        if(typeof openModule==='function') openModule('mealplan');
      });
    });
  }

  /* ---- Datum in der Heute-Kopfzeile ---- */
  function renderDashboardDate(){
    var el = document.getElementById('dashTodayDate');
    if(el) el.textContent = fmtDateLong(todayISO());
  }

  /* ============================================================
     Zwei-Ansichten-Pager: Heute <-> Mein Casalo
     Technik: ein doppelt so breiter Flex-Container, der per
     transform:translateX() zwischen den zwei halb so breiten Seiten
     hin- und herspringt. Jede Seite scrollt für sich selbst
     (unabhängig vom horizontalen Wechsel), der Wechsel selbst ist
     kein Scrollen, sondern eine einzige Positionsänderung — das hält
     vertikales Scrollen innerhalb einer Seite konfliktfrei zum
     horizontalen Wechsel (siehe Spezifikation Abschnitt 14).
     ============================================================ */
  var dashCurrentPage = 'today'; // 'today' | 'modules'

  function setDashboardPage(page, opts){
    var animate = !opts || opts.animate !== false;
    dashCurrentPage = page;
    var pager = document.getElementById('dashPager');
    if(pager){
      pager.style.transition = animate ? '' : 'none';
      pager.style.transform = page==='modules' ? 'translateX(-50%)' : 'translateX(0)';
      if(!animate){
        // Erzwingt sofortiges Anwenden ohne Übergang (z.B. beim
        // erneuten Öffnen des Dashboards), Transition-Regel danach
        // wieder freigeben für normale Wechsel.
        void pager.offsetHeight;
        pager.style.transition = '';
      }
    }
    var headerToday = document.getElementById('dashHeaderToday');
    var headerModules = document.getElementById('dashHeaderModules');
    if(headerToday && headerModules){
      headerToday.classList.toggle('active', page==='today');
      headerModules.classList.toggle('active', page==='modules');
    }
    updateSegmentActive(page);
    // Beim Wechsel zeigt das Segment wieder seine volle Form (neuer
    // Kontext, neue Scrollposition oben).
    setSegmentCompact(false);
  }

  /* ---- Segment-Control "Heute / Module": Bubble zeigt die aktuelle
     Position, nicht das Ziel — anders als der frühere Floating-Switch-
     Button mit wechselndem Text. ---- */
  function positionSegmentBubble(page, dragging){
    var bubble = document.getElementById('dashSegmentBubble');
    var btn = document.getElementById(page==='today' ? 'dashSegBtnToday' : 'dashSegBtnModules');
    if(!bubble || !btn) return;
    bubble.classList.toggle('dragging', !!dragging);
    bubble.style.left = btn.offsetLeft+'px';
    bubble.style.width = btn.offsetWidth+'px';
  }
  function positionSegmentBubbleBetween(t){
    // t: 0 = ganz bei "Heute", 1 = ganz bei "Module"
    var bubble = document.getElementById('dashSegmentBubble');
    var btnToday = document.getElementById('dashSegBtnToday');
    var btnModules = document.getElementById('dashSegBtnModules');
    if(!bubble || !btnToday || !btnModules) return;
    bubble.classList.add('dragging');
    bubble.style.left = (btnToday.offsetLeft + (btnModules.offsetLeft-btnToday.offsetLeft)*t)+'px';
    bubble.style.width = (btnToday.offsetWidth + (btnModules.offsetWidth-btnToday.offsetWidth)*t)+'px';
  }
  function updateSegmentActive(page){
    var btnToday = document.getElementById('dashSegBtnToday');
    var btnModules = document.getElementById('dashSegBtnModules');
    if(btnToday) btnToday.classList.toggle('active', page==='today');
    if(btnModules) btnModules.classList.toggle('active', page==='modules');
    positionSegmentBubble(page, false);
  }

  function setSegmentCompact(compact){
    var seg = document.getElementById('dashSegment');
    if(seg) seg.classList.toggle('compact', !!compact);
  }

  /* ---- Swipe-Erkennung (reines Touch-Handling, keine Bibliothek) ---- */
  function initDashboardSwipe(){
    var pager = document.getElementById('dashPager');
    if(!pager) return;
    var startX = 0, startY = 0, tracking = false, decided = false, isHorizontal = false;

    pager.addEventListener('touchstart', function(e){
      if(e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true; decided = false; isHorizontal = false;
    }, { passive: true });

    pager.addEventListener('touchmove', function(e){
      if(!tracking || e.touches.length !== 1) return;
      var dx = e.touches[0].clientX - startX;
      var dy = e.touches[0].clientY - startY;
      if(!decided){
        // Erst ab einer kleinen Mindestbewegung festlegen, ob es ein
        // horizontaler Swipe oder normales vertikales Scrollen ist —
        // verhindert, dass ein Scroll-Versuch fälschlich die Seite
        // wechselt.
        if(Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        isHorizontal = Math.abs(dx) > Math.abs(dy);
        decided = true;
      }
      if(isHorizontal){
        e.preventDefault();
        var base = dashCurrentPage==='modules' ? -50 : 0;
        var dxPercent = (dx / pager.offsetWidth) * 100;
        // Kein Herausziehen über den jeweils anderen Rand hinaus.
        var next = Math.max(-50, Math.min(0, base + dxPercent));
        pager.style.transition = 'none';
        pager.style.transform = 'translateX('+next+'%)';
        // Segment-Bubble live mitgleiten lassen, exakt proportional
        // zum Fortschritt der Geste — dieselbe Technik wie beim
        // Tab-Unterstrich.
        var progress = Math.max(0, Math.min(1, next / -50));
        positionSegmentBubbleBetween(progress);
      }
    }, { passive: false });

    pager.addEventListener('touchend', function(e){
      if(!tracking) return;
      tracking = false;
      pager.style.transition = '';
      if(!isHorizontal){ return; }
      var endX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : startX;
      var dx = endX - startX;
      // Schwelle bezieht sich auf die Breite EINER Ansicht (Pager ist
      // insgesamt 200% breit, also zwei Seiten) — konsistent zur
      // gleichen Korrektur bei den Tab-Leisten.
      var threshold = (pager.offsetWidth / 2) * 0.12;
      if(dx < -threshold && dashCurrentPage==='today'){
        setDashboardPage('modules');
      } else if(dx > threshold && dashCurrentPage==='modules'){
        setDashboardPage('today');
      } else {
        // Zu wenig bewegt — zur aktuellen Seite zurückschnappen.
        setDashboardPage(dashCurrentPage);
      }
    });
  }

  /* ---- Segment-Control: Klick auf "Heute" bzw. "Module" ---- */
  function initSegmentClicks(){
    document.querySelectorAll('.dash-segment-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var target = btn.getAttribute('data-target');
        if(target && target!==dashCurrentPage) setDashboardPage(target);
      });
    });
  }

  /* ---- Segment-Control: zu schmalem Streifen zusammenquetschen beim Scrollen ---- */
  function initSegmentScrollBehavior(){
    ['dashPageToday','dashPageModules'].forEach(function(id){
      var page = document.getElementById(id);
      if(!page) return;
      page.addEventListener('scroll', function(){
        setSegmentCompact(page.scrollTop > 24);
      }, { passive: true });
    });
  }

  function updateDashHeaderHeight(){
    var header = document.querySelector('#screen-home .dash-fixed-header');
    if(!header) return;
    document.documentElement.style.setProperty('--dash-header-h', header.offsetHeight+'px');
  }

  function initDashboard(){
    renderDashboardDate();
    initDashboardSwipe();
    initSegmentClicks();
    initSegmentScrollBehavior();
    updateSegmentActive(dashCurrentPage);
    updateDashHeaderHeight();
    window.addEventListener('resize', updateDashHeaderHeight);
  }
