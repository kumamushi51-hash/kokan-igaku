# NDL サーチ API で『皇漢医学』の全巻を探し、デジタル化資料の pid と IIIF マニフェストの有無を書き出す
import urllib.request, urllib.parse, re, json
out=[]
def get(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=60) as r: return r.read().decode('utf-8','replace')
    except Exception as e: return 'ERR '+str(e)
for q in ['皇漢医学 湯本','皇漢醫學 湯本','皇漢医学 第3巻','皇漢医学 第三巻']:
    u='https://ndlsearch.ndl.go.jp/api/opensearch?cnt=100&any='+urllib.parse.quote(q)
    x=get(u); out.append(f'## {q}')
    for item in re.findall(r'<item>(.*?)</item>',x,re.S):
        t=' '.join(re.findall(r'<(?:title|dcndl:volume|dc:publisher|dcterms:issued|dcndl:edition)>(.*?)</',item))
        pids=sorted(set(re.findall(r'(?:pid/|dl\.ndl\.go\.jp/(?:info:ndljp/)?pid/)(\d+)',item)))
        links=' '.join(re.findall(r'<link>(.*?)</link>',item))
        out.append(f'- {t} | pid={",".join(pids)} | {links}')
for pid in list(range(1047068,1047080))+[1107199,1107201,1107202]:
    m=get(f'https://dl.ndl.go.jp/api/iiif/{pid}/manifest.json')
    lab=re.search(r'"label"\s*:\s*(\{[^}]*\}|"[^"]*")',m)
    n=len(re.findall(r'"@type"\s*:\s*"sc:Canvas"|"type"\s*:\s*"Canvas"',m))
    out.append(f'pid {pid}: {lab.group(1)[:200] if lab else m[:80]} canvases={n}')
open('work/ndl/find_v3_result.txt','w').write('\n'.join(out))
print('\n'.join(out))
