'use client';
import React, { useState, useEffect } from 'react';
import { useCompanionStore } from '@/stores/companion-store';
import { Sparkles, ChevronLeft, ChevronRight, Heart } from 'lucide-react';

export function CatBulletinStage() {
  const { activeScenario, nextScenario, prevScenario } = useCompanionStore();
  const [typedText, setTypedText] = useState('');

  // Typewriter effect
  useEffect(() => {
    setTypedText('');
    let idx = 0;
    const text = activeScenario.subtext;

    const interval = setInterval(() => {
      if (idx <= text.length) {
        setTypedText(text.slice(0, idx));
        idx++;
      } else {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [activeScenario]);

  // Auto-advance scenario every 40 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      nextScenario();
    }, 40000);
    return () => clearInterval(timer);
  }, [nextScenario]);

  return (
    <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-white/95 to-[#FFF3F5]/95 border-2 border-[#FAD7E0] shadow-lg p-5 backdrop-blur-md">
      {/* Top Banner Row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {/* Pulsing LED status dot */}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E84D72] opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#C73A57]" />
          </span>
          <span className="text-xs font-black tracking-wider uppercase text-[#C73A57] bg-[#FFE4EB] px-2.5 py-0.5 rounded-full border border-[#FAD7E0]">
            {activeScenario.tag}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={prevScenario}
            title="Previous Story"
            className="w-7 h-7 rounded-full bg-white text-[#66545B] hover:text-[#C73A57] border border-[#FAD7E0] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextScenario}
            title="Next Story"
            className="w-7 h-7 rounded-full bg-white text-[#66545B] hover:text-[#C73A57] border border-[#FAD7E0] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Kitty Photo Frame */}
        <div className="relative shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-[22px] overflow-hidden border-2 border-[#FAD7E0] bg-[#FFE4EB] shadow-md group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeScenario.imageSrc}
            alt="Kitty Companion"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              // fallback to icon if specific screenshot missing
              (e.target as HTMLElement).setAttribute('src', '/icon.png');
            }}
          />
          <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-[#E84D72] shadow-xs">
            <Heart className="w-3.5 h-3.5 fill-current" />
          </div>
        </div>

        {/* Headlines and Typewriter Thoughts */}
        <div className="flex-1 text-center sm:text-left space-y-1.5">
          <div className="flex items-center justify-center sm:justify-start gap-1.5">
            <Sparkles className="w-4 h-4 text-[#FFBE5C] shrink-0 fill-current" />
            <h3 className="text-base sm:text-lg font-black text-[#2A1D22] tracking-tight font-heading italic">
              {activeScenario.headline}
            </h3>
          </div>

          <p className="text-sm font-medium text-[#66545B] leading-relaxed min-h-[44px]">
            {typedText}
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-[#C73A57] animate-pulse align-middle" />
          </p>

          <div className="pt-1 flex items-center justify-center sm:justify-start gap-3 text-xs font-bold text-[#C73A57]">
            <span>🐱 Kitty is observing your progress</span>
            <span>•</span>
            <span className="capitalize">Mood: {activeScenario.emotion}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
