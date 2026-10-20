// aiueos/issn_judgment.cljk（判定コア）と正本 TS（kotoba/src/types.ts）の
// 実行 parity。同一ベクタを node で直接実行して照合（guest 側は amu test で検証済み）。
import { isValidIssn, normalizeIssn, formatIssn } from "../src/types.ts";
import assert from "node:assert";

// guest test-issn / test-issn-nature / test-issn-x / test-issn-bad
assert.equal(isValidIssn("03785955"), true);
assert.equal(isValidIssn("00280836"), true);
assert.equal(isValidIssn("0317848X"), true);
assert.equal(isValidIssn("03785954"), false);
// guest 側と同境界: 8 文字でない・X がチェック位置以外
assert.equal(isValidIssn("1234567"), false);
assert.equal(isValidIssn("X2345678"), false);
// normalize / format（host 仕事だが境界確認）
assert.equal(normalizeIssn("0378-5955"), "03785955");
assert.equal(formatIssn("03785955"), "0378-5955");
console.log("issn parity_vectors: all pass");
