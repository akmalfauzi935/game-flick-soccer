/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Coins, Trophy, Dumbbell, Settings, ShoppingBag, Palette, Play, Sparkles } from 'lucide-react';
import { PlayerStats, TeamCustomization } from './types';
import FlickShootout from './components/FlickShootout';
import DribbleDash from './components/DribbleDash';
import Shop from './components/Shop';
import TeamCustomize from './components/TeamCustomize';
import { ALL_SKINS } from './data/skins';
import audioSynth from './utils/audio';

// Default initial state
const LOCAL_STORAGE_KEY = 'flick_soccer_stats_v3';

const DEFAULT_STATS: PlayerStats = {
  coins: 150,
  shootoutHighScore: 0,
  dribbleHighScore: 0,
  unlockedSkins: ['classic'],
  activeSkin: 'classic',
  team: {
    name: 'GARUDA FC',
    primaryColor: '#dc2626', // Red
    secondaryColor: '#ffffff', // White
    shortsColor: '#dc2626',
    pattern: 'plain',
    badgeSymbol: 'eagle',
    badgeShape: 'shield',
    badgeColor: '#dc2626',
    symbolColor: '#fbbf24', // Gold Accent
  }
};

export default function App() {
  const [stats, setStats] = useState<PlayerStats>(DEFAULT_STATS);
  const [screen, setScreen] = useState<'menu' | 'shootout' | 'dribble'>('menu');
  const [showShop, setShowShop] = useState(false);
  const [showTeamCustomizer, setShowTeamCustomizer] = useState(false);

  // Load stats from LocalStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure team config is present
        if (!parsed.team) {
          parsed.team = DEFAULT_STATS.team;
        }
        setStats(parsed);
      }
    } catch (e) {
      console.warn('Failed to load local storage stats', e);
    }
  }, []);

  // Save stats helper
  const handleUpdateStats = (newStats: Partial<PlayerStats>) => {
    setStats(prev => {
      const updated = { ...prev, ...newStats };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save to local storage', e);
      }
      return updated;
    });
  };

  const handleSaveTeam = (newTeam: TeamCustomization) => {
    handleUpdateStats({ team: newTeam });
    setShowTeamCustomizer(false);
  };

  const handleSelectSkin = (id: string) => {
    handleUpdateStats({ activeSkin: id });
  };

  const handleBuySkin = (id: string, price: number) => {
    if (stats.coins >= price) {
      const newUnlocked = [...stats.unlockedSkins, id];
      handleUpdateStats({
        coins: stats.coins - price,
        unlockedSkins: newUnlocked,
        activeSkin: id
      });
    }
  };

  // SVG Render utilities for the Menu Team Display
  const renderMiniBadgeSVG = (team: TeamCustomization) => {
    const { badgeShape, badgeColor, symbolColor, badgeSymbol } = team;

    const getBadgePath = () => {
      switch (badgeShape) {
        case 'circle': return 'M 50,10 A 40,40 0 1,1 50,90 A 40,40 0 1,1 50,10 Z';
        case 'diamond': return 'M 50,10 L 90,50 L 50,90 L 10,50 Z';
        case 'hexagon': return 'M 50,10 L 85,28 L 85,72 L 50,90 L 15,72 L 15,28 Z';
        case 'shield':
        default:
          return 'M 50,10 C 75,10 88,20 88,40 C 88,72 50,90 50,90 C 50,90 12,72 12,40 C 12,20 25,10 50,10 Z';
      }
    };

    const renderSymbol = () => {
      switch (badgeSymbol) {
        case 'crown': return <path d="M30,62 L32,40 L41,52 L50,38 L59,52 L68,40 L70,62 Z" fill={symbolColor} stroke="#000" strokeWidth="1" />;
        case 'fire': return <path d="M50,28 C50,28 65,42 63,58 C61,72 39,72 37,58 C35,46 50,28 50,28 Z" fill={symbolColor} />;
        case 'lion': return <circle cx="50" cy="50" r="14" fill={symbolColor} />;
        case 'eagle': return <polygon points="50,25 56,38 70,38 58,48 62,63 50,54 38,63 42,48 30,38 44,38" fill={symbolColor} />;
        case 'shield': return <path d="M38,32 L62,32 L58,58 L50,65 L42,58 Z" fill={symbolColor} />;
        case 'star':
        default:
          return <polygon points="50,25 58,40 75,42 62,54 66,71 50,62 34,71 38,54 25,42 42,40" fill={symbolColor} stroke="#000" strokeWidth="1" />;
      }
    };

    return (
      <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
        <path d={getBadgePath()} fill={badgeColor} stroke={symbolColor} strokeWidth="4" />
        {renderSymbol()}
      </svg>
    );
  };

  const renderMiniJerseySVG = (team: TeamCustomization) => {
    const { primaryColor, secondaryColor, pattern } = team;
    return (
      <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
        <defs>
          <pattern id="mini-stripes" width="20" height="100" patternUnits="userSpaceOnUse">
            <rect width="10" height="100" fill={primaryColor} />
            <rect x="10" width="10" height="100" fill={secondaryColor} />
          </pattern>
          <pattern id="mini-hoops" width="100" height="20" patternUnits="userSpaceOnUse">
            <rect width="100" height="10" fill={primaryColor} />
            <rect y="10" width="100" height="10" fill={secondaryColor} />
          </pattern>
          <pattern id="mini-checkered" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill={primaryColor} />
            <rect x="10" width="10" height="10" fill={secondaryColor} />
            <rect y="10" width="10" height="10" fill={secondaryColor} />
            <rect x="10" y="10" width="10" height="10" fill={primaryColor} />
          </pattern>
        </defs>
        {/* Sleeve back layer */}
        <path d="M15,30 L28,18 L34,26 L23,40 Z" fill={secondaryColor} />
        <path d="M85,30 L72,18 L66,26 L77,40 Z" fill={secondaryColor} />
        {/* Main Torso */}
        <path
          d="M30 18 L70 18 L75 42 L66 42 L66 80 L34 80 L34 42 L25 42 Z"
          fill={
            pattern === 'plain'
              ? primaryColor
              : pattern === 'stripes'
              ? 'url(#mini-stripes)'
              : pattern === 'hoops'
              ? 'url(#mini-hoops)'
              : 'url(#mini-checkered)'
          }
        />
        {/* V-neck collar */}
        <path d="M42 18 L50 28 L58 18 Z" fill={secondaryColor} />
      </svg>
    );
  };

  const handlePlayShootout = () => {
    audioSynth.playWhistle();
    setScreen('shootout');
  };

  const handlePlayDribble = () => {
    audioSynth.playWhistle();
    setScreen('dribble');
  };

  // Safe checks for stats.team
  const activeTeam = stats.team || DEFAULT_STATS.team!;

  // Render game modes based on state
  if (screen === 'shootout') {
    return (
      <FlickShootout
        stats={stats}
        onUpdateStats={handleUpdateStats}
        onBackToMenu={() => {
          audioSynth.playKick();
          setScreen('menu');
        }}
      />
    );
  }

  if (screen === 'dribble') {
    return (
      <DribbleDash
        stats={stats}
        onUpdateStats={handleUpdateStats}
        onBackToMenu={() => {
          audioSynth.playKick();
          setScreen('menu');
        }}
      />
    );
  }

  return (
    <div className="w-full h-full bg-[#080808] text-white flex flex-col items-center justify-between p-6 md:p-8 font-sans overflow-hidden relative selection:bg-[#C1FF00] selection:text-black">
      
      {/* Massive Background Typography Watermarks & Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-5 select-none z-0">
        <div className="absolute left-1/4 top-0 bottom-0 w-[1px] bg-white"></div>
        <div className="absolute right-1/4 top-0 bottom-0 w-[1px] bg-white"></div>
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white"></div>
      </div>
      
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 select-none z-0">
        <h1 className="text-[32vw] font-black italic tracking-tighter leading-none uppercase">LEAGUE</h1>
      </div>

      {/* Header Panel with Currency */}
      <header className="w-full flex justify-between items-center z-10 shrink-0">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-500">INDONESIAN</span>
          <span className="text-3xl font-black italic tracking-tighter uppercase leading-none">FLICK SOCCER</span>
        </div>
        
        {/* Currency badge */}
        <div className="flex items-center gap-2 bg-neutral-900 border border-white/10 px-4 py-2 rounded-2xl">
          <Coins className="w-5 h-5 text-[#C1FF00] animate-bounce" />
          <span className="font-mono text-lg font-black text-white">{stats.coins} <span className="text-neutral-500 text-xs font-bold">KOIN</span></span>
        </div>
      </header>

      {/* Main interactive area: Custom Team Dashboard Stand */}
      <main className="flex-1 w-full max-w-lg flex flex-col justify-center items-center gap-6 z-10 py-4">
        
        {/* Pedestal Stand Display for Custom Team Setup */}
        <div
          style={{ borderStyle: 'groove', textAlign: 'justify' }}
          className="w-full bg-neutral-900/80 border-2 border-white/10 rounded-3xl p-6 relative flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
        >
          
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#C1FF00] text-black text-[10px] font-black uppercase tracking-[0.2em] px-4 py-0.5 rounded-full shadow-lg">
            TIM KEBANGGAAN
          </div>

          {/* Visual representations of dynamic badge and jersey side by side */}
          <div className="flex items-center gap-8 my-4 relative">
            {/* Visual shine ring */}
            <div className="absolute inset-[-10px] rounded-full bg-gradient-radial from-[#C1FF00]/10 to-transparent blur-xl pointer-events-none z-0"></div>

            <motion.div
              whileHover={{ scale: 1.1, rotate: -5 }}
              className="p-3 bg-neutral-950/90 rounded-2xl border border-white/10 flex flex-col items-center justify-center relative cursor-pointer z-10 shadow-xl"
              onClick={() => { audioSynth.playCoin(); setShowTeamCustomizer(true); }}
            >
              {renderMiniBadgeSVG(activeTeam)}
              <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold mt-1.5">Lambang</span>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="p-3 bg-neutral-950/90 rounded-2xl border border-white/10 flex flex-col items-center justify-center relative cursor-pointer z-10 shadow-xl"
              onClick={() => { audioSynth.playCoin(); setShowTeamCustomizer(true); }}
            >
              {renderMiniJerseySVG(activeTeam)}
              <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold mt-1.5">Seragam</span>
            </motion.div>
          </div>

          {/* Team Name display in raw italics theme */}
          <h2 className="text-4xl font-black italic tracking-tighter text-[#C1FF00] leading-none uppercase text-center truncate max-w-full my-1">
            {activeTeam.name}
          </h2>

          <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-neutral-400 mt-1 mb-4">
            Kombinasi Warna: <span className="text-white">{activeTeam.primaryColor} / {activeTeam.secondaryColor}</span>
          </p>

          {/* Edit Kit CTA button */}
          <button
            onClick={() => { audioSynth.playCoin(); setShowTeamCustomizer(true); }}
            className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-[#C1FF00] hover:text-black hover:border-[#C1FF00] transition-all text-xs font-black uppercase tracking-widest text-[#C1FF00] active:scale-95 flex items-center justify-center gap-2"
          >
            <Palette className="w-4 h-4" />
            RANCANG KIT / LOGO TIM SAYA
          </button>
        </div>

        {/* Highscores Dashboard */}
        <div className="w-full grid grid-cols-2 gap-4">
          <div className="bg-neutral-950/50 border border-white/5 rounded-2xl p-4 flex flex-col items-start">
            <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">REKOR TENDANGAN BEBAS</span>
            <span className="text-3xl font-black italic text-white leading-none mt-1">{stats.shootoutHighScore} <span className="text-neutral-500 text-xs font-bold font-sans">SKOR</span></span>
          </div>
          <div className="bg-neutral-950/50 border border-white/5 rounded-2xl p-4 flex flex-col items-start">
            <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">REKOR MENGGIRING BOLA</span>
            <span className="text-3xl font-black italic text-[#C1FF00] leading-none mt-1">{stats.dribbleHighScore} <span className="text-neutral-500 text-xs font-bold font-sans">METER</span></span>
          </div>
        </div>

      </main>

      {/* Main Actions Footer */}
      <footer className="w-full max-w-lg flex flex-col gap-3 z-10 shrink-0">
        
        {/* Play game layouts buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePlayDribble}
            className="h-20 bg-neutral-900 border-2 border-white/10 rounded-3xl flex flex-col items-center justify-center hover:border-[#C1FF00]/80 transition-all active:scale-95 text-left relative overflow-hidden group"
          >
            <div className="absolute right-[-10px] bottom-[-10px] text-white/[0.04] text-7xl font-sans font-black group-hover:text-white/[0.08] transition-all italic">RUN</div>
            <Dumbbell className="w-5 h-5 text-[#C1FF00] mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-white font-black italic text-base uppercase tracking-tighter leading-none">DASH DRIBBLE</span>
            <span className="text-[9px] uppercase font-bold text-[#C1FF00] tracking-wide mt-1">Giring & Hindari</span>
          </button>

          <button
            onClick={handlePlayShootout}
            className="h-20 bg-neutral-900 border-2 border-white/10 rounded-3xl flex flex-col items-center justify-center hover:border-[#C1FF00]/80 transition-all active:scale-95 relative overflow-hidden group"
          >
            <div className="absolute right-[-10px] bottom-[-10px] text-white/[0.04] text-7xl font-sans font-black group-hover:text-white/[0.08] transition-all italic">KICK</div>
            <Sparkles className="w-5 h-5 text-yellow-400 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-white font-black italic text-base uppercase tracking-tighter leading-none">FLICK SHOOT</span>
            <span className="text-[9px] uppercase font-bold text-yellow-400 tracking-wide mt-1">Free-Kick Adu Penalti</span>
          </button>
        </div>

        {/* Shop Button */}
        <button
          onClick={() => { audioSynth.playCoin(); setShowShop(true); }}
          className="w-full h-16 bg-[#C1FF00] rounded-3xl flex items-center justify-center gap-3 hover:bg-[#b5f000] active:scale-95 transition-all text-black shadow-[0_15px_30px_rgba(193,255,0,0.2)]"
        >
          <ShoppingBag className="w-5 h-5 text-black animate-pulse" />
          <span className="text-black font-black italic text-xl tracking-tighter uppercase">KUNJUNGI TOKO BOLA</span>
        </button>

        {/* Technical Footer detail stamp */}
        <p className="text-[9px] uppercase tracking-[0.4em] font-medium text-center text-neutral-600 mt-2">
          MADE IN INDONESIA • INTUITIVE SPORTS MANAGER
        </p>
      </footer>

      {/* Overlay - Team Customizer Component */}
      <AnimatePresence>
        {showTeamCustomizer && (
          <TeamCustomize
            currentTeam={activeTeam}
            onSave={handleSaveTeam}
            onClose={() => setShowTeamCustomizer(false)}
          />
        )}
      </AnimatePresence>

      {/* Overlay - Shop Component */}
      <AnimatePresence>
        {showShop && (
          <Shop
            stats={stats}
            onSelectSkin={handleSelectSkin}
            onBuySkin={handleBuySkin}
            onClose={() => setShowShop(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
