/**
 * Skill Blast X - Bench Effects
 * Registro unificado de habilidades de Personajes en la Banca.
 */

window.BenchEffects = {
  /**
   * Set de IDs de cartas con efecto de banca
   */
  registeredIds: new Set([
    'BBX-SP099', 'BBX-SP105', 'BBX-SP126', 'BBX-SP165',
    'BBX-SP183', 'BBX-SP193', 'BBX-SP242', 'BBX-SP248',
    'BBX-SP278', 'BBX-SP280', 'BBX-SP285', 'BBX-SP286',
    'BBX-SP367'
  ]),

  /**
   * Verifica si una carta tiene habilidad de banca
   */
  has(cardId) {
    return this.registeredIds.has(cardId);
  },

  /**
   * Valida si el efecto de banca puede ser activado
   */
  canActivate(cardId, owner = 'player') {
    if (typeof isBenchEffectBlocked === 'function' && isBenchEffectBlocked(owner)) {
      if (typeof addLog === 'function') {
        const reason = (typeof isHarukaSP345Active === 'function' && isHarukaSP345Active())
          ? 'Haruka (BBX-SP345): Ningún jugador puede usar efectos de Personajes en su banca'
          : 'Aislamiento (SP128)';
        addLog(`[Banca] Los efectos de banca están bloqueados por ${reason}.`, 'var(--text-muted)');
      }
      return false;
    }
    return true;
  },

  /**
   * Ejecuta el efecto de banca delegando en el manejador existente o personalizado
   */
  execute(cardId, index, owner = 'player') {
    if (!this.canActivate(cardId, owner)) return false;

    if (owner === 'player') {
      if (typeof activateBenchEffect === 'function') {
        return activateBenchEffect(index);
      }
    } else {
      if (cardId === 'BBX-SP099' && typeof activateOpponentHelicaBenchSP099 === 'function') {
        return activateOpponentHelicaBenchSP099(index);
      } else if (cardId === 'BBX-SP105' && typeof activateOpponentKatherineBenchSP105 === 'function') {
        return activateOpponentKatherineBenchSP105(index);
      } else if (cardId === 'BBX-SP126' && typeof activateOpponentRyuChanBenchSP126 === 'function') {
        return activateOpponentRyuChanBenchSP126(index);
      } else if (cardId === 'BBX-SP165' && typeof activateOpponentHelicaBenchSP165 === 'function') {
        return activateOpponentHelicaBenchSP165(index);
      } else if (cardId === 'BBX-SP183' && typeof activateOpponentRyuChanBenchSP183 === 'function') {
        return activateOpponentRyuChanBenchSP183(index);
      } else if (cardId === 'BBX-SP193' && typeof activateOpponentHelicaBenchSP193 === 'function') {
        return activateOpponentHelicaBenchSP193(index);
      } else if (cardId === 'BBX-SP242' && typeof activateOpponentKatshiBenchSP242 === 'function') {
        return activateOpponentKatshiBenchSP242(index);
      } else if (cardId === 'BBX-SP248' && typeof activateOpponentKatherineBenchSP248 === 'function') {
        return activateOpponentKatherineBenchSP248(index);
      } else if (cardId === 'BBX-SP278' && typeof activateOpponentEishetBenchSP278 === 'function') {
        return activateOpponentEishetBenchSP278(index);
      } else if (cardId === 'BBX-SP280' && typeof activateOpponentChiakoBenchSP280 === 'function') {
        return activateOpponentChiakoBenchSP280(index);
      } else if (cardId === 'BBX-SP285' && typeof activateOpponentKatherineBenchSP285 === 'function') {
        return activateOpponentKatherineBenchSP285(index);
      } else if (cardId === 'BBX-SP286' && typeof activateOpponentLynaBenchSP286 === 'function') {
        return activateOpponentLynaBenchSP286(index);
      } else if (cardId === 'BBX-SP367' && typeof executeVoidOhSP367 === 'function') {
        return executeVoidOhSP367('opponent', index);
      }
    }
    return false;
  }
};
