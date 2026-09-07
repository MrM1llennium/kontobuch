# Casalo – Architektur

Kurzes, pragmatisches Dokument zum aktuellen Aufbau. Wird schrittweise erweitert, sobald weitere Phasen der Modularisierung umgesetzt sind.

## Was ist Casalo?

Eine gemeinsame Haushalts-Web-App (PWA), gehostet über GitHub Pages, Datenhaltung über Supabase (ein JSON-Objekt pro Haushalt, per Code geteilt). Aktuell eine `index.html` mit ausgelagertem CSS (seit Phase 1) und weiterhin einem zentralen `<script>`-Block.

## Bestehende Module

- **Finanzen** – Guthaben (Konto + Bargeld), Buchungen, wiederkehrende Fixkosten/Einnahmen, Budget, Statistik, Sparziele
- **Kalender** – Termine (einmalig, wiederkehrend, mehrtägig), Erinnerungen, Zuweisung an Personen
- **To-Dos** – Aufgaben mit Fälligkeit, Wiederholung, Zuweisung, optionale Projekt-Verknüpfung
- **Lebensmittel** – Einkaufsliste, Vorratskammer (inkl. Haltbarkeitsdatum), Essensplan, Rezepte
- **Projekte** – Links/Notizen/Kosten/Checklisten in Ordnern, Anpinnen, Sparziel-Verknüpfung, eigene Aufgaben
- **Notizen** – mit optionalem PIN-Schutz pro Notiz

## Core

Globale, modulübergreifende Bestandteile:

- **App-Shell & Navigation** – Topbar, Sidebar, Tabbar-Grundgerüst, Screen-Wechsel (`openModule`, `renderCurrentScreen`)
- **Dashboard** – "Heute"-Übersicht; aggregiert bewusst Daten aus Kalender + To-Dos (kein Fehler, sondern gewollte Dashboard-Aufgabe)
- **Household / Nutzer** – Login per Haushalts-Code, Nutzerprofile, Avatare/Farben
- **Einstellungen** – Nutzerverwaltung, Kategorien, Design, Benachrichtigungen
- **Notifications** – Push-Erinnerungen, Zuweisungs-Benachrichtigungen, tägliche Übersicht (App-seitig + Supabase Edge Function)
- **Theme-/Style-System** – 4 Farbwelten (Signature/Forest/Lilac/Bubblegum) + Modern/Kawaii-Style, komplett über CSS-Variablen gesteuert

## Shared

Technische Bausteine, die von mehr als einem Modul genutzt werden (siehe `css/shared/components.css`):

- UI-Grundbausteine: `.simple-row`, `.note-card`, `.tabbar`, `.field`/`.btn`/`.type-switch` (Formulare), `.settings-row`, `.avatar`
- Utility-Funktionen im JS: `fmtEUR`, `fmtDate`, `escapeHtml`, `uid`, `todayISO`, `avatarHtml`, `personTintStyle`

**Wichtiger Befund aus der Bestandsaufnahme:** To-Dos, Projekte und Notizen haben aktuell **keine eigenen CSS-Regeln** – sie bestehen visuell komplett aus Shared-Komponenten. Das ist kein Fehler, sondern zeigt, wie stark diese drei Module bereits auf gemeinsame Bausteine setzen.

## Datenhaltung

Ein einziges `state`-Objekt mit allen Modul-Daten als Top-Level-Keys (`transactions`, `todos`, `calendar`, `projects`, `notes`, `pantry`, `users`, ...). Persistenz ist aktuell **monolithisch**: `saveState()` schreibt bei jeder Änderung den kompletten `state` als ein JSON-Blob nach Supabase. Module "besitzen" ihre Daten aktuell nur logisch (eigener Key im Objekt), nicht physisch getrennt.

## Bekannte Kopplungen zwischen Modulen

Ehrliche Liste der Stellen, an denen Module aktuell direkt ineinandergreifen (nicht nur über Daten, sondern über direkte Funktionsaufrufe):

- **To-Dos ↔ Projekte**: `todo.projectId` verweist auf ein Projekt; das Projekte-Modul ruft `openEditTodoModal()` (eine To-Dos-Funktion) direkt auf.
- **Einkaufsliste ↔ Vorratskammer**: `addToPantry()` und `findPantryMatch()` werden modulübergreifend direkt aufgerufen.
- **Sparziele ↔ Projekte**: `project.goalId` verweist auf ein Sparziel – reine Datenreferenz, kein Funktionsaufruf.

Diese Liste ist die Zielliste für eine spätere Entkopplung (nicht Teil von Phase 0/1).

## Wie Module aktuell miteinander kommunizieren dürfen

Noch keine feste Regel – aktuell rufen Module sich bei Bedarf direkt gegenseitig auf (siehe oben). Für neue Funktionalität gilt ab jetzt als Richtschnur:

- Neue modulübergreifende Verbindungen möglichst über Daten-Referenzen lösen (wie `goalId`), nicht über direkte Funktionsaufrufe eines anderen Moduls
- Rein optische/strukturelle Bausteine (Karten, Formulare, Listen) gehören in `shared/`, sobald sie von mehr als einem Modul gebraucht werden

## Connections (Zukunft, noch nicht umgesetzt)

Geplant, aber noch nicht implementiert: eine zentrale Verbindungs-Schicht zwischen Objekten verschiedener Module (Projekt ↔ Aufgabe ↔ Termin ↔ Notiz ↔ Finanz-Eintrag), die die oben genannten direkten Kopplungen langfristig ablösen soll. Datenmodell wird erst entworfen, wenn ein konkretes Feature es braucht.

## Architekturregeln

1. **1:1 vor Umbau** – Rein strukturelle Umbauten (Dateien verschieben) und inhaltliche Änderungen (Logik/Funktionen ändern) sind immer getrennte Schritte, nie vermischt.
2. **Shared bleibt dumm** – Code in `shared/` darf nichts über ein konkretes Modul wissen (keine `if(module==='finance')`-Verzweigungen in Shared-Code).
3. **Jede Phase einzeln testbar** – Kein Umbauschritt, nach dem die App nicht mehr normal benutzbar wäre.
4. **Kein Overengineering auf Vorrat** – Neue Architektur-Schichten (z. B. Connections) erst bauen, wenn ein konkretes Feature sie braucht, nicht spekulativ vorab.

---

*Stand: nach Phase 0 & Phase 1 (CSS-Auslagerung). JavaScript liegt weiterhin vollständig in `index.html`.*
