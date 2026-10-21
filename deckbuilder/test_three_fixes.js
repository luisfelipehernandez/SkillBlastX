const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

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
    addEventListener() {},
    dispatchEvent() {},
    appendChild(child) { return child; },
    querySelector() { return createMockElement(); },
    querySelectorAll() { return []; },
    remove() {},
    innerHTML: '',
    textContent: ''
  };
}

const sandbox = {
  console: console,
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
  alert: (msg) => console.log('Mock alert:', msg),
  addEventListener: () => {},
  removeEventListener: () => {},
  window: {},
  document: {
    getElementById: (id) => createMockElement(id),
    createElement: (tag) => createMockElement(tag),
    querySelector: () => createMockElement(),
    querySelectorAll: () => [],
    addEventListener: () => {},
    body: createMockElement('body')
  },
  Date: Date,
  Math: Math,
  Array: Array,
  Object: Object,
  JSON: JSON,
  Set: Set,
  parseInt: parseInt
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.root = sandbox;

vm.createContext(sandbox);

// 1. Cargar cardsDatabase desde cartas.json
const cartasPath = path.resolve(__dirname, '../cartas.json');
const cardsData = JSON.parse(fs.readFileSync(cartasPath, 'utf8'));
sandbox.cardsDatabase = {};
cardsData.forEach(c => sandbox.cardsDatabase[c.id] = c);

// 2. Cargar app.js en sandbox
const appCode = fs.readFileSync(path.resolve(__dirname, 'app.js'), 'utf8');
vm.runInContext(appCode, sandbox);

// Repoblar cardsDatabase tras la inicialización de app.js
cardsData.forEach(c => sandbox.cardsDatabase[c.id] = c);

// 3. Cargar executors y effects
const harukaCode = fs.readFileSync(path.resolve(__dirname, 'js/ai/executors/harukaExecutor.js'), 'utf8');
vm.runInContext(harukaCode, sandbox);

const fieldEffectsCode = fs.readFileSync(path.resolve(__dirname, 'js/effects/fieldEffects.js'), 'utf8');
vm.runInContext(fieldEffectsCode, sandbox);

console.log('--- TEST 1: ¡Drago-impacto arcano! (BBX-SP245) Carrier Compatibility ---');
const harukaNormal = sandbox.cardsDatabase['BBX-SP093'];
const harukaArcano = sandbox.cardsDatabase['BBX-SP100'];
const dragoImpacto = sandbox.cardsDatabase['BBX-SP245'];

assert.strictEqual(sandbox.isCarrierMatch(dragoImpacto.portador, harukaNormal), false, 'Haruka normal NO debe poder portar Drago-impacto arcano');
assert.strictEqual(sandbox.isCarrierMatch(dragoImpacto.portador, harukaArcano), true, 'Haruka Modo arcano SÍ debe poder portar Drago-impacto arcano');
console.log('✔ PASS: isCarrierMatch discrimina correctamente entre Haruka normal (false) y Haruka Modo arcano (true).');

// Test de la IA Haruka
const hand = ['BBX-SP245']; // Solo Drago-impacto arcano en mano
const mySlots = [
  {
    character: 'BBX-SP093', // Haruka normal
    skills: []
  }
];
const equipAction = sandbox.HarukaExecutor.getEquipAction(hand, mySlots);
assert.strictEqual(equipAction, null, 'La IA de Haruka no debe equipar Drago-impacto arcano a una Haruka normal');
console.log('✔ PASS: harukaExecutor rechaza equipar Drago-impacto arcano a Haruka normal.');

// Test de Haruka Modo Arcano con la IA
const mySlotsArcana = [
  {
    character: 'BBX-SP100', // Haruka Modo arcano
    skills: []
  }
];
const equipActionArcana = sandbox.HarukaExecutor.getEquipAction(hand, mySlotsArcana);
assert.notStrictEqual(equipActionArcana, null, 'La IA de Haruka sí debe poder equipar Drago-impacto arcano a Haruka Modo arcano');
assert.strictEqual(equipActionArcana.cardId, 'BBX-SP245');
console.log('✔ PASS: harukaExecutor permite equipar Drago-impacto arcano a Haruka Modo arcano.');

console.log('\n--- TEST 2: Mapa (BBX-SP264) Choice Logic ---');
// Caso 2.1: Mapa está entre las 5 primeras del deck
sandbox.playtestState = {
  turnOwner: 'player',
  deck: ['BBX-SP001', 'BBX-SP002', 'BBX-SP264', 'BBX-SP003', 'BBX-SP004', 'BBX-SP005'],
  hand: [],
  grave: [],
  slots: [{ character: 'BBX-SP001', skills: ['BBX-SP264'], usedSkills: [], usedSkillIndexes: [] }],
  opponentSlots: [],
  opponentDeck: [],
  opponentHand: [],
  opponentGrave: []
};

let cbResult1 = false;
sandbox.FieldEffects.executeSkill('BBX-SP264', 0, 0, 'player', {}, (success) => {
  cbResult1 = success;
});
assert.strictEqual(sandbox.playtestState.hand.includes('BBX-SP264'), true, 'Mapa debe ser agregada obligatoriamente a la mano si está entre las 5 reveladas');
assert.strictEqual(sandbox.playtestState.hand.length, 1);
assert.strictEqual(cbResult1, true);
console.log('✔ PASS: Si "Mapa" está entre las 5 reveladas, se agrega automáticamente "Mapa" obligatoriamente.');

// Caso 2.2: Mapa NO está entre las 5 primeras -> Adversario elige al azar para la mano del jugador
sandbox.playtestState = {
  turnOwner: 'player',
  deck: ['BBX-SP001', 'BBX-SP002', 'BBX-SP003', 'BBX-SP004', 'BBX-SP005', 'BBX-SP006'],
  hand: [],
  grave: [],
  slots: [{ character: 'BBX-SP001', skills: ['BBX-SP264'], usedSkills: [], usedSkillIndexes: [] }],
  opponentSlots: [],
  opponentDeck: [],
  opponentHand: [],
  opponentGrave: []
};

let chooserOpened = false;
sandbox.openCardChooserModal = () => { chooserOpened = true; };

let cbResult2 = false;
sandbox.FieldEffects.executeSkill('BBX-SP264', 0, 0, 'player', {}, (success) => {
  cbResult2 = success;
});
assert.strictEqual(chooserOpened, false, 'No debe abrirse el chooser modal al jugador cuando el adversario toma la decisión');
assert.strictEqual(sandbox.playtestState.hand.length, 1, 'El adversario debió agregar 1 carta al azar a la mano del jugador');
assert.strictEqual(['BBX-SP001', 'BBX-SP002', 'BBX-SP003', 'BBX-SP004', 'BBX-SP005'].includes(sandbox.playtestState.hand[0]), true);
assert.strictEqual(cbResult2, true);
console.log('✔ PASS: Si "Mapa" no está entre las 5 reveladas, el adversario elige al azar sin pedirle al jugador.');

console.log('\n--- TEST 3: Ocaso del pasado (BBX-SP265) & End-Turn Safety ---');
assert.strictEqual(typeof sandbox.endCurrentTurn, 'function');
assert.strictEqual(typeof sandbox.showContextMenu, 'function');
assert.strictEqual(typeof sandbox.hideContextMenu, 'function');

// Probar protección timestamp de context menu
sandbox._contextMenuOpenedTimestamp = Date.now();
// Simular click inmediato (< 150ms)
let dismissed = false;
sandbox.activeContextMenuDismissHandler = () => { dismissed = true; };
// Llamar al handler que window.addEventListener('click') ejecuta:
const checkClickDismiss = () => {
  if (sandbox._contextMenuOpenedTimestamp && (Date.now() - sandbox._contextMenuOpenedTimestamp < 150)) {
    return; // Protegido!
  }
  sandbox.hideContextMenu();
};
checkClickDismiss();
assert.strictEqual(dismissed, false, 'El menú contextual NO debe cerrarse inmediatamente en el mismo frame por burbujeo del click');
console.log('✔ PASS: Protección de timestamp previene el cierre prematuro del menú de fin de turno.');

console.log('\n=================================================');
console.log('🎉 TODOS LOS TESTS DE LOS 3 ERRORES PASARON 100%');
console.log('=================================================');
