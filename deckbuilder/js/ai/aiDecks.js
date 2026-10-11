/**
 * Skill Blast X - Catálogo Oficial de Mazos de Inteligencia Artificial
 */

(function(root) {
  'use strict';

  const AIDecks = {
    'haruka_campeon': {
      id: 'haruka_campeon',
      name: 'Haruka (Modo Arcano Campeón)',
      character: 'Haruka',
      initialCharacterId: 'BBX-SP093',
      description: 'Mazo ganador de torneo centrado en Haruka Modo Arcano, cerrojo de mano rival con Ahogarse y Siesta, y tech defensiva con Ryu-chan.',
      main: [
        'BBX-SP244', 'BBX-SP244', // 2x Haruka (Modo arcano Avanzada)
        'BBX-SP093',             // 1x Haruka
        'BBX-SP331', 'BBX-SP331', // 2x Haruka
        'BBX-SP361', 'BBX-SP361', // 2x Haruka
        'BBX-SP180',             // 1x Ryu-chan
        'BBX-SP008', 'BBX-SP008', // 2x ¡Voluntad!
        'BBX-SP290',             // 1x Ahogarse
        'BBX-SP033', 'BBX-SP033', // 2x Carga destello
        'BBX-SP188', 'BBX-SP188', // 2x Momento oportuno
        'BBX-SP390', 'BBX-SP390', // 2x Destello perspicaz
        'BBX-SP375',             // 1x Descifrar ruta
        'BBX-SP268',             // 1x Energía arcana
        'BBX-SP411',             // 1x Siesta
        'BBX-SP034',             // 1x Tenacidad implacable
        'BBX-SP162',             // 1x Fulgor ofensivo
        'BBX-SP245',             // 1x ¡Drago-impacto arcano!
        'BBX-SP303',             // 1x Drago-fulgor
        'BBX-SP067',             // 1x Sobrecarga destello
        'BBX-SP004',             // 1x Ataque destello
        'BBX-SP037',             // 1x Encaminar
        'BBX-SP224',             // 1x Relajo
        'BBX-SP045',             // 1x ¡Inmovilizar!
        'BBX-SP366',             // 1x Incrustar espada
        'BBX-SP060', 'BBX-SP060', 'BBX-SP060', // 3x Resistir
        'BBX-SP023', 'BBX-SP023'  // 2x ¡Desatar!
      ],
      strategy: {
        openingCharacters: ['BBX-SP093', 'BBX-SP361', 'BBX-SP331'],
        handTriggers: ['BBX-SP331', 'BBX-SP180', 'BBX-SP034'],
        searchPriorities: ['BBX-SP008', 'BBX-SP162', 'BBX-SP200', 'BBX-SP244'],
        maxSkillsPerCharacterEarly: 2,
        evolutionThreshold: 3
      }
    }
  };

  if (root) root.AIDecks = AIDecks;
  if (typeof window !== 'undefined') window.AIDecks = AIDecks;
  if (typeof global !== 'undefined') global.AIDecks = AIDecks;
  if (typeof globalThis !== 'undefined') globalThis.AIDecks = AIDecks;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
