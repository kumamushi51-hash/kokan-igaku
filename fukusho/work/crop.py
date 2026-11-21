# 使い方: python3 fukusho/work/crop.py 11 12 …（コマ番号）→ /tmp/fk_crops/ に切り出し
# 1コマ＝見開き2頁。R（右頁）が先、L（左頁）が後。頁の位置は pages.py で自動検出（撮影位置がコマごとに違う）。
# 出力：0012R.jpg / 0012L.jpg（頁全体。通常はこれで読める）、0012Ra/Rb/La/Lb.jpg（頁の右半分・左半分。縦書きなので a→b の順）
# のどの位置がずれたときは  12=1450  のように「コマ=のどのx座標（原画像）」を付けて指定できる
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
from pages import pages

base = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'images', 'v1')
out = '/tmp/fk_crops/'; os.makedirs(out, exist_ok=True)
MID, ks = {}, []
for a in sys.argv[1:]:
    if '=' in a:
        kk, m = a.split('='); MID[int(kk)] = int(m)
    else:
        ks.append(int(a))
for k in ks:
    img = Image.open(f'{base}/koma_{k:04d}.jpg')
    P = pages(img)
    if k in MID:
        m = MID[k]; P['R'] = (m,) + P['R'][1:]; P['L'] = P['L'][:2] + (m, P['L'][3])
    for p in ('R', 'L'):
        page = img.crop(P[p])
        w, h = page.size
        page.save(f'{out}{k:04d}{p}.jpg', quality=88)
        e = w // 40
        page.crop((w // 2 - e, 0, w, h)).save(f'{out}{k:04d}{p}a.jpg', quality=90)
        page.crop((0, 0, w // 2 + e, h)).save(f'{out}{k:04d}{p}b.jpg', quality=90)
    print(k, 'ok', P)
