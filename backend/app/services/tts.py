import httpx
from typing import Optional
from app.config import settings

class TTSService:
    """
    Text-to-Speech Service supporting ElevenLabs & Sarvam AI Bulbul TTS.
    """
    def __init__(self):
        self.elevenlabs_api_key = settings.ELEVENLABS_API_KEY
        self.sarvam_api_key = settings.SARVAM_API_KEY

    async def synthesize(self, text: str) -> Optional[bytes]:
        """
        Synthesize audio speech for given text response.
        """
        if self.elevenlabs_api_key:
            try:
                return await self._synthesize_elevenlabs(text)
            except Exception as e:
                print(f"ElevenLabs TTS error: {e}")

        if self.sarvam_api_key:
            try:
                return await self._synthesize_sarvam(text)
            except Exception as e:
                print(f"Sarvam TTS error: {e}")

        return None

    async def _synthesize_elevenlabs(self, text: str) -> bytes:
        voice_id = "21m00Tcm4TlvDq8ikWAM"  # Rachel voice
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "xi-api-key": self.elevenlabs_api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "text": text[:500],  # Truncate for speed
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            return resp.content

    async def _synthesize_sarvam(self, text: str) -> bytes:
        url = "https://api.sarvam.ai/text-to-speech"
        headers = {
            "api-subscription-key": self.sarvam_api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "inputs": [text[:500]],
            "target_language_code": "en-IN",
            "speaker": "meera",
            "pitch": 0,
            "pace": 1.05
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            res_json = resp.json()
            audios = res_json.get("audios", [])
            if audios:
                import base64
                return base64.b64decode(audios[0])
            raise ValueError("No audio returned from Sarvam")

tts_service = TTSService()
