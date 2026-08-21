import React from 'react';
import { X, Info, ShieldCheck, Zap, Cpu, Database } from 'lucide-react';

export default function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-brand-card border-2 border-brand-border rounded-2xl max-w-xl w-full p-6 shadow-2xl relative overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-brand-textMuted hover:text-white p-1 rounded-full hover:bg-brand-border transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 border-b border-brand-border pb-4 mb-4">
          <div className="w-10 h-10 rounded bg-brand-pink text-white font-extrabold flex items-center justify-center border border-black shadow-sticker-pink">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-white text-lg uppercase">
              ABOUT HH GOA 2026 VOICE RAG
            </h2>
            <p className="text-xs font-mono text-brand-textMuted">
              Voice-First Retrieval-Augmented Generation Architecture
            </p>
          </div>
        </div>

        {/* Specs Content */}
        <div className="space-y-4 text-xs font-mono text-brand-textMain leading-relaxed">
          <div className="bg-brand-bg p-3 rounded-lg border border-brand-border space-y-2">
            <div className="flex items-center space-x-2 text-brand-emerald font-bold">
              <Database className="w-4 h-4" />
              <span>DATASET: AI4Bharat / MSMARCO-XI</span>
            </div>
            <p className="text-brand-textMuted text-[11px]">
              Indexed passage corpus translated into 11 Indic languages for cross-lingual passage retrieval benchmarking.
            </p>
          </div>

          <div className="bg-brand-bg p-3 rounded-lg border border-brand-border space-y-2">
            <div className="flex items-center space-x-2 text-brand-gold font-bold">
              <Zap className="w-4 h-4" />
              <span>SPEECH-TO-TEXT: Sarvam AI / Web Speech API</span>
            </div>
            <p className="text-brand-textMuted text-[11px]">
              Real voice capture with automatic Web Audio API silence detection, transcribing speech under 150ms.
            </p>
          </div>

          <div className="bg-brand-bg p-3 rounded-lg border border-brand-border space-y-2">
            <div className="flex items-center space-x-2 text-brand-pink font-bold">
              <Cpu className="w-4 h-4" />
              <span>MULTI-STRATEGY CHUNKING</span>
            </div>
            <p className="text-brand-textMuted text-[11px]">
              Engineered with Semantic boundaries, Fixed sliding overlap, and Metadata-adaptive chunking strategies.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-brand-border text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-brand-emerald text-black font-mono font-bold text-xs rounded shadow-sticker-emerald hover:scale-105 transition"
          >
            CLOSE
          </button>
        </div>

      </div>
    </div>
  );
}
