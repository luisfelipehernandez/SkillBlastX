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

      // Haruka (BBX-SP093): Descartar 1 carta de mano para portar 1 Skill propia de Haruka desde el deck
      'BBX-SP093': (slotIndex, owner = 'player', opts = {}, cb = null) => {
        const { state, mySlots, myHand, myDeck, myGrave, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || slot.effectUsed || myHand.length === 0) {
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

        const performEquip = (chosenSkillId) => {
          const sIdx = myDeck.indexOf(chosenSkillId);
          if (sIdx !== -1) myDeck.splice(sIdx, 1);
          slot.skills.push(chosenSkillId);
          shuffle(myDeck);
          slot.effectUsed = true;
          logMsg(`${tag} Haruka (SP093) portó <strong>${getCard(chosenSkillId)?.nombre || chosenSkillId}</strong> directamente desde su deck.`, 'var(--accent-purple)');
          updateView();
          if (cb) cb(true);
          return true;
        };

        const performDiscardAndContinue = (discardId) => {
          const dIdx = myHand.indexOf(discardId);
          if (dIdx !== -1) myHand.splice(dIdx, 1);
          myGrave.push(discardId);
          logMsg(`${tag} Haruka (SP093) descartó <strong>${getCard(discardId)?.nombre || discardId}</strong> como costo.`, 'var(--accent-purple)');

          if (typeof root.checkAndTriggerAlBorde === 'function') root.checkAndTriggerAlBorde(discardId);
          if (typeof root.checkAndTriggerReflejo === 'function') root.checkAndTriggerReflejo(discardId);
          if (typeof root.checkAndTriggerFulgorOfensivo === 'function') root.checkAndTriggerFulgorOfensivo(discardId);

          const currentSkills = myDeck.filter(isHarukaSkill);
          if (currentSkills.length === 0) {
            slot.effectUsed = true;
            updateView();
            if (cb) cb(true);
            return true;
          }

          if (opts && opts.targetId && currentSkills.includes(opts.targetId)) {
            return performEquip(opts.targetId);
          }

          const isAI = state && state.isDuelVsAI && owner === 'opponent';
          const openChooser = (typeof root.openCardChooserModal === 'function') ? root.openCardChooserModal : (typeof openCardChooserModal === 'function' ? openCardChooserModal : null);
          if (!isAI && openChooser && typeof document !== 'undefined' && document.body) {
            const chooserTargets = currentSkills.map(id => ({ id, owner }));
            openChooser(chooserTargets, "Haruka (SP093): Selecciona la Skill propia de tu deck para equipar", (chosenIdx) => {
              performEquip(currentSkills[chosenIdx]);
            }, () => {
              performEquip(currentSkills[0]);
            });
            return true;
          }

          return performEquip(currentSkills[0]);
        };

        if (opts && opts.discardId && myHand.includes(opts.discardId)) {
          return performDiscardAndContinue(opts.discardId);
        }
        if (opts && typeof opts.discardIndex === 'number' && myHand[opts.discardIndex]) {
          return performDiscardAndContinue(myHand[opts.discardIndex]);
        }

        const isAI = state && state.isDuelVsAI && owner === 'opponent';
        const openChooser = (typeof root.openCardChooserModal === 'function') ? root.openCardChooserModal : (typeof openCardChooserModal === 'function' ? openCardChooserModal : null);
        if (!isAI && openChooser && typeof document !== 'undefined' && document.body) {
          const chooserTargets = myHand.map(id => ({ id, owner }));
          openChooser(chooserTargets, "Haruka (SP093): Selecciona la carta a descartar como costo", (chosenIdx) => {
            performDiscardAndContinue(myHand[chosenIdx]);
          }, () => {
            if (cb) cb(false);
          });
          return true;
        }

        return performDiscardAndContinue(myHand[0]);
      },

      // Haruka (BBX-SP361): Requisito 2+ Skills, enviar 1 Skill portada al cementerio para revelar 3 del tope y añadir 1 Skill a mano
      'BBX-SP361': (slotIndex, owner = 'player', opts = {}, cb = null) => {
        const { state, mySlots, myDeck, myHand, myGrave, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || slot.effectUsed || !slot.skills || slot.skills.length < 2 || myDeck.length === 0) {
          if (cb) cb(false);
          return false;
        }

        const performRevealAndAdd = (removedSkillId) => {
          logMsg(`${tag} Haruka (SP361) envió <strong>${getCard(removedSkillId)?.nombre || removedSkillId}</strong> al cementerio.`, 'var(--accent-purple)');
          slot.effectUsed = true;

          const revealCount = Math.min(3, myDeck.length);
          const revealed = myDeck.splice(0, revealCount);
          const revealedSkills = revealed.filter(id => {
            const c = getCard(id);
            return c && c.tipo === 'Skill';
          });

          if (revealedSkills.length === 0) {
            revealed.forEach(id => myDeck.push(id));
            shuffle(myDeck);
            logMsg(`${tag} Haruka (SP361) reveló ${revealCount} cartas (ninguna era Skill) y barajó el deck.`, 'var(--text-muted)');
            updateView();
            if (cb) cb(true);
            return true;
          }

          const finishChoice = (chosenId) => {
            const rIdx = revealed.indexOf(chosenId);
            if (rIdx !== -1) revealed.splice(rIdx, 1);
            myHand.push(chosenId);
            revealed.forEach(id => myDeck.push(id));
            shuffle(myDeck);
            logMsg(`${tag} Haruka (SP361) reveló ${revealCount} cartas y agregó <strong>${getCard(chosenId)?.nombre || chosenId}</strong> a su mano. Barajó el resto.`, 'var(--accent-cyan)');
            if (typeof root.checkAndTriggerInestabilidad === 'function') {
              root.checkAndTriggerInestabilidad(owner);
            }
            updateView();
            if (cb) cb(true);
            return true;
          };

          if (opts && opts.chosenSkillId && revealedSkills.includes(opts.chosenSkillId)) {
            return finishChoice(opts.chosenSkillId);
          }

          const isAI = state && state.isDuelVsAI && owner === 'opponent';
          const openChooser = (typeof root.openCardChooserModal === 'function') ? root.openCardChooserModal : (typeof openCardChooserModal === 'function' ? openCardChooserModal : null);
          if (!isAI && openChooser && typeof document !== 'undefined' && document.body) {
            const chooserTargets = revealedSkills.map(id => ({ id, owner }));
            openChooser(chooserTargets, "Haruka (SP361): Selecciona 1 Skill revelada para agregar a tu mano", (chosenIdx) => {
              finishChoice(revealedSkills[chosenIdx]);
            }, () => {
              finishChoice(revealedSkills[0]);
            });
            return true;
          }

          return finishChoice(revealedSkills[0]);
        };

        let skillToRemove = slot.skills[0];
        if (opts && opts.skillId && slot.skills.includes(opts.skillId)) {
          skillToRemove = opts.skillId;
        } else if (opts && typeof opts.skillIndex === 'number' && slot.skills[opts.skillIndex]) {
          skillToRemove = slot.skills[opts.skillIndex];
        }

        const skIdx = slot.skills.indexOf(skillToRemove);
        if (skIdx !== -1) slot.skills.splice(skIdx, 1);
        myGrave.push(skillToRemove);

        return performRevealAndAdd(skillToRemove);
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

      // Marina (BBX-SP168): Enviar Skills portadas al cementerio hasta la cantidad de Personajes Marina en tu cementerio
      'BBX-SP168': (slotIndex, owner = 'player', opts = {}, cb = null) => {
        const { mySlots, oppSlots, myGrave, oppGrave, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || slot.effectUsed) {
          if (cb) cb(false);
          return false;
        }
        const marinaGraveCount = myGrave.filter(id => {
          const c = getCard(id);
          return c && c.tipo === 'Personaje' && c.nombre.includes("Marina");
        }).length;
        if (marinaGraveCount === 0) {
          if (cb) cb(false);
          return false;
        }
        const oppSkills = [];
        oppSlots.forEach((s, sIdx) => {
          if (s && s.skills && s.skills.length > 0) {
            s.skills.forEach((skId, skIdx) => {
              oppSkills.push({ sIdx, skIdx, skId });
            });
          }
        });
        if (oppSkills.length === 0) {
          if (cb) cb(false);
          return false;
        }
        const removeCount = Math.min(marinaGraveCount, oppSkills.length);
        const removedNames = [];
        for (let i = 0; i < removeCount; i++) {
          const target = oppSkills[i];
          const oppSlot = oppSlots[target.sIdx];
          if (oppSlot && oppSlot.skills) {
            const rIdx = oppSlot.skills.indexOf(target.skId);
            if (rIdx !== -1) {
              const removed = oppSlot.skills.splice(rIdx, 1)[0];
              oppGrave.push(removed);
              removedNames.push(getCard(removed)?.nombre || removed);
            }
          }
        }
        slot.effectUsed = true;
        logMsg(`${tag} Marina (SP168) envió al cementerio ${removedNames.length} Skill(s) portadas del rival: <strong>${removedNames.join(', ')}</strong>.`, 'var(--accent-purple)');
        updateView();
        if (cb) cb(true);
        return true;
      },

      // Marina (BBX-SP267): Requisito 1+ Skills. Revelar 4 cartas del tope del deck, si hay Personaje Marina o Skill propia de Marina, agregar 1 a la mano.
      'BBX-SP267': (slotIndex, owner = 'player', opts = {}, cb = null) => {
        const { mySlots, myDeck, myHand, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || !slot.skills || slot.skills.length < 1 || myDeck.length === 0) {
          if (cb) cb(false);
          return false;
        }
        const count = Math.min(4, myDeck.length);
        const revealed = myDeck.slice(0, count);
        const isEligible = id => {
          const c = getCard(id);
          if (!c) return false;
          const isMarinaChar = c.tipo === 'Personaje' && c.nombre.includes("Marina");
          const isMarinaSkill = c.tipo === 'Skill' && c.portador && c.portador.includes("Marina");
          return isMarinaChar || isMarinaSkill;
        };
        const eligible = revealed.filter(isEligible);
        if (eligible.length === 0) {
          shuffle(myDeck);
          logMsg(`${tag} Marina (SP267) reveló ${count} carta(s) del tope del deck (ninguna era Personaje Marina ni Skill propia de Marina) y barajó el mazo.`, 'var(--text-muted)');
        } else {
          const chosen = eligible[0];
          const dIdx = myDeck.indexOf(chosen);
          if (dIdx !== -1) myDeck.splice(dIdx, 1);
          myHand.push(chosen);
          shuffle(myDeck);
          logMsg(`${tag} Marina (SP267) reveló ${count} cartas y añadió <strong>${getCard(chosen)?.nombre || chosen}</strong> a la mano. Barajó el mazo.`, 'var(--accent-purple)');
          if (typeof checkAndTriggerInestabilidad === 'function') checkAndTriggerInestabilidad(owner);
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

      // ¡Desatar! (BBX-SP023): Enviar ¡Desatar! al cementerio, revelar 2 del tope del deck, añadir Skills a mano y barajar el resto al deck
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
        const returnedCards = [];
        revealed.forEach(cid => {
          const c = getCard(cid);
          if (c && c.tipo === 'Skill') {
            myHand.push(cid);
            addedSkills.push(c.nombre || cid);
          } else {
            myDeck.push(cid);
            returnedCards.push(c?.nombre || cid);
          }
        });
        shuffle(myDeck);
        state.usedGlobalEffects = state.usedGlobalEffects || [];
        state.usedGlobalEffects.push('¡Desatar!');
        logMsg(`${tag} Activó ¡Desatar! (SP023): Reveló 2 cartas, añadió ${addedSkills.join(', ') || 'ninguna Skill'} a mano y barajó el deck.`, 'var(--accent-cyan)');
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
      },

      // Momento oportuno (BBX-SP188): Enviar 1 Skill propia de Haruka desde el deck al cementerio
      'BBX-SP188': (slotIndex, skIndex, owner = 'player', opts = {}, cb = null) => {
        const { state, mySlots, myDeck, myGrave, myHand, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        const isUsed = (typeof skIndex === 'number' && skIndex >= 0)
          ? (slot.usedSkillIndexes || []).includes(skIndex)
          : (slot.usedSkills || []).includes('BBX-SP188');
        if (!slot || isUsed || myDeck.length === 0) {
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

        const applyMill = (milledId) => {
          const mIdx = myDeck.indexOf(milledId);
          if (mIdx !== -1) myDeck.splice(mIdx, 1);
          myGrave.push(milledId);
          shuffle(myDeck);
          slot.usedSkills = slot.usedSkills || [];
          slot.usedSkillIndexes = slot.usedSkillIndexes || [];
          if (typeof skIndex === 'number' && skIndex >= 0) {
            if (!slot.usedSkillIndexes.includes(skIndex)) slot.usedSkillIndexes.push(skIndex);
          } else {
            slot.usedSkills.push('BBX-SP188');
          }
          logMsg(`${tag} Activó Momento oportuno (SP188): Envió <strong>${getCard(milledId)?.nombre || milledId}</strong> al cementerio desde el deck.`, 'var(--accent-purple)');

          // Trigger si es Fulgor ofensivo (SP162)
          if (milledId === 'BBX-SP162') {
            const fIdx = myGrave.indexOf('BBX-SP162');
            if (fIdx !== -1) {
              myGrave.splice(fIdx, 1);
              slot.skills.push('BBX-SP162');
              logMsg(`${tag} [Efecto Fulgor ofensivo] Se portó automáticamente desde el cementerio a Haruka.`, 'var(--accent-cyan)');
            }
          }

          // Trigger si es Energía arcana (SP268)
          if (milledId === 'BBX-SP268') {
            const avIdx = myDeck.indexOf('BBX-SP244');
            if (avIdx !== -1) {
              const avCard = myDeck.splice(avIdx, 1)[0];
              myHand.push(avCard);
              shuffle(myDeck);
              logMsg(`${tag} [Efecto Energía arcana] Añadió a <strong>${getCard(avCard)?.nombre || 'Haruka Modo Arcano'}</strong> a la mano desde el deck.`, 'var(--accent-cyan)');
            }
          }

          if (typeof root.dispatchGraveTriggers === 'function') {
            root.dispatchGraveTriggers(milledId, 'deck', owner);
          }

          updateView();
          if (cb) cb(true);
          return true;
        };

        if (opts && opts.targetId && harukaSkills.includes(opts.targetId)) {
          return applyMill(opts.targetId);
        }

        const isAI = state && state.isDuelVsAI && owner === 'opponent';
        const openChooser = (typeof root.openCardChooserModal === 'function') ? root.openCardChooserModal : (typeof openCardChooserModal === 'function' ? openCardChooserModal : null);
        if (!isAI && openChooser && typeof document !== 'undefined' && document.body) {
          const chooserTargets = harukaSkills.map(id => ({ id, owner }));
          openChooser(chooserTargets, "Momento oportuno (SP188): Selecciona 1 Skill de Haruka de tu deck para enviar al cementerio", (chosenIdx) => {
            applyMill(harukaSkills[chosenIdx]);
          }, () => {
            if (cb) cb(false);
          });
          return true;
        }

        return applyMill(harukaSkills[0]);
      },

      // Mapa (BBX-SP264): Revelar las primeras 5 cartas del tope del deck, robar 1 Personaje/Skill y descartar 1 carta de la mano
      'BBX-SP264': (slotIndex, skIndex, owner = 'player', opts = {}, cb = null) => {
        const { state, mySlots, myDeck, myHand, myGrave, tag } = getState(owner);
        const slot = mySlots[slotIndex];
        if (!slot || myDeck.length < 5) {
          if (cb) cb(false);
          return false;
        }

        const isThisIndexUsed = (typeof skIndex === 'number' && skIndex >= 0)
          ? (slot.usedSkillIndexes || []).includes(skIndex)
          : (slot.usedSkills || []).includes('BBX-SP264');
        if (isThisIndexUsed) {
          if (cb) cb(false);
          return false;
        }

        slot.usedSkills = slot.usedSkills || [];
        slot.usedSkillIndexes = slot.usedSkillIndexes || [];
        if (typeof skIndex === 'number' && skIndex >= 0) {
          if (!slot.usedSkillIndexes.includes(skIndex)) slot.usedSkillIndexes.push(skIndex);
        } else {
          slot.usedSkills.push('BBX-SP264');
        }

        const revealed = myDeck.slice(0, 5);
        logMsg(`${tag} Activó Mapa (SP264): Reveló las primeras 5 cartas del deck.`, 'var(--accent-cyan)');

        const eligible = revealed.filter(id => {
          const c = getCard(id);
          return c && (c.tipo === 'Personaje' || c.tipo === 'Skill');
        });

        const finishMapa = (selectedId) => {
          const rIdx = myDeck.indexOf(selectedId);
          if (rIdx !== -1) myDeck.splice(rIdx, 1);
          myHand.push(selectedId);
          shuffle(myDeck);
          logMsg(`${tag} Agregó <strong>${getCard(selectedId)?.nombre || selectedId}</strong> a la mano por Mapa.`, 'var(--accent-cyan)');

          // Descarte de 1 carta de la mano
          const doDiscard = (discardId) => {
            const hIdx = myHand.indexOf(discardId);
            if (hIdx !== -1) myHand.splice(hIdx, 1);
            myGrave.push(discardId);
            logMsg(`${tag} Descartó <strong>${getCard(discardId)?.nombre || discardId}</strong> de su mano al cementerio.`, 'var(--accent-purple)');

            if (typeof root.dispatchGraveTriggers === 'function') {
              root.dispatchGraveTriggers(discardId, 'hand', owner);
            }
            updateView();
            if (cb) cb(true);
          };

          if (opts && opts.discardId && myHand.includes(opts.discardId)) {
            return doDiscard(opts.discardId);
          }

          const isAI = state && state.isDuelVsAI && owner === 'opponent';
          const openChooser = (typeof root.openCardChooserModal === 'function') ? root.openCardChooserModal : (typeof openCardChooserModal === 'function' ? openCardChooserModal : null);
          if (!isAI && openChooser && myHand.length > 0 && typeof document !== 'undefined' && document.body) {
            openChooser(myHand.map(id => ({ id, owner })), "Mapa (SP264): Selecciona 1 carta de tu mano para descartar al cementerio", (discardIdx) => {
              doDiscard(myHand[discardIdx]);
            });
            return true;
          }

          if (myHand.length > 0) {
            doDiscard(myHand[myHand.length - 1]);
          } else {
            updateView();
            if (cb) cb(true);
          }
          return true;
        };

        if (opts && opts.selectedId && eligible.includes(opts.selectedId)) {
          return finishMapa(opts.selectedId);
        }

        if (eligible.length > 0) {
          const isAI = state && state.isDuelVsAI && owner === 'opponent';
          const openChooser = (typeof root.openCardChooserModal === 'function') ? root.openCardChooserModal : (typeof openCardChooserModal === 'function' ? openCardChooserModal : null);
          if (!isAI && openChooser && typeof document !== 'undefined' && document.body) {
            openChooser(eligible.map(id => ({ id, owner })), "Mapa (SP264): Selecciona 1 carta revelada para agregar a tu mano", (chosenIdx) => {
              finishMapa(eligible[chosenIdx]);
            }, () => {
              shuffle(myDeck);
              updateView();
              if (cb) cb(false);
            });
            return true;
          }
          return finishMapa(eligible[0]);
        } else {
          shuffle(myDeck);
          logMsg(`${tag} No hubo cartas elegibles entre las reveladas por Mapa.`, 'var(--text-muted)');
          updateView();
          if (cb) cb(true);
          return true;
        }
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
        case 'BBX-SP168': {
          const { myGrave: mGrave, oppSlots: oSlots } = getState(owner);
          const marinaGraveCount = mGrave.filter(id => {
            const c = getCard(id);
            return c && c.tipo === 'Personaje' && c.nombre && c.nombre.includes("Marina");
          }).length;
          if (marinaGraveCount === 0) return false;
          const oppHasSkills = oSlots.some(s => s && s.skills && s.skills.length > 0);
          if (!oppHasSkills) return false;
          break;
        }
        case 'BBX-SP093': { // Haruka: Descartar 1 carta de mano para portar 1 Skill propia de Haruka desde el deck
          const { myHand, myDeck } = getState(owner);
          if (myHand.length === 0) return false;
          const hasHarukaSkill = myDeck.some(id => {
            const c = getCard(id);
            return c && c.tipo === 'Skill' && c.portador && c.portador.includes("Haruka");
          });
          if (!hasHarukaSkill) return false;
          if (typeof root.canEquipFromZone === 'function' && !root.canEquipFromZone('deck')) return false;
          break;
        }
        case 'BBX-SP361': { // Haruka: Requisito 2+ Skills
          if (skillsCount < 2) return false;
          const { myDeck } = getState(owner);
          if (myDeck.length === 0) return false;
          break;
        }
        case 'BBX-SP259': // Nobuko: Requisito 1+ Skills
        case 'BBX-SP267': // Marina: Requisito 1+ Skills
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

      if (typeof skIndex === 'number' && skIndex >= 0) {
        const usedSkillIdxs = slot.usedSkillIndexes || [];
        if (usedSkillIdxs.includes(skIndex)) return false;
      } else {
        const usedSkills = slot.usedSkills || [];
        if (usedSkills.includes(skillId)) return false;
      }

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

      if (skillId === 'BBX-SP188') { // Momento oportuno
        const { myDeck } = getState(owner);
        const hasHarukaSkill = myDeck.some(id => {
          const c = getCard(id);
          return c && c.tipo === 'Skill' && c.portador && c.portador.includes("Haruka");
        });
        if (!hasHarukaSkill) return false;
      }

      if (skillId === 'BBX-SP264') { // Mapa: Requiere al menos 5 cartas en el deck
        const { myDeck } = getState(owner);
        if (myDeck.length < 5) return false;
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
