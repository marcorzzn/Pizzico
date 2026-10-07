import React from 'react';

export interface PillProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export const Pill: React.FC<PillProps> = ({
  active,
  onClick,
  children,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-[11px]';

  return (
    <button
      onClick={onClick}
      className={`${sizeClasses} rounded-xl font-medium transition-all duration-200 cursor-pointer ${
        active
          ? 'bg-white/[0.09] text-white ring-1 ring-inset ring-white/[0.12] shadow-[0_2px_12px_-4px_rgba(255,255,255,0.15)] font-semibold'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
      } ${className}`}
    >
      {children}
    </button>
  );
};
