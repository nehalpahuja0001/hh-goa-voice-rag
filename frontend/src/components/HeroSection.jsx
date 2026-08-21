import React from 'react';
import { Zap } from 'lucide-react';

export default function HeroSection() {
  return (
    <div className="text-left shrink-0">
      <div className="flex items-center space-x-2">
        <span className="bg-brand-gold text-black border border-black px-2 py-0.5 font-mono font-extrabold text-[10px] uppercase shadow-sticker-gold rounded-sm inline-flex items-center space-x-1">
          <Zap className="w-3 h-3 fill-current" />
          <span>VOICE RAG ENGINE</span>
        </span>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight font-display">
          HH GOA 2026 — <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-emerald via-brand-yellow to-brand-pink">VOICE RAG</span>
        </h1>
      </div>
    </div>
  );
}
