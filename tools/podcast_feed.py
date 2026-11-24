#!/usr/bin/env python3
"""リスニング音声のポッドキャスト用フィード（feed.xml）とカバー画像（cover.jpg）を作る。
  python3 tools/podcast_feed.py fukusho   … fukusho/audio/feed.xml
  python3 tools/podcast_feed.py ruijuho   … ruijuho/audio/feed.xml
各アプリの tts.py が index.html を書いたあとにも呼ぶ（音声を作り直すとフィードも更新される）。
iPhone の Apple Podcasts で「URLで番組をフォロー」すると、CarPlay で順番に連続再生できる。
エピソードは本書の順（ファイル名順）に第1話から並べ、itunes:type=serial で古い順に再生させる。
guid はファイル名で固定（読みを直して作り直しても別エピソードにならない）。"""
import json, sys, html, datetime
from pathlib import Path
from email.utils import format_datetime
ROOT = Path(__file__).resolve().parents[1]
BASE = "https://kumamushi51-hash.github.io/kokan-igaku"
APPS = {
  "fukusho": dict(title="腹証奇覧 リスニング", author="稲葉文礼・和久田叔虎（現代語訳つき）",
                  desc="稲葉文礼『腹証奇覧』と和久田叔虎『腹証奇覧翼』の朗読。各項で腹証図の説明と腹証所見を読み、本文・頭注を書き下し文と現代語訳で続けて読みます。図はアプリで見られます。",
                  sub="腹証図の説明・書き下し文・現代語訳", color=(63, 94, 58)),
  "ruijuho": dict(title="類聚方広義 リスニング", author="尾台榕堂（現代語訳つき）",
                  desc="尾台榕堂『類聚方広義』の朗読。条文の書き下し文と、現代語訳・頭注の現代語訳を続けて読みます。",
                  sub="書き下し文・現代語訳", color=(138, 90, 43)),
}
def cover(app, c, out):
    from PIL import Image, ImageDraw, ImageFont
    W = 1400
    im = Image.new("RGB", (W, W), (250, 248, 243)); d = ImageDraw.Draw(im)
    d.rectangle([60, 60, W - 60, W - 60], outline=c["color"], width=14)
    def font(sz):
        for f in ("/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc", "/usr/share/fonts/truetype/noto/NotoSerifCJK-Bold.ttc"):
            try: return ImageFont.truetype(f, sz, index=0)
            except Exception: pass
        return ImageFont.load_default()
    name = c["title"].replace(" リスニング", "")
    step = min(230, 900 // len(name)); f1 = font(int(step * 0.9))
    # 縦書き風に書名を中央へ（上 150〜下 1050）
    x = W // 2; y = 150 + (900 - step * len(name)) // 2
    for ch in name:
        bb = d.textbbox((0, 0), ch, font=f1)
        d.text((x - (bb[0] + bb[2]) / 2, y - bb[1]), ch, font=f1, fill=(43, 38, 32)); y += step
    f2 = font(80); t = "リスニング"; bb = d.textbbox((0, 0), t, font=f2)
    d.text(((W - (bb[2] - bb[0])) / 2, 1130), t, font=f2, fill=c["color"])
    im.save(out, quality=90)
def build(app):
    c = APPS[app]; d = ROOT / app / "audio"
    m = json.loads((d / "manifest.json").read_text(encoding="utf-8"))
    if not (d / "cover.jpg").exists(): cover(app, c, d / "cover.jpg")
    url = f"{BASE}/{app}/audio/"
    t0 = datetime.datetime(2026, 11, 1, 0, 0, tzinfo=datetime.timezone.utc)
    items = []
    for i, name in enumerate(sorted(m), 1):
        e = m[name]; f = d / name
        if not f.exists(): continue
        dur = int(round(e["dur"]))
        items.append(f"""<item><title>{i:03d} {html.escape(e['title'])}</title>
<enclosure url="{url}{name}" length="{f.stat().st_size}" type="audio/mpeg"/>
<guid isPermaLink="false">{app}-{name}</guid><pubDate>{format_datetime(t0 + datetime.timedelta(hours=i))}</pubDate>
<itunes:episode>{i}</itunes:episode><itunes:episodeType>full</itunes:episodeType>
<itunes:duration>{dur // 3600}:{dur % 3600 // 60:02d}:{dur % 60:02d}</itunes:duration></item>""")
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
<channel><title>{html.escape(c['title'])}</title><link>{url}</link><language>ja</language>
<atom:link href="{url}feed.xml" rel="self" type="application/rss+xml"/>
<description>{html.escape(c['desc'])}</description><itunes:summary>{html.escape(c['desc'])}</itunes:summary>
<itunes:author>{html.escape(c['author'])}</itunes:author><itunes:subtitle>{html.escape(c['sub'])}</itunes:subtitle>
<itunes:image href="{url}cover.jpg"/><image><url>{url}cover.jpg</url><title>{html.escape(c['title'])}</title><link>{url}</link></image>
<itunes:type>serial</itunes:type><itunes:explicit>false</itunes:explicit><itunes:block>Yes</itunes:block>
<itunes:category text="Education"/>
{''.join(items)}
</channel></rss>
"""
    (d / "feed.xml").write_text(xml, encoding="utf-8")
    print(app, len(items), "episodes →", d / "feed.xml")
if __name__ == "__main__":
    for a in sys.argv[1:] or APPS: build(a)
