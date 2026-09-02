import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'tertiary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-bold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-2 rounded-[16px] gap-1.5',
    md: 'text-sm px-5 py-2.5 rounded-[20px] gap-2',
    lg: 'text-base px-6 py-3.5 rounded-[22px] gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-[#C73A57] to-[#E84D72] hover:from-[#A61F45] hover:to-[#C73A57] text-white shadow-md shadow-[#C73A57]/20 border border-transparent',
    secondary:
      'bg-[#FFF3F5] text-[#C73A57] hover:bg-[#FFE4EB] border border-[#FAD7E0]',
    outline:
      'bg-transparent text-[#C73A57] hover:bg-[#FFF3F5] border-2 border-[#E84D72]',
    tertiary:
      'bg-transparent text-[#66545B] hover:text-[#C73A57] hover:bg-black/5',
    danger:
      'bg-[#D94C61] hover:bg-[#A61F45] text-white shadow-sm',
  };

  return (
    <button
      className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
