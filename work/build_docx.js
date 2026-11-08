// 作業データから Word 版（古典＝書き下し文、それ以外＝現代語訳）を作る： node work/build_docx.js
const fs=require('fs'), path=require('path'), vm=require('vm');
const {Document,Packer,Paragraph,TextRun,HeadingLevel,AlignmentType,Footer,PageNumber,PageBreak,TableOfContents}=require('docx');
const dir=path.join(__dirname,'data');
const key=f=>f.split(/(\d+)/).map(t=>/^\d+$/.test(t)?t.padStart(6,'0'):t).join('');
const files=fs.readdirSync(dir).filter(f=>/^data_.*\.js$/.test(f)).sort((a,b)=>key(a)<key(b)?-1:1);
const ctx={window:{}}; vm.createContext(ctx);
files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(dir,f),'utf8'),ctx));
const D=ctx.window.KOKAN_DATA;
const MIN='Yu Mincho', GO='Yu Gothic';
const r=(t,o={})=>new TextRun({text:t,font:{ascii:MIN,eastAsia:MIN,hAnsi:MIN},...o});
const P=(t,o={})=>String(t||'').split('\n').filter(x=>x.trim()).map(x=>new Paragraph({children:[r(x,o.run||{})],spacing:{after:100,line:340},indent:o.indent,...(o.para||{})}));
const label=t=>new Paragraph({children:[r(t,{bold:true,color:'2C4A6B'})],spacing:{before:160,after:60},keepNext:true});
const H1=t=>new Paragraph({heading:HeadingLevel.HEADING_1,children:[r(t)],pageBreakBefore:true});
const H2=t=>new Paragraph({heading:HeadingLevel.HEADING_2,children:[r(t)]});
const H3=t=>new Paragraph({heading:HeadingLevel.HEADING_3,children:[r(t)]});
const note=t=>new Paragraph({children:[r(t,{size:18,color:'666666'})],spacing:{after:80}});
const IND={left:360};
const out=[];
out.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:2400,after:400},children:[r('皇漢医学',{size:56,bold:true})]}));
out.push(new Paragraph({alignment:AlignmentType.CENTER,children:[r('湯本求真 纂著　―　条文書き下し・註釈現代語訳',{size:26})]}));
out.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:600},children:[r('底本：国立国会図書館デジタルコレクション　第1巻（昭和8年第2版）・第2巻（再版）',{size:20,color:'555555'})]}));
out.push(new Paragraph({alignment:AlignmentType.CENTER,children:[r('凡例：『傷寒論』『金匱要略』などの条文は書き下し文で、湯本求真の註・論および先輩諸家の説・症例は現代語訳（論説は要点）で記す。「要確認」は判読に不確実な点などを示す。',{size:20,color:'555555'})],spacing:{before:200}}));
out.push(new Paragraph({children:[new PageBreak()]}));
out.push(new TableOfContents('目次',{hyperlink:true,headingStyleRange:'1-2'}));

function entry(e){
  out.push(H2(e.title+(e.yomi?`（${e.yomi}）`:'')));
  out.push(note(`第${e.vol}巻　底本 p.${e.pages}（NDLコマ ${e.koma}）`));
  if(e.houzai){ out.push(label('処方')); out.push(...P(e.houzai.comp,{indent:IND})); out.push(...P(e.houzai.how,{indent:IND})); if(e.houzai.note) out.push(...P(e.houzai.note,{indent:IND,run:{size:20,color:'555555'}})); }
  (e.joubun||[]).forEach((j,i)=>{
    out.push(label(`条文${(e.joubun.length>1)?i+1:''}　『${j.src.replace(/[『』]/g,'')}』`));
    out.push(...P(j.kaki,{indent:IND,run:{size:23}}));
    if(j.yumoto){ out.push(new Paragraph({children:[r('〔註〕',{bold:true,color:'B23A2A'})],indent:IND,spacing:{after:40}})); out.push(...P(j.yumoto,{indent:IND})); }
  });
  if(e.fukusho){ out.push(label(e.fukusho.title||'腹証')); out.push(...P(e.fukusho.text,{indent:IND})); }
  if(e.kagen&&e.kagen.length){ out.push(label('加減方')); e.kagen.forEach(k=>{ out.push(new Paragraph({children:[r(k.name,{bold:true}),r('　'+(k.comp||''))],indent:IND,spacing:{after:40}})); out.push(...P('主治：'+k.shuchi,{indent:{left:720}})); if(k.yumoto) out.push(...P(k.yumoto,{indent:{left:720}})); }); }
  if(e.senpai&&e.senpai.length){ out.push(label(e.kind==='生薬'?'諸家の説（要点）':'先輩の論説（要点）')); e.senpai.forEach(s=>{ out.push(new Paragraph({children:[r(`${s.who}『${String(s.src).replace(/[『』]/g,'')}』：`,{bold:true}),r(s.kw.join('／'))],indent:IND,spacing:{after:80,line:320}})); }); }
  if(e.cases&&e.cases.length){ out.push(label('症例（概略）')); e.cases.forEach(c=>{ out.push(new Paragraph({children:[r(`【${c.src}】`,{bold:true}),r(c.summary)],indent:IND,spacing:{after:60,line:320}})); if(c.yumoto) out.push(...P('〔求真〕'+c.yumoto,{indent:{left:720}})); }); }
  if(e.yumoto&&e.yumoto.length){ out.push(label('湯本求真の論')); e.yumoto.forEach(y=>{ out.push(H3(y.head)); out.push(...P(y.text,{indent:IND})); }); }
  if(e.check&&e.check.length) out.push(note('要確認：'+e.check.join('／')));
}
const groups=[]; const seen={};
D.filter(e=>e.kind!=='生薬').forEach(e=>{const g=`第${e.vol}巻　${e.hen}`; if(!seen[g]){seen[g]=[];groups.push([g,seen[g]]);} seen[g].push(e);});
groups.forEach(([g,es])=>{ out.push(H1(g)); es.forEach(entry); });
out.push(H1('生薬の医治効用')); D.filter(e=>e.kind==='生薬').forEach(entry);

const doc=new Document({
  features:{updateFields:true}, creator:'栗原智', title:'皇漢医学 書き下し・現代語訳',
  styles:{default:{document:{run:{font:MIN,size:21}}},
    paragraphStyles:[
      {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:GO,size:36,bold:true,color:'1F2A2E'},paragraph:{spacing:{before:240,after:240},keepNext:true,outlineLevel:0}},
      {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:GO,size:30,bold:true,color:'2C4A6B'},paragraph:{spacing:{before:480,after:80},keepNext:true,outlineLevel:1,border:{bottom:{style:'single',size:6,color:'2C4A6B',space:2}}}},
      {id:'Heading3',name:'Heading 3',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:GO,size:22,bold:true,color:'B23A2A'},paragraph:{spacing:{before:120,after:60},keepNext:true,outlineLevel:2}}]},
  sections:[{properties:{page:{margin:{top:1134,bottom:1134,left:1134,right:1134}}},
    footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({children:[PageNumber.CURRENT],size:18})]})]})},
    children:out}]});
Packer.toBuffer(doc).then(b=>{const o=path.join(__dirname,'皇漢医学_書き下し・現代語訳.docx');fs.writeFileSync(o,b);console.log('written',o,D.length,'entries');});
