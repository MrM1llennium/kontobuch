"use strict";
/* ============================================================
   CASALO — MODUL: KALENDER
   1:1 ausgelagert aus der ursprünglichen index.html (Phase 2).
   ============================================================ */

  /* ================= Kalender ================= */
  var calViewDate = new Date(); calViewDate.setDate(1);
  var selectedDayStr = todayISO();

  function eventOccursOnDate(ev, dateObj, dateStr){
    var start = new Date(ev.date+'T00:00:00');
    if(dateObj < start) return false;
    if(!ev.repeat || ev.repeat==='none'){
      if(ev.endDate) return dateStr >= ev.date && dateStr <= ev.endDate;
      return ev.date === dateStr;
    }
    if(ev.repeat==='daily') return true;
    if(ev.repeat==='weekly') return dateObj.getDay()===start.getDay();
    if(ev.repeat==='monthly') return dateObj.getDate()===start.getDate();
    if(ev.repeat==='yearly') return dateObj.getDate()===start.getDate() && dateObj.getMonth()===start.getMonth();
    return false;
  }
  function eventsForDate(dateStr){
    var d = new Date(dateStr+'T00:00:00');
    return state.calendar.filter(function(ev){ return eventOccursOnDate(ev, d, dateStr); });
  }
  function repeatLabel(r){
    return { none:'', daily:'Täglich', weekly:'Wöchentlich', monthly:'Monatlich', yearly:'Jährlich' }[r] || '';
  }
  function offsetLabel(mins){
    if(!mins) return 'zum Zeitpunkt';
    if(mins < 60) return mins+' Min. vorher';
    if(mins < 1440) return Math.round(mins/60)+' Std. vorher';
    if(mins < 10080) return Math.round(mins/1440)+' Tag(e) vorher';
    return Math.round(mins/10080)+' Woche(n) vorher';
  }

  function renderCalendarMonth(){
    var year = calViewDate.getFullYear(), month = calViewDate.getMonth();
    document.getElementById('calMonthLabel').textContent = MONTH_NAMES[month] + ' ' + year;

    var firstOfMonth = new Date(year, month, 1);
    var startOffset = (firstOfMonth.getDay()+6) % 7; // Montag = 0
    var daysInMonth = new Date(year, month+1, 0).getDate();
    var prevMonthDays = new Date(year, month, 0).getDate();

    var cells = [];
    for(var i=0;i<startOffset;i++){
      cells.push({ dayNum: prevMonthDays - startOffset + 1 + i, outside:true, dateStr:null });
    }
    for(var d=1; d<=daysInMonth; d++){
      var dateStr = year+'-'+String(month+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
      cells.push({ dayNum:d, outside:false, dateStr:dateStr });
    }
    var remain = (7 - cells.length % 7) % 7;
    for(var j=1;j<=remain;j++){ cells.push({ dayNum:j, outside:true, dateStr:null }); }

    var todayStr = todayISO();
    document.getElementById('calGrid').innerHTML = cells.map(function(c){
      var cls = 'cal-cell';
      if(c.outside) cls += ' outside';
      if(c.dateStr===todayStr) cls += ' today';
      if(c.dateStr===selectedDayStr) cls += ' selected';
      var evs = c.dateStr ? eventsForDate(c.dateStr) : [];
      var dots = evs.slice(0,3).map(function(ev){
        var color = userColorOf(ev.createdBy);
        return '<span class="dot" style="'+(color?'background:'+color+';':'')+'"></span>';
      }).join('');
      return '<div class="'+cls+'" data-date="'+(c.dateStr||'')+'">'+c.dayNum+(dots?'<div class="dots">'+dots+'</div>':'')+'</div>';
    }).join('');

    document.querySelectorAll('.cal-cell').forEach(function(cell){
      cell.addEventListener('click', function(){
        var ds = cell.getAttribute('data-date');
        if(!ds) return;
        selectedDayStr = ds;
        document.getElementById('calDateInput').value = ds;
        renderCalendarMonth();
      });
    });
    renderDayPanel();
    updatePushBanner();
  }

  function renderDayPanel(){
    var el = document.getElementById('calDayPanel');
    var d = new Date(selectedDayStr+'T00:00:00');
    var label = d.getDate()+'. '+MONTH_NAMES[d.getMonth()]+' '+d.getFullYear();
    var evs = eventsForDate(selectedDayStr).sort(function(a,b){ return (a.time||'').localeCompare(b.time||''); });
    var html = '<p class="cal-day-heading">'+label+'</p>';
    if(evs.length===0){
      html += '<p class="empty">Keine Termine an diesem Tag.</p>';
    } else {
      html += evs.map(function(ev){
        return '<div class="cal-card"'+personTintStyle(ev.createdBy)+'>'+
          '<div class="cal-info">'+
          '<div class="ctitle">'+escapeHtml(ev.title)+'</div>'+
          (ev.time ? '<div class="ctime">'+ev.time+' Uhr</div>' : '')+
          (ev.endDate ? '<div class="ctime">'+fmtDate(ev.date)+' – '+fmtDate(ev.endDate)+'</div>' : '')+
          (ev.repeat && ev.repeat!=='none' ? '<div class="ctime">'+repeatLabel(ev.repeat)+'</div>' : '')+
          (ev.note ? '<div class="cnote">'+escapeHtml(ev.note)+'</div>' : '')+
          (ev.remind ? '<div class="cal-bell">🔔 Erinnerung '+offsetLabel(ev.remindOffset)+'</div>' : '')+
          '</div>'+
          avatarHtml(ev.createdBy) +
          '<button class="redit" data-id="'+ev.id+'" aria-label="Bearbeiten"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z"/></svg></button>'+
        '</div>';
      }).join('');
    }
    el.innerHTML = html;
    el.querySelectorAll('.redit').forEach(function(b){
      b.addEventListener('click', function(){ openEditCalModal(b.getAttribute('data-id')); });
    });
  }

  document.getElementById('calPrevMonth').addEventListener('click', function(){
    calViewDate.setMonth(calViewDate.getMonth()-1);
    renderCalendarMonth();
  });
  document.getElementById('calNextMonth').addEventListener('click', function(){
    calViewDate.setMonth(calViewDate.getMonth()+1);
    renderCalendarMonth();
  });
  document.getElementById('calRemindInput').addEventListener('change', function(){
    document.getElementById('calRemindOffsetWrap').style.display = this.checked ? 'block' : 'none';
  });
  function renderCalAssignList(selectedIds){
    var el = document.getElementById('calAssignList');
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
  document.getElementById('openCalAddBtn').addEventListener('click', function(){
    editingEventId = null;
    document.getElementById('calModalTitle').textContent = 'Neuer Termin';
    document.getElementById('addCalBtn').textContent = 'Termin hinzufügen';
    document.getElementById('deleteCalBtn').style.display = 'none';
    document.getElementById('calTitleInput').value = '';
    document.getElementById('calTimeInput').value = '';
    document.getElementById('calNoteInput').value = '';
    document.getElementById('calRemindInput').checked = false;
    document.getElementById('calRemindOffsetWrap').style.display = 'none';
    document.getElementById('calRepeatInput').value = 'none';
    document.getElementById('calDateInput').value = selectedDayStr;
    document.getElementById('calMultiDayInput').checked = false;
    document.getElementById('calEndDateWrap').style.display = 'none';
    document.getElementById('calEndDateInput').value = '';
    document.getElementById('calMultiDayWrap').style.display = 'flex';
    renderCalAssignList();
    document.getElementById('calAddModal').style.display = 'flex';
  });
  document.getElementById('cancelCalAddBtn').addEventListener('click', function(){
    document.getElementById('calAddModal').style.display = 'none';
  });
  document.getElementById('calMultiDayInput').addEventListener('change', function(){
    document.getElementById('calEndDateWrap').style.display = this.checked ? 'block' : 'none';
  });
  document.getElementById('calRepeatInput').addEventListener('change', function(){
    var isNone = this.value==='none';
    document.getElementById('calMultiDayWrap').style.display = isNone ? 'flex' : 'none';
    if(!isNone){
      document.getElementById('calMultiDayInput').checked = false;
      document.getElementById('calEndDateWrap').style.display = 'none';
    }
  });

  function renderCalendar(){
    if(!document.getElementById('calGrid')) return;
    renderCalendarMonth();
  }

  var editingEventId = null;
  function openEditCalModal(id){
    var ev = state.calendar.find(function(x){ return x.id===id; });
    if(!ev) return;
    editingEventId = id;
    document.getElementById('calModalTitle').textContent = 'Termin bearbeiten';
    document.getElementById('addCalBtn').textContent = 'Speichern';
    document.getElementById('deleteCalBtn').style.display = 'block';
    document.getElementById('calTitleInput').value = ev.title;
    document.getElementById('calDateInput').value = ev.date;
    document.getElementById('calTimeInput').value = ev.time || '';
    document.getElementById('calRepeatInput').value = ev.repeat || 'none';
    document.getElementById('calNoteInput').value = ev.note || '';
    document.getElementById('calRemindInput').checked = !!ev.remind;
    document.getElementById('calRemindOffsetWrap').style.display = ev.remind ? 'block' : 'none';
    document.getElementById('calRemindOffsetInput').value = ev.remindOffset || 1440;
    document.getElementById('calMultiDayWrap').style.display = (ev.repeat && ev.repeat!=='none') ? 'none' : 'flex';
    document.getElementById('calMultiDayInput').checked = !!ev.endDate;
    document.getElementById('calEndDateWrap').style.display = ev.endDate ? 'block' : 'none';
    document.getElementById('calEndDateInput').value = ev.endDate || '';
    renderCalAssignList(ev.assignedTo||[]);
    document.getElementById('calAddModal').style.display = 'flex';
  }
  document.getElementById('deleteCalBtn').addEventListener('click', function(){
    if(!editingEventId) return;
    var ev = state.calendar.find(function(x){ return x.id===editingEventId; });
    var msg = (ev && ev.repeat && ev.repeat!=='none') ? 'Diese Wiederholung komplett löschen?' : 'Termin löschen?';
    if(!confirm(msg)) return;
    state.calendar = state.calendar.filter(function(x){ return x.id!==editingEventId; });
    saveState();
    editingEventId = null;
    document.getElementById('calAddModal').style.display = 'none';
    renderCalendarMonth();
  });
  document.getElementById('addCalBtn').addEventListener('click', function(){
    var title = document.getElementById('calTitleInput').value.trim();
    var date = document.getElementById('calDateInput').value || selectedDayStr;
    var time = document.getElementById('calTimeInput').value;
    var note = document.getElementById('calNoteInput').value.trim();
    var repeat = document.getElementById('calRepeatInput').value;
    var remind = document.getElementById('calRemindInput').checked;
    var remindOffset = remind ? parseInt(document.getElementById('calRemindOffsetInput').value, 10) : 0;
    var assignedTo = Array.prototype.slice.call(document.querySelectorAll('#calAssignList input:checked')).map(function(cb){ return cb.value; });
    var isMultiDay = repeat==='none' && document.getElementById('calMultiDayInput').checked;
    var endDate = isMultiDay ? document.getElementById('calEndDateInput').value : null;
    if(!title || !date) return;
    if(isMultiDay && (!endDate || endDate < date)){
      alert('Bitte ein gültiges Enddatum wählen, das nicht vor dem Startdatum liegt.');
      return;
    }
    if(editingEventId){
      var ev = state.calendar.find(function(x){ return x.id===editingEventId; });
      if(ev){
        var oldAssignedEv = (ev.assignedTo||[]).slice().sort().join(',');
        var newAssignedEv = assignedTo.slice().sort().join(',');
        ev.title = title; ev.date = date; ev.time = time||null; ev.note = note;
        ev.repeat = repeat; ev.remind = remind; ev.remindOffset = remindOffset;
        ev.assignedTo = assignedTo; ev.endDate = endDate;
        if(newAssignedEv !== oldAssignedEv && assignedTo.length>0) ev.assignedAt = new Date().toISOString();
      }
    } else {
      state.calendar.push({
        id: uid(), title: title, date: date, time: time||null, note: note,
        repeat: repeat, remind: remind, remindOffset: remindOffset, assignedTo: assignedTo,
        assignedAt: assignedTo.length>0 ? new Date().toISOString() : null,
        endDate: endDate, createdBy: currentUserId
      });
    }
    saveState();
    editingEventId = null;
    document.getElementById('calTitleInput').value = '';
    document.getElementById('calTimeInput').value = '';
    document.getElementById('calNoteInput').value = '';
    document.getElementById('calRemindInput').checked = false;
    document.getElementById('calRemindOffsetWrap').style.display = 'none';
    document.getElementById('calRepeatInput').value = 'none';
    document.getElementById('calMultiDayInput').checked = false;
    document.getElementById('calEndDateWrap').style.display = 'none';
    selectedDayStr = date;
    document.getElementById('calAddModal').style.display = 'none';
    renderCalendarMonth();
  });

