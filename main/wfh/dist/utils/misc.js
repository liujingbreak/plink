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
exports.SimpleLinkedList = exports.SimpleLinkedListNode = exports.isEqualMapSet = exports.closestCommonParentDir = exports.getRootDir = exports.getTscConfigOfPkg = exports.createCliTable = exports.sexyFont = exports.boxString = exports.WordLexer = exports.WordTokenType = exports.isDrcpSymlink = void 0;
const base_LLn_parser_1 = require("../base-LLn-parser");
const trim_1 = __importDefault(require("lodash/trim"));
const get_1 = __importDefault(require("lodash/get"));
const Path = __importStar(require("path"));
const cfonts = __importStar(require("cfonts"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const { isDrcpSymlink, rootDir } = JSON.parse(process.env.__plink);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3V0aWxzL21pc2MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdEQUFzRDtBQUN0RCx1REFBK0I7QUFDL0IscURBQTZCO0FBRTdCLDJDQUE2QjtBQUc3QiwrQ0FBaUM7QUFDakMsNERBQStCO0FBRS9CLE1BQU0sRUFBQyxhQUFhLEVBQUUsT0FBTyxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBRXRFLHNDQUFhO0FBRXJCLElBQVksYUFNWDtBQU5ELFdBQVksYUFBYTtJQUN2QiwrQ0FBTyxDQUFBO0lBQ1AsaURBQUksQ0FBQTtJQUNKLCtDQUFHLENBQUE7SUFDSCwrQ0FBRyxDQUFBO0lBQ0gsbURBQUssQ0FBQTtBQUNQLENBQUMsRUFOVyxhQUFhLEdBQWIscUJBQWEsS0FBYixxQkFBYSxRQU14QjtBQUVELE1BQWEsU0FBVSxTQUFRLDJCQUF3QjtJQUNyRCxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNoQixPQUFPLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxJQUFJLEVBQUU7WUFDeEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUM1QixRQUFRLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRTtnQkFDakIsS0FBSyxJQUFJO29CQUNQLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDZixJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsS0FBSyxJQUFJO3dCQUNwQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2pCLE1BQU0sSUFBSSx1QkFBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUNoRCxNQUFNO2dCQUNSLEtBQUssSUFBSTtvQkFDUCxJQUFJLENBQUMs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b0IsQ0FBSSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRSxJQUFJLElBQUksQ0FBQyxJQUFJO1lBQ1gsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLEVBQUU7WUFDdEIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7U0FDbkI7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxDQUFDLFFBQVE7UUFDUCxLQUFLLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxJQUFJLElBQUksRUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRTtZQUMxRCxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUM7U0FDbEI7SUFDSCxDQUFDO0NBQ0Y7QUFqQ0QsNENBaUNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQmFzZUxleGVyLCBUb2tlbiB9IGZyb20gJy4uL2Jhc2UtTExuLXBhcnNlcic7XG5pbXBvcnQgdHJpbSBmcm9tICdsb2Rhc2gvdHJpbSc7XG5pbXBvcnQgZ2V0IGZyb20gJ2xvZGFzaC9nZXQnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQge1BsaW5rRW52fSBmcm9tICcuLi9ub2RlLXBhdGgnO1xuaW1wb3J0ICogYXMgY2ZvbnRzIGZyb20gJ2Nmb250cyc7XG5pbXBvcnQgVGFibGUgZnJvbSAnY2xpLXRhYmxlMyc7XG5cbmNvbnN0IHtpc0RyY3BTeW1saW5rLCByb290RGlyfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuXG5leHBvcnQge2lzRHJjcFN5bWxpbmt9O1xuXG5leHBvcnQgZW51bSBXb3JkVG9rZW5UeXBlIHtcbiAgZW9sID0gMCxcbiAgd29yZCxcbiAgdGFiLFxuICBlb3MsIC8vIGVuZCBvZiBzZW50ZW5jZVxuICBvdGhlclxufVxuXG5leHBvcnQgY2xhc3MgV29yZExleGVyIGV4dGVuZHMgQmFzZUxleGVyPFdvcmRUb2tlblR5cGU+IHtcbiAgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRva2VuPFdvcmRUb2tlblR5cGU+PiB7XG4gICAgd2hpbGUgKHRoaXMubGEoKSAhPSBudWxsKSB7XG4gICAgICBjb25zdCBzdGFydCA9IHRoaXMucG9zaXRpb247XG4gICAgICBzd2l0Y2ggKHRoaXMubGEoKSkge1xuICAgICAgICBjYXNlICdcXG4nOlxuICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIGlmICh0aGlzLmxhKCkgPT09ICdcXHInKVxuICAgICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUuZW9sLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ1xcdCc6XG4gICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUudGFiLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgY29uc3QgZmlyc3QgPSB0aGlzLmxhKCkhO1xuICAgICAgICAgIGlmICgvW2EtekEtWiRfXS8udGVzdChmaXJzdCkpIHtcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgd2hpbGUodGhpcy5sYSgpICE9IG51bGwgJiYgL1thLXpBLVokXzAtOV0vLnRlc3QodGhpcy5sYSgpISkpIHtcbiAgICAgICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoLy0vLnRlc3QodGhpcy5sYSgpISkpXG4gICAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUud29yZCwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgvWzAtOV0vLnRlc3QodGhpcy5sYSgpISkpIHtcbiAgICAgICAgICAgIHRoaXMuY29uc3VtZU51bWJlcnMoKTtcbiAgICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLndvcmQsIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZmlyc3QgPT09ICctJyAmJiB0aGlzLmxhKDIpICYmIC9bMC05XS8udGVzdCh0aGlzLmxhKDIpISkpIHtcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgdGhpcy5jb25zdW1lTnVtYmVycygpO1xuICAgICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUud29yZCwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgvWywuXS8udGVzdChmaXJzdCkpIHtcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUuZW9zLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUub3RoZXIsIHRoaXMsIHN0YXJ0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjb25zdW1lTnVtYmVycygpIHtcbiAgICAvLyBpZiAoL1swLTldLy50ZXN0KHRoaXMubGEoKSkpIHtcbiAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICB3aGlsZSh0aGlzLmxhKCkgIT0gbnVsbCAmJiAvWzAtOS5dLy50ZXN0KHRoaXMubGEoKSEpKSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICB9XG4gICAgLy8gfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBib3hTdHJpbmcodGV4dDogc3RyaW5nLCBsaW5lV2lkdGggPSA3MCwgd2hpdGVzcGFjZVdyYXAgPSB0cnVlKTogc3RyaW5nIHtcbiAgY29uc3QgdGIgPSBjcmVhdGVDbGlUYWJsZSh7XG4gICAgY29sV2lkdGhzOiBbbGluZVdpZHRoXSxcbiAgICB3b3JkV3JhcDogd2hpdGVzcGFjZVdyYXBcbiAgfSk7XG4gIHRiLnB1c2goW3RleHRdKTtcbiAgcmV0dXJuIHRiLnRvU3RyaW5nKCk7XG4gIC8vIGNvbnN0IGxleGVyID0gbmV3IFdvcmRMZXhlcih0ZXh0KTtcblxuICAvLyBsaW5lV2lkdGggPSBsaW5lV2lkdGggLSA0O1xuICAvLyBsZXQgdXBkYXRlZCA9IGArJHsnLScucmVwZWF0KGxpbmVXaWR0aCArIDIpfStcXG5gO1xuICAvLyBsZXQgY29sdW1uID0gMDtcbiAgLy8gZm9yIChjb25zdCB3b3JkIG9mIGxleGVyKSB7XG4gIC8vICAgaWYgKHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS53b3JkIHx8IHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS5lb3MgfHwgd29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLm90aGVyIHx8XG4gIC8vICAgICB3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUudGFiKSB7XG4gIC8vICAgICBpZiAoY29sdW1uID09PSAwKSB7XG4gIC8vICAgICAgIHVwZGF0ZWQgKz0gJ3wgJztcbiAgLy8gICAgIH1cbiAgLy8gICAgIGlmIChjb2x1bW4gKyB3b3JkLnRleHQubGVuZ3RoID4gbGluZVdpZHRoKSB7XG4gIC8vICAgICAgIHVwZGF0ZWQgKz0gJyAnLnJlcGVhdChsaW5lV2lkdGggLSBjb2x1bW4pO1xuICAvLyAgICAgICB1cGRhdGVkICs9ICcgfFxcbnwgJztcbiAgLy8gICAgICAgLy8gcGFkXG4gIC8vICAgICAgIGNvbHVtbiA9IDA7XG4gIC8vICAgICB9XG4gIC8vICAgICB1cGRhdGVkICs9IHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS50YWIgPyAnICAnIDogd29yZC50ZXh0O1xuICAvLyAgICAgY29sdW1uICs9IHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS50YWIgPyAyIDogd29yZC50ZXh0Lmxlbmd0aDtcbiAgLy8gICB9IGVsc2UgaWYgKHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS5lb2wpIHtcbiAgLy8gICAgIGlmIChjb2x1bW4gPT09IDApIHtcbiAgLy8gICAgICAgdXBkYXRlZCArPSAnfCAnO1xuICAvLyAgICAgfVxuICAvLyAgICAgdXBkYXRlZCArPSAnICcucmVwZWF0KGxpbmVXaWR0aCAtIGNvbHVtbik7XG4gIC8vICAgICB1cGRhdGVkICs9ICcgfFxcbic7XG4gIC8vICAgICBjb2x1bW4gPSAwO1xuICAvLyAgIH1cbiAgLy8gfVxuICAvLyBpZiAoY29sdW1uICE9PSAwKSB7XG4gIC8vICAgdXBkYXRlZCArPSAnICcucmVwZWF0KGxpbmVXaWR0aCAtIGNvbHVtbik7XG4gIC8vICAgdXBkYXRlZCArPSAnIHxcXG4nO1xuICAvLyB9XG4gIC8vIHVwZGF0ZWQgKz0gYCskeyctJy5yZXBlYXQobGluZVdpZHRoICsgMil9K2A7XG4gIC8vIHJldHVybiB1cGRhdGVkLnJlcGxhY2UoL14oPz0uKS9tZywgJyAgJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXh5Rm9udCh0ZXh0OiBzdHJpbmcsIGNvbG9yID0gJyM5OWEzMjknLCBmb250OiBjZm9udHMuRm9udE9wdGlvblsnZm9udCddID0gJ2Jsb2NrJykge1xuICByZXR1cm4gY2ZvbnRzLnJlbmRlcih0ZXh0LCB7Zm9udCwgY29sb3JzOiBbY29sb3JdfSk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xpVGFibGVPcHRpb24gZXh0ZW5kcyBOb25OdWxsYWJsZTxDb25zdHJ1Y3RvclBhcmFtZXRlcnM8VGFibGU+WzBdPiB7XG4gIGhvcml6b250YWxMaW5lcz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVDbGlUYWJsZShvcHQ/OiBDbGlUYWJsZU9wdGlvbikge1xuICBjb25zdCB0YWJsZU9wdDogQ2xpVGFibGVPcHRpb24gPSB7XG4gICAgLy8gc3R5bGU6IHtoZWFkOiBbXX0sXG4gICAgd29yZFdyYXA6IHRydWUsXG4gICAgLi4ub3B0XG4gIH07XG4gIGRlbGV0ZSB0YWJsZU9wdC5ob3Jpem9udGFsTGluZXM7XG5cbiAgaWYgKG9wdCAmJiBvcHQuaG9yaXpvbnRhbExpbmVzID09PSBmYWxzZSkge1xuICAgIHRhYmxlT3B0LmNoYXJzID0ge21pZDogJycsICdsZWZ0LW1pZCc6ICcnLCAnbWlkLW1pZCc6ICcnLCAncmlnaHQtbWlkJzogJycsICd0b3AtbWlkJzogJyd9O1xuICB9XG4gIGlmIChvcHQgJiYgb3B0Lmhvcml6b250YWxMaW5lcykge1xuICAgIHRhYmxlT3B0LmNvbEFsaWducyA9IG9wdC5jb2xBbGlnbnM7XG4gIH1cbiAgcmV0dXJuIG5ldyBUYWJsZSh0YWJsZU9wdCk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZVRzRGlycyB7XG4gIHNyY0Rpcjogc3RyaW5nO1xuICBkZXN0RGlyOiBzdHJpbmc7XG4gIGlzb21EaXI/OiBzdHJpbmc7XG4gIGdsb2JzPzogc3RyaW5nW107XG4gIGluY2x1ZGU/OiBzdHJpbmdbXSB8IHN0cmluZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRzY0NvbmZpZ09mUGtnKGpzb246IGFueSk6IFBhY2thZ2VUc0RpcnMge1xuICBjb25zdCBnbG9iczogc3RyaW5nW10gfCB1bmRlZmluZWQgPSBnZXQoanNvbiwgJ2RyLnRzLmdsb2JzJyk7XG4gIGNvbnN0IHNyY0RpciA9IGdldChqc29uLCAnZHIudHMuc3JjJywgJ3RzJyk7XG4gIGNvbnN0IGlzb21EaXIgPSBnZXQoanNvbiwgJ2RyLnRzLmlzb20nLCAnaXNvbScpO1xuICBjb25zdCBpbmNsdWRlID0gZ2V0KGpzb24sICdkci50cy5pbmNsdWRlJyk7XG4gIGxldCBkZXN0RGlyID0gZ2V0KGpzb24sICdkci50cy5kZXN0JywgJ2Rpc3QnKTtcblxuICBkZXN0RGlyID0gdHJpbSh0cmltKGRlc3REaXIsICdcXFxcJyksICcvJyk7XG4gIHJldHVybiB7XG4gICAgc3JjRGlyLCBkZXN0RGlyLCBpc29tRGlyLCBnbG9icywgaW5jbHVkZVxuICB9O1xufVxuXG5leHBvcnQgY29uc3QgZ2V0Um9vdERpciA9ICgpID0+IHJvb3REaXI7XG5cbmV4cG9ydCBmdW5jdGlvbiBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKHBhdGhzOiBJdGVyYWJsZTxzdHJpbmc+KSB7XG4gIGxldCBjb21tb25EaXI6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuXG4gIGZvciAoY29uc3QgcmVhbFBhdGggb2YgcGF0aHMpIHtcbiAgICBpZiAoY29tbW9uRGlyID09IG51bGwpIHtcbiAgICAgIGNvbW1vbkRpciA9IHJlYWxQYXRoLnNwbGl0KFBhdGguc2VwKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCBkaXIgPSByZWFsUGF0aC5zcGxpdChQYXRoLnNlcCk7XG4gICAgLy8gRmluZCB0aGUgY2xvc2VzdCBjb21tb24gcGFyZW50IGRpcmVjdG9yeSwgdXNlIGl0IGFzIHJvb3REaXJcbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IGNvbW1vbkRpci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGlmIChpID49IGRpci5sZW5ndGggfHwgY29tbW9uRGlyW2ldICE9PSBkaXJbaV0pIHtcbiAgICAgICAgY29tbW9uRGlyID0gY29tbW9uRGlyLnNsaWNlKDAsIGkpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgbGV0IGRpciA9IGNvbW1vbkRpciA/IGNvbW1vbkRpci5qb2luKFBhdGguc2VwKSA6IHByb2Nlc3MuY3dkKCk7XG4gIGlmIChkaXIuZW5kc1dpdGgoJzonKSkge1xuICAgIC8vIHdpbmRvdyBkaXNrIHJvb3QgZGlyZWN0b3J5IGxpa2UgXCJjOlwiLCBuZWVkcyB0byB0dXJuIGl0IHRvIFwiYzpcXFxcXCIsIHNpbmNlIHBhdGggbW9kdWxlIG1hbGZ1bmN0aW9ucyBvbiBcImM6XCJcbiAgICBkaXIgKz0gUGF0aC5zZXA7XG4gIH1cbiAgcmV0dXJuIGRpcjtcbn1cblxuLy8gaW50ZXJmYWNlIE1hcE9yU2V0IGV4dGVuZHMgSXRlcmFibGU8YW55PiB7XG4vLyAgIHNpemU6IG51bWJlcjtcbi8vICAgaGFzKGVsOiBhbnkpOiBib29sZWFuO1xuLy8gfVxuZXhwb3J0IGZ1bmN0aW9uIGlzRXF1YWxNYXBTZXQ8VD4oc2V0MTogU2V0PFQ+IHwgTWFwPFQsIGFueT4sIHNldDI6IFNldDxUPiB8IE1hcDxULCBhbnk+KSB7XG4gIGlmIChzZXQxLnNpemUgIT09IHNldDIuc2l6ZSlcbiAgICByZXR1cm4gZmFsc2U7XG4gIGZvciAoY29uc3QgZWwgb2Ygc2V0MSBpbnN0YW5jZW9mIE1hcCA/IHNldDEua2V5cygpIDogc2V0MSkge1xuICAgIGlmICghc2V0Mi5oYXMoZWwpKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGZvciAoY29uc3QgZWwgb2Ygc2V0MiBpbnN0YW5jZW9mIE1hcCA/IHNldDIua2V5cygpIDogc2V0Mikge1xuICAgIGlmICghc2V0MS5oYXMoZWwpKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgY2xhc3MgU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcHJldjogU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4gfCBudWxsLFxuICAgIHB1YmxpYyBuZXh0OiBTaW1wbGVMaW5rZWRMaXN0Tm9kZTxUPiB8IG51bGwsXG4gICAgcHVibGljIHZhbHVlOiBUXG4gICkge31cbn1cblxuZXhwb3J0IGNsYXNzIFNpbXBsZUxpbmtlZExpc3Q8VD4ge1xuICBmaXJzdDogU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4gfCBudWxsO1xuICBsYXN0OiBTaW1wbGVMaW5rZWRMaXN0Tm9kZTxUPiB8IG51bGw7XG5cbiAgcmVtb3ZlTm9kZShub2RlOiBTaW1wbGVMaW5rZWRMaXN0Tm9kZTxUPikge1xuICAgIGlmIChub2RlLnByZXYpXG4gICAgICBub2RlLnByZXYubmV4dCA9IG5vZGUubmV4dDtcbiAgICBpZiAobm9kZS5uZXh0KVxuICAgICAgbm9kZS5uZXh0LnByZXYgPSBub2RlLnByZXY7XG4gICAgaWYgKHRoaXMuZmlyc3QgPT09IG5vZGUpIHtcbiAgICAgIHRoaXMuZmlyc3QgPSBub2RlLm5leHQ7XG4gICAgfVxuICAgIGlmICh0aGlzLmxhc3QgPT09IG5vZGUpIHtcbiAgICAgIHRoaXMubGFzdCA9IG5vZGUucHJldjtcbiAgICB9XG4gIH1cblxuICBwdXNoKHZhbHVlOiBUKTogU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4ge1xuICAgIGNvbnN0IG5vZGUgPSBuZXcgU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4odGhpcy5sYXN0LCBudWxsLCB2YWx1ZSk7XG4gICAgaWYgKHRoaXMubGFzdClcbiAgICAgIHRoaXMubGFzdC5uZXh0ID0gbm9kZTtcbiAgICB0aGlzLmxhc3QgPSBub2RlO1xuICAgIGlmICh0aGlzLmZpcnN0ID09IG51bGwpIHtcbiAgICAgIHRoaXMuZmlyc3QgPSBub2RlO1xuICAgIH1cbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gICp0cmF2ZXJzZSgpIHtcbiAgICBmb3IgKGxldCBjdXJyID0gdGhpcy5maXJzdDsgY3VyciAhPSBudWxsOyBjdXJyID0gY3Vyci5uZXh0KSB7XG4gICAgICB5aWVsZCBjdXJyLnZhbHVlO1xuICAgIH1cbiAgfVxufVxuIl19