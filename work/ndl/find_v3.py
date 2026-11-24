# 第3回：デジタルコレクション側（R100000039）の『皇漢医学』をすべて列挙し、公開範囲を確認
import urllib.request, urllib.parse, re
out=[]
def get(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=60) as r: return r.read().decode('utf-8','replace')
    except Exception as e: return 'ERR '+str(e)
seen=set()
for q in ['title=皇漢医学','title=皇漢醫學','title=皇漢医学&creator=湯本','any=皇漢医学 第3巻 湯本']:
    for dp in ['iss-ndl-digital','']:
        u='https://ndlsearch.ndl.go.jp/api/opensearch?cnt=200&'+'&'.join(k+'='+urllib.parse.quote(v) for k,v in [p.split('=') for p in q.split('&')])+(f'&dpid={dp}' if dp else '')
        x=get(u)
        for item in re.findall(r'<item>(.*?)</item>',x,re.S):
            link=' '.join(re.findall(r'<link>(.*?)</link>',item))
            if link in seen: continue
            seen.add(link)
            t=' '.join(re.findall(r'<(?:title|dcndl:volume|dc:publisher|dcterms:issued|dcndl:edition)>(.*?)</',item))
            if '皇漢' not in t and '皇汉' not in t: continue
            pids=sorted(set(re.findall(r'pid/(\d+)',item)))
            out.append(f'- {t} | pid={",".join(pids)} | {link}')
# 親レコード 743107（第2至3巻 昭和3）の頁から子資料を拾う
for rid in ['R100000002-I000000743107']:
    p=get(f'https://ndlsearch.ndl.go.jp/books/{rid}')
    out.append('743107 links: '+' '.join(sorted(set(re.findall(r'/books/(R1000000\d\d-I[\w-]+)',p)))))
    out.append('743107 text: '+re.sub(r'<[^>]+>',' ',p)[:0])
    for m in re.finditer(r'(第\d巻[^<]{0,40})',p): out.append('  '+m.group(1))
open('work/ndl/find_v3_result.txt','w').write('\n'.join(out))
print('\n'.join(out))
