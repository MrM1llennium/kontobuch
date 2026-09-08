"use strict";
/* ============================================================
   CASALO — SHARED: UI
   1:1 ausgelagert aus der ursprünglichen index.html (Phase 2).
   HTML-generierende Helfer (Avatare, Farb-Kacheln), von
   mehreren Modulen genutzt (Buchungen, Termine, Notizen, ..).
   ============================================================ */

  function nextUserColor(){
    var idx = (state.users||[]).length % USER_COLORS.length;
    return USER_COLORS[idx];
  }
  function avatarHtml(userId, size){
    if(!userId) return '';
    var u = (state.users||[]).find(function(x){ return x.id===userId; });
    if(!u) return '';
    var s = size || 20;
    if(u.photo){
      return '<img src="'+u.photo+'" class="avatar" style="width:'+s+'px;height:'+s+'px;object-fit:cover;" title="'+escapeHtml(u.name)+'">';
    }
    return '<div class="avatar" style="background:'+u.color+';width:'+s+'px;height:'+s+'px;font-size:'+Math.round(s*0.5)+'px;" title="'+escapeHtml(u.name)+'">'+escapeHtml(u.name.charAt(0).toUpperCase())+'</div>';
  }
  // Verkleinert/komprimiert ein hochgeladenes Foto clientseitig zu einem
  // quadratischen Mini-Bild (Base64), damit es klein genug bleibt, um
  // einfach im gemeinsamen Datensatz mitgespeichert zu werden.
  function resizeImageFile(file, maxSize, quality){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload = function(e){
        var img = new Image();
        img.onload = function(){
          var srcSize = Math.min(img.width, img.height);
          var sx = (img.width - srcSize)/2;
          var sy = (img.height - srcSize)/2;
          var canvas = document.createElement('canvas');
          canvas.width = maxSize; canvas.height = maxSize;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, maxSize, maxSize);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  // Farbe der Person, die einen Eintrag angelegt hat — für den farbigen
  // Rand an Buchungen, Notizen, Terminen usw. Ohne bekannten Nutzer leer.
  function userColorOf(userId){
    if(!userId) return null;
    var u = (state.users||[]).find(function(x){ return x.id===userId; });
    return u ? u.color : null;
  }
  function hexToRgba(hex, alpha){
    hex = (hex||'').replace('#','');
    if(hex.length!==6) return null;
    var r = parseInt(hex.substring(0,2),16);
    var g = parseInt(hex.substring(2,4),16);
    var b = parseInt(hex.substring(4,6),16);
    return 'rgba('+r+','+g+','+b+','+alpha+')';
  }
  function personTintBg(userId){
    var c = userColorOf(userId);
    if(!c) return '';
    var bg = hexToRgba(c, 0.16);
    return bg ? 'background:'+bg+';' : '';
  }
  function personTintStyle(userId){
    var bg = personTintBg(userId);
    return bg ? ' style="'+bg+'"' : '';
  }
  function renderColorPalette(containerEl, selectedColor, onPick){
    function swatchRow(colors){
      return colors.map(function(c){
        return '<div class="color-swatch'+(c===selectedColor?' selected':'')+'" style="background:'+c+'" data-color="'+c+'"></div>';
      }).join('');
    }
    containerEl.innerHTML =
      '<p class="color-palette-label">Normal</p>'+
      '<div class="color-palette">'+swatchRow(USER_COLORS)+'</div>'+
      '<p class="color-palette-label">Pastell</p>'+
      '<div class="color-palette">'+swatchRow(USER_COLORS_PASTEL)+'</div>';
    containerEl.querySelectorAll('.color-swatch').forEach(function(sw){
      sw.addEventListener('click', function(){ onPick(sw.getAttribute('data-color')); });
    });
  }

  /* ==================================================================
     FINETUNING RUNDE 1, Punkt 7 — Wiederverwendbare Swipe-Tab-Logik.
     Von Finanzen UND Essensplan gemeinsam genutzt (beide haben eine
     .tabbar + mehrere .view-Inhalte). Kapselt:
       - Positionierung des Unterstrichs unter dem aktiven Tab
       - Bewegung des Pagers (Inhalt) zur aktiven Tab-Position
       - Live-Drag-Verhalten: Inhalt UND Unterstrich folgen während
         des Swipes kontinuierlich dem Finger, kein harter Sprung erst
         nach Abschluss der Geste
     Gibt ein Objekt mit goTo(name, animate) zurück, das sowohl vom
     Tab-Klick als auch vom Swipe-Ende genutzt werden kann — die
     eigentliche fachliche Umschaltung (Re-Render etc.) bleibt weiter
     Aufgabe der aufrufenden switchView()/switchMealView()-Funktionen.
     ================================================================== */
  function setupSwipeTabs(opts){
    // opts: { pagerId, tabbarId, indicatorId, tabOrder (Array von
    // Namen in Reihenfolge), getActiveName (fn), onSwipeComplete (fn) }
    var pager = document.getElementById(opts.pagerId);
    var tabbar = document.getElementById(opts.tabbarId);
    var indicator = document.getElementById(opts.indicatorId);
    if(!pager || !tabbar || !indicator) return null;
    var tabOrder = opts.tabOrder;

    function indexOf(name){ var i = tabOrder.indexOf(name); return i===-1 ? 0 : i; }

    function positionIndicator(name, dragging){
      var btn = tabbar.querySelector('button[data-view="'+name+'"], button[data-mealview="'+name+'"]');
      if(!btn) return;
      indicator.classList.toggle('dragging', !!dragging);
      indicator.style.left = btn.offsetLeft+'px';
      indicator.style.width = btn.offsetWidth+'px';
    }
    function positionIndicatorBetween(nameA, nameB, t){
      var btnA = tabbar.querySelector('button[data-view="'+nameA+'"], button[data-mealview="'+nameA+'"]');
      var btnB = tabbar.querySelector('button[data-view="'+nameB+'"], button[data-mealview="'+nameB+'"]');
      if(!btnA || !btnB) return;
      indicator.classList.add('dragging');
      indicator.style.left = (btnA.offsetLeft + (btnB.offsetLeft-btnA.offsetLeft)*t)+'px';
      indicator.style.width = (btnA.offsetWidth + (btnB.offsetWidth-btnA.offsetWidth)*t)+'px';
    }
    function movePager(name, animate){
      var i = indexOf(name);
      pager.style.transition = animate===false ? 'none' : '';
      pager.style.transform = 'translateX(-'+(i*100/tabOrder.length)+'%)';
      if(animate===false){ void pager.offsetHeight; pager.style.transition = ''; }
    }
    function goTo(name, animate){
      movePager(name, animate);
      positionIndicator(name, false);
    }

    // Erst-Positionierung nach dem ersten Layout-Durchlauf.
    setTimeout(function(){ positionIndicator(opts.getActiveName(), false); }, 0);

    var startX=0, startY=0, tracking=false, decided=false, isHorizontal=false, fromName='';
    pager.addEventListener('touchstart', function(e){
      if(e.touches.length!==1) return;
      startX = e.touches[0].clientX; startY = e.touches[0].clientY;
      tracking = true; decided = false; isHorizontal = false;
      fromName = opts.getActiveName();
    }, { passive:true });
    pager.addEventListener('touchmove', function(e){
      if(!tracking || e.touches.length!==1) return;
      var dx = e.touches[0].clientX - startX;
      var dy = e.touches[0].clientY - startY;
      if(!decided){
        if(Math.abs(dx)<8 && Math.abs(dy)<8) return;
        isHorizontal = Math.abs(dx) > Math.abs(dy);
        decided = true;
      }
      if(!isHorizontal) return;
      e.preventDefault();
      var i = indexOf(fromName);
      var count = tabOrder.length;
      var dxPercent = (dx / pager.offsetWidth) * 100;
      var basePercent = -(i*100/count);
      var minPercent = -((count-1)*100/count);
      var next = Math.max(minPercent, Math.min(0, basePercent + dxPercent/1));
      pager.style.transition = 'none';
      pager.style.transform = 'translateX('+next+'%)';
      // Unterstrich zwischen aktuellem und Nachbar-Tab live mitgleiten
      // lassen, proportional zum Fortschritt der Geste.
      var progress = Math.max(-1, Math.min(1, dxPercent / (100/count)));
      if(progress<0 && i<count-1){
        positionIndicatorBetween(fromName, tabOrder[i+1], -progress);
      } else if(progress>0 && i>0){
        positionIndicatorBetween(fromName, tabOrder[i-1], progress);
      } else {
        positionIndicator(fromName, true);
      }
    }, { passive:false });
    pager.addEventListener('touchend', function(e){
      if(!tracking) return;
      tracking = false;
      pager.style.transition = '';
      if(!isHorizontal){ return; }
      var endX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : startX;
      var dx = endX - startX;
      var i = indexOf(fromName);
      var threshold = pager.offsetWidth * 0.16;
      var targetName = fromName;
      if(dx < -threshold && i < tabOrder.length-1) targetName = tabOrder[i+1];
      else if(dx > threshold && i > 0) targetName = tabOrder[i-1];
      if(targetName !== fromName){
        opts.onSwipeComplete(targetName);
      } else {
        goTo(fromName);
      }
    });

    return { goTo: goTo, positionIndicator: positionIndicator };
  }

