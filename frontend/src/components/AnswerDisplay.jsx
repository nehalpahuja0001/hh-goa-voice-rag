import React, { useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, Volume2, Database } from 'lucide-react';
import { synthesizeSpeech } from '../services/api';

export default function AnswerDisplay({ result }) {
  const [expandedChunks, setExpandedChunks] = useState({});
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  if (!result) return null;

  const { query, answer, grounded, confidence, citations, reason, retrieved_chunks, latency } = result;

  const toggleChunk = (chunkId) => {
    setExpandedChunks(prev => ({ ...prev, [chunkId]: !prev[chunkId] }));
  };

  const handlePlayVoiceResponse = async () => {
    if (isPlayingAudio) return;
    try {
      setIsPlayingAudio(true);
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(answer);
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
        return;
      }
      
      const url = await synthesizeSpeech(answer);
      const audio = new Audio(url);
      audio.onended = () => setIsPlayingAudio(false);
      audio.play();
    } catch (e) {
      console.warn("TTS Playback notice:", e);
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-3 overflow-y-auto pr-1 min-h-0">
      
      {/* 1. YOU SAID Transcript Card */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-3 shadow-hacker-card shrink-0">
        <div className="flex items-center justify-between text-[11px] font-mono text-brand-textMuted uppercase mb-1">
          <span className="flex items-center space-x-1 text-brand-gold font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
            <span>YOU SAID</span>
          </span>
          <span>LATENCY: {latency?.total_e2e_ms || 0}MS</span>
        </div>
        <p className="font-mono text-xs sm:text-sm text-white font-bold">
          "{query}"
        </p>
      </div>

      {/* 2. Grounded Answer Card */}
      <div className={`bg-brand-card border-2 rounded-xl p-4 shadow-hacker-card transition-all shrink-0 ${
        grounded ? 'border-brand-emerald' : 'border-brand-gold'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border pb-2.5 mb-3">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className={`w-4 h-4 ${grounded ? 'text-brand-emerald' : 'text-brand-gold'}`} />
            <span className="font-mono font-extrabold text-xs uppercase tracking-wider text-white">
              GROUNDED ANSWER
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div className={`px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase rounded-sm border ${
              grounded
                ? 'bg-brand-emerald text-black border-black shadow-sticker-emerald'
                : 'bg-brand-gold text-black border-black shadow-sticker-gold'
            }`}>
              {grounded ? '✓ Grounded' : 'Unverified'}
            </div>

            <button
              onClick={handlePlayVoiceResponse}
              disabled={isPlayingAudio}
              className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-brand-darkEmerald border border-brand-emerald hover:border-brand-neon rounded font-mono text-xs text-brand-emerald hover:text-white transition cursor-pointer"
            >
              <Volume2 className={`w-3.5 h-3.5 ${isPlayingAudio ? 'animate-bounce text-brand-neon' : ''}`} />
              <span>{isPlayingAudio ? 'Speaking...' : 'Listen'}</span>
            </button>
          </div>
        </div>

        {/* Main Answer Content */}
        <p className="text-sm sm:text-base text-brand-textMain leading-relaxed font-sans font-semibold">
          {answer}
        </p>

        {/* Reason Footer */}
        {reason && (
          <div className="mt-3 pt-2 border-t border-brand-border/60 text-[11px] font-mono text-brand-textMuted flex items-center justify-between">
            <span className="truncate mr-2">Evidence: {reason}</span>
            {confidence > 0 && <span>Confidence: {(confidence * 100).toFixed(0)}%</span>}
          </div>
        )}
      </div>

      {/* 3. Collapsible Retrieved Evidence Accordion */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-3 shadow-hacker-card shrink-0">
        <button
          onClick={() => setShowEvidence(!showEvidence)}
          className="w-full flex items-center justify-between font-mono text-xs text-brand-textMuted uppercase hover:text-white transition select-none cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-brand-pink" />
            <span className="font-bold text-white">RETRIEVED EVIDENCE ({retrieved_chunks?.length || 0})</span>
          </div>
          <div className="flex items-center space-x-1 text-brand-emerald font-bold text-[11px]">
            <span>{showEvidence ? 'Hide Evidence' : 'Show Evidence'}</span>
            {showEvidence ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {showEvidence && (
          <div className="mt-2.5 space-y-2">
            {(!retrieved_chunks || retrieved_chunks.length === 0) ? (
              <p className="text-xs font-mono text-brand-textMuted italic">
                No document chunks retrieved.
              </p>
            ) : (
              retrieved_chunks.map((chunk, idx) => {
                const isExpanded = expandedChunks[chunk.chunk_id] ?? (idx === 0);
                const scorePercent = (chunk.score * 100).toFixed(1);

                return (
                  <div
                    key={chunk.chunk_id || idx}
                    className="bg-brand-bg border border-brand-border rounded p-2.5 text-xs font-mono"
                  >
                    <div
                      onClick={() => toggleChunk(chunk.chunk_id)}
                      className="flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-4 h-4 rounded bg-brand-pink text-white font-bold flex items-center justify-center text-[9px]">
                          #{chunk.rank}
                        </span>
                        <span className="text-white font-bold text-[11px]">Doc: {chunk.doc_id}</span>
                        <span className="px-1.5 py-0.2 bg-brand-darkEmerald border border-brand-emerald text-brand-emerald rounded text-[9px]">
                          {chunk.strategy}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-brand-gold font-bold text-[11px]">Score: {scorePercent}%</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-brand-textMuted" /> : <ChevronDown className="w-3.5 h-3.5 text-brand-textMuted" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-2 pt-1.5 border-t border-brand-border text-brand-textMain font-sans text-xs">
                        <p className="bg-brand-card p-2 rounded border border-brand-border font-mono text-[11px]">
                          "{chunk.text}"
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

    </div>
  );
}
