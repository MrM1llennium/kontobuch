"use strict";
/* ============================================================
   CASALO — CORE: STATE
   1:1 ausgelagert aus der ursprünglichen index.html (Phase 2).
   Grundform des gemeinsamen Datenobjekts + globale Basis-
   Variablen, die von praktisch allen Modulen gelesen werden.
   ============================================================ */

  var DEFAULT_STATE = {
    transactions: [],
    budgets: {},
    savings: [],
    recurring: [],
    shopping: [],
    todos: [],
    notes: [],
    calendar: [],
    users: [],
    recipes: [],
    mealPlan: [],
    categories: {
      income: ["Gehalt","Nebeneinkommen","Sonstige Einnahmen"],
      expense: ["Miete","Lebensmittel","Transport","Freizeit","Versicherung","Sonstiges"]
    }
  };

  var state = null;
  var viewingDate = new Date();
  viewingDate.setDate(1);
  var currentType = "expense";
  var editingNoteId = null;

  var MONTH_NAMES = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
