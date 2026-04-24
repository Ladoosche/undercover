/* =============================================================
   UNDERCOVER — Game logic  (English only, Sunny Coast theme)
   Structure:
     1.  Background canvas drawing
     2.  Game state variables
     3.  Word pair database (parsed from WORD_DATA — mirrors words.txt)
     4.  Screen navigation & player count badge
     5.  Intro screen
     6.  Setup screen — player management
     7.  Config screen — undercover count, word language, visibility & words
     8.  Role assignment
     9.  Pass-phone flow
    10.  Game screen rendering  (per-player recheck badge)
    11.  Role recheck
    12.  Elimination & public role reveal
    13.  Win condition logic
    14.  End screen & restart options  (settings preserved on new game)
    15.  Initialisation
   ============================================================= */


/* ── 1. Background canvas drawing ──────────────────────────── */
/* Sunny coast: sandy base, turquoise wave circles, wave lines. */

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

  /* Horizontal wave lines */
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

  /* Sand-texture dots */
  bgCtx.fillStyle = 'rgba(180,160,120,0.08)';
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    bgCtx.beginPath();
    bgCtx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
    bgCtx.fill();
  }
}

drawBackground();
window.addEventListener('resize', drawBackground);


/* ── 2. Game state variables ───────────────────────────────── */

let players      = [];    // { name, id }
let undercovers  = 1;
let mrWhite      = false; // Preserved across "New game" restarts
let wordsHidden  = false; // Preserved across "New game" restarts
let wordLang     = 'EN';  // 'EN' or 'FR' — which word list to draw from
let word1        = '';    // Civilian word (set at game start)
let word2        = '';    // Undercover word (set at game start)
let roles        = [];    // { name, id, role, word, recheckCount }
let passIndex    = 0;
let round        = 1;
let eliminated   = [];
let recheckCount = 0;     // Global word-check counter


/* ── 3. Word pair database ─────────────────────────────────── */
/* These pairs are the in-memory mirror of words.txt.
   words.txt is the source of truth — edit that file to add/remove pairs.
   The app reads from this JS object at runtime.
   Format: each entry is [civilianWord, undercoverWord].              */

const WORD_PAIRS = {
  EN: [
    ['Coffee','Tea'],           ['Cat','Dog'],
    ['Pizza','Burger'],         ['Beach','Pool'],
    ['Wine','Beer'],            ['Bus','Subway'],
    ['Book','Magazine'],        ['Cinema','Theatre'],
    ['Guitar','Piano'],         ['Sushi','Tacos'],
    ['Snow','Rain'],            ['Jacket','Coat'],
    ['Castle','Palace'],        ['River','Lake'],
    ['Cheese','Butter'],        ['Doctor','Nurse'],
    ['Lion','Tiger'],           ['Sunrise','Sunset'],
    ['Train','Plane'],          ['Milk','Juice'],
    ['Paris','Rome'],           ['Shark','Dolphin'],
    ['Violin','Cello'],         ['Chess','Checkers'],
    ['Whisky','Rum'],           ['Candle','Lamp'],
    ['Forest','Jungle'],        ['Bread','Croissant'],
    ['Museum','Gallery'],       ['Sword','Knife'],
    ['Bicycle','Scooter'],      ['Sofa','Armchair'],
    ['Mountain','Hill'],        ['Island','Peninsula'],
    ['Lighthouse','Watchtower'],['Anchor','Chain'],
    ['Wave','Tide'],            ['Coral','Seaweed'],
    ['Captain','Sailor'],       ['Treasure','Gold'],
    ['Compass','Map'],          ['Horizon','Skyline'],
    ['Seagull','Pigeon'],       ['Sand','Pebble'],
    ['Sunscreen','Moisturiser'],['Swimsuit','Wetsuit'],
    ['Surfboard','Paddleboard'],['Harbour','Marina'],
    ['Cliff','Dune'],           ['Starfish','Jellyfish'],
  ],
  FR: [
    ['Café','Thé'],                       ['Chat','Chien'],
    ['Pizza','Burger'],                   ['Plage','Piscine'],
    ['Vin','Bière'],                      ['Bus','Métro'],
    ['Livre','Magazine'],                 ['Cinéma','Théâtre'],
    ['Guitare','Piano'],                  ['Sushi','Tacos'],
    ['Neige','Pluie'],                    ['Veste','Manteau'],
    ['Château','Palais'],                 ['Rivière','Lac'],
    ['Fromage','Beurre'],                 ['Docteur','Infirmier'],
    ['Lion','Tigre'],                     ['Lever du soleil','Coucher du soleil'],
    ['Train','Avion'],                    ['Lait','Jus'],
    ['Paris','Rome'],                     ['Requin','Dauphin'],
    ['Violon','Violoncelle'],             ['Échecs','Dames'],
    ['Whisky','Rhum'],                    ['Bougie','Lampe'],
    ['Forêt','Jungle'],                   ['Pain','Croissant'],
    ['Musée','Galerie'],                  ['Épée','Couteau'],
    ['Vélo','Trottinette'],               ['Canapé','Fauteuil'],
    ['Montagne','Colline'],               ['Île','Presqu\'île'],
    ['Phare','Tour de guet'],             ['Ancre','Chaîne'],
    ['Vague','Marée'],                    ['Corail','Algue'],
    ['Capitaine','Marin'],                ['Trésor','Or'],
    ['Boussole','Carte'],                 ['Horizon','Panorama'],
    ['Mouette','Pigeon'],                 ['Sable','Galet'],
    ['Crème solaire','Hydratant'],        ['Maillot de bain','Combinaison'],
    ['Planche de surf','Paddle'],         ['Port','Marina'],
    ['Falaise','Dune'],                   ['Étoile de mer','Méduse'],
  ],
};


/* ── 4. Screen navigation & player count badge ─────────────── */

function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

/* Refreshes all .player-count-badge elements.
   Hidden on the setup screen itself (the list already shows counts). */
function updatePlayerCountBadges() {
  const count = players.length;
  document.querySelectorAll('.player-count-badge').forEach(el => {
    el.textContent = `${count} player${count !== 1 ? 's' : ''}`;
    el.style.visibility = el.closest('#screen-setup') ? 'hidden' : 'visible';
  });
}

/* Shows a styled inline error banner; auto-dismisses after 4 s */
function showError(containerId, message) {
  const existing = document.getElementById('err-' + containerId);
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id        = 'err-' + containerId;
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


/* ── 5. Intro screen ───────────────────────────────────────── */

function goToSetup() {
  goTo('screen-setup');
}


/* ── 6. Setup screen — player management ───────────────────── */

/* Returns up to 2 uppercase characters as an avatar label */
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
          background:var(--teal-pale);display:flex;align-items:center;
          justify-content:center;font-family:var(--font-display);
          font-size:11px;font-weight:700;color:var(--teal-dark);flex-shrink:0">
          ${initials(player.name)}
        </span>
        <span style="font-size:14px;font-weight:500;color:var(--navy)">
          ${player.name}
        </span>
      </span>
      <button class="remove-btn" onclick="removePlayer(${index})">×</button>
    `;
    list.appendChild(row);
  });
}

function goToConfig() {
  if (players.length < 3) {
    showError('setup-error-box', 'You need at least 3 players to start.');
    return;
  }
  clearError('setup-error-box');
  undercovers = suggestUndercovers(players.length);
  document.getElementById('underCount').textContent = undercovers;

  /* Restore saved toggle states (mrWhite and wordsHidden persist across games) */
  document.getElementById('mrWhiteToggle').checked  = mrWhite;
  document.getElementById('hideWordsToggle').checked = wordsHidden;

  /* Restore word language button state */
  setWordLang(wordLang);

  pickHiddenWords();
  updateWordVisibilityUI();
  updateUnderSug();
  updatePlayerCountBadges();
  goTo('screen-config');
}


/* ── 7. Config screen ──────────────────────────────────────── */

function suggestUndercovers(n) {
  if (n <= 5) return 1;
  if (n <= 9) return 2;
  return 3;
}

function updateUnderSug() {
  const suggested = suggestUndercovers(players.length);
  const el = document.getElementById('underSug');
  if (el) el.textContent = `(suggested: ${suggested})`;
}

function changeUnder(delta) {
  const mwActive = document.getElementById('mrWhiteToggle').checked ? 1 : 0;
  const max = Math.max(1, players.length - 1 - mwActive);
  undercovers = Math.max(1, Math.min(max, undercovers + delta));
  document.getElementById('underCount').textContent = undercovers;
}

/* Sets the active word language and updates the EN/FR button UI */
function setWordLang(lang) {
  wordLang = lang;
  document.querySelectorAll('.lang-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

/* Silently picks and stores a random pair from the active language list.
   Used when wordsHidden is true — the values are NEVER rendered anywhere. */
function pickHiddenWords() {
  const list = WORD_PAIRS[wordLang] || WORD_PAIRS['EN'];
  const pair = list[Math.floor(Math.random() * list.length)];
  word1 = pair[0];
  word2 = pair[1];
}

/* Fills the visible word inputs with a random suggestion */
function suggestWords() {
  const list = WORD_PAIRS[wordLang] || WORD_PAIRS['EN'];
  const pair = list[Math.floor(Math.random() * list.length)];
  document.getElementById('word1').value = pair[0];
  document.getElementById('word2').value = pair[1];
}

/* Shows/hides the word input section based on the hide-words checkbox */
function updateWordVisibilityUI() {
  wordsHidden = document.getElementById('hideWordsToggle')?.checked || false;
  const visibleSection = document.getElementById('wordVisibleSection');
  const hiddenNote     = document.getElementById('wordHiddenNote');
  if (!visibleSection || !hiddenNote) return;

  if (wordsHidden) {
    visibleSection.style.display = 'none';
    hiddenNote.style.display     = 'block';
  } else {
    visibleSection.style.display = 'block';
    hiddenNote.style.display     = 'none';
    if (!document.getElementById('word1').value &&
        !document.getElementById('word2').value) {
      suggestWords();
    }
  }
}

/* Called when the hide-words checkbox changes */
function onHideWordsChange() {
  wordsHidden = document.getElementById('hideWordsToggle').checked;
  if (wordsHidden) {
    pickHiddenWords();
    /* Clear visible inputs so words can't be read */
    document.getElementById('word1').value = '';
    document.getElementById('word2').value = '';
  }
  updateWordVisibilityUI();
}

function startPassPhone() {
  if (players.length < 3) {
    showError('config-error-box', 'You need at least 3 players to start.');
    return;
  }

  if (!wordsHidden) {
    const w1 = document.getElementById('word1').value.trim();
    const w2 = document.getElementById('word2').value.trim();
    if (!w1 || !w2) {
      showError('config-error-box', 'Please enter both words before starting.');
      return;
    }
    word1 = w1;
    word2 = w2;
  }
  /* If wordsHidden, word1/word2 already set by pickHiddenWords() */

  const mwActive = document.getElementById('mrWhiteToggle').checked ? 1 : 0;
  if (undercovers + mwActive >= players.length) {
    showError('config-error-box', 'Too many special roles — at least one civilian is required.');
    return;
  }

  /* Save toggle state so it persists into the next "New game" */
  mrWhite     = document.getElementById('mrWhiteToggle').checked;
  wordsHidden = document.getElementById('hideWordsToggle').checked;

  clearError('config-error-box');
  assignRoles();
  passIndex    = 0;
  eliminated   = [];
  round        = 1;
  recheckCount = 0;
  goTo('screen-pass');
  showPassScreen();
}


/* ── 8. Role assignment ────────────────────────────────────── */
/* Each player object gets recheckCount = 0 for per-player tracking */

function assignRoles() {
  const shuffled = [...players].sort(() => Math.random() - 0.5);

  let pool = shuffled.map(p => ({
    ...p,
    role: 'civilian',
    word: word1,
    recheckCount: 0,
  }));

  for (let i = 0; i < undercovers; i++) {
    pool[i].role = 'undercover';
    pool[i].word = word2;
  }

  if (mrWhite && pool.length > undercovers) {
    pool[undercovers].role = 'mrwhite';
    pool[undercovers].word = '';
  }

  /* Final shuffle so pass order doesn't hint at roles */
  roles = pool.sort(() => Math.random() - 0.5);
}


/* ── 9. Pass-phone flow ────────────────────────────────────── */

function showPassScreen() {
  if (passIndex >= roles.length) {
    goTo('screen-game');
    renderGameScreen();
    return;
  }
  const current = roles[passIndex];
  document.getElementById('passName').textContent     = current.name;
  document.getElementById('passInitials').textContent = initials(current.name);
}

/* Players see ONLY their word — no role label, no role hint.
   Mr. White sees a neutral "no word" message.                 */
function revealRole() {
  const current = roles[passIndex];

  /* Keep role badge hidden — it will only show publicly on elimination */
  const badge = document.getElementById('roleBadge');
  badge.className    = '';
  badge.textContent  = '';
  badge.style.display = 'none';

  /* Word display */
  document.getElementById('roleWord').textContent =
    current.role === 'mrwhite' ? 'No word' : current.word;

  /* Neutral instruction — no role information whatsoever */
  document.getElementById('roleDesc').textContent =
    current.role === 'mrwhite'
      ? 'You have no word. Listen carefully during the game.'
      : 'Memorise your word. Keep it secret!';

  goTo('screen-reveal');
}

function nextPassPlayer() {
  passIndex++;
  goTo('screen-pass');
  showPassScreen();
}


/* ── 10. Game screen rendering ─────────────────────────────── */
/* Each active player row shows a "×N" recheck badge when N > 0 */

function renderGameScreen() {
  document.getElementById('roundNum').textContent = round;
  updateRecheckInfo();

  const activePlayers = roles.filter(r => !eliminated.find(e => e.id === r.id));
  document.getElementById('gameMeta').innerHTML =
    `${players.length} player${players.length !== 1 ? 's' : ''}<br>${activePlayers.length} active`;

  const list = document.getElementById('gamePlayerList');
  list.innerHTML = '';

  roles.forEach(role => {
    const isE  = !!eliminated.find(e => e.id === role.id);
    const eIdx = eliminated.findIndex(e => e.id === role.id);

    const row = document.createElement('div');
    row.className = 'player-game-row' + (isE ? ' eliminated' : '');

    const avatarBg    = isE ? 'var(--sand-dark)' : 'var(--teal-pale)';
    const avatarColor = isE ? 'var(--navy-pale)'  : 'var(--teal-dark)';

    /* Recheck badge: visible only when this player's word has been checked ≥1 time */
    const badgeClass = role.recheckCount > 0
      ? 'recheck-count-badge visible'
      : 'recheck-count-badge';
    const badgeText = role.recheckCount > 0 ? `×${role.recheckCount}` : '';

    const rightSide = isE
      ? `<span class="elim-badge">#${eIdx + 1}</span>`
      : `<span class="player-row-right">
           <span class="${badgeClass}">${badgeText}</span>
           <span class="alive-dot"></span>
         </span>`;

    row.innerHTML = `
      <span style="display:flex;align-items:center;gap:10px">
        <span style="width:28px;height:28px;border-radius:50%;
          background:${avatarBg};display:flex;align-items:center;
          justify-content:center;font-family:var(--font-display);
          font-size:11px;font-weight:700;color:${avatarColor};flex-shrink:0">
          ${initials(role.name)}
        </span>
        <span class="player-game-name">${role.name}</span>
      </span>
      ${rightSide}
    `;
    list.appendChild(row);
  });
}

function updateRecheckInfo() {
  const el = document.getElementById('recheckInfo');
  if (el) el.textContent = `${recheckCount} word check${recheckCount !== 1 ? 's' : ''} used`;
}


/* ── 11. Role recheck ──────────────────────────────────────── */
/* Shows the player's word only — role stays hidden.
   Increments both the global total and the per-player counter. */

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
  recheckCount++;
  role.recheckCount++;

  const wordLine = role.role === 'mrwhite'
    ? 'No word'
    : `Word: ${role.word}`;

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


/* ── 12. Elimination & public role reveal ──────────────────── */

/* Scrollable picker — handles 10+ players with overflow-y:auto */
function openEliminate() {
  const activePlayers = roles.filter(r => !eliminated.find(e => e.id === r.id));

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const box = document.createElement('div');
  box.className = 'modal-box modal-box-scroll';
  box.innerHTML = `<div class="modal-title">Who was voted out?</div>`;

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
  cancel.textContent     = 'Cancel';
  cancel.onclick         = closeModal;
  box.appendChild(cancel);

  overlay.appendChild(box);
  document.getElementById('modalContainer').appendChild(overlay);
}

/* Adds player to eliminated[], increments round, shows public reveal */
function eliminatePlayer(role) {
  eliminated.push(role);
  round++;
  showPublicRoleReveal(role);
}

/* Full public reveal shown to all players after each elimination.
   Words are always shown here even when wordsHidden was active
   (the eliminated player's secret no longer matters).           */
function showPublicRoleReveal(role) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const box = document.createElement('div');
  box.className = 'modal-box';

  const wordLine = role.role === 'mrwhite'
    ? 'No word'
    : `Word: ${role.word}`;

  let html = `
    <div style="font-size:11px;font-weight:500;letter-spacing:0.08em;
      color:var(--navy-light);text-transform:uppercase;margin-bottom:12px">
      Role revealed
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <span style="width:44px;height:44px;border-radius:50%;
        background:var(--teal-pale);display:flex;align-items:center;
        justify-content:center;font-family:var(--font-display);
        font-size:16px;font-weight:700;color:var(--teal-dark);flex-shrink:0">
        ${initials(role.name)}
      </span>
      <div>
        <div style="font-size:18px;font-weight:600;font-family:var(--font-display);
          color:var(--teal-dark);margin-bottom:4px">${role.name}</div>
        <span class="role-badge role-${role.role}" style="margin:0;display:inline-block">
          ${roleLabel(role.role)}
        </span>
      </div>
    </div>
    <div style="padding:10px 14px;margin-bottom:16px;background:var(--white-foam);
      border:1.5px solid var(--card-border);border-radius:var(--r);
      font-size:14px;color:var(--navy-light)">${wordLine}</div>
  `;

  if (role.role === 'mrwhite') {
    html += `
      <div style="font-size:13px;color:var(--navy-light);margin-bottom:14px;font-weight:300">
        Did Mr. White guess the civilian word correctly?
      </div>
      <div class="modal-btns">
        <button class="btn btn-primary"
          onclick="closeModal();endGame('mrwhite')">Yes — Mr. White wins!</button>
        <button class="btn"
          onclick="closeModal();checkGameEnd()">No — continue</button>
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

/* Returns the English display label for a role key */
function roleLabel(role) {
  return { civilian: 'Civilian', undercover: 'Undercover', mrwhite: 'Mr. White' }[role] || role;
}


/* ── 13. Win condition logic ───────────────────────────────── */
/*
  Rules:
  - Civilians win  → all undercovers eliminated AND Mr. White eliminated
  - Undercovers win → no civilians remain  (Mr. White still alive = undercover ally)
  - Tie (= undercover win) → exactly 1 undercover + 1 civilian, no Mr. White
  - If 1 undercover + 1 civilian + Mr. White → continue (3 players, still a round to play)
  - 3 civilians vs 1 undercover → game continues (majority does NOT auto-win)
  - Mr. White wins only by guessing the civilian word on elimination
*/
function checkGameEnd() {
  const active  = roles.filter(r => !eliminated.find(e => e.id === r.id));
  const activeU = active.filter(r => r.role === 'undercover');
  const activeC = active.filter(r => r.role === 'civilian');
  const activeMW = active.filter(r => r.role === 'mrwhite');

  /* Civilians win only when all undercovers AND Mr. White are gone */
  if (activeU.length === 0 && activeMW.length === 0) {
    endGame('civilians');
    return;
  }

  /* Undercovers win when all civilians are eliminated */
  if (activeC.length === 0) {
    endGame('undercovers');
    return;
  }

  /* Tie: exactly 1 undercover vs 1 civilian, no Mr. White → undercovers win */
  if (activeU.length === 1 && activeC.length === 1 && activeMW.length === 0) {
    endGame('undercovers');
    return;
  }

  /* All other cases → game continues */
  renderGameScreen();
}


/* ── 14. End screen & restart options ──────────────────────── */

function endGame(winner) {
  goTo('screen-end');

  const winMsg = {
    civilians:  'Civilians win!',
    undercovers:'Undercovers win!',
    mrwhite:    'Mr. White wins!',
  }[winner] || '';

  document.getElementById('winnerTitle').textContent = winMsg;
  /* Words are always revealed on the end screen */
  document.getElementById('winnerSub').textContent = `Words: ${word1} / ${word2}`;

  /* Elimination order — one per line with role badge */
  const elimLines = eliminated.map((p, i) => `
    <div class="stat-elim-row">
      <span class="stat-elim-num">${i + 1}.</span>
      <span class="stat-elim-name">${p.name}</span>
      <span class="role-badge role-${p.role}" style="margin:0;font-size:11px;padding:2px 10px">
        ${roleLabel(p.role)}
      </span>
    </div>
  `).join('');

  document.getElementById('endStats').innerHTML = `
    <div class="stat-row">
      <span class="stat-label">Words</span>
      <span class="stat-val">${word1} · ${word2}</span>
    </div>
    <div class="stat-section-label">Elimination order</div>
    <div class="stat-elim-list">
      ${elimLines || '<span style="color:var(--navy-light);font-size:13px">—</span>'}
    </div>
    <div class="stat-row" style="margin-top:8px">
      <span class="stat-label">Word checks</span>
      <span class="stat-val">${recheckCount}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Rounds played</span>
      <span class="stat-val">${round - 1}</span>
    </div>
  `;

  updatePlayerCountBadges();
}

/* "New game — new words": resets only the per-game data.
   Crucially, mrWhite and wordsHidden are preserved from the previous game
   so the host doesn't have to re-configure toggles every time.            */
function newGame() {
  eliminated   = [];
  round        = 1;
  recheckCount = 0;
  passIndex    = 0;

  undercovers = suggestUndercovers(players.length);
  document.getElementById('underCount').textContent = undercovers;

  /* Restore saved toggle states — this is the key preservation logic */
  document.getElementById('mrWhiteToggle').checked  = mrWhite;
  document.getElementById('hideWordsToggle').checked = wordsHidden;

  /* Restore word language selector */
  setWordLang(wordLang);

  /* Clear visible word inputs ready for new entry */
  document.getElementById('word1').value = '';
  document.getElementById('word2').value = '';
  pickHiddenWords();
  updateWordVisibilityUI();
  updateUnderSug();
  updatePlayerCountBadges();
  goTo('screen-config');
}

/* Returns to the player roster with game state cleared */
function editPlayers() {
  eliminated   = [];
  round        = 1;
  recheckCount = 0;
  renderPlayerList();
  updatePlayerCountBadges();
  goTo('screen-setup');
}

/* Full reset — clears everything and returns to the intro screen */
function quitGame() {
  players      = [];
  eliminated   = [];
  roles        = [];
  round        = 1;
  recheckCount = 0;
  mrWhite      = false;
  wordsHidden  = false;
  wordLang     = 'EN';
  renderPlayerList();
  updatePlayerCountBadges();
  goTo('screen-intro');
}


/* ── 15. Initialisation ────────────────────────────────────── */
/* Nothing extra needed — the HTML starts on screen-intro. */
