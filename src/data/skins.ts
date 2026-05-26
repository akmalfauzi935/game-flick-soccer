/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Skin } from '../types';

export const ALL_SKINS: Skin[] = [
  {
    id: 'classic',
    name: 'Klasik Putih',
    description: 'Bola sepak konvensional hitam & putih. Ringan dan seimbang.',
    price: 0,
    unlocked: true,
    color: '#ffffff',
    accentColor: '#1e293b',
    particleType: 'none',
    multiplier: 1.0,
  },
  {
    id: 'fireball',
    name: 'Bola Inferno 🔥',
    description: 'Bola berapi yang membara! Meninggalkan jejak api saat ditendang.',
    price: 80,
    unlocked: false,
    color: '#ef4444',
    accentColor: '#f97316',
    particleType: 'fire',
    multiplier: 1.2,
  },
  {
    id: 'golden',
    name: 'Sultan Emas 👑',
    description: 'Bahan emas murni! Mendapatkan bonus koin +50% setiap permainan.',
    price: 150,
    unlocked: false,
    color: '#fbbf24',
    accentColor: '#d97706',
    particleType: 'gold',
    multiplier: 1.5,
  },
  {
    id: 'batik',
    name: 'Batik Indonesia 🇮🇩',
    description: 'Warisan Nusantara bermotif megamendung anggun. Cinta Tanah Air!',
    price: 60,
    unlocked: false,
    color: '#78350f',
    accentColor: '#fef3c7',
    particleType: 'batik_dust',
    multiplier: 1.1,
  },
  {
    id: 'disco',
    name: 'Rhythm Disko 🪩',
    description: 'Bola neon futuristik bercahaya warna-warni seiring ketukan musik.',
    price: 120,
    unlocked: false,
    color: '#3b82f6',
    accentColor: '#ec4899',
    particleType: 'neon',
    multiplier: 1.3,
  },
];
