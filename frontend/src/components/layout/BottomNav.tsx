'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, Timer, BarChart2, Grid } from 'lucide-react';
import clsx from 'clsx';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Home', href: '/home', icon: Home },
    { name: 'Plan', href: '/accountability', icon: CheckSquare },
    { name: 'Timer', href: '/pomodoro', icon: Timer },
    { name: 'Stats', href: '/statistics', icon: BarChart2 },
    { name: 'Tools', href: '/profile', icon: Grid },
  ];

  return (
    <div className="md:hidden fixed bottom-3 inset-x-0 z-40 px-4 pointer-events-none">
      <nav className="pointer-events-auto max-w-sm mx-auto h-[62px] rounded-[31px] bg-white/95 backdrop-blur-lg border-[1.5px] border-[#E84D72]/40 shadow-xl px-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-200 active:scale-90',
                isActive
                  ? 'bg-gradient-to-tr from-[#C73A57] to-[#E84D72] text-white shadow-md scale-105'
                  : 'text-[#66545B] hover:text-[#C73A57]'
              )}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
