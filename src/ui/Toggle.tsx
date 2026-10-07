import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  accent?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  accent = 'bg-cyan-400',
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer ${
        checked ? accent : 'bg-white/[0.1]'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
};
