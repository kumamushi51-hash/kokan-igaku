# 第2回：候補資料の pid と公開範囲（IIIF マニフェストが取れるか）を確認
import urllib.request, re
out=[]
def get(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=60) as r: return r.read().decode('utf-8','replace')
    except Exception as e: return 'ERR '+str(e)
for rid in ['R100000002-I000000743107','R100000002-I000001029214','R100000039-I14356663','R100000039-I14356983']:
    x=get(f'https://ndlsearch.ndl.go.jp/api/sru?operation=searchRetrieve&recordSchema=dcndl&query=id%3D%22{rid}%22')
    pids=sorted(set(re.findall(r'pid/(\d+)',x)))
    acc=sorted(set(re.findall(r'(インターネット公開|図書館送信|国立国会図書館内限定|internet|ooc|inlibrary)',x)))
    vol=re.findall(r'<dcndl:volume>.*?<rdf:value>(.*?)</rdf:value>',x,re.S)
    ext=re.findall(r'<dcterms:extent>(.*?)</dcterms:extent>',x)
    out.append(f'{rid}: pid={pids} vol={vol} extent={ext} access={acc}')
    page=get(f'https://ndlsearch.ndl.go.jp/books/{rid}')
    out.append('   page pids: '+','.join(sorted(set(re.findall(r'pid/(\d+)',page))))+' | '+' '.join(sorted(set(re.findall(r'(インターネット公開|図書館・個人送信限定|図書館送信限定|国立国会図書館内限定|個人送信)',page)))))
cands=set()
for l in out:
    cands|=set(re.findall(r"'(\d{6,8})'",l)); cands|=set(re.findall(r'(\d{7,8})',l.split('page pids:')[-1])) if 'page pids' in l else set()
for pid in sorted(cands|{'1379123','14356663','14356983','1075612','1075613','1075614','1075611'}):
    m=get(f'https://dl.ndl.go.jp/api/iiif/{pid}/manifest.json')
    lab=re.search(r'"label"\s*:\s*(\{[^}]*\}|"[^"]*")',m)
    n=len(re.findall(r'"@type"\s*:\s*"sc:Canvas"|"type"\s*:\s*"Canvas"',m))
    out.append(f'pid {pid}: {lab.group(1)[:200] if lab else m[:100]} canvases={n}')
open('work/ndl/find_v3_result.txt','w').write('\n'.join(out))
print('\n'.join(out))
