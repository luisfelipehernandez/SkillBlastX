/**
 * Skill Blast X - Graveyard Effects & Triggers
 * Registro unificado y despachador de triggers de cartas al ir al cementerio.
 */

(function(root) {
  'use strict';

  const GraveEffects = {
    /**
     * Mapa de manejadores de efectos de cementerio por ID de carta
     */
    handlers: {
      // --- Arquetipo Katherine ---
      'BBX-SP087': (cardId, owner, ctx) => typeof checkAndTriggerLlamarada === 'function' && checkAndTriggerLlamarada(cardId, owner, ctx),
      'BBX-SP088': (cardId, owner, ctx) => typeof checkAndTriggerEspiral === 'function' && checkAndTriggerEspiral(cardId, owner, ctx),
      'BBX-SP094': (cardId, owner, ctx) => typeof checkAndTriggerFirewall === 'function' && checkAndTriggerFirewall(cardId, owner, ctx),
      'BBX-SP140': (cardId, owner, ctx) => typeof checkAndTriggerFervor === 'function' && checkAndTriggerFervor(cardId, owner, ctx),
      'BBX-SP144': (cardId, owner, ctx) => typeof checkAndTriggerApunteIgneo === 'function' && checkAndTriggerApunteIgneo(cardId, owner, ctx),
      'BBX-SP156': (cardId, owner, ctx) => typeof checkAndTriggerAlmacenamientoFallido === 'function' && checkAndTriggerAlmacenamientoFallido(cardId, ctx.fromZone || 'deck', owner, ctx),
      'BBX-SP170': (cardId, owner, ctx) => typeof checkAndTriggerEspiralDigital === 'function' && checkAndTriggerEspiralDigital(cardId, ctx.fromZone || 'deck', owner, ctx),
      'BBX-SP203': (cardId, owner, ctx) => typeof checkAndTriggerBolaDeFuego === 'function' && checkAndTriggerBolaDeFuego(cardId, ctx.fromZone || 'deck', owner, ctx),
      'BBX-SP329': (cardId, owner, ctx) => typeof checkAndTriggerFuegoDigital === 'function' && checkAndTriggerFuegoDigital(cardId, ctx.fromZone || 'deck', owner, ctx),
      'BBX-SP363': (cardId, owner, ctx) => typeof checkAndTriggerTareaNocturnaSP363 === 'function' && checkAndTriggerTareaNocturnaSP363(cardId, ctx.fromZone || 'deck', owner, ctx),
      'BBX-SP402': (cardId, owner, ctx) => typeof checkAndTriggerEncargoSP402 === 'function' && checkAndTriggerEncargoSP402(cardId, ctx.fromZone || 'deck', owner, ctx),
      'BBX-SP407': (cardId, owner, ctx) => typeof checkAndTriggerTormentaDigitalSP407 === 'function' && checkAndTriggerTormentaDigitalSP407(cardId, ctx.fromZone || 'deck', owner, ctx),
      'BBX-SP413': (cardId, owner, ctx) => typeof checkAndTriggerFlamaCerteraSP413 === 'function' && checkAndTriggerFlamaCerteraSP413(cardId, ctx.fromZone || 'deck', owner, ctx),

      // --- Arquetipo Marina ---
      'BBX-SP018': (cardId, owner, ctx) => {
        if (owner === 'player') {
          return typeof checkAndTriggerTorbellino === 'function' && checkAndTriggerTorbellino(cardId, ctx.isEquipped !== false);
        } else {
          return typeof checkAndTriggerTorbellinoOpponent === 'function' && checkAndTriggerTorbellinoOpponent(cardId, ctx.isEquipped !== false);
        }
      },
      'BBX-SP028': (cardId, owner, ctx) => typeof checkAndTriggerSplash === 'function' && checkAndTriggerSplash(cardId, owner, ctx),
      'BBX-SP143': (cardId, owner, ctx) => typeof checkAndTriggerColgante === 'function' && checkAndTriggerColgante(cardId, owner, ctx),
      'BBX-SP238': (cardId, owner, ctx) => {
        if (owner === 'player') {
          return typeof checkAndTriggerTorbellino === 'function' && checkAndTriggerTorbellino(cardId, ctx.isEquipped !== false);
        } else {
          return typeof checkAndTriggerTorbellinoOpponent === 'function' && checkAndTriggerTorbellinoOpponent(cardId, ctx.isEquipped !== false);
        }
      },
      'BBX-SP421': (cardId, owner, ctx) => typeof checkAndTriggerVoluntadDelAguaSP421 === 'function' && checkAndTriggerVoluntadDelAguaSP421(cardId, owner, ctx, ctx ? ctx.testOptions : {}, ctx ? ctx.onDone : null),

      // --- Arquetipo Lyna ---
      'BBX-SP271': (cardId, owner, ctx) => {
        if (owner === 'player') {
          return typeof checkAndTriggerVendavalTajante === 'function' && checkAndTriggerVendavalTajante(cardId, ctx.isEquipped !== false, 'player');
        } else {
          return typeof checkAndTriggerVendavalTajanteOpponent === 'function' && checkAndTriggerVendavalTajanteOpponent(cardId, ctx.isEquipped !== false, 'opponent');
        }
      },
      'BBX-SP272': (cardId, owner, ctx) => {
        if (owner === 'player') {
          return typeof checkAndTriggerDesenfundar === 'function' && checkAndTriggerDesenfundar(cardId, ctx.isEquipped !== false, 'player');
        } else {
          return typeof checkAndTriggerDesenfundarOpponent === 'function' && checkAndTriggerDesenfundarOpponent(cardId, ctx.isEquipped !== false, 'opponent');
        }
      },
      'BBX-SP273': (cardId, owner, ctx) => {
        if (owner === 'player') {
          return typeof checkAndTriggerTripleEstocada === 'function' && checkAndTriggerTripleEstocada(cardId, ctx.isEquipped !== false, 'player');
        } else {
          return typeof checkAndTriggerTripleEstocadaOpponent === 'function' && checkAndTriggerTripleEstocadaOpponent(cardId, ctx.isEquipped !== false, 'opponent');
        }
      },
      'BBX-SP274': (cardId, owner, ctx) => {
        if (owner === 'player') {
          return typeof checkAndTriggerDescuido === 'function' && checkAndTriggerDescuido(cardId, ctx.isEquipped !== false, 'player');
        } else {
          return typeof checkAndTriggerDescuidoOpponent === 'function' && checkAndTriggerDescuidoOpponent(cardId, ctx.isEquipped !== false, 'opponent');
        }
      },
      'BBX-SP313': (cardId, owner, ctx) => typeof checkAndTriggerTajoVentada === 'function' && checkAndTriggerTajoVentada(cardId, owner, ctx, ctx ? ctx.testOptions : {}, ctx ? ctx.onDone : null),
      'BBX-SP325': (cardId, owner, ctx) => typeof checkAndTriggerPorAlla === 'function' && checkAndTriggerPorAlla(cardId, owner, ctx, ctx ? ctx.testOptions : {}, ctx ? ctx.onDone : null),
      'BBX-SP355': (cardId, owner, ctx) => typeof checkAndTriggerInermeSP355 === 'function' && checkAndTriggerInermeSP355(cardId, owner, ctx),

      // --- Arquetipo Tagero / Roy ---
      'BBX-SP021': (cardId, owner, ctx) => typeof checkAndTriggerExplosionTrueno === 'function' && checkAndTriggerExplosionTrueno(ctx.slotIndex ?? 0, cardId, owner, ctx),
      'BBX-SP048': (cardId, owner, ctx) => typeof checkAndTriggerCargaSorpresa === 'function' && checkAndTriggerCargaSorpresa(cardId, owner, ctx),
      'BBX-SP072': (cardId, owner, ctx) => typeof checkAndTriggerContraofensiva === 'function' && checkAndTriggerContraofensiva(cardId, owner, ctx),
      'BBX-SP151': (cardId, owner, ctx) => typeof checkAndTriggerConcentrarFuego === 'function' && checkAndTriggerConcentrarFuego(cardId, owner, ctx),
      'BBX-SP152': (cardId, owner, ctx) => typeof checkAndTriggerCrimenNocturno === 'function' && checkAndTriggerCrimenNocturno(cardId, owner, ctx),
      'BBX-SP195': (cardId, owner, ctx) => typeof checkAndTriggerLiberarEstatica === 'function' && checkAndTriggerLiberarEstatica(cardId, owner, ctx),
      'BBX-SP347': (cardId, owner, ctx) => typeof checkAndTriggerAlumbrarSP347 === 'function' && checkAndTriggerAlumbrarSP347(cardId, ctx.fromZone || 'deck', owner, ctx),

      // --- Arquetipo Haruka / Sophia / Bao / Nara / Katshi / Otros ---
      'BBX-SP014': (cardId, owner, ctx) => typeof checkAndTriggerSupportPlan === 'function' && checkAndTriggerSupportPlan(cardId, owner, ctx),
      'BBX-SP015': (cardId, owner, ctx) => typeof checkAndTriggerAlBorde === 'function' && checkAndTriggerAlBorde(cardId, owner, ctx),
      'BBX-SP022': (cardId, owner, ctx) => typeof checkAndTriggerDesechos === 'function' && checkAndTriggerDesechos(cardId, owner, ctx),
      'BBX-SP035': (cardId, owner, ctx) => typeof checkAndTriggerArremetida === 'function' && checkAndTriggerArremetida(cardId, owner, ctx),
      'BBX-SP036': (cardId, owner, ctx) => typeof checkAndTriggerReflejo === 'function' && checkAndTriggerReflejo(cardId, owner, ctx),
      'BBX-SP049': (cardId, owner, ctx) => typeof checkAndTriggerPeligroInminente === 'function' && checkAndTriggerPeligroInminente(cardId, owner, ctx),
      'BBX-SP053': (cardId, owner, ctx) => typeof checkAndTriggerRomperElPiso === 'function' && checkAndTriggerRomperElPiso(cardId, owner, ctx),
      'BBX-SP055': (cardId, owner, ctx) => typeof checkAndTriggerEstrategia === 'function' && checkAndTriggerEstrategia(cardId, owner, ctx),
      'BBX-SP081': (cardId, owner, ctx) => typeof checkAndTriggerHackeo === 'function' && checkAndTriggerHackeo(cardId, owner, ctx),
      'BBX-SP095': (cardId, owner, ctx) => typeof checkAndTriggerPresidioIncierto === 'function' && checkAndTriggerPresidioIncierto(cardId, owner, ctx),
      'BBX-SP123': (cardId, owner, ctx) => {
        if (owner === 'player') {
          return typeof checkAndTriggerConectarSistemaPlayer === 'function' && checkAndTriggerConectarSistemaPlayer(cardId);
        } else {
          return typeof checkAndTriggerConectarSistemaOpponent === 'function' && checkAndTriggerConectarSistemaOpponent(cardId);
        }
      },
      'BBX-SP124': (cardId, owner, ctx) => {
        if (owner === 'player') {
          return typeof checkAndTriggerFulgorProminentePlayer === 'function' && checkAndTriggerFulgorProminentePlayer(cardId);
        } else {
          return typeof checkAndTriggerFulgorProminenteOpponent === 'function' && checkAndTriggerFulgorProminenteOpponent(cardId);
        }
      },
      'BBX-SP134': (cardId, owner, ctx) => {
        if (owner === 'player') {
          return typeof checkAndTriggerDesdeLaSombraPlayer === 'function' && checkAndTriggerDesdeLaSombraPlayer(cardId);
        } else {
          return typeof checkAndTriggerDesdeLaSombraOpponent === 'function' && checkAndTriggerDesdeLaSombraOpponent(cardId);
        }
      },
      'BBX-SP141': (cardId, owner, ctx) => typeof checkAndTriggerPapas === 'function' && checkAndTriggerPapas(cardId, owner, ctx),
      'BBX-SP147': (cardId, owner, ctx) => typeof checkAndTriggerRepresalia === 'function' && checkAndTriggerRepresalia(cardId, true, owner, ctx),
      'BBX-SP159': (cardId, owner, ctx) => typeof checkAndTriggerKatshi159 === 'function' && checkAndTriggerKatshi159(cardId, owner, ctx),
      'BBX-SP162': (cardId, owner, ctx) => typeof checkAndTriggerFulgorOfensivo === 'function' && checkAndTriggerFulgorOfensivo(cardId, owner, ctx),
      'BBX-SP191': (cardId, owner, ctx) => typeof checkAndTriggerPlanDeSupervivencia === 'function' && checkAndTriggerPlanDeSupervivencia(cardId, owner, ctx),
      'BBX-SP205': (cardId, owner, ctx) => typeof checkAndTriggerKatshi205 === 'function' && checkAndTriggerKatshi205(cardId, owner, ctx),
      'BBX-SP221': (cardId, owner, ctx) => typeof checkAndTriggerRemembranza === 'function' && checkAndTriggerRemembranza(cardId, owner, ctx),
      'BBX-SP234': (cardId, owner, ctx) => typeof checkAndTriggerQuiebreSP234 === 'function' && checkAndTriggerQuiebreSP234(cardId, owner, ctx),
      'BBX-SP255': (cardId, owner, ctx) => {
        if (owner === 'player') {
          return typeof checkAndTriggerKatshi255 === 'function' && checkAndTriggerKatshi255(cardId);
        } else {
          return typeof checkAndTriggerKatshi255Opponent === 'function' && checkAndTriggerKatshi255Opponent(cardId);
        }
      },
      'BBX-SP256': (cardId, owner, ctx) => {
        if (owner === 'player') {
          return typeof checkAndTriggerReflejoSiniestro === 'function' && checkAndTriggerReflejoSiniestro(cardId);
        } else {
          return typeof checkAndTriggerReflejoSiniestroOpponent === 'function' && checkAndTriggerReflejoSiniestroOpponent(cardId);
        }
      },
      'BBX-SP260': (cardId, owner, ctx) => {
        if (owner === 'player') {
          return typeof checkAndTriggerKatshi260 === 'function' && checkAndTriggerKatshi260(cardId);
        } else {
          return typeof checkAndTriggerKatshi260Opponent === 'function' && checkAndTriggerKatshi260Opponent(cardId);
        }
      },
      'BBX-SP268': (cardId, owner, ctx) => {
        if (owner === 'player') {
          return typeof checkAndTriggerEnergiaArcana === 'function' && checkAndTriggerEnergiaArcana(cardId);
        } else {
          return typeof checkAndTriggerEnergiaArcanaOpponent === 'function' && checkAndTriggerEnergiaArcanaOpponent(cardId);
        }
      },
      'BBX-SP291': (cardId, owner, ctx) => typeof checkAndTriggerEscape === 'function' && checkAndTriggerEscape(cardId, owner, ctx),
      'BBX-SP292': (cardId, owner, ctx) => typeof checkAndTriggerDesvelo === 'function' && checkAndTriggerDesvelo(cardId, owner, ctx),
      'BBX-SP300': (cardId, owner, ctx) => typeof checkAndTriggerHoraDelTe === 'function' && checkAndTriggerHoraDelTe(cardId, owner, ctx),
      'BBX-SP303': (cardId, owner, ctx) => typeof checkAndTriggerDragoFulgor === 'function' && checkAndTriggerDragoFulgor(cardId, owner, ctx),
      'BBX-SP310': (cardId, owner, ctx) => typeof checkAndTriggerHoloescudo === 'function' && checkAndTriggerHoloescudo(cardId, owner, ctx),
      'BBX-SP375': (cardId, owner, ctx) => typeof checkAndTriggerDescifrarRutaSP375 === 'function' && checkAndTriggerDescifrarRutaSP375(cardId, owner, ctx, ctx ? ctx.testOptions : {}),
      'BBX-SP385': (cardId, owner, ctx) => typeof checkAndTriggerCaidaOportunaSP385 === 'function' && checkAndTriggerCaidaOportunaSP385(cardId, owner, ctx, ctx ? ctx.testOptions : {}),
      'BBX-SP389': (cardId, owner, ctx) => typeof checkAndTriggerMareoSP389 === 'function' && checkAndTriggerMareoSP389(cardId, owner, ctx, ctx ? ctx.testOptions : {})
    }
  };

  /**
   * Despacha todos los efectos disparados al ser enviada una carta al cementerio
   * @param {string} cardId - ID de la carta enviada al cementerio
   * @param {'player'|'opponent'} owner - Dueño de la carta enviada
   * @param {object} context - Metadatos adicionales (fromZone, isEquipped, slotIndex, etc.)
   */
  function dispatchGraveTriggers(cardId, owner = 'player', context = {}) {
    if (!cardId) return false;

    if (owner === 'opponent' && typeof playtestState !== 'undefined' && playtestState && playtestState.isOnlineMatch) {
      if (typeof MultiplayerEngine !== 'undefined' && MultiplayerEngine.isConnected() && typeof MultiplayerEngine.sendGraveTriggerToPeer === 'function' && (!MultiplayerEngine.isApplyingRemote || !MultiplayerEngine.isApplyingRemote())) {
        MultiplayerEngine.sendGraveTriggerToPeer(cardId, context);
      }
      return false;
    }

    // Validación mediante RulesEngine
    const reg = (typeof root !== 'undefined' && root.RulesEngine) ? root.RulesEngine : (typeof window !== 'undefined' ? window.RulesEngine : null);
    if (reg && typeof reg.canActivateFromZone === 'function') {
      const check = reg.canActivateFromZone(cardId, 'grave', owner, context);
      if (!check.allowed) return false;
    }

    // Ejecutar el manejador registrado si existe
    const handler = GraveEffects.handlers[cardId];
    if (typeof handler === 'function') {
      return handler(cardId, owner, context);
    }

    return false;
  }

  GraveEffects.dispatch = dispatchGraveTriggers;

  if (typeof window !== 'undefined') {
    window.GraveEffects = GraveEffects;
    window.dispatchGraveTriggers = dispatchGraveTriggers;
  }
  if (typeof global !== 'undefined') {
    global.GraveEffects = GraveEffects;
    global.dispatchGraveTriggers = dispatchGraveTriggers;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.GraveEffects = GraveEffects;
    globalThis.dispatchGraveTriggers = dispatchGraveTriggers;
  }
  if (root) {
    root.GraveEffects = GraveEffects;
    root.dispatchGraveTriggers = dispatchGraveTriggers;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
