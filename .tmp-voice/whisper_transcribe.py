# -*- coding: utf-8 -*-
import whisper
from pathlib import Path

model = whisper.load_model("small")
folder = Path(__file__).resolve().parent
out = folder / "transcripts.txt"
lines = []
for wav in sorted(folder.glob("*.wav")):
    print("transcribing", wav.name, flush=True)
    result = model.transcribe(str(wav), task="transcribe")
    text = (result.get("text") or "").strip()
    lang = result.get("language")
    block = f"=== {wav.name} (lang={lang}) ===\n{text}\n"
    print(block, flush=True)
    lines.append(block)
out.write_text("\n".join(lines), encoding="utf-8")
print("wrote", out)
