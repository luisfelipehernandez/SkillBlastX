/**
 * Suite de Pruebas: Motor Multijugador P2P Online (MultiplayerEngine)
 * Skill Blast X - Validación de Integridad de Red y Protocolo P2P
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('======================================================');
console.log('    SUITE DE PRUEBAS - MOTOR MULTIJUGADOR P2P 1V1     ');
console.log('======================================================\n');

// 1. Verificación de archivo PeerJS local independiente
const peerjsPath = path.join(__dirname, 'js', 'peerjs.min.js');
assert(fs.existsSync(peerjsPath), '1.1 El archivo peerjs.min.js debe existir localmente');
const peerjsStats = fs.statSync(peerjsPath);
assert(peerjsStats.size > 50000, '1.2 El archivo peerjs.min.js debe contener la biblioteca completa');
console.log(`  ✔ PASS: 1.1 y 1.2 Biblioteca PeerJS local validada (${peerjsStats.size} bytes)`);

// 2. Mock de entorno de navegador mínimo para Node.js
global.window = global;
global.document = {
  getElementById: (id) => ({
    value: id === 'mp-join-code-input' ? 'SBX-TEST' : '',
    textContent: '',
    innerHTML: '',
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false
    }
  }),
  querySelector: () => ({
    textContent: '',
    style: {}
  })
};
global.navigator = {
  clipboard: {
    writeText: async () => Promise.resolve()
  }
};
global.cardsDatabase = {};
global.playtestState = {
  slots: [{}, {}, {}],
  opponentSlots: [{}, {}, {}],
  bench: [],
  opponentBench: [],
  deck: [],
  opponentDeck: [],
  hand: [],
  opponentHand: [],
  turnOwner: 'player'
};

// 3. Cargar MultiplayerEngine
const MultiplayerEngine = require('./js/network/multiplayerEngine.js');

// 4. Verificación de APIs públicas
assert(typeof MultiplayerEngine !== 'undefined', '2.1 MultiplayerEngine debe existir');
assert(typeof MultiplayerEngine.createRoom === 'function', '2.2 createRoom debe ser una función');
assert(typeof MultiplayerEngine.joinRoom === 'function', '2.3 joinRoom debe ser una función');
assert(typeof MultiplayerEngine.sendPacket === 'function', '2.4 sendPacket debe ser una función');
assert(typeof MultiplayerEngine.copyRoomCode === 'function', '2.5 copyRoomCode debe ser una función');
assert(typeof MultiplayerEngine.cancelRoom === 'function', '2.6 cancelRoom debe ser una función');
assert(typeof MultiplayerEngine.isConnected === 'function', '2.7 isConnected debe ser una función');
assert(typeof MultiplayerEngine.isHost === 'function', '2.8 isHost debe ser una función');
assert(typeof MultiplayerEngine.getRoomCode === 'function', '2.9 getRoomCode debe ser una función');
console.log('  ✔ PASS: 2.1 a 2.9 Todas las funciones de la API pública están definidas y expuestas');

// 5. Estado Inicial
assert(MultiplayerEngine.isConnected() === false, '3.1 Estado inicial debe ser desconectado');
assert(MultiplayerEngine.isHost() === false, '3.2 Estado inicial no debe ser host');
assert(MultiplayerEngine.getRoomCode() === null, '3.3 Room code inicial debe ser null');
console.log('  ✔ PASS: 3.1 a 3.3 Estados iniciales verificados correctamente');

// 6. Ciclo de Vida: Cancelar Sala
MultiplayerEngine.cancelRoom();
assert(MultiplayerEngine.isConnected() === false, '4.1 Cancelar sala mantiene estado desconectado');
assert(MultiplayerEngine.isHost() === false, '4.2 Cancelar sala limpia rol de host');
assert(MultiplayerEngine.getRoomCode() === null, '4.3 Cancelar sala limpia el room code');
console.log('  ✔ PASS: 4.1 a 4.3 Limpieza y cancelación de sala seguras');

// 7. Envío Seguro sin Conexión (Safe Degradation)
assert.doesNotThrow(() => {
  MultiplayerEngine.sendPacket({ type: 'PING' });
}, '5.1 sendPacket sin conexión activa no debe lanzar excepciones');
console.log('  ✔ PASS: 5.1 Envío seguro tolerante ante caídas o desconexiones');

// 8. Validación de Guardias de Seguridad en app.js para Duelos Online
console.log('\n--- SECCIÓN 6: Guardias de Seguridad y Niebla de Guerra (app.js) ---');
global.alert = (msg) => {}; // Mock alert

// Simular estado de duelo online
global.playtestState = {
  isOnlineMatch: true,
  turnOwner: 'opponent',
  slots: [
    { character: null, skills: [], isFaceDown: false },
    { character: 'BBX-SP001', skills: [], isFaceDown: true },
    { character: null, skills: [], isFaceDown: false }
  ],
  opponentSlots: [
    { character: null, skills: [], isFaceDown: false },
    { character: 'BBX-SP001', skills: [], isFaceDown: true },
    { character: null, skills: [], isFaceDown: false }
  ],
  hand: ['BBX-SP001', 'BBX-SP008'],
  opponentHand: ['BBX-SP001', 'BBX-SP008'],
  deck: ['BBX-SP001', 'BBX-SP002', 'BBX-SP003'],
  opponentDeck: ['BBX-SP004', 'BBX-SP005', 'BBX-SP006']
};
global.cardsDatabase = {
  'BBX-SP001': { id: 'BBX-SP001', nombre: 'Haruka', tipo: 'Personaje', clase: 'Básica' },
  'BBX-SP002': { id: 'BBX-SP002', nombre: 'Muro', tipo: 'Skill' },
  'BBX-SP003': { id: 'BBX-SP003', nombre: 'Espada', tipo: 'Skill' },
  'BBX-SP004': { id: 'BBX-SP004', nombre: 'Lyna', tipo: 'Personaje', clase: 'Básica' },
  'BBX-SP005': { id: 'BBX-SP005', nombre: 'Escudo', tipo: 'Skill' },
  'BBX-SP006': { id: 'BBX-SP006', nombre: 'Fuego', tipo: 'Skill' },
  'BBX-SP008': { id: 'BBX-SP008', nombre: 'Voluntad', tipo: 'Skill' }
};

// Cargar funciones de app.js requeridas
const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// Extraer playerDeckClick
assert(appCode.includes('function playerDeckClick()'), '6.1 playerDeckClick debe existir');
const initialDeckCount = global.playtestState.deck.length;
// Ejecutar función de guardia de clic en mazo propio
eval(appCode.match(/function playerDeckClick\(\)[\s\S]*?\n\}/)[0]);
playerDeckClick();
assert(global.playtestState.deck.length === initialDeckCount, '6.1 playerDeckClick no debe robar cartas en duelo online');
console.log('  ✔ PASS: 6.1 playerDeckClick bloquea el robo manual durante partidas online');

// Extraer opponentDrawCard
const initialOppDeckCount = global.playtestState.opponentDeck.length;
eval(appCode.match(/function opponentDrawCard\([\s\S]*?\n\}/)[0]);
opponentDrawCard();
assert(global.playtestState.opponentDeck.length === initialOppDeckCount, '6.2 opponentDrawCard no debe alterar mazo rival');
console.log('  ✔ PASS: 6.2 opponentDrawCard bloquea interacción con el mazo del oponente');

// Extraer invokeCharacter y validar bloqueo fuera de turno
const initialSlot0 = global.playtestState.slots[0].character;
eval(appCode.match(/function invokeCharacter\(cardId, handIndex, slotIndex\)[\s\S]*?\n\}/)[0]);
const invokeRes = invokeCharacter('BBX-SP001', 0, 0);
assert(invokeRes === false && global.playtestState.slots[0].character === initialSlot0, '6.3 invokeCharacter debe bloquearse fuera de turno');
console.log('  ✔ PASS: 6.3 invokeCharacter bloquea invocaciones en el turno del rival');

// Extraer equipSkill y validar bloqueo fuera de turno
const initialSkills = [...global.playtestState.slots[1].skills];
eval(appCode.match(/function equipSkill\(cardId, handIndex, slotIndex\)[\s\S]*?\n\}/)[0]);
equipSkill('BBX-SP008', 1, 1);
assert(global.playtestState.slots[1].skills.length === initialSkills.length, '6.4 equipSkill debe bloquearse fuera de turno');
console.log('  ✔ PASS: 6.4 equipSkill bloquea equipar habilidades en el turno del rival');

// Extraer toggleTurnOwner y validar bloqueo manual
eval(appCode.match(/function toggleTurnOwner\(\)[\s\S]*?\n\}/)[0]);
toggleTurnOwner();
assert(global.playtestState.turnOwner === 'opponent', '6.5 toggleTurnOwner no debe cambiar de turno manualmente en online');
console.log('  ✔ PASS: 6.5 toggleTurnOwner bloquea alternar turnos manualmente en online');

// 9. Validación del tiempo de consulta de Lyna (BBX-SP403)
const mpEngineCode = fs.readFileSync(path.join(__dirname, 'js', 'network', 'multiplayerEngine.js'), 'utf8');
const starterFn = mpEngineCode.match(/function handleLocalStarterSelected\([\s\S]*?\n  \}/)[0];
assert(!starterFn.includes('openLynaStarterChoiceModal'), '6.6 handleLocalStarterSelected NO debe consultar por Lyna al colocarla boca abajo');
const finalizeFn = mpEngineCode.match(/function finalizeMatchStart\([\s\S]*?\n  \}/)[0];
assert(finalizeFn.includes('openLynaStarterChoiceModal'), '6.6 finalizeMatchStart SÍ debe consultar por Lyna al momento de voltear los personajes');
console.log('  ✔ PASS: 6.6 Lyna (BBX-SP403) se consulta estrictamente al momento de voltear los personajes boca arriba');

console.log('\n======================================================');
console.log('🎉 TODAS LAS PRUEBAS DE MULTIPLAYER ENGINE PASARON (100%)');
console.log('======================================================\n');

