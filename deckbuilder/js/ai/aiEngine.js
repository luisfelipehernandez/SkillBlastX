/**
 * Skill Blast X - Central AI Engine (Estilo Motor de IA / Skill Blast X)
 * Orquesta la toma de decisiones, flujo de turno y consultas a los ejecutores de mazo.
 */

(function(root) {
  'use strict';

  // Sincronizar referencias en entornos Node / Test
  if (typeof global !== 'undefined') {
    if (root && !root.cardsDatabase && global.cardsDatabase) root.cardsDatabase = global.cardsDatabase;
    if (root && !root.addLog && global.addLog) root.addLog = global.addLog;
    if (root && !root.shuffleArray && global.shuffleArray) root.shuffleArray = global.shuffleArray;
  }

  const AIEngine = {
    activeExecutor: null,

    /**
     * Obtiene o detecta el ejecutor apropiado según las cartas del mazo rival.
     */
    getExecutor() {
      if (this.activeExecutor) return this.activeExecutor;

      // Buscar si el mazo del oponente tiene arquetipo Haruka
      const oppDeck = (typeof playtestState !== 'undefined' && playtestState.opponentDeck) ? playtestState.opponentDeck : [];
      const oppHand = (typeof playtestState !== 'undefined' && playtestState.opponentHand) ? playtestState.opponentHand : [];
      const oppSlots = (typeof playtestState !== 'undefined' && playtestState.opponentSlots) ? playtestState.opponentSlots : [];
      const allCards = [...oppDeck, ...oppHand, ...oppSlots.map(s => s?.character).filter(Boolean)];

      const hasHaruka = allCards.some(id => {
        const c = root.cardsDatabase ? root.cardsDatabase[id] : null;
        return c && ((c.nombre && c.nombre.includes('Haruka')) || (c.portador && c.portador.includes('Haruka')));
      });

      if (hasHaruka && root.HarukaExecutor) {
        this.activeExecutor = root.HarukaExecutor;
        return this.activeExecutor;
      }

      // Por defecto fallback a HarukaExecutor si existe
      return root.HarukaExecutor || null;
    },

    setExecutor(executor) {
      this.activeExecutor = executor;
    },

    /**
     * Ejecuta el turno completo de la IA paso a paso con registro visual en el log.
     */
    async executeOpponentTurn(options = {}) {
      if (typeof playtestState === 'undefined' || !playtestState) return false;
      if (playtestState.matchEnded) {
        if (typeof root.addLog === 'function') {
          root.addLog(`🏁 [Fin de Partida] El duelo ha concluido. La IA no realiza acciones.`, 'var(--accent-purple)');
        }
        return false;
      }
      if (playtestState.turnOwner !== 'opponent') return false;

      const executor = this.getExecutor();
      if (!executor) {
        console.warn("[AIEngine] No hay un ejecutor configurado para el mazo rival.");
        return false;
      }

      const log = (msg, color = 'var(--accent-cyan)') => {
        if (typeof root.addLog === 'function') root.addLog(msg, color);
      };

      const delay = (ms) => ((options && options.skipDelay) ? Promise.resolve() : new Promise(resolve => setTimeout(resolve, ms)));

      const waitForPendingModalsAndMenus = async (maxWaitMs = 15000) => {
        if (typeof document === 'undefined') return;
        const start = Date.now();
        while (Date.now() - start < maxWaitMs) {
          if (playtestState.matchEnded) break;
          const hasModal = !!document.querySelector('.modal-overlay:not(.hidden)');
          const menuEl = document.getElementById('card-context-menu');
          const hasMenu = menuEl && !menuEl.classList.contains('hidden');
          if (!hasModal && !hasMenu) {
            break;
          }
          await delay(200);
        }
      };

      // Anunciar visualmente en el centro de la pantalla la activación de cualquier carta o efecto de la IA
      const announceCardActivation = async (cardId) => {
        if (!cardId || (options && options.skipDelay)) return;
        if (typeof root.AnimationEngine !== 'undefined' && typeof root.AnimationEngine.showCardActivation === 'function') {
          await new Promise(resolve => {
            root.AnimationEngine.showCardActivation(cardId, 'opponent', resolve);
          });
          await delay(350);
        } else {
          await delay(800);
        }
      };

      log(`🤖 <strong>[Turno de la IA: ${executor.name}]</strong> Iniciando secuencia táctica...`, 'var(--accent-purple)');
      await delay(950);

      // -----------------------------------------------------------------------
      // PASO 1: Invocación Táctica (Apertura o Push para Letal)
      // -----------------------------------------------------------------------
      const summonPlan = executor.chooseCharacterToSummon(playtestState.opponentHand, playtestState.opponentSlots, playtestState.slots);
      if (summonPlan) {
        const charCard = root.cardsDatabase[summonPlan.cardId];
        playtestState.opponentHand.splice(summonPlan.handIndex, 1);
        playtestState.opponentSlots[summonPlan.targetSlot] = {
          character: summonPlan.cardId,
          skills: [],
          usedSkills: [],
          effectUsed: false,
          attackedThisTurn: false,
          isRotated: false,
          maxAttacks: 1,
          attacksDeclared: 0
        };
        log(`🤖 [IA] Invocó a <strong>${charCard?.nombre || summonPlan.cardId}</strong> al Slot ${summonPlan.targetSlot + 1}${summonPlan.isLethalPush ? ' ⚔️ ¡Presión para Letal!' : ''}.`, 'var(--accent-cyan)');
        await announceCardActivation(summonPlan.cardId);
        if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
        await delay(900);
      }

      // -----------------------------------------------------------------------
      // PASO 1.5: Efectos de Banca Tácticos de la IA
      // -----------------------------------------------------------------------
      if (Array.isArray(playtestState.opponentBench) && playtestState.opponentBench.length > 0) {
        for (let bIdx = 0; bIdx < playtestState.opponentBench.length; bIdx++) {
          const bItem = playtestState.opponentBench[bIdx];
          if (!bItem || bItem.effectUsed) continue;

          const card = root.cardsDatabase ? root.cardsDatabase[bItem.id] : null;
          if (!card) continue;

          const isReady = (typeof root.isBenchEffectReady === 'function')
            ? root.isBenchEffectReady(card, bItem, 'opponent')
            : true;

          if (isReady) {
            let executed = false;
            if (root.BenchEffects && typeof root.BenchEffects.execute === 'function') {
              executed = root.BenchEffects.execute(bItem.id, bIdx, 'opponent');
            } else if (typeof root[`activateOpponent${bItem.id.replace('BBX-', '')}`] === 'function') {
              executed = root[`activateOpponent${bItem.id.replace('BBX-', '')}`](bIdx);
            }
            if (executed !== false) {
              await announceCardActivation(bItem.id);
              if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
              await delay(900);
            }
          }
        }
      }

      // -----------------------------------------------------------------------
      // PASO 2: Combos desde la Mano (ej. Descarte de Haruka SP331)
      // -----------------------------------------------------------------------
      const handCombo = executor.getHandComboAction(playtestState.opponentHand, playtestState.opponentSlots, playtestState.opponentDeck);
      if (handCombo && handCombo.type === 'activate_sp331') {
        const targetSlot = playtestState.opponentSlots[handCombo.targetSlot];
        if (targetSlot) {
          // Descartar SP331
          playtestState.opponentHand.splice(handCombo.handIndex, 1);
          playtestState.opponentGrave.push('BBX-SP331');

          // Portar ¡Voluntad! (BBX-SP008) desde deck
          const vIdx = playtestState.opponentDeck.indexOf('BBX-SP008');
          if (vIdx !== -1) {
            playtestState.opponentDeck.splice(vIdx, 1);
            targetSlot.skills.push('BBX-SP008');
          }

          // Enviar skill de Haruka (Fulgor o Ascenso) al cementerio
          let milledId = null;
          for (const prefId of handCombo.millCardPreference) {
            const mIdx = playtestState.opponentDeck.indexOf(prefId);
            if (mIdx !== -1) {
              playtestState.opponentDeck.splice(mIdx, 1);
              playtestState.opponentGrave.push(prefId);
              milledId = prefId;
              break;
            }
          }

          await announceCardActivation('BBX-SP331');
          log(`🤖 [IA] Descartó a <strong>Haruka (SP331)</strong>: Equipó <strong>¡Voluntad!</strong> desde el deck y envió <strong>${root.cardsDatabase[milledId]?.nombre || 'Skill'}</strong> al cementerio.`, 'var(--accent-purple)');

          // Trigger automático de Fulgor ofensivo (SP162)
          if (milledId === 'BBX-SP162') {
            const fIdx = playtestState.opponentGrave.indexOf('BBX-SP162');
            if (fIdx !== -1) {
              playtestState.opponentGrave.splice(fIdx, 1);
              targetSlot.skills.push('BBX-SP162');
              log(`✨ [Efecto Fulgor ofensivo] Se portó automáticamente desde el cementerio a Haruka.`, 'var(--accent-cyan)');
            }
          }

          // Trigger de Energía arcana (SP268): buscar Haruka Avanzada
          if (milledId === 'BBX-SP268') {
            const avIdx = playtestState.opponentDeck.indexOf('BBX-SP244');
            if (avIdx !== -1) {
              const avCard = playtestState.opponentDeck.splice(avIdx, 1)[0];
              playtestState.opponentHand.push(avCard);
              log(`⚡ [Efecto Energía arcana] Añadió a <strong>${root.cardsDatabase[avCard]?.nombre || 'Haruka Modo Arcano'}</strong> a la mano desde el deck.`, 'var(--accent-cyan)');
            }
          }

          if (typeof root.shuffleArray === 'function') root.shuffleArray(playtestState.opponentDeck);
          if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
          await delay(800);
        }
      }

      // Activaciones tácticas generales de mano para la IA (HandEffects)
      if (Array.isArray(playtestState.opponentHand) && playtestState.opponentHand.length > 0) {
        for (let hIdx = 0; hIdx < playtestState.opponentHand.length; hIdx++) {
          const cardId = playtestState.opponentHand[hIdx];
          if (!cardId) continue;
          if (root.HandEffects && typeof root.HandEffects.has === 'function' && root.HandEffects.has(cardId)) {
            if (cardId === 'BBX-SP092' || cardId === 'BBX-SP098' || cardId === 'BBX-SP223' || cardId === 'BBX-SP340' || cardId === 'BBX-SP373' || cardId === 'BBX-SP360' || cardId === 'BBX-SP154' || cardId === 'BBX-SP114' || cardId === 'BBX-SP349') {
              const executed = root.HandEffects.execute(cardId, hIdx, 'opponent', { autoSelect: true });
              if (executed) {
                await announceCardActivation(cardId);
                if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
                await delay(900);
                break;
              }
            }
          }
        }
      }

      // -----------------------------------------------------------------------
      // PASO 3: Activación de Efectos en Campo (Personajes y Skills)
      // -----------------------------------------------------------------------
      // 3.1: Efectos de Personajes en campo de la IA
      if (Array.isArray(playtestState.opponentSlots)) {
        for (let sIdx = 0; sIdx < playtestState.opponentSlots.length; sIdx++) {
          const s = playtestState.opponentSlots[sIdx];
          if (!s || !s.character || s.effectUsed) continue;
          if (root.FieldEffects && typeof root.FieldEffects.canActivateCharacter === 'function' && root.FieldEffects.canActivateCharacter(s.character, sIdx, 'opponent')) {
            const executed = root.FieldEffects.executeCharacter(s.character, sIdx, 'opponent', { autoSelect: true });
            if (executed) {
              await announceCardActivation(s.character);
              if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
              await delay(900);
            }
          }
        }
      }

      // 3.2: Efectos de Skills equipadas en campo de la IA
      if (Array.isArray(playtestState.opponentSlots)) {
        for (let sIdx = 0; sIdx < playtestState.opponentSlots.length; sIdx++) {
          const s = playtestState.opponentSlots[sIdx];
          if (!s || !s.character || !Array.isArray(s.skills) || s.skills.length === 0) continue;
          for (let skIdx = 0; skIdx < s.skills.length; skIdx++) {
            const skillId = s.skills[skIdx];
            if (!skillId) continue;
            if (root.FieldEffects && typeof root.FieldEffects.canActivateSkill === 'function' && root.FieldEffects.canActivateSkill(skillId, sIdx, skIdx, 'opponent')) {
              const executed = root.FieldEffects.executeSkill(skillId, sIdx, skIdx, 'opponent', { autoSelect: true });
              if (executed) {
                await announceCardActivation(skillId);
                if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
                await delay(900);
                break;
              }
            }
          }
        }
      }

      // 3.3: Acciones de campo tácticas del executor (fallback/custom)
      let fieldAction = executor.getFieldAction(playtestState.opponentSlots, playtestState.opponentHand, playtestState.opponentDeck, playtestState.opponentGrave, playtestState.slots);
      if (fieldAction) {
        if (fieldAction.type === 'activate_voluntad') {
          const slot = playtestState.opponentSlots[fieldAction.slotIndex];
          const cannotDraw = playtestState.opponentCannotDrawByEffectsThisTurn || (typeof root.isDrawBySkillBlocked === 'function' && root.isDrawBySkillBlocked('opponent'));
          const usedSkills = (slot && slot.usedSkills) || [];
          const globalUsed = playtestState.usedGlobalEffects || [];
          if (slot && playtestState.opponentDeck.length > 0 && !cannotDraw && !usedSkills.includes('BBX-SP008') && !globalUsed.includes('¡Voluntad!') && !globalUsed.includes('BBX-SP008')) {
            slot.usedSkills = slot.usedSkills || [];
            slot.usedSkills.push('BBX-SP008');
            playtestState.usedGlobalEffects = globalUsed;
            playtestState.usedGlobalEffects.push('¡Voluntad!');
            const drawn = playtestState.opponentDeck.shift();
            playtestState.opponentHand.push(drawn);
            await announceCardActivation('BBX-SP008');
            log(`🤖 [IA] Activó el efecto de <strong>¡Voluntad!</strong> y robó 1 carta de su deck.`, 'var(--accent-cyan)');
            if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
            await delay(700);
          }
        } else if (fieldAction.type === 'activate_desatar') {
          const slot = playtestState.opponentSlots[fieldAction.slotIndex];
          const dIdx = slot ? slot.skills.indexOf('BBX-SP023') : -1;
          const globalUsed = playtestState.usedGlobalEffects || [];
          if (dIdx !== -1 && !globalUsed.includes('¡Desatar!') && !globalUsed.includes('BBX-SP023')) {
            await announceCardActivation('BBX-SP023');
            slot.skills.splice(dIdx, 1);
            playtestState.opponentGrave.push('BBX-SP023');
            playtestState.usedGlobalEffects = globalUsed;
            playtestState.usedGlobalEffects.push('¡Desatar!');
            // Revelar 2 del tope
            const revealed = playtestState.opponentDeck.splice(0, 2);
            revealed.forEach(id => {
              if (root.cardsDatabase[id]?.tipo === 'Skill') {
                playtestState.opponentHand.push(id);
                log(`🔍 [IA] <strong>¡Desatar!</strong> agregó la Skill <strong>${root.cardsDatabase[id]?.nombre}</strong> a la mano.`, 'var(--accent-cyan)');
              } else {
                playtestState.opponentGrave.push(id);
              }
            });
            if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
            await delay(800);
          }
        } else if (fieldAction.type === 'activate_haruka_sp244') {
          const slot = playtestState.opponentSlots[fieldAction.slotIndex];
          if (slot && !slot.effectUsed && playtestState.opponentDeck.length > 0) {
            let foundSkill = null;
            for (const prefId of fieldAction.preference) {
              const dIdx = playtestState.opponentDeck.indexOf(prefId);
              if (dIdx !== -1) {
                foundSkill = playtestState.opponentDeck.splice(dIdx, 1)[0];
                break;
              }
            }
            if (!foundSkill) {
              const dIdx = playtestState.opponentDeck.findIndex(id => {
                const c = root.cardsDatabase[id];
                return c && c.tipo === 'Skill' && c.portador && c.portador.includes('Haruka');
              });
              if (dIdx !== -1) foundSkill = playtestState.opponentDeck.splice(dIdx, 1)[0];
            }
            if (foundSkill) {
              playtestState.opponentHand.push(foundSkill);
              slot.effectUsed = true;
              if (typeof root.shuffleArray === 'function') root.shuffleArray(playtestState.opponentDeck);
              await announceCardActivation('BBX-SP244');
              log(`📖 [IA] Haruka Modo Arcano (SP244) buscó <strong>${root.cardsDatabase[foundSkill]?.nombre}</strong> de su deck y la añadió a su mano.`, 'var(--accent-cyan)');
              if (typeof root.checkAndTriggerInestabilidad === 'function') root.checkAndTriggerInestabilidad('opponent');
              if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
              await delay(800);
            }
          }
        } else if (fieldAction.type === 'activate_momento_oportuno') {
          const slot = playtestState.opponentSlots[fieldAction.slotIndex];
          if (slot && playtestState.opponentDeck.length > 0) {
            slot.usedSkills = slot.usedSkills || [];
            slot.usedSkills.push('BBX-SP188');
            let milledId = null;
            for (const prefId of fieldAction.millPreference) {
              const mIdx = playtestState.opponentDeck.indexOf(prefId);
              if (mIdx !== -1) {
                milledId = playtestState.opponentDeck.splice(mIdx, 1)[0];
                playtestState.opponentGrave.push(milledId);
                break;
              }
            }
            if (milledId) {
              await announceCardActivation('BBX-SP188');
              log(`⚡ [IA] Activó <strong>Momento oportuno</strong>: Envió <strong>${root.cardsDatabase[milledId]?.nombre}</strong> al cementerio.`, 'var(--accent-purple)');
              if (milledId === 'BBX-SP162') {
                const fIdx = playtestState.opponentGrave.indexOf('BBX-SP162');
                if (fIdx !== -1) {
                  playtestState.opponentGrave.splice(fIdx, 1);
                  slot.skills.push('BBX-SP162');
                  log(`✨ [Efecto Fulgor ofensivo] Se portó automáticamente desde el cementerio a Haruka.`, 'var(--accent-cyan)');
                }
              }
              if (milledId === 'BBX-SP268') {
                const avIdx = playtestState.opponentDeck.indexOf('BBX-SP244');
                if (avIdx !== -1) {
                  const avCard = playtestState.opponentDeck.splice(avIdx, 1)[0];
                  playtestState.opponentHand.push(avCard);
                  log(`⚡ [Efecto Energía arcana] Añadió a <strong>${root.cardsDatabase[avCard]?.nombre || 'Haruka Modo Arcano'}</strong> a la mano desde el deck.`, 'var(--accent-cyan)');
                }
              }
              if (typeof root.shuffleArray === 'function') root.shuffleArray(playtestState.opponentDeck);
              if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
              await delay(800);
            }
          }
        } else if (fieldAction.type === 'activate_char_sp093') {
          const slot = playtestState.opponentSlots[fieldAction.slotIndex];
          if (slot && !slot.effectUsed && playtestState.opponentHand.length > fieldAction.discardIndex) {
            const discardedId = playtestState.opponentHand.splice(fieldAction.discardIndex, 1)[0];
            playtestState.opponentGrave.push(discardedId);
            slot.effectUsed = true;
            await announceCardActivation('BBX-SP093');
            log(`🤖 [IA] Haruka (SP093) descartó <strong>${root.cardsDatabase[discardedId]?.nombre}</strong> como costo.`, 'var(--accent-purple)');
            let equipId = null;
            for (const prefId of fieldAction.equipPreference) {
              const dIdx = playtestState.opponentDeck.indexOf(prefId);
              if (dIdx !== -1) {
                equipId = playtestState.opponentDeck.splice(dIdx, 1)[0];
                break;
              }
            }
            if (equipId) {
              slot.skills.push(equipId);
              if (typeof root.shuffleArray === 'function') root.shuffleArray(playtestState.opponentDeck);
              log(`🛡️ [IA] Haruka (SP093) portó <strong>${root.cardsDatabase[equipId]?.nombre}</strong> directamente desde su deck.`, 'var(--accent-cyan)');
            }
            if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
            await delay(800);
          }
        } else if (fieldAction.type === 'activate_carga_destello') {
          const slot = playtestState.opponentSlots[fieldAction.slotIndex];
          const cannotDraw = playtestState.opponentCannotDrawByEffectsThisTurn;
          if (slot && slot.skills && slot.skills.length >= 2 && !cannotDraw && playtestState.opponentDeck.length >= 2) {
            const cdIdx = slot.skills.indexOf('BBX-SP033');
            if (cdIdx !== -1) {
              slot.skills.splice(cdIdx, 1);
              playtestState.opponentGrave.push('BBX-SP033');
              const otherIdx = slot.skills.findIndex(id => id !== 'BBX-SP290' && id !== 'BBX-SP411' && id !== 'BBX-SP224');
              const finalOtherIdx = (otherIdx !== -1) ? otherIdx : 0;
              const sacrificed = slot.skills.splice(finalOtherIdx, 1)[0];
              playtestState.opponentGrave.push(sacrificed);
              const drawn1 = playtestState.opponentDeck.shift();
              const drawn2 = playtestState.opponentDeck.shift();
              playtestState.opponentHand.push(drawn1, drawn2);
              await announceCardActivation('BBX-SP033');
              log(`⚡ [IA] Activó <strong>Carga destello</strong>: Envió Carga destello y ${root.cardsDatabase[sacrificed]?.nombre} al cementerio y robó 2 cartas.`, 'var(--accent-cyan)');
              if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
              await delay(800);
            }
          }
        } else if (fieldAction.type === 'activate_char_sp361') {
          const slot = playtestState.opponentSlots[fieldAction.slotIndex];
          if (slot && !slot.effectUsed && slot.skills.length >= 2 && playtestState.opponentDeck.length >= 3) {
            const sacrificialIdx = slot.skills.findIndex(id => id !== 'BBX-SP290' && id !== 'BBX-SP411' && id !== 'BBX-SP224');
            const targetIdx = sacrificialIdx !== -1 ? sacrificialIdx : 0;
            const removed = slot.skills.splice(targetIdx, 1)[0];
            playtestState.opponentGrave.push(removed);
            slot.effectUsed = true;
            const revealed = playtestState.opponentDeck.splice(0, 3);
            const skillIdx = revealed.findIndex(id => root.cardsDatabase[id]?.tipo === 'Skill');
            if (skillIdx !== -1) {
              const picked = revealed.splice(skillIdx, 1)[0];
              playtestState.opponentHand.push(picked);
              await announceCardActivation('BBX-SP361');
              log(`🔍 [IA] Haruka (SP361) reveló 3 cartas y añadió <strong>${root.cardsDatabase[picked]?.nombre}</strong> a su mano.`, 'var(--accent-cyan)');
            }
            revealed.forEach(id => playtestState.opponentDeck.push(id));
            if (typeof root.shuffleArray === 'function') root.shuffleArray(playtestState.opponentDeck);
            if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
            await delay(800);
          }
        } else if (fieldAction.type === 'activate_destello_perspicaz') {
          const slot = playtestState.opponentSlots[fieldAction.slotIndex];
          if (slot && playtestState.opponentHand.length > 0 && playtestState.opponentGrave.length > 0) {
            slot.usedSkills = slot.usedSkills || [];
            slot.usedSkills.push('BBX-SP390');
            const handToShuffle = playtestState.opponentHand.pop();
            playtestState.opponentDeck.push(handToShuffle);
            if (typeof root.shuffleArray === 'function') root.shuffleArray(playtestState.opponentDeck);
            const gIdx = playtestState.opponentGrave.findIndex(id => {
              const c = root.cardsDatabase[id];
              return c && c.tipo === 'Skill' && c.portador && c.portador.includes('Haruka');
            });
            if (gIdx !== -1) {
              const recovered = playtestState.opponentGrave.splice(gIdx, 1)[0];
              slot.skills.push(recovered);
              await announceCardActivation('BBX-SP390');
              log(`✨ [IA] Activó <strong>Destello perspicaz</strong>: Barajó 1 carta al deck y portó <strong>${root.cardsDatabase[recovered]?.nombre}</strong> desde el cementerio.`, 'var(--accent-cyan)');
              if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
              await delay(800);
            }
          }
        } else if (fieldAction.type === 'activate_drago_impacto') {
          const slot = playtestState.opponentSlots[fieldAction.slotIndex];
          const charCard = slot ? root.cardsDatabase[slot.character] : null;
          const matcher = (root && typeof root.isCarrierMatch === 'function')
            ? root.isCarrierMatch
            : (typeof isCarrierMatch === 'function' ? isCarrierMatch : null);
          const validCarrier = matcher ? matcher('Haruka/Modo arcano', charCard) : (charCard && (charCard.id === 'BBX-SP244' || charCard.nombre?.includes('Modo arcano')));
          const playerSlotWithSkills = (playtestState.slots || []).find(s => s && s.character && s.skills && s.skills.length > 0);
          if (slot && validCarrier && playerSlotWithSkills && playtestState.opponentHand.length >= 2) {
            slot.usedSkills = slot.usedSkills || [];
            slot.usedSkills.push('BBX-SP245');
            const s1 = playtestState.opponentHand.pop();
            const s2 = playtestState.opponentHand.pop();
            playtestState.opponentDeck.push(s1, s2);
            if (typeof root.shuffleArray === 'function') root.shuffleArray(playtestState.opponentDeck);
            const wiped = playerSlotWithSkills.skills.splice(0, playerSlotWithSkills.skills.length);
            wiped.forEach(id => playtestState.grave.push(id));
            await announceCardActivation('BBX-SP245');
            log(`💥 [IA] Activó <strong>¡Drago-impacto arcano!</strong>: Barajó 2 cartas y barrió todas las Skills de ${root.cardsDatabase[playerSlotWithSkills.character]?.nombre} al cementerio (${wiped.length} skills).`, 'var(--accent-purple)');
            if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
            await delay(800);
          }
        } else if (fieldAction.type === 'activate_encaminar') {
          const slot = playtestState.opponentSlots[fieldAction.slotIndex];
          if (slot && playtestState.opponentGrave.length > 0) {
            slot.usedSkills = slot.usedSkills || [];
            slot.usedSkills.push('BBX-SP037');
            const gIdx = playtestState.opponentGrave.findIndex(id => {
              const c = root.cardsDatabase[id];
              return c && c.tipo === 'Skill' && id !== 'BBX-SP037';
            });
            if (gIdx !== -1) {
              const recovered = playtestState.opponentGrave.splice(gIdx, 1)[0];
              playtestState.opponentHand.push(recovered);
              await announceCardActivation('BBX-SP037');
              log(`♻️ [IA] Activó <strong>Encaminar</strong>: Recuperó <strong>${root.cardsDatabase[recovered]?.nombre}</strong> del cementerio a su mano.`, 'var(--accent-cyan)');
              if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
              await delay(800);
            }
          }
        } else if (fieldAction.type === 'activate_ataque_destello') {
          const slot = playtestState.opponentSlots[fieldAction.slotIndex];
          if (slot) {
            slot.usedSkills = slot.usedSkills || [];
            slot.usedSkills.push('BBX-SP004');
            slot.maxAttacks = Math.max(slot.maxAttacks || 1, 2);
            await announceCardActivation('BBX-SP004');
            log(`⚔️ [IA] Activó <strong>Ataque Destello</strong>: Haruka puede realizar hasta 2 ataques este turno.`, 'var(--accent-purple)');
            if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
            await delay(800);
          }
        } else if (fieldAction.type === 'activate_sobrecarga_destello') {
          const slot = playtestState.opponentSlots[fieldAction.slotIndex];
          const benchCount = (playtestState.opponentBench || []).length;
          if (slot && benchCount >= 2) {
            slot.usedSkills = slot.usedSkills || [];
            slot.usedSkills.push('BBX-SP067');
            slot.maxAttacks = 4;
            await announceCardActivation('BBX-SP067');
            log(`🔥 [IA] ¡Activó <strong>Sobrecarga destello</strong>! (2 en banca): Haruka desata hasta 4 ataques este turno.`, 'var(--accent-danger)');
            if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
            await delay(800);
          }
        }
      }

      // -----------------------------------------------------------------------
      // PASO 4: Equipamiento Táctico (Anti-Overstacking)
      // -----------------------------------------------------------------------
      let maxEquipsPerTurn = 3;
      while (maxEquipsPerTurn > 0) {
        const equipPlan = executor.getEquipAction(playtestState.opponentHand, playtestState.opponentSlots);
        if (!equipPlan) break;

        const targetSlot = playtestState.opponentSlots[equipPlan.targetSlotIndex];
        const cardToEquip = playtestState.opponentHand.splice(equipPlan.handIndex, 1)[0];
        targetSlot.skills.push(cardToEquip);
        log(`🛡️ [IA] Equipó <strong>${root.cardsDatabase[cardToEquip]?.nombre}</strong> a ${root.cardsDatabase[targetSlot.character]?.nombre}.`, 'var(--accent-purple)');
        maxEquipsPerTurn--;
        if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
        await delay(950);
      }

      // -----------------------------------------------------------------------
      // PASO 5: Evolución (Modo Arcano)
      // -----------------------------------------------------------------------
      const evoPlan = executor.getEvolutionAction(playtestState.opponentHand, playtestState.opponentSlots);
      if (evoPlan) {
        const targetSlot = playtestState.opponentSlots[evoPlan.targetSlotIndex];
        const evoCardId = playtestState.opponentHand.splice(evoPlan.handIndex, 1)[0];
        const oldChar = targetSlot.character;
        targetSlot.character = evoCardId;
        log(`⚡ [IA] ¡Evolucionó a <strong>Haruka (Modo Arcano Avanzada)</strong> sobre ${root.cardsDatabase[oldChar]?.nombre}!`, 'var(--accent-cyan)');
        await announceCardActivation(evoCardId);

        // Efecto de Haruka Avanzada BBX-SP244: buscar 1 skill de Haruka en el deck
        if (evoCardId === 'BBX-SP244') {
          const harukaSkillIdx = playtestState.opponentDeck.findIndex(id => {
            const c = root.cardsDatabase[id];
            return c && c.tipo === 'Skill' && c.portador && c.portador.includes('Haruka');
          });
          if (harukaSkillIdx !== -1) {
            const foundId = playtestState.opponentDeck.splice(harukaSkillIdx, 1)[0];
            playtestState.opponentHand.push(foundId);
            log(`📖 [Efecto Haruka Avanzada] Agregó <strong>${root.cardsDatabase[foundId]?.nombre}</strong> de su deck a la mano.`, 'var(--accent-cyan)');
            if (typeof root.shuffleArray === 'function') root.shuffleArray(playtestState.opponentDeck);
          }
        }
        if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
        await delay(800);
      }

      // -----------------------------------------------------------------------
      // PASO 6: Fase de Batalla Inteligente
      // -----------------------------------------------------------------------
      const isTurnOne = (playtestState.turnCount || 1) === 1;
      const playerHasChars = (playtestState.slots || []).some(s => s && s.character);

      if (isTurnOne) {
        log(`🛡️ [Regla de Turno 1] En el primer turno de la partida no se pueden declarar ataques. La IA finaliza su turno sin combatir.`, 'var(--accent-cyan)');
        await delay(600);
      } else if (!playerHasChars) {
        log(`🛡️ [Regla de Combate] El Jugador no controla ningún Personaje en el campo. Al no existir ataques directos, la IA omite la fase de combate.`, 'var(--accent-cyan)');
        await delay(600);
      } else {
        let maxAttacks = 5;
        while (maxAttacks > 0) {
          if (playtestState.matchEnded) break;

          const battlePlan = executor.getBattleAction(playtestState.opponentSlots, playtestState.slots);
          if (!battlePlan) break;

          const attackerSlot = playtestState.opponentSlots[battlePlan.attackerSlotIndex];
          const victimSlot = playtestState.slots[battlePlan.targetSlotIndex];

          if (attackerSlot && victimSlot && attackerSlot.character && victimSlot.character) {
            if (root.BattleEngine && typeof root.BattleEngine.executeAttackAsync === 'function') {
              await root.BattleEngine.executeAttackAsync(battlePlan.attackerSlotIndex, battlePlan.targetSlotIndex, 'opponent');
            } else if (root.BattleEngine && typeof root.BattleEngine.executeAttack === 'function') {
              await new Promise(resolve => {
                const started = root.BattleEngine.executeAttack(battlePlan.attackerSlotIndex, battlePlan.targetSlotIndex, 'opponent', {}, (success, matchEnd) => {
                  resolve({ success, matchEnd });
                });
                if (!started) resolve({ success: false });
              });
            } else {
              attackerSlot.attackedThisTurn = true;
              attackerSlot.isRotated = true; // Girar personaje atacante
              log(`⚔️ [IA Combate] <strong>${root.cardsDatabase[attackerSlot.character]?.nombre}</strong> declara ataque contra <strong>${root.cardsDatabase[victimSlot.character]?.nombre}</strong> (Slot ${battlePlan.targetSlotIndex + 1}).`, 'var(--accent-danger)');

              if (typeof root.resolveStandardDestruction === 'function' && typeof root.resolveOpponentStandardDestruction === 'function') {
                root.resolveStandardDestruction(battlePlan.targetSlotIndex);
                root.resolveOpponentStandardDestruction(battlePlan.attackerSlotIndex);
              } else {
                // Fallback de combate
                if (victimSlot.skills && victimSlot.skills.includes('BBX-SP060')) {
                  log(`🛡️ [Defensa Jugador] Tu personaje activó <strong>Resistir (BBX-SP060)</strong> y no es destruido en combate.`, 'var(--accent-cyan)');
                } else if (victimSlot.skills && victimSlot.skills.length > 0) {
                  const destroyedSkill = victimSlot.skills.pop();
                  playtestState.grave.push(destroyedSkill);
                  log(`💥 [Combate] La Skill <strong>${root.cardsDatabase[destroyedSkill]?.nombre || destroyedSkill}</strong> de tu personaje fue destruida y enviada al cementerio.`, 'var(--accent-danger)');
                } else {
                  const defeatedChar = victimSlot.character;
                  victimSlot.character = null;
                  victimSlot.skills = [];
                  if (!playtestState.bench) playtestState.bench = [];
                  playtestState.bench.push({ id: defeatedChar, effectUsed: false });
                  log(`💀 [Combate] Tu personaje <strong>${root.cardsDatabase[defeatedChar]?.nombre}</strong> no tenía Skills: ¡Fue derrotado y enviado a tu banca!`, 'var(--accent-danger)');
                  if (typeof root.checkMatchEndCondition === 'function') {
                    root.checkMatchEndCondition();
                  }

                  // Regla Oficial Skill Blast X: Solo se roba 1 carta si el personaje es destruido en batalla
                  if (!playtestState.matchEnded && playtestState.deck.length > 0) {
                    if (typeof root.drawCard === 'function') {
                      root.drawCard(null);
                    } else {
                      playtestState.hand.push(playtestState.deck.shift());
                    }
                    log(`🃏 [Regla de Combate] Robaste 1 carta de tu deck por la derrota de tu Personaje en batalla.`, 'var(--accent-purple)');
                  }
                }
              }
            }

            // Esperar obligatoriamente a que el jugador termine cualquier selección modal o menú de daño/reacción
            await waitForPendingModalsAndMenus();
            await delay(850);

            if (typeof root.checkMatchEndCondition === 'function') {
              const mEnd = root.checkMatchEndCondition();
              if (mEnd && mEnd.ended) break;
            }

            if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
            await delay(950);
          }
          maxAttacks--;
        }
      }

      // -----------------------------------------------------------------------
      // PASO 7: Final de Turno y Traspaso
      // -----------------------------------------------------------------------
      // Asegurar que no quede ningún modal ni menú abierto antes de finalizar turno
      await waitForPendingModalsAndMenus();

      if (playtestState.matchEnded) {
        log(`🏁 [Fin de Partida] El duelo ha finalizado.`, 'var(--accent-cyan)');
        return true;
      }

      // Reiniciar flags de ataque del oponente
      (playtestState.opponentSlots || []).forEach(s => {
        if (s) s.attackedThisTurn = false;
      });

      log(`🏁 [IA] Finalizó su turno. Turno transferido al <strong>Jugador</strong>.`, 'var(--accent-cyan)');
      await delay(600);

      // Traspasar el turno al jugador mediante la secuencia oficial de cambio de turno
      if (typeof root.toggleTurnOwner === 'function') {
        try {
          root.toggleTurnOwner();
        } catch (err) {
          console.error("Error al transferir el turno con toggleTurnOwner:", err);
          if (typeof root.proceedToNextTurn === 'function') {
            root.proceedToNextTurn();
          }
        }
      } else if (typeof root.proceedToNextTurn === 'function') {
        root.proceedToNextTurn();
      } else {
        playtestState.turnOwner = 'player';
        playtestState.turnCount = (playtestState.turnCount || 1) + 1;
        if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
      }
      return true;
    }
  };

  if (root) root.AIEngine = AIEngine;
  if (typeof window !== 'undefined') window.AIEngine = AIEngine;
  if (typeof global !== 'undefined') global.AIEngine = AIEngine;
  if (typeof globalThis !== 'undefined') globalThis.AIEngine = AIEngine;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
