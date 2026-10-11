/**
 * Skill Blast X - Hand Effects
 * Registro unificado de activaciones y efectos desde la mano.
 */

(function(root) {
  'use strict';

  const HandEffects = {
    /**
     * Registro de manejadores por ID de carta
     */
    handlers: {
      // Despliegue (BBX-SP092)
      'BBX-SP092': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeDespliegueSP092Activation === 'function' && executeDespliegueSP092Activation(owner, index, opts, cb);
      },

      // Estudio (BBX-SP098)
      'BBX-SP098': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeEstudioSP098Activation === 'function' && executeEstudioSP098Activation(owner, index, opts, cb);
      },

      // Katherine (BBX-SP101)
      'BBX-SP101': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeKatherineSP101Activation === 'function' && executeKatherineSP101Activation(owner, index, opts, cb);
      },

      // Vendaval de cristales (BBX-SP102)
      'BBX-SP102': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeVendavalCristalesSP102Activation === 'function' && executeVendavalCristalesSP102Activation(owner, index, opts, cb);
      },

      // Rango de delegado (BBX-SP113)
      'BBX-SP113': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeRangoDelegadoSP113Activation === 'function' && executeRangoDelegadoSP113Activation(owner, index, opts, cb);
      },

      // Katshi (BBX-SP114)
      'BBX-SP114': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeKatshiSP114Activation === 'function' && executeKatshiSP114Activation(owner, index, opts, cb);
      },

      // Roy (BBX-SP130)
      'BBX-SP130': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeRoySP130Activation === 'function' && executeRoySP130Activation(owner, index, opts, cb);
      },

      // Marina (BBX-SP154)
      'BBX-SP154': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeMarinaSP154Activation === 'function' && executeMarinaSP154Activation(owner, index, opts, cb);
      },

      // Marina (BBX-SP178)
      'BBX-SP178': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeMarinaSP178Activation === 'function' && executeMarinaSP178Activation(owner, index, opts, cb);
      },

      // Nara (BBX-SP179)
      'BBX-SP179': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeNaraSP179Activation === 'function' && executeNaraSP179Activation(owner, index, opts, cb);
      },

      // Sophia (BBX-SP190)
      'BBX-SP190': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeSophiaSP190Activation === 'function' && executeSophiaSP190Activation(owner, index, opts, cb);
      },

      // ¡No me rendiré! (BBX-SP194)
      'BBX-SP194': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeNoMeRendireSP194Activation === 'function' && executeNoMeRendireSP194Activation(owner, index, opts, cb);
      },

      // Estocada de cristal (BBX-SP197)
      'BBX-SP197': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeEstocadaCristalSP197Activation === 'function' && executeEstocadaCristalSP197Activation(owner, index, opts, cb);
      },

      // Deida (BBX-SP223)
      'BBX-SP223': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeDeidaSP223Activation === 'function' && executeDeidaSP223Activation(owner, index, opts, cb);
      },

      // Katherine (BBX-SP228)
      'BBX-SP228': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeKatherineSP228Activation === 'function' && executeKatherineSP228Activation(owner, index, opts, cb);
      },

      // Descenso (BBX-SP241)
      'BBX-SP241': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeDescensoSP241Activation === 'function' && executeDescensoSP241Activation(owner, index, opts, cb);
      },

      // Eishet (BBX-SP275)
      'BBX-SP275': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof activateEishetHand === 'function' && activateEishetHand(owner, index);
      },

      // Lyna (BBX-SP281)
      'BBX-SP281': (index, owner = 'player', opts = {}, cb = null) => {
        if (owner === 'player') {
          return typeof activateLynaHandSP281 === 'function' && activateLynaHandSP281(index);
        } else {
          return typeof activateOpponentLynaHandSP281 === 'function' && activateOpponentLynaHandSP281(index);
        }
      },

      // Eishet (BBX-SP294)
      'BBX-SP294': (index, owner = 'player', opts = {}, cb = null) => {
        if (typeof activatePlayerEishetSP340 === 'function') {
          return owner === 'player' ? activatePlayerEishetSP340(index) : (typeof activateOpponentEishetSP340 === 'function' && activateOpponentEishetSP340(index));
        }
        return false;
      },

      // Tagero (BBX-SP311)
      'BBX-SP311': (index, owner = 'player', opts = {}, cb = null) => {
        if (owner === 'player') {
          return typeof activatePlayerTageroSP311 === 'function' && activatePlayerTageroSP311(index);
        } else {
          return typeof activateOpponentTageroSP311 === 'function' && activateOpponentTageroSP311(index);
        }
      },

      // Búsqueda (BBX-SP315)
      'BBX-SP315': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeBusquedaSP315 === 'function' && executeBusquedaSP315(owner, -1, -1, true);
      },

      // Fundición (BBX-SP323)
      'BBX-SP323': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeFundicionSP323 === 'function' && executeFundicionSP323(owner);
      },

      // Recalcular (BBX-SP324)
      'BBX-SP324': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeRecalcularSP324 === 'function' && executeRecalcularSP324(owner);
      },

      // Eishet (BBX-SP326)
      'BBX-SP326': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof activateEishetSP326Hand === 'function' && activateEishetSP326Hand(owner, index);
      },

      // Haruka (BBX-SP331)
      'BBX-SP331': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof activateHarukaSP331Hand === 'function' && activateHarukaSP331Hand(owner, index);
      },

      // Eishet (BBX-SP340)
      'BBX-SP340': (index, owner = 'player', opts = {}, cb = null) => {
        if (owner === 'player') {
          return typeof activatePlayerEishetSP340 === 'function' && activatePlayerEishetSP340(index);
        } else {
          return typeof activateOpponentEishetSP340 === 'function' && activateOpponentEishetSP340(index);
        }
      },

      // Marina (BBX-SP343)
      'BBX-SP343': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeMarinaSP343Activation === 'function' && executeMarinaSP343Activation(owner, index);
      },

      // Katshi (BBX-SP344)
      'BBX-SP344': (index, owner = 'player') => {
        return true;
      },

      // Marina (BBX-SP349)
      'BBX-SP349': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeMarinaSP349 === 'function' && executeMarinaSP349(owner, index, cb);
      },

      // Eishet (BBX-SP357)
      'BBX-SP357': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeEishetSP357Activation === 'function' && executeEishetSP357Activation(owner, index, cb);
      },

      // Roy (BBX-SP359)
      'BBX-SP359': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeRoySP359Activation === 'function' && executeRoySP359Activation(owner, index, cb);
      },

      // Chiako (BBX-SP360)
      'BBX-SP360': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeChiakoSP360Activation === 'function' && executeChiakoSP360Activation(owner, index, cb);
      },

      // Katherine (BBX-SP364)
      'BBX-SP364': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeKatherineSP364Activation === 'function' && executeKatherineSP364Activation(owner, index, cb);
      },

      // Fredlard (BBX-SP368)
      'BBX-SP368': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeFredlardSP368Activation === 'function' && executeFredlardSP368Activation(owner, index, cb);
      },

      // Katherine (BBX-SP373)
      'BBX-SP373': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeKatherineSP373Activation === 'function' && executeKatherineSP373Activation(owner, index, cb);
      },

      // Nara (BBX-SP392)
      'BBX-SP392': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeNaraSP392Activation === 'function' && executeNaraSP392Activation(owner, index, cb);
      },

      // Instinto desatado (BBX-SP412)
      'BBX-SP412': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeInstintoDesatadoSP412Activation === 'function' && executeInstintoDesatadoSP412Activation(owner, index, opts, cb);
      },

      // Nobuko (BBX-SP420)
      'BBX-SP420': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeNobukoSP420Activation === 'function' && executeNobukoSP420Activation(owner, index, cb);
      },

      // Lyna (BBX-SP425)
      'BBX-SP425': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeLynaSP425Activation === 'function' && executeLynaSP425Activation(owner, index, opts, cb);
      },

      // Dualidad (BBX-SP428)
      'BBX-SP428': (index, owner = 'player', opts = {}, cb = null) => {
        return typeof executeDualidadSP428Activation === 'function' && executeDualidadSP428Activation(owner, index, opts, cb);
      }
    },

    /**
     * Indica si una carta tiene un efecto manual activable desde la mano
     */
    has(cardId) {
      return !!this.handlers[cardId];
    },

    /**
     * Valida si el efecto en mano puede ser activado según las reglas
     */
    canActivate(cardId, owner = 'player') {
      const reg = (typeof root !== 'undefined' && root.RulesEngine) ? root.RulesEngine : (typeof window !== 'undefined' ? window.RulesEngine : null);
      if (reg && typeof reg.canActivateFromZone === 'function') {
        const check = reg.canActivateFromZone(cardId, 'hand', owner);
        if (!check.allowed) return false;
      }
      return true;
    },

    /**
     * Ejecuta el efecto de mano de una carta
     */
    execute(cardId, index, owner = 'player', opts = {}, cb = null) {
      if (!this.canActivate(cardId, owner)) return false;
      const handler = this.handlers[cardId];
      if (typeof handler === 'function') {
        return handler(index, owner, opts, cb);
      }
      return false;
    }
  };

  if (typeof window !== 'undefined') window.HandEffects = HandEffects;
  if (typeof global !== 'undefined') global.HandEffects = HandEffects;
  if (typeof globalThis !== 'undefined') globalThis.HandEffects = HandEffects;
  if (root) root.HandEffects = HandEffects;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
