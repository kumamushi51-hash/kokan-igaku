# 腹証奇覧の原本画像を京都大学貴重資料デジタルアーカイブ（RMDA）から IIIF で取得する。
# GitHub Actions（.github/workflows/fukusho_images.yml）で実行する想定（サンドボックスからは RMDA に届かない）。
# 出力：fukusho/work/images/<冊>/koma_XXXX.jpg（XXXX＝RMDA ビューアの page 番号と同じ、1始まり）
#       fukusho/work/images/info.tsv（冊・コマ・ラベル・元URL）, fukusho/work/images/manifest_*.json
# 既にある画像は取り直さない（途中で止まっても再実行で続きから）。
import json, os, re, sys, time, io, urllib.request
from PIL import Image

ITEM = os.environ.get("RMDA_ITEM", "RB00004916")
BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.environ.get("OUT", "images"))
# KOMA="70-120" のように指定すると、その範囲のコマだけ取る（別本から一部だけ補うとき）
_kr = os.environ.get("KOMA", "")
KOMA = tuple(map(int, _kr.split("-"))) if _kr else None
MAXSIDE = 3000          # 長辺の上限（リポジトリ容量を抑えるため皇漢医学・類聚方広義より小さめ）
UA = {"User-Agent": "Mozilla/5.0 (kokan-igaku study app; personal use)"}

def get(url, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except Exception as e:
            print("  retry", i + 1, url, e, flush=True)
            time.sleep(5 * (i + 1))
    raise RuntimeError("取得失敗: " + url)

def find_manifest():
    cands = [
        f"https://rmda.kulib.kyoto-u.ac.jp/iiif/metadata_manifest/{ITEM}/manifest.json",
        f"https://rmda.kulib.kyoto-u.ac.jp/iiif/metadata_manifest/{ITEM.lower()}/manifest.json",
    ]
    for u in cands:
        try:
            d = json.loads(get(u, 2)); print("manifest:", u); return u, d
        except Exception as e:
            print("  候補なし", u, e)
    # 資料ページから manifest へのリンクを探す
    html = get(f"https://rmda.kulib.kyoto-u.ac.jp/item/{ITEM.lower()}").decode("utf-8", "replace")
    for m in re.findall(r'https?://[^"\'\s<>]*manifest[^"\'\s<>]*', html):
        try:
            d = json.loads(get(m, 2)); print("manifest(page):", m); return m, d
        except Exception:
            pass
    raise RuntimeError("manifest が見つからない")

def label(x):
    l = x.get("label", "")
    if isinstance(l, dict):  # v3
        for v in l.values():
            return " ".join(v)
    if isinstance(l, list):
        return " ".join(i.get("@value", str(i)) if isinstance(i, dict) else str(i) for i in l)
    return str(l)

def canvases(d):
    """(canvas label, image service id or direct url) を返す。v2/v3 両対応"""
    out = []
    if "sequences" in d:  # v2
        for c in d["sequences"][0]["canvases"]:
            res = c["images"][0]["resource"]
            svc = res.get("service", {})
            if isinstance(svc, list): svc = svc[0]
            out.append((label(c), svc.get("@id") or svc.get("id"), res.get("@id")))
    else:  # v3
        for c in d.get("items", []):
            body = c["items"][0]["items"][0]["body"]
            svc = body.get("service", [{}])
            if isinstance(svc, list): svc = svc[0] if svc else {}
            out.append((label(c), svc.get("@id") or svc.get("id"), body.get("id")))
    return out

def manifests(u, d, depth=0):
    """collection の場合は中の manifest を順にたどる"""
    t = d.get("@type") or d.get("type")
    if t in ("sc:Collection", "Collection"):
        subs = d.get("manifests") or d.get("items") or []
        for s in subs:
            su = s.get("@id") or s.get("id")
            yield from manifests(su, json.loads(get(su)), depth + 1)
    else:
        yield u, d

def main():
    os.makedirs(BASE, exist_ok=True)
    u, d = find_manifest()
    info = []
    for vi, (mu, md) in enumerate(manifests(u, d), 1):
        vol = f"v{vi}"
        os.makedirs(f"{BASE}/{vol}", exist_ok=True)
        with open(f"{BASE}/manifest_{vol}.json", "w", encoding="utf-8") as f:
            json.dump(md, f, ensure_ascii=False, indent=1)
        cs = canvases(md)
        print(f"{vol}: {label(md)}  {len(cs)}コマ", flush=True)
        for k, (cl, svc, direct) in enumerate(cs, 1):
            if KOMA and not (KOMA[0] <= k <= KOMA[1]):
                continue
            path = f"{BASE}/{vol}/koma_{k:04d}.jpg"
            src = None
            if not os.path.exists(path):
                tried = ([f"{svc}/full/max/0/default.jpg", f"{svc}/full/full/0/default.jpg"] if svc else []) + ([direct] if direct else [])
                raw = None
                for t in tried:
                    try:
                        raw = get(t, 3); src = t; break
                    except Exception:
                        continue
                if raw is None:
                    print("  失敗", vol, k, flush=True); continue
                im = Image.open(io.BytesIO(raw)); im.load()
                if max(im.size) > MAXSIDE:
                    im.thumbnail((MAXSIDE, MAXSIDE), Image.LANCZOS)
                im.convert("RGB").save(path, "JPEG", quality=80, optimize=True)
                time.sleep(0.5)  # 相手サーバーに配慮
                if k % 20 == 0: print(f"  {vol} {k}/{len(cs)}", flush=True)
            info.append((vol, k, cl, src or svc or direct or ""))
    with open(f"{BASE}/info.tsv", "w", encoding="utf-8") as f:
        f.write("冊\tコマ\tラベル\t元URL\n")
        for r in info: f.write("\t".join(map(str, r)) + "\n")
    print("完了", len(info), "コマ")

if __name__ == "__main__":
    main()
