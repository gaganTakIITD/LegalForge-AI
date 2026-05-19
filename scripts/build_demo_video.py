"""
Build LegalForge demo video: AI-style intro slides + Playwright UI capture + TTS narration.
Output: demo-video/out/LegalForge_Demo.mp4
"""
from __future__ import annotations

import asyncio
import re
import subprocess
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "demo-video"
ASSETS = OUT_DIR / "assets"
AUDIO_DIR = OUT_DIR / "audio"
RAW_DIR = OUT_DIR / "raw"
FINAL = OUT_DIR / "out" / "LegalForge_Demo.mp4"

INTRO_SCENES = [
    ("scene1-lawyer-desk.png", 9.0),
    ("scene2-graph-birth.png", 9.0),
    ("scene3-swarm-orbs.png", 9.0),
    ("scene4-verdict-stamp.png", 8.0),
]

INTRO_NARRATION = """
It's eleven PM. Your term sheet is due tomorrow. Forty pages deep—and buried inside,
Section 5 caps liability at ten thousand dollars, while Section 6 says indemnification has no limit.
A human skims. A chatbot guesses. Nobody connects the dots.

LegalForge doesn't read contracts like a document. It forges a graph—every clause a node—
and sends six Jac walkers to hunt contradictions, compliance traps, and deal-killing risk.
In minutes. Every finding attributed. A verdict before you sign.
""".strip()

DEMO_NARRATION = """
Here's the live product. One click loads a mutual NDA with a deliberate liability trap.
Dispatch the walker swarm: parser, contradictions, compliance, risk, negotiation, and report—
each walker with one job, traversing the clause graph on Jac Cloud.

The contradiction walker surfaces the smoking gun: capped liability versus uncapped indemnification.
Negotiation proposes safer language. The forge stamps your verdict—with an audit trail on every finding.
LegalForge AI. Built for JacHacks Spring twenty twenty-six.
""".strip()

TITLE_CARD_SEC = 3.5
UI_URL = "http://localhost:3000"

# edge-tts neural voice for narration (change here to swap narrator)
NARRATOR_VOICE = "en-US-JennyNeural"
EDGE_TTS_TIMEOUT_SEC = 120


async def synthesize_edge(text: str, path: Path, voice: str | None = None) -> None:
    import edge_tts

    voice = voice or NARRATOR_VOICE
    comm = edge_tts.Communicate(text, voice)
    await asyncio.wait_for(comm.save(str(path)), timeout=EDGE_TTS_TIMEOUT_SEC)


def synthesize_windows(text: str, path: Path) -> str:
    """Offline narration via Windows SAPI (no network). Returns voice name used."""
    wav = path.with_suffix(".wav")
    path.parent.mkdir(parents=True, exist_ok=True)
    safe = text.replace("'", "''")
    wav_win = str(wav.resolve()).replace("'", "''")
    ps = f"""
Add-Type -AssemblyName System.Speech
$tmp = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = $tmp.GetInstalledVoices() | ForEach-Object {{ $_.VoiceInfo }}
$tmp.Dispose()
$pick = $null
foreach ($pattern in @('Neural', 'Jenny', 'Guy', 'Sonia', 'Zira', 'David')) {{
  $pick = $voices | Where-Object {{ $_.Name -match $pattern -or $_.Description -match $pattern }} | Select-Object -First 1
  if ($pick) {{ break }}
}}
if (-not $pick) {{
  $pick = $voices | Where-Object {{ $_.Culture.Name -like 'en*' }} | Select-Object -First 1
}}
if (-not $pick) {{ $pick = $voices | Select-Object -First 1 }}
$voiceName = if ($pick) {{ $pick.Name }} else {{ 'default' }}
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
if ($pick) {{ $s.SelectVoice($pick.Name) }}
$s.Rate = 0
$s.SetOutputToWaveFile('{wav_win}')
$s.Speak(@'
{safe}
'@)
$s.Dispose()
Write-Output $voiceName
"""
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", ps],
        check=True,
        capture_output=True,
        text=True,
    )
    voice_used = (result.stdout or "").strip() or "Windows-SAPI-default"
    if path.suffix.lower() == ".wav":
        return voice_used
    ffmpeg = _ffmpeg_bin()
    subprocess.run(
        [ffmpeg, "-y", "-i", str(wav), "-q:a", "4", str(path)],
        check=True,
        capture_output=True,
    )
    wav.unlink(missing_ok=True)
    return voice_used


async def synthesize(text: str, path: Path, *, force: bool = False) -> str:
    """Synthesize narration; returns voice id/name used."""
    if path.exists() and path.stat().st_size > 1000 and not force:
        return NARRATOR_VOICE
    path.parent.mkdir(parents=True, exist_ok=True)
    last_exc: Exception | None = None
    for attempt in range(2):
        try:
            await synthesize_edge(text, path)
            return NARRATOR_VOICE
        except Exception as exc:
            last_exc = exc
            if attempt == 0:
                print(f"  edge-tts attempt {attempt + 1} failed ({exc}); retrying…")
            else:
                print(f"  edge-tts failed ({exc}); using Windows speech…")
    if last_exc:
        print(f"  ({last_exc})")
    return synthesize_windows(text, path)


def make_title_card(path: Path) -> None:
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGB", (1920, 1080), (8, 12, 22))
    draw = ImageDraw.Draw(img)
    try:
        title_font = ImageFont.truetype("arial.ttf", 92)
        sub_font = ImageFont.truetype("arial.ttf", 40)
        tag_font = ImageFont.truetype("arial.ttf", 30)
    except OSError:
        title_font = ImageFont.load_default()
        sub_font = title_font
        tag_font = title_font

    draw.text((960, 420), "LegalForge AI", fill=(230, 236, 255), anchor="mm", font=title_font)
    draw.text(
        (960, 540),
        "Six Jac walkers · graph-native contract intelligence",
        fill=(148, 163, 184),
        anchor="mm",
        font=sub_font,
    )
    draw.text(
        (960, 640),
        "JacHacks Spring 2026 · Agentic AI",
        fill=(96, 165, 250),
        anchor="mm",
        font=tag_font,
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)


def cover_clip(clip, size=(1920, 1080)):
    tw, th = size
    w, h = clip.size
    scale = max(tw / w, th / h)
    nw, nh = int(w * scale), int(h * scale)
    clip = clip.resized(new_size=(nw, nh))
    x1 = max(0, (nw - tw) // 2)
    y1 = max(0, (nh - th) // 2)
    return clip.cropped(x1=x1, y1=y1, width=tw, height=th)


def ken_burns_clip(image_path: Path, duration: float, size=(1920, 1080), zoom_end=1.12):
    """Slow zoom + drift on a still; cover-crops to 1920x1080."""
    from moviepy import CompositeVideoClip, ImageClip

    tw, th = size
    base = ImageClip(str(image_path)).with_duration(duration)
    w, h = base.size
    cover = max(tw / w, th / h)

    def scale_at(t):
        z = 1.0 + (zoom_end - 1.0) * (t / max(duration, 0.01))
        return cover * z

    scaled = base.resized(scale_at)

    def position_at(t):
        progress = t / max(duration, 0.01)
        return ("center", int(th * 0.015 * progress))

    return CompositeVideoClip(
        [scaled.with_position(position_at)],
        size=size,
    ).with_duration(duration)


def build_intro_video(intro_audio: Path, title_png: Path, out_path: Path) -> float:
    from moviepy import AudioFileClip, ImageClip, concatenate_videoclips

    slides = []
    for name, dur in INTRO_SCENES:
        p = ASSETS / name
        if not p.exists():
            raise FileNotFoundError(p)
        slides.append(ken_burns_clip(p, dur))

    title = ken_burns_clip(title_png, TITLE_CARD_SEC, zoom_end=1.04)
    slides.append(title)

    intro = concatenate_videoclips(slides, method="compose")
    audio = AudioFileClip(str(intro_audio))
    if audio.duration > intro.duration:
        audio = audio.subclipped(0, intro.duration)
    elif audio.duration < intro.duration:
        intro = intro.subclipped(0, audio.duration)
    intro = intro.with_audio(audio)
    intro.write_videofile(
        str(out_path),
        fps=24,
        codec="libx264",
        audio_codec="aac",
        preset="medium",
        threads=4,
        logger=None,
    )
    intro.close()
    audio.close()
    return audio.duration if hasattr(audio, "duration") else TITLE_CARD_SEC


def record_ui_capture(out_webm: Path) -> None:
    from playwright.sync_api import sync_playwright

    out_webm.parent.mkdir(parents=True, exist_ok=True)
    if out_webm.exists():
        out_webm.unlink()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=str(RAW_DIR),
            record_video_size={"width": 1920, "height": 1080},
            color_scheme="dark",
        )
        page = context.new_page()
        page.goto(UI_URL, wait_until="domcontentloaded", timeout=60_000)
        page.wait_for_timeout(1200)

        demo_btn = None
        for pat in (
            r"Start judge demo",
            r"Run a live NDA demo",
            r"Judge demo",
        ):
            loc = page.get_by_role("button", name=re.compile(pat, re.I))
            if loc.count() > 0:
                demo_btn = loc.first
                break
        if demo_btn is None:
            demo_btn = page.locator("button.btn-primary").filter(has_text=re.compile("demo", re.I)).first
        demo_btn.click(timeout=30_000)
        page.wait_for_timeout(2500)

        try:
            page.locator(".coach-close").click(timeout=2500)
        except Exception:
            pass

        page.wait_for_selector("textarea", timeout=30_000)
        page.wait_for_timeout(2000)

        launch = page.get_by_role("button", name=re.compile(r"Dispatch walker swarm", re.I))
        launch.wait_for(state="visible", timeout=30_000)
        launch.click()

        page.wait_for_selector(".swarm-stage", timeout=20_000)
        page.wait_for_selector(".command-center", timeout=240_000)
        page.wait_for_timeout(6000)

        issue = page.locator(".issue-chip").first
        if issue.count():
            issue.click()
            page.wait_for_timeout(2500)

        page.locator(".verdict-card, .verdict-stamp").first.wait_for(timeout=10_000)
        page.wait_for_timeout(3500)

        page.close()
        context.close()
        browser.close()

    webms = sorted(RAW_DIR.glob("*.webm"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not webms:
        raise RuntimeError("Playwright did not produce a webm recording")
    newest = webms[0]
    if newest != out_webm:
        newest.replace(out_webm)


def convert_webm_to_mp4(webm: Path, mp4: Path) -> None:
    ffmpeg = _ffmpeg_bin()
    cmd = [
        ffmpeg,
        "-y",
        "-i",
        str(webm),
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-an",
        str(mp4),
    ]
    subprocess.run(cmd, check=True, capture_output=True)


def _ffmpeg_bin() -> str:
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def mux_demo_with_voice(ui_mp4: Path, demo_audio: Path, out_path: Path) -> None:
    from moviepy import AudioFileClip, VideoFileClip, concatenate_audioclips

    video = VideoFileClip(str(ui_mp4))
    voice = AudioFileClip(str(demo_audio))
    if voice.duration > video.duration:
        voice = voice.subclipped(0, video.duration)
    final = video.with_audio(voice)
    final.write_videofile(
        str(out_path),
        fps=24,
        codec="libx264",
        audio_codec="aac",
        preset="medium",
        threads=4,
        logger=None,
    )
    final.close()
    video.close()
    voice.close()


def concat_parts(intro_mp4: Path, demo_mp4: Path, out_path: Path) -> None:
    from moviepy import VideoFileClip, concatenate_videoclips

    a = VideoFileClip(str(intro_mp4))
    b = VideoFileClip(str(demo_mp4))
    final = concatenate_videoclips([a, b], method="compose")
    final.write_videofile(
        str(out_path),
        fps=24,
        codec="libx264",
        audio_codec="aac",
        preset="medium",
        threads=4,
        logger=None,
    )
    final.close()
    a.close()
    b.close()


def main() -> int:
    for d in (AUDIO_DIR, RAW_DIR, FINAL.parent):
        d.mkdir(parents=True, exist_ok=True)

    title_png = OUT_DIR / "title_card.png"
    intro_audio = AUDIO_DIR / "intro.mp3"
    demo_audio = AUDIO_DIR / "demo.mp3"
    intro_mp4 = OUT_DIR / "intro.mp4"
    ui_webm = OUT_DIR / "ui_capture.webm"
    ui_mp4 = OUT_DIR / "ui_capture.mp4"
    demo_mp4 = OUT_DIR / "demo_with_voice.mp4"

    if not title_png.exists():
        print("1/6 Title card…")
        make_title_card(title_png)
    else:
        print("1/6 Title card (cached)")

    print("2/6 Narration…")
    asyncio.run(synthesize(INTRO_NARRATION, intro_audio))
    asyncio.run(synthesize(DEMO_NARRATION, demo_audio))

    if not intro_mp4.exists() or intro_mp4.stat().st_size < 10_000:
        print("3/6 Intro montage…")
        build_intro_video(intro_audio, title_png, intro_mp4)
    else:
        print("3/6 Intro montage (cached)")

    if not ui_webm.exists() or ui_webm.stat().st_size < 10_000:
        print("4/6 Recording live UI (Playwright)…")
        record_ui_capture(ui_webm)
    else:
        print("4/6 UI capture (cached)")

    if not ui_mp4.exists() or ui_mp4.stat().st_size < 10_000:
        print("5/6 Converting UI capture…")
        convert_webm_to_mp4(ui_webm, ui_mp4)
    else:
        print("5/6 UI mp4 (cached)")

    if not demo_mp4.exists() or demo_mp4.stat().st_size < 10_000:
        print("6/6 Mux voice + concat…")
        mux_demo_with_voice(ui_mp4, demo_audio, demo_mp4)
    else:
        print("6/6 Demo mux (cached)")

    if not FINAL.exists() or FINAL.stat().st_size < intro_mp4.stat().st_size:
        print("Final concat…")
        concat_parts(intro_mp4, demo_mp4, FINAL)
    else:
        print("Final video (cached)")

    size_mb = FINAL.stat().st_size / (1024 * 1024)
    print(textwrap.fill(f"Done: {FINAL} ({size_mb:.1f} MB)", width=88))
    return 0


if __name__ == "__main__":
    sys.exit(main())
