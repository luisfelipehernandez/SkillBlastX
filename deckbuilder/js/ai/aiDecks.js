/**
 * Skill Blast X - Catálogo Oficial de Mazos de Inteligencia Artificial
 */

(function(root) {
  'use strict';

  const AIDecks = {
    'haruka_campeon': {
      id: 'haruka_campeon',
      name: 'IA Haruka',
      character: 'Haruka',
      initialCharacterId: 'BBX-SP093',
      description: 'Mazo centrado en Haruka Modo Arcano con juego flexible según la mano inicial: aceleración con Haruka SP093 o SP331, cerrojo con Ahogarse y Siesta, y remate con ataques múltiples.',
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
    },
    'marina_control': {
      id: 'marina_control',
      name: 'Marina (Control de Marea)',
      character: 'Marina',
      initialCharacterId: 'BBX-SP267',
      description: 'Mazo de control y tempo centrado en Marina: excavación con Marina SP267, doble ataque con Marina SP349 y ¡Splash!, búsqueda de Pilares de hielo con Marina SP154 y disrupción con Akua puño, Corriente esmeralda y Marina SP168.',
      main: [
        'BBX-SP267', 'BBX-SP267', 'BBX-SP267', // 3x Marina (SP267)
        'BBX-SP154', 'BBX-SP154', 'BBX-SP154', // 3x Marina (SP154)
        'BBX-SP349', 'BBX-SP349', 'BBX-SP349', // 3x Marina (SP349)
        'BBX-SP233', 'BBX-SP233',             // 2x Marina (SP233)
        'BBX-SP168',                         // 1x Marina (SP168)
        'BBX-SP125',                         // 1x Nara (SP125)
        'BBX-SP378', 'BBX-SP378', 'BBX-SP378', // 3x Serenidad (SP378)
        'BBX-SP028', 'BBX-SP028', 'BBX-SP028', // 3x ¡Splash! (SP028)
        'BBX-SP421', 'BBX-SP421',             // 2x Voluntad del agua (SP421)
        'BBX-SP086', 'BBX-SP086',             // 2x Akua finta (SP086)
        'BBX-SP044', 'BBX-SP044', 'BBX-SP044', // 3x Pilares de hielo (SP044)
        'BBX-SP342', 'BBX-SP342',             // 2x Planificar (SP342)
        'BBX-SP224',                         // 1x Relajo (SP224)
        'BBX-SP187',                         // 1x Akua puño (SP187)
        'BBX-SP394',                         // 1x Corriente esmeralda (SP394)
        'BBX-SP155',                         // 1x Grato ocaso (SP155)
        'BBX-SP210',                         // 1x Doble impetu (SP210)
        'BBX-SP023', 'BBX-SP023'              // 2x ¡Desatar! (SP023)
      ],
      strategy: {
        openingCharacters: ['BBX-SP267', 'BBX-SP168', 'BBX-SP154', 'BBX-SP349'],
        handTriggers: ['BBX-SP154', 'BBX-SP349', 'BBX-SP233', 'BBX-SP125'],
        searchPriorities: ['BBX-SP044', 'BBX-SP028', 'BBX-SP267', 'BBX-SP421', 'BBX-SP378'],
        maxSkillsPerCharacterEarly: 2,
        evolutionThreshold: 0
      }
    }
  };

  if (root) root.AIDecks = AIDecks;
  if (typeof window !== 'undefined') window.AIDecks = AIDecks;
  if (typeof global !== 'undefined') global.AIDecks = AIDecks;
  if (typeof globalThis !== 'undefined') globalThis.AIDecks = AIDecks;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
