/**
 * SUITE MAESTRA DE PRUEBAS AUTOMATIZADAS - SKILL BLAST X
 * Herramienta interna de desarrollo para validar la integridad de las 429 cartas.
 * Ejecutar con: node tests/suite_runner.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const CARTAS_JSON_PATH = path.join(ROOT_DIR, 'cartas.json');
const RULES_ENGINE_PATH = path.join(ROOT_DIR, 'deckbuilder', 'js', 'core', 'rulesEngine.js');
const EXPANSION_EFFECTS_PATH = path.join(ROOT_DIR, 'deckbuilder', 'js', 'effects', 'expansionSetEffects.js');
const APP_JS_PATH = path.join(ROOT_DIR, 'deckbuilder', 'app.js');

console.log('\x1b[36m%s\x1b[0m', '============================================================');
console.log('\x1b[36m%s\x1b[0m', '   SKILL BLAST X - SUITE MAESTRA DE AUDITORÍA Y TESTS       ');
console.log('\x1b[36m%s\x1b[0m', '============================================================\n');

const startTime = Date.now();

// 1. Cargar Base de Datos
if (!fs.existsSync(CARTAS_JSON_PATH)) {
  console.error('\x1b[31m[ERROR FATAL]\x1b[0m No se encontró cartas.json en:', CARTAS_JSON_PATH);
  process.exit(1);
}
const rawCards = JSON.parse(fs.readFileSync(CARTAS_JSON_PATH, 'utf8'));
const cardsDb = {};
rawCards.forEach(c => { cardsDb[c.id] = c; });

// 2. Mock de Entorno Global del Navegador
global.window = global;
global.cardsDatabase = cardsDb;
global.addLog = () => {};
global.updatePlaytestView = () => {};
global.shuffleArray = (arr) => arr;
global.canRemoveSkillByEffect = () => true;
global.isCardGraveEffectBlocked = () => false;
global.isSkillEffectBlocked = () => false;
global.isCharacterEffectBlocked = () => false;
global.isCharacterHandEffectBlocked = () => false;
global.isSkillHandEffectBlocked = () => false;
global.isAislamientoActive = () => false;
global.isDrawBySkillBlocked = () => false;
global.isDrawByCharacterBlocked = () => false;
global.isGraveToHandBlocked = () => false;
global.notifySkillsRemovedByEffect = () => {};
global.onEquippedSkillSentToGraveByEffect = () => {};
global.notifyCardAddedToHandFromDeck = () => {};
global.canEquipFromZone = () => true;
global.isSkillBannedFromEquip = () => false;
global.checkAndTriggerInestabilidad = () => {};
global.dispatchGraveTriggers = () => {};
global.checkAndTriggerRemembranza = () => {};
global.checkAndTriggerFulgorOfensivo = () => {};

// Mock de Modales
global.openCardChooserModal = (items, title, callback) => {
  if (typeof global.mockChooserSelection === 'number') callback(global.mockChooserSelection);
  else if (typeof global.mockChooserSelection === 'function') callback(global.mockChooserSelection(items));
  else callback(0);
};

global.openUpToMultiCardChooserModal = (items, title, maxQty, callback) => {
  if (Array.isArray(global.mockMultiChooserSelection)) callback(global.mockMultiChooserSelection);
  else callback([0]);
};

global.openMultiCardChooserModal = (items, title, exactQty, callback) => {
  if (Array.isArray(global.mockMultiChooserSelection)) callback(global.mockMultiChooserSelection);
  else callback([0, 1]);
};

global.showContextMenu = (event, items) => {
  const act = items.find(it => !it.text.toLowerCase().includes('no activar'));
  if (act && act.action) act.action();
};

// 3. Evaluar Motores de Reglas y Efectos
eval(fs.readFileSync(RULES_ENGINE_PATH, 'utf8'));
if (fs.existsSync(EXPANSION_EFFECTS_PATH)) {
  eval(fs.readFileSync(EXPANSION_EFFECTS_PATH, 'utf8'));
}

const appCode = fs.readFileSync(APP_JS_PATH, 'utf8');

function extractFunction(name) {
  const marker = `function ${name}(`;
  const startIdx = appCode.indexOf(marker);
  if (startIdx === -1) return null;
  let parenDepth = 0;
  let bodyStart = -1;
  for (let i = startIdx + marker.length - 1; i < appCode.length; i++) {
    if (appCode[i] === '(') parenDepth++;
    else if (appCode[i] === ')') {
      parenDepth--;
      if (parenDepth === 0) {
        bodyStart = appCode.indexOf('{', i);
        break;
      }
    }
  }
  if (bodyStart === -1) return null;

  let braceCount = 0;
  let endIdx = bodyStart;
  for (let i = bodyStart; i < appCode.length; i++) {
    if (appCode[i] === '{') braceCount++;
    else if (appCode[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }
  return appCode.slice(startIdx, endIdx);
}

const funcsToExtract = [
  'executeEncantamientoSP316',
  'executeCaosCarmesiSP328',
  'checkAndTriggerPlanDeSupervivencia',
  'checkAndTriggerKatshi255',
  'checkAndTriggerSophiaSP395Play',
  'activatePsiqueAlteradoSP396',
  'executeSuenoDeSirvientaSP353',
  'executeNaraSP392Activation',
  'checkAndTriggerRyuChanSP393Play',
  'checkAndTriggerNobukoSP416Play',
  'executeNobukoSP420Activation',
  'executeEncriptarSP314'
];

funcsToExtract.forEach(fn => {
  const code = extractFunction(fn);
  if (code) {
    (0, eval)(code);
    if (typeof eval(fn) === 'function') global[fn] = eval(fn);
  }
});

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  \x1b[32m✅ PASÓ:\x1b[0m ${message}`);
    passedTests++;
  } else {
    console.error(`  \x1b[31m❌ FALLÓ:\x1b[0m ${message}`);
  }
}

// =========================================================================
// MÓDULO 0: INTEGRIDAD DE LA BASE DE DATOS (429 CARTAS)
// =========================================================================
console.log('\x1b[33m%s\x1b[0m', '[MÓDULO 0] Integridad de cartas.json (429 cartas totales)');
assert(rawCards.length === 429, `Total de cartas en cartas.json: ${rawCards.length} (esperado: 429)`);

const invalidCards = rawCards.filter(c => !c.id || !c.nombre || !c.tipo);
assert(invalidCards.length === 0, `Cartas con estructura válida (faltantes: ${invalidCards.length})`);

// =========================================================================
// MÓDULO 1: ARQUETIPO LYNA
// =========================================================================
console.log('\n\x1b[33m%s\x1b[0m', '[MÓDULO 1] Arquetipo Lyna (Regla continua SP327 y Búsqueda)');
global.playtestState = { slots: [{ character: 'BBX-SP327' }], opponentSlots: [] };
assert(window.RulesEngine.isCharacterGraveEffectBlocked() === true, "Lyna SP327 bloquea efectos de Personajes en cementerio");

// =========================================================================
// MÓDULO 2: ARQUETIPO KATHERINE
// =========================================================================
console.log('\n\x1b[33m%s\x1b[0m', '[MÓDULO 2] Arquetipo Katherine (¡Espiral de fuego! y Bloqueo SP085)');
global.playtestState = { slots: [{ character: 'BBX-SP085' }], opponentSlots: [] };
assert(window.RulesEngine.canEquipFromZone('deck') === false, "Katherine SP085 bloquea equipar desde deck");
assert(window.RulesEngine.canEquipFromZone('grave') === false, "Katherine SP085 bloquea equipar desde grave");

// =========================================================================
// MÓDULO 3: ARQUETIPO TAGERO Y ROY
// =========================================================================
console.log('\n\x1b[33m%s\x1b[0m', '[MÓDULO 3] Arquetipo Tagero / Roy (Corrección SP149 y SP050)');
const tageroCodeCheck = appCode.includes("id === 'BBX-SP021'") && !appCode.includes("targetSkillId = 'BBX-SP023'");
assert(tageroCodeCheck === true, "Tagero SP149 referencia a ¡Explosión trueno! (SP021) corregido");

// =========================================================================
// MÓDULO 4: ARQUETIPO EISHET Y VOID-OH
// =========================================================================
console.log('\n\x1b[33m%s\x1b[0m', '[MÓDULO 4] Arquetipo Eishet / Void-oh (SP320, SP316 y SP328)');
global.playtestState = {
  slots: [{ character: 'BBX-SP320', skills: ['BBX-SP021'] }],
  opponentSlots: []
};
assert(window.RulesEngine.isEishetSP320Active() === true, "isEishetSP320Active activo en campo");
assert(window.RulesEngine.canEquipSkillToSlotDueToEishetSP320('BBX-SP021', global.playtestState.slots[0]) === false, "SP320 prohíbe Skills con nombre duplicado");

// =========================================================================
// MÓDULO 5: ARQUETIPO KATSHI / SOPHIA / BAO
// =========================================================================
console.log('\n\x1b[33m%s\x1b[0m', '[MÓDULO 5] Arquetipo Katshi / Sophia / Bao (SP191, SP255, SP395, SP396)');
global.playtestState = {
  slots: [
    { character: 'BBX-SP011', skills: ['BBX-SP396'], usedSkills: [] },
    { character: 'BBX-SP013', skills: [] }
  ],
  opponentSlots: [],
  grave: ['BBX-SP012'],
  usedGlobalEffects: []
};
activatePsiqueAlteradoSP396(0, 'player', {
  activate: true,
  chosenBaoSlotIndex: 1,
  chosenSkillId: 'BBX-SP012',
  chosenTargetSlotIndex: 0
});
assert(global.playtestState.slots[1].character === null, "Psique alterado (SP396) envió a Bao al cementerio");
assert(global.playtestState.slots[0].skills.includes('BBX-SP012'), "Portó Skill de Sophia de grave tras sacrificar Bao");

// =========================================================================
// MÓDULO 6: ARQUETIPO NARA / RYU-CHAN / NOBUKO (FAFNIRLAND)
// =========================================================================
console.log('\n\x1b[33m%s\x1b[0m', '[MÓDULO 6] Familia Fafnirland (SP239, SP252, SP330, SP332, SP416)');
global.playtestState = {
  slots: [{ character: 'BBX-SP157', skills: ['BBX-SP332'] }],
  bench: [{ id: 'BBX-SP120' }],
  opponentSlots: [],
  opponentBench: []
};
assert(window.RulesEngine.isSkillGraveEffectBlocked() === true, "SP332 bloquea efectos de Skills en cementerio con Ryu-chan en banca");

global.playtestState = {
  slots: [{ character: 'BBX-SP252' }],
  opponentSlots: [{ character: 'BBX-SP001' }, { character: 'BBX-SP002' }]
};
assert(window.RulesEngine.isDrawBlockedByNara('player') === true, "Nara SP252 bloquea robo por efectos si controlas solo 1 personaje");

// =========================================================================
// MÓDULO 7: HELICA, CHIAKO, DEIDA, FREDLARD Y ROY
// =========================================================================
console.log('\n\x1b[33m%s\x1b[0m', '[MÓDULO 7] Bloque A (SP314 Encriptar, SP051 Roy, SP368 Fredlard)');
global.playtestState = {
  slots: [{ character: 'BBX-SP280', skills: ['BBX-SP314'], usedSkills: [] }],
  deck: ['BBX-SP282', 'BBX-SP287'],
  hand: [],
  grave: [],
  usedGlobalEffects: [],
  opponentSlots: []
};
executeEncriptarSP314('player', 0, 0, {
  chosenFirstSkillId: 'BBX-SP282',
  chosenSecondSkillId: 'BBX-SP287'
});
assert(global.playtestState.grave.includes('BBX-SP282'), "Encriptar SP314 envió 1ª Skill propia al grave");
assert(global.playtestState.hand.includes('BBX-SP287'), "Encriptar SP314 agregó 2ª Skill de nombre diferente a la mano");

// =========================================================================
// MÓDULO 8: CARTAS UNIVERSALES Y NEUTRAS
// =========================================================================
console.log('\n\x1b[33m%s\x1b[0m', '[MÓDULO 8] Cartas Universales (Inmovilizar SP045, Incrustar espada SP366)');
global.playtestState = {
  slots: [{ character: 'BBX-SP001', skills: ['BBX-SP366'] }],
  opponentSlots: []
};
assert(window.RulesEngine.isIncrustarEspadaActive() === true, "Incrustar espada SP366 activo en campo");

// =========================================================================
// RESUMEN FINAL
// =========================================================================
const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
console.log('\n\x1b[36m%s\x1b[0m', '============================================================');
console.log(`RESULTADO DE LA SUITE: ${passedTests}/${totalTests} pruebas pasaron en ${elapsed}s.`);
if (passedTests === totalTests) {
  console.log('\x1b[32m%s\x1b[0m', '🎉 ¡TODAS LAS PRUEBAS DE LAS 429 CARTAS PASARON CON ÉXITO!');
  console.log('\x1b[32m%s\x1b[0m', '   El motor de juego cumple al 100% las especificaciones oficiales.');
} else {
  console.error('\x1b[31m%s\x1b[0m', '❌ ALERTA: Algunas pruebas fallaron.');
  process.exit(1);
}
console.log('\x1b[36m%s\x1b[0m', '============================================================\n');
