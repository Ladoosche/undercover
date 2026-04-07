/* =============================================================
   UNDERCOVER — Game logic
   Structure:
     1.  Background canvas drawing
     2.  Game state variables
     3.  Word pair database
     4.  Translation strings (EN / FR)
     5.  Language helpers
     6.  Screen navigation
     7.  Setup screen — player management
     8.  Config screen — undercover count & word pair
     9.  Role assignment
    10.  Pass-phone flow
    11.  Game screen rendering
    12.  Role recheck
    13.  Elimination & win condition
    14.  End screen & restart options
    15.  Initialisation
   ============================================================= */


/* ── 1. Background canvas drawing ──────────────────────────── */
/* Draws the warm illustrated background (circles, hatching lines,
   wave curves) on a <canvas> element that sits behind the app frame.
   Called once on load and again whenever the window is resized. */

const bgCanvas = document.getElementById('bg-canvas');
const bgCtx    = bgCanvas.getContext('2d');

function drawBackground() {
  bgCanvas.width  = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  const w = bgCanvas.width;
  const h = bgCanvas.height;

  /* Base fill */
  bgCtx.fillStyle = '#e8ddd0';
  bgCtx.fillRect(0, 0, w, h);

  /* Large soft circles for depth */
  const circles = [
    { x: 0.15, y: 0.10, r: 0.22, a: 0.18 },
    { x: 0.82, y: 0.08, r: 0.28, a: 0.14 },
    { x: 0.50, y: 0.55, r: 0.35, a: 0.09 },
    { x: 0.05, y: 0.70, r: 0.20, a: 0.13 },
    { x: 0.90, y: 0.60, r: 0.18, a: 0.12 },
    { x: 0.35, y: 0.90, r: 0.25, a: 0.10 },
  ];
  circles.forEach(c => {
    bgCtx.beginPath();
    bgCtx.arc(c.x * w, c.y * h, c.r * Math.min(w, h), 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(212,168,130,${c.a})`;
    bgCtx.fill();
  });

  /* Vertical hatching lines for a notebook texture */
  bgCtx.strokeStyle = 'rgba(200,168,130,0.18)';
  bgCtx.lineWidth   = 0.8;
  for (let x = 0; x < w; x += 32) {
    bgCtx.beginPath();
    bgCtx.moveTo(x, 0);
    bgCtx.lineTo(x, h);
    bgCtx.stroke();
  }

  /* Small scattered shape accents */
  bgCtx.strokeStyle = 'rgba(216,90,48,0.10)';
  bgCtx.lineWidth   = 1;
  for (let i = 0; i < 6; i++) {
    const cx = Math.random() * w;
    const cy = Math.random() * h;
    bgCtx.beginPath();
    for (let j = 0; j < 5; j++) {
      const angle = (j / 5) * Math.PI * 2;
      const rx = 6 + Math.random() * 8;
      const ry = 6 + Math.random() * 8;
      const px = cx + rx * Math.cos(angle);
      const py = cy + ry * Math.sin(angle);
      j === 0 ? bgCtx.moveTo(px, py) : bgCtx.lineTo(px, py);
    }
    bgCtx.closePath();
    bgCtx.stroke();
  }

  /* Gentle wave lines near the bottom */
  bgCtx.strokeStyle = 'rgba(180,144,96,0.12)';
  bgCtx.lineWidth   = 0.6;

  bgCtx.beginPath();
  for (let x = 0; x < w; x += 4) {
    const y = h * 0.75 + Math.sin(x * 0.015) * 30 + Math.sin(x * 0.04) * 12;
    x === 0 ? bgCtx.moveTo(x, y) : bgCtx.lineTo(x, y);
  }
  bgCtx.stroke();

  bgCtx.beginPath();
  for (let x = 0; x < w; x += 4) {
    const y = h * 0.85 + Math.sin(x * 0.012) * 20 + Math.sin(x * 0.05) * 8;
    x === 0 ? bgCtx.moveTo(x, y) : bgCtx.lineTo(x, y);
  }
  bgCtx.stroke();
}

/* Draw on load and redraw on window resize */
drawBackground();
window.addEventListener('resize', drawBackground);


/* ── 2. Game state variables ───────────────────────────────── */
/* All mutable state is kept here. These are reset between games. */

let lang         = navigator.language?.startsWith('fr') ? 'fr' : 'en'; // Active language
let players      = [];   // Array of { name, id } — the player roster
let undercovers  = 1;    // How many undercover roles are in play
let mrWhite      = false;// Whether the Mr. White role is enabled
let word1        = '';   // The civilian word
let word2        = '';   // The undercover word
let roles        = [];   // Shuffled array of { name, id, role, word } — assigned each game
let passIndex    = 0;    // Which player is currently viewing their role (0-based)
let round        = 1;    // Current round number
let eliminated   = [];   // Players who have been voted out, in order
let recheckCount = 0;    // How many times "Check my role" has been used this game


/* ── 3. Word pair database ─────────────────────────────────── */
/* Pre-built pairs used when the host clicks "Suggest a pair".
   The first word is always the civilian word, the second the undercover word. */

const wordPairs = [
  ['Coffee',  'Tea'],       ['Cat',     'Dog'],
  ['Pizza',   'Burger'],    ['Beach',   'Pool'],
  ['Wine',    'Beer'],      ['Bus',     'Metro'],
  ['Book',    'Magazine'],  ['Cinema',  'Theatre'],
  ['Guitar',  'Piano'],     ['Sushi',   'Tacos'],
  ['Snow',    'Rain'],      ['Jacket',  'Coat'],
  ['Castle',  'Palace'],    ['River',   'Lake'],
  ['Cheese',  'Butter'],    ['Doctor',  'Nurse'],
  ['Lion',    'Tiger'],     ['Sunrise', 'Sunset'],
  ['Train',   'Plane'],     ['Milk',    'Juice'],
  ['Paris',   'Rome'],      ['Shark',   'Dolphin'],
  ['Violin',  'Cello'],     ['Chess',   'Checkers'],
  ['Whisky',  'Rum'],
];


/* ── 4. Translation strings (EN / FR) ──────────────────────── */
/* All user-facing text is stored here so nothing is hard-coded
   in the HTML or JS logic. Access via the t() helper below. */

const translations = {
  en: {
    /* Screen titles & subtitles */
    'setup':            'Players',
    'setup-sub':        'Add everyone playing tonight',
    'config':           'Settings',
    'config-sub':       'Configure the game',
    'pass-title':       'Your turn',
    'pass-sub':         'Pass the phone to this player',
    'pass-hint':        'Tap below to see your role — keep it secret!',
    'reveal-title':     'Your role',
    'reveal-sub':       'Memorise this, then hide it',
    'recheck-title':    'Who are you?',
    'recheck-sub':      'Tap your name to see your role',
    'end-title':        'Game over',

    /* Buttons */
    'next1':            'Next →',
    'back1':            '← Back',
    'start':            'Start game',
    'reveal':           'See my role',
    'hide':             'Hide & pass →',
    'recheck':          'Check role',
    'elim':             'Eliminate',
    'back-game':        '← Back',
    'newgame':          'New game — new words',
    'editplayers':      'Edit players',
    'quit':             'Quit',
    'suggest':          '↻ Suggest a pair',

    /* Config labels */
    'undercov-label':   'Undercovers',
    'mrw':              'Mr. White',
    'words-label':      'Word pair',
    'civilian-word':    'Civilian word',
    'undercover-word':  'Undercover word',
    'suggested':        'suggested',

    /* Role labels */
    'role-civilian':    'Civilian',
    'role-undercover':  'Undercover',
    'role-mrwhite':     'Mr. White',

    /* Role descriptions shown on the reveal screen */
    'your-word':        'Your word',
    'no-word':          'You have no word.',
    'desc-civilian':    'You are a civilian. Describe your word without being too obvious.',
    'desc-undercover':  'You are undercover. Listen carefully and blend in.',
    'desc-mrwhite':     'You have no word. Listen and try to figure it out.',

    /* In-game */
    'round-label':      'Round',
    'active':           'active',
    'rechecks':         'role checks used',
    'elim-order':       'Eliminated',
    'words-were':       'Words',

    /* Modals */
    'elim-prompt':      'Who was voted out?',
    'elim-cancel':      'Cancel',
    'mrw-guess':        'Did Mr. White guess correctly?',
    'yes-undercover':   'Yes — undercovers win',
    'no-continue':      'No — game continues',

    /* Win messages */
    'civilians-win':    'Civilians win!',
    'undercover-wins':  'Undercovers win!',
    'mrwhite-wins':     'Mr. White wins!',

    /* Validation alerts */
    'min-players':      'Add at least 3 players.',
    'words-needed':     'Enter both words.',
    'under-limit':      'Not enough civilians.',
  },

  fr: {
    'setup':            'Joueurs',
    'setup-sub':        'Ajoutez tous les joueurs',
    'config':           'Paramètres',
    'config-sub':       'Configurer la partie',
    'pass-title':       'À toi',
    'pass-sub':         'Passe le téléphone à ce joueur',
    'pass-hint':        'Appuie ci-dessous pour voir ton rôle — garde le secret !',
    'reveal-title':     'Ton rôle',
    'reveal-sub':       'Mémorise, puis cache',
    'recheck-title':    'Qui es-tu ?',
    'recheck-sub':      'Appuie sur ton nom pour voir ton rôle',
    'end-title':        'Fin de partie',

    'next1':            'Suivant →',
    'back1':            '← Retour',
    'start':            'Lancer la partie',
    'reveal':           'Voir mon rôle',
    'hide':             'Cacher & passer →',
    'recheck':          'Revoir rôle',
    'elim':             'Éliminer',
    'back-game':        '← Retour',
    'newgame':          'Nouvelle partie — nouveaux mots',
    'editplayers':      'Modifier les joueurs',
    'quit':             'Quitter',
    'suggest':          '↻ Suggérer une paire',

    'undercov-label':   'Infiltrés',
    'mrw':              'M. Blanc',
    'words-label':      'Paire de mots',
    'civilian-word':    'Mot des civils',
    'undercover-word':  'Mot des infiltrés',
    'suggested':        'suggéré',

    'role-civilian':    'Civil',
    'role-undercover':  'Infiltré',
    'role-mrwhite':     'M. Blanc',

    'your-word':        'Ton mot',
    'no-word':          'Tu n\'as pas de mot.',
    'desc-civilian':    'Tu es civil. Décris ton mot sans être trop évident.',
    'desc-undercover':  'Tu es infiltré. Écoute et fonds-toi dans la masse.',
    'desc-mrwhite':     'Tu n\'as pas de mot. Écoute et essaie de le deviner.',

    'round-label':      'Tour',
    'active':           'actif',
    'rechecks':         'vérifications utilisées',
    'elim-order':       'Éliminés',
    'words-were':       'Mots',

    'elim-prompt':      'Qui a été éliminé ?',
    'elim-cancel':      'Annuler',
    'mrw-guess':        'M. Blanc a-t-il bien deviné ?',
    'yes-undercover':   'Oui — les infiltrés gagnent',
    'no-continue':      'Non — la partie continue',

    'civilians-win':    'Les civils gagnent !',
    'undercover-wins':  'Les infiltrés gagnent !',
    'mrwhite-wins':     'M. Blanc gagne !',

    'min-players':      'Ajoutez au moins 3 joueurs.',
    'words-needed':     'Entrez les deux mots.',
    'under-limit':      'Pas assez de civils.',
  },
};


/* ── 5. Language helpers ───────────────────────────────────── */

/* Returns the translated string for a given key in the active language */
function t(key) {
  return (translations[lang] || translations.en)[key] || key;
}

/* Updates every element whose id starts with "t-" to match the active language.
   Also refreshes any dynamic counters/labels that depend on language. */
function applyLang() {
  const keys = [
    'setup', 'setup-sub', 'next1', 'config', 'config-sub', 'undercov-label',
    'mrw', 'words-label', 'civilian-word', 'undercover-word', 'suggest',
    'back1', 'start', 'pass-title', 'pass-sub', 'pass-hint', 'reveal',
    'reveal-title', 'reveal-sub', 'hide', 'round-label', 'recheck', 'elim',
    'recheck-title', 'recheck-sub', 'back-game', 'end-title',
    'newgame', 'editplayers', 'quit',
  ];
  keys.forEach(key => {
    const el = document.getElementById('t-' + key);
    if (el) el.textContent = t(key);
  });
  updateUnderSug();
  updateRecheckInfo();
}

/* Toggles between EN and FR and re-applies all labels */
function toggleLang() {
  lang = lang === 'en' ? 'fr' : 'en';
  document.getElementById('langBtn').textContent = lang === 'en' ? 'FR' : 'EN';
  applyLang();
}


/* ── 6. Screen navigation ──────────────────────────────────── */

/* Hides all screens then makes the requested one visible */
function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}


/* ── 7. Setup screen — player management ───────────────────── */

/* Returns the first two characters of a name as uppercase initials
   (used for avatar circles throughout the app) */
function initials(name) {
  return name.trim().slice(0, 2).toUpperCase();
}

/* Reads the input field, creates a player object, and refreshes the list */
function addPlayer() {
  const input = document.getElementById('playerInput');
  const name  = input.value.trim();
  if (!name) return; // Ignore empty input
  players.push({ name, id: Date.now() + Math.random() });
  input.value = '';
  renderPlayerList();
  input.focus(); // Keep focus so the host can quickly add the next player
}

/* Removes a player by index and re-renders the list */
function removePlayer(index) {
  players.splice(index, 1);
  renderPlayerList();
}

/* Rebuilds the player list DOM from the players[] array */
function renderPlayerList() {
  const list = document.getElementById('playerList');
  list.innerHTML = '';

  players.forEach((player, index) => {
    const row = document.createElement('div');
    row.className = 'player-item';
    row.innerHTML = `
      <span style="display:flex;align-items:center;gap:10px">
        <span style="
          width:28px;height:28px;border-radius:50%;
          background:rgba(216,90,48,0.1);
          display:flex;align-items:center;justify-content:center;
          font-family:var(--font-display);font-size:11px;font-weight:700;
          color:var(--coral);flex-shrink:0
        ">${initials(player.name)}</span>
        <span style="font-size:14px;font-weight:500">${player.name}</span>
      </span>
      <button class="remove-btn" onclick="removePlayer(${index})">×</button>
    `;
    list.appendChild(row);
  });
}

/* Validates the player count then advances to the config screen */
function goToConfig() {
  if (players.length < 3) { alert(t('min-players')); return; }
  undercovers = suggestUndercovers(players.length);
  document.getElementById('underCount').textContent = undercovers;
  updateUnderSug();
  suggestWords();
  goTo('screen-config');
  applyLang();
}


/* ── 8. Config screen — undercover count & word pair ───────── */

/* Returns the recommended number of undercovers based on player count:
   1 for ≤5 players, 2 for 6–9, 3 for 10+ */
function suggestUndercovers(playerCount) {
  if (playerCount <= 5) return 1;
  if (playerCount <= 9) return 2;
  return 3;
}

/* Updates the "(suggested: N)" hint next to the counter */
function updateUnderSug() {
  const suggested = suggestUndercovers(players.length);
  const el = document.getElementById('underSug');
  if (el) el.textContent = `(${t('suggested')}: ${suggested})`;
}

/* Increments or decrements the undercover count, clamped between 1
   and (players − 1 − mrWhite), so there is always at least one civilian */
function changeUnder(delta) {
  const mrWhiteActive = document.getElementById('mrWhiteToggle').checked ? 1 : 0;
  const max = Math.max(1, players.length - 1 - mrWhiteActive);
  undercovers = Math.max(1, Math.min(max, undercovers + delta));
  document.getElementById('underCount').textContent = undercovers;
}

/* Picks a random word pair from the database and fills the two input fields */
function suggestWords() {
  const pair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
  document.getElementById('word1').value = pair[0];
  document.getElementById('word2').value = pair[1];
}


/* ── 9. Role assignment ────────────────────────────────────── */

/* Shuffles the player roster, then assigns roles:
   - First N players (shuffled) become undercover
   - Next player becomes Mr. White (if enabled)
   - All remaining players are civilians
   The final roles[] array is shuffled again so the pass-phone
   order doesn't reveal information. */
function assignRoles() {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  mrWhite = document.getElementById('mrWhiteToggle').checked;
  word1   = document.getElementById('word1').value.trim();
  word2   = document.getElementById('word2').value.trim();

  /* Start with everyone as civilian */
  let pool = shuffled.map(p => ({ ...p, role: 'civilian', word: word1 }));

  /* Overwrite the first N with undercover */
  for (let i = 0; i < undercovers; i++) {
    pool[i].role = 'undercover';
    pool[i].word = word2;
  }

  /* Overwrite the next slot with Mr. White (no word) */
  if (mrWhite && pool.length > undercovers) {
    pool[undercovers].role = 'mrwhite';
    pool[undercovers].word = '';
  }

  /* Shuffle one more time so pass order is random */
  roles = pool.sort(() => Math.random() - 0.5);
}

/* Validates inputs then kicks off the pass-phone flow */
function startPassPhone() {
  if (players.length < 3) { alert(t('min-players')); return; }
  const w1 = document.getElementById('word1').value.trim();
  const w2 = document.getElementById('word2').value.trim();
  if (!w1 || !w2) { alert(t('words-needed')); return; }
  const mrWhiteSlot = document.getElementById('mrWhiteToggle').checked ? 1 : 0;
  if (undercovers + mrWhiteSlot >= players.length) { alert(t('under-limit')); return; }

  /* Assign roles and reset all per-game counters */
  assignRoles();
  passIndex    = 0;
  eliminated   = [];
  round        = 1;
  recheckCount = 0;

  goTo('screen-pass');
  showPassScreen();
}


/* ── 10. Pass-phone flow ───────────────────────────────────── */

/* Shows the pass card for the current player (passIndex).
   When all players have seen their role, moves to the game screen. */
function showPassScreen() {
  if (passIndex >= roles.length) {
    goTo('screen-game');
    renderGameScreen();
    return;
  }
  const current = roles[passIndex];
  document.getElementById('passName').textContent     = current.name;
  document.getElementById('passInitials').textContent = initials(current.name);
  applyLang();
}

/* Shows the role reveal screen for the current player */
function revealRole() {
  const current = roles[passIndex];

  /* Set the role badge colour and label */
  const badge = document.getElementById('roleBadge');
  badge.className  = 'role-badge role-' + current.role;
  badge.textContent = t('role-' + current.role);

  /* Show word or "no word" message */
  document.getElementById('roleWord').textContent =
    current.role === 'mrwhite' ? t('no-word') : current.word;

  /* Show the role-specific objective description */
  document.getElementById('roleDesc').textContent = t('desc-' + current.role);

  goTo('screen-reveal');
}

/* Moves to the next player in the pass-phone sequence */
function nextPassPlayer() {
  passIndex++;
  goTo('screen-pass');
  showPassScreen();
}


/* ── 11. Game screen rendering ─────────────────────────────── */

/* Rebuilds the in-game player list and updates the round counter */
function renderGameScreen() {
  document.getElementById('roundNum').textContent = round;
  updateRecheckInfo();

  /* Update the meta line (active / eliminated counts) */
  const activePlayers = roles.filter(r => !eliminated.find(e => e.id === r.id));
  document.getElementById('gameMeta').innerHTML =
    `${activePlayers.length} ${t('active')}<br>${eliminated.length} ${lang === 'fr' ? 'éliminés' : 'eliminated'}`;

  /* Rebuild the player rows */
  const list = document.getElementById('gamePlayerList');
  list.innerHTML = '';

  roles.forEach(role => {
    const isEliminated = eliminated.find(e => e.id === role.id);
    const elimIndex    = eliminated.findIndex(e => e.id === role.id);

    const row = document.createElement('div');
    row.className = 'player-game-row' + (isEliminated ? ' eliminated' : '');

    /* Avatar colour differs for eliminated players */
    const avatarBg    = isEliminated ? 'rgba(200,168,130,0.2)' : 'rgba(216,90,48,0.1)';
    const avatarColor = isEliminated ? 'var(--brown-pale)'     : 'var(--coral)';
    const rightSide   = isEliminated
      ? `<span class="elim-badge">#${elimIndex + 1}</span>`
      : `<span class="alive-dot"></span>`;

    row.innerHTML = `
      <span style="display:flex;align-items:center;gap:10px">
        <span style="
          width:28px;height:28px;border-radius:50%;
          background:${avatarBg};
          display:flex;align-items:center;justify-content:center;
          font-family:var(--font-display);font-size:11px;font-weight:700;
          color:${avatarColor};flex-shrink:0
        ">${initials(role.name)}</span>
        <span class="player-game-name">${role.name}</span>
      </span>
      ${rightSide}
    `;
    list.appendChild(row);
  });
}

/* Updates the "N role checks used" counter below the player list */
function updateRecheckInfo() {
  const el = document.getElementById('recheckInfo');
  if (el) el.textContent = recheckCount + ' ' + t('rechecks');
}


/* ── 12. Role recheck ──────────────────────────────────────── */

/* Opens the recheck screen and populates it with active players only */
function openRecheck() {
  const list = document.getElementById('recheckList');
  list.innerHTML = '';

  const activePlayers = roles.filter(r => !eliminated.find(e => e.id === r.id));
  activePlayers.forEach(role => {
    const btn = document.createElement('button');
    btn.className = 'modal-player-btn';
    btn.innerHTML = `
      <span class="modal-avatar">${initials(role.name)}</span>
      <span class="modal-player-name">${role.name}</span>
    `;
    btn.onclick = () => showRecheckRole(role);
    list.appendChild(btn);
  });

  goTo('screen-recheck');
}

/* Shows a bottom-sheet modal with the player's role and word,
   then increments the recheck counter */
function showRecheckRole(role) {
  recheckCount++;

  const roleLine = role.role === 'mrwhite'
    ? t('no-word')
    : `${t('your-word')}: ${role.word}`;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const box = document.createElement('div');
  box.className = 'modal-box';
  box.innerHTML = `
    <div class="modal-title">${role.name}</div>
    <div style="
      display:flex;align-items:center;gap:10px;margin-bottom:20px;
      padding:12px 14px;background:var(--card-bg);
      border:1.5px solid var(--card-border);border-radius:var(--r)
    ">
      <span class="role-badge role-${role.role}" style="margin-bottom:0">
        ${t('role-' + role.role)}
      </span>
      <span style="font-size:14px;color:var(--brown)">${roleLine}</span>
    </div>
    <div class="modal-btns">
      <button class="btn btn-primary" style="width:100%"
        onclick="closeModal();updateRecheckInfo()">OK</button>
    </div>
  `;

  overlay.appendChild(box);
  document.getElementById('modalContainer').appendChild(overlay);
}

/* Removes any open modal from the DOM */
function closeModal() {
  document.getElementById('modalContainer').innerHTML = '';
}


/* ── 13. Elimination & win condition ───────────────────────── */

/* Opens the elimination picker modal listing all active players */
function openEliminate() {
  const activePlayers = roles.filter(r => !eliminated.find(e => e.id === r.id));

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const box = document.createElement('div');
  box.className = 'modal-box';
  box.innerHTML = `<div class="modal-title">${t('elim-prompt')}</div>`;

  /* One button per active player */
  activePlayers.forEach(role => {
    const btn = document.createElement('button');
    btn.className = 'modal-player-btn';
    btn.innerHTML = `
      <span class="modal-avatar">${initials(role.name)}</span>
      <span class="modal-player-name">${role.name}</span>
    `;
    btn.onclick = () => { closeModal(); eliminatePlayer(role); };
    box.appendChild(btn);
  });

  /* Cancel button at the bottom */
  const cancel = document.createElement('button');
  cancel.className      = 'btn btn-danger';
  cancel.style.marginTop = '4px';
  cancel.textContent    = t('elim-cancel');
  cancel.onclick        = closeModal;
  box.appendChild(cancel);

  overlay.appendChild(box);
  document.getElementById('modalContainer').appendChild(overlay);
}

/* Adds the player to the eliminated list, increments round,
   then checks for Mr. White guess or regular win condition */
function eliminatePlayer(role) {
  eliminated.push(role);
  round++;

  if (role.role === 'mrwhite') {
    /* Special case: Mr. White gets to guess the civilian word */
    askMrWhiteGuess(role);
  } else {
    checkGameEnd();
  }
}

/* Shows a yes/no modal asking the host whether Mr. White guessed correctly */
function askMrWhiteGuess(role) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const box = document.createElement('div');
  box.className = 'modal-box';
  box.innerHTML = `
    <div class="modal-title">${role.name} — ${t('role-mrwhite')}</div>
    <div style="font-size:13px;color:var(--brown-light);margin-bottom:20px;font-weight:300">
      ${t('mrw-guess')}
    </div>
    <div class="modal-btns">
      <button class="btn btn-primary" onclick="closeModal();endGame('mrwhite')">
        ${t('yes-undercover')}
      </button>
      <button class="btn" onclick="closeModal();checkGameEnd()">
        ${t('no-continue')}
      </button>
    </div>
  `;

  overlay.appendChild(box);
  document.getElementById('modalContainer').appendChild(overlay);
}

/* Checks whether the game has been won:
   - Civilians win if all undercovers are eliminated
   - Undercovers win if their count equals or exceeds the civilian count
   - Otherwise the game continues */
function checkGameEnd() {
  const activePlayers   = roles.filter(r => !eliminated.find(e => e.id === r.id));
  const activeUndercover = activePlayers.filter(r => r.role === 'undercover');
  const activeCivilian   = activePlayers.filter(r => r.role === 'civilian');

  if (activeUndercover.length === 0) {
    endGame('civilians');
  } else if (activeUndercover.length >= activeCivilian.length) {
    endGame('undercovers');
  } else {
    renderGameScreen(); // Game continues — refresh the board
  }
}


/* ── 14. End screen & restart options ──────────────────────── */

/* Populates and shows the end screen with the winner and game stats */
function endGame(winner) {
  goTo('screen-end');

  /* Winner message */
  const winMsg = winner === 'civilians'
    ? t('civilians-win')
    : winner === 'mrwhite'
      ? t('mrwhite-wins')
      : t('undercover-wins');

  document.getElementById('winnerTitle').textContent = winMsg;
  document.getElementById('winnerSub').textContent   = `${t('words-were')}: ${word1} / ${word2}`;

  /* Elimination order as "1. Alice · 2. Bob …" */
  const elimOrder = eliminated.map((p, i) => `${i + 1}. ${p.name}`).join(' · ');

  /* Stat rows */
  document.getElementById('endStats').innerHTML = `
    <div class="stat-row">
      <span class="stat-label">${t('words-were')}</span>
      <span class="stat-val">${word1} · ${word2}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">${t('elim-order')}</span>
      <span class="stat-val">${elimOrder || '—'}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">${t('rechecks')}</span>
      <span class="stat-val">${recheckCount}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">${lang === 'fr' ? 'Tours joués' : 'Rounds played'}</span>
      <span class="stat-val">${round - 1}</span>
    </div>
  `;

  applyLang();
}

/* Resets game state and returns to config for a new game with the same players */
function newGame() {
  eliminated   = [];
  round        = 1;
  recheckCount = 0;
  passIndex    = 0;
  undercovers  = suggestUndercovers(players.length);
  document.getElementById('underCount').textContent = undercovers;
  suggestWords();
  goTo('screen-config');
  applyLang();
}

/* Resets game state and returns to the player setup screen */
function editPlayers() {
  eliminated   = [];
  round        = 1;
  recheckCount = 0;
  renderPlayerList();
  goTo('screen-setup');
  applyLang();
}

/* Fully resets the app (clears players too) and returns to setup */
function quitGame() {
  players      = [];
  eliminated   = [];
  roles        = [];
  round        = 1;
  recheckCount = 0;
  renderPlayerList();
  goTo('screen-setup');
  applyLang();
}


/* ── 15. Initialisation ────────────────────────────────────── */
/* Apply translations once the page loads so all labels are correct
   from the very first render. */
applyLang();
