import React, { useState, useEffect } from 'react';
import { Activity, Play, BarChart2, X, Clock, CheckCircle } from 'lucide-react';
import { fetchAnalytics, runBenchmark } from '../services/api';

export default function AnalyticsPanel({ isOpen, onClose, currentLatency }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [error, setError] = useState(null);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetchAnalytics();
      if (res.status === 'SUCCESS') {
        setAnalyticsData(res.benchmark);
      }
    } catch (e) {
      console.warn("Analytics load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAnalytics();
    }
  }, [isOpen]);

  const handleRunBenchmark = async () => {
    try {
      setRunningBenchmark(true);
      setError(null);
      const res = await runBenchmark();
      if (res.results) {
        setAnalyticsData(res.results);
      }
    } catch (e) {
      setError("Benchmark execution failed: " + e.message);
    } finally {
      setRunningBenchmark(false);
    }
  };

  if (!isOpen) return null;

  const metrics = analyticsData?.metrics;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-brand-card border-2 border-brand-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-brand-textMuted hover:text-white p-1 rounded-full hover:bg-brand-border transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 border-b border-brand-border pb-4 mb-5">
          <div className="w-10 h-10 rounded bg-brand-emerald text-black font-extrabold flex items-center justify-center border border-black shadow-sticker-emerald">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-white text-lg uppercase">
              DEVELOPER ANALYTICS & LATENCY BENCHMARKS
            </h2>
            <p className="text-xs font-mono text-brand-textMuted">
              Empirical P50, P70, P100 latency percentiles measured across 20 test queries
            </p>
          </div>
        </div>

        {/* Active Query Latency Pill (if available) */}
        {currentLatency && (
          <div className="mb-5 p-3 bg-brand-darkEmerald border border-brand-emerald/40 rounded-lg">
            <div className="flex items-center justify-between text-xs font-mono text-brand-emerald uppercase font-bold mb-2">
              <span className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 animate-pulse text-brand-gold" />
                <span>LAST REQUEST LATENCY</span>
              </span>
              <span>TOTAL: {currentLatency.total_e2e_ms}ms</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="bg-brand-bg p-2 rounded border border-brand-border">
                <span className="text-[10px] text-brand-textMuted block">STT</span>
                <span className="text-white font-bold">{currentLatency.stt_ms}ms</span>
              </div>
              <div className="bg-brand-bg p-2 rounded border border-brand-border">
                <span className="text-[10px] text-brand-textMuted block">RETRIEVAL</span>
                <span className="text-brand-gold font-bold">{currentLatency.retrieval_ms}ms</span>
              </div>
              <div className="bg-brand-bg p-2 rounded border border-brand-border">
                <span className="text-[10px] text-brand-textMuted block">GUARDRAILS</span>
                <span className="text-white font-bold">{currentLatency.guardrails_ms}ms</span>
              </div>
              <div className="bg-brand-bg p-2 rounded border border-brand-border">
                <span className="text-[10px] text-brand-textMuted block">GENERATION</span>
                <span className="text-brand-emerald font-bold">{currentLatency.generation_ms}ms</span>
              </div>
            </div>
          </div>
        )}

        {/* Benchmark Percentile Grid */}
        {!analyticsData ? (
          <div className="text-center py-8 bg-brand-bg border border-dashed border-brand-border rounded-xl">
            <BarChart2 className="w-8 h-8 text-brand-textMuted mx-auto mb-2" />
            <p className="font-mono text-xs text-brand-textMuted uppercase font-bold">
              BENCHMARK NOT RUN YET
            </p>
            <button
              onClick={handleRunBenchmark}
              disabled={runningBenchmark}
              className="mt-4 px-4 py-2 bg-brand-emerald text-black font-mono font-bold text-xs rounded shadow-sticker-emerald hover:scale-105 transition"
            >
              {runningBenchmark ? 'RUNNING TEST SUITE...' : 'RUN BENCHMARK SUITE NOW'}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            
            {/* P50 P70 P100 Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-brand-bg border border-brand-emerald/50 rounded-xl p-3 text-center">
                <span className="px-2 py-0.5 bg-brand-emerald text-black font-mono font-bold text-[10px] uppercase rounded-sm border border-black">
                  P50 (MEDIAN)
                </span>
                <p className="text-2xl sm:text-3xl font-mono font-extrabold text-brand-emerald mt-2">
                  {metrics?.e2e?.p50 || 0}<span className="text-xs font-normal text-brand-textMuted">ms</span>
                </p>
                <p className="text-[10px] font-mono text-brand-textMuted mt-1">Retrieval: {metrics?.retrieval?.p50}ms</p>
              </div>

              <div className="bg-brand-bg border border-brand-gold/50 rounded-xl p-3 text-center">
                <span className="px-2 py-0.5 bg-brand-gold text-black font-mono font-bold text-[10px] uppercase rounded-sm border border-black">
                  P70 LATENCY
                </span>
                <p className="text-2xl sm:text-3xl font-mono font-extrabold text-brand-gold mt-2">
                  {metrics?.e2e?.p70 || 0}<span className="text-xs font-normal text-brand-textMuted">ms</span>
                </p>
                <p className="text-[10px] font-mono text-brand-textMuted mt-1">Retrieval: {metrics?.retrieval?.p70}ms</p>
              </div>

              <div className="bg-brand-bg border border-brand-pink/50 rounded-xl p-3 text-center">
                <span className="px-2 py-0.5 bg-brand-pink text-white font-mono font-bold text-[10px] uppercase rounded-sm border border-black">
                  P100 (MAX)
                </span>
                <p className="text-2xl sm:text-3xl font-mono font-extrabold text-brand-pink mt-2">
                  {metrics?.e2e?.p100 || 0}<span className="text-xs font-normal text-brand-textMuted">ms</span>
                </p>
                <p className="text-[10px] font-mono text-brand-textMuted mt-1">Retrieval: {metrics?.retrieval?.p100}ms</p>
              </div>
            </div>

            {/* Run Benchmark Action Button */}
            <div className="flex items-center justify-between pt-3 border-t border-brand-border">
              <span className="text-xs font-mono text-brand-textMuted">
                Tested Queries: {analyticsData.total_queries_tested || 20}
              </span>

              <button
                onClick={handleRunBenchmark}
                disabled={runningBenchmark}
                className="px-4 py-2 bg-brand-gold text-black font-mono font-bold text-xs rounded hover:bg-brand-yellow transition shadow-sticker-gold flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 ${runningBenchmark ? 'animate-spin' : ''}`} />
                <span>{runningBenchmark ? 'RE-RUNNING...' : 'RE-RUN BENCHMARK'}</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
