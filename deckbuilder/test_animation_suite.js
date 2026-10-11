/**
 * Suite de Pruebas: Motor de Animaciones y Sensaciones de Juego (AnimationEngine & SoundFX)
 */
const assert = require('assert');

// Cargar AnimationEngine
require('./js/ui/animationEngine.js');

console.log('======================================================');
console.log('   SUITE DE PRUEBAS - ANIMATION ENGINE & SOUND FX    ');
console.log('======================================================\n');

// 1. Verificación de existencia del motor
assert(typeof global.AnimationEngine !== 'undefined', '1.1 AnimationEngine debe estar registrado en el scope global');
assert(typeof global.AnimationEngine.SoundFX !== 'undefined', '1.2 SoundFX debe estar registrado en AnimationEngine');
console.log('  ✔ PASS: 1.1 y 1.2 AnimationEngine y SoundFX existen en el entorno');

// 2. Control de Sonido (SoundFX)
const initialSound = global.AnimationEngine.SoundFX.isEnabled();
const toggled = global.AnimationEngine.toggleSound();
assert(toggled === !initialSound, '2.1 toggleSound debe alternar el estado del sonido');
const toggledBack = global.AnimationEngine.toggleSound();
assert(toggledBack === initialSound, '2.2 toggleSound debe restaurar el estado original');
console.log('  ✔ PASS: 2.1 y 2.2 Alternancia y persistencia de Sonido');

// 3. Tolerancia en Node sin DOM (Headless Safety)
let turnBannerCalled = false;
global.AnimationEngine.showTurnBanner(1, 'player', 'TEST FASE', () => {
  turnBannerCalled = true;
});
assert(turnBannerCalled === true, '3.1 showTurnBanner debe invocar callback sincrónicamente en headless');

let cardDrawCalled = false;
global.AnimationEngine.animateCardDraw('player', 'BBX-SP001', () => {
  cardDrawCalled = true;
});
assert(cardDrawCalled === true, '3.2 animateCardDraw debe invocar callback sincrónicamente en headless');

let cardActivationCalled = false;
global.AnimationEngine.showCardActivation('BBX-SP001', 'player', () => {
  cardActivationCalled = true;
});
assert(cardActivationCalled === true, '3.3 showCardActivation debe invocar callback sincrónicamente en headless');

let attackClashCalled = false;
global.AnimationEngine.animateAttackClash(0, 0, 'player', () => {
  attackClashCalled = true;
});
assert(attackClashCalled === true, '3.4 animateAttackClash debe invocar callback sincrónicamente en headless');

// 4. Safe calls a SoundFX (incluyendo nuevos efectos oficial)
global.AnimationEngine.SoundFX.playDraw();
global.AnimationEngine.SoundFX.playActivate();
global.AnimationEngine.SoundFX.playAttack();
global.AnimationEngine.SoundFX.playTurn();
global.AnimationEngine.SoundFX.playPlace();
global.AnimationEngine.SoundFX.playPhase();
global.AnimationEngine.SoundFX.playSelect();
console.log('  ✔ PASS: 3.1 a 3.4 y 4 Todas las funciones y SFX (Skill Blast X) son 100% seguras en Node.js');

// 5. Verificación de fases y carteles de anuncio Skill Blast X
global.AnimationEngine.updatePhase('start');
global.AnimationEngine.updatePhase('main');
global.AnimationEngine.updatePhase('end');

let phaseBannerCalled = false;
global.AnimationEngine.showPhaseBanner('main', () => {
  phaseBannerCalled = true;
});
assert(phaseBannerCalled === true, '5.2 showPhaseBanner debe invocar callback sincrónicamente en headless');
console.log('  ✔ PASS: 5.1 y 5.2 updatePhase y showPhaseBanner manejan transiciones oficial con total estabilidad');

console.log('\n======================================================');
console.log('🎉 TODAS LAS PRUEBAS DE ANIMATION ENGINE PASARON (100%)');
console.log('======================================================\n');
