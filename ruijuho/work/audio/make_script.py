#!/usr/bin/env python3
"""data_NN.js から音声台本の下書きを作る：python3 ruijuho/work/audio/make_script.py keishito
台本は ruijuho/work/audio/scripts/NNN_<id>.txt。下書きを作ったあと、聞きやすく手直しする。
書式は皇漢医学と同じ（@K＝書き下し文・男性の声、ほか＝現代語訳・女性の声、## 見出し、--- 区切り）。"""
import json, re, subprocess, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"
js = "const window={};" + "".join(p.read_text(encoding="utf-8") for p in sorted(DATA.glob("data_*.js"))) + ";console.log(JSON.stringify(window.RUIJU_DATA))"
import tempfile
with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as _f:
    _f.write(js)  # データが大きく node -e では引数が長すぎるため一時ファイル経由
D = json.loads(subprocess.run(["node", _f.name], capture_output=True, text=True, check=True).stdout)
OLD = "發発惡悪脉脈證証劑剤盡尽觀観爲為與与應応氣気藥薬醫医榮栄數数虛虚實実屬属遲遅續続滿満體体溫温黃黄龍竜參参處処麪麺經経傳伝說説會会廣広舉挙斷断輕軽臺台對対學学從従徵徴壞壊隨随姙妊產産艸草雜雑權権餘余變変兩両薑姜當当將将滯滞卽即藏蔵讀読圓円壯壮擧挙歸帰濕湿聲声鬱欝渴渇狀状內内黑黒絕絶俱倶吳呉瘦痩閒間歷歴脫脱醬醤顚顛溼湿收収錢銭"
NEW = {OLD[i]: OLD[i + 1] for i in range(0, len(OLD) - 1, 2)}
def shin(s): return "".join(NEW.get(c, c) for c in s)
def k(s):  # 書き下し：括弧を外し新字体に
    return shin(s).replace("「", "").replace("」", "").replace("産后", "産後")
PART = tuple("のがをにはとでもへやか")
def _paren(m):  # 「経方（古方）の」→「経方、つまり古方の」
    x, nxt = m.group(1), m.group(2)
    if "で括" in x or re.fullmatch(r"[^ぁ-ん]*〜[^ぁ-ん]*", x):  # 「」の説明・原文の範囲表示は読まない
        return nxt
    if len(x) > 8 and x[-1] in "るただすうくぬむ":  # 補足の文は「つまり」を付けずに挟む
        return "、" + x + "、" + nxt
    return "、つまり" + x + ("" if nxt.startswith(PART) or nxt in "。、」" else "、") + nxt
def y(s):  # 現代語訳：〔〕を外し、（）は「、つまり〜」に
    s = s.replace("〔", "").replace("〕", "")
    s = re.sub(r"囲んだ（「」で括った）", "かぎかっこで囲んだ", s)
    s = re.sub(r"（([^（）]*)）(.?)", _paren, s)
    s = s.replace("、、", "、").replace("、。", "。").replace("。、", "。").replace("、つまり、", "、").replace("、」", "」")
    return shin(s).replace("釐", "厘")
def main(eid):
    e = next(x for x in D if x["id"] == eid)
    L = [f"#title {e['no']} {e['title']}", "#src 類聚方広義（尾台榕堂）", "", f"## {e['title']}",
         f"類聚方広義、第{e['no']}方。{e['title']}です。", ""]
    for t in e.get("tochu", []):
        L += ["はじめに、榕堂の頭注です。", y(t["yaku"]), ""]
    L += ["## 主治", f"@K {k(e['shuchi']['kaki'])}", y(e["shuchi"]["yaku"]), ""]
    H = e["houzai"]
    L += ["## 処方", shin("、".join(f"{h['name']}{re.sub(r'（([^）]*)）', r'、\1', h['ryo'])}" for h in H["herbs"])).replace("釐", "厘") + "。",
          ("本書で今用いるとする量は、" + shin("、".join(f"{h['name']}{h['ima']}" for h in H["herbs"] if h.get("ima"))).replace("釐", "厘") + "です。") if any(h.get("ima") for h in H["herbs"]) else "", "",
          "## 煎じ方と飲み方", y(H["yaku"]), ""]
    for t in H.get("tochu", []):
        L += [f"頭注、{shin(t['head'])}について。", y(t["yaku"]), ""]
    L.append("---")
    for i, j in enumerate(e["joubun"], 1):
        L += [f"## 条文 その{i}", f"@K {k(j['kaki'])}", "現代語訳です。", y(j["yaku"])]
        for t in j.get("tochu", []):
            L += ["榕堂の頭注です。", y(t["yaku"])]
        L.append("")
    out = HERE / "scripts" / f"{e['no']:03d}_{e['id']}.txt"
    out.write_text("\n".join(L).rstrip() + "\n", encoding="utf-8")
    print("written", out)
if __name__ == "__main__":
    for a in sys.argv[1:]:
        main(a)
