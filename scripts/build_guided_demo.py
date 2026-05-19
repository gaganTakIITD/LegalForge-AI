"""
Build full voice-guided LegalForge demo video (intro + narrated UI walkthrough + closing).
Output: demo-video/out/LegalForge_Demo_Guided.mp4

Rebuild:
  cd d:\\JacHACS
  py -3.11 scripts\\build_guided_demo.py
  py -3.11 scripts\\build_guided_demo.py --force   # re-voice and re-record
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from build_demo_video import (  # noqa: E402
    ASSETS,
    AUDIO_DIR,
    NARRATOR_VOICE,
    OUT_DIR,
    RAW_DIR,
    TITLE_CARD_SEC,
    UI_URL,
    _ffmpeg_bin,
    build_intro_video,
    convert_webm_to_mp4,
    ken_burns_clip,
    make_title_card,
    synthesize,
)

SCRIPT_PATH = OUT_DIR / "narration" / "full_demo_script.json"
MARKERS_PATH = RAW_DIR / "ui_markers.json"
UI_WEBM = RAW_DIR / "ui_guided.webm"
UI_MP4 = RAW_DIR / "ui_guided.mp4"
INTRO_AUDIO = AUDIO_DIR / "guided_intro.mp3"
INTRO_MP4 = OUT_DIR / "guided_intro.mp4"
SEGMENTS_DIR = AUDIO_DIR / "segments"
FINAL = OUT_DIR / "out" / "LegalForge_Demo_Guided.mp4"
TITLE_PNG = OUT_DIR / "title_card.png"
CLOSING_MP4 = OUT_DIR / "guided_closing.mp4"
CLOSING_AUDIO = AUDIO_DIR / "guided_closing.mp3"
ANALYZE_FIXTURE = OUT_DIR / "fixtures" / "nda_analyze_response.json"

WALKER_NAMES = [
    ("parser", "Parser"),
    ("contradiction", "Contradictions"),
    ("compliance", "Compliance"),
    ("risk", "Risk Scorer"),
    ("negotiation", "Negotiation"),
    ("report", "Report"),
]


def load_script() -> dict:
    with SCRIPT_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def clear_cached(force: bool) -> None:
    if not force:
        return
    for pattern in (
        INTRO_AUDIO,
        INTRO_MP4,
        UI_WEBM,
        UI_MP4,
        MARKERS_PATH,
        CLOSING_AUDIO,
        CLOSING_MP4,
        FINAL,
    ):
        if pattern.exists():
            pattern.unlink()
            print(f"Removed {pattern.relative_to(ROOT)}")
    if SEGMENTS_DIR.exists():
        for p in SEGMENTS_DIR.glob("*.mp3"):
            p.unlink()
            print(f"Removed {p.relative_to(ROOT)}")


def record_ui_with_markers(out_webm: Path, markers_path: Path) -> None:
    from playwright.sync_api import sync_playwright

    out_webm.parent.mkdir(parents=True, exist_ok=True)
    if out_webm.exists():
        out_webm.unlink()

    markers: list[dict] = []
    t0 = time.time()

    def mark(name: str) -> None:
        markers.append({"marker": name, "t": round(time.time() - t0, 3)})

    fixture_body = None
    if ANALYZE_FIXTURE.exists():
        fixture_body = ANALYZE_FIXTURE.read_text(encoding="utf-8")
        print("  Using analyze fixture for reliable UI capture (live API optional)")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=str(RAW_DIR),
            record_video_size={"width": 1920, "height": 1080},
            color_scheme="dark",
        )
        page = context.new_page()

        if fixture_body:

            def _fulfill_analyze(route) -> None:
                # Do not block here — sync Playwright deadlocks if the handler sleeps.
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=fixture_body,
                )

            page.route(re.compile(r".*/walker/analyze"), _fulfill_analyze)

        page.goto(UI_URL, wait_until="networkidle", timeout=90_000)
        page.wait_for_timeout(1500)
        mark("landing")
        page.wait_for_timeout(4500)

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
            demo_btn = page.locator("button.btn-primary").filter(
                has_text=re.compile("demo", re.I)
            ).first
        demo_btn.click(timeout=30_000)
        mark("demo_start")
        page.wait_for_timeout(2000)

        try:
            page.locator(".coach-close").click(timeout=3000)
        except Exception:
            pass

        page.wait_for_selector("textarea", timeout=60_000)
        page.wait_for_timeout(2500)
        mark("intake")
        page.wait_for_timeout(3500)

        launch = page.get_by_role("button", name=re.compile(r"Dispatch walker swarm", re.I))
        launch.wait_for(state="visible", timeout=30_000)
        launch.click()
        mark("swarm_start")
        page.wait_for_selector(".swarm-stage", timeout=20_000)
        # UI staggers six walkers ~0.65–1.2s each; hold so narration can track them.
        page.wait_for_timeout(5500)

        for key, label in WALKER_NAMES:
            try:
                page.locator(".feed-row.done").filter(has_text=label).first.wait_for(
                    timeout=180_000
                )
                mark(f"walker_{key}")
                page.wait_for_timeout(800)
            except Exception:
                print(f"  Warning: walker {key} marker timeout; continuing")
                mark(f"walker_{key}")

        page.wait_for_selector(".command-center", timeout=240_000)
        mark("verdict_ready")
        page.wait_for_timeout(3500)

        issue = page.locator(".issue-chip").first
        if issue.count():
            issue.click()
            page.wait_for_timeout(500)
        mark("issue_spotlight")
        page.wait_for_timeout(3000)

        graph = page.locator(".graph-panel").first
        if graph.count():
            graph.scroll_into_view_if_needed()
        page.wait_for_timeout(1500)
        mark("graph_view")
        page.wait_for_timeout(3000)

        jac = page.locator(".jac-code-peek, .jac-peek-wrap").first
        if jac.count():
            jac.scroll_into_view_if_needed()
        else:
            page.evaluate("window.scrollTo(0, document.body.scrollHeight * 0.85)")
        page.wait_for_timeout(1500)
        mark("jac_angle")
        page.wait_for_timeout(3500)

        mark("end")
        page.wait_for_timeout(1000)
        page.close()
        context.close()
        browser.close()

    webms = sorted(RAW_DIR.glob("*.webm"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not webms:
        raise RuntimeError("Playwright did not produce a webm recording")
    newest = webms[0]
    if newest != out_webm:
        if out_webm.exists():
            out_webm.unlink()
        newest.replace(out_webm)

    markers_path.parent.mkdir(parents=True, exist_ok=True)
    markers_path.write_text(json.dumps(markers, indent=2), encoding="utf-8")
    print(f"  Markers: {len(markers)} events, last t={markers[-1]['t']:.1f}s")


async def synthesize_segments(script: dict, force: bool) -> str:
    SEGMENTS_DIR.mkdir(parents=True, exist_ok=True)
    voice = script.get("voice", NARRATOR_VOICE)
    voice_used = voice

    intro_path = INTRO_AUDIO
    if force or not intro_path.exists() or intro_path.stat().st_size < 1000:
        voice_used = await synthesize(script["intro"]["text"], intro_path, force=force)

    closing_path = CLOSING_AUDIO
    if force or not closing_path.exists() or closing_path.stat().st_size < 1000:
        v = await synthesize(script["closing"]["text"], closing_path, force=force)
        voice_used = v

    for seg in script["walkthrough"]:
        label = seg["label"]
        path = SEGMENTS_DIR / f"{label}.mp3"
        if force or not path.exists() or path.stat().st_size < 500:
            v = await synthesize(seg["text"], path, force=force)
            voice_used = v
    return voice_used


def build_closing_video(audio_path: Path, out_path: Path) -> None:
    from moviepy import AudioFileClip, ImageClip

    make_title_card(TITLE_PNG)
    audio = AudioFileClip(str(audio_path))
    dur = max(audio.duration + 0.5, 8.0)
    clip = ImageClip(str(TITLE_PNG)).with_duration(dur)
    clip = clip.with_audio(audio)
    clip.write_videofile(
        str(out_path),
        fps=24,
        codec="libx264",
        audio_codec="aac",
        preset="medium",
        threads=4,
        logger=None,
    )
    clip.close()
    audio.close()


def marker_time(markers: list[dict], name: str) -> float | None:
    for m in markers:
        if m["marker"] == name:
            return float(m["t"])
    return None


def build_narrated_ui(ui_mp4: Path, markers_path: Path, script: dict, out_path: Path) -> float:
    from moviepy import AudioFileClip, VideoFileClip, concatenate_videoclips

    markers = json.loads(markers_path.read_text(encoding="utf-8"))
    raw = VideoFileClip(str(ui_mp4))
    marker_order = [s["marker"] for s in script["walkthrough"]]
    times = []
    for name in marker_order:
        t = marker_time(markers, name)
        if t is None:
            raise RuntimeError(f"Missing marker in recording: {name}")
        times.append(t)
    end_t = marker_time(markers, "end") or raw.duration
    times.append(end_t)

    parts = []
    for i, seg in enumerate(script["walkthrough"]):
        t0, t1 = times[i], times[i + 1]
        v = raw.subclipped(t0, min(t1, raw.duration))
        a_path = SEGMENTS_DIR / f"{seg['label']}.mp3"
        audio = AudioFileClip(str(a_path))
        pad = 0.35
        need = audio.duration + pad
        if v.duration < need:
            v = v.with_duration(need)
        elif v.duration > need + 1.5:
            v = v.subclipped(0, need)
        v = v.with_audio(audio)
        parts.append(v)
        audio.close()

    walk = concatenate_videoclips(parts, method="compose")
    walk.write_videofile(
        str(out_path),
        fps=24,
        codec="libx264",
        audio_codec="aac",
        preset="medium",
        threads=4,
        logger=None,
    )
    dur = walk.duration
    walk.close()
    raw.close()
    return dur


def concat_all(parts: list[Path], out_path: Path) -> None:
    from moviepy import VideoFileClip, concatenate_videoclips

    clips = [VideoFileClip(str(p)) for p in parts]
    final = concatenate_videoclips(clips, method="compose")
    final.write_videofile(
        str(out_path),
        fps=24,
        codec="libx264",
        audio_codec="aac",
        preset="medium",
        threads=4,
        logger=None,
    )
    dur = final.duration
    for c in clips:
        c.close()
    final.close()
    return dur


def probe_duration(path: Path) -> float:
    from moviepy import VideoFileClip

    v = VideoFileClip(str(path))
    d = v.duration
    v.close()
    return d


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Re-record UI and re-synthesize all audio")
    parser.add_argument("--skip-record", action="store_true", help="Reuse UI capture and markers")
    args = parser.parse_args()

    for d in (AUDIO_DIR, RAW_DIR, FINAL.parent, SEGMENTS_DIR):
        d.mkdir(parents=True, exist_ok=True)

    if not SCRIPT_PATH.exists():
        print(f"Missing script: {SCRIPT_PATH}")
        return 1

    missing_assets = [
        s["asset"]
        for s in load_script()["intro"]["scenes"]
        if s["asset"] != "title_card" and not (ASSETS / s["asset"]).exists()
    ]
    if missing_assets:
        print("Missing intro assets:", ", ".join(missing_assets))
        return 1

    script = load_script()
    clear_cached(args.force)

    if not TITLE_PNG.exists():
        make_title_card(TITLE_PNG)

    print("1/5 Synthesizing narration segments…")
    voice_used = asyncio.run(synthesize_segments(script, force=args.force))

    if not INTRO_MP4.exists() or INTRO_MP4.stat().st_size < 10_000 or args.force:
        print("2/5 Rendering cinematic intro…")
        build_intro_video(INTRO_AUDIO, TITLE_PNG, INTRO_MP4)
    else:
        print("2/5 Intro video (cached)")

    ui_narrated = OUT_DIR / "ui_guided_narrated.mp4"
    need_record = (
        args.force
        or not args.skip_record
        and (
            not UI_WEBM.exists()
            or UI_WEBM.stat().st_size < 10_000
            or not MARKERS_PATH.exists()
        )
    )

    if need_record:
        print("3/5 Recording UI walkthrough (Playwright)…")
        record_ui_with_markers(UI_WEBM, MARKERS_PATH)
    else:
        print("3/5 UI capture (cached)")

    if not UI_MP4.exists() or UI_MP4.stat().st_size < 10_000 or args.force:
        print("   Converting webm → mp4…")
        convert_webm_to_mp4(UI_WEBM, UI_MP4)

    if not ui_narrated.exists() or ui_narrated.stat().st_size < 10_000 or args.force:
        print("4/5 Syncing narration to UI segments…")
        build_narrated_ui(UI_MP4, MARKERS_PATH, script, ui_narrated)
    else:
        print("4/5 Narrated UI (cached)")

    if not CLOSING_MP4.exists() or CLOSING_MP4.stat().st_size < 10_000 or args.force:
        print("5/5 Closing card…")
        build_closing_video(CLOSING_AUDIO, CLOSING_MP4)
    else:
        print("5/5 Closing (cached)")

    if not FINAL.exists() or FINAL.stat().st_size < 50_000 or args.force:
        print("Final concat…")
        concat_all([INTRO_MP4, ui_narrated, CLOSING_MP4], FINAL)

    size_mb = FINAL.stat().st_size / (1024 * 1024)
    duration = probe_duration(FINAL)
    print()
    print(f"Done: {FINAL}")
    print(f"  Voice: {voice_used}")
    print(f"  Duration: {duration:.1f}s ({duration / 60:.1f} min)")
    print(f"  Size: {size_mb:.2f} MB")
    print()
    print("Use: play this file while screen-sharing the live app (mute mic), or send to judges.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
