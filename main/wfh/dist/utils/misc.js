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
exports.SimpleLinkedList = exports.SimpleLinkedListNode = exports.isEqualMapSet = exports.closestCommonParentDir = exports.getSymlinkForPackage = exports.getRootDir = exports.getTscConfigOfPkg = exports.createCliTable = exports.sexyFont = exports.boxString = exports.WordLexer = exports.WordTokenType = exports.isDrcpSymlink = void 0;
const base_LLn_parser_1 = require("../base-LLn-parser");
const trim_1 = __importDefault(require("lodash/trim"));
const get_1 = __importDefault(require("lodash/get"));
const Path = __importStar(require("path"));
const cfonts = __importStar(require("cfonts"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const { isDrcpSymlink, rootDir, symlinkDir } = JSON.parse(process.env.__plink);
exports.isDrcpSymlink = isDrcpSymlink;
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
        wordWrap: whitespaceWrap
    });
    tb.push([text]);
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
    const globs = get_1.default(json, 'dr.ts.globs');
    const srcDir = get_1.default(json, 'dr.ts.src', 'ts');
    const isomDir = get_1.default(json, 'dr.ts.isom', 'isom');
    const include = get_1.default(json, 'dr.ts.include');
    let destDir = get_1.default(json, 'dr.ts.dest', 'dist');
    destDir = trim_1.default(trim_1.default(destDir, '\\'), '/');
    return {
        srcDir, destDir, isomDir, globs, include
    };
}
exports.getTscConfigOfPkg = getTscConfigOfPkg;
const getRootDir = () => rootDir;
exports.getRootDir = getRootDir;
function getSymlinkForPackage(pkgName) {
    if (symlinkDir)
        return Path.resolve(symlinkDir, pkgName);
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
    let dir = commonDir ? commonDir.join(Path.sep) : process.cwd();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3V0aWxzL21pc2MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdEQUFzRDtBQUN0RCx1REFBK0I7QUFDL0IscURBQTZCO0FBRTdCLDJDQUE2QjtBQUc3QiwrQ0FBaUM7QUFDakMsNERBQStCO0FBRS9CLE1BQU0sRUFBQyxhQUFhLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFRLENBQWEsQ0FBQztBQUVsRixzQ0FBYTtBQUVyQixJQUFZLGFBTVg7QUFORCxXQUFZLGFBQWE7SUFDdkIsK0NBQU8sQ0FBQTtJQUNQLGlEQUFJLENBQUE7SUFDSiwrQ0FBRyxDQUFBO0lBQ0gsK0NBQUcsQ0FBQTtJQUNILG1EQUFLLENBQUE7QUFDUCxDQUFDLEVBTlcsYUFBYSxHQUFiLHFCQUFhLEtBQWIscUJBQWEsUUFNeEI7QUFFRCxNQUFhLFNBQVUsU0FBUSwyQkFBd0I7SUFDckQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDaEIsT0FBTyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksSUFBSSxFQUFFO1lBQ3hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDNUIsUUFBUSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUU7Z0JBQ2pCLEtBQUssSUFBSTtvQkFDUCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2YsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEtBQUssSUFBSTt3QkFDcEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNqQixNQUFNLElBQUksdUJBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDaEQsTUFBTTtnQkFDUixLQUFLLElBQUk7b0JBQ1As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UUFDRCxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFO1lBQ3RCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztTQUN2QjtJQUNILENBQUM7SUFFRCxJQUFJLENBQUMsS0FBUTtRQUNYLE1BQU0sSUFBSSxHQUFHLElBQUksb0JBQW9CLENBQUksSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakUsSUFBSSxJQUFJLENBQUMsSUFBSTtZQUNYLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUN4QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxFQUFFO1lBQ3RCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1NBQ25CO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsQ0FBQyxRQUFRO1FBQ1AsS0FBSyxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksSUFBSSxJQUFJLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDMUQsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDO1NBQ2xCO0lBQ0gsQ0FBQztDQUNGO0FBakNELDRDQWlDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEJhc2VMZXhlciwgVG9rZW4gfSBmcm9tICcuLi9iYXNlLUxMbi1wYXJzZXInO1xuaW1wb3J0IHRyaW0gZnJvbSAnbG9kYXNoL3RyaW0nO1xuaW1wb3J0IGdldCBmcm9tICdsb2Rhc2gvZ2V0JztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtQbGlua0Vudn0gZnJvbSAnLi4vbm9kZS1wYXRoJztcbmltcG9ydCAqIGFzIGNmb250cyBmcm9tICdjZm9udHMnO1xuaW1wb3J0IFRhYmxlIGZyb20gJ2NsaS10YWJsZTMnO1xuXG5jb25zdCB7aXNEcmNwU3ltbGluaywgcm9vdERpciwgc3ltbGlua0Rpcn0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcblxuZXhwb3J0IHtpc0RyY3BTeW1saW5rfTtcblxuZXhwb3J0IGVudW0gV29yZFRva2VuVHlwZSB7XG4gIGVvbCA9IDAsXG4gIHdvcmQsXG4gIHRhYixcbiAgZW9zLCAvLyBlbmQgb2Ygc2VudGVuY2VcbiAgb3RoZXJcbn1cblxuZXhwb3J0IGNsYXNzIFdvcmRMZXhlciBleHRlbmRzIEJhc2VMZXhlcjxXb3JkVG9rZW5UeXBlPiB7XG4gICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUb2tlbjxXb3JkVG9rZW5UeXBlPj4ge1xuICAgIHdoaWxlICh0aGlzLmxhKCkgIT0gbnVsbCkge1xuICAgICAgY29uc3Qgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuICAgICAgc3dpdGNoICh0aGlzLmxhKCkpIHtcbiAgICAgICAgY2FzZSAnXFxuJzpcbiAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICBpZiAodGhpcy5sYSgpID09PSAnXFxyJylcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLmVvbCwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdcXHQnOlxuICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLnRhYiwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGNvbnN0IGZpcnN0ID0gdGhpcy5sYSgpITtcbiAgICAgICAgICBpZiAoL1thLXpBLVokX10vLnRlc3QoZmlyc3QpKSB7XG4gICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIHdoaWxlKHRoaXMubGEoKSAhPSBudWxsICYmIC9bYS16QS1aJF8wLTldLy50ZXN0KHRoaXMubGEoKSEpKSB7XG4gICAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKC8tLy50ZXN0KHRoaXMubGEoKSEpKVxuICAgICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLndvcmQsIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoL1swLTldLy50ZXN0KHRoaXMubGEoKSEpKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnN1bWVOdW1iZXJzKCk7XG4gICAgICAgICAgICB5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS53b3JkLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGZpcnN0ID09PSAnLScgJiYgdGhpcy5sYSgyKSAmJiAvWzAtOV0vLnRlc3QodGhpcy5sYSgyKSEpKSB7XG4gICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIHRoaXMuY29uc3VtZU51bWJlcnMoKTtcbiAgICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLndvcmQsIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoL1ssLl0vLnRlc3QoZmlyc3QpKSB7XG4gICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLmVvcywgdGhpcywgc3RhcnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLm90aGVyLCB0aGlzLCBzdGFydCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3VtZU51bWJlcnMoKSB7XG4gICAgLy8gaWYgKC9bMC05XS8udGVzdCh0aGlzLmxhKCkpKSB7XG4gICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgd2hpbGUodGhpcy5sYSgpICE9IG51bGwgJiYgL1swLTkuXS8udGVzdCh0aGlzLmxhKCkhKSkge1xuICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgfVxuICAgIC8vIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYm94U3RyaW5nKHRleHQ6IHN0cmluZywgbGluZVdpZHRoID0gNzAsIHdoaXRlc3BhY2VXcmFwID0gdHJ1ZSk6IHN0cmluZyB7XG4gIGNvbnN0IHRiID0gY3JlYXRlQ2xpVGFibGUoe1xuICAgIGNvbFdpZHRoczogW2xpbmVXaWR0aF0sXG4gICAgd29yZFdyYXA6IHdoaXRlc3BhY2VXcmFwXG4gIH0pO1xuICB0Yi5wdXNoKFt0ZXh0XSk7XG4gIHJldHVybiB0Yi50b1N0cmluZygpO1xuICAvLyBjb25zdCBsZXhlciA9IG5ldyBXb3JkTGV4ZXIodGV4dCk7XG5cbiAgLy8gbGluZVdpZHRoID0gbGluZVdpZHRoIC0gNDtcbiAgLy8gbGV0IHVwZGF0ZWQgPSBgKyR7Jy0nLnJlcGVhdChsaW5lV2lkdGggKyAyKX0rXFxuYDtcbiAgLy8gbGV0IGNvbHVtbiA9IDA7XG4gIC8vIGZvciAoY29uc3Qgd29yZCBvZiBsZXhlcikge1xuICAvLyAgIGlmICh3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUud29yZCB8fCB3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUuZW9zIHx8IHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS5vdGhlciB8fFxuICAvLyAgICAgd29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLnRhYikge1xuICAvLyAgICAgaWYgKGNvbHVtbiA9PT0gMCkge1xuICAvLyAgICAgICB1cGRhdGVkICs9ICd8ICc7XG4gIC8vICAgICB9XG4gIC8vICAgICBpZiAoY29sdW1uICsgd29yZC50ZXh0Lmxlbmd0aCA+IGxpbmVXaWR0aCkge1xuICAvLyAgICAgICB1cGRhdGVkICs9ICcgJy5yZXBlYXQobGluZVdpZHRoIC0gY29sdW1uKTtcbiAgLy8gICAgICAgdXBkYXRlZCArPSAnIHxcXG58ICc7XG4gIC8vICAgICAgIC8vIHBhZFxuICAvLyAgICAgICBjb2x1bW4gPSAwO1xuICAvLyAgICAgfVxuICAvLyAgICAgdXBkYXRlZCArPSB3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUudGFiID8gJyAgJyA6IHdvcmQudGV4dDtcbiAgLy8gICAgIGNvbHVtbiArPSB3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUudGFiID8gMiA6IHdvcmQudGV4dC5sZW5ndGg7XG4gIC8vICAgfSBlbHNlIGlmICh3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUuZW9sKSB7XG4gIC8vICAgICBpZiAoY29sdW1uID09PSAwKSB7XG4gIC8vICAgICAgIHVwZGF0ZWQgKz0gJ3wgJztcbiAgLy8gICAgIH1cbiAgLy8gICAgIHVwZGF0ZWQgKz0gJyAnLnJlcGVhdChsaW5lV2lkdGggLSBjb2x1bW4pO1xuICAvLyAgICAgdXBkYXRlZCArPSAnIHxcXG4nO1xuICAvLyAgICAgY29sdW1uID0gMDtcbiAgLy8gICB9XG4gIC8vIH1cbiAgLy8gaWYgKGNvbHVtbiAhPT0gMCkge1xuICAvLyAgIHVwZGF0ZWQgKz0gJyAnLnJlcGVhdChsaW5lV2lkdGggLSBjb2x1bW4pO1xuICAvLyAgIHVwZGF0ZWQgKz0gJyB8XFxuJztcbiAgLy8gfVxuICAvLyB1cGRhdGVkICs9IGArJHsnLScucmVwZWF0KGxpbmVXaWR0aCArIDIpfStgO1xuICAvLyByZXR1cm4gdXBkYXRlZC5yZXBsYWNlKC9eKD89LikvbWcsICcgICcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V4eUZvbnQodGV4dDogc3RyaW5nLCBjb2xvciA9ICcjOTlhMzI5JywgZm9udDogY2ZvbnRzLkZvbnRPcHRpb25bJ2ZvbnQnXSA9ICdibG9jaycpIHtcbiAgcmV0dXJuIGNmb250cy5yZW5kZXIodGV4dCwge2ZvbnQsIGNvbG9yczogW2NvbG9yXX0pO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENsaVRhYmxlT3B0aW9uIGV4dGVuZHMgTm9uTnVsbGFibGU8Q29uc3RydWN0b3JQYXJhbWV0ZXJzPFRhYmxlPlswXT4ge1xuICBob3Jpem9udGFsTGluZXM/OiBib29sZWFuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ2xpVGFibGUob3B0PzogQ2xpVGFibGVPcHRpb24pIHtcbiAgY29uc3QgdGFibGVPcHQ6IENsaVRhYmxlT3B0aW9uID0ge1xuICAgIC8vIHN0eWxlOiB7aGVhZDogW119LFxuICAgIHdvcmRXcmFwOiB0cnVlLFxuICAgIC4uLm9wdFxuICB9O1xuICBkZWxldGUgdGFibGVPcHQuaG9yaXpvbnRhbExpbmVzO1xuXG4gIGlmIChvcHQgJiYgb3B0Lmhvcml6b250YWxMaW5lcyA9PT0gZmFsc2UpIHtcbiAgICB0YWJsZU9wdC5jaGFycyA9IHttaWQ6ICcnLCAnbGVmdC1taWQnOiAnJywgJ21pZC1taWQnOiAnJywgJ3JpZ2h0LW1pZCc6ICcnLCAndG9wLW1pZCc6ICcnfTtcbiAgfVxuICBpZiAob3B0ICYmIG9wdC5ob3Jpem9udGFsTGluZXMpIHtcbiAgICB0YWJsZU9wdC5jb2xBbGlnbnMgPSBvcHQuY29sQWxpZ25zO1xuICB9XG4gIHJldHVybiBuZXcgVGFibGUodGFibGVPcHQpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VUc0RpcnMge1xuICBzcmNEaXI6IHN0cmluZztcbiAgZGVzdERpcjogc3RyaW5nO1xuICBpc29tRGlyPzogc3RyaW5nO1xuICBnbG9icz86IHN0cmluZ1tdO1xuICBpbmNsdWRlPzogc3RyaW5nW10gfCBzdHJpbmc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUc2NDb25maWdPZlBrZyhqc29uOiBhbnkpOiBQYWNrYWdlVHNEaXJzIHtcbiAgY29uc3QgZ2xvYnM6IHN0cmluZ1tdIHwgdW5kZWZpbmVkID0gZ2V0KGpzb24sICdkci50cy5nbG9icycpO1xuICBjb25zdCBzcmNEaXIgPSBnZXQoanNvbiwgJ2RyLnRzLnNyYycsICd0cycpO1xuICBjb25zdCBpc29tRGlyID0gZ2V0KGpzb24sICdkci50cy5pc29tJywgJ2lzb20nKTtcbiAgY29uc3QgaW5jbHVkZSA9IGdldChqc29uLCAnZHIudHMuaW5jbHVkZScpO1xuICBsZXQgZGVzdERpciA9IGdldChqc29uLCAnZHIudHMuZGVzdCcsICdkaXN0Jyk7XG5cbiAgZGVzdERpciA9IHRyaW0odHJpbShkZXN0RGlyLCAnXFxcXCcpLCAnLycpO1xuICByZXR1cm4ge1xuICAgIHNyY0RpciwgZGVzdERpciwgaXNvbURpciwgZ2xvYnMsIGluY2x1ZGVcbiAgfTtcbn1cblxuZXhwb3J0IGNvbnN0IGdldFJvb3REaXIgPSAoKSA9PiByb290RGlyO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3ltbGlua0ZvclBhY2thZ2UocGtnTmFtZTogc3RyaW5nKSB7XG4gIGlmIChzeW1saW5rRGlyKVxuICAgIHJldHVybiBQYXRoLnJlc29sdmUoc3ltbGlua0RpciwgcGtnTmFtZSk7XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xvc2VzdENvbW1vblBhcmVudERpcihwYXRoczogSXRlcmFibGU8c3RyaW5nPikge1xuICBsZXQgY29tbW9uRGlyOiBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcblxuICBmb3IgKGNvbnN0IHJlYWxQYXRoIG9mIHBhdGhzKSB7XG4gICAgaWYgKGNvbW1vbkRpciA9PSBudWxsKSB7XG4gICAgICBjb21tb25EaXIgPSByZWFsUGF0aC5zcGxpdChQYXRoLnNlcCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgZGlyID0gcmVhbFBhdGguc3BsaXQoUGF0aC5zZXApO1xuICAgIC8vIEZpbmQgdGhlIGNsb3Nlc3QgY29tbW9uIHBhcmVudCBkaXJlY3RvcnksIHVzZSBpdCBhcyByb290RGlyXG4gICAgZm9yIChsZXQgaSA9IDAsIGwgPSBjb21tb25EaXIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBpZiAoaSA+PSBkaXIubGVuZ3RoIHx8IGNvbW1vbkRpcltpXSAhPT0gZGlyW2ldKSB7XG4gICAgICAgIGNvbW1vbkRpciA9IGNvbW1vbkRpci5zbGljZSgwLCBpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGxldCBkaXIgPSBjb21tb25EaXIgPyBjb21tb25EaXIuam9pbihQYXRoLnNlcCkgOiBwcm9jZXNzLmN3ZCgpO1xuICBpZiAoZGlyLmVuZHNXaXRoKCc6JykpIHtcbiAgICAvLyB3aW5kb3cgZGlzayByb290IGRpcmVjdG9yeSBsaWtlIFwiYzpcIiwgbmVlZHMgdG8gdHVybiBpdCB0byBcImM6XFxcXFwiLCBzaW5jZSBwYXRoIG1vZHVsZSBtYWxmdW5jdGlvbnMgb24gXCJjOlwiXG4gICAgZGlyICs9IFBhdGguc2VwO1xuICB9XG4gIHJldHVybiBkaXI7XG59XG5cbi8vIGludGVyZmFjZSBNYXBPclNldCBleHRlbmRzIEl0ZXJhYmxlPGFueT4ge1xuLy8gICBzaXplOiBudW1iZXI7XG4vLyAgIGhhcyhlbDogYW55KTogYm9vbGVhbjtcbi8vIH1cbmV4cG9ydCBmdW5jdGlvbiBpc0VxdWFsTWFwU2V0PFQ+KHNldDE6IFNldDxUPiB8IE1hcDxULCBhbnk+LCBzZXQyOiBTZXQ8VD4gfCBNYXA8VCwgYW55Pikge1xuICBpZiAoc2V0MS5zaXplICE9PSBzZXQyLnNpemUpXG4gICAgcmV0dXJuIGZhbHNlO1xuICBmb3IgKGNvbnN0IGVsIG9mIHNldDEgaW5zdGFuY2VvZiBNYXAgPyBzZXQxLmtleXMoKSA6IHNldDEpIHtcbiAgICBpZiAoIXNldDIuaGFzKGVsKSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBmb3IgKGNvbnN0IGVsIG9mIHNldDIgaW5zdGFuY2VvZiBNYXAgPyBzZXQyLmtleXMoKSA6IHNldDIpIHtcbiAgICBpZiAoIXNldDEuaGFzKGVsKSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZXhwb3J0IGNsYXNzIFNpbXBsZUxpbmtlZExpc3ROb2RlPFQ+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHByZXY6IFNpbXBsZUxpbmtlZExpc3ROb2RlPFQ+IHwgbnVsbCxcbiAgICBwdWJsaWMgbmV4dDogU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4gfCBudWxsLFxuICAgIHB1YmxpYyB2YWx1ZTogVFxuICApIHt9XG59XG5cbmV4cG9ydCBjbGFzcyBTaW1wbGVMaW5rZWRMaXN0PFQ+IHtcbiAgZmlyc3Q6IFNpbXBsZUxpbmtlZExpc3ROb2RlPFQ+IHwgbnVsbDtcbiAgbGFzdDogU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4gfCBudWxsO1xuXG4gIHJlbW92ZU5vZGUobm9kZTogU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4pIHtcbiAgICBpZiAobm9kZS5wcmV2KVxuICAgICAgbm9kZS5wcmV2Lm5leHQgPSBub2RlLm5leHQ7XG4gICAgaWYgKG5vZGUubmV4dClcbiAgICAgIG5vZGUubmV4dC5wcmV2ID0gbm9kZS5wcmV2O1xuICAgIGlmICh0aGlzLmZpcnN0ID09PSBub2RlKSB7XG4gICAgICB0aGlzLmZpcnN0ID0gbm9kZS5uZXh0O1xuICAgIH1cbiAgICBpZiAodGhpcy5sYXN0ID09PSBub2RlKSB7XG4gICAgICB0aGlzLmxhc3QgPSBub2RlLnByZXY7XG4gICAgfVxuICB9XG5cbiAgcHVzaCh2YWx1ZTogVCk6IFNpbXBsZUxpbmtlZExpc3ROb2RlPFQ+IHtcbiAgICBjb25zdCBub2RlID0gbmV3IFNpbXBsZUxpbmtlZExpc3ROb2RlPFQ+KHRoaXMubGFzdCwgbnVsbCwgdmFsdWUpO1xuICAgIGlmICh0aGlzLmxhc3QpXG4gICAgICB0aGlzLmxhc3QubmV4dCA9IG5vZGU7XG4gICAgdGhpcy5sYXN0ID0gbm9kZTtcbiAgICBpZiAodGhpcy5maXJzdCA9PSBudWxsKSB7XG4gICAgICB0aGlzLmZpcnN0ID0gbm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICAqdHJhdmVyc2UoKSB7XG4gICAgZm9yIChsZXQgY3VyciA9IHRoaXMuZmlyc3Q7IGN1cnIgIT0gbnVsbDsgY3VyciA9IGN1cnIubmV4dCkge1xuICAgICAgeWllbGQgY3Vyci52YWx1ZTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==