#!/usr/bin/env python3
"""試運用サイト（Cloudflare Pages ＋ Cloudflare Access）用に、公開するファイルだけを _site/ に集める。
  SITE_URL=https://xxxx.pages.dev AUDIO_PATH=a-xxxxxxxx python3 tools/build_site.py [出力先=_site]

- 4アプリ（皇漢医学＝ルート、ruijuho/、fukusho/、kensaku/）の公開物をコピーする。作業用フォルダ（*/work, tools, .github）は入れない
- 各アプリの index.html に「利用規約への同意」画面を差し込む（同意は端末に記録。4アプリ共通）
- 音声（audio/, ruijuho/audio/, fukusho/audio/）は、推測できないパス /<AUDIO_PATH>/... に置く。
  Cloudflare Access ではこのパスだけをログイン不要（Bypass）にして、Apple Podcasts・CarPlay で聞けるようにする
- 旧サイト（GitHub Pages）の絶対URLを SITE_URL に書き換え、音声のURLは秘密のパスに書き換える
GitHub Actions（.github/workflows/cloudflare_deploy.yml）から実行される。手元で試すときも同じ。
"""
import os, re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "_site").resolve()
SITE = os.environ.get("SITE_URL", "").rstrip("/")
AUDIO = os.environ.get("AUDIO_PATH", "").strip("/")
if not SITE or not AUDIO or not re.fullmatch(r"[A-Za-z0-9_-]{16,}", AUDIO):
    sys.exit("SITE_URL と AUDIO_PATH（英数字16文字以上）を環境変数で指定してください")
OLD = "https://kumamushi51-hash.github.io/kokan-igaku"

APPS = ["", "ruijuho/", "fukusho/", "kensaku/"]          # "" はルート（皇漢医学）
AUDIO_DIRS = {"audio/": "", "ruijuho/audio/": "ruijuho/", "fukusho/audio/": "fukusho/"}  # 音声フォルダ → 戻り先のアプリ
SKIP_DIRS = {"work", "tools", ".github", ".git", "_site", "node_modules"}
SKIP_FILES = {"CLAUDE.md", "README.md", "_config.yml", ".gitignore"}
TEXT = {".html", ".xml", ".json", ".js", ".webmanifest", ".txt", ".css"}

TERMS = r"""
<div id="ksTerms" hidden style="position:fixed;inset:0;z-index:99999;background:rgba(20,30,36,.72);display:flex;align-items:center;justify-content:center;padding:16px">
 <div style="background:#fff;color:#22303a;max-width:560px;width:100%;max-height:90vh;overflow:auto;border-radius:12px;padding:20px;font:14px/1.7 -apple-system,'Hiragino Sans','Noto Sans JP',sans-serif">
  <h2 style="margin:0 0 8px;font-size:17px">利用規約（試運用版）</h2>
  <p style="margin:0 0 8px">このサイト（皇漢医学・類聚方広義・腹証奇覧・漢方 統合検索）は、作成者が許可した方だけが試運用のために利用できます。</p>
  <ol style="margin:0 0 8px;padding-left:1.4em">
   <li>本サイトの内容（現代語訳・書き下し・解説・データ・音声・アプリの仕組み）の著作権は作成者に帰属します。</li>
   <li>内容の全部または一部を、複製・転載・再配布・第三者への共有（画面の写真・スクリーンショット、URL・ログイン情報の共有を含む）しないでください。</li>
   <li>試運用の目的（学習・診療の参考・改善のための意見）以外に使わないでください。</li>
   <li>本サイトは古典の記載にもとづく参考情報です。診断・処方の判断は利用者ご自身の責任で行ってください。</li>
   <li>統合検索に入力した症例文・所見は端末の中だけで処理され、保存も送信もされません。氏名・ID など個人を特定できる情報は入力しないでください。</li>
   <li>原本の画像は、京都大学貴重資料デジタルアーカイブ・国立国会図書館デジタルコレクションのものを利用しています。</li>
   <li>規約に反する利用があった場合は、利用をお断りすることがあります。</li>
  </ol>
  <p style="margin:0 0 12px;color:#5f6b73;font-size:12px">作成者：栗原智（富山大学附属病院 和漢診療科）</p>
  <label style="display:block;margin-bottom:12px"><input type="checkbox" id="ksTermsChk"> 上記に同意します</label>
  <button id="ksTermsOk" disabled style="border:0;border-radius:8px;background:#2f5f6f;color:#fff;padding:10px 18px;font-size:15px;opacity:.5">同意して使う</button>
 </div>
</div>
<script>
(function(){var K="ks_terms_v1",d=document,g=d.getElementById("ksTerms");if(!g)return;
 var ok=false;try{ok=localStorage.getItem(K)==="1"}catch(e){}
 if(ok){g.remove();return}
 g.hidden=false;var c=d.getElementById("ksTermsChk"),b=d.getElementById("ksTermsOk");
 c.onchange=function(){b.disabled=!c.checked;b.style.opacity=c.checked?1:.5};
 b.onclick=function(){try{localStorage.setItem(K,"1")}catch(e){}g.remove()};
})();
</script>
"""


def rewrite(text, rel):
    # 音声フォルダの中の「アプリへ戻る（../）」は、アプリの本来の場所へ
    for adir, app in AUDIO_DIRS.items():
        if rel.startswith(adir):
            text = text.replace('href="../"', f'href="{SITE}/{app}"')
    text = text.replace(OLD + "/", SITE + "/").replace(OLD, SITE)
    # 音声の絶対URL → 秘密のパス（長い方から）
    for adir in sorted(AUDIO_DIRS, key=len, reverse=True):
        text = re.sub(re.escape(SITE + "/" + adir), SITE + "/" + AUDIO + "/" + adir, text)
    text = text.replace(SITE + "/" + AUDIO + "/" + AUDIO + "/", SITE + "/" + AUDIO + "/")
    if rel in {a + "index.html" for a in APPS} and "</body>" in text and 'id="ksTerms"' not in text:
        text = text.replace("</body>", TERMS + "</body>", 1)
    return text


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    n = 0
    for p in sorted(ROOT.rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(ROOT).as_posix()
        parts = rel.split("/")
        if any(x in SKIP_DIRS for x in parts[:-1]) or parts[0] in SKIP_DIRS or rel in SKIP_FILES:
            continue
        if rel == "sw.js" or rel.endswith("/sw.template.js"):
            pass
        dest_rel = rel
        for adir in AUDIO_DIRS:
            if rel.startswith(adir):
                dest_rel = AUDIO + "/" + rel
                break
        dest = OUT / dest_rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        if p.suffix in TEXT:
            dest.write_text(rewrite(p.read_text(encoding="utf-8"), rel), encoding="utf-8")
        else:
            shutil.copy2(p, dest)
        n += 1
    # 検索エンジンには載せない
    (OUT / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")
    (OUT / AUDIO / "robots.txt").parent.mkdir(parents=True, exist_ok=True)
    (OUT / AUDIO / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")
    # 応答ヘッダー：検索に載せない・ほかのサイトに埋め込ませない
    (OUT / "_headers").write_text("/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  X-Frame-Options: DENY\n  Referrer-Policy: same-origin\n", encoding="utf-8")
    left = [str(f.relative_to(OUT)) for f in OUT.rglob("*") if f.suffix in TEXT and OLD in f.read_text(encoding="utf-8", errors="ignore")]
    print(f"{n} ファイル → {OUT}")
    if left:
        print("旧サイトのURLが残っているファイル:", *left[:10], sep="\n  ")


if __name__ == "__main__":
    main()
