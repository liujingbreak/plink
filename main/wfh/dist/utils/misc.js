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
    return commonDir ? commonDir.join(Path.sep) : process.cwd();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3V0aWxzL21pc2MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdEQUFzRDtBQUN0RCx1REFBK0I7QUFDL0IscURBQTZCO0FBRTdCLDJDQUE2QjtBQUc3QiwrQ0FBaUM7QUFDakMsNERBQStCO0FBRS9CLE1BQU0sRUFBQyxhQUFhLEVBQUUsT0FBTyxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBRXRFLHNDQUFhO0FBRXJCLElBQVksYUFNWDtBQU5ELFdBQVksYUFBYTtJQUN2QiwrQ0FBTyxDQUFBO0lBQ1AsaURBQUksQ0FBQTtJQUNKLCtDQUFHLENBQUE7SUFDSCwrQ0FBRyxDQUFBO0lBQ0gsbURBQUssQ0FBQTtBQUNQLENBQUMsRUFOVyxhQUFhLEdBQWIscUJBQWEsS0FBYixxQkFBYSxRQU14QjtBQUVELE1BQWEsU0FBVSxTQUFRLDJCQUF3QjtJQUNyRCxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNoQixPQUFPLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxJQUFJLEVBQUU7WUFDeEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUM1QixRQUFRLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRTtnQkFDakIsS0FBSyxJQUFJO29CQUNQLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDZixJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsS0FBSyxJQUFJO3dCQUNwQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2pCLE1BQU0sSUFBSSx1QkFBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUNoRCxNQUFNO2dCQUNSLEtBQUssSUFBSTtvQkFDUCxJQUFJLENBQUMs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SUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksRUFBRTtZQUN0QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztTQUNuQjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVELENBQUMsUUFBUTtRQUNQLEtBQUssSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLElBQUksSUFBSSxFQUFFLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQzFELE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQztTQUNsQjtJQUNILENBQUM7Q0FDRjtBQWpDRCw0Q0FpQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCYXNlTGV4ZXIsIFRva2VuIH0gZnJvbSAnLi4vYmFzZS1MTG4tcGFyc2VyJztcbmltcG9ydCB0cmltIGZyb20gJ2xvZGFzaC90cmltJztcbmltcG9ydCBnZXQgZnJvbSAnbG9kYXNoL2dldCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7UGxpbmtFbnZ9IGZyb20gJy4uL25vZGUtcGF0aCc7XG5pbXBvcnQgKiBhcyBjZm9udHMgZnJvbSAnY2ZvbnRzJztcbmltcG9ydCBUYWJsZSBmcm9tICdjbGktdGFibGUzJztcblxuY29uc3Qge2lzRHJjcFN5bWxpbmssIHJvb3REaXJ9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5cbmV4cG9ydCB7aXNEcmNwU3ltbGlua307XG5cbmV4cG9ydCBlbnVtIFdvcmRUb2tlblR5cGUge1xuICBlb2wgPSAwLFxuICB3b3JkLFxuICB0YWIsXG4gIGVvcywgLy8gZW5kIG9mIHNlbnRlbmNlXG4gIG90aGVyXG59XG5cbmV4cG9ydCBjbGFzcyBXb3JkTGV4ZXIgZXh0ZW5kcyBCYXNlTGV4ZXI8V29yZFRva2VuVHlwZT4ge1xuICAqW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VG9rZW48V29yZFRva2VuVHlwZT4+IHtcbiAgICB3aGlsZSAodGhpcy5sYSgpICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcbiAgICAgIHN3aXRjaCAodGhpcy5sYSgpKSB7XG4gICAgICAgIGNhc2UgJ1xcbic6XG4gICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgaWYgKHRoaXMubGEoKSA9PT0gJ1xccicpXG4gICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICB5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS5lb2wsIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnXFx0JzpcbiAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICB5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS50YWIsIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBjb25zdCBmaXJzdCA9IHRoaXMubGEoKSE7XG4gICAgICAgICAgaWYgKC9bYS16QS1aJF9dLy50ZXN0KGZpcnN0KSkge1xuICAgICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgICB3aGlsZSh0aGlzLmxhKCkgIT0gbnVsbCAmJiAvW2EtekEtWiRfMC05XS8udGVzdCh0aGlzLmxhKCkhKSkge1xuICAgICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgvLS8udGVzdCh0aGlzLmxhKCkhKSlcbiAgICAgICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgICB5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS53b3JkLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKC9bMC05XS8udGVzdCh0aGlzLmxhKCkhKSkge1xuICAgICAgICAgICAgdGhpcy5jb25zdW1lTnVtYmVycygpO1xuICAgICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUud29yZCwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChmaXJzdCA9PT0gJy0nICYmIHRoaXMubGEoMikgJiYgL1swLTldLy50ZXN0KHRoaXMubGEoMikhKSkge1xuICAgICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgICB0aGlzLmNvbnN1bWVOdW1iZXJzKCk7XG4gICAgICAgICAgICB5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS53b3JkLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKC9bLC5dLy50ZXN0KGZpcnN0KSkge1xuICAgICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgICB5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS5lb3MsIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICB5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS5vdGhlciwgdGhpcywgc3RhcnQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN1bWVOdW1iZXJzKCkge1xuICAgIC8vIGlmICgvWzAtOV0vLnRlc3QodGhpcy5sYSgpKSkge1xuICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgIHdoaWxlKHRoaXMubGEoKSAhPSBudWxsICYmIC9bMC05Ll0vLnRlc3QodGhpcy5sYSgpISkpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgIH1cbiAgICAvLyB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJveFN0cmluZyh0ZXh0OiBzdHJpbmcsIGxpbmVXaWR0aCA9IDcwLCB3aGl0ZXNwYWNlV3JhcCA9IHRydWUpOiBzdHJpbmcge1xuICBjb25zdCB0YiA9IGNyZWF0ZUNsaVRhYmxlKHtcbiAgICBjb2xXaWR0aHM6IFtsaW5lV2lkdGhdLFxuICAgIHdvcmRXcmFwOiB3aGl0ZXNwYWNlV3JhcFxuICB9KTtcbiAgdGIucHVzaChbdGV4dF0pO1xuICByZXR1cm4gdGIudG9TdHJpbmcoKTtcbiAgLy8gY29uc3QgbGV4ZXIgPSBuZXcgV29yZExleGVyKHRleHQpO1xuXG4gIC8vIGxpbmVXaWR0aCA9IGxpbmVXaWR0aCAtIDQ7XG4gIC8vIGxldCB1cGRhdGVkID0gYCskeyctJy5yZXBlYXQobGluZVdpZHRoICsgMil9K1xcbmA7XG4gIC8vIGxldCBjb2x1bW4gPSAwO1xuICAvLyBmb3IgKGNvbnN0IHdvcmQgb2YgbGV4ZXIpIHtcbiAgLy8gICBpZiAod29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLndvcmQgfHwgd29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLmVvcyB8fCB3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUub3RoZXIgfHxcbiAgLy8gICAgIHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS50YWIpIHtcbiAgLy8gICAgIGlmIChjb2x1bW4gPT09IDApIHtcbiAgLy8gICAgICAgdXBkYXRlZCArPSAnfCAnO1xuICAvLyAgICAgfVxuICAvLyAgICAgaWYgKGNvbHVtbiArIHdvcmQudGV4dC5sZW5ndGggPiBsaW5lV2lkdGgpIHtcbiAgLy8gICAgICAgdXBkYXRlZCArPSAnICcucmVwZWF0KGxpbmVXaWR0aCAtIGNvbHVtbik7XG4gIC8vICAgICAgIHVwZGF0ZWQgKz0gJyB8XFxufCAnO1xuICAvLyAgICAgICAvLyBwYWRcbiAgLy8gICAgICAgY29sdW1uID0gMDtcbiAgLy8gICAgIH1cbiAgLy8gICAgIHVwZGF0ZWQgKz0gd29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLnRhYiA/ICcgICcgOiB3b3JkLnRleHQ7XG4gIC8vICAgICBjb2x1bW4gKz0gd29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLnRhYiA/IDIgOiB3b3JkLnRleHQubGVuZ3RoO1xuICAvLyAgIH0gZWxzZSBpZiAod29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLmVvbCkge1xuICAvLyAgICAgaWYgKGNvbHVtbiA9PT0gMCkge1xuICAvLyAgICAgICB1cGRhdGVkICs9ICd8ICc7XG4gIC8vICAgICB9XG4gIC8vICAgICB1cGRhdGVkICs9ICcgJy5yZXBlYXQobGluZVdpZHRoIC0gY29sdW1uKTtcbiAgLy8gICAgIHVwZGF0ZWQgKz0gJyB8XFxuJztcbiAgLy8gICAgIGNvbHVtbiA9IDA7XG4gIC8vICAgfVxuICAvLyB9XG4gIC8vIGlmIChjb2x1bW4gIT09IDApIHtcbiAgLy8gICB1cGRhdGVkICs9ICcgJy5yZXBlYXQobGluZVdpZHRoIC0gY29sdW1uKTtcbiAgLy8gICB1cGRhdGVkICs9ICcgfFxcbic7XG4gIC8vIH1cbiAgLy8gdXBkYXRlZCArPSBgKyR7Jy0nLnJlcGVhdChsaW5lV2lkdGggKyAyKX0rYDtcbiAgLy8gcmV0dXJuIHVwZGF0ZWQucmVwbGFjZSgvXig/PS4pL21nLCAnICAnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNleHlGb250KHRleHQ6IHN0cmluZywgY29sb3IgPSAnIzk5YTMyOScsIGZvbnQ6IGNmb250cy5Gb250T3B0aW9uWydmb250J10gPSAnYmxvY2snKSB7XG4gIHJldHVybiBjZm9udHMucmVuZGVyKHRleHQsIHtmb250LCBjb2xvcnM6IFtjb2xvcl19KTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDbGlUYWJsZU9wdGlvbiBleHRlbmRzIE5vbk51bGxhYmxlPENvbnN0cnVjdG9yUGFyYW1ldGVyczxUYWJsZT5bMF0+IHtcbiAgaG9yaXpvbnRhbExpbmVzPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNsaVRhYmxlKG9wdD86IENsaVRhYmxlT3B0aW9uKSB7XG4gIGNvbnN0IHRhYmxlT3B0OiBDbGlUYWJsZU9wdGlvbiA9IHtcbiAgICAvLyBzdHlsZToge2hlYWQ6IFtdfSxcbiAgICB3b3JkV3JhcDogdHJ1ZSxcbiAgICAuLi5vcHRcbiAgfTtcbiAgZGVsZXRlIHRhYmxlT3B0Lmhvcml6b250YWxMaW5lcztcblxuICBpZiAob3B0ICYmIG9wdC5ob3Jpem9udGFsTGluZXMgPT09IGZhbHNlKSB7XG4gICAgdGFibGVPcHQuY2hhcnMgPSB7bWlkOiAnJywgJ2xlZnQtbWlkJzogJycsICdtaWQtbWlkJzogJycsICdyaWdodC1taWQnOiAnJywgJ3RvcC1taWQnOiAnJ307XG4gIH1cbiAgaWYgKG9wdCAmJiBvcHQuaG9yaXpvbnRhbExpbmVzKSB7XG4gICAgdGFibGVPcHQuY29sQWxpZ25zID0gb3B0LmNvbEFsaWducztcbiAgfVxuICByZXR1cm4gbmV3IFRhYmxlKHRhYmxlT3B0KTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlVHNEaXJzIHtcbiAgc3JjRGlyOiBzdHJpbmc7XG4gIGRlc3REaXI6IHN0cmluZztcbiAgaXNvbURpcj86IHN0cmluZztcbiAgZ2xvYnM/OiBzdHJpbmdbXTtcbiAgaW5jbHVkZT86IHN0cmluZ1tdIHwgc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHNjQ29uZmlnT2ZQa2coanNvbjogYW55KTogUGFja2FnZVRzRGlycyB7XG4gIGNvbnN0IGdsb2JzOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCA9IGdldChqc29uLCAnZHIudHMuZ2xvYnMnKTtcbiAgY29uc3Qgc3JjRGlyID0gZ2V0KGpzb24sICdkci50cy5zcmMnLCAndHMnKTtcbiAgY29uc3QgaXNvbURpciA9IGdldChqc29uLCAnZHIudHMuaXNvbScsICdpc29tJyk7XG4gIGNvbnN0IGluY2x1ZGUgPSBnZXQoanNvbiwgJ2RyLnRzLmluY2x1ZGUnKTtcbiAgbGV0IGRlc3REaXIgPSBnZXQoanNvbiwgJ2RyLnRzLmRlc3QnLCAnZGlzdCcpO1xuXG4gIGRlc3REaXIgPSB0cmltKHRyaW0oZGVzdERpciwgJ1xcXFwnKSwgJy8nKTtcbiAgcmV0dXJuIHtcbiAgICBzcmNEaXIsIGRlc3REaXIsIGlzb21EaXIsIGdsb2JzLCBpbmNsdWRlXG4gIH07XG59XG5cbmV4cG9ydCBjb25zdCBnZXRSb290RGlyID0gKCkgPT4gcm9vdERpcjtcblxuZXhwb3J0IGZ1bmN0aW9uIGNsb3Nlc3RDb21tb25QYXJlbnREaXIocGF0aHM6IEl0ZXJhYmxlPHN0cmluZz4pIHtcbiAgbGV0IGNvbW1vbkRpcjogc3RyaW5nW10gfCB1bmRlZmluZWQ7XG5cbiAgZm9yIChjb25zdCByZWFsUGF0aCBvZiBwYXRocykge1xuICAgIGlmIChjb21tb25EaXIgPT0gbnVsbCkge1xuICAgICAgY29tbW9uRGlyID0gcmVhbFBhdGguc3BsaXQoUGF0aC5zZXApO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IGRpciA9IHJlYWxQYXRoLnNwbGl0KFBhdGguc2VwKTtcbiAgICAvLyBGaW5kIHRoZSBjbG9zZXN0IGNvbW1vbiBwYXJlbnQgZGlyZWN0b3J5LCB1c2UgaXQgYXMgcm9vdERpclxuICAgIGZvciAobGV0IGkgPSAwLCBsID0gY29tbW9uRGlyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgaWYgKGkgPj0gZGlyLmxlbmd0aCB8fCBjb21tb25EaXJbaV0gIT09IGRpcltpXSkge1xuICAgICAgICBjb21tb25EaXIgPSBjb21tb25EaXIuc2xpY2UoMCwgaSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gY29tbW9uRGlyID8gY29tbW9uRGlyLmpvaW4oUGF0aC5zZXApIDogcHJvY2Vzcy5jd2QoKTtcbn1cblxuLy8gaW50ZXJmYWNlIE1hcE9yU2V0IGV4dGVuZHMgSXRlcmFibGU8YW55PiB7XG4vLyAgIHNpemU6IG51bWJlcjtcbi8vICAgaGFzKGVsOiBhbnkpOiBib29sZWFuO1xuLy8gfVxuZXhwb3J0IGZ1bmN0aW9uIGlzRXF1YWxNYXBTZXQ8VD4oc2V0MTogU2V0PFQ+IHwgTWFwPFQsIGFueT4sIHNldDI6IFNldDxUPiB8IE1hcDxULCBhbnk+KSB7XG4gIGlmIChzZXQxLnNpemUgIT09IHNldDIuc2l6ZSlcbiAgICByZXR1cm4gZmFsc2U7XG4gIGZvciAoY29uc3QgZWwgb2Ygc2V0MSBpbnN0YW5jZW9mIE1hcCA/IHNldDEua2V5cygpIDogc2V0MSkge1xuICAgIGlmICghc2V0Mi5oYXMoZWwpKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGZvciAoY29uc3QgZWwgb2Ygc2V0MiBpbnN0YW5jZW9mIE1hcCA/IHNldDIua2V5cygpIDogc2V0Mikge1xuICAgIGlmICghc2V0MS5oYXMoZWwpKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgY2xhc3MgU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcHJldjogU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4gfCBudWxsLFxuICAgIHB1YmxpYyBuZXh0OiBTaW1wbGVMaW5rZWRMaXN0Tm9kZTxUPiB8IG51bGwsXG4gICAgcHVibGljIHZhbHVlOiBUXG4gICkge31cbn1cblxuZXhwb3J0IGNsYXNzIFNpbXBsZUxpbmtlZExpc3Q8VD4ge1xuICBmaXJzdDogU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4gfCBudWxsO1xuICBsYXN0OiBTaW1wbGVMaW5rZWRMaXN0Tm9kZTxUPiB8IG51bGw7XG5cbiAgcmVtb3ZlTm9kZShub2RlOiBTaW1wbGVMaW5rZWRMaXN0Tm9kZTxUPikge1xuICAgIGlmIChub2RlLnByZXYpXG4gICAgICBub2RlLnByZXYubmV4dCA9IG5vZGUubmV4dDtcbiAgICBpZiAobm9kZS5uZXh0KVxuICAgICAgbm9kZS5uZXh0LnByZXYgPSBub2RlLnByZXY7XG4gICAgaWYgKHRoaXMuZmlyc3QgPT09IG5vZGUpIHtcbiAgICAgIHRoaXMuZmlyc3QgPSBub2RlLm5leHQ7XG4gICAgfVxuICAgIGlmICh0aGlzLmxhc3QgPT09IG5vZGUpIHtcbiAgICAgIHRoaXMubGFzdCA9IG5vZGUucHJldjtcbiAgICB9XG4gIH1cblxuICBwdXNoKHZhbHVlOiBUKTogU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4ge1xuICAgIGNvbnN0IG5vZGUgPSBuZXcgU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4odGhpcy5sYXN0LCBudWxsLCB2YWx1ZSk7XG4gICAgaWYgKHRoaXMubGFzdClcbiAgICAgIHRoaXMubGFzdC5uZXh0ID0gbm9kZTtcbiAgICB0aGlzLmxhc3QgPSBub2RlO1xuICAgIGlmICh0aGlzLmZpcnN0ID09IG51bGwpIHtcbiAgICAgIHRoaXMuZmlyc3QgPSBub2RlO1xuICAgIH1cbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gICp0cmF2ZXJzZSgpIHtcbiAgICBmb3IgKGxldCBjdXJyID0gdGhpcy5maXJzdDsgY3VyciAhPSBudWxsOyBjdXJyID0gY3Vyci5uZXh0KSB7XG4gICAgICB5aWVsZCBjdXJyLnZhbHVlO1xuICAgIH1cbiAgfVxufVxuIl19