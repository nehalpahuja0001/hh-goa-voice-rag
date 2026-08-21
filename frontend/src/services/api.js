const API_BASE = '/api';

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend offline');
  return await res.json();
}

export async function sendTextQuery(query, strategy = 'semantic') {
  const res = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, strategy })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Query processing failed.');
  }
  return await res.json();
}

export async function sendVoiceQuery(audioBlob, strategy = 'semantic', interimTranscript = '') {
  const mime = audioBlob.type || 'audio/webm';
  const ext = mime.includes('webm') ? 'webm' : (mime.includes('mp4') ? 'mp4' : (mime.includes('ogg') ? 'ogg' : 'wav'));
  
  const formData = new FormData();
  formData.append('file', audioBlob, `recording.${ext}`);
  formData.append('strategy', strategy);
  if (interimTranscript && interimTranscript.trim()) {
    formData.append('interim_transcript', interimTranscript.trim());
  }

  console.log(`[API] SENDING_VOICE_QUERY filename=recording.${ext} mimeType=${mime} size=${audioBlob.size} interim="${interimTranscript}"`);

  const res = await fetch(`${API_BASE}/voice-query`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Voice query processing failed.');
  }
  return await res.json();
}

export async function fetchAnalytics() {
  const res = await fetch(`${API_BASE}/analytics`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return await res.json();
}

export async function runBenchmark() {
  const res = await fetch(`${API_BASE}/benchmark/run`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to run benchmark');
  return await res.json();
}

export async function synthesizeSpeech(text) {
  const res = await fetch(`${API_BASE}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error('TTS synthesis unavailable');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
