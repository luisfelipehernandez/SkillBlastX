/**
 * Suite de Pruebas Automatizadas - FASE 2:
 * Efectos de Mano (HandEffects) y Efectos de Cementerio (GraveEffects)
 * Paridad 100% Simétrica: Jugador, Rival en Sandbox y Motor de Inteligencia Artificial
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
  // Auto-activar si tiene opción de activar
  if (items && items.length > 0) {
    const act = items.find(it => !it.disabled && it.action);
    if (act) act.action();
  }
};
sandbox.openCardChooserModal = (targets, title, cb) => cb(0);
sandbox.openUpToMultiCardChooserModal = (targets, title, max, cb) => cb([0]);

sandbox.updatePlaytestView = () => {};
sandbox.renderSlots = () => {};
sandbox.renderHand = () => {};
sandbox.renderOpponentHand = () => {};

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✔ PASS: ${message}`);
  } else {
    console.error(`  ✖ FAIL: ${message}`);
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
    turnCount: 1,
    turnOwner: 'player',
    matchEnded: false,
    cannotDrawByEffectsThisTurn: false,
    opponentCannotDrawByEffectsThisTurn: false,
    skillsRemovedByEffectThisTurn: 0,
    usedGlobalEffects: [],
    opponentUsedGlobalEffects: [],
    usedPerGameEffects: [],
    opponentUsedPerGameEffects: [],
    slots: [
      { character: null, skills: [], usedSkills: [], effectUsed: false, attackedThisTurn: false, isRotated: false },
      { character: null, skills: [], usedSkills: [], effectUsed: false, attackedThisTurn: false, isRotated: false },
      { character: null, skills: [], usedSkills: [], effectUsed: false, attackedThisTurn: false, isRotated: false }
    ],
    opponentSlots: [
      { character: null, skills: [], usedSkills: [], effectUsed: false, attackedThisTurn: false, isRotated: false },
      { character: null, skills: [], usedSkills: [], effectUsed: false, attackedThisTurn: false, isRotated: false },
      { character: null, skills: [], usedSkills: [], effectUsed: false, attackedThisTurn: false, isRotated: false }
    ],
    bench: [],
    opponentBench: [],
    hand: [],
    opponentHand: [],
    deck: [],
    opponentDeck: [],
    grave: [],
    opponentGrave: []
  });
}

console.log("\n======================================================");
console.log("   SUITE DE PRUEBAS AUTOMATIZADAS - SKILL BLAST X");
console.log("   FASE 2: Efectos de Mano y Efectos de Cementerio");
console.log("======================================================\n");

// -----------------------------------------------------------------------------
// 1. Efectos Activos de Mano (Descartes y Búsquedas) - Jugador y Rival
// -----------------------------------------------------------------------------
console.log("1. Activaciones Modulares de Mano (HandEffects):");

// 1.1 Despliegue (BBX-SP092)
resetState();
sandbox.playtestState.hand = ['BBX-SP092'];
sandbox.playtestState.deck = ['BBX-SP223']; // Deida
sandbox.HandEffects.execute('BBX-SP092', 0, 'player');
assert(sandbox.playtestState.hand.includes('BBX-SP223') && sandbox.playtestState.grave.includes('BBX-SP092'),
  "1.1 [Jugador SP092 Despliegue] Busca Personaje Deida y envía Despliegue al cementerio");

resetState();
sandbox.playtestState.turnOwner = 'opponent';
sandbox.playtestState.opponentHand = ['BBX-SP092'];
sandbox.playtestState.opponentDeck = ['BBX-SP223'];
sandbox.HandEffects.execute('BBX-SP092', 0, 'opponent');
assert(sandbox.playtestState.opponentHand.includes('BBX-SP223') && sandbox.playtestState.opponentGrave.includes('BBX-SP092'),
  "1.1 [Rival SP092 Despliegue] Busca Personaje Deida y envía Despliegue al cementerio");

// 1.2 Estudio (BBX-SP098)
resetState();
sandbox.playtestState.hand = ['BBX-SP098'];
sandbox.playtestState.deck = ['BBX-SP098', 'BBX-SP098', 'BBX-SP001'];
sandbox.HandEffects.execute('BBX-SP098', 0, 'player', { count: 2 });
assert(sandbox.playtestState.hand.filter(id => id === 'BBX-SP098').length === 2 && sandbox.playtestState.grave.includes('BBX-SP098'),
  "1.2 [Jugador SP098 Estudio] Añade hasta 2 copias de Estudio a mano");

resetState();
sandbox.playtestState.opponentHand = ['BBX-SP098'];
sandbox.playtestState.opponentDeck = ['BBX-SP098', 'BBX-SP098', 'BBX-SP001'];
sandbox.HandEffects.execute('BBX-SP098', 0, 'opponent', { count: 2 });
assert(sandbox.playtestState.opponentHand.filter(id => id === 'BBX-SP098').length === 2 && sandbox.playtestState.opponentGrave.includes('BBX-SP098'),
  "1.2 [Rival SP098 Estudio] Añade hasta 2 copias de Estudio a mano");

// 1.3 Katherine (BBX-SP101)
resetState();
sandbox.playtestState.slots[0].character = 'BBX-SP080'; // Katherine
sandbox.playtestState.hand = ['BBX-SP101'];
sandbox.playtestState.deck = ['BBX-SP001', 'BBX-SP002'];
sandbox.HandEffects.execute('BBX-SP101', 0, 'player', { discardIndex: 0 });
assert(sandbox.playtestState.hand.length === 1 && sandbox.playtestState.grave.length === 2,
  "1.3 [Jugador SP101 Katherine] Roba 2 y descarta 1 con Katherine en campo");

resetState();
sandbox.playtestState.opponentSlots[0].character = 'BBX-SP080';
sandbox.playtestState.opponentHand = ['BBX-SP101'];
sandbox.playtestState.opponentDeck = ['BBX-SP001', 'BBX-SP002'];
sandbox.HandEffects.execute('BBX-SP101', 0, 'opponent', { discardIndex: 0 });
assert(sandbox.playtestState.opponentHand.length === 1 && sandbox.playtestState.opponentGrave.length === 2,
  "1.3 [Rival SP101 Katherine] Roba 2 y descarta 1 con Katherine en campo");

// 1.4 Vendaval de cristales (BBX-SP102) con y sin Lluvia de cristal (BBX-SP362)
resetState();
sandbox.playtestState.bench = [{ id: 'BBX-SP099' }]; // Helica
sandbox.playtestState.hand = ['BBX-SP102'];
sandbox.playtestState.opponentSlots[0] = { character: 'BBX-SP001', skills: ['BBX-SP008'] };
sandbox.HandEffects.execute('BBX-SP102', 0, 'player');
assert(sandbox.playtestState.opponentSlots[0].skills.length === 0 && sandbox.playtestState.opponentGrave.includes('BBX-SP008'),
  "1.4 [Jugador SP102 Vendaval] Destruye 1 Skill equipada del rival según Helica en banca");

resetState();
sandbox.playtestState.bench = [{ id: 'BBX-SP099' }]; // Helica
sandbox.playtestState.slots[0] = { character: 'BBX-SP001', skills: ['BBX-SP362'] }; // Lluvia de cristal duplica!
sandbox.playtestState.hand = ['BBX-SP102'];
sandbox.playtestState.opponentSlots[0] = { character: 'BBX-SP001', skills: ['BBX-SP008', 'BBX-SP010'] };
sandbox.HandEffects.execute('BBX-SP102', 0, 'player');
assert(sandbox.playtestState.opponentSlots[0].skills.length === 0,
  "1.4 [Jugador SP102 Vendaval] Lluvia de cristal duplica la destrucción de Skills");

// 1.5 Rango de delegado (BBX-SP113)
resetState();
sandbox.playtestState.bench = [{ id: 'BBX-SP099' }, { id: 'BBX-SP193' }]; // 2 Helicas
sandbox.playtestState.hand = ['BBX-SP113'];
sandbox.playtestState.deck = ['BBX-SP001', 'BBX-SP002'];
sandbox.HandEffects.execute('BBX-SP113', 0, 'player');
assert(sandbox.playtestState.hand.length === 2 && sandbox.playtestState.usedGlobalEffects.includes("Rango de delegado"),
  "1.5 [Jugador SP113 Rango de delegado] Roba 2 cartas por 2 Helicas en banca y marca HOPT");

// 1.6 Katshi (BBX-SP114)
resetState();
sandbox.playtestState.hand = ['BBX-SP114'];
sandbox.playtestState.deck = ['BBX-SP041', 'BBX-SP001'];
sandbox.HandEffects.execute('BBX-SP114', 0, 'player');
assert(sandbox.playtestState.hand.includes('BBX-SP041') && sandbox.playtestState.hand.length === 2,
  "1.6 [Jugador SP114 Katshi] Busca ¡Devastar! y roba 1 carta adicional");

// 1.7 Roy (BBX-SP130)
resetState();
sandbox.playtestState.hand = ['BBX-SP130'];
sandbox.playtestState.grave = ['BBX-SP010']; // Investigación
sandbox.playtestState.opponentSlots[0] = { character: 'BBX-SP001', skills: ['BBX-SP008'] };
sandbox.HandEffects.execute('BBX-SP130', 0, 'player');
assert(sandbox.playtestState.opponentSlots[0].skills.length === 0,
  "1.7 [Jugador SP130 Roy] Destruye Skill por Investigación en cementerio");

// 1.8 Marina (BBX-SP154)
resetState();
sandbox.playtestState.hand = ['BBX-SP154'];
sandbox.playtestState.deck = ['BBX-SP044', 'BBX-SP001'];
sandbox.HandEffects.execute('BBX-SP154', 0, 'player');
assert(sandbox.playtestState.hand.includes('BBX-SP044') && sandbox.playtestState.hand.length === 2,
  "1.8 [Jugador SP154 Marina] Busca Pilares de hielo y roba 1 carta");

// 1.9 Marina (BBX-SP178) y Nara (BBX-SP179)
resetState();
sandbox.playtestState.slots[0] = { character: 'BBX-SP003', skills: [] }; // Marina
sandbox.playtestState.hand = ['BBX-SP178'];
sandbox.HandEffects.execute('BBX-SP178', 0, 'player');
assert(sandbox.playtestState.slots[0].maxAttacks === 2,
  "1.9 [Jugador SP178 Marina] Otorga hasta 2 ataques a Marina en campo");

resetState();
sandbox.playtestState.slots[0] = { character: 'BBX-SP120', skills: [] }; // Ryu-chan
sandbox.playtestState.hand = ['BBX-SP179'];
sandbox.HandEffects.execute('BBX-SP179', 0, 'player');
assert(sandbox.playtestState.slots[0].maxAttacks === 3,
  "1.9 [Jugador SP179 Nara] Otorga hasta 3 ataques a Ryu-chan en campo");

// 1.10 Sophia (BBX-SP190)
resetState();
sandbox.playtestState.slots[0] = { character: 'BBX-SP032', skills: [] };
sandbox.playtestState.deck = ['BBX-SP064']; // Dirigir el caos
sandbox.playtestState.hand = ['BBX-SP190'];
sandbox.HandEffects.execute('BBX-SP190', 0, 'player');
assert(sandbox.playtestState.slots[0].skills.includes('BBX-SP064'),
  "1.10 [Jugador SP190 Sophia] Porta Dirigir el caos desde deck a personaje en campo");

// 1.11 ¡No me rendiré! (BBX-SP194)
resetState();
sandbox.playtestState.slots = [{ character: null, skills: [] }, { character: null, skills: [] }, { character: null, skills: [] }];
sandbox.playtestState.deck = ['BBX-SP001'];
sandbox.playtestState.hand = ['BBX-SP194'];
sandbox.HandEffects.execute('BBX-SP194', 0, 'player');
assert(sandbox.playtestState.slots[0].character === 'BBX-SP001' && sandbox.playtestState.slots[0].skills.includes('BBX-SP194'),
  "1.11 [Jugador SP194 ¡No me rendiré!] Invoca personaje del deck y porta la Skill");

// 1.12 Estocada de cristal (BBX-SP197)
resetState();
sandbox.playtestState.slots[0] = { character: 'BBX-SP199', skills: [] }; // Helica Avanzada
sandbox.playtestState.hand = ['BBX-SP197'];
sandbox.HandEffects.execute('BBX-SP197', 0, 'player');
assert(sandbox.playtestState.slots[0].maxAttacks === 3,
  "1.12 [Jugador SP197 Estocada] Otorga hasta 3 ataques a Helica Avanzada");

// 1.13 Deida (BBX-SP223) y Katherine (BBX-SP228)
resetState();
sandbox.playtestState.hand = ['BBX-SP223'];
sandbox.playtestState.deck = ['BBX-SP174', 'BBX-SP001']; // Resplandor certero
sandbox.HandEffects.execute('BBX-SP223', 0, 'player');
assert(sandbox.playtestState.hand.includes('BBX-SP174'),
  "1.13 [Jugador SP223 Deida] Busca Resplandor certero y roba 1");

resetState();
sandbox.playtestState.hand = ['BBX-SP228'];
sandbox.playtestState.deck = ['BBX-SP203']; // Bola de fuego
sandbox.HandEffects.execute('BBX-SP228', 0, 'player');
assert(sandbox.playtestState.grave.includes('BBX-SP203') || sandbox.playtestState.hand.includes('BBX-SP203'),
  "1.13 [Jugador SP228 Katherine] Busca Bola de fuego y descarta 1");

// 1.14 Descenso (BBX-SP241)
resetState();
sandbox.playtestState.bench = [{ id: 'BBX-SP001' }, { id: 'BBX-SP002' }];
sandbox.playtestState.deck = ['BBX-SP007', 'BBX-SP008'];
sandbox.playtestState.hand = ['BBX-SP241'];
sandbox.HandEffects.execute('BBX-SP241', 0, 'player');
assert(sandbox.playtestState.hand.length === 2,
  "1.14 [Jugador SP241 Descenso] Sin personajes en campo roba por banca");

// 1.15 Instinto desatado (BBX-SP412)
resetState();
sandbox.playtestState.slots[0] = { character: 'BBX-SP001', skills: [] };
sandbox.playtestState.deck = ['BBX-SP007']; // Katshi
sandbox.playtestState.hand = ['BBX-SP412'];
sandbox.HandEffects.execute('BBX-SP412', 0, 'player');
assert(sandbox.playtestState.slots[0].character === 'BBX-SP007' && sandbox.playtestState.slots[0].skills.includes('BBX-SP412') && sandbox.playtestState.usedPerGameEffects.includes('BBX-SP412'),
  "1.15 [Jugador SP412 Instinto desatado] Envía personaje, invoca Katshi y porta SP412 (1 vez por partida)");

// -----------------------------------------------------------------------------
// 2. Efectos Disparados de Cementerio (GraveEffects) y Nuevas Implementaciones
// -----------------------------------------------------------------------------
console.log("\n2. Efectos de Cementerio (GraveEffects):");

// 2.1 Fuego digital (BBX-SP329)
resetState();
sandbox.playtestState.deck = ['BBX-SP080']; // Katherine
sandbox.playtestState.grave = ['BBX-SP329'];
sandbox.dispatchGraveTriggers('BBX-SP329', 'player', { fromZone: 'deck' });
assert(sandbox.playtestState.bench.some(b => b.id === 'BBX-SP080'),
  "2.1 [Jugador SP329 Fuego digital] Coloca a Katherine en banca desde deck");

resetState();
sandbox.playtestState.opponentDeck = ['BBX-SP080'];
sandbox.playtestState.opponentGrave = ['BBX-SP329'];
sandbox.dispatchGraveTriggers('BBX-SP329', 'opponent', { fromZone: 'deck' });
assert(sandbox.playtestState.opponentBench.some(b => b.id === 'BBX-SP080'),
  "2.1 [Rival SP329 Fuego digital] Coloca a Katherine en banca rival desde deck");

// 2.2 Tajo ventada (BBX-SP313)
resetState();
sandbox.playtestState.slots[0] = { character: 'BBX-SP270', skills: [] }; // Lyna
sandbox.playtestState.deck = ['BBX-SP271', 'BBX-SP272']; // Skills Lyna
sandbox.playtestState.grave = ['BBX-SP313'];
sandbox.dispatchGraveTriggers('BBX-SP313', 'player', { isEquipped: true });
assert(sandbox.playtestState.slots[0].skills.length === 2,
  "2.2 [Jugador SP313 Tajo ventada] Porta 2 Skills de Lyna desde deck al ser enviada");

resetState();
sandbox.playtestState.opponentSlots[0] = { character: 'BBX-SP270', skills: [] };
sandbox.playtestState.opponentDeck = ['BBX-SP271', 'BBX-SP272'];
sandbox.playtestState.opponentGrave = ['BBX-SP313'];
sandbox.dispatchGraveTriggers('BBX-SP313', 'opponent', { isEquipped: true });
assert(sandbox.playtestState.opponentSlots[0].skills.length === 2,
  "2.2 [Rival SP313 Tajo ventada] Porta 2 Skills de Lyna desde deck al ser enviada");

// 2.3 Por allá... (BBX-SP325)
resetState();
sandbox.playtestState.deck = ['BBX-SP270']; // Lyna
sandbox.playtestState.grave = ['BBX-SP325'];
sandbox.dispatchGraveTriggers('BBX-SP325', 'player', { isEquipped: true });
assert(sandbox.playtestState.hand.includes('BBX-SP270') && sandbox.playtestState.usedGlobalEffects.includes("Por allá..."),
  "2.3 [Jugador SP325 Por allá...] Añade Personaje Lyna a mano y marca HOPT");

resetState();
sandbox.playtestState.opponentDeck = ['BBX-SP270'];
sandbox.playtestState.opponentGrave = ['BBX-SP325'];
sandbox.dispatchGraveTriggers('BBX-SP325', 'opponent', { isEquipped: true });
assert(sandbox.playtestState.opponentHand.includes('BBX-SP270') && sandbox.playtestState.opponentUsedGlobalEffects.includes("Por allá..."),
  "2.3 [Rival SP325 Por allá...] Añade Personaje Lyna a mano rival y marca HOPT");

// 2.4 ¡¿Llamarada?! (BBX-SP087)
resetState();
sandbox.playtestState.opponentDeck = ['BBX-SP001', 'BBX-SP002', 'BBX-SP007'];
sandbox.dispatchGraveTriggers('BBX-SP087', 'player');
assert(sandbox.playtestState.opponentGrave.length === 2 && sandbox.playtestState.opponentDeck.length === 1,
  "2.4 [Jugador SP087 Llamarada] Muele 2 cartas del deck rival");

resetState();
sandbox.playtestState.deck = ['BBX-SP001', 'BBX-SP002', 'BBX-SP007'];
sandbox.dispatchGraveTriggers('BBX-SP087', 'opponent');
assert(sandbox.playtestState.grave.length === 2 && sandbox.playtestState.deck.length === 1,
  "2.4 [Rival SP087 Llamarada] Muele 2 cartas del deck del jugador");

// 2.5 ¡Espiral de fuego! (BBX-SP088)
resetState();
sandbox.playtestState.slots[0] = { character: 'BBX-SP080', skills: [] }; // Katherine
sandbox.playtestState.opponentSlots[0] = { character: 'BBX-SP001', skills: ['BBX-SP008'] };
sandbox.dispatchGraveTriggers('BBX-SP088', 'player');
assert(sandbox.playtestState.opponentSlots[0].skills.length === 0,
  "2.5 [Jugador SP088 Espiral] Destruye Skill equipada del rival");

resetState();
sandbox.playtestState.opponentSlots[0] = { character: 'BBX-SP080', skills: [] }; // Katherine
sandbox.playtestState.slots[0] = { character: 'BBX-SP001', skills: ['BBX-SP008'] };
sandbox.dispatchGraveTriggers('BBX-SP088', 'opponent');
assert(sandbox.playtestState.slots[0].skills.length === 0,
  "2.5 [Rival SP088 Espiral] Destruye Skill equipada del jugador");

// 2.6 ¡Splash! (BBX-SP028)
resetState();
sandbox.playtestState.deck = ['BBX-SP001'];
sandbox.dispatchGraveTriggers('BBX-SP028', 'player');
assert(sandbox.playtestState.hand.includes('BBX-SP001'),
  "2.6 [Jugador SP028 Splash] Roba 1 carta al enviarse al cementerio");

resetState();
sandbox.playtestState.opponentDeck = ['BBX-SP001'];
sandbox.dispatchGraveTriggers('BBX-SP028', 'opponent');
assert(sandbox.playtestState.opponentHand.includes('BBX-SP001'),
  "2.6 [Rival SP028 Splash] Roba 1 carta al enviarse al cementerio");

// 2.7 Colgante (BBX-SP143)
resetState();
sandbox.playtestState.opponentDeck = ['BBX-SP001', 'BBX-SP002'];
sandbox.playtestState.deck = ['BBX-SP003']; // Marina
sandbox.dispatchGraveTriggers('BBX-SP143', 'player');
assert(sandbox.playtestState.opponentHand.length === 2 && sandbox.playtestState.hand.includes('BBX-SP003'),
  "2.7 [Jugador SP143 Colgante] Rival roba 2 y jugador busca Marina");

resetState();
sandbox.playtestState.deck = ['BBX-SP001', 'BBX-SP002'];
sandbox.playtestState.opponentDeck = ['BBX-SP003']; // Marina
sandbox.dispatchGraveTriggers('BBX-SP143', 'opponent');
assert(sandbox.playtestState.hand.length === 2 && sandbox.playtestState.opponentHand.includes('BBX-SP003'),
  "2.7 [Rival SP143 Colgante] Jugador roba 2 y rival busca Marina");

// -----------------------------------------------------------------------------
// 3. Bloqueos de Reglas y Condiciones Continuas
// -----------------------------------------------------------------------------
console.log("\n3. Reglas de Bloqueo Continuo:");

// 3.1 Ahogarse bloquea efectos de Personajes en mano
resetState();
sandbox.playtestState.slots[0] = { character: 'BBX-SP001', skills: ['BBX-SP290'] }; // Ahogarse
sandbox.playtestState.hand = ['BBX-SP223']; // Deida
const actRes = sandbox.HandEffects.execute('BBX-SP223', 0, 'player');
assert(actRes === false || sandbox.playtestState.hand.includes('BBX-SP223'),
  "3.1 Ahogarse bloquea la activación de Deida (SP223) desde la mano");

// 3.2 Siesta (SP411) bloquea efectos de Skills en mano
resetState();
sandbox.playtestState.slots[0] = { character: 'BBX-SP001', skills: ['BBX-SP411'] }; // Siesta
sandbox.playtestState.hand = ['BBX-SP092']; // Despliegue
const actRes2 = sandbox.HandEffects.execute('BBX-SP092', 0, 'player');
assert(actRes2 === false || sandbox.playtestState.hand.includes('BBX-SP092'),
  "3.2 Siesta bloquea la activación de Despliegue (SP092) desde la mano");

// 3.3 Bloqueo de robo por efecto (cannotDrawByEffectsThisTurn)
resetState();
sandbox.playtestState.cannotDrawByEffectsThisTurn = true;
sandbox.playtestState.bench = [{ id: 'BBX-SP099' }];
sandbox.playtestState.hand = ['BBX-SP113']; // Rango de delegado
sandbox.playtestState.deck = ['BBX-SP001'];
const actRes3 = sandbox.HandEffects.execute('BBX-SP113', 0, 'player');
assert(actRes3 === false || sandbox.playtestState.hand.length === 1,
  "3.3 Rango de delegado no roba cartas si cannotDrawByEffectsThisTurn es true");

// -----------------------------------------------------------------------------
// 4. Inteligencia Artificial (AIEngine Paso 2)
// -----------------------------------------------------------------------------
async function runAsyncTests() {
  console.log("\n4. Activaciones Tácticas de la IA en Duelos Automáticos:");

  resetState();
  sandbox.playtestState.turnOwner = 'opponent';
  sandbox.playtestState.opponentHand = ['BBX-SP092']; // Despliegue
  sandbox.playtestState.opponentDeck = ['BBX-SP223']; // Deida
  await sandbox.AIEngine.executeOpponentTurn({ skipDelay: true });
  assert(sandbox.playtestState.opponentHand.includes('BBX-SP223'),
    "4.1 La IA activa tácticamente a Despliegue (SP092) en Paso 2 para buscar a Deida");

  resetState();
  sandbox.playtestState.turnOwner = 'opponent';
  sandbox.playtestState.opponentHand = ['BBX-SP098']; // Estudio
  sandbox.playtestState.opponentDeck = ['BBX-SP098', 'BBX-SP098'];
  await sandbox.AIEngine.executeOpponentTurn({ skipDelay: true });
  assert(sandbox.playtestState.opponentHand.filter(x => x === 'BBX-SP098').length === 2,
    "4.2 La IA activa tácticamente a Estudio (SP098) en Paso 2 para agregar copias");

  console.log("\n======================================================");
  console.log(`TOTAL PRUEBAS FASE 2: ${totalTests} | PASADAS: ${passedTests} | FALLIDAS: ${totalTests - passedTests}`);
  console.log("======================================================\n");

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAsyncTests();
