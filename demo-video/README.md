# LegalForge demo video

Voice-guided product demo for judges and live presentations (no mic required).

## Output

| File | Description |
|------|-------------|
| `out/LegalForge_Demo_Guided.mp4` | Full demo: cinematic intro + narrated UI walkthrough + closing (1920×1080, H.264 + AAC) |
| `out/LegalForge_Intro.mp4` | Intro only (~35–45s) |

## Rebuild full guided demo

```powershell
cd d:\JacHACS

# Backend + frontend must be running:
#   jac serve service.jac  → http://localhost:8000
#   npm run dev            → http://localhost:3000

py -3.11 scripts\build_guided_demo.py
py -3.11 scripts\build_guided_demo.py --force        # re-record UI + re-voice everything
py -3.11 scripts\build_guided_demo.py --skip-record  # reuse UI capture, rebuild audio/mux only
```

Requires: `moviepy`, `edge-tts` (or Windows SAPI fallback), `pillow`, `imageio-ffmpeg`, `playwright` (+ `playwright install chromium`).

## Rebuild intro only

```powershell
py -3.11 scripts\build_intro_only.py
```

## Narration script

Timed segments and copy live in `narration/full_demo_script.json`. Edit text there, then run `build_guided_demo.py --force` to regenerate TTS and video.

Scene PNGs: `assets/scene*.png`. Per-segment TTS: `audio/segments/`. UI recording: `raw/ui_guided.webm` + `raw/ui_markers.json`.

## Presenting live

1. **Option A — video carries the story:** Share screen with only `LegalForge_Demo_Guided.mp4` playing (you stay muted).
2. **Option B — app + video:** Screen-share the live app at http://localhost:3000, play the guided MP4 on a second display or muted tab for judges watching remotely.

Intro-only stitch: place `out/LegalForge_Intro.mp4` before your own OBS capture in any editor.
