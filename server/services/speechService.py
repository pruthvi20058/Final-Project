"""
MediAgent Multilingual Speech Recognition (ASR) Service
Handles audio file transcription for Indian languages and English.
"""

import sys
import json
import os
import wave

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

try:
    import speech_recognition as sr
    HAS_SR = True
except ImportError:
    HAS_SR = False

LOCALE_MAP = {
    'kn': 'kn-IN',
    'hi': 'hi-IN',
    'ta': 'ta-IN',
    'te': 'te-IN',
    'ml': 'ml-IN',
    'mr': 'mr-IN',
    'bn': 'bn-IN',
    'gu': 'gu-IN',
    'pa': 'pa-IN',
    'en': 'en-IN'
}

def transcribe_audio(audio_path, target_language=None):
    if not os.path.exists(audio_path):
        return {
            'success': False,
            'error_code': 'FILE_NOT_FOUND',
            'message': f'Audio file not found at {audio_path}'
        }

    # Verify file size
    size_bytes = os.path.getsize(audio_path)
    if size_bytes < 100:
        return {
            'success': False,
            'error_code': 'EMPTY_AUDIO',
            'message': 'Recorded audio file contains no sound or is empty. Please speak into the microphone.'
        }

    if not HAS_SR:
        return {
            'success': False,
            'error_code': 'ENGINE_UNAVAILABLE',
            'message': 'speech_recognition library is not installed.'
        }

    lang_code = LOCALE_MAP.get(target_language, target_language) if target_language else 'kn-IN'

    r = sr.Recognizer()
    r.energy_threshold = 300
    r.dynamic_energy_threshold = True

    try:
        with sr.AudioFile(audio_path) as source:
            audio_data = r.record(source)

        # Attempt transcription with target language or primary candidates
        candidate_langs = [lang_code]
        if not target_language or target_language == 'auto':
            candidate_langs = ['kn-IN', 'hi-IN', 'en-IN', 'ta-IN', 'te-IN']

        last_error = None
        for cl in candidate_langs:
            try:
                # show_all=True returns raw JSON response from Google Speech API
                raw_response = r.recognize_google(audio_data, language=cl, show_all=True)
                if raw_response and isinstance(raw_response, dict) and 'alternative' in raw_response:
                    best = raw_response['alternative'][0]
                    transcript = best.get('transcript', '')
                    # Confidence if provided by Google, otherwise None (do NOT fabricate)
                    confidence = best.get('confidence', None)
                    if confidence is not None:
                        confidence = round(float(confidence), 3)

                    # Extract base language code (e.g. kn from kn-IN)
                    base_lang = cl.split('-')[0]

                    return {
                        'success': True,
                        'transcript': transcript,
                        'detected_language': cl,
                        'language': base_lang,
                        'confidence': confidence,
                        'provider': 'Google Multilingual Speech ASR',
                        'file_size_bytes': size_bytes
                    }
                elif isinstance(raw_response, str) and raw_response.strip():
                    return {
                        'success': True,
                        'transcript': raw_response.strip(),
                        'detected_language': cl,
                        'language': cl.split('-')[0],
                        'confidence': None, # Provider did not return numeric score
                        'provider': 'Google Multilingual Speech ASR',
                        'file_size_bytes': size_bytes
                    }
            except sr.UnknownValueError:
                last_error = 'UNCLEAR_SPEECH'
            except sr.RequestError as req_err:
                last_error = f'NETWORK_ERROR: {str(req_err)}'
            except Exception as e:
                last_error = str(e)

        if last_error == 'UNCLEAR_SPEECH':
            return {
                'success': False,
                'error_code': 'UNCLEAR_SPEECH',
                'message': 'Speech could not be clearly recognized. Please check your microphone and speak clearly, or type your symptoms.'
            }
        else:
            return {
                'success': False,
                'error_code': 'RECOGNITION_FAILED',
                'message': last_error or 'Could not transcribe audio input.'
            }

    except Exception as err:
        return {
            'success': False,
            'error_code': 'AUDIO_DECODE_ERROR',
            'message': f'Failed to process audio format: {str(err)}'
        }


if __name__ == '__main__':
    if len(sys.argv) > 1:
        try:
            payload = json.loads(sys.argv[1])
            audio_path = payload.get('audio_path')
            lang = payload.get('language')
            result = transcribe_audio(audio_path, lang)
            print(json.dumps(result, ensure_ascii=False))
        except Exception as e:
            print(json.dumps({'success': False, 'error': str(e)}))
    else:
        print(json.dumps({'error': 'Audio file path required'}))
