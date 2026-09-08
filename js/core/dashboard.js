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

  /* ---- Heute-Widget (unverändert aus app.js hierher verschoben) ---- */
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
    updateFloatingSwitchLabel();
    // Beim Wechsel zeigt der Floating Switch wieder seine volle Pillen-
    // Form (neuer Kontext, neue Scrollposition oben).
    setFloatingSwitchCompact(false);
  }

  function updateFloatingSwitchLabel(){
    var label = document.querySelector('#dashFloatingSwitch .dfs-label');
    if(!label) return;
    label.textContent = dashCurrentPage==='today' ? 'Mein Casalo' : 'Heute';
  }

  function setFloatingSwitchCompact(compact){
    var btn = document.getElementById('dashFloatingSwitch');
    if(btn) btn.classList.toggle('compact', !!compact);
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
      }
    }, { passive: false });

    pager.addEventListener('touchend', function(e){
      if(!tracking) return;
      tracking = false;
      pager.style.transition = '';
      if(!isHorizontal){ return; }
      var endX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : startX;
      var dx = endX - startX;
      var threshold = pager.offsetWidth * 0.18;
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

  /* ---- Floating Switch: Klick zum Wechseln ---- */
  function initFloatingSwitch(){
    var btn = document.getElementById('dashFloatingSwitch');
    if(!btn) return;
    btn.addEventListener('click', function(){
      setDashboardPage(dashCurrentPage==='today' ? 'modules' : 'today');
    });
  }

  /* ---- Floating Switch: Transformation zu rundem Button beim Scrollen ---- */
  function initFloatingSwitchScrollBehavior(){
    ['dashPageToday','dashPageModules'].forEach(function(id){
      var page = document.getElementById(id);
      if(!page) return;
      var lastY = 0;
      page.addEventListener('scroll', function(){
        var y = page.scrollTop;
        setFloatingSwitchCompact(y > 24);
        lastY = y;
      }, { passive: true });
    });
  }

  function initDashboard(){
    renderDashboardDate();
    initDashboardSwipe();
    initFloatingSwitch();
    initFloatingSwitchScrollBehavior();
    updateFloatingSwitchLabel();
  }
