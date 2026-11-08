# 作業データから2つの版を作る（work/ で実行）
#  1) work/kokan_igaku.html … アーティファクト用（1ファイル）
#  2) ../index.html と ../sw.js … GitHub Pages（iPhoneのホーム画面アプリ）用
import glob, re, time, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
src=open('app.src.html').read()
def key(f): return [int(t) if t.isdigit() else t for t in re.split(r'([0-9]+)', f)]
data="\n".join(open(f).read() for f in sorted(glob.glob('data/data_*.js'), key=key))
body=src.replace('/*__DATA__*/',data)
open('kokan_igaku.html','w').write(body)
ver=time.strftime('%Y%m%d%H%M')
head='''<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="theme-color" content="#2c4a6b">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="皇漢医学">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>
'''
tail=f'''
<script>
const APP_VER="{ver}";
if("serviceWorker" in navigator){{window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js",{{updateViaCache:"none"}}).catch(()=>{{}}))}}
// ホーム画面アプリは閉じても裏で残り再読込されないため、表示に戻るたびに新しい版を確認する
function kkCheck(){{if(!navigator.onLine)return;fetch("index.html?v="+Date.now(),{{cache:"no-store"}}).then(r=>r.text()).then(t=>{{const m=t.match(/<!-- version ([0-9]+) -->/);if(m&&m[1]!==APP_VER){{if(navigator.serviceWorker&&navigator.serviceWorker.getRegistration)navigator.serviceWorker.getRegistration().then(g=>g&&g.update());location.reload();}}}}).catch(()=>{{}})}}
document.addEventListener("visibilitychange",()=>{{if(document.visibilityState==="visible")kkCheck()}});
window.addEventListener("load",()=>setTimeout(kkCheck,1500));
</script>
<!-- version {ver} -->
'''
html=head+body.replace('<header>','</head>\n<body>\n<header>',1)+tail+'</body>\n</html>\n'
open('../index.html','w').write(html)
open('../sw.js','w').write(open('sw.template.js').read().replace('__VER__',ver))
print('built version',ver)
