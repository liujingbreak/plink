"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupTTY = setupTTY;
exports.lookupPlinkRoot = lookupPlinkRoot;
exports.isCodePointFullWidth = isCodePointFullWidth;
const tslib_1 = require("tslib");
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const node_fs_1 = tslib_1.__importDefault(require("node:fs"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
function setupTTY(screenColumns, screenRows) {
    chalk_1.default.level = 3;
    process.stdout.isTTY = true;
    process.stderr.isTTY = true;
    process.stdout.columns = screenColumns;
    process.stderr.columns = screenColumns;
    process.stdout.rows = screenRows;
    process.stderr.rows = screenRows;
    process.stdout.hasColors = process.stderr.hasColors = (..._cnt) => {
        return true;
    };
    process.stdout.getWindowSize = process.stderr.getWindowSize = () => [screenColumns, screenRows];
}
function lookupPlinkRoot(cwd) {
    const { root } = node_path_1.default.parse(cwd);
    let plinkRoot;
    while (cwd !== root) {
        if (node_fs_1.default.existsSync(node_path_1.default.join(cwd, 'node_modules/@wfh/plink'))) {
            plinkRoot = cwd;
            break;
        }
        cwd = node_path_1.default.dirname(cwd);
    }
    return plinkRoot;
}
/**
Block                                   Range       Comment
CJK Unified Ideographs                  4E00-9FFF   Common
CJK Unified Ideographs Extension A      3400-4DBF   Rare
CJK Unified Ideographs Extension B      20000-2A6DF Rare, historic
CJK Unified Ideographs Extension C      2A700–2B73F Rare, historic
CJK Unified Ideographs Extension D      2B740–2B81F Uncommon, some in current use
CJK Unified Ideographs Extension E      2B820–2CEAF Rare, historic
CJK Compatibility Ideographs            F900-FAFF   Duplicates, unifiable variants, corporate characters
CJK Compatibility Ideographs Supplement 2F800-2FA1F Unifiable variants
*/
const CJK_CODE_RANGE = [
    [0x4E00, 0x9FFF],
    [0x3400, 0x4DBF],
    [0x20000, 0x2A6DF]
];
/**
 * Simply guessing any code point that is greater than 16-bit (might be Surrogate pairs) is full-width character,
 * and code point within CJK range is also full-width
 */
function isCodePointFullWidth(codePoint) {
    return codePoint > 0xffff || CJK_CODE_RANGE.some(([low, high]) => codePoint >= low && codePoint <= high);
}
//# sourceMappingURL=process-common.js.map