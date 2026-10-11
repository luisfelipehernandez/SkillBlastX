/**
 * Skill Blast X - Haruka Champion Executor
 * Lógica táctica especializada para el mazo IA Haruka Campeón (35 cartas).
 * Estilo Motor de IA / Skill Blast X.
 */

(function(root) {
  'use strict';

  // Sincronizar referencias en entornos Node / Test
  if (typeof global !== 'undefined') {
    if (root && !root.cardsDatabase && global.cardsDatabase) root.cardsDatabase = global.cardsDatabase;
    if (root && !root.addLog && global.addLog) root.addLog = global.addLog;
    if (root && !root.shuffleArray && global.shuffleArray) root.shuffleArray = global.shuffleArray;
  }

  const HarukaExecutor = {
    deckId: 'haruka_campeon',
    name: 'Haruka Champion Executor',

    /**
     * Elige el mejor personaje inicial para invocar desde la mano al campo vacío.
     */
    chooseCharacterToSummon(hand, mySlots) {
      if (!hand || hand.length === 0) return null;
      const emptySlotIdx = mySlots.findIndex(s => !s.character);
      if (emptySlotIdx === -1) return null;

      // Prioridad de invocación básica (nunca avanzadas en campo vacío)
      const priority = ['BBX-SP093', 'BBX-SP361', 'BBX-SP331'];
      for (const id of priority) {
        const idx = hand.indexOf(id);
        if (idx !== -1) {
          return { cardId: id, handIndex: idx, targetSlot: emptySlotIdx };
        }
      }

      // Si no tiene los principales, cualquier básico que no sea clase Avanzada
      const fallbackIdx = hand.findIndex(id => {
        const c = root.cardsDatabase[id];
        return c && c.tipo === 'Personaje' && c.clase !== 'Avanzada';
      });

      if (fallbackIdx !== -1) {
        return { cardId: hand[fallbackIdx], handIndex: fallbackIdx, targetSlot: emptySlotIdx };
      }
      return null;
    },

    /**
     * Elige y ejecuta efectos desde la mano antes de equipar (ej. Haruka SP331).
     */
    getHandComboAction(hand, mySlots, myDeck) {
      if (!hand || !mySlots) return null;
      const activeSlotIdx = mySlots.findIndex(s => s && s.character && root.cardsDatabase[s.character]?.nombre?.includes('Haruka'));
      if (activeSlotIdx === -1) return null;

      // Combo Haruka SP331: Descartar de mano -> portar ¡Voluntad! SP008 de deck -> mill Fulgor SP162
      const sp331Idx = hand.indexOf('BBX-SP331');
      if (sp331Idx !== -1 && myDeck.includes('BBX-SP008')) {
        return {
          type: 'activate_sp331',
          handIndex: sp331Idx,
          targetSlot: activeSlotIdx,
          equipCardId: 'BBX-SP008',
          millCardPreference: ['BBX-SP162', 'BBX-SP200', 'BBX-SP034', 'BBX-SP020']
        };
      }

      return null;
    },

    /**
     * Evalúa activaciones de efectos en campo (¡Voluntad!, ¡Desatar!, Momento oportuno, etc.).
     */
    getFieldAction(mySlots, hand, myDeck, myGrave) {
      if (!mySlots) return null;

      for (let sIdx = 0; sIdx < mySlots.length; sIdx++) {
        const slot = mySlots[sIdx];
        if (!slot || !slot.character || !slot.skills) continue;

        // 1. Activar ¡Voluntad! (BBX-SP008) si solo controla 1 personaje y no se ha usado
        const activeChars = mySlots.filter(s => s && s.character).length;
        if (activeChars === 1 && slot.skills.includes('BBX-SP008') && !slot.usedSkills?.includes('BBX-SP008')) {
          return { type: 'activate_voluntad', slotIndex: sIdx, skillId: 'BBX-SP008' };
        }

        // 2. Activar ¡Desatar! (BBX-SP023) para excavar 2 cartas y agregar skills
        if (slot.skills.includes('BBX-SP023')) {
          return { type: 'activate_desatar', slotIndex: sIdx, skillId: 'BBX-SP023' };
        }

        // 3. Momento oportuno (BBX-SP188): enviar skill de Haruka al cementerio
        if (slot.skills.includes('BBX-SP188') && !slot.usedSkills?.includes('BBX-SP188')) {
          return {
            type: 'activate_momento_oportuno',
            slotIndex: sIdx,
            skillId: 'BBX-SP188',
            millPreference: ['BBX-SP162', 'BBX-SP200', 'BBX-SP034']
          };
        }

        // 4. Haruka SP093 efecto de personaje: descartar 1 de mano para portar skill de Haruka de deck
        if (slot.character === 'BBX-SP093' && !slot.effectUsed && hand.length > 1) {
          const discardCandidate = hand.findIndex(id => id !== 'BBX-SP244' && id !== 'BBX-SP060' && id !== 'BBX-SP180');
          if (discardCandidate !== -1) {
            return {
              type: 'activate_char_sp093',
              slotIndex: sIdx,
              discardIndex: discardCandidate,
              equipPreference: ['BBX-SP060', 'BBX-SP411', 'BBX-SP290', 'BBX-SP004']
            };
          }
        }
      }

      return null;
    },

    /**
     * Elige qué Skills equipar de la mano a qué personajes.
     * Implementa la regla Anti-Overstacking: máximo 2 skills por personaje a menos que vaya a evolucionar.
     */
    getEquipAction(hand, mySlots) {
      if (!hand || !mySlots) return null;

      // Buscar personajes que puedan portar skills
      const availableSlots = [];
      mySlots.forEach((slot, idx) => {
        if (slot && slot.character) {
          availableSlots.push({ slot, index: idx, skillCount: (slot.skills || []).length });
        }
      });
      if (availableSlots.length === 0) return null;

      // Ordenar slots: dar prioridad al personaje con menos skills (distribución balanceada)
      availableSlots.sort((a, b) => a.skillCount - b.skillCount);

      // Prioridad táctica de Skills para equipar desde la mano
      const equipPriority = [
        'BBX-SP060', // Resistir (Escudo vital de combate)
        'BBX-SP411', // Siesta (Floodgate: bloquea skills en mano rival)
        'BBX-SP290', // Ahogarse (Floodgate: bloquea personajes en mano rival)
        'BBX-SP366', // Incrustar espada (Inmunidad contra skills)
        'BBX-SP224', // Relajo (Bloquea efectos si rival tiene <= 2 skills)
        'BBX-SP004', // Ataque Destello (Doble ataque)
        'BBX-SP033', // Carga destello (Ofensiva)
        'BBX-SP023', // ¡Desatar! (Motor de búsqueda)
        'BBX-SP045'  // ¡Inmovilizar! (Control)
      ];

      for (const cardId of equipPriority) {
        const handIdx = hand.indexOf(cardId);
        if (handIdx === -1) continue;

        const card = root.cardsDatabase[cardId];
        if (!card || card.tipo !== 'Skill') continue;

        for (const slotObj of availableSlots) {
          // Regla Anti-Overstacking: no pasar de 2 skills si otro personaje está vacío
          if (slotObj.skillCount >= 2 && availableSlots.some(s => s.skillCount === 0)) continue;
          if (slotObj.skillCount >= 3) continue; // No acumular exceso de 3

          // Verificar compatibilidad de portador
          const charCard = root.cardsDatabase[slotObj.slot.character];
          if (!charCard) continue;

          let canEquip = true;
          if (card.portador) {
            canEquip = card.portador.includes('Haruka') && charCard.nombre.includes('Haruka');
          }

          // Verificar si ya tiene copia con regla de copia única
          if (canEquip && slotObj.slot.skills.includes(cardId)) {
            // Resistir, etc. permiten múltiples? Verificar si ya porta
            if (slotObj.slot.skills.filter(id => id === cardId).length >= 1 && card.efecto?.includes('solo puede portar 1')) {
              canEquip = false;
            }
          }

          if (canEquip) {
            return {
              handIndex: handIdx,
              cardId: cardId,
              targetSlotIndex: slotObj.index
            };
          }
        }
      }

      return null;
    },

    /**
     * Evalúa si puede evolucionar a Haruka Avanzada (BBX-SP244).
     */
    getEvolutionAction(hand, mySlots) {
      if (!hand || !mySlots) return null;
      const sp244Idx = hand.indexOf('BBX-SP244');
      if (sp244Idx === -1) return null;

      // Requisito de BBX-SP244: Haruka en campo con 3 o más skills
      const eligibleSlotIdx = mySlots.findIndex(s => {
        if (!s || !s.character) return false;
        const char = root.cardsDatabase[s.character];
        if (!char || !char.nombre.includes('Haruka') || char.clase === 'Avanzada') return false;
        return (s.skills || []).length >= 3;
      });

      if (eligibleSlotIdx !== -1) {
        return {
          cardId: 'BBX-SP244',
          handIndex: sp244Idx,
          targetSlotIndex: eligibleSlotIdx
        };
      }
      return null;
    },

    /**
     * Evalúa la fase de combate y selecciona el mejor atacante y objetivo.
     */
    getBattleAction(mySlots, oppSlots) {
      if (!mySlots || !oppSlots) return null;
      if (typeof playtestState !== 'undefined' && ((playtestState.turnCount || 1) === 1 || playtestState.matchEnded)) return null;

      // 1. Encontrar un atacante listo que no haya atacado
      const attackerSlotIdx = mySlots.findIndex(s => {
        if (!s || !s.character) return false;
        if (s.attackedThisTurn) return false;
        return true;
      });
      if (attackerSlotIdx === -1) return null;

      // 2. Evaluar objetivos del jugador (slots del oponente para la IA)
      const validTargets = [];
      oppSlots.forEach((slot, idx) => {
        if (slot && slot.character) {
          const skills = slot.skills || [];
          const hasResistir = skills.includes('BBX-SP060');
          const hasMuroHielo = skills.includes('BBX-SP002');
          validTargets.push({
            slot,
            index: idx,
            skillCount: skills.length,
            hasResistir,
            hasMuroHielo
          });
        }
      });
      if (validTargets.length === 0) return null;

      // Prioridad 1: Personaje rival sin skills (destrucción directa a banca!)
      const unarmored = validTargets.find(t => t.skillCount === 0);
      if (unarmored) {
        return { attackerSlotIndex: attackerSlotIdx, targetSlotIndex: unarmored.index };
      }

      // Prioridad 2: Personaje rival con menos skills y sin escudos indestructibles
      validTargets.sort((a, b) => {
        if (a.hasMuroHielo && !b.hasMuroHielo) return 1;
        if (!a.hasMuroHielo && b.hasMuroHielo) return -1;
        return a.skillCount - b.skillCount;
      });

      return {
        attackerSlotIndex: attackerSlotIdx,
        targetSlotIndex: validTargets[0].index
      };
    },

    /**
     * Respuestas reactivas (cuando la IA es atacada o afectada por el jugador).
     */
    getReactionAction(eventType, context) {
      if (eventType === 'battle_defense') {
        const { attackedSlot, hand, grave } = context;
        if (!attackedSlot) return null;

        // 1. Activar Resistir en campo si está equipado
        if (attackedSlot.skills?.includes('BBX-SP060')) {
          return { type: 'trigger_resistir', skillId: 'BBX-SP060' };
        }

        // 2. Portar Tenacidad implacable (SP034) desde la mano si el personaje fuera a ser destruido
        if (hand && hand.includes('BBX-SP034')) {
          return { type: 'trigger_tenacidad_hand', skillId: 'BBX-SP034', handIndex: hand.indexOf('BBX-SP034') };
        }

        // 3. Activar Colisionar destellos (SP108) barajando carta de cementerio
        if (attackedSlot.skills?.includes('BBX-SP108') && grave && grave.length > 0) {
          return { type: 'trigger_colisionar_destellos', skillId: 'BBX-SP108' };
        }
      }

      if (eventType === 'prevent_shuffle_skills') {
        const { hand } = context;
        // Si el jugador intenta barajar skills de la IA, descartar Ryu-chan SP180 para proteger
        if (hand && hand.includes('BBX-SP180')) {
          return { type: 'discard_ryu_chan_protect', cardId: 'BBX-SP180', handIndex: hand.indexOf('BBX-SP180') };
        }
      }

      return null;
    }
  };

  if (root) root.HarukaExecutor = HarukaExecutor;
  if (typeof window !== 'undefined') window.HarukaExecutor = HarukaExecutor;
  if (typeof global !== 'undefined') global.HarukaExecutor = HarukaExecutor;
  if (typeof globalThis !== 'undefined') globalThis.HarukaExecutor = HarukaExecutor;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
