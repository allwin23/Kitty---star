import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hoverEffect?: boolean;
}

export function Card({ children, className, glass = true, hoverEffect = false, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-[24px] border p-5 transition-all duration-200',
        glass
          ? 'bg-white/95 backdrop-blur-md border-[#FAD7E0] shadow-sm'
          : 'bg-white border-[#FAD7E0] shadow-sm',
        hoverEffect && 'hover:shadow-md hover:-translate-y-0.5 hover:border-[#F07392]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
