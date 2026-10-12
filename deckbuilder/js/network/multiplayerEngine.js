/**
 * Skill Blast X - Multiplayer Engine (P2P WebRTC / PeerJS)
 * Permite partidas 1v1 online directas entre jugadores mediante salas privadas.
 * 100% Gratuito, sin servidores centralizados de pago ni latencia innecesaria.
 */

const MultiplayerEngine = (() => {
  let peer = null;
  let conn = null;
  let roomCode = null;
  let isHost = false;
  let localDeck = null;
  let opponentDeck = null;
  let isConnected = false;

  // Generador de código de sala limpio y legible (ej: SBX-7K9A)
  function generateRoomCode() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SBX-${code}`;
  }

  // Obtener mazo seleccionado actualmente para multijugador
  async function getSelectedMultiplayerDeck() {
    const select = document.getElementById('mp-player-deck-select');
    const val = select ? select.value : '__current__';

    if (val === '__current__') {
      if (typeof currentDeck !== 'undefined' && currentDeck && currentDeck.main) {
        return JSON.parse(JSON.stringify(currentDeck));
      }
      return null;
    }

    // Cargar mazo desde archivo
    try {
      const resp = await fetch(`/api/mazos/${encodeURIComponent(val)}`);
      if (resp.ok) {
        const data = await resp.json();
        return data;
      }
    } catch (err) {
      console.error("Error al cargar mazo para multijugador:", err);
    }
    return null;
  }

  // 1. CREAR SALA (HOST)
  async function createRoom() {
    localDeck = await getSelectedMultiplayerDeck();
    if (!localDeck || !localDeck.main || localDeck.main.length !== 35) {
      alert("⚠️ Tu mazo debe tener exactamente 35 cartas para jugar un duelo oficial.");
      return;
    }

    if (typeof Peer === 'undefined') {
      alert("⚠️ El módulo de red PeerJS no está cargado. Revisa tu conexión a internet.");
      return;
    }

    // Destruir peer previo si existía
    if (peer) {
      try { peer.destroy(); } catch (e) {}
    }

    roomCode = generateRoomCode();
    isHost = true;
    isConnected = false;

    // Normalizar ID para el servidor público de PeerJS (sin guiones raros)
    const peerId = `sbx_${roomCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    // Actualizar UI a modo espera
    const initialView = document.getElementById('mp-create-initial');
    const waitingView = document.getElementById('mp-create-waiting');
    const codeDisplay = document.getElementById('mp-room-code-display');
    const statusText = document.getElementById('mp-waiting-status-text');

    if (initialView) initialView.classList.add('hidden');
    if (waitingView) waitingView.classList.remove('hidden');
    if (codeDisplay) codeDisplay.textContent = roomCode;
    if (statusText) statusText.textContent = "Conectando al servidor de salas...";

    try {
      peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      peer.on('open', (id) => {
        console.log(`[Multiplayer] Sala creada exitosamente con ID: ${id} (${roomCode})`);
        if (statusText) statusText.textContent = "Esperando que tu rival ingrese el código...";
      });

      peer.on('connection', (incomingConn) => {
        console.log("[Multiplayer] ¡Rival conectándose!");
        if (statusText) statusText.textContent = "¡Rival detectado! Sincronizando...";
        conn = incomingConn;
        setupConnectionEvents(conn);
      });

      peer.on('error', (err) => {
        console.warn("[Multiplayer] Error en Peer:", err);
        if (err.type === 'unavailable-id') {
          // Si el ID ya existía, reintentar con otro código
          createRoom();
        } else {
          if (statusText) statusText.textContent = `Aviso de red: ${err.type || 'Error de conexión'}. Reintentando...`;
        }
      });

    } catch (err) {
      console.error("[Multiplayer] Error al instanciar Peer:", err);
      alert("Error iniciando la sala multijugador.");
      cancelRoom();
    }
  }

  // 2. UNIRSE A SALA (GUEST)
  async function joinRoom() {
    const input = document.getElementById('mp-join-code-input');
    const statusArea = document.getElementById('mp-join-status-area');
    const rawCode = input ? input.value.trim().toUpperCase() : '';

    if (!rawCode) {
      alert("Por favor ingresa el código de sala que te compartió tu amigo.");
      return;
    }

    localDeck = await getSelectedMultiplayerDeck();
    if (!localDeck || !localDeck.main || localDeck.main.length !== 35) {
      alert("⚠️ Tu mazo debe tener exactamente 35 cartas para jugar un duelo oficial.");
      return;
    }

    if (typeof Peer === 'undefined') {
      alert("⚠️ El módulo de red PeerJS no está disponible.");
      return;
    }

    // Destruir peer previo
    if (peer) {
      try { peer.destroy(); } catch (e) {}
    }

    roomCode = rawCode;
    isHost = false;
    isConnected = false;

    const hostPeerId = `sbx_${rawCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    if (statusArea) {
      statusArea.innerHTML = `<span style="color: var(--accent-cyan);">📡 Buscando la sala ${rawCode}...</span>`;
    }

    try {
      peer = new Peer({
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      peer.on('open', (id) => {
        console.log(`[Multiplayer] Conectando a sala del anfitrión: ${hostPeerId}`);
        conn = peer.connect(hostPeerId, { reliable: true });
        setupConnectionEvents(conn);
      });

      peer.on('error', (err) => {
        console.warn("[Multiplayer] Error al unirse:", err);
        if (statusArea) {
          statusArea.innerHTML = `<span style="color: var(--accent-danger);">❌ No se encontró la sala o el código es incorrecto.</span>`;
        }
      });

    } catch (err) {
      console.error("[Multiplayer] Error al conectar:", err);
      if (statusArea) {
        statusArea.innerHTML = `<span style="color: var(--accent-danger);">Error de conexión: ${err.message}</span>`;
      }
    }
  }

  // 3. EVENTOS DE LA CONEXIÓN P2P
  function setupConnectionEvents(connection) {
    connection.on('open', () => {
      console.log("[Multiplayer] ¡Canal de datos abierto con el rival!");
      isConnected = true;

      // Enviar saludo inicial e información del mazo propio
      connection.send({
        type: 'HANDSHAKE',
        version: '1.0',
        name: isHost ? 'Jugador Anfitrión' : 'Jugador Rival',
        deck: localDeck
      });
    });

    connection.on('data', (data) => {
      handleIncomingPacket(data);
    });

    connection.on('close', () => {
      console.log("[Multiplayer] Conexión cerrada.");
      isConnected = false;
      alert("El rival se ha desconectado de la partida.");
      if (typeof showScreen === 'function') {
        showScreen('main-menu');
      }
    });

    connection.on('error', (err) => {
      console.error("[Multiplayer] Error en conexión de datos:", err);
    });
  }

  // 4. PROCESAMIENTO DE MENSAJES RECIBIDOS
  function handleIncomingPacket(packet) {
    if (!packet || !packet.type) return;
    console.log(`[Multiplayer Packet IN]`, packet);

    switch (packet.type) {
      case 'HANDSHAKE':
        // Recibido el mazo del rival
        opponentDeck = packet.deck;
        if (!opponentDeck || !opponentDeck.main || opponentDeck.main.length !== 35) {
          alert("El mazo del rival no cumple con las 35 cartas reglamentarias.");
          cancelRoom();
          return;
        }

        if (isHost) {
          // El Host decide quién comienza el duelo (Tirada de moneda)
          const coinFlip = Math.random() < 0.5;
          const hostStarts = coinFlip;

          // Notificar al rival del inicio y quién arranca
          sendPacket({
            type: 'START_MATCH',
            hostStarts: hostStarts
          });

          launchOnlineDuel(hostStarts);
        }
        break;

      case 'START_MATCH':
        // El cliente invitado recibe la orden de inicio
        launchOnlineDuel(!packet.hostStarts);
        break;

      case 'ACTION_PLAY_CHARACTER':
        // El rival jugó un personaje a su campo
        if (typeof executeRemotePlayCharacter === 'function') {
          executeRemotePlayCharacter(packet.slot, packet.cardId);
        }
        break;

      case 'ACTION_PLAY_SKILL':
        // El rival equipó una skill a su personaje
        if (typeof executeRemotePlaySkill === 'function') {
          executeRemotePlaySkill(packet.slot, packet.cardId);
        }
        break;

      case 'ACTION_ACTIVATE_BENCH':
        // El rival activó un efecto de banca
        if (typeof executeRemoteBenchActivation === 'function') {
          executeRemoteBenchActivation(packet.slot, packet.cardId);
        }
        break;

      case 'ACTION_ATTACK':
        // El rival declaró un ataque
        if (typeof executeRemoteAttack === 'function') {
          executeRemoteAttack(packet.attackerSlot, packet.targetSlot);
        }
        break;

      case 'ACTION_END_TURN':
        // El rival terminó su turno
        if (typeof executeRemotePassTurn === 'function') {
          executeRemotePassTurn();
        }
        break;

      case 'ACTION_SURRENDER':
        alert("¡Tu rival se ha rendido! Has ganado el duelo.");
        if (typeof showScreen === 'function') {
          showScreen('main-menu');
        }
        break;

      default:
        console.log("[Multiplayer] Mensaje no reconocido:", packet.type);
    }
  }

  // 5. ENVIAR MENSAJE AL RIVAL
  function sendPacket(packet) {
    if (conn && conn.open) {
      conn.send(packet);
      console.log(`[Multiplayer Packet OUT]`, packet);
    } else {
      console.warn("[Multiplayer] No se pudo enviar el paquete, canal cerrado:", packet);
    }
  }

  // 6. LANZAR DUELO EN EL TAPETE
  function launchOnlineDuel(weStartFirst) {
    // Cerrar modal de multijugador
    const modal = document.getElementById('multiplayer-modal');
    if (modal) modal.classList.add('hidden');

    // Inicializar el duelo con los mazos sincronizados
    if (typeof startOnlineMatch === 'function') {
      startOnlineMatch(localDeck, opponentDeck, weStartFirst);
    } else {
      // Si la función unificada aún no existe, iniciar playtest estándar
      if (typeof startDuelWithDecks === 'function') {
        startDuelWithDecks(localDeck, opponentDeck, weStartFirst ? 'player' : 'opponent');
      }
    }
  }

  // 7. COPIAR CÓDIGO
  function copyRoomCode() {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode).then(() => {
      const btn = document.querySelector('#mp-create-waiting button');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = "✅ ¡Copiado!";
        setTimeout(() => { btn.textContent = orig; }, 2000);
      }
    }).catch(err => {
      console.warn("No se pudo copiar automáticamente:", err);
    });
  }

  // 8. CANCELAR SALA
  function cancelRoom() {
    if (conn) {
      try { conn.close(); } catch (e) {}
      conn = null;
    }
    if (peer) {
      try { peer.destroy(); } catch (e) {}
      peer = null;
    }
    roomCode = null;
    isConnected = false;
    isHost = false;

    const initialView = document.getElementById('mp-create-initial');
    const waitingView = document.getElementById('mp-create-waiting');
    if (initialView) initialView.classList.remove('hidden');
    if (waitingView) waitingView.classList.add('hidden');

    const statusArea = document.getElementById('mp-join-status-area');
    if (statusArea) statusArea.innerHTML = '';
  }

  return {
    createRoom,
    joinRoom,
    sendPacket,
    copyRoomCode,
    cancelRoom,
    isConnected: () => isConnected,
    isHost: () => isHost,
    getRoomCode: () => roomCode
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MultiplayerEngine;
}
