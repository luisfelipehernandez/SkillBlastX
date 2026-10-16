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
  alert: () => {},
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

const rawCards = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../cartas.json'), 'utf8'));

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

console.log("======================================================");
console.log("   PRUEBAS UNITARIAS: LYNA (SP425) & FLORETE (SP371)  ");
console.log("======================================================");

const state = sandbox.playtestState;

// -------------------------------------------------------------------
// TEST 1: Lyna SP425 - Activación desde mano y portar skill del deck
// -------------------------------------------------------------------
console.log("\n1. Lyna (BBX-SP425):");

state.turnOwner = 'player';
state.hand = ['BBX-SP425'];
state.deck = ['BBX-SP272', 'BBX-SP001'];
state.grave = [];
state.slots[0] = { character: 'BBX-SP281', skills: ['BBX-SP271'] };
state.slots[1] = { character: null, skills: [] };
state.slots[2] = { character: null, skills: [] };
state.slots[3] = { character: null, skills: [] };

let doneCallbackCalled = false;
let resultData = null;

sandbox.executeLynaSP425Activation('player', 0, {
  chosenTarget: { id: 'BBX-SP271', owner: 'player', slotIdx: 0, skIdx: 0 },
  chosenDeckSkillId: 'BBX-SP272',
  chosenSlotIndex: 0
}, (success, data) => {
  doneCallbackCalled = true;
  resultData = data;
});

assert.strictEqual(state.hand.includes('BBX-SP425'), false, "Lyna SP425 debe ser removida de la mano");
assert.strictEqual(state.grave.includes('BBX-SP425'), true, "Lyna SP425 debe estar en el cementerio");
assert.strictEqual(state.grave.includes('BBX-SP271'), true, "La skill de campo SP271 debe estar en el cementerio");
assert.strictEqual(state.slots[0].skills.includes('BBX-SP272'), true, "La skill SP272 del deck debe portarse en el slot 0");
assert.strictEqual(state.deck.includes('BBX-SP272'), false, "La skill SP272 ya no debe estar en el deck");
assert.strictEqual(doneCallbackCalled, true, "onDone debe ser llamado");
console.log("  ✔ PASS: 1.1 Lyna SP425 envía costo, envía skill portada y porta skill de Lyna desde el deck");

// -------------------------------------------------------------------
// TEST 2: Lyna SP425 - skipEquip opcional
// -------------------------------------------------------------------
state.hand = ['BBX-SP425'];
state.deck = ['BBX-SP272'];
state.slots[0] = { character: 'BBX-SP281', skills: ['BBX-SP271'] };
sandbox.executeLynaSP425Activation('player', 0, {
  chosenTarget: { id: 'BBX-SP271', owner: 'player', slotIdx: 0, skIdx: 0 },
  skipEquip: true
}, (success, data) => {
  assert.strictEqual(data.equipped, false);
});
assert.strictEqual(state.deck.includes('BBX-SP272'), true, "Si se omite el portar opcional, la skill queda en el deck");
console.log("  ✔ PASS: 1.2 Lyna SP425 permite omitir portar skill de forma opcional");

// -------------------------------------------------------------------
// TEST 3: Lyna SP425 - Modo Rival (IA)
// -------------------------------------------------------------------
state.turnOwner = 'opponent';
state.opponentHand = ['BBX-SP425'];
state.opponentDeck = ['BBX-SP273'];
state.opponentGrave = [];
state.opponentSlots[0] = { character: 'BBX-SP281', skills: ['BBX-SP271'] };

sandbox.executeLynaSP425Activation('opponent', 0, {}, (success, data) => {
  assert.strictEqual(success, true);
});
assert.strictEqual(state.opponentHand.includes('BBX-SP425'), false);
assert.strictEqual(state.opponentGrave.includes('BBX-SP425'), true);
assert.strictEqual(state.opponentSlots[0].skills.includes('BBX-SP273'), true, "El rival portó automáticamente la skill SP273 de Lyna");
console.log("  ✔ PASS: 1.3 Lyna SP425 funciona simétricamente para el rival/IA");

// -------------------------------------------------------------------
// TEST 4: Florete SP371 - Activación desde cementerio
// -------------------------------------------------------------------
console.log("\n2. Florete (BBX-SP371):");
state.turnOwner = 'player';
state.grave = ['BBX-SP371'];
state.usedFlorete371ThisTurn = false;
state.usedGlobalEffects = [];
state.slots[0] = { character: 'BBX-SP001', skills: ['BBX-SP002'] };
state.opponentSlots[0] = { character: 'BBX-SP003', skills: ['BBX-SP004'] };

let floreteDone = false;
sandbox.executeFloreteSP371Activation('player', {
  selectedFieldSkillId: 'BBX-SP004'
}, () => {
  floreteDone = true;
});

assert.strictEqual(floreteDone, true);
assert.strictEqual(state.usedFlorete371ThisTurn, true, "Florete debe marcarse como usado este turno");
assert.strictEqual(state.opponentSlots[0].skills.includes('BBX-SP004'), false, "La skill rival debe haber sido removida");
assert.strictEqual(state.opponentGrave.includes('BBX-SP004'), true, "La skill rival debe haber ido al cementerio rival");
console.log("  ✔ PASS: 2.1 Florete SP371 activa desde cementerio y envía skill portada enemiga al cementerio rival");

// -------------------------------------------------------------------
// TEST 5: Florete SP371 - HOPT (Una vez por turno)
// -------------------------------------------------------------------
sandbox.executeFloreteSP371Activation('player', {
  selectedFieldSkillId: 'BBX-SP002'
}, () => {});
assert.strictEqual(state.slots[0].skills.includes('BBX-SP002'), true, "No debe ejecutarse una segunda vez en el mismo turno");
console.log("  ✔ PASS: 2.2 Florete SP371 respeta estrictamente HOPT (una vez por turno)");

// -------------------------------------------------------------------
// TEST 6: Florete SP371 - Simetría Rival
// -------------------------------------------------------------------
state.turnOwner = 'opponent';
state.opponentGrave = ['BBX-SP371'];
state.opponentUsedFlorete371ThisTurn = false;
state.slots[0] = { character: 'BBX-SP001', skills: ['BBX-SP002'] };

sandbox.executeFloreteSP371Activation('opponent', {}, () => {});
assert.strictEqual(state.slots[0].skills.includes('BBX-SP002'), false, "El rival activó Florete y eliminó la skill del jugador");
assert.strictEqual(state.grave.includes('BBX-SP002'), true, "La skill del jugador fue a su propio cementerio");
console.log("  ✔ PASS: 2.3 Florete SP371 funciona simétricamente para el rival");

console.log("\n======================================================");
console.log("🎉 ¡TODAS LAS PRUEBAS DE LYNA Y FLORETE PASARON AL 100%!");
console.log("======================================================");
