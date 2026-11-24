// 3冊のデータを読み込む（皇漢医学・類聚方広義・腹証奇覧）
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'../..');
function loadDir(dir,key){const w={};const files=fs.readdirSync(dir).filter(f=>/^data_.*\.js$/.test(f)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  const window=w;for(const f of files)eval(fs.readFileSync(path.join(dir,f),'utf8'));return w[key]||[];}
module.exports=()=>({
  K:loadDir(path.join(ROOT,'work/data'),'KOKAN_DATA'),
  R:loadDir(path.join(ROOT,'ruijuho/work/data'),'RUIJU_DATA'),
  F:loadDir(path.join(ROOT,'fukusho/work/data'),'FUKU_DATA')});
