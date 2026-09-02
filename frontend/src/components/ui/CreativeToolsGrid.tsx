'use client';
import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Compass,
  Trophy,
  BookOpen,
  Zap,
  Droplets,
  MessageSquare,
  BarChart2,
  ChevronRight,
} from 'lucide-react';

interface ToolItem {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TOOLS: ToolItem[] = [
  {
    id: 'accountability',
    title: 'Accountability',
    subtitle: 'Daily Plan & Proof',
    route: '/accountability',
    icon: CheckCircle2,
  },
  {
    id: 'journey',
    title: 'Journey',
    subtitle: 'XP Roadmap',
    route: '/journey',
    icon: Compass,
  },
  {
    id: 'achievements',
    title: 'Achievements',
    subtitle: 'Badges Hub',
    route: '/achievements',
    icon: Trophy,
  },
  {
    id: 'pyq',
    title: 'Practice',
    subtitle: 'Exam PYQs',
    route: '/pyq',
    icon: BookOpen,
  },
  {
    id: 'flashcards',
    title: 'Flashcards',
    subtitle: 'Spaced SRS',
    route: '/flashcards',
    icon: Zap,
  },
  {
    id: 'water',
    title: 'Hydration',
    subtitle: 'Water Tracker',
    route: '/water',
    icon: Droplets,
  },
  {
    id: 'english',
    title: 'English',
    subtitle: 'Grammar & Vocab',
    route: '/english',
    icon: MessageSquare,
  },
  {
    id: 'statistics',
    title: 'Statistics',
    subtitle: 'Study Analytics',
    route: '/statistics',
    icon: BarChart2,
  },
];

export function CreativeToolsGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        return (
          <Link
            key={tool.id}
            href={tool.route}
            className="group relative overflow-hidden rounded-[22px] bg-[#FFF3F5]/95 hover:bg-white border border-[#FAD7E0] hover:border-[#F07392] p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between min-h-[110px]"
          >
            {/* Watermark icon on background */}
            <div className="absolute -right-2 -bottom-2 pointer-events-none opacity-10 group-hover:opacity-20 transition-opacity">
              <Icon className="w-16 h-16 text-[#E84D72]" />
            </div>

            {/* Top row with icon badge and chevron */}
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-[14px] bg-[#FFE4EB] group-hover:bg-[#E84D72] text-[#C73A57] group-hover:text-white flex items-center justify-center transition-colors shadow-2xs">
                <Icon className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-[#D94C61] group-hover:translate-x-0.5 transition-transform" />
            </div>

            {/* Bottom text */}
            <div className="pt-2 z-10">
              <h5 className="text-sm font-extrabold text-[#D94C61] group-hover:text-[#A61F45] tracking-tight">
                {tool.title}
              </h5>
              <p className="text-[11px] font-medium text-[#66545B]">{tool.subtitle}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
