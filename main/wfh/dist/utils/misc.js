"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleLinkedList = exports.SimpleLinkedListNode = exports.isEqualMapSet = exports.closestCommonParentDir = exports.getSymlinkForPackage = exports.getWorkDir = exports.getRootDir = exports.getTscConfigOfPkg = exports.createCliTable = exports.sexyFont = exports.boxString = exports.WordLexer = exports.WordTokenType = exports.isDrcpSymlink = exports.plinkEnv = void 0;
const base_LLn_parser_1 = require("../base-LLn-parser");
const trim_1 = __importDefault(require("lodash/trim"));
const get_1 = __importDefault(require("lodash/get"));
const Path = __importStar(require("path"));
const cfonts = __importStar(require("cfonts"));
const cli_table3_1 = __importDefault(require("cli-table3"));
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
})(WordTokenType = exports.WordTokenType || (exports.WordTokenType = {}));
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
function boxString(text, lineWidth = 70, whitespaceWrap = true) {
    const tb = createCliTable({
        colWidths: [lineWidth],
        wordWrap: whitespaceWrap,
        horizontalLines: false
    });
    tb.push(...text.split(/\n\r?/).map(item => [item]));
    return tb.toString();
    // const lexer = new WordLexer(text);
    // lineWidth = lineWidth - 4;
    // let updated = `+${'-'.repeat(lineWidth + 2)}+\n`;
    // let column = 0;
    // for (const word of lexer) {
    //   if (word.type === WordTokenType.word || word.type === WordTokenType.eos || word.type === WordTokenType.other ||
    //     word.type === WordTokenType.tab) {
    //     if (column === 0) {
    //       updated += '| ';
    //     }
    //     if (column + word.text.length > lineWidth) {
    //       updated += ' '.repeat(lineWidth - column);
    //       updated += ' |\n| ';
    //       // pad
    //       column = 0;
    //     }
    //     updated += word.type === WordTokenType.tab ? '  ' : word.text;
    //     column += word.type === WordTokenType.tab ? 2 : word.text.length;
    //   } else if (word.type === WordTokenType.eol) {
    //     if (column === 0) {
    //       updated += '| ';
    //     }
    //     updated += ' '.repeat(lineWidth - column);
    //     updated += ' |\n';
    //     column = 0;
    //   }
    // }
    // if (column !== 0) {
    //   updated += ' '.repeat(lineWidth - column);
    //   updated += ' |\n';
    // }
    // updated += `+${'-'.repeat(lineWidth + 2)}+`;
    // return updated.replace(/^(?=.)/mg, '  ');
}
exports.boxString = boxString;
function sexyFont(text, color = '#99a329', font = 'block') {
    return cfonts.render(text, { font, colors: [color] });
}
exports.sexyFont = sexyFont;
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
exports.createCliTable = createCliTable;
function getTscConfigOfPkg(json) {
    // const globs: string[] | undefined = get(json, 'dr.ts.globs');
    const srcDir = get_1.default(json, 'dr.ts.src', get_1.default(json, 'plink.tsc.src', 'ts'));
    const isomDir = get_1.default(json, 'dr.ts.isom', get_1.default(json, 'plink.tsc.isom', 'isom'));
    const include = get_1.default(json, 'dr.ts.include', get_1.default(json, 'plink.tsc.include'));
    const files = get_1.default(json, 'plink.tsc.files');
    let destDir = get_1.default(json, 'dr.ts.dest', get_1.default(json, 'plink.tsc.dest', 'dist'));
    destDir = trim_1.default(trim_1.default(destDir, '\\'), '/');
    return {
        srcDir, destDir, isomDir, include, files
    };
}
exports.getTscConfigOfPkg = getTscConfigOfPkg;
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
exports.getSymlinkForPackage = getSymlinkForPackage;
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
exports.closestCommonParentDir = closestCommonParentDir;
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
exports.isEqualMapSet = isEqualMapSet;
class SimpleLinkedListNode {
    constructor(prev, next, value) {
        this.prev = prev;
        this.next = next;
        this.value = value;
    }
}
exports.SimpleLinkedListNode = SimpleLinkedListNode;
class SimpleLinkedList {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3V0aWxzL21pc2MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdEQUFzRDtBQUN0RCx1REFBK0I7QUFDL0IscURBQTZCO0FBRTdCLDJDQUE2QjtBQUc3QiwrQ0FBaUM7QUFDakMsNERBQStCO0FBRS9CLE1BQU0sRUFBQyxhQUFhLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUMsR0FDbEYsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBRXZDLHNDQUFhO0FBRFIsUUFBQSxRQUFRLEdBQWEsRUFBQyxhQUFhLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUMsQ0FBQztBQUdqSCxJQUFZLGFBTVg7QUFORCxXQUFZLGFBQWE7SUFDdkIsK0NBQU8sQ0FBQTtJQUNQLGlEQUFJLENBQUE7SUFDSiwrQ0FBRyxDQUFBO0lBQ0gsK0NBQUcsQ0FBQTtJQUNILG1EQUFLLENBQUE7QUFDUCxDQUFDLEVBTlcsYUFBYSxHQUFiLHFCQUFhLEtBQWIscUJBQWEsUUFNeEI7QUFFRCxNQUFhLFNBQVUsU0FBUSwyQkFBd0I7SUFDckQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDaEIsT0FBTyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksSUFBSSxFQUFFO1lBQ3hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDNUIsUUFBUSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUU7Z0JBQ2pCLEtBQUssSUFBSTtvQkFDUCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2YsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEtBQUssSUFB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QUksQ0FBQztJQUNkLENBQUM7SUFFRCxDQUFDLFFBQVE7UUFDUCxLQUFLLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxJQUFJLElBQUksRUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRTtZQUMxRCxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUM7U0FDbEI7SUFDSCxDQUFDO0NBQ0Y7QUFqQ0QsNENBaUNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQmFzZUxleGVyLCBUb2tlbiB9IGZyb20gJy4uL2Jhc2UtTExuLXBhcnNlcic7XG5pbXBvcnQgdHJpbSBmcm9tICdsb2Rhc2gvdHJpbSc7XG5pbXBvcnQgZ2V0IGZyb20gJ2xvZGFzaC9nZXQnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQge1BsaW5rRW52fSBmcm9tICcuLi9ub2RlLXBhdGgnO1xuaW1wb3J0ICogYXMgY2ZvbnRzIGZyb20gJ2Nmb250cyc7XG5pbXBvcnQgVGFibGUgZnJvbSAnY2xpLXRhYmxlMyc7XG5cbmNvbnN0IHtpc0RyY3BTeW1saW5rLCB3b3JrRGlyLCByb290RGlyLCBzeW1saW5rRGlyTmFtZSwgZGlzdERpciwgbm9kZVBhdGgsIHBsaW5rRGlyfSA9XG4gIEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuZXhwb3J0IGNvbnN0IHBsaW5rRW52OiBQbGlua0VudiA9IHtpc0RyY3BTeW1saW5rLCB3b3JrRGlyLCByb290RGlyLCBzeW1saW5rRGlyTmFtZSwgZGlzdERpciwgbm9kZVBhdGgsIHBsaW5rRGlyfTtcbmV4cG9ydCB7aXNEcmNwU3ltbGlua307XG5cbmV4cG9ydCBlbnVtIFdvcmRUb2tlblR5cGUge1xuICBlb2wgPSAwLFxuICB3b3JkLFxuICB0YWIsXG4gIGVvcywgLy8gZW5kIG9mIHNlbnRlbmNlXG4gIG90aGVyXG59XG5cbmV4cG9ydCBjbGFzcyBXb3JkTGV4ZXIgZXh0ZW5kcyBCYXNlTGV4ZXI8V29yZFRva2VuVHlwZT4ge1xuICAqW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VG9rZW48V29yZFRva2VuVHlwZT4+IHtcbiAgICB3aGlsZSAodGhpcy5sYSgpICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcbiAgICAgIHN3aXRjaCAodGhpcy5sYSgpKSB7XG4gICAgICAgIGNhc2UgJ1xcbic6XG4gICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgaWYgKHRoaXMubGEoKSA9PT0gJ1xccicpXG4gICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICB5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS5lb2wsIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnXFx0JzpcbiAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICB5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS50YWIsIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBjb25zdCBmaXJzdCA9IHRoaXMubGEoKSE7XG4gICAgICAgICAgaWYgKC9bYS16QS1aJF9dLy50ZXN0KGZpcnN0KSkge1xuICAgICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgICB3aGlsZSh0aGlzLmxhKCkgIT0gbnVsbCAmJiAvW2EtekEtWiRfMC05XS8udGVzdCh0aGlzLmxhKCkhKSkge1xuICAgICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgvLS8udGVzdCh0aGlzLmxhKCkhKSlcbiAgICAgICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgICB5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS53b3JkLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKC9bMC05XS8udGVzdCh0aGlzLmxhKCkhKSkge1xuICAgICAgICAgICAgdGhpcy5jb25zdW1lTnVtYmVycygpO1xuICAgICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUud29yZCwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChmaXJzdCA9PT0gJy0nICYmIHRoaXMubGEoMikgJiYgL1swLTldLy50ZXN0KHRoaXMubGEoMikhKSkge1xuICAgICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgICB0aGlzLmNvbnN1bWVOdW1iZXJzKCk7XG4gICAgICAgICAgICB5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS53b3JkLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKC9bLC5dLy50ZXN0KGZpcnN0KSkge1xuICAgICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgICB5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS5lb3MsIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICB5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS5vdGhlciwgdGhpcywgc3RhcnQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN1bWVOdW1iZXJzKCkge1xuICAgIC8vIGlmICgvWzAtOV0vLnRlc3QodGhpcy5sYSgpKSkge1xuICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgIHdoaWxlKHRoaXMubGEoKSAhPSBudWxsICYmIC9bMC05Ll0vLnRlc3QodGhpcy5sYSgpISkpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgIH1cbiAgICAvLyB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJveFN0cmluZyh0ZXh0OiBzdHJpbmcsIGxpbmVXaWR0aCA9IDcwLCB3aGl0ZXNwYWNlV3JhcCA9IHRydWUpOiBzdHJpbmcge1xuICBjb25zdCB0YiA9IGNyZWF0ZUNsaVRhYmxlKHtcbiAgICBjb2xXaWR0aHM6IFtsaW5lV2lkdGhdLFxuICAgIHdvcmRXcmFwOiB3aGl0ZXNwYWNlV3JhcCxcbiAgICBob3Jpem9udGFsTGluZXM6IGZhbHNlXG4gIH0pO1xuICB0Yi5wdXNoKC4uLnRleHQuc3BsaXQoL1xcblxccj8vKS5tYXAoaXRlbSA9PiBbaXRlbV0pKTtcbiAgcmV0dXJuIHRiLnRvU3RyaW5nKCk7XG4gIC8vIGNvbnN0IGxleGVyID0gbmV3IFdvcmRMZXhlcih0ZXh0KTtcblxuICAvLyBsaW5lV2lkdGggPSBsaW5lV2lkdGggLSA0O1xuICAvLyBsZXQgdXBkYXRlZCA9IGArJHsnLScucmVwZWF0KGxpbmVXaWR0aCArIDIpfStcXG5gO1xuICAvLyBsZXQgY29sdW1uID0gMDtcbiAgLy8gZm9yIChjb25zdCB3b3JkIG9mIGxleGVyKSB7XG4gIC8vICAgaWYgKHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS53b3JkIHx8IHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS5lb3MgfHwgd29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLm90aGVyIHx8XG4gIC8vICAgICB3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUudGFiKSB7XG4gIC8vICAgICBpZiAoY29sdW1uID09PSAwKSB7XG4gIC8vICAgICAgIHVwZGF0ZWQgKz0gJ3wgJztcbiAgLy8gICAgIH1cbiAgLy8gICAgIGlmIChjb2x1bW4gKyB3b3JkLnRleHQubGVuZ3RoID4gbGluZVdpZHRoKSB7XG4gIC8vICAgICAgIHVwZGF0ZWQgKz0gJyAnLnJlcGVhdChsaW5lV2lkdGggLSBjb2x1bW4pO1xuICAvLyAgICAgICB1cGRhdGVkICs9ICcgfFxcbnwgJztcbiAgLy8gICAgICAgLy8gcGFkXG4gIC8vICAgICAgIGNvbHVtbiA9IDA7XG4gIC8vICAgICB9XG4gIC8vICAgICB1cGRhdGVkICs9IHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS50YWIgPyAnICAnIDogd29yZC50ZXh0O1xuICAvLyAgICAgY29sdW1uICs9IHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS50YWIgPyAyIDogd29yZC50ZXh0Lmxlbmd0aDtcbiAgLy8gICB9IGVsc2UgaWYgKHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS5lb2wpIHtcbiAgLy8gICAgIGlmIChjb2x1bW4gPT09IDApIHtcbiAgLy8gICAgICAgdXBkYXRlZCArPSAnfCAnO1xuICAvLyAgICAgfVxuICAvLyAgICAgdXBkYXRlZCArPSAnICcucmVwZWF0KGxpbmVXaWR0aCAtIGNvbHVtbik7XG4gIC8vICAgICB1cGRhdGVkICs9ICcgfFxcbic7XG4gIC8vICAgICBjb2x1bW4gPSAwO1xuICAvLyAgIH1cbiAgLy8gfVxuICAvLyBpZiAoY29sdW1uICE9PSAwKSB7XG4gIC8vICAgdXBkYXRlZCArPSAnICcucmVwZWF0KGxpbmVXaWR0aCAtIGNvbHVtbik7XG4gIC8vICAgdXBkYXRlZCArPSAnIHxcXG4nO1xuICAvLyB9XG4gIC8vIHVwZGF0ZWQgKz0gYCskeyctJy5yZXBlYXQobGluZVdpZHRoICsgMil9K2A7XG4gIC8vIHJldHVybiB1cGRhdGVkLnJlcGxhY2UoL14oPz0uKS9tZywgJyAgJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXh5Rm9udCh0ZXh0OiBzdHJpbmcsIGNvbG9yID0gJyM5OWEzMjknLCBmb250OiBjZm9udHMuRm9udE9wdGlvblsnZm9udCddID0gJ2Jsb2NrJykge1xuICByZXR1cm4gY2ZvbnRzLnJlbmRlcih0ZXh0LCB7Zm9udCwgY29sb3JzOiBbY29sb3JdfSk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xpVGFibGVPcHRpb24gZXh0ZW5kcyBOb25OdWxsYWJsZTxDb25zdHJ1Y3RvclBhcmFtZXRlcnM8VGFibGU+WzBdPiB7XG4gIGhvcml6b250YWxMaW5lcz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVDbGlUYWJsZShvcHQ/OiBDbGlUYWJsZU9wdGlvbikge1xuICBjb25zdCB0YWJsZU9wdDogQ2xpVGFibGVPcHRpb24gPSB7XG4gICAgLy8gc3R5bGU6IHtoZWFkOiBbXX0sXG4gICAgd29yZFdyYXA6IHRydWUsXG4gICAgLi4ub3B0XG4gIH07XG4gIGRlbGV0ZSB0YWJsZU9wdC5ob3Jpem9udGFsTGluZXM7XG5cbiAgaWYgKG9wdCAmJiBvcHQuaG9yaXpvbnRhbExpbmVzID09PSBmYWxzZSkge1xuICAgIHRhYmxlT3B0LmNoYXJzID0ge21pZDogJycsICdsZWZ0LW1pZCc6ICcnLCAnbWlkLW1pZCc6ICcnLCAncmlnaHQtbWlkJzogJycsICd0b3AtbWlkJzogJyd9O1xuICB9XG4gIGlmIChvcHQgJiYgb3B0Lmhvcml6b250YWxMaW5lcykge1xuICAgIHRhYmxlT3B0LmNvbEFsaWducyA9IG9wdC5jb2xBbGlnbnM7XG4gIH1cbiAgcmV0dXJuIG5ldyBUYWJsZSh0YWJsZU9wdCk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZVRzRGlycyB7XG4gIC8qKiBzcmNEaXIgd29ya3MgbGlrZSBcInJvb3REaXJcIiBpbiB0c2NvbmZpZyBjb21waWxlck9wdGlvbnMgKi9cbiAgc3JjRGlyOiBzdHJpbmc7XG4gIGRlc3REaXI6IHN0cmluZztcbiAgaXNvbURpcj86IHN0cmluZztcbiAgLyoqIEZvciBwbGluayBjb21tYW5kIHRzYywgXCJpc29tRGlyXCIgd2lsbCBiZSBpZ25vcmVkIGlmIFwiaW5jbHVkZVwiIGlzIHNldCBpbiBwYWNrYWdlLmpzb24gKi9cbiAgaW5jbHVkZT86IHN0cmluZ1tdIHwgc3RyaW5nO1xuICBmaWxlcz86IHN0cmluZ1tdIHwgc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHNjQ29uZmlnT2ZQa2coanNvbjogYW55KTogUGFja2FnZVRzRGlycyB7XG4gIC8vIGNvbnN0IGdsb2JzOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCA9IGdldChqc29uLCAnZHIudHMuZ2xvYnMnKTtcbiAgY29uc3Qgc3JjRGlyID0gZ2V0KGpzb24sICdkci50cy5zcmMnLCBnZXQoanNvbiwgJ3BsaW5rLnRzYy5zcmMnLCAndHMnKSk7XG4gIGNvbnN0IGlzb21EaXIgPSBnZXQoanNvbiwgJ2RyLnRzLmlzb20nLCBnZXQoanNvbiwgJ3BsaW5rLnRzYy5pc29tJywgJ2lzb20nKSk7XG4gIGNvbnN0IGluY2x1ZGUgPSBnZXQoanNvbiwgJ2RyLnRzLmluY2x1ZGUnLCBnZXQoanNvbiwgJ3BsaW5rLnRzYy5pbmNsdWRlJykpO1xuICBjb25zdCBmaWxlcyA9IGdldChqc29uLCAncGxpbmsudHNjLmZpbGVzJyk7XG4gIGxldCBkZXN0RGlyID0gZ2V0KGpzb24sICdkci50cy5kZXN0JywgZ2V0KGpzb24sICdwbGluay50c2MuZGVzdCcsICdkaXN0JykpO1xuXG4gIGRlc3REaXIgPSB0cmltKHRyaW0oZGVzdERpciwgJ1xcXFwnKSwgJy8nKTtcbiAgcmV0dXJuIHtcbiAgICBzcmNEaXIsIGRlc3REaXIsIGlzb21EaXIsIGluY2x1ZGUsIGZpbGVzXG4gIH07XG59XG5cbmV4cG9ydCBjb25zdCBnZXRSb290RGlyID0gKCkgPT4gcm9vdERpcjtcbi8qKiBnZXQgUGxpbmsgd29yayBkaXJlY3Rvcnkgb3IgcHJvY2Vzcy5jd2QoKSAqL1xuZXhwb3J0IGNvbnN0IGdldFdvcmtEaXIgPSAoKSA9PiB3b3JrRGlyO1xuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN5bWxpbmtGb3JQYWNrYWdlKHBrZ05hbWU6IHN0cmluZywgd29ya3NwYWNlRGlyID0gd29ya0Rpcikge1xuICBpZiAoc3ltbGlua0Rpck5hbWUpXG4gICAgcmV0dXJuIFBhdGgucmVzb2x2ZSh3b3Jrc3BhY2VEaXIsIHN5bWxpbmtEaXJOYW1lLCBwa2dOYW1lKTtcbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKHBhdGhzOiBJdGVyYWJsZTxzdHJpbmc+KSB7XG4gIGxldCBjb21tb25EaXI6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuXG4gIGZvciAoY29uc3QgcmVhbFBhdGggb2YgcGF0aHMpIHtcbiAgICBpZiAoY29tbW9uRGlyID09IG51bGwpIHtcbiAgICAgIGNvbW1vbkRpciA9IHJlYWxQYXRoLnNwbGl0KFBhdGguc2VwKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCBkaXIgPSByZWFsUGF0aC5zcGxpdChQYXRoLnNlcCk7XG4gICAgLy8gRmluZCB0aGUgY2xvc2VzdCBjb21tb24gcGFyZW50IGRpcmVjdG9yeSwgdXNlIGl0IGFzIHJvb3REaXJcbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IGNvbW1vbkRpci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGlmIChpID49IGRpci5sZW5ndGggfHwgY29tbW9uRGlyW2ldICE9PSBkaXJbaV0pIHtcbiAgICAgICAgY29tbW9uRGlyID0gY29tbW9uRGlyLnNsaWNlKDAsIGkpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgbGV0IGRpciA9IGNvbW1vbkRpciA/IGNvbW1vbkRpci5qb2luKFBhdGguc2VwKSA6IHdvcmtEaXI7XG4gIGlmIChkaXIuZW5kc1dpdGgoJzonKSkge1xuICAgIC8vIHdpbmRvdyBkaXNrIHJvb3QgZGlyZWN0b3J5IGxpa2UgXCJjOlwiLCBuZWVkcyB0byB0dXJuIGl0IHRvIFwiYzpcXFxcXCIsIHNpbmNlIHBhdGggbW9kdWxlIG1hbGZ1bmN0aW9ucyBvbiBcImM6XCJcbiAgICBkaXIgKz0gUGF0aC5zZXA7XG4gIH1cbiAgcmV0dXJuIGRpcjtcbn1cblxuLy8gaW50ZXJmYWNlIE1hcE9yU2V0IGV4dGVuZHMgSXRlcmFibGU8YW55PiB7XG4vLyAgIHNpemU6IG51bWJlcjtcbi8vICAgaGFzKGVsOiBhbnkpOiBib29sZWFuO1xuLy8gfVxuZXhwb3J0IGZ1bmN0aW9uIGlzRXF1YWxNYXBTZXQ8VD4oc2V0MTogU2V0PFQ+IHwgTWFwPFQsIGFueT4sIHNldDI6IFNldDxUPiB8IE1hcDxULCBhbnk+KSB7XG4gIGlmIChzZXQxLnNpemUgIT09IHNldDIuc2l6ZSlcbiAgICByZXR1cm4gZmFsc2U7XG4gIGZvciAoY29uc3QgZWwgb2Ygc2V0MSBpbnN0YW5jZW9mIE1hcCA/IHNldDEua2V5cygpIDogc2V0MSkge1xuICAgIGlmICghc2V0Mi5oYXMoZWwpKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGZvciAoY29uc3QgZWwgb2Ygc2V0MiBpbnN0YW5jZW9mIE1hcCA/IHNldDIua2V5cygpIDogc2V0Mikge1xuICAgIGlmICghc2V0MS5oYXMoZWwpKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgY2xhc3MgU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcHJldjogU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4gfCBudWxsLFxuICAgIHB1YmxpYyBuZXh0OiBTaW1wbGVMaW5rZWRMaXN0Tm9kZTxUPiB8IG51bGwsXG4gICAgcHVibGljIHZhbHVlOiBUXG4gICkge31cbn1cblxuZXhwb3J0IGNsYXNzIFNpbXBsZUxpbmtlZExpc3Q8VD4ge1xuICBmaXJzdDogU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4gfCBudWxsO1xuICBsYXN0OiBTaW1wbGVMaW5rZWRMaXN0Tm9kZTxUPiB8IG51bGw7XG5cbiAgcmVtb3ZlTm9kZShub2RlOiBTaW1wbGVMaW5rZWRMaXN0Tm9kZTxUPikge1xuICAgIGlmIChub2RlLnByZXYpXG4gICAgICBub2RlLnByZXYubmV4dCA9IG5vZGUubmV4dDtcbiAgICBpZiAobm9kZS5uZXh0KVxuICAgICAgbm9kZS5uZXh0LnByZXYgPSBub2RlLnByZXY7XG4gICAgaWYgKHRoaXMuZmlyc3QgPT09IG5vZGUpIHtcbiAgICAgIHRoaXMuZmlyc3QgPSBub2RlLm5leHQ7XG4gICAgfVxuICAgIGlmICh0aGlzLmxhc3QgPT09IG5vZGUpIHtcbiAgICAgIHRoaXMubGFzdCA9IG5vZGUucHJldjtcbiAgICB9XG4gIH1cblxuICBwdXNoKHZhbHVlOiBUKTogU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4ge1xuICAgIGNvbnN0IG5vZGUgPSBuZXcgU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4odGhpcy5sYXN0LCBudWxsLCB2YWx1ZSk7XG4gICAgaWYgKHRoaXMubGFzdClcbiAgICAgIHRoaXMubGFzdC5uZXh0ID0gbm9kZTtcbiAgICB0aGlzLmxhc3QgPSBub2RlO1xuICAgIGlmICh0aGlzLmZpcnN0ID09IG51bGwpIHtcbiAgICAgIHRoaXMuZmlyc3QgPSBub2RlO1xuICAgIH1cbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gICp0cmF2ZXJzZSgpIHtcbiAgICBmb3IgKGxldCBjdXJyID0gdGhpcy5maXJzdDsgY3VyciAhPSBudWxsOyBjdXJyID0gY3Vyci5uZXh0KSB7XG4gICAgICB5aWVsZCBjdXJyLnZhbHVlO1xuICAgIH1cbiAgfVxufVxuIl19