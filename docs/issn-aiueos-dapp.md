# app-issn — itonami（dapp）上の分散型設計

状態: 第 1 スライス実装（2026-10-20）。正本はこの文書。
追跡: Linear JUN-128（親 JUN-116）。

## 位置づけ

app-issn は ISO 3297 の逐次刊行物レジストリ。本スライスは
**チェックデジット検証・計算**（正本: `kotoba/src/types.ts` の `isValidIssn`）を
判定コア化。

## このスライス: ISSN 判定コア

| 層 | 実体 | 状態 |
|---|---|---|
| 判定コア guest | `aiueos/issn_judgment.cljk` — issn-valid（7 桁に重み 8..2、+ チェックで mod 11）/ issn-check-digit（0..10、10 は X） | **実装済み・実測** |
| 記述子 | `aiueos/issn.edn` | **実装済み** |
| parity | `kotoba/test/parity_vectors.mjs` — **正本 TS を node で直接実行**し同一ベクタで一致（X チェック・拒否・normalize/format 境界） | **実装済み・実測** |

実測: `amu test aiueos/issn_judgment.cljk` → **15/15**（jvm-kir / js / wasm）。
parity → node 実行 8 ベクタ全通過。

## 実測で訂正したベクタ構築ミス（記録）

第一稿で「0378-5955」の 7 桁 + チェックを `3785955 / 5` と置いたが、
**8 文字のうち先頭 7 文字が対象**（`0378595` + check `5`）。誤ベクタ
（280836 / 6）が偶然 mod 11 で成立して通ってしまった —— 正解ベクタ
（28083 / 6）に訂正し、正しいベクタが実際に落ちることも確認してから修正。
guest 規約のとおり **mod は quot で構成**。

## 未実装境界

- registerSerial / lookup / list / coverage（レジストリ lexicon）の admission 判定。
- ISSN-L（linking ISSN）の判定。normalizeIssn / formatIssn（文字列操作）は
  host 仕事（parity で境界のみ確認）。
- mon（DNA）化、aiueos session 載せ（fleet 共通）。
