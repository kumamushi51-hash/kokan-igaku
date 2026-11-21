# 見開き画像から本の左右の頁と、頁内の印刷枠を自動で求める（撮影位置がコマごとに違うため）
import numpy as np
from PIL import Image

def pages(im):
    """{'R': (x0,y0,x1,y1), 'L': (...)} を原画像座標で返す。紙面＝黄みのある明るい部分、のど＝中央付近で最も暗い列"""
    W, H = im.size
    s = 400 / W
    small = im.convert('RGB').resize((400, int(H * s)))
    rgb = np.asarray(small, dtype=float)
    g = np.asarray(small.convert('L'), dtype=float)
    h = g.shape[0]
    # 紙は黄みがある（R−B が大きい）。背景の灰色・カラーチャートは R−B が小さい
    paper = ((rgb[..., 0] - rgb[..., 2]) > 16) & (g > 140)
    colf = paper[int(h * .3):int(h * .7)].mean(axis=0)
    xs = np.where(colf > 0.35)[0]
    # カラーチャートなどを除くため、最も長い区間（20px 未満の切れ目はつなぐ）を本とみなす
    runs, start = [], xs[0]
    for a, b in zip(xs, xs[1:]):
        if b - a > 20: runs.append((start, a)); start = b
    runs.append((start, xs[-1]))
    bx0, bx1 = max(runs, key=lambda r: r[1] - r[0])
    rowf = paper[:, bx0:bx1].mean(axis=1)
    ys = np.where(rowf > 0.35)[0]; by0, by1 = ys[0], ys[-1]
    # のど：本の中央 ±15% で列の平均輝度が最小の列
    # のどは本の左右端の中央とする（暗い列を探すと枠線を拾うため）。頁は 3% ずつ重ねて切る
    mid = (bx0 + bx1) / 2; ov = (bx1 - bx0) * .03
    f = lambda v: int(v / s)
    return {'R': (f(mid - ov), f(by0), f(bx1), f(by1)), 'L': (f(bx0), f(by0), f(mid + ov), f(by1))}

def frame(im, box, side=None):
    """頁 box 内の印刷枠（濃い長い直線）。見つからなければ None"""
    x0, y0, x1, y1 = box
    g = np.asarray(im.convert('L').crop(box)) < 110
    H, W = g.shape
    rows = g.mean(axis=1)
    rr = [i for i, v in enumerate(rows) if v > 0.30]
    if len(rr) < 2: return None
    t = rr[0]; bs = [i for i in rr if i - t > H * .55]
    if not bs: return None
    b = bs[0]
    cols = g[t + 10:b - 10].mean(axis=0)
    cc = [i for i, v in enumerate(cols) if v > 0.45]
    # のど側の重なり部分（頁幅の 10%）にある線は隣の頁の枠なので除く
    if side == 'L': cc = [i for i in cc if i < W * .9]
    if side == 'R': cc = [i for i in cc if i > W * .1]
    if len(cc) < 2: return None
    best = None
    for l in cc:
        for r in reversed(cc):
            if W * .6 < r - l < W * .98: best = (l, r); break
        if best: break
    if not best: return None
    l, r = best; e = max(4, W // 100)
    return (x0 + l - e, y0 + t - e, x0 + r + e, y0 + b + e)
