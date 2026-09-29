# issn.etzhayyim.com — ISSN Periodical Identification

## Identity

| key | value |
|---|---|
| domain | issn.etzhayyim.com |
| performerType | service |
| nanoid | sn3k8m2v |
| primary DID | `did:web:issn.etzhayyim.com` |
| NSID prefix | `com.etzhayyim.apps.issn.*` |

## What This App Does

ISO 3297 International Standard Serial Number registry。世界中の逐次刊行物 (学術誌、雑誌、新聞) を DID 化。

- ISSN (8 digits, modulo 11 check) + ISSN-L (linking ISSN)
- Medium 別: Print ISSN (p-ISSN) / Electronic ISSN (e-ISSN)
- ISSN Centre (国別) → path-based DID
- 書誌データ (タイトル、出版者、頻度、言語、主題)

## Multi-DID Model

| DID | 用途 |
|---|---|
| `did:web:issn.etzhayyim.com` | App coordinator |
| `did:web:issn.etzhayyim.com:{centre}` | National ISSN Centre (e.g., `fr` France, `jp` Japan) |

## Data Collections

| collection | NSID | 内容 |
|---|---|---|
| serial | `com.etzhayyim.apps.issn.serial` | Serial master (issn, title, publisher, frequency, language) |
| linking | `com.etzhayyim.apps.issn.linking` | ISSN-L linking (p-ISSN ↔ e-ISSN) |
| subject | `com.etzhayyim.apps.issn.subject` | Subject classification |
| centre | `com.etzhayyim.apps.issn.centre` | National ISSN Centre registry |
| coverage_report | `com.etzhayyim.apps.issn.coverage_report` | Coverage metrics |

## WIT Capability Exports

| interface | 機能 |
|---|---|
| `serial-registry` | ISSN lookup, search, register, validate |
| `linking-service` | ISSN-L linking, p-ISSN/e-ISSN resolution |
| `cross-classification` | Subject classification mapping |

## Heartbeat (Shinka)

60s heartbeat → coverage per ISSN centre → weakest → ATPost

## Commands

| command | 説明 |
|---|---|
| `register-serial` | ISSN + 書誌データ登録 |
| `get-serial` | ISSN で検索 |
| `search-serials` | タイトルで検索 |
| `validate-issn` | Check digit validation |
| `resolve-linking` | ISSN-L → p-ISSN/e-ISSN 解決 |
| `list-by-centre` | National Centre で一覧 |
| `get-coverage` | Centre coverage metrics |
