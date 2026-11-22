# 翻刻メモ（notes/*.md）から kaki を作り、src/items_NN.py の項目定義と合わせて data/data_NN.js を書き出す。
# メモの書式：「## 310R」で頁、本文中の「¶見出し｜」で段落の始まり、漢文は【原文｜書き下し（カタカナ）】。
# 使い方: python3 fukusho/work/notes2data.py 18
import re, sys, json, os, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))

def k2h(s):
    s = re.sub(r'【[^｜】]*｜([^】]*)】', r'\1', s)
    s = s.replace('グズく', 'グズグズ').replace('ヿ', 'コト')
    s = re.sub(r'（[^）]*(白紙|要確認|=)[^）]*）', '', s)
    s = re.sub(r'([ァ-ヶ]{2})〱', r'\1\1', s)
    s = re.sub(r'([ァ-ヶ])ヽ', r'\1\1', s)
    out = []
    for ch in s:
        o = ord(ch)
        if 0x30A1 <= o <= 0x30F6 and ch not in 'ヵヶ': out.append(chr(o - 0x60))
        else: out.append(ch)
    return ''.join(out)

def pages(path):
    cur, res = None, []
    for line in open(path, encoding='utf-8'):
        m = re.match(r'## (b?\d+[RL])', line)
        if m: cur = m.group(1); res.append([cur, '']); continue
        if line.startswith('#'): cur = None; continue
        if cur and line.strip(): res[-1][1] += line.strip()
    return res

def paras(path, start, end):
    """start/end の頁（含む）の本文を ¶ で分け [{head,koma,raw}] を返す。最初の ¶ より前は捨てる"""
    P = pages(path); tags = [t for t, _ in P]
    i, j = tags.index(start), tags.index(end)
    out = []
    for t, txt in P[i:j+1]:
        parts = txt.split('¶')
        if out: out[-1]['raw'] += parts[0]; out[-1]['pg'].append(t) if parts[0] else None
        for p in parts[1:]:
            h, _, body = p.partition('｜')
            out.append({'head': h, 'raw': body, 'pg': [t]})
    for o in out:
        pg = o.pop('pg'); o['koma'] = pg[0] if pg[0] == pg[-1] else pg[0] + '–' + pg[-1]
    return out

if __name__ == '__main__':
    nn = sys.argv[1]
    spec = importlib.util.spec_from_file_location('items', f'{HERE}/src/items_{nn}.py')
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    items = []
    for it in m.ITEMS:
        it = dict(it)
        if 'notes' in it:
            nfile, a, b = it.pop('notes'); Y = it.pop('yaku')
            fix = it.pop('kakifix', {})
            ps = []
            for p in paras(f'{HERE}/notes/{nfile}', a, b):
                if p['head'] not in Y: continue   # 別項目の段落
                kaki = k2h(p['raw'])
                for x, y in fix.items(): kaki = kaki.replace(x, y)
                ps.append({'head': p['head'], 'koma': p['koma'], 'kaki': kaki, 'yaku': Y[p['head']]})
            missing = [h for h in Y if h not in [p['head'] for p in ps]]
            if missing: print('  yaku に対応する段落なし:', missing)
            it['paras'] = it.get('paras', []) + ps
        items.append(it)
    with open(f'{HERE}/data/data_{nn}.js', 'w', encoding='utf-8') as f:
        f.write(f'// {m.HEADER}\n// notes2data.py が src/items_{nn}.py と翻刻メモから生成\nwindow.FUKU_DATA = window.FUKU_DATA || [];\nwindow.FUKU_DATA.push(\n')
        f.write(',\n'.join(json.dumps(i, ensure_ascii=False, indent=1) for i in items))
        f.write('\n);\n')
    print('wrote', len(items), 'items')
