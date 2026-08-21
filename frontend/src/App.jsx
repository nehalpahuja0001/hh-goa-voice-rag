import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import VoiceInterface from './components/VoiceInterface';
import DemoQueries from './components/DemoQueries';
import AnswerDisplay from './components/AnswerDisplay';
import AnalyticsPanel from './components/AnalyticsPanel';
import AboutModal from './components/AboutModal';
import { checkHealth, sendTextQuery, sendVoiceQuery } from './services/api';
import { Clock, Database, Cpu, ShieldCheck, Terminal, Sparkles } from 'lucide-react';

export default function App() {
  const [selectedStrategy, setSelectedStrategy] = useState('semantic');
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Modals & Navigation states
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  useEffect(() => {
    const pollHealth = async () => {
      try {
        await checkHealth();
        setIsBackendOnline(true);
      } catch (e) {
        setIsBackendOnline(false);
      }
    };
    pollHealth();
    const interval = setInterval(pollHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleQuerySubmit = async ({ type, query, blob, interimTranscript }) => {
    setIsProcessing(true);
    setError(null);

    try {
      let res;
      if (type === 'audio') {
        setActiveStep('stt');
        await new Promise(r => setTimeout(r, 150));
        setActiveStep('retrieval');
        res = await sendVoiceQuery(blob, selectedStrategy, interimTranscript);
      } else {
        setActiveStep('retrieval');
        await new Promise(r => setTimeout(r, 100));
        setActiveStep('rag');
        res = await sendTextQuery(query, selectedStrategy);
      }

      setActiveStep('answer');
      setResult(res);

    } catch (err) {
      console.error("[PIPELINE] Query processing failed:", err);
      setError(err.message || 'An error occurred while processing your query.');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setActiveStep(null), 1200);
    }
  };

  const scrollToDemo = () => {
    const el = document.getElementById('demo-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="h-screen w-screen bg-brand-bg text-brand-textMain font-display flex flex-col overflow-hidden selection:bg-brand-gold selection:text-black">
      
      {/* Top Header (h-12) */}
      <Header
        selectedStrategy={selectedStrategy}
        setSelectedStrategy={setSelectedStrategy}
        isBackendOnline={isBackendOnline}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onScrollToDemo={scrollToDemo}
      />

      {/* Main Single Viewport Content Grid */}
      <main className="flex-1 p-3 grid grid-cols-12 gap-3 overflow-hidden min-h-0">
        
        {/* LEFT COLUMN: Title + Mic + Sample Questions (col-span-5) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col space-y-3 overflow-hidden min-h-0 h-full">
          
          <HeroSection />

          <VoiceInterface
            onQuerySubmit={handleQuerySubmit}
            isProcessing={isProcessing}
            activeStep={activeStep}
            error={error}
            setError={setError}
          />

          <DemoQueries
            onSelectQuery={(q) => handleQuerySubmit({ type: 'text', query: q })}
            disabled={isProcessing}
          />

        </div>

        {/* RIGHT COLUMN: Grounded Answer or System Dashboard (col-span-7) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col overflow-hidden min-h-0 h-full">
          
          {result ? (
            <AnswerDisplay result={result} />
          ) : (
            /* IDLE STATE: System Dashboard Card fitting 100vh height */
            <div className="bg-brand-card/95 border border-brand-border rounded-xl p-4 shadow-hacker-card flex-1 flex flex-col justify-between overflow-hidden">
              
              <div className="flex items-center justify-between border-b border-brand-border pb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-brand-gold" />
                  <span className="font-mono font-extrabold text-xs text-white uppercase tracking-wider">
                    RAG DASHBOARD • SYSTEM READY
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-brand-darkEmerald border border-brand-emerald text-brand-emerald font-mono text-[10px] rounded font-bold uppercase">
                  Idle State
                </span>
              </div>

              <p className="font-mono text-xs text-brand-textMuted leading-relaxed">
                Welcome to <strong className="text-white">HH Goa 2026 Voice RAG</strong>. Speak into the microphone on the left or select a sample question to trigger real-time dense vector retrieval and grounded generation.
              </p>

              {/* System Capabilities 4-Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-brand-bg border border-brand-border p-3 rounded-lg flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded bg-brand-emerald/20 border border-brand-emerald text-brand-emerald flex items-center justify-center flex-shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-brand-textMuted uppercase block">LATENCY GOAL</span>
                    <span className="text-xs font-mono font-bold text-white">&lt; 200ms E2E</span>
                  </div>
                </div>

                <div className="bg-brand-bg border border-brand-border p-3 rounded-lg flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded bg-brand-gold/20 border border-brand-gold text-brand-gold flex items-center justify-center flex-shrink-0">
                    <Database className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-brand-textMuted uppercase block">VECTOR STORE</span>
                    <span className="text-xs font-mono font-bold text-brand-gold">24 MS MARCO</span>
                  </div>
                </div>

                <div className="bg-brand-bg border border-brand-border p-3 rounded-lg flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded bg-brand-pink/20 border border-brand-pink text-brand-pink flex items-center justify-center flex-shrink-0">
                    <Cpu className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-brand-textMuted uppercase block">STT PROVIDER</span>
                    <span className="text-xs font-mono font-bold text-brand-pink">Sarvam AI STT</span>
                  </div>
                </div>

                <div className="bg-brand-bg border border-brand-border p-3 rounded-lg flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded bg-brand-emerald/20 border border-brand-emerald text-brand-emerald flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-brand-textMuted uppercase block">GUARDRAILS</span>
                    <span className="text-xs font-mono font-bold text-brand-emerald">Multi-Layer Active</span>
                  </div>
                </div>
              </div>

              {/* System Terminal Log */}
              <div className="bg-brand-bg border border-brand-border rounded-lg p-3 font-mono text-[11px] text-brand-textMuted space-y-1.5">
                <div className="flex items-center justify-between border-b border-brand-border/60 pb-1.5">
                  <div className="flex items-center space-x-1.5 text-brand-emerald font-bold">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>SYSTEM TERMINAL STREAM</span>
                  </div>
                  <span className="text-brand-gold text-[10px]">7S AUTO-STOP ACTIVE</span>
                </div>

                <div className="space-y-1 text-[10px]">
                  <p className="text-brand-emerald">[00:00:01] Vector Index initialized: 24 chunks loaded (FAISS / Cosine).</p>
                  <p className="text-brand-gold">[00:00:01] STT Pipeline ready: Sarvam AI + WebSpeech Stream.</p>
                  <p className="text-white">[00:00:01] RAG Harness online: Similarity threshold set to 0.15.</p>
                  <p className="text-brand-textMuted">[00:00:02] Awaiting user speech or sample question selection...</p>
                </div>
              </div>

            </div>
          )}

        </div>

      </main>

      {/* Modals */}
      <AnalyticsPanel
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        currentLatency={result?.latency}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* Bottom Compact Footer (h-8) */}
      <footer className="h-8 border-t border-brand-border bg-brand-bg px-4 font-mono text-[11px] text-brand-textMuted flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-brand-emerald"></span>
          <span className="text-white font-bold">HH GOA 2026</span>
          <span>• Voice-Enabled RAG</span>
        </div>

        <p className="text-[10px] text-brand-textMuted">
          AI4Bharat/MSMARCO-XI • Sarvam AI STT • Sub-200ms Vector Engine
        </p>
      </footer>

    </div>
  );
}
