/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Star, ShieldCheck, Dumbbell, Coins } from 'lucide-react';
import { Skin, PlayerStats } from '../types';
import { ALL_SKINS } from '../data/skins';
import audioSynth from '../utils/audio';

interface ShopProps {
  stats: PlayerStats;
  onSelectSkin: (id: string) => void;
  onBuySkin: (id: string, price: number) => void;
  onClose: () => void;
}

export default function Shop({ stats, onSelectSkin, onBuySkin, onClose }: ShopProps) {
  const handleSelect = (id: string) => {
    audioSynth.playCoin();
    onSelectSkin(id);
  };

  const handleBuy = (id: string, price: number) => {
    if (stats.coins >= price) {
      audioSynth.playGoal(); // Celebration chord!
      onBuySkin(id, price);
    } else {
      audioSynth.playSave(); // Error buzzing sound alternative
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      className="fixed inset-0 z-50 flex flex-col justify-end bg-[#080808]/90 backdrop-blur-md p-4 pb-8 font-sans"
    >
      <div className="mx-auto w-full max-w-md bg-[#080808] border-2 border-white/10 rounded-[32px] p-6 shadow-2xl flex flex-col max-h-[85vh] relative overflow-hidden">
        {/* Detail Lines in card */}
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="absolute left-1/4 top-0 bottom-0 w-[1px] bg-white"></div>
          <div className="absolute right-1/4 top-0 bottom-0 w-[1px] bg-white"></div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-6 z-10">
          <div className="flex flex-col">
            <span className="text-[12px] uppercase tracking-[0.3em] font-bold text-neutral-500 mb-1">
              TOKO AKSESORIS
            </span>
            <span className="font-black italic text-4xl text-white tracking-tighter uppercase leading-none">
              SHOP BOLAKU
            </span>
          </div>
          <button
            onClick={() => {
              audioSynth.playKick();
              onClose();
            }}
            id="close-shop-btn"
            className="w-12 h-12 rounded-3xl border border-white/10 bg-white/5 text-white flex items-center justify-center font-bold text-sm active:scale-95 cursor-pointer hover:bg-white/10 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Currency Display */}
        <div className="bg-white/5 py-4 px-5 rounded-3xl flex justify-between items-center mb-6 border border-white/10 z-10">
          <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Koin Tersedia</span>
          <div className="flex items-center gap-1.5">
            <span className="font-black italic text-4xl text-[#C1FF00] tracking-tighter">
              {stats.coins}
            </span>
            <span className="text-lg">🟡</span>
          </div>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 z-10 pb-4">
          {ALL_SKINS.map((skin: Skin) => {
            const isUnlocked = stats.unlockedSkins.includes(skin.id);
            const isActive = stats.activeSkin === skin.id;
            const canAfford = stats.coins >= skin.price;

            // Render miniature ball circle
            const renderBallIcon = () => {
              if (skin.id === 'classic') {
                return (
                  <div className="w-14 h-14 rounded-full bg-white border-2 border-slate-950 relative flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                    <div className="absolute w-3.5 h-3.5 bg-slate-950 rotate-45 top-1 left-2"></div>
                    <div className="absolute w-3.5 h-3.5 bg-slate-950 rotate-45 bottom-1 right-2"></div>
                    <div className="absolute w-5 h-5 bg-slate-850 rotate-12 center-center"></div>
                  </div>
                );
              } else if (skin.id === 'fireball') {
                return (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-red-600 via-orange-500 to-yellow-400 relative overflow-hidden shrink-0 shadow-lg flex items-center justify-center animate-pulse">
                    <span className="text-xl">🔥</span>
                  </div>
                );
              } else if (skin.id === 'golden') {
                return (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-yellow-200 border-2 border-yellow-300 relative overflow-hidden shrink-0 shadow-lg flex items-center justify-center">
                    <span className="text-xl leading-none">👑</span>
                  </div>
                );
              } else if (skin.id === 'batik') {
                return (
                  <div className="w-14 h-14 rounded-full bg-amber-900 border-2 border-amber-500 relative overflow-hidden shrink-0 shadow-lg flex items-center justify-center">
                    <span className="text-[10px] font-black text-amber-200 uppercase tracking-tighter">BATIK</span>
                  </div>
                );
              } else {
                // disco
                return (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-cyan-400 relative overflow-hidden shrink-0 shadow-lg flex items-center justify-center">
                    <span className="text-xl">🪩</span>
                  </div>
                );
              }
            };

            return (
              <div
                key={skin.id}
                id={`skin-card-${skin.id}`}
                className={`p-4 rounded-[24px] flex items-center gap-4 border transition-all duration-150 ${
                  isActive
                    ? 'bg-white/5 border-[#C1FF00] shadow-[0_5px_15px_rgba(193,255,0,0.08)]'
                    : isUnlocked
                    ? 'bg-white/5 border-white/10 hover:border-white/20'
                    : 'bg-transparent border-white/5 opacity-70'
                }`}
              >
                {renderBallIcon()}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold italic text-white text-lg tracking-tight uppercase leading-none">
                      {skin.name}
                    </h3>
                    {skin.multiplier > 1 && (
                      <span className="text-[9px] font-black italic bg-[#C1FF00] text-black py-0.5 px-2 rounded-full uppercase tracking-wider">
                        x{skin.multiplier} Koin
                      </span>
                    )}
                  </div>
                  <p className="text-neutral-400 text-[11px] mt-1.5 leading-normal line-clamp-2 uppercase font-medium tracking-wide">
                    {skin.description}
                  </p>
                </div>

                <div className="shrink-0 flex flex-col items-end justify-center min-w-[95px]">
                  {isActive ? (
                    <span className="flex items-center gap-1.5 text-[#C1FF00] text-xs font-black uppercase tracking-widest py-2">
                      <ShieldCheck className="w-4 h-4" /> AKTIF
                    </span>
                  ) : isUnlocked ? (
                    <button
                      onClick={() => handleSelect(skin.id)}
                      id={`select-btn-${skin.id}`}
                      className="w-full bg-white/5 hover:bg-white/10 text-white font-bold text-[10px] uppercase tracking-widest py-2 px-3 rounded-2xl border border-white/10 active:scale-95 transition-all cursor-pointer"
                    >
                      GUNAKAN
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuy(skin.id, skin.price)}
                      id={`buy-btn-${skin.id}`}
                      disabled={!canAfford}
                      className={`w-full flex items-center justify-center gap-1 font-black italic text-xs py-2.5 px-3 rounded-2xl border transition-all cursor-pointer ${
                        canAfford
                          ? 'bg-[#C1FF00] hover:bg-[#b5f000] border-[#C1FF00] text-black active:scale-95 shadow-[0_4px_12px_rgba(193,255,0,0.15)]'
                          : 'bg-white/5 border-white/5 text-neutral-500 cursor-not-allowed'
                      }`}
                    >
                      <span>🟡</span>
                      <span>{skin.price}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Upgrade / Perk info foot */}
        <div className="text-center text-neutral-500 text-[10px] uppercase tracking-[0.15em] font-bold mt-4 flex items-center justify-center gap-1.5 z-10">
          <Star className="w-3.5 h-3.5 text-[#C1FF00] fill-[#C1FF00]" />
          <span>SETIAP BOLA MEMILIKI BONUS PENGALI KOIN UNIK</span>
        </div>
      </div>
    </motion.div>
  );
}
