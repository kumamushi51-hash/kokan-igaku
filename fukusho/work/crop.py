# 使い方: python3 fukusho/work/crop.py 11 12 …（コマ番号）→ /tmp/fk_crops/ に切り出し
# 1コマ＝見開き2頁。R（右頁）が先、L（左頁）が後。各頁を上下2分割（1,2）。読む順は R1,R2,L1,L2 ではなく
# 縦書きなので、各頁は「右半分(a)→左半分(b)」の順に読む：Ra, Rb, La, Lb（いずれも全高）
import sys, os
from PIL import Image, ImageOps
base = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'images', 'v1')
out = '/tmp/fk_crops/'; os.makedirs(out, exist_ok=True)
MID = {}
args = [a for a in sys.argv[1:]]
ks = []
for a in args:
    if '=' in a: kk, m = a.split('='); MID[int(kk)] = int(m)
    else: ks.append(int(a))
for k in ks:
    img = Image.open(f'{base}/koma_{k:04d}.jpg')
    W, H = img.size
    # 撮影位置はほぼ一定（紙面は x≈700〜3300、のど≈2000）。ずれる場合は引数の後に mid=xxxx を付ける
    mid = MID.get(k, 2000); x0, x1 = mid - 1300, mid + 1300
    for p, (a, b) in (('R', (mid - 20, x1)), ('L', (x0, mid + 20))):
        page = img.crop((a, int(H*.12), b, int(H*.94)))
        w = page.width
        page.save(f'{out}{k:04d}{p}.jpg', quality=85)
        for t, box in (('a', (w//2 - 30, 0, w, page.height)), ('b', (0, 0, w//2 + 30, page.height))):
            page.crop(box).save(f'{out}{k:04d}{p}{t}.jpg', quality=90)
    print(k, 'ok', mid)
