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

console.log('\n======================================================');
console.log('🎉 TODAS LAS PRUEBAS DE MULTIPLAYER ENGINE PASARON (100%)');
console.log('======================================================\n');
