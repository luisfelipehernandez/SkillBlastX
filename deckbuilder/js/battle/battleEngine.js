/**
 * Skill Blast X - Battle Engine
 * Motor modular unificado para la Fase de Batalla, Declaración de Ataques
 * y Resolución Simétrica de Destrucción en Combate.
 * Paridad 100%: Jugador (UI), Rival en Sandbox y Motor de Inteligencia Artificial (IA).
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
      tag: isPlayer ? '[Combate]' : '[Rival Combate]'
    };
  }

  function getCard(id) {
    if (typeof root.cardsDatabase !== 'undefined' && root.cardsDatabase[id]) return root.cardsDatabase[id];
    if (typeof cardsDatabase !== 'undefined' && cardsDatabase[id]) return cardsDatabase[id];
    return null;
  }

  function logMsg(msg, color = 'var(--accent-warning)') {
    if (typeof root.addLog === 'function') root.addLog(msg, color);
    else if (typeof addLog === 'function') addLog(msg, color);
  }

  function updateView() {
    if (typeof root.updatePlaytestView === 'function') root.updatePlaytestView();
    else if (typeof updatePlaytestView === 'function') updatePlaytestView();
  }

  const BattleEngine = {
    /**
     * Valida si un personaje en una ranura dada puede declarar un ataque
     */
    canDeclareAttack(slotIndex, owner = 'player') {
      const { state, mySlots, oppSlots } = getState(owner);
      if (!state || state.matchEnded) return false;

      // 1. Regla de turno del jugador activo
      if (state.turnOwner !== owner) return false;

      // 2. Regla de Turno 1: No se puede declarar ataques en el primer turno del juego
      const turnCount = state.turnCount || 1;
      if (turnCount === 1) return false;

      // 3. Ranura atacante válida
      const slot = mySlots[slotIndex];
      if (!slot || !slot.character) return false;

      // 4. Regla de Rotación / Agotamiento
      if (slot.isRotated) return false;
      const attacksDeclared = slot.attacksDeclared || 0;
      const maxAttacks = slot.maxAttacks || 1;
      if (attacksDeclared >= maxAttacks) return false;

      // 5. Regla de Objetivos Válidos: No hay ataques directos si el rival no controla personajes
      const hasOpponentCharacters = oppSlots.some(s => s && s.character);
      if (!hasOpponentCharacters) return false;

      // 6. Restricciones especiales de juego (ej. Pradera)
      if (slot.cannotAttackThisTurn) return false;

      return true;
    },

    /**
     * Obtiene la lista de objetivos enemigos disponibles para atacar
     */
    getEligibleTargets(slotIndex, owner = 'player') {
      const { oppSlots } = getState(owner);
      const targets = [];
      oppSlots.forEach((s, idx) => {
        if (s && s.character) {
          targets.push({
            slotIndex: idx,
            characterId: s.character,
            characterName: getCard(s.character)?.nombre || s.character
          });
        }
      });
      return targets;
    },

    /**
     * Versión asíncrona de executeAttack que devuelve una Promise
     */
    async executeAttackAsync(attackerSlotIndex, targetSlotIndex, owner = 'player', opts = {}) {
      return new Promise((resolve) => {
        const started = this.executeAttack(attackerSlotIndex, targetSlotIndex, owner, opts, (success, matchEnd) => {
          resolve({ success, matchEnd });
        });
        if (!started) {
          resolve({ success: false });
        }
      });
    },

    /**
     * Ejecuta una declaración de ataque entre una ranura atacante y una defensora
     */
    executeAttack(attackerSlotIndex, targetSlotIndex, owner = 'player', opts = {}, cb = null) {
      if (!this.canDeclareAttack(attackerSlotIndex, owner)) {
        if (cb) cb(false);
        return false;
      }

      const { state, mySlots, oppSlots, tag } = getState(owner);
      const attackerSlot = mySlots[attackerSlotIndex];
      const victimSlot = oppSlots[targetSlotIndex];
      if (!attackerSlot || !attackerSlot.character || !victimSlot || !victimSlot.character) {
        if (cb) cb(false);
        return false;
      }

      const attackerCard = getCard(attackerSlot.character);
      const victimCard = getCard(victimSlot.character);
      const oppOwner = owner === 'player' ? 'opponent' : 'player';

      // Incrementar contador de ataques declarados
      attackerSlot.attacksDeclared = (attackerSlot.attacksDeclared || 0) + 1;
      const maxAttacks = attackerSlot.maxAttacks || 1;
      if (attackerSlot.attacksDeclared >= maxAttacks) {
        attackerSlot.isRotated = true;
      }
      attackerSlot.attackedThisTurn = true;

      logMsg(`⚔️ ${tag} <strong>${attackerCard?.nombre || attackerSlot.character}</strong> declara un ataque contra <strong>${victimCard?.nombre || victimSlot.character}</strong> (Ataque ${attackerSlot.attacksDeclared}/${maxAttacks}).`, 'var(--accent-danger)');

      // Triggers previos al choque (ej. Chiako BBX-SP319 si es blanco de ataque)
      if (victimSlot.character === 'BBX-SP319' && typeof root.checkAndTriggerChiakoSP319AttackTarget === 'function') {
        root.checkAndTriggerChiakoSP319AttackTarget(oppOwner, targetSlotIndex, owner);
      }

      // Reacción de mano opcional: Resistir (BBX-SP060)
      const defenderHand = oppOwner === 'player' ? state.hand : state.opponentHand;
      const isResistirBlocked = (typeof root.RulesEngine !== 'undefined' && root.RulesEngine.isSkillHandEffectBlocked)
        ? root.RulesEngine.isSkillHandEffectBlocked(oppOwner)
        : (typeof root.isSkillHandEffectBlocked === 'function' ? root.isSkillHandEffectBlocked(oppOwner) : false);

      const aiAutoDefend = (state && state.isDuelVsAI && oppOwner === 'opponent');
      if (((opts && opts.useResistir) || aiAutoDefend) && defenderHand.includes('BBX-SP060') && !isResistirBlocked) {
        const rIdx = defenderHand.indexOf('BBX-SP060');
        defenderHand.splice(rIdx, 1);
        victimSlot.skills.push('BBX-SP060');
        logMsg(`🛡️ [Reacción Resistir] Se equipó <strong>Resistir (BBX-SP060)</strong> a <strong>${victimCard?.nombre || victimSlot.character}</strong> para defenderlo en combate.`, 'var(--accent-cyan)');
      }

      // Resolución de combate mutuo ("ambos se pegan")
      const resolveCombatDamage = () => {
        logMsg(`💥 ${tag} Resolución de combate: <strong>${attackerCard?.nombre}</strong> y <strong>${victimCard?.nombre}</strong> se infligen daño mutuo.`, 'var(--accent-warning)');

        // Si app.js tiene resolveStandardDestruction y resolveOpponentStandardDestruction, usarlos para mantener todos los triggers
        if (owner === 'player') {
          if (typeof root.resolveOpponentStandardDestruction === 'function') {
            root.resolveOpponentStandardDestruction(targetSlotIndex);
          } else {
            this.resolveDamage(targetSlotIndex, 'opponent');
          }
          if (typeof root.resolveStandardDestruction === 'function') {
            root.resolveStandardDestruction(attackerSlotIndex);
          } else {
            this.resolveDamage(attackerSlotIndex, 'player');
          }
        } else {
          if (typeof root.resolveStandardDestruction === 'function') {
            root.resolveStandardDestruction(targetSlotIndex);
          } else {
            this.resolveDamage(targetSlotIndex, 'player');
          }
          if (typeof root.resolveOpponentStandardDestruction === 'function') {
            root.resolveOpponentStandardDestruction(attackerSlotIndex);
          } else {
            this.resolveDamage(attackerSlotIndex, 'opponent');
          }
        }

        // Comprobar condición de fin de partida
        let matchEnd = null;
        if (typeof root.checkMatchEndCondition === 'function') {
          matchEnd = root.checkMatchEndCondition();
        }

        updateView();
        if (cb) cb(true, matchEnd);
      };

      if (typeof document !== 'undefined' && document.body && root.AnimationEngine && typeof root.AnimationEngine.animateAttackClash === 'function') {
        root.AnimationEngine.animateAttackClash(attackerSlotIndex, targetSlotIndex, owner, () => {
          resolveCombatDamage();
        });
      } else {
        resolveCombatDamage();
      }

      return true;
    },

    /**
     * Resuelve el daño de combate estándar en una ranura específica (daño/destrucción)
     */
    resolveDamage(slotIndex, owner = 'player', opts = {}) {
      const { state, mySlots, myGrave, myBench, tag } = getState(owner);
      const slot = mySlots[slotIndex];
      if (!slot || !slot.character) return { defeated: false, skillLost: null };

      const charCard = getCard(slot.character);

      // 1. Inmunidad temporal / Protección por efecto
      if (slot.cannotBeDestroyedByBattleUntilTurnEnd) {
        logMsg(`🛡️ ${tag} <strong>${charCard?.nombre || slot.character}</strong> no puede ser destruido por batalla este turno. Se evitó el daño.`, 'var(--accent-cyan)');
        return { defeated: false, protected: true };
      }

      // 2. ¡Drago-tenacidad! (BBX-SP209): Durante el turno del portador, no pierde skills ni es destruido
      if (slot.skills && slot.skills.includes('BBX-SP209') && state.turnOwner === owner) {
        logMsg(`🛡️ ${tag} [Drago-tenacidad] Durante su turno, <strong>${charCard?.nombre || slot.character}</strong> no puede ser destruido por batalla.`, 'var(--accent-cyan)');
        return { defeated: false, protected: true };
      }

      // 3. Muro de Hielo (BBX-SP002): Protege de perder Skills 1 vez por turno
      const hasMuro = slot.skills && slot.skills.includes('BBX-SP002');
      if (hasMuro && !slot.muroUsadoEsteTurno) {
        slot.muroUsadoEsteTurno = true;
        logMsg(`🛡️ ${tag} [Muro de Hielo] Se activó automáticamente y protegió a <strong>${charCard?.nombre || slot.character}</strong> sin perder ninguna Skill.`, 'var(--accent-cyan)');
        updateView();
        return { defeated: false, protected: true, muro: true };
      }

      // 4. Si porta Skills: Pierde 1 Skill (se envía al cementerio)
      if (slot.skills && slot.skills.length > 0) {
        const removedSkill = (opts && typeof opts.skillIndex === 'number' && opts.skillIndex >= 0)
          ? slot.skills.splice(opts.skillIndex, 1)[0]
          : slot.skills.pop();

        myGrave.push(removedSkill);
        const skCard = getCard(removedSkill);
        logMsg(`💥 ${tag} <strong>${charCard?.nombre || slot.character}</strong> sobrevivió al combate perdiendo su Skill <strong>${skCard?.nombre || removedSkill}</strong>.`, 'var(--accent-warning)');

        // Disparar triggers de cementerio
        if (typeof root.dispatchGraveTriggers === 'function') {
          root.dispatchGraveTriggers(removedSkill, owner, { fromZone: 'field', reason: 'battle' });
        }

        // Triggers individuales legacy de pérdida de skill si existen
        if (owner === 'player') {
          if (typeof root.checkAndTriggerConectarSistema === 'function') root.checkAndTriggerConectarSistema(removedSkill);
          if (typeof root.checkAndTriggerFulgorProminente === 'function') root.checkAndTriggerFulgorProminente(removedSkill);
          if (typeof root.checkAndTriggerTorbellino === 'function') root.checkAndTriggerTorbellino(removedSkill, true);
        } else {
          if (typeof root.checkAndTriggerConectarSistemaOpponent === 'function') root.checkAndTriggerConectarSistemaOpponent(removedSkill);
          if (typeof root.checkAndTriggerFulgorProminenteOpponent === 'function') root.checkAndTriggerFulgorProminenteOpponent(removedSkill);
          if (typeof root.checkAndTriggerTorbellinoOpponent === 'function') root.checkAndTriggerTorbellinoOpponent(removedSkill, true);
        }

        if (typeof root.checkAndTriggerHoloescudo === 'function') root.checkAndTriggerHoloescudo(removedSkill, owner);
        if (typeof root.checkAndTriggerAnheloSP352 === 'function') root.checkAndTriggerAnheloSP352(removedSkill, owner);

        updateView();
        return { defeated: false, skillLost: removedSkill };
      }

      // 5. Si no porta Skills: El Personaje es derrotado y es enviado a la Banca
      const defeatedChar = slot.character;
      myBench.push({ id: defeatedChar, effectUsed: false });
      slot.character = null;
      slot.skills = [];
      slot.isRotated = false;
      slot.effectUsed = false;
      slot.attacksDeclared = 0;
      slot.maxAttacks = 1;

      logMsg(`💀 ${tag} <strong>${charCard?.nombre || defeatedChar}</strong> no tenía Skills equipadas: ¡Fue derrotado y se retiró a la Banca!`, 'var(--accent-danger)');

      // Triggers de cementerio/derrota si existen
      if (owner === 'opponent' && typeof root.checkAndTriggerEncuentroImprevistoOpponent === 'function') {
        root.checkAndTriggerEncuentroImprevistoOpponent();
      }

      // Comprobar condición de fin de partida (3 derrotados en banca = derrota)
      let matchEnd = null;
      if (typeof root.checkMatchEndCondition === 'function') {
        matchEnd = root.checkMatchEndCondition();
      }

      // Regla Oficial Skill Blast X: Al ser destruido en batalla y enviado a la banca, el controlador roba 1 carta
      if (!matchEnd && !state.matchEnded) {
        const { myDeck, myHand } = getState(owner);
        if (myDeck && myDeck.length > 0) {
          if (owner === 'player' && typeof root.drawCard === 'function') {
            root.drawCard(null);
          } else if (owner === 'opponent' && typeof root.opponentDrawCard === 'function') {
            root.opponentDrawCard(null);
          } else {
            const drawn = myDeck.shift();
            myHand.push(drawn);
            updateView();
          }
          logMsg(`🃏 ${tag} Robó 1 carta por la derrota de su Personaje en batalla.`, 'var(--accent-purple)');
        }
      }

      updateView();
      return { defeated: true, character: defeatedChar, matchEnd };
    }
  };

  if (typeof window !== 'undefined') window.BattleEngine = BattleEngine;
  if (typeof global !== 'undefined') global.BattleEngine = BattleEngine;
  if (typeof globalThis !== 'undefined') globalThis.BattleEngine = BattleEngine;
  if (root) root.BattleEngine = BattleEngine;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
