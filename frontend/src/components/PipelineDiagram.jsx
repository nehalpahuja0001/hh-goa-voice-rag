import React from 'react';
import { Mic, Speech, Database, Cpu, CheckCircle2 } from 'lucide-react';

export default function PipelineDiagram({ activeStep }) {
  const steps = [
    { id: 'stt', label: 'VOICE / STT', icon: Mic, desc: 'Sarvam AI / Web Speech' },
    { id: 'retrieval', label: 'RETRIEVAL', icon: Database, desc: 'Dense Vector Search' },
    { id: 'rag', label: 'RAG HARNESS', icon: Cpu, desc: 'Guardrails & Prompt Assembly' },
    { id: 'answer', label: 'ANSWER', icon: CheckCircle2, desc: 'Grounded Output' }
  ];

  const getStepStatus = (stepId) => {
    if (!activeStep) return 'idle';
    if (activeStep === stepId) return 'active';
    const order = ['stt', 'retrieval', 'rag', 'answer'];
    const activeIdx = order.indexOf(activeStep);
    const stepIdx = order.indexOf(stepId);
    return stepIdx < activeIdx ? 'done' : 'idle';
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6 px-4">
      <div className="bg-brand-card border border-brand-border rounded-lg p-4 shadow-hacker-card">
        <div className="flex items-center justify-between border-b border-brand-border pb-2.5 mb-4">
          <div className="flex items-center space-x-2 font-mono text-xs text-brand-textMuted uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-brand-emerald"></span>
            <span>PIPELINE ORCHESTRATION ARCHITECTURE</span>
          </div>
          <span className="text-[11px] font-mono text-brand-emerald bg-brand-darkEmerald/80 px-2 py-0.5 rounded border border-brand-emerald/30">
            TARGET &lt; 200MS
          </span>
        </div>

        {/* Steps Flow */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const status = getStepStatus(step.id);

            return (
              <div
                key={step.id}
                className={`relative flex flex-col items-center p-3 rounded border transition-all duration-300 ${
                  status === 'active'
                    ? 'bg-brand-darkEmerald border-brand-emerald shadow-glow-emerald scale-[1.02]'
                    : status === 'done'
                    ? 'bg-brand-card border-brand-emerald/50 text-brand-emerald'
                    : 'bg-brand-bg/60 border-brand-border text-brand-textMuted'
                }`}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full mb-2 border border-current font-mono text-xs font-bold">
                  {status === 'active' ? (
                    <Icon className="w-4 h-4 text-brand-emerald animate-bounce" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span className="font-mono font-bold text-xs tracking-wider uppercase text-white">
                  {step.label}
                </span>
                <span className="text-[10px] font-mono text-brand-textMuted text-center mt-1">
                  {step.desc}
                </span>

                {/* Processing Indicator */}
                {status === 'active' && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-neon opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-emerald"></span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
