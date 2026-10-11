/**
 * Suite de Pruebas Automatizadas - FASE 4:
 * Fase de Batalla, Declaración de Ataques, Restricciones y Resolución Simétrica de Destrucción
 * Paridad 100%: Jugador, Rival en Sandbox y Motor de Inteligencia Artificial (IA)
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
  'js/battle/battleEngine.js',
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
    turnCount: 2,
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
      { character: null, skills: [], usedSkills: [], effectUsed: false, attackedThisTurn: false, attacksDeclared: 0, maxAttacks: 1, isRotated: false },
      { character: null, skills: [], usedSkills: [], effectUsed: false, attackedThisTurn: false, attacksDeclared: 0, maxAttacks: 1, isRotated: false },
      { character: null, skills: [], usedSkills: [], effectUsed: false, attackedThisTurn: false, attacksDeclared: 0, maxAttacks: 1, isRotated: false }
    ],
    opponentSlots: [
      { character: null, skills: [], usedSkills: [], effectUsed: false, attackedThisTurn: false, attacksDeclared: 0, maxAttacks: 1, isRotated: false },
      { character: null, skills: [], usedSkills: [], effectUsed: false, attackedThisTurn: false, attacksDeclared: 0, maxAttacks: 1, isRotated: false },
      { character: null, skills: [], usedSkills: [], effectUsed: false, attackedThisTurn: false, attacksDeclared: 0, maxAttacks: 1, isRotated: false }
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
console.log('⚔️ SUITE DE PRUEBAS - FASE 4: FASE DE BATALLA Y RESOLUCIÓN DE DAÑO');
console.log('================================================================\n');

async function runPhase4Tests() {
  // ---------------------------------------------------------------------------
  // SECCIÓN 1: REGLAS DE DECLARACIÓN DE ATAQUE (canDeclareAttack)
  // ---------------------------------------------------------------------------
  console.log('--- SECCIÓN 1: Reglas de Declaración de Ataque (canDeclareAttack) ---');

  // 1.1 No puede declarar ataque si no es su turno
  resetState();
  sandbox.playtestState.turnOwner = 'opponent';
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.opponentSlots[0].character = 'BBX-SP005';
  assert(sandbox.BattleEngine.canDeclareAttack(0, 'player') === false,
    '1.1 Jugador no puede declarar ataque fuera de su turno');

  // 1.2 Regla de Turno 1: No se puede atacar en el primer turno del juego
  resetState();
  sandbox.playtestState.turnCount = 1;
  sandbox.playtestState.turnOwner = 'player';
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.opponentSlots[0].character = 'BBX-SP005';
  assert(sandbox.BattleEngine.canDeclareAttack(0, 'player') === false,
    '1.2 No se permite declarar ataques en el Turno 1 de la partida');

  // 1.3 Slot vacío no puede atacar
  resetState();
  sandbox.playtestState.opponentSlots[0].character = 'BBX-SP005';
  assert(sandbox.BattleEngine.canDeclareAttack(0, 'player') === false,
    '1.3 Ranura sin personaje no puede declarar ataque');

  // 1.4 Personaje girado (isRotated) no puede atacar
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].isRotated = true;
  sandbox.playtestState.opponentSlots[0].character = 'BBX-SP005';
  assert(sandbox.BattleEngine.canDeclareAttack(0, 'player') === false,
    '1.4 Personaje ya girado (agotado) no puede declarar ataque');

  // 1.5 Máximo de ataques alcanzado (attacksDeclared >= maxAttacks)
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].attacksDeclared = 1;
  sandbox.playtestState.slots[0].maxAttacks = 1;
  sandbox.playtestState.opponentSlots[0].character = 'BBX-SP005';
  assert(sandbox.BattleEngine.canDeclareAttack(0, 'player') === false,
    '1.5 Personaje que alcanzó su límite de ataques no puede atacar de nuevo');

  // 1.6 Múltiples ataques (Ráfaga siniestra / maxAttacks = 2)
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].attacksDeclared = 1;
  sandbox.playtestState.slots[0].maxAttacks = 2; // Ráfaga siniestra otorgó 2 ataques
  sandbox.playtestState.opponentSlots[0].character = 'BBX-SP005';
  assert(sandbox.BattleEngine.canDeclareAttack(0, 'player') === true,
    '1.6 Personaje con maxAttacks = 2 puede declarar su 2do ataque');

  // 1.7 Regla anti-ataque directo: Sin personajes enemigos en campo no se puede atacar
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  assert(sandbox.BattleEngine.canDeclareAttack(0, 'player') === false,
    '1.7 No se permite atacar si el adversario no controla personajes (sin ataque directo)');

  // 1.8 Obtención de objetivos válidos (getEligibleTargets)
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.opponentSlots[0].character = 'BBX-SP005';
  sandbox.playtestState.opponentSlots[2].character = 'BBX-SP009';
  const targets = sandbox.BattleEngine.getEligibleTargets(0, 'player');
  assert(targets.length === 2 && targets[0].slotIndex === 0 && targets[1].slotIndex === 2,
    '1.8 getEligibleTargets retorna exactamente los slots enemigos con personajes activos');

  // 1.9 Simetría completa para el Rival en Sandbox
  resetState();
  sandbox.playtestState.turnOwner = 'opponent';
  sandbox.playtestState.opponentSlots[0].character = 'BBX-SP005';
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  assert(sandbox.BattleEngine.canDeclareAttack(0, 'opponent') === true,
    '1.9 El Rival puede declarar ataques simétricamente en su propio turno');


  // ---------------------------------------------------------------------------
  // SECCIÓN 2: RESOLUCIÓN DE DAÑO EN COMBATE (resolveDamage)
  // ---------------------------------------------------------------------------
  console.log('\n--- SECCIÓN 2: Resolución de Daño en Combate (resolveDamage) ---');

  // 2.1 Pérdida de Skill: Personaje con skills pierde 1 skill y esta va al cementerio
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].skills = ['BBX-SP008', 'BBX-SP010'];
  const dmgRes1 = sandbox.BattleEngine.resolveDamage(0, 'player');
  assert(dmgRes1.defeated === false && sandbox.playtestState.slots[0].skills.length === 1 && sandbox.playtestState.grave.includes('BBX-SP010'),
    '2.1 Personaje con Skills sobrevive perdiendo 1 Skill que va al cementerio');

  // 2.2 Derrota a Banca: Personaje sin skills es derrotado y se retira a la banca
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].skills = [];
  const dmgRes2 = sandbox.BattleEngine.resolveDamage(0, 'player');
  assert(dmgRes2.defeated === true && sandbox.playtestState.slots[0].character === null && sandbox.playtestState.bench.some(b => b.id === 'BBX-SP001'),
    '2.2 Personaje sin Skills es derrotado y enviado a la banca');

  // 2.3 Ranura reseteada tras derrota
  assert(sandbox.playtestState.slots[0].skills.length === 0 && sandbox.playtestState.slots[0].isRotated === false,
    '2.3 Ranura queda completamente libre y limpia tras la derrota del personaje');

  // 2.4 Muro de Hielo (BBX-SP002): Protege de la pérdida de Skill 1 vez por turno
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].skills = ['BBX-SP002', 'BBX-SP008'];
  const dmgRes4 = sandbox.BattleEngine.resolveDamage(0, 'player');
  assert(dmgRes4.protected === true && sandbox.playtestState.slots[0].skills.length === 2 && sandbox.playtestState.slots[0].muroUsadoEsteTurno === true,
    '2.4 Muro de Hielo (SP002) protegió al personaje sin perder ninguna Skill');

  // 2.5 Inmunidad temporal: cannotBeDestroyedByBattleUntilTurnEnd
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].skills = [];
  sandbox.playtestState.slots[0].cannotBeDestroyedByBattleUntilTurnEnd = true;
  const dmgRes5 = sandbox.BattleEngine.resolveDamage(0, 'player');
  assert(dmgRes5.protected === true && sandbox.playtestState.slots[0].character === 'BBX-SP001',
    '2.5 cannotBeDestroyedByBattleUntilTurnEnd evita la derrota por combate');

  // 2.6 ¡Drago-tenacidad! (BBX-SP209): Durante el turno propio evita perder skills
  resetState();
  sandbox.playtestState.turnOwner = 'player';
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].skills = ['BBX-SP0209', 'BBX-SP209'];
  const dmgRes6 = sandbox.BattleEngine.resolveDamage(0, 'player');
  assert(dmgRes6.protected === true && sandbox.playtestState.slots[0].skills.length === 2,
    '2.6 Drago-tenacidad (SP209) protege de daño por combate durante el turno del portador');

  // 2.7 Simetría de Daño para el Rival en Sandbox
  resetState();
  sandbox.playtestState.opponentSlots[0].character = 'BBX-SP005';
  sandbox.playtestState.opponentSlots[0].skills = ['BBX-SP008'];
  const dmgResOpp = sandbox.BattleEngine.resolveDamage(0, 'opponent');
  assert(dmgResOpp.defeated === false && sandbox.playtestState.opponentGrave.includes('BBX-SP008'),
    '2.7 El Rival pierde Skills simétricamente hacia su propio cementerio al recibir daño');


  // ---------------------------------------------------------------------------
  // SECCIÓN 3: REACCIÓN DEFENSIVA Y DISPARADORES
  // ---------------------------------------------------------------------------
  console.log('\n--- SECCIÓN 3: Reacción Defensiva y Disparadores ---');

  // 3.1 Reacción de mano con Resistir (BBX-SP060)
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].skills = ['BBX-SP008'];
  sandbox.playtestState.opponentSlots[0].character = 'BBX-SP005';
  sandbox.playtestState.opponentSlots[0].skills = [];
  sandbox.playtestState.opponentHand = ['BBX-SP060'];

  sandbox.BattleEngine.executeAttack(0, 0, 'player', { useResistir: true });
  assert(sandbox.playtestState.opponentSlots[0].skills.includes('BBX-SP060') || sandbox.playtestState.opponentGrave.includes('BBX-SP060'),
    '3.1 Resistir (BBX-SP060) se equipó como reacción y absorbió el golpe salvando al personaje');

  // 3.2 Despacho de Triggers de Cementerio al perder Skill en batalla
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].skills = ['BBX-SP028']; // Splash (BBX-SP028: roba 1 al ir al cementerio)
  sandbox.playtestState.deck = ['BBX-SP010'];
  sandbox.BattleEngine.resolveDamage(0, 'player');
  assert(sandbox.playtestState.grave.includes('BBX-SP028') && sandbox.playtestState.hand.includes('BBX-SP010'),
    '3.2 Trigger de cementerio (Splash SP028) se ejecutó automáticamente al destruirse en batalla');


  // ---------------------------------------------------------------------------
  // SECCIÓN 4: CONDICIONES DE VICTORIA Y DERROTA (checkMatchEndCondition)
  // ---------------------------------------------------------------------------
  console.log('\n--- SECCIÓN 4: Condiciones de Victoria y Derrota (checkMatchEndCondition) ---');

  // 4.1 Victoria del Jugador: Banca del Rival acumula 3 derrotas
  resetState();
  sandbox.playtestState.opponentBench = [
    { id: 'BBX-SP001', effectUsed: false },
    { id: 'BBX-SP002', effectUsed: false },
    { id: 'BBX-SP003', effectUsed: false }
  ];
  const winCheck = sandbox.checkMatchEndCondition();
  assert(winCheck.ended === true && winCheck.winner === 'player' && sandbox.playtestState.matchEnded === true,
    '4.1 El jugador gana la partida cuando la banca del rival alcanza 3 derrotas');

  // 4.2 Derrota del Jugador: Banca del Jugador acumula 3 derrotas
  resetState();
  sandbox.playtestState.bench = [
    { id: 'BBX-SP001', effectUsed: false },
    { id: 'BBX-SP002', effectUsed: false },
    { id: 'BBX-SP003', effectUsed: false }
  ];
  const defeatCheck = sandbox.checkMatchEndCondition();
  assert(defeatCheck.ended === true && defeatCheck.winner === 'opponent' && sandbox.playtestState.matchEnded === true,
    '4.2 El jugador pierde la partida cuando su propia banca alcanza 3 derrotas');


  // ---------------------------------------------------------------------------
  // SECCIÓN 5: EJECUCIÓN COMPLETA DE ATAQUE E INTELIGENCIA ARTIFICIAL
  // ---------------------------------------------------------------------------
  console.log('\n--- SECCIÓN 5: Ejecución Completa de Ataque e Inteligencia Artificial ---');

  // 5.1 executeAttack mutuo completo
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP001';
  sandbox.playtestState.slots[0].skills = ['BBX-SP008'];
  sandbox.playtestState.opponentSlots[0].character = 'BBX-SP005';
  sandbox.playtestState.opponentSlots[0].skills = ['BBX-SP010'];

  sandbox.BattleEngine.executeAttack(0, 0, 'player');
  assert(sandbox.playtestState.slots[0].isRotated === true &&
         sandbox.playtestState.slots[0].attacksDeclared === 1 &&
         sandbox.playtestState.grave.includes('BBX-SP008') &&
         sandbox.playtestState.opponentGrave.includes('BBX-SP010'),
    '5.1 executeAttack resolvió el combate mutuo, rotó al atacante y dañó a ambos combatientes');

  // 5.2 IA en Paso 6: Ejecuta combate mediante BattleEngine.executeAttack
  resetState();
  sandbox.playtestState.turnCount = 2;
  sandbox.playtestState.turnOwner = 'opponent';
  sandbox.playtestState.opponentSlots[0].character = 'BBX-SP001';
  sandbox.playtestState.opponentSlots[0].skills = ['BBX-SP008'];
  sandbox.playtestState.slots[0].character = 'BBX-SP005';
  sandbox.playtestState.slots[0].skills = ['BBX-SP010'];

  await sandbox.AIEngine.executeOpponentTurn({ skipDelay: true });
  assert(sandbox.playtestState.opponentGrave.includes('BBX-SP008') &&
         sandbox.playtestState.grave.includes('BBX-SP010'),
    '5.2 IA ejecutó el combate del Paso 6 con éxito produciendo daño mutuo mediante BattleEngine');

  // Resumen Final
  console.log('\n================================================================');
  console.log(`📊 RESULTADO FINAL FASE 4: ${passedTests} de ${totalTests} pruebas pasadas (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ¡TODAS LAS PRUEBAS DE LA FASE 4 PASARON SATISFACTORIAMENTE!');
    process.exit(0);
  } else {
    console.error(`❌ FALLARON ${totalTests - passedTests} PRUEBAS EN LA FASE 4.`);
    process.exit(1);
  }
}

runPhase4Tests().catch(err => {
  console.error('Error fatal durante la ejecución de las pruebas:', err);
  process.exit(1);
});
