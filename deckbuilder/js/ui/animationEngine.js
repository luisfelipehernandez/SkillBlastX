/**
 * Skill Blast X - Animation & Game Feel Engine
 * Motor visual de animaciones, transiciones de fases, robo de cartas,
 * anuncios cinematográficos de activación y efectos de sonido nativos (Web Audio API).
 */

(function(root) {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. SINTETIZADOR DE EFECTOS DE SONIDO (NATIVO, CERO ARCHIVOS EXTERNOS)
  // ---------------------------------------------------------------------------
  let audioCtx = null;
  let soundEnabled = true;

  try {
    const saved = localStorage.getItem('sbx_sound_enabled');
    if (saved !== null) soundEnabled = (saved === 'true');
  } catch (e) {}

  function getAudioContext() {
    if (!soundEnabled) return null;
    if (!audioCtx) {
      const AudioContextClass = (typeof window !== 'undefined') ? (window.AudioContext || window.webkitAudioContext) : null;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  const SoundFX = {
    isEnabled() {
      return soundEnabled;
    },
    toggle() {
      soundEnabled = !soundEnabled;
      try {
        localStorage.setItem('sbx_sound_enabled', String(soundEnabled));
      } catch (e) {}
      return soundEnabled;
    },

    // Sonido suave de carta deslizándose / saliendo del mazo
    playDraw() {
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(550, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.18);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.19);
      } catch (err) {}
    },

    // Sonido brillante y armónico de activación de habilidad / carta
    playActivate() {
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // Acorde mayor brillante C - E - G - C
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.04);

          gain.gain.setValueAtTime(0.001, now + idx * 0.04);
          gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.04 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.36);
        });
      } catch (err) {}
    },

    // Sonido contundente de impacto en combate
    playAttack() {
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        // Oscilador grave de golpe
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.22);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.26);
      } catch (err) {}
    },

    // Sonido seco y nítido de carta colocándose / invocándose en el campo (oficial)
    playPlace() {
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 0.08);

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.095);
      } catch (err) {}
    },

    // Clic digital nítido de cambio de fase oficial
    playPhase() {
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1320, now + 0.035);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.125);
      } catch (err) {}
    },

    // Clic sutil de selección de carta
    playSelect() {
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(620, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.065);
      } catch (err) {}
    },

    // Campana futurista de cambio de turno
    playTurn() {
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(880, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.56);
        osc2.stop(now + 0.56);
      } catch (err) {}
    }
  };

  // ---------------------------------------------------------------------------
  // 2. MOTOR DE ANIMACIONES VISUALES
  // ---------------------------------------------------------------------------
  const AnimationEngine = {
    SoundFX,

    toggleSound() {
      const isEnabled = SoundFX.toggle();
      if (typeof document !== 'undefined') {
        const btn = document.getElementById('btn-sound-toggle');
        if (btn) {
          btn.textContent = isEnabled ? '🔊 SFX' : '🔇 SFX';
          btn.classList.toggle('muted', !isEnabled);
        }
      }
      return isEnabled;
    },

    /**
     * Actualiza el indicador visual de fases (Pills en la barra superior)
     * @param {'start'|'main'|'end'} phase
     */
    updatePhase(phase = 'main') {
      if (typeof document === 'undefined') return;
      const pills = {
        start: document.getElementById('phase-step-start'),
        main: document.getElementById('phase-step-main'),
        end: document.getElementById('phase-step-end')
      };

      Object.values(pills).forEach(p => {
        if (p) p.classList.remove('active');
      });

      if (pills[phase]) {
        pills[phase].classList.add('active');
      }
    },

    /**
     * Muestra un banner cinematográfico central de Fase (oficial Draw/Main/End Phase)
     * @param {'start'|'main'|'end'} phase
     */
    showPhaseBanner(phase = 'main', callback = null) {
      if (typeof document === 'undefined' || !document.body) {
        if (callback) callback();
        return;
      }

      SoundFX.playPhase();
      this.updatePhase(phase);

      const oldBanner = document.getElementById('phase-transition-banner-overlay');
      if (oldBanner) oldBanner.remove();

      const phaseConfig = {
        start: {
          tag: '1. FASE DE INICIO',
          title: 'DRAW & START PHASE',
          sub: 'Robo de Turno y Efectos Continuos',
          border: 'var(--accent-cyan)'
        },
        main: {
          tag: '2. FASE PRINCIPAL',
          title: 'MAIN PHASE',
          sub: 'Invocación, Portar Skills, Efectos y Batalla',
          border: 'var(--accent-yellow)'
        },
        end: {
          tag: '3. FASE FINAL',
          title: 'END PHASE',
          sub: 'Resolución de Turno y Disparadores Finales',
          border: 'var(--accent-purple)'
        }
      }[phase] || {
        tag: 'FASE',
        title: 'MAIN PHASE',
        sub: '',
        border: 'var(--accent-cyan)'
      };

      const overlay = document.createElement('div');
      overlay.id = 'phase-transition-banner-overlay';
      overlay.className = 'phase-banner-overlay';

      overlay.innerHTML = `
        <div class="phase-banner-box" style="border-color: ${phaseConfig.border}; box-shadow: 0 0 25px ${phaseConfig.border}, inset 0 0 15px rgba(0,0,0,0.5);">
          <div class="phase-banner-tag" style="color: ${phaseConfig.border};">${phaseConfig.tag}</div>
          <div class="phase-banner-title">${phaseConfig.title}</div>
          <div class="phase-banner-sub">${phaseConfig.sub}</div>
        </div>
      `;

      overlay.onclick = () => {
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.remove(), 120);
        if (callback) callback();
      };

      document.body.appendChild(overlay);

      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.classList.add('fade-out');
          setTimeout(() => {
            if (overlay.parentNode) overlay.remove();
            if (callback) callback();
          }, 180);
        }
      }, 700);
    },

    /**
     * Muestra un banner cinematográfico central con el anuncio de Turno y Fase
     */
    showTurnBanner(turnNumber = 1, owner = 'player', phaseText = 'FASE PRINCIPAL', callback = null) {
      if (typeof document === 'undefined' || !document.body) {
        if (callback) callback();
        return;
      }

      SoundFX.playTurn();
      this.updatePhase('start');

      // Remover banner previo si existía
      const oldBanner = document.getElementById('turn-phase-banner-overlay');
      if (oldBanner) oldBanner.remove();

      const isPlayer = owner === 'player';
      const overlay = document.createElement('div');
      overlay.id = 'turn-phase-banner-overlay';
      overlay.className = `turn-banner-container ${isPlayer ? 'player-banner' : 'opponent-banner'}`;

      overlay.innerHTML = `
        <div class="turn-banner-card glass-panel">
          <div class="turn-banner-tag">TURNO ${turnNumber} • SKILL BLAST X</div>
          <div class="turn-banner-title">${isPlayer ? '⚔️ TU TURNO' : '🤖 TURNO DEL RIVAL'}</div>
          <div class="turn-banner-subtitle">${phaseText}</div>
        </div>
      `;

      // Cierre rápido si el usuario hace clic
      overlay.onclick = () => {
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.remove(), 200);
        if (callback) callback();
      };

      document.body.appendChild(overlay);

      // Desvanecimiento suave automático a los 850ms
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.classList.add('fade-out');
          setTimeout(() => {
            if (overlay.parentNode) overlay.remove();
            AnimationEngine.updatePhase('main');
            if (callback) callback();
          }, 250);
        }
      }, 850);
    },

    /**
     * Animación cinemática de robo de carta desde el Deck hacia la Mano
     */
    animateCardDraw(owner = 'player', cardId = null, callback = null) {
      if (typeof document === 'undefined' || !document.body) {
        if (callback) callback();
        return;
      }

      const isPlayer = owner === 'player';
      const deckEl = document.getElementById(isPlayer ? 'deck-card-back' : 'opp-deck-card-back');
      const handEl = document.getElementById(isPlayer ? 'playtest-hand' : 'playtest-opp-hand');

      if (!deckEl || !handEl) {
        if (callback) callback();
        return;
      }

      SoundFX.playDraw();

      const rectDeck = deckEl.getBoundingClientRect();
      const rectHand = handEl.getBoundingClientRect();

      // Determinar si la carta debe mostrarse boca arriba o con reverso
      const state = (typeof root.playtestState !== 'undefined') ? root.playtestState : {};
      const showFaceUp = isPlayer || (!state.isDuelVsAI && cardId);
      const cardObj = (cardId && root.cardsDatabase) ? root.cardsDatabase[cardId] : null;

      const flyingCard = document.createElement('div');
      flyingCard.className = 'flying-card-anim';

      if (showFaceUp && cardObj) {
        flyingCard.innerHTML = `<img src="/imagenes/${cardObj.imagen}" alt="${cardObj.nombre}" style="width:100%; height:100%; object-fit:cover; border-radius:6px; border:1px solid var(--accent-cyan); box-shadow:0 0 15px rgba(0,242,254,0.5);">`;
      } else {
        flyingCard.innerHTML = `<img src="/imagenes/reverso.jpg" alt="Reverso" style="width:100%; height:100%; object-fit:cover; border-radius:6px; border:1px solid ${isPlayer ? 'var(--accent-cyan)' : 'var(--accent-danger)'}; box-shadow:0 0 15px rgba(255,50,50,0.4);">`;
      }

      // Posición inicial: sobre el mazo
      Object.assign(flyingCard.style, {
        position: 'fixed',
        left: `${rectDeck.left}px`,
        top: `${rectDeck.top}px`,
        width: `${rectDeck.width}px`,
        height: `${rectDeck.height}px`,
        zIndex: '99999',
        pointerEvents: 'none',
        transform: 'scale(1) rotate(0deg)',
        transition: 'all 0.38s cubic-bezier(0.18, 0.89, 0.32, 1.15)',
        opacity: '1'
      });

      document.body.appendChild(flyingCard);
      flyingCard.offsetHeight; // Forzar reflow

      // Destino: extremo derecho o centro de la mano
      const targetLeft = rectHand.left + Math.max(20, rectHand.width - rectDeck.width - 20);
      const targetTop = rectHand.top + (rectHand.height / 2) - (rectDeck.height / 2);

      Object.assign(flyingCard.style, {
        left: `${targetLeft}px`,
        top: `${targetTop}px`,
        transform: `scale(0.85) rotate(${isPlayer ? '-6deg' : '6deg'})`,
        opacity: '0.8'
      });

      setTimeout(() => {
        if (flyingCard.parentNode) flyingCard.remove();
        if (callback) callback();
      }, 380);
    },

    /**
     * Showcase flotante de Activación de Carta ("Card Popup")
     */
    showCardActivation(cardId, owner = 'player', callback = null) {
      if (typeof document === 'undefined' || !document.body || !cardId) {
        if (callback) callback();
        return;
      }

      const card = (root.cardsDatabase && root.cardsDatabase[cardId]) ? root.cardsDatabase[cardId] : null;
      if (!card) {
        if (callback) callback();
        return;
      }

      SoundFX.playActivate();

      // Remover showcase previo si había uno
      const oldShowcase = document.getElementById('card-activation-showcase-overlay');
      if (oldShowcase) oldShowcase.remove();

      const isPlayer = owner === 'player';
      const overlay = document.createElement('div');
      overlay.id = 'card-activation-showcase-overlay';
      overlay.className = `card-activation-overlay ${isPlayer ? 'player-activate' : 'opponent-activate'}`;

      overlay.innerHTML = `
        <div class="activation-card-wrap">
          <div class="activation-card-badge">${isPlayer ? '⚡ ¡ACTIVACIÓN DE EFECTO!' : '⚡ ¡ACTIVACIÓN DEL RIVAL!'}</div>
          <div class="activation-img-frame">
            <img src="/imagenes/${card.imagen}" alt="${card.nombre}" class="activation-card-img">
          </div>
          <div class="activation-card-meta">
            <span class="activation-name">${card.nombre}</span>
            <span class="activation-type badge">${card.tipo} ${card.clase ? '• ' + card.clase : ''}</span>
          </div>
        </div>
      `;

      overlay.onclick = () => {
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.remove(), 150);
        if (callback) callback();
      };

      document.body.appendChild(overlay);

      // Tiempo de exposición: 750ms para permitir lectura y disfrute visual
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.classList.add('fade-out');
          setTimeout(() => {
            if (overlay.parentNode) overlay.remove();
            if (callback) callback();
          }, 200);
        }
      }, 750);
    },

    /**
     * Animación física de Ataque / Choque entre dos slots
     */
    animateAttackClash(attackerSlotIdx, targetSlotIdx, owner = 'player', callback = null) {
      if (typeof document === 'undefined' || !document.body) {
        if (callback) callback();
        return;
      }

      const isPlayer = owner === 'player';
      const attackerEl = document.getElementById(isPlayer ? `char-slot-${attackerSlotIdx}` : `opp-char-slot-${attackerSlotIdx}`);
      const defenderEl = document.getElementById(isPlayer ? `opp-char-slot-${targetSlotIdx}` : `char-slot-${targetSlotIdx}`);

      if (!attackerEl || !defenderEl) {
        if (callback) callback();
        return;
      }

      const rectAttacker = attackerEl.getBoundingClientRect();
      const rectDefender = defenderEl.getBoundingClientRect();

      // Calcular vector relativo de choque hacia el defensor
      const deltaX = (rectDefender.left - rectAttacker.left) * 0.65;
      const deltaY = (rectDefender.top - rectAttacker.top) * 0.65;

      attackerEl.style.transition = 'transform 0.22s cubic-bezier(0.12, 0.85, 0.25, 1.2)';
      attackerEl.style.zIndex = '999';
      attackerEl.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.12) rotate(${isPlayer ? '-4deg' : '4deg'})`;

      // Momento del impacto en el objetivo
      setTimeout(() => {
        SoundFX.playAttack();

        // Destello de impacto radial sobre el defensor
        const impactFlash = document.createElement('div');
        impactFlash.className = 'combat-impact-flash';
        defenderEl.appendChild(impactFlash);

        // Sacudida física del defensor
        defenderEl.classList.add('combat-shake');

        setTimeout(() => {
          impactFlash.remove();
          defenderEl.classList.remove('combat-shake');
        }, 320);

        // Retornar atacante a su ranura original
        attackerEl.style.transition = 'transform 0.2s ease-out';
        attackerEl.style.transform = 'translate(0px, 0px) scale(1) rotate(0deg)';

        setTimeout(() => {
          attackerEl.style.zIndex = '';
          attackerEl.style.transition = '';
          attackerEl.style.transform = '';
          if (callback) callback();
        }, 220);
      }, 220);
    },

    /**
     * Inicializa los listeners interactivos del UI (clic en pills de fases y estado inicial de SFX)
     */
    initUI() {
      if (typeof document === 'undefined') return;
      const phases = ['start', 'main', 'end'];
      phases.forEach(ph => {
        const el = document.getElementById(`phase-step-${ph}`);
        if (el) {
          el.style.cursor = 'default';
          el.onclick = null;
        }
      });
      const btn = document.getElementById('btn-sound-toggle');
      if (btn) {
        btn.textContent = soundEnabled ? '🔊 SFX' : '🔇 SFX';
        btn.classList.toggle('muted', !soundEnabled);
      }
    }
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => AnimationEngine.initUI());
    } else {
      setTimeout(() => AnimationEngine.initUI(), 50);
    }
  }

  root.AnimationEngine = AnimationEngine;
})(typeof window !== 'undefined' ? window : global);

