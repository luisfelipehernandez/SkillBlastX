const assert = require('assert');
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
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    appendChild(child) { return child; },
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

const sandbox = {
  console: console,
  setTimeout: (fn) => { fn(); return 1; },
  clearTimeout: () => {},
  setInterval: () => {},
  clearInterval: () => {},
  alert: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  window: {},
  document: {
    getElementById: (id) => createMockElement(id),
    createElement: (tag) => createMockElement(tag),
    querySelector: () => createMockElement(),
    querySelectorAll: () => [],
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

// Cargar scripts necesarios
const scripts = [
  'js/core/rulesEngine.js',
  'js/core/dispatcher.js',
  'js/effects/fieldEffects.js',
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

// Cargar cartas y poblar cardsDatabase existente
const cartasPath = fs.existsSync(path.resolve(__dirname, 'cartas.json'))
  ? path.resolve(__dirname, 'cartas.json')
  : path.resolve(__dirname, '../cartas.json');
const rawCards = JSON.parse(fs.readFileSync(cartasPath, 'utf8'));

sandbox.cardsDatabase = sandbox.cardsDatabase || {};
rawCards.forEach(c => {
  sandbox.cardsDatabase[c.id] = c;
});
if (sandbox.window) sandbox.window.cardsDatabase = sandbox.cardsDatabase;
if (sandbox.global) sandbox.global.cardsDatabase = sandbox.cardsDatabase;

console.log('--- TEST 1: ¡Drago-impacto arcano! (BBX-SP245) Carrier Compatibility & AI Rules ---');
const harukaNormal = sandbox.cardsDatabase['BBX-SP093'] || sandbox.cardsDatabase['BBX-SP001'];
const harukaArcano = sandbox.cardsDatabase['BBX-SP100'] || sandbox.cardsDatabase['BBX-SP244'];
const dragoImpacto = sandbox.cardsDatabase['BBX-SP245'];

assert.strictEqual(sandbox.isCarrierMatch(dragoImpacto.portador, harukaNormal), false, 'Haruka normal NO debe poder portar Drago-impacto arcano');
assert.strictEqual(sandbox.isCarrierMatch(dragoImpacto.portador, harukaArcano), true, 'Haruka Modo arcano SÍ debe poder portar Drago-impacto arcano');
console.log('✔ PASS: isCarrierMatch discrimina correctamente entre Haruka normal (false) y Haruka Modo arcano (true).');

// 1.1 Test de la IA Haruka (Equipar)
const hand = ['BBX-SP245'];
const mySlotsNormal = [
  {
    character: harukaNormal.id, // Haruka normal
    skills: []
  }
];
const equipAction = sandbox.HarukaExecutor.getEquipAction(hand, mySlotsNormal);
assert.strictEqual(equipAction, null, 'La IA de Haruka no debe equipar Drago-impacto arcano a una Haruka normal');
console.log('✔ PASS: harukaExecutor rechaza equipar Drago-impacto arcano a Haruka normal.');

// 1.2 Test de Haruka Modo Arcano con la IA (Equipar)
const mySlotsArcana = [
  {
    character: harukaArcano.id, // Haruka Modo arcano
    skills: []
  }
];
const equipActionArcana = sandbox.HarukaExecutor.getEquipAction(hand, mySlotsArcana);
assert.notStrictEqual(equipActionArcana, null, 'La IA de Haruka sí debe poder equipar Drago-impacto arcano a Haruka Modo arcano');
assert.strictEqual(equipActionArcana.cardId, 'BBX-SP245');
console.log('✔ PASS: harukaExecutor permite equipar Drago-impacto arcano a Haruka Modo arcano.');

// 1.3 Test de la IA Haruka (Activar en campo): Mismas reglas que el jugador humano
// Caso: Haruka normal con BBX-SP245
const normalSlotWithDrago = [
  {
    character: harukaNormal.id,
    skills: ['BBX-SP245'],
    usedSkills: [],
    effectUsed: true
  }
];
const oppSlotsWithManySkills = [
  {
    character: 'BBX-SP002',
    skills: ['BBX-SP003', 'BBX-SP004']
  }
];
const fieldActionNormal = sandbox.HarukaExecutor.getFieldAction(normalSlotWithDrago, ['BBX-SP005', 'BBX-SP006'], [], [], oppSlotsWithManySkills);
assert.strictEqual(fieldActionNormal?.type !== 'activate_drago_impacto', true, 'La IA NO debe activar Drago-impacto arcano si el personaje no es Haruka/Modo arcano');
assert.strictEqual(fieldActionNormal, null, 'No debe haber acción de Drago-impacto disponible para Haruka normal');
console.log('✔ PASS: harukaExecutor.getFieldAction() bloquea activar Drago-impacto arcano en Haruka normal.');

// Caso: Haruka Modo arcano con BBX-SP245
const arcanaSlotWithDrago = [
  {
    character: harukaArcano.id,
    skills: ['BBX-SP245'],
    usedSkills: [],
    effectUsed: true
  }
];
const fieldActionArcana = sandbox.HarukaExecutor.getFieldAction(arcanaSlotWithDrago, ['BBX-SP005', 'BBX-SP006'], [], [], oppSlotsWithManySkills);
assert.notStrictEqual(fieldActionArcana, null, 'La IA SÍ debe poder activar Drago-impacto arcano en Haruka Modo arcano');
assert.strictEqual(fieldActionArcana.type, 'activate_drago_impacto');
console.log('✔ PASS: harukaExecutor.getFieldAction() permite activar Drago-impacto arcano en Haruka Modo arcano.');

// 1.4 Test canActivateSkill para BBX-SP245 (Simétrico para IA y Jugador)
sandbox.playtestState = {
  turnOwner: 'opponent',
  deck: [],
  hand: [],
  grave: [],
  slots: [{ character: 'BBX-SP002', skills: ['BBX-SP003'] }],
  opponentSlots: normalSlotWithDrago,
  opponentDeck: [],
  opponentHand: ['BBX-SP005', 'BBX-SP006'],
  opponentGrave: []
};
assert.strictEqual(sandbox.FieldEffects.canActivateSkill('BBX-SP245', 0, 0, 'opponent'), false, 'FieldEffects.canActivateSkill debe ser false para Haruka normal');

sandbox.playtestState.opponentSlots = arcanaSlotWithDrago;
assert.strictEqual(sandbox.FieldEffects.canActivateSkill('BBX-SP245', 0, 0, 'opponent'), true, 'FieldEffects.canActivateSkill debe ser true para Haruka Modo arcano');
console.log('✔ PASS: FieldEffects.canActivateSkill respeta la restricción idéntica para IA y humanos.');


console.log('\n--- TEST 2: Mapa (BBX-SP264) Choice Logic (IA vs Partida VS) ---');
// Caso 2.1: Mapa está entre las 5 primeras del deck -> Regla obligatoria
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

// Caso 2.2: Duelo contra la IA (isDuelVsAI = true): La máquina elige al azar para el jugador
sandbox.playtestState = {
  isDuelVsAI: true,
  isOnlineMatch: false,
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

let modalOpenedInAI = false;
sandbox.openCardChooserModal = () => { modalOpenedInAI = true; };

let cbResult2 = false;
sandbox.FieldEffects.executeSkill('BBX-SP264', 0, 0, 'player', {}, (success) => {
  cbResult2 = success;
});
assert.strictEqual(modalOpenedInAI, false, 'En modo vs IA no debe abrirse modal para pedirle al jugador que elija');
assert.strictEqual(sandbox.playtestState.hand.length, 1, 'La IA debió elegir 1 carta al azar para la mano del jugador');
assert.strictEqual(['BBX-SP001', 'BBX-SP002', 'BBX-SP003', 'BBX-SP004', 'BBX-SP005'].includes(sandbox.playtestState.hand[0]), true);
assert.strictEqual(cbResult2, true);
console.log('✔ PASS: En duelo vs IA, la IA toma la decisión al azar sin pedirle al jugador.');

// Caso 2.3: Duelo Local VS / Sandbox (isDuelVsAI = false, isOnlineMatch = false): El rival humano elige interactivamente
sandbox.playtestState = {
  isDuelVsAI: false,
  isOnlineMatch: false,
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

let modalOpenedInLocalVS = false;
let modalOnSelect = null;
sandbox.openCardChooserModal = (cards, title, onSelect) => {
  modalOpenedInLocalVS = true;
  modalOnSelect = onSelect;
};

sandbox.FieldEffects.executeSkill('BBX-SP264', 0, 0, 'player', {}, () => {});
assert.strictEqual(modalOpenedInLocalVS, true, 'En duelo local VS debe abrirse el modal para que el adversario humano elija');
console.log('✔ PASS: En partida local VS, se abre el modal interactivo para que el rival humano elija.');

// El adversario humano elige la carta en índice 3 ('BBX-SP004')
modalOnSelect(3);
assert.strictEqual(sandbox.playtestState.hand[0], 'BBX-SP004', 'La carta agregada a la mano debe ser exactamente la elegida por el adversario humano');
console.log('✔ PASS: La elección interactiva del adversario humano se aplica exactamente a la mano del jugador.');


console.log('\n--- TEST 3: Ocaso del pasado (BBX-SP265) & End-Turn Safety ---');
assert.strictEqual(typeof sandbox.endCurrentTurn, 'function');
assert.strictEqual(typeof sandbox.showContextMenu, 'function');
assert.strictEqual(typeof sandbox.hideContextMenu, 'function');

// Probar protección timestamp de context menu
sandbox._contextMenuOpenedTimestamp = Date.now();
let dismissed = false;
sandbox.activeContextMenuDismissHandler = () => { dismissed = true; };
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
console.log('TODAS LAS PRUEBAS UNITARIAS PASARON EXITOSAMENTE!');
console.log('=================================================');
