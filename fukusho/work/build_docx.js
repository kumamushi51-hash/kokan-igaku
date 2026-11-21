// 腹証奇覧 Word 版（腹証図＋図の説明、本文・頭注＝書き下し文と現代語訳、腹証所見）： node fukusho/work/build_docx.js
// 類聚方広義の Word 版（ruijuho/work/build_docx.js）と同じ体裁。腹証図は data の fig・figs をすべて入れる。
// 出力：fukusho/work/腹証奇覧_書き下し・現代語訳.docx
const fs=require('fs'), path=require('path'), vm=require('vm');
const {Document,Packer,Paragraph,TextRun,HeadingLevel,AlignmentType,Footer,PageNumber,PageBreak,TableOfContents,
  ImageRun,Table,TableRow,TableCell,WidthType,BorderStyle}=require('docx');
const dir=path.join(__dirname,'data'), IMG=path.join(__dirname,'..');
const files=fs.readdirSync(dir).filter(f=>/^data_.*\.js$/.test(f)).sort();
const ctx={window:{}}; vm.createContext(ctx);
files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(dir,f),'utf8'),ctx));
const D=ctx.window.FUKU_DATA.slice().sort((a,b)=>a.no-b.no);
const MIN='Yu Mincho', GO='Yu Gothic', AI='3F5E3A';
const r=(t,o={})=>new TextRun({text:t,font:{ascii:MIN,eastAsia:MIN,hAnsi:MIN},...o});
const P=(t,o={})=>String(t||'').split('\n').filter(x=>x.trim()).map(x=>new Paragraph({children:[r(x,o.run||{})],spacing:{after:100,line:340},indent:o.indent,...(o.para||{})}));
const label=t=>new Paragraph({children:[r(t,{bold:true,color:AI})],spacing:{before:160,after:60},keepNext:true});
const sub=t=>new Paragraph({children:[r(t,{bold:true,size:19,color:'777777'})],indent:IND,spacing:{before:40,after:20},keepNext:true});
const H1=t=>new Paragraph({heading:HeadingLevel.HEADING_1,children:[r(t)],pageBreakBefore:true});
const H2=t=>new Paragraph({heading:HeadingLevel.HEADING_2,children:[r(t)]});
const note=t=>new Paragraph({children:[r(t,{size:18,color:'666666'})],spacing:{after:80}});
const IND={left:360}, IND2={left:720};
const missing=[];

// JPEG の幅・高さを読む
function jpgSize(buf){
  let i=2;
  while(i<buf.length){
    if(buf[i]!==0xFF){i++;continue;}
    const m=buf[i+1], len=buf.readUInt16BE(i+2);
    if(m>=0xC0&&m<=0xCF&&m!==0xC4&&m!==0xC8&&m!==0xCC) return {h:buf.readUInt16BE(i+5),w:buf.readUInt16BE(i+7)};
    i+=2+len;
  }
  throw new Error('JPEG size not found');
}
function figure(f){
  const p=path.join(IMG,f.src);
  if(!fs.existsSync(p)){ missing.push(f.src); out.push(note('（図の画像なし：'+f.src+'）')); return; }
  const buf=fs.readFileSync(p), s=jpgSize(buf);
  const H=430, W=Math.round(s.w*H/s.h); // 高さ約11.4cm にそろえる
  out.push(new Paragraph({alignment:AlignmentType.CENTER,keepNext:true,spacing:{before:120,after:60},
    children:[new ImageRun({type:'jpg',data:buf,transformation:{width:W,height:H}})]}));
  out.push(new Paragraph({alignment:AlignmentType.CENTER,keepNext:true,spacing:{after:60},
    children:[r(f.label||'',{bold:true,size:21}),r(f.koma?`（コマ${f.koma}）`:'',{size:18,color:'666666'})]}));
  out.push(...P(f.desc,{indent:IND,run:{size:20,color:'333333'}}));
}
const tochu=t=>{ // 頭注：書き下し文と現代語訳
  out.push(new Paragraph({children:[r('〔頭注〕',{bold:true,color:'B23A2A'}),r(t.head||'',{bold:true,size:20}),r(t.koma?`（コマ${t.koma}）`:'',{size:18,color:'666666'})],indent:IND,spacing:{before:80,after:40},keepNext:true}));
  if(t.kaki){ out.push(sub('書き下し')); out.push(...P(t.kaki,{indent:IND2,run:{size:22}})); }
  if(t.yaku){ out.push(sub('現代語訳')); out.push(...P(t.yaku,{indent:IND2})); }
};
const cell=(t,o={})=>new TableCell({children:[new Paragraph({children:[r(String(t||''),{size:18,...o})]})],
  margins:{top:40,bottom:40,left:80,right:80}});
function shokenTable(list){
  const head=new TableRow({tableHeader:true,children:['所見','原本の記載','出典','注'].map(h=>cell(h,{bold:true,color:AI}))});
  const rows=list.map(s=>{
    let k=s.k+(s.side?`（${s.side}）`:'')+(s.lv?`〔腹力：${[].concat(s.lv).join('・')}〕`:'');
    if(s.neg) k='（本方にない）'+k;
    if(s.sure===false) k+=' ※参考';
    return new TableRow({children:[cell(k,{bold:true}),cell(s.w),cell((s.src||'')+(s.koma?' コマ'+s.koma:'')),cell(s.note||'')]});
  });
  const b={style:BorderStyle.SINGLE,size:4,color:'BBBBBB'};
  return new Table({width:{size:100,type:WidthType.PERCENTAGE},columnWidths:[2000,3800,1500,2300],
    borders:{top:b,bottom:b,left:b,right:b,insideHorizontal:b,insideVertical:b},rows:[head,...rows]});
}

const out=[];
out.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:2400,after:400},children:[r('腹証奇覧',{size:56,bold:true})]}));
out.push(new Paragraph({alignment:AlignmentType.CENTER,children:[r('稲葉文礼 著（翼：和久田叔虎 著）　―　腹証図・書き下し・現代語訳',{size:26})]}));
out.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:600},children:[r('底本：京都大学附属図書館所蔵『腹証奇覧』（腹証奇覧翼つき11冊本 RB00004916。後編上巻は別本 RB00004915 で補う）　画像：京都大学貴重資料デジタルアーカイブ',{size:20,color:'555555'})]}));
out.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:200},children:[r('凡例：各項に原本の腹証図をすべて載せ、図の彩色の位置を説明する。本文・頭注は、漢字カタカナ交じり文をひらがなに直した書き下し文と現代語訳を並べる。腹証所見は原本の記載から項目ごとに拾ったもので、「※参考」は部位などから当てたもの、「（本方にない）」は鑑別として本方にない所見。コマは同アーカイブの画像番号（R＝右頁、L＝左頁、b＝別本）。「要確認」は判読に不確実な点などを示す。',{size:20,color:'555555'})]}));
out.push(new Paragraph({children:[new PageBreak()]}));
out.push(new TableOfContents('目次',{hyperlink:true,headingStyleRange:'1-2'}));

function entry(e){
  const num=e.kind==='総論'?'総論':`第${e.no}図`;
  out.push(H2(`${num}　${e.title}（${e.yomi}）`));
  out.push(note(`${e.kind}　原本コマ ${e.komaNote||''}`));
  if(e.fig) figure(e.fig);
  (e.figs||[]).forEach(figure);
  if(e.shoken&&e.shoken.length){ out.push(label('腹証所見')); out.push(shokenTable(e.shoken)); }
  (e.paras||[]).forEach(p=>{
    out.push(label(`${p.head||''}${p.koma?`（コマ${p.koma}）`:''}`));
    if(p.kaki){ out.push(sub('書き下し')); out.push(...P(p.kaki,{indent:IND,run:{size:22}})); }
    if(p.yaku){ out.push(sub('現代語訳')); out.push(...P(p.yaku,{indent:IND})); }
  });
  (e.tochu||[]).forEach(tochu);
  if(e.check&&e.check.length) out.push(note('要確認：'+e.check.join('／')));
}
let g=null;
D.forEach(e=>{ if(e.group!==g){ g=e.group; out.push(H1(g)); } entry(e); });

const doc=new Document({
  features:{updateFields:true}, creator:'栗原智', title:'腹証奇覧 腹証図・書き下し・現代語訳',
  styles:{default:{document:{run:{font:MIN,size:21}}},
    paragraphStyles:[
      {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:GO,size:36,bold:true,color:'2A2420'},paragraph:{spacing:{before:240,after:240},keepNext:true,outlineLevel:0}},
      {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:GO,size:30,bold:true,color:AI},paragraph:{spacing:{before:480,after:80},keepNext:true,outlineLevel:1,pageBreakBefore:true,border:{bottom:{style:'single',size:6,color:AI,space:2}}}}]},
  sections:[{properties:{page:{margin:{top:1134,bottom:1134,left:1134,right:1134}}},
    footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({children:[PageNumber.CURRENT],size:18})]})]})},
    children:out}]});
const nfig=D.reduce((n,e)=>n+(e.fig?1:0)+(e.figs||[]).length,0);
Packer.toBuffer(doc).then(b=>{const o=path.join(__dirname,'腹証奇覧_書き下し・現代語訳.docx');fs.writeFileSync(o,b);
  console.log('written',o,D.length,'entries',nfig,'figures',missing.length?'MISSING '+missing.join(','):'all images ok');});
