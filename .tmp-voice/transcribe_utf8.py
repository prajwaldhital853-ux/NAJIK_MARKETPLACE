# -*- coding: utf-8 -*-
import speech_recognition as sr
from pathlib import Path

r = sr.Recognizer()
folder = Path(__file__).resolve().parent
out = folder / "google_transcripts.txt"
blocks = []
for wav in sorted(folder.glob("*.wav")):
    print("file", wav.name, flush=True)
    with sr.AudioFile(str(wav)) as source:
        audio = r.record(source)
    for lang in ["ne-NP", "hi-IN", "en-IN", "en-US"]:
        try:
            text = r.recognize_google(audio, language=lang)
            line = f"=== {wav.name} [{lang}] ===\n{text}\n"
            print(line, flush=True)
            blocks.append(line)
        except Exception as e:
            print(f"{wav.name} [{lang}] FAIL {e}", flush=True)
out.write_text("\n".join(blocks), encoding="utf-8")
print("wrote", out)
