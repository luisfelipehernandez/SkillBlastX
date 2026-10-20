/**
 * Skill Blast X - IA Haruka Executor
 * Lógica táctica adaptativa y especializada para el mazo oficial de Haruka (35 cartas).
 * Basada en análisis integral carta por carta: Motor de Robo, Control, Supervivencia,
 * Detección de Letal (All-In) y Remate con Multi-Ataque.
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
    name: 'IA Haruka',

    /**
     * Evalúa si es posible cerrar la partida en este turno (Modo Letal / All-In).
     * En Skill Blast X se gana cuando la banca del rival alcanza 3 derrotas.
     */
    isLethalPushPossible(hand, mySlots, oppSlots) {
      if (typeof playtestState !== 'undefined' && ((playtestState.turnCount || 1) === 1 || playtestState.matchEnded)) {
        return false;
      }

      let oppBenchCount = 0;
      let myBenchCount = 0;
      if (typeof playtestState !== 'undefined') {
        if (mySlots === playtestState.opponentSlots) {
          oppBenchCount = (playtestState.bench || []).length;
          myBenchCount = (playtestState.opponentBench || []).length;
        } else {
          oppBenchCount = (playtestState.opponentBench || []).length;
          myBenchCount = (playtestState.bench || []).length;
        }
      }

      const killsNeeded = 3 - oppBenchCount;
      if (killsNeeded > 2) return false; // Si el rival tiene 0 en banca, permanecer en Modo Control estricto

      const oppChars = (oppSlots || []).filter(s => s && s.character);
      if (oppChars.length === 0) return false;

      // Contar ataques actualmente disponibles en campo
      let currentAttacks = 0;
      (mySlots || []).forEach(s => {
        if (s && s.character && !s.isRotated) {
          const maxAtk = s.maxAttacks || 1;
          const declared = s.attacksDeclared || 0;
          if (declared < maxAtk) currentAttacks += (maxAtk - declared);
        }
      });

      // Ataques adicionales si activamos Ataque Destello (BBX-SP004) en mano o campo
      const hasAtaqueDestello = mySlots.some(s => s && s.skills && s.skills.includes('BBX-SP004')) || hand.includes('BBX-SP004');
      if (hasAtaqueDestello && currentAttacks < 2) currentAttacks = 2;

      // Ataques adicionales si activamos Sobrecarga destello (BBX-SP067) con 2 en banca
      const hasSobrecarga = mySlots.some(s => s && s.skills && s.skills.includes('BBX-SP067')) || hand.includes('BBX-SP067');
      if (hasSobrecarga && myBenchCount >= 2 && currentAttacks < 4) currentAttacks = 4;

      // Personajes básicos invocables desde la mano para sumar ataques
      const summonableChars = hand.filter(id => {
        const c = root.cardsDatabase ? root.cardsDatabase[id] : null;
        return c && c.tipo === 'Personaje' && c.clase !== 'Avanzada';
      });

      // Si no tenemos personajes para sumar en mano, no podemos hacer push de invocación
      if (summonableChars.length === 0) return false;

      // Ataques totales si bajamos atacantes adicionales
      const totalPotentialAttacks = currentAttacks + summonableChars.length;

      // Ordenar personajes rivales por vulnerabilidad (menos skills primero)
      const sortedOppChars = [...oppChars].sort((a, b) => ((a.skills || []).length) - ((b.skills || []).length));

      let hitsNeededForWin = 0;
      let targetsKilled = 0;

      for (const opp of sortedOppChars) {
        if (targetsKilled >= killsNeeded) break;
        const skCount = (opp.skills || []).length;
        const hasMuro = (opp.skills || []).includes('BBX-SP002');
        // Un personaje con N skills requiere N+1 golpes para ser derrotado (Muro de Hielo absorbe 1 extra)
        hitsNeededForWin += (skCount + 1 + (hasMuro ? 1 : 0));
        targetsKilled++;
      }

      // Caso 1: Oponente a 2 en banca (necesita 1 sola baja para ganar la partida).
      // Invocar más atacantes si se necesitan para cubrir las skills del rival o asegurar remate
      if (oppBenchCount >= 2 && oppChars.length >= 1) {
        if (totalPotentialAttacks >= hitsNeededForWin && (currentAttacks <= hitsNeededForWin || currentAttacks < 2)) {
          return true;
        }
      }

      // Caso 2: Oponente a 1 en banca y 2 en campo (necesita 2 bajas para ganar la partida este turno).
      if (oppBenchCount === 1 && targetsKilled >= 2) {
        if (totalPotentialAttacks >= hitsNeededForWin && currentAttacks < hitsNeededForWin) {
          return true;
        }
      }

      return false;
    },

    /**
     * Elige el personaje a invocar desde la mano.
     * - Modo Control: NUNCA sobreextender mientras haya 1 personaje en campo (protege banca y activa ¡Voluntad!).
     * - Modo Letal: Si se detecta ventana para ganar la partida este turno, invoca atacantes adicionales.
     */
    chooseCharacterToSummon(hand, mySlots, oppSlots) {
      if (!hand || hand.length === 0) return null;

      const activeCharCount = (mySlots || []).filter(s => s && s.character).length;
      const isLethal = this.isLethalPushPossible(hand, mySlots, oppSlots);

      // Si ya hay un personaje activo y NO estamos en ventana de Letal: no bajar nada
      if (activeCharCount >= 1 && !isLethal) {
        return null;
      }

      let emptySlotIdx = (mySlots || []).findIndex(s => !s || !s.character);
      if (emptySlotIdx === -1 && mySlots && mySlots.length < 3) {
        emptySlotIdx = mySlots.length;
      }
      if (emptySlotIdx === -1) return null;

      // Preferir centro (Slot 1) si campo está vacío, de lo contrario el primer slot libre
      const targetSlot = (activeCharCount === 0 && mySlots[1] && !mySlots[1].character) ? 1 : emptySlotIdx;

      // Si es push para letal: cualquier básico que pueda atacar inmediatamente
      if (isLethal) {
        const attackPriority = ['BBX-SP361', 'BBX-SP331', 'BBX-SP093', 'BBX-SP180'];
        for (const id of attackPriority) {
          const idx = hand.indexOf(id);
          if (idx !== -1) {
            return { cardId: id, handIndex: idx, targetSlot: targetSlot, isLethalPush: true };
          }
        }
      }

      // Si es campo vacío (Modo Control):
      // 1. Haruka SP093: Descarta 1 y busca 1 Skill de Haruka en el deck (evita quedar desnuda).
      // 2. Haruka SP361: Excava 3 cartas con sus Skills.
      // 3. Haruka SP331: Invocador básico de último recurso.
      // NUNCA Ryu-chan SP180 (Hand Trap) ni Haruka Avanzada SP244 a campo vacío.
      const priority = ['BBX-SP093', 'BBX-SP361', 'BBX-SP331'];
      for (const id of priority) {
        const idx = hand.indexOf(id);
        if (idx !== -1) {
          return { cardId: id, handIndex: idx, targetSlot: targetSlot, isLethalPush: false };
        }
      }

      const fallbackIdx = hand.findIndex(id => {
        const c = root.cardsDatabase ? root.cardsDatabase[id] : null;
        return c && c.tipo === 'Personaje' && c.clase !== 'Avanzada' && id !== 'BBX-SP180';
      });
      if (fallbackIdx !== -1) {
        return { cardId: hand[fallbackIdx], handIndex: fallbackIdx, targetSlot: targetSlot, isLethalPush: false };
      }

      // Solo si el campo está totalmente vacío y la ÚNICA carta de personaje restante es Ryu-chan:
      const ryuIdx = hand.indexOf('BBX-SP180');
      if (ryuIdx !== -1) {
        return { cardId: 'BBX-SP180', handIndex: ryuIdx, targetSlot: targetSlot, isLethalPush: false };
      }

      return null;
    },

    /**
     * Elige y ejecuta efectos desde la mano antes de equipar (ej. Haruka SP331).
     * Adapta la selección del mill según las cartas que faltan en mano y campo.
     */
    getHandComboAction(hand, mySlots, myDeck) {
      if (!hand || !mySlots) return null;
      const activeSlotIdx = mySlots.findIndex(s => s && s.character && root.cardsDatabase[s.character]?.nombre?.includes('Haruka'));
      if (activeSlotIdx === -1) return null;

      const sp331Idx = hand.indexOf('BBX-SP331');
      if (sp331Idx !== -1 && myDeck.includes('BBX-SP008')) {
        const hasAvanzada = hand.includes('BBX-SP244') || mySlots.some(s => s && s.character === 'BBX-SP244');
        const hasRyuChan = hand.includes('BBX-SP180');
        const harukaSkillsInField = (mySlots[activeSlotIdx]?.skills || []).length;

        // Selección adaptativa del mill:
        // 1. Si no tenemos Haruka Avanzada SP244 en mano: mill Energía arcana SP268 (¡la busca al instante!).
        // 2. Si Haruka tiene pocas skills (< 2): mill Fulgor ofensivo SP162 (¡se auto-equipa gratis en campo!).
        // 3. Si no tenemos defensa contra barajado: mill Drago-fulgor SP303 (¡busca a Ryu-chan a la mano!).
        // 4. Si ya tenemos todo: Descifrar ruta SP375.
        const millPref = [];
        if (!hasAvanzada && myDeck.includes('BBX-SP268')) {
          millPref.push('BBX-SP268', 'BBX-SP162', 'BBX-SP303', 'BBX-SP375');
        } else if (harukaSkillsInField < 2 && myDeck.includes('BBX-SP162')) {
          millPref.push('BBX-SP162', 'BBX-SP268', 'BBX-SP303', 'BBX-SP375');
        } else if (!hasRyuChan && myDeck.includes('BBX-SP303')) {
          millPref.push('BBX-SP303', 'BBX-SP162', 'BBX-SP268', 'BBX-SP375');
        } else {
          millPref.push('BBX-SP162', 'BBX-SP268', 'BBX-SP303', 'BBX-SP375');
        }

        return {
          type: 'activate_sp331',
          handIndex: sp331Idx,
          targetSlot: activeSlotIdx,
          equipCardId: 'BBX-SP008',
          millCardPreference: millPref
        };
      }

      return null;
    },

    /**
     * Evalúa activaciones de efectos en campo adaptables al estado dinámico del juego.
     */
    getFieldAction(mySlots, hand, myDeck, myGrave, oppSlots) {
      if (!mySlots) return null;

      const oppHasSkills = (oppSlots || []).some(s => s && s.character && s.skills && s.skills.length > 0);
      let myBenchCount = 0;
      if (typeof playtestState !== 'undefined') {
        if (mySlots === playtestState.opponentSlots) {
          myBenchCount = (playtestState.opponentBench || []).length;
        } else {
          myBenchCount = (playtestState.bench || []).length;
        }
      }
      const oppCarryingManySkills = (oppSlots || []).some(s => s && s.character && s.skills && s.skills.length >= 2);
      const oppCharsWithoutSkills = (oppSlots || []).some(s => s && s.character && (!s.skills || s.skills.length === 0));

      for (let sIdx = 0; sIdx < mySlots.length; sIdx++) {
        const slot = mySlots[sIdx];
        if (!slot || !slot.character || !slot.skills) continue;

        // ---------------------------------------------------------------------
        // 1. Haruka Avanzada (BBX-SP244) Modo Arcano: Búsqueda Situacional
        // ---------------------------------------------------------------------
        if (slot.character === 'BBX-SP244' && !slot.effectUsed && slot.skills.length >= 3 && myDeck.length > 0) {
          const searchPref = [];

          // Situación A: El rival tiene un carry con muchas skills -> Buscar ¡Drago-impacto arcano! (SP245)
          if (oppCarryingManySkills && myDeck.includes('BBX-SP245')) {
            searchPref.push('BBX-SP245');
          }
          // Situación B: Estamos a 2 en banca -> Buscar Sobrecarga destello (SP067) para 4 ataques
          if (myBenchCount >= 2 && myDeck.includes('BBX-SP067')) {
            searchPref.push('BBX-SP067');
          }
          // Situación C: Hay personajes rivales indefensos (0 skills) -> Buscar Ataque Destello (SP004)
          if (oppCharsWithoutSkills && myDeck.includes('BBX-SP004')) {
            searchPref.push('BBX-SP004');
          }
          // Situación D: Control y Candados defensivos
          searchPref.push('BBX-SP411', 'BBX-SP290', 'BBX-SP366', 'BBX-SP224');
          // Situación E: Recursos, reciclaje y defensa
          searchPref.push('BBX-SP033', 'BBX-SP390', 'BBX-SP037', 'BBX-SP060', 'BBX-SP008');

          return {
            type: 'activate_haruka_sp244',
            slotIndex: sIdx,
            preference: searchPref
          };
        }

        // ---------------------------------------------------------------------
        // 2. ¡Drago-impacto arcano! (BBX-SP245): Barrido de Skills rivales
        // ---------------------------------------------------------------------
        if (slot.skills.includes('BBX-SP245') && !slot.usedSkills?.includes('BBX-SP245') && hand.length >= 2 && oppCarryingManySkills) {
          return { type: 'activate_drago_impacto', slotIndex: sIdx, skillId: 'BBX-SP245' };
        }

        // ---------------------------------------------------------------------
        // 3. Multi-Ataques Ofensivos (Preparación antes de la Batalla)
        // ---------------------------------------------------------------------
        // Sobrecarga destello (BBX-SP067): Hasta 4 ataques si tenemos 2 en banca
        if (slot.skills.includes('BBX-SP067') && !slot.usedSkills?.includes('BBX-SP067') && myBenchCount >= 2) {
          return { type: 'activate_sobrecarga_destello', slotIndex: sIdx, skillId: 'BBX-SP067' };
        }
        // Ataque Destello (BBX-SP004): Hasta 2 ataques
        if (slot.skills.includes('BBX-SP004') && !slot.usedSkills?.includes('BBX-SP004') && (slot.maxAttacks || 1) < 2) {
          return { type: 'activate_ataque_destello', slotIndex: sIdx, skillId: 'BBX-SP004' };
        }

        // ---------------------------------------------------------------------
        // 4. Momento oportuno (BBX-SP188): Mill Táctico inteligente
        // ---------------------------------------------------------------------
        if (slot.skills.includes('BBX-SP188') && !slot.usedSkills?.includes('BBX-SP188')) {
          const hasAvanzada = hand.includes('BBX-SP244') || mySlots.some(s => s && s.character === 'BBX-SP244');
          const harukaSkillsInField = slot.skills.length;
          const millPref = [];

          if (harukaSkillsInField < 3 && myDeck.includes('BBX-SP162')) {
            millPref.push('BBX-SP162', 'BBX-SP268', 'BBX-SP303', 'BBX-SP375');
          } else if (!hasAvanzada && myDeck.includes('BBX-SP268')) {
            millPref.push('BBX-SP268', 'BBX-SP162', 'BBX-SP303', 'BBX-SP375');
          } else {
            millPref.push('BBX-SP162', 'BBX-SP268', 'BBX-SP303', 'BBX-SP375');
          }

          return {
            type: 'activate_momento_oportuno',
            slotIndex: sIdx,
            skillId: 'BBX-SP188',
            millPreference: millPref
          };
        }

        // ---------------------------------------------------------------------
        // 5. ¡Voluntad! (BBX-SP008): Robo gratuito (Solo 1 personaje)
        // ---------------------------------------------------------------------
        const activeChars = mySlots.filter(s => s && s.character).length;
        if (activeChars === 1 && slot.skills.includes('BBX-SP008') && !slot.usedSkills?.includes('BBX-SP008')) {
          return { type: 'activate_voluntad', slotIndex: sIdx, skillId: 'BBX-SP008' };
        }

        // ---------------------------------------------------------------------
        // 6. Encaminar (BBX-SP037): Reciclaje del cementerio a la mano
        // ---------------------------------------------------------------------
        if (activeChars === 1 && slot.skills.includes('BBX-SP037') && !slot.usedSkills?.includes('BBX-SP037') && myGrave.some(id => root.cardsDatabase[id]?.tipo === 'Skill' && id !== 'BBX-SP037')) {
          return { type: 'activate_encaminar', slotIndex: sIdx, skillId: 'BBX-SP037' };
        }

        // ---------------------------------------------------------------------
        // 7. Haruka SP093: Descarte para equipar Momento oportuno o Candado
        // ---------------------------------------------------------------------
        if (slot.character === 'BBX-SP093' && !slot.effectUsed && hand.length > 0) {
          const discardCandidate = hand.findIndex(id => id !== 'BBX-SP244' && id !== 'BBX-SP180');
          if (discardCandidate !== -1) {
            return {
              type: 'activate_char_sp093',
              slotIndex: sIdx,
              discardIndex: discardCandidate,
              equipPreference: ['BBX-SP188', 'BBX-SP033', 'BBX-SP411', 'BBX-SP290', 'BBX-SP390', 'BBX-SP004', 'BBX-SP060']
            };
          }
        }

        // ---------------------------------------------------------------------
        // 8. ¡Desatar! (BBX-SP023): Excavar 2 cartas y sumar Skills a mano
        // ---------------------------------------------------------------------
        if (slot.skills.includes('BBX-SP023')) {
          return { type: 'activate_desatar', slotIndex: sIdx, skillId: 'BBX-SP023' };
        }

        // ---------------------------------------------------------------------
        // 9. Carga destello (BBX-SP033): Sacrificar para robar 2 cartas
        // ---------------------------------------------------------------------
        if (slot.skills.includes('BBX-SP033') && slot.skills.length >= 2 && !slot.usedSkills?.includes('BBX-SP033')) {
          const hasAvanzada = hand.includes('BBX-SP244');
          if (hand.length <= 3 || !hasAvanzada) {
            return { type: 'activate_carga_destello', slotIndex: sIdx, skillId: 'BBX-SP033' };
          }
        }

        // ---------------------------------------------------------------------
        // 10. Haruka SP361: Sacrificar 1 skill para excavar 3
        // ---------------------------------------------------------------------
        if (slot.character === 'BBX-SP361' && !slot.effectUsed && slot.skills.length >= 2 && myDeck.length >= 3) {
          return { type: 'activate_char_sp361', slotIndex: sIdx };
        }

        // ---------------------------------------------------------------------
        // 11. Destello perspicaz (BBX-SP390): Rescatar y portar Skill de grave
        // ---------------------------------------------------------------------
        if (slot.skills.includes('BBX-SP390') && !slot.usedSkills?.includes('BBX-SP390') && hand.length > 1) {
          const harukaSkillsInGrave = myGrave.filter(id => {
            const c = root.cardsDatabase[id];
            return c && c.tipo === 'Skill' && c.portador && c.portador.includes('Haruka');
          });
          if (harukaSkillsInGrave.length > 0) {
            return { type: 'activate_destello_perspicaz', slotIndex: sIdx, skillId: 'BBX-SP390' };
          }
        }
      }

      return null;
    },

    /**
     * Elige qué Skills equipar de la mano a qué personajes de forma adaptable.
     */
    getEquipAction(hand, mySlots) {
      if (!hand || !mySlots) return null;

      const availableSlots = [];
      mySlots.forEach((slot, idx) => {
        if (slot && slot.character) {
          availableSlots.push({ slot, index: idx, skillCount: (slot.skills || []).length });
        }
      });
      if (availableSlots.length === 0) return null;

      const hasAvanzadaInHand = hand.includes('BBX-SP244');
      // Priorizar el slot más cercano a evolucionar a Haruka Avanzada (3 skills)
      availableSlots.sort((a, b) => {
        if (hasAvanzadaInHand) {
          return b.skillCount - a.skillCount;
        }
        return a.skillCount - b.skillCount;
      });

      // Jerarquía adaptativa de Skills:
      const equipPriority = [
        'BBX-SP008', // ¡Voluntad! (Robo garantizado si solo 1 personaje)
        'BBX-SP188', // Momento oportuno (Mill para Fulgor / Energía arcana)
        'BBX-SP411', // Siesta (Floodgate: bloquea skills en mano rival)
        'BBX-SP290', // Ahogarse (Floodgate: bloquea personajes en mano rival)
        'BBX-SP224', // Relajo (Bloquea efectos si rival tiene <= 2 skills)
        'BBX-SP366', // Incrustar espada (Inmunidad contra skills)
        'BBX-SP033', // Carga destello (Robo masivo de 2)
        'BBX-SP023', // ¡Desatar! (Excavación de skills)
        'BBX-SP390', // Destello perspicaz (Reciclaje del cementerio)
        'BBX-SP037', // Encaminar (Recuperación continua)
        'BBX-SP375', // Descifrar ruta (Búsqueda al ser enviada)
        'BBX-SP004', // Ataque Destello (Doble ataque)
        'BBX-SP067', // Sobrecarga destello (Hasta 4 ataques)
        'BBX-SP245', // ¡Drago-impacto arcano! (Wipe de skills)
        'BBX-SP045', // ¡Inmovilizar! (Anti-Búsqueda)
        'BBX-SP060'  // Resistir (Escudo vital / Hand Trap)
      ];

      for (const cardId of equipPriority) {
        const handIdx = hand.indexOf(cardId);
        if (handIdx === -1) continue;

        // Gestión Inteligente de Resistir (SP060):
        if (cardId === 'BBX-SP060') {
          const resistirCount = hand.filter(id => id === 'BBX-SP060').length;
          const wouldEnableEvolution = hasAvanzadaInHand && availableSlots.some(s => s.skillCount === 2);
          const characterHasZeroSkills = availableSlots.some(s => s.skillCount === 0);

          // Si el personaje está con 0 skills (peligro inminente de 1 golpe) y no hay otra skill, equipar si tenemos >= 2 copias
          if (characterHasZeroSkills && resistirCount >= 2) {
            // Permitir equipar 1 para tener armadura y guardar 1 en mano
          } else if (resistirCount <= 1 && !wouldEnableEvolution) {
            // Reservar estrictamente como Hand Trap defensiva para el turno del rival
            continue;
          }
        }

        const card = root.cardsDatabase[cardId];
        if (!card || card.tipo !== 'Skill') continue;

        for (const slotObj of availableSlots) {
          // No saturar con más de 4 skills
          if (slotObj.skillCount >= 4) continue;

          // Verificar compatibilidad de portador
          const charCard = root.cardsDatabase[slotObj.slot.character];
          if (!charCard) continue;

          let canEquip = true;
          if (card.portador) {
            canEquip = card.portador.includes('Haruka') && charCard.nombre.includes('Haruka');
          }

          // Verificar regla de copia única (ej. Incrustar espada, ¡Inmovilizar!)
          if (canEquip && slotObj.slot.skills.includes(cardId)) {
            if (card.efecto?.includes('solo puede portar 1')) {
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
     * Soporta declaraciones múltiples de ataque (Ataque Destello SP004 y Sobrecarga SP067).
     */
    getBattleAction(mySlots, oppSlots) {
      if (!mySlots || !oppSlots) return null;
      if (typeof playtestState !== 'undefined' && ((playtestState.turnCount || 1) === 1 || playtestState.matchEnded)) return null;

      // 1. Encontrar todos los atacantes disponibles que no hayan alcanzado su máximo de ataques
      const availableAttackers = [];
      mySlots.forEach((s, idx) => {
        if (s && s.character && !s.isRotated) {
          const maxAtk = s.maxAttacks || 1;
          const declared = s.attacksDeclared || 0;
          if (declared < maxAtk) {
            availableAttackers.push({
              slot: s,
              index: idx,
              skillCount: (s.skills || []).length
            });
          }
        }
      });
      if (availableAttackers.length === 0) return null;

      // 2. Evaluar objetivos del jugador
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
      // Prioridad 2: Personaje rival con menos skills y sin escudos indestructibles
      validTargets.sort((a, b) => {
        if (a.hasMuroHielo && !b.hasMuroHielo) return 1;
        if (!a.hasMuroHielo && b.hasMuroHielo) return -1;
        return a.skillCount - b.skillCount;
      });

      const bestTarget = validTargets[0];

      // Prioridad de Atacante: El personaje con más skills ataca primero para absorber el daño mutuo (clash)
      availableAttackers.sort((a, b) => b.skillCount - a.skillCount);

      return {
        attackerSlotIndex: availableAttackers[0].index,
        targetSlotIndex: bestTarget.index
      };
    },

    /**
     * Respuestas reactivas (Hand Traps cuando la IA es atacada o afectada por el jugador).
     */
    getReactionAction(eventType, context) {
      if (eventType === 'battle_defense') {
        const { attackedSlot, hand, grave } = context;
        if (!attackedSlot) return null;

        // 1. Activar Resistir desde la mano como Hand Trap para salvar al personaje del combate
        if (hand && hand.includes('BBX-SP060')) {
          return { type: 'trigger_resistir_hand', skillId: 'BBX-SP060', handIndex: hand.indexOf('BBX-SP060') };
        }

        // 2. Activar Resistir en campo si está equipado
        if (attackedSlot.skills?.includes('BBX-SP060')) {
          return { type: 'trigger_resistir', skillId: 'BBX-SP060' };
        }

        // 3. Portar Tenacidad implacable (SP034) desde el cementerio si fuera a morir en batalla
        if (grave && grave.includes('BBX-SP034')) {
          return { type: 'trigger_tenacidad_grave', skillId: 'BBX-SP034' };
        }
        if (hand && hand.includes('BBX-SP034')) {
          return { type: 'trigger_tenacidad_hand', skillId: 'BBX-SP034', handIndex: hand.indexOf('BBX-SP034') };
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
