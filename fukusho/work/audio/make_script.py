#!/usr/bin/env python3
"""腹証奇覧 リスニング用台本を data_NN.js から作る：python3 fukusho/work/audio/make_script.py [id ...]
引数なしで全項目。台本は fukusho/work/audio/scripts/NNN_<id>.txt（NNN は本書の順の通し番号）。
書式は類聚方広義・皇漢医学と同じ（@K＝書き下し文・男性の声、ほか＝現代語訳・女性の声、## 見出し、--- 区切り）。
腹証奇覧は図が中心なので、各項の初めに腹証図の説明（図題・彩色の部位）と腹証所見を読む。
方剤名の読みは data の yomi から yomi_auto.tsv に書き出す（tts.py が読み辞書に加える）。"""
import json, re, subprocess, sys, tempfile
from pathlib import Path
HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"
js = "const window={};" + "".join(p.read_text(encoding="utf-8") for p in sorted(DATA.glob("data_*.js"))) + ";console.log(JSON.stringify(window.FUKU_DATA))"
with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as _f:
    _f.write(js)
D = json.loads(subprocess.run(["node", _f.name], capture_output=True, text=True, check=True).stdout)
D.sort(key=lambda e: e["no"])
OLD = "發発惡悪脉脈證証劑剤盡尽觀観爲為與与應応氣気藥薬醫医榮栄數数虛虚實実屬属遲遅續続滿満體体溫温黃黄龍竜參参處処麪麺經経傳伝說説會会廣広舉挙斷断輕軽臺台對対學学從従徵徴壞壊隨随姙妊產産艸草雜雑權権餘余變変兩両薑姜當当將将滯滞卽即藏蔵讀読圓円壯壮擧挙歸帰濕湿聲声渴渇狀状內内黑黒絕絶俱倶吳呉瘦痩閒間歷歴脫脱醬醤顚顛溼湿收収錢銭戔銭圖図蟲虫來来壹一兒児歲歳廢廃癈廃靈霊豐豊單単獨独齒歯稱称亂乱舊旧處処邊辺邉辺鹽塩寶宝禮礼燒焼點点轉転盡尽聽聴總総擇択澤沢驗験險険檢検區区歐欧樂楽戰戦黨党團団圍囲國国萬万價価賣売讀読覺覚觸触纔才髮髪據拠效効號号脩修靜静畱留茈柴膽胆步歩釋釈驅駆軀躯齋斎畧略衂衄攝摂囑嘱舍舎竊窃晝昼髓髄寫写插挿曉暁臟臓覽覧錄録燈灯絲糸盜盗溪渓"
NEW = {OLD[i]: OLD[i + 1] for i in range(0, len(OLD) - 1, 2)}
DAK = dict(zip("かきくけこさしすせそたちつてとはひふへほ", "がぎぐげござじずぜぞだぢづでどばびぶべぼ"))
def odoriji(s):  # ゝゞヽヾ（踊り字）を前の字に開く
    o = []
    for c in s:
        if c in "ゝヽ" and o: o.append(o[-1])
        elif c in "ゞヾ" and o: o.append(DAK.get(o[-1], o[-1]))
        else: o.append(c)
    return "".join(o).replace("〳〵", "")
def shin(s): return odoriji("".join(NEW.get(c, c) for c in s))
def k(s):  # 書き下し：括弧・〔〕を外し新字体に
    return _k(s).strip("、")
def _k(s):
    s = re.sub(r"〔[^〕]*判読[^〕]*〕", "", s)
    return shin(s).replace("「", "").replace("」", "").replace("〔", "").replace("〕", "").replace("『", "").replace("』", "").replace("（", "、").replace("）", "、").replace("、、", "、").replace("、。", "。")
PART = tuple("のがをにはとでもへやか")
def _paren(m):
    x, nxt = m.group(1), m.group(2)
    if "判読" in x or re.fullmatch(r"[^ぁ-ん]*[〜–][^ぁ-ん]*", x) or re.fullmatch(r"[0-9A-Za-z.／・、\s]*", x):
        return nxt
    if re.fullmatch(r"[一-鿿々]{1,6}", x):  # 原文の語の言い添え（目安（準拠））は読まない
        return nxt
    if len(x) > 8 and x[-1] in "るただすうくぬむ":
        return "、" + x + "、" + nxt
    return "、つまり" + x + ("" if nxt.startswith(PART) or nxt in "。、」・" else "、") + nxt
def y(s):
    s = s or ""
    s = re.sub(r"〔[^〕]*判読[^〕]*〕", "", s).replace("〔", "").replace("〕", "")
    s = re.sub(r"（([^（）]*)）(.?)", _paren, s)
    s = s.replace("、、", "、").replace("、。", "。").replace("。、", "。").replace("、つまり、", "、").replace("、」", "」")
    s = s.replace("向かって左", "向かって左").replace("→", "から")
    return shin(s).replace("釐", "厘")
def src_of(e):
    g = e.get("group", "")
    return "腹証奇覧翼（和久田叔虎）" if "翼" in g else "腹証奇覧（稲葉文礼）"
def num(e):
    if e["kind"] in ("方剤", "総論図") and float(e["no"]).is_integer():
        return f"第{int(e['no'])}図"
    return {"総論": "総論", "序": "序", "附録": "附録"}.get(e["kind"], e["kind"])
def figure(f, L, n=None):
    L += [f"## 腹証図{n or ''}", f"図の題は、{k(f.get('label',''))}。" if f.get("label") else "", y(f.get("desc", "")), ""]
def main(ids):
    sel = [e for e in D if not ids or e["id"] in ids]
    for e in sel:
        i = D.index(e) + 1
        title = shin(e["title"])
        st = title.replace("（", "、").replace("）", "").replace("＋", "と")
        L = [f"#title {num(e)}　{title}", f"#src {src_of(e)}", "", f"## {st}"]
        L.append(f"{shin(e.get('group',''))}、{num(e)}。{st}です。")
        if e.get("intro"): L.append(y(e["intro"]))
        L.append("")
        figs = ([e["fig"]] if e.get("fig") else []) + list(e.get("figs") or [])
        for j, f in enumerate(figs, 1):
            figure(f, L, f" その{j}" if len(figs) > 1 else None)
        sk = [s for s in (e.get("shoken") or []) if s.get("src") != "図"]
        if sk:
            L.append("## 腹証所見")
            for s in sk:
                side = f"、{s['side']}側" if s.get("side") and s["side"] != "両" else ("、両側" if s.get("side") == "両" else "")
                if s.get("neg"):
                    L.append(f"鑑別として、本方にない所見。{s['k']}。{k(s['w'])}。")
                else:
                    L.append(f"{s['k'].replace('・','、')}{side}。原本では、{k(s['w'])}。")
            L.append("")
        L.append("---")
        for p in e.get("paras") or []:
            L.append(f"## {shin(p.get('head',''))}" if p.get("head") else "")
            if p.get("kaki"): L.append(f"@K {k(p['kaki'])}")
            if p.get("yaku"): L += ["現代語訳です。", y(p["yaku"])]
            L.append("")
        for t in e.get("tochu") or []:
            L.append(f"## 頭注、{shin(t.get('head',''))}")
            if t.get("kaki"): L.append(f"@K {k(t['kaki'])}")
            if t.get("yaku"): L += ["現代語訳です。", y(t["yaku"])]
            L.append("")
        txt = "\n".join(L)
        txt = re.sub(r"\n{3,}", "\n\n", txt).rstrip() + "\n"
        out = HERE / "scripts" / f"{i:03d}_{e['id']}.txt"
        for old in (HERE / "scripts").glob(f"*_{e['id']}.txt"):
            if old != out: old.unlink()
        out.write_text(txt, encoding="utf-8")
    # 方剤名の読み（data の yomi から）
    rows = ["# 自動生成（make_script.py）：data の title と yomi から。手で直すときは yomi.tsv に書く（そちらが優先）"]
    seen = set()
    for e in D:
        t, yo = shin(e["title"]).split("（")[0].strip(), (e.get("yomi") or "").split("（")[0].strip()
        if t and yo and re.search(r"[一-鿿]", t) and re.fullmatch(r"[ぁ-んー・ ]+", yo) and t not in seen and len(t) >= 2:
            seen.add(t); rows.append(f"{t}\t{yo}")
    (HERE / "yomi_auto.tsv").write_text("\n".join(rows) + "\n", encoding="utf-8")
    print("written", len(sel), "scripts")
if __name__ == "__main__":
    main(set(sys.argv[1:]))
