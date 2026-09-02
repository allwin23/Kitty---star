import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-[#FFF7F8] rounded-[24px] border border-[#FFE4EB]">
      {icon && <div className="text-4xl mb-3 text-[#C73A57]">{icon}</div>}
      <h4 className="text-base font-bold text-[#2A1D22] mb-1">{title}</h4>
      <p className="text-xs text-[#66545B] max-w-sm mb-4 leading-relaxed">{description}</p>
      {action}
    </div>
  );
}
