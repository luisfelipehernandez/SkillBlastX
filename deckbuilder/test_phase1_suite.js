/**
 * Suite de Pruebas Automatizadas - FASE 1:
 * Cartas Huérfanas (BBX-SP120, BBX-SP058) y Simetría Total de Efectos de Banca
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createMockElement(id = '') {
  return {
    id,
    style: {},
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); }
    },
    addEventListener(evt, fn) {
      this._listeners = this._listeners || {};
      this._listeners[evt] = this._listeners[evt] || [];
      this._listeners[evt].push(fn);
    },
    dispatchEvent(evt) {
      if (this._listeners && this._listeners[evt.type]) {
        this._listeners[evt.type].forEach(fn => fn(evt));
      }
    },
    appendChild(child) {
      this._children = this._children || [];
      this._children.push(child);
      return child;
    },
    querySelector() { return createMockElement(); },
    querySelectorAll() { return []; },
    remove() {},
    closest() { return null; },
    setAttribute() {},
    getAttribute() { return null; },
    removeAttribute() {},
    innerHTML: '',
    textContent: '',
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 50, height: 50 })
  };
}

const capturedLogs = [];
const capturedAlerts = [];
let capturedContextMenu = null;

const sandbox = {
  console: {
    log: () => {},
    warn: () => {},
    error: () => {}
  },
  setTimeout: (fn) => { fn(); return 1; },
  clearTimeout: () => {},
  setInterval: () => {},
  clearInterval: () => {},
  alert: (msg) => { capturedAlerts.push(msg); },
  addEventListener: () => {},
  removeEventListener: () => {},
  window: {},
  document: {
    getElementById: (id) => createMockElement(id),
    createElement: (tag) => createMockElement(tag),
    querySelector: (sel) => createMockElement(sel),
    querySelectorAll: (sel) => [],
    body: createMockElement('body'),
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  localStorage: { getItem: () => null, setItem: () => {} }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);

// Cargar cartas
const cartasPath = path.resolve(__dirname, '../cartas.json');
const rawCards = JSON.parse(fs.readFileSync(cartasPath, 'utf8'));

// Cargar scripts
const scripts = [
  'js/core/rulesEngine.js',
  'js/core/dispatcher.js',
  'js/effects/graveEffects.js',
  'js/effects/handEffects.js',
  'js/effects/benchEffects.js',
  'js/effects/expansionSetEffects.js',
  'js/ai/aiDecks.js',
  'js/ai/executors/harukaExecutor.js',
  'js/ai/aiEngine.js',
  'app.js'
];

for (const scr of scripts) {
  const scrPath = path.resolve(__dirname, scr);
  if (fs.existsSync(scrPath)) {
    const code = fs.readFileSync(scrPath, 'utf8');
    vm.runInContext(code, sandbox);
  }
}

sandbox.allCards = rawCards;
rawCards.forEach(c => {
  sandbox.cardsDatabase[c.id] = c;
});

sandbox.addLog = (msg, color) => {
  capturedLogs.push({ msg, color });
};
sandbox.showContextMenu = (e, items) => {
  capturedContextMenu = items;
};
sandbox.openCardChooserModal = (targets, title, cb) => cb(0);
sandbox.openUpToMultiCardChooserModal = (items, title, maxQty, cb) => cb(items.map((_, i) => i));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, failureDetails = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName}`);
  } else {
    failedTests++;
    console.log(`  \x1b[31m✖ FAIL\x1b[0m: ${testName}`);
    if (failureDetails) console.log(`     -> \x1b[33mDetalles: ${failureDetails}\x1b[0m`);
  }
}

function resetState() {
  capturedLogs.length = 0;
  capturedAlerts.length = 0;
  capturedContextMenu = null;

  const target = sandbox.playtestState;
  for (const k of Object.keys(target)) {
    delete target[k];
  }
  Object.assign(target, {
    matchEnded: false,
    turnOwner: 'player',
    turnCount: 1,
    isDuelVsAI: false,
    deck: ['BBX-SP001', 'BBX-SP002', 'BBX-SP003', 'BBX-SP004', 'BBX-SP005', 'BBX-SP006', 'BBX-SP007'],
    hand: [],
    grave: [],
    bench: [],
    slots: [
      { character: null, skills: [], usedSkills: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false },
      { character: null, skills: [], usedSkills: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false },
      { character: null, skills: [], usedSkills: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false }
    ],
    opponentDeck: ['BBX-SP001', 'BBX-SP002', 'BBX-SP003', 'BBX-SP004', 'BBX-SP005', 'BBX-SP006', 'BBX-SP007'],
    opponentHand: [],
    opponentGrave: [],
    opponentBench: [],
    opponentSlots: [
      { character: null, skills: [], usedSkills: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false },
      { character: null, skills: [], usedSkills: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false },
      { character: null, skills: [], usedSkills: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false }
    ],
    cannotDrawByEffectsThisTurn: false,
    opponentCannotDrawByEffectsThisTurn: false,
    usedGlobalEffects: [],
    opponentUsedGlobalEffects: []
  });
}

console.log('\n======================================================');
console.log('   SUITE DE PRUEBAS AUTOMATIZADAS - SKILL BLAST X');
console.log('   FASE 1: Cartas Huérfanas y Simetría de Banca');
console.log('======================================================\n');

// =========================================================================
// 1. CARTA HUÉRFANA: RYU-CHAN (BBX-SP120) - INVOCACIÓN DESDE MANO
// =========================================================================
console.log('1. Ryu-chan (BBX-SP120) - Al ser jugada desde mano:');

// 1.1 Jugador controla Nara: roba 2 cartas
resetState();
sandbox.playtestState.slots[0].character = 'BBX-SP119'; // Nara (SP119)
sandbox.playtestState.slots[1].character = 'BBX-SP120'; // Ryu-chan jugada
sandbox.checkAndTriggerRyuChanPlay(1, 'player', { autoActivate: true });
assert(
  sandbox.playtestState.hand.length === 2 && sandbox.playtestState.deck.length === 5,
  '1.1 Jugador con Nara en campo roba 2 cartas al jugar Ryu-chan (BBX-SP120)'
);

// 1.2 Jugador NO controla Nara: no roba cartas
resetState();
sandbox.playtestState.slots[0].character = 'BBX-SP091'; // Deida (no Nara)
sandbox.playtestState.slots[1].character = 'BBX-SP120';
sandbox.checkAndTriggerRyuChanPlay(1, 'player', { autoActivate: true });
assert(
  sandbox.playtestState.hand.length === 0,
  '1.2 Jugador sin Nara en campo no roba cartas'
);

// 1.3 Bloqueo de robo por Helica SP165 (cannotDrawByEffectsThisTurn)
resetState();
sandbox.playtestState.slots[0].character = 'BBX-SP119'; // Nara
sandbox.playtestState.cannotDrawByEffectsThisTurn = true;
sandbox.checkAndTriggerRyuChanPlay(1, 'player', { autoActivate: true });
assert(
  sandbox.playtestState.hand.length === 0,
  '1.3 Robo de Ryu-chan bloqueado si cannotDrawByEffectsThisTurn es true'
);

// 1.4 Simetría para el Rival en Sandbox
resetState();
sandbox.playtestState.opponentSlots[0].character = 'BBX-SP119'; // Nara rival
sandbox.playtestState.opponentSlots[1].character = 'BBX-SP120';
sandbox.checkAndTriggerRyuChanPlay(1, 'opponent', { autoActivate: true });
assert(
  sandbox.playtestState.opponentHand.length === 2 && sandbox.playtestState.opponentDeck.length === 5,
  '1.4 Rival con Nara en campo roba 2 cartas al jugar Ryu-chan (BBX-SP120)'
);


// =========================================================================
// 2. CARTA HUÉRFANA: TAGERO (BBX-SP058) - INICIO DEL TURNO RIVAL
// =========================================================================
console.log('\n2. Tagero (BBX-SP058) - Al comienzo del turno del adversario:');

// 2.1 Jugador controla Tagero SP058 con 2 Skills al inicio del turno del Rival
resetState();
sandbox.playtestState.slots[0] = {
  character: 'BBX-SP058',
  skills: ['BBX-SP001', 'BBX-SP002'],
  effectUsed: false
};
const rivalDrawn = 'BBX-SP003';
sandbox.playtestState.opponentHand = [rivalDrawn];
sandbox.playtestState.opponentDeck = ['BBX-SP004', 'BBX-SP005'];

sandbox.checkTageroSP058StartTurnPlayer(rivalDrawn, () => {});
if (capturedContextMenu && capturedContextMenu[1]) {
  capturedContextMenu[1].action(); // "Activar Tagero..."
}

assert(
  sandbox.playtestState.slots[0].skills.length === 1 &&
  sandbox.playtestState.grave.includes('BBX-SP001'),
  '2.1 Tagero del jugador sacrifica 1 Skill y la envía al cementerio'
);
assert(
  !sandbox.playtestState.opponentHand.includes(rivalDrawn) &&
  sandbox.playtestState.opponentDeck[sandbox.playtestState.opponentDeck.length - 1] === rivalDrawn,
  '2.1 La carta robada por el rival va al fondo del mazo del rival'
);
assert(
  sandbox.playtestState.slots[0].effectUsed === true,
  '2.1 Tagero queda marcado como effectUsed = true'
);

// 2.2 Tagero con solo 1 Skill NO se activa (Requisito: 2 o más Skills)
resetState();
sandbox.playtestState.slots[0] = {
  character: 'BBX-SP058',
  skills: ['BBX-SP001'],
  effectUsed: false
};
sandbox.playtestState.opponentHand = [rivalDrawn];
sandbox.checkTageroSP058StartTurnPlayer(rivalDrawn, () => {});
assert(
  sandbox.playtestState.slots[0].skills.length === 1 &&
  sandbox.playtestState.opponentHand.includes(rivalDrawn),
  '2.2 Tagero con menos de 2 Skills no activa su efecto'
);

// 2.3 Simetría: Tagero del Rival con 2 Skills al inicio del turno del Jugador
resetState();
sandbox.playtestState.opponentSlots[0] = {
  character: 'BBX-SP058',
  skills: ['BBX-SP001', 'BBX-SP002'],
  effectUsed: false
};
const playerDrawn = 'BBX-SP003';
sandbox.playtestState.hand = [playerDrawn];
sandbox.playtestState.deck = ['BBX-SP004', 'BBX-SP005'];

sandbox.checkTageroSP058StartTurnOpponent(playerDrawn, () => {});
if (capturedContextMenu && capturedContextMenu[1]) {
  capturedContextMenu[1].action();
}

assert(
  sandbox.playtestState.opponentSlots[0].skills.length === 1 &&
  sandbox.playtestState.opponentGrave.includes('BBX-SP001'),
  '2.3 Tagero rival sacrifica 1 Skill al cementerio rival'
);
assert(
  !sandbox.playtestState.hand.includes(playerDrawn) &&
  sandbox.playtestState.deck[sandbox.playtestState.deck.length - 1] === playerDrawn,
  '2.3 La carta robada por el jugador va al fondo del mazo del jugador'
);


// =========================================================================
// 3. SIMETRÍA Y RESOLUCIÓN DE LAS 12 CARTAS DE BANCA (OPPONENT SANDBOX)
// =========================================================================
console.log('\n3. Simetría de las 12 Cartas de Banca en Modo Sandbox Rival:');

// 3.1 Helica BBX-SP099: Revelar 3, añadir Personaje
resetState();
sandbox.playtestState.turnOwner = 'opponent';
sandbox.playtestState.opponentBench = [{ id: 'BBX-SP099', effectUsed: false }];
sandbox.playtestState.opponentDeck = ['BBX-SP119', 'BBX-SP001', 'BBX-SP002']; // SP119 es Personaje
sandbox.activateOpponentHelicaBenchSP099(0, 'BBX-SP119');
assert(
  sandbox.playtestState.opponentHand.includes('BBX-SP119') &&
  sandbox.playtestState.opponentBench[0].effectUsed === true,
  '3.1 [SP099 Helica] Rival revela y añade Personaje a mano'
);

// 3.2 Katherine BBX-SP105: Barajar Skill de Katherine de cementerio a deck
resetState();
sandbox.playtestState.turnOwner = 'opponent';
sandbox.playtestState.opponentBench = [{ id: 'BBX-SP105', effectUsed: false }];
sandbox.playtestState.opponentGrave = ['BBX-SP081']; // Skill Katherine (Hackeo)
sandbox.activateOpponentKatherineBenchSP105(0, 'BBX-SP081');
assert(
  sandbox.playtestState.opponentDeck.includes('BBX-SP081') &&
  !sandbox.playtestState.opponentGrave.includes('BBX-SP081'),
  '3.2 [SP105 Katherine] Rival baraja Skill propia de cementerio al mazo'
);

// 3.3 Ryu-chan BBX-SP126: Revelar 3, añadir Skill propia Nara/Ryu-chan
resetState();
sandbox.playtestState.turnOwner = 'opponent';
sandbox.playtestState.opponentBench = [{ id: 'BBX-SP126', effectUsed: false }];
sandbox.playtestState.opponentDeck = ['BBX-SP163', 'BBX-SP001', 'BBX-SP002']; // SP163 Skill Ryu-chan
sandbox.activateOpponentRyuChanBenchSP126(0, 'BBX-SP163');
assert(
  sandbox.playtestState.opponentHand.includes('BBX-SP163') &&
  sandbox.playtestState.opponentBench[0].effectUsed === true,
  '3.3 [SP126 Ryu-chan] Rival revela y añade Skill propia a mano'
);

// 3.4 Ryu-chan BBX-SP183: Buscar y añadir 1 Personaje Nara
resetState();
sandbox.playtestState.turnOwner = 'opponent';
sandbox.playtestState.opponentBench = [{ id: 'BBX-SP183', effectUsed: false }];
sandbox.playtestState.opponentDeck = ['BBX-SP119', 'BBX-SP001']; // SP119 es Nara
sandbox.activateOpponentRyuChanBenchSP183(0, 'BBX-SP119');
assert(
  sandbox.playtestState.opponentHand.includes('BBX-SP119'),
  '3.4 [SP183 Ryu-chan] Rival busca y añade Personaje Nara del deck a mano'
);

// 3.5 Helica BBX-SP193: Buscar Puerta sagrada o Acorralar
resetState();
sandbox.playtestState.turnOwner = 'opponent';
sandbox.playtestState.opponentBench = [{ id: 'BBX-SP193', effectUsed: false }];
sandbox.playtestState.opponentDeck = ['BBX-SP177', 'BBX-SP001']; // SP177 Puerta sagrada
sandbox.activateOpponentHelicaBenchSP193(0, 'BBX-SP177');
assert(
  sandbox.playtestState.opponentHand.includes('BBX-SP177'),
  '3.5 [SP193 Helica] Rival busca y añade Puerta sagrada a su mano'
);

// 3.6 Katshi BBX-SP242: Enviar Katshi de deck a cementerio
resetState();
sandbox.playtestState.turnOwner = 'opponent';
sandbox.playtestState.opponentBench = [{ id: 'BBX-SP242', effectUsed: false }];
sandbox.playtestState.opponentDeck = ['BBX-SP029', 'BBX-SP001']; // SP029 es Katshi
sandbox.activateOpponentKatshiBenchSP242(0, 'BBX-SP029');
assert(
  sandbox.playtestState.opponentGrave.includes('BBX-SP029'),
  '3.6 [SP242 Katshi] Rival envía Personaje Katshi de deck a cementerio'
);

// 3.7 Katherine BBX-SP248: Barajar Skill portada
resetState();
sandbox.playtestState.turnOwner = 'opponent';
sandbox.playtestState.opponentBench = [{ id: 'BBX-SP248', effectUsed: false }];
sandbox.playtestState.slots[0] = { character: 'BBX-SP119', skills: ['BBX-SP001'] };
sandbox.activateOpponentKatherineBenchSP248(0, { owner: 'player', slotIndex: 0, id: 'BBX-SP001', charName: 'Nara' });
assert(
  sandbox.playtestState.slots[0].skills.length === 0 &&
  sandbox.playtestState.deck.includes('BBX-SP001'),
  '3.7 [SP248 Katherine] Rival baraja Skill portada del jugador al mazo del jugador'
);

// 3.8 Eishet BBX-SP278: Barajar hasta 2 Skills de Eishet de cementerio
resetState();
sandbox.playtestState.turnOwner = 'opponent';
sandbox.playtestState.opponentBench = [{ id: 'BBX-SP278', effectUsed: false }];
sandbox.playtestState.opponentGrave = ['BBX-SP276', 'BBX-SP277']; // Skills de Eishet
sandbox.activateOpponentEishetBenchSP278(0);
assert(
  sandbox.playtestState.opponentDeck.includes('BBX-SP276') &&
  sandbox.playtestState.opponentDeck.includes('BBX-SP277'),
  '3.8 [SP278 Eishet] Rival baraja Skills de Eishet del cementerio al mazo'
);

// 3.9 Chiako BBX-SP280: Forzar carta de mano del jugador a fondo del deck
resetState();
sandbox.playtestState.turnOwner = 'opponent';
sandbox.playtestState.opponentBench = [{ id: 'BBX-SP280', effectUsed: false }];
sandbox.playtestState.hand = ['BBX-SP001'];
sandbox.playtestState.deck = ['BBX-SP002'];
sandbox.activateOpponentChiakoBenchSP280(0);
assert(
  sandbox.playtestState.hand.length === 0 &&
  sandbox.playtestState.deck[sandbox.playtestState.deck.length - 1] === 'BBX-SP001',
  '3.9 [SP280 Chiako] Rival fuerza al jugador a poner carta de mano al fondo del deck'
);

// 3.10 Katherine BBX-SP285: Revelar 3, enviar 1 al cementerio
resetState();
sandbox.playtestState.turnOwner = 'opponent';
sandbox.playtestState.opponentBench = [{ id: 'BBX-SP285', effectUsed: false }];
sandbox.playtestState.opponentDeck = ['BBX-SP001', 'BBX-SP002', 'BBX-SP003'];
sandbox.activateOpponentKatherineBenchSP285(0);
assert(
  sandbox.playtestState.opponentGrave.includes('BBX-SP001') &&
  sandbox.playtestState.opponentDeck.length === 2,
  '3.10 [SP285 Katherine] Rival revela 3 y envía 1 al cementerio'
);

// 3.11 Lyna BBX-SP286: Buscar y añadir 1 Personaje Lyna
resetState();
sandbox.playtestState.turnOwner = 'opponent';
sandbox.playtestState.opponentBench = [{ id: 'BBX-SP286', effectUsed: false }];
sandbox.playtestState.opponentDeck = ['BBX-SP281', 'BBX-SP001']; // SP281 Lyna
sandbox.activateOpponentLynaBenchSP286(0);
assert(
  sandbox.playtestState.opponentHand.includes('BBX-SP281'),
  '3.11 [SP286 Lyna] Rival busca y añade Personaje Lyna de deck a mano'
);


// =========================================================================
// 4. DESPACHADOR MODULAR UNIFICADO: BenchEffects.execute
// =========================================================================
console.log('\n4. Despachador Modular Unificado (BenchEffects.execute):');

resetState();
sandbox.playtestState.turnOwner = 'opponent';
sandbox.playtestState.opponentBench = [{ id: 'BBX-SP183', effectUsed: false }];
sandbox.playtestState.opponentDeck = ['BBX-SP119', 'BBX-SP001'];
const modularRes = sandbox.BenchEffects.execute('BBX-SP183', 0, 'opponent');
assert(
  modularRes !== false && sandbox.playtestState.opponentHand.includes('BBX-SP119'),
  '4.1 BenchEffects.execute("BBX-SP183", 0, "opponent") despacha exitosamente'
);


// =========================================================================
// 5. INTELIGENCIA ARTIFICIAL: TÁCTICAS DE BANCA EN DUELO AUTOMÁTICO
// =========================================================================
console.log('\n5. Inteligencia Artificial (AI Engine Paso 1.5):');

resetState();
sandbox.playtestState.isDuelVsAI = true;
sandbox.playtestState.turnOwner = 'opponent';
sandbox.playtestState.turnCount = 2;
sandbox.playtestState.opponentBench = [
  { id: 'BBX-SP183', effectUsed: false } // Ryu-chan buscar Nara
];
sandbox.playtestState.opponentDeck = ['BBX-SP119', 'BBX-SP001', 'BBX-SP002', 'BBX-SP003'];

let aiPromise = sandbox.AIEngine.executeOpponentTurn({ skipDelay: true });
aiPromise.then(() => {
  assert(
    sandbox.playtestState.opponentHand.includes('BBX-SP119'),
    '5.1 La IA en Paso 1.5 activa tácticamente a Ryu-chan (SP183) para buscar a Nara'
  );

  console.log('\n======================================================');
  console.log(`TOTAL PRUEBAS FASE 1: ${totalTests} | PASADAS: ${passedTests} | FALLIDAS: ${failedTests}`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}).catch(err => {
  console.error("Error en pruebas de IA:", err);
  process.exit(1);
});
