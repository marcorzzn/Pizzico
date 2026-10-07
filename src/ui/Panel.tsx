import React from 'react';

export interface PanelProps {
  children: React.ReactNode;
  className?: string;
  glow?: 'cyan' | 'violet' | 'amber' | 'emerald' | 'none';
}

export const Panel: React.FC<PanelProps> = ({ children, className = '', glow = 'none' }) => {
  const glowMap = {
    cyan: 'shadow-[0_0_40px_-12px_rgba(34,211,238,0.35)]',
    violet: 'shadow-[0_0_40px_-12px_rgba(167,139,250,0.35)]',
    amber: 'shadow-[0_0_40px_-12px_rgba(251,191,36,0.35)]',
    emerald: 'shadow-[0_0_40px_-12px_rgba(52,211,153,0.35)]',
    none: '',
  };

  return (
    <div
      className={`relative rounded-2xl bg-white/[0.03] backdrop-blur-xl ring-1 ring-inset ring-white/[0.06] ${glowMap[glow]} ${className}`}
    >
      {children}
    </div>
  );
};
