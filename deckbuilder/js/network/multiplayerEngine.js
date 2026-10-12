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
  let setupStarted = false;
  let localStarterChosen = false;
  let localStarterId = null;
  let localShuffledDeck = null;
  let localLynaResolved = false;
  let localLyna5 = false;
  let oppStarterChosen = false;
  let oppStarterId = null;
  let oppShuffledDeck = null;
  let oppLynaResolved = false;
  let oppLyna5 = false;
  let coinFlipStarted = false;
  let handsDealt = false;
  let pendingWeStartFirst = false;

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
    setupStarted = false;
    localStarterChosen = false;
    localStarterId = null;
    localShuffledDeck = null;
    localLynaResolved = false;
    localLyna5 = false;
    oppStarterChosen = false;
    oppStarterId = null;
    oppShuffledDeck = null;
    oppLynaResolved = false;
    oppLyna5 = false;
    coinFlipStarted = false;
    handsDealt = false;
    pendingWeStartFirst = false;

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
    setupStarted = false;
    localStarterChosen = false;
    localStarterId = null;
    localShuffledDeck = null;
    localLynaResolved = false;
    localLyna5 = false;
    oppStarterChosen = false;
    oppStarterId = null;
    oppShuffledDeck = null;
    oppLynaResolved = false;
    oppLyna5 = false;
    coinFlipStarted = false;
    handsDealt = false;
    pendingWeStartFirst = false;

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
    const onOpen = () => {
      console.log("[Multiplayer] ¡Canal de datos abierto con el rival!");
      isConnected = true;

      // Enviar saludo inicial e información del mazo propio
      connection.send({
        type: 'HANDSHAKE',
        version: '1.0',
        name: isHost ? 'Jugador Anfitrión' : 'Jugador Rival',
        deck: localDeck
      });
    };

    if (connection.open) {
      onOpen();
    } else {
      connection.on('open', onOpen);
    }

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

  // 4. PROCESAMIENTO DE MENSAJES RECIBIDOS (DESDE EL RIVAL)
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
        beginOnlineSetup();
        break;

      case 'STARTER_CHOSEN':
        oppStarterChosen = true;
        oppStarterId = packet.starterId;
        oppShuffledDeck = packet.shuffledDeck;

        if (typeof playtestState !== 'undefined') {
          playtestState.opponentSlots[1].character = oppStarterId;
          playtestState.opponentSlots[1].isFaceDown = true;
          playtestState.opponentSlots[1].skills = [];
          playtestState.opponentSlots[1].isRotated = false;
          playtestState.opponentSlots[1].effectUsed = false;
          playtestState.opponentDeck = [...oppShuffledDeck];
        }

        if (typeof addLog === 'function') {
          addLog(`[Rival] Tu rival ha colocado su Personaje Inicial boca abajo en el campo.`, 'var(--accent-purple)');
        }
        if (typeof updatePlaytestView === 'function') updatePlaytestView();

        checkBothStartersPlaced();
        break;

      case 'LYNA_CHOICE':
        oppLynaResolved = true;
        oppLyna5 = !!packet.wants5;
        if (oppLyna5) {
          if (typeof addLog === 'function') addLog(`[Efecto Lyna BBX-SP403 Rival] El rival activó el efecto de Lyna y comenzará con <strong>5 cartas</strong> de mano inicial.`, 'var(--accent-purple)');
        } else {
          if (typeof addLog === 'function') addLog(`[Efecto Lyna BBX-SP403 Rival] El rival decidió comenzar con <strong>3 cartas</strong> de mano inicial.`, 'var(--text-muted)');
        }
        checkReadyToDealHands();
        break;

      case 'START_COIN_FLIP':
        executeCoinFlip(packet.coinResult, packet.winner);
        break;

      case 'TURN_ORDER_DECIDED':
        // El rival ganó el volado y eligió orden: 'first' (él va primero) o 'second' (él va segundo)
        const weGoFirst = (packet.winnerOrder === 'second');
        if (typeof addLog === 'function') {
          addLog(`[Orden de Turno] El rival ha decidido ir <strong>${packet.winnerOrder === 'first' ? 'PRIMERO' : 'SEGUNDO'}</strong>.`, 'var(--accent-purple)');
        }
        finalizeMatchStart(weGoFirst);
        break;

      case 'ACTION_PLAY_CHARACTER':
        // El rival jugó un personaje a su campo
        executeRemotePlayCharacter(packet.slot, packet.cardId, packet.isEvolucion);
        break;

      case 'ACTION_PLAY_SKILL':
        // El rival equipó una skill a su personaje
        executeRemotePlaySkill(packet.slot, packet.cardId);
        break;

      case 'ACTION_ACTIVATE_BENCH':
        // El rival activó un efecto de banca
        executeRemoteBenchActivation(packet.slot, packet.cardId);
        break;

      case 'ACTION_ATTACK':
        // El rival declaró un ataque
        executeRemoteAttack(packet.attackerSlot, packet.targetSlot);
        break;

      case 'ACTION_DRAW_CARD':
        // El rival robó 1 carta
        executeRemoteDrawCard();
        break;

      case 'ACTION_END_TURN':
        // El rival terminó su turno
        executeRemotePassTurn();
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

  // 6. INICIAR PREPARACIÓN EN LÍNEA Y SELECCIÓN DE PERSONAJE INICIAL
  function beginOnlineSetup() {
    if (setupStarted) return;
    setupStarted = true;

    // Cerrar modal de multijugador
    const modal = document.getElementById('multiplayer-modal');
    if (modal) modal.classList.add('hidden');

    if (typeof showScreen === 'function') {
      showScreen('playtest');
    }

    if (typeof playtestState !== 'undefined') {
      playtestState.isOnlineMatch = true;
      playtestState.isDuelVsAI = false;
      playtestState.matchEnded = false;
      playtestState.turnCount = 1;
      playtestState.turnOwner = null;
      playtestState.hand = [];
      playtestState.grave = [];
      playtestState.bench = [];
      playtestState.opponentHand = [];
      playtestState.opponentGrave = [];
      playtestState.opponentBench = [];
      playtestState.deck = [...localDeck.main];
      playtestState.opponentDeck = [...opponentDeck.main];
      playtestState.slots = [
        { character: null, skills: [], usedSkills: [], usedSkillIndexes: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false, muroUsadoEsteTurno: false, isFaceDown: false },
        { character: null, skills: [], usedSkills: [], usedSkillIndexes: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false, muroUsadoEsteTurno: false, isFaceDown: false },
        { character: null, skills: [], usedSkills: [], usedSkillIndexes: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false, muroUsadoEsteTurno: false, isFaceDown: false }
      ];
      playtestState.opponentSlots = [
        { character: null, skills: [], usedSkills: [], usedSkillIndexes: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false, muroUsadoEsteTurno: false, isFaceDown: false },
        { character: null, skills: [], usedSkills: [], usedSkillIndexes: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false, muroUsadoEsteTurno: false, isFaceDown: false },
        { character: null, skills: [], usedSkills: [], usedSkillIndexes: [], maxAttacks: 1, attacksDeclared: 0, isRotated: false, effectUsed: false, muroUsadoEsteTurno: false, isFaceDown: false }
      ];
    }

    if (typeof addLog === 'function') {
      addLog(`🌐 [Multijugador P2P] ¡Conexión establecida con éxito con el rival!`, 'var(--accent-cyan)');
      addLog(`🎴 Por favor elige tu Personaje Inicial de tu mazo...`, 'var(--accent-cyan)');
    }

    if (typeof updatePlaytestView === 'function') updatePlaytestView();

    // Obtener personajes básicos de tu mazo para el selector
    const basicCharacters = localDeck.main.filter(id => {
      const c = (typeof cardsDatabase !== 'undefined') ? cardsDatabase[id] : null;
      return c && c.tipo === 'Personaje' && c.clase !== 'Avanzada';
    });

    const candidates = basicCharacters.length > 0 ? basicCharacters : [localDeck.main[0]];

    if (typeof openStarterSelector === 'function') {
      openStarterSelector(candidates, (selectedId) => {
        handleLocalStarterSelected(selectedId);
      });
    }
  }

  // 7. MANEJO DE SELECCIÓN DE PERSONAJE INICIAL LOCAL
  function handleLocalStarterSelected(selectedId) {
    localStarterChosen = true;
    localStarterId = selectedId;

    // Colocar personaje inicial local BOCA ABAJO en Slot 1 (centro)
    if (typeof playtestState !== 'undefined') {
      playtestState.slots[1].character = selectedId;
      playtestState.slots[1].isFaceDown = true;
      playtestState.slots[1].skills = [];
      playtestState.slots[1].isRotated = false;
      playtestState.slots[1].effectUsed = false;

      // Remover del mazo y barajar el resto
      const remaining = [...localDeck.main];
      const sIdx = remaining.indexOf(selectedId);
      if (sIdx !== -1) remaining.splice(sIdx, 1);
      if (typeof shuffleArray === 'function') shuffleArray(remaining);
      localShuffledDeck = remaining;
      playtestState.deck = [...localShuffledDeck];
    }

    if (typeof updatePlaytestView === 'function') updatePlaytestView();

    sendPacket({
      type: 'STARTER_CHOSEN',
      starterId: localStarterId,
      shuffledDeck: localShuffledDeck
    });

    if (typeof addLog === 'function') {
      addLog(`Has colocado tu Personaje Inicial boca abajo en el campo. Esperando al rival...`, 'var(--accent-cyan)');
    }

    checkBothStartersPlaced();
  }

  // 8. VERIFICAR SI AMBOS PERSONAJES INICIALES ESTÁN COLOCADOS
  function checkBothStartersPlaced() {
    if (!localStarterChosen || !oppStarterChosen) return;

    if (typeof addLog === 'function') {
      addLog(`[Inicio del Duelo] Ambos jugadores han colocado su Personaje Inicial boca abajo en el campo.`, 'var(--accent-cyan)');
    }
    if (typeof updatePlaytestView === 'function') updatePlaytestView();

    if (isHost && !coinFlipStarted) {
      coinFlipStarted = true;
      setTimeout(() => {
        const coinResult = Math.random() < 0.5 ? 'cara' : 'sello';
        // 'cara' => Host gana volado, 'sello' => Guest gana volado
        const winner = (coinResult === 'cara') ? 'host' : 'guest';

        sendPacket({
          type: 'START_COIN_FLIP',
          coinResult: coinResult,
          winner: winner
        });

        executeCoinFlip(coinResult, winner);
      }, 700);
    }
  }

  // 9. LANZAMIENTO DE MONEDA 3D SINCRONIZADO
  function executeCoinFlip(coinResult, winner) {
    if (typeof addLog === 'function') {
      addLog(`[Lanzamiento de Moneda] Lanzando moneda 3D compartida para determinar quién elige el orden de turno...`, 'var(--accent-cyan)');
    }

    const onCoinFinished = (res) => {
      const iWon = (isHost && winner === 'host') || (!isHost && winner === 'guest');

      if (iWon) {
        if (typeof addLog === 'function') {
          addLog(`👑 ¡Has obtenido ${res.toUpperCase()} y ganado el volado! Elige si deseas ir Primero o Segundo.`, 'var(--accent-cyan)');
        }

        if (typeof openTurnOrderChoiceModal === 'function') {
          openTurnOrderChoiceModal((order) => {
            // order es 'first' o 'second'
            sendPacket({
              type: 'TURN_ORDER_DECIDED',
              winnerOrder: order
            });
            if (typeof addLog === 'function') {
              addLog(`[Orden de Turno] Has decidido ir <strong>${order === 'first' ? 'PRIMERO' : 'SEGUNDO'}</strong>.`, 'var(--accent-cyan)');
            }
            finalizeMatchStart(order === 'first');
          });
        } else {
          sendPacket({
            type: 'TURN_ORDER_DECIDED',
            winnerOrder: 'first'
          });
          finalizeMatchStart(true);
        }
      } else {
        if (typeof addLog === 'function') {
          addLog(`👑 Tu rival ha obtenido ${res.toUpperCase()} y ganado el volado. Esperando que elija quién comienza...`, 'var(--accent-purple)');
        }
      }
    };

    if (typeof flipCoin === 'function') {
      flipCoin(onCoinFinished, coinResult);
    } else {
      onCoinFinished(coinResult);
    }
  }

  // 10. FINALIZAR INICIO DE DUELO Y REPARTIR CARTAS
  function finalizeMatchStart(weStartFirst) {
    if (typeof playtestState === 'undefined') return;

    playtestState.turnCount = 1;
    playtestState.turnOwner = weStartFirst ? 'player' : 'opponent';

    const btn = document.getElementById('btn-toggle-turn');
    if (btn) {
      btn.textContent = weStartFirst ? "Turno: Jugador (Tú)" : "Turno: Oponente (Rival)";
      btn.style.borderColor = weStartFirst ? "var(--accent-cyan)" : "var(--accent-purple)";
      btn.style.color = weStartFirst ? "var(--accent-cyan)" : "var(--accent-purple)";
    }
    if (typeof updateTurnBadgeUI === 'function') updateTurnBadgeUI();

    // Voltear personajes iniciales boca arriba
    playtestState.slots[1].isFaceDown = false;
    playtestState.opponentSlots[1].isFaceDown = false;

    const myCard = (typeof cardsDatabase !== 'undefined') ? cardsDatabase[localStarterId] : null;
    const oppCard = (typeof cardsDatabase !== 'undefined') ? cardsDatabase[oppStarterId] : null;
    const myName = myCard ? myCard.nombre : localStarterId;
    const oppName = oppCard ? oppCard.nombre : oppStarterId;

    if (typeof addLog === 'function') {
      addLog(`[Personajes Revelados] ¡Se voltean los Personajes Iniciales! Jugador: <strong>${myName}</strong> | Oponente: <strong>${oppName}</strong>.`, 'var(--accent-cyan)');
    }
    if (typeof updatePlaytestView === 'function') updatePlaytestView();

    // Consulta de Lyna (BBX-SP403) al momento de ser volteada boca arriba
    pendingWeStartFirst = weStartFirst;
    localLynaResolved = (localStarterId !== 'BBX-SP403');
    oppLynaResolved = (oppStarterId !== 'BBX-SP403');

    if (localStarterId === 'BBX-SP403') {
      const applyLynaChoice = (wants5) => {
        localLynaResolved = true;
        localLyna5 = wants5;
        sendPacket({
          type: 'LYNA_CHOICE',
          wants5: wants5
        });
        if (wants5) {
          if (typeof addLog === 'function') addLog(`[Efecto Lyna BBX-SP403] Activaste su efecto de Personaje Inicial y comenzarás con <strong>5 cartas</strong> en tu mano en lugar de 3.`, 'var(--accent-purple)');
        } else {
          if (typeof addLog === 'function') addLog(`[Efecto Lyna BBX-SP403] Decidiste comenzar con <strong>3 cartas</strong> de mano inicial.`, 'var(--text-muted)');
        }
        checkReadyToDealHands();
      };

      if (typeof openLynaStarterChoiceModal === 'function') {
        openLynaStarterChoiceModal((wants5) => applyLynaChoice(wants5));
      } else if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        const wants5 = window.confirm("¿Deseas activar el efecto de Lyna (BBX-SP403) para comenzar la partida con 5 cartas en tu mano en lugar de 3?");
        applyLynaChoice(wants5);
      } else {
        applyLynaChoice(true);
      }
    } else {
      localLyna5 = false;
    }

    if (oppStarterId === 'BBX-SP403') {
      if (typeof addLog === 'function') {
        addLog(`Tu rival ha revelado a Lyna (BBX-SP403) y está decidiendo si activar su efecto inicial...`, 'var(--text-muted)');
      }
    }

    checkReadyToDealHands();
  }

  // 11. REPARTIR MANOS INICIALES Y COMENZAR TURNO 1
  function checkReadyToDealHands() {
    if (!localLynaResolved || !oppLynaResolved || handsDealt) return;
    handsDealt = true;

    // Mano inicial reglamentaria: 3 cartas (o 5 si Lyna activada)
    const myHandCount = (localStarterId === 'BBX-SP403' && localLyna5) ? 5 : 3;
    const oppHandCount = (oppStarterId === 'BBX-SP403' && oppLyna5) ? 5 : 3;

    for (let i = 0; i < myHandCount; i++) {
      if (playtestState.deck.length > 0) {
        playtestState.hand.push(playtestState.deck.shift());
      }
    }
    for (let i = 0; i < oppHandCount; i++) {
      if (playtestState.opponentDeck.length > 0) {
        playtestState.opponentHand.push(playtestState.opponentDeck.shift());
      }
    }

    if (typeof addLog === 'function') {
      addLog(`Robaste <strong>${myHandCount} cartas</strong> de mano inicial.`);
      addLog(`Tu rival robó <strong>${oppHandCount} cartas</strong> de mano inicial.`);
      addLog(`⚔️ ¡Comienza el Duelo Online! ${pendingWeStartFirst ? 'Tú comienzas el Turno 1' : 'Tu rival comienza el Turno 1'}.`, 'var(--accent-cyan)');
    }

    if (typeof window !== 'undefined' && window.AnimationEngine && typeof window.AnimationEngine.showPhaseBanner === 'function') {
      window.AnimationEngine.showPhaseBanner(pendingWeStartFirst ? "TURNO 1: TU TURNO" : "TURNO 1: TURNO RIVAL");
    }

    if (typeof updatePlaytestView === 'function') updatePlaytestView();
  }

  // 8. EJECUCIÓN REMOTA DE JUGADAS (CUANDO EL RIVAL HACE UN MOVIMIENTO)
  function executeRemotePlayCharacter(slotIndex, cardId, isEvolucion) {
    if (typeof playtestState === 'undefined') return;
    const card = (typeof cardsDatabase !== 'undefined') ? cardsDatabase[cardId] : null;
    const slot = playtestState.opponentSlots[slotIndex];
    if (!slot) return;

    const oldChar = slot.character;
    slot.character = cardId;
    slot.effectUsed = false;

    if (isEvolucion) {
      if (oldChar) slot.skills.push(oldChar);
    } else {
      slot.skills = [];
      slot.isRotated = false;
      slot.usedSkills = [];
      slot.usedSkillIndexes = [];
    }

    // Retirar carta de mano rival
    if (playtestState.opponentHand && playtestState.opponentHand.length > 0) {
      const handIdx = playtestState.opponentHand.indexOf(cardId);
      if (handIdx !== -1) {
        playtestState.opponentHand.splice(handIdx, 1);
      } else {
        playtestState.opponentHand.pop();
      }
    }

    const name = card ? card.nombre : cardId;
    if (isEvolucion) {
      if (typeof addLog === 'function') addLog(`🌐 [Rival] ¡Evolución! <strong>${name}</strong> sobre el slot ${slotIndex + 1}.`, 'var(--accent-purple)');
    } else {
      if (typeof addLog === 'function') addLog(`🌐 [Rival] Invocó a <strong>${name}</strong> en el Campo (Slot ${slotIndex + 1}).`, 'var(--accent-purple)');
    }

    if (typeof window !== 'undefined' && window.AnimationEngine && window.AnimationEngine.SoundFX) {
      window.AnimationEngine.SoundFX.playPlace();
    }

    if (typeof updatePlaytestView === 'function') updatePlaytestView();
  }

  function executeRemotePlaySkill(slotIndex, cardId) {
    if (typeof playtestState === 'undefined') return;
    const card = (typeof cardsDatabase !== 'undefined') ? cardsDatabase[cardId] : null;
    const slot = playtestState.opponentSlots[slotIndex];
    if (!slot) return;

    slot.skills.push(cardId);

    // Retirar carta de mano rival
    if (playtestState.opponentHand && playtestState.opponentHand.length > 0) {
      const handIdx = playtestState.opponentHand.indexOf(cardId);
      if (handIdx !== -1) {
        playtestState.opponentHand.splice(handIdx, 1);
      } else {
        playtestState.opponentHand.pop();
      }
    }

    const charName = slot.character && cardsDatabase[slot.character] ? cardsDatabase[slot.character].nombre : 'su Personaje';
    const name = card ? card.nombre : cardId;
    if (typeof addLog === 'function') addLog(`🌐 [Rival] Equipó <strong>${name}</strong> a ${charName}.`, 'var(--accent-purple)');

    if (typeof window !== 'undefined' && window.AnimationEngine && window.AnimationEngine.SoundFX) {
      window.AnimationEngine.SoundFX.playPlace();
    }

    if (typeof updatePlaytestView === 'function') updatePlaytestView();
  }

  function executeRemoteBenchActivation(slotIndex, cardId) {
    if (typeof playtestState === 'undefined') return;
    const card = (typeof cardsDatabase !== 'undefined') ? cardsDatabase[cardId] : null;
    const name = card ? card.nombre : cardId;

    if (typeof BenchEffects !== 'undefined' && typeof BenchEffects.execute === 'function') {
      BenchEffects.execute(cardId, slotIndex, 'opponent');
    }

    if (typeof addLog === 'function') addLog(`🌐 [Rival] Activó el efecto de banca de <strong>${name}</strong>.`, 'var(--accent-purple)');

    if (typeof updatePlaytestView === 'function') updatePlaytestView();
  }

  function executeRemoteAttack(attackerSlot, targetSlot) {
    if (typeof playtestState === 'undefined') return;
    const oppSlot = playtestState.opponentSlots[attackerSlot];
    const playerSlot = playtestState.slots[targetSlot];
    if (!oppSlot || !oppSlot.character || !playerSlot || !playerSlot.character) return;

    const attackerCard = cardsDatabase[oppSlot.character];
    const defenderCard = cardsDatabase[playerSlot.character];

    oppSlot.attacksDeclared = (oppSlot.attacksDeclared || 0) + 1;
    if (oppSlot.attacksDeclared >= (oppSlot.maxAttacks || 1)) {
      oppSlot.isRotated = true;
    }

    if (typeof addLog === 'function') {
      addLog(`⚔️ 🌐 [Rival] <strong>${attackerCard.nombre}</strong> declara un ataque contra tu <strong>${defenderCard.nombre}</strong>.`, 'var(--accent-danger)');
    }

    const executeDamage = () => {
      if (typeof addLog === 'function') {
        addLog(`[Combate] Resolución de combate: <strong>${attackerCard.nombre}</strong> y <strong>${defenderCard.nombre}</strong> se infligen daño mutuo ("se pegan").`, 'var(--accent-warning)');
      }
      if (typeof resolveOpponentStandardDestruction === 'function') resolveOpponentStandardDestruction(attackerSlot);
      if (typeof resolveStandardDestruction === 'function') resolveStandardDestruction(targetSlot);
      if (typeof updatePlaytestView === 'function') updatePlaytestView();
    };

    if (typeof window !== 'undefined' && window.AnimationEngine && typeof window.AnimationEngine.animateAttackClash === 'function') {
      window.AnimationEngine.animateAttackClash(attackerSlot, targetSlot, 'opponent', () => {
        executeDamage();
      });
    } else {
      executeDamage();
    }
  }

  function executeRemoteDrawCard() {
    if (typeof playtestState === 'undefined') return;
    if (playtestState.opponentDeck && playtestState.opponentDeck.length > 0) {
      const cardId = playtestState.opponentDeck.shift();
      if (!playtestState.opponentHand) playtestState.opponentHand = [];
      playtestState.opponentHand.push(cardId);

      if (typeof animateCardDraw === 'function') {
        animateCardDraw('opponent', cardId);
      }
      if (typeof addLog === 'function') {
        addLog(`🌐 [Rival] Robó 1 carta de su mazo.`);
      }
      if (typeof updatePlaytestView === 'function') updatePlaytestView();
    }
  }

  function executeRemotePassTurn() {
    if (typeof playtestState === 'undefined') return;

    // Restaurar estados "una vez por turno"
    playtestState.slots.forEach(slot => {
      slot.effectUsed = false;
      slot.usedSkills = [];
      slot.usedSkillIndexes = [];
      slot.maxAttacks = 1;
      slot.attacksDeclared = 0;
      slot.isRotated = false;
      slot.muroUsadoEsteTurno = false;
      slot.cannotBeDestroyedByBattleUntilTurnEnd = false;
    });

    playtestState.bench.forEach(bCard => {
      bCard.effectUsed = false;
    });

    // Cambiar turno al Jugador local
    playtestState.turnOwner = 'player';
    playtestState.turnCount = (playtestState.turnCount || 1) + 1;

    if (typeof updateTurnBadgeUI === 'function') updateTurnBadgeUI();
    const btn = document.getElementById('btn-toggle-turn');
    if (btn) {
      btn.textContent = "Turno: Jugador (Tú)";
      btn.style.borderColor = "var(--accent-cyan)";
      btn.style.color = "var(--accent-cyan)";
    }

    if (typeof addLog === 'function') {
      addLog(`⚔️ [Turno ${playtestState.turnCount}] ¡Es tu turno! Robas 1 carta.`, 'var(--accent-cyan)');
    }

    // Robar carta del turno
    if (typeof drawCard === 'function') {
      drawCard();
    }

    if (typeof window !== 'undefined' && window.AnimationEngine && typeof window.AnimationEngine.showPhaseBanner === 'function') {
      window.AnimationEngine.showPhaseBanner(`TURNO ${playtestState.turnCount}: TU TURNO`);
    }

    if (typeof updatePlaytestView === 'function') updatePlaytestView();
  }

  // 9. COPIAR CÓDIGO
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

  // 10. CANCELAR SALA
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
    setupStarted = false;
    localStarterChosen = false;
    localStarterId = null;
    localShuffledDeck = null;
    localLynaResolved = false;
    localLyna5 = false;
    oppStarterChosen = false;
    oppStarterId = null;
    oppShuffledDeck = null;
    oppLynaResolved = false;
    oppLyna5 = false;
    coinFlipStarted = false;
    handsDealt = false;
    pendingWeStartFirst = false;

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
