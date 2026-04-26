/* =============================================================
   undercover/undercover.js
   Structure:
     1.  Background canvas
     2.  Translations (EN / FR)
     3.  Word pair database (mirrors words.txt)
     4.  Game state
     5.  Lang helpers & screen navigation
     6.  Intro screen
     7.  Config screen
     8.  Role assignment & pass order (necklace logic)
     9.  Pass-phone flow
    10.  Game screen  (per-player recheck badge)
    11.  Role recheck
    12.  Elimination & public role reveal
    13.  Win condition logic
    14.  End screen (elimination order + full roles recap)
    15.  Initialisation
   ============================================================= */


/* ── 1. Background canvas ──────────────────────────────────── */
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx    = bgCanvas.getContext('2d');

function drawBackground() {
  bgCanvas.width  = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  const w = bgCanvas.width, h = bgCanvas.height;
  bgCtx.fillStyle = '#e8e4d8';
  bgCtx.fillRect(0, 0, w, h);
  [
    {x:.80,y:.05,r:.30,a:.12,c:'10,147,150'},
    {x:.10,y:.15,r:.22,a:.10,c:'0,119,182'},
    {x:.60,y:.70,r:.28,a:.08,c:'10,147,150'},
    {x:.05,y:.75,r:.18,a:.09,c:'0,119,182'},
    {x:.90,y:.55,r:.20,a:.07,c:'148,210,189'},
    {x:.40,y:.90,r:.22,a:.08,c:'10,147,150'},
  ].forEach(c => {
    bgCtx.beginPath();
    bgCtx.arc(c.x*w, c.y*h, c.r*Math.min(w,h), 0, Math.PI*2);
    bgCtx.fillStyle = `rgba(${c.c},${c.a})`;
    bgCtx.fill();
  });
  bgCtx.lineWidth = 0.8;
  for (let i = 0; i < 8; i++) {
    const baseY = h*(0.55+i*0.06);
    bgCtx.strokeStyle = `rgba(10,147,150,${0.06-i*0.005})`;
    bgCtx.beginPath();
    for (let x = 0; x < w; x += 4) {
      const y = baseY + Math.sin(x*0.018+i)*14 + Math.sin(x*0.05+i)*6;
      x===0 ? bgCtx.moveTo(x,y) : bgCtx.lineTo(x,y);
    }
    bgCtx.stroke();
  }
  bgCtx.fillStyle = 'rgba(180,160,120,0.08)';
  for (let i=0;i<120;i++) {
    bgCtx.beginPath();
    bgCtx.arc(Math.random()*w, Math.random()*h, 1+Math.random()*2, 0, Math.PI*2);
    bgCtx.fill();
  }
}
drawBackground();
window.addEventListener('resize', drawBackground);


/* ── 2. Translations ───────────────────────────────────────── */
/* "Mr. White" never changes in either language.                */
const T = {
  en: {
    /* Intro */
    'back-home':          '← Home',
    'intro-play':         'Play →',
    'rule-civ-title':     'Civilians',
    'rule-civ':           'Most players share a word. Describe it without being too obvious.',
    'rule-spy-title':     'Undercovers',
    'rule-spy':           'One or more players get a similar but different word. Blend in!',
    'rule-mw-title':      'Mr. White',
    'rule-mw':            'Optional. No word at all — listen and try to guess.',
    'rule-flow-title':    'How to play',
    'rule-flow':          'Each round everyone gives a clue then votes to eliminate a suspect. Civilians win when undercovers are gone. Undercovers win when civilians are out.',
    /* Config */
    'config-title':       'Settings',
    'config-sub':         'Configure the game',
    'undercov-label':     'Undercovers',
    'mrw-label':          'Mr. White',
    'order-label':        'Pass order',
    'order-registration': 'Registration order',
    'order-random':       'Random order',
    'wordlang-label':     'Suggested words language',
    'words-label':        'Word pair',
    'civilian-word':      'Civilian word',
    'undercover-word':    'Undercover word',
    'words-hidden-label': 'Hide words from everyone',
    'words-hidden-note':  'A random pair is locked in — no one sees it.',
    'suggest-btn':        '↻ Suggest a pair',
    'back-btn':           '← Back',
    'start-btn':          'Start game',
    'suggested':          'suggested',
    /* Pass phone */
    'pass-title':         'Your turn',
    'pass-sub':           'Pass the phone to this player',
    'pass-hint':          'Tap below to see your word — keep it secret!',
    'reveal-btn':         'See my word',
    /* Reveal */
    'reveal-title':       'Your word',
    'reveal-sub':         'Memorise this, then pass the phone',
    'hide-btn':           'Hide & pass →',
    'word-hint':          'Memorise your word. Keep it secret!',
    'mw-hint':            'You have no word. Listen carefully during the game.',
    /* Game */
    'round-label':        'Round',
    'active-label':       'active',
    'checks-used':        'word check used',
    'checks-used-pl':     'word checks used',
    'check-btn':          'Check word',
    'elim-btn':           'Eliminate',
    /* Modals */
    'elim-prompt':        'Who was voted out?',
    'elim-cancel':        'Cancel',
    'role-revealed':      'Role revealed',
    'word-label':         'Word',
    'no-word':            'No word',
    'mrw-guess':          'Did Mr. White guess the civilian word?',
    'mrw-yes':            'Yes — Mr. White wins!',
    'mrw-no':             'No — continue',
    /* Recheck */
    'recheck-title':      'What is your word?',
    'recheck-sub':        'Tap your name to see your word again',
    'back-game':          '← Back',
    /* End */
    'end-title':          'Game over',
    'civilians-win':      'Civilians win!',
    'undercover-wins':    'Undercovers win!',
    'mrwhite-wins':       'Mr. White wins!',
    'words-stat':         'Words',
    'elim-order':         'Elimination order',
    'checks-stat':        'Word checks',
    'rounds-stat':        'Rounds played',
    'roles-recap':        'All roles',
    'newgame-btn':        'New game — new words',
    'editplayers-btn':    'Back to home',
    /* Roles */
    'role-civilian':      'Civilian',
    'role-undercover':    'Undercover',
    'role-mrwhite':       'Mr. White',
    /* Errors */
    'err-min':            'You need at least 3 players. Add more on the home page.',
    'err-words':          'Please enter both words before starting.',
    'err-roles':          'Too many special roles — at least one civilian is required.',
  },
  fr: {
    'back-home':          '← Accueil',
    'intro-play':         'Jouer →',
    'rule-civ-title':     'Civils',
    'rule-civ':           'La plupart des joueurs partagent un mot. Décrivez-le sans être trop évident.',
    'rule-spy-title':     'Infiltrés',
    'rule-spy':           'Un ou plusieurs joueurs ont un mot similaire mais différent. Fondez-vous dans la masse !',
    'rule-mw-title':      'Mr. White',
    'rule-mw':            'Optionnel. Aucun mot — écoutez et essayez de deviner.',
    'rule-flow-title':    'Comment jouer',
    'rule-flow':          'Chaque tour chacun donne un indice puis vote pour éliminer un suspect. Les civils gagnent quand les infiltrés sont éliminés. Les infiltrés gagnent quand il n\'y a plus de civils.',
    'config-title':       'Paramètres',
    'config-sub':         'Configurer la partie',
    'undercov-label':     'Infiltrés',
    'mrw-label':          'Mr. White',
    'order-label':        'Ordre de passage',
    'order-registration': 'Ordre d\'inscription',
    'order-random':       'Ordre aléatoire',
    'wordlang-label':     'Langue des mots suggérés',
    'words-label':        'Paire de mots',
    'civilian-word':      'Mot des civils',
    'undercover-word':    'Mot des infiltrés',
    'words-hidden-label': 'Cacher les mots à tous',
    'words-hidden-note':  'Une paire est choisie au hasard — personne ne la voit.',
    'suggest-btn':        '↻ Suggérer une paire',
    'back-btn':           '← Retour',
    'start-btn':          'Lancer la partie',
    'suggested':          'suggéré',
    'pass-title':         'À toi',
    'pass-sub':           'Passe le téléphone à ce joueur',
    'pass-hint':          'Appuie ci-dessous pour voir ton mot — garde le secret !',
    'reveal-btn':         'Voir mon mot',
    'reveal-title':       'Ton mot',
    'reveal-sub':         'Mémorise, puis passe le téléphone',
    'hide-btn':           'Cacher & passer →',
    'word-hint':          'Mémorise ton mot. Garde-le secret !',
    'mw-hint':            'Tu n\'as pas de mot. Écoute attentivement pendant la partie.',
    'round-label':        'Tour',
    'active-label':       'actifs',
    'checks-used':        'vérification utilisée',
    'checks-used-pl':     'vérifications utilisées',
    'check-btn':          'Revoir mon mot',
    'elim-btn':           'Éliminer',
    'elim-prompt':        'Qui a été éliminé ?',
    'elim-cancel':        'Annuler',
    'role-revealed':      'Rôle révélé',
    'word-label':         'Mot',
    'no-word':            'Aucun mot',
    'mrw-guess':          'Mr. White a-t-il deviné le mot des civils ?',
    'mrw-yes':            'Oui — Mr. White gagne !',
    'mrw-no':             'Non — continuer',
    'recheck-title':      'Quel est ton mot ?',
    'recheck-sub':        'Appuie sur ton nom pour revoir ton mot',
    'back-game':          '← Retour',
    'end-title':          'Fin de partie',
    'civilians-win':      'Les civils gagnent !',
    'undercover-wins':    'Les infiltrés gagnent !',
    'mrwhite-wins':       'Mr. White gagne !',
    'words-stat':         'Mots',
    'elim-order':         'Ordre d\'élimination',
    'checks-stat':        'Vérifications',
    'rounds-stat':        'Tours joués',
    'roles-recap':        'Tous les rôles',
    'newgame-btn':        'Nouvelle partie — nouveaux mots',
    'editplayers-btn':    'Retour à l\'accueil',
    'role-civilian':      'Civil',
    'role-undercover':    'Infiltré',
    'role-mrwhite':       'Mr. White',
    'err-min':            'Il faut au moins 3 joueurs. Ajoutez-en sur la page d\'accueil.',
    'err-words':          'Veuillez saisir les deux mots avant de commencer.',
    'err-roles':          'Trop de rôles spéciaux — il faut au moins un civil.',
  },
};

function t(k) { return (T[LANG]||T.en)[k] || k; }

/* Refreshes all elements with a data-t attribute */
function applyLang() {
  document.querySelectorAll('[data-t]').forEach(el => {
    el.textContent = t(el.getAttribute('data-t'));
  });
  /* Word language selector buttons */
  document.querySelectorAll('.lang-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === wordLang);
  });
  updateUnderSug();
  updatePlayerCountBadge();
  updateWordVisibilityUI();
  updateOrderUI();
}


/* ── 3. Word pair database ─────────────────────────────────── */
/* Mirrors words.txt. Edit words.txt then update here to match. */
const WORD_PAIRS = {
  EN: [
    ['Coffee','Tea'],['Cat','Dog'],['Pizza','Burger'],['Beach','Pool'],
    ['Wine','Beer'],['Bus','Subway'],['Book','Magazine'],['Cinema','Theatre'],
    ['Guitar','Piano'],['Sushi','Tacos'],['Snow','Rain'],['Jacket','Coat'],
    ['Castle','Palace'],['River','Lake'],['Cheese','Butter'],['Doctor','Nurse'],
    ['Lion','Tiger'],['Sunrise','Sunset'],['Train','Plane'],['Milk','Juice'],
    ['Paris','Rome'],['Shark','Dolphin'],['Violin','Cello'],['Chess','Checkers'],
    ['Whisky','Rum'],['Candle','Lamp'],['Forest','Jungle'],['Bread','Croissant'],
    ['Museum','Gallery'],['Sword','Knife'],['Bicycle','Scooter'],['Sofa','Armchair'],
    ['Mountain','Hill'],['Island','Peninsula'],['Lighthouse','Watchtower'],
    ['Anchor','Chain'],['Wave','Tide'],['Coral','Seaweed'],['Captain','Sailor'],
    ['Treasure','Gold'],['Compass','Map'],['Horizon','Skyline'],['Seagull','Pigeon'],
    ['Sand','Pebble'],['Sunscreen','Moisturiser'],['Swimsuit','Wetsuit'],
    ['Surfboard','Paddleboard'],['Harbour','Marina'],['Cliff','Dune'],
    ['Starfish','Jellyfish'],['Espresso','Cappuccino'],['Latte','Flat White'],
    ['Beer','Cider'],['Champagne','Prosecco'],['Vodka','Gin'],['Butter','Margarine'],
    ['Muffin','Cupcake'],['Hot Dog','Sausage'],['Taco','Burrito'],['Ramen','Pho'],
    ['Pasta','Noodles'],['Rice','Couscous'],['Salad','Coleslaw'],['Soup','Stew'],
    ['Curry','Chilli'],['Steak','Chop'],['Chicken','Turkey'],['Salmon','Tuna'],
    ['Shrimp','Crab'],['Lobster','Prawn'],['Oyster','Clam'],['Yoghurt','Kefir'],
    ['Honey','Jam'],['Cinnamon','Nutmeg'],['Garlic','Onion'],['Tomato','Pepper'],
    ['Carrot','Parsnip'],['Potato','Sweet Potato'],['Broccoli','Cauliflower'],
    ['Spinach','Kale'],['Lettuce','Rocket'],['Mushroom','Truffle'],['Apple','Pear'],
    ['Orange','Grapefruit'],['Lemon','Lime'],['Banana','Plantain'],
    ['Strawberry','Raspberry'],['Blueberry','Blackberry'],['Grape','Cherry'],
    ['Mango','Papaya'],['Pineapple','Coconut'],['Peach','Apricot'],['Plum','Damson'],
    ['Watermelon','Cantaloupe'],['Almond','Cashew'],['Walnut','Pecan'],
    ['Chocolate','Caramel'],['Ice Cream','Sorbet'],['Waffle','Pancake'],
    ['Elephant','Rhinoceros'],['Giraffe','Zebra'],['Cheetah','Leopard'],
    ['Wolf','Fox'],['Bear','Panda'],['Koala','Wombat'],['Kangaroo','Wallaby'],
    ['Rabbit','Hare'],['Squirrel','Chipmunk'],['Beaver','Otter'],['Seal','Sea Lion'],
    ['Octopus','Squid'],['Jellyfish','Starfish'],['Penguin','Puffin'],
    ['Eagle','Falcon'],['Owl','Hawk'],['Parrot','Macaw'],['Flamingo','Pelican'],
    ['Swan','Goose'],['Duck','Mallard'],['Robin','Sparrow'],['Crow','Raven'],
    ['Peacock','Pheasant'],['Butterfly','Moth'],['Bee','Wasp'],['Ant','Termite'],
    ['Spider','Scorpion'],['Snake','Lizard'],['Crocodile','Alligator'],
    ['Frog','Toad'],['Turtle','Tortoise'],['Horse','Donkey'],['Cow','Buffalo'],
    ['Sheep','Goat'],['Pig','Boar'],['Deer','Elk'],['Moose','Reindeer'],
    ['Camel','Dromedary'],['Llama','Alpaca'],['Gorilla','Chimpanzee'],
    ['Monkey','Baboon'],['Leopard','Jaguar'],['Volcano','Geyser'],['Cave','Cavern'],
    ['Desert','Savannah'],['Prairie','Steppe'],['Valley','Canyon'],
    ['Ocean','Sea'],['Bay','Gulf'],['Reef','Atoll'],['Waterfall','Rapids'],
    ['Glacier','Iceberg'],['Swamp','Marsh'],['Beach','Coastline'],['Rock','Boulder'],
    ['Mud','Quicksand'],['Current','Eddy'],['Fog','Mist'],['Storm','Hurricane'],
    ['Thunder','Lightning'],['Rainbow','Aurora'],['Snow','Hail'],['Frost','Ice'],
    ['Dew','Drizzle'],['Cloud','Cumulus'],['Wind','Breeze'],['Tornado','Cyclone'],
    ['Drought','Flood'],['Earthquake','Landslide'],['Moon','Satellite'],
    ['Star','Comet'],['Planet','Asteroid'],['Galaxy','Nebula'],['Car','Van'],
    ['Bus','Tram'],['Motorbike','Moped'],['Boat','Ferry'],['Ship','Cruise Liner'],
    ['Submarine','Yacht'],['Kayak','Canoe'],['Sailboat','Speedboat'],
    ['Hot Air Balloon','Airship'],['Taxi','Uber'],['Lorry','Truck'],
    ['Tractor','Harvester'],['Skateboard','Rollerblade'],['House','Cottage'],
    ['Apartment','Studio'],['Villa','Mansion'],['Tower','Skyscraper'],
    ['Cathedral','Basilica'],['Church','Chapel'],['Mosque','Temple'],
    ['Museum','Library'],['School','University'],['Hospital','Clinic'],
    ['Stadium','Arena'],['Theatre','Opera House'],['Hotel','Hostel'],
    ['Restaurant','Bistro'],['Café','Tearoom'],['Bar','Pub'],
    ['Supermarket','Grocery Store'],['Market','Bazaar'],['Factory','Warehouse'],
    ['Lighthouse','Watchtower'],['Bridge','Viaduct'],['Tunnel','Underpass'],
    ['Chair','Stool'],['Table','Desk'],['Wardrobe','Closet'],['Shelf','Cabinet'],
    ['Mirror','Window'],['Curtain','Blind'],['Carpet','Rug'],['Pillow','Cushion'],
    ['Blanket','Duvet'],['Soap','Shower Gel'],['Toothbrush','Toothpaste'],
    ['Comb','Hairbrush'],['Scissors','Shears'],['Knife','Cleaver'],
    ['Pan','Wok'],['Pot','Casserole'],['Plate','Bowl'],['Cup','Mug'],
    ['Glass','Tumbler'],['Bottle','Flask'],['Tin','Jar'],['Bag','Sack'],
    ['Box','Crate'],['Basket','Hamper'],['Umbrella','Parasol'],['Key','Padlock'],
    ['Wallet','Purse'],['Watch','Clock'],['Ring','Bracelet'],['Necklace','Pendant'],
    ['Hat','Cap'],['Scarf','Shawl'],['Gloves','Mittens'],['Boots','Trainers'],
    ['Jacket','Coat'],['Jumper','Cardigan'],['Shirt','Blouse'],['Trousers','Jeans'],
    ['Dress','Skirt'],['Tie','Bow Tie'],['Belt','Braces'],['Backpack','Briefcase'],
    ['Phone','Tablet'],['Laptop','Computer'],['Television','Monitor'],
    ['Radio','Speaker'],['Camera','Webcam'],['Headphones','Earbuds'],
    ['Keyboard','Trackpad'],['Printer','Scanner'],['Microphone','Amplifier'],
    ['Battery','Charger'],['Screen','Projector'],['App','Software'],
    ['Website','Blog'],['Podcast','Audiobook'],['Email','Text Message'],
    ['Satellite','Antenna'],['Drone','Remote Control'],['Robot','Android'],
    ['Football','Rugby'],['Basketball','Volleyball'],['Tennis','Squash'],
    ['Badminton','Table Tennis'],['Golf','Croquet'],['Baseball','Softball'],
    ['Swimming','Diving'],['Surfing','Kitesurfing'],['Sailing','Rowing'],
    ['Skiing','Snowboarding'],['Ice Skating','Rollerblading'],['Cycling','Mountain Biking'],
    ['Running','Jogging'],['Hiking','Trekking'],['Climbing','Abseiling'],
    ['Boxing','Wrestling'],['Judo','Karate'],['Yoga','Pilates'],['Chess','Draughts'],
    ['Poker','Bridge'],['Darts','Snooker'],['Bowling','Skittles'],['Archery','Fencing'],
    ['Painting','Drawing'],['Sculpture','Installation'],['Photography','Videography'],
    ['Music','Singing'],['Guitar','Bass Guitar'],['Piano','Harpsichord'],
    ['Violin','Viola'],['Trumpet','Trombone'],['Flute','Clarinet'],
    ['Saxophone','Oboe'],['Ballet','Contemporary Dance'],['Opera','Musical'],
    ['Film','Documentary'],['Novel','Short Story'],['Poetry','Prose'],
    ['Comedy','Satire'],['Concert','Recital'],['Festival','Carnival'],
    ['Atom','Molecule'],['Cell','Organism'],['Protein','Enzyme'],
    ['Bacteria','Virus'],['Fungus','Mould'],['Plant','Algae'],['Flower','Blossom'],
    ['Fossil','Amber'],['Crystal','Mineral'],['Diamond','Ruby'],['Gold','Silver'],
    ['Iron','Copper'],['Telescope','Microscope'],['Thermometer','Barometer'],
    ['Theory','Law'],['Physics','Chemistry'],['Biology','Ecology'],
    ['Astronomy','Geology'],['Mathematics','Statistics'],
    ['Doctor','Surgeon'],['Nurse','Paramedic'],['Teacher','Lecturer'],
    ['Lawyer','Solicitor'],['Judge','Magistrate'],['Firefighter','Lifeguard'],
    ['Soldier','Sailor'],['Pilot','Co-Pilot'],['Engineer','Architect'],
    ['Plumber','Electrician'],['Carpenter','Joiner'],['Chef','Pastry Chef'],
    ['Waiter','Barista'],['Gardener','Farmer'],['Journalist','Editor'],
    ['Author','Poet'],['Artist','Illustrator'],['Musician','Conductor'],
    ['Love','Affection'],['Happiness','Joy'],['Sadness','Melancholy'],
    ['Anger','Frustration'],['Courage','Bravery'],['Hope','Optimism'],
    ['Trust','Faith'],['Jealousy','Envy'],['Pride','Arrogance'],
    ['Surprise','Astonishment'],['Curiosity','Wonder'],['Loneliness','Solitude'],
    ['Freedom','Independence'],['Justice','Equality'],['Peace','Harmony'],
    ['Mystery','Secret'],['Memory','Nostalgia'],['Dream','Vision'],
    ['Magic','Sorcery'],['Ghost','Spirit'],['Monster','Beast'],['Dragon','Griffin'],
    ['Wizard','Warlock'],['Hero','Champion'],['Villain','Antagonist'],
    ['Spy','Agent'],['Detective','Inspector'],['Riddle','Puzzle'],
    ['Legend','Myth'],['Adventure','Expedition'],['Journey','Voyage'],
    ['Beginning','Origin'],['End','Conclusion'],['Light','Shadow'],
    ['Heat','Cold'],['Speed','Velocity'],['Power','Force'],['Energy','Fuel'],
  ],
  FR: [
    ['Café','Thé'],['Chat','Chien'],['Pizza','Burger'],['Plage','Piscine'],
    ['Vin','Bière'],['Bus','Métro'],['Livre','Magazine'],['Cinéma','Théâtre'],
    ['Guitare','Piano'],['Sushi','Tacos'],['Neige','Pluie'],['Veste','Manteau'],
    ['Château','Palais'],['Rivière','Lac'],['Fromage','Beurre'],['Docteur','Infirmier'],
    ['Lion','Tigre'],['Lever du soleil','Coucher du soleil'],['Train','Avion'],
    ['Lait','Jus'],['Paris','Rome'],['Requin','Dauphin'],['Violon','Violoncelle'],
    ['Échecs','Dames'],['Whisky','Rhum'],['Bougie','Lampe'],['Forêt','Jungle'],
    ['Pain','Croissant'],['Musée','Galerie'],['Épée','Couteau'],
    ['Vélo','Trottinette'],['Canapé','Fauteuil'],['Montagne','Colline'],
    ['Île','Presqu\'île'],['Phare','Tour de guet'],['Ancre','Chaîne'],
    ['Vague','Marée'],['Corail','Algue'],['Capitaine','Marin'],['Trésor','Or'],
    ['Boussole','Carte'],['Horizon','Panorama'],['Mouette','Pigeon'],['Sable','Galet'],
    ['Crème solaire','Hydratant'],['Maillot de bain','Combinaison'],
    ['Planche de surf','Paddle'],['Port','Marina'],['Falaise','Dune'],
    ['Étoile de mer','Méduse'],['Espresso','Cappuccino'],['Latte','Chocolat chaud'],
    ['Cidre','Bière'],['Champagne','Prosecco'],['Vodka','Gin'],['Beurre','Margarine'],
    ['Muffin','Cupcake'],['Hot Dog','Saucisse'],['Taco','Burrito'],['Ramen','Pho'],
    ['Pâtes','Nouilles'],['Riz','Couscous'],['Salade','Taboulé'],['Soupe','Potage'],
    ['Curry','Chili'],['Steak','Côtelette'],['Poulet','Dinde'],['Saumon','Thon'],
    ['Crevette','Crabe'],['Homard','Langouste'],['Huître','Palourde'],['Yaourt','Kéfir'],
    ['Miel','Confiture'],['Cannelle','Muscade'],['Ail','Oignon'],['Tomate','Poivron'],
    ['Carotte','Panais'],['Pomme de terre','Patate douce'],['Brocoli','Chou-fleur'],
    ['Épinard','Chou frisé'],['Laitue','Roquette'],['Champignon','Truffe'],
    ['Pomme','Poire'],['Orange','Pamplemousse'],['Citron','Citron vert'],
    ['Banane','Plantain'],['Fraise','Framboise'],['Myrtille','Mûre'],['Raisin','Cerise'],
    ['Mangue','Papaye'],['Ananas','Noix de coco'],['Pêche','Abricot'],['Prune','Quetsche'],
    ['Pastèque','Melon'],['Amande','Noix de cajou'],['Chocolat','Caramel'],
    ['Glace','Sorbet'],['Gaufre','Crêpe'],['Éléphant','Rhinocéros'],['Girafe','Zèbre'],
    ['Guépard','Léopard'],['Loup','Renard'],['Ours','Panda'],['Koala','Wombat'],
    ['Kangourou','Wallaby'],['Lapin','Lièvre'],['Écureuil','Tamia'],['Castor','Loutre'],
    ['Phoque','Otarie'],['Dauphin','Marsouin'],['Baleine','Requin'],
    ['Pieuvre','Calmar'],['Pingouin','Macareux'],['Aigle','Faucon'],['Hibou','Buse'],
    ['Perroquet','Ara'],['Flamant rose','Pélican'],['Cygne','Oie'],['Canard','Colvert'],
    ['Pigeon','Tourterelle'],['Rouge-gorge','Moineau'],['Corbeau','Corneille'],
    ['Paon','Faisan'],['Colibri','Martin-pêcheur'],['Papillon','Mite'],
    ['Abeille','Guêpe'],['Fourmi','Termite'],['Araignée','Scorpion'],
    ['Serpent','Lézard'],['Crocodile','Alligator'],['Grenouille','Crapaud'],
    ['Tortue','Tortue terrestre'],['Cheval','Âne'],['Vache','Buffle'],
    ['Mouton','Chèvre'],['Cochon','Sanglier'],['Cerf','Élan'],['Orignal','Renne'],
    ['Chameau','Dromadaire'],['Lama','Alpaga'],['Gorille','Chimpanzé'],
    ['Singe','Babouin'],['Jaguar','Puma'],['Volcan','Geyser'],['Grotte','Caverne'],
    ['Désert','Savane'],['Prairie','Steppe'],['Vallée','Canyon'],['Océan','Mer'],
    ['Baie','Golfe'],['Récif','Atoll'],['Cascade','Rapide'],['Glacier','Iceberg'],
    ['Marécage','Marais'],['Roche','Rocher'],['Boue','Sables mouvants'],
    ['Brouillard','Brume'],['Tempête','Ouragan'],['Tonnerre','Éclair'],
    ['Arc-en-ciel','Aurore boréale'],['Givre','Verglas'],['Rosée','Bruine'],
    ['Nuage','Cumulus'],['Vent','Brise'],['Tornade','Cyclone'],
    ['Sécheresse','Inondation'],['Lune','Satellite'],['Étoile','Comète'],
    ['Planète','Astéroïde'],['Galaxie','Nébuleuse'],['Voiture','Camionnette'],
    ['Tramway','Bus'],['Moto','Cyclomoteur'],['Bateau','Ferry'],['Navire','Paquebot'],
    ['Sous-marin','Yacht'],['Kayak','Canoë'],['Voilier','Hors-bord'],
    ['Montgolfière','Dirigeable'],['Taxi','VTC'],['Camion','Semi-remorque'],
    ['Tracteur','Moissonneuse'],['Skateboard','Rollers'],['Maison','Chaumière'],
    ['Appartement','Studio'],['Villa','Manoir'],['Tour','Gratte-ciel'],
    ['Cathédrale','Basilique'],['Église','Chapelle'],['Mosquée','Temple'],
    ['Musée','Bibliothèque'],['École','Université'],['Hôpital','Clinique'],
    ['Stade','Arène'],['Théâtre','Opéra'],['Hôtel','Auberge'],
    ['Restaurant','Bistrot'],['Café','Salon de thé'],['Bar','Pub'],
    ['Supermarché','Épicerie'],['Marché','Bazar'],['Usine','Entrepôt'],
    ['Pont','Viaduc'],['Tunnel','Passage souterrain'],['Chaise','Tabouret'],
    ['Table','Bureau'],['Armoire','Placard'],['Étagère','Cabinet'],
    ['Miroir','Fenêtre'],['Rideau','Store'],['Tapis','Carpette'],['Oreiller','Coussin'],
    ['Couverture','Duvet'],['Savon','Gel douche'],['Brosse à dents','Dentifrice'],
    ['Peigne','Brosse à cheveux'],['Couteau','Couperet'],['Poêle','Wok'],
    ['Casserole','Cocotte'],['Assiette','Bol'],['Tasse','Mug'],['Verre','Gobelet'],
    ['Bouteille','Gourde'],['Boîte','Bocal'],['Sac','Sachet'],['Panier','Corbeille'],
    ['Parapluie','Ombrelle'],['Clé','Cadenas'],['Portefeuille','Porte-monnaie'],
    ['Montre','Horloge'],['Bague','Bracelet'],['Collier','Pendentif'],
    ['Chapeau','Casquette'],['Écharpe','Châle'],['Gants','Moufles'],
    ['Bottes','Baskets'],['Chaussures','Sandales'],['Pull','Gilet'],
    ['Chemise','Chemisier'],['Pantalon','Jean'],['Robe','Jupe'],
    ['Cravate','Nœud papillon'],['Ceinture','Bretelles'],['Sac à dos','Mallette'],
    ['Téléphone','Tablette'],['Ordinateur portable','Ordinateur de bureau'],
    ['Télévision','Écran'],['Radio','Enceinte'],['Appareil photo','Webcam'],
    ['Casque','Écouteurs'],['Clavier','Pavé tactile'],['Imprimante','Scanner'],
    ['Microphone','Amplificateur'],['Batterie','Chargeur'],['Écran','Vidéoprojecteur'],
    ['Site web','Blog'],['Podcast','Livre audio'],['Email','SMS'],
    ['Satellite','Antenne'],['Drone','Télécommande'],['Robot','Androïde'],
    ['Football','Rugby'],['Basketball','Volleyball'],['Tennis','Squash'],
    ['Badminton','Tennis de table'],['Golf','Croquet'],['Natation','Plongée'],
    ['Surf','Kitesurf'],['Voile','Aviron'],['Ski','Snowboard'],
    ['Patinage sur glace','Roller'],['Cyclisme','VTT'],['Course à pied','Jogging'],
    ['Randonnée','Trek'],['Escalade','Rappel'],['Boxe','Lutte'],['Judo','Karaté'],
    ['Yoga','Pilates'],['Échecs','Dames'],['Poker','Bridge'],['Fléchettes','Billard'],
    ['Bowling','Quilles'],['Tir à l\'arc','Escrime'],['Pétanque','Boules'],
    ['Peinture','Dessin'],['Sculpture','Installation'],['Photographie','Vidéographie'],
    ['Musique','Chant'],['Guitare','Basse'],['Piano','Clavecin'],['Violon','Alto'],
    ['Trompette','Trombone'],['Flûte','Clarinette'],['Saxophone','Hautbois'],
    ['Ballet','Danse contemporaine'],['Opéra','Comédie musicale'],['Film','Documentaire'],
    ['Roman','Nouvelle'],['Poésie','Prose'],['Concert','Récital'],['Festival','Carnaval'],
    ['Atome','Molécule'],['Cellule','Organisme'],['Protéine','Enzyme'],
    ['Bactérie','Virus'],['Champignon','Moisissure'],['Fleur','Floraison'],
    ['Fossile','Ambre'],['Cristal','Minéral'],['Diamant','Rubis'],['Or','Argent'],
    ['Fer','Cuivre'],['Télescope','Microscope'],['Thermomètre','Baromètre'],
    ['Physique','Chimie'],['Biologie','Écologie'],['Astronomie','Géologie'],
    ['Médecin','Chirurgien'],['Infirmier','Ambulancier'],['Professeur','Maître de conférences'],
    ['Avocat','Notaire'],['Juge','Magistrat'],['Pompier','Maître nageur'],
    ['Soldat','Marin'],['Pilote','Co-pilote'],['Ingénieur','Architecte'],
    ['Plombier','Électricien'],['Charpentier','Menuisier'],['Chef','Pâtissier'],
    ['Serveur','Barista'],['Jardinier','Agriculteur'],['Journaliste','Rédacteur en chef'],
    ['Auteur','Poète'],['Artiste','Illustrateur'],['Musicien','Chef d\'orchestre'],
    ['Amour','Affection'],['Bonheur','Joie'],['Tristesse','Mélancolie'],
    ['Colère','Frustration'],['Courage','Bravoure'],['Espoir','Optimisme'],
    ['Confiance','Foi'],['Jalousie','Envie'],['Fierté','Arrogance'],
    ['Surprise','Étonnement'],['Curiosité','Émerveillement'],['Solitude','Isolement'],
    ['Liberté','Indépendance'],['Justice','Égalité'],['Paix','Harmonie'],
    ['Mystère','Secret'],['Mémoire','Nostalgie'],['Rêve','Vision'],
    ['Magie','Sorcellerie'],['Fantôme','Esprit'],['Monstre','Bête'],
    ['Dragon','Griffon'],['Sorcier','Magicien'],['Héros','Champion'],
    ['Espion','Agent'],['Détective','Inspecteur'],['Énigme','Devinette'],
    ['Légende','Mythe'],['Aventure','Expédition'],['Voyage','Périple'],
    ['Lumière','Ombre'],['Chaleur','Froid'],['Vitesse','Vélocité'],
    ['Puissance','Force'],['Énergie','Carburant'],['Hirondelle','Moineau'],
    ['Labyrinthe','Dédale'],['Mirage','Illusion'],['Écho','Reflet'],
    ['Moulin','Manège'],['Feu d\'artifice','Pétard'],['Fanfare','Harmonie'],
  ],
};


/* ── 4. Game state ─────────────────────────────────────────── */
let undercovers  = 1;
let mrWhiteOn    = false;   /* preserved across new-game restarts */
let wordsHidden  = false;   /* preserved across new-game restarts */
let passOrderMode = 'random'; /* 'random' | 'registration' */
let wordLang     = 'EN';
let word1        = '';
let word2        = '';
let roles        = [];      /* { id, name, role, word, recheckCount } */
let passOrder    = [];      /* ordered indices into roles[] for pass-phone */
let passIndex    = 0;
let round        = 1;
let eliminated   = [];
let recheckCount = 0;


/* ── 5. Lang helpers & screen navigation ───────────────────── */

function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function updatePlayerCountBadge() {
  document.querySelectorAll('.player-count-badge').forEach(el => {
    el.textContent = `${PLAYERS.length} ${PLAYERS.length > 1
      ? (LANG==='fr' ? 'joueurs' : 'players')
      : (LANG==='fr' ? 'joueur'  : 'player')}`;
  });
}

function showError(containerId, msg) {
  const old = document.getElementById('err-'+containerId);
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'err-'+containerId;
  el.className = 'error-msg';
  el.textContent = msg;
  document.getElementById(containerId)?.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.remove(); }, 4000);
}

function rl(k) { return t('role-'+k); }


/* ── 6. Intro screen ───────────────────────────────────────── */
function goToConfig() {
  if (PLAYERS.length < 3) { showError('intro-error', t('err-min')); return; }
  undercovers = suggestUndercovers(PLAYERS.length);
  document.getElementById('underCount').textContent = undercovers;
  document.getElementById('mrWhiteToggle').checked  = mrWhiteOn;
  document.getElementById('hideWordsToggle').checked = wordsHidden;
  setWordLang(wordLang);
  pickHiddenWords();
  updateWordVisibilityUI();
  updateUnderSug();
  updateOrderUI();
  document.getElementById('word1').value = '';
  document.getElementById('word2').value = '';
  if (!wordsHidden) suggestWords();
  updatePlayerCountBadge();
  goTo('screen-config');
}


/* ── 7. Config screen ──────────────────────────────────────── */

function suggestUndercovers(n) { return n<=5?1:n<=9?2:3; }

function updateUnderSug() {
  const s = suggestUndercovers(PLAYERS.length);
  const el = document.getElementById('underSug');
  if (el) el.textContent = `(${t('suggested')}: ${s})`;
}

function changeUnder(d) {
  const mw = document.getElementById('mrWhiteToggle').checked ? 1 : 0;
  const max = Math.max(1, PLAYERS.length - 1 - mw);
  undercovers = Math.max(1, Math.min(max, undercovers + d));
  document.getElementById('underCount').textContent = undercovers;
}

/* Pass order toggle */
function setPassOrder(mode) {
  passOrderMode = mode;
  updateOrderUI();
}
function updateOrderUI() {
  document.querySelectorAll('.order-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.order === passOrderMode);
  });
}

/* Word language */
function setWordLang(l) {
  wordLang = l;
  document.querySelectorAll('.lang-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === l);
  });
  /* Auto-update suggested words when language changes, if words visible */
  if (!wordsHidden) suggestWords();
}

function pickHiddenWords() {
  const list = WORD_PAIRS[wordLang] || WORD_PAIRS['EN'];
  const pair = list[Math.floor(Math.random()*list.length)];
  word1 = pair[0]; word2 = pair[1];
}

function suggestWords() {
  const list = WORD_PAIRS[wordLang] || WORD_PAIRS['EN'];
  const pair = list[Math.floor(Math.random()*list.length)];
  document.getElementById('word1').value = pair[0];
  document.getElementById('word2').value = pair[1];
}

function updateWordVisibilityUI() {
  wordsHidden = document.getElementById('hideWordsToggle')?.checked || false;
  const vis  = document.getElementById('wordVisibleSection');
  const note = document.getElementById('wordHiddenNote');
  if (!vis || !note) return;
  if (wordsHidden) {
    vis.style.display  = 'none';
    note.style.display = 'block';
    note.textContent   = t('words-hidden-note');
  } else {
    vis.style.display  = 'block';
    note.style.display = 'none';
    if (!document.getElementById('word1').value &&
        !document.getElementById('word2').value) suggestWords();
  }
}

function onHideWordsChange() {
  wordsHidden = document.getElementById('hideWordsToggle').checked;
  if (wordsHidden) {
    pickHiddenWords();
    document.getElementById('word1').value = '';
    document.getElementById('word2').value = '';
  }
  updateWordVisibilityUI();
}

function startGame() {
  if (PLAYERS.length < 3) { showError('config-error', t('err-min')); return; }
  if (!wordsHidden) {
    const w1 = document.getElementById('word1').value.trim();
    const w2 = document.getElementById('word2').value.trim();
    if (!w1 || !w2) { showError('config-error', t('err-words')); return; }
    word1 = w1; word2 = w2;
  }
  const mw = document.getElementById('mrWhiteToggle').checked ? 1 : 0;
  if (undercovers + mw >= PLAYERS.length) { showError('config-error', t('err-roles')); return; }
  mrWhiteOn   = document.getElementById('mrWhiteToggle').checked;
  wordsHidden = document.getElementById('hideWordsToggle').checked;
  assignRoles();
  passIndex = 0; eliminated = []; round = 1; recheckCount = 0;
  goTo('screen-pass');
  showPassScreen();
}


/* ── 8. Role assignment & necklace pass order ──────────────── */
/*
  Necklace rules:
  - No fixed player #1 — can start anywhere
  - Undercovers must NOT be first
  - Mr. White (if present) must be LAST in the pass sequence
  - Algorithm:
      1. Assign roles to a shuffled copy of PLAYERS (or registration order)
      2. Build a valid circular starting point:
         - Collect eligible starters (civilians only)
         - Pick one at random
      3. Walk the array from that index, appending Mr. White at the end
*/
function assignRoles() {
  /* Base order */
  let base = passOrderMode === 'registration'
    ? [...PLAYERS]
    : [...PLAYERS].sort(() => Math.random() - 0.5);

  /* Assign roles */
  let pool = base.map(p => ({ ...p, role:'civilian', word:word1, recheckCount:0 }));
  for (let i = 0; i < undercovers; i++) { pool[i].role='undercover'; pool[i].word=word2; }
  if (mrWhiteOn && pool.length > undercovers) {
    pool[undercovers].role = 'mrwhite'; pool[undercovers].word = '';
  }

  /* Shuffle roles among players (so registration order affects pass sequence,
     not necessarily who gets which role) */
  roles = pool;

  /* Build pass order — necklace logic */
  const mrWhiteIdx = roles.findIndex(r => r.role === 'mrwhite');
  const civilians  = roles.map((r,i) => i).filter(i => r => roles[i].role === 'civilian');
  /* Eligible starters: civilians only */
  const eligibleStarters = roles.map((r,i)=>i).filter(i => roles[i].role === 'civilian');

  let startIdx;
  if (eligibleStarters.length > 0) {
    startIdx = eligibleStarters[Math.floor(Math.random()*eligibleStarters.length)];
  } else {
    /* Edge case: no civilians (shouldn't happen due to validation) */
    startIdx = 0;
  }

  /* Walk the circle starting at startIdx, skipping Mr. White */
  const n = roles.length;
  passOrder = [];
  let cur = startIdx;
  for (let step = 0; step < n; step++) {
    if (roles[cur].role !== 'mrwhite') passOrder.push(cur);
    cur = (cur + 1) % n;
  }
  /* Append Mr. White last */
  if (mrWhiteIdx !== -1) passOrder.push(mrWhiteIdx);
}


/* ── 9. Pass-phone flow ────────────────────────────────────── */

function showPassScreen() {
  if (passIndex >= passOrder.length) { goTo('screen-game'); renderGameScreen(); return; }
  const r = roles[passOrder[passIndex]];
  document.getElementById('passName').textContent     = r.name;
  document.getElementById('passInitials').textContent = initials(r.name);
  /* Update translatable pass-screen labels */
  document.querySelectorAll('[data-t]').forEach(el => el.textContent = t(el.getAttribute('data-t')));
}

function revealWord() {
  const r = roles[passOrder[passIndex]];
  document.getElementById('roleBadge').style.display = 'none';
  document.getElementById('roleWord').textContent =
    r.role === 'mrwhite' ? t('no-word') : r.word;
  document.getElementById('roleDesc').textContent =
    r.role === 'mrwhite' ? t('mw-hint') : t('word-hint');
  goTo('screen-reveal');
}

function nextPlayer() {
  passIndex++;
  goTo('screen-pass');
  showPassScreen();
}


/* ── 10. Game screen ───────────────────────────────────────── */

function renderGameScreen() {
  document.getElementById('roundNum').textContent = round;
  const active = roles.filter(r => !eliminated.find(e => e.id===r.id));
  document.getElementById('gameMeta').innerHTML =
    `${PLAYERS.length} ${LANG==='fr'?'joueurs':'players'}<br>${active.length} ${t('active-label')}`;

  const list = document.getElementById('gamePlayerList');
  list.innerHTML = '';
  /* Display in pass order so the "necklace" sequence is visible */
  passOrder.forEach(idx => {
    const role = roles[idx];
    const isE  = !!eliminated.find(e => e.id===role.id);
    const eIdx = eliminated.findIndex(e => e.id===role.id);
    const row  = document.createElement('div');
    row.className = 'player-game-row' + (isE ? ' eliminated' : '');
    const badgeClass = role.recheckCount > 0 ? 'recheck-count-badge visible' : 'recheck-count-badge';
    const rightSide = isE
      ? `<span class="elim-badge">#${eIdx+1}</span>`
      : `<span class="player-row-right">
           <span class="${badgeClass}">${role.recheckCount>0?'×'+role.recheckCount:''}</span>
           <span class="alive-dot"></span>
         </span>`;
    row.innerHTML = `
      <span style="display:flex;align-items:center;gap:10px">
        <span style="width:28px;height:28px;border-radius:50%;
          background:${isE?'var(--sand-dark)':'var(--teal-pale)'};
          display:flex;align-items:center;justify-content:center;
          font-family:var(--font-display);font-size:11px;font-weight:700;
          color:${isE?'var(--navy-pale)':'var(--teal-dark)'};flex-shrink:0">
          ${initials(role.name)}</span>
        <span class="player-game-name">${role.name}</span>
      </span>${rightSide}`;
    list.appendChild(row);
  });

  const n = recheckCount;
  document.getElementById('recheckInfo').textContent =
    `${n} ${n===1 ? t('checks-used') : t('checks-used-pl')}`;
}


/* ── 11. Role recheck ──────────────────────────────────────── */

function openRecheck() {
  const list = document.getElementById('recheckList');
  list.innerHTML = '';
  const active = roles.filter(r => !eliminated.find(e => e.id===r.id));
  active.forEach(role => {
    const btn = document.createElement('button');
    btn.className = 'modal-player-btn';
    btn.innerHTML = `<span class="modal-avatar">${initials(role.name)}</span>
      <span class="modal-player-name">${role.name}</span>`;
    btn.onclick = () => showRecheckModal(role);
    list.appendChild(btn);
  });
  goTo('screen-recheck');
}

function showRecheckModal(role) {
  recheckCount++; role.recheckCount++;
  const wordLine = role.role==='mrwhite' ? t('no-word') : `${t('word-label')}: ${role.word}`;
  const ov = document.createElement('div'); ov.className='modal-overlay';
  const bx = document.createElement('div'); bx.className='modal-box';
  bx.innerHTML = `<div class="modal-title">${role.name}</div>
    <div style="padding:12px 14px;margin-bottom:20px;background:var(--white-foam);
      border:1.5px solid var(--card-border);border-radius:var(--r);
      font-size:15px;font-weight:500;color:var(--navy)">${wordLine}</div>
    <div class="modal-btns">
      <button class="btn btn-primary" style="width:100%"
        onclick="closeModal();goTo('screen-game');renderGameScreen()">OK</button>
    </div>`;
  ov.appendChild(bx);
  document.getElementById('modalContainer').appendChild(ov);
}

function closeModal() { document.getElementById('modalContainer').innerHTML=''; }


/* ── 12. Elimination & public role reveal ──────────────────── */

function openEliminate() {
  const active = roles.filter(r => !eliminated.find(e => e.id===r.id));
  const ov = document.createElement('div'); ov.className='modal-overlay';
  const bx = document.createElement('div'); bx.className='modal-box modal-box-scroll';
  bx.innerHTML = `<div class="modal-title">${t('elim-prompt')}</div>`;
  active.forEach(role => {
    const btn = document.createElement('button');
    btn.className='modal-player-btn';
    btn.innerHTML=`<span class="modal-avatar">${initials(role.name)}</span>
      <span class="modal-player-name">${role.name}</span>`;
    btn.onclick=()=>{ closeModal(); eliminatePlayer(role); };
    bx.appendChild(btn);
  });
  const cancel=document.createElement('button');
  cancel.className='btn btn-danger'; cancel.style.marginTop='4px';
  cancel.textContent=t('elim-cancel'); cancel.onclick=closeModal;
  bx.appendChild(cancel);
  ov.appendChild(bx);
  document.getElementById('modalContainer').appendChild(ov);
}

function eliminatePlayer(role) { eliminated.push(role); round++; showPublicReveal(role); }

function showPublicReveal(role) {
  const wordLine = role.role==='mrwhite' ? t('no-word') : `${t('word-label')}: ${role.word}`;
  const ov=document.createElement('div'); ov.className='modal-overlay';
  const bx=document.createElement('div'); bx.className='modal-box';
  let html=`
    <div style="font-size:11px;font-weight:500;letter-spacing:0.08em;
      color:var(--navy-light);text-transform:uppercase;margin-bottom:12px">
      ${t('role-revealed')}</div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <span style="width:44px;height:44px;border-radius:50%;background:var(--teal-pale);
        display:flex;align-items:center;justify-content:center;
        font-family:var(--font-display);font-size:16px;font-weight:700;
        color:var(--teal-dark);flex-shrink:0">${initials(role.name)}</span>
      <div>
        <div style="font-size:18px;font-weight:600;font-family:var(--font-display);
          color:var(--teal-dark);margin-bottom:4px">${role.name}</div>
        <span class="role-badge role-${role.role}" style="margin:0;display:inline-block">
          ${rl(role.role)}</span>
      </div>
    </div>
    <div style="padding:10px 14px;margin-bottom:16px;background:var(--white-foam);
      border:1.5px solid var(--card-border);border-radius:var(--r);
      font-size:14px;color:var(--navy-light)">${wordLine}</div>`;
  if (role.role==='mrwhite') {
    html+=`<div style="font-size:13px;color:var(--navy-light);margin-bottom:14px;font-weight:300">
      ${t('mrw-guess')}</div>
      <div class="modal-btns">
        <button class="btn btn-primary" onclick="closeModal();endGame('mrwhite')">${t('mrw-yes')}</button>
        <button class="btn" onclick="closeModal();checkGameEnd()">${t('mrw-no')}</button>
      </div>`;
  } else {
    html+=`<div class="modal-btns">
      <button class="btn btn-primary" style="width:100%"
        onclick="closeModal();checkGameEnd()">OK</button></div>`;
  }
  bx.innerHTML=html; ov.appendChild(bx);
  document.getElementById('modalContainer').appendChild(ov);
}


/* ── 13. Win condition ─────────────────────────────────────── */
/*
  - Civilians win: all undercovers + Mr. White eliminated
  - Undercovers win: all civilians eliminated
  - Tie (1 undercover + 1 civilian, no Mr. White): undercovers win
  - 1U + 1C + Mr. White alive → continue
  - Any other majority: continue
*/
function checkGameEnd() {
  const active = roles.filter(r => !eliminated.find(e=>e.id===r.id));
  const U  = active.filter(r=>r.role==='undercover');
  const C  = active.filter(r=>r.role==='civilian');
  const MW = active.filter(r=>r.role==='mrwhite');
  if (U.length===0 && MW.length===0) { endGame('civilians'); return; }
  if (C.length===0) { endGame('undercovers'); return; }
  if (U.length===1 && C.length===1 && MW.length===0) { endGame('undercovers'); return; }
  renderGameScreen();
}


/* ── 14. End screen ────────────────────────────────────────── */

function endGame(winner) {
  goTo('screen-end');

  const msgs = { civilians:'civilians-win', undercovers:'undercover-wins', mrwhite:'mrwhite-wins' };
  document.getElementById('winnerTitle').textContent = t(msgs[winner] || 'end-title');
  document.getElementById('winnerSub').textContent   = `${t('words-stat')}: ${word1} / ${word2}`;

  /* Elimination order */
  const elimLines = eliminated.map((p,i)=>`
    <div class="stat-elim-row">
      <span class="stat-elim-num">${i+1}.</span>
      <span class="stat-elim-name">${p.name}</span>
      <span class="role-badge role-${p.role}" style="margin:0;font-size:11px;padding:2px 10px">
        ${rl(p.role)}</span>
    </div>`).join('');

  /* Full roles recap — every player, name + role + word */
  const recapLines = roles.map(r=>`
    <div class="roles-recap-row">
      <span style="width:28px;height:28px;border-radius:50%;background:var(--teal-pale);
        display:flex;align-items:center;justify-content:center;
        font-family:var(--font-display);font-size:11px;font-weight:700;
        color:var(--teal-dark);flex-shrink:0">${initials(r.name)}</span>
      <span class="roles-recap-name">${r.name}</span>
      <span class="role-badge role-${r.role}" style="margin:0;font-size:11px;padding:2px 10px">
        ${rl(r.role)}</span>
      <span class="roles-recap-word">${r.role==='mrwhite'?'—':r.word}</span>
    </div>`).join('');

  document.getElementById('endStats').innerHTML=`
    <div class="stat-row">
      <span class="stat-label">${t('words-stat')}</span>
      <span class="stat-val">${word1} · ${word2}</span>
    </div>
    <div class="stat-section-label">${t('elim-order')}</div>
    <div class="stat-elim-list">
      ${elimLines||'<span style="color:var(--navy-light);font-size:13px">—</span>'}
    </div>
    <div class="stat-section-label">${t('roles-recap')}</div>
    <div class="stat-elim-list">${recapLines}</div>
    <div class="stat-row" style="margin-top:8px">
      <span class="stat-label">${t('checks-stat')}</span>
      <span class="stat-val">${recheckCount}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">${t('rounds-stat')}</span>
      <span class="stat-val">${round-1}</span>
    </div>`;

  updatePlayerCountBadge();
}

function newGame() {
  eliminated=[]; round=1; recheckCount=0; passIndex=0;
  undercovers=suggestUndercovers(PLAYERS.length);
  document.getElementById('underCount').textContent=undercovers;
  document.getElementById('mrWhiteToggle').checked =mrWhiteOn;
  document.getElementById('hideWordsToggle').checked=wordsHidden;
  setWordLang(wordLang);
  document.getElementById('word1').value='';
  document.getElementById('word2').value='';
  pickHiddenWords();
  updateWordVisibilityUI();
  updateUnderSug();
  updateOrderUI();
  updatePlayerCountBadge();
  goTo('screen-config');
}

function goHome() { window.location.href='../index.html'; }


/* ── 15. Initialisation ────────────────────────────────────── */
/* shared.js already called loadShared() so LANG and PLAYERS are ready */
applyLang();
updatePlayerCountBadge();
