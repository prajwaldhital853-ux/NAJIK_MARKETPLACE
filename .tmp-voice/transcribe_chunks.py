# -*- coding: utf-8 -*-
import speech_recognition as sr
from pathlib import Path

r = sr.Recognizer()
folder = Path(__file__).resolve().parent
for wav in sorted(folder.glob("chunk_*.wav")):
    print("=" * 50)
    print(wav.name)
    with sr.AudioFile(str(wav)) as source:
        audio = r.record(source)
    for lang in ["ne-NP", "en-IN"]:
        try:
            text = r.recognize_google(audio, language=lang)
            print(f"[{lang}] {text}")
        except Exception as e:
            print(f"[{lang}] FAIL: {e}")
