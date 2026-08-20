# -*- coding: utf-8 -*-
import whisper
from pathlib import Path

model = whisper.load_model("small")
folder = Path(__file__).resolve().parent
out = folder / "transcripts_forced.txt"
lines = []
for wav in sorted(folder.glob("*.wav")):
    print("transcribing", wav.name, flush=True)
    for lang, task in [("ne", "transcribe"), ("ne", "translate"), ("hi", "transcribe")]:
        result = model.transcribe(str(wav), language=lang, task=task, fp16=False)
        text = (result.get("text") or "").strip()
        block = f"=== {wav.name} lang={lang} task={task} ===\n{text}\n"
        print(block, flush=True)
        lines.append(block)
out.write_text("\n".join(lines), encoding="utf-8")
print("wrote", out)
