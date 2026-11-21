# 腹証図を原本画像から切り出して ../img/ に置く（アプリで表示する）。
# 使い方: python3 fukusho/work/make_figs.py 11L 13L …（コマ番号＋頁 R/L）。引数なしなら data の fig をすべて作る
# 枠がずれる図は BOX に個別の切り出し範囲（原画像座標 x0,y0,x1,y1）を書く
import sys, os, re, glob
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, '..', 'img'); os.makedirs(out, exist_ok=True)
DEF = {'L': (620, 1080, 2070, 2580), 'R': (1930, 1080, 3380, 2580)}
BOX = {}
SEARCH = {'L': (350, 450, 2150, 2700), 'R': (1850, 450, 3650, 2700)}
def frame(im, side):
    """印刷の枠線（濃く長い直線）を探して、その内側＋少し余白で返す"""
    import numpy as np
    x0, y0, x1, y1 = SEARCH[side]
    g = np.asarray(im.convert('L').crop((x0, y0, x1, y1))) < 110
    rows = g.mean(axis=1)
    rr = [i for i, v in enumerate(rows) if v > 0.30]
    if len(rr) < 2:
        return DEF[side]
    # 枠の上下の線：最初の線と、それから 1500px 以上離れた線のうち最も上のもの（下の黒い台紙を拾わない）
    t = rr[0]; bs = [i for i in rr if i - t > 1500]
    b = bs[0] if bs else rr[-1]
    # 縦の枠線：上下の線の間でほぼ全長にわたって黒い列
    cols = g[t + 20:b - 20].mean(axis=0)
    cc = [i for i, v in enumerate(cols) if v > 0.7]
    if len(cc) < 2:
        return DEF[side]
    # のど側・小口側の折り目なども拾うので、幅 1100〜1500px になる一番外側の組を選ぶ
    best = None
    for l in cc:
        for r in reversed(cc):
            if 1050 < r - l < 1500:
                best = (l, r); break
        if best: break
    l, r = best or (cc[0], cc[-1])
    return (x0 + l - 12, y0 + t - 12, x0 + r + 12, y0 + b + 12)
def make(tag):
    k, side = int(tag[:-1]), tag[-1]
    im = Image.open(f'{here}/images/v1/koma_{k:04d}.jpg')
    box = BOX.get(tag) or frame(im, side)
    if box[2] - box[0] < 900 or box[3] - box[1] < 1200:
        print('  枠を検出できず既定の範囲で切り出し（要目視・BOX に追記）', tag); box = DEF[side]
    c = im.crop(box)
    c.thumbnail((900, 900), Image.LANCZOS)
    p = f'{out}/fig_{k:03d}{side}.jpg'
    c.convert('RGB').save(p, 'JPEG', quality=82, optimize=True)
    print(p, c.size)
tags = sys.argv[1:]
if not tags:
    for f in glob.glob(f'{here}/data/data_*.js'):
        tags += re.findall(r'fig_(\d{3}[RL])\.jpg', open(f, encoding='utf-8').read())
    tags = [str(int(t[:-1])) + t[-1] for t in sorted(set(tags))]
for t in tags: make(t)
