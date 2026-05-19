"""
Build LegalForge cinematic intro only (no Playwright / UI capture).
Output: demo-video/out/LegalForge_Intro.mp4
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from build_demo_video import (  # noqa: E402
    ASSETS,
    AUDIO_DIR,
    INTRO_NARRATION,
    INTRO_SCENES,
    NARRATOR_VOICE,
    OUT_DIR,
    build_intro_video,
    make_title_card,
    synthesize,
)

FINAL = OUT_DIR / "out" / "LegalForge_Intro.mp4"
TITLE_PNG = OUT_DIR / "title_card.png"
INTRO_AUDIO = AUDIO_DIR / "intro.mp3"
INTRO_MP4 = OUT_DIR / "intro.mp4"  # intermediate; cleared on each run


def main() -> int:
    for d in (AUDIO_DIR, FINAL.parent):
        d.mkdir(parents=True, exist_ok=True)

    missing = [name for name, _ in INTRO_SCENES if not (ASSETS / name).exists()]
    if missing:
        print("Missing scene assets:", ", ".join(missing))
        print(f"Place PNGs in {ASSETS}")
        return 1

    if not TITLE_PNG.exists():
        print("Title card…")
        make_title_card(TITLE_PNG)
    else:
        print("Title card (cached)")

    for cached in (INTRO_AUDIO, INTRO_MP4, FINAL):
        if cached.exists():
            cached.unlink()
            print(f"Removed cached {cached.name}")

    print(f"Narration (voice: {NARRATOR_VOICE})…")
    voice_used = asyncio.run(synthesize(INTRO_NARRATION, INTRO_AUDIO, force=True))

    print("Rendering intro montage…")
    duration = build_intro_video(INTRO_AUDIO, TITLE_PNG, FINAL)

    size_mb = FINAL.stat().st_size / (1024 * 1024)
    print(f"Done: {FINAL}")
    print(f"  Voice: {voice_used}")
    print(f"  Duration (narration): {duration:.1f}s")
    print(f"  Size: {size_mb:.2f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
