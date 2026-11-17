# 使い方: python3 ruijuho/work/crop.py 26 27 …（コマ番号）→ /tmp/rj_crops/ に切り出し画像を作る
# 1コマ＝見開き2頁。R（右頁）が先、L（左頁）が後。
# 各頁: H1＝頭注の右半分, H2＝頭注の左半分（どちらも2倍に拡大）, B＝本文（大字）。読む順は R-H1,R-H2,R-B, L-H1,L-H2,L-B
# ただし頭注は本文の該当箇所の上に置かれるので、頭注と本文は同じ頁どうしで対応させる。
import sys, os
from PIL import Image, ImageOps
base = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'images', 'v1')
out = '/tmp/rj_crops/'; os.makedirs(out, exist_ok=True)
PAGES = [('R', (1920, 3200)), ('L', (620, 1910))]
Y0, YM, Y1 = 380, 1010, 2380   # 枠の上端・頭注と本文の境目付近・下端
for k in map(int, sys.argv[1:]):
    img = Image.open(f'{base}/koma_{k:04d}.jpg').convert('L')
    for p, (x0, x1) in PAGES:
        head = ImageOps.autocontrast(img.crop((x0, Y0, x1, YM + 20)))
        w = head.width
        for tag, box in (('H1', (w // 2 - 40, 0, w, head.height)), ('H2', (0, 0, w // 2 + 40, head.height))):
            h = head.crop(box); h = h.resize((h.width * 2, h.height * 2), Image.LANCZOS)
            h.save(f'{out}{k:04d}{p}-{tag}.png')
        ImageOps.autocontrast(img.crop((x0, YM - 30, x1, Y1))).save(f'{out}{k:04d}{p}-B.png')
    print(k, 'ok')
