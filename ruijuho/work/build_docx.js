// 類聚方広義 Word 版（条文・主治・煎法＝書き下し文、頭注＝現代語訳）： node ruijuho/work/build_docx.js
// 皇漢医学の Word 版（work/build_docx.js）と同じ体裁。出力：ruijuho/work/類聚方広義_書き下し・現代語訳.docx
const fs=require('fs'), path=require('path'), vm=require('vm');
const {Document,Packer,Paragraph,TextRun,HeadingLevel,AlignmentType,Footer,PageNumber,PageBreak,TableOfContents}=require('docx');
const dir=path.join(__dirname,'data');
const files=fs.readdirSync(dir).filter(f=>/^data_.*\.js$/.test(f)).sort();
const ctx={window:{}}; vm.createContext(ctx);
files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(dir,f),'utf8'),ctx));
const D=ctx.window.RUIJU_DATA.slice().sort((a,b)=>a.no-b.no);
const MIN='Yu Mincho', GO='Yu Gothic', AI='6B3E26';
const r=(t,o={})=>new TextRun({text:t,font:{ascii:MIN,eastAsia:MIN,hAnsi:MIN},...o});
const P=(t,o={})=>String(t||'').split('\n').filter(x=>x.trim()).map(x=>new Paragraph({children:[r(x,o.run||{})],spacing:{after:100,line:340},indent:o.indent,...(o.para||{})}));
const label=t=>new Paragraph({children:[r(t,{bold:true,color:AI})],spacing:{before:160,after:60},keepNext:true});
const H1=t=>new Paragraph({heading:HeadingLevel.HEADING_1,children:[r(t)],pageBreakBefore:true});
const H2=t=>new Paragraph({heading:HeadingLevel.HEADING_2,children:[r(t)]});
const note=t=>new Paragraph({children:[r(t,{size:18,color:'666666'})],spacing:{after:80}});
const IND={left:360}, IND2={left:720};
const tochu=(t,head)=>{ // 頭注は現代語訳（全文）
  out.push(new Paragraph({children:[r('〔頭注〕',{bold:true,color:'B23A2A'}),r(head||t.head||'',{bold:true,size:20}),r(t.koma?`（コマ${t.koma}）`:'',{size:18,color:'666666'})],indent:IND,spacing:{before:60,after:40},keepNext:true}));
  out.push(...P(t.yaku,{indent:IND2}));
};
const out=[];
out.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:2400,after:400},children:[r('類聚方広義',{size:56,bold:true})]}));
out.push(new Paragraph({alignment:AlignmentType.CENTER,children:[r('尾台榕堂 著　―　条文書き下し・頭注現代語訳',{size:26})]}));
out.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:600},children:[r('底本：京都大学附属図書館所蔵（富士川文庫）『類聚方広義』　画像：京都大学貴重資料デジタルアーカイブ',{size:20,color:'555555'})]}));
out.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:200},children:[r('凡例：主治・煎法・条文は書き下し文、上段の頭注（尾台榕堂）は現代語訳（全文）で記す。「」は東洞が本書で括弧に囲んだ部分。コマは同アーカイブの画像番号（R＝右頁、L＝左頁）。「要確認」は判読に不確実な点などを示す。',{size:20,color:'555555'})]}));
out.push(new Paragraph({children:[new PageBreak()]}));
out.push(new TableOfContents('目次',{hyperlink:true,headingStyleRange:'1-2'}));

function entry(e){
  out.push(H2(`${e.no}　${e.title}（${e.yomi}）`));
  out.push(note(`原本コマ ${e.komaNote}`));
  (e.tochu||[]).forEach(t=>tochu(t));
  out.push(label('主治')); out.push(...P(e.shuchi.kaki,{indent:IND,run:{size:23}}));
  const H=e.houzai;
  out.push(label('処方'));
  out.push(...P(H.herbs.map(x=>`${x.name} ${x.ryo}`).join('　'),{indent:IND,run:{size:23}}));
  out.push(...P('（今用）'+H.herbs.map(x=>`${x.name} ${x.ima}`).join('　'),{indent:IND,run:{size:20,color:'555555'}}));
  out.push(label('煎法')); out.push(...P(H.kaki,{indent:IND}));
  (H.tochu||[]).forEach(t=>tochu(t));
  (e.joubun||[]).forEach((j,i)=>{
    out.push(label(`条文${i+1}　『${j.src}』（コマ${j.koma}）`));
    out.push(...P(j.kaki,{indent:IND,run:{size:23}}));
    if(j.an){ out.push(new Paragraph({children:[r('〔東洞按〕',{bold:true,color:'555555'})],indent:IND,spacing:{after:40},keepNext:true})); out.push(...P(j.an.kaki,{indent:IND2})); }
    (j.tochu||[]).forEach(t=>tochu(t,''));
  });
  if(e.check&&e.check.length) out.push(note('要確認：'+e.check.join('／')));
}
let g=null;
D.forEach(e=>{ if(e.group!==g){ g=e.group; out.push(H1(g)); } entry(e); });

const doc=new Document({
  features:{updateFields:true}, creator:'栗原智', title:'類聚方広義 書き下し・現代語訳',
  styles:{default:{document:{run:{font:MIN,size:21}}},
    paragraphStyles:[
      {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:GO,size:36,bold:true,color:'2A2420'},paragraph:{spacing:{before:240,after:240},keepNext:true,outlineLevel:0}},
      {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:GO,size:30,bold:true,color:AI},paragraph:{spacing:{before:480,after:80},keepNext:true,outlineLevel:1,border:{bottom:{style:'single',size:6,color:AI,space:2}}}}]},
  sections:[{properties:{page:{margin:{top:1134,bottom:1134,left:1134,right:1134}}},
    footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({children:[PageNumber.CURRENT],size:18})]})]})},
    children:out}]});
Packer.toBuffer(doc).then(b=>{const o=path.join(__dirname,'類聚方広義_書き下し・現代語訳.docx');fs.writeFileSync(o,b);console.log('written',o,D.length,'entries');});
