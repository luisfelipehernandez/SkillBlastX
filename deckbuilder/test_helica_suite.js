/**
 * Suite de Pruebas Automatizadas: Helica (BBX-SP165), Simetría y Ciclo de Vida
 * 
 * Verifica:
 * 1. Ciclo de vida completo del Jugador (activación, bloqueo posterior, reset de turno).
 * 2. Simetría para el Rival en Sandbox (activación, bloqueo posterior, reset).
 * 3. Simetría para la IA en Duelo Automático (activación táctica en Paso 1.5, respeto de restricción en Voluntad).
 * 4. Casos borde y bloqueadores continuos (sin Deida, deck < 2, Aislamiento SP128, Haruka SP345).
 * 5. Menús contextuales de Campo y Banca.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock del entorno del navegador
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

// 1. Cargar Base de Datos de Cartas
const cartasPath = path.resolve(__dirname, '../cartas.json');
const rawCards = JSON.parse(fs.readFileSync(cartasPath, 'utf8'));

// 2. Cargar Scripts del Core en el Sandbox
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

// Inicializar la base de datos de cartas en el entorno
sandbox.allCards = rawCards;
rawCards.forEach(c => {
  sandbox.cardsDatabase[c.id] = c;
});

// Sobrescribir captura de log y contextMenu para inspección
sandbox.addLog = (msg, color) => {
  capturedLogs.push({ msg, color });
};
sandbox.showContextMenu = (e, items) => {
  capturedContextMenu = items;
};

// =========================================================================
// RUNNER DE PRUEBAS
// =========================================================================
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
    deck: ['BBX-SP001', 'BBX-SP002', 'BBX-SP003', 'BBX-SP004', 'BBX-SP005'],
    hand: [],
    grave: [],
    bench: [{ id: 'BBX-SP165', effectUsed: false }],
    slots: [
      { character: 'BBX-SP091', skills: [], usedSkills: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false }, // Deida
      { character: null, skills: [], usedSkills: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false },
      { character: null, skills: [], usedSkills: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false }
    ],
    opponentDeck: ['BBX-SP001', 'BBX-SP002', 'BBX-SP003', 'BBX-SP004', 'BBX-SP005'],
    opponentHand: [],
    opponentGrave: [],
    opponentBench: [{ id: 'BBX-SP165', effectUsed: false }],
    opponentSlots: [
      { character: 'BBX-SP091', skills: [], usedSkills: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false }, // Deida
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
console.log('   Helica (BBX-SP165) & Reglas de Robo y Simetría');
console.log('======================================================\n');

// -------------------------------------------------------------------------
// SUITE 1: CICLO DE VIDA COMPLETO DEL JUGADOR
// -------------------------------------------------------------------------
console.log('1. Ciclo de Vida Completo del Jugador (Player Lifecycle):');
resetState();

const card165 = sandbox.cardsDatabase['BBX-SP165'];
const bItemPlayer = sandbox.playtestState.bench[0];

// 1.1 Verificación de disponibilidad inicial
const readyInitial = sandbox.isBenchEffectReady(card165, bItemPlayer, 'player');
assert(readyInitial === true, '1.1 Helica está lista para activar si controla a Deida y hay mazo');

// 1.2 Activación de Helica
sandbox.activateBenchEffect(0);
assert(
  sandbox.playtestState.hand.length === 2 && sandbox.playtestState.deck.length === 3,
  '1.2 Helica roba exactamente 2 cartas del mazo a la mano',
  `Mano: ${sandbox.playtestState.hand.length}, Mazo: ${sandbox.playtestState.deck.length}`
);
assert(
  sandbox.playtestState.cannotDrawByEffectsThisTurn === true,
  '1.2 Helica activa la bandera cannotDrawByEffectsThisTurn = true'
);
assert(
  bItemPlayer.effectUsed === true,
  '1.2 Helica queda marcada como effectUsed = true'
);

// 1.3 Intento de robo por efecto posterior en el mismo turno
const handCountBeforeSecondDraw = sandbox.playtestState.hand.length;
const deckCountBeforeSecondDraw = sandbox.playtestState.deck.length;
sandbox.drawCard('character'); // Robo por efecto de Personaje
assert(
  sandbox.playtestState.hand.length === handCountBeforeSecondDraw &&
  sandbox.playtestState.deck.length === deckCountBeforeSecondDraw,
  '1.3 Robo por efecto de Personaje posterior es BLOQUEADO en el mismo turno'
);

sandbox.drawCard('skill'); // Robo por efecto de Skill
assert(
  sandbox.playtestState.hand.length === handCountBeforeSecondDraw &&
  sandbox.playtestState.deck.length === deckCountBeforeSecondDraw,
  '1.3 Robo por efecto de Skill posterior es BLOQUEADO en el mismo turno'
);

// 1.4 Robo normal de inicio de turno (sin sourceType) NO debe ser bloqueado
sandbox.drawCard(); // Robo natural sin fuente de efecto
assert(
  sandbox.playtestState.hand.length === handCountBeforeSecondDraw + 1,
  '1.4 Robo natural sin sourceType (inicio de turno) se permite'
);

// 1.5 Transición de turno
sandbox.startNewTurn();
assert(
  sandbox.playtestState.cannotDrawByEffectsThisTurn === false,
  '1.5 startNewTurn() restablece cannotDrawByEffectsThisTurn = false'
);
assert(
  sandbox.playtestState.bench[0].effectUsed === false,
  '1.5 startNewTurn() restablece effectUsed = false en la banca'
);

// 1.6 Robo por efecto en el nuevo turno
const handBeforeTurn2Draw = sandbox.playtestState.hand.length;
sandbox.drawCard('character');
assert(
  sandbox.playtestState.hand.length === handBeforeTurn2Draw + 1,
  '1.6 En el nuevo turno, los robos por efecto vuelven a funcionar normalmente'
);

// -------------------------------------------------------------------------
// SUITE 2: SIMETRÍA PARA EL RIVAL EN MODO SANDBOX
// -------------------------------------------------------------------------
console.log('\n2. Simetría para el Rival en Modo Sandbox (Opponent Lifecycle):');
resetState();
sandbox.playtestState.turnOwner = 'opponent'; // Turno del oponente
const bItemOpp = sandbox.playtestState.opponentBench[0];

// 2.1 Verificación de disponibilidad inicial rival
const oppReady = sandbox.isBenchEffectReady(card165, bItemOpp, 'opponent');
assert(oppReady === true, '2.1 Helica rival está lista en turno rival con Deida y mazo');

// 2.2 Activación del rival vía activateOpponentHelicaBenchSP165
sandbox.activateOpponentHelicaBenchSP165(0);
assert(
  sandbox.playtestState.opponentHand.length === 2 && sandbox.playtestState.opponentDeck.length === 3,
  '2.2 activateOpponentHelicaBenchSP165 roba 2 cartas del mazo rival a su mano'
);
assert(
  sandbox.playtestState.opponentCannotDrawByEffectsThisTurn === true,
  '2.2 Activa opponentCannotDrawByEffectsThisTurn = true'
);
assert(
  bItemOpp.effectUsed === true,
  '2.2 Marca effectUsed = true en la banca rival'
);

// 2.3 Intento de robo por efecto rival posterior
const oppHandBefore2nd = sandbox.playtestState.opponentHand.length;
sandbox.opponentDrawCard('character');
assert(
  sandbox.playtestState.opponentHand.length === oppHandBefore2nd,
  '2.3 Robo por efecto rival posterior es BLOQUEADO por opponentCannotDrawByEffectsThisTurn'
);

// 2.4 Transición con proceedToNextTurn
sandbox.proceedToNextTurn();
assert(
  sandbox.playtestState.opponentCannotDrawByEffectsThisTurn === false,
  '2.4 proceedToNextTurn() restablece opponentCannotDrawByEffectsThisTurn = false'
);

// 2.5 Ejecución modular a través de BenchEffects.execute
resetState();
sandbox.playtestState.turnOwner = 'opponent';
const executedModular = sandbox.BenchEffects.execute('BBX-SP165', 0, 'opponent');
assert(
  sandbox.playtestState.opponentHand.length === 2,
  '2.5 BenchEffects.execute("BBX-SP165", 0, "opponent") ejecuta correctamente el efecto'
);

// -------------------------------------------------------------------------
// SUITE 3: SIMETRÍA DE LA IA EN DUELO AUTOMÁTICO
// -------------------------------------------------------------------------
console.log('\n3. Simetría de la IA en Duelo Automático (AI Duel Flow):');
resetState();
sandbox.playtestState.isDuelVsAI = true;
sandbox.playtestState.turnOwner = 'opponent';
sandbox.playtestState.turnCount = 2; // Turno 2 para combate estándar

// Dar a la IA una carta de Voluntad equipada para probar que no robe dos veces
sandbox.playtestState.opponentSlots[0].skills = ['BBX-SP008']; // ¡Voluntad! (roba 1 carta al activar)

// Espiar la activación de Helica durante el turno de la IA
let helicaActivatedByAI = false;
const origActivateOppHelica = sandbox.activateOpponentHelicaBenchSP165;
sandbox.activateOpponentHelicaBenchSP165 = function(idx) {
  helicaActivatedByAI = true;
  return origActivateOppHelica.apply(this, arguments);
};

// Correr el turno de la IA sin retardos de tiempo
let aiPromise = sandbox.AIEngine.executeOpponentTurn({ skipDelay: true });

// Esperar a que la promesa del turno de la IA resuelva
aiPromise.then(() => {
  // Restaurar función original
  sandbox.activateOpponentHelicaBenchSP165 = origActivateOppHelica;

  // 3.1 Helica activada en Paso 1.5
  assert(
    helicaActivatedByAI === true && capturedLogs.some(l => l.msg && l.msg.includes('Helica SP165 - Rival')),
    '3.1 La IA activa a Helica automáticamente en el Paso 1.5 si controla a Deida'
  );
  assert(
    sandbox.playtestState.opponentHand.length >= 2,
    '3.1 La IA recibe las 2 cartas robadas de Helica en su mano'
  );

  // 3.2 Respeto de la restricción en Paso 3
  // La IA tiene ¡Voluntad!, pero como opponentCannotDrawByEffectsThisTurn es true, NO debe haber robado una 3ra carta por Voluntad
  const slot0UsedSkills = sandbox.playtestState.opponentSlots[0].usedSkills || [];
  const usedVoluntad = slot0UsedSkills.includes('BBX-SP008');
  assert(
    !usedVoluntad,
    '3.2 La IA NO activa el robo de ¡Voluntad! porque opponentCannotDrawByEffectsThisTurn está activo'
  );

  // -------------------------------------------------------------------------
  // SUITE 4: CASOS BORDE Y CONDICIONES DE BLOQUEO
  // -------------------------------------------------------------------------
  console.log('\n4. Casos Borde y Bloqueadores Continuos:');

  // 4.1 Sin Deida en el campo
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP093'; // Haruka (no Deida)
  assert(
    sandbox.isBenchEffectReady(card165, sandbox.playtestState.bench[0], 'player') === false,
    '4.1 Helica NO está lista si el jugador no controla a Deida'
  );

  // 4.2 Menos de 2 cartas en el mazo
  resetState();
  sandbox.playtestState.deck = ['BBX-SP001']; // Solo 1 carta
  assert(
    sandbox.isBenchEffectReady(card165, sandbox.playtestState.bench[0], 'player') === false,
    '4.2 Helica NO está lista si hay menos de 2 cartas en el deck'
  );

  // 4.3 Bloqueo por Aislamiento (BBX-SP128)
  resetState();
  sandbox.playtestState.slots[0].skills = ['BBX-SP128']; // Portando Aislamiento
  assert(
    sandbox.isBenchEffectReady(card165, sandbox.playtestState.bench[0], 'player') === false,
    '4.3 Helica NO está lista si Aislamiento (BBX-SP128) está activo'
  );

  // 4.4 Fuera del turno propio
  resetState();
  sandbox.playtestState.turnOwner = 'opponent';
  assert(
    sandbox.isBenchEffectReady(card165, sandbox.playtestState.bench[0], 'player') === false,
    '4.4 El jugador NO puede activar a Helica durante el turno del adversario'
  );

  // -------------------------------------------------------------------------
  // SUITE 5: MENÚS CONTEXTUALES Y EVENTOS DE INTERFAZ
  // -------------------------------------------------------------------------
  console.log('\n5. Menús Contextuales y UI:');

  // 5.1 showFieldCardMenu no debe ofrecer efecto para Helica en campo
  resetState();
  let fieldMenuItems = [];
  sandbox.showContextMenu = (e, items) => { fieldMenuItems = items; };
  const mockEvt = { preventDefault: () => {}, clientX: 0, clientY: 0 };
  
  // Helica en el slot 0 de campo
  sandbox.playtestState.slots[0].character = 'BBX-SP165';
  sandbox.showFieldCardMenu(mockEvt, 0);
  const hasFieldActivateBtn = fieldMenuItems.some(it => it.text && it.text.includes('Activar efecto'));
  assert(
    !hasFieldActivateBtn,
    '5.1 Helica BBX-SP165 en campo NO muestra botón de activación de efecto de campo'
  );

  // 5.2 showBenchCardMenu muestra razón si falta Deida
  resetState();
  sandbox.playtestState.slots[0].character = 'BBX-SP093'; // Haruka
  let benchMenuItems = [];
  sandbox.showContextMenu = (e, items) => { benchMenuItems = items; };
  sandbox.showBenchCardMenu(mockEvt, sandbox.playtestState.bench[0], 0);
  const deidaMissingItem = benchMenuItems.find(it => it.text && it.text.includes('Requiere controlar a Deida'));
  assert(
    !!deidaMissingItem && deidaMissingItem.disabled === true,
    '5.2 showBenchCardMenu explica claramente "Requiere controlar a Deida" si no está presente'
  );

  // 5.3 showOpponentBenchCardMenu en sandbox contiene Helica
  resetState();
  sandbox.playtestState.turnOwner = 'opponent';
  let oppBenchMenuItems = [];
  sandbox.showContextMenu = (e, items) => { oppBenchMenuItems = items; };
  sandbox.showOpponentBenchCardMenu(mockEvt, sandbox.playtestState.opponentBench[0], 0);
  const oppHelicaItem = oppBenchMenuItems.find(it => it.text && it.text.includes('Activar Helica'));
  assert(
    !!oppHelicaItem && oppHelicaItem.disabled === false,
    '5.3 showOpponentBenchCardMenu ofrece activar a Helica para el rival en Sandbox'
  );

  // =========================================================================
  // RESUMEN FINAL
  // =========================================================================
  console.log('\n======================================================');
  console.log(`TOTAL PRUEBAS: ${totalTests} | PASADAS: ${passedTests} | FALLIDAS: ${failedTests}`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}).catch(err => {
  console.error("Error ejecutando pruebas de IA:", err);
  process.exit(1);
});
