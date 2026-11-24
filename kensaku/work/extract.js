// 症例文から所見を拾う（端末の中だけで動く。ブラウザと node の両方で使う）
// ・所見辞書の言い換えを長い順に照合（重なったら長い方を採る）
// ・直後の「なし／（−）／認めず」などで否定、「消失／改善」などで経過を判定
// ・腹証は前後の「右／左／両側」を拾う
// ・「初診」「再診」「2週後」「◯月◯日」などで受診ごとに区切る
(function(root){
'use strict';

const KYU = {'藥':'薬','參':'参','薑':'姜','黃':'黄','龍':'竜','蠣':'蛎','澤':'沢','麥':'麦','歸':'帰','當':'当','陷':'陥','氣':'気','眞':'真','吳':'呉','實':'実','鹽':'塩','蔕':'蒂','圓':'円','醬':'醤','膽':'胆','續':'続','鷄':'鶏','雞':'鶏','惡':'悪','發':'発','蟲':'虫','狀':'状','證':'証','滿':'満','鞕':'硬','體':'体','靑':'青','黑':'黒','輭':'軟','莖':'茎','兒':'児','齒':'歯','衂':'衄','鬱':'鬱','濕':'湿','熱':'熱','脇':'脇','脅':'脇','臍':'臍','脉':'脈'};
// 文字数を変えずに正規化する（位置を元の文に対応させるため）
function norm(s){
  let o='';
  for(const ch of s){
    const c=ch.charCodeAt(0);
    if(c>=0xFF01&&c<=0xFF5E&&!'（）'.includes(ch)) o+=String.fromCharCode(c-0xFEE0);
    else if(ch==='　') o+=' ';
    else if(ch==='－'||ch==='―'||ch==='‐'||ch==='−') o+='-';
    else o+=(KYU[ch]||ch);
  }
  return o;
}

function makeMatcher(findings){
  const pats=[];
  for(const f of findings) for(const s of f.syn){ const n=norm(s); if(n.length) pats.push([n,f.id]); }
  pats.sort((a,b)=>b[0].length-a[0].length);
  const byId={}; for(const f of findings) byId[f.id]=f;
  return {pats, byId};
}

// 脈の連続表記（脈沈細弱、脈：浮・数 など）
const PULSE_CH={'浮':'pl_fu','沈':'pl_chin','数':'pl_saku','遅':'pl_chi','弦':'pl_gen','緊':'pl_kin','滑':'pl_katsu','渋':'pl_jyu','濇':'pl_jyu','細':'pl_sai','微':'pl_bi','弱':'pl_kyo','虚':'pl_kyo','実':'pl_jitsu','大':'pl_dai','洪':'pl_dai','緩':'pl_kan','芤':'pl_ko','結':'pl_ketsudai','代':'pl_ketsudai','促':'pl_ketsudai'};
const PULSE_RE=/脈(?:は|が|状|象|診)?[\s:：]*((?:[浮沈数遅弦緊滑渋濇細微弱虚実大洪緩芤結代促]|有力|無力|やや|かつ|にして|而|で|[・、,\/\s])+)/g;
const NORMAL_RE=/(薄白苔|薄い白苔|白苔薄|淡紅舌|舌(?:質|色)?[\s:：は]*淡紅|苔薄白|特記すべき(?:所見|事項)?なし|異常なし|正常範囲)/g;
const TONGUE_RE=/舌(?:質|色|は|が)?[\s:：]*(?:やや)?(淡白|淡紅|暗紅|暗赤|暗紫|紫|紅|淡)/g;
const TONGUE_CH={'淡白':'t_tanpaku','淡':'t_tanpaku','紅':'t_ko','暗紅':'t_anshi','暗赤':'t_anshi','暗紫':'t_anshi','紫':'t_anshi'};
const FUKURYOKU_RE=/腹力[\s:：はが]*(?:は)?\s*([0-9])(?:\.[0-9])?\s*\/\s*5/g;

const BOUND=/[。，,；;\n\/／]/;
const NEG=/(なし|無し|ない|なく|無く|認めず|認めない|みられない|見られない|みとめず|せず|しない|ありません|ないです|\(-\)|（-）|\(−\)|（−）|陰性|否定|-$|マイナス)/;
const GONE=/(消失|なくなっ|無くなっ|治まっ|おさまっ|収まっ|取れ|とれた|治癒|消え|止まっ|とまっ|出なくなっ|しなくなっ)/;
const BETTER=/(改善|軽快|軽減|楽になっ|和らい|やわらい|減少|良くなっ|よくなっ|減っ|弱まっ|少なくなっ)/;
const WORSE=/(増悪|悪化|ひどくなっ|強くなっ|増え|出現|再燃)/;
const AFFIRM=/(あり|有り|ある|あって|認め(?!ず|な)|みられ(?!な)|見られ(?!な)|強い|著明|訴え|自覚|\(\+\)|（\+）|＋)/;

function findSide(t, s, e){
  const after=t.slice(e, Math.min(t.length,e+10)).split(/[。，,；;\n、\/／]/)[0];
  const before=t.slice(Math.max(0,s-6), s).split(/[。，,；;\n、]/).pop();
  const m=(after.match(/両側|両|右|左/)||before.match(/両側|両|右|左/));
  if(!m) return '';
  const both=/右.{0,3}[>＞≧=].{0,3}左|左.{0,3}[>＞≧=].{0,3}右|左右/.test(after+before);
  if(both||m[0]==='両'||m[0]==='両側') return '両';
  return m[0];
}

// 1つの文から所見の位置を拾う
function extractSpans(text, M){
  const t=norm(text); const n=t.length; const taken=new Uint8Array(n); const spans=[];
  const push=(s,e,fid,extra)=>{ for(let i=s;i<e;i++) taken[i]=1; spans.push(Object.assign({s,e,fid},extra||{})); };
  // 正常の表現は拾わない（薄白苔・淡紅舌など）
  let m;
  NORMAL_RE.lastIndex=0;
  while((m=NORMAL_RE.exec(t))){ for(let i=m.index;i<m.index+m[0].length;i++) taken[i]=1; }
  // 脈の連続表記
  PULSE_RE.lastIndex=0;
  while((m=PULSE_RE.exec(t))){
    const s=m.index, e=m.index+m[0].length; const run=m[1]; const seen=new Set();
    if(/有力/.test(run)) seen.add('pl_jitsu'); if(/無力/.test(run)) seen.add('pl_kyo');
    for(const ch of run.replace(/有力|無力/g,'')) if(PULSE_CH[ch]) seen.add(PULSE_CH[ch]);
    if(!seen.size) continue;
    for(let i=s;i<e;i++) taken[i]=1;
    for(const fid of seen) spans.push({s,e,fid});
  }
  // 腹力 ◯/5
  FUKURYOKU_RE.lastIndex=0;
  while((m=FUKURYOKU_RE.exec(t))){
    const v=+m[1]; const fid=v>=4?'ab_fukuryoku_jitsu':v<=2?'ab_fukuryoku_kyo':'ab_fukuryoku_chu';
    push(m.index,m.index+m[0].length,fid);
  }
  // 舌の色（舌：淡白、舌質暗紅 など）
  TONGUE_RE.lastIndex=0;
  while((m=TONGUE_RE.exec(t))){
    const w=m[1]; const fid = TONGUE_CH[w]; if(!fid) continue;
    const s=m.index+m[0].length-w.length; push(s,s+w.length,fid);
  }
  // 辞書（長い語から）
  for(const [p,fid] of M.pats){
    let from=0, i;
    while((i=t.indexOf(p,from))>=0){
      from=i+1; let free=true; for(let k=i;k<i+p.length;k++) if(taken[k]){free=false;break;}
      if(!free) continue;
      push(i,i+p.length,fid);
    }
  }
  spans.sort((a,b)=>a.s-b.s);
  // 否定・経過・左右
  for(let k=0;k<spans.length;k++){
    const sp=spans[k];
    const nextStart = spans.slice(k+1).find(x=>x.s>=sp.e);
    let end=Math.min(n, sp.e+16); if(nextStart && nextStart.s<end) end=nextStart.s;
    let win=t.slice(sp.e,end); const b=win.search(BOUND); if(b>=0) win=win.slice(0,b);
    // 「、」は否定の範囲を切るが、「（−）」は手前の読点のあとにも書かれるので1つ先まで見る
    const winC=win.split('、')[0];
    const aff=winC.search(AFFIRM), neg=winC.search(NEG), gone=winC.search(GONE), better=winC.search(BETTER), worse=winC.search(WORSE);
    const first=(i)=>i>=0 && (aff<0 || i<aff);
    sp.state='pos';
    if(first(gone)) sp.state='gone';
    else if(first(neg)) sp.state='neg';
    else if(first(better)) sp.state='better';
    else if(worse>=0) sp.state='worse';
    // 直前の否定（「無」「非」）
    const pre=t.slice(Math.max(0,sp.s-2),sp.s);
    if(/(^|[^有])無$/.test(pre) && sp.state==='pos' && !/^無/.test(t.slice(sp.s))) sp.state='neg';
    if(sp.fid.startsWith('ab_') && !sp.fid.startsWith('ab_fukuryoku')) sp.side=findSide(t,sp.s,sp.e);
  }
  return spans;
}

// 見出しで区切る
const HEAD=/^[\s]*(?:[【\[［〈<(（]\s*)?(初診時?|初回|再診|再来|前医|主訴|現病歴|現症|既往歴|家族歴|生活歴|嗜好|アレルギー歴?|身体所見|漢方医学的所見|和漢診療学的所見|東洋医学的所見|所見|検査所見|検査|治療経過|経過|処方|治療|考察|#\s*[0-9]+|第\s*[0-9]+\s*(?:診|回)(?:目)?|[0-9]+\s*診(?:目)?|(?:20|19)?[0-9]{2}\s*[\/年.\-]\s*[0-9]{1,2}(?:\s*[\/月.\-]\s*[0-9]{1,2}\s*日?)?|[0-9]{1,2}\s*月\s*[0-9]{1,2}\s*日|[0-9]{1,2}\s*\/\s*[0-9]{1,2}|(?:投与|服用|内服|治療|処方)?(?:開始)?(?:から|より)?\s*[0-9]+\s*(?:日|週|週間|か月|ヶ月|カ月|ヵ月|箇月|年)\s*(?:後|目)|(?:その|さらに|更に)?\s*[0-9]+\s*(?:日|週|週間|か月|ヶ月|カ月|ヵ月|年)\s*(?:後|目))/;
const SKIP_H=/^(既往歴|家族歴|生活歴|嗜好|アレルギー|考察)/;
const INIT_H=/^(初診|初回|主訴|現病歴|現症|身体所見|漢方医学的所見|和漢診療学的所見|東洋医学的所見|所見|検査)/;

function splitSegments(text){
  const t=norm(text);
  // 文に分ける（改行と句点）。位置は保つ
  const sents=[]; let st=0;
  for(let i=0;i<=t.length;i++){
    if(i===t.length || t[i]==='\n' || t[i]==='。'){
      const e = (i<t.length && t[i]==='。') ? i+1 : i;
      if(e>st && t.slice(st,e).trim()) sents.push([st,e]);
      st = (i<t.length && t[i]==='。') ? i+1 : i+1;
    }
  }
  return {t, sents};
}

// 症例文全体を受診ごとに分けて所見を拾う
function analyzeCase(text, M, rxNames){
  const {t, sents}=splitSegments(text);
  const visits=[{idx:0,label:'初診',sents:[],spans:[],rx:[]}];
  const ctx=[]; // 既往歴・家族歴など（参考）
  let mode='visit', started=false, cur=visits[0], chief=false;
  for(const [s,e] of sents){
    const seg=t.slice(s,e); const h=seg.match(HEAD); chief=false;
    if(h){
      const lab=h[1].replace(/\s+/g,'');
      chief = (lab==='主訴');
      if(SKIP_H.test(lab)) mode='skip';
      else if(INIT_H.test(lab)) { mode='visit'; if(started && /^初診|^初回/.test(lab)===false){} }
      else if(/^(治療経過|経過)$/.test(lab)) { mode='visit'; started=true; }
      else if(/^(処方|治療)$/.test(lab)) { mode='visit'; started=true; }
      else if(/^(初診|初回)/.test(lab)) { mode='visit'; cur=visits[0]; }
      else { // 日付・期間・再診
        const isFirst=/初診/.test(seg);
        if(isFirst){ mode='visit'; cur=visits[0]; }
        else if(started || /^(再診|再来|第|[0-9]+診|#)/.test(lab) || /(後|目)$/.test(lab)){
          mode='visit'; started=true;
          cur={idx:visits.length,label:lab,sents:[],spans:[],rx:[]}; visits.push(cur);
        }
      }
    }
    const spans=extractSpans(seg,M).map(x=>Object.assign(x,{s:x.s+s,e:x.e+s,chief:chief&&mode!=='skip'}));
    // 方剤名
    const rx=[]; for(const [nm,key] of (rxNames||[])){ let i=seg.indexOf(nm); if(i>=0 && !rx.some(r=>r.key===key)) rx.push({name:nm,key,s:i+s,e:i+s+nm.length}); }
    if(rx.length){ started=true; }
    if(mode==='skip'){ ctx.push({s,e,spans}); continue; }
    cur.sents.push([s,e]); cur.spans.push(...spans); cur.rx.push(...rx.filter(r=>!cur.rx.some(q=>q.key===r.key)));
  }
  // 受診ごとの所見の状態（同じ受診内では後の記載を採る）
  for(const v of visits){
    const st={};
    for(const sp of v.spans){ const o=st[sp.fid]||{fid:sp.fid,sides:new Set(),spans:[]}; o.state=sp.state; if(sp.chief) o.chief=true; if(sp.side) o.sides.add(sp.side); o.spans.push(sp); st[sp.fid]=o; }
    v.status=st;
  }
  return {text:t, visits, ctx};
}

// v回目の受診時点の所見（それ以前の記載を引き継ぎ、「なし」「消失」で外す）
function stateAt(an, vi){
  const cur={};
  for(let i=0;i<=vi && i<an.visits.length;i++){
    for(const [fid,o] of Object.entries(an.visits[i].status)){
      if(o.state==='neg'||o.state==='gone'){ delete cur[fid]; continue; }
      const side=o.sides.size? (o.sides.size>1?'両':[...o.sides][0]) : (cur[fid]&&cur[fid].side)||'';
      cur[fid]={fid, side, state:o.state, from:i, carried:false, chief:!!(o.chief||(cur[fid]&&cur[fid].chief))};
    }
    for(const fid in cur) if(cur[fid].from<i && !(fid in an.visits[i].status)) cur[fid].carried=true;
  }
  return cur;
}

const api={norm, makeMatcher, extractSpans, analyzeCase, stateAt};
if(typeof module!=='undefined' && module.exports) module.exports=api; else root.KX=api;
})(typeof window!=='undefined'?window:this);
