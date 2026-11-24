// 方剤名の正規化と、3冊の方剤を共通の方剤IDにまとめる対応表
// 旧字→新字、表記ゆれ、別名をここで吸収する。対応が漏れていたら ALIAS に1行足す。

const KYU = {
  '藥':'薬','參':'参','薑':'姜','黃':'黄','龍':'竜','蠣':'蛎','澤':'沢','麥':'麦','歸':'帰','當':'当',
  '陷':'陥','氣':'気','眞':'真','吳':'呉','實':'実','鹽':'塩','蔕':'蒂','圓':'円','醬':'醤','膽':'胆',
  '續':'続','鷄':'鶏','雞':'鶏','髮':'髪','栢':'柏','檗':'蘗','惡':'悪','發':'発','蟲':'虫','狀':'状',
  '證':'証','滿':'満','經':'経','鞕':'硬','聲':'声','體':'体','淸':'清','靑':'青','黑':'黒','燒':'焼',
  '蘆':'芦','苓':'苓','瀉':'瀉','壯':'壮','脈':'脈','攣':'攣','輭':'軟','莖':'茎','兒':'児','齒':'歯'
};
// 消石・芒消・朴消 → 硝
function kyu2shin(s){
  s = s.replace(/[㐀-鿿豈-﫿]/g, c => KYU[c] || c);
  return s.replace(/芒消/g,'芒硝').replace(/朴消/g,'朴硝').replace(/消石/g,'硝石');
}

// 別名 → 正式名（正規化後の表記で書く）
const ALIAS = {
  '甘草小麦大棗湯':'甘麦大棗湯',
  '茯苓桂枝甘草大棗湯':'苓桂甘棗湯',
  '桂姜棗草黄辛附湯':'桂枝去芍薬加麻黄附子細辛湯',
  '三黄瀉心湯':'瀉心湯', '三黄湯':'瀉心湯', '三黄丸':'瀉心湯',
  '理中丸':'人参湯',
  '腎気丸':'八味丸', '八味地黄丸':'八味丸',
  '麻杏甘石湯':'麻黄杏仁甘草石膏湯',
  '麻杏薏甘湯':'麻黄杏仁薏苡甘草湯',
  '柴胡姜桂湯':'柴胡桂枝乾姜湯',
  '救逆湯':'桂枝去芍薬加蜀漆竜骨牡蛎湯',
  '去芍薬加蜀漆竜骨牡蛎救逆湯':'桂枝去芍薬加蜀漆竜骨牡蛎湯',
  '桂麻各半湯':'桂枝麻黄各半湯',
  '桂枝附子去桂枝加朮湯':'桂枝附子去桂加朮湯',
  '桂枝去桂加朮附湯':'桂枝附子去桂加朮湯',
  '乾姜人参半夏丸':'乾姜半夏人参丸',
  '千金桂枝去芍薬加皂莢湯':'桂枝去芍薬加皂莢湯',
  '去芍薬加皂莢湯':'桂枝去芍薬加皂莢湯',
  '千金生姜甘草湯':'生姜甘草湯',
  '橘枳姜湯':'橘皮枳実生姜湯',
  '三物白散':'桔梗白散',
  '苦酒湯':'半夏苦酒湯',
  '復脈湯':'炙甘草湯',
  '黄連鶏子湯':'黄連阿膠湯',
  '外台黄芩湯':'六物黄芩湯',
  '梔子大黄湯':'枳実梔子大黄豉湯',
  '梔子大黄豉湯':'枳実梔子大黄豉湯',
  '古今録験続命湯':'続命湯',
  '黄耆桂枝苦酒湯':'黄耆芍薬桂枝苦酒湯',
  '四七湯':'半夏厚朴湯', '大七気湯':'半夏厚朴湯',
  '瓜蒂散':'瓜蒂散', '瓜蔕散':'瓜蒂散',
  '桂枝枳実生姜湯':'桂枝生姜枳実湯',
  '黄解丸':'黄連解毒湯',
  '黄連解毒湯及丸方':'黄連解毒湯',
  '茯苓戎塩湯':'茯苓戎塩湯',
  '桃軍丸':'桃軍円',
  '理中加附子湯':'附子理中湯',
  '厚朴生姜半夏人参甘草湯':'厚朴生姜半夏甘草人参湯',
  // 皇漢医学は「去芍薬」とするが、検索では同じ方剤としてまとめる
  '桂枝去芍薬加茯苓朮湯':'桂枝去桂加茯苓朮湯',
  '大䗪虫丸':'大黄䗪虫丸',
  '桂枝去芍薬加蜀漆竜骨牡蛎救逆湯':'桂枝去芍薬加蜀漆竜骨牡蛎湯',
  '柴胡加桂枝湯':'柴胡桂枝湯',
  '茵蔯湯':'茵蔯蒿湯',
};

function canon(name){
  let s = kyu2shin(name).replace(/\s+/g,'');
  return ALIAS[s] || s;
}

// 題名を「主の方剤（所見を付ける）」「附の方剤（参照だけ）」「別名」「但し書き」に分ける
// 例：「小建中湯（附 黄耆建中湯・当帰建中湯）」「芎帰膠艾湯・猪苓湯」「厚朴大黄湯 并 小承気湯」
function parseTitle(title){
  const t = kyu2shin(title);
  const main=[], fu=[], alias=[], notes=[];
  // 括弧の中身を取り出す
  const parens=[]; let rest=t.replace(/[（(]([^（）()]*(?:[（(][^（）()]*[)）][^（）()]*)*)[)）]/g,(m,inner)=>{parens.push(inner);return ' ';});
  // 括弧の外の「附 …」（例：「桂枝湯（頭項強痛）附 項背強（…）」）
  let fuOut=''; rest=rest.replace(/\s附\s(.*)$/,(m,a)=>{fuOut=a;return '';});
  for(const part of rest.split(/[・]|\s并\s|并/)){
    const p=part.trim(); if(!p) continue;
    if(/(湯|丸|散|円|飲|煎|方)$/.test(p)) main.push(canon(p.replace(/及丸方$/,''))); else notes.push(p);
  }
  const fuParts = s => s.split(/[・、]/).map(x=>x.replace(/^(附|并)[\s:：]+/,'').replace(/の説$/,'').trim()).filter(Boolean);
  for(const inner of parens){
    if(/^(附|并)[\s:：]/.test(inner) || /、\s*附[\s:：]/.test(inner)){
      const segs = inner.split(/、/);
      for(const seg of segs){
        if(/^并[\s:：]/.test(seg.trim())){ for(const x of fuParts(seg)) if(/(湯|丸|散|円|飲)$/.test(x)) main.push(canon(x)); }
        else for(const x of fuParts(seg)) if(/(湯|丸|散|円|飲|煎)$/.test(x)) fu.push(x);
      }
    } else if(/^[^\s、のを]{2,14}(湯|丸|散|円|飲|煎)$/.test(inner) || inner.split('・').every(x=>/^[^\s、のを]{2,14}(湯|丸|散|円|飲)$/.test(x))){
      for(const x of inner.split('・')) alias.push(x);
    } else notes.push(inner);
  }
  if(fuOut) for(const x of fuOut.replace(/[（）()]/g,'・').split(/[・、\s]/)) if(/(湯|丸|散|円|飲)$/.test(x)) fu.push(x);
  if(!main.length && notes.length) main.push(canon(notes.shift()));
  return { main:[...new Set(main)], fu:[...new Set(fu)], alias:alias.map(canon), notes };
}

// 附の相対名（「加大黄湯」「去芍薬加皂莢湯」など）を、既知の方剤名の中から補って解決する
function resolveRel(x, mainName, known){
  if(!/^(加|去)/.test(x)) return canon(x);
  const stem = mainName.replace(/(湯|丸|散)$/,'');
  const cands = [stem + x, stem + x.slice(1)];
  const i = stem.search(/[加去]/); if(i>0){ cands.push(stem.slice(0,i)+x); }
  cands.push(stem.slice(0,2)+x);
  for(const c of cands){ const k=canon(c); if(known.has(k)) return k; }
  return canon(cands[0]);
}

module.exports = { kyu2shin, canon, parseTitle, resolveRel, ALIAS };
