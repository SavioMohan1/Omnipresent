import React from 'react';

interface OmnipresentLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function OmnipresentLogo({ size = 36, showText = true, className = '' }: OmnipresentLogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Dynamic Animated Vector Mark */}
      <div 
        className="relative flex items-center justify-center rounded-2xl shadow-xl transition-transform duration-300 hover:scale-105"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]">
          <defs>
            <linearGradient id="omni-ring-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="omni-ring-2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
            <radialGradient id="omni-core-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Obsidian Plate */}
          <rect width="100" height="100" rx="22" fill="#0d1322" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
          
          {/* Orbital Ellipses */}
          <ellipse cx="50" cy="50" rx="33" ry="14" transform="rotate(-30 50 50)" stroke="url(#omni-ring-1)" strokeWidth="3.2" strokeLinecap="round" />
          <ellipse cx="50" cy="50" rx="33" ry="14" transform="rotate(30 50 50)" stroke="url(#omni-ring-2)" strokeWidth="3.2" strokeLinecap="round" />

          {/* Central Quantum Core */}
          <circle cx="50" cy="50" r="10" fill="url(#omni-core-glow)" />
          <circle cx="50" cy="50" r="4.5" fill="#ffffff" />

          {/* Constellation Nodes */}
          <circle cx="75" cy="35" r="2.8" fill="#38bdf8" />
          <circle cx="25" cy="65" r="2.8" fill="#a855f7" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-wider text-white bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              OMNIPRESENT
            </span>
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              v3 AI
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 tracking-wide">
            Autonomous Enterprise Orchestration
          </span>
        </div>
      )}
    </div>
  );
}
