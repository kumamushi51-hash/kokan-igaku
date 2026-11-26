// 日本東洋医学雑誌（J-STAGE, フリーアクセス）の臨床報告から、症例ごとの事実（所見・証・方剤と効果）を抜き出したもの
// 本文PDFは J-STAGE の設定で自動取得できないため、抄録にもとづく（src:"抄録"）。文章は引用せず、事実を短い語句で書く
// cases[].f：所見の語句（所見辞書で照合される）、rx[].eff：有効／一部有効／無効、rx[].note：併用・加減など
window.CASE_DATA = window.CASE_DATA || [];
window.CASE_DATA.push(
{id:"jsom77-2-92", vol:77, no:2, page:"92-100", year:2026, src:"抄録",
 title:"心腎不交証を呈した多剤耐性大腸菌を起炎菌とする反復性膀胱炎に，清心蓮子飲による漢方治療が著効した2例", authors:"吉田也恵 ほか",
 url:"https://www.jstage.jst.go.jp/article/kampomed/77/2/77_92/_article/-char/ja",
 cases:[
  {n:"症例1", pt:"70歳女性", dx:"反復性膀胱炎（多剤耐性大腸菌）", f:"膀胱炎を繰り返す。抗菌薬治療を反復。証：心腎不交。", rx:[{name:"清心蓮子飲", eff:"有効", note:"11か月再発なし"}]},
  {n:"症例2", pt:"79歳女性", dx:"反復性膀胱炎（多剤耐性大腸菌）", f:"膀胱炎を繰り返す。抗菌薬治療を反復。証：心腎不交。", rx:[{name:"清心蓮子飲", eff:"有効", note:"11か月再発なし"}]}
 ]},
{id:"jsom77-2-101", vol:77, no:2, page:"101-105", year:2026, src:"抄録",
 title:"桂枝芍薬知母湯で軽快した石灰沈着性腱板炎の3例", authors:"金子彰 ほか",
 url:"https://www.jstage.jst.go.jp/article/kampomed/77/2/77_101/_article/-char/ja",
 cases:[
  {n:"3例", pt:"中高年女性", dx:"石灰沈着性腱板炎", f:"肩関節痛、夜間に増悪する痛み。", rx:[{name:"桂枝芍薬知母湯", eff:"有効", note:"短期間で軽快、2例で石灰化消失"}]}
 ]},
{id:"jsom77-2-106", vol:77, no:2, page:"106-113", year:2026, src:"抄録",
 title:"繰り返す尿道カテーテル閉塞に対して漢方治療が有効であった3例", authors:"辻正徳",
 url:"https://www.jstage.jst.go.jp/article/kampomed/77/2/77_106/_article/-char/ja",
 cases:[
  {n:"2例", pt:"高齢男性", dx:"排尿障害（尿道カテーテル留置、閉塞を繰り返す）", f:"排尿障害。尿道カテーテル閉塞を繰り返す。高齢者。", rx:[{name:"猪苓湯", eff:"有効", note:"エキス少量"}]},
  {n:"1例", pt:"高齢男性", dx:"排尿障害（尿道カテーテル留置、閉塞を繰り返す）", f:"排尿障害。尿道カテーテル閉塞を繰り返す。閉塞時に発熱。高齢者。", rx:[{name:"猪苓湯", eff:"無効", note:"エキス少量"},{name:"竜胆瀉肝湯", eff:"有効", note:"一貫堂、閉塞の頻度が減少"}]}
 ]},
{id:"jsom77-2-114", vol:77, no:2, page:"114-119", year:2026, src:"抄録",
 title:"脾虚を伴う肩こりに半夏白朮天麻湯が有効であった3例", authors:"岡林麻子 ほか",
 url:"https://www.jstage.jst.go.jp/article/kampomed/77/2/77_114/_article/-char/ja",
 cases:[
  {n:"症例1", pt:"23歳女性", dx:"肩こり", f:"肩こり、目の痛み、倦怠感、胃もたれ、乗り物酔いのような吐き気。証：気虚、脾虚、痰飲。", rx:[{name:"半夏白朮天麻湯", eff:"有効", note:""}]},
  {n:"症例2", pt:"43歳女性", dx:"肩こり", f:"肩こり、頭痛、げっぷ、倦怠感、腹の張り、乗り物で悪化。証：気虚、脾虚、痰飲。", rx:[{name:"半夏白朮天麻湯", eff:"有効", note:""}]},
  {n:"症例3", pt:"80歳女性", dx:"肩こり（腸閉塞術後）", f:"肩こり、目の痛み、頭痛、ふらつき、倦怠感、腹の張り、下痢傾向。高齢者。証：気虚、脾虚、痰飲。", rx:[{name:"半夏白朮天麻湯", eff:"有効", note:""}]}
 ]},
{id:"jsom77-2-120", vol:77, no:2, page:"120-126", year:2026, src:"抄録",
 title:"更年期女性の口腔乾燥症を伴う舌痛症に漢方薬が有効であった1例", authors:"徳毛敬三 ほか",
 url:"https://www.jstage.jst.go.jp/article/kampomed/77/2/77_120/_article/-char/ja",
 cases:[
  {n:"症例", pt:"50歳代女性", dx:"口腔乾燥症を伴う舌痛症（更年期）", f:"口腔乾燥、舌痛。更年期。黄膩苔。証：湿熱。", rx:[{name:"麦門冬湯", eff:"無効", note:""},{name:"茵蔯五苓散", eff:"有効", note:"のち再燃"},{name:"白虎加人参湯", eff:"一部有効", note:"追加"},{name:"黄連解毒湯", eff:"有効", note:"四物湯と併用"},{name:"四物湯", eff:"有効", note:"黄連解毒湯と併用"}]}
 ]},
{id:"jsom77-2-127", vol:77, no:2, page:"127-132", year:2026, src:"抄録",
 title:"総排泄腔外反症術後の様々な愁訴に折衝飲加減が奏功した1例", authors:"齋藤江里子 ほか",
 url:"https://www.jstage.jst.go.jp/article/kampomed/77/2/77_127/_article/-char/ja",
 cases:[
  {n:"症例", pt:"16歳女性", dx:"総排泄腔外反症術後、月経困難症", f:"顔面のほてり、汗が出やすい、周期的な腹痛、月経困難症。証：瘀血、気逆。", rx:[{name:"折衝飲", eff:"有効", note:"加茯苓白朮"}]}
 ]},
{id:"jsom77-1-22", vol:77, no:1, page:"22-28", year:2026, src:"抄録",
 title:"持続的気道陽圧療法導入により生じた不眠に対して酸棗仁湯が奏効した1例", authors:"太田真之 ほか",
 url:"https://www.jstage.jst.go.jp/article/kampomed/77/1/77_22/_article/-char/ja",
 cases:[
  {n:"症例", pt:"52歳女性", dx:"閉塞性睡眠時無呼吸症候群（CPAP導入後の不眠）", f:"入眠困難、夜間覚醒、夜間頻尿、日中の眠気、倦怠感。", rx:[{name:"酸棗仁湯", eff:"有効", note:"睡眠薬で倦怠感が出たため変更"}]}
 ]},
{id:"jsom77-1-29", vol:77, no:1, page:"29-35", year:2026, src:"抄録",
 title:"薏苡仁湯加附子が奏功したサルコイドニューロパチーの1例", authors:"村上永尚 ほか",
 url:"https://www.jstage.jst.go.jp/article/kampomed/77/1/77_29/_article/-char/ja",
 cases:[
  {n:"症例", pt:"66歳女性", dx:"サルコイドニューロパチー", f:"手足のしびれ、歩行障害、筋力低下、体が重い、冷え、手足の痛み、下肢のむくみ、水太り。証：寒湿。", rx:[{name:"薏苡仁湯", eff:"有効", note:"加附子"}]}
 ]},
{id:"jsom77-1-36", vol:77, no:1, page:"36-41", year:2026, src:"抄録",
 title:"ざ瘡瘢痕に桂枝茯苓丸加薏苡仁が有効と考えた3例", authors:"諸橋弘子",
 url:"https://www.jstage.jst.go.jp/article/kampomed/77/1/77_36/_article/-char/ja",
 cases:[
  {n:"3例", pt:"10歳代男性", dx:"尋常性ざ瘡の瘢痕", f:"にきび（ざ瘡）の瘢痕。", rx:[{name:"桂枝茯苓丸加薏苡仁", eff:"有効", note:"外用薬に追加（1例は清上防風湯・荊芥連翹湯のあと）"}]}
 ]},
{id:"jsom77-1-50", vol:77, no:1, page:"50-54", year:2026, src:"抄録",
 title:"咳嗽，鼻閉を主とした花粉症に参蘇飲が有効であった2例", authors:"津嶋伸彦 ほか",
 url:"https://www.jstage.jst.go.jp/article/kampomed/77/1/77_50/_article/-char/ja",
 cases:[
  {n:"2例", pt:"（記載なし）", dx:"花粉症", f:"咳、鼻閉。水様性鼻汁なし。証：脾虚、水毒、肝鬱。", rx:[{name:"参蘇飲", eff:"有効", note:""}]}
 ]},
{id:"jsom77-1-55", vol:77, no:1, page:"55-62", year:2026, src:"抄録",
 title:"口腔リハビリテーションが無効であり漢方治療が奏効した味覚障害の1例", authors:"福原慎也 ほか",
 url:"https://www.jstage.jst.go.jp/article/kampomed/77/1/77_55/_article/-char/ja",
 cases:[
  {n:"症例", pt:"81歳女性", dx:"味覚障害（脳梗塞後）", f:"味覚障害、体重減少、口腔乾燥、頻尿、冷え。高齢者。脈やや虚。舌は湿潤、舌下静脈怒張（軽度）。腹力軟弱、胸脇苦満、臍上悸、小腹不仁。証：心腎不交。", rx:[{name:"加味逍遙散", eff:"無効", note:""},{name:"加味逍遙散", eff:"有効", note:"清心蓮子飲と併用"},{name:"清心蓮子飲", eff:"有効", note:"加味逍遙散と併用"}]}
 ]}
);
