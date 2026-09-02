import React from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-bold text-[#2A1D22] tracking-wide uppercase">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && <span className="absolute left-3.5 text-[#BFAFB5] pointer-events-none">{icon}</span>}
          <input
            ref={ref}
            className={clsx(
              'w-full bg-[#FFF3F5] text-[#2A1D22] placeholder:text-[#BFAFB5] font-medium text-sm rounded-[18px] border border-[#FAD7E0] transition-all outline-none',
              'focus:bg-white focus:border-[#E84D72] focus:ring-2 focus:ring-[#E84D72]/20',
              icon ? 'pl-10 pr-4 py-3' : 'px-4 py-3',
              error && 'border-[#D94C61] ring-1 ring-[#D94C61]/30',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-[#D94C61] font-semibold pl-1">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
