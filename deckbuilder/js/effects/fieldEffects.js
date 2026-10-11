/**
 * Skill Blast X - Field Effects
 * Registro unificado de activaciones y efectos en campo para Personajes y Skills equipadas.
 * Garantiza paridad total entre Jugador (UI), Rival en Sandbox e IA (Duelos automáticos).
 */

(function(root) {
  'use strict';

  function getState(owner = 'player') {
    const isPlayer = owner === 'player';
    const state = (typeof root.playtestState !== 'undefined' && root.playtestState) ? root.playtestState : (typeof playtestState !== 'undefined' ? playtestState : {});
    return {
      isPlayer,
      state,
      mySlots: (isPlayer ? state.slots : state.opponentSlots) || [],
      oppSlots: (isPlayer ? state.opponentSlots : state.slots) || [],
      myHand: (isPlayer ? state.hand : state.opponentHand) || [],
      oppHand: (isPlayer ? state.opponentHand : state.hand) || [],
      myDeck: (isPlayer ? state.deck : state.opponentDeck) || [],
      oppDeck: (isPlayer ? state.opponentDeck : state.deck) || [],
      myGrave: (isPlayer ? state.grave : state.opponentGrave) || [],
      oppGrave: (isPlayer ? state.opponentGrave : state.grave) || [],
      myBench: (isPlayer ? state.bench : state.opponentBench) || [],
      oppBench: (isPlayer ? state.opponentBench : state.bench) || [],
      tag: isPlayer ? '[Efecto Campo]' : '[Rival - Efecto Campo]'
    };
  }

  function logMsg(msg, color = 'var(--accent-purple)') {
    if (typeof root.addLog === 'function') root.addLog(msg, color);
    else if (typeof addLog === 'function') addLog(msg, color);
  }

  function getCard(id) {
    if (typeof root.cardsDatabase !== 'undefined' && root.cardsDatabase[id]) return root.cardsDatabase[id];
    if (typeof cardsDatabase !== 'undefined' && cardsDatabase[id]) return cardsDatabase[id];
    return null;
  }

  function shuffle(arr) {
    if (typeof root.shuffleArray === 'function') root.shuffleArray(arr);
    else if (typeof shuffleArray === 'function') shuffleArray(arr);
  }

  function updateView() {
    if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
    else if (typeof updatePlaytestView === 'function') updatePlaytestView();
  }

  const FieldEffects = {
    /**
     * Manejadores para efectos activos de Personajes en campo
     */
    characterHandlers: {
      // Haruka (BBX-SP001): Si no porta Skill, robar 1 carta
      'BBX-SP001': (slotIndex, owner = 'player', opts = {}, cb = null) => {
        const { state, mySlots, myDeck, myHand, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || (slot.skills && slot.skills.length > 0)) {
          if (cb) cb(false);
          return false;
        }
        const drawBlocked = (owner === 'player' ? state.cannotDrawByEffectsThisTurn : state.opponentCannotDrawByEffectsThisTurn) ||
          (typeof root.isDrawByCharacterBlocked === 'function' && root.isDrawByCharacterBlocked(owner));
        if (drawBlocked || myDeck.length === 0) {
          if (cb) cb(false);
          return false;
        }
        const drawn = myDeck.shift();
        myHand.push(drawn);
        slot.effectUsed = true;
        logMsg(`${tag} Haruka (SP001) robó 1 carta de su deck.`, 'var(--accent-purple)');
        updateView();
        if (cb) cb(true);
        return true;
      },

      // Marina (BBX-SP003): Poner 1 carta de mano en el fondo del mazo (coste), robar 1
      'BBX-SP003': (slotIndex, owner = 'player', opts = {}, cb = null) => {
        const { mySlots, myDeck, myHand, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || myHand.length === 0 || myDeck.length === 0) {
          if (cb) cb(false);
          return false;
        }
        const returnedIdx = (opts && typeof opts.handIndex === 'number' && opts.handIndex >= 0) ? opts.handIndex : 0;
        const returnedId = myHand.splice(returnedIdx, 1)[0];
        myDeck.push(returnedId);
        const drawn = myDeck.shift();
        myHand.push(drawn);
        slot.effectUsed = true;
        logMsg(`${tag} Marina (SP003) colocó <strong>${getCard(returnedId)?.nombre || returnedId}</strong> al fondo del deck y robó 1 carta.`, 'var(--accent-purple)');
        updateView();
        if (cb) cb(true);
        return true;
      },

      // Roy (BBX-SP005): Enviar las 2 primeras cartas del mazo al cementerio
      'BBX-SP005': (slotIndex, owner = 'player', opts = {}, cb = null) => {
        const { mySlots, myDeck, myGrave, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || myDeck.length === 0) {
          if (cb) cb(false);
          return false;
        }
        const count = Math.min(2, myDeck.length);
        const sent = [];
        for (let i = 0; i < count; i++) {
          const cid = myDeck.shift();
          myGrave.push(cid);
          sent.push(getCard(cid)?.nombre || cid);
          if (typeof root.dispatchGraveTriggers === 'function') {
            root.dispatchGraveTriggers(cid, owner, { fromZone: 'deck' });
          }
        }
        slot.effectUsed = true;
        logMsg(`${tag} Roy (SP005) envió al cementerio: ${sent.join(', ')}.`, 'var(--accent-purple)');
        updateView();
        if (cb) cb(true);
        return true;
      },

      // Tagero (BBX-SP009): Revelar 5 y buscar ¡Explosión trueno! (BBX-SP021)
      'BBX-SP009': (slotIndex, owner = 'player', opts = {}, cb = null) => {
        const { mySlots, myDeck, myHand, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || myDeck.length === 0) {
          if (cb) cb(false);
          return false;
        }
        const count = Math.min(5, myDeck.length);
        const revealed = myDeck.splice(0, count);
        const matches = [];
        const rest = [];
        revealed.forEach(id => {
          if (id === 'BBX-SP021') matches.push(id);
          else rest.push(id);
        });
        matches.forEach(id => myHand.push(id));
        rest.forEach(id => myDeck.push(id));
        shuffle(myDeck);
        slot.effectUsed = true;
        logMsg(`${tag} Tagero (SP009) reveló ${count} cartas y añadió ${matches.length} copia(s) de ¡Explosión trueno! a la mano.`, 'var(--accent-purple)');
        updateView();
        if (cb) cb(true);
        return true;
      },

      // Sophia (BBX-SP011): Requisito 2+ Skills, portar Control del pensar (BBX-SP012) desde deck
      'BBX-SP011': (slotIndex, owner = 'player', opts = {}, cb = null) => {
        const { mySlots, myDeck, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || !slot.skills || slot.skills.length < 2) {
          if (cb) cb(false);
          return false;
        }
        const idx = myDeck.indexOf('BBX-SP012');
        if (idx === -1) {
          if (cb) cb(false);
          return false;
        }
        const pulled = myDeck.splice(idx, 1)[0];
        slot.skills.push(pulled);
        shuffle(myDeck);
        slot.effectUsed = true;
        logMsg(`${tag} Sophia (SP011) portó directamente Control del pensar (SP012) desde el deck.`, 'var(--accent-purple)');
        updateView();
        if (cb) cb(true);
        return true;
      },

      // Bao (BBX-SP013): Requisito 3+ Skills, ver mano rival y descartar 1 carta
      'BBX-SP013': (slotIndex, owner = 'player', opts = {}, cb = null) => {
        const { mySlots, oppHand, oppGrave, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || !slot.skills || slot.skills.length < 3 || oppHand.length === 0) {
          if (cb) cb(false);
          return false;
        }
        const discardIdx = (opts && typeof opts.oppHandIndex === 'number' && opts.oppHandIndex >= 0) ? opts.oppHandIndex : 0;
        const discarded = oppHand.splice(discardIdx, 1)[0];
        oppGrave.push(discarded);
        slot.effectUsed = true;
        logMsg(`${tag} Bao (SP013) envió al cementerio <strong>${getCard(discarded)?.nombre || discarded}</strong> de la mano rival.`, 'var(--accent-purple)');
        if (typeof root.dispatchGraveTriggers === 'function') {
          root.dispatchGraveTriggers(discarded, owner === 'player' ? 'opponent' : 'player', { fromZone: 'hand' });
        }
        updateView();
        if (cb) cb(true);
        return true;
      },

      // Marina (BBX-SP017): Revelar 2 del deck, si hay Skill agregar 1 a mano
      'BBX-SP017': (slotIndex, owner = 'player', opts = {}, cb = null) => {
        const { mySlots, myDeck, myHand, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || myDeck.length < 2) {
          if (cb) cb(false);
          return false;
        }
        const revealed = myDeck.splice(0, 2);
        const skillIdx = revealed.findIndex(id => getCard(id)?.tipo === 'Skill');
        if (skillIdx !== -1) {
          const chosen = revealed.splice(skillIdx, 1)[0];
          myHand.push(chosen);
          revealed.forEach(id => myDeck.push(id));
          shuffle(myDeck);
          logMsg(`${tag} Marina (SP017) añadió la Skill <strong>${getCard(chosen)?.nombre || chosen}</strong> a su mano.`, 'var(--accent-purple)');
        } else {
          revealed.forEach(id => myDeck.push(id));
          shuffle(myDeck);
          logMsg(`${tag} Marina (SP017) reveló 2 cartas (ninguna era Skill) y barajó el deck.`, 'var(--text-muted)');
        }
        slot.effectUsed = true;
        updateView();
        if (cb) cb(true);
        return true;
      },

      // Katshi (BBX-SP024): Descartar 1 carta de mano, robar 1
      'BBX-SP024': (slotIndex, owner = 'player', opts = {}, cb = null) => {
        const { mySlots, myHand, myGrave, myDeck, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || myHand.length === 0 || myDeck.length === 0) {
          if (cb) cb(false);
          return false;
        }
        const discardIdx = (opts && typeof opts.handIndex === 'number' && opts.handIndex >= 0) ? opts.handIndex : 0;
        const discarded = myHand.splice(discardIdx, 1)[0];
        myGrave.push(discarded);
        const drawn = myDeck.shift();
        myHand.push(drawn);
        slot.effectUsed = true;
        logMsg(`${tag} Katshi (SP024) descartó <strong>${getCard(discarded)?.nombre || discarded}</strong> y robó 1 carta.`, 'var(--accent-purple)');
        updateView();
        if (cb) cb(true);
        return true;
      },

      // Bao (BBX-SP046): Requisito 1+ Skills, robar 2 cartas
      'BBX-SP046': (slotIndex, owner = 'player', opts = {}, cb = null) => {
        const { mySlots, myDeck, myHand, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || !slot.skills || slot.skills.length < 1 || myDeck.length < 2) {
          if (cb) cb(false);
          return false;
        }
        const d1 = myDeck.shift();
        const d2 = myDeck.shift();
        myHand.push(d1, d2);
        slot.effectUsed = true;
        logMsg(`${tag} Bao (SP046) robó 2 cartas de su deck.`, 'var(--accent-purple)');
        updateView();
        if (cb) cb(true);
        return true;
      },

      // Haruka (BBX-SP244) Modo Arcano: Requisito 3+ Skills, buscar Skill Haruka en deck
      'BBX-SP244': (slotIndex, owner = 'player', opts = {}, cb = null) => {
        const { state, mySlots, myDeck, myHand, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || !slot.skills || slot.skills.length < 3) {
          if (cb) cb(false);
          return false;
        }
        const isHarukaSkill = id => {
          const c = getCard(id);
          return c && c.tipo === 'Skill' && c.portador && c.portador.includes('Haruka');
        };
        const harukaSkills = myDeck.filter(isHarukaSkill);
        if (harukaSkills.length === 0) {
          if (cb) cb(false);
          return false;
        }

        const applyChoice = (targetId) => {
          const realIdx = myDeck.indexOf(targetId);
          if (realIdx === -1) {
            if (cb) cb(false);
            return false;
          }
          myDeck.splice(realIdx, 1);
          myHand.push(targetId);
          shuffle(myDeck);
          slot.effectUsed = true;
          logMsg(`${tag} Haruka Modo Arcano (SP244) añadió <strong>${getCard(targetId)?.nombre || targetId}</strong> a su mano y barajó el deck.`, 'var(--accent-purple)');
          if (typeof root.checkAndTriggerInestabilidad === 'function') {
            root.checkAndTriggerInestabilidad(owner);
          }
          updateView();
          if (cb) cb(true);
          return true;
        };

        if (opts && opts.targetId && myDeck.includes(opts.targetId)) {
          return applyChoice(opts.targetId);
        }

        const isAI = state && state.isDuelVsAI && owner === 'opponent';
        const openChooser = (typeof root.openCardChooserModal === 'function') ? root.openCardChooserModal : (typeof openCardChooserModal === 'function' ? openCardChooserModal : null);
        if (!isAI && openChooser && typeof document !== 'undefined' && document.body) {
          const chooserTargets = harukaSkills.map(id => ({ id, owner }));
          const title = (owner === 'player')
            ? "Haruka Modo Arcano: Selecciona 1 Skill de Haruka de tu deck para agregar a tu mano"
            : "[Rival] Haruka Modo Arcano: Selecciona 1 Skill de Haruka del deck rival para agregar a su mano";
          openChooser(chooserTargets, title, (chosenIdx) => {
            applyChoice(harukaSkills[chosenIdx]);
          }, () => {
            if (cb) cb(false);
          });
          return true;
        }

        return applyChoice(harukaSkills[0]);
      },

      // Marina (BBX-SP249): Requisito 1+ Skills, portar Resplandor certero (BBX-SP215) desde deck
      'BBX-SP249': (slotIndex, owner = 'player', opts = {}, cb = null) => {
        const { mySlots, myDeck, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || !slot.skills || slot.skills.length < 1) {
          if (cb) cb(false);
          return false;
        }
        const idx = myDeck.indexOf('BBX-SP215');
        if (idx === -1) {
          if (cb) cb(false);
          return false;
        }
        const pulled = myDeck.splice(idx, 1)[0];
        slot.skills.push(pulled);
        shuffle(myDeck);
        slot.effectUsed = true;
        logMsg(`${tag} Marina (SP249) portó Resplandor certero (SP215) desde el deck.`, 'var(--accent-purple)');
        updateView();
        if (cb) cb(true);
        return true;
      },

      // Deida (BBX-SP258): Requisito 1+ Skills, poner 1 Personaje del deck a la banca
      'BBX-SP258': (slotIndex, owner = 'player', opts = {}, cb = null) => {
        const { state, mySlots, myDeck, myBench, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || !slot.skills || slot.skills.length < 1) {
          if (typeof alert === 'function' && typeof document !== 'undefined') alert("Deida no cumple el requisito (1 o más Skills).");
          if (cb) cb(false);
          return false;
        }
        if (myBench.length >= 3) {
          if (typeof alert === 'function' && typeof document !== 'undefined') alert("Tu banca está llena (máximo 3 Personajes).");
          if (cb) cb(false);
          return false;
        }
        const personajesEnDeck = myDeck.filter(id => getCard(id)?.tipo === 'Personaje');
        if (personajesEnDeck.length === 0) {
          if (typeof alert === 'function' && typeof document !== 'undefined') alert("No hay Personajes en tu deck.");
          if (cb) cb(false);
          return false;
        }

        const applyChoice = (chosenId) => {
          const idx = myDeck.indexOf(chosenId);
          if (idx === -1) {
            if (cb) cb(false);
            return false;
          }
          const pulled = myDeck.splice(idx, 1)[0];
          myBench.push({ id: pulled, effectUsed: false });
          shuffle(myDeck);
          slot.effectUsed = true;
          logMsg(`${tag} Deida (SP258) colocó a <strong>${getCard(pulled)?.nombre || pulled}</strong> en la banca desde el deck y barajó el mazo.`, 'var(--accent-purple)');
          if (typeof root.checkAndTriggerInestabilidad === 'function') {
            root.checkAndTriggerInestabilidad(owner);
          }
          updateView();
          if (cb) cb(true);
          return true;
        };

        if (opts && opts.targetId && myDeck.includes(opts.targetId)) {
          return applyChoice(opts.targetId);
        }

        const isAI = state && state.isDuelVsAI && owner === 'opponent';
        const openChooser = (typeof root.openCardChooserModal === 'function') ? root.openCardChooserModal : (typeof openCardChooserModal === 'function' ? openCardChooserModal : null);
        if (!isAI && openChooser && typeof document !== 'undefined' && document.body) {
          const chooserTargets = personajesEnDeck.map(id => ({ id, owner }));
          const title = (owner === 'player')
            ? "Deida: Selecciona 1 Personaje de tu deck para colocar en tu Banca"
            : "[Rival] Deida: Selecciona 1 Personaje del deck rival para colocar en su Banca";
          openChooser(chooserTargets, title, (chosenIdx) => {
            const chosenId = personajesEnDeck[chosenIdx];
            applyChoice(chosenId);
          }, () => {
            if (cb) cb(false);
          });
          return true;
        }

        return applyChoice(personajesEnDeck[0]);
      },

      // Nobuko (BBX-SP259): Requisito 1+ Skills, revelar 3 del tope y añadir Personaje o Skill propia a mano
      'BBX-SP259': (slotIndex, owner = 'player', opts = {}, cb = null) => {
        const { mySlots, myDeck, myHand, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || !slot.skills || slot.skills.length < 1 || myDeck.length < 3) {
          if (cb) cb(false);
          return false;
        }
        const revealed = myDeck.splice(0, 3);
        const matchIdx = revealed.findIndex(id => {
          const c = getCard(id);
          return c && (c.tipo === 'Personaje' || (c.tipo === 'Skill' && c.portador && c.portador.includes('Nobuko')));
        });
        if (matchIdx !== -1) {
          const chosen = revealed.splice(matchIdx, 1)[0];
          myHand.push(chosen);
          revealed.forEach(id => myDeck.push(id));
          shuffle(myDeck);
          logMsg(`${tag} Nobuko (SP259) añadió <strong>${getCard(chosen)?.nombre || chosen}</strong> a la mano.`, 'var(--accent-purple)');
        } else {
          revealed.forEach(id => myDeck.push(id));
          shuffle(myDeck);
          logMsg(`${tag} Nobuko (SP259) reveló 3 cartas sin coincidencias y barajó el deck.`, 'var(--text-muted)');
        }
        slot.effectUsed = true;
        updateView();
        if (cb) cb(true);
        return true;
      },

      // Haruka (BBX-SP269): Requisito 1+ Skills, añadir 1 Haruka de deck o cementerio a mano
      'BBX-SP269': (slotIndex, owner = 'player', opts = {}, cb = null) => {
        const { mySlots, myDeck, myGrave, myHand, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || !slot.skills || slot.skills.length < 1) {
          if (cb) cb(false);
          return false;
        }
        const isHaruka = id => {
          const c = getCard(id);
          return c && c.tipo === 'Personaje' && c.nombre && c.nombre.includes('Haruka');
        };
        const deckIdx = myDeck.findIndex(isHaruka);
        if (deckIdx !== -1) {
          const pulled = myDeck.splice(deckIdx, 1)[0];
          myHand.push(pulled);
          shuffle(myDeck);
          slot.effectUsed = true;
          logMsg(`${tag} Haruka (SP269) añadió a <strong>${getCard(pulled)?.nombre || pulled}</strong> a la mano desde el deck.`, 'var(--accent-purple)');
          updateView();
          if (cb) cb(true);
          return true;
        }
        const graveIdx = myGrave.findIndex(isHaruka);
        if (graveIdx !== -1) {
          const pulled = myGrave.splice(graveIdx, 1)[0];
          myHand.push(pulled);
          slot.effectUsed = true;
          logMsg(`${tag} Haruka (SP269) añadió a <strong>${getCard(pulled)?.nombre || pulled}</strong> a la mano desde el cementerio.`, 'var(--accent-purple)');
          updateView();
          if (cb) cb(true);
          return true;
        }
        if (cb) cb(false);
        return false;
      }
    },

    /**
     * Manejadores para efectos activos de Skills equipadas en campo
     */
    skillHandlers: {
      // ¡Voluntad! (BBX-SP008): Robar 1 carta de deck (si controla solo 1 personaje, HOPT)
      'BBX-SP008': (slotIndex, skIndex, owner = 'player', opts = {}, cb = null) => {
        const { state, mySlots, myDeck, myHand, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        const charsCount = mySlots.filter(s => s && s.character).length;
        const globalUsed = state.usedGlobalEffects || [];
        const isUsed = globalUsed.includes('¡Voluntad!') || globalUsed.includes('BBX-SP008');
        const drawBlocked = (owner === 'player' ? state.cannotDrawByEffectsThisTurn : state.opponentCannotDrawByEffectsThisTurn) ||
          (typeof root.isDrawBySkillBlocked === 'function' && root.isDrawBySkillBlocked(owner));
        if (!slot || charsCount !== 1 || isUsed || drawBlocked || myDeck.length === 0) {
          if (cb) cb(false);
          return false;
        }
        const drawn = myDeck.shift();
        myHand.push(drawn);
        slot.usedSkills = slot.usedSkills || [];
        slot.usedSkills.push('BBX-SP008');
        state.usedGlobalEffects = state.usedGlobalEffects || [];
        state.usedGlobalEffects.push('¡Voluntad!');
        logMsg(`${tag} Activó ¡Voluntad! (SP008) y robó 1 carta de su deck.`, 'var(--accent-cyan)');
        updateView();
        if (cb) cb(true);
        return true;
      },

      // Investigación (BBX-SP010): Enviar 2 cartas del tope del deck al cementerio (HOPT)
      'BBX-SP010': (slotIndex, skIndex, owner = 'player', opts = {}, cb = null) => {
        const { state, mySlots, myDeck, myGrave, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        const globalUsed = state.usedGlobalEffects || [];
        const isUsed = globalUsed.includes('Investigación') || globalUsed.includes('BBX-SP010');
        if (!slot || isUsed || myDeck.length === 0) {
          if (cb) cb(false);
          return false;
        }
        const count = Math.min(2, myDeck.length);
        const sent = [];
        for (let i = 0; i < count; i++) {
          const cid = myDeck.shift();
          myGrave.push(cid);
          sent.push(getCard(cid)?.nombre || cid);
          if (typeof root.dispatchGraveTriggers === 'function') {
            root.dispatchGraveTriggers(cid, owner, { fromZone: 'deck' });
          }
        }
        slot.usedSkills = slot.usedSkills || [];
        slot.usedSkills.push('BBX-SP010');
        state.usedGlobalEffects = state.usedGlobalEffects || [];
        state.usedGlobalEffects.push('Investigación');
        logMsg(`${tag} Activó Investigación (SP010) y envió 2 cartas al cementerio: ${sent.join(', ')}.`, 'var(--accent-cyan)');
        updateView();
        if (cb) cb(true);
        return true;
      },

      // Control del pensar (BBX-SP012): Enviar al cementerio 1 Skill portada del adversario
      'BBX-SP012': (slotIndex, skIndex, owner = 'player', opts = {}, cb = null) => {
        const { mySlots, oppSlots, oppGrave, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        const targetSlots = oppSlots.filter(s => s && s.character && s.skills && s.skills.length > 0);
        if (!slot || targetSlots.length === 0) {
          if (cb) cb(false);
          return false;
        }
        const oppTargetSlot = targetSlots[0];
        const removed = oppTargetSlot.skills.shift();
        oppGrave.push(removed);
        slot.usedSkills = slot.usedSkills || [];
        slot.usedSkills.push('BBX-SP012');
        logMsg(`${tag} Activó Control del pensar (SP012) y envió al cementerio <strong>${getCard(removed)?.nombre || removed}</strong> del rival.`, 'var(--accent-cyan)');
        if (typeof root.notifySkillsRemovedByEffect === 'function') {
          root.notifySkillsRemovedByEffect(1, null, owner);
        }
        updateView();
        if (cb) cb(true);
        return true;
      },

      // ¡Desatar! (BBX-SP023): Enviar ¡Desatar! al cementerio, revelar 2 del tope del deck, añadir Skills a mano y Personajes a cementerio
      'BBX-SP023': (slotIndex, skIndex, owner = 'player', opts = {}, cb = null) => {
        const { state, mySlots, myDeck, myHand, myGrave, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        const globalUsed = state.usedGlobalEffects || [];
        const isUsed = globalUsed.includes('¡Desatar!') || globalUsed.includes('BBX-SP023');
        if (!slot || isUsed || myDeck.length < 2) {
          if (cb) cb(false);
          return false;
        }
        const realSkIdx = (skIndex >= 0 && slot.skills[skIndex] === 'BBX-SP023') ? skIndex : slot.skills.indexOf('BBX-SP023');
        if (realSkIdx !== -1) slot.skills.splice(realSkIdx, 1);
        myGrave.push('BBX-SP023');

        const revealed = myDeck.splice(0, 2);
        const addedSkills = [];
        const sentChars = [];
        revealed.forEach(cid => {
          const c = getCard(cid);
          if (c && c.tipo === 'Skill') {
            myHand.push(cid);
            addedSkills.push(c.nombre || cid);
          } else {
            myGrave.push(cid);
            sentChars.push(c?.nombre || cid);
            if (typeof root.dispatchGraveTriggers === 'function') {
              root.dispatchGraveTriggers(cid, owner, { fromZone: 'deck' });
            }
          }
        });
        state.usedGlobalEffects = state.usedGlobalEffects || [];
        state.usedGlobalEffects.push('¡Desatar!');
        logMsg(`${tag} Activó ¡Desatar! (SP023): Añadió ${addedSkills.join(', ') || 'ninguna Skill'} a mano y envió ${sentChars.join(', ') || 'ningún Personaje'} al cementerio.`, 'var(--accent-cyan)');
        updateView();
        if (cb) cb(true);
        return true;
      },

      // Preludio (BBX-SP027): Barajar 1 carta del cementerio al mazo
      'BBX-SP027': (slotIndex, skIndex, owner = 'player', opts = {}, cb = null) => {
        const { mySlots, myGrave, myDeck, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || myGrave.length === 0) {
          if (cb) cb(false);
          return false;
        }
        const cardId = (opts && opts.targetId && myGrave.includes(opts.targetId)) ? opts.targetId : myGrave[0];
        const gIdx = myGrave.indexOf(cardId);
        myGrave.splice(gIdx, 1);
        myDeck.push(cardId);
        shuffle(myDeck);
        slot.usedSkills = slot.usedSkills || [];
        slot.usedSkills.push('BBX-SP027');
        logMsg(`${tag} Activó Preludio (SP027): Barajó <strong>${getCard(cardId)?.nombre || cardId}</strong> del cementerio al mazo.`, 'var(--accent-cyan)');
        updateView();
        if (cb) cb(true);
        return true;
      },

      // Carga destello (BBX-SP033): Requisito 2+ Skills, robar 2 cartas (HOPT)
      'BBX-SP033': (slotIndex, skIndex, owner = 'player', opts = {}, cb = null) => {
        const { state, mySlots, myDeck, myHand, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        const globalUsed = state.usedGlobalEffects || [];
        const isUsed = globalUsed.includes('Carga destello') || globalUsed.includes('BBX-SP033');
        const drawBlocked = (owner === 'player' ? state.cannotDrawByEffectsThisTurn : state.opponentCannotDrawByEffectsThisTurn) ||
          (typeof root.isDrawBySkillBlocked === 'function' && root.isDrawBySkillBlocked(owner));
        if (!slot || !slot.skills || slot.skills.length < 2 || isUsed || drawBlocked || myDeck.length < 2) {
          if (cb) cb(false);
          return false;
        }
        const d1 = myDeck.shift();
        const d2 = myDeck.shift();
        myHand.push(d1, d2);
        slot.usedSkills = slot.usedSkills || [];
        slot.usedSkills.push('BBX-SP033');
        state.usedGlobalEffects = state.usedGlobalEffects || [];
        state.usedGlobalEffects.push('Carga destello');
        logMsg(`${tag} Activó Carga destello (SP033) y robó 2 cartas.`, 'var(--accent-cyan)');
        updateView();
        if (cb) cb(true);
        return true;
      },

      // Ráfaga siniestra (BBX-SP039): Permite hasta 2 ataques este turno (si no está rotado)
      'BBX-SP039': (slotIndex, skIndex, owner = 'player', opts = {}, cb = null) => {
        const { mySlots, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || slot.isRotated) {
          if (cb) cb(false);
          return false;
        }
        slot.maxAttacks = 2;
        slot.usedSkills = slot.usedSkills || [];
        slot.usedSkills.push('BBX-SP039');
        if (!slot.usedSkillIndexes) slot.usedSkillIndexes = [];
        slot.usedSkillIndexes.push(skIndex);
        logMsg(`${tag} Activó Ráfaga siniestra (SP039): El personaje puede realizar hasta 2 ataques este turno.`, 'var(--accent-purple)');
        updateView();
        if (cb) cb(true);
        return true;
      }
    },

    /**
     * Comprueba si un Personaje tiene manejador de efecto de campo
     */
    hasCharacter(cardId) {
      return !!this.characterHandlers[cardId];
    },

    /**
     * Comprueba si una Skill tiene manejador de efecto de campo
     */
    hasSkill(skillId) {
      return !!this.skillHandlers[skillId];
    },

    /**
     * Valida si un Personaje puede activar su efecto en campo
     */
    canActivateCharacter(cardId, slotIndex, owner = 'player') {
      const { state, mySlots } = getState(owner);
      const slot = mySlots[slotIndex];
      if (!slot || !slot.character || slot.character !== cardId) return false;
      if (slot.effectUsed) return false;

      const isCurrentTurn = (state.turnOwner === owner);
      if (cardId !== 'BBX-SP189' && !isCurrentTurn) return false;

      if (typeof root.isCharacterEffectBlocked === 'function' && root.isCharacterEffectBlocked(owner, slot)) {
        return false;
      }

      // Validar si el robo está bloqueado para personajes que requieren robar
      const drawBlocked = (owner === 'player' ? state.cannotDrawByEffectsThisTurn : state.opponentCannotDrawByEffectsThisTurn) ||
        (typeof root.isDrawByCharacterBlocked === 'function' && root.isDrawByCharacterBlocked(owner));
      if (['BBX-SP001', 'BBX-SP003', 'BBX-SP024', 'BBX-SP046'].includes(cardId) && drawBlocked) {
        return false;
      }

      // Requisitos específicos por personaje
      const skillsCount = (slot.skills && slot.skills.length) || 0;
      switch (cardId) {
        case 'BBX-SP001': // Haruka: Si no porta ninguna Skill
          if (skillsCount > 0) return false;
          break;
        case 'BBX-SP011': // Sophia: Requisito 2+ Skills
          if (skillsCount < 2) return false;
          break;
        case 'BBX-SP013': // Bao: Requisito 3+ Skills
          if (skillsCount < 3) return false;
          break;
        case 'BBX-SP046': // Bao: Requisito 1+ Skills
          if (skillsCount < 1) return false;
          break;
        case 'BBX-SP244': // Haruka: Requisito 3+ Skills
          if (skillsCount < 3) return false;
          break;
        case 'BBX-SP249': // Marina: Requisito 1+ Skills
          if (skillsCount < 1) return false;
          break;
        case 'BBX-SP258': // Deida: Requisito 1+ Skills
          if (skillsCount < 1) return false;
          const { myBench: dBench, myDeck: dDeck } = getState(owner);
          if (dBench && dBench.length >= 3) return false;
          if (dDeck && !dDeck.some(id => getCard(id)?.tipo === 'Personaje')) return false;
          break;
        case 'BBX-SP259': // Nobuko: Requisito 1+ Skills
        case 'BBX-SP269': // Haruka: Requisito 1+ Skills
          if (skillsCount < 1) return false;
          break;
      }

      // Consulta a RulesEngine si existe
      const rules = (typeof root.RulesEngine !== 'undefined' && root.RulesEngine) ? root.RulesEngine : null;
      if (rules && typeof rules.canActivateFromZone === 'function') {
        const check = rules.canActivateFromZone(cardId, 'field', owner);
        if (!check.allowed) return false;
      }

      return true;
    },

    /**
     * Valida si una Skill portada puede activar su efecto en campo
     */
    canActivateSkill(skillId, slotIndex, skIndex, owner = 'player') {
      const { state, mySlots } = getState(owner);
      const slot = mySlots[slotIndex];
      if (!slot || !slot.skills || !slot.skills.includes(skillId)) return false;

      const isCurrentTurn = (state.turnOwner === owner);
      if (!isCurrentTurn) return false;

      const usedSkills = slot.usedSkills || [];
      if (usedSkills.includes(skillId)) return false;

      const usedSkillIdxs = slot.usedSkillIndexes || [];
      if (typeof skIndex === 'number' && skIndex >= 0 && usedSkillIdxs.includes(skIndex)) return false;

      // Requisitos específicos por Skill
      const skillsCount = (slot.skills && slot.skills.length) || 0;
      const charsCount = mySlots.filter(s => s && s.character).length;
      const globalUsed = state.usedGlobalEffects || [];

      if (skillId === 'BBX-SP008') { // ¡Voluntad!: Si controla exactamente 1 personaje (HOPT)
        if (charsCount !== 1) return false;
        if (globalUsed.includes('¡Voluntad!') || globalUsed.includes('BBX-SP008')) return false;
      }

      if (skillId === 'BBX-SP010') { // Investigación (HOPT)
        if (globalUsed.includes('Investigación') || globalUsed.includes('BBX-SP010')) return false;
      }

      if (skillId === 'BBX-SP023') { // ¡Desatar! (HOPT)
        if (globalUsed.includes('¡Desatar!') || globalUsed.includes('BBX-SP023')) return false;
      }

      if (skillId === 'BBX-SP033') { // Carga destello: Requisito 2+ Skills (HOPT)
        if (skillsCount < 2) return false;
        if (globalUsed.includes('Carga destello') || globalUsed.includes('BBX-SP033')) return false;
      }

      if (skillId === 'BBX-SP039') { // Ráfaga siniestra: No estar rotado
        if (slot.isRotated) return false;
      }

      if (typeof root.isSkillEffectBlocked === 'function' && root.isSkillEffectBlocked(skillId, owner, slot)) {
        return false;
      }

      if (typeof root.isSkillBlockedByProximoDestino === 'function' && root.isSkillBlockedByProximoDestino(skillId, owner)) {
        return false;
      }

      const rules = (typeof root.RulesEngine !== 'undefined' && root.RulesEngine) ? root.RulesEngine : null;
      if (rules && typeof rules.canActivateFromZone === 'function') {
        const check = rules.canActivateFromZone(skillId, 'field', owner);
        if (!check.allowed) return false;
      }

      return true;
    },

    /**
     * Ejecuta el efecto del Personaje en campo
     */
    executeCharacter(cardId, slotIndex, owner = 'player', opts = {}, cb = null) {
      if (!this.canActivateCharacter(cardId, slotIndex, owner)) {
        if (cb) cb(false);
        return false;
      }
      const handler = this.characterHandlers[cardId];
      if (typeof handler === 'function') {
        return handler(slotIndex, owner, opts, cb);
      }
      return false;
    },

    /**
     * Ejecuta el efecto de la Skill equipada en campo
     */
    executeSkill(skillId, slotIndex, skIndex, owner = 'player', opts = {}, cb = null) {
      if (!this.canActivateSkill(skillId, slotIndex, skIndex, owner)) {
        if (cb) cb(false);
        return false;
      }
      const handler = this.skillHandlers[skillId];
      if (typeof handler === 'function') {
        return handler(slotIndex, skIndex, owner, opts, cb);
      }
      return false;
    }
  };

  if (typeof window !== 'undefined') window.FieldEffects = FieldEffects;
  if (typeof global !== 'undefined') global.FieldEffects = FieldEffects;
  if (typeof globalThis !== 'undefined') globalThis.FieldEffects = FieldEffects;
  if (root) root.FieldEffects = FieldEffects;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
