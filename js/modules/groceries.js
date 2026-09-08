"use strict";
/* ============================================================
   CASALO — MODUL: LEBENSMITTEL
   1:1 ausgelagert aus der ursprünglichen index.html (Phase 2).
   Einkaufsliste/Vorratskammer + Essensplan/Rezepte — im
   Original zwei getrennte Abschnitte, hier zusammengeführt,
   da beide zum selben Modul gehören (per Analyse bereits
   bekannt: addToPantry()/findPantryMatch() verbinden beide).
   ============================================================ */

  /* ================= Einkaufsliste ================= */

  /* -- Mengen-Zusammenführung -- */
  function parseAmount(str){
    if(!str) return null;
    var s = str.trim().replace(',', '.');
    var m = s.match(/^(\d+(?:\.\d+)?)\s*(kg|g|l|ml|stück|stk|st|el|tl|prise|bund|dose|packung|pck)?$/i);
    if(!m) return null;
    var unit = m[2] ? m[2].toLowerCase() : null;
    if(unit==='stk' || unit==='st') unit = 'stück';
    if(unit==='pck') unit = 'packung';
    return { value: parseFloat(m[1]), unit: unit };
  }
  function baseUnitOf(unit){
    if(unit==='kg' || unit==='g') return 'g';
    if(unit==='l' || unit==='ml') return 'ml';
    return unit;
  }
  function toBaseValue(parsed){
    if(parsed.unit==='kg') return parsed.value*1000;
    if(parsed.unit==='l') return parsed.value*1000;
    return parsed.value;
  }
  function trimNum(n){
    return (Math.round(n*100)/100).toString();
  }
  function formatFromBase(value, baseU){
    if(baseU==='g'){
      return value>=1000 ? trimNum(value/1000)+'kg' : trimNum(value)+'g';
    }
    if(baseU==='ml'){
      return value>=1000 ? trimNum(value/1000)+'l' : trimNum(value)+'ml';
    }
    var UNIT_LABELS = { 'stück':'Stück', 'el':'EL', 'tl':'TL', 'prise':'Prise', 'bund':'Bund', 'dose':'Dose', 'packung':'Packung' };
    if(baseU) return trimNum(value)+' '+(UNIT_LABELS[baseU] || baseU);
    return trimNum(value);
  }
  function combineAmounts(a1, a2){
    var p1 = parseAmount(a1), p2 = parseAmount(a2);
    if(!p1 || !p2) return null;
    if(baseUnitOf(p1.unit) !== baseUnitOf(p2.unit)) return null;
    return formatFromBase(toBaseValue(p1)+toBaseValue(p2), baseUnitOf(p1.unit));
  }

  // Stichwort-basierte Kategorie-Erkennung für die Einkaufsliste.
  var GROCERY_CATEGORIES = [
    { name: 'Backwaren', keywords: ['brot','brötchen','toast','baguette','croissant','kuchen','semmel','brezel','vollkorn','knäckebrot','zwieback','waffel','muffin'] },
    { name: 'Drogerie & Haushalt', keywords: ['klopapier','toilettenpapier','seife','shampoo','zahnpasta','spülmittel','waschmittel','müllbeutel','küchenrolle','batterien','deo','duschgel','windeln','putzmittel','schwamm'] },
    { name: 'Fisch', keywords: ['fisch','lachs','thunfisch','garnele','shrimp','forelle','kabeljau','hering','matjes','scholle','muschel','krabbe','tintenfisch'] },
    { name: 'Fleisch', keywords: ['fleisch','wurst','hähnchen','hahn','huhn','pute','rind','schwein','hack','speck','schinken','salami','bacon','steak','wiener','bratwurst','leberwurst','mortadella','gulasch','filet','geflügel','ente','lamm','kotelett','döner','cevapcici','frikadelle','bulette'] },
    { name: 'Gemüse', keywords: ['tomate','gurke','salat','kartoffel','zwiebel','knoblauch','karotte','möhre','paprika','brokkoli','blumenkohl','spinat','pilz','champignon','avocado','zucchini','aubergine','lauch','porree','sellerie','rettich','radieschen','rosenkohl','kohl','kürbis','ingwer','kräuter','petersilie','schnittlauch','gemüse'] },
    { name: 'Getränke', keywords: ['wasser','saft','cola','limo','bier','wein','sekt','kaffee','tee','energy drink','smoothie','sprudel','apfelschorle'] },
    { name: 'Milchprodukte', keywords: ['milch','joghurt','käse','butter','sahne','quark','ei ','eier','frischkäse','mozzarella','parmesan','gouda','feta','schmand','kefir','buttermilch','mascarpone','ricotta','margarine'] },
    { name: 'Obst', keywords: ['apfel','äpfel','banane','birne','orange','zitrone','limette','traube','beere','erdbeere','himbeere','blaubeere','kiwi','mango','ananas','pfirsich','aprikose','pflaume','kirsche','melone','obst'] },
    { name: 'Snacks', keywords: ['schokolade','chips','keks','gummibär','bonbon','snack','riegel','popcorn','nüsse','erdnüsse','flips'] },
    { name: 'Teigwaren', keywords: ['nudel','pasta','spaghetti','penne','fusilli','tagliatelle','lasagne','gnocchi','ravioli','tortellini'] },
    { name: 'Tiefkühl', keywords: ['tiefkühl','tk ','pizza','eis','pommes','fischstäbchen','gefroren'] }
  ];
  function guessGroceryCategory(name){
    var n = (' '+name.toLowerCase()+' ');
    for(var i=0;i<GROCERY_CATEGORIES.length;i++){
      var kws = GROCERY_CATEGORIES[i].keywords;
      for(var j=0;j<kws.length;j++){
        if(n.indexOf(kws[j])!==-1) return GROCERY_CATEGORIES[i].name;
      }
    }
    return 'Sonstiges';
  }

  // Fügt eine Zutat/einen Artikel zur Einkaufsliste hinzu. Gibt es schon einen
  // offenen (nicht abgehakten) Eintrag mit demselben Namen, wird nicht doppelt
  // hinzugefügt — bei erkennbaren, kompatiblen Mengen werden diese addiert
  // (z. B. 500g + 500g -> 1kg), sonst als eigener Zusatzeintrag angelegt.
  function addToShoppingList(name, amount){
    name = (name||'').trim();
    if(!name) return;
    amount = (amount||'').trim() || null;
    var existing = state.shopping.find(function(it){
      return !it.checked && it.name.trim().toLowerCase()===name.toLowerCase();
    });
    if(existing){
      if(!existing.amount && !amount) return; // exakt gleicher, mengenloser Eintrag schon da
      if(existing.amount && amount){
        var combined = combineAmounts(existing.amount, amount);
        if(combined){ existing.amount = combined; return; }
        // unterschiedliche/inkompatible Einheiten -> als eigene Zeile ergänzen
      } else if(!existing.amount && amount){
        existing.amount = amount; return;
      } else if(existing.amount && !amount){
        return; // bestehender Eintrag hat schon eine Menge, nichts Neues dazu
      }
    }
    state.shopping.push({ id: uid(), name: name, amount: amount, category: guessGroceryCategory(name), checked: false, createdBy: currentUserId });
  }

  // Fügt einen Artikel zur Vorratskammer hinzu — gleiche Zusammenführungslogik
  // wie bei der Einkaufsliste (Mengen werden addiert, wenn möglich).
  function addToPantry(name, amount, category, expiry){
    name = (name||'').trim();
    if(!name) return;
    amount = (amount||'').trim() || null;
    var existing = state.pantry.find(function(p){ return p.name.trim().toLowerCase()===name.toLowerCase(); });
    if(existing){
      if(existing.amount && amount){
        var combined = combineAmounts(existing.amount, amount);
        if(combined){ existing.amount = combined; if(expiry) existing.expiry = expiry; return; }
        // inkompatible Einheiten -> als eigener Extra-Eintrag ergänzen
      } else if(!existing.amount && amount){
        existing.amount = amount; if(expiry) existing.expiry = expiry; return;
      } else {
        if(expiry) existing.expiry = expiry;
        return; // schon vorhanden, nichts Neues
      }
    }
    state.pantry.push({ id: uid(), name: name, amount: amount, category: category || guessGroceryCategory(name), expiry: expiry || null, createdBy: currentUserId });
  }
  // Lockere Übereinstimmung (Teilstring, ohne Groß-/Kleinschreibung) — findet
  // z. B. "Mehl" in der Vorratskammer auch, wenn die Zutat "Weizenmehl" heißt.
  function findPantryMatch(name){
    var n = (name||'').trim().toLowerCase();
    if(!n) return null;
    return (state.pantry||[]).find(function(p){
      var pn = p.name.trim().toLowerCase();
      return pn===n || pn.indexOf(n)!==-1 || n.indexOf(pn)!==-1;
    });
  }

  function pantryRowHtml(it){
    var label = (it.amount ? escapeHtml(it.amount)+' ' : '') + escapeHtml(it.name);
    var expiryTag = '';
    if(it.expiry){
      var daysLeft = Math.ceil((new Date(it.expiry+'T00:00:00') - new Date(todayISO()+'T00:00:00')) / 86400000);
      var expColor = daysLeft < 0 ? 'var(--red)' : (daysLeft <= 3 ? 'var(--brass-strong)' : 'var(--ink-soft)');
      var expText = daysLeft < 0 ? 'abgelaufen' : (daysLeft===0 ? 'läuft heute ab' : (daysLeft===1 ? 'läuft morgen ab' : 'noch '+daysLeft+' Tage'));
      expiryTag = '<div class="ssub" style="color:'+expColor+';">Haltbar bis '+fmtDate(it.expiry)+' · '+expText+'</div>';
    }
    return '<div class="simple-row"'+personTintStyle(it.createdBy)+'>'+
      '<div class="stext"><div class="stitle">'+label+'</div>'+expiryTag+'</div>'+
      '<button type="button" class="cat-badge" data-pantrycatedit="'+it.id+'">'+escapeHtml(it.category||'Sonstiges')+'</button>'+
      avatarHtml(it.createdBy) +
      '<button class="redit" data-pantryedit="'+it.id+'" aria-label="Bearbeiten"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z"/></svg></button>'+
    '</div>';
  }
  function renderPantry(){
    var el = document.getElementById('pantryList');
    if(!el) return;
    if(!state.pantry || state.pantry.length===0){
      el.innerHTML = '<p class="empty">Vorratskammer ist leer.</p>';
      return;
    }
    var groups = {};
    state.pantry.forEach(function(it){
      var cat = it.category || 'Sonstiges';
      if(!groups[cat]) groups[cat] = [];
      groups[cat].push(it);
    });
    Object.keys(groups).forEach(function(k){ groups[k].sort(function(a,b){ return a.name.localeCompare(b.name); }); });
    var catOrder = GROCERY_CATEGORIES.map(function(c){ return c.name; }).concat(['Sonstiges']);
    var html = '';
    var todayStr = todayISO();
    var soonExpiring = state.pantry.filter(function(it){ return it.expiry && it.expiry >= todayStr; })
      .filter(function(it){ return Math.ceil((new Date(it.expiry+'T00:00:00') - new Date(todayStr+'T00:00:00'))/86400000) <= 3; });
    var expired = state.pantry.filter(function(it){ return it.expiry && it.expiry < todayStr; });
    if(expired.length || soonExpiring.length){
      html += '<p class="section-title" style="padding:14px 20px 4px;">⏰ Bald ablaufend / abgelaufen</p>';
      html += expired.concat(soonExpiring).map(pantryRowHtml).join('');
    }
    catOrder.forEach(function(catName){
      if(!groups[catName] || groups[catName].length===0) return;
      html += '<p class="section-title" style="padding:14px 20px 4px;">'+catName+'</p>';
      html += groups[catName].map(pantryRowHtml).join('');
    });
    el.innerHTML = html;
    el.querySelectorAll('[data-pantryedit]').forEach(function(b){
      b.addEventListener('click', function(){ openEditPantryModal(b.getAttribute('data-pantryedit')); });
    });
    el.querySelectorAll('[data-pantrycatedit]').forEach(function(b){
      b.addEventListener('click', function(){ openCategoryEditModal(b.getAttribute('data-pantrycatedit'), 'pantry'); });
    });
  }
  var editingPantryId = null;
  document.getElementById('openPantryAddBtn').addEventListener('click', function(){
    editingPantryId = null;
    document.getElementById('pantryModalTitle').textContent = 'Zur Vorratskammer hinzufügen';
    document.getElementById('addPantryBtn').textContent = 'Hinzufügen';
    document.getElementById('deletePantryBtn').style.display = 'none';
    document.getElementById('pantryAmountInput').value = '';
    document.getElementById('pantryNameInput').value = '';
    document.getElementById('pantryExpiryInput').value = '';
    document.getElementById('pantryAddModal').style.display = 'flex';
  });
  function openEditPantryModal(id){
    var it = state.pantry.find(function(x){ return x.id===id; });
    if(!it) return;
    editingPantryId = id;
    document.getElementById('pantryModalTitle').textContent = 'Artikel bearbeiten';
    document.getElementById('addPantryBtn').textContent = 'Speichern';
    document.getElementById('deletePantryBtn').style.display = 'block';
    document.getElementById('pantryAmountInput').value = it.amount || '';
    document.getElementById('pantryNameInput').value = it.name;
    document.getElementById('pantryExpiryInput').value = it.expiry || '';
    document.getElementById('pantryAddModal').style.display = 'flex';
  }
  document.getElementById('deletePantryBtn').addEventListener('click', function(){
    if(!editingPantryId) return;
    state.pantry = state.pantry.filter(function(x){ return x.id!==editingPantryId; });
    saveState();
    editingPantryId = null;
    document.getElementById('pantryAddModal').style.display = 'none';
    renderPantry();
  });
  document.getElementById('cancelPantryAddBtn').addEventListener('click', function(){
    document.getElementById('pantryAddModal').style.display = 'none';
    editingPantryId = null;
  });
  document.getElementById('addPantryBtn').addEventListener('click', function(){
    var amount = document.getElementById('pantryAmountInput').value;
    var name = document.getElementById('pantryNameInput').value.trim();
    var expiry = document.getElementById('pantryExpiryInput').value || null;
    if(!name) return;
    if(editingPantryId){
      var it = state.pantry.find(function(x){ return x.id===editingPantryId; });
      if(it){
        it.name = name;
        it.amount = amount.trim() || null;
        it.category = guessGroceryCategory(name);
        it.expiry = expiry;
      }
      saveState();
      editingPantryId = null;
      document.getElementById('pantryAddModal').style.display = 'none';
      renderPantry();
      return;
    }
    addToPantry(name, amount, null, expiry);
    saveState();
    document.getElementById('pantryAddModal').style.display = 'none';
    renderPantry();
  });

  function shopRowHtml(it){
    var label = (it.amount ? escapeHtml(it.amount)+' ' : '') + escapeHtml(it.name);
    return '<div class="simple-row"'+personTintStyle(it.createdBy)+'>'+
      '<div class="check'+(it.checked?' done':'')+'" data-id="'+it.id+'">'+(it.checked?'✓':'')+'</div>'+
      '<div class="stext"><div class="stitle'+(it.checked?' done':'')+'">'+label+'</div></div>'+
      '<button type="button" class="cat-badge" data-catedit="'+it.id+'">'+escapeHtml(it.category||'Sonstiges')+'</button>'+
      avatarHtml(it.createdBy) +
      '<button class="redit" data-id="'+it.id+'" aria-label="Bearbeiten"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z"/></svg></button>'+
    '</div>';
  }

  var categoryEditTargetId = null;
  var categoryEditTargetList = 'shopping';
  function openCategoryEditModal(itemId, listName){
    categoryEditTargetId = itemId;
    categoryEditTargetList = listName || 'shopping';
    var collection = categoryEditTargetList==='pantry' ? state.pantry : state.shopping;
    var item = collection.find(function(x){ return x.id===itemId; });
    if(!item) return;
    var names = GROCERY_CATEGORIES.map(function(c){ return c.name; }).concat(['Sonstiges']);
    document.getElementById('categoryEditList').innerHTML = names.map(function(n){
      var isSel = (item.category||'Sonstiges')===n;
      return '<div class="simple-row cat-pick-row'+(isSel?' selected':'')+'" data-catchoice="'+escapeHtml(n)+'">'+
        '<div class="stext"><div class="stitle">'+escapeHtml(n)+'</div></div>'+
        (isSel ? '<span style="color:var(--brass-strong);">✓</span>' : '')+
      '</div>';
    }).join('');
    document.querySelectorAll('#categoryEditList [data-catchoice]').forEach(function(row){
      row.addEventListener('click', function(){
        var coll = categoryEditTargetList==='pantry' ? state.pantry : state.shopping;
        var it = coll.find(function(x){ return x.id===categoryEditTargetId; });
        if(it){
          it.category = row.getAttribute('data-catchoice');
          saveState();
          if(categoryEditTargetList==='pantry') renderPantry(); else renderShopping();
        }
        document.getElementById('categoryEditModal').style.display = 'none';
      });
    });
    document.getElementById('categoryEditModal').style.display = 'flex';
  }
  document.getElementById('cancelCategoryEditBtn').addEventListener('click', function(){
    document.getElementById('categoryEditModal').style.display = 'none';
  });

  function renderShopping(){
    var el = document.getElementById('shoppingList');
    if(!el) return;
    if(state.shopping.length===0){
      el.innerHTML = '<p class="empty">Die Liste ist leer.</p>';
      return;
    }
    var unchecked = state.shopping.filter(function(it){ return !it.checked; });
    var checked = state.shopping.filter(function(it){ return it.checked; });

    var groups = {};
    unchecked.forEach(function(it){
      var cat = it.category || 'Sonstiges';
      if(!groups[cat]) groups[cat] = [];
      groups[cat].push(it);
    });
    var catOrder = GROCERY_CATEGORIES.map(function(c){ return c.name; }).concat(['Sonstiges']);
    var html = '';
    catOrder.forEach(function(catName){
      if(!groups[catName] || groups[catName].length===0) return;
      html += '<p class="section-title" style="padding:14px 20px 4px;">'+catName+'</p>';
      html += groups[catName].map(shopRowHtml).join('');
    });
    if(checked.length>0){
      html += '<p class="section-title" style="padding:14px 20px 4px;">Erledigt</p>';
      html += checked.map(shopRowHtml).join('');
    }
    el.innerHTML = html;
    el.querySelectorAll('.check').forEach(function(c){
      c.addEventListener('click', function(){
        var id = c.getAttribute('data-id');
        var it = state.shopping.find(function(x){ return x.id===id; });
        var wasChecked = it.checked;
        it.checked = !it.checked;
        if(!wasChecked && it.checked){
          // Beim Abhaken automatisch in die Vorratskammer übernehmen
          addToPantry(it.name, it.amount, it.category);
        }
        saveState();
        renderShopping();
      });
    });
    el.querySelectorAll('.redit').forEach(function(b){
      b.addEventListener('click', function(){ openEditShopModal(b.getAttribute('data-id')); });
    });
    el.querySelectorAll('[data-catedit]').forEach(function(b){
      b.addEventListener('click', function(){ openCategoryEditModal(b.getAttribute('data-catedit'), 'shopping'); });
    });
  }
  var editingShopId = null;
  document.getElementById('openShopAddBtn').addEventListener('click', function(){
    editingShopId = null;
    document.getElementById('shopModalTitle').textContent = 'Artikel hinzufügen';
    document.getElementById('addShopBtn').textContent = 'Hinzufügen';
    document.getElementById('deleteShopBtn').style.display = 'none';
    document.getElementById('shopAmountInput').value = '';
    document.getElementById('shopNameInput').value = '';
    document.getElementById('shopAddModal').style.display = 'flex';
  });
  function openEditShopModal(id){
    var it = state.shopping.find(function(x){ return x.id===id; });
    if(!it) return;
    editingShopId = id;
    document.getElementById('shopModalTitle').textContent = 'Artikel bearbeiten';
    document.getElementById('addShopBtn').textContent = 'Speichern';
    document.getElementById('deleteShopBtn').style.display = 'block';
    document.getElementById('shopAmountInput').value = it.amount || '';
    document.getElementById('shopNameInput').value = it.name;
    document.getElementById('shopAddModal').style.display = 'flex';
  }
  document.getElementById('deleteShopBtn').addEventListener('click', function(){
    if(!editingShopId) return;
    state.shopping = state.shopping.filter(function(x){ return x.id!==editingShopId; });
    saveState();
    editingShopId = null;
    document.getElementById('shopAddModal').style.display = 'none';
    renderShopping();
  });
  document.getElementById('cancelShopAddBtn').addEventListener('click', function(){
    document.getElementById('shopAddModal').style.display = 'none';
    editingShopId = null;
  });
  document.getElementById('addShopBtn').addEventListener('click', function(){
    var amountInput = document.getElementById('shopAmountInput');
    var nameInput = document.getElementById('shopNameInput');
    var val = nameInput.value.trim();
    if(!val) return;
    if(editingShopId){
      var it = state.shopping.find(function(x){ return x.id===editingShopId; });
      if(it){
        it.name = val;
        it.amount = amountInput.value.trim() || null;
        it.category = guessGroceryCategory(val);
      }
      saveState();
      editingShopId = null;
      document.getElementById('shopAddModal').style.display = 'none';
      renderShopping();
      return;
    }
    addToShoppingList(val, amountInput.value);
    saveState();
    document.getElementById('shopAddModal').style.display = 'none';
    renderShopping();
  });
  document.getElementById('shopNameInput').addEventListener('keydown', function(e){
    if(e.key==='Enter') document.getElementById('addShopBtn').click();
  });
  document.getElementById('clearCheckedShopBtn').addEventListener('click', function(){
    state.shopping = state.shopping.filter(function(x){ return !x.checked; });
    saveState();
    renderShopping();
  });


  /* ================= Essensplan ================= */
  var WEEKDAY_NAMES_LONG = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
  var mealWeekStart = mondayOf(new Date());
  var mealAddDate = null;
  var editingRecipeId = null;
  var currentRecipeIngredients = [];
  var pendingIngredients = [];

  function mondayOf(d){
    var day = (d.getDay()+6)%7;
    var m = new Date(d);
    m.setDate(d.getDate()-day);
    m.setHours(0,0,0,0);
    return m;
  }
  function dateToISOStr(d){
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  function renderMealWeek(){
    if(!document.getElementById('mealWeekList')) return;
    var days = [];
    for(var i=0;i<7;i++){
      var d = new Date(mealWeekStart);
      d.setDate(mealWeekStart.getDate()+i);
      days.push(d);
    }
    var last = days[6];
    document.getElementById('mealWeekLabel').textContent =
      String(days[0].getDate()).padStart(2,'0')+'.'+String(days[0].getMonth()+1).padStart(2,'0')+'. – '+
      String(last.getDate()).padStart(2,'0')+'.'+String(last.getMonth()+1).padStart(2,'0')+'.'+last.getFullYear();

    document.getElementById('mealWeekList').innerHTML = days.map(function(d, idx){
      var dateStr = dateToISOStr(d);
      var entries = state.mealPlan.filter(function(m){ return m.date===dateStr; });
      var entriesHtml = entries.map(function(m){
        return '<div class="meal-entry"'+personTintStyle(m.createdBy)+'><span>'+escapeHtml(m.name)+'</span>'+avatarHtml(m.createdBy)+'<button class="sdel" data-mealdel="'+m.id+'">×</button></div>';
      }).join('');
      return '<div class="meal-day">'+
        '<div class="meal-day-head">'+WEEKDAY_NAMES_LONG[idx]+', '+String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.</div>'+
        entriesHtml +
        '<button type="button" class="link-btn" data-addmeal="'+dateStr+'" style="margin-top:6px;">+ Essen hinzufügen</button>'+
      '</div>';
    }).join('');

    document.querySelectorAll('[data-addmeal]').forEach(function(b){
      b.addEventListener('click', function(){ openMealAddForm(b.getAttribute('data-addmeal')); });
    });
    document.querySelectorAll('[data-mealdel]').forEach(function(b){
      b.addEventListener('click', function(){
        var id = b.getAttribute('data-mealdel');
        state.mealPlan = state.mealPlan.filter(function(m){ return m.id!==id; });
        saveState();
        renderMealWeek();
      });
    });
  }
  document.getElementById('mealPrevWeek').addEventListener('click', function(){
    mealWeekStart.setDate(mealWeekStart.getDate()-7);
    renderMealWeek();
  });
  document.getElementById('mealNextWeek').addEventListener('click', function(){
    mealWeekStart.setDate(mealWeekStart.getDate()+7);
    renderMealWeek();
  });

  /* ---- Reiter: Wochenplanung / Rezeptesammlung ---- */
  document.querySelectorAll('#mealTabbar button').forEach(function(btn){
    btn.addEventListener('click', function(){ switchMealView(btn.getAttribute('data-mealview')); });
  });
  function switchMealView(name){
    // Sicherheitsnetz: egal wie man ins Modul kommt (Tab-Wechsel, oder
    // "Umweg" über Dashboard/Sidebar zurück), Ansichts-/Bearbeiten-Ebene
    // der Rezepte müssen dabei immer sauber zurückgesetzt werden — sonst
    // bleibt eine davon im Hintergrund sichtbar stehen.
    document.getElementById('recipeViewView').style.display = 'none';
    document.getElementById('recipeEditView').style.display = 'none';
    document.getElementById('mealTabbar').style.display = 'flex';
    document.getElementById('view-shopping').classList.toggle('active', name==='shopping');
    document.getElementById('view-pantry').classList.toggle('active', name==='pantry');
    document.getElementById('view-mealweek').classList.toggle('active', name==='week');
    document.getElementById('view-mealrecipes').classList.toggle('active', name==='recipes');
    window.scrollTo(0, 0);
    document.querySelectorAll('#mealTabbar button').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-mealview')===name);
    });
    if(name==='shopping') renderShopping();
    if(name==='pantry') renderPantry();
    if(name==='week') renderMealWeek();
    if(name==='recipes') renderRecipeList();
  }
  function renderMealPlan(){
    var activeBtn = document.querySelector('#mealTabbar button.active');
    switchMealView(activeBtn ? activeBtn.getAttribute('data-mealview') : 'shopping');
  }

  function openMealAddForm(dateStr){
    mealAddDate = dateStr;
    var d = new Date(dateStr+'T00:00:00');
    document.getElementById('mealAddDateLabel').textContent = String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.';
    var sel = document.getElementById('mealRecipeSelect');
    sel.innerHTML = '<option value="">— Ohne Rezept —</option>' +
      state.recipes.map(function(r){ return '<option value="'+r.id+'">'+escapeHtml(r.name)+'</option>'; }).join('');
    document.getElementById('mealNameInput').value = '';
    document.getElementById('mealAddModal').style.display = 'flex';
  }
  document.getElementById('mealRecipeSelect').addEventListener('change', function(){
    var selectedId = this.value;
    var r = state.recipes.find(function(x){ return x.id===selectedId; });
    if(r) document.getElementById('mealNameInput').value = r.name;
  });
  document.getElementById('cancelMealBtn').addEventListener('click', function(){
    document.getElementById('mealAddModal').style.display = 'none';
  });
  document.getElementById('saveMealBtn').addEventListener('click', function(){
    var name = document.getElementById('mealNameInput').value.trim();
    var recipeId = document.getElementById('mealRecipeSelect').value || null;
    if(!name && recipeId){
      var r = state.recipes.find(function(x){ return x.id===recipeId; });
      name = r ? r.name : '';
    }
    if(!name || !mealAddDate) return;
    state.mealPlan.push({ id: uid(), date: mealAddDate, recipeId: recipeId, name: name, createdBy: currentUserId });
    saveState();
    document.getElementById('mealAddModal').style.display = 'none';
    renderMealWeek();
    if(recipeId){
      var recipe = state.recipes.find(function(x){ return x.id===recipeId; });
      if(recipe && recipe.ingredients && recipe.ingredients.length){
        openAddToShoppingConfirm(recipe.ingredients);
      }
    }
  });

  var pendingConfirmIngredients = null;
  function openAddToShoppingConfirm(ingredients){
    pendingConfirmIngredients = ingredients;
    document.getElementById('addToShoppingConfirm').style.display = 'flex';
  }
  document.getElementById('confirmAddIngredientsNoBtn').addEventListener('click', function(){
    document.getElementById('addToShoppingConfirm').style.display = 'none';
    pendingConfirmIngredients = null;
  });
  document.getElementById('confirmAddIngredientsYesBtn').addEventListener('click', function(){
    document.getElementById('addToShoppingConfirm').style.display = 'none';
    openIngredientModal(pendingConfirmIngredients);
  });

  function openIngredientModal(ingredients){
    pendingIngredients = ingredients;
    document.getElementById('ingredientCheckList').innerHTML = ingredients.map(function(ing, i){
      var hasAmount = ing.amount && ing.amount.trim();
      var pantryMatch = findPantryMatch(ing.name);
      return '<div class="ingredient-select-row" style="flex-wrap:wrap;">'+
        '<label>'+
          '<input type="checkbox" id="ingcheck'+i+'" data-ing-name="'+escapeHtml(ing.name)+'">'+
          '<span>'+escapeHtml(ing.name)+'</span>'+
        '</label>'+
        (hasAmount ? '<button type="button" class="amount-toggle" data-amount="'+escapeHtml(ing.amount)+'">'+escapeHtml(ing.amount)+'</button>' : '')+
        (pantryMatch ? '<div style="width:100%; font-size:11.5px; color:var(--green); padding-left:29px;">Schon im Vorrat'+(pantryMatch.amount?' ('+escapeHtml(pantryMatch.amount)+')':'')+'</div>' : '')+
      '</div>';
    }).join('');
    document.querySelectorAll('#ingredientCheckList .amount-toggle').forEach(function(btn){
      btn.addEventListener('click', function(){ btn.classList.toggle('active'); });
    });
    document.getElementById('ingredientModal').style.display = 'flex';
  }
  document.getElementById('selectAllIngredientsBtn').addEventListener('click', function(){
    document.querySelectorAll('#ingredientCheckList input[type="checkbox"]').forEach(function(cb){ cb.checked = true; });
  });
  document.getElementById('addIngredientsBtn').addEventListener('click', function(){
    document.querySelectorAll('#ingredientCheckList .ingredient-select-row').forEach(function(row){
      var cb = row.querySelector('input[type="checkbox"]');
      if(!cb.checked) return;
      var name = cb.getAttribute('data-ing-name');
      var amountBtn = row.querySelector('.amount-toggle');
      var amount = (amountBtn && amountBtn.classList.contains('active')) ? amountBtn.getAttribute('data-amount') : null;
      addToShoppingList(name, amount);
    });
    saveState();
    document.getElementById('ingredientModal').style.display = 'none';
    renderShopping();
  });

  function renderRecipeList(){
    var el = document.getElementById('recipeList');
    if(!el) return;
    var query = (document.getElementById('recipeSearchInput').value || '').trim().toLowerCase();
    var list = state.recipes.filter(function(r){ return !query || r.name.toLowerCase().indexOf(query)!==-1; });
    if(list.length===0){
      el.innerHTML = '<p class="empty">'+(query ? 'Keine Rezepte gefunden.' : 'Noch keine Rezepte angelegt.')+'</p>';
      return;
    }
    var sorted = list.slice().sort(function(a,b){ return a.name.localeCompare(b.name, 'de'); });
    function cardHtml(r){
      var snippet = (r.ingredients||[]).slice(0,4).map(function(ing){
        return (ing.amount ? ing.amount+' ' : '') + ing.name;
      }).join(', ');
      return '<div class="note-card" data-recipe="'+r.id+'">'+
        '<div class="ntitle">'+escapeHtml(r.name)+'</div>'+
        '<div class="nsnippet">'+escapeHtml(snippet)+(r.ingredients && r.ingredients.length>4 ? ' …' : '')+'</div>'+
      '</div>';
    }
    if(query){
      // Bei aktiver Suche: einfache flache Liste, Buchstaben-Überschriften
      // bringen bei wenigen Treffern keinen Mehrwert.
      el.innerHTML = sorted.map(cardHtml).join('');
    } else {
      // Ohne Suche: alphabetisch mit Buchstaben-Überschriften gruppiert,
      // damit man bei vielen Rezepten schnell springen kann.
      var html = '';
      var lastLetter = null;
      sorted.forEach(function(r){
        var letter = (r.name.charAt(0) || '#').toUpperCase();
        if(letter !== lastLetter){
          html += '<p class="section-title" style="padding:16px 20px 6px;">'+escapeHtml(letter)+'</p>';
          lastLetter = letter;
        }
        html += cardHtml(r);
      });
      el.innerHTML = html;
    }
    el.querySelectorAll('[data-recipe]').forEach(function(c){
      c.addEventListener('click', function(){ openRecipeView(c.getAttribute('data-recipe')); });
    });
  }
  document.getElementById('recipeSearchInput').addEventListener('input', renderRecipeList);
  document.getElementById('newRecipeBtn').addEventListener('click', function(){ openRecipeEdit(null); });

  /* ---- Rezept-Ansicht (nur lesen) ---- */
  var viewingRecipeId = null;
  function openRecipeView(id){
    var r = state.recipes.find(function(x){ return x.id===id; });
    if(!r) return;
    viewingRecipeId = id;
    document.getElementById('recipeViewName').textContent = r.name || '';
    var ingredients = r.ingredients || [];
    var ingredientsEl = document.getElementById('recipeViewIngredients');
    if(ingredients.length===0){
      ingredientsEl.innerHTML = '<p class="empty">Keine Zutaten hinterlegt.</p>';
    } else {
      ingredientsEl.innerHTML = ingredients.map(function(ing){
        return '<div class="simple-row"><div class="stext"><div class="stitle">'+
          (ing.amount ? '<span class="num" style="color:var(--ink-soft); margin-right:8px;">'+escapeHtml(ing.amount)+'</span>' : '')+
          escapeHtml(ing.name)+'</div></div></div>';
      }).join('');
    }
    document.getElementById('recipeViewInstructions').textContent = r.instructions || 'Keine Zubereitungsschritte hinterlegt.';
    document.getElementById('view-mealweek').classList.remove('active');
    document.getElementById('view-mealrecipes').classList.remove('active');
    document.getElementById('mealTabbar').style.display = 'none';
    document.getElementById('recipeViewView').style.display = 'flex';
    document.getElementById('recipeViewView').style.flexDirection = 'column';
    document.getElementById('recipeViewView').style.minHeight = '100vh';
    window.scrollTo(0, 0);
  }
  function closeRecipeView(){
    viewingRecipeId = null;
    document.getElementById('recipeViewView').style.display = 'none';
    document.getElementById('mealTabbar').style.display = 'flex';
    switchMealView('recipes');
  }
  document.getElementById('backFromRecipeViewBtn').addEventListener('click', closeRecipeView);
  document.getElementById('editRecipeFromViewBtn').addEventListener('click', function(){
    openRecipeEdit(viewingRecipeId);
  });

  var recipeEditReturnTo = 'list';
  function openRecipeEdit(id){
    editingRecipeId = id;
    recipeEditReturnTo = id ? 'view' : 'list';
    var r = id ? state.recipes.find(function(x){ return x.id===id; }) : { name:'', ingredients:[], instructions:'' };
    currentRecipeIngredients = (r.ingredients || []).slice();
    document.getElementById('recipeNameInput').value = r.name || '';
    document.getElementById('recipeInstructionsInput').value = r.instructions || '';
    document.getElementById('recipeIngredientAmountInput').value = '';
    document.getElementById('recipeIngredientInput').value = '';
    renderIngredientEditList();
    document.getElementById('view-mealweek').classList.remove('active');
    document.getElementById('view-mealrecipes').classList.remove('active');
    document.getElementById('recipeViewView').style.display = 'none';
    document.getElementById('mealTabbar').style.display = 'none';
    document.getElementById('recipeEditView').style.display = 'block';
    document.getElementById('deleteRecipeBtn').style.display = id ? 'block' : 'none';
    window.scrollTo(0, 0);
  }
  function closeRecipeEdit(){
    var wasEditingId = editingRecipeId;
    var returnTo = recipeEditReturnTo;
    editingRecipeId = null;
    document.getElementById('recipeEditView').style.display = 'none';
    var stillExists = wasEditingId && state.recipes.some(function(x){ return x.id===wasEditingId; });
    if(returnTo==='view' && stillExists){
      openRecipeView(wasEditingId);
    } else {
      document.getElementById('mealTabbar').style.display = 'flex';
      switchMealView('recipes');
    }
  }
  function renderIngredientEditList(){
    var el = document.getElementById('recipeIngredientsList');
    if(currentRecipeIngredients.length===0){
      el.innerHTML = '<p class="empty" style="padding:6px 0;">Noch keine Zutaten.</p>';
      return;
    }
    el.innerHTML = currentRecipeIngredients.map(function(ing, i){
      var label = (ing.amount ? ing.amount+' ' : '') + ing.name;
      return '<div class="ingredient-chip"><span>'+escapeHtml(label)+'</span><button type="button" data-rmidx="'+i+'">×</button></div>';
    }).join('');
    el.querySelectorAll('[data-rmidx]').forEach(function(b){
      b.addEventListener('click', function(){
        currentRecipeIngredients.splice(parseInt(b.getAttribute('data-rmidx'),10), 1);
        renderIngredientEditList();
      });
    });
  }
  document.getElementById('addIngredientBtn').addEventListener('click', function(){
    var amountInput = document.getElementById('recipeIngredientAmountInput');
    var nameInput = document.getElementById('recipeIngredientInput');
    var amountVal = amountInput.value.trim();
    var nameVal = nameInput.value.trim();
    if(!nameVal) return;
    currentRecipeIngredients.push({ amount: amountVal, name: nameVal });
    amountInput.value = '';
    nameInput.value = '';
    renderIngredientEditList();
    amountInput.focus();
  });
  document.getElementById('recipeIngredientInput').addEventListener('keydown', function(e){
    if(e.key==='Enter'){ e.preventDefault(); document.getElementById('addIngredientBtn').click(); }
  });
  document.getElementById('recipeIngredientAmountInput').addEventListener('keydown', function(e){
    if(e.key==='Enter'){ e.preventDefault(); document.getElementById('recipeIngredientInput').focus(); }
  });
  document.getElementById('cancelRecipeBtn').addEventListener('click', closeRecipeEdit);
  document.getElementById('saveRecipeBtn').addEventListener('click', function(){
    var name = document.getElementById('recipeNameInput').value.trim();
    var instructions = document.getElementById('recipeInstructionsInput').value.trim();
    if(!name){ document.getElementById('recipeNameInput').focus(); return; }
    if(editingRecipeId){
      var r = state.recipes.find(function(x){ return x.id===editingRecipeId; });
      r.name = name; r.ingredients = currentRecipeIngredients.slice(); r.instructions = instructions;
    } else {
      state.recipes.push({ id: uid(), name: name, ingredients: currentRecipeIngredients.slice(), instructions: instructions, createdBy: currentUserId });
    }
    saveState();
    closeRecipeEdit();
  });
  document.getElementById('deleteRecipeBtn').addEventListener('click', function(){
    if(!editingRecipeId) return;
    if(!confirm('Rezept löschen? Bereits geplante Mahlzeiten mit diesem Rezept bleiben als Text erhalten.')) return;
    state.recipes = state.recipes.filter(function(x){ return x.id!==editingRecipeId; });
    saveState();
    closeRecipeEdit();
  });

  function updatePushBanner(){
    var supported = 'serviceWorker' in navigator && 'PushManager' in window;
    var granted = supported && Notification.permission === 'granted';

    var calBanner = document.getElementById('pushPromptBanner');
    if(calBanner){
      var calHasReminders = state.calendar.some(function(ev){ return ev.remind; });
      calBanner.style.display = (supported && !granted && calHasReminders) ? 'block' : 'none';
    }
    var todoBanner = document.getElementById('pushPromptBannerTodos');
    if(todoBanner){
      var todoHasReminders = state.todos.some(function(t){ return t.remind && !t.done; });
      todoBanner.style.display = (supported && !granted && todoHasReminders) ? 'block' : 'none';
    }
  }

