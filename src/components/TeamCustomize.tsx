/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, Wand2, Check, RefreshCw, Undo, Save, Info } from 'lucide-react';
import { TeamCustomization } from '../types';
import audioSynth from '../utils/audio';

interface TeamCustomizeProps {
  currentTeam?: TeamCustomization;
  onSave: (team: TeamCustomization) => void;
  onClose: () => void;
}

// Famous presets for intuitive, single-click team builds
const PRESETS: { name: string; label: string; config: TeamCustomization }[] = [
  {
    name: 'garuda',
    label: '🇮🇩 Garuda United',
    config: {
      name: 'GARUDA UNITED',
      primaryColor: '#ef4444', // Red
      secondaryColor: '#ffffff', // White
      shortsColor: '#ef4444',
      pattern: 'stripes',
      badgeSymbol: 'eagle',
      badgeShape: 'shield',
      badgeColor: '#df2c2c',
      symbolColor: '#fbbf24', // Gold Garuda
    }
  },
  {
    name: 'sultan',
    label: '👑 Sultan FC',
    config: {
      name: 'SULTAN FC',
      primaryColor: '#fbbf24', // Gold
      secondaryColor: '#0a0a0a', // Black
      shortsColor: '#0a0a0a',
      pattern: 'checkered',
      badgeSymbol: 'crown',
      badgeShape: 'hexagon',
      badgeColor: '#0a0a0a',
      symbolColor: '#fbbf24',
    }
  },
  {
    name: 'neon_warriors',
    label: '🟢 Neon Force',
    config: {
      name: 'NEON FORCE',
      primaryColor: '#0f172a', // Dark Slate
      secondaryColor: '#C1FF00', // Neon Lime
      shortsColor: '#0f172a',
      pattern: 'stripes',
      badgeSymbol: 'star',
      badgeShape: 'diamond',
      badgeColor: '#000000',
      symbolColor: '#C1FF00',
    }
  },
  {
    name: 'samudra',
    label: '🔵 Samudra Raya',
    config: {
      name: 'SAMUDRA RAYA',
      primaryColor: '#0284c7', // Blue
      secondaryColor: '#38bdf8', // Light Blue
      shortsColor: '#ffffff',
      pattern: 'hoops',
      badgeSymbol: 'shield',
      badgeShape: 'circle',
      badgeColor: '#0284c7',
      symbolColor: '#ffffff',
    }
  },
  {
    name: 'inferno',
    label: '🔥 Phoenix Inferno',
    config: {
      name: 'PHOENIX INFERNO',
      primaryColor: '#dc2626', // Deep Red
      secondaryColor: '#ea580c', // Orange
      shortsColor: '#171717',
      pattern: 'plain',
      badgeSymbol: 'fire',
      badgeShape: 'shield',
      badgeColor: '#171717',
      symbolColor: '#f97316',
    }
  }
];

const SWATCH_COLORS = [
  { value: '#ffffff', name: 'Putih' },
  { value: '#dc2626', name: 'Merah' },
  { value: '#0284c7', name: 'Biru' },
  { value: '#C1FF00', name: 'Neon' },
  { value: '#ea580c', name: 'Orange' },
  { value: '#10b981', name: 'Hijau' },
  { value: '#fbbf24', name: 'Emas' },
  { value: '#7c3aed', name: 'Ungu' },
  { value: '#0a0a0a', name: 'Hitam' },
];

const TEAM_NAME_PREFIXES = [
  'GARUDA', 'NANTU', 'NUSANTARA', 'SAMUDRA', 'PASUNDAN', 'SULTAN', 'LASKAR', 'BATAWIA',
  'RAJA', 'AREMA', 'PERSE', 'MADURA', 'BALI', 'BORNEO', 'INDONESIA', 'KARTIKA', 'MERDEKA'
];

const TEAM_NAME_SUFFIXES = [
  'FC', 'UNITED', 'CITY', 'WARRIORS', 'KINGS', 'LIONS', 'STAR', 'SC', 'ATHLETIC', 'FORCE',
  'FALCON', 'STALLIONS', 'FLYERS', 'TITANS', 'HEROES', 'SQUAD'
];

export default function TeamCustomize({ currentTeam, onSave, onClose }: TeamCustomizeProps) {
  // Default fallback team settings
  const defaultTeam: TeamCustomization = {
    name: 'NUSANTARA FC',
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    shortsColor: '#dc2626',
    pattern: 'plain',
    badgeSymbol: 'star',
    badgeShape: 'shield',
    badgeColor: '#dc2626',
    symbolColor: '#fbbf24',
  };

  const [team, setTeam] = useState<TeamCustomization>(currentTeam || defaultTeam);
  const [activeTab, setActiveTab] = useState<'name' | 'jersey' | 'badge'>('name');

  const handleRandomName = () => {
    audioSynth.playCoin();
    const pref = TEAM_NAME_PREFIXES[Math.floor(Math.random() * TEAM_NAME_PREFIXES.length)];
    const suff = TEAM_NAME_SUFFIXES[Math.floor(Math.random() * TEAM_NAME_SUFFIXES.length)];
    setTeam(prev => ({ ...prev, name: `${pref} ${suff}` }));
  };

  const applyPreset = (preset: TeamCustomization) => {
    audioSynth.playGoal();
    setTeam({ ...preset });
  };

  const handleSave = () => {
    if (!team.name.trim()) return;
    audioSynth.playWhistle();
    onSave(team);
  };

  // Helper generator to draw Jersey graphic inside SVG
  const renderJerseySVG = () => {
    const { primaryColor, secondaryColor, pattern, badgeColor, symbolColor } = team;

    return (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]">
        <defs>
          {/* Stripes Pattern */}
          <pattern id="jersey-stripes" width="20" height="100" patternUnits="userSpaceOnUse">
            <rect width="10" height="100" fill={primaryColor} />
            <rect x="10" width="10" height="100" fill={secondaryColor} />
          </pattern>
          {/* Hoops Pattern */}
          <pattern id="jersey-hoops" width="100" height="20" patternUnits="userSpaceOnUse">
            <rect width="100" height="10" fill={primaryColor} />
            <rect y="10" width="100" height="10" fill={secondaryColor} />
          </pattern>
          {/* Checkered Pattern */}
          <pattern id="jersey-checkered" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill={primaryColor} />
            <rect x="10" width="10" height="10" fill={secondaryColor} />
            <rect y="10" width="10" height="10" fill={secondaryColor} />
            <rect x="10" y="10" width="10" height="10" fill={primaryColor} />
          </pattern>
        </defs>

        {/* Torso Shadow / Base */}
        <path
          d="M30 18 L70 18 L75 42 L65 42 L65 80 L35 80 L35 42 L25 42 Z"
          fill="#000000"
          opacity="0.3"
          transform="translate(2, 4)"
        />

        {/* Sleeves Shadow */}
        <path d="M15 30 L28 18 L34 26 L23 40 Z" fill="#000" opacity="0.25" transform="translate(1, 2)" />
        <path d="M85 30 L72 18 L66 26 L77 40 Z" fill="#000" opacity="0.25" transform="translate(1, 2)" />

        {/* Left Sleeve */}
        <path d="M15 30 L28 18 L35 25 L23 40 Z" fill={secondaryColor} />
        {/* Left Sleeve Trim */}
        <path d="M15 30 L17.5 27 L25.5 37 L23 40 Z" fill={primaryColor} />

        {/* Right Sleeve */}
        <path d="M85 30 L72 18 L65 25 L77 40 Z" fill={secondaryColor} />
        {/* Right Sleeve Trim */}
        <path d="M85 30 L82.5 27 L74.5 37 L77 40 Z" fill={primaryColor} />

        {/* Main Torso */}
        <path
          d="M30 18 L70 18 L75 42 L66 42 L66 80 L34 80 L34 42 L25 42 Z"
          fill={
            pattern === 'plain'
              ? primaryColor
              : pattern === 'stripes'
              ? 'url(#jersey-stripes)'
              : pattern === 'hoops'
              ? 'url(#jersey-hoops)'
              : 'url(#jersey-checkered)'
          }
        />

        {/* V-Neck Collar */}
        <path d="M42 18 L50 28 L58 18 Z" fill={secondaryColor} />
        <path d="M45 18 L50 25 L55 18 Z" fill="#111" />

        {/* Mini Team crest badge on chest left (visually right side of SVG relative) */}
        <circle cx="42" cy="35" r="5" fill={badgeColor} stroke={symbolColor} strokeWidth="1" />
        {/* Mini badge shape detailing */}
        <polygon points="42,32 44,35 42,38 40,35" fill={symbolColor} />

        {/* Sponsor Text Space (Bold aesthetic) */}
        <text
          x="50"
          y="58"
          fill={secondaryColor === '#ffffff' ? '#111' : '#fff'}
          fontSize="5"
          fontWeight="900"
          fontStyle="italic"
          textAnchor="middle"
          letterSpacing="0.8"
          opacity="0.85"
        >
          {team.name.substring(0, 10)}
        </text>

        {/* Highlight Gradient Overlay for 3D depth */}
        <path
          d="M30 18 L70 18 L75 42 L66 42 L66 80 L34 80 L34 42 L25 42 Z"
          fill="url(#jersey-highlight)"
          opacity="0.12"
          pointerEvents="none"
        />
        <defs>
          <linearGradient id="jersey-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.4" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  const renderBadgeSVG = () => {
    const { badgeShape, badgeColor, symbolColor, badgeSymbol } = team;

    // Outer path calculation depending on Badge Shape
    const getBadgePath = () => {
      switch (badgeShape) {
        case 'circle':
          return 'M 50,10 A 40,40 0 1,1 50,90 A 40,40 0 1,1 50,10 Z';
        case 'diamond':
          return 'M 50,10 L 90,50 L 50,90 L 10,50 Z';
        case 'hexagon':
          return 'M 50,10 L 85,28 L 85,72 L 50,90 L 15,72 L 15,28 Z';
        case 'shield':
        default:
          return 'M 50,10 C 75,10 88,20 88,40 C 88,72 50,90 50,90 C 50,90 12,72 12,40 C 12,20 25,10 50,10 Z';
      }
    };

    const renderSymbolContent = () => {
      switch (badgeSymbol) {
        case 'crown':
          return (
            <path
              d="M30,62 L32,40 L41,52 L50,38 L59,52 L68,40 L70,62 Z"
              fill={symbolColor}
              stroke="#000"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          );
        case 'fire':
          return (
            <path
              d="M50,28 C50,28 65,42 63,58 C61,72 39,72 37,58 C35,46 50,28 50,28 Z M45,45 C45,45 55,52 54,62 C53,70 41,70 41,62 C41,55 45,45 45,45 Z"
              fill={symbolColor}
              stroke="#000"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          );
        case 'lion':
          return (
            <g transform="translate(34, 34) scale(0.65)" fill={symbolColor}>
              <path d="M25,5 C18,5 12,10 10,18 C10,18 5,16 3,21 C1,26 6,32 6,32 C6,32 2,36 4,41 C6,46 12,44 12,44 C12,44 12,50 20,50 C28,50 32,42 35,35 C38,28 35,15 30,10 C28,8 26,5 25,5 Z" />
              <path d="M18,22 Q16,28 24,28 Q24,22 18,22" fill="#000" />
              <circle cx="27" cy="18" r="3" fill="#000" />
            </g>
          );
        case 'eagle':
          return (
            <path
              d="M50,25 L56,38 L72,38 L60,48 L65,63 L50,54 L35,63 L40,48 L28,38 L44,38 Z M50,32 L48,46 L40,44 L50,50 L60,44 L52,46 Z"
              fill={symbolColor}
              stroke="#000"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          );
        case 'shield':
          return (
            <path
              d="M36,32 L64,32 L60,60 L50,68 L40,60 Z M46,40 L46,48 L54,48 L54,40 Z"
              fill={symbolColor}
              stroke="#000"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          );
        case 'star':
        default:
          return (
            <path
              d="M50,25 L58,40 L75,42 L62,54 L66,71 L50,62 L34,71 L38,54 L25,42 L42,40 Z"
              fill={symbolColor}
              stroke="#000"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          );
      }
    };

    return (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_6px_12px_rgba(0,0,0,0.5)]">
        {/* Soft Outer Shadow */}
        <path d={getBadgePath()} fill="#000000" opacity="0.4" transform="translate(2, 4)" />

        {/* Main Badge Base */}
        <path d={getBadgePath()} fill={badgeColor} stroke={symbolColor} strokeWidth="4" strokeLinejoin="round" />

        {/* Modern Contrast Border */}
        <path
          d={getBadgePath()}
          fill="none"
          stroke="#000000"
          strokeWidth="1.5"
          opacity="0.3"
          strokeLinejoin="round"
        />

        {/* Dynamic Stylized Symbol Icon */}
        {renderSymbolContent()}

        {/* Shield Highlights */}
        <path
          d={getBadgePath()}
          fill="url(#badge-glare)"
          opacity="0.15"
          pointerEvents="none"
        />
        <defs>
          <linearGradient id="badge-glare" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  return (
    <div
      id="team-customize-panel"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#080808]/95 p-4 overflow-y-auto"
    >
      {/* Massive subtle background watermarks */}
      <div className="absolute inset-0 flex flex-col items-center justify-between pointer-events-none opacity-5 select-none overflow-hidden">
        <h1 className="text-[12vw] font-black italic tracking-tighter leading-none uppercase mt-6">CUSTOM</h1>
        <h1 className="text-[15vw] font-black italic tracking-tighter leading-none uppercase">TEAM</h1>
        <h1 className="text-[12vw] font-black italic tracking-tighter leading-none uppercase mb-6">KIT</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl bg-[#111111] border-2 border-white/15 rounded-3xl p-6 relative flex flex-col md:flex-row gap-8 z-20 shadow-[0_30px_90px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        {/* Dynamic Left Column - Interactive Mockup View */}
        <div className="w-full md:w-[40%] flex flex-col items-center justify-between bg-neutral-900/60 rounded-2xl p-6 border border-white/5 relative">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-500 self-start">DESAIN SELESAI</span>

          {/* Interactive Toggle for Jersey vs Badge View in Mockup */}
          <div className="relative w-full aspect-square max-w-[200px] md:max-w-none flex items-center justify-center py-6">
            <AnimatePresence mode="wait">
              {activeTab === 'badge' ? (
                <motion.div
                  key="badge-preview"
                  initial={{ opacity: 0, rotate: -15, scale: 0.8 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 15, scale: 0.8 }}
                  className="w-40 h-40 md:w-56 md:h-56"
                >
                  {renderBadgeSVG()}
                </motion.div>
              ) : (
                <motion.div
                  key="jersey-preview"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="w-40 h-40 md:w-56 md:h-56"
                >
                  {renderJerseySVG()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="text-center w-full mt-4">
            <h3 className="text-2xl font-black italic tracking-tight uppercase text-white truncate max-w-full">
              {team.name || 'NAMA TIM'}
            </h3>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[#C1FF00] mt-1">
              {team.pattern === 'plain' ? 'Polos' : team.pattern === 'stripes' ? 'Garis Vertikal' : team.pattern === 'hoops' ? 'Garis Horisontal' : 'Catur'} • Lambang {team.badgeSymbol.toUpperCase()}
            </p>
          </div>

          {/* Quick presets list */}
          <div className="w-full mt-6 border-t border-white/5 pt-4">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400 block mb-2">Preset Desain Instan:</span>
            <div className="flex flex-wrap gap-1.5 justify-start">
              {PRESETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p.config)}
                  className="text-[11px] font-bold bg-neutral-800 hover:bg-neutral-700 text-white py-1 px-2.5 rounded-full border border-white/5 whitespace-nowrap active:scale-95 transition-all"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Customization Editors */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            {/* Header Title */}
            <div className="mb-6">
              <span className="text-[11px] uppercase tracking-[0.3em] font-semibold text-[#C1FF00]">TIM SAYA</span>
              <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white leading-none mt-1">
                KUSTOMISASI TIM
              </h2>
              <p className="text-xs text-neutral-400 mt-1.5">
                Rancang seragam tempur dan lambang kebanggaan timmu secara intuitif.
              </p>
            </div>

            {/* Custom Tabs */}
            <div className="flex border-b border-white/10 mb-6 gap-2">
              <button
                onClick={() => { audioSynth.playKick(); setActiveTab('name'); }}
                className={`py-2 px-4 text-xs font-black uppercase tracking-wider transition-all relative ${
                  activeTab === 'name' ? 'text-[#C1FF00]' : 'text-neutral-500 hover:text-neutral-300'
                }`}
                style={{ fontStyle: 'italic' }}
              >
                1. Identitas
                {activeTab === 'name' && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C1FF00]" />
                )}
              </button>
              <button
                onClick={() => { audioSynth.playKick(); setActiveTab('jersey'); }}
                className={`py-2 px-4 text-xs font-black uppercase tracking-wider transition-all relative ${
                  activeTab === 'jersey' ? 'text-[#C1FF00]' : 'text-neutral-500 hover:text-neutral-300'
                }`}
                style={{ fontStyle: 'italic' }}
              >
                2. Seragam (Jersey)
                {activeTab === 'jersey' && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C1FF00]" />
                )}
              </button>
              <button
                onClick={() => { audioSynth.playKick(); setActiveTab('badge'); }}
                className={`py-2 px-4 text-xs font-black uppercase tracking-wider transition-all relative ${
                  activeTab === 'badge' ? 'text-[#C1FF00]' : 'text-neutral-500 hover:text-neutral-300'
                }`}
                style={{ fontStyle: 'italic' }}
              >
                3. Lambang (Badge)
                {activeTab === 'badge' && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C1FF00]" />
                )}
              </button>
            </div>

            {/* Tab Contents */}
            <div className="min-h-[260px]">
              {/* Tab 1: Identitas / Name */}
              {activeTab === 'name' && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400">
                      Nama Tim Merdeka
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={18}
                        value={team.name}
                        onChange={(e) => setTeam(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                        className="flex-1 bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-base text-white font-black italic tracking-wide uppercase focus:outline-none focus:border-[#C1FF00] transition-colors"
                        placeholder="MASUKKAN NAMA TIM..."
                      />
                      <button
                        onClick={handleRandomName}
                        className="bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl px-4 flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-all text-xs font-bold whitespace-nowrap"
                      >
                        <Wand2 className="w-4 h-4 text-[#C1FF00]" />
                        Acak Nama
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-[#C1FF00]/5 border border-[#C1FF00]/20 rounded-xl flex gap-3">
                    <Info className="w-5 h-5 text-[#C1FF00] shrink-0 mt-0.5" />
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Nama ini akan ditampilkan pada <span className="text-white font-semibold">papan skor</span> game sepak bola, banner stat stadion, serta teks selebrasi <span className="text-[#C1FF00] font-bold">GOAL</span> di lapangan utama.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Tab 2: Seragam (Jersey) */}
              {activeTab === 'jersey' && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  {/* Pattern selector */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400 block">
                      Motif Jersey
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {(['plain', 'stripes', 'hoops', 'checkered'] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => { audioSynth.playKick(); setTeam(prev => ({ ...prev, pattern: p })); }}
                          className={`py-2 px-3 rounded-xl text-center border font-bold text-xs capitalize transition-all ${
                            team.pattern === p
                              ? 'bg-[#C1FF00] text-black border-[#C1FF00] shadow-[0_0_15px_rgba(193,255,0,0.25)]'
                              : 'bg-neutral-900 text-neutral-400 border-white/5 hover:border-white/10'
                          }`}
                        >
                          {p === 'plain' ? 'Polos' : p === 'stripes' ? 'Garis Vertikal' : p === 'hoops' ? 'Garis Horizontal' : 'Papan Catur'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary Color Swatch */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400 block">
                      Warna Utama Jersey
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {SWATCH_COLORS.map(c => (
                        <button
                          key={c.value}
                          onClick={() => { audioSynth.playKick(); setTeam(prev => ({ ...prev, primaryColor: c.value })); }}
                          className="w-10 h-10 rounded-full relative flex items-center justify-center border-2 border-transparent transition-transform hover:scale-110 active:scale-95 shadow-md"
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        >
                          {team.primaryColor === c.value && (
                            <Check className={`w-5 h-5 ${c.value === '#ffffff' || c.value === '#C1FF00' ? 'text-black' : 'text-white'}`} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Secondary Color Swatch */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400 block">
                      Warna Variasi (Lengan / Stripe)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {SWATCH_COLORS.map(c => (
                        <button
                          key={c.value}
                          onClick={() => { audioSynth.playKick(); setTeam(prev => ({ ...prev, secondaryColor: c.value })); }}
                          className="w-10 h-10 rounded-full relative flex items-center justify-center border-2 border-transparent transition-transform hover:scale-110 active:scale-95 shadow-md"
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        >
                          {team.secondaryColor === c.value && (
                            <Check className={`w-5 h-5 ${c.value === '#ffffff' || c.value === '#C1FF00' ? 'text-black' : 'text-white'}`} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shorts Color Swatch */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400 block">
                      Warna Celana (Shorts)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {SWATCH_COLORS.map(c => (
                        <button
                          key={c.value}
                          onClick={() => { audioSynth.playKick(); setTeam(prev => ({ ...prev, shortsColor: c.value })); }}
                          className="w-8 h-8 rounded-full relative flex items-center justify-center border border-transparent transition-transform hover:scale-110 active:scale-95 shadow-md"
                          style={{ backgroundColor: c.value }}
                        >
                          {team.shortsColor === c.value && (
                            <Check className={`w-4 h-4 ${c.value === '#ffffff' || c.value === '#C1FF00' ? 'text-black' : 'text-white'}`} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab 3: Lambang (Badge) */}
              {activeTab === 'badge' && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  {/* Badge Shape */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400 block">
                      Bentuk Bingkai Lambang
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {(['shield', 'circle', 'diamond', 'hexagon'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => { audioSynth.playKick(); setTeam(prev => ({ ...prev, badgeShape: s })); }}
                          className={`py-2 px-1 rounded-xl text-center border font-bold text-xs capitalize transition-all ${
                            team.badgeShape === s
                              ? 'bg-[#C1FF00] text-black border-[#C1FF00] shadow-[0_0_15px_rgba(193,255,0,0.25)]'
                              : 'bg-neutral-900 text-neutral-400 border-white/5 hover:border-white/10'
                          }`}
                        >
                          {s === 'shield' ? 'Perisai' : s === 'circle' ? 'Lingkaran' : s === 'diamond' ? 'Lembing' : 'Segienam'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Badge Symbol */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400 block">
                      Ikon Utama Lambang
                    </span>
                    <div className="grid grid-cols-6 gap-2">
                      {(['star', 'crown', 'fire', 'lion', 'eagle', 'shield'] as const).map(sym => (
                        <button
                          key={sym}
                          onClick={() => { audioSynth.playKick(); setTeam(prev => ({ ...prev, badgeSymbol: sym })); }}
                          className={`py-2 px-1 rounded-xl text-center border font-semibold text-xs transition-all ${
                            team.badgeSymbol === sym
                              ? 'bg-[#C1FF00] text-black border-[#C1FF00]'
                              : 'bg-neutral-900 text-neutral-400 border-white/5 hover:border-white/10'
                          }`}
                        >
                          {sym === 'star' ? '⭐️ Star' : sym === 'crown' ? '👑 Crown' : sym === 'fire' ? '🔥 Flame' : sym === 'lion' ? '🦁 Lion' : sym === 'eagle' ? '🦅 Garuda' : '🛡️ Crest'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Badge Background Color Select */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400 block">
                      Warna Latar Lambang
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {SWATCH_COLORS.map(c => (
                        <button
                          key={c.value}
                          onClick={() => { audioSynth.playKick(); setTeam(prev => ({ ...prev, badgeColor: c.value })); }}
                          className="w-8 h-8 rounded-full relative flex items-center justify-center transition-transform hover:scale-115 active:scale-90"
                          style={{ backgroundColor: c.value }}
                        >
                          {team.badgeColor === c.value && (
                            <Check className={`w-4 h-4 ${c.value === '#ffffff' || c.value === '#C1FF00' ? 'text-black' : 'text-white'}`} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Symbol Color Select */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400 block">
                      Warna Ikon & Garis Tepi Lambang
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {SWATCH_COLORS.map(c => (
                        <button
                          key={c.value}
                          onClick={() => { audioSynth.playKick(); setTeam(prev => ({ ...prev, symbolColor: c.value })); }}
                          className="w-8 h-8 rounded-full relative flex items-center justify-center transition-transform hover:scale-115 active:scale-90"
                          style={{ backgroundColor: c.value }}
                        >
                          {team.symbolColor === c.value && (
                            <Check className={`w-4 h-4 ${c.value === '#ffffff' || c.value === '#C1FF00' ? 'text-black' : 'text-white'}`} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Bottom Call to Action */}
          <div className="flex gap-3 border-t border-white/10 pt-6 mt-6">
            <button
              onClick={() => { audioSynth.playKick(); onClose(); }}
              className="flex-1 py-4 bg-transparent hover:bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-xs uppercase tracking-wider active:scale-95 transition-all text-center"
            >
              Batalkan
            </button>
            <button
              onClick={handleSave}
              className="flex-[2] py-4 bg-[#C1FF00] hover:bg-[#b0eb00] text-black font-black italic text-sm tracking-tight uppercase rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(193,255,0,0.25)]"
            >
              <Save className="w-4 h-4" />
              Selesai & Simpan Kit Tim
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
