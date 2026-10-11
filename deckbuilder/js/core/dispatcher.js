/**
 * Skill Blast X - Effect Dispatcher
 * Despacha de forma unificada las activaciones de efectos organizados por zonas.
 */

window.EffectDispatcher = {
  registries: {
    grave: {},
    hand: {},
    bench: {},
    fieldSkill: {},
    character: {}
  },

  /**
   * Registra una acción de carta para una zona específica
   * @param {'grave'|'hand'|'bench'|'fieldSkill'|'character'} zone
   * @param {string} cardId
   * @param {function(owner: string, context: object): any} handler
   */
  register(zone, cardId, handler) {
    if (!this.registries[zone]) {
      this.registries[zone] = {};
    }
    this.registries[zone][cardId] = handler;
  },

  /**
   * Verifica si una carta tiene registrado un manejador en dicha zona
   */
  has(zone, cardId) {
    return !!this.registries[zone]?.[cardId];
  },

  /**
   * Valida si el efecto en esa zona está permitido por las reglas globales
   */
  canActivate(zone, cardId, owner = 'player', context = {}) {
    if (window.RulesEngine && typeof window.RulesEngine.canActivateFromZone === 'function') {
      const check = window.RulesEngine.canActivateFromZone(cardId, zone, owner, context);
      if (!check.allowed) return false;
    }
    return true;
  },

  /**
   * Despacha la ejecución del efecto con validación centralizada
   */
  trigger(zone, cardId, owner = 'player', context = {}) {
    if (!this.canActivate(zone, cardId, owner, context)) {
      return false;
    }
    const handler = this.registries[zone]?.[cardId];
    if (typeof handler === 'function') {
      return handler(owner, context);
    }
    return null;
  }
};
