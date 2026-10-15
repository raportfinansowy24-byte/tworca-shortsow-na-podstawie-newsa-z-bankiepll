#!/usr/bin/env python3
"""Render an 18-second, vertical Bankier short from approved scene copy using FFmpeg only.

No stock-footage API, hosted video-generation API, or cloud TTS is used.
Narration is optional and must be supplied as a local audio file.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
import textwrap
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

WIDTH = 1080
HEIGHT = 1920
FPS = 30
SCENE_SECONDS = 4.5
SCENE_COUNT = 4
DURATION_SECONDS = SCENE_SECONDS * SCENE_COUNT
ROLES = ("HOOK", "FAKT", "KONTEKST", "CTA")
BACKGROUND_COLORS = ("0x101827", "0x111D2B", "0x111A2A", "0x101827")
ACCENT_COLORS = ("0x35D0BA", "0x66A7FF", "0xF4C46A", "0x35D0BA")


class RenderError(Exception):
    """Expected validation or rendering error shown to the CLI user."""


def wrap_screen_text(text: str, width: int = 23, max_lines: int = 4) -> str:
    cleaned = re.sub(r"\s+", " ", str(text)).strip()
    if not cleaned:
        raise RenderError("Tekst sceny nie może być pusty.")
    lines = textwrap.wrap(cleaned, width=width, break_long_words=True, break_on_hyphens=False)
    if len(lines) > max_lines:
        raise RenderError(
            f"Tekst sceny ma {len(lines)} linii po zawinięciu; limit to {max_lines}. "
            "Skróć copy, by pozostało czytelne na telefonie."
        )
    return "\n".join(lines)


def validate_manifest(data: object) -> dict:
    if not isinstance(data, dict):
        raise RenderError("Manifest musi być obiektem JSON.")
    article = data.get("article")
    scenes = data.get("scenes")
    if not isinstance(article, dict):
        raise RenderError("Brak obiektu article w manifeście.")
    if article.get("fact_check_status") != "verified":
        raise RenderError("Render produkcyjny wymaga article.fact_check_status = 'verified'.")
    for key in ("title", "published", "verified_at", "source_url"):
        if not isinstance(article.get(key), str) or not article[key].strip():
            raise RenderError(f"Brak wymaganego pola article.{key}.")
    parsed = urlparse(article["source_url"].strip())
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or not (host == "bankier.pl" or host.endswith(".bankier.pl")):
        raise RenderError("article.source_url musi być adresem HTTPS w domenie bankier.pl.")
    if not isinstance(scenes, list) or len(scenes) != SCENE_COUNT:
        raise RenderError("Wymagane są dokładnie 4 sceny: HOOK, FAKT, KONTEKST, CTA.")
    normalized = []
    for index, (scene, expected_role) in enumerate(zip(scenes, ROLES), start=1):
        if not isinstance(scene, dict):
            raise RenderError(f"Scena {index} musi być obiektem JSON.")
        role = str(scene.get("role", "")).strip().upper()
        if role != expected_role:
            raise RenderError(f"Scena {index} musi mieć role={expected_role}.")
        text = scene.get("text")
        if not isinstance(text, str) or len(text.strip()) < 3 or len(text.strip()) > 115:
            raise RenderError(f"Tekst sceny {index} musi mieć 3–115 znaków.")
        normalized.append({"role": role, "text": text.strip()})
    return {"article": article, "scenes": normalized, "voice_audio": data.get("voice_audio")}


def run_checked(command: list[str], timeout: int = 300) -> str:
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=timeout, check=True)
    except FileNotFoundError as exc:
        raise RenderError(f"Brak narzędzia {command[0]} w PATH.") from exc
    except subprocess.TimeoutExpired as exc:
        raise RenderError(f"Przekroczono limit czasu ({timeout}s) dla {command[0]}.") from exc
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or exc.stdout or str(exc)).strip()
        raise RenderError(f"Polecenie {command[0]} nie powiodło się: {detail[-1800:]}") from exc
    return result.stdout


def filter_path(path: Path) -> str:
    return str(path.resolve()).replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")


def write_text_file(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def escape_concat_path(path: Path) -> str:
    # FFmpeg concat demuxer uses shell-like single-quoted path escaping.
    value = str(path.resolve())
    return value.replace("\\", "\\\\").replace("'", "'\\''")


def build_demo_manifest() -> dict:
    return {
        "article": {
            "title": "Próbny render plansz finansowych",
            "source_url": "",
            "published": "",
            "verified_at": "",
            "fact_check_status": "demo",
        },
        "scenes": [
            {"role": "HOOK", "text": "To jest demonstracja renderera"},
            {"role": "FAKT", "text": "Nie przedstawia aktualnego newsa ani danych"},
            {"role": "KONTEKST", "text": "Grafiki są generowane lokalnie przez FFmpeg"},
            {"role": "CTA", "text": "PRÓBA TECHNICZNA — NIE PUBLIKOWAĆ"},
        ],
        "voice_audio": None,
    }


def validate_production_manifest(data: object) -> dict:
    return validate_manifest(data)


def render(manifest: dict, output: Path, voice_audio: Path | None = None, demo: bool = False, overwrite: bool = False) -> dict:
    ffmpeg = shutil.which("ffmpeg")
    ffprobe = shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        raise RenderError("Wymagane są ffmpeg i ffprobe w PATH.")
    output = output.expanduser().resolve()
    if output.suffix.lower() != ".mp4":
        raise RenderError("Plik wynikowy musi mieć rozszerzenie .mp4.")
    output.parent.mkdir(parents=True, exist_ok=True)
    sidecar = output.with_name(output.stem + ".manifest.json")
    if not overwrite and (output.exists() or sidecar.exists()):
        raise RenderError(f"Wynik już istnieje: {output} lub {sidecar}. Użyj --overwrite, jeśli chcesz nadpisać.")

    if demo:
        normalized = build_demo_manifest()
    else:
        normalized = validate_production_manifest(manifest)

    audio_value = voice_audio or (Path(normalized["voice_audio"]).expanduser() if normalized.get("voice_audio") else None)
    if audio_value is not None:
        audio_value = audio_value.resolve()
        if not audio_value.is_file():
            raise RenderError(f"Nie znaleziono lokalnego pliku audio: {audio_value}")

    font_candidates = [
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        Path("/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"),
        Path("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"),
    ]
    font = next((item for item in font_candidates if item.is_file()), None)
    if font is None:
        raise RenderError("Nie znaleziono obsługującego polskie znaki fontu TTF (DejaVu Sans/Liberation Sans).")

    with tempfile.TemporaryDirectory(prefix="offline-short-", dir=str(output.parent)) as temp_name:
        temp = Path(temp_name)
        scene_paths = []
        for i, scene in enumerate(normalized["scenes"]):
            role = "DEMO" if demo else scene["role"]
            body = wrap_screen_text(scene["text"])
            body_file = temp / f"scene-{i+1}-body.txt"
            footer_file = temp / f"scene-{i+1}-footer.txt"
            write_text_file(body_file, body)
            if demo:
                footer = "PRÓBA • NIE PUBLIKOWAĆ"
            else:
                article = normalized["article"]
                footer = f"Bankier.pl • {article['published']}"
            write_text_file(footer_file, footer)
            role_file = temp / f"scene-{i+1}-role.txt"
            write_text_file(role_file, f"{role}  •  {i+1}/{SCENE_COUNT}")

            # Deterministic abstract motion graphics: moving accent bars, no fabricated market chart/data.
            filters = [
                f"drawbox=x='mod(t*145+{i*170},1300)-180':y=460:w=500:h=10:color={ACCENT_COLORS[i]}@0.45:t=fill",
                f"drawbox=x=80:y=520:w=920:h=2:color={ACCENT_COLORS[i]}@0.18:t=fill",
                f"drawbox=x=80:y=1410:w=920:h=2:color={ACCENT_COLORS[i]}@0.18:t=fill",
                (
                    f"drawtext=fontfile='{filter_path(font)}':textfile='{filter_path(role_file)}':"
                    f"expansion=none:fontsize=36:fontcolor={ACCENT_COLORS[i]}:x=80:y=250"
                ),
                (
                    f"drawtext=fontfile='{filter_path(font)}':textfile='{filter_path(body_file)}':"
                    "expansion=none:fontsize=66:line_spacing=14:fontcolor=white:"
                    "box=1:boxcolor=0x0B1220@0.30:boxborderw=20:x=80:y=(h-text_h)/2:fix_bounds=1"
                ),
                (
                    f"drawtext=fontfile='{filter_path(font)}':textfile='{filter_path(footer_file)}':"
                    "expansion=none:fontsize=27:fontcolor=0xD7DFEA:x=80:y=1690"
                ),
                f"drawbox=x=80:y=1760:w='920*min(1,t/{SCENE_SECONDS})':h=8:color={ACCENT_COLORS[i]}@0.9:t=fill",
            ]
            video_filter = ",".join(filters)
            scene_path = temp / f"scene-{i+1}.mp4"
            command = [
                ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
                "-f", "lavfi", "-i", f"color=c={BACKGROUND_COLORS[i]}:s={WIDTH}x{HEIGHT}:r={FPS}:d={SCENE_SECONDS}",
                "-vf", video_filter,
                "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p",
                "-t", str(SCENE_SECONDS), "-movflags", "+faststart", str(scene_path),
            ]
            run_checked(command, timeout=300)
            scene_paths.append(scene_path)

        concat_file = temp / "concat.txt"
        concat_file.write_text("".join(f"file '{escape_concat_path(p)}'\n" for p in scene_paths), encoding="utf-8")
        command = [
            ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
            "-f", "concat", "-safe", "0", "-i", str(concat_file),
        ]
        if audio_value:
            command += ["-i", str(audio_value), "-map", "0:v:0", "-map", "1:a:0", "-af", f"apad,atrim=duration={DURATION_SECONDS},asetpts=PTS-STARTPTS"]
        else:
            command += ["-map", "0:v:0", "-an"]
        command += [
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p",
            "-t", str(DURATION_SECONDS),
        ]
        if audio_value:
            command += ["-c:a", "aac", "-b:a", "128k"]
        command += ["-movflags", "+faststart", str(output)]
        run_checked(command, timeout=600)

    probe_text = run_checked([
        ffprobe, "-v", "error", "-show_entries",
        "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate",
        "-of", "json", str(output),
    ], timeout=30)
    probe = json.loads(probe_text)
    streams = probe.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)
    duration = float(probe.get("format", {}).get("duration", 0))
    if not video or video.get("width") != WIDTH or video.get("height") != HEIGHT:
        raise RenderError("Walidacja ffprobe nie potwierdziła pionowego wideo 1080x1920.")
    if abs(duration - DURATION_SECONDS) > 0.12:
        raise RenderError(f"Walidacja ffprobe wykryła długość {duration:.3f}s zamiast 18s.")
    if audio_value and not audio_stream:
        raise RenderError("Podano audio, ale gotowy MP4 nie zawiera ścieżki audio.")
    if not audio_value and audio_stream:
        raise RenderError("MP4 zawiera nieoczekiwaną ścieżkę audio.")

    record = {
        "renderer": "local-ffmpeg-offline-short-v1",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "demo_only": bool(demo),
        "article": normalized["article"],
        "scenes": normalized["scenes"],
        "audio": {"present": bool(audio_stream), "source": str(audio_value) if audio_value else None},
        "output": str(output),
        "probe": {"duration_seconds": duration, "video": video, "audio": audio_stream},
        "disclaimer": "Render lokalny; brak automatycznej publikacji. Demo nie jest newsem i nie może być publikowane.",
    }
    sidecar.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return record


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Offline renderer shorta Bankier 9:16 / 18 s (lokalny FFmpeg, bez API).")
    parser.add_argument("--input", type=Path, help="JSON z artykułem zweryfikowanym redakcyjnie i dokładnie 4 scenami.")
    parser.add_argument("--output", type=Path, default=Path("exports/offline-bankier-short.mp4"), help="Ścieżka wyjściowego MP4.")
    parser.add_argument("--voice-audio", type=Path, help="Opcjonalny lokalny lektor WAV/MP3; bez pliku wynik jest bez dźwięku.")
    parser.add_argument("--demo", action="store_true", help="Wyrenderuj demonstrację oznaczoną NIE PUBLIKOWAĆ; nie wymaga newsa.")
    parser.add_argument("--overwrite", action="store_true", help="Zastąp wynik MP4 i jego manifest, jeśli istnieją.")
    args = parser.parse_args(argv)
    if args.demo and args.input:
        parser.error("Użyj --demo albo --input, nie obu naraz.")
    if not args.demo and not args.input:
        parser.error("Wymagane jest --input albo jawne --demo.")
    try:
        data = json.loads(args.input.read_text(encoding="utf-8")) if args.input else {}
        result = render(data, args.output, args.voice_audio, demo=args.demo, overwrite=args.overwrite)
    except (OSError, json.JSONDecodeError, RenderError) as exc:
        print(f"BŁĄD: {exc}", file=sys.stderr)
        return 2
    print(json.dumps({"status": "ok", "output": result["output"], "duration_s": result["probe"]["duration_seconds"], "resolution": "1080x1920", "audio": result["audio"]["present"], "demo_only": result["demo_only"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
