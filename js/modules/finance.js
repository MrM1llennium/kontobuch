"use strict";
/* ============================================================
   CASALO — MODUL: FINANZEN
   1:1 ausgelagert aus der ursprünglichen index.html (Phase 2).
   Enthält auch Kategorien-Verwaltung (Einnahme-/Ausgabe-
   Kategorien sind ein Finanzen-Konzept, auch wenn sie im
   Original direkt neben dem Nutzer-Abschnitt standen).
   ============================================================ */

  document.getElementById('openStartingBalanceBtn').addEventListener('click', function(){
    document.getElementById('startingBalanceModal').style.display = 'flex';
  });
  document.getElementById('closeStartingBalanceBtn').addEventListener('click', function(){
    document.getElementById('startingBalanceModal').style.display = 'none';
  });
  document.getElementById('saveStartingBalanceBtn').addEventListener('click', function(){
    var val = parseFloat(document.getElementById('startingBalanceInput').value);
    if(isNaN(val)) val = 0;
    var existing = state.transactions.find(function(t){ return t.isStartingBalance; });
    if(existing){
      existing.amount = Math.round(Math.abs(val)*100)/100;
      existing.type = val<0 ? 'expense' : 'income';
    } else if(val !== 0){
      state.transactions.push({
        id: uid(), type: val<0 ? 'expense' : 'income',
        amount: Math.round(Math.abs(val)*100)/100, category: 'Startguthaben',
        date: todayISO(), note: 'Startguthaben', isStartingBalance: true,
        createdBy: currentUserId
      });
    }
    saveState();
    renderOverview();
    document.getElementById('startingBalanceModal').style.display = 'none';
  });
  document.getElementById('openCategoriesBtn').addEventListener('click', function(){
    renderCategoryManage();
    document.getElementById('categoriesModal').style.display = 'flex';
  });
  document.getElementById('closeCategoriesBtn').addEventListener('click', function(){
    document.getElementById('categoriesModal').style.display = 'none';
  });

  /* ================= Kategorien verwalten ================= */
  var catManageType = 'expense';
  document.getElementById('catTypeIncomeBtn').addEventListener('click', function(){ setCatManageType('income'); });
  document.getElementById('catTypeExpenseBtn').addEventListener('click', function(){ setCatManageType('expense'); });
  function setCatManageType(t){
    catManageType = t;
    document.getElementById('catTypeIncomeBtn').classList.toggle('active', t==='income');
    document.getElementById('catTypeExpenseBtn').classList.toggle('active', t==='expense');
    renderCategoryManage();
  }
  function renderCategoryManage(){
    var el = document.getElementById('categoryList');
    if(!el) return;
    var list = state.categories[catManageType];
    if(list.length===0){
      el.innerHTML = '<p class="empty">Keine Kategorien.</p>';
      return;
    }
    el.innerHTML = list.map(function(c){
      return '<div class="simple-row">'+
        '<div class="stext"><div class="stitle">'+escapeHtml(c)+'</div></div>'+
        '<button type="button" class="link-btn" data-rename="'+escapeHtml(c)+'" style="flex-shrink:0;">Umbenennen</button>'+
        '<button type="button" class="sdel" data-delcat="'+escapeHtml(c)+'">×</button>'+
      '</div>';
    }).join('');
    el.querySelectorAll('[data-rename]').forEach(function(b){
      b.addEventListener('click', function(){
        var oldName = b.getAttribute('data-rename');
        var newName = prompt('Neuer Name für "'+oldName+'":', oldName);
        if(newName===null) return;
        newName = newName.trim();
        if(!newName || newName===oldName) return;
        if(state.categories[catManageType].indexOf(newName)!==-1){
          alert('Diese Kategorie gibt es schon.');
          return;
        }
        renameCategory(catManageType, oldName, newName);
      });
    });
    el.querySelectorAll('[data-delcat]').forEach(function(b){
      b.addEventListener('click', function(){
        var name = b.getAttribute('data-delcat');
        if(confirm('Kategorie "'+name+'" löschen? Bereits gebuchte Einträge behalten den Namen, sie verschwindet nur aus der Auswahl für neue Buchungen.')){
          deleteCategory(catManageType, name);
        }
      });
    });
  }
  function renameCategory(type, oldName, newName){
    var idx = state.categories[type].indexOf(oldName);
    if(idx!==-1) state.categories[type][idx] = newName;
    state.transactions.forEach(function(t){ if(t.type===type && t.category===oldName) t.category = newName; });
    state.recurring.forEach(function(r){ if(r.type===type && r.category===oldName) r.category = newName; });
    if(type==='expense' && state.budgets[oldName]!=null){
      state.budgets[newName] = state.budgets[oldName];
      delete state.budgets[oldName];
    }
    saveState();
    renderCategoryManage();
    populateCategorySelect();
    populateEditRecCategorySelect();
    renderOverview();
    renderBudget();
    renderStats();
  }
  function deleteCategory(type, name){
    state.categories[type] = state.categories[type].filter(function(c){ return c!==name; });
    if(type==='expense' && state.budgets[name]!=null) delete state.budgets[name];
    saveState();
    renderCategoryManage();
    populateCategorySelect();
    populateEditRecCategorySelect();
    renderBudget();
  }
  document.getElementById('addCategoryBtn').addEventListener('click', function(){
    var input = document.getElementById('newCategoryName');
    var val = input.value.trim();
    if(!val) return;
    if(state.categories[catManageType].indexOf(val)!==-1){
      alert('Diese Kategorie gibt es schon.');
      return;
    }
    state.categories[catManageType].push(val);
    saveState();
    input.value = '';
    renderCategoryManage();
    populateCategorySelect();
    populateEditRecCategorySelect();
  });

  /* ================= Finance: Navigation ================= */
  document.querySelectorAll('#screen-finance .tabbar button').forEach(function(btn){
    btn.addEventListener('click', function(){
      switchView(btn.getAttribute('data-view'));
    });
  });
  var financeTabSwipe = null;
  function switchView(name){
    document.querySelectorAll('#screen-finance .view').forEach(function(v){ v.classList.remove('active'); });
    var targetView = document.getElementById('view-'+name);
    targetView.classList.add('active');
    targetView.scrollTop = 0;
    document.querySelectorAll('#screen-finance .tabbar button').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-view')===name);
    });
    if(financeTabSwipe) financeTabSwipe.goTo(name);
    if(name==='overview') renderOverview();
    if(name==='budget') renderBudget();
    if(name==='savings') renderSavings();
    if(name==='stats') renderStats();
  }
  financeTabSwipe = (typeof setupSwipeTabs==='function') ? setupSwipeTabs({
    pagerId: 'financeTabPager',
    tabbarId: 'financeTabbar',
    indicatorId: 'financeTabIndicator',
    tabOrder: ['overview','add','stats','budget','savings'],
    getActiveName: function(){
      var active = document.querySelector('#screen-finance .tabbar button.active');
      return active ? active.getAttribute('data-view') : 'overview';
    },
    onSwipeComplete: function(name){ switchView(name); }
  }) : null;

  document.getElementById('statsPrevMonth').addEventListener('click', function(){
    viewingDate.setMonth(viewingDate.getMonth()-1);
    renderAll();
  });
  document.getElementById('statsNextMonth').addEventListener('click', function(){
    viewingDate.setMonth(viewingDate.getMonth()+1);
    renderAll();
  });
  document.getElementById('budgetPrevMonth').addEventListener('click', function(){
    viewingDate.setMonth(viewingDate.getMonth()-1);
    renderAll();
  });
  document.getElementById('budgetNextMonth').addEventListener('click', function(){
    viewingDate.setMonth(viewingDate.getMonth()+1);
    renderAll();
  });

  function renderAll(){
    var monthText = MONTH_NAMES[viewingDate.getMonth()] + " " + viewingDate.getFullYear();
    document.getElementById('statsMonthNavLabel').textContent = monthText;
    document.getElementById('budgetMonthNavLabel').textContent = monthText;
    renderOverview();
    renderBudget();
    renderSavings();
    renderStats();
    populateCategorySelect();
  }

  /* ================= Wiederkehrende Buchungen ================= */
  // Prüft, ob eine wiederkehrende Regel an einem bestimmten Datum (String
  // "YYYY-MM-DD") überhaupt greifen soll — berücksichtigt optionales
  // Start-/Enddatum (Lebensdauer der Regel insgesamt) und eine optionale
  // Pause-Zeitspanne (vorübergehend ausgesetzt, läuft danach automatisch
  // wieder weiter). Kein Startdatum = ab jeher gültig, kein Enddatum =
  // unbegrenzt gültig.
  function recurringActiveOnDate(r, dateStr){
    if(r.startDate && dateStr < r.startDate) return false;
    if(r.endDate && dateStr > r.endDate) return false;
    if(r.pauseStart && r.pauseEnd && dateStr >= r.pauseStart && dateStr <= r.pauseEnd) return false;
    return true;
  }

  async function generateDueRecurring(){
    if(!state.recurring || state.recurring.length===0) return;
    var today = new Date();
    var y = today.getFullYear(), m = today.getMonth();
    var todayKey = monthKey(today);
    var todayDate = today.getDate();
    var daysInMonth = new Date(y, m+1, 0).getDate();
    var changed = false;
    state.recurring.forEach(function(r){
      if(!r.active) return;
      if(r.mode==='manual') return; // Manuell: nie automatisch buchen, nur auf Antippen
      var bookDay = Math.min(r.day, daysInMonth);
      if(todayDate < bookDay) return;
      var already = state.transactions.some(function(t){ return t.recurringId===r.id && dateToKey(t.date)===todayKey; });
      if(already) return;
      var dateStr = y+'-'+String(m+1).padStart(2,'0')+'-'+String(bookDay).padStart(2,'0');
      if(!recurringActiveOnDate(r, dateStr)) return;
      state.transactions.push({
        id: uid(), type: r.type, amount: r.amount, category: r.category,
        date: dateStr, note: r.name, recurringId: r.id, auto: true,
        belongsNextMonth: !!r.belongsNextMonth, account: 'konto'
      });
      changed = true;
    });
    if(changed) await saveState();
  }

  /* ================= Overview ================= */
  // Berücksichtigt das "Gehört zum nächsten Monat"-Häkchen: eine Buchung
  // zählt dann komplett für den Folgemonat (Statistik, Budget), unabhängig
  // vom tatsächlichen Buchungsdatum (z. B. Gehalt am 27.08. für September).
  // Wird nur noch von Budget/Statistik genutzt — die Übersicht selbst
  // kennt seit dem Umbau keine Monatszuordnung mehr.
  function effectiveMonthKey(t){
    if(t.belongsNextMonth){
      var d = new Date(t.date+'T00:00:00');
      d.setMonth(d.getMonth()+1);
      return monthKey(d);
    }
    return dateToKey(t.date);
  }

  function sumsForMonth(key, capDateStr){
    var inc=0, exp=0;
    state.transactions.forEach(function(t){
      if(t.type!=='income' && t.type!=='expense') return; // Transfers zählen nicht als Ein-/Ausgabe
      if(effectiveMonthKey(t)===key){
        if(capDateStr && t.date > capDateStr) return; // noch nicht fällig — nicht mitzählen
        if(t.type==='income') inc+=t.amount; else exp+=t.amount;
      }
    });
    return {inc:inc, exp:exp};
  }

  // Zwei getrennte, laufende Stände — Konto und Bargeld. Jede Buchung
  // gehört zu genau einem der beiden (Feld "account", Standard "konto"
  // bei altem Daten ohne dieses Feld). Verschiebungen (Abheben/Einzahlen)
  // sind ein eigener Typ "transfer" und verändern beide Stände gegenläufig,
  // ohne das Gesamtvermögen zu ändern.
  function kontoGuthaben(){
    var total = 0;
    state.transactions.forEach(function(t){
      if(t.type==='transfer'){
        if(t.direction==='toBar') total -= t.amount;
        else if(t.direction==='toKonto') total += t.amount;
        return;
      }
      var acc = t.account || 'konto';
      if(acc!=='konto') return;
      total += (t.type==='income' ? t.amount : -t.amount);
    });
    return total;
  }
  function barGuthaben(){
    var total = 0;
    state.transactions.forEach(function(t){
      if(t.type==='transfer'){
        if(t.direction==='toBar') total += t.amount;
        else if(t.direction==='toKonto') total -= t.amount;
        return;
      }
      var acc = t.account || 'konto';
      if(acc!=='bar') return;
      total += (t.type==='income' ? t.amount : -t.amount);
    });
    return total;
  }

  function renderOverview(){
    var kontoTotal = kontoGuthaben();
    var cumEl = document.getElementById('heroCumulative');
    cumEl.textContent = fmtEUR(kontoTotal);
    cumEl.className = 'balance num ' + (kontoTotal<0 ? 'neg':'pos');

    var cashTotal = barGuthaben();
    var cashEl = document.getElementById('heroCash');
    cashEl.textContent = fmtEUR(cashTotal);
    cashEl.style.color = cashTotal<0 ? 'var(--red)' : 'var(--ink)';

    populateTxCategoryFilter();
    renderLedgerList();
  }

  /* ---- Konto ↔ Bargeld verschieben ---- */
  var cashDirection = 'toBar';
  document.getElementById('openCashTransferBtn').addEventListener('click', function(){
    cashDirection = 'toBar';
    document.querySelectorAll('#cashDirectionSwitch button').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-direction')==='toBar');
    });
    document.getElementById('cashTransferAmount').value = '';
    document.getElementById('cashTransferModal').style.display = 'flex';
  });
  document.querySelectorAll('#cashDirectionSwitch button').forEach(function(b){
    b.addEventListener('click', function(){
      cashDirection = b.getAttribute('data-direction');
      document.querySelectorAll('#cashDirectionSwitch button').forEach(function(x){
        x.classList.toggle('active', x===b);
      });
    });
  });
  document.getElementById('cancelCashTransferBtn').addEventListener('click', function(){
    document.getElementById('cashTransferModal').style.display = 'none';
  });
  document.getElementById('saveCashTransferBtn').addEventListener('click', function(){
    var amount = parseFloat(document.getElementById('cashTransferAmount').value);
    if(!amount || amount<=0){
      document.getElementById('cashTransferAmount').focus();
      return;
    }
    state.transactions.push({
      id: uid(), type: 'transfer', direction: cashDirection,
      amount: Math.round(amount*100)/100, date: todayISO(), createdBy: currentUserId
    });
    saveState();
    document.getElementById('cashTransferModal').style.display = 'none';
    renderOverview();
  });

  function getAllCategoryNames(){
    var names = {};
    (state.categories.income||[]).forEach(function(c){ names[c]=1; });
    (state.categories.expense||[]).forEach(function(c){ names[c]=1; });
    state.transactions.forEach(function(t){ names[t.category]=1; });
    return Object.keys(names).sort(function(a,b){ return a.localeCompare(b,'de'); });
  }
  function populateTxCategoryFilter(){
    var sel = document.getElementById('txCategoryFilter');
    var current = sel.value;
    sel.innerHTML = '<option value="">Alle Kategorien</option>' +
      getAllCategoryNames().map(function(c){ return '<option value="'+escapeHtml(c)+'">'+escapeHtml(c)+'</option>'; }).join('');
    sel.value = current;
  }

  function ledgerRowHtml(t){
    var d = new Date(t.date);
    var dd = String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.';
    if(t.type==='transfer'){
      var label = t.direction==='toBar' ? '🏦→💵 Abheben' : '💵→🏦 Einzahlen';
      return '<div class="row"'+personTintStyle(t.createdBy)+'>'+
        '<div class="rdate num">'+dd+'</div>'+
        '<div class="rmeta"><div class="rcat">'+label+'</div></div>'+
        '<div class="ramt num" style="color:var(--ink-soft);">'+fmtEUR(t.amount)+'</div>'+
        avatarHtml(t.createdBy) +
        '<button class="redit" data-transferdel="'+t.id+'" aria-label="Löschen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/></svg></button>'+
      '</div>';
    }
    return '<div class="row"'+personTintStyle(t.createdBy)+'>'+
      '<div class="rdate num">'+dd+'</div>'+
      '<div class="rmeta"><div class="rcat">'+escapeHtml(t.category)+(t.account==='bar'?' <span style="font-size:10px;color:var(--brass-strong);">· Bargeld</span>':'')+(t.auto?' <span style="font-size:10px;color:var(--brass-strong);">· automatisch</span>':'')+(t.belongsNextMonth?' <span style="font-size:10px;color:var(--brass-strong);">· nächster Monat</span>':'')+'</div>'+
      (t.note ? '<div class="rnote">'+escapeHtml(t.note)+'</div>' : '')+'</div>'+
      '<div class="ramt num '+t.type+'">'+(t.type==='income'?'+':'−')+fmtEUR(t.amount)+'</div>'+
      avatarHtml(t.createdBy) +
      '<button class="redit" data-id="'+t.id+'" aria-label="Bearbeiten"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z"/></svg></button>'+
    '</div>';
  }
  // Merkt sich pro Monat, ob die Gruppe gerade auf- oder zugeklappt ist.
  // Der laufende Monat startet offen, alle anderen erstmal zu.
  var ledgerMonthOpen = {};
  function renderLedgerList(){
    var searchTerm = (document.getElementById('txSearchInput').value||'').trim().toLowerCase();
    var catFilter = document.getElementById('txCategoryFilter').value;
    var searching = searchTerm.length>0 || catFilter.length>0;

    // Reihenfolge innerhalb desselben Tages: zuletzt hinzugefügt zuerst.
    // (Datum allein reicht bei mehreren Buchungen am selben Tag nicht als
    // Sortierkriterium — der Array-Index verrät die tatsächliche Reihenfolge.)
    var indexById = {};
    state.transactions.forEach(function(t, i){ indexById[t.id] = i; });

    var list = state.transactions.filter(function(t){
      if(catFilter && t.category!==catFilter) return false;
      if(searchTerm){
        var hay = (t.category+' '+(t.note||'')).toLowerCase();
        if(hay.indexOf(searchTerm)===-1) return false;
      }
      return true;
    }).sort(function(a,b){
      var dc = b.date.localeCompare(a.date);
      if(dc !== 0) return dc;
      return indexById[b.id] - indexById[a.id];
    });

    var ledgerEl = document.getElementById('ledgerList');
    if(list.length===0){
      ledgerEl.innerHTML = searching
        ? '<div class="empty">Keine Buchungen gefunden.</div>'
        : '<div class="empty">Noch keine Buchungen. Tippe unten auf „Buchen".</div>';
      return;
    }

    // Nach Monat gruppieren — Label wird aus dem GLEICHEN Schlüssel abgeleitet
    // wie die Gruppierung selbst (berücksichtigt also "gehört zum nächsten
    // Monat" korrekt), damit nie zwei Gruppen mit gleichem Anzeigenamen
    // aber unterschiedlichem Schlüssel entstehen können.
    var groups = []; // [{key, label, items:[]}]
    var byKey = {};
    list.forEach(function(t){
      var k = effectiveMonthKey(t);
      if(!byKey[k]){
        var parts = k.split('-');
        var label = MONTH_NAMES[parseInt(parts[1],10)-1] + ' ' + parts[0];
        byKey[k] = { key:k, label:label, items:[] };
        groups.push(byKey[k]);
      }
      byKey[k].items.push(t);
    });
    groups.sort(function(a,b){ return b.key.localeCompare(a.key); });

    var todayKey = monthKey(new Date());
    var html = groups.map(function(g){
      if(!(g.key in ledgerMonthOpen)) ledgerMonthOpen[g.key] = (g.key===todayKey);
      var open = searching ? true : ledgerMonthOpen[g.key];
      return '<button type="button" class="settings-row" data-monthtoggle="'+g.key+'" style="font-weight:600;">'+
          g.label+' <span style="font-weight:400; color:var(--ink-soft);">('+g.items.length+')</span>'+
          '<span class="chev" style="transform:rotate('+(open?90:0)+'deg); transition:transform .15s;">›</span>'+
        '</button>'+
        '<div data-monthitems="'+g.key+'" style="display:'+(open?'block':'none')+';">'+
          g.items.map(ledgerRowHtml).join('') +
        '</div>';
    }).join('');
    ledgerEl.innerHTML = html;

    ledgerEl.querySelectorAll('[data-monthtoggle]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var k = btn.getAttribute('data-monthtoggle');
        ledgerMonthOpen[k] = !ledgerMonthOpen[k];
        renderLedgerList();
      });
    });
    ledgerEl.querySelectorAll('.redit').forEach(function(btn){
      btn.addEventListener('click', function(){
        var transferId = btn.getAttribute('data-transferdel');
        if(transferId){
          if(!confirm('Verschiebung wirklich löschen?')) return;
          state.transactions = state.transactions.filter(function(x){ return x.id!==transferId; });
          saveState();
          renderOverview();
          return;
        }
        openEditTxModal(btn.getAttribute('data-id'));
      });
    });
  }
  document.getElementById('txSearchInput').addEventListener('input', renderLedgerList);
  document.getElementById('txCategoryFilter').addEventListener('change', renderLedgerList);

  /* ---- Buchung bearbeiten ---- */
  var editingTxId = null;
  var editTxType = 'expense';
  var editTxAccount = 'konto';
  function setEditTxType(t){
    editTxType = t;
    document.querySelectorAll('#editTxTypeSwitch button').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-edit-type')===t);
    });
    var sel = document.getElementById('editTxCategory');
    var current = sel.value;
    sel.innerHTML = state.categories[t].map(function(c){ return '<option value="'+escapeHtml(c)+'">'+escapeHtml(c)+'</option>'; }).join('');
    if(state.categories[t].indexOf(current)!==-1) sel.value = current;
  }
  document.querySelectorAll('#editTxTypeSwitch button').forEach(function(b){
    b.addEventListener('click', function(){ setEditTxType(b.getAttribute('data-edit-type')); });
  });
  document.querySelectorAll('#editTxAccountSwitch button').forEach(function(b){
    b.addEventListener('click', function(){
      editTxAccount = b.getAttribute('data-account');
      document.querySelectorAll('#editTxAccountSwitch button').forEach(function(x){
        x.classList.toggle('active', x===b);
      });
    });
  });
  function openEditTxModal(id){
    var t = state.transactions.find(function(x){ return x.id===id; });
    if(!t) return;
    editingTxId = id;
    setEditTxType(t.type);
    document.getElementById('editTxCategory').value = t.category;
    document.getElementById('editTxAmount').value = t.amount;
    document.getElementById('editTxDate').value = t.date;
    document.getElementById('editTxNote').value = t.note || '';
    document.getElementById('editTxBelongsNext').checked = !!t.belongsNextMonth;
    document.getElementById('editTxAutoNote').style.display = t.auto ? 'block' : 'none';
    editTxAccount = t.account || 'konto';
    document.querySelectorAll('#editTxAccountSwitch button').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-account')===editTxAccount);
    });
    document.getElementById('editTxModal').style.display = 'flex';
  }
  document.getElementById('cancelEditTxBtn').addEventListener('click', function(){
    document.getElementById('editTxModal').style.display = 'none';
    editingTxId = null;
  });
  document.getElementById('saveEditTxBtn').addEventListener('click', function(){
    if(!editingTxId) return;
    var t = state.transactions.find(function(x){ return x.id===editingTxId; });
    if(!t) return;
    var amount = parseFloat(document.getElementById('editTxAmount').value);
    if(!amount || amount<=0){ alert('Bitte einen gültigen Betrag eingeben.'); return; }
    var date = document.getElementById('editTxDate').value;
    if(!date){ alert('Bitte ein Datum wählen.'); return; }
    t.type = editTxType;
    t.category = document.getElementById('editTxCategory').value;
    t.amount = Math.round(amount*100)/100;
    t.date = date;
    t.note = document.getElementById('editTxNote').value.trim();
    t.belongsNextMonth = document.getElementById('editTxBelongsNext').checked;
    t.account = editTxAccount;
    saveState();
    document.getElementById('editTxModal').style.display = 'none';
    editingTxId = null;
    renderOverview();
    renderBudget();
  });
  document.getElementById('deleteEditTxBtn').addEventListener('click', function(){
    if(!editingTxId) return;
    var t = state.transactions.find(function(x){ return x.id===editingTxId; });
    if(t && t.auto){
      if(!confirm('Diese Buchung wurde automatisch durch eine wiederkehrende Regel erzeugt. Löschen entfernt nur diesen einen Eintrag — die Regel selbst bleibt bestehen und bucht künftig normal weiter. Trotzdem löschen?')) return;
    } else {
      if(!confirm('Diese Buchung wirklich löschen?')) return;
    }
    state.transactions = state.transactions.filter(function(x){ return x.id!==editingTxId; });
    saveState();
    document.getElementById('editTxModal').style.display = 'none';
    editingTxId = null;
    renderOverview();
    renderBudget();
  });


  /* ================= Add form (immer Einmalig, heutiges Datum) ================= */
  document.getElementById('typeIncomeBtn').addEventListener('click', function(){ setType('income'); });
  document.getElementById('typeExpenseBtn').addEventListener('click', function(){ setType('expense'); });
  function setType(t){
    currentType = t;
    document.getElementById('typeIncomeBtn').classList.toggle('active', t==='income');
    document.getElementById('typeExpenseBtn').classList.toggle('active', t==='expense');
    populateCategorySelect();
  }
  function populateCategorySelect(){
    var sel = document.getElementById('categorySelect');
    var list = state.categories[currentType];
    sel.innerHTML = list.map(function(c){ return '<option value="'+escapeHtml(c)+'">'+escapeHtml(c)+'</option>'; }).join('');
  }
  var currentAccount = 'konto';
  document.querySelectorAll('#accountSwitch button').forEach(function(b){
    b.addEventListener('click', function(){
      currentAccount = b.getAttribute('data-account');
      document.querySelectorAll('#accountSwitch button').forEach(function(x){
        x.classList.toggle('active', x===b);
      });
    });
  });

  /* ================= Fixkosten / Einnahmen (fortlaufende Buchungen) ================= */
  function fixedRowHtml(r){
    var pausedFully = r.active===false;
    var todayStr = todayISO();
    var inTempPause = !!(r.pauseStart && r.pauseEnd && todayStr>=r.pauseStart && todayStr<=r.pauseEnd);
    var visuallyPaused = pausedFully || inTempPause;
    var mode = r.mode || 'auto';
    var rangeParts = [];
    if(r.startDate) rangeParts.push('ab '+fmtDate(r.startDate));
    if(r.endDate) rangeParts.push('bis '+fmtDate(r.endDate));
    if(r.pauseStart && r.pauseEnd) rangeParts.push('Pause '+fmtDate(r.pauseStart)+'–'+fmtDate(r.pauseEnd));
    var bookedToday = state.transactions.some(function(t){ return t.recurringId===r.id && t.date===todayStr; });
    return '<div class="rec-card'+(visuallyPaused?' paused':'')+'" data-editrec="'+r.id+'" style="flex-wrap:wrap;">'+
      '<div class="rec-info"><div class="rec-name">'+escapeHtml(r.name)+'</div>'+
      '<div class="rec-meta">'+escapeHtml(r.category)+' · jeden '+r.day+'.'+
      (rangeParts.length ? ' · '+rangeParts.join(', ') : '')+'</div>'+
      (pausedFully ? '<span class="pause-tag">Pausiert</span>' : (inTempPause ? '<span class="pause-tag">Pausiert bis '+fmtDate(r.pauseEnd)+'</span>' : ''))+
      '</div>'+
      '<div class="rec-amt '+r.type+'">'+(r.type==='income'?'+':'−')+fmtEUR(r.amount)+'</div>'+
      '<div style="width:100%; display:flex; align-items:center; gap:8px; margin-top:10px;" onclick="event.stopPropagation();">'+
        '<div class="mode-switch" style="flex:1; margin-bottom:0;">'+
          '<button type="button" data-recmodebtn="auto" data-recid="'+r.id+'" class="'+(mode==='auto'?'active':'')+'" style="padding:7px; font-size:12.5px;">Automatisch</button>'+
          '<button type="button" data-recmodebtn="manual" data-recid="'+r.id+'" class="'+(mode==='manual'?'active':'')+'" style="padding:7px; font-size:12.5px;">Manuell</button>'+
        '</div>'+
        (mode==='manual' && !visuallyPaused ? '<button type="button" data-booknow="'+r.id+'" class="btn" style="width:auto; padding:8px 12px; font-size:12.5px; flex-shrink:0;" '+(bookedToday?'disabled':'')+'>'+(bookedToday?'Heute schon gebucht':'Heute buchen')+'</button>' : '')+
      '</div>'+
    '</div>';
  }
  function renderFixedList(type, containerId){
    var el = document.getElementById(containerId);
    var list = (state.recurring||[]).filter(function(r){ return r.type===type; }).sort(function(a,b){ return a.day-b.day; });
    if(list.length===0){
      el.innerHTML = '<p class="empty">Noch nichts eingetragen.</p>';
      return;
    }
    el.innerHTML = list.map(fixedRowHtml).join('');
    el.querySelectorAll('[data-editrec]').forEach(function(card){
      card.addEventListener('click', function(){ openEditRecurring(card.getAttribute('data-editrec')); });
    });
    el.querySelectorAll('[data-recmodebtn]').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var r = state.recurring.find(function(x){ return x.id===btn.getAttribute('data-recid'); });
        if(!r) return;
        r.mode = btn.getAttribute('data-recmodebtn');
        saveState();
        renderFixedList(type, containerId);
      });
    });
    el.querySelectorAll('[data-booknow]').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        bookRecurringNow(btn.getAttribute('data-booknow'));
        renderFixedList(type, containerId);
      });
    });
  }
  function bookRecurringNow(id){
    var r = state.recurring.find(function(x){ return x.id===id; });
    if(!r) return;
    var todayStr = todayISO();
    var already = state.transactions.some(function(t){ return t.recurringId===r.id && t.date===todayStr; });
    if(already) return;
    state.transactions.push({
      id: uid(), type: r.type, amount: r.amount, category: r.category,
      date: todayStr, note: r.name, recurringId: r.id, auto: true, account: 'konto'
    });
    saveState();
    renderOverview();
    renderBudget();
  }
  document.getElementById('openFixedExpensesBtn').addEventListener('click', function(){
    renderFixedList('expense', 'fixedExpensesList');
    document.getElementById('fixedExpensesModal').style.display = 'flex';
  });
  document.getElementById('closeFixedExpensesBtn').addEventListener('click', function(){
    document.getElementById('fixedExpensesModal').style.display = 'none';
    renderOverview(); renderBudget();
  });
  document.getElementById('openFixedIncomeBtn').addEventListener('click', function(){
    renderFixedList('income', 'fixedIncomeList');
    document.getElementById('fixedIncomeModal').style.display = 'flex';
  });
  document.getElementById('closeFixedIncomeBtn').addEventListener('click', function(){
    document.getElementById('fixedIncomeModal').style.display = 'none';
    renderOverview(); renderBudget();
  });
  document.getElementById('addFixedExpenseBtn').addEventListener('click', function(){
    document.getElementById('fixedExpensesModal').style.display = 'none';
    openNewRecurring('expense');
  });
  document.getElementById('addFixedIncomeBtn').addEventListener('click', function(){
    document.getElementById('fixedIncomeModal').style.display = 'none';
    openNewRecurring('income');
  });

  var editingRecurringId = null;
  var editRecReturnModal = null;
  function closeEditRecurringAndReturn(){
    document.getElementById('editRecurringModal').style.display = 'none';
    if(editRecReturnModal){
      var type = editRecReturnModal==='fixedExpensesModal' ? 'expense' : 'income';
      var listId = editRecReturnModal==='fixedExpensesModal' ? 'fixedExpensesList' : 'fixedIncomeList';
      renderFixedList(type, listId);
      document.getElementById(editRecReturnModal).style.display = 'flex';
      editRecReturnModal = null;
    } else {
      renderOverview();
      renderBudget();
    }
  }
  var editRecCurrentType = 'expense';
  function populateEditRecCategorySelect(){
    var sel = document.getElementById('editRecCategory');
    sel.innerHTML = state.categories[editRecCurrentType].map(function(c){
      return '<option value="'+escapeHtml(c)+'">'+escapeHtml(c)+'</option>';
    }).join('');
  }
  function setEditRecMode(m){
    document.querySelectorAll('#editRecModeSwitch button').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-recmode')===m);
    });
    document.getElementById('editRecModeHint').textContent = m==='manual'
      ? 'Bucht erst, wenn ihr sie in der Übersicht antippt — mit dem Datum von heute.'
      : 'Wird jeden Monat am Tag unten automatisch gebucht.';
  }
  document.querySelectorAll('#editRecModeSwitch button').forEach(function(b){
    b.addEventListener('click', function(){ setEditRecMode(b.getAttribute('data-recmode')); });
  });
  function openNewRecurring(type){
    editRecReturnModal = null;
    editingRecurringId = null;
    editRecCurrentType = type;
    document.getElementById('editRecModalTitle').textContent = type==='income' ? 'Neue Einnahme' : 'Neue Fixkosten';
    document.getElementById('editRecName').value = '';
    document.getElementById('editRecAmount').value = '';
    populateEditRecCategorySelect();
    document.getElementById('editRecDay').value = '';
    document.getElementById('editRecStartDate').value = '';
    document.getElementById('editRecEndDate').value = '';
    document.getElementById('editRecDatesWrap').style.display = 'none';
    document.getElementById('editRecPauseStart').value = '';
    document.getElementById('editRecPauseEnd').value = '';
    document.getElementById('editRecPauseWrap').style.display = 'none';
    document.getElementById('editRecBelongsNextMonthInput').checked = false;
    document.getElementById('editRecActiveInput').checked = true;
    document.getElementById('editRecActiveWrap').style.display = 'none';
    document.getElementById('deleteEditRecurringBtn').style.display = 'none';
    setEditRecMode('auto');
    document.getElementById('editRecurringModal').style.display = 'flex';
  }
  function openEditRecurring(id){
    var r = state.recurring.find(function(x){ return x.id===id; });
    if(!r) return;
    // Statt sich über die noch offene Fixkosten-/Einnahmen-Liste zu
    // stapeln (unerwünschte Verschachtelung, Spezifikation Abschnitt
    // 33), wird die Liste geschlossen und beim Verlassen des Bearbeiten-
    // Formulars gezielt wieder geöffnet — klarer Weg hin und zurück.
    editRecReturnModal = r.type==='expense' ? 'fixedExpensesModal' : 'fixedIncomeModal';
    document.getElementById(editRecReturnModal).style.display = 'none';
    editingRecurringId = id;
    editRecCurrentType = r.type;
    document.getElementById('editRecModalTitle').textContent = 'Bearbeiten';
    document.getElementById('editRecName').value = r.name;
    document.getElementById('editRecAmount').value = r.amount;
    populateEditRecCategorySelect();
    document.getElementById('editRecCategory').value = r.category;
    document.getElementById('editRecDay').value = r.day;
    document.getElementById('editRecStartDate').value = r.startDate || '';
    document.getElementById('editRecEndDate').value = r.endDate || '';
    document.getElementById('editRecDatesWrap').style.display = (r.startDate || r.endDate) ? 'block' : 'none';
    document.getElementById('editRecPauseStart').value = r.pauseStart || '';
    document.getElementById('editRecPauseEnd').value = r.pauseEnd || '';
    document.getElementById('editRecPauseWrap').style.display = (r.pauseStart || r.pauseEnd) ? 'block' : 'none';
    document.getElementById('editRecBelongsNextMonthInput').checked = !!r.belongsNextMonth;
    document.getElementById('editRecActiveInput').checked = r.active!==false;
    document.getElementById('editRecActiveWrap').style.display = 'flex';
    document.getElementById('deleteEditRecurringBtn').style.display = 'block';
    setEditRecMode(r.mode || 'auto');
    document.getElementById('editRecurringModal').style.display = 'flex';
  }
  document.getElementById('toggleEditRecDatesBtn').addEventListener('click', function(){
    var el = document.getElementById('editRecDatesWrap');
    el.style.display = el.style.display==='block' ? 'none' : 'block';
  });
  document.getElementById('toggleEditRecPauseBtn').addEventListener('click', function(){
    var el = document.getElementById('editRecPauseWrap');
    el.style.display = el.style.display==='block' ? 'none' : 'block';
  });
  document.getElementById('cancelEditRecurringBtn').addEventListener('click', function(){
    editingRecurringId = null;
    closeEditRecurringAndReturn();
  });
  document.getElementById('saveEditRecurringBtn').addEventListener('click', async function(){
    var name = document.getElementById('editRecName').value.trim();
    var amount = parseFloat(document.getElementById('editRecAmount').value);
    var day = parseInt(document.getElementById('editRecDay').value, 10);
    var startDate = document.getElementById('editRecStartDate').value || null;
    var endDate = document.getElementById('editRecEndDate').value || null;
    var pauseStart = document.getElementById('editRecPauseStart').value || null;
    var pauseEnd = document.getElementById('editRecPauseEnd').value || null;
    var mode = document.querySelector('#editRecModeSwitch button.active').getAttribute('data-recmode');
    if(!name || !amount || amount<=0 || !day || day<1 || day>31){
      alert('Bitte Bezeichnung, Betrag und einen gültigen Tag (1–31) angeben.');
      return;
    }
    if(startDate && endDate && endDate < startDate){
      alert('Das Enddatum darf nicht vor dem Startdatum liegen.');
      return;
    }
    if((pauseStart && !pauseEnd) || (!pauseStart && pauseEnd)){
      alert('Bitte für die Pause beide Daten angeben (von und bis).');
      return;
    }
    if(pauseStart && pauseEnd && pauseEnd < pauseStart){
      alert('Das "Pausiert bis"-Datum darf nicht vor "Pausiert von" liegen.');
      return;
    }
    var r = editingRecurringId ? state.recurring.find(function(x){ return x.id===editingRecurringId; }) : null;
    if(!r){
      r = { id: uid(), active: true };
      state.recurring.push(r);
    }
    r.name = name;
    r.type = editRecCurrentType;
    r.amount = Math.round(amount*100)/100;
    r.category = document.getElementById('editRecCategory').value;
    r.day = day;
    r.startDate = startDate;
    r.endDate = endDate;
    r.pauseStart = pauseStart;
    r.pauseEnd = pauseEnd;
    r.mode = mode;
    r.belongsNextMonth = document.getElementById('editRecBelongsNextMonthInput').checked;
    if(editingRecurringId) r.active = document.getElementById('editRecActiveInput').checked;
    await generateDueRecurring();
    await saveState();
    editingRecurringId = null;
    closeEditRecurringAndReturn();
  });
  document.getElementById('deleteEditRecurringBtn').addEventListener('click', function(){
    if(!editingRecurringId) return;
    if(!confirm('Wiederkehrende Buchung wirklich endgültig löschen?')) return;
    state.recurring = state.recurring.filter(function(r){ return r.id!==editingRecurringId; });
    saveState();
    editingRecurringId = null;
    closeEditRecurringAndReturn();
  });

  document.getElementById('showNewCat').addEventListener('click', function(){
    document.getElementById('newCatRow').style.display = 'flex';
    document.getElementById('newCatInput').focus();
  });
  document.getElementById('addCatBtn').addEventListener('click', function(){
    var val = document.getElementById('newCatInput').value.trim();
    if(!val) return;
    if(state.categories[currentType].indexOf(val)===-1){
      state.categories[currentType].push(val);
      saveState();
    }
    populateCategorySelect();
    document.getElementById('categorySelect').value = val;
    document.getElementById('newCatInput').value = '';
    document.getElementById('newCatRow').style.display = 'none';
  });

  document.getElementById('saveEntryBtn').addEventListener('click', function(){
    var amount = parseFloat(document.getElementById('amountInput').value);
    if(!amount || amount<=0){
      document.getElementById('amountInput').focus();
      return;
    }
    var category = document.getElementById('categorySelect').value;
    var note = document.getElementById('noteInput').value.trim();
    state.transactions.push({
      id: uid(), type: currentType, amount: Math.round(amount*100)/100,
      category: category, date: todayISO(), note: note, createdBy: currentUserId,
      account: currentAccount
    });
    saveState();
    document.getElementById('amountInput').value = '';
    document.getElementById('noteInput').value = '';
    switchView('overview');
  });

  /* ================= Statistik ================= */
  function buildLineChartSVG(months, sums){
    var w = 400, h = 170, padL = 8, padR = 8, padT = 14, padB = 26;
    var maxVal = 1;
    sums.forEach(function(s){ maxVal = Math.max(maxVal, s.inc, s.exp); });
    var stepX = (w-padL-padR) / Math.max(months.length-1, 1);
    function xy(i, val){
      var x = padL + i*stepX;
      var y = padT + (1 - val/maxVal) * (h-padT-padB);
      return [x,y];
    }
    function pathFor(key){
      return sums.map(function(s,i){
        var p = xy(i, s[key]);
        return (i===0?'M':'L')+p[0].toFixed(1)+','+p[1].toFixed(1);
      }).join(' ');
    }
    var dots = sums.map(function(s,i){
      var pi = xy(i, s.inc), pe = xy(i, s.exp);
      return '<circle cx="'+pi[0].toFixed(1)+'" cy="'+pi[1].toFixed(1)+'" r="2.6" fill="#2E6B52"/>'+
             '<circle cx="'+pe[0].toFixed(1)+'" cy="'+pe[1].toFixed(1)+'" r="2.6" fill="#A03A2C"/>';
    }).join('');
    var labels = months.map(function(d,i){
      var p = xy(i,0);
      return '<text x="'+p[0].toFixed(1)+'" y="'+(h-8)+'" font-size="9.5" fill="#6B6B5E" text-anchor="middle" font-family="IBM Plex Mono, monospace">'+MONTH_NAMES[d.getMonth()].slice(0,3)+'</text>';
    }).join('');
    return '<svg viewBox="0 0 '+w+' '+h+'" style="width:100%; height:auto; display:block;">'+
      '<path d="'+pathFor('inc')+'" fill="none" stroke="#2E6B52" stroke-width="2"/>'+
      '<path d="'+pathFor('exp')+'" fill="none" stroke="#A03A2C" stroke-width="2"/>'+
      dots + labels +
      '</svg>'+
      '<div style="display:flex; gap:16px; margin-top:8px; font-size:11.5px; color:var(--ink-soft);">'+
        '<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#2E6B52;margin-right:5px;"></span>Einnahmen</span>'+
        '<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#A03A2C;margin-right:5px;"></span>Ausgaben</span>'+
      '</div>';
  }

  function renderStats(){
    var chartEl = document.getElementById('statsChart');
    if(!chartEl) return;
    document.getElementById('statsMonthLabel').textContent = MONTH_NAMES[viewingDate.getMonth()] + ' ' + viewingDate.getFullYear();

    var months = [];
    for(var i=5; i>=0; i--){
      var d = new Date(viewingDate);
      d.setMonth(d.getMonth()-i);
      months.push(d);
    }
    var sums = months.map(function(d){ return sumsForMonth(monthKey(d)); });
    chartEl.innerHTML = buildLineChartSVG(months, sums);

    var key = monthKey(viewingDate);
    var curSums = sumsForMonth(key);
    var maxIncExp = Math.max(curSums.inc, curSums.exp, 1);
    var incPct2 = curSums.inc/maxIncExp*100;
    var expPct2 = curSums.exp/maxIncExp*100;
    var totalsEl = document.getElementById('statsMonthlyTotals');
    totalsEl.innerHTML =
      '<div style="margin-bottom:12px;">'+
        '<div style="display:flex; justify-content:space-between; font-size:13.5px; margin-bottom:4px;"><span>Einnahmen</span><span class="num">'+fmtEUR(curSums.inc)+'</span></div>'+
        '<div class="bar-track"><div class="bar-fill income" style="width:'+incPct2+'%"></div></div>'+
      '</div>'+
      '<div style="margin-bottom:4px;">'+
        '<div style="display:flex; justify-content:space-between; font-size:13.5px; margin-bottom:4px;"><span>Ausgaben</span><span class="num">'+fmtEUR(curSums.exp)+'</span></div>'+
        '<div class="bar-track"><div class="bar-fill expense" style="width:'+expPct2+'%"></div></div>'+
      '</div>';

    var byCat = {};
    state.transactions.forEach(function(t){
      if(t.type==='expense' && effectiveMonthKey(t)===key){
        byCat[t.category] = (byCat[t.category]||0) + t.amount;
      }
    });
    var entries = Object.keys(byCat).map(function(c){ return {cat:c, amt:byCat[c]}; }).sort(function(a,b){ return b.amt-a.amt; });
    var maxAmt = entries.length ? entries[0].amt : 1;
    var listEl = document.getElementById('statsCategoryList');
    if(entries.length===0){
      listEl.innerHTML = '<p class="empty">Keine Ausgaben in diesem Monat.</p>';
    } else {
      listEl.innerHTML = entries.map(function(e){
        var pct = (e.amt/maxAmt*100);
        return '<div style="margin-bottom:12px;">'+
          '<div style="display:flex; justify-content:space-between; font-size:13.5px; margin-bottom:4px;"><span>'+escapeHtml(e.cat)+'</span><span class="num">'+fmtEUR(e.amt)+'</span></div>'+
          '<div class="bar-track"><div class="bar-fill expense" style="width:'+pct+'%"></div></div>'+
        '</div>';
      }).join('');
    }
  }

  /* ================= Budget ================= */
  // Automatisch berechnetes Gesamtbudget: wiederkehrende Einnahmen minus
  // wiederkehrende Ausgaben in ausgeblendeten (nicht budgetierten) Kategorien
  // — also grob "was an Fixkosten sowieso weggeht" schon rausgerechnet.
  function autoTotalBudget(){
    var incomeTotal = 0, excludedExpenseTotal = 0;
    (state.recurring||[]).forEach(function(r){
      if(!r.active) return;
      if(r.type==='income'){
        incomeTotal += r.amount;
      } else if((state.budgetExcludedCategories||[]).indexOf(r.category)!==-1){
        excludedExpenseTotal += r.amount;
      }
    });
    return incomeTotal - excludedExpenseTotal;
  }

  function renderBudget(){
    var key = monthKey(viewingDate);
    var spentByCat = {};
    state.transactions.forEach(function(t){
      if(t.type==='expense' && effectiveMonthKey(t)===key){
        spentByCat[t.category] = (spentByCat[t.category]||0) + t.amount;
      }
    });
    var excluded = state.budgetExcludedCategories || [];
    var cats = state.categories.expense.slice();
    Object.keys(spentByCat).forEach(function(c){ if(cats.indexOf(c)===-1) cats.push(c); });
    var visibleCats = cats.filter(function(c){ return excluded.indexOf(c)===-1; });

    // --- Gesamtbudget-Karte ---
    var totalBudget = state.budgetManualTotal!=null ? state.budgetManualTotal : autoTotalBudget();
    var totalAllocated = 0;
    visibleCats.forEach(function(c){ if(state.budgets[c]) totalAllocated += state.budgets[c]; });
    var diff = totalBudget - totalAllocated;
    var tbEl = document.getElementById('totalBudgetCard');
    tbEl.innerHTML =
      '<div class="total-budget-card">'+
        '<p class="tb-label">Gesamtbudget'+(state.budgetManualTotal!=null?' (manuell)':' (automatisch, wiederkehrende Einnahmen − ausgeblendete Fixkosten)')+'</p>'+
        '<p class="tb-amount">'+fmtEUR(totalBudget)+'</p>'+
        '<div class="tb-status '+(diff<0?'over':'ok')+'">'+
          (diff<0
            ? 'Budgets überschreiten Gesamtbudget um '+fmtEUR(Math.abs(diff))
            : 'Noch nicht verplant: '+fmtEUR(diff))+
        '</div>'+
        '<button type="button" class="tb-edit" id="toggleTotalBudgetEdit">'+(state.budgetManualTotal!=null?'Manuellen Wert entfernen (wieder automatisch)':'Manuell überschreiben')+'</button>'+
        '<div class="tb-edit-row" id="totalBudgetEditRow" style="display:none;">'+
          '<input type="number" inputmode="decimal" step="0.01" id="totalBudgetInput" placeholder="Gesamtbudget in €" value="'+(state.budgetManualTotal!=null?state.budgetManualTotal:'')+'">'+
          '<button type="button" id="saveTotalBudgetBtn">OK</button>'+
        '</div>'+
      '</div>';
    document.getElementById('toggleTotalBudgetEdit').addEventListener('click', function(){
      if(state.budgetManualTotal!=null){
        state.budgetManualTotal = null;
        saveState();
        renderBudget();
        return;
      }
      var row = document.getElementById('totalBudgetEditRow');
      row.style.display = row.style.display==='flex' ? 'none' : 'flex';
      if(row.style.display==='flex') document.getElementById('totalBudgetInput').focus();
    });
    var saveBtn = document.getElementById('saveTotalBudgetBtn');
    if(saveBtn){
      saveBtn.addEventListener('click', function(){
        var val = parseFloat(document.getElementById('totalBudgetInput').value);
        state.budgetManualTotal = isNaN(val) ? null : Math.round(val*100)/100;
        saveState();
        renderBudget();
      });
    }

    // --- Kategorie-Karten ---
    var el = document.getElementById('budgetList');
    el.innerHTML = visibleCats.map(function(cat){
      var spent = spentByCat[cat]||0;
      var limit = state.budgets[cat];
      var card = '<div class="budget-card" data-cat="'+escapeHtml(cat)+'">';
      card += '<div class="budget-head"><div class="bname">'+escapeHtml(cat)+'</div>';
      card += '<div class="bnums">'+fmtEUR(spent)+(limit!=null ? ' / '+fmtEUR(limit) : '')+'</div></div>';
      if(limit!=null && limit>0){
        var pct = Math.min(spent/limit*100, 100);
        var over = spent>limit;
        card += '<div class="budget-track"><div class="budget-fill'+(over?' over':'')+'" style="width:'+pct+'%"></div></div>';
        card += '<div class="budget-foot"><span class="bstatus">'+(over ? 'Budget überschritten' : Math.round(100-pct)+'% übrig')+'</span>';
        card += '<button class="set-limit-btn" data-cat="'+escapeHtml(cat)+'">ändern</button></div>';
      } else {
        card += '<div class="budget-foot"><span class="bstatus">Kein Budget festgelegt</span>';
        card += '<button class="set-limit-btn" data-cat="'+escapeHtml(cat)+'">festlegen</button></div>';
      }
      card += '<div class="edit-limit" style="display:none;"><input type="number" inputmode="decimal" step="0.01" min="0" placeholder="Limit in €" value="'+(limit!=null?limit:'')+'"><button type="button">OK</button></div>';
      card += '<button type="button" class="exclude-cat-btn" data-exclude="'+escapeHtml(cat)+'">Nicht budgetieren (ausblenden)</button>';
      card += '</div>';
      return card;
    }).join('') || '<p class="empty">Noch keine Ausgabenkategorien vorhanden.</p>';

    el.querySelectorAll('.set-limit-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var card = btn.closest('.budget-card');
        var editRow = card.querySelector('.edit-limit');
        editRow.style.display = editRow.style.display==='flex' ? 'none' : 'flex';
        if(editRow.style.display==='flex') editRow.querySelector('input').focus();
      });
    });
    el.querySelectorAll('.edit-limit button').forEach(function(btn){
      btn.addEventListener('click', function(){
        var card = btn.closest('.budget-card');
        var cat = card.getAttribute('data-cat');
        var val = parseFloat(card.querySelector('.edit-limit input').value);
        if(val>0){
          state.budgets[cat] = Math.round(val*100)/100;
        } else {
          delete state.budgets[cat];
        }
        saveState();
        renderBudget();
      });
    });
    el.querySelectorAll('[data-exclude]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var cat = btn.getAttribute('data-exclude');
        if(state.budgetExcludedCategories.indexOf(cat)===-1){
          state.budgetExcludedCategories.push(cat);
        }
        saveState();
        renderBudget();
      });
    });

    // --- Ausgeblendete Kategorien wieder einblendbar machen ---
    var exWrap = document.getElementById('excludedCatsWrap');
    var excludedInUse = excluded.filter(function(c){ return cats.indexOf(c)!==-1; });
    if(excludedInUse.length===0){
      exWrap.innerHTML = '';
    } else {
      exWrap.innerHTML = '<p class="section-title" style="padding:0 0 6px;">Ausgeblendet</p>'+
        excludedInUse.map(function(c){
          return '<button type="button" class="set-limit-btn" data-unexclude="'+escapeHtml(c)+'" style="margin:0 6px 6px 0;">'+escapeHtml(c)+' wieder einblenden</button>';
        }).join('');
      exWrap.querySelectorAll('[data-unexclude]').forEach(function(btn){
        btn.addEventListener('click', function(){
          var cat = btn.getAttribute('data-unexclude');
          state.budgetExcludedCategories = state.budgetExcludedCategories.filter(function(c){ return c!==cat; });
          saveState();
          renderBudget();
        });
      });
    }
  }

  /* ================= Savings ================= */
  function monthsUntil(deadlineStr){
    var today = new Date(); today.setHours(0,0,0,0);
    var deadline = new Date(deadlineStr+'T00:00:00');
    var months = (deadline.getFullYear()-today.getFullYear())*12 + (deadline.getMonth()-today.getMonth());
    if(deadline.getDate() < today.getDate()) months -= 1;
    return months;
  }

  function renderSavings(){
    var el = document.getElementById('goalList');
    if(state.savings.length===0){
      el.innerHTML = '<p class="empty">Noch keine Sparziele angelegt.</p>';
    } else {
      el.innerHTML = state.savings.map(function(g){
        var pct = g.target>0 ? Math.min(g.saved/g.target*100,100) : 0;
        var remaining = Math.max(g.target-g.saved, 0);
        var deadlineHtml = '';
        if(g.deadline){
          if(remaining<=0){
            deadlineHtml = '<div class="goal-deadline">Ziel erreicht 🎉</div>';
          } else {
            var m = monthsUntil(g.deadline);
            if(m<=0){
              deadlineHtml = '<div class="goal-deadline">Fällig bis '+fmtDate(g.deadline)+' — noch '+fmtEUR(remaining)+' nötig</div>';
            } else {
              var perMonth = remaining/m;
              deadlineHtml = '<div class="goal-deadline">Bis '+fmtDate(g.deadline)+' — ca. '+fmtEUR(perMonth)+' / Monat nötig</div>';
            }
          }
        }
        return '<div class="goal-card" data-id="'+g.id+'">'+
          '<div class="goal-head"><div class="gname">'+escapeHtml(g.name)+'</div><div class="goal-pct">'+Math.round(pct)+'%</div></div>'+
          '<div class="goal-nums">'+fmtEUR(g.saved)+' von '+fmtEUR(g.target)+'</div>'+
          deadlineHtml +
          '<div class="goal-track"><div class="goal-fill" style="width:'+pct+'%"></div></div>'+
          '<div class="goal-actions">'+
            '<button type="button" class="dep-toggle" data-mode="deposit">Einzahlen</button>'+
            '<button type="button" class="dep-toggle" data-mode="withdraw">Auszahlen</button>'+
            '<button type="button" class="goal-gear-btn goal-edit-btn" aria-label="Bearbeiten"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z"/></svg></button>'+
          '</div>'+
          '<div class="deposit-row" style="display:none;">'+
            '<input type="number" inputmode="decimal" step="0.01" min="0" placeholder="Betrag">'+
            '<button type="button" class="dep-confirm">OK</button>'+
          '</div>'+
        '</div>';
      }).join('');
    }
    el.querySelectorAll('.dep-toggle').forEach(function(btn){
      btn.addEventListener('click', function(){
        var card = btn.closest('.goal-card');
        var row = card.querySelector('.deposit-row');
        var mode = btn.getAttribute('data-mode');
        var alreadyOpenSameMode = row.style.display==='flex' && row.getAttribute('data-mode')===mode;
        card.querySelectorAll('.dep-toggle').forEach(function(b){ b.classList.remove('active'); });
        if(alreadyOpenSameMode){
          row.style.display = 'none';
          return;
        }
        btn.classList.add('active');
        row.setAttribute('data-mode', mode);
        row.classList.toggle('withdraw-mode', mode==='withdraw');
        row.querySelector('button.dep-confirm').textContent = mode==='withdraw' ? 'Auszahlen' : 'Einzahlen';
        row.style.display = 'flex';
        row.querySelector('input').value = '';
        row.querySelector('input').focus();
      });
    });
    el.querySelectorAll('.dep-confirm').forEach(function(btn){
      btn.addEventListener('click', function(){
        var card = btn.closest('.goal-card');
        var row = card.querySelector('.deposit-row');
        var id = card.getAttribute('data-id');
        var mode = row.getAttribute('data-mode') || 'deposit';
        var input = row.querySelector('input');
        var val = parseFloat(input.value);
        if(val>0){
          var goal = state.savings.find(function(g){ return g.id===id; });
          var delta = mode==='withdraw' ? -val : val;
          goal.saved = Math.max(0, Math.round((goal.saved+delta)*100)/100);
          saveState();
          renderSavings();
        }
      });
    });
    el.querySelectorAll('.goal-edit-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        openEditGoalModal(btn.closest('.goal-card').getAttribute('data-id'));
      });
    });
  }

  var editingGoalId = null;
  document.getElementById('newGoalBtn').addEventListener('click', function(){
    var form = document.getElementById('newGoalForm');
    var willOpen = form.style.display!=='block';
    if(willOpen){
      editingGoalId = null;
      document.getElementById('goalFormTitle').textContent = 'Neues Sparziel';
      document.getElementById('createGoalBtn').textContent = 'Anlegen';
      document.getElementById('deleteGoalBtn').style.display = 'none';
      document.getElementById('goalName').value = '';
      document.getElementById('goalTarget').value = '';
      document.getElementById('goalSaved').value = '';
      document.getElementById('goalDeadline').value = '';
    }
    form.style.display = willOpen ? 'block' : 'none';
  });
  function openEditGoalModal(id){
    var g = state.savings.find(function(x){ return x.id===id; });
    if(!g) return;
    editingGoalId = id;
    document.getElementById('goalFormTitle').textContent = 'Sparziel bearbeiten';
    document.getElementById('createGoalBtn').textContent = 'Speichern';
    document.getElementById('deleteGoalBtn').style.display = 'block';
    document.getElementById('goalName').value = g.name;
    document.getElementById('goalTarget').value = g.target;
    document.getElementById('goalSaved').value = g.saved;
    document.getElementById('goalDeadline').value = g.deadline || '';
    document.getElementById('newGoalForm').style.display = 'block';
    document.getElementById('newGoalForm').scrollIntoView({behavior:'smooth', block:'nearest'});
  }
  document.getElementById('deleteGoalBtn').addEventListener('click', function(){
    if(!editingGoalId) return;
    if(!confirm('Sparziel wirklich löschen?')) return;
    state.savings = state.savings.filter(function(g){ return g.id!==editingGoalId; });
    saveState();
    editingGoalId = null;
    document.getElementById('newGoalForm').style.display = 'none';
    renderSavings();
  });
  document.getElementById('cancelGoalBtn').addEventListener('click', function(){
    document.getElementById('newGoalForm').style.display = 'none';
    editingGoalId = null;
  });
  document.getElementById('createGoalBtn').addEventListener('click', function(){
    var name = document.getElementById('goalName').value.trim();
    var target = parseFloat(document.getElementById('goalTarget').value);
    var saved = parseFloat(document.getElementById('goalSaved').value) || 0;
    var deadline = document.getElementById('goalDeadline').value || null;
    if(!name || !target || target<=0) return;
    if(editingGoalId){
      var g = state.savings.find(function(x){ return x.id===editingGoalId; });
      if(g){
        g.name = name; g.target = Math.round(target*100)/100;
        g.saved = Math.round(saved*100)/100; g.deadline = deadline;
      }
      saveState();
      editingGoalId = null;
      document.getElementById('newGoalForm').style.display = 'none';
      renderSavings();
      return;
    }
    state.savings.push({ id: uid(), name: name, target: Math.round(target*100)/100, saved: Math.round(saved*100)/100, deadline: deadline });
    saveState();
    document.getElementById('goalName').value = '';
    document.getElementById('goalTarget').value = '';
    document.getElementById('goalSaved').value = '';
    document.getElementById('goalDeadline').value = '';
    document.getElementById('newGoalForm').style.display = 'none';
    renderSavings();
  });

