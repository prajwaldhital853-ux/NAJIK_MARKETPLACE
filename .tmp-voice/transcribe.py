import speech_recognition as sr
from pathlib import Path

r = sr.Recognizer()
folder = Path(__file__).resolve().parent
for wav in sorted(folder.glob("*.wav")):
    print("=" * 60)
    print(wav.name)
    with sr.AudioFile(str(wav)) as source:
        audio = r.record(source)
    for lang in ["en-US", "ne-NP", "hi-IN"]:
        try:
            text = r.recognize_google(audio, language=lang)
            print(f"[{lang}] {text}")
        except Exception as e:
            print(f"[{lang}] FAIL: {type(e).__name__}: {e}")
