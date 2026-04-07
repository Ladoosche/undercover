/* =============================================================
   UNDERCOVER — Game logic
   Structure:
     1.  Background canvas drawing
     2.  Game state variables
     3.  Word pair database
     4.  Translation strings (EN / FR)
     5.  Language helpers
     6.  Screen navigation & player count badge
     7.  Setup screen — player management
     8.  Config screen — undercover count, word visibility & word pair
     9.  Role assignment
    10.  Pass-phone flow
    11.  Game screen rendering
    12.  Role recheck
    13.  Elimination & public role reveal
    14.  Win condition logic
    15.  End screen & restart options
    16.  Initialisation
   ============================================================= */


/* ── 1. Background canvas drawing ──────────────────────────── */
/* Draws the warm illustrated background (circles, hatching lines,
   wave curves) on a <canvas> that sits behind the app frame.
   Called once on load and again on every window resize.        */

const bgCanvas = document.getElementById('bg-canvas');
const bgCtx    = bgCanvas.getContext('2d');

function drawBackground() {
  bgCanvas.width  = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  const w = bgCanvas.width;
  const h = bgCanvas.height;

  bgCtx.fillStyle = '#e8ddd0';
  bgCtx.fillRect(0, 0, w, h);

  /* Large soft circles layered for depth */
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

  /* Vertical hatching for a notebook-paper texture */
  bgCtx.strokeStyle = 'rgba(200,168,130,0.18)';
  bgCtx.lineWidth   = 0.8;
  for (let x = 0; x < w; x += 32) {
    bgCtx.beginPath();
    bgCtx.moveTo(x, 0);
    bgCtx.lineTo(x, h);
    bgCtx.stroke();
  }

  /* Small scattered polygon accents */
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

drawBackground();
window.addEventListener('resize', drawBackground);


/* ── 2. Game state variables ───────────────────────────────── */

let lang         = navigator.language?.startsWith('fr') ? 'fr' : 'en';
let players      = [];    // { name, id }
let undercovers  = 1;     // How many undercover roles
let mrWhite      = false; // Whether Mr. White is enabled
let wordsHidden  = false; // Whether words are hidden from everyone including host
let word1        = '';    // The civilian word
let word2        = '';    // The undercover word
let roles        = [];    // { name, id, role, word } — assigned at game start
let passIndex    = 0;     // Index in roles[] for pass-phone flow
let round        = 1;
let eliminated   = [];    // Players voted out in order
let recheckCount = 0;     // Times "Check word" used this game


/* ── 3. Word pair database ─────────────────────────────────── */
/* First word = civilian, second = undercover.                  */

const wordPairs = [
  ['Coffee','Tea'],       ['Cat','Dog'],          ['Pizza','Burger'],
  ['Beach','Pool'],       ['Wine','Beer'],         ['Bus','Metro'],
  ['Book','Magazine'],    ['Cinema','Theatre'],    ['Guitar','Piano'],
  ['Sushi','Tacos'],      ['Snow','Rain'],          ['Jacket','Coat'],
  ['Castle','Palace'],    ['River','Lake'],         ['Cheese','Butter'],
  ['Doctor','Nurse'],     ['Lion','Tiger'],         ['Sunrise','Sunset'],
  ['Train','Plane'],      ['Milk','Juice'],         ['Paris','Rome'],
  ['Shark','Dolphin'],    ['Violin','Cello'],       ['Chess','Checkers'],
  ['Whisky','Rum'],       ['Candle','Lamp'],        ['Forest','Jungle'],
  ['Bread','Croissant'],  ['Museum','Gallery'],     ['Sword','Knife'],
];


/* ── 4. Translation strings (EN / FR) ──────────────────────── */
/* "Mr. White" stays "Mr. White" in French as requested.        */

const translations = {
  en: {
    'setup':              'Players',
    'setup-sub':          'Add everyone playing tonight',
    'config':             'Settings',
    'config-sub':         'Configure the game',
    'pass-title':         'Your turn',
    'pass-sub':           'Pass the phone to this player',
    'pass-hint':          'Tap below to see your word — keep it secret!',
    'reveal-title':       'Your word',
    'reveal-sub':         'Memorise this, then hide it',
    'recheck-title':      'What is your word?',
    'recheck-sub':        'Tap your name to see your word again',
    'end-title':          'Game over',
    'next1':              'Next →',
    'back1':              '← Back',
    'start':              'Start game',
    'reveal':             'See my word',
    'hide':               'Hide & pass →',
    'recheck':            'Check word',
    'elim':               'Eliminate',
    'back-game':          '← Back',
    'newgame':            'New game — new words',
    'editplayers':        'Edit players',
    'quit':               'Quit',
    'suggest':            '↻ Suggest a pair',
    'undercov-label':     'Undercovers',
    'mrw':                'Mr. White',
    'words-label':        'Word pair',
    'civilian-word':      'Civilian word',
    'undercover-word':    'Undercover word',
    'suggested':          'suggested',
    'words-hidden-label': 'Hide words from everyone',
    'role-civilian':      'Civilian',
    'role-undercover':    'Undercover',
    'role-mrwhite':       'Mr. White',
    'your-word':          'Your word',
    'no-word':            'You have no word.',
    'desc-civilian':      'Describe your word without being too obvious.',
    'desc-undercover':    'Listen carefully and blend in.',
    'desc-mrwhite':       'You have no word. Listen and try to figure it out.',
    'round-label':        'Round',
    'players-label':      'players',
    'active':             'active',
    'rechecks':           'word checks used',
    'elim-order':         'Elimination order',
    'words-were':         'Words',
    'revealed-role':      'Role revealed',
    'elim-prompt':        'Who was voted out?',
    'elim-cancel':        'Cancel',
    'mrw-guess':          'Did Mr. White guess the civilian word correctly?',
    'yes-mrwhite-wins':   'Yes — Mr. White wins!',
    'no-continue':        'No — continue',
    'civilians-win':      'Civilians win!',
    'undercover-wins':    'Undercovers win!',
    'mrwhite-wins':       'Mr. White wins!',
    'err-min-players':    'You need at least 3 players to start.',
    'err-words-needed':   'Please enter both words before starting.',
    'err-under-limit':    'Too many special roles — there must be at least one civilian.',
    'rounds-played':      'Rounds played',
    'words-hidden-note':  'A random pair is locked in — no one sees it.',
    'words-visible-note': 'The host sets the words below.',
  },
  fr: {
    'setup':              'Joueurs',
    'setup-sub':          'Ajoutez tous les joueurs',
    'config':             'Paramètres',
    'config-sub':         'Configurer la partie',
    'pass-title':         'À toi',
    'pass-sub':           'Passe le téléphone à ce joueur',
    'pass-hint':          'Appuie ci-dessous pour voir ton mot — garde le secret !',
    'reveal-title':       'Ton mot',
    'reveal-sub':         'Mémorise, puis cache',
    'recheck-title':      'Quel est ton mot ?',
    'recheck-sub':        'Appuie sur ton nom pour revoir ton mot',
    'end-title':          'Fin de partie',
    'next1':              'Suivant →',
    'back1':              '← Retour',
    'start':              'Lancer la partie',
    'reveal':             'Voir mon mot',
    'hide':               'Cacher & passer →',
    'recheck':            'Revoir mon mot',
    'elim':               'Éliminer',
    'back-game':          '← Retour',
    'newgame':            'Nouvelle partie — nouveaux mots',
    'editplayers':        'Modifier les joueurs',
    'quit':               'Quitter',
    'suggest':            '↻ Suggérer une paire',
    'undercov-label':     'Infiltrés',
    'mrw':                'Mr. White',
    'words-label':        'Paire de mots',
    'civilian-word':      'Mot des civils',
    'undercover-word':    'Mot des infiltrés',
    'suggested':          'suggéré',
    'words-hidden-label': 'Cacher les mots à tous',
    'role-civilian':      'Civil',
    'role-undercover':    'Infiltré',
    'role-mrwhite':       'Mr. White',
    'your-word':          'Ton mot',
    'no-word':            'Tu n\'as pas de mot.',
    'desc-civilian':      'Décris ton mot sans être trop évident.',
    'desc-undercover':    'Écoute attentivement et fonds-toi dans la masse.',
    'desc-mrwhite':       'Tu n\'as pas de mot. Écoute et essaie de le deviner.',
    'round-label':        'Tour',
    'players-label':      'joueurs',
    'active':             'actif',
    'rechecks':           'vérifications utilisées',
    'elim-order':         'Ordre d\'élimination',
    'words-were':         'Mots',
    'revealed-role':      'Rôle révélé',
    'elim-prompt':        'Qui a été éliminé ?',
    'elim-cancel':        'Annuler',
    'mrw-guess':          'Mr. White a-t-il deviné le mot des civils ?',
    'yes-mrwhite-wins':   'Oui — Mr. White gagne !',
    'no-continue':        'Non — continuer',
    'civilians-win':      'Les civils gagnent !',
    'undercover-wins':    'Les infiltrés gagnent !',
    'mrwhite-wins':       'Mr. White gagne !',
    'err-min-players':    'Il faut au moins 3 joueurs pour commencer.',
    'err-words-needed':   'Veuillez saisir les deux mots avant de commencer.',
    'err-under-limit':    'Trop de rôles spéciaux — il faut au moins un civil.',
    'rounds-played':      'Tours joués',
    'words-hidden-note':  'Une paire aléatoire est choisie — personne ne la voit.',
    'words-visible-note': 'L\'hôte choisit les mots ci-dessous.',
  },
};


/* ── 5. Language helpers ───────────────────────────────────── */

function t(key) {
  return (translations[lang] || translations.en)[key] || key;
}

/* Updates all t-* elements and refreshes dynamic labels */
function applyLang() {
  const keys = [
    'setup','setup-sub','next1','config','config-sub','undercov-label','mrw',
    'words-label','civilian-word','undercover-word','suggest','back1','start',
    'pass-title','pass-sub','pass-hint','reveal','reveal-title','reveal-sub',
    'hide','round-label','recheck','elim','recheck-title','recheck-sub',
    'back-game','end-title','newgame','editplayers','quit','words-hidden-label',
  ];
  keys.forEach(key => {
    const el = document.getElementById('t-' + key);
    if (el) el.textContent = t(key);
  });
  updateUnderSug();
  updateRecheckInfo();
  updatePlayerCountBadges();
}

function toggleLang() {
  lang = lang === 'en' ? 'fr' : 'en';
  document.getElementById('langBtn').textContent = lang === 'en' ? 'FR' : 'EN';
  applyLang();
}


/* ── 6. Screen navigation & player count badge ─────────────── */

function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

/* Refreshes all .player-count-badge elements on every screen.
   Hidden on the setup screen itself since the list is already visible. */
function updatePlayerCountBadges() {
  const count = players.length;
  document.querySelectorAll('.player-count-badge').forEach(el => {
    el.textContent = count + ' ' + t('players-label');
    el.style.visibility = el.closest('#screen-setup') ? 'hidden' : 'visible';
  });
}

/* Shows a styled inline error banner inside a given container.
   Auto-dismisses after 4 s. Replaces browser alert() entirely. */
function showError(containerId, message) {
  const existing = document.getElementById('err-' + containerId);
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'err-' + containerId;
  el.className = 'error-msg';
  el.textContent = message;
  const container = document.getElementById(containerId);
  if (container) container.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.remove(); }, 4000);
}

function clearError(containerId) {
  const el = document.getElementById('err-' + containerId);
  if (el) el.remove();
}


/* ── 7. Setup screen — player management ───────────────────── */

function initials(name) {
  return name.trim().slice(0, 2).toUpperCase();
}

function addPlayer() {
  const input = document.getElementById('playerInput');
  const name  = input.value.trim();
  if (!name) return;
  players.push({ name, id: Date.now() + Math.random() });
  input.value = '';
  renderPlayerList();
  updatePlayerCountBadges();
  clearError('setup-error-box');
  input.focus();
}

function removePlayer(index) {
  players.splice(index, 1);
  renderPlayerList();
  updatePlayerCountBadges();
}

function renderPlayerList() {
  const list = document.getElementById('playerList');
  list.innerHTML = '';
  players.forEach((player, index) => {
    const row = document.createElement('div');
    row.className = 'player-item';
    row.innerHTML = `
      <span style="display:flex;align-items:center;gap:10px">
        <span style="width:28px;height:28px;border-radius:50%;background:rgba(216,90,48,0.1);
          display:flex;align-items:center;justify-content:center;
          font-family:var(--font-display);font-size:11px;font-weight:700;
          color:var(--coral);flex-shrink:0">${initials(player.name)}</span>
        <span style="font-size:14px;font-weight:500">${player.name}</span>
      </span>
      <button class="remove-btn" onclick="removePlayer(${index})">×</button>
    `;
    list.appendChild(row);
  });
}

function goToConfig() {
  if (players.length < 3) {
    showError('setup-error-box', t('err-min-players'));
    return;
  }
  clearError('setup-error-box');
  undercovers = suggestUndercovers(players.length);
  document.getElementById('underCount').textContent = undercovers;
  document.getElementById('hideWordsToggle').checked = false;
  wordsHidden = false;
  pickHiddenWords();     /* Pre-generate a hidden pair just in case */
  updateWordVisibilityUI();
  updateUnderSug();
  goTo('screen-config');
  applyLang();
}


/* ── 8. Config screen — undercover count, word visibility & words ── */

function suggestUndercovers(n) {
  if (n <= 5) return 1;
  if (n <= 9) return 2;
  return 3;
}

function updateUnderSug() {
  const suggested = suggestUndercovers(players.length);
  const el = document.getElementById('underSug');
  if (el) el.textContent = `(${t('suggested')}: ${suggested})`;
}

/* Clamps undercover count so at least one civilian always exists */
function changeUnder(delta) {
  const mrWhiteActive = document.getElementById('mrWhiteToggle').checked ? 1 : 0;
  const max = Math.max(1, players.length - 1 - mrWhiteActive);
  undercovers = Math.max(1, Math.min(max, undercovers + delta));
  document.getElementById('underCount').textContent = undercovers;
}

/* Silently picks and stores a random pair — used when words are hidden */
function pickHiddenWords() {
  const pair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
  word1 = pair[0];
  word2 = pair[1];
}

/* Fills the visible word inputs with a random pair */
function suggestWords() {
  const pair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
  document.getElementById('word1').value = pair[0];
  document.getElementById('word2').value = pair[1];
}

/* Shows or hides the word input section based on the checkbox state */
function updateWordVisibilityUI() {
  wordsHidden = document.getElementById('hideWordsToggle') &&
                document.getElementById('hideWordsToggle').checked;
  const visibleSection = document.getElementById('wordVisibleSection');
  const hiddenNote     = document.getElementById('wordHiddenNote');
  if (!visibleSection || !hiddenNote) return;

  if (wordsHidden) {
    visibleSection.style.display = 'none';
    hiddenNote.style.display     = 'block';
  } else {
    visibleSection.style.display = 'block';
    hiddenNote.style.display     = 'none';
    /* Pre-fill if fields are empty */
    if (!document.getElementById('word1').value &&
        !document.getElementById('word2').value) {
      suggestWords();
    }
  }
}

/* Called when the hide-words checkbox changes */
function onHideWordsChange() {
  if (document.getElementById('hideWordsToggle').checked) {
    pickHiddenWords(); /* Lock in silently right away */
  }
  updateWordVisibilityUI();
}

function startPassPhone() {
  if (players.length < 3) {
    showError('config-error-box', t('err-min-players'));
    return;
  }
  if (!wordsHidden) {
    const w1 = document.getElementById('word1').value.trim();
    const w2 = document.getElementById('word2').value.trim();
    if (!w1 || !w2) {
      showError('config-error-box', t('err-words-needed'));
      return;
    }
    word1 = w1;
    word2 = w2;
  }
  /* If wordsHidden, word1/word2 already set by pickHiddenWords() */
  const mrWhiteActive = document.getElementById('mrWhiteToggle').checked ? 1 : 0;
  if (undercovers + mrWhiteActive >= players.length) {
    showError('config-error-box', t('err-under-limit'));
    return;
  }
  clearError('config-error-box');
  assignRoles();
  passIndex    = 0;
  eliminated   = [];
  round        = 1;
  recheckCount = 0;
  goTo('screen-pass');
  showPassScreen();
}


/* ── 9. Role assignment ────────────────────────────────────── */

/* Shuffles the roster, assigns roles, shuffles again so the
   pass order doesn't hint at role distribution.              */
function assignRoles() {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  mrWhite = document.getElementById('mrWhiteToggle').checked;

  let pool = shuffled.map(p => ({ ...p, role: 'civilian', word: word1 }));

  for (let i = 0; i < undercovers; i++) {
    pool[i].role = 'undercover';
    pool[i].word = word2;
  }

  if (mrWhite && pool.length > undercovers) {
    pool[undercovers].role = 'mrwhite';
    pool[undercovers].word = '';
  }

  roles = pool.sort(() => Math.random() - 0.5);
}


/* ── 10. Pass-phone flow ───────────────────────────────────── */

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

/* Players see ONLY their word — the role label is intentionally hidden.
   Role is only revealed publicly when a player is eliminated.           */
function revealRole() {
  const current = roles[passIndex];

  /* Hide the badge — role stays secret until elimination */
  const badge = document.getElementById('roleBadge');
  badge.className   = '';
  badge.textContent = '';
  badge.style.display = 'none';

  /* Show the word (or "no word" for Mr. White) */
  document.getElementById('roleWord').textContent =
    current.role === 'mrwhite' ? t('no-word') : current.word;

  /* Behavioural hint — written neutrally so it doesn't name the role */
  document.getElementById('roleDesc').textContent = t('desc-' + current.role);

  goTo('screen-reveal');
}

function nextPassPlayer() {
  passIndex++;
  goTo('screen-pass');
  showPassScreen();
}


/* ── 11. Game screen rendering ─────────────────────────────── */

function renderGameScreen() {
  document.getElementById('roundNum').textContent = round;
  updateRecheckInfo();

  const activePlayers = roles.filter(r => !eliminated.find(e => e.id === r.id));
  /* Player count + active count shown in the game meta area */
  document.getElementById('gameMeta').innerHTML =
    `${players.length} ${t('players-label')}<br>${activePlayers.length} ${t('active')}`;

  const list = document.getElementById('gamePlayerList');
  list.innerHTML = '';

  roles.forEach(role => {
    const isElim  = eliminated.find(e => e.id === role.id);
    const elimIdx = eliminated.findIndex(e => e.id === role.id);
    const row     = document.createElement('div');
    row.className = 'player-game-row' + (isElim ? ' eliminated' : '');

    const avatarBg    = isElim ? 'rgba(200,168,130,0.2)' : 'rgba(216,90,48,0.1)';
    const avatarColor = isElim ? 'var(--brown-pale)'     : 'var(--coral)';
    const rightSide   = isElim
      ? `<span class="elim-badge">#${elimIdx + 1}</span>`
      : `<span class="alive-dot"></span>`;

    row.innerHTML = `
      <span style="display:flex;align-items:center;gap:10px">
        <span style="width:28px;height:28px;border-radius:50%;
          background:${avatarBg};display:flex;align-items:center;justify-content:center;
          font-family:var(--font-display);font-size:11px;font-weight:700;
          color:${avatarColor};flex-shrink:0">${initials(role.name)}</span>
        <span class="player-game-name">${role.name}</span>
      </span>
      ${rightSide}
    `;
    list.appendChild(row);
  });
}

function updateRecheckInfo() {
  const el = document.getElementById('recheckInfo');
  if (el) el.textContent = recheckCount + ' ' + t('rechecks');
}


/* ── 12. Role recheck ──────────────────────────────────────── */

/* Opens the recheck screen — players see their WORD only, not their role */
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
    btn.onclick = () => showRecheckWord(role);
    list.appendChild(btn);
  });
  goTo('screen-recheck');
}

/* Bottom sheet showing only the player's word — role stays hidden */
function showRecheckWord(role) {
  recheckCount++;
  const wordLine = role.role === 'mrwhite'
    ? t('no-word')
    : `${t('your-word')}: ${role.word}`;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const box = document.createElement('div');
  box.className = 'modal-box';
  box.innerHTML = `
    <div class="modal-title">${role.name}</div>
    <div style="padding:12px 14px;margin-bottom:20px;background:var(--card-bg);
      border:1.5px solid var(--card-border);border-radius:var(--r);
      font-size:15px;font-weight:500;color:var(--brown)">${wordLine}</div>
    <div class="modal-btns">
      <button class="btn btn-primary" style="width:100%"
        onclick="closeModal();updateRecheckInfo()">OK</button>
    </div>
  `;
  overlay.appendChild(box);
  document.getElementById('modalContainer').appendChild(overlay);
}

function closeModal() {
  document.getElementById('modalContainer').innerHTML = '';
}


/* ── 13. Elimination & public role reveal ──────────────────── */

/* Scrollable elimination picker — overflow-y:auto handles 10+ players */
function openEliminate() {
  const activePlayers = roles.filter(r => !eliminated.find(e => e.id === r.id));

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  /* modal-box-scroll adds max-height + overflow-y:auto for long lists */
  const box = document.createElement('div');
  box.className = 'modal-box modal-box-scroll';
  box.innerHTML = `<div class="modal-title">${t('elim-prompt')}</div>`;

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

  const cancel = document.createElement('button');
  cancel.className       = 'btn btn-danger';
  cancel.style.marginTop = '4px';
  cancel.textContent     = t('elim-cancel');
  cancel.onclick         = closeModal;
  box.appendChild(cancel);

  overlay.appendChild(box);
  document.getElementById('modalContainer').appendChild(overlay);
}

/* Records the elimination and publicly reveals the role to everyone */
function eliminatePlayer(role) {
  eliminated.push(role);
  round++;
  showPublicRoleReveal(role);
}

/* Full public reveal shown to all players after an elimination.
   For Mr. White, includes the yes/no guess prompt immediately after. */
function showPublicRoleReveal(role) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const box = document.createElement('div');
  box.className = 'modal-box';

  const wordLine = role.role === 'mrwhite'
    ? t('no-word')
    : `${t('your-word')}: ${role.word}`;

  /* Build the common top section */
  let html = `
    <div style="font-size:11px;font-weight:500;letter-spacing:0.08em;
      color:var(--brown-light);text-transform:uppercase;margin-bottom:12px">
      ${t('revealed-role')}
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <span style="width:44px;height:44px;border-radius:50%;background:rgba(216,90,48,0.1);
        display:flex;align-items:center;justify-content:center;
        font-family:var(--font-display);font-size:16px;font-weight:700;
        color:var(--coral);flex-shrink:0">${initials(role.name)}</span>
      <div>
        <div style="font-size:18px;font-weight:600;
          font-family:var(--font-display);color:var(--brown);margin-bottom:4px">
          ${role.name}
        </div>
        <span class="role-badge role-${role.role}" style="margin:0;display:inline-block">
          ${t('role-' + role.role)}
        </span>
      </div>
    </div>
    <div style="padding:10px 14px;margin-bottom:16px;background:var(--card-bg);
      border:1.5px solid var(--card-border);border-radius:var(--r);
      font-size:14px;color:var(--brown-light)">${wordLine}</div>
  `;

  /* Mr. White gets a guess — host confirms verbally then taps yes/no */
  if (role.role === 'mrwhite') {
    html += `
      <div style="font-size:13px;color:var(--brown-light);margin-bottom:14px;font-weight:300">
        ${t('mrw-guess')}
      </div>
      <div class="modal-btns">
        <button class="btn btn-primary"
          onclick="closeModal();endGame('mrwhite')">${t('yes-mrwhite-wins')}</button>
        <button class="btn"
          onclick="closeModal();checkGameEnd()">${t('no-continue')}</button>
      </div>
    `;
  } else {
    html += `
      <div class="modal-btns">
        <button class="btn btn-primary" style="width:100%"
          onclick="closeModal();checkGameEnd()">OK</button>
      </div>
    `;
  }

  box.innerHTML = html;
  overlay.appendChild(box);
  document.getElementById('modalContainer').appendChild(overlay);
}


/* ── 14. Win condition logic ───────────────────────────────── */
/*
  Rules:
  - Civilians win  → all undercovers eliminated (Mr. White must also be gone)
  - Undercovers win → no civilians left, or 1 undercover + 1 civilian remain
                      (Mr. White still alive counts as an undercover ally)
  - Mr. White wins  → correctly guesses the civilian word on elimination
*/
function checkGameEnd() {
  const active           = roles.filter(r => !eliminated.find(e => e.id === r.id));
  const activeUndercover = active.filter(r => r.role === 'undercover');
  const activeCivilian   = active.filter(r => r.role === 'civilian');
  const activeMrWhite    = active.filter(r => r.role === 'mrwhite');

  /* Civilians win only when ALL undercovers are gone */
  if (activeUndercover.length === 0 && activeMrWhite.length === 0) {
    endGame('civilians');
    return;
  }

  /* If undercovers are gone but Mr. White is still alive, civilians haven't won yet —
     Mr. White needs to be voted out too (he wins with undercovers if still alive).
     So if only Mr. White remains against civilians, treat as undercover win. */
  if (activeUndercover.length === 0 && activeMrWhite.length > 0) {
    /* Mr. White alone vs civilians — undercover side wins */
    endGame('undercovers');
    return;
  }

  /* Undercovers win when they match or outnumber civilians (Mr. White counts as civilian-agnostic) */
  if (activeUndercover.length >= activeCivilian.length) {
    endGame('undercovers');
    return;
  }

  /* 1 undercover + 1 civilian remain — undercovers win regardless */
  if (activeUndercover.length === 1 && activeCivilian.length === 1) {
    endGame('undercovers');
    return;
  }

  renderGameScreen();
}


/* ── 15. End screen & restart options ──────────────────────── */

function endGame(winner) {
  goTo('screen-end');

  const winMsg = winner === 'civilians'
    ? t('civilians-win')
    : winner === 'mrwhite'
      ? t('mrwhite-wins')
      : t('undercover-wins');

  document.getElementById('winnerTitle').textContent = winMsg;
  /* Always reveal the words at the end */
  document.getElementById('winnerSub').textContent = `${t('words-were')}: ${word1} / ${word2}`;

  /* One player per line with role badge — as requested */
  const elimLines = eliminated.map((p, i) => `
    <div class="stat-elim-row">
      <span class="stat-elim-num">${i + 1}.</span>
      <span class="stat-elim-name">${p.name}</span>
      <span class="role-badge role-${p.role}" style="margin:0;font-size:11px;padding:2px 10px">
        ${t('role-' + p.role)}
      </span>
    </div>
  `).join('');

  document.getElementById('endStats').innerHTML = `
    <div class="stat-row">
      <span class="stat-label">${t('words-were')}</span>
      <span class="stat-val">${word1} · ${word2}</span>
    </div>
    <div class="stat-section-label">${t('elim-order')}</div>
    <div class="stat-elim-list">
      ${elimLines || `<span style="color:var(--brown-light);font-size:13px">—</span>`}
    </div>
    <div class="stat-row" style="margin-top:8px">
      <span class="stat-label">${t('rechecks')}</span>
      <span class="stat-val">${recheckCount}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">${t('rounds-played')}</span>
      <span class="stat-val">${round - 1}</span>
    </div>
  `;

  applyLang();
}

/* Returns to config with same players, fresh word suggestion */
function newGame() {
  eliminated   = [];
  round        = 1;
  recheckCount = 0;
  passIndex    = 0;
  wordsHidden  = false;
  undercovers  = suggestUndercovers(players.length);
  document.getElementById('underCount').textContent = undercovers;
  document.getElementById('hideWordsToggle').checked = false;
  pickHiddenWords();
  updateWordVisibilityUI();
  goTo('screen-config');
  applyLang();
}

/* Returns to player list with game state cleared */
function editPlayers() {
  eliminated   = [];
  round        = 1;
  recheckCount = 0;
  renderPlayerList();
  goTo('screen-setup');
  applyLang();
}

/* Full factory reset */
function quitGame() {
  players      = [];
  eliminated   = [];
  roles        = [];
  round        = 1;
  recheckCount = 0;
  wordsHidden  = false;
  renderPlayerList();
  updatePlayerCountBadges();
  goTo('screen-setup');
  applyLang();
}


/* ── 16. Initialisation ────────────────────────────────────── */
applyLang();
