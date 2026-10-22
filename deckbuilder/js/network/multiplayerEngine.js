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
  let HandsDealtUnused = false;
  let handsDealt = false;
  let pendingWeStartFirst = false;
  let isApplyingRemotePacket = false;
  let matchSyncEnabled = false;
  let lastSyncedStateHash = null;
  let requestCounter = 0;
  const pendingProtectionRequests = new Map();
  const pendingReactionRequests = new Map();
  const pendingGraveInterceptorTimers = new Map();
  const recentExplicitGraveTriggers = new Map();

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
    isApplyingRemotePacket = false;
    matchSyncEnabled = false;
    lastSyncedStateHash = null;

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
    isApplyingRemotePacket = false;
    matchSyncEnabled = false;
    lastSyncedStateHash = null;

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
      const wasConnected = isConnected;
      isConnected = false;
      if (typeof playtestState !== 'undefined') {
        playtestState.isOnlineMatch = false;
      }
      if (wasConnected) {
        if (typeof showMatchEndModal === 'function') {
          showMatchEndModal(false, "CONEXIÓN FINALIZADA", "Tu rival se ha desconectado o la partida ha terminado.");
        } else {
          alert("El rival se ha desconectado de la partida.");
          if (typeof showScreen === 'function') {
            showScreen('main-menu');
          }
        }
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

    isApplyingRemotePacket = true;
    try {
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

        case 'ACTION_ATTACK_RESOLVED':
          // El defensor resolvió reacciones y daño sobre su personaje; ahora el atacante resuelve el suyo
          executeRemoteAttackResolved(packet.attackerSlot, packet.targetSlot, packet.combatOccurred);
          break;

        case 'ACTION_DRAW_CARD':
          // El rival robó 1 carta (o inició su turno)
          executeRemoteDrawCard(packet);
          break;

        case 'ACTION_END_TURN':
          // El rival terminó su turno
          executeRemotePassTurn(packet);
          break;

        case 'REMOTE_GRAVE_TRIGGER':
          // Una carta propia fue enviada a nuestro cementerio por acción del rival
          handleRemoteGraveTrigger(packet.cardId, packet.context || {});
          break;

        case 'REQUEST_PROTECTION_DECISION':
          // El rival solicita saber si protegemos nuestras Skills (Ryu-chan SP180, Confrontación Forzada SP208, Golpe Súbito SP184)
          handleProtectionRequest(packet);
          break;

        case 'RESPONSE_PROTECTION_DECISION':
          // Respuesta del rival sobre si protegió sus Skills
          handleProtectionResponse(packet);
          break;

        case 'REMOTE_REACTION_TRIGGER':
          // El rival disparó una condición de reacción opcional nuestra (Marina SP343/SP410, Eishet SP357, Bao SP356, Dualidad SP428)
          handleRemoteReactionTrigger(packet);
          break;

        case 'REMOTE_REACTION_DONE':
          // El rival terminó de decidir/resolver su reacción
          handleRemoteReactionDone(packet);
          break;

        case 'SYNC_STATE':
          // Sincronización espejo del estado completo de zonas y banderas
          applyRemoteStateSync(packet.state);
          break;

        case 'SYNC_LOG':
          // Sincronización de registro de efecto en el Duel Log
          if (packet.text && typeof addLog === 'function') {
            addLog(`🌐 [Rival] ${packet.text}`, 'var(--accent-purple)');
          }
          break;

        case 'ACTION_REVEAL_CARDS':
          // El rival está revelando cartas una por una (ej: ¡Desatar!, Investigación, Tagero, Marina)
          if (Array.isArray(packet.cardIds) && typeof revealCardsSequentially === 'function') {
            revealCardsSequentially(packet.cardIds, packet.title || '[Rival] Revelando Cartas', null, true);
          }
          break;

        case 'ACTION_CARD_ACTIVATED':
          // El rival activó un efecto: mostrar el showcase central de activación en nuestra pantalla
          if (packet.cardId && typeof window !== 'undefined' && window.AnimationEngine && typeof window.AnimationEngine.showCardActivation === 'function') {
            window.AnimationEngine.showCardActivation(packet.cardId, 'opponent');
          }
          break;

        case 'ACTION_SURRENDER':
          if (typeof playtestState !== 'undefined') {
            playtestState.matchEnded = true;
          }
          if (typeof adjustBo3Score === 'function') {
            adjustBo3Score('victories', 1);
          }
          if (typeof addLog === 'function') {
            addLog("🏳️ Tu rival se ha rendido del duelo. ¡Has ganado la partida!", 'var(--accent-cyan)');
          }
          if (typeof showMatchEndModal === 'function') {
            showMatchEndModal(true, "¡VICTORIA!", "Tu rival se ha rendido del duelo.");
          } else {
            alert("¡Tu rival se ha rendido! Has ganado el duelo.");
            if (typeof showScreen === 'function') {
              showScreen('main-menu');
            }
          }
          break;

        default:
          console.log("[Multiplayer] Mensaje no reconocido:", packet.type);
      }
    } finally {
      isApplyingRemotePacket = false;
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

  function waitForLocalUIIdle(onIdle) {
    const check = () => {
      const ctxMenu = typeof document !== 'undefined' ? document.getElementById('card-context-menu') : null;
      const isCtxOpen = !!(ctxMenu && !ctxMenu.classList.contains('hidden') && ctxMenu.style.display !== 'none');
      const isSelectionActive = !!(typeof playtestState !== 'undefined' && playtestState && playtestState.selectionMode && playtestState.selectionMode.active);
      const dynamicModals = (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function')
        ? Array.from(document.querySelectorAll('.modal-overlay:not(.hidden)')).filter(el =>
            !['duel-setup-modal', 'multiplayer-modal', 'rules-banlist-modal', 'pile-modal', 'starter-modal'].includes(el.id) &&
            el.style.display !== 'none'
          )
        : [];
      if (!isCtxOpen && !isSelectionActive && dynamicModals.length === 0) {
        onIdle();
      } else {
        setTimeout(check, 100);
      }
    };
    setTimeout(check, 50);
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
      if (typeof attachGraveyardInterceptors === 'function') {
        attachGraveyardInterceptors();
      }
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
    const iWon = (isHost && winner === 'host') || (!isHost && winner === 'guest');
    const mySide = isHost ? 'CARA' : 'SELLO';
    const oppSide = isHost ? 'SELLO' : 'CARA';

    if (typeof addLog === 'function') {
      addLog(`[Volado Inicial] Disputa de orden de turno: Tú (${mySide}) vs Rival (${oppSide}).`, 'var(--accent-cyan)');
    }

    const initialText = `🪙 Volado Inicial: Tú (${mySide}) vs Rival (${oppSide}) 🪙`;
    const winnerText = iWon
      ? `👑 ¡Resultado: ${coinResult.toUpperCase()}! ¡Has ganado el volado! 👑`
      : `🛡️ ¡Resultado: ${coinResult.toUpperCase()}! El rival ha ganado el volado. 🛡️`;

    const onCoinFinished = (res) => {
      if (iWon) {
        if (typeof addLog === 'function') {
          addLog(`👑 ¡Obtuviste ${res.toUpperCase()} y ganaste el volado! Elige si deseas ir Primero o Segundo.`, 'var(--accent-cyan)');
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
          addLog(`👑 Tu rival obtuvo ${res.toUpperCase()} y ganó el volado. Esperando que elija quién comienza...`, 'var(--accent-purple)');
        }
      }
    };

    if (typeof flipCoin === 'function') {
      flipCoin(onCoinFinished, coinResult, { initialText, winnerText });
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

    // Activar sincronización automática de estado y fijar snapshot inicial
    matchSyncEnabled = true;
    const initSnapshot = getBoardStateSnapshot();
    if (initSnapshot) {
      lastSyncedStateHash = JSON.stringify(initSnapshot);
    }

    if (typeof updatePlaytestView === 'function') updatePlaytestView();

    // Si comienza el rival en Turno 1, verificar efectos propios de "al inicio del turno de tu adversario" (ej. Nobuko SP189, Eishet SP294)
    if (!pendingWeStartFirst && typeof runOnlineOpponentTurnStartChain === 'function') {
      isApplyingRemotePacket = false;
      runOnlineOpponentTurnStartChain(null);
    }
  }

  // 12. SINCRONIZACIÓN ESPEJO AUTOMÁTICA DE ESTADO Y EFECTOS (BANCA, MANO, MAZO, CEMENTERIO, CAMPO, BANDERAS)
  const SYMMETRIC_BOOL_PAIRS = [
    ['playerGraveEffectsBlockedThisTurn', 'opponentGraveEffectsBlockedThisTurn'],
    ['cannotDrawByEffectsThisTurn', 'opponentCannotDrawByEffectsThisTurn'],
    ['usedPlanificar342ThisTurn', 'opponentUsedPlanificar342ThisTurn'],
    ['usedNostalgia351ThisTurn', 'opponentUsedNostalgia351ThisTurn'],
    ['usedSuenoDeSirvienta353ThisTurn', 'opponentUsedSuenoDeSirvienta353ThisTurn'],
    ['usedManipulacion354ThisTurn', 'opponentUsedManipulacion354ThisTurn'],
    ['usedInerme355ThisGame', 'opponentUsedInerme355ThisGame'],
    ['usedVoidOh367ThisTurn', 'opponentUsedVoidOh367ThisTurn'],
    ['usedFlorete371ThisTurn', 'opponentUsedFlorete371ThisTurn'],
    ['usedCrepusculo380ThisGame', 'opponentUsedCrepusculo380ThisGame'],
    ['usedAscension415ThisGame', 'opponentUsedAscension415ThisGame'],
    ['usedAumentarVigor417ThisTurn', 'opponentUsedAumentarVigor417ThisTurn'],
    ['usedDominioDelJuego418ThisTurn', 'opponentUsedDominioDelJuego418ThisTurn'],
    ['usedContrato419ThisTurn', 'opponentUsedContrato419ThisTurn'],
    ['usedVoluntadDelAgua421ThisTurn', 'opponentUsedVoluntadDelAgua421ThisTurn'],
    ['voluntadDelAguaUsedThisTurn', 'opponentVoluntadDelAguaUsedThisTurn'],
    ['usedCuestionDeTactica422ThisTurn', 'opponentUsedCuestionDeTactica422ThisTurn'],
    ['usedSonrisaQueAcecha426ThisTurn', 'opponentUsedSonrisaQueAcecha426ThisTurn'],
    ['usedSiBuenaIdea427ThisTurn', 'opponentUsedSiBuenaIdea427ThisTurn'],
    ['usedCiclonDePalma429ThisTurn', 'opponentUsedCiclonDePalma429ThisTurn'],
    ['ocasoDelPasadoUsedThisTurn', 'opponentOcasoDelPasadoUsedThisTurn'],
    ['desenfundarUsedThisTurn', 'opponentDesenfundarUsedThisTurn'],
    ['descuidoUsedThisTurn', 'opponentDescuidoUsedThisTurn']
  ];

  const SYMMETRIC_VALUE_PAIRS = [
    ['pendingRoy339SearchPlayer', 'pendingRoy339SearchOpponent'],
    ['usedBajoLaLuzLunarGraveCount', 'opponentUsedBajoLaLuzLunarGraveCount'],
    ['recursosSP404SentTurn', 'opponentRecursosSP404SentTurn'],
    ['bigWinSkillHeads', 'opponentBigWinSkillHeads'],
    ['colapsarSistemaCount', 'opponentColapsarSistemaCount'],
    ['ascensoArcanoCountThisTurn', 'opponentAscensoArcanoCountThisTurn'],
    ['descansoCountThisTurn', 'opponentDescansoCountThisTurn'],
    ['apagonCountThisTurn', 'opponentApagonCountThisTurn'],
    ['desertarCountThisTurn', 'opponentDesertarCountThisTurn']
  ];

  const SYMMETRIC_ARRAY_PAIRS = [
    ['unplayableCharactersToFieldThisTurn', 'opponentUnplayableCharactersToFieldThisTurn'],
    ['usedGlobalEffects', 'opponentUsedGlobalEffects'],
    ['usedPerGameEffects', 'opponentUsedPerGameEffects'],
    ['activatedSkillNamesThisTurn', 'opponentActivatedSkillNamesThisTurn']
  ];

  function invertOwnerSide(side) {
    if (side === 'player') return 'opponent';
    if (side === 'opponent') return 'player';
    return side;
  }

  function getBoardStateSnapshot() {
    if (typeof playtestState === 'undefined' || !playtestState) return null;
    const snap = {
      slots: JSON.parse(JSON.stringify(playtestState.slots || [])),
      opponentSlots: JSON.parse(JSON.stringify(playtestState.opponentSlots || [])),
      bench: JSON.parse(JSON.stringify(playtestState.bench || [])),
      opponentBench: JSON.parse(JSON.stringify(playtestState.opponentBench || [])),
      grave: JSON.parse(JSON.stringify(playtestState.grave || [])),
      opponentGrave: JSON.parse(JSON.stringify(playtestState.opponentGrave || [])),
      hand: JSON.parse(JSON.stringify(playtestState.hand || [])),
      opponentHand: JSON.parse(JSON.stringify(playtestState.opponentHand || [])),
      deck: JSON.parse(JSON.stringify(playtestState.deck || [])),
      opponentDeck: JSON.parse(JSON.stringify(playtestState.opponentDeck || [])),
      field: playtestState.field || null,
      opponentField: playtestState.opponentField || null,
      cannotEquipSkillNameThisTurn: playtestState.cannotEquipSkillNameThisTurn || null,
      skillsRemovedByEffectThisTurn: playtestState.skillsRemovedByEffectThisTurn || 0,
      recalcularSP324ActiveThisTurn: !!playtestState.recalcularSP324ActiveThisTurn,
      activeContratosSP419: JSON.parse(JSON.stringify(playtestState.activeContratosSP419 || [])),
      cuentaAtrasList: JSON.parse(JSON.stringify(playtestState.cuentaAtrasList || [])),
      pendingPlanificar342List: JSON.parse(JSON.stringify(playtestState.pendingPlanificar342List || []))
    };

    for (const [pKey, oKey] of SYMMETRIC_BOOL_PAIRS) {
      snap[pKey] = !!playtestState[pKey];
      snap[oKey] = !!playtestState[oKey];
    }
    for (const [pKey, oKey] of SYMMETRIC_VALUE_PAIRS) {
      snap[pKey] = playtestState[pKey] ?? null;
      snap[oKey] = playtestState[oKey] ?? null;
    }
    for (const [pKey, oKey] of SYMMETRIC_ARRAY_PAIRS) {
      snap[pKey] = JSON.parse(JSON.stringify(playtestState[pKey] || []));
      snap[oKey] = JSON.parse(JSON.stringify(playtestState[oKey] || []));
    }

    return snap;
  }

  function syncStateIfChanged() {
    if (!isConnected || !matchSyncEnabled || isApplyingRemotePacket) return;
    if (typeof playtestState === 'undefined' || !playtestState.isOnlineMatch) return;

    const snapshot = getBoardStateSnapshot();
    if (!snapshot) return;

    const currentHash = JSON.stringify(snapshot);
    if (currentHash === lastSyncedStateHash) return;

    lastSyncedStateHash = currentHash;
    sendPacket({
      type: 'SYNC_STATE',
      state: snapshot
    });
  }

  function applyRemoteStateSync(remoteState) {
    if (typeof playtestState === 'undefined' || !remoteState) return;

    // Espejo simétrico: las zonas propias del rival actualizan nuestras zonas "opponent"
    // (Bajo ninguna circunstancia las zonas "opponent" obsoletas del rival deben sobreescribir nuestras zonas locales "player")
    if (Array.isArray(remoteState.slots)) {
      playtestState.opponentSlots = JSON.parse(JSON.stringify(remoteState.slots));
    }
    if (Array.isArray(remoteState.bench)) {
      playtestState.opponentBench = JSON.parse(JSON.stringify(remoteState.bench));
    }
    if (Array.isArray(remoteState.grave)) {
      playtestState.opponentGrave = JSON.parse(JSON.stringify(remoteState.grave));
    }
    if (typeof attachGraveyardInterceptors === 'function') {
      attachGraveyardInterceptors();
    }
    if (Array.isArray(remoteState.hand)) {
      playtestState.opponentHand = JSON.parse(JSON.stringify(remoteState.hand));
    }
    if (Array.isArray(remoteState.deck)) {
      playtestState.opponentDeck = JSON.parse(JSON.stringify(remoteState.deck));
    }
    if ('field' in remoteState) {
      playtestState.opponentField = remoteState.field;
    }

    for (const [pKey, oKey] of SYMMETRIC_BOOL_PAIRS) {
      if (typeof remoteState[pKey] === 'boolean') {
        playtestState[oKey] = remoteState[pKey];
      }
    }

    for (const [pKey, oKey] of SYMMETRIC_VALUE_PAIRS) {
      if (pKey in remoteState) {
        playtestState[oKey] = remoteState[pKey];
      }
    }

    for (const [pKey, oKey] of SYMMETRIC_ARRAY_PAIRS) {
      if (Array.isArray(remoteState[pKey])) {
        playtestState[oKey] = JSON.parse(JSON.stringify(remoteState[pKey]));
      }
    }

    if ('cannotEquipSkillNameThisTurn' in remoteState) {
      playtestState.cannotEquipSkillNameThisTurn = remoteState.cannotEquipSkillNameThisTurn;
    }
    if (typeof remoteState.skillsRemovedByEffectThisTurn === 'number') {
      playtestState.skillsRemovedByEffectThisTurn = remoteState.skillsRemovedByEffectThisTurn;
    }
    if (typeof remoteState.recalcularSP324ActiveThisTurn === 'boolean') {
      playtestState.recalcularSP324ActiveThisTurn = remoteState.recalcularSP324ActiveThisTurn;
    }
    if (Array.isArray(remoteState.activeContratosSP419)) {
      playtestState.activeContratosSP419 = remoteState.activeContratosSP419.map(c => ({
        ...c,
        activator: invertOwnerSide(c.activator),
        adversary: invertOwnerSide(c.adversary)
      }));
    }
    if (Array.isArray(remoteState.cuentaAtrasList)) {
      playtestState.cuentaAtrasList = remoteState.cuentaAtrasList.map(cd => ({
        ...cd,
        activator: invertOwnerSide(cd.activator)
      }));
    }
    if (Array.isArray(remoteState.pendingPlanificar342List)) {
      playtestState.pendingPlanificar342List = remoteState.pendingPlanificar342List.map(item => ({
        ...item,
        owner: invertOwnerSide(item.owner)
      }));
    }

    const currentSnapshot = getBoardStateSnapshot();
    if (currentSnapshot) {
      lastSyncedStateHash = JSON.stringify(currentSnapshot);
    }

    if (typeof updatePlaytestView === 'function') {
      updatePlaytestView();
    }
  }

  function syncLogIfLocal(text) {
    if (!isConnected || !matchSyncEnabled || isApplyingRemotePacket || !text) return;
    if (typeof playtestState === 'undefined' || !playtestState.isOnlineMatch) return;

    // Ignorar logs que ya tienen paquetes propios o que revelan la identidad secreta del robo normal de turno
    const skipPrefixes = [
      'Robaste:',
      'Invocaste a ',
      '¡Evolución! ',
      'Equipaste ',
      '⚔ ',
      '⚔️ ',
      '[Combate]',
      '[REVELADO]',
      '🌐',
      '[Rival]',
      '[Turno ',
      'Has colocado tu Personaje Inicial',
      '[Inicio del Duelo]',
      '[Lanzamiento de Moneda]',
      '👑',
      '[Orden de Turno]',
      '[Personajes Revelados]',
      '[Efecto Lyna',
      'Tu rival ha revelado a Lyna',
      'Robaste <strong>',
      'Tu rival robó <strong>'
    ];
    if (skipPrefixes.some(prefix => text.startsWith(prefix))) return;

    sendPacket({
      type: 'SYNC_LOG',
      text: text
    });
  }

  // 13. COORDINACIÓN P2P DE TRIGGERS DE CEMENTERIO, PROTECCIÓN DE SKILLS Y REACCIONES
  function sendGraveTriggerToPeer(cardId, context = {}) {
    if (!isConnected || !cardId) return;
    const now = Date.now();

    if (context && context.fromInterceptor) {
      // Si ya se envió un trigger explícito con contexto rico para esta carta hace menos de 150ms, ignorar el interceptor
      const lastExplicit = recentExplicitGraveTriggers.get(cardId);
      if (lastExplicit && (now - lastExplicit) < 150) {
        return;
      }
      // Esperar brevemente por si enseguida se invoca dispatchGraveTriggers(cardId, 'opponent', richContext)
      const timerId = setTimeout(() => {
        pendingGraveInterceptorTimers.delete(cardId);
        const recent = recentExplicitGraveTriggers.get(cardId);
        if (recent && (Date.now() - recent) < 150) return;
        syncStateIfChanged();
        sendPacket({
          type: 'REMOTE_GRAVE_TRIGGER',
          cardId,
          context: { fromInterceptor: true }
        });
      }, 25);
      pendingGraveInterceptorTimers.set(cardId, timerId);
      return;
    }

    // Es un trigger explícito (ej. desde dispatchGraveTriggers o onEquippedSkillSentToGraveByEffect)
    recentExplicitGraveTriggers.set(cardId, now);
    if (pendingGraveInterceptorTimers.has(cardId)) {
      clearTimeout(pendingGraveInterceptorTimers.get(cardId));
      pendingGraveInterceptorTimers.delete(cardId);
    }

    const cleanContext = {
      fromZone: context.fromZone,
      isEquipped: context.isEquipped,
      slotIndex: context.slotIndex,
      byEffect: context.byEffect,
      sourceOwner: context.sourceOwner
    };

    syncStateIfChanged();
    sendPacket({
      type: 'REMOTE_GRAVE_TRIGGER',
      cardId,
      context: cleanContext
    });
  }

  function handleRemoteGraveTrigger(cardId, rawContext = {}) {
    if (typeof playtestState === 'undefined' || !cardId) return;

    // Permitir que las decisiones/efectos del jugador local se sincronicen de vuelta al rival
    isApplyingRemotePacket = false;

    const peerContext = {
      ...rawContext,
      sourceOwner: rawContext.sourceOwner ? invertOwnerSide(rawContext.sourceOwner) : 'opponent'
    };

    if (cardId === 'BBX-SP200') {
      playtestState.ascensoArcanoCountThisTurn = (playtestState.ascensoArcanoCountThisTurn || 0) + 1;
    }
    if (cardId === 'BBX-SP404' && playtestState.turnOwner === 'opponent') {
      playtestState.recursosSP404SentTurn = playtestState.turnCount || 1;
    }

    if (typeof dispatchGraveTriggers === 'function') {
      dispatchGraveTriggers(cardId, 'player', peerContext);
    }

    // Triggers pasivos que observan cualquier carta que cae en nuestro cementerio
    setTimeout(() => {
      if (cardId !== 'BBX-SP134' && typeof checkAndTriggerDesdeLaSombraPlayer === 'function') {
        checkAndTriggerDesdeLaSombraPlayer(cardId);
      }
      if (cardId !== 'BBX-SP255' && typeof checkAndTriggerKatshi255 === 'function') {
        checkAndTriggerKatshi255(cardId);
      }
      if (cardId !== 'BBX-SP260' && typeof checkAndTriggerKatshi260 === 'function') {
        checkAndTriggerKatshi260(cardId);
      }
      if (cardId !== 'BBX-SP256' && typeof checkAndTriggerReflejoSiniestro === 'function') {
        checkAndTriggerReflejoSiniestro(cardId);
      }
      if (cardId !== 'BBX-SP221' && typeof checkAndTriggerRemembranza === 'function') {
        checkAndTriggerRemembranza(cardId, 'player');
      }
      if (cardId !== 'BBX-SP268' && typeof checkAndTriggerEnergiaArcana === 'function') {
        checkAndTriggerEnergiaArcana(cardId);
      }
      if (peerContext.isEquipped && peerContext.sourceOwner === 'opponent' && cardId !== 'BBX-SP300' && typeof checkAndTriggerHoraDelTe === 'function') {
        checkAndTriggerHoraDelTe(cardId, 'player', peerContext);
      }
      waitForLocalUIIdle(() => {
        if (typeof updatePlaytestView === 'function') updatePlaytestView();
        syncStateIfChanged();
      });
    }, 60);
  }

  function requestProtectionDecision(protectType, count, totalCards, onCancel, onProceed) {
    if (!isConnected) {
      if (typeof onProceed === 'function') onProceed();
      return;
    }
    const requestId = `prot_${++requestCounter}_${Date.now()}`;
    pendingProtectionRequests.set(requestId, { onCancel, onProceed });
    syncStateIfChanged();
    sendPacket({
      type: 'REQUEST_PROTECTION_DECISION',
      requestId,
      protectType,
      count,
      totalCards
    });
  }

  function handleProtectionRequest(packet) {
    if (typeof playtestState === 'undefined') return;
    isApplyingRemotePacket = false;

    const { requestId, protectType, count, totalCards } = packet;
    const sendDecision = (canceled) => {
      if (typeof updatePlaytestView === 'function') updatePlaytestView();
      syncStateIfChanged();
      sendPacket({
        type: 'RESPONSE_PROTECTION_DECISION',
        requestId,
        canceled: !!canceled
      });
    };

    if (protectType === 'shuffle_to_deck' && typeof checkAndProtectShuffleSkillsToDeck === 'function') {
      checkAndProtectShuffleSkillsToDeck('player', () => sendDecision(true), () => sendDecision(false), count, totalCards);
    } else if (protectType === 'send_to_grave' && typeof checkAndProtectSendSkillsToGrave === 'function') {
      checkAndProtectSendSkillsToGrave('player', () => sendDecision(true), () => sendDecision(false), count, totalCards);
    } else {
      sendDecision(false);
    }
  }

  function handleProtectionResponse(packet) {
    const entry = pendingProtectionRequests.get(packet.requestId);
    if (!entry) return;
    pendingProtectionRequests.delete(packet.requestId);
    isApplyingRemotePacket = false;

    if (packet.canceled) {
      if (typeof entry.onCancel === 'function') entry.onCancel();
    } else {
      if (typeof entry.onProceed === 'function') entry.onProceed();
    }
    if (typeof updatePlaytestView === 'function') updatePlaytestView();
    syncStateIfChanged();
  }

  function sendReactionTriggerToPeer(triggerType, payload = {}, onDone = null) {
    if (!isConnected) {
      if (typeof onDone === 'function') onDone();
      return;
    }
    const requestId = `react_${++requestCounter}_${Date.now()}`;
    pendingReactionRequests.set(requestId, { onDone });
    syncStateIfChanged();
    sendPacket({
      type: 'REMOTE_REACTION_TRIGGER',
      requestId,
      triggerType,
      payload
    });
  }

  function handleRemoteReactionTrigger(packet) {
    if (typeof playtestState === 'undefined') return;
    isApplyingRemotePacket = false;

    const { requestId, triggerType, payload = {} } = packet;
    const finishReaction = (result = null) => {
      if (typeof updatePlaytestView === 'function') updatePlaytestView();
      syncStateIfChanged();
      sendPacket({
        type: 'REMOTE_REACTION_DONE',
        requestId,
        result
      });
    };

    if (triggerType === 'MARINA_SP343' && typeof checkAndTriggerMarinaSP343 === 'function') {
      checkAndTriggerMarinaSP343('player', finishReaction);
    } else if (triggerType === 'MARINA_SP410' && typeof checkAndTriggerMarinaSP410 === 'function') {
      checkAndTriggerMarinaSP410(payload.triggerCardId, 'opponent', 'player', {}, finishReaction);
    } else if (triggerType === 'EISHET_SP357' && typeof checkAndTriggerEishetSP357 === 'function') {
      checkAndTriggerEishetSP357('player', finishReaction);
    } else if (triggerType === 'BAO_SP356' && typeof checkAndTriggerBaoSP356 === 'function') {
      checkAndTriggerBaoSP356(finishReaction, true);
    } else if (triggerType === 'DUALIDAD_SP428' && typeof checkAndTriggerDualidadSP428 === 'function') {
      checkAndTriggerDualidadSP428('opponent', payload.slotIndex, payload.playedCharId, {}, finishReaction);
    } else if (triggerType === 'MAPA_SP264') {
      const revealed = payload.revealedIds || [];
      const openChooser = (typeof openCardChooserModal === 'function') ? openCardChooserModal : (typeof window !== 'undefined' ? window.openCardChooserModal : null);
      if (revealed.length > 0 && openChooser) {
        openChooser(revealed, "Efecto Mapa del adversario: Elige 1 carta para agregar a su mano", (chosenIdx) => {
          finishReaction({ chosenId: revealed[chosenIdx] });
        });
      } else {
        finishReaction({ chosenId: revealed[0] || null });
      }
    } else {
      finishReaction();
    }
  }

  function handleRemoteReactionDone(packet) {
    const entry = pendingReactionRequests.get(packet.requestId);
    if (!entry) return;
    pendingReactionRequests.delete(packet.requestId);
    isApplyingRemotePacket = false;

    if (typeof entry.onDone === 'function') {
      entry.onDone(packet.result);
    }
    if (typeof updatePlaytestView === 'function') updatePlaytestView();
    syncStateIfChanged();
  }

  // 14. EJECUCIÓN REMOTA DE JUGADAS (CUANDO EL RIVAL HACE UN MOVIMIENTO)
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

    if (typeof addLog === 'function') addLog(`🌐 [Rival] Activó el efecto de banca de <strong>${name}</strong>.`, 'var(--accent-purple)');
    if (typeof updatePlaytestView === 'function') updatePlaytestView();
  }

  function executeRemoteAttack(attackerSlot, targetSlot) {
    if (typeof playtestState === 'undefined') return;
    const oppSlot = playtestState.opponentSlots[attackerSlot];
    const playerSlot = playtestState.slots[targetSlot];
    if (!oppSlot || !oppSlot.character || !playerSlot || !playerSlot.character) return;

    isApplyingRemotePacket = false;

    const attackerCard = cardsDatabase[oppSlot.character];
    const defenderCard = cardsDatabase[playerSlot.character];

    if (typeof addLog === 'function') {
      addLog(`⚔️ 🌐 [Rival] <strong>${attackerCard ? attackerCard.nombre : oppSlot.character}</strong> declara un ataque contra tu <strong>${defenderCard ? defenderCard.nombre : playerSlot.character}</strong>.`, 'var(--accent-danger)');
    }

    if (playerSlot && playerSlot.character === 'BBX-SP319' && typeof checkAndTriggerChiakoSP319AttackTarget === 'function') {
      checkAndTriggerChiakoSP319AttackTarget('player', targetSlot, 'opponent');
    }

    const resolveDefenderCombat = () => {
      const currOppSlot = playtestState.opponentSlots[attackerSlot];
      const currPlayerSlot = playtestState.slots[targetSlot];
      if (!currOppSlot || !currOppSlot.character || !currPlayerSlot || !currPlayerSlot.character) {
        if (typeof updatePlaytestView === 'function') updatePlaytestView();
        syncStateIfChanged();
        sendPacket({
          type: 'ACTION_ATTACK_RESOLVED',
          attackerSlot,
          targetSlot,
          combatOccurred: false
        });
        return;
      }

      const currAttackerName = cardsDatabase[currOppSlot.character]?.nombre || currOppSlot.character;
      const currDefenderName = cardsDatabase[currPlayerSlot.character]?.nombre || currPlayerSlot.character;

      const executeDefenderDamage = () => {
        if (typeof addLog === 'function') {
          addLog(`[Combate] Resolución de combate: <strong>${currAttackerName}</strong> y <strong>${currDefenderName}</strong> se infligen daño mutuo ("se pegan").`, 'var(--accent-warning)');
        }
        if (typeof resolveStandardDestruction === 'function') {
          resolveStandardDestruction(targetSlot);
        }
        waitForLocalUIIdle(() => {
          if (typeof updatePlaytestView === 'function') updatePlaytestView();
          syncStateIfChanged();
          sendPacket({
            type: 'ACTION_ATTACK_RESOLVED',
            attackerSlot,
            targetSlot,
            combatOccurred: true
          });
        });
      };

      if (typeof window !== 'undefined' && window.AnimationEngine && typeof window.AnimationEngine.animateAttackClash === 'function') {
        window.AnimationEngine.animateAttackClash(attackerSlot, targetSlot, 'opponent', () => {
          executeDefenderDamage();
        });
      } else {
        executeDefenderDamage();
      }
    };

    const checkLocalResistir = () => {
      const isResistirBlocked = typeof isSkillHandEffectBlocked === 'function' && isSkillHandEffectBlocked('player');
      const hasResistirInHand = (playtestState.hand || []).includes('BBX-SP060') && !isResistirBlocked;
      if (hasResistirInHand && playerSlot && playerSlot.character && typeof showContextMenu === 'function') {
        const defName = cardsDatabase[playerSlot.character]?.nombre || playerSlot.character;
        const itemsResistir = [
          {
            text: "💥 No activar \"Resistir\"",
            action: () => {
              resolveDefenderCombat();
            }
          },
          {
            text: `✊ Activar "Resistir" desde tu mano (Equipar a ${defName} y Salvar)`,
            action: () => {
              const idxInHand = playtestState.hand.indexOf('BBX-SP060');
              if (idxInHand !== -1) {
                playtestState.hand.splice(idxInHand, 1);
                playerSlot.skills.push('BBX-SP060');
                if (typeof addLog === 'function') {
                  addLog(`[Efecto Mano] Activaste <strong>Resistir (BBX-SP060)</strong> desde tu mano y se la equipaste a <strong>${defName}</strong>.`, 'var(--accent-cyan)');
                }
                if (typeof updatePlaytestView === 'function') updatePlaytestView();
                syncStateIfChanged();
              }
              resolveDefenderCombat();
            }
          }
        ];
        const dummyEvent = {
          clientX: typeof window !== 'undefined' ? window.innerWidth / 2 - 120 : 0,
          clientY: typeof window !== 'undefined' ? window.innerHeight / 2 - 80 : 0
        };
        showContextMenu(dummyEvent, itemsResistir, () => {
          resolveDefenderCombat();
        });
      } else {
        resolveDefenderCombat();
      }
    };

    const runKatshiStep = () => {
      if (typeof checkAndTriggerKatshiHandSP344 === 'function') {
        checkAndTriggerKatshiHandSP344('player', playerSlot, checkLocalResistir);
      } else {
        checkLocalResistir();
      }
    };

    const runAlterarPactoStep = () => {
      if (typeof checkAndTriggerAlterarPacto === 'function') {
        checkAndTriggerAlterarPacto('player', playerSlot, runKatshiStep);
      } else {
        runKatshiStep();
      }
    };

    if (typeof checkAndTriggerHelicaBenchSP335 === 'function') {
      checkAndTriggerHelicaBenchSP335('player', playerSlot, runAlterarPactoStep);
    } else {
      runAlterarPactoStep();
    }
  }

  function executeRemoteAttackResolved(attackerSlot, targetSlot, combatOccurred) {
    if (typeof playtestState === 'undefined') return;
    isApplyingRemotePacket = false;

    if (!combatOccurred) {
      if (typeof updatePlaytestView === 'function') updatePlaytestView();
      syncStateIfChanged();
      return;
    }

    const resolveAttackerSide = () => {
      if (typeof resolveStandardDestruction === 'function') {
        resolveStandardDestruction(attackerSlot);
      }
      waitForLocalUIIdle(() => {
        if (typeof updatePlaytestView === 'function') updatePlaytestView();
        syncStateIfChanged();
      });
    };

    if (typeof window !== 'undefined' && window.AnimationEngine && typeof window.AnimationEngine.animateAttackClash === 'function') {
      window.AnimationEngine.animateAttackClash(attackerSlot, targetSlot, 'player', () => {
        resolveAttackerSide();
      });
    } else {
      resolveAttackerSide();
    }
  }

  function executeRemoteDrawCard(packet = {}) {
    if (typeof playtestState === 'undefined') return;
    let drawnCardId = packet.cardId || null;

    if (typeof packet.turnCount === 'number') {
      playtestState.turnCount = packet.turnCount;
    }

    if (!packet.noDraw) {
      if (!packet.alreadySynced && playtestState.opponentDeck && playtestState.opponentDeck.length > 0) {
        const cardId = playtestState.opponentDeck.shift();
        if (!drawnCardId) drawnCardId = cardId;
        if (!playtestState.opponentHand) playtestState.opponentHand = [];
        playtestState.opponentHand.push(cardId);
      }

      if (typeof animateCardDraw === 'function') {
        animateCardDraw('opponent', drawnCardId);
      }
      if (typeof addLog === 'function') {
        addLog(`🌐 [Rival] Robó 1 carta de su mazo.`);
      }
      if (typeof updatePlaytestView === 'function') updatePlaytestView();
    }

    if (packet.isTurnStartDraw && typeof runOnlineOpponentTurnStartChain === 'function') {
      isApplyingRemotePacket = false;
      runOnlineOpponentTurnStartChain(drawnCardId, () => {
        syncStateIfChanged();
      });
    }
  }

  function executeRemotePassTurn() {
    if (typeof playtestState === 'undefined') return;

    // Permitir que todos los efectos de "al final del turno del adversario" y el inicio de nuestro turno se sincronicen de vuelta al rival
    isApplyingRemotePacket = false;

    if (typeof toggleTurnOwner === 'function') {
      toggleTurnOwner(true);
      return;
    }
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
    isApplyingRemotePacket = false;
    matchSyncEnabled = false;
    lastSyncedStateHash = null;
    pendingProtectionRequests.clear();
    pendingReactionRequests.clear();
    pendingGraveInterceptorTimers.forEach(t => clearTimeout(t));
    pendingGraveInterceptorTimers.clear();
    recentExplicitGraveTriggers.clear();

    if (typeof playtestState !== 'undefined') {
      playtestState.isOnlineMatch = false;
    }

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
    disconnect: cancelRoom,
    syncStateIfChanged,
    syncLogIfLocal,
    applyRemoteStateSync,
    getBoardStateSnapshot,
    sendGraveTriggerToPeer,
    requestProtectionDecision,
    sendReactionTriggerToPeer,
    isApplyingRemote: () => isApplyingRemotePacket,
    isConnected: () => isConnected,
    isHost: () => isHost,
    getRoomCode: () => roomCode
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MultiplayerEngine;
}
