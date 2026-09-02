'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  CheckSquare,
  Timer,
  BarChart2,
  Grid,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  Zap,
  BookOpen,
  Droplets,
  MessageSquare,
  Trophy,
  Compass,
  ShieldAlert,
} from 'lucide-react';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { useAuthStore } from '@/stores';
import clsx from 'clsx';

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, logout } = useAuthStore();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const mainNav = [
    { name: 'Home', href: '/home', icon: Home },
    { name: 'Plan', href: '/accountability', icon: CheckSquare },
    { name: 'Timer', href: '/pomodoro', icon: Timer },
    { name: 'Stats', href: '/statistics', icon: BarChart2 },
  ];

  const tools = [
    { name: 'Duolingo Journey', href: '/journey', icon: Compass, desc: 'Milestones & Surprise Rewards' },
    { name: 'Spaced Flashcards', href: '/flashcards', icon: Zap, desc: 'SM-2 Memory Revision' },
    { name: 'English & AI Writing', href: '/english', icon: MessageSquare, desc: 'Vocabulary & Gemini Evaluation' },
    { name: 'PYQ Mock Exams', href: '/pyq', icon: BookOpen, desc: 'Timed Test Simulations' },
    { name: 'Water & Hydration', href: '/water', icon: Droplets, desc: 'Fluid Tracker & Streaks' },
    { name: 'Urge Control & Detox', href: '/urge-control', icon: ShieldAlert, desc: 'Dopamine Interruption Dice' },
    { name: 'Achievements & Badges', href: '/achievements', icon: Trophy, desc: 'Milestone Recognition' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full px-4 pt-3 pb-2 backdrop-blur-md">
      <div className="max-w-4xl mx-auto flex items-center justify-between bg-white/95 rounded-[24px] border-2 border-[#FAD7E0] px-4 py-2.5 shadow-sm">
        {/* Brand */}
        <Link href="/home" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-[14px] bg-gradient-to-tr from-[#C73A57] to-[#E84D72] flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform">
            🐱
          </div>
          <div>
            <span className="font-heading italic font-bold text-lg text-[#2A1D22] tracking-tight group-hover:text-[#C73A57] transition-colors leading-none block">
              Kitty & Star
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E84D72]">
              StudyPartner
            </span>
          </div>
        </Link>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-1">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-[16px] text-xs font-bold transition-all',
                  isActive
                    ? 'bg-[#C73A57] text-white shadow-xs'
                    : 'text-[#66545B] hover:text-[#C73A57] hover:bg-[#FFF3F5]'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Tools Dropdown */}
          <div className="relative">
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              onBlur={() => setTimeout(() => setToolsOpen(false), 200)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-[16px] text-xs font-bold transition-all',
                toolsOpen
                  ? 'bg-[#FFE4EB] text-[#C73A57]'
                  : 'text-[#66545B] hover:text-[#C73A57] hover:bg-[#FFF3F5]'
              )}
            >
              <Grid className="w-4 h-4" />
              <span>Tools</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {toolsOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-[22px] border border-[#FAD7E0] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#BFAFB5]">
                  Specialized Modules
                </div>
                {tools.map((t) => {
                  const ToolIcon = t.icon;
                  return (
                    <Link
                      key={t.name}
                      href={t.href}
                      className="flex items-center gap-2.5 p-2 rounded-[14px] hover:bg-[#FFF3F5] text-[#2A1D22] hover:text-[#C73A57] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-[12px] bg-[#FFE4EB] text-[#C73A57] flex items-center justify-center shrink-0">
                        <ToolIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">{t.name}</p>
                        <p className="text-[10px] text-[#66545B]">{t.desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Right side: Notifications & Profile */}
        <div className="flex items-center gap-2">
          <NotificationBadge />

          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              onBlur={() => setTimeout(() => setProfileOpen(false), 200)}
              className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-[18px] bg-[#FFF3F5] hover:bg-[#FFE4EB] border border-[#FAD7E0] text-xs font-bold text-[#2A1D22] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#C73A57] to-[#F07392] flex items-center justify-center text-white text-xs font-black shadow-2xs">
                {profile?.full_name ? profile.full_name[0].toUpperCase() : '🐱'}
              </div>
              <span className="hidden sm:inline max-w-[90px] truncate">
                {profile?.full_name?.split(' ')[0] ?? 'Profile'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#66545B]" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-[22px] border border-[#FAD7E0] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-[#FFE4EB] mb-1">
                  <p className="text-xs font-extrabold text-[#2A1D22] truncate">
                    {profile?.full_name || 'Study Explorer'}
                  </p>
                  <p className="text-[10px] text-[#66545B] truncate">{user?.email}</p>
                  {profile?.partner_id ? (
                    <span className="inline-block mt-1 text-[10px] font-bold text-[#63C58B] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      🤝 Partner Linked
                    </span>
                  ) : (
                    <Link
                      href="/partner-linking"
                      className="inline-block mt-1 text-[10px] font-bold text-[#E84D72] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 hover:underline"
                    >
                      🔗 Link Partner
                    </Link>
                  )}
                </div>

                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-2 rounded-[14px] hover:bg-[#FFF3F5] text-xs font-semibold text-[#2A1D22] hover:text-[#C73A57] transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Profile & Settings</span>
                </Link>

                <button
                  onClick={() => void logout()}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-[14px] hover:bg-rose-50 text-xs font-semibold text-[#D94C61] transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
