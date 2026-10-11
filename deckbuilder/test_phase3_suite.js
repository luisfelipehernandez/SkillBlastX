/**
 * Suite de Pruebas Automatizadas - FASE 3:
 * Efectos de Campo (Slots), Skills Equipadas y Disparadores Continuos
 * Paridad 100% Simétrica: Jugador, Rival en Sandbox y Motor de Inteligencia Artificial (AIEngine)
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

// Cargar scripts modulares
const scripts = [
  'js/core/rulesEngine.js',
  'js/core/dispatcher.js',
  'js/effects/graveEffects.js',
  'js/effects/handEffects.js',
  'js/effects/benchEffects.js',
  'js/effects/fieldEffects.js',
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

console.log('================================================================');
console.log('🧪 SUITE DE PRUEBAS - FASE 3: EFECTOS EN CAMPO Y SKILLS EQUIPADAS');
console.log('================================================================\n');

async function runPhase3Tests() {
  // ---------------------------------------------------------------------------
  // SECCIÓN 1: EFECTOS DE PERSONAJES EN CAMPO
  // ---------------------------------------------------------------------------
  console.log('--- SECCIÓN 1: Efectos de Personajes en Campo (Simetría Jugador / Rival) ---');

  // 1.1 SP001 Haruka: Robar 1 carta si no tiene skills
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.deck = ['BBX-SP008', 'BBX-SP010'];
  const canActHarukaP = sandbox.FieldEffects.canActivateCharacter('BBX-SP001', 0, 'player');
  assert(canActHarukaP === true, '1.1 Haruka SP001 (Jugador) puede activar si no tiene skills');
  sandbox.FieldEffects.executeCharacter('BBX-SP001', 0, 'player');
  assert(sandbox.playtestState.hand.includes('BBX-SP008') && sandbox.playtestState.slots[0].effectUsed === true,
    '1.1 Haruka SP001 roba carta correctamente y marca effectUsed');

  // 1.2 SP001 Haruka: No puede activar si tiene skills o si ya usó efecto
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].skills = ['BBX-SP008'];
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP001', 0, 'player') === false,
    '1.2 Haruka SP001 no puede activar si ya porta skills');

  // 1.3 SP001 Haruka (Rival)
  resetState();
  sandbox.playtestState.turnOwner = 'opponent';
  sandbox.playtestState.opponentSlots[0].character = 'BBX-SP001';
  sandbox.playtestState.opponentDeck = ['BBX-SP023'];
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP001', 0, 'opponent') === true,
    '1.3 Haruka SP001 (Rival) puede activar en su turno');
  sandbox.FieldEffects.executeCharacter('BBX-SP001', 0, 'opponent');
  assert(sandbox.playtestState.opponentHand.includes('BBX-SP023'),
    '1.3 Haruka SP001 (Rival) roba carta correctamente a opponentHand');

  // 1.4 SP003 Marina: Colocar 1 carta al fondo del deck y robar 1
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP003';
  sandbox.playtestState.hand = ['BBX-SP010'];
  sandbox.playtestState.deck = ['BBX-SP027', 'BBX-SP033'];
  const canActMarina = sandbox.FieldEffects.canActivateCharacter('BBX-SP003', 0, 'player');
  assert(canActMarina === true, '1.4 Marina SP003 puede activar con mano y deck disponibles');
  sandbox.FieldEffects.executeCharacter('BBX-SP003', 0, 'player', { handIndex: 0 });
  assert(sandbox.playtestState.hand.includes('BBX-SP027') && sandbox.playtestState.deck.includes('BBX-SP010'),
    '1.4 Marina SP003 puso carta al fondo y robó la primera');

  // 1.5 SP005 Roy: Enviar 2 cartas del tope al cementerio
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP005';
  sandbox.playtestState.deck = ['BBX-SP008', 'BBX-SP010', 'BBX-SP023'];
  sandbox.FieldEffects.executeCharacter('BBX-SP005', 0, 'player');
  assert(sandbox.playtestState.grave.length === 2 && sandbox.playtestState.grave.includes('BBX-SP008'),
    '1.5 Roy SP005 envió 2 cartas del mazo al cementerio');

  // 1.6 SP009 Tagero: Revelar 5 y buscar BBX-SP021
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP009';
  sandbox.playtestState.deck = ['BBX-SP001', 'BBX-SP021', 'BBX-SP002', 'BBX-SP003', 'BBX-SP004'];
  sandbox.FieldEffects.executeCharacter('BBX-SP009', 0, 'player');
  assert(sandbox.playtestState.hand.includes('BBX-SP021'),
    '1.6 Tagero SP009 reveló 5 y añadió ¡Explosión trueno! (SP021) a la mano');

  // 1.7 SP011 Sophia: Requiere 2+ skills para buscar SP012 en el mazo
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP011';
  sandbox.playtestState.slots[0].skills = ['BBX-SP008'];
  sandbox.playtestState.deck = ['BBX-SP012'];
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP011', 0, 'player') === false,
    '1.7 Sophia SP011 no puede activar con solo 1 skill portada');
  sandbox.playtestState.slots[0].skills.push('BBX-SP010');
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP011', 0, 'player') === true,
    '1.7 Sophia SP011 puede activar con 2 skills portadas');
  sandbox.FieldEffects.executeCharacter('BBX-SP011', 0, 'player');
  assert(sandbox.playtestState.slots[0].skills.includes('BBX-SP012'),
    '1.7 Sophia SP011 equipó Control del pensar (SP012) desde el mazo');

  // 1.8 SP013 Bao: Requisito 3+ skills, descartar carta de mano rival
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP013';
  sandbox.playtestState.slots[0].skills = ['BBX-SP008', 'BBX-SP010'];
  sandbox.playtestState.opponentHand = ['BBX-SP023'];
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP013', 0, 'player') === false,
    '1.8 Bao SP013 no puede activar con menos de 3 skills');
  sandbox.playtestState.slots[0].skills.push('BBX-SP012');
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP013', 0, 'player') === true,
    '1.8 Bao SP013 puede activar con 3 skills portadas');
  sandbox.FieldEffects.executeCharacter('BBX-SP013', 0, 'player', { oppHandIndex: 0 });
  assert(sandbox.playtestState.opponentHand.length === 0 && sandbox.playtestState.opponentGrave.includes('BBX-SP023'),
    '1.8 Bao SP013 descartó la carta de la mano rival al cementerio rival');

  // 1.9 SP017 Marina: Revelar 2 del mazo, si hay skill añadir a la mano
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP017';
  sandbox.playtestState.deck = ['BBX-SP008', 'BBX-SP001']; // 1 skill y 1 personaje
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP017', 0, 'player') === true,
    '1.9 Marina SP017 puede activar');
  sandbox.FieldEffects.executeCharacter('BBX-SP017', 0, 'player');
  assert(sandbox.playtestState.hand.includes('BBX-SP008'),
    '1.9 Marina SP017 añadió la Skill revelada a la mano');

  // 1.10 SP046 Bao: Requisito 1+ skills, robar 2 cartas
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP046';
  sandbox.playtestState.deck = ['BBX-SP027', 'BBX-SP033'];
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP046', 0, 'player') === false,
    '1.10 Bao SP046 no puede activar sin skills portadas');
  sandbox.playtestState.slots[0].skills = ['BBX-SP008'];
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP046', 0, 'player') === true,
    '1.10 Bao SP046 puede activar portando 1 skill');
  sandbox.FieldEffects.executeCharacter('BBX-SP046', 0, 'player');
  assert(sandbox.playtestState.hand.length === 2 && sandbox.playtestState.slots[0].effectUsed === true,
    '1.10 Bao SP046 robó 2 cartas correctamente');

  // 1.11 SP244 Haruka Modo Arcano: Requisito 3+ skills, buscar skill de Haruka en mazo
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP244';
  sandbox.playtestState.slots[0].skills = ['BBX-SP008', 'BBX-SP010', 'BBX-SP012'];
  sandbox.playtestState.deck = ['BBX-SP023', 'BBX-SP004']; // SP004 es Ataque Destello (portador: Haruka)
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP244', 0, 'player') === true,
    '1.11 Haruka SP244 puede activar con 3 skills portadas');
  sandbox.FieldEffects.executeCharacter('BBX-SP244', 0, 'player');
  assert(sandbox.playtestState.hand.includes('BBX-SP004'),
    '1.11 Haruka SP244 buscó y añadió skill de Haruka a la mano');

  // 1.12 SP249 Marina: Requisito 1+ skills, porta BBX-SP215 desde deck
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP249';
  sandbox.playtestState.deck = ['BBX-SP215'];
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP249', 0, 'player') === false,
    '1.12 Marina SP249 no puede activar sin skills portadas');
  sandbox.playtestState.slots[0].skills = ['BBX-SP008'];
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP249', 0, 'player') === true,
    '1.12 Marina SP249 puede activar con 1 skill portada');
  sandbox.FieldEffects.executeCharacter('BBX-SP249', 0, 'player');
  assert(sandbox.playtestState.slots[0].skills.includes('BBX-SP215'),
    '1.12 Marina SP249 portó BBX-SP215 desde el mazo');

  // 1.13 SP258 Deida: Requisito 1+ skills, pone personaje de mazo a banca
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP258';
  sandbox.playtestState.deck = ['BBX-SP001'];
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP258', 0, 'player') === false,
    '1.13 Deida SP258 no puede activar sin skills');
  sandbox.playtestState.slots[0].skills = ['BBX-SP008'];
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP258', 0, 'player') === true,
    '1.13 Deida SP258 puede activar con 1 skill');
  sandbox.FieldEffects.executeCharacter('BBX-SP258', 0, 'player');
  assert(sandbox.playtestState.bench.some(b => b.id === 'BBX-SP001'),
    '1.13 Deida SP258 colocó personaje en la banca desde el mazo');

  // 1.13b SP258 Deida: Selección de personaje específico y bloqueo con banca llena
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP258';
  sandbox.playtestState.slots[0].skills = ['BBX-SP008'];
  sandbox.playtestState.deck = ['BBX-SP001', 'BBX-SP165'];
  sandbox.FieldEffects.executeCharacter('BBX-SP258', 0, 'player', { targetId: 'BBX-SP165' });
  assert(sandbox.playtestState.bench.some(b => b.id === 'BBX-SP165'),
    '1.13b Deida SP258 colocó exactamente el personaje seleccionado (BBX-SP165) en la banca');
  assert(sandbox.playtestState.deck.includes('BBX-SP001') && !sandbox.playtestState.deck.includes('BBX-SP165'),
    '1.13b Deida SP258 extrajo solo el personaje elegido del deck');

  sandbox.playtestState.bench = [
    { id: 'BBX-SP001', effectUsed: false },
    { id: 'BBX-SP002', effectUsed: false },
    { id: 'BBX-SP003', effectUsed: false }
  ];
  sandbox.playtestState.slots[0].effectUsed = false;
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP258', 0, 'player') === false,
    '1.13c Deida SP258 no puede activar si la banca ya tiene 3 personajes');

  // 1.14 SP259 Nobuko: Requisito 1+ skills, revela 3 y añade a mano
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP259';
  sandbox.playtestState.deck = ['BBX-SP001', 'BBX-SP002', 'BBX-SP003'];
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP259', 0, 'player') === false,
    '1.14 Nobuko SP259 no puede activar sin skills');
  sandbox.playtestState.slots[0].skills = ['BBX-SP008'];
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP259', 0, 'player') === true,
    '1.14 Nobuko SP259 puede activar con 1 skill');
  sandbox.FieldEffects.executeCharacter('BBX-SP259', 0, 'player');
  assert(sandbox.playtestState.hand.includes('BBX-SP001'),
    '1.14 Nobuko SP259 reveló cartas y añadió personaje a la mano');

  // 1.15 SP269 Haruka: Requisito 1+ skills, añade Haruka a la mano
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP269';
  sandbox.playtestState.deck = ['BBX-SP001'];
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP269', 0, 'player') === false,
    '1.15 Haruka SP269 no puede activar sin skills');
  sandbox.playtestState.slots[0].skills = ['BBX-SP008'];
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP269', 0, 'player') === true,
    '1.15 Haruka SP269 puede activar con 1 skill');
  sandbox.FieldEffects.executeCharacter('BBX-SP269', 0, 'player');
  assert(sandbox.playtestState.hand.includes('BBX-SP001'),
    '1.15 Haruka SP269 recuperó Haruka a la mano');


  // ---------------------------------------------------------------------------
  // SECCIÓN 2: EFECTOS DE SKILLS EQUIPADAS EN CAMPO
  // ---------------------------------------------------------------------------
  console.log('\n--- SECCIÓN 2: Efectos de Skills Equipadas en Campo ---');

  // 2.1 SP008 ¡Voluntad!: Roba 1 si controla exactamente 1 personaje (HOPT)
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].skills = ['BBX-SP008'];
  sandbox.playtestState.deck = ['BBX-SP023'];
  const canActVoluntad = sandbox.FieldEffects.canActivateSkill('BBX-SP008', 0, 0, 'player');
  assert(canActVoluntad === true, '2.1 ¡Voluntad! (SP008) puede activar con 1 personaje controlado');
  sandbox.FieldEffects.executeSkill('BBX-SP008', 0, 0, 'player');
  assert(sandbox.playtestState.hand.includes('BBX-SP023') && sandbox.playtestState.slots[0].usedSkills.includes('BBX-SP008'),
    '2.1 ¡Voluntad! robó 1 carta y registró usedSkills');

  // 2.2 SP008 ¡Voluntad!: Falla si controla 2 personajes
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].skills = ['BBX-SP008'];
  sandbox.playtestState.slots[1].character = 'BBX-SP003';
  assert(sandbox.FieldEffects.canActivateSkill('BBX-SP008', 0, 0, 'player') === false,
    '2.2 ¡Voluntad! no puede activar si el jugador controla más de 1 personaje');

  // 2.3 SP010 Investigación: Enviar 2 cartas del tope al cementerio (HOPT)
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].skills = ['BBX-SP010'];
  sandbox.playtestState.deck = ['BBX-SP008', 'BBX-SP023', 'BBX-SP027'];
  sandbox.FieldEffects.executeSkill('BBX-SP010', 0, 0, 'player');
  assert(sandbox.playtestState.grave.length === 2 && sandbox.playtestState.slots[0].usedSkills.includes('BBX-SP010'),
    '2.3 Investigación (SP010) envió 2 cartas al cementerio');

  // 2.4 SP012 Control del pensar: Enviar al cementerio 1 skill del rival
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP011';
  sandbox.playtestState.slots[0].skills = ['BBX-SP012'];
  sandbox.playtestState.opponentSlots[0].character = 'BBX-SP001';
  sandbox.playtestState.opponentSlots[0].skills = ['BBX-SP008'];
  sandbox.FieldEffects.executeSkill('BBX-SP012', 0, 0, 'player');
  assert(sandbox.playtestState.opponentGrave.includes('BBX-SP008'),
    '2.4 Control del pensar (SP012) envió al cementerio la skill del rival');

  // 2.5 SP023 ¡Desatar!: Se envía al cementerio, revela 2, skills a mano y personajes a cementerio
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].skills = ['BBX-SP023'];
  sandbox.playtestState.deck = ['BBX-SP008', 'BBX-SP005']; // 1 skill, 1 personaje
  sandbox.FieldEffects.executeSkill('BBX-SP023', 0, 0, 'player');
  assert(!sandbox.playtestState.slots[0].skills.includes('BBX-SP023') &&
         sandbox.playtestState.grave.includes('BBX-SP023') &&
         sandbox.playtestState.hand.includes('BBX-SP008') &&
         sandbox.playtestState.grave.includes('BBX-SP005'),
    '2.5 ¡Desatar! (SP023) envió skills a mano y personaje a cementerio');

  // 2.6 SP027 Preludio: Barajar 1 carta del cementerio al mazo
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].skills = ['BBX-SP027'];
  sandbox.playtestState.grave = ['BBX-SP008'];
  sandbox.FieldEffects.executeSkill('BBX-SP027', 0, 0, 'player');
  assert(sandbox.playtestState.deck.includes('BBX-SP008') && sandbox.playtestState.grave.length === 0,
    '2.6 Preludio (SP027) barajó carta del cementerio al mazo');

  // 2.7 SP033 Carga destello: Requiere 2+ skills para robar 2 cartas (HOPT)
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].skills = ['BBX-SP033'];
  sandbox.playtestState.deck = ['BBX-SP008', 'BBX-SP010'];
  assert(sandbox.FieldEffects.canActivateSkill('BBX-SP033', 0, 0, 'player') === false,
    '2.7 Carga destello (SP033) no puede activar con solo 1 skill portada');
  sandbox.playtestState.slots[0].skills.push('BBX-SP008');
  assert(sandbox.FieldEffects.canActivateSkill('BBX-SP033', 0, 0, 'player') === true,
    '2.7 Carga destello (SP033) puede activar con 2 skills portadas');
  sandbox.FieldEffects.executeSkill('BBX-SP033', 0, 0, 'player');
  assert(sandbox.playtestState.hand.length === 2 && sandbox.playtestState.slots[0].usedSkills.includes('BBX-SP033'),
    '2.7 Carga destello robó 2 cartas correctamente');

  // 2.8 SP039 Ráfaga siniestra: Permite hasta 2 ataques si no está rotado
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].skills = ['BBX-SP039'];
  assert(sandbox.FieldEffects.canActivateSkill('BBX-SP039', 0, 0, 'player') === true,
    '2.8 Ráfaga siniestra (SP039) puede activar si el slot no está rotado');
  sandbox.playtestState.slots[0].isRotated = true;
  assert(sandbox.FieldEffects.canActivateSkill('BBX-SP039', 0, 0, 'player') === false,
    '2.8 Ráfaga siniestra (SP039) no puede activar si el slot está rotado');
  sandbox.playtestState.slots[0].isRotated = false;
  sandbox.FieldEffects.executeSkill('BBX-SP039', 0, 0, 'player');
  assert(sandbox.playtestState.slots[0].maxAttacks === 2 && sandbox.playtestState.slots[0].usedSkills.includes('BBX-SP039'),
    '2.8 Ráfaga siniestra (SP039) concedió maxAttacks = 2 correctamente');


  // ---------------------------------------------------------------------------
  // SECCIÓN 3: BLOQUEOS CONTINUOS Y REGLAS DE CAMPO
  // ---------------------------------------------------------------------------
  console.log('\n--- SECCIÓN 3: Bloqueos Continuos y Reglas de Campo ---');

  // 3.1 Haruka SP251 en campo rival: Bloquea recuperación de cementerio a la mano
  resetState();
  sandbox.playtestState.opponentSlots[0].character = 'BBX-SP251'; // Haruka continua anti-grave
  const isGraveToHandBlocked = sandbox.RulesEngine ? sandbox.RulesEngine.isGraveToHandBlocked() : false;
  assert(isGraveToHandBlocked === true, '3.1 Haruka SP251 en campo rival bloquea recuperación desde el cementerio');

  // 3.2 Haruka SP345 en campo rival: Bloquea activación de efectos de banca del jugador
  resetState();
  sandbox.playtestState.opponentSlots[0].character = 'BBX-SP345'; // Haruka continua anti-bench
  const isBenchBlocked = sandbox.RulesEngine ? sandbox.RulesEngine.isHarukaSP345Active() : false;
  assert(isBenchBlocked === true, '3.2 Haruka SP345 en campo rival bloquea activación de efectos de banca');

  // 3.3 Bloqueo de robo por turno (cannotDrawByEffectsThisTurn)
  resetState();
  sandbox.playtestState.cannotDrawByEffectsThisTurn = true;
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.deck = ['BBX-SP008'];
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP001', 0, 'player') === false,
    '3.3 cannotDrawByEffectsThisTurn bloquea activación de Haruka SP001');

  // 3.4 Turn Owner: No se puede activar efecto de personaje ni skill en el turno del adversario
  resetState();
  sandbox.playtestState.turnOwner = 'opponent';
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.deck = ['BBX-SP008'];
  assert(sandbox.FieldEffects.canActivateCharacter('BBX-SP001', 0, 'player') === false,
    '3.4 Jugador no puede activar efectos en campo durante el turno del rival');


  // ---------------------------------------------------------------------------
  // SECCIÓN 4: SIMETRÍA EN APP.JS Y MOTOR DE IA (AIEngine)
  // ---------------------------------------------------------------------------
  console.log('\n--- SECCIÓN 4: Simetría en app.js y Motor de IA (AIEngine) ---');

  // 4.1 activateEffect del Jugador delega a FieldEffects
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.deck = ['BBX-SP008'];
  sandbox.activateEffect(0);
  assert(sandbox.playtestState.hand.includes('BBX-SP008') && sandbox.playtestState.slots[0].effectUsed === true,
    '4.1 activateEffect(0) del Jugador activó Haruka SP001 a través de FieldEffects');

  // 4.2 activateOpponentEffect del Rival delega a FieldEffects
  resetState();
  sandbox.playtestState.turnOwner = 'opponent';
  sandbox.playtestState.opponentSlots[0].character = 'BBX-SP001';
  sandbox.playtestState.opponentDeck = ['BBX-SP008'];
  sandbox.activateOpponentEffect(0);
  assert(sandbox.playtestState.opponentHand.includes('BBX-SP008') && sandbox.playtestState.opponentSlots[0].effectUsed === true,
    '4.2 activateOpponentEffect(0) del Rival activó Haruka SP001 a través de FieldEffects');

  // 4.3 activateSkillFieldEffect delega a FieldEffects
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].skills = ['BBX-SP008'];
  sandbox.playtestState.deck = ['BBX-SP023'];
  sandbox.activateSkillFieldEffect(0, 'BBX-SP008', 0);
  assert(sandbox.playtestState.hand.includes('BBX-SP023'),
    '4.3 activateSkillFieldEffect(0, SP008) activó ¡Voluntad! a través de FieldEffects');

  // 4.4 Paso 3 de IA: Activa automáticamente Personaje y Skills en su turno
  resetState();
  sandbox.playtestState.turnCount = 2;
  sandbox.playtestState.turnOwner = 'opponent';
  sandbox.playtestState.opponentSlots[0].character = 'BBX-SP001';
  sandbox.playtestState.opponentSlots[0].skills = ['BBX-SP008'];
  sandbox.playtestState.opponentDeck = ['BBX-SP023', 'BBX-SP027', 'BBX-SP033'];
  sandbox.playtestState.slots[0].character = 'BBX-SP005';
  sandbox.playtestState.slots[0].skills = ['BBX-SP010'];

  await sandbox.AIEngine.executeOpponentTurn({ skipDelay: true });
  const voluntadaActivated = capturedLogs.some(l => l.msg.includes('Voluntad') || l.msg.includes('SP008')) ||
                             sandbox.playtestState.opponentHand.includes('BBX-SP023');
  assert(voluntadaActivated === true,
    '4.4 Paso 3 de IA activó automáticamente ¡Voluntad! (SP008) en el turno del oponente');

  // Resumen Final
  console.log('\n================================================================');
  console.log(`📊 RESULTADO FINAL: ${passedTests} de ${totalTests} pruebas pasadas (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ¡TODAS LAS PRUEBAS DE LA FASE 3 PASARON SATISFACTORIAMENTE!');
    process.exit(0);
  } else {
    console.error(`❌ FALLARON ${totalTests - passedTests} PRUEBAS EN LA FASE 3.`);
    process.exit(1);
  }
}

runPhase3Tests().catch(err => {
  console.error('Error fatal durante la ejecución de las pruebas:', err);
  process.exit(1);
});
