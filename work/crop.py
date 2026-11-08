# 使い方: python3 work/crop.py v1 124 125 …（コマ番号）→ /tmp/kk_crops/ に頁ごと・上下半分の画像を作る
# 1コマ＝見開き2頁。R（右頁）が先、L（左頁）が後。各頁 1＝上段（右半分）, 2＝下段（左半分）の順に読む
import sys, os
from PIL import Image, ImageOps
import numpy as np
base=os.path.join(os.path.dirname(os.path.abspath(__file__)),'images')
out='/tmp/kk_crops/'; os.makedirs(out,exist_ok=True)
vol=sys.argv[1]
def bbox(a,x0,x1):
    sub=a[300:2380,x0:x1]<120
    col=np.where(sub.sum(0)>6)[0]; row=np.where(sub.sum(1)>6)[0]
    return x0+col[0]-30, 300+row[0]-30, x0+col[-1]+30, 300+row[-1]+30
for k in map(int,sys.argv[2:]):
    img=Image.open(f'{base}/{vol}/koma_{k:04d}.jpg').convert('L'); a=np.array(img)
    rng=[('R',(2120,3380)),('L',(700,1975))] if vol=='v1' else [('R',(1965,3450)),('L',(560,1905))]
    for p,(x0,x1) in rng:
        b=bbox(a,x0,x1); pg=ImageOps.autocontrast(img.crop(b)); w=pg.width
        pg.crop((w//2-60,0,w,pg.height)).save(f'{out}{vol}_{k:04d}{p}1.png')
        pg.crop((0,0,w//2+60,pg.height)).save(f'{out}{vol}_{k:04d}{p}2.png')
    print(k,'ok')
