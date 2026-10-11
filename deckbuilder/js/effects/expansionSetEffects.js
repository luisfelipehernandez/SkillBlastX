/**
 * Skill Blast X - Expansion Set Effects (SP058, SP120, SP313 - SP331)
 * Implementación modular de efectos de cartas clásicas pendientes.
 */

(function(root) {
  'use strict';

  // Sincronizar referencias en entornos Node / Test
  if (typeof global !== 'undefined') {
    if (root && !root.cardsDatabase && global.cardsDatabase) root.cardsDatabase = global.cardsDatabase;
    if (root && !root.addLog && global.addLog) root.addLog = global.addLog;
    if (root && !root.shuffleArray && global.shuffleArray) root.shuffleArray = global.shuffleArray;
    if (root && !root.updatePlaytestView && global.updatePlaytestView) root.updatePlaytestView = global.updatePlaytestView;
    if (root && !root.alert && global.alert) root.alert = global.alert;
    if (root && !root.playtestState && global.playtestState) root.playtestState = global.playtestState;
  }

  // =========================================================================
  // 1. BBX-SP313: Tajo ventada (Skill propia de Lyna)
  // =========================================================================
  function checkAndTriggerTajoVentada(cardId, owner = 'player') {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const isPlayer = (owner === 'player');
    const mySlots = isPlayer ? playtestState.slots : playtestState.opponentSlots;
    const myDeck = isPlayer ? playtestState.deck : playtestState.opponentDeck;
    const myGrave = isPlayer ? playtestState.grave : playtestState.opponentGrave;

    // Buscar personaje Lyna en campo
    const lynaSlot = mySlots.find(s => s && s.character && root.cardsDatabase[s.character]?.nombre?.includes('Lyna'));
    if (!lynaSlot) return false;

    // Buscar skills propias de Lyna en deck y cementerio (excepto Tajo ventada)
    const validSkillsDeck = myDeck.filter(id => {
      const c = root.cardsDatabase[id];
      return c && c.tipo === 'Skill' && c.portador && c.portador.includes('Lyna') && id !== 'BBX-SP313';
    });
    const validSkillsGrave = myGrave.filter(id => {
      const c = root.cardsDatabase[id];
      return c && c.tipo === 'Skill' && c.portador && c.portador.includes('Lyna') && id !== 'BBX-SP313';
    });

    const pool = [...validSkillsDeck.map(id => ({ id, zone: 'deck' })), ...validSkillsGrave.map(id => ({ id, zone: 'grave' }))];
    if (pool.length === 0) return false;

    const toEquip = pool.slice(0, 2);
    toEquip.forEach(item => {
      if (item.zone === 'deck') {
        const idx = myDeck.indexOf(item.id);
        if (idx !== -1) myDeck.splice(idx, 1);
      } else {
        const idx = myGrave.indexOf(item.id);
        if (idx !== -1) myGrave.splice(idx, 1);
      }
      lynaSlot.skills.push(item.id);
      if (typeof root.addLog === 'function') {
        root.addLog(`[Efecto Tajo ventada] Equipaste <strong>${root.cardsDatabase[item.id].nombre}</strong> desde tu ${item.zone === 'deck' ? 'deck' : 'cementerio'} a Lyna.`, 'var(--accent-purple)');
      }
    });

    if (toEquip.some(i => i.zone === 'deck') && typeof root.shuffleArray === 'function') {
      root.shuffleArray(myDeck);
    }
    if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
    return true;
  }

  // =========================================================================
  // 2. BBX-SP315: Búsqueda (Skill genérica) - HOPT
  // =========================================================================
  function canActivateBusquedaSP315(owner = 'player') {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const usedList = (owner === 'player') ? (playtestState.usedGlobalEffects || []) : (playtestState.opponentUsedGlobalEffects || []);
    if (usedList.includes('Búsqueda')) return false;
    const myDeck = (owner === 'player') ? playtestState.deck : playtestState.opponentDeck;
    return myDeck.length > 0;
  }

  function executeBusquedaSP315(owner = 'player', slotIndex = -1, skIndex = -1, fromHand = false, onChosen = null) {
    if (!canActivateBusquedaSP315(owner)) return false;
    const isPlayer = (owner === 'player');
    const myDeck = isPlayer ? playtestState.deck : playtestState.opponentDeck;
    const myHand = isPlayer ? playtestState.hand : playtestState.opponentHand;
    const usedList = isPlayer ? playtestState.usedGlobalEffects : playtestState.opponentUsedGlobalEffects;

    usedList.push('Búsqueda');

    const validTargets = myDeck.filter(id => {
      const c = root.cardsDatabase[id];
      if (!c) return false;
      const isVoidChar = (c.tipo === 'Personaje' && c.nombre.includes('Void-oh'));
      const isVoidSkill = (c.tipo === 'Skill' && c.portador && c.portador.includes('Void-oh'));
      return !isVoidChar && !isVoidSkill;
    });

    if (validTargets.length === 0) {
      if (typeof root.addLog === 'function') root.addLog('[Búsqueda] No hay cartas válidas en tu deck.', 'var(--text-muted)');
      return false;
    }

    const chosenId = (typeof onChosen === 'function') ? onChosen(validTargets) : validTargets[0];
    const deckIdx = myDeck.indexOf(chosenId);
    if (deckIdx !== -1) myDeck.splice(deckIdx, 1);
    myHand.push(chosenId);

    if (typeof root.shuffleArray === 'function') root.shuffleArray(myDeck);
    if (typeof root.addLog === 'function') {
      root.addLog(`[Búsqueda] Agregaste <strong>${root.cardsDatabase[chosenId].nombre}</strong> a tu mano desde tu deck.`, 'var(--accent-purple)');
    }
    if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
    return true;
  }

  // =========================================================================
  // 3. BBX-SP316: Encantamiento (Skill propia de Eishet)
  // =========================================================================
  function executeEncantamientoSP316(owner = 'player', slotIndex, skIndex, onChosenEishetSkill = null, onChosenRecycle = null) {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const isPlayer = (owner === 'player');
    const mySlots = isPlayer ? playtestState.slots : playtestState.opponentSlots;
    const myDeck = isPlayer ? playtestState.deck : playtestState.opponentDeck;
    const myGrave = isPlayer ? playtestState.grave : playtestState.opponentGrave;

    const slot = mySlots[slotIndex];
    if (!slot || !slot.skills || !slot.skills.includes('BBX-SP316')) return false;

    // 1. Enviar Encantamiento al cementerio
    const skRealIdx = slot.skills.indexOf('BBX-SP316');
    slot.skills.splice(skRealIdx, 1);
    myGrave.push('BBX-SP316');

    // 2. Enviar 1 Skill propia de Eishet del deck al cementerio
    const eishetSkillsInDeck = myDeck.filter(id => {
      const c = root.cardsDatabase[id];
      return c && c.tipo === 'Skill' && c.portador && c.portador.includes('Eishet');
    });

    if (eishetSkillsInDeck.length > 0) {
      const chosenSkillId = (typeof onChosenEishetSkill === 'function') ? onChosenEishetSkill(eishetSkillsInDeck) : eishetSkillsInDeck[0];
      const dIdx = myDeck.indexOf(chosenSkillId);
      if (dIdx !== -1) myDeck.splice(dIdx, 1);
      myGrave.push(chosenSkillId);
      if (typeof root.addLog === 'function') {
        root.addLog(`[Encantamiento] Enviaste <strong>${root.cardsDatabase[chosenSkillId].nombre}</strong> de tu deck al cementerio.`, 'var(--accent-purple)');
      }
    }

    // 3. Barajar 1 carta del cementerio al deck
    if (myGrave.length > 0) {
      const toRecycleId = (typeof onChosenRecycle === 'function') ? onChosenRecycle(myGrave) : myGrave[0];
      const gIdx = myGrave.indexOf(toRecycleId);
      if (gIdx !== -1) myGrave.splice(gIdx, 1);
      myDeck.push(toRecycleId);
      if (typeof root.addLog === 'function') {
        root.addLog(`[Encantamiento] Barajaste <strong>${root.cardsDatabase[toRecycleId].nombre}</strong> de tu cementerio a tu deck.`, 'var(--accent-purple)');
      }
    }

    if (typeof root.shuffleArray === 'function') root.shuffleArray(myDeck);
    if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
    return true;
  }

  // =========================================================================
  // 4. BBX-SP317: Lyna (Personaje - Play Trigger)
  // =========================================================================
  function checkAndTriggerLynaSP317Play(slotIndex, owner = 'player', onChosenSkill = null) {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const isPlayer = (owner === 'player');
    const myDeck = isPlayer ? playtestState.deck : playtestState.opponentDeck;
    const myHand = isPlayer ? playtestState.hand : playtestState.opponentHand;

    const lynaSkillsInDeck = myDeck.filter(id => {
      const c = root.cardsDatabase[id];
      return c && c.tipo === 'Skill' && c.portador && c.portador.includes('Lyna');
    });

    if (lynaSkillsInDeck.length > 0) {
      const chosenId = (typeof onChosenSkill === 'function') ? onChosenSkill(lynaSkillsInDeck) : lynaSkillsInDeck[0];
      const dIdx = myDeck.indexOf(chosenId);
      if (dIdx !== -1) myDeck.splice(dIdx, 1);
      myHand.push(chosenId);
      if (typeof root.addLog === 'function') {
        root.addLog(`[Efecto Lyna SP317] Agregaste <strong>${root.cardsDatabase[chosenId].nombre}</strong> a tu mano desde tu deck.`, 'var(--accent-purple)');
      }
    }

    if (typeof root.shuffleArray === 'function') root.shuffleArray(myDeck);

    // Robar 1 carta de tu deck
    if (myDeck.length > 0) {
      const drawnId = myDeck.shift();
      myHand.push(drawnId);
      if (typeof root.addLog === 'function') {
        root.addLog(`[Efecto Lyna SP317] Robaste 1 carta de tu deck (<strong>${root.cardsDatabase[drawnId].nombre}</strong>).`, 'var(--accent-purple)');
      }
    }

    if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
    return true;
  }

  // =========================================================================
  // 5. BBX-SP319: Chiako (Personaje - Pasiva & Attack Target Trigger)
  // =========================================================================
  function checkAndTriggerChiakoSP319AttackTarget(defenderOwner = 'player', defenderSlotIdx, attackerOwner = 'opponent', onChosenOppSkill = null) {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const oppSlots = (attackerOwner === 'player') ? playtestState.slots : playtestState.opponentSlots;
    const oppGrave = (attackerOwner === 'player') ? playtestState.grave : playtestState.opponentGrave;

    // Recoger skills portadas en el campo del adversario
    const candidateSkills = [];
    oppSlots.forEach((s, sIdx) => {
      if (s && s.character && s.skills && s.skills.length > 0) {
        s.skills.forEach((skId, skIdx) => {
          candidateSkills.push({ skId, slotIndex: sIdx, skillIndex: skIdx });
        });
      }
    });

    if (candidateSkills.length === 0) return false;

    const chosen = (typeof onChosenOppSkill === 'function') ? onChosenOppSkill(candidateSkills) : candidateSkills[0];
    const targetSlot = oppSlots[chosen.slotIndex];
    if (targetSlot && targetSlot.skills) {
      const removedId = targetSlot.skills.splice(chosen.skillIndex, 1)[0];
      oppGrave.push(removedId);
      if (typeof root.addLog === 'function') {
        root.addLog(`[Efecto Chiako SP319] Al ser atacada Chiako, enviaste la Skill portada del adversario <strong>${root.cardsDatabase[removedId].nombre}</strong> al cementerio.`, 'var(--accent-purple)');
      }
      if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
      return true;
    }
    return false;
  }

  // =========================================================================
  // 6. BBX-SP321: Doble lanzamiento (Skill genérica) - 1 por turno
  // =========================================================================
  function executeDobleLanzamientoSP321(owner = 'player', slotIndex, skIndex, forceRolls = null) {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const isPlayer = (owner === 'player');
    const mySlots = isPlayer ? playtestState.slots : playtestState.opponentSlots;
    const slot = mySlots[slotIndex];
    if (!slot) return false;

    slot.usedSkills = slot.usedSkills || [];
    if (slot.usedSkills.includes('BBX-SP321')) return false;
    slot.usedSkills.push('BBX-SP321');

    let pRoll = forceRolls ? forceRolls.player : (Math.floor(Math.random() * 6) + 1);
    let oRoll = forceRolls ? forceRolls.opponent : (Math.floor(Math.random() * 6) + 1);

    if (typeof root.addLog === 'function') {
      root.addLog(`[Doble lanzamiento] Lanzamiento de dados: Jugador sacó <strong>${pRoll}</strong>, Oponente sacó <strong>${oRoll}</strong>.`, 'var(--accent-cyan)');
    }

    if (pRoll > oRoll) {
      // Jugador roba 2
      for (let i = 0; i < 2; i++) {
        if (playtestState.deck.length > 0) playtestState.hand.push(playtestState.deck.shift());
      }
      if (typeof root.addLog === 'function') root.addLog(`[Doble lanzamiento] ¡Jugador obtuvo el resultado más alto y robó 2 cartas!`, 'var(--accent-purple)');
    } else if (oRoll > pRoll) {
      // Oponente roba 2
      for (let i = 0; i < 2; i++) {
        if (playtestState.opponentDeck.length > 0) playtestState.opponentHand.push(playtestState.opponentDeck.shift());
      }
      if (typeof root.addLog === 'function') root.addLog(`[Doble lanzamiento] ¡El Oponente obtuvo el resultado más alto y robó 2 cartas!`, 'var(--accent-purple)');
    }

    if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
    return true;
  }

  // =========================================================================
  // 7. BBX-SP322: Ocaso insidioso (Skill Eishet) - OPD desde Cementerio
  // =========================================================================
  function canActivateOcasoInsidiosoSP322(owner = 'player') {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    if (playtestState.turnOwner !== owner) return false;
    const usedList = (owner === 'player') ? (playtestState.usedPerGameEffects || []) : (playtestState.opponentUsedPerGameEffects || []);
    if (usedList.includes('BBX-SP322') || usedList.includes('Ocaso insidioso')) return false;

    const myGrave = (owner === 'player') ? playtestState.grave : playtestState.opponentGrave;
    if (!myGrave.includes('BBX-SP322')) return false;

    const mySlots = (owner === 'player') ? playtestState.slots : playtestState.opponentSlots;
    const hasFreeSlot = mySlots.some(s => s && !s.character);
    if (!hasFreeSlot) return false;

    const myDeck = (owner === 'player') ? playtestState.deck : playtestState.opponentDeck;
    return myDeck.some(id => root.cardsDatabase[id]?.tipo === 'Personaje' && root.cardsDatabase[id]?.nombre?.includes('Eishet'));
  }

  function executeOcasoInsidiosoSP322(owner = 'player', onChosenEishet = null) {
    if (playtestState.turnOwner !== owner) {
      if (typeof root.alert === 'function') {
        root.alert(owner === 'player' ? "Solo puedes activar este efecto durante tu turno." : "Solo durante el turno del rival.");
      }
      return false;
    }
    if (!canActivateOcasoInsidiosoSP322(owner)) return false;
    const isPlayer = (owner === 'player');
    const myDeck = isPlayer ? playtestState.deck : playtestState.opponentDeck;
    const mySlots = isPlayer ? playtestState.slots : playtestState.opponentSlots;
    const usedList = isPlayer ? (playtestState.usedPerGameEffects = playtestState.usedPerGameEffects || []) : (playtestState.opponentUsedPerGameEffects = playtestState.opponentUsedPerGameEffects || []);

    usedList.push('BBX-SP322');

    const eishetCharsInDeck = myDeck.filter(id => root.cardsDatabase[id]?.tipo === 'Personaje' && root.cardsDatabase[id]?.nombre?.includes('Eishet'));
    const chosenCharId = (typeof onChosenEishet === 'function') ? onChosenEishet(eishetCharsInDeck) : eishetCharsInDeck[0];

    const dIdx = myDeck.indexOf(chosenCharId);
    if (dIdx !== -1) myDeck.splice(dIdx, 1);

    const freeSlotIdx = mySlots.findIndex(s => s && !s.character);
    if (freeSlotIdx !== -1) {
      mySlots[freeSlotIdx].character = chosenCharId;
      mySlots[freeSlotIdx].skills = [];
      mySlots[freeSlotIdx].isRotated = false;
      mySlots[freeSlotIdx].effectUsed = false;
      mySlots[freeSlotIdx].playedFromHand = false;
    }

    if (typeof root.shuffleArray === 'function') root.shuffleArray(myDeck);
    if (typeof root.addLog === 'function') {
      root.addLog(`[Ocaso insidioso] Jugaste a <strong>${root.cardsDatabase[chosenCharId].nombre}</strong> directamente desde tu deck al campo (Slot ${freeSlotIdx + 1}).`, 'var(--accent-purple)');
    }
    if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
    return true;
  }

  // =========================================================================
  // 8. BBX-SP323: Fundición (Skill genérica) - OPD
  // =========================================================================
  function canActivateFundicionSP323(owner = 'player') {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const usedList = (owner === 'player') ? (playtestState.usedPerGameEffects || []) : (playtestState.opponentUsedPerGameEffects || []);
    return !usedList.includes('BBX-SP323') && !usedList.includes('Fundición');
  }

  function executeFundicionSP323(owner = 'player') {
    if (!canActivateFundicionSP323(owner)) return false;
    const isPlayer = (owner === 'player');
    const oppDeck = isPlayer ? playtestState.opponentDeck : playtestState.deck;
    const oppGrave = isPlayer ? playtestState.opponentGrave : playtestState.grave;
    const myDeck = isPlayer ? playtestState.deck : playtestState.opponentDeck;
    const myGrave = isPlayer ? playtestState.grave : playtestState.opponentGrave;
    const myHand = isPlayer ? playtestState.hand : playtestState.opponentHand;
    const usedList = isPlayer ? (playtestState.usedPerGameEffects = playtestState.usedPerGameEffects || []) : (playtestState.opponentUsedPerGameEffects = playtestState.opponentUsedPerGameEffects || []);

    usedList.push('BBX-SP323');

    // 1. Enviar las primeras 5 cartas del tope del deck del adversario al cementerio
    const millCount = Math.min(5, oppDeck.length);
    const milled = [];
    for (let i = 0; i < millCount; i++) {
      const cardId = oppDeck.shift();
      oppGrave.push(cardId);
      milled.push(root.cardsDatabase[cardId]?.nombre || cardId);
    }
    if (typeof root.addLog === 'function') {
      root.addLog(`[Fundición] Enviaste las primeras ${millCount} cartas del deck rival al cementerio: ${milled.join(', ')}.`, 'var(--accent-purple)');
    }

    // 2. Agregar a tu mano desde deck o cementerio 1 Skill "Depósito secreto" (BBX-SP276)
    let foundSource = null;
    let foundIdx = myDeck.indexOf('BBX-SP276');
    if (foundIdx !== -1) {
      foundSource = 'deck';
      myDeck.splice(foundIdx, 1);
    } else {
      foundIdx = myGrave.indexOf('BBX-SP276');
      if (foundIdx !== -1) {
        foundSource = 'grave';
        myGrave.splice(foundIdx, 1);
      }
    }

    if (foundSource) {
      myHand.push('BBX-SP276');
      if (foundSource === 'deck' && typeof root.shuffleArray === 'function') root.shuffleArray(myDeck);
      if (typeof root.addLog === 'function') {
        root.addLog(`[Fundición] Agregaste <strong>Depósito secreto</strong> a tu mano desde tu ${foundSource === 'deck' ? 'deck' : 'cementerio'}.`, 'var(--accent-purple)');
      }
    }

    if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
    return true;
  }

  // =========================================================================
  // 9. BBX-SP324: Recalcular (Skill genérica) - OPD
  // =========================================================================
  function canActivateRecalcularSP324(owner = 'player') {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const usedList = (owner === 'player') ? (playtestState.usedPerGameEffects || []) : (playtestState.opponentUsedPerGameEffects || []);
    return !usedList.includes('BBX-SP324') && !usedList.includes('Recalcular');
  }

  function executeRecalcularSP324(owner = 'player') {
    if (!canActivateRecalcularSP324(owner)) return false;
    const isPlayer = (owner === 'player');
    const myDeck = isPlayer ? playtestState.deck : playtestState.opponentDeck;
    const myGrave = isPlayer ? playtestState.grave : playtestState.opponentGrave;
    const myHand = isPlayer ? playtestState.hand : playtestState.opponentHand;
    const usedList = isPlayer ? (playtestState.usedPerGameEffects = playtestState.usedPerGameEffects || []) : (playtestState.opponentUsedPerGameEffects = playtestState.opponentUsedPerGameEffects || []);

    usedList.push('BBX-SP324');

    // 1. Agregar "Cuenta atrás" (BBX-SP310) desde deck o cementerio a la mano
    let foundSource = null;
    let foundIdx = myDeck.indexOf('BBX-SP310');
    if (foundIdx !== -1) {
      foundSource = 'deck';
      myDeck.splice(foundIdx, 1);
    } else {
      foundIdx = myGrave.indexOf('BBX-SP310');
      if (foundIdx !== -1) {
        foundSource = 'grave';
        myGrave.splice(foundIdx, 1);
      }
    }

    if (foundSource) {
      myHand.push('BBX-SP310');
      if (foundSource === 'deck' && typeof root.shuffleArray === 'function') root.shuffleArray(myDeck);
      if (typeof root.addLog === 'function') {
        root.addLog(`[Recalcular] Agregaste <strong>Cuenta atrás</strong> a tu mano desde tu ${foundSource === 'deck' ? 'deck' : 'cementerio'}.`, 'var(--accent-purple)');
      }
    }

    // Registrar flag para avanzar turnos en 4 al final del turno si se activó Cuenta atrás
    playtestState.recalcularSP324ActiveThisTurn = true;

    if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
    return true;
  }

  // =========================================================================
  // 10. BBX-SP325: Por allá... (Skill propia de Lyna - Grave Trigger HOPT)
  // =========================================================================
  function checkAndTriggerPorAlla(cardId, owner = 'player', onChosenLyna = null) {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const isPlayer = (owner === 'player');
    const usedList = isPlayer ? (playtestState.usedGlobalEffects = playtestState.usedGlobalEffects || []) : (playtestState.opponentUsedGlobalEffects = playtestState.opponentUsedGlobalEffects || []);
    if (usedList.includes('Por allá...')) return false;

    usedList.push('Por allá...');

    const myDeck = isPlayer ? playtestState.deck : playtestState.opponentDeck;
    const myGrave = isPlayer ? playtestState.grave : playtestState.opponentGrave;
    const myHand = isPlayer ? playtestState.hand : playtestState.opponentHand;

    const lynaCharsInDeck = myDeck.filter(id => root.cardsDatabase[id]?.tipo === 'Personaje' && root.cardsDatabase[id]?.nombre?.includes('Lyna'));
    const lynaCharsInGrave = myGrave.filter(id => root.cardsDatabase[id]?.tipo === 'Personaje' && root.cardsDatabase[id]?.nombre?.includes('Lyna'));

    const pool = [...lynaCharsInDeck.map(id => ({ id, zone: 'deck' })), ...lynaCharsInGrave.map(id => ({ id, zone: 'grave' }))];
    if (pool.length === 0) return false;

    const chosenItem = (typeof onChosenLyna === 'function') ? onChosenLyna(pool) : pool[0];
    if (chosenItem.zone === 'deck') {
      const idx = myDeck.indexOf(chosenItem.id);
      if (idx !== -1) myDeck.splice(idx, 1);
      if (typeof root.shuffleArray === 'function') root.shuffleArray(myDeck);
    } else {
      const idx = myGrave.indexOf(chosenItem.id);
      if (idx !== -1) myGrave.splice(idx, 1);
    }

    myHand.push(chosenItem.id);
    if (typeof root.addLog === 'function') {
      root.addLog(`[Por allá...] Agregaste a <strong>${root.cardsDatabase[chosenItem.id].nombre}</strong> a tu mano desde tu ${chosenItem.zone === 'deck' ? 'deck' : 'cementerio'}.`, 'var(--accent-purple)');
    }
    if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
    return true;
  }

  // =========================================================================
  // 11. BBX-SP326: Eishet (Personaje - Hand Reactive Trigger)
  // =========================================================================
  function activateEishetSP326Hand(owner = 'player', handIndex) {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const isPlayer = (owner === 'player');
    const myHand = isPlayer ? playtestState.hand : playtestState.opponentHand;
    const myGrave = isPlayer ? playtestState.grave : playtestState.opponentGrave;
    const myDeck = isPlayer ? playtestState.deck : playtestState.opponentDeck;

    const idx = (handIndex !== undefined && handIndex !== -1) ? handIndex : myHand.indexOf('BBX-SP326');
    if (idx === -1) return false;

    const discardedId = myHand.splice(idx, 1)[0];
    myGrave.push(discardedId);

    // Robar 2 cartas
    let drawnCount = 0;
    for (let i = 0; i < 2; i++) {
      if (myDeck.length > 0) {
        myHand.push(myDeck.shift());
        drawnCount++;
      }
    }

    if (typeof root.addLog === 'function') {
      root.addLog(`[Efecto Eishet SP326] Descartaste a Eishet de tu mano y robaste ${drawnCount} carta(s) de tu deck.`, 'var(--accent-purple)');
    }
    if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
    return true;
  }

  // =========================================================================
  // 12. BBX-SP328: Caos carmesí (Skill genérica - HOPT)
  // =========================================================================
  function canActivateCaosCarmesiSP328(owner = 'player', slotIndex, skIndex) {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const usedList = (owner === 'player') ? (playtestState.usedGlobalEffects || []) : (playtestState.opponentUsedGlobalEffects || []);
    if (usedList.includes('Caos carmesí')) return false;

    // Verificar si hay alguna skill portada en el campo (incluyendo esta misma u otra)
    const hasAnySkill = playtestState.slots.some(s => s && s.skills && s.skills.length > 0) ||
                         playtestState.opponentSlots.some(s => s && s.skills && s.skills.length > 0);
    return hasAnySkill;
  }

  function executeCaosCarmesiSP328(owner = 'player', slotIndex, skIndex, onChosenTargetSkill = null) {
    if (!canActivateCaosCarmesiSP328(owner, slotIndex, skIndex)) return false;
    const isPlayer = (owner === 'player');
    const mySlots = isPlayer ? playtestState.slots : playtestState.opponentSlots;
    const myGrave = isPlayer ? playtestState.grave : playtestState.opponentGrave;
    const myDeck = isPlayer ? playtestState.deck : playtestState.opponentDeck;
    const myHand = isPlayer ? playtestState.hand : playtestState.opponentHand;
    const usedList = isPlayer ? (playtestState.usedGlobalEffects = playtestState.usedGlobalEffects || []) : (playtestState.opponentUsedGlobalEffects = playtestState.opponentUsedGlobalEffects || []);

    const slot = mySlots[slotIndex];
    if (!slot || !slot.skills) return false;

    // 1. Enviar Caos carmesí al cementerio
    const skRealIdx = slot.skills.indexOf('BBX-SP328');
    if (skRealIdx !== -1) slot.skills.splice(skRealIdx, 1);
    myGrave.push('BBX-SP328');
    usedList.push('Caos carmesí');

    // 2. Barajar 1 Skill portada en el campo al deck de su dueño
    const candidateSkills = [];
    playtestState.slots.forEach((s, sIdx) => {
      if (s && s.skills) {
        s.skills.forEach((sk, kIdx) => candidateSkills.push({ skId: sk, slotOwner: 'player', sIdx, kIdx }));
      }
    });
    playtestState.opponentSlots.forEach((s, sIdx) => {
      if (s && s.skills) {
        s.skills.forEach((sk, kIdx) => candidateSkills.push({ skId: sk, slotOwner: 'opponent', sIdx, kIdx }));
      }
    });

    if (candidateSkills.length > 0) {
      const chosen = (typeof onChosenTargetSkill === 'function') ? onChosenTargetSkill(candidateSkills) : candidateSkills[0];
      const targetSlot = (chosen.slotOwner === 'player') ? playtestState.slots[chosen.sIdx] : playtestState.opponentSlots[chosen.sIdx];
      const targetDeck = (chosen.slotOwner === 'player') ? playtestState.deck : playtestState.opponentDeck;

      if (targetSlot && targetSlot.skills) {
        const removedSk = targetSlot.skills.splice(chosen.kIdx, 1)[0];
        targetDeck.push(removedSk);
        if (typeof root.shuffleArray === 'function') root.shuffleArray(targetDeck);
        if (typeof root.addLog === 'function') {
          root.addLog(`[Caos carmesí] Barajaste la Skill portada <strong>${root.cardsDatabase[removedSk].nombre}</strong> al mazo de su dueño.`, 'var(--accent-purple)');
        }
      }
    }

    // 3. Robar 1 carta de tu deck
    if (myDeck.length > 0) {
      myHand.push(myDeck.shift());
      if (typeof root.addLog === 'function') {
        root.addLog(`[Caos carmesí] Robaste 1 carta de tu deck.`, 'var(--accent-purple)');
      }
    }

    if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
    return true;
  }

  // =========================================================================
  // 13. BBX-SP329: Fuego digital (Skill Katherine - Sent to Grave Trigger)
  // =========================================================================
  function checkAndTriggerFuegoDigital(cardId, fromZone = 'deck', owner = 'player', onChosenKatherine = null) {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const isPlayer = (owner === 'player');
    const myBench = isPlayer ? playtestState.bench : playtestState.opponentBench;
    if (myBench.length >= 3) return false;

    const myDeck = isPlayer ? playtestState.deck : playtestState.opponentDeck;
    const myGrave = isPlayer ? playtestState.grave : playtestState.opponentGrave;

    const katherinesDeck = myDeck.filter(id => root.cardsDatabase[id]?.tipo === 'Personaje' && root.cardsDatabase[id]?.nombre?.includes('Katherine'));
    const katherinesGrave = myGrave.filter(id => root.cardsDatabase[id]?.tipo === 'Personaje' && root.cardsDatabase[id]?.nombre?.includes('Katherine'));

    const pool = [...katherinesDeck.map(id => ({ id, zone: 'deck' })), ...katherinesGrave.map(id => ({ id, zone: 'grave' }))];
    if (pool.length === 0) return false;

    const chosenItem = (typeof onChosenKatherine === 'function') ? onChosenKatherine(pool) : pool[0];
    if (chosenItem.zone === 'deck') {
      const idx = myDeck.indexOf(chosenItem.id);
      if (idx !== -1) myDeck.splice(idx, 1);
      if (typeof root.shuffleArray === 'function') root.shuffleArray(myDeck);
    } else {
      const idx = myGrave.indexOf(chosenItem.id);
      if (idx !== -1) myGrave.splice(idx, 1);
    }

    myBench.push({ id: chosenItem.id, effectUsed: false });
    if (typeof root.addLog === 'function') {
      root.addLog(`[Fuego digital] Colocaste a <strong>${root.cardsDatabase[chosenItem.id].nombre}</strong> en tu banca directamente desde tu ${chosenItem.zone === 'deck' ? 'deck' : 'cementerio'}.`, 'var(--accent-purple)');
    }
    if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
    return true;
  }

  // =========================================================================
  // 14. BBX-SP330: Contratiempo (Skill portador Nara/Nobuko) - 1 por turno
  // =========================================================================
  function canActivateContratiempoSP330(owner = 'player', slotIndex) {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const isPlayer = (owner === 'player');
    const mySlots = isPlayer ? playtestState.slots : playtestState.opponentSlots;
    const slot = mySlots[slotIndex];
    if (!slot || !slot.character) return false;

    slot.usedSkills = slot.usedSkills || [];
    if (slot.usedSkills.includes('BBX-SP330')) return false;

    const hasFreeSlot = mySlots.some(s => s && !s.character);
    if (!hasFreeSlot) return false;

    const charCard = root.cardsDatabase[slot.character];
    const carrierName = charCard?.nombre || '';
    const myDeck = isPlayer ? playtestState.deck : playtestState.opponentDeck;

    // Buscar personaje Nara o Nobuko de nombre diferente al portador
    const targetName = carrierName.includes('Nara') ? 'Nobuko' : 'Nara';
    return myDeck.some(id => root.cardsDatabase[id]?.tipo === 'Personaje' && root.cardsDatabase[id]?.nombre?.includes(targetName));
  }

  function executeContratiempoSP330(owner = 'player', slotIndex, skIndex, onChosenChar = null) {
    if (!canActivateContratiempoSP330(owner, slotIndex)) return false;
    const isPlayer = (owner === 'player');
    const mySlots = isPlayer ? playtestState.slots : playtestState.opponentSlots;
    const myDeck = isPlayer ? playtestState.deck : playtestState.opponentDeck;
    const slot = mySlots[slotIndex];

    slot.usedSkills.push('BBX-SP330');

    const carrierName = root.cardsDatabase[slot.character]?.nombre || '';
    const targetName = carrierName.includes('Nara') ? 'Nobuko' : 'Nara';

    const candidates = myDeck.filter(id => root.cardsDatabase[id]?.tipo === 'Personaje' && root.cardsDatabase[id]?.nombre?.includes(targetName));
    const chosenId = (typeof onChosenChar === 'function') ? onChosenChar(candidates) : candidates[0];

    const dIdx = myDeck.indexOf(chosenId);
    if (dIdx !== -1) myDeck.splice(dIdx, 1);

    const freeSlotIdx = mySlots.findIndex(s => s && !s.character);
    if (freeSlotIdx !== -1) {
      mySlots[freeSlotIdx].character = chosenId;
      mySlots[freeSlotIdx].skills = [];
      mySlots[freeSlotIdx].isRotated = false;
      mySlots[freeSlotIdx].effectUsed = false;
      mySlots[freeSlotIdx].playedFromHand = false;
    }

    if (typeof root.shuffleArray === 'function') root.shuffleArray(myDeck);
    if (typeof root.addLog === 'function') {
      root.addLog(`[Contratiempo] Jugaste a <strong>${root.cardsDatabase[chosenId].nombre}</strong> a tu campo desde tu deck (Slot ${freeSlotIdx + 1}).`, 'var(--accent-purple)');
    }
    if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
    return true;
  }

  // =========================================================================
  // 15. BBX-SP331: Haruka (Personaje - Hand Activation)
  // =========================================================================
  function canActivateHarukaSP331Hand(owner = 'player') {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const isPlayer = (owner === 'player');
    const myHand = isPlayer ? playtestState.hand : playtestState.opponentHand;
    if (!myHand.includes('BBX-SP331')) return false;

    const mySlots = isPlayer ? playtestState.slots : playtestState.opponentSlots;
    const controlsChar = mySlots.some(s => s && s.character);
    if (!controlsChar) return false;

    const myDeck = isPlayer ? playtestState.deck : playtestState.opponentDeck;
    const hasVoluntad = myDeck.includes('BBX-SP008');
    const hasHarukaSkill = myDeck.some(id => root.cardsDatabase[id]?.tipo === 'Skill' && root.cardsDatabase[id]?.portador?.includes('Haruka'));

    return hasVoluntad && hasHarukaSkill;
  }

  function activateHarukaSP331Hand(owner = 'player', handIndex, targetSlotIdx = -1, onChosenHarukaSkill = null) {
    if (!canActivateHarukaSP331Hand(owner)) return false;
    const isPlayer = (owner === 'player');
    const myHand = isPlayer ? playtestState.hand : playtestState.opponentHand;
    const myGrave = isPlayer ? playtestState.grave : playtestState.opponentGrave;
    const myDeck = isPlayer ? playtestState.deck : playtestState.opponentDeck;
    const mySlots = isPlayer ? playtestState.slots : playtestState.opponentSlots;

    // 1. Descartar Haruka BBX-SP331
    const hIdx = (handIndex !== undefined && handIndex !== -1) ? handIndex : myHand.indexOf('BBX-SP331');
    if (hIdx === -1) return false;
    myHand.splice(hIdx, 1);
    myGrave.push('BBX-SP331');

    // 2. Portar 1 "¡Voluntad!" (BBX-SP008) directamente desde el deck a un personaje que controles
    const destSlotIdx = (targetSlotIdx !== -1 && mySlots[targetSlotIdx]?.character) ? targetSlotIdx : mySlots.findIndex(s => s && s.character);
    const vIdx = myDeck.indexOf('BBX-SP008');
    if (vIdx !== -1 && destSlotIdx !== -1) {
      myDeck.splice(vIdx, 1);
      mySlots[destSlotIdx].skills.push('BBX-SP008');
      if (typeof root.addLog === 'function') {
        root.addLog(`[Efecto Haruka SP331] Equipaste <strong>¡Voluntad!</strong> desde tu deck a ${root.cardsDatabase[mySlots[destSlotIdx].character].nombre}.`, 'var(--accent-purple)');
      }
    }

    // 3. Enviar 1 Skill propia de Haruka en tu deck al cementerio
    const harukaSkillsInDeck = myDeck.filter(id => root.cardsDatabase[id]?.tipo === 'Skill' && root.cardsDatabase[id]?.portador?.includes('Haruka'));
    if (harukaSkillsInDeck.length > 0) {
      const chosenId = (typeof onChosenHarukaSkill === 'function') ? onChosenHarukaSkill(harukaSkillsInDeck) : harukaSkillsInDeck[0];
      const dIdx = myDeck.indexOf(chosenId);
      if (dIdx !== -1) myDeck.splice(dIdx, 1);
      myGrave.push(chosenId);
      if (typeof root.addLog === 'function') {
        root.addLog(`[Efecto Haruka SP331] Enviaste <strong>${root.cardsDatabase[chosenId].nombre}</strong> de tu deck al cementerio.`, 'var(--accent-purple)');
      }
    }

    if (typeof root.shuffleArray === 'function') root.shuffleArray(myDeck);
    if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
    return true;
  }

  // =========================================================================
  // Exportar todas las funciones al scope global
  // =========================================================================
  const exportsObj = {
    checkAndTriggerTajoVentada,
    canActivateBusquedaSP315,
    executeBusquedaSP315,
    executeEncantamientoSP316,
    checkAndTriggerLynaSP317Play,
    checkAndTriggerChiakoSP319AttackTarget,
    executeDobleLanzamientoSP321,
    canActivateOcasoInsidiosoSP322,
    executeOcasoInsidiosoSP322,
    canActivateFundicionSP323,
    executeFundicionSP323,
    canActivateRecalcularSP324,
    executeRecalcularSP324,
    checkAndTriggerPorAlla,
    activateEishetSP326Hand,
    canActivateCaosCarmesiSP328,
    executeCaosCarmesiSP328,
    checkAndTriggerFuegoDigital,
    canActivateContratiempoSP330,
    executeContratiempoSP330,
    canActivateHarukaSP331Hand,
    activateHarukaSP331Hand
  };

  if (root) Object.assign(root, exportsObj);
  if (typeof window !== 'undefined') Object.assign(window, exportsObj);
  if (typeof global !== 'undefined') Object.assign(global, exportsObj);
  if (typeof globalThis !== 'undefined') Object.assign(globalThis, exportsObj);

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
