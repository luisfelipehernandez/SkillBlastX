/**
 * Skill Blast X - Rules Engine
 * Centraliza la verificación de reglas globales, continuas y floodgates.
 */

window.RulesEngine = {
  // --- Floodgates y Restricciones de Cementerio ---
  isAnheloGraveBlocked(owner = 'player') {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    return owner === 'player'
      ? !!playtestState.playerGraveEffectsBlockedThisTurn
      : !!playtestState.opponentGraveEffectsBlockedThisTurn;
  },

  isSkillGraveEffectBlocked() {
    if (typeof playtestState === 'undefined' || !playtestState || !playtestState.slots) return false;
    const isRyuChan = b => {
      const id = typeof b === 'object' && b !== null ? b.id : b;
      return cardsDatabase[id]?.tipo === 'Personaje' && cardsDatabase[id]?.nombre?.includes('Ryu-chan');
    };

    // Jugador
    const playerHasActiveFafnir = (playtestState.slots || []).some(s => {
      if (!s.character || !cardsDatabase[s.character]?.nombre?.includes("Nobuko")) return false;
      if (!s.skills || !s.skills.includes('BBX-SP332')) return false;
      if (typeof isSkillEffectBlocked === 'function' && isSkillEffectBlocked('BBX-SP332', 'player', s)) return false;
      return true;
    }) && (playtestState.bench || []).some(isRyuChan);

    if (playerHasActiveFafnir) return true;

    // Rival
    const oppHasActiveFafnir = (playtestState.opponentSlots || []).some(s => {
      if (!s.character || !cardsDatabase[s.character]?.nombre?.includes("Nobuko")) return false;
      if (!s.skills || !s.skills.includes('BBX-SP332')) return false;
      if (typeof isSkillEffectBlocked === 'function' && isSkillEffectBlocked('BBX-SP332', 'opponent', s)) return false;
      return true;
    }) && (playtestState.opponentBench || []).some(isRyuChan);

    return !!oppHasActiveFafnir;
  },

  isCharacterGraveEffectBlocked() {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const playerHasLyna = (playtestState.slots || []).some(s => s.character === 'BBX-SP327');
    const oppHasLyna = (playtestState.opponentSlots || []).some(s => s.character === 'BBX-SP327');
    return playerHasLyna || oppHasLyna;
  },

  isGraveToHandBlocked() {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const playerHasHaruka = (playtestState.slots || []).some(s => s.character === 'BBX-SP251');
    const oppHasHaruka = (playtestState.opponentSlots || []).some(s => s.character === 'BBX-SP251');
    return playerHasHaruka || oppHasHaruka;
  },

  isPuntoDeControlActive() {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const playerControls = (playtestState.slots || []).some(s => s.character && s.skills && s.skills.includes('BBX-SP198'));
    const oppControls = (playtestState.opponentSlots || []).some(s => s.character && s.skills && s.skills.includes('BBX-SP198'));
    return playerControls || oppControls;
  },

  // --- Floodgates de Mano ---
  isCharacterHandEffectBlocked() {
    return this.isAhogarseActive();
  },

  isAhogarseActive() {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const inPlayer = (playtestState.slots || []).some(s => s.character && s.skills && s.skills.includes('BBX-SP290') && !this.isSkillEffectBlocked('BBX-SP290', 'player', s));
    const inOpp = (playtestState.opponentSlots || []).some(s => s.character && s.skills && s.skills.includes('BBX-SP290') && !this.isSkillEffectBlocked('BBX-SP290', 'opponent', s));
    return inPlayer || inOpp;
  },

  isSkillHandEffectBlocked(owner = null) {
    return this.isSiestaActive();
  },

  isSiestaActive() {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const inPlayer = (playtestState.slots || []).some(s => s && s.character && s.skills && s.skills.includes('BBX-SP411') && (typeof isSkillEffectBlocked !== 'function' || !isSkillEffectBlocked('BBX-SP411', 'player', s)));
    const inOpp = (playtestState.opponentSlots || []).some(s => s && s.character && s.skills && s.skills.includes('BBX-SP411') && (typeof isSkillEffectBlocked !== 'function' || !isSkillEffectBlocked('BBX-SP411', 'opponent', s)));
    return inPlayer || inOpp;
  },

  // --- Floodgates de Banca ---
  isHarukaSP345Active() {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const playerHasHaruka = (playtestState.slots || []).some(s => s.character === 'BBX-SP345');
    const oppHasHaruka = (playtestState.opponentSlots || []).some(s => s.character === 'BBX-SP345');
    return playerHasHaruka || oppHasHaruka;
  },

  isAislamientoActive() {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const mine = (playtestState.slots || []).some(s => s.character && s.skills && s.skills.includes('BBX-SP128'));
    const opp = (playtestState.opponentSlots || []).some(s => s.character && s.skills && s.skills.includes('BBX-SP128'));
    return mine || opp;
  },

  isBenchEffectBlocked(owner = null) {
    return this.isAislamientoActive() || this.isHarukaSP345Active();
  },

  // --- Floodgates de Invocación / Jugar desde Deck ---
  isKatherineSP350Active() {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const playerHasKatherine = (playtestState.slots || []).some(s => s.character === 'BBX-SP350');
    const oppHasKatherine = (playtestState.opponentSlots || []).some(s => s.character === 'BBX-SP350');
    return playerHasKatherine || oppHasKatherine;
  },

  isPlayCharacterFromDeckBlocked() {
    return this.isKatherineSP350Active();
  },

  // --- Floodgates de Robo ---
  isVoidOhActive() {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const inPlayer = (playtestState.slots || []).some(s => s.character === 'BBX-SP308');
    const inOpp = (playtestState.opponentSlots || []).some(s => s.character === 'BBX-SP308');
    return inPlayer || inOpp;
  },

  isDrawBlockedByNara(target = 'player') {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const hasNara = (playtestState.slots || []).some(s => s.character === 'BBX-SP252') ||
                    (playtestState.opponentSlots || []).some(s => s.character === 'BBX-SP252');
    if (!hasNara) return false;
    const count = (target === 'player')
      ? (playtestState.slots || []).filter(s => s.character).length
      : (playtestState.opponentSlots || []).filter(s => s.character).length;
    return count === 1;
  },

  isDrawBySkillBlocked(target = 'player', qty = 1) {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    if (target === 'player' && playtestState.cannotDrawByEffectsThisTurn) return true;
    const playerHasDeida = (playtestState.slots || []).some(s => s.character === 'BBX-SP136');
    const oppHasDeida = (playtestState.opponentSlots || []).some(s => s.character === 'BBX-SP136');
    if (playerHasDeida || oppHasDeida) return true;
    if (this.isDrawBlockedByNara(target)) return true;
    if (qty >= 2 && this.isVoidOhActive()) return true;
    return false;
  },

  isDrawByCharacterBlocked(target = 'player', qty = 1) {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    if (target === 'player' && playtestState.cannotDrawByEffectsThisTurn) return true;
    const playerHasHelica = (playtestState.slots || []).some(s => s.character === 'BBX-SP135');
    const oppHasHelica = (playtestState.opponentSlots || []).some(s => s.character === 'BBX-SP135');
    if (playerHasHelica || oppHasHelica) return true;
    if (this.isDrawBlockedByNara(target)) return true;
    if (qty >= 2 && this.isVoidOhActive()) return true;
    return false;
  },

  // --- Floodgates de Deck y Ataque ---
  isConmocionActive() {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const inPlayer = (playtestState.slots || []).some(s => s.character && s.skills && s.skills.includes('BBX-SP261'));
    const inOpp = (playtestState.opponentSlots || []).some(s => s.character && s.skills && s.skills.includes('BBX-SP261'));
    return inPlayer || inOpp;
  },

  isEmblemaFafnirlandActive() {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const inPlayer = (playtestState.slots || []).some(s => s.character && s.skills && s.skills.includes('BBX-SP239'));
    const inOpp = (playtestState.opponentSlots || []).some(s => s.character && s.skills && s.skills.includes('BBX-SP239'));
    return inPlayer || inOpp;
  },

  isPraderaActive() {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const inPlayer = (playtestState.slots || []).some(s => s.character && s.skills && s.skills.includes('BBX-SP254'));
    const inOpp = (playtestState.opponentSlots || []).some(s => s.character && s.skills && s.skills.includes('BBX-SP254'));
    return inPlayer || inOpp;
  },

  // --- Negaciones y Restricciones de Campo ---
  isSkillEffectBlocked(skillId, owner = 'player', slot = null) {
    return false;
  },

  isSkillBannedFromEquip(skillId) {
    if (!skillId || typeof playtestState === 'undefined' || !playtestState.cannotEquipSkillNameThisTurn) return false;
    const c = cardsDatabase[skillId];
    return c && c.nombre === playtestState.cannotEquipSkillNameThisTurn;
  },

  isPenumbraActive() {
    if (typeof playtestState === 'undefined' || !playtestState || !playtestState.slots) return false;

    // Jugador
    const playerHasPenumbra = (playtestState.slots || []).some(s => {
      if (!s.character || !s.skills || !s.skills.includes('BBX-SP334')) return false;
      if (typeof isSkillEffectBlocked === 'function' && isSkillEffectBlocked('BBX-SP334', 'player', s)) return false;
      return true;
    });
    if (playerHasPenumbra) return true;

    // Rival
    const oppHasPenumbra = (playtestState.opponentSlots || []).some(s => {
      if (!s.character || !s.skills || !s.skills.includes('BBX-SP334')) return false;
      if (typeof isSkillEffectBlocked === 'function' && isSkillEffectBlocked('BBX-SP334', 'opponent', s)) return false;
      return true;
    });
    return !!oppHasPenumbra;
  },

  isIncrustarEspadaActive() {
    if (typeof playtestState === 'undefined' || !playtestState || !playtestState.slots) return false;

    // Jugador
    const playerHasIncrustar = (playtestState.slots || []).some(s => {
      if (!s.character || !s.skills || !s.skills.includes('BBX-SP366')) return false;
      if (typeof isSkillEffectBlocked === 'function' && isSkillEffectBlocked('BBX-SP366', 'player', s)) return false;
      return true;
    });
    if (playerHasIncrustar) return true;

    // Rival
    const oppHasIncrustar = (playtestState.opponentSlots || []).some(s => {
      if (!s.character || !s.skills || !s.skills.includes('BBX-SP366')) return false;
      if (typeof isSkillEffectBlocked === 'function' && isSkillEffectBlocked('BBX-SP366', 'opponent', s)) return false;
      return true;
    });
    return !!oppHasIncrustar;
  },

  canEquipFromZone(fromZone, skillId = null) {
    if (skillId && this.isSkillBannedFromEquip(skillId)) return false;
    if (typeof playtestState === 'undefined' || !playtestState) return true;
    const isKatherine85InPlay = (playtestState.slots || []).some(s => s.character === 'BBX-SP085') || 
                                (playtestState.opponentSlots || []).some(s => s.character === 'BBX-SP085');
    if (isKatherine85InPlay && (fromZone === 'deck' || fromZone === 'grave')) {
      return false;
    }
    // Penumbra BBX-SP334: Ningún jugador puede portar Skills desde su deck a un Personaje.
    if (fromZone === 'deck' && this.isPenumbraActive()) {
      return false;
    }
    return true;
  },

  isEishetSP320Active() {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const playerHasEishet = (playtestState.slots || []).some(s => s.character === 'BBX-SP320' && !this.isCharacterEffectBlocked('player', s));
    const oppHasEishet = (playtestState.opponentSlots || []).some(s => s.character === 'BBX-SP320' && !this.isCharacterEffectBlocked('opponent', s));
    return playerHasEishet || oppHasEishet;
  },

  canEquipSkillToSlotDueToEishetSP320(skillId, slot) {
    if (!this.isEishetSP320Active()) return true;
    if (!slot || !slot.skills || slot.skills.length === 0) return true;
    const targetCard = cardsDatabase[skillId];
    if (!targetCard) return true;
    const targetName = targetCard.nombre;
    return !slot.skills.some(existingSkId => cardsDatabase[existingSkId]?.nombre === targetName);
  },

  isRelajoActive() {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const playerHas = (playtestState.slots || []).some(s => s.character && s.skills && s.skills.includes('BBX-SP224'));
    const oppHas = (playtestState.opponentSlots || []).some(s => s.character && s.skills && s.skills.includes('BBX-SP224'));
    return playerHas || oppHas;
  },

  isMantenimientoActive() {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    const playerHas = (playtestState.slots || []).some(s => s.character && s.skills && s.skills.includes('BBX-SP230'));
    const oppHas = (playtestState.opponentSlots || []).some(s => s.character && s.skills && s.skills.includes('BBX-SP230'));
    return playerHas || oppHas;
  },

  isCharacterEffectBlocked(owner, slot = null) {
    if (typeof playtestState === 'undefined' || !playtestState) return false;
    if (this.isRelajoActive() && slot && (!slot.skills || slot.skills.length <= 2)) {
      return true;
    }
    if (this.isMantenimientoActive() && slot && typeof getMantenimientoRestrictedSlot === 'function') {
      const restricted = getMantenimientoRestrictedSlot();
      if (restricted && restricted.owner === owner && restricted.slot === slot) {
        return true;
      }
    }
    if (owner === 'player') {
      const oppHasMantener = (playtestState.opponentSlots || []).some(s => s.character && s.skills.includes('BBX-SP084'));
      const playerCharCount = (playtestState.slots || []).filter(s => s.character).length;
      if (oppHasMantener && playerCharCount >= 2) return true;
    } else if (owner === 'opponent') {
      const playerHasMantener = (playtestState.slots || []).some(s => s.character && s.skills.includes('BBX-SP084'));
      const oppCharCount = (playtestState.opponentSlots || []).filter(s => s.character).length;
      if (playerHasMantener && oppCharCount >= 2) return true;
    }
    return false;
  },

  // --- Interceptor Central por Zonas ---
  canActivateFromZone(cardId, zone, owner = 'player', context = {}) {
    const card = typeof cardsDatabase !== 'undefined' ? cardsDatabase[cardId] : null;
    const cardName = card ? card.nombre : cardId;
    const isSkill = card ? card.tipo === 'Skill' : cardId?.startsWith('BBX-SP');

    // Verificación de Próximo destino (BBX-SP406) para Skills en cualquier zona (campo, mano, cementerio, banca)
    if (isSkill) {
      const isBlockedByProximo = typeof isSkillBlockedByProximoDestino === 'function'
        ? isSkillBlockedByProximoDestino(cardId, owner)
        : (typeof window !== 'undefined' && typeof window.isSkillBlockedByProximoDestino === 'function'
          ? window.isSkillBlockedByProximoDestino(cardId, owner)
          : false);
      if (isBlockedByProximo) {
        if (typeof addLog === 'function') {
          addLog(`[Efecto ${cardName}] Bloqueado por Próximo destino (BBX-SP406): Ya activaste el efecto de una Skill con el mismo nombre este turno.`, 'var(--text-muted)');
        }
        return { allowed: false, reason: 'ProximoDestino' };
      }
    }

    // 1. Zona CEMENTERIO
    if (zone === 'grave') {
      if (this.isAnheloGraveBlocked(owner)) {
        if (typeof addLog === 'function') {
          addLog(`[Efecto ${cardName}] Bloqueado por Anhelo (BBX-SP352): Los efectos de cartas en el cementerio están bloqueados este turno.`, 'var(--text-muted)');
        }
        return { allowed: false, reason: 'AnheloSP352' };
      }
      if (isSkill && this.isSkillGraveEffectBlocked()) {
        if (typeof addLog === 'function') {
          addLog(`[Efecto ${cardName}] Bloqueado por Secretos de Fafnirland (BBX-SP332): Ningún jugador puede usar efectos de Skills desde sus cementerios.`, 'var(--text-muted)');
        }
        return { allowed: false, reason: 'Fafnirland' };
      }
      if (!isSkill && this.isCharacterGraveEffectBlocked()) {
        if (typeof addLog === 'function') {
          addLog(`[Efecto ${cardName}] Bloqueado por Lyna (BBX-SP327): Ningún jugador puede usar efectos de Personajes en su cementerio.`, 'var(--text-muted)');
        }
        return { allowed: false, reason: 'LynaSP327' };
      }
    }

    // 2. Zona MANO
    if (zone === 'hand') {
      if (!isSkill && this.isCharacterHandEffectBlocked()) {
        if (typeof addLog === 'function') {
          addLog(`[Efecto ${cardName}] Bloqueado por Ahogarse (BBX-SP290): Ningún jugador puede usar efectos de Personajes en su mano.`, 'var(--text-muted)');
        }
        return { allowed: false, reason: 'Ahogarse' };
      }
      if (isSkill && this.isSkillHandEffectBlocked(owner)) {
        if (typeof addLog === 'function') {
          addLog(`[Efecto ${cardName}] Bloqueado por Siesta (BBX-SP411): Ningún jugador puede usar efectos de Skills en su mano.`, 'var(--text-muted)');
        }
        return { allowed: false, reason: 'SiestaSP411' };
      }
    }

    // 3. Zona CAMPO
    if (zone === 'field') {
      if (!isSkill && this.isCharacterEffectBlocked(owner, context.slot)) {
        if (typeof addLog === 'function') {
          addLog(`[Efecto ${cardName}] Bloqueado por restricción de campo (Relajo, Mantenimiento o Mantener distancia).`, 'var(--text-muted)');
        }
        return { allowed: false, reason: 'FieldRestriction' };
      }
    }

    // 4. Zona BANCA
    if (zone === 'bench') {
      if (this.isHarukaSP345Active()) {
        if (typeof addLog === 'function') {
          addLog(`[Efecto ${cardName}] Bloqueado por Haruka (BBX-SP345): Ningún jugador puede usar efectos de Personajes en su banca.`, 'var(--text-muted)');
        }
        return { allowed: false, reason: 'HarukaSP345' };
      }
      if (this.isAislamientoActive()) {
        if (typeof addLog === 'function') {
          addLog(`[Efecto ${cardName}] Bloqueado por Aislamiento (BBX-SP128).`, 'var(--text-muted)');
        }
        return { allowed: false, reason: 'Aislamiento' };
      }
    }

    return { allowed: true };
  }
};

// Puente de compatibilidad con código existente en app.js
window.isSkillGraveEffectBlocked = () => window.RulesEngine.isSkillGraveEffectBlocked();
window.isCharacterGraveEffectBlocked = () => window.RulesEngine.isCharacterGraveEffectBlocked();
window.isGraveToHandBlocked = () => window.RulesEngine.isGraveToHandBlocked();
window.isPuntoDeControlActive = () => window.RulesEngine.isPuntoDeControlActive();
window.isCharacterHandEffectBlocked = () => window.RulesEngine.isCharacterHandEffectBlocked();
window.isAhogarseActive = () => window.RulesEngine.isAhogarseActive();
window.isSkillHandEffectBlocked = (o) => window.RulesEngine.isSkillHandEffectBlocked(o);
window.isSiestaActive = () => window.RulesEngine.isSiestaActive();
window.isHarukaSP345Active = () => window.RulesEngine.isHarukaSP345Active();
window.isAislamientoActive = () => window.RulesEngine.isAislamientoActive();
window.isBenchEffectBlocked = (o) => window.RulesEngine.isBenchEffectBlocked(o);
window.isDrawBySkillBlocked = (t, q) => window.RulesEngine.isDrawBySkillBlocked(t, q);
window.isDrawByCharacterBlocked = (t, q) => window.RulesEngine.isDrawByCharacterBlocked(t, q);
window.isDrawBlockedByNara = (t) => window.RulesEngine.isDrawBlockedByNara(t);
window.isVoidOhActive = () => window.RulesEngine.isVoidOhActive();
window.isConmocionActive = () => window.RulesEngine.isConmocionActive();
window.isEmblemaFafnirlandActive = () => window.RulesEngine.isEmblemaFafnirlandActive();
window.isPraderaActive = () => window.RulesEngine.isPraderaActive();
window.isPenumbraActive = () => window.RulesEngine.isPenumbraActive();
window.canEquipFromZone = (z, s) => window.RulesEngine.canEquipFromZone(z, s);
window.canEquipSkillToSlotDueToEishetSP320 = (s, sl) => window.RulesEngine.canEquipSkillToSlotDueToEishetSP320(s, sl);
window.isEishetSP320Active = () => window.RulesEngine.isEishetSP320Active();
window.isRelajoActive = () => window.RulesEngine.isRelajoActive();
window.isMantenimientoActive = () => window.RulesEngine.isMantenimientoActive();
window.isKatherineSP350Active = () => window.RulesEngine.isKatherineSP350Active();
window.isPlayCharacterFromDeckBlocked = () => window.RulesEngine.isPlayCharacterFromDeckBlocked();
window.isAnheloGraveBlocked = (o) => window.RulesEngine.isAnheloGraveBlocked(o);
