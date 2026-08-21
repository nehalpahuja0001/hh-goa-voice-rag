import React from 'react';
import { Sparkles } from 'lucide-react';

export default function DemoQueries({ onSelectQuery, disabled }) {
  const samples = [
    { label: "What is MS MARCO?", style: "hh-sticker-gold" },
    { label: "Explain this dataset", style: "hh-sticker-emerald" },
    { label: "What is retrieval augmented generation?", style: "hh-sticker-pink" },
    { label: "What is Sarvam AI speech model?", style: "hh-sticker-gold" },
    { label: "What is HH Goa 2026?", style: "hh-sticker-emerald" }
  ];

  return (
    <div id="demo-section" className="w-full">
      <div className="bg-brand-card/90 border border-brand-border rounded-xl p-4 shadow-hacker-card">
        <div className="flex items-center space-x-2 font-mono text-xs text-brand-gold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5 fill-current" />
          <span className="font-extrabold">TRY ASKING (CLICK A STICKER)</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {samples.map((sample, idx) => (
            <button
              key={idx}
              disabled={disabled}
              onClick={() => onSelectQuery(sample.label)}
              className={`hh-sticker ${sample.style} disabled:opacity-50 font-mono text-xs px-3.5 py-1.5 rounded cursor-pointer hover:scale-105 transition`}
            >
              <span>"{sample.label}"</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
