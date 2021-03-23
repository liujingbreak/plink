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
const { isDrcpSymlink, rootDir, symlinkDirName } = JSON.parse(process.env.__plink);
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
function getSymlinkForPackage(pkgName, workspaceDir = process.cwd()) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3V0aWxzL21pc2MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdEQUFzRDtBQUN0RCx1REFBK0I7QUFDL0IscURBQTZCO0FBRTdCLDJDQUE2QjtBQUc3QiwrQ0FBaUM7QUFDakMsNERBQStCO0FBRS9CLE1BQU0sRUFBQyxhQUFhLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFRLENBQWEsQ0FBQztBQUV0RixzQ0FBYTtBQUVyQixJQUFZLGFBTVg7QUFORCxXQUFZLGFBQWE7SUFDdkIsK0NBQU8sQ0FBQTtJQUNQLGlEQUFJLENBQUE7SUFDSiwrQ0FBRyxDQUFBO0lBQ0gsK0NBQUcsQ0FBQTtJQUNILG1EQUFLLENBQUE7QUFDUCxDQUFDLEVBTlcsYUFBYSxHQUFiLHFCQUFhLEtBQWIscUJBQWEsUUFNeEI7QUFFRCxNQUFhLFNBQVUsU0FBUSwyQkFBd0I7SUFDckQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDaEIsT0FBTyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksSUFBSSxFQUFFO1lBQ3hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDNUIsUUFBUSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUU7Z0JBQ2pCLEtBQUssSUFBSTtvQkFDUCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2YsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEtBQUssSUFBSTt3QkFDcEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNqQixNQUFNLElBQUksdUJBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDaEQsTUFBTTtnQkFDUixLQUFLLElBQUk7b0JBQ1As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SUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ3hCO1FBQ0QsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTtZQUN0QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDdkI7SUFDSCxDQUFDO0lBRUQsSUFBSSxDQUFDLEtBQVE7UUFDWCxNQUFNLElBQUksR0FBRyxJQUFJLG9CQUFvQixDQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pFLElBQUksSUFBSSxDQUFDLElBQUk7WUFDWCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDeEIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksRUFBRTtZQUN0QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztTQUNuQjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVELENBQUMsUUFBUTtRQUNQLEtBQUssSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLElBQUksSUFBSSxFQUFFLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQzFELE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQztTQUNsQjtJQUNILENBQUM7Q0FDRjtBQWpDRCw0Q0FpQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCYXNlTGV4ZXIsIFRva2VuIH0gZnJvbSAnLi4vYmFzZS1MTG4tcGFyc2VyJztcbmltcG9ydCB0cmltIGZyb20gJ2xvZGFzaC90cmltJztcbmltcG9ydCBnZXQgZnJvbSAnbG9kYXNoL2dldCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7UGxpbmtFbnZ9IGZyb20gJy4uL25vZGUtcGF0aCc7XG5pbXBvcnQgKiBhcyBjZm9udHMgZnJvbSAnY2ZvbnRzJztcbmltcG9ydCBUYWJsZSBmcm9tICdjbGktdGFibGUzJztcblxuY29uc3Qge2lzRHJjcFN5bWxpbmssIHJvb3REaXIsIHN5bWxpbmtEaXJOYW1lfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuXG5leHBvcnQge2lzRHJjcFN5bWxpbmt9O1xuXG5leHBvcnQgZW51bSBXb3JkVG9rZW5UeXBlIHtcbiAgZW9sID0gMCxcbiAgd29yZCxcbiAgdGFiLFxuICBlb3MsIC8vIGVuZCBvZiBzZW50ZW5jZVxuICBvdGhlclxufVxuXG5leHBvcnQgY2xhc3MgV29yZExleGVyIGV4dGVuZHMgQmFzZUxleGVyPFdvcmRUb2tlblR5cGU+IHtcbiAgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRva2VuPFdvcmRUb2tlblR5cGU+PiB7XG4gICAgd2hpbGUgKHRoaXMubGEoKSAhPSBudWxsKSB7XG4gICAgICBjb25zdCBzdGFydCA9IHRoaXMucG9zaXRpb247XG4gICAgICBzd2l0Y2ggKHRoaXMubGEoKSkge1xuICAgICAgICBjYXNlICdcXG4nOlxuICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIGlmICh0aGlzLmxhKCkgPT09ICdcXHInKVxuICAgICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUuZW9sLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ1xcdCc6XG4gICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUudGFiLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgY29uc3QgZmlyc3QgPSB0aGlzLmxhKCkhO1xuICAgICAgICAgIGlmICgvW2EtekEtWiRfXS8udGVzdChmaXJzdCkpIHtcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgd2hpbGUodGhpcy5sYSgpICE9IG51bGwgJiYgL1thLXpBLVokXzAtOV0vLnRlc3QodGhpcy5sYSgpISkpIHtcbiAgICAgICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoLy0vLnRlc3QodGhpcy5sYSgpISkpXG4gICAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUud29yZCwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgvWzAtOV0vLnRlc3QodGhpcy5sYSgpISkpIHtcbiAgICAgICAgICAgIHRoaXMuY29uc3VtZU51bWJlcnMoKTtcbiAgICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLndvcmQsIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZmlyc3QgPT09ICctJyAmJiB0aGlzLmxhKDIpICYmIC9bMC05XS8udGVzdCh0aGlzLmxhKDIpISkpIHtcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgdGhpcy5jb25zdW1lTnVtYmVycygpO1xuICAgICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUud29yZCwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgvWywuXS8udGVzdChmaXJzdCkpIHtcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUuZW9zLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUub3RoZXIsIHRoaXMsIHN0YXJ0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjb25zdW1lTnVtYmVycygpIHtcbiAgICAvLyBpZiAoL1swLTldLy50ZXN0KHRoaXMubGEoKSkpIHtcbiAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICB3aGlsZSh0aGlzLmxhKCkgIT0gbnVsbCAmJiAvWzAtOS5dLy50ZXN0KHRoaXMubGEoKSEpKSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICB9XG4gICAgLy8gfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBib3hTdHJpbmcodGV4dDogc3RyaW5nLCBsaW5lV2lkdGggPSA3MCwgd2hpdGVzcGFjZVdyYXAgPSB0cnVlKTogc3RyaW5nIHtcbiAgY29uc3QgdGIgPSBjcmVhdGVDbGlUYWJsZSh7XG4gICAgY29sV2lkdGhzOiBbbGluZVdpZHRoXSxcbiAgICB3b3JkV3JhcDogd2hpdGVzcGFjZVdyYXBcbiAgfSk7XG4gIHRiLnB1c2goW3RleHRdKTtcbiAgcmV0dXJuIHRiLnRvU3RyaW5nKCk7XG4gIC8vIGNvbnN0IGxleGVyID0gbmV3IFdvcmRMZXhlcih0ZXh0KTtcblxuICAvLyBsaW5lV2lkdGggPSBsaW5lV2lkdGggLSA0O1xuICAvLyBsZXQgdXBkYXRlZCA9IGArJHsnLScucmVwZWF0KGxpbmVXaWR0aCArIDIpfStcXG5gO1xuICAvLyBsZXQgY29sdW1uID0gMDtcbiAgLy8gZm9yIChjb25zdCB3b3JkIG9mIGxleGVyKSB7XG4gIC8vICAgaWYgKHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS53b3JkIHx8IHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS5lb3MgfHwgd29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLm90aGVyIHx8XG4gIC8vICAgICB3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUudGFiKSB7XG4gIC8vICAgICBpZiAoY29sdW1uID09PSAwKSB7XG4gIC8vICAgICAgIHVwZGF0ZWQgKz0gJ3wgJztcbiAgLy8gICAgIH1cbiAgLy8gICAgIGlmIChjb2x1bW4gKyB3b3JkLnRleHQubGVuZ3RoID4gbGluZVdpZHRoKSB7XG4gIC8vICAgICAgIHVwZGF0ZWQgKz0gJyAnLnJlcGVhdChsaW5lV2lkdGggLSBjb2x1bW4pO1xuICAvLyAgICAgICB1cGRhdGVkICs9ICcgfFxcbnwgJztcbiAgLy8gICAgICAgLy8gcGFkXG4gIC8vICAgICAgIGNvbHVtbiA9IDA7XG4gIC8vICAgICB9XG4gIC8vICAgICB1cGRhdGVkICs9IHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS50YWIgPyAnICAnIDogd29yZC50ZXh0O1xuICAvLyAgICAgY29sdW1uICs9IHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS50YWIgPyAyIDogd29yZC50ZXh0Lmxlbmd0aDtcbiAgLy8gICB9IGVsc2UgaWYgKHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS5lb2wpIHtcbiAgLy8gICAgIGlmIChjb2x1bW4gPT09IDApIHtcbiAgLy8gICAgICAgdXBkYXRlZCArPSAnfCAnO1xuICAvLyAgICAgfVxuICAvLyAgICAgdXBkYXRlZCArPSAnICcucmVwZWF0KGxpbmVXaWR0aCAtIGNvbHVtbik7XG4gIC8vICAgICB1cGRhdGVkICs9ICcgfFxcbic7XG4gIC8vICAgICBjb2x1bW4gPSAwO1xuICAvLyAgIH1cbiAgLy8gfVxuICAvLyBpZiAoY29sdW1uICE9PSAwKSB7XG4gIC8vICAgdXBkYXRlZCArPSAnICcucmVwZWF0KGxpbmVXaWR0aCAtIGNvbHVtbik7XG4gIC8vICAgdXBkYXRlZCArPSAnIHxcXG4nO1xuICAvLyB9XG4gIC8vIHVwZGF0ZWQgKz0gYCskeyctJy5yZXBlYXQobGluZVdpZHRoICsgMil9K2A7XG4gIC8vIHJldHVybiB1cGRhdGVkLnJlcGxhY2UoL14oPz0uKS9tZywgJyAgJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXh5Rm9udCh0ZXh0OiBzdHJpbmcsIGNvbG9yID0gJyM5OWEzMjknLCBmb250OiBjZm9udHMuRm9udE9wdGlvblsnZm9udCddID0gJ2Jsb2NrJykge1xuICByZXR1cm4gY2ZvbnRzLnJlbmRlcih0ZXh0LCB7Zm9udCwgY29sb3JzOiBbY29sb3JdfSk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xpVGFibGVPcHRpb24gZXh0ZW5kcyBOb25OdWxsYWJsZTxDb25zdHJ1Y3RvclBhcmFtZXRlcnM8VGFibGU+WzBdPiB7XG4gIGhvcml6b250YWxMaW5lcz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVDbGlUYWJsZShvcHQ/OiBDbGlUYWJsZU9wdGlvbikge1xuICBjb25zdCB0YWJsZU9wdDogQ2xpVGFibGVPcHRpb24gPSB7XG4gICAgLy8gc3R5bGU6IHtoZWFkOiBbXX0sXG4gICAgd29yZFdyYXA6IHRydWUsXG4gICAgLi4ub3B0XG4gIH07XG4gIGRlbGV0ZSB0YWJsZU9wdC5ob3Jpem9udGFsTGluZXM7XG5cbiAgaWYgKG9wdCAmJiBvcHQuaG9yaXpvbnRhbExpbmVzID09PSBmYWxzZSkge1xuICAgIHRhYmxlT3B0LmNoYXJzID0ge21pZDogJycsICdsZWZ0LW1pZCc6ICcnLCAnbWlkLW1pZCc6ICcnLCAncmlnaHQtbWlkJzogJycsICd0b3AtbWlkJzogJyd9O1xuICB9XG4gIGlmIChvcHQgJiYgb3B0Lmhvcml6b250YWxMaW5lcykge1xuICAgIHRhYmxlT3B0LmNvbEFsaWducyA9IG9wdC5jb2xBbGlnbnM7XG4gIH1cbiAgcmV0dXJuIG5ldyBUYWJsZSh0YWJsZU9wdCk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZVRzRGlycyB7XG4gIHNyY0Rpcjogc3RyaW5nO1xuICBkZXN0RGlyOiBzdHJpbmc7XG4gIGlzb21EaXI/OiBzdHJpbmc7XG4gIGdsb2JzPzogc3RyaW5nW107XG4gIGluY2x1ZGU/OiBzdHJpbmdbXSB8IHN0cmluZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRzY0NvbmZpZ09mUGtnKGpzb246IGFueSk6IFBhY2thZ2VUc0RpcnMge1xuICBjb25zdCBnbG9iczogc3RyaW5nW10gfCB1bmRlZmluZWQgPSBnZXQoanNvbiwgJ2RyLnRzLmdsb2JzJyk7XG4gIGNvbnN0IHNyY0RpciA9IGdldChqc29uLCAnZHIudHMuc3JjJywgJ3RzJyk7XG4gIGNvbnN0IGlzb21EaXIgPSBnZXQoanNvbiwgJ2RyLnRzLmlzb20nLCAnaXNvbScpO1xuICBjb25zdCBpbmNsdWRlID0gZ2V0KGpzb24sICdkci50cy5pbmNsdWRlJyk7XG4gIGxldCBkZXN0RGlyID0gZ2V0KGpzb24sICdkci50cy5kZXN0JywgJ2Rpc3QnKTtcblxuICBkZXN0RGlyID0gdHJpbSh0cmltKGRlc3REaXIsICdcXFxcJyksICcvJyk7XG4gIHJldHVybiB7XG4gICAgc3JjRGlyLCBkZXN0RGlyLCBpc29tRGlyLCBnbG9icywgaW5jbHVkZVxuICB9O1xufVxuXG5leHBvcnQgY29uc3QgZ2V0Um9vdERpciA9ICgpID0+IHJvb3REaXI7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTeW1saW5rRm9yUGFja2FnZShwa2dOYW1lOiBzdHJpbmcsIHdvcmtzcGFjZURpciA9IHByb2Nlc3MuY3dkKCkpIHtcbiAgaWYgKHN5bWxpbmtEaXJOYW1lKVxuICAgIHJldHVybiBQYXRoLnJlc29sdmUod29ya3NwYWNlRGlyLCBzeW1saW5rRGlyTmFtZSwgcGtnTmFtZSk7XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xvc2VzdENvbW1vblBhcmVudERpcihwYXRoczogSXRlcmFibGU8c3RyaW5nPikge1xuICBsZXQgY29tbW9uRGlyOiBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcblxuICBmb3IgKGNvbnN0IHJlYWxQYXRoIG9mIHBhdGhzKSB7XG4gICAgaWYgKGNvbW1vbkRpciA9PSBudWxsKSB7XG4gICAgICBjb21tb25EaXIgPSByZWFsUGF0aC5zcGxpdChQYXRoLnNlcCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgZGlyID0gcmVhbFBhdGguc3BsaXQoUGF0aC5zZXApO1xuICAgIC8vIEZpbmQgdGhlIGNsb3Nlc3QgY29tbW9uIHBhcmVudCBkaXJlY3RvcnksIHVzZSBpdCBhcyByb290RGlyXG4gICAgZm9yIChsZXQgaSA9IDAsIGwgPSBjb21tb25EaXIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBpZiAoaSA+PSBkaXIubGVuZ3RoIHx8IGNvbW1vbkRpcltpXSAhPT0gZGlyW2ldKSB7XG4gICAgICAgIGNvbW1vbkRpciA9IGNvbW1vbkRpci5zbGljZSgwLCBpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGxldCBkaXIgPSBjb21tb25EaXIgPyBjb21tb25EaXIuam9pbihQYXRoLnNlcCkgOiBwcm9jZXNzLmN3ZCgpO1xuICBpZiAoZGlyLmVuZHNXaXRoKCc6JykpIHtcbiAgICAvLyB3aW5kb3cgZGlzayByb290IGRpcmVjdG9yeSBsaWtlIFwiYzpcIiwgbmVlZHMgdG8gdHVybiBpdCB0byBcImM6XFxcXFwiLCBzaW5jZSBwYXRoIG1vZHVsZSBtYWxmdW5jdGlvbnMgb24gXCJjOlwiXG4gICAgZGlyICs9IFBhdGguc2VwO1xuICB9XG4gIHJldHVybiBkaXI7XG59XG5cbi8vIGludGVyZmFjZSBNYXBPclNldCBleHRlbmRzIEl0ZXJhYmxlPGFueT4ge1xuLy8gICBzaXplOiBudW1iZXI7XG4vLyAgIGhhcyhlbDogYW55KTogYm9vbGVhbjtcbi8vIH1cbmV4cG9ydCBmdW5jdGlvbiBpc0VxdWFsTWFwU2V0PFQ+KHNldDE6IFNldDxUPiB8IE1hcDxULCBhbnk+LCBzZXQyOiBTZXQ8VD4gfCBNYXA8VCwgYW55Pikge1xuICBpZiAoc2V0MS5zaXplICE9PSBzZXQyLnNpemUpXG4gICAgcmV0dXJuIGZhbHNlO1xuICBmb3IgKGNvbnN0IGVsIG9mIHNldDEgaW5zdGFuY2VvZiBNYXAgPyBzZXQxLmtleXMoKSA6IHNldDEpIHtcbiAgICBpZiAoIXNldDIuaGFzKGVsKSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBmb3IgKGNvbnN0IGVsIG9mIHNldDIgaW5zdGFuY2VvZiBNYXAgPyBzZXQyLmtleXMoKSA6IHNldDIpIHtcbiAgICBpZiAoIXNldDEuaGFzKGVsKSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZXhwb3J0IGNsYXNzIFNpbXBsZUxpbmtlZExpc3ROb2RlPFQ+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHByZXY6IFNpbXBsZUxpbmtlZExpc3ROb2RlPFQ+IHwgbnVsbCxcbiAgICBwdWJsaWMgbmV4dDogU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4gfCBudWxsLFxuICAgIHB1YmxpYyB2YWx1ZTogVFxuICApIHt9XG59XG5cbmV4cG9ydCBjbGFzcyBTaW1wbGVMaW5rZWRMaXN0PFQ+IHtcbiAgZmlyc3Q6IFNpbXBsZUxpbmtlZExpc3ROb2RlPFQ+IHwgbnVsbDtcbiAgbGFzdDogU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4gfCBudWxsO1xuXG4gIHJlbW92ZU5vZGUobm9kZTogU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4pIHtcbiAgICBpZiAobm9kZS5wcmV2KVxuICAgICAgbm9kZS5wcmV2Lm5leHQgPSBub2RlLm5leHQ7XG4gICAgaWYgKG5vZGUubmV4dClcbiAgICAgIG5vZGUubmV4dC5wcmV2ID0gbm9kZS5wcmV2O1xuICAgIGlmICh0aGlzLmZpcnN0ID09PSBub2RlKSB7XG4gICAgICB0aGlzLmZpcnN0ID0gbm9kZS5uZXh0O1xuICAgIH1cbiAgICBpZiAodGhpcy5sYXN0ID09PSBub2RlKSB7XG4gICAgICB0aGlzLmxhc3QgPSBub2RlLnByZXY7XG4gICAgfVxuICB9XG5cbiAgcHVzaCh2YWx1ZTogVCk6IFNpbXBsZUxpbmtlZExpc3ROb2RlPFQ+IHtcbiAgICBjb25zdCBub2RlID0gbmV3IFNpbXBsZUxpbmtlZExpc3ROb2RlPFQ+KHRoaXMubGFzdCwgbnVsbCwgdmFsdWUpO1xuICAgIGlmICh0aGlzLmxhc3QpXG4gICAgICB0aGlzLmxhc3QubmV4dCA9IG5vZGU7XG4gICAgdGhpcy5sYXN0ID0gbm9kZTtcbiAgICBpZiAodGhpcy5maXJzdCA9PSBudWxsKSB7XG4gICAgICB0aGlzLmZpcnN0ID0gbm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICAqdHJhdmVyc2UoKSB7XG4gICAgZm9yIChsZXQgY3VyciA9IHRoaXMuZmlyc3Q7IGN1cnIgIT0gbnVsbDsgY3VyciA9IGN1cnIubmV4dCkge1xuICAgICAgeWllbGQgY3Vyci52YWx1ZTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==