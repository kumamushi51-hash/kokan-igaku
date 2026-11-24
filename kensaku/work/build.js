// 漢方 統合検索：3冊のデータから検索用の索引を作り、アプリを組み立てる
//   node kensaku/work/build.js
// 出力：kensaku/index.html, kensaku/sw.js（GitHub Pages 用）, kensaku/work/kensaku.html（単体で開ける版）
//       kensaku/work/notes/未対応タグ.txt（所見辞書に当たらなかったタグ。辞書を足すときの手がかり）
const fs=require('fs'), path=require('path');
const W=__dirname, APP=path.resolve(W,'..');
const load=require('./load.js'), N=require('./names.js'), X=require('./extract.js');
const {CATS, FINDINGS, SHOKEN_MAP, fukuryoku}=require('./findings.js');

const {K,R,F}=load();
const M=X.makeMatcher(FINDINGS);
const BOOKS={R:{name:'類聚方広義',path:'../ruijuho/'},K:{name:'皇漢医学',path:'../'},F:{name:'腹証奇覧',path:'../fukusho/'}};

// ---- 1. 方剤の対応表
const entries=[...R.map(x=>['R',x]),...K.filter(x=>x.kind==='方剤').map(x=>['K',x]),...F.filter(x=>x.kind==='方剤').map(x=>['F',x])];
const known=new Set();
for(const [b,x] of entries){ const p=N.parseTitle(x.title); p.main.forEach(m=>known.add(m)); p.alias.forEach(a=>known.add(a)); }
const FORM=new Map();
const get=(key)=>{ if(!FORM.has(key)) FORM.set(key,{key,name:key,yomi:'',alias:new Set(),books:{R:[],K:[],F:[]},fu:[],ev:{},contra:{},herbs:''}); return FORM.get(key); };

const addEv=(f,fid,rec)=>{ (f.ev[fid]=f.ev[fid]||[]).push(rec); };
const unmapped={};

function mapText(text){ // 文から所見を拾う（否定は除く）
  return X.extractSpans(text,M).filter(s=>s.state!=='neg'&&s.state!=='gone');
}

for(const [b,x] of entries){
  const p=N.parseTitle(x.title);
  const mains=p.main.length?p.main:[N.canon(x.title)];
  for(const key of mains){
    const f=get(key);
    p.alias.forEach(a=>{ if(a!==key) f.alias.add(a); });
    const ref={id:x.id,title:x.title};
    if(b==='F' && x.fig) ref.fig=x.fig.src;
    f.books[b].push(ref);
    if(!f.yomi && x.yomi && mains.length===1) f.yomi=x.yomi;
    if(b==='R' && x.houzai && x.houzai.herbs) f.herbs=x.houzai.herbs.map(h=>h.name).join('・');
    if(b==='K' && !f.herbs && x.houzai && x.houzai.comp) f.herbs=x.houzai.comp;
    if(b==='R' && x.shuchi) f.shuchi=x.shuchi.yaku;
    // タグ
    for(const tag of (x.tags||[])){
      const contra=/^禁忌[:：]/.test(tag);
      const sp=mapText(tag.replace(/^禁忌[:：]/,''));
      if(!sp.length){ unmapped[tag]=(unmapped[tag]||0)+1; continue; }
      for(const fid of new Set(sp.map(s=>s.fid))){
        const side=(sp.find(s=>s.fid===fid&&s.side)||{}).side||'';
        if(contra) (f.contra[fid]=f.contra[fid]||[]).push([b,x.id,tag]);
        else addEv(f,fid,[b,x.id,'タグ',tag,side]);
      }
    }
    // 類聚方広義：主治の文
    if(b==='R' && x.shuchi && x.shuchi.yaku){
      for(const s of mapText(x.shuchi.yaku)){ addEv(f,s.fid,[b,x.id,'主治',x.shuchi.yaku.slice(Math.max(0,s.s-12),s.e+12),s.side||'']); }
    }
    // 条文の書き下しから脈を拾う（両書）
    if((b==='R'||b==='K') && Array.isArray(x.joubun)){
      for(const j of x.joubun){ const t=j.kaki||''; for(const s of mapText(t)) if(s.fid.startsWith('pl_')) addEv(f,s.fid,[b,x.id,'条文',t.slice(Math.max(0,s.s-10),s.e+10),'']); }
    }
    // 皇漢医学：腹証の論（腹証の所見だけ採る）
    if(b==='K' && x.fukusho && x.fukusho.text){
      const t=x.fukusho.text;
      for(const s of mapText(t)) if(s.fid.startsWith('ab_')) addEv(f,s.fid,[b,x.id,'腹証',t.slice(Math.max(0,s.s-14),s.e+14).replace(/\n/g,' '),s.side||'']);
    }
    // 腹証奇覧：整理済みの腹証所見
    if(b==='F'){
      for(const s of (x.shoken||[])){
        let fid=SHOKEN_MAP[s.k];
        if(s.k==='腹力') fid=fukuryoku(s.w);
        if(!fid) continue;
        addEv(f,fid,[b,x.id,s.src==='図'?'腹証図':'腹証',s.w,s.side||'',s.sure===false?1:0]);
      }
    }
  }
  for(const raw of p.fu){
    const key=N.resolveRel(raw,mains[0]||'',known);
    get(key).fu.push([b,x.id,x.title]);
  }
}

// 同じ所見に同じ本から重複した根拠は1つの本として数える（表示は全部）
for(const k of Object.keys(N.EXTRACT)) if(!FORM.has(k)) console.warn('エキス対応表の方剤が索引にない:',k);
const list=[...FORM.values()].map(f=>({
  ext: (f.key in N.EXTRACT) ? (N.EXTRACT[f.key]||f.key) : '',
  key:f.key, name:f.name, yomi:f.yomi, alias:[...f.alias], herbs:f.herbs||'', shuchi:f.shuchi||'',
  books:f.books, fu:f.fu, ev:f.ev, contra:f.contra
})).sort((a,b)=>(a.yomi||a.name).localeCompare(b.yomi||b.name,'ja'));

// 方剤名の照合用（症例文の中の処方名）
const rxNames=[];
for(const f of list){ for(const nm of [f.name,...f.alias]) rxNames.push([nm,f.key]); }
rxNames.sort((a,b)=>b[0].length-a[0].length);

// ---- 2. 未対応タグの一覧
fs.mkdirSync(path.join(W,'notes'),{recursive:true});
const um=Object.entries(unmapped).sort((a,b)=>b[1]-a[1]);
fs.writeFileSync(path.join(W,'notes/未対応タグ.txt'),
  '# 所見辞書（findings.js）に当たらなかったタグ（出現数順）。病名・治療状況などは当たらなくてよい\n'+um.map(([t,n])=>n+'\t'+t).join('\n')+'\n');
const totalTags=entries.reduce((a,[b,x])=>a+(x.tags||[]).length,0);
const umCount=um.reduce((a,[,n])=>a+n,0);

// ---- 3. アプリの組み立て
const DATA={ver:'', books:BOOKS, cats:CATS, findings:FINDINGS, formulas:list.filter(f=>Object.keys(f.ev).length||f.books.R.length||f.books.K.length||f.books.F.length), allFormulas:list.map(f=>f.key), rxNames};
if(process.argv.includes('--stats')){
  console.log('方剤',list.length,'根拠あり',list.filter(f=>Object.keys(f.ev).length).length,'タグ',totalTags,'未対応',umCount,(100*umCount/totalTags).toFixed(1)+'%','種類',um.length);
  process.exit(0);
}
const ver=new Date().toISOString().replace(/[-:T]/g,'').slice(0,12);
DATA.ver=ver;
const src=fs.readFileSync(path.join(W,'app.src.html'),'utf8');
const ext=fs.readFileSync(path.join(W,'extract.js'),'utf8');
const body=src.replace('/*__DATA__*/',()=> 'window.KS_DATA='+JSON.stringify(DATA)+';').replace('/*__EXTRACT__*/',()=>ext);
fs.writeFileSync(path.join(W,'kensaku.html'),body);
const head=`<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="theme-color" content="#2f4f5f">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="漢方検索">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
`;
const tail=`
<script>
const APP_VER="${ver}";
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js",{updateViaCache:"none"}).catch(()=>{}))}
function kkCheck(){if(!navigator.onLine)return;fetch("index.html?v="+Date.now(),{cache:"no-store"}).then(r=>r.text()).then(t=>{const m=t.match(/<!-- version ([0-9]+) -->/);if(m&&m[1]!==APP_VER){if(navigator.serviceWorker&&navigator.serviceWorker.getRegistration)navigator.serviceWorker.getRegistration().then(g=>g&&g.update());if(!window.KS_DIRTY)location.reload();}}).catch(()=>{})}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")kkCheck()});
window.addEventListener("load",()=>setTimeout(kkCheck,1500));
</script>
<!-- version ${ver} -->
`;
const html=body.replace('<!--__PWA_HEAD__-->',head).replace('</body>',tail+'</body>');
fs.writeFileSync(path.join(APP,'index.html'),html);
fs.writeFileSync(path.join(APP,'sw.js'),fs.readFileSync(path.join(W,'sw.template.js'),'utf8').replace('__VER__',ver));
console.log('built',ver,'方剤',DATA.formulas.length,'未対応タグ',umCount+'/'+totalTags);
