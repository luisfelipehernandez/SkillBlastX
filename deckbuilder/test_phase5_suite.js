/**
 * Suite de Pruebas Automatizadas - FASE 5:
 * Consolidación Final, Integridad de las 429 Cartas y Coherencia de la Arquitectura Modular
 * Certificación Total: RulesEngine, BenchEffects, HandEffects, GraveEffects, FieldEffects, BattleEngine y AIEngine
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

console.log('================================================================');
console.log('👑 SUITE DE PRUEBAS - FASE 5: CONSOLIDACIÓN Y AUDITORÍA DE 429 CARTAS');
console.log('================================================================\n');

async function runPhase5Tests() {
  // ---------------------------------------------------------------------------
  // SECCIÓN 1: INTEGRIDAD DE LA BASE DE DATOS (cartas.json)
  // ---------------------------------------------------------------------------
  console.log('--- SECCIÓN 1: Integridad Estructural de las 429 Cartas ---');

  // 1.1 Total exacto de cartas
  assert(rawCards.length === 429, `1.1 Base de datos contiene exactamente 429 cartas (actual: ${rawCards.length})`);

  // 1.2 Sin IDs duplicados
  const idSet = new Set();
  const duplicateIds = [];
  rawCards.forEach(c => {
    if (idSet.has(c.id)) duplicateIds.push(c.id);
    idSet.add(c.id);
  });
  assert(duplicateIds.length === 0, `1.2 Todos los 429 IDs son únicos y no existen duplicados (duplicados: ${duplicateIds.length})`);

  // 1.3 Formato de IDs (BBX-SPxxx de 001 a 429)
  const invalidIdFormat = rawCards.filter(c => !/^BBX-SP\d{3}$/.test(c.id));
  assert(invalidIdFormat.length === 0, `1.3 Todas las cartas siguen el formato estándar 'BBX-SPxxx' (inválidos: ${invalidIdFormat.length})`);

  // 1.4 Distribución de Tipos: Personajes y Skills
  const chars = rawCards.filter(c => c.tipo === 'Personaje');
  const skills = rawCards.filter(c => c.tipo === 'Skill');
  assert(chars.length === 159 && skills.length === 270 && (chars.length + skills.length === 429),
    `1.4 Distribución válida: exactamente 159 Personajes y 270 Skills`);

  // 1.5 Campos obligatorios: nombre, tipo, efecto, imagen
  const incompleteCards = rawCards.filter(c => !c.nombre || !c.tipo || !c.efecto || !c.imagen);
  assert(incompleteCards.length === 0, `1.5 Todas las 429 cartas tienen nombre, tipo, efecto e imagen (incompletas: ${incompleteCards.length})`);

  // 1.6 Carga exitosa en cardsDatabase del simulador
  const loadedCount = Object.keys(sandbox.cardsDatabase).length;
  assert(loadedCount >= 429, `1.6 cardsDatabase de app.js tiene cargadas las 429 cartas (${loadedCount} registradas)`);


  // ---------------------------------------------------------------------------
  // SECCIÓN 2: INTEGRIDAD DE MÓDULOS DEL MOTOR CENTRAL (Modular Engines)
  // ---------------------------------------------------------------------------
  console.log('\n--- SECCIÓN 2: Integridad y Exposición de Motores Modulares ---');

  // 2.1 RulesEngine
  const hasRulesEngine = sandbox.RulesEngine &&
    typeof sandbox.RulesEngine.isAnheloGraveBlocked === 'function' &&
    typeof sandbox.RulesEngine.isGraveToHandBlocked === 'function' &&
    typeof sandbox.RulesEngine.isHarukaSP345Active === 'function' &&
    typeof sandbox.RulesEngine.isDrawBySkillBlocked === 'function';
  assert(hasRulesEngine === true, '2.1 RulesEngine expone todos los floodgates y consultas continuas');

  // 2.2 BenchEffects
  const hasBenchEffects = sandbox.BenchEffects &&
    typeof sandbox.BenchEffects.execute === 'function' &&
    typeof sandbox.BenchEffects.has === 'function' &&
    typeof sandbox.BenchEffects.canActivate === 'function';
  assert(hasBenchEffects === true, '2.2 BenchEffects expone execute, has y canActivate para simetría de banca');

  // 2.3 HandEffects
  const hasHandEffects = sandbox.HandEffects &&
    typeof sandbox.HandEffects.execute === 'function' &&
    typeof sandbox.HandEffects.has === 'function' &&
    typeof sandbox.HandEffects.canActivate === 'function';
  assert(hasHandEffects === true, '2.3 HandEffects expone execute, has y canActivate para activaciones de mano');

  // 2.4 GraveEffects
  const hasGraveEffects = sandbox.GraveEffects &&
    typeof sandbox.GraveEffects.dispatch === 'function' &&
    typeof sandbox.dispatchGraveTriggers === 'function' &&
    typeof sandbox.GraveEffects.handlers === 'object';
  assert(hasGraveEffects === true, '2.4 GraveEffects expone dispatch, handlers y dispatchGraveTriggers para cementerio');

  // 2.5 FieldEffects
  const hasFieldEffects = sandbox.FieldEffects &&
    typeof sandbox.FieldEffects.canActivateCharacter === 'function' &&
    typeof sandbox.FieldEffects.canActivateSkill === 'function' &&
    typeof sandbox.FieldEffects.executeCharacter === 'function' &&
    typeof sandbox.FieldEffects.executeSkill === 'function';
  assert(hasFieldEffects === true, '2.5 FieldEffects expone canActivate y execute para campo y skills');

  // 2.6 BattleEngine
  const hasBattleEngine = sandbox.BattleEngine &&
    typeof sandbox.BattleEngine.canDeclareAttack === 'function' &&
    typeof sandbox.BattleEngine.getEligibleTargets === 'function' &&
    typeof sandbox.BattleEngine.executeAttack === 'function' &&
    typeof sandbox.BattleEngine.resolveDamage === 'function';
  assert(hasBattleEngine === true, '2.6 BattleEngine expone canDeclareAttack, getEligibleTargets y executeAttack');

  // 2.7 AIEngine
  const hasAIEngine = sandbox.AIEngine &&
    typeof sandbox.AIEngine.getExecutor === 'function' &&
    typeof sandbox.AIEngine.executeOpponentTurn === 'function';
  assert(hasAIEngine === true, '2.7 AIEngine expone getExecutor y executeOpponentTurn');


  // ---------------------------------------------------------------------------
  // SECCIÓN 3: VERIFICACIÓN DE ARCHIVOS DE MAZOS (mazos/ y mazos_ia/)
  // ---------------------------------------------------------------------------
  console.log('\n--- SECCIÓN 3: Verificación de Archivos de Mazos Preconstruidos ---');

  // 3.1 Mazo deida.json
  const deidaPath = path.resolve(__dirname, 'mazos/deida.json');
  assert(fs.existsSync(deidaPath), '3.1 Archivo mazos/deida.json existe');
  const deidaDeck = JSON.parse(fs.readFileSync(deidaPath, 'utf8'));
  const deidaInvalid = (deidaDeck.main || []).filter(id => !sandbox.cardsDatabase[id]);
  assert(deidaDeck.main.length === 30 && deidaInvalid.length === 0,
    `3.1 mazos/deida.json contiene exactamente 30 cartas válidas (inválidas: ${deidaInvalid.length})`);

  // 3.2 Mazo IA_Haruka_Campeon.json
  const harukaAIPath = path.resolve(__dirname, 'mazos_ia/IA_Haruka_Campeon.json');
  assert(fs.existsSync(harukaAIPath), '3.2 Archivo mazos_ia/IA_Haruka_Campeon.json existe');
  const harukaAIDeck = JSON.parse(fs.readFileSync(harukaAIPath, 'utf8'));
  const harukaInvalid = (harukaAIDeck.main || []).filter(id => !sandbox.cardsDatabase[id]);
  assert(harukaAIDeck.main.length >= 30 && harukaInvalid.length === 0,
    `3.2 mazos_ia/IA_Haruka_Campeon.json contiene cartas válidas para la IA (inválidas: ${harukaInvalid.length})`);


  // ---------------------------------------------------------------------------
  // SECCIÓN 4: CONDICIONES GLOBALES DE SIMETRÍA Y ARQUITECTURA
  // ---------------------------------------------------------------------------
  console.log('\n--- SECCIÓN 4: Condiciones Globales de Simetría y Arquitectura ---');

  // 4.1 Simetría de Vida (Banca de 3 cartas = Derrota)
  sandbox.playtestState.opponentBench = [{ id: 'BBX-SP001' }, { id: 'BBX-SP002' }, { id: 'BBX-SP003' }];
  sandbox.playtestState.bench = [];
  sandbox.playtestState.matchEnded = false;
  const opp3Bench = sandbox.checkMatchEndCondition();
  assert(opp3Bench.ended === true && opp3Bench.winner === 'player',
    '4.1 Condición de 3 personajes en banca rival otorga victoria al Jugador');

  sandbox.playtestState.bench = [{ id: 'BBX-SP001' }, { id: 'BBX-SP002' }, { id: 'BBX-SP003' }];
  sandbox.playtestState.opponentBench = [];
  sandbox.playtestState.matchEnded = false;
  const player3Bench = sandbox.checkMatchEndCondition();
  assert(player3Bench.ended === true && player3Bench.winner === 'opponent',
    '4.2 Condición de 3 personajes en banca propia otorga victoria al Rival');

  // 4.3 Expansiones registradas en expansionSetEffects
  const hasExpansionSet = typeof sandbox.checkAndTriggerTajoVentada === 'function' &&
                          typeof sandbox.executeBusquedaSP315 === 'function' &&
                          typeof sandbox.activateHarukaSP331Hand === 'function';
  assert(hasExpansionSet === true, '4.3 Funciones de expansionSetEffects.js registradas y listas');

  // Resumen Final
  console.log('\n================================================================');
  console.log(`📊 RESULTADO FINAL FASE 5: ${passedTests} de ${totalTests} pruebas pasadas (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ¡AUDITORÍA DE LA FASE 5 Y LAS 429 CARTAS FINALIZADA AL 100% CON ÉXITO!');
    process.exit(0);
  } else {
    console.error(`❌ FALLARON ${totalTests - passedTests} PRUEBAS EN LA FASE 5.`);
    process.exit(1);
  }
}

runPhase5Tests().catch(err => {
  console.error('Error fatal durante la ejecución de las pruebas:', err);
  process.exit(1);
});
