/**
 * Test unit: Verificación de la restricción de Personajes Avanzados
 * en la regla obligatoria de fin de turno sin personajes.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const cards = JSON.parse(fs.readFileSync(path.join(__dirname, '../cartas.json'), 'utf8'));
const cardsDatabase = {};
cards.forEach(c => { cardsDatabase[c.id] = c; });

const isEligibleBenchChar = (id) => {
  const c = cardsDatabase[id];
  return c && c.tipo === 'Personaje' && c.clase !== 'Avanzada' && c.clase !== 'Avanzado' && !(c.clase && c.clase.toLowerCase().includes('avanzad'));
};

console.log("=== TEST RESTRICCIÓN DE PERSONAJES AVANZADOS EN BANCA POR FIN DE TURNO ===");

// 1. Verificar que los personajes avanzados no son elegibles
const advancedIds = ['BBX-SP100', 'BBX-SP107', 'BBX-SP199', 'BBX-SP244'];
advancedIds.forEach(id => {
  assert.strictEqual(isEligibleBenchChar(id), false, `El personaje avanzado ${id} (${cardsDatabase[id].nombre}) NO debe ser elegible`);
});
console.log("✔ PASS: Los 4 personajes avanzados son rechazados correctamente por el filtro.");

// 2. Verificar que los personajes básicos sí son elegibles
const basicIds = ['BBX-SP093', 'BBX-SP331', 'BBX-SP361', 'BBX-SP180', 'BBX-SP001'];
basicIds.forEach(id => {
  assert.strictEqual(isEligibleBenchChar(id), true, `El personaje básico ${id} (${cardsDatabase[id].nombre}) debe ser elegible`);
});
console.log("✔ PASS: Los personajes básicos son aceptados correctamente por el filtro.");

// 3. Simulación de deck con solo cartas de Skill y Personajes Avanzados
const deckWithOnlyAdvanced = ['BBX-SP244', 'BBX-SP100', 'BBX-SP008', 'BBX-SP060'];
const eligibleChars = deckWithOnlyAdvanced.filter(isEligibleBenchChar);
assert.strictEqual(eligibleChars.length, 0, "No debe haber ningún personaje elegible si solo hay avanzados y skills");
console.log("✔ PASS: Deck con solo personajes avanzados resulta en 0 elegibles (conduce a derrota reglamentaria).");

// 4. Simulación de deck mixto (avanzados + básicos)
const mixedDeck = ['BBX-SP244', 'BBX-SP093', 'BBX-SP100', 'BBX-SP180'];
const eligibleMixed = mixedDeck.filter(isEligibleBenchChar);
assert.deepStrictEqual(eligibleMixed, ['BBX-SP093', 'BBX-SP180'], "Solo deben seleccionarse los básicos");
console.log("✔ PASS: Deck mixto filtra y permite elegir exclusivamente personajes básicos ('BBX-SP093', 'BBX-SP180').");

console.log("==========================================================================");
console.log("🎉 ¡TODAS LAS PRUEBAS DE LA REGLA DE PERSONAJES AVANZADOS PASARON AL 100%!");
console.log("==========================================================================");
