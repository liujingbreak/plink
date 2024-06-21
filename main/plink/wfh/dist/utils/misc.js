"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleLinkedList = exports.SimpleLinkedListNode = exports.getWorkDir = exports.getRootDir = exports.WordLexer = exports.WordTokenType = exports.isDrcpSymlink = exports.plinkEnv = void 0;
exports.boxString = boxString;
exports.sexyFont = sexyFont;
exports.createCliTable = createCliTable;
exports.getTscConfigOfPkg = getTscConfigOfPkg;
exports.getSymlinkForPackage = getSymlinkForPackage;
exports.closestCommonParentDir = closestCommonParentDir;
exports.isEqualMapSet = isEqualMapSet;
const tslib_1 = require("tslib");
const Path = tslib_1.__importStar(require("path"));
const get_1 = tslib_1.__importDefault(require("lodash/get"));
const trim_1 = tslib_1.__importDefault(require("lodash/trim"));
// import * as fs from 'fs';
require("../node-path");
const cfonts = tslib_1.__importStar(require("cfonts"));
const cli_table3_1 = tslib_1.__importDefault(require("cli-table3"));
const base_LLn_parser_1 = require("../base-LLn-parser");
const { isDrcpSymlink, workDir, rootDir, symlinkDirName, distDir, nodePath, plinkDir } = JSON.parse(process.env.__plink);
exports.isDrcpSymlink = isDrcpSymlink;
exports.plinkEnv = { isDrcpSymlink, workDir, rootDir, symlinkDirName, distDir, nodePath, plinkDir };
var WordTokenType;
(function (WordTokenType) {
    WordTokenType[WordTokenType["eol"] = 0] = "eol";
    WordTokenType[WordTokenType["word"] = 1] = "word";
    WordTokenType[WordTokenType["tab"] = 2] = "tab";
    WordTokenType[WordTokenType["eos"] = 3] = "eos";
    WordTokenType[WordTokenType["other"] = 4] = "other";
})(WordTokenType || (exports.WordTokenType = WordTokenType = {}));
class WordLexer extends base_LLn_parser_1.BaseLexer {
    *[Symbol.iterator]() {
        while (this.la() != null) {
            const start = this.position;
            switch (this.la()) {
                case '\n':
                    this.advance();
                    if (this.la() === '\r')
                        this.advance();
                    yield new base_LLn_parser_1.Token(WordTokenType.eol, this, start);
                    break;
                case '\t':
                    this.advance();
                    yield new base_LLn_parser_1.Token(WordTokenType.tab, this, start);
                    break;
                default:
                    const first = this.la();
                    if (/[a-zA-Z$_]/.test(first)) {
                        this.advance();
                        while (this.la() != null && /[a-zA-Z$_0-9]/.test(this.la())) {
                            this.advance();
                        }
                        if (/-/.test(this.la()))
                            this.advance();
                        yield new base_LLn_parser_1.Token(WordTokenType.word, this, start);
                        break;
                    }
                    if (/[0-9]/.test(this.la())) {
                        this.consumeNumbers();
                        yield new base_LLn_parser_1.Token(WordTokenType.word, this, start);
                        break;
                    }
                    if (first === '-' && this.la(2) && /[0-9]/.test(this.la(2))) {
                        this.advance();
                        this.consumeNumbers();
                        yield new base_LLn_parser_1.Token(WordTokenType.word, this, start);
                        break;
                    }
                    if (/[,.]/.test(first)) {
                        this.advance();
                        yield new base_LLn_parser_1.Token(WordTokenType.eos, this, start);
                        break;
                    }
                    this.advance();
                    yield new base_LLn_parser_1.Token(WordTokenType.other, this, start);
            }
        }
    }
    consumeNumbers() {
        // if (/[0-9]/.test(this.la())) {
        this.advance();
        while (this.la() != null && /[0-9.]/.test(this.la())) {
            this.advance();
        }
        // }
    }
}
exports.WordLexer = WordLexer;
function boxString(text, lineWidth = process.stdout.columns - 2, whitespaceWrap = true) {
    const tb = createCliTable({
        colWidths: [lineWidth],
        wordWrap: whitespaceWrap,
        horizontalLines: false
    });
    tb.push(...text.split(/\n\r?/).map(item => [item]));
    return tb.toString();
}
function sexyFont(text, color = '#99a329', font = 'block') {
    return cfonts.render(text, { font, colors: [color] });
}
function createCliTable(opt) {
    const tableOpt = Object.assign({ 
        // style: {head: []},
        wordWrap: true }, opt);
    delete tableOpt.horizontalLines;
    if (opt && opt.horizontalLines === false) {
        tableOpt.chars = { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '', 'top-mid': '' };
    }
    if (opt && opt.horizontalLines) {
        tableOpt.colAligns = opt.colAligns;
    }
    return new cli_table3_1.default(tableOpt);
}
function getTscConfigOfPkg(json) {
    // const globs: string[] | undefined = get(json, 'dr.ts.globs');
    const srcDir = (0, get_1.default)(json, 'dr.ts.src', (0, get_1.default)(json, 'plink.tsc.src', 'ts'));
    const isomDir = (0, get_1.default)(json, 'dr.ts.isom', (0, get_1.default)(json, 'plink.tsc.isom', 'isom'));
    const include = (0, get_1.default)(json, 'dr.ts.include', (0, get_1.default)(json, 'plink.tsc.include'));
    const files = (0, get_1.default)(json, 'plink.tsc.files');
    let destDir = (0, get_1.default)(json, 'dr.ts.dest', (0, get_1.default)(json, 'plink.tsc.dest', 'dist'));
    destDir = (0, trim_1.default)((0, trim_1.default)(destDir, '\\'), '/');
    return {
        srcDir, destDir, isomDir, include, files
    };
}
const getRootDir = () => rootDir;
exports.getRootDir = getRootDir;
/** get Plink work directory or process.cwd() */
const getWorkDir = () => workDir;
exports.getWorkDir = getWorkDir;
function getSymlinkForPackage(pkgName, workspaceDir = workDir) {
    if (symlinkDirName)
        return Path.resolve(workspaceDir, symlinkDirName, pkgName);
    return null;
}
function closestCommonParentDir(paths) {
    let commonDir;
    for (const realPath of paths) {
        if (commonDir == null) {
            commonDir = realPath.split(Path.sep);
            continue;
        }
        const dir = realPath.split(Path.sep);
        // Find the closest common parent directory, use it as rootDir
        for (let i = 0, l = commonDir.length; i < l; i++) {
            if (i >= dir.length || commonDir[i] !== dir[i]) {
                commonDir = commonDir.slice(0, i);
                break;
            }
        }
    }
    let dir = commonDir ? commonDir.join(Path.sep) : workDir;
    if (dir.endsWith(':')) {
        // window disk root directory like "c:", needs to turn it to "c:\\", since path module malfunctions on "c:"
        dir += Path.sep;
    }
    return dir;
}
// interface MapOrSet extends Iterable<any> {
//   size: number;
//   has(el: any): boolean;
// }
function isEqualMapSet(set1, set2) {
    if (set1.size !== set2.size)
        return false;
    for (const el of set1 instanceof Map ? set1.keys() : set1) {
        if (!set2.has(el))
            return false;
    }
    for (const el of set2 instanceof Map ? set2.keys() : set2) {
        if (!set1.has(el))
            return false;
    }
    return true;
}
class SimpleLinkedListNode {
    constructor(prev, next, value) {
        this.prev = prev;
        this.next = next;
        this.value = value;
    }
}
exports.SimpleLinkedListNode = SimpleLinkedListNode;
class SimpleLinkedList {
    constructor() {
        this.first = null;
        this.last = null;
    }
    removeNode(node) {
        if (node.prev)
            node.prev.next = node.next;
        if (node.next)
            node.next.prev = node.prev;
        if (this.first === node) {
            this.first = node.next;
        }
        if (this.last === node) {
            this.last = node.prev;
        }
    }
    push(value) {
        const node = new SimpleLinkedListNode(this.last, null, value);
        if (this.last)
            this.last.next = node;
        this.last = node;
        if (this.first == null) {
            this.first = node;
        }
        return node;
    }
    *traverse() {
        for (let curr = this.first; curr != null; curr = curr.next) {
            yield curr.value;
        }
    }
}
exports.SimpleLinkedList = SimpleLinkedList;
//# sourceMappingURL=misc.js.map