# 腹証図を原本画像から切り出して ../img/ に置く（アプリで表示する）。
# 使い方: python3 fukusho/work/make_figs.py 11L 13L b85R …（コマ番号＋頁 R/L。b は別本 RB00004915）。引数なしなら data の fig をすべて作る
# 頁と枠は pages.py で自動検出。うまくいかない図は BOX に個別の範囲（原画像座標 x0,y0,x1,y1）を書く
import sys, os, re, glob
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, '..', 'img'); os.makedirs(out, exist_ok=True)
BOX = {'d82R': (1585, 445, 2587, 1770)}
from pages import pages, frame as find_frame

def make(tag):
    side = tag[-1]; kk = tag[:-1]
    if kk.startswith('d'):   # 京大 別本 RB00004921（翼初編の補い）
        k = int(kk[1:]); im = Image.open(f'{here}/images_d/v1/koma_{k:04d}.jpg'); pre = 'd'
    elif kk.startswith('b'):   # 別本 RB00004915（後編 上の補い）
        k = int(kk[1:]); im = Image.open(f'{here}/images_b/v1/koma_{k:04d}.jpg'); pre = 'b'
    else:
        k = int(kk); im = Image.open(f'{here}/images/v1/koma_{k:04d}.jpg'); pre = ''
    pg = pages(im)[side]
    box = BOX.get(tag) or find_frame(im, pg, side)
    if not box:
        print('  枠を検出できず頁全体で切り出し（要目視・BOX に追記）', tag); box = pg
    c = im.crop(box)
    c.thumbnail((900, 900), Image.LANCZOS)
    p = f'{out}/fig_{pre}{k:03d}{side}.jpg'
    c.convert('RGB').save(p, 'JPEG', quality=82, optimize=True)
    print(p, c.size)
tags = sys.argv[1:]
if not tags:
    for f in glob.glob(f'{here}/data/data_*.js'):
        tags += re.findall(r'fig_([bd]?\d{3}[RL])\.jpg', open(f, encoding='utf-8').read())
    tags = [(t[0] if t[0] in 'bd' else '') + str(int(t.lstrip('bd')[:-1])) + t[-1] for t in sorted(set(tags))]
for t in tags: make(t)
