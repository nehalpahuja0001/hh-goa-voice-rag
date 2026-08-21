import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, RefreshCw, Send, AlertTriangle, CheckCircle2, RotateCcw, Terminal, Activity, Layers, Lock } from 'lucide-react';

export default function VoiceInterface({ onQuerySubmit, isProcessing, activeStep, error, setError }) {
  // Mic State Machine: 'idle' | 'requesting_permission' | 'listening' | 'processing_audio' | 'transcribing' | 'retrieving' | 'generating' | 'success' | 'error_permission' | 'error_no_speech' | 'error_generic'
  const [micState, setMicState] = useState('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [silenceCountdown, setSilenceCountdown] = useState(7.0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [livePreviewText, setLivePreviewText] = useState('');
  const [textFallback, setTextFallback] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [permissionErrorDetail, setPermissionErrorDetail] = useState('');

  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingMimeTypeRef = useRef('');
  const timerRef = useRef(null);
  const maxDurationTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const liveTextRef = useRef('');
  const hasSubmittedRef = useRef(false);

  // Audio Analyser & Silence Detector Refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const lastSpeechTimeRef = useRef(Date.now());
  const hasSpokenRef = useRef(false);
  const recordingStartTimeRef = useRef(Date.now());
  const isStoppingRef = useRef(false);

  // 7-Second Configuration
  const SILENCE_THRESHOLD = 0.002;
  const SILENCE_DURATION_MS = 1500;
  const HARD_7S_TIMEOUT_MS = 7000;

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];
    for (const type of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  // Sync external pipeline step & errors to mic state machine
  useEffect(() => {
    if (isProcessing) {
      if (activeStep === 'stt') setMicState('transcribing');
      else if (activeStep === 'retrieval') setMicState('retrieving');
      else if (activeStep === 'rag') setMicState('generating');
    } else if (micState !== 'idle' && micState !== 'listening' && micState !== 'requesting_permission') {
      if (error) {
        setMicState('error_generic');
      } else {
        setMicState('success');
      }
    }
  }, [isProcessing, activeStep, error]);

  // Web Speech API for real-time speech-to-text recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        let current = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        if (current.trim()) {
          const trimmed = current.trim();
          setLivePreviewText(trimmed);
          liveTextRef.current = trimmed;
          hasSpokenRef.current = true;
          setHasSpoken(true);
          lastSpeechTimeRef.current = Date.now();
        }
      };

      rec.onerror = (e) => {
        console.warn("[MIC] WebSpeech notice:", e.error);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const [hasSpoken, setHasSpoken] = useState(false);
  const isListening = micState === 'listening';

  // Timer counter
  useEffect(() => {
    if (isListening) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isListening]);

  // Audio Analyser & Silence Detection Loop
  const setupAudioAnalyser = (stream) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      recordingStartTimeRef.current = Date.now();
      lastSpeechTimeRef.current = Date.now();
      hasSpokenRef.current = false;
      liveTextRef.current = '';
      setHasSpoken(false);

      const checkAudio = () => {
        if (!analyserRef.current || isStoppingRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength) / 255.0;
        setAudioLevel(Math.min(1.0, rms * 4.0));

        const now = Date.now();
        const totalElapsed = now - recordingStartTimeRef.current;
        const remainingHardSec = Math.max(0, ((HARD_7S_TIMEOUT_MS - totalElapsed) / 1000)).toFixed(1);
        setSilenceCountdown(remainingHardSec);

        // 1. Check Hard 7.0s Timeout
        if (totalElapsed >= HARD_7S_TIMEOUT_MS) {
          console.log("[MIC] HARD_7S_TIMEOUT reached. Stopping now.");
          stopListening();
          return;
        }

        // 2. Check Volume & Silence
        if (rms > SILENCE_THRESHOLD) {
          lastSpeechTimeRef.current = now;
          if (!hasSpokenRef.current) {
            hasSpokenRef.current = true;
            setHasSpoken(true);
          }
        } else if (hasSpokenRef.current) {
          const silentMs = now - lastSpeechTimeRef.current;
          if (silentMs >= SILENCE_DURATION_MS) {
            console.log(`[MIC] SILENCE_AUTO_STOP triggered after ${SILENCE_DURATION_MS}ms.`);
            stopListening();
            return;
          }
        }

        // Render Canvas Visualizer
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const numBars = 32;
          const barWidth = 3.5;
          const gap = 2.5;
          const startX = (canvas.width - (numBars * (barWidth + gap))) / 2;

          for (let i = 0; i < numBars; i++) {
            const index = Math.floor((i / numBars) * bufferLength);
            const val = dataArray[index] / 255.0;
            const barHeight = Math.max(3, val * canvas.height * 0.95);

            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, '#00f076');
            gradient.addColorStop(0.5, '#ffee00');
            gradient.addColorStop(1, '#ff2a85');

            ctx.fillStyle = gradient;
            ctx.fillRect(startX + i * (barWidth + gap), (canvas.height - barHeight) / 2, barWidth, barHeight);
          }
        }

        animFrameRef.current = requestAnimationFrame(checkAudio);
      };

      checkAudio();

    } catch (e) {
      console.warn("[MIC] Audio Analyser fallback:", e);
    }
  };

  const startListening = async () => {
    setError(null);
    setPermissionErrorDetail('');
    setLivePreviewText('');
    liveTextRef.current = '';
    audioChunksRef.current = [];
    hasSubmittedRef.current = false;
    isStoppingRef.current = false;
    setMicState('requesting_permission');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("[MIC] getUserMedia not supported in this browser context.");
      setMicState('error_permission');
      setPermissionErrorDetail("Your browser or context does not support microphone access.");
      setError("Microphone API unavailable.");
      return;
    }

    try {
      console.log("[MIC] Requesting getUserMedia stream...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      console.log("[MIC] getUserMedia granted successfully.");

      const mimeType = getSupportedMimeType();
      recordingMimeTypeRef.current = mimeType || 'audio/webm';

      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          console.log(`[MIC] Audio chunk captured size=${e.data.size}`);
        }
      };

      mediaRecorder.onstop = () => {
        submitRecordedPayload();
      };

      mediaRecorder.start(100);
      setupAudioAnalyser(stream);
      setMicState('listening');

      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (e) {}
      }

      maxDurationTimerRef.current = setTimeout(() => {
        console.log("[MIC] HARD_7S_TIMEOUT timer fired.");
        stopListening();
      }, HARD_7S_TIMEOUT_MS);

    } catch (err) {
      console.error("[MIC] getUserMedia error:", err);
      setMicState('error_permission');
      const errName = err.name || 'Error';
      const errMessage = err.message || 'Microphone access was blocked or denied.';
      setPermissionErrorDetail(`${errName}: ${errMessage}`);
      setError(`Microphone permission error (${errName}).`);
    }
  };

  const stopListening = () => {
    console.log("[MIC] STOP_LISTENING triggered.");
    isStoppingRef.current = true;
    setMicState('processing_audio');

    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }

    // Force immediate submission
    submitRecordedPayload();
  };

  const submitRecordedPayload = () => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    const finalMime = recordingMimeTypeRef.current || 'audio/webm';
    const audioBlob = new Blob(audioChunksRef.current, { type: finalMime });
    const capturedText = liveTextRef.current.trim() || livePreviewText.trim();
    console.log(`[MIC] SUBMITTING_PAYLOAD audio_size=${audioBlob.size} capturedText="${capturedText}"`);

    if (capturedText) {
      onQuerySubmit({ type: 'text', query: capturedText });
    } else if (audioBlob.size > 0) {
      onQuerySubmit({ type: 'audio', blob: audioBlob, interimTranscript: capturedText });
    } else {
      setMicState('error_no_speech');
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!textFallback.trim() || isProcessing) return;
    setMicState('transcribing');
    onQuerySubmit({ type: 'text', query: textFallback.trim() });
  };

  const resetState = () => {
    isStoppingRef.current = false;
    hasSubmittedRef.current = false;
    setMicState('idle');
    setError(null);
    setPermissionErrorDetail('');
    setLivePreviewText('');
    liveTextRef.current = '';
    setHasSpoken(false);
  };

  return (
    <div className="bg-brand-card/95 border border-brand-border rounded-xl p-4 shadow-hacker-card text-center relative overflow-hidden flex-1 flex flex-col justify-between">
      
      {/* Ambient Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-emerald/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Status */}
      <div className="relative z-10">
        <div className="inline-flex items-center space-x-1.5 font-mono text-xs uppercase">
          <span className={`w-2 h-2 rounded-full ${
            micState === 'listening' ? 'bg-brand-gold animate-ping' :
            micState.startsWith('processing') || micState === 'transcribing' || micState === 'retrieving' || micState === 'generating' ? 'bg-brand-pink animate-pulse' :
            micState.startsWith('error') ? 'bg-brand-red' : 'bg-brand-emerald'
          }`} />
          <span className="font-bold text-white">
            {micState === 'idle' && 'Tap microphone to speak'}
            {micState === 'requesting_permission' && 'Allow mic permission...'}
            {micState === 'listening' && (hasSpoken ? `Auto-stop in ${silenceCountdown}s` : `Listening (${silenceCountdown}s)`)}
            {micState === 'processing_audio' && 'Processing voice query...'}
            {micState === 'transcribing' && 'Transcribing...'}
            {micState === 'retrieving' && 'Retrieving context...'}
            {micState === 'generating' && 'Generating answer...'}
            {micState === 'success' && 'Answer ready'}
            {micState === 'error_permission' && 'Microphone access blocked'}
            {micState === 'error_no_speech' && 'No speech heard'}
            {micState === 'error_generic' && 'Pipeline alert'}
          </span>
        </div>

        {isListening && (
          <span className="ml-2 font-mono text-xs text-brand-gold font-extrabold">
            00:0{recordingSeconds}
          </span>
        )}
      </div>

      {/* Central Mic Button */}
      <div className="relative inline-block my-2 z-10 mx-auto">
        {isListening && (
          <div
            className="absolute -inset-3 rounded-full bg-brand-emerald/25 transition-all duration-75 mic-ring-active"
            style={{ transform: `scale(${1 + audioLevel * 0.35})` }}
          />
        )}

        <button
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          aria-label={isListening ? "Stop recording" : "Start recording"}
          className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all duration-200 shadow-lg border-2 ${
            isListening
              ? 'bg-brand-gold text-black border-black shadow-glow-gold scale-105 cursor-pointer'
              : isProcessing
              ? 'bg-brand-darkEmerald border-brand-pink text-brand-pink cursor-wait'
              : 'bg-brand-darkEmerald border-brand-emerald text-brand-emerald hover:bg-brand-card hover:border-brand-neon hover:shadow-glow-emerald hover:scale-105'
          }`}
        >
          {isListening ? (
            <>
              <Mic className="w-10 h-10 fill-current animate-pulse mb-0.5" />
              <span className="font-mono font-extrabold text-[10px] uppercase text-black">
                STOP
              </span>
            </>
          ) : isProcessing ? (
            <>
              <RefreshCw className="w-10 h-10 animate-spin text-brand-pink mb-0.5" />
              <span className="font-mono font-bold text-[10px] uppercase text-brand-pink">
                WAIT
              </span>
            </>
          ) : (
            <>
              <Mic className="w-10 h-10 mb-0.5" />
              <span className="font-mono font-bold text-[10px] uppercase text-brand-emerald">
                TAP MIC
              </span>
            </>
          )}
        </button>
      </div>

      {/* Waveform & Manual Stop */}
      <div className="relative z-10 space-y-1">
        {isListening && (
          <canvas ref={canvasRef} width={260} height={24} className="mx-auto" />
        )}

        {isListening && (
          <button
            onClick={stopListening}
            className="px-3 py-1 bg-brand-red text-white font-mono font-bold text-[11px] rounded shadow-sticker-pink flex items-center space-x-1 mx-auto cursor-pointer"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>STOP RECORDING NOW</span>
          </button>
        )}

        {livePreviewText && (
          <div className="p-2 bg-brand-bg border border-brand-border rounded font-mono text-xs text-brand-gold text-left">
            <span className="text-brand-textMuted uppercase font-bold mr-1">[PREVIEW]:</span>
            "{livePreviewText}"
          </div>
        )}
      </div>

      {/* Clear Permission Error Banner */}
      {micState === 'error_permission' && (
        <div className="p-3 bg-brand-red/10 border border-brand-red/60 rounded-xl text-left font-mono text-xs space-y-2 relative z-10">
          <div className="flex items-center space-x-2 text-brand-red font-bold">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>Microphone permission blocked or unavailable.</span>
          </div>
          {permissionErrorDetail && (
            <p className="text-brand-textMuted text-[11px] font-mono">
              {permissionErrorDetail}
            </p>
          )}
          <p className="text-brand-gold text-[11px]">
            💡 <strong>How to fix:</strong> Click the lock icon 🔒 next to <code>localhost:3000</code> in your browser address bar and set Microphone to <strong>Allow</strong>.
          </p>
          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={startListening}
              className="px-3 py-1 bg-brand-red text-white font-bold rounded shadow-sticker-pink text-xs flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry Permission</span>
            </button>
            <button
              onClick={() => setShowTextInput(true)}
              className="px-3 py-1 bg-brand-card border border-brand-border text-white font-bold rounded text-xs hover:border-brand-emerald cursor-pointer"
            >
              Type Question Instead
            </button>
          </div>
        </div>
      )}

      {/* Error State: No Speech Detected */}
      {micState === 'error_no_speech' && (
        <div className="p-3 bg-brand-gold/10 border border-brand-gold/50 rounded-xl text-left font-mono text-xs space-y-2 relative z-10">
          <div className="flex items-center space-x-2 text-brand-gold font-bold">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>I didn't hear anything.</span>
          </div>
          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={startListening}
              className="px-3 py-1 bg-brand-gold text-black font-bold rounded shadow-sticker-gold text-xs flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Try again</span>
            </button>
            <button
              onClick={() => setShowTextInput(true)}
              className="px-3 py-1 bg-brand-card border border-brand-border text-white font-bold rounded text-xs hover:border-brand-emerald cursor-pointer"
            >
              Type question
            </button>
          </div>
        </div>
      )}

      {/* Generic Error */}
      {error && micState !== 'error_permission' && micState !== 'error_no_speech' && (
        <div className="p-2.5 bg-brand-red/10 border border-brand-red/50 rounded flex items-center justify-between text-brand-red font-mono text-xs relative z-10">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={resetState}
            className="underline font-bold text-[10px] ml-2 hover:text-white"
          >
            Reset
          </button>
        </div>
      )}

      {/* Accessibility Text Fallback Toggle */}
      <div className="pt-2 border-t border-brand-border flex items-center justify-between text-[11px] font-mono relative z-10">
        <button
          onClick={() => setShowTextInput(!showTextInput)}
          className="text-brand-textMuted hover:text-brand-gold underline cursor-pointer font-bold"
        >
          {showTextInput ? 'Hide Input' : 'Or type your question'}
        </button>

        {(livePreviewText || error || micState.startsWith('error')) && (
          <button onClick={resetState} className="text-brand-textMuted hover:text-white flex items-center space-x-1 cursor-pointer">
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {showTextInput && (
        <form onSubmit={handleTextSubmit} className="mt-2 flex items-center space-x-1.5 relative z-10">
          <input
            type="text"
            value={textFallback}
            onChange={(e) => setTextFallback(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 bg-brand-bg border border-brand-border rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-brand-emerald"
          />
          <button
            type="submit"
            disabled={isProcessing || !textFallback.trim()}
            className="px-3 py-1 bg-brand-emerald text-black font-mono font-bold text-xs rounded hover:bg-brand-neon transition cursor-pointer"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
      )}

    </div>
  );
}
