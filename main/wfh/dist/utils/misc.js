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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3V0aWxzL21pc2MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdEQUFzRDtBQUN0RCx1REFBK0I7QUFDL0IscURBQTZCO0FBRTdCLDJDQUE2QjtBQUc3QiwrQ0FBaUM7QUFDakMsNERBQStCO0FBRS9CLE1BQU0sRUFBQyxhQUFhLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUMsR0FDbEYsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBRXZDLHNDQUFhO0FBRFIsUUFBQSxRQUFRLEdBQWEsRUFBQyxhQUFhLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUMsQ0FBQztBQUdqSCxJQUFZLGFBTVg7QUFORCxXQUFZLGFBQWE7SUFDdkIsK0NBQU8sQ0FBQTtJQUNQLGlEQUFJLENBQUE7SUFDSiwrQ0FBRyxDQUFBO0lBQ0gsK0NBQUcsQ0FBQTtJQUNILG1EQUFLLENBQUE7QUFDUCxDQUFDLEVBTlcsYUFBYSxHQUFiLHFCQUFhLEtBQWIscUJBQWEsUUFNeEI7QUFFRCxNQUFhLFNBQVUsU0FBUSwyQkFBd0I7SUFDckQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDaEIsT0FBTyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksSUFBSSxFQUFFO1lBQ3hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDNUIsUUFBUSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUU7Z0JBQ2pCLEtBQUssSUFBSTtvQkFDUCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2YsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEtBQUssSUFB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SyxJQUFJLElBQUksRUFBRTtZQUN0QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztTQUNuQjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVELENBQUMsUUFBUTtRQUNQLEtBQUssSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLElBQUksSUFBSSxFQUFFLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQzFELE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQztTQUNsQjtJQUNILENBQUM7Q0FDRjtBQWpDRCw0Q0FpQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCYXNlTGV4ZXIsIFRva2VuIH0gZnJvbSAnLi4vYmFzZS1MTG4tcGFyc2VyJztcbmltcG9ydCB0cmltIGZyb20gJ2xvZGFzaC90cmltJztcbmltcG9ydCBnZXQgZnJvbSAnbG9kYXNoL2dldCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7UGxpbmtFbnZ9IGZyb20gJy4uL25vZGUtcGF0aCc7XG5pbXBvcnQgKiBhcyBjZm9udHMgZnJvbSAnY2ZvbnRzJztcbmltcG9ydCBUYWJsZSBmcm9tICdjbGktdGFibGUzJztcblxuY29uc3Qge2lzRHJjcFN5bWxpbmssIHdvcmtEaXIsIHJvb3REaXIsIHN5bWxpbmtEaXJOYW1lLCBkaXN0RGlyLCBub2RlUGF0aCwgcGxpbmtEaXJ9ID1cbiAgSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5leHBvcnQgY29uc3QgcGxpbmtFbnY6IFBsaW5rRW52ID0ge2lzRHJjcFN5bWxpbmssIHdvcmtEaXIsIHJvb3REaXIsIHN5bWxpbmtEaXJOYW1lLCBkaXN0RGlyLCBub2RlUGF0aCwgcGxpbmtEaXJ9O1xuZXhwb3J0IHtpc0RyY3BTeW1saW5rfTtcblxuZXhwb3J0IGVudW0gV29yZFRva2VuVHlwZSB7XG4gIGVvbCA9IDAsXG4gIHdvcmQsXG4gIHRhYixcbiAgZW9zLCAvLyBlbmQgb2Ygc2VudGVuY2VcbiAgb3RoZXJcbn1cblxuZXhwb3J0IGNsYXNzIFdvcmRMZXhlciBleHRlbmRzIEJhc2VMZXhlcjxXb3JkVG9rZW5UeXBlPiB7XG4gICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUb2tlbjxXb3JkVG9rZW5UeXBlPj4ge1xuICAgIHdoaWxlICh0aGlzLmxhKCkgIT0gbnVsbCkge1xuICAgICAgY29uc3Qgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuICAgICAgc3dpdGNoICh0aGlzLmxhKCkpIHtcbiAgICAgICAgY2FzZSAnXFxuJzpcbiAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICBpZiAodGhpcy5sYSgpID09PSAnXFxyJylcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLmVvbCwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdcXHQnOlxuICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLnRhYiwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGNvbnN0IGZpcnN0ID0gdGhpcy5sYSgpITtcbiAgICAgICAgICBpZiAoL1thLXpBLVokX10vLnRlc3QoZmlyc3QpKSB7XG4gICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIHdoaWxlKHRoaXMubGEoKSAhPSBudWxsICYmIC9bYS16QS1aJF8wLTldLy50ZXN0KHRoaXMubGEoKSEpKSB7XG4gICAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKC8tLy50ZXN0KHRoaXMubGEoKSEpKVxuICAgICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLndvcmQsIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoL1swLTldLy50ZXN0KHRoaXMubGEoKSEpKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnN1bWVOdW1iZXJzKCk7XG4gICAgICAgICAgICB5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS53b3JkLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGZpcnN0ID09PSAnLScgJiYgdGhpcy5sYSgyKSAmJiAvWzAtOV0vLnRlc3QodGhpcy5sYSgyKSEpKSB7XG4gICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIHRoaXMuY29uc3VtZU51bWJlcnMoKTtcbiAgICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLndvcmQsIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoL1ssLl0vLnRlc3QoZmlyc3QpKSB7XG4gICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLmVvcywgdGhpcywgc3RhcnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLm90aGVyLCB0aGlzLCBzdGFydCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3VtZU51bWJlcnMoKSB7XG4gICAgLy8gaWYgKC9bMC05XS8udGVzdCh0aGlzLmxhKCkpKSB7XG4gICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgd2hpbGUodGhpcy5sYSgpICE9IG51bGwgJiYgL1swLTkuXS8udGVzdCh0aGlzLmxhKCkhKSkge1xuICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgfVxuICAgIC8vIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYm94U3RyaW5nKHRleHQ6IHN0cmluZywgbGluZVdpZHRoID0gNzAsIHdoaXRlc3BhY2VXcmFwID0gdHJ1ZSk6IHN0cmluZyB7XG4gIGNvbnN0IHRiID0gY3JlYXRlQ2xpVGFibGUoe1xuICAgIGNvbFdpZHRoczogW2xpbmVXaWR0aF0sXG4gICAgd29yZFdyYXA6IHdoaXRlc3BhY2VXcmFwLFxuICAgIGhvcml6b250YWxMaW5lczogZmFsc2VcbiAgfSk7XG4gIHRiLnB1c2goLi4udGV4dC5zcGxpdCgvXFxuXFxyPy8pLm1hcChpdGVtID0+IFtpdGVtXSkpO1xuICByZXR1cm4gdGIudG9TdHJpbmcoKTtcbiAgLy8gY29uc3QgbGV4ZXIgPSBuZXcgV29yZExleGVyKHRleHQpO1xuXG4gIC8vIGxpbmVXaWR0aCA9IGxpbmVXaWR0aCAtIDQ7XG4gIC8vIGxldCB1cGRhdGVkID0gYCskeyctJy5yZXBlYXQobGluZVdpZHRoICsgMil9K1xcbmA7XG4gIC8vIGxldCBjb2x1bW4gPSAwO1xuICAvLyBmb3IgKGNvbnN0IHdvcmQgb2YgbGV4ZXIpIHtcbiAgLy8gICBpZiAod29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLndvcmQgfHwgd29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLmVvcyB8fCB3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUub3RoZXIgfHxcbiAgLy8gICAgIHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS50YWIpIHtcbiAgLy8gICAgIGlmIChjb2x1bW4gPT09IDApIHtcbiAgLy8gICAgICAgdXBkYXRlZCArPSAnfCAnO1xuICAvLyAgICAgfVxuICAvLyAgICAgaWYgKGNvbHVtbiArIHdvcmQudGV4dC5sZW5ndGggPiBsaW5lV2lkdGgpIHtcbiAgLy8gICAgICAgdXBkYXRlZCArPSAnICcucmVwZWF0KGxpbmVXaWR0aCAtIGNvbHVtbik7XG4gIC8vICAgICAgIHVwZGF0ZWQgKz0gJyB8XFxufCAnO1xuICAvLyAgICAgICAvLyBwYWRcbiAgLy8gICAgICAgY29sdW1uID0gMDtcbiAgLy8gICAgIH1cbiAgLy8gICAgIHVwZGF0ZWQgKz0gd29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLnRhYiA/ICcgICcgOiB3b3JkLnRleHQ7XG4gIC8vICAgICBjb2x1bW4gKz0gd29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLnRhYiA/IDIgOiB3b3JkLnRleHQubGVuZ3RoO1xuICAvLyAgIH0gZWxzZSBpZiAod29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLmVvbCkge1xuICAvLyAgICAgaWYgKGNvbHVtbiA9PT0gMCkge1xuICAvLyAgICAgICB1cGRhdGVkICs9ICd8ICc7XG4gIC8vICAgICB9XG4gIC8vICAgICB1cGRhdGVkICs9ICcgJy5yZXBlYXQobGluZVdpZHRoIC0gY29sdW1uKTtcbiAgLy8gICAgIHVwZGF0ZWQgKz0gJyB8XFxuJztcbiAgLy8gICAgIGNvbHVtbiA9IDA7XG4gIC8vICAgfVxuICAvLyB9XG4gIC8vIGlmIChjb2x1bW4gIT09IDApIHtcbiAgLy8gICB1cGRhdGVkICs9ICcgJy5yZXBlYXQobGluZVdpZHRoIC0gY29sdW1uKTtcbiAgLy8gICB1cGRhdGVkICs9ICcgfFxcbic7XG4gIC8vIH1cbiAgLy8gdXBkYXRlZCArPSBgKyR7Jy0nLnJlcGVhdChsaW5lV2lkdGggKyAyKX0rYDtcbiAgLy8gcmV0dXJuIHVwZGF0ZWQucmVwbGFjZSgvXig/PS4pL21nLCAnICAnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNleHlGb250KHRleHQ6IHN0cmluZywgY29sb3IgPSAnIzk5YTMyOScsIGZvbnQ6IGNmb250cy5Gb250T3B0aW9uWydmb250J10gPSAnYmxvY2snKSB7XG4gIHJldHVybiBjZm9udHMucmVuZGVyKHRleHQsIHtmb250LCBjb2xvcnM6IFtjb2xvcl19KTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDbGlUYWJsZU9wdGlvbiBleHRlbmRzIE5vbk51bGxhYmxlPENvbnN0cnVjdG9yUGFyYW1ldGVyczxUYWJsZT5bMF0+IHtcbiAgaG9yaXpvbnRhbExpbmVzPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNsaVRhYmxlKG9wdD86IENsaVRhYmxlT3B0aW9uKSB7XG4gIGNvbnN0IHRhYmxlT3B0OiBDbGlUYWJsZU9wdGlvbiA9IHtcbiAgICAvLyBzdHlsZToge2hlYWQ6IFtdfSxcbiAgICB3b3JkV3JhcDogdHJ1ZSxcbiAgICAuLi5vcHRcbiAgfTtcbiAgZGVsZXRlIHRhYmxlT3B0Lmhvcml6b250YWxMaW5lcztcblxuICBpZiAob3B0ICYmIG9wdC5ob3Jpem9udGFsTGluZXMgPT09IGZhbHNlKSB7XG4gICAgdGFibGVPcHQuY2hhcnMgPSB7bWlkOiAnJywgJ2xlZnQtbWlkJzogJycsICdtaWQtbWlkJzogJycsICdyaWdodC1taWQnOiAnJywgJ3RvcC1taWQnOiAnJ307XG4gIH1cbiAgaWYgKG9wdCAmJiBvcHQuaG9yaXpvbnRhbExpbmVzKSB7XG4gICAgdGFibGVPcHQuY29sQWxpZ25zID0gb3B0LmNvbEFsaWducztcbiAgfVxuICByZXR1cm4gbmV3IFRhYmxlKHRhYmxlT3B0KTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlVHNEaXJzIHtcbiAgLyoqIHNyY0RpciB3b3JrcyBsaWtlIFwicm9vdERpclwiIGluIHRzY29uZmlnIGNvbXBpbGVyT3B0aW9ucyAqL1xuICBzcmNEaXI6IHN0cmluZztcbiAgZGVzdERpcjogc3RyaW5nO1xuICBpc29tRGlyPzogc3RyaW5nO1xuICAvKiogRm9yIHBsaW5rIGNvbW1hbmQgdHNjLCBcImlzb21EaXJcIiB3aWxsIGJlIGlnbm9yZWQgaWYgXCJpbmNsdWRlXCIgaXMgc2V0IGluIHBhY2thZ2UuanNvbiAqL1xuICBpbmNsdWRlPzogc3RyaW5nW10gfCBzdHJpbmc7XG4gIGZpbGVzPzogc3RyaW5nW10gfCBzdHJpbmc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUc2NDb25maWdPZlBrZyhqc29uOiBhbnkpOiBQYWNrYWdlVHNEaXJzIHtcbiAgLy8gY29uc3QgZ2xvYnM6IHN0cmluZ1tdIHwgdW5kZWZpbmVkID0gZ2V0KGpzb24sICdkci50cy5nbG9icycpO1xuICBjb25zdCBzcmNEaXIgPSBnZXQoanNvbiwgJ2RyLnRzLnNyYycsIGdldChqc29uLCAncGxpbmsudHNjLnNyYycsICd0cycpKTtcbiAgY29uc3QgaXNvbURpciA9IGdldChqc29uLCAnZHIudHMuaXNvbScsIGdldChqc29uLCAncGxpbmsudHNjLmlzb20nLCAnaXNvbScpKTtcbiAgY29uc3QgaW5jbHVkZSA9IGdldChqc29uLCAnZHIudHMuaW5jbHVkZScsIGdldChqc29uLCAncGxpbmsudHNjLmluY2x1ZGUnKSk7XG4gIGNvbnN0IGZpbGVzID0gZ2V0KGpzb24sICdwbGluay50c2MuZmlsZXMnKTtcbiAgbGV0IGRlc3REaXIgPSBnZXQoanNvbiwgJ2RyLnRzLmRlc3QnLCBnZXQoanNvbiwgJ3BsaW5rLnRzYy5kZXN0JywgJ2Rpc3QnKSk7XG5cbiAgZGVzdERpciA9IHRyaW0odHJpbShkZXN0RGlyLCAnXFxcXCcpLCAnLycpO1xuICByZXR1cm4ge1xuICAgIHNyY0RpciwgZGVzdERpciwgaXNvbURpciwgaW5jbHVkZSwgZmlsZXNcbiAgfTtcbn1cblxuZXhwb3J0IGNvbnN0IGdldFJvb3REaXIgPSAoKSA9PiByb290RGlyO1xuLyoqIGdldCBQbGluayB3b3JrIGRpcmVjdG9yeSBvciBwcm9jZXNzLmN3ZCgpICovXG5leHBvcnQgY29uc3QgZ2V0V29ya0RpciA9ICgpID0+IHdvcmtEaXI7XG5cblxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3ltbGlua0ZvclBhY2thZ2UocGtnTmFtZTogc3RyaW5nLCB3b3Jrc3BhY2VEaXIgPSB3b3JrRGlyKSB7XG4gIGlmIChzeW1saW5rRGlyTmFtZSlcbiAgICByZXR1cm4gUGF0aC5yZXNvbHZlKHdvcmtzcGFjZURpciwgc3ltbGlua0Rpck5hbWUsIHBrZ05hbWUpO1xuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsb3Nlc3RDb21tb25QYXJlbnREaXIocGF0aHM6IEl0ZXJhYmxlPHN0cmluZz4pIHtcbiAgbGV0IGNvbW1vbkRpcjogc3RyaW5nW10gfCB1bmRlZmluZWQ7XG5cbiAgZm9yIChjb25zdCByZWFsUGF0aCBvZiBwYXRocykge1xuICAgIGlmIChjb21tb25EaXIgPT0gbnVsbCkge1xuICAgICAgY29tbW9uRGlyID0gcmVhbFBhdGguc3BsaXQoUGF0aC5zZXApO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IGRpciA9IHJlYWxQYXRoLnNwbGl0KFBhdGguc2VwKTtcbiAgICAvLyBGaW5kIHRoZSBjbG9zZXN0IGNvbW1vbiBwYXJlbnQgZGlyZWN0b3J5LCB1c2UgaXQgYXMgcm9vdERpclxuICAgIGZvciAobGV0IGkgPSAwLCBsID0gY29tbW9uRGlyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgaWYgKGkgPj0gZGlyLmxlbmd0aCB8fCBjb21tb25EaXJbaV0gIT09IGRpcltpXSkge1xuICAgICAgICBjb21tb25EaXIgPSBjb21tb25EaXIuc2xpY2UoMCwgaSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBsZXQgZGlyID0gY29tbW9uRGlyID8gY29tbW9uRGlyLmpvaW4oUGF0aC5zZXApIDogd29ya0RpcjtcbiAgaWYgKGRpci5lbmRzV2l0aCgnOicpKSB7XG4gICAgLy8gd2luZG93IGRpc2sgcm9vdCBkaXJlY3RvcnkgbGlrZSBcImM6XCIsIG5lZWRzIHRvIHR1cm4gaXQgdG8gXCJjOlxcXFxcIiwgc2luY2UgcGF0aCBtb2R1bGUgbWFsZnVuY3Rpb25zIG9uIFwiYzpcIlxuICAgIGRpciArPSBQYXRoLnNlcDtcbiAgfVxuICByZXR1cm4gZGlyO1xufVxuXG4vLyBpbnRlcmZhY2UgTWFwT3JTZXQgZXh0ZW5kcyBJdGVyYWJsZTxhbnk+IHtcbi8vICAgc2l6ZTogbnVtYmVyO1xuLy8gICBoYXMoZWw6IGFueSk6IGJvb2xlYW47XG4vLyB9XG5leHBvcnQgZnVuY3Rpb24gaXNFcXVhbE1hcFNldDxUPihzZXQxOiBTZXQ8VD4gfCBNYXA8VCwgYW55Piwgc2V0MjogU2V0PFQ+IHwgTWFwPFQsIGFueT4pIHtcbiAgaWYgKHNldDEuc2l6ZSAhPT0gc2V0Mi5zaXplKVxuICAgIHJldHVybiBmYWxzZTtcbiAgZm9yIChjb25zdCBlbCBvZiBzZXQxIGluc3RhbmNlb2YgTWFwID8gc2V0MS5rZXlzKCkgOiBzZXQxKSB7XG4gICAgaWYgKCFzZXQyLmhhcyhlbCkpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgZm9yIChjb25zdCBlbCBvZiBzZXQyIGluc3RhbmNlb2YgTWFwID8gc2V0Mi5rZXlzKCkgOiBzZXQyKSB7XG4gICAgaWYgKCFzZXQxLmhhcyhlbCkpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBjbGFzcyBTaW1wbGVMaW5rZWRMaXN0Tm9kZTxUPiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyBwcmV2OiBTaW1wbGVMaW5rZWRMaXN0Tm9kZTxUPiB8IG51bGwsXG4gICAgcHVibGljIG5leHQ6IFNpbXBsZUxpbmtlZExpc3ROb2RlPFQ+IHwgbnVsbCxcbiAgICBwdWJsaWMgdmFsdWU6IFRcbiAgKSB7fVxufVxuXG5leHBvcnQgY2xhc3MgU2ltcGxlTGlua2VkTGlzdDxUPiB7XG4gIGZpcnN0OiBTaW1wbGVMaW5rZWRMaXN0Tm9kZTxUPiB8IG51bGwgPSBudWxsO1xuICBsYXN0OiBTaW1wbGVMaW5rZWRMaXN0Tm9kZTxUPiB8IG51bGwgPSBudWxsO1xuXG4gIHJlbW92ZU5vZGUobm9kZTogU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4pIHtcbiAgICBpZiAobm9kZS5wcmV2KVxuICAgICAgbm9kZS5wcmV2Lm5leHQgPSBub2RlLm5leHQ7XG4gICAgaWYgKG5vZGUubmV4dClcbiAgICAgIG5vZGUubmV4dC5wcmV2ID0gbm9kZS5wcmV2O1xuICAgIGlmICh0aGlzLmZpcnN0ID09PSBub2RlKSB7XG4gICAgICB0aGlzLmZpcnN0ID0gbm9kZS5uZXh0O1xuICAgIH1cbiAgICBpZiAodGhpcy5sYXN0ID09PSBub2RlKSB7XG4gICAgICB0aGlzLmxhc3QgPSBub2RlLnByZXY7XG4gICAgfVxuICB9XG5cbiAgcHVzaCh2YWx1ZTogVCk6IFNpbXBsZUxpbmtlZExpc3ROb2RlPFQ+IHtcbiAgICBjb25zdCBub2RlID0gbmV3IFNpbXBsZUxpbmtlZExpc3ROb2RlPFQ+KHRoaXMubGFzdCwgbnVsbCwgdmFsdWUpO1xuICAgIGlmICh0aGlzLmxhc3QpXG4gICAgICB0aGlzLmxhc3QubmV4dCA9IG5vZGU7XG4gICAgdGhpcy5sYXN0ID0gbm9kZTtcbiAgICBpZiAodGhpcy5maXJzdCA9PSBudWxsKSB7XG4gICAgICB0aGlzLmZpcnN0ID0gbm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICAqdHJhdmVyc2UoKSB7XG4gICAgZm9yIChsZXQgY3VyciA9IHRoaXMuZmlyc3Q7IGN1cnIgIT0gbnVsbDsgY3VyciA9IGN1cnIubmV4dCkge1xuICAgICAgeWllbGQgY3Vyci52YWx1ZTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==