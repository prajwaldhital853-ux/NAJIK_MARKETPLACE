# -*- coding: utf-8 -*-
import speech_recognition as sr
from pathlib import Path

r = sr.Recognizer()
wav = Path(__file__).resolve().parent / "voice_2026-08-22.wav"
out = Path(__file__).resolve().parent / "google_aug22.txt"
blocks = []
with sr.AudioFile(str(wav)) as source:
    audio = r.record(source)
for lang in ["ne-NP", "hi-IN", "en-IN", "en-US"]:
    try:
        text = r.recognize_google(audio, language=lang)
        block = f"=== [{lang}] ===\n{text}\n"
        print(block, flush=True)
        blocks.append(block)
    except Exception as e:
        print(f"[{lang}] FAIL {e}", flush=True)
out.write_text("\n".join(blocks), encoding="utf-8")
print("wrote", out)
