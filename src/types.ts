/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Skin {
  id: string;
  name: string;
  description: string;
  price: number;
  unlocked: boolean;
  color: string;
  accentColor: string;
  particleType: 'none' | 'fire' | 'gold' | 'batik_dust' | 'neon';
  multiplier: number;
}

export interface PlayerStats {
  coins: number;
  shootoutHighScore: number;
  dribbleHighScore: number;
  unlockedSkins: string[];
  activeSkin: string;
  team?: TeamCustomization;
}

export interface TeamCustomization {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  pattern: 'plain' | 'stripes' | 'hoops' | 'checkered';
  badgeSymbol: 'star' | 'crown' | 'fire' | 'lion' | 'eagle' | 'shield';
  badgeShape: 'shield' | 'circle' | 'diamond' | 'hexagon';
  badgeColor: string;
  symbolColor: string;
  shortsColor: string;
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface ShootTarget {
  x: number;
  y: number;
  radius: number;
  points: number;
  active: boolean;
  label: string;
}

export interface GameParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'spark' | 'star';
}

export interface Defender {
  id: number;
  x: number; // grid or canvas coordinates
  y: number;
  targetX: number;
  speed: number;
  width: number;
  height: number;
  state: 'running' | 'tackling' | 'passed';
  tackleCooldown: number;
}

export interface Collectable {
  id: number;
  x: number;
  y: number;
  type: 'coin' | 'speed' | 'multiplier';
  radius: number;
  collected: boolean;
  pulsePhase: number;
}
