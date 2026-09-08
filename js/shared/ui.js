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
