# 皇漢医学 症状検索アプリ — 作業手順書（自動実行・手動共通）

利用者：栗原智先生（富山大学附属病院 和漢診療科）。湯本求真『皇漢医学』を方剤ごとに現代語訳し、症状から検索できるアプリにしている。
この手順書と work/引き継ぎメモ.md が作業の正本。毎回の最初に両方を読むこと。

## 構成（このリポジトリ kumamushi51-hash/kokan-igaku）
- ルート：GitHub Pages の公開物（index.html, sw.js, manifest.webmanifest, アイコン, robots.txt）。https://kumamushi51-hash.github.io/kokan-igaku/
  - index.html と sw.js は work/build.py が生成する。手で編集しない
- work/images/v1/koma_XXXX.jpg：第1巻（昭和8年第2版, NDL pid 1107200, 231コマ）
- work/images/v2/koma_XXXX.jpg：第2巻（再版, NDL pid 1047073, 246コマ）
  - 1コマ＝見開き2頁（右頁が先）。第1巻の目安：底本頁 ≒ コマ×2 − 42。画像に印刷された頁番号で必ず確認する
- work/crop.py：`python3 work/crop.py v1 126 127` → /tmp/kk_crops/ に頁ごと・上下半分の画像（R1,R2,L1,L2 の順に読む）
- work/data/data_v1_taiyoNN.js：方剤・生薬データ（window.KOKAN_DATA.push(...)）。新しい回は次の番号の新ファイルに書く
- work/app.src.html：アプリ本体。SYN が現代語→古典語の言い換え辞書
- work/build.py：data を番号順に結合 → work/kokan_igaku.html（アーティファクト用）と ../index.html, ../sw.js（Pages用）
- work/build_docx.js：`node work/build_docx.js` → work/皇漢医学_書き下し・現代語訳.docx（Word版。条文は書き下し文のみ、註・論・先輩の論説・症例は現代語訳）。利用者の指定で、方剤を追加するたびに再生成して一緒に commit する
- work/audio/：リスニング用MP3（試作中）。scripts/NNN_<id>.txt が聞きやすく書き直した台本（条文は書き下し文を `@K` 行で、ほかは現代語訳の話し言葉）、yomi.tsv が読み辞書、tts.py が生成スクリプト。push すると GitHub Actions（.github/workflows/audio.yml）が edge-tts で ../audio/*.mp3 と ../audio/index.html を作って commit する（変更のあった台本だけ作り直す）。誤読は yomi.tsv に1行足して直す
- アーティファクト（同じ内容の閲覧用）：https://claude.ai/artifact/49nLHuch6e932jk6mqptF3

## 1回の作業（自動実行は 10方剤）
1. work/引き継ぎメモ.md の「次の作業位置」から始める
2. 必要なコマを crop.py で切り出し、画像を読んで文字起こし・現代語訳する
3. 方剤ごとに data ファイルへ追記し、**1方剤終わるごとに build.py と `node work/build_docx.js`（Word版の更新）→ commit → push** する（上限で止まっても失われないように）。あわせて引き継ぎメモの「次の作業位置」も更新して一緒に push
4. 10方剤終えたら（または続けられなくなったら）build.py → ブラウザ（playwright）で work/kokan_igaku.html と ../index.html を開き、エラーがないこと・検索が動くことを1回確認
5. アーティファクトを更新：Artifact の read（url 指定）をしてから、url を指定して work/kokan_igaku.html を publish
6. 引き継ぎメモの「完了済み」「次の作業位置」を更新し、commit → push（push すると1分ほどで Pages に反映）
7. 最後に、追加した方剤・生薬・総論の名前、底本頁の範囲、要確認箇所、次の作業位置を日本語で簡潔に報告する

## まとめ方（利用者の指定）
1. 方剤名・処方（構成・煎法）、頭注の補足は houzai.note
2. 条文：書き下し文（kaki）と現代語訳（yaku）
3. 条文の註：湯本求真の註は**全文を現代語訳**（joubun[].yumoto）。他家の註（和久田叔虎など）を引用している場合はその旨を明記
4. 腹証（fukusho）・加減方（kagen）があれば入れる。求真の論は全文現代語訳
5. 先輩の論説：医家・出典ごとに現代語訳の**キーワード**（senpai[{who,src,kw}]）
6. 症例：**概略**で記載（cases[{src,summary,yumoto}]）。求真の註があれば全文現代語訳
7. 湯本求真のコメント（「余曰ク」「求真按ズルニ」など）：**全文を現代語訳**（yumoto[{head,text}]）
8. 「〇〇ノ醫治効用」の節は、方剤とは別に**生薬ごとの頁**（kind:"生薬", hen:"生薬", id:"herb-…"）。方剤と related で相互リンク。生薬は方剤数に数えない
9. **病位の説明**（「少陽病ニ關スル師論註釋」など篇の冒頭の総論）は、太陽病総論（id:"v1-taiyo-soron"）と同じ形で kind:"総論" の頁にする。方剤数に数えない
10. 小活字で判読に自信がない箇所、著者推定などは check（要確認）に記載
11. 本書に著者名がない引用書は、推測で著者名を入れない（who は「（著者名記載なし）」）
12. tags には現代語の症状を入れ、必要なら app.src.html の SYN に言い換えを追加する（広すぎる語は避ける）
13. 既存の書式・id の付け方・related のつなぎ方は、直近の data ファイルに合わせる

## git
- コミットの末尾に次の2行を付ける
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: （そのセッションのURL）
- push 前に `git fetch origin main` して必要なら rebase（浅いクローンからの大きな push は 413 になる）
