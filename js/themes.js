/* ============================================================
   HAY FULBO — themes.js
   Paletas del motor de flyers. Cada tema define el degradé de
   fondo, los acentos y los colores de texto.
   Expone: window.HF.themes
   ============================================================ */
(function (global) {
  'use strict';

  const HF = (global.HF = global.HF || {});

  const LIST = [
    {
      id: 'noche',
      name: 'Noche',
      bg: ['#083a1f', '#03150c', '#000503'],
      accent: '#22ff88',
      accent2: '#00d9ff',
      ink: '#ffffff',
      sub: '#9fe8bf',
      turf: '#0d4a26',
      beam: '#3affa0',
      warn: '#ffcb3d',
    },
    {
      id: 'fuego',
      name: 'Fuego',
      bg: ['#48160a', '#1a0502', '#060100'],
      accent: '#ff7a1a',
      accent2: '#ffd166',
      ink: '#ffffff',
      sub: '#ffc9a3',
      turf: '#4d1a08',
      beam: '#ff9a3c',
      warn: '#ffd166',
    },
    {
      id: 'hielo',
      name: 'Hielo',
      bg: ['#073a63', '#02121f', '#00060b'],
      accent: '#35e0ff',
      accent2: '#8aa8ff',
      ink: '#ffffff',
      sub: '#b3e2f7',
      turf: '#0a3f66',
      beam: '#6ceaff',
      warn: '#ffd166',
    },
    {
      id: 'oro',
      name: 'Oro',
      bg: ['#3a2a05', '#140d01', '#050300'],
      accent: '#ffcb3d',
      accent2: '#ff8a00',
      ink: '#ffffff',
      sub: '#f3dfa5',
      turf: '#3d2c06',
      beam: '#ffd970',
      warn: '#ffe9a8',
    },
    {
      id: 'neon',
      name: 'Neón',
      bg: ['#360a56', '#120220', '#040008'],
      accent: '#e879f9',
      accent2: '#22d3ee',
      ink: '#ffffff',
      sub: '#eec4f7',
      turf: '#3d0d5e',
      beam: '#f0a8ff',
      warn: '#ffd166',
    },
  ];

  const byId = (id) => LIST.find((t) => t.id === id) || LIST[0];

  HF.themes = { list: LIST, byId };
})(window);
