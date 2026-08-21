import React from 'react';
import { Mic, BarChart2, Info } from 'lucide-react';

export default function Header({
  selectedStrategy,
  setSelectedStrategy,
  isBackendOnline,
  onOpenAnalytics,
  onOpenAbout,
  onScrollToDemo
}) {
  return (
    <header className="h-12 border-b border-brand-border bg-brand-bg/95 backdrop-blur shrink-0 w-full px-4 flex items-center justify-between z-40">
      
      {/* Brand Logo & Status */}
      <div className="flex items-center space-x-2.5">
        <div className="w-7 h-7 rounded bg-brand-gold text-black border border-black flex items-center justify-center font-mono font-extrabold text-xs shadow-sticker-gold">
          HH
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-display font-extrabold text-sm text-white tracking-wide uppercase">
            HH GOA 2026
          </span>
          <span className="px-1.5 py-0.5 bg-brand-pink text-white font-mono text-[9px] font-bold uppercase rounded shadow-sticker-pink">
            VOICE RAG
          </span>
        </div>
        <div className="flex items-center space-x-1.5 text-[11px] font-mono text-brand-textMuted border-l border-brand-border/60 pl-2.5">
          <span className={`w-2 h-2 rounded-full ${isBackendOnline ? 'bg-brand-emerald animate-pulse' : 'bg-brand-red'}`} />
          <span>{isBackendOnline ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
      </div>

      {/* Center Strategy Selector */}
      <div className="hidden md:flex items-center space-x-1.5 bg-brand-card border border-brand-border rounded p-0.5 font-mono text-[11px]">
        <span className="px-1.5 text-brand-textMuted font-bold">STRATEGY:</span>
        {['semantic', 'fixed', 'hierarchical'].map((strat) => (
          <button
            key={strat}
            onClick={() => setSelectedStrategy(strat)}
            className={`px-2 py-0.5 rounded uppercase font-bold transition cursor-pointer ${
              selectedStrategy === strat
                ? 'bg-brand-emerald text-black shadow-sticker-emerald'
                : 'text-brand-textMuted hover:text-white'
            }`}
          >
            {strat}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2 font-mono text-[11px]">
        <button
          onClick={onOpenAnalytics}
          className="px-2.5 py-1 bg-brand-card border border-brand-border hover:border-brand-gold text-brand-gold font-bold rounded flex items-center space-x-1 transition cursor-pointer"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>ANALYTICS</span>
        </button>

        <button
          onClick={onOpenAbout}
          className="px-2.5 py-1 bg-brand-card border border-brand-border hover:border-brand-pink text-brand-pink font-bold rounded flex items-center space-x-1 transition cursor-pointer"
        >
          <Info className="w-3.5 h-3.5" />
          <span>INFO</span>
        </button>
      </div>

    </header>
  );
}
