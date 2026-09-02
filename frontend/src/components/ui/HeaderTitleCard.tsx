'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface HeaderTitleCardProps {
  title: string;
  subtitle?: string;
  backUrl?: string;
  showWavingHand?: boolean;
}

export function HeaderTitleCard({
  title,
  subtitle,
  backUrl,
  showWavingHand = false,
}: HeaderTitleCardProps) {
  return (
    <div className="flex items-center gap-3">
      {backUrl && (
        <Link
          href={backUrl}
          className="w-10 h-10 rounded-[16px] bg-white/90 hover:bg-white border border-[#FAD7E0] flex items-center justify-center text-[#C73A57] shadow-sm transition-transform active:scale-95 shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 drop-shadow-sm font-heading italic">
          {title}
          {showWavingHand && <span className="inline-block animate-wiggle text-xl">👋</span>}
        </h1>
        {subtitle && (
          <p className="text-xs text-white/85 font-medium tracking-wide mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
