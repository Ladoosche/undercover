/* =============================================================
   UNDERCOVER — Game logic  (Sunny Coast theme)
   Structure:
     1.  Background canvas drawing
     2.  Game state variables
     3.  Word pair database
     4.  Translation strings (EN / FR) — fully bilingual
     5.  Language helpers
     6.  Screen navigation & player count badge
     7.  Intro screen
     8.  Setup screen — player management
     9.  Config screen — undercover count, word visibility & words
    10.  Role assignment
    11.  Pass-phone flow
    12.  Game screen rendering  (per-player recheck count badge)
    13.  Role recheck
    14.  Elimination & public role reveal
    15.  Win condition logic
    16.  End screen & restart options
    17.  Initialisation
   ============================================================= */


/* ── 1. Background canvas drawing ──────────────────────────── */
/* Sunny coast: sandy base, turquoise circles, wave lines.
   Redrawn on every window resize.                             */

const bgCanvas = document.getElementById('bg-canvas');
const bgCtx    = bgCanvas.getContext('2d');

function drawBackground() {
  bgCanvas.width  = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  const w = bgCanvas.width;
  const h = bgCanvas.height;

  /* Sandy base */
  bgCtx.fillStyle = '#e8e4d8';
  bgCtx.fillRect(0, 0, w, h);

  /* Turquoise ocean circles */
  const circles = [
    { x: 0.80, y: 0.05, r: 0.30, a: 0.12, c: '10,147,150' },
    { x: 0.10, y: 0.15, r: 0.22, a: 0.10, c: '0,119,182' },
    { x: 0.60, y: 0.70, r: 0.28, a: 0.08, c: '10,147,150' },
    { x: 0.05, y: 0.75, r: 0.18, a: 0.09, c: '0,119,182' },
    { x: 0.90, y: 0.55, r: 0.20, a: 0.07, c: '148,210,189' },
    { x: 0.40, y: 0.90, r: 0.22, a: 0.08, c: '10,147,150' },
  ];
  circles.forEach(c => {
    bgCtx.beginPath();
    bgCtx.arc(c.x * w, c.y * h, c.r * Math.min(w, h), 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(${c.c},${c.a})`;
    bgCtx.fill();
  });

  /* Subtle horizontal wave lines */
  bgCtx.lineWidth = 0.8;
  for (let i = 0; i < 8; i++) {
    const baseY = h * (0.55 + i * 0.06);
    bgCtx.strokeStyle = `rgba(10,147,150,${0.06 - i * 0.005})`;
    bgCtx.beginPath();
    for (let x = 0; x < w; x += 4) {
      const y = baseY + Math.sin(x * 0.018 + i) * 14 + Math.sin(x * 0.05 + i) * 6;
      x === 0 ? bgCtx.moveTo(x, y) : bgCtx.lineTo(x, y);
    }
    bgCtx.stroke();
  }

  /* Fine sand-texture dots */
  bgCtx.fillStyle = 'rgba(180,160,120,0.08)';
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 1 + Math.random() * 2;
    bgCtx.beginPath();
    bgCtx.arc(x, y, r, 0, Math.PI * 2);
    bgCtx.fill();
  }
}

drawBackground();
window.addEventListener('resize', drawBackground);


/* ── 2. Game state variables ───────────────────────────────── */

let lang         = navigator.language?.startsWith('fr') ? 'fr' : 'en';
let players      = [];    // { name, id }
let undercovers  = 1;
let mrWhite      = false;
let wordsHidden  = false; // True → words locked silently, never displayed
let word1        = '';    // Civilian word
let word2        = '';    // Undercover word
let roles        = [];    // { name, id, role, word, recheckCount }
let passIndex    = 0;
let round        = 1;
let eliminated   = [];    // Players voted out in order
let recheckCount = 0;     // Total word checks this game


/* ── 3. Word pair database ─────────────────────────────────── */
const wordPairs = [
  ['Coffee','Tea'],       ['Cat','Dog'],          ['Pizza','Burger'],
  ['Beach','Pool'],       ['Wine','Beer'],         ['Bus','Métro'],
  ['Book','Magazine'],    ['Cinema','Théâtre'],    ['Guitare','Piano'],
  ['Sushi','Tacos'],      ['Neige','Pluie'],       ['Veste','Manteau'],
  ['Château','Palais'],   ['Rivière','Lac'],        ['Fromage','Beurre'],
  ['Docteur','Infirmier'],['Lion','Tigre'],         ['Lever','Coucher'],
  ['Train','Avion'],      ['Lait','Jus'],           ['Paris','Rome'],
  ['Requin','Dauphin'],   ['Violon','Violoncelle'], ['Échecs','Dames'],
  ['Whisky','Rhum'],      ['Bougie','Lampe'],       ['Forêt','Jungle'],
  ['Pain','Croissant'],   ['Musée','Galerie'],      ['Épée','Couteau'],
];


/* ── 4. Translation strings (EN / FR) ──────────────────────── */
/* FULLY bilingual — every key has both EN and FR values.
   "Mr. White" stays "Mr. White" in French (per spec).         */

const translations = {
  en: {
    /* Intro screen */
    'intro-title':          'Undercover',
    'intro-tagline':        'A social deduction game',
    'intro-start':          'Play →',
    'intro-rule-civ-title': 'Civilians',
    'intro-rule-civ':       'Most players share a word. Describe it without being too obvious.',
    'intro-rule-spy-title': 'Undercovers',
    'intro-rule-spy':       'One or more players get a similar but different word. Blend in!',
    'intro-rule-mw-title':  'Mr. White',
    'intro-rule-mw':        'Optional role. No word at all — listen and try to guess.',
    'intro-rule-flow-title':'How to play',
    'intro-rule-flow':      'Each round, everyone gives a clue. Then vote to eliminate a suspect. Civilians win when all undercovers are gone. Undercovers win when civilians are out.',

    /* Setup */
    'setup':                'Players',
    'setup-sub':            'Add everyone playing tonight',
    'next1':                'Next →',

    /* Config */
    'config':               'Settings',
    'config-sub':           'Configure the game',
    'undercov-label':       'Undercovers',
    'mrw':                  'Mr. White',
    'words-label':          'Word pair',
    'civilian-word':        'Civilian word',
    'undercover-word':      'Undercover word',
    'suggested':            'suggested',
    'words-hidden-label':   'Hide words from everyone',
    'words-hidden-note':    'A random pair is locked in — no one sees it, including the host.',
    'suggest':              '↻ Suggest a pair',
    'back1':                '← Back',
    'start':                'Start game',

    /* Pass phone */
    'pass-title':           'Your turn',
    'pass-sub':             'Pass the phone to this player',
    'pass-hint':            'Tap below to see your word — keep it secret!',
    'reveal':               'See my word',

    /* Reveal */
    'reveal-title':         'Your word',
    'reveal-sub':           'Memorise this, then pass the phone',
    'hide':                 'Hide & pass →',

    /* Recheck */
    'recheck-title':        'What is your word?',
    'recheck-sub':          'Tap your name to see your word again',
    'recheck':              'Check word',
    'back-game':            '← Back',

    /* Game */
    'round-label':          'Round',
    'players-label':        'players',
    'active':               'active',
    'rechecks':             'word checks used',
    'elim':                 'Eliminate',

    /* Modals */
    'elim-prompt':          'Who was voted out?',
    'elim-cancel':          'Cancel',
    'revealed-role':        'Role revealed',
    'your-word':            'Word',
    'no-word':              'No word',
    'mrw-guess':            'Did Mr. White guess the civilian word?',
    'yes-mrwhite-wins':     'Yes — Mr. White wins!',
    'no-continue':          'No — continue',

    /* Role labels */
    'role-civilian':        'Civilian',
    'role-undercover':      'Undercover',
    'role-mrwhite':         'Mr. White',

    /* Word reveal screen hint (no role info) */
    'word-hint-regular':    'Memorise your word. Keep it secret!',
    'word-hint-mrwhite':    'You have no word. Listen carefully during the game.',

    /* Win messages */
    'civilians-win':        'Civilians win!',
    'undercover-wins':      'Undercovers win!',
    'mrwhite-wins':         'Mr. White wins!',

    /* End screen */
    'end-title':            'Game over',
    'words-were':           'Words',
    'elim-order':           'Elimination order',
    'rechecks-stat':        'Word checks',
    'rounds-played':        'Rounds played',
    'newgame':              'New game — new words',
    'editplayers':          'Edit players',
    'quit':                 'Quit',

    /* Errors */
    'err-min-players':      'You need at least 3 players to start.',
    'err-words-needed':     'Please enter both words before starting.',
    'err-under-limit':      'Too many special roles — at least one civilian is required.',
  },

  fr: {
    /* Intro */
    'intro-title':          'Undercover',
    'intro-tagline':        'Un jeu de déduction sociale',
    'intro-start':          'Jouer →',
    'intro-rule-civ-title': 'Civils',
    'intro-rule-civ':       'La plupart des joueurs partagent un mot. Décrivez-le sans être trop évident.',
    'intro-rule-spy-title': 'Infiltrés',
    'intro-rule-spy':       'Un ou plusieurs joueurs ont un mot similaire mais différent. Fondez-vous dans la masse !',
    'intro-rule-mw-title':  'Mr. White',
    'intro-rule-mw':        'Rôle optionnel. Aucun mot — écoutez et essayez de deviner.',
    'intro-rule-flow-title':'Comment jouer',
    'intro-rule-flow':      'Chaque tour, chacun donne un indice, puis on vote pour éliminer un suspect. Les civils gagnent quand tous les infiltrés sont éliminés. Les infiltrés gagnent quand il n\'y a plus de civils.',

    /* Setup */
    'setup':                'Joueurs',
    'setup-sub':            'Ajoutez tous les joueurs',
    'next1':                'Suivant →',

    /* Config */
    'config':               'Paramètres',
    'config-sub':           'Configurer la partie',
    'undercov-label':       'Infiltrés',
    'mrw':                  'Mr. White',
    'words-label':          'Paire de mots',
    'civilian-word':        'Mot des civils',
    'undercover-word':      'Mot des infiltrés',
    'suggested':            'suggéré',
    'words-hidden-label':   'Cacher les mots à tous',
    'words-hidden-note':    'Une paire est choisie au hasard — personne ne la voit, pas même l\'hôte.',
    'suggest':              '↻ Suggérer une paire',
    'back1':                '← Retour',
    'start':                'Lancer la partie',

    /* Pass phone */
    'pass-title':           'À toi',
    'pass-sub':             'Passe le téléphone à ce joueur',
    'pass-hint':            'Appuie ci-dessous pour voir ton mot — garde le secret !',
    'reveal':               'Voir mon mot',

    /* Reveal */
    'reveal-title':         'Ton mot',
    'reveal-sub':           'Mémorise, puis passe le téléphone',
    'hide':                 'Cacher & passer →',

    /* Recheck */
    'recheck-title':        'Quel est ton mot ?',
    'recheck-sub':          'Appuie sur ton nom pour revoir ton mot',
    'recheck':              'Revoir mon mot',
    'back-game':            '← Retour',

    /* Game */
    'round-label':          'Tour',
    'players-label':        'joueurs',
    'active':               'actifs',
    'rechecks':             'vérifications utilisées',
    'elim':                 'Éliminer',

    /* Modals */
    'elim-prompt':          'Qui a été éliminé ?',
    'elim-cancel':          'Annuler',
    'revealed-role':        'Rôle révélé',
    'your-word':            'Mot',
    'no-word':              'Aucun mot',
    'mrw-guess':            'Mr. White a-t-il deviné le mot des civils ?',
    'yes-mrwhite-wins':     'Oui — Mr. White gagne !',
    'no-continue':          'Non — continuer',

    /* Role labels */
    'role-civilian':        'Civil',
    'role-undercover':      'Infiltré',
    'role-mrwhite':         'Mr. White',

    /* Word reveal hint */
    'word-hint-regular':    'Mémorise ton mot. Garde-le secret !',
    'word-hint-mrwhite':    'Tu n\'as pas de mot. Écoute attentivement pendant la partie.',

    /* Win */
    'civilians-win':        'Les civils gagnent !',
    'undercover-wins':      'Les infiltrés gagnent !',
    'mrwhite-wins':         'Mr. White gagne !',

    /* End screen */
    'end-title':            'Fin de partie',
    'words-were':           'Mots',
    'elim-order':           'Ordre d\'élimination',
    'rechecks-stat':        'Vérifications de mots',
    'rounds-played':        'Tours joués',
    'newgame':              'Nouvelle partie — nouveaux mots',
    'editplayers':          'Modifier les joueurs',
    'quit':                 'Quitter',

    /* Errors */
    'err-min-players':      'Il faut au moins 3 joueurs pour commencer.',
    'err-words-needed':     'Veuillez saisir les deux mots avant de commencer.',
    'err-under-limit':      'Trop de rôles spéciaux — il faut au moins un civil.',
  },
};


/* ── 5. Language helpers ───────────────────────────────────── */

function t(key) {
  return (translations[lang] || translations.en)[key] || key;
}

/* Refreshes every element whose id is "t-KEY" and updates dynamic labels */
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

  /* Intro screen — these elements use data-i18n instead of id prefixes */
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });

  updateUnderSug();
  updateRecheckInfo();
  updatePlayerCountBadges();
  updateWordVisibilityUI();
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

/* Refreshes all .player-count-badge elements.
   Hidden (visibility:hidden) on the setup screen where the list is visible. */
function updatePlayerCountBadges() {
  const count = players.length;
  document.querySelectorAll('.player-count-badge').forEach(el => {
    el.textContent = count + ' ' + t('players-label');
    el.style.visibility = el.closest('#screen-setup') ? 'hidden' : 'visible';
  });
}

/* Shows a styled inline error banner; auto-dismisses after 4 s */
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


/* ── 7. Intro screen ───────────────────────────────────────── */
/* Navigates from the intro to the player setup screen */
function goToSetup() {
  goTo('screen-setup');
  applyLang();
}


/* ── 8. Setup screen — player management ───────────────────── */

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
        <span style="width:28px;height:28px;border-radius:50%;
          background:var(--teal-pale);
          display:flex;align-items:center;justify-content:center;
          font-family:var(--font-display);font-size:11px;font-weight:700;
          color:var(--teal-dark);flex-shrink:0">${initials(player.name)}</span>
        <span style="font-size:14px;font-weight:500;color:var(--navy)">${player.name}</span>
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
  pickHiddenWords();
  updateWordVisibilityUI();
  updateUnderSug();
  goTo('screen-config');
  applyLang();
}


/* ── 9. Config screen ──────────────────────────────────────── */

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

function changeUnder(delta) {
  const mwActive = document.getElementById('mrWhiteToggle').checked ? 1 : 0;
  const max = Math.max(1, players.length - 1 - mwActive);
  undercovers = Math.max(1, Math.min(max, undercovers + delta));
  document.getElementById('underCount').textContent = undercovers;
}

/* Silently picks a random pair and stores it — used when words are hidden.
   The pair is NEVER displayed anywhere when wordsHidden is true.          */
function pickHiddenWords() {
  const pair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
  word1 = pair[0];
  word2 = pair[1];
}

/* Fills the visible input fields with a random pair suggestion */
function suggestWords() {
  const pair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
  document.getElementById('word1').value = pair[0];
  document.getElementById('word2').value = pair[1];
}

/* Shows/hides the word input section based on the hide-words checkbox */
function updateWordVisibilityUI() {
  const toggle = document.getElementById('hideWordsToggle');
  wordsHidden = toggle ? toggle.checked : false;
  const visibleSection = document.getElementById('wordVisibleSection');
  const hiddenNote     = document.getElementById('wordHiddenNote');
  if (!visibleSection || !hiddenNote) return;

  if (wordsHidden) {
    /* Words are hidden — never show the inputs or their values */
    visibleSection.style.display = 'none';
    hiddenNote.style.display     = 'block';
    hiddenNote.textContent       = t('words-hidden-note');
  } else {
    visibleSection.style.display = 'block';
    hiddenNote.style.display     = 'none';
    /* Pre-fill if empty */
    if (!document.getElementById('word1').value &&
        !document.getElementById('word2').value) {
      suggestWords();
    }
  }
}

function onHideWordsChange() {
  if (document.getElementById('hideWordsToggle').checked) {
    pickHiddenWords(); /* Lock in silently */
    /* Clear visible inputs so they can't be read */
    document.getElementById('word1').value = '';
    document.getElementById('word2').value = '';
  }
  updateWordVisibilityUI();
}

function startPassPhone() {
  if (players.length < 3) { showError('config-error-box', t('err-min-players')); return; }

  if (!wordsHidden) {
    const w1 = document.getElementById('word1').value.trim();
    const w2 = document.getElementById('word2').value.trim();
    if (!w1 || !w2) { showError('config-error-box', t('err-words-needed')); return; }
    word1 = w1;
    word2 = w2;
  }
  /* If wordsHidden, word1/word2 already set by pickHiddenWords() */

  const mwActive = document.getElementById('mrWhiteToggle').checked ? 1 : 0;
  if (undercovers + mwActive >= players.length) {
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


/* ── 10. Role assignment ───────────────────────────────────── */
/* Each role object now includes recheckCount (per-player check counter) */

function assignRoles() {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  mrWhite = document.getElementById('mrWhiteToggle').checked;

  let pool = shuffled.map(p => ({
    ...p,
    role: 'civilian',
    word: word1,
    recheckCount: 0,  /* Per-player recheck counter */
  }));

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


/* ── 11. Pass-phone flow ───────────────────────────────────── */

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

/* Players see ONLY their word — no role label, no role description.
   Mr. White sees a "no word" message with a neutral hint.           */
function revealRole() {
  const current = roles[passIndex];

  /* Role badge hidden at this stage */
  const badge = document.getElementById('roleBadge');
  badge.className    = '';
  badge.textContent  = '';
  badge.style.display = 'none';

  /* Show word (or no-word message for Mr. White) */
  const wordEl = document.getElementById('roleWord');
  wordEl.textContent = current.role === 'mrwhite' ? t('no-word') : current.word;

  /* Neutral hint — does NOT mention the role */
  document.getElementById('roleDesc').textContent =
    current.role === 'mrwhite' ? t('word-hint-mrwhite') : t('word-hint-regular');

  goTo('screen-reveal');
}

function nextPassPlayer() {
  passIndex++;
  goTo('screen-pass');
  showPassScreen();
}


/* ── 12. Game screen rendering ─────────────────────────────── */
/* Each player row now shows a "×N" recheck badge when N > 0    */

function renderGameScreen() {
  document.getElementById('roundNum').textContent = round;
  updateRecheckInfo();

  const activePlayers = roles.filter(r => !eliminated.find(e => e.id === r.id));
  document.getElementById('gameMeta').innerHTML =
    `${players.length} ${t('players-label')}<br>${activePlayers.length} ${t('active')}`;

  const list = document.getElementById('gamePlayerList');
  list.innerHTML = '';

  roles.forEach(role => {
    const isE  = !!eliminated.find(e => e.id === role.id);
    const eIdx = eliminated.findIndex(e => e.id === role.id);

    const row = document.createElement('div');
    row.className = 'player-game-row' + (isE ? ' eliminated' : '');

    const avatarBg    = isE ? 'var(--sand-dark)' : 'var(--teal-pale)';
    const avatarColor = isE ? 'var(--navy-pale)'  : 'var(--teal-dark)';

    /* Recheck badge: shown only when this player's word has been checked ≥1 time */
    const recheckBadgeClass = role.recheckCount > 0 ? 'recheck-count-badge visible' : 'recheck-count-badge';
    const recheckBadgeText  = role.recheckCount > 0 ? `×${role.recheckCount}` : '';

    /* Right side: elim badge for eliminated, dot + recheck count for alive */
    const rightSide = isE
      ? `<span class="elim-badge">#${eIdx + 1}</span>`
      : `<span class="player-row-right">
           <span class="${recheckBadgeClass}">${recheckBadgeText}</span>
           <span class="alive-dot"></span>
         </span>`;

    row.innerHTML = `
      <span style="display:flex;align-items:center;gap:10px">
        <span style="width:28px;height:28px;border-radius:50%;
          background:${avatarBg};
          display:flex;align-items:center;justify-content:center;
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


/* ── 13. Role recheck ──────────────────────────────────────── */
/* Shows only the word — role remains hidden.
   Increments both the global counter and the per-player counter. */

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

function showRecheckWord(role) {
  /* Increment both counters */
  recheckCount++;
  role.recheckCount++;

  const wordLine = role.role === 'mrwhite'
    ? t('no-word')
    : `${t('your-word')}: ${role.word}`;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const box = document.createElement('div');
  box.className = 'modal-box';
  box.innerHTML = `
    <div class="modal-title">${role.name}</div>
    <div style="padding:12px 14px;margin-bottom:20px;background:var(--white-foam);
      border:1.5px solid var(--card-border);border-radius:var(--r);
      font-size:15px;font-weight:500;color:var(--navy)">${wordLine}</div>
    <div class="modal-btns">
      <button class="btn btn-primary" style="width:100%"
        onclick="closeModal();goTo('screen-game');renderGameScreen()">OK</button>
    </div>
  `;
  overlay.appendChild(box);
  document.getElementById('modalContainer').appendChild(overlay);
}

function closeModal() {
  document.getElementById('modalContainer').innerHTML = '';
}


/* ── 14. Elimination & public role reveal ──────────────────── */

/* Scrollable elimination picker (handles 10+ players) */
function openEliminate() {
  const activePlayers = roles.filter(r => !eliminated.find(e => e.id === r.id));

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

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

/* Records elimination and publicly reveals the role */
function eliminatePlayer(role) {
  eliminated.push(role);
  round++;
  showPublicRoleReveal(role);
}

/* Public role reveal shown to all players after each elimination */
function showPublicRoleReveal(role) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const box = document.createElement('div');
  box.className = 'modal-box';

  /* Words are always shown in the reveal modal, even when wordsHidden was true —
     a player has just been eliminated so secrecy is no longer needed for them.   */
  const wordLine = role.role === 'mrwhite'
    ? t('no-word')
    : `${t('your-word')}: ${role.word}`;

  let html = `
    <div style="font-size:11px;font-weight:500;letter-spacing:0.08em;
      color:var(--navy-light);text-transform:uppercase;margin-bottom:12px">
      ${t('revealed-role')}
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <span style="width:44px;height:44px;border-radius:50%;background:var(--teal-pale);
        display:flex;align-items:center;justify-content:center;
        font-family:var(--font-display);font-size:16px;font-weight:700;
        color:var(--teal-dark);flex-shrink:0">${initials(role.name)}</span>
      <div>
        <div style="font-size:18px;font-weight:600;
          font-family:var(--font-display);color:var(--teal-dark);margin-bottom:4px">
          ${role.name}
        </div>
        <span class="role-badge role-${role.role}" style="margin:0;display:inline-block">
          ${t('role-' + role.role)}
        </span>
      </div>
    </div>
    <div style="padding:10px 14px;margin-bottom:16px;background:var(--white-foam);
      border:1.5px solid var(--card-border);border-radius:var(--r);
      font-size:14px;color:var(--navy-light)">${wordLine}</div>
  `;

  if (role.role === 'mrwhite') {
    /* Mr. White gets to guess the civilian word */
    html += `
      <div style="font-size:13px;color:var(--navy-light);margin-bottom:14px;font-weight:300">
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


/* ── 15. Win condition logic ───────────────────────────────── */
/*
  Rules (per spec):
  - Civilians win  → all undercovers eliminated AND Mr. White eliminated
  - Undercovers win → no civilians remain (Mr. White counts as ally if alive)
  - Tie (treated as undercover win) → exactly 1 undercover + 1 civilian remain
  - Mr. White wins  → correctly guesses civilian word when voted out
  - If 1 undercover + 1 civilian + Mr. White remain → continue playing
  - A 3-vs-1 situation does NOT end the game; it continues normally
*/
function checkGameEnd() {
  const active    = roles.filter(r => !eliminated.find(e => e.id === r.id));
  const activeU   = active.filter(r => r.role === 'undercover');
  const activeC   = active.filter(r => r.role === 'civilian');
  const activeMW  = active.filter(r => r.role === 'mrwhite');

  /* Civilians win only when ALL undercovers AND Mr. White are gone */
  if (activeU.length === 0 && activeMW.length === 0) {
    endGame('civilians');
    return;
  }

  /* Undercovers win when all civilians are gone */
  if (activeC.length === 0) {
    endGame('undercovers');
    return;
  }

  /* Tie: 1 undercover vs 1 civilian (no civilians left after this is counted as undercover win) */
  if (activeU.length === 1 && activeC.length === 1 && activeMW.length === 0) {
    endGame('undercovers');
    return;
  }

  /* All other cases (including 3v1, 3v1+MrWhite etc.) → game continues */
  renderGameScreen();
}


/* ── 16. End screen & restart options ──────────────────────── */

function endGame(winner) {
  goTo('screen-end');

  const winMsg = winner === 'civilians'
    ? t('civilians-win')
    : winner === 'mrwhite'
      ? t('mrwhite-wins')
      : t('undercover-wins');

  document.getElementById('winnerTitle').textContent = winMsg;
  /* Words always revealed on the end screen */
  document.getElementById('winnerSub').textContent =
    `${t('words-were')}: ${word1} / ${word2}`;

  /* Elimination order — one per line with role badge */
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
      ${elimLines || `<span style="color:var(--navy-light);font-size:13px">—</span>`}
    </div>
    <div class="stat-row" style="margin-top:8px">
      <span class="stat-label">${t('rechecks-stat')}</span>
      <span class="stat-val">${recheckCount}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">${t('rounds-played')}</span>
      <span class="stat-val">${round - 1}</span>
    </div>
  `;

  applyLang();
}

function newGame() {
  eliminated   = [];
  round        = 1;
  recheckCount = 0;
  passIndex    = 0;
  wordsHidden  = false;
  undercovers  = suggestUndercovers(players.length);
  document.getElementById('underCount').textContent = undercovers;
  document.getElementById('hideWordsToggle').checked = false;
  document.getElementById('word1').value = '';
  document.getElementById('word2').value = '';
  pickHiddenWords();
  updateWordVisibilityUI();
  goTo('screen-config');
  applyLang();
}

function editPlayers() {
  eliminated   = [];
  round        = 1;
  recheckCount = 0;
  renderPlayerList();
  goTo('screen-setup');
  applyLang();
}

function quitGame() {
  players      = [];
  eliminated   = [];
  roles        = [];
  round        = 1;
  recheckCount = 0;
  wordsHidden  = false;
  renderPlayerList();
  updatePlayerCountBadges();
  goTo('screen-intro');
  applyLang();
}


/* ── 17. Initialisation ────────────────────────────────────── */
applyLang();
