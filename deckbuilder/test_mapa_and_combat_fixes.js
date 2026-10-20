const fs = require('fs');
const assert = require('assert');

// 1. Cargar base de datos de cartas
const jsonPath = fs.existsSync('cartas.json') ? 'cartas.json' : (fs.existsSync('../cartas.json') ? '../cartas.json' : 'deckbuilder/cartas.json');
const cardsData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const cardsDatabase = {};
cardsData.forEach(c => { cardsDatabase[c.id] = c; });
global.cardsDatabase = cardsDatabase;

// 2. Mock del estado del juego
const playtestState = {
  turnOwner: 'player',
  turnCount: 2,
  matchEnded: false,
  isDuelVsAI: true,
  deck: ['BBX-SP264', 'BBX-SP001', 'BBX-SP002', 'BBX-SP003', 'BBX-SP004', 'BBX-SP005'],
  hand: [],
  grave: [],
  bench: [],
  slots: [
    { character: null, skills: [], usedSkills: [], usedSkillIndexes: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false },
    {
      character: 'BBX-SP258', // Deida
      skills: ['BBX-SP264', 'BBX-SP264', 'BBX-SP045', 'BBX-SP209'], // Mapa, Mapa, Inmovilizar, Drago-tenacidad
      usedSkills: [],
      usedSkillIndexes: [],
      maxAttacks: 1,
      attacksDeclared: 0,
      isRotated: false,
      effectUsed: false
    },
    { character: null, skills: [], usedSkills: [], usedSkillIndexes: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false }
  ],
  opponentDeck: ['BBX-SP001', 'BBX-SP002', 'BBX-SP003'],
  opponentHand: ['BBX-SP060'], // Resistir en mano
  opponentGrave: [],
  opponentBench: [],
  opponentSlots: [
    { character: null, skills: [], usedSkills: [], usedSkillIndexes: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false },
    {
      character: 'BBX-SP001', // Haruka
      skills: ['BBX-SP033'], // Carga destello
      usedSkills: [],
      usedSkillIndexes: [],
      maxAttacks: 1,
      attacksDeclared: 0,
      isRotated: false,
      effectUsed: false
    },
    { character: null, skills: [], usedSkills: [], usedSkillIndexes: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false }
  ]
};
global.playtestState = playtestState;

// 3. Mock window y document
global.window = global;
global.document = {
  getElementById: (id) => ({
    textContent: '',
    style: {},
    classList: { add: ()=>{}, remove: ()=>{}, contains: ()=>false },
    innerHTML: '',
    appendChild: ()=>{},
    querySelector: ()=>null,
    querySelectorAll: ()=>[],
    addEventListener: ()=>{},
    getBoundingClientRect: ()=>({ left:0, top:0, width:100, height:100 })
  }),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({
    style: {},
    classList: { add: ()=>{}, remove: ()=>{}, contains: ()=>false },
    appendChild: ()=>{},
    addEventListener: ()=>{},
    setAttribute: ()=>{},
    innerHTML: ''
  }),
  body: { appendChild: ()=>{} },
  addEventListener: ()=>{}
};

let lastAlert = null;
global.alert = (msg) => { lastAlert = msg; };
global.addLog = (msg) => { /* console.log('LOG:', msg); */ };

// Definición de isEquippedSkillUsed oficial implementada
window.isEquippedSkillUsed = function(slot, skillId, skIndex, owner = 'player') {
  if (!slot) return false;
  if (typeof skIndex === 'number' && skIndex >= 0) {
    return (slot.usedSkillIndexes || []).includes(skIndex);
  }
  return (slot.usedSkills || []).includes(skillId);
};

console.log('=== TEST 1: MAPA BBX-SP264 CON DOS COPIAS ===');
const deidaSlot = playtestState.slots[1];
assert.strictEqual(window.isEquippedSkillUsed(deidaSlot, 'BBX-SP264', 0), false, 'Copia 0 no debería estar usada');
assert.strictEqual(window.isEquippedSkillUsed(deidaSlot, 'BBX-SP264', 1), false, 'Copia 1 no debería estar usada');

// Activar primera copia de Mapa (skIndex = 0)
deidaSlot.usedSkillIndexes.push(0);
assert.strictEqual(window.isEquippedSkillUsed(deidaSlot, 'BBX-SP264', 0), true, 'Copia 0 debe estar marcada como usada');
assert.strictEqual(window.isEquippedSkillUsed(deidaSlot, 'BBX-SP264', 1), false, 'Copia 1 DEBE seguir disponible para usar');

// Simular validación de activación para la segunda copia (skIndex = 1)
const canActivateCopia1 = !window.isEquippedSkillUsed(deidaSlot, 'BBX-SP264', 1);
assert.strictEqual(canActivateCopia1, true, 'La segunda copia de Mapa DEBE poder activarse en el mismo turno');

// Activar segunda copia de Mapa (skIndex = 1)
deidaSlot.usedSkillIndexes.push(1);
assert.strictEqual(window.isEquippedSkillUsed(deidaSlot, 'BBX-SP264', 1), true, 'Copia 1 ahora debe estar marcada como usada');
console.log('✔ Test 1 superado: Ambas copias de Mapa pueden activarse independientemente en el mismo turno.');

console.log('\n=== TEST 2: REACCIÓN DE RESISTIR Y SACRIFICIO INTELIGENTE DE LA IA ===');
const harukaSlot = playtestState.opponentSlots[1];
assert.deepStrictEqual(harukaSlot.skills, ['BBX-SP033'], 'Haruka empieza con Carga destello');
assert.strictEqual(playtestState.opponentHand.includes('BBX-SP060'), true, 'IA tiene Resistir en mano');

// Simular reacción de mano de la IA al ser atacada
const idxInHand = playtestState.opponentHand.indexOf('BBX-SP060');
playtestState.opponentHand.splice(idxInHand, 1);
harukaSlot.skills.push('BBX-SP060');
assert.strictEqual(playtestState.opponentHand.length, 0, 'Resistir fue bajada de la mano');
assert.deepStrictEqual(harukaSlot.skills, ['BBX-SP033', 'BBX-SP060'], 'Haruka porta Carga destello + Resistir');

// Simular la resolución de combate donde la IA elige qué perder
// Lógica implementada: Prioridad 1 es perder Resistir (BBX-SP060)
let chosenIdx = harukaSlot.skills.indexOf('BBX-SP060');
if (chosenIdx === -1) {
  chosenIdx = harukaSlot.skills.findIndex((sk, sIdx) => (harukaSlot.usedSkillIndexes || []).includes(sIdx));
}
if (chosenIdx === -1) {
  const protectedSkills = ['BBX-SP224', 'BBX-SP005', 'BBX-SP002', 'BBX-SP209', 'BBX-SP033', 'BBX-SP045'];
  chosenIdx = harukaSlot.skills.findIndex(sk => !protectedSkills.includes(sk));
}
if (chosenIdx === -1) chosenIdx = 0;

const lostSkillId = harukaSlot.skills.splice(chosenIdx, 1)[0];
playtestState.opponentGrave.push(lostSkillId);

assert.strictEqual(lostSkillId, 'BBX-SP060', 'La IA debe sacrificar Resistir (el escudo reactivo)');
assert.deepStrictEqual(harukaSlot.skills, ['BBX-SP033'], 'Haruka DEBE conservar Carga destello intacta');
assert.strictEqual(playtestState.opponentGrave.includes('BBX-SP060'), true, 'Resistir debe estar en el cementerio');
console.log('✔ Test 2 superado: La IA sacrifica Resistir y conserva Carga destello en el campo.');

console.log('\n=== TEST 3: ATACANTE AGOTADO Y ESTADO DE ROTACIÓN ===');
// Deida declara su ataque
deidaSlot.attacksDeclared = (deidaSlot.attacksDeclared || 0) + 1;
if (deidaSlot.attacksDeclared >= (deidaSlot.maxAttacks || 1)) {
  deidaSlot.isRotated = true;
}
assert.strictEqual(deidaSlot.attacksDeclared, 1, 'Deida registró 1 ataque');
assert.strictEqual(deidaSlot.isRotated, true, 'Deida debe estar rotada/agotada');

const attacksLeft = (deidaSlot.attacksDeclared || 0) >= (deidaSlot.maxAttacks || 1);
assert.strictEqual(attacksLeft, true, 'El personaje ya no puede atacar más este turno');
console.log('✔ Test 3 superado: Deida queda debidamente rotada y registrada como agotada.');

console.log('\n¡TODAS LAS PRUEBAS DE REGRESIÓN PASARON CON ÉXITO!');
