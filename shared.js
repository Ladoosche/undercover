/* =============================================================
   shared.js — Shared state & utilities across all games
   Stored in localStorage so data persists between sessions.

   Exports (globals used by index.html and all game files):
     LANG          — active language: 'en' | 'fr'
     PLAYERS       — ordered array of { id, name }
     setLang()     — change language + save
     savePlayers() — persist player list
     loadShared()  — call once on page load
   ============================================================= */

/* ── Language ──────────────────────────────────────────────── */
let LANG = 'en';

function setLang(l) {
  LANG = l === 'fr' ? 'fr' : 'en';
  localStorage.setItem('uc_lang', LANG);
}

/* ── Player list ───────────────────────────────────────────── */
/* Players are shared across all games and persist via localStorage */
let PLAYERS = []; // [{ id, name }, …]

function savePlayers() {
  localStorage.setItem('uc_players', JSON.stringify(PLAYERS));
}

function loadShared() {
  /* Restore language */
  const savedLang = localStorage.getItem('uc_lang');
  if (savedLang) LANG = savedLang;

  /* Restore player list */
  try {
    const raw = localStorage.getItem('uc_players');
    if (raw) PLAYERS = JSON.parse(raw);
  } catch (e) {
    PLAYERS = [];
  }
}

/* ── Utility: generate a unique id ────────────────────────── */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ── Utility: get initials from a name ────────────────────── */
function initials(name) {
  return name.trim().slice(0, 2).toUpperCase();
}

/* Load immediately when the script is parsed */
loadShared();
