# 使い方: python3 fukusho/work/crop.py 11 12 b85 …（コマ番号。b を付けると別本 RB00004915＝後編 上の補い）→ /tmp/fk_crops/ に切り出し
# 1コマ＝見開き2頁。R（右頁）が先、L（左頁）が後。頁の位置は pages.py で自動検出（撮影位置がコマごとに違う）。
# 出力：0012R.jpg / 0012L.jpg（頁全体。通常はこれで読める）、0012Ra/Rb/La/Lb.jpg（頁の右半分・左半分。縦書きなので a→b の順）
# のどの位置がずれたときは  12=1450  のように「コマ=のどのx座標（原画像）」を付けて指定できる
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
from pages import pages

HERE = os.path.dirname(os.path.abspath(__file__))
def path_of(k):
    # 'b85' のように b を付けたコマは別本 RB00004915（後編 上の補い）の画像
    if str(k).startswith('b'): return f'{HERE}/images_b/v1/koma_{int(str(k)[1:]):04d}.jpg', 'b%04d' % int(str(k)[1:])
    # 'c12' は東北大 狩野文庫本（翼二編、10010000025022、白黒）
    # 'd12' は京大 別本（翼初編、RB00004921）
    if str(k).startswith('d'): return f'{HERE}/images_d/v1/koma_{int(str(k)[1:]):04d}.jpg', 'd%04d' % int(str(k)[1:])
    if str(k).startswith('c'): return f'{HERE}/images_c/v1/koma_{int(str(k)[1:]):04d}.jpg', 'c%04d' % int(str(k)[1:])
    return f'{HERE}/images/v1/koma_{int(k):04d}.jpg', '%04d' % int(k)
out = '/tmp/fk_crops/'; os.makedirs(out, exist_ok=True)
MID, ks = {}, []
for a in sys.argv[1:]:
    if '=' in a:
        kk, m = a.split('='); MID[int(kk)] = int(m)
    else:
        ks.append(a)
for k in ks:
    path, tag = path_of(k)
    img = Image.open(path)
    P = pages(img)
    if str(k).isdigit() and int(k) in MID:
        m = MID[int(k)]; P['R'] = (m,) + P['R'][1:]; P['L'] = P['L'][:2] + (m, P['L'][3])
    for p in ('R', 'L'):
        page = img.crop(P[p])
        w, h = page.size
        page.save(f'{out}{tag}{p}.jpg', quality=88)
        e = w // 40
        page.crop((w // 2 - e, 0, w, h)).save(f'{out}{tag}{p}a.jpg', quality=90)
        page.crop((0, 0, w // 2 + e, h)).save(f'{out}{tag}{p}b.jpg', quality=90)
    print(k, 'ok', P)
