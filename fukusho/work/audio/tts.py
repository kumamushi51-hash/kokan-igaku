#!/usr/bin/env python3
"""腹証奇覧 リスニング用MP3の生成（GitHub Actions: .github/workflows/fukusho_audio.yml）
類聚方広義の ruijuho/work/audio/tts.py と同じ仕組み。

台本: fukusho/work/audio/scripts/NNN_<id>.txt（make_script.py で data から作る）
  #title 表示名 / #src 出典    … メタ情報（読まない）
  ## 見出し                    … 前後に間をとって読む（女性の声）
  @K 書き下し文                … 条文の書き下し（男性の声・ゆっくり）
  ふつうの行                   … 現代語訳・解説（女性の声）
  空行                         … 短い間
  ---                          … 長い間（大きな区切り）
読み辞書: 皇漢医学 work/audio/yomi.tsv ＋ 類聚方広義 ruijuho/work/audio/yomi.tsv ＋ fukusho/work/audio/yomi_auto.tsv（方剤名、自動）＋ fukusho/work/audio/yomi.tsv（最優先。長い表記から順に置換）
出力: fukusho/audio/NNN_<id>.mp3 と fukusho/audio/index.html（GitHub Pages で再生できる一覧）
台本か辞書が変わった方剤だけ作り直す（fukusho/audio/manifest.json にハッシュを記録）。
"""
import asyncio, hashlib, json, os, re, subprocess, sys, tempfile, html
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[3]
SCRIPTS = ROOT / "fukusho/work/audio/scripts"
YOMI_BASE = ROOT / "work/audio/yomi.tsv"
YOMI_RJ = ROOT / "ruijuho/work/audio/yomi.tsv"
YOMI_AUTO = ROOT / "fukusho/work/audio/yomi_auto.tsv"
YOMI = ROOT / "fukusho/work/audio/yomi.tsv"
OUT = ROOT / "fukusho/audio"
VOICE_N = ("ja-JP-NanamiNeural", "-3%")   # 解説・現代語訳
VOICE_K = ("ja-JP-KeitaNeural", "-12%")   # 書き下し文
PAUSE = {"line": 0.35, "blank": 0.8, "head_before": 1.3, "head_after": 0.6, "hr": 2.0, "voice": 0.7}
VERSION = "1"


def load_yomi():
    d = {}
    for f in (YOMI_BASE, YOMI_RJ, YOMI_AUTO, YOMI):  # 後から読む辞書を優先（腹証奇覧の yomi.tsv が最優先）
        if not f.exists():
            continue
        for ln in f.read_text(encoding="utf-8").splitlines():
            if not ln.strip() or ln.startswith("#") or "\t" not in ln:
                continue
            a, b = ln.split("\t", 1)
            d[a.strip()] = b.strip()
    pairs = list(d.items())
    pairs.sort(key=lambda p: -len(p[0]))
    return pairs


def apply_yomi(text, pairs):
    # 一度置き換えた部分を再置換しないよう、プレースホルダ経由で置換
    marks = []
    for i, (a, b) in enumerate(pairs):
        if a in text:
            tok = f"{len(marks)}"
            marks.append(b)
            text = text.replace(a, tok)
    for i, b in enumerate(marks):
        text = text.replace(f"{i}", b)
    return text


def parse(script):
    """台本 → [("say", voice, text) | ("pause", sec)]"""
    meta, items = {}, []
    for raw in script.splitlines():
        ln = raw.strip()
        if ln.startswith("#") and not ln.startswith("##"):
            k, _, v = ln[1:].partition(" ")
            meta[k] = v.strip()
            continue
        if not ln:
            items.append(("pause", PAUSE["blank"]))
        elif ln == "---":
            items.append(("pause", PAUSE["hr"]))
        elif ln.startswith("##"):
            items += [("pause", PAUSE["head_before"]), ("say", VOICE_N, ln[2:].strip()), ("pause", PAUSE["head_after"])]
        elif ln.startswith("@K"):
            items += [("pause", PAUSE["voice"]), ("say", VOICE_K, ln[2:].strip()), ("pause", PAUSE["voice"])]
        else:
            items += [("say", VOICE_N, ln), ("pause", PAUSE["line"])]
    # 連続する間は長い方だけ残す
    merged = []
    for it in items:
        if it[0] == "pause" and merged and merged[-1][0] == "pause":
            merged[-1] = ("pause", max(merged[-1][1], it[1]))
        else:
            merged.append(it)
    while merged and merged[0][0] == "pause":
        merged.pop(0)
    return meta, merged


async def tts(text, voice, path, tries=5):
    for n in range(tries):
        try:
            await edge_tts.Communicate(text, voice[0], rate=voice[1]).save(str(path))
            if path.stat().st_size > 0:
                return
        except Exception as e:  # ネットワークの一時的な失敗に備える
            print("  retry", n + 1, e, file=sys.stderr)
        await asyncio.sleep(3 * (n + 1))
    raise RuntimeError(f"TTS failed: {text[:30]}")


def ff(*args):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


async def build_one(src, pairs, out_mp3):
    meta, items = parse(src.read_text(encoding="utf-8"))
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        parts = []
        sil = {}
        for i, it in enumerate(items):
            if it[0] == "pause":
                sec = round(it[1], 2)
                if sec not in sil:
                    p = td / f"sil_{sec}.wav"
                    ff("-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", str(sec), p.as_posix())
                    sil[sec] = p
                parts.append(sil[sec])
            else:
                _, voice, text = it
                mp3 = td / f"s{i:04d}.mp3"
                await tts(apply_yomi(text, pairs), voice, mp3)
                wav = td / f"s{i:04d}.wav"
                ff("-i", mp3.as_posix(), "-ar", "24000", "-ac", "1", wav.as_posix())
                parts.append(wav)
        lst = td / "list.txt"
        lst.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts))
        out_mp3.parent.mkdir(parents=True, exist_ok=True)
        ff("-f", "concat", "-safe", "0", "-i", lst.as_posix(),
           "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "32k",
           "-metadata", f"title={meta.get('title', src.stem)}",
           "-metadata", "album=腹証奇覧 リスニング", "-metadata", "artist=稲葉文礼『腹証奇覧』・和久田叔虎『腹証奇覧翼』",
           out_mp3.as_posix())
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out_mp3.as_posix()],
                               capture_output=True, text=True).stdout.strip() or 0)
    return meta, dur


def write_index(manifest):
    rows = []
    for name in sorted(manifest):
        m = manifest[name]
        mins = int(m["dur"] // 60); secs = int(m["dur"] % 60)
        rows.append(f'<li><div class="t">{html.escape(m["title"])}<span>{mins}分{secs:02d}秒</span></div>'
                    f'<audio controls preload="none" src="{html.escape(name)}"></audio></li>')
    page = f"""<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>腹証奇覧 リスニング</title>
<style>
:root{{--bg:#faf8f3;--fg:#2b2620;--sub:#7a6f62;--card:#fff;--line:#e5ded2;--acc:#8a5a2b}}
@media (prefers-color-scheme:dark){{:root{{--bg:#1b1916;--fg:#ece6dc;--sub:#a59a8b;--card:#25221e;--line:#3a352e;--acc:#d7a46b}}}}
body{{margin:0;background:var(--bg);color:var(--fg);font-family:"Hiragino Mincho ProN","Yu Mincho",serif}}
main{{max-width:640px;margin:0 auto;padding:20px 16px 60px}}
h1{{font-size:1.4rem;margin:.2em 0}} p{{color:var(--sub);font-size:.9rem;line-height:1.6}}
.rate{{display:flex;gap:8px;margin:12px 0 18px;flex-wrap:wrap}}
.rate button{{font:inherit;border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:999px;padding:6px 14px}}
.rate button.on{{border-color:var(--acc);color:var(--acc)}}
ul{{list-style:none;padding:0;margin:0}} li{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:10px 0}}
.t{{display:flex;justify-content:space-between;gap:8px;margin-bottom:8px;font-size:1.05rem}} .t span{{color:var(--sub);font-size:.85rem;white-space:nowrap}}
audio{{width:100%}} .pod code{{word-break:break-all;user-select:all}}
</style></head><body><main>
<h1>腹証奇覧 リスニング</h1>
<p>各項の初めに腹証図の説明（図題と彩色の部位）と腹証所見を読み、本文・頭注は現代語訳で読みます。1曲が終わると次へ進みます。図は<a href="../">アプリ</a>で見られます。</p>
<p class="pod">車（CarPlay）などで続けて聞くには、iPhone の Podcast アプリでこの番組をフォローします：ライブラリ →（右上の …）→「URLで番組をフォロー」に次のURLを入れる。<br><code>https://kumamushi51-hash.github.io/kokan-igaku/fukusho/audio/feed.xml</code></p>
<div class="rate" id="rate">{''.join(f'<button data-r="{r}">{r}倍</button>' for r in ("1.0","1.25","1.5","2.0"))}</div>
<ul>{''.join(rows)}</ul>
</main><script>
const as=[...document.querySelectorAll('audio')];let r=1;
try{{r=parseFloat(localStorage.getItem('fk_rate'))||1}}catch(e){{}}
const bs=[...document.querySelectorAll('#rate button')];
function setR(v){{r=v;as.forEach(a=>a.playbackRate=r);bs.forEach(b=>b.classList.toggle('on',parseFloat(b.dataset.r)===r));try{{localStorage.setItem('fk_rate',r)}}catch(e){{}}}}
bs.forEach(b=>b.onclick=()=>setR(parseFloat(b.dataset.r)));setR(r);
as.forEach((a,i)=>{{a.onplay=()=>{{a.playbackRate=r;as.forEach(o=>o!==a&&o.pause())}};a.onended=()=>{{if(as[i+1]){{as[i+1].play()}}}}}});
</script></body></html>"""
    (OUT / "index.html").write_text(page, encoding="utf-8")
    # ポッドキャスト用フィード（CarPlay で連続再生するため。tools/podcast_feed.py）
    import subprocess
    subprocess.run([sys.executable, str(ROOT / "tools" / "podcast_feed.py"), "fukusho"], check=False)


async def main():
    pairs = load_yomi()
    ytxt = "".join(f.read_text(encoding="utf-8") for f in (YOMI_BASE, YOMI_RJ, YOMI_AUTO, YOMI) if f.exists())
    mpath = OUT / "manifest.json"
    manifest = json.loads(mpath.read_text()) if mpath.exists() else {}
    only = set(sys.argv[1:])
    limit = int(os.environ.get("MAX_ITEMS", "0"))  # 1回に作る本数の上限（0＝無制限）。残りがあれば終了コード3
    built, more = 0, False
    for src in sorted(SCRIPTS.glob("*.txt")):
        name = src.stem + ".mp3"
        h = hashlib.sha256((VERSION + str(VOICE_N) + str(VOICE_K) + ytxt + src.read_text(encoding="utf-8")).encode()).hexdigest()[:16]
        if (only and src.stem not in only) or (not only and manifest.get(name, {}).get("hash") == h and (OUT / name).exists()):
            continue
        if limit and built >= limit:
            more = True
            break
        built += 1
        print("building", name, flush=True)
        meta, dur = await build_one(src, pairs, OUT / name)
        manifest[name] = {"title": meta.get("title", src.stem), "hash": h, "dur": round(dur, 1)}
        mpath.write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
        print(f"  {dur/60:.1f} min", flush=True)
    for name in list(manifest):  # 台本を消したら音声も消す
        if not (SCRIPTS / (name[:-4] + ".txt")).exists():
            (OUT / name).unlink(missing_ok=True); manifest.pop(name)
    mpath.write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    write_index(manifest)
    return more


if __name__ == "__main__":
    sys.exit(3 if asyncio.run(main()) else 0)
