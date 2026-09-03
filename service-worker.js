const CACHE_NAME = 'homehub-shell-v2';
const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(SHELL_FILES);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener('push', function(event){
  var payload = { title: 'Home Hub', body: 'Neue Erinnerung' };
  try{ if(event.data) payload = event.data.json(); } catch(e){}
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Home Hub', {
      body: payload.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png'
    })
  );
});

self.addEventListener('notificationclick', function(event){
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList){
      for(var i=0; i<clientList.length; i++){
        if('focus' in clientList[i]) return clientList[i].focus();
      }
      if(clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

// Nur eigene, statische Dateien aus dem Cache bedienen (App-Hülle).
// Alle anderen Anfragen (insbesondere die Cloud-Datenbank) unangetastet
// durchreichen, damit Live-Daten nie aus dem Cache kommen.
//
// Strategie: NETWORK-FIRST für die App-Hülle. Normalerweise ist eine
// Verbindung da, dann wird immer die aktuelle Version geladen (kein
// "einmal öffnen bringt nichts" mehr). Nur wenn das Netzwerk wirklich
// nicht erreichbar ist, wird auf die zuletzt gespeicherte Version
// zurückgefallen, damit die App auch offline startet.
self.addEventListener('fetch', function(event){
  var url = new URL(event.request.url);
  var isOwnOrigin = url.origin === self.location.origin;
  var isShellFile = SHELL_FILES.some(function(f){
    return url.pathname.endsWith(f.replace('./',''));
  });

  if(!isOwnOrigin || !isShellFile || event.request.method !== 'GET'){
    return; // Standardverhalten: normal übers Netzwerk laden
  }

  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).then(function(response){
      if(response && response.ok){
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache){
          cache.put(event.request, responseClone);
        });
      }
      return response;
    }).catch(function(){
      return caches.match(event.request);
    })
  );
});
