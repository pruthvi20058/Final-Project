"""
MediAgent Multilingual Speech Synthesis (TTS) Engine
Uses edge-tts neural voices for Indian languages with gTTS fallback.
"""

import sys
import json
import os
import asyncio
import uuid
import re

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Edge-TTS Neural Voice Map for Target Languages
VOICE_MAP = {
    'kn': 'kn-IN-GaganNeural',     # Kannada
    'hi': 'hi-IN-MadhurNeural',    # Hindi
    'ta': 'ta-IN-ValluvarNeural',  # Tamil
    'te': 'te-IN-MohanNeural',     # Telugu
    'ml': 'ml-IN-MidhunNeural',    # Malayalam
    'mr': 'mr-IN-ManoharNeural',   # Marathi
    'bn': 'bn-IN-BashkarNeural',   # Bengali
    'gu': 'gu-IN-NiranjanNeural',  # Gujarati
    'pa': 'en-IN-PrabhatNeural',   # Punjabi (fallback to en-IN or gTTS)
    'en': 'en-IN-PrabhatNeural'    # English
}

def clean_speech_text(text):
    """Sanitizes text to never read hidden system prompts, markdown, or bracketed instructions aloud."""
    # Remove markdown formatting
    cleaned = re.sub(r'[*_#`~]', '', text)
    # Remove bracketed system cues like [Triage: Urgent]
    cleaned = re.sub(r'\[.*?\]', '', cleaned)
    # Remove internal IDs like COND-1001 or REP-9001
    cleaned = re.sub(r'\b(COND|REP|PAT|PRED)-\d+\b', '', cleaned)
    # Collapse multiple whitespaces
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

async def synthesize_with_edge_tts(text, voice, output_path):
    import edge_tts
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)
    return True

def synthesize_with_gtts(text, lang_code, output_path):
    from gtts import gTTS
    tts = gTTS(text=text, lang=lang_code, slow=False)
    tts.save(output_path)
    return True

def generate_speech(text, language='en', output_dir=None):
    if not text or not text.strip():
        return {'success': False, 'error': 'Text is empty'}

    clean_text = clean_speech_text(text)
    if not clean_text:
        return {'success': False, 'error': 'No speakable text after sanitization'}

    if not output_dir:
        output_dir = os.path.join(os.path.dirname(__file__), '..', 'uploads')
    os.makedirs(output_dir, exist_ok=True)

    filename = f"tts_{uuid.uuid4().hex[:12]}.mp3"
    full_output_path = os.path.join(output_dir, filename)

    voice = VOICE_MAP.get(language, VOICE_MAP['en'])
    voice_used = voice

    # Try edge-tts first
    try:
        asyncio.run(synthesize_with_edge_tts(clean_text, voice, full_output_path))
    except Exception as edge_err:
        # Fallback to gTTS
        try:
            synthesize_with_gtts(clean_text, language if language in ['hi', 'kn', 'ta', 'te', 'bn', 'gu', 'mr', 'ml', 'en'] else 'en', full_output_path)
            voice_used = f"gTTS ({language})"
        except Exception as gtts_err:
            return {
                'success': False,
                'error': f'TTS synthesis failed: {str(edge_err)} | {str(gtts_err)}'
            }

    if os.path.exists(full_output_path):
        return {
            'success': True,
            'filename': filename,
            'audio_url': f'/uploads/{filename}',
            'voice_used': voice_used,
            'language': language,
            'file_size_bytes': os.path.getsize(full_output_path),
            'sanitized_text': clean_text
        }
    else:
        return {
            'success': False,
            'error': 'Speech file was not created on disk'
        }

if __name__ == '__main__':
    if len(sys.argv) > 1:
        try:
            payload = json.loads(sys.argv[1])
            txt = payload.get('text', '')
            lang = payload.get('language', 'en')
            res = generate_speech(txt, lang)
            print(json.dumps(res, ensure_ascii=False))
        except Exception as e:
            print(json.dumps({'success': False, 'error': str(e)}))
    else:
        print(json.dumps({'error': 'Payload required'}))
