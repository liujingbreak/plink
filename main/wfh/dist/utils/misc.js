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
    let destDir = get_1.default(json, 'dr.ts.dest', get_1.default(json, 'plink.tsc.dest', 'dist'));
    destDir = trim_1.default(trim_1.default(destDir, '\\'), '/');
    return {
        srcDir, destDir, isomDir, include
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3V0aWxzL21pc2MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdEQUFzRDtBQUN0RCx1REFBK0I7QUFDL0IscURBQTZCO0FBRTdCLDJDQUE2QjtBQUc3QiwrQ0FBaUM7QUFDakMsNERBQStCO0FBRS9CLE1BQU0sRUFBQyxhQUFhLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUMsR0FDbEYsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBRXZDLHNDQUFhO0FBRFIsUUFBQSxRQUFRLEdBQWEsRUFBQyxhQUFhLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUMsQ0FBQztBQUdqSCxJQUFZLGFBTVg7QUFORCxXQUFZLGFBQWE7SUFDdkIsK0NBQU8sQ0FBQTtJQUNQLGlEQUFJLENBQUE7SUFDSiwrQ0FBRyxDQUFBO0lBQ0gsK0NBQUcsQ0FBQTtJQUNILG1EQUFLLENBQUE7QUFDUCxDQUFDLEVBTlcsYUFBYSxHQUFiLHFCQUFhLEtBQWIscUJBQWEsUUFNeEI7QUFFRCxNQUFhLFNBQVUsU0FBUSwyQkFBd0I7SUFDckQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDaEIsT0FBTyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksSUFBSSxFQUFFO1lBQ3hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDNUIsUUFBUSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUU7Z0JBQ2pCLEtBQUssSUFBSTtvQkFDUCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2YsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEtBQUssSUFB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S0FBSyxFQUFFLElBQUksSUFBSSxJQUFJLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDMUQsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDO1NBQ2xCO0lBQ0gsQ0FBQztDQUNGO0FBakNELDRDQWlDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEJhc2VMZXhlciwgVG9rZW4gfSBmcm9tICcuLi9iYXNlLUxMbi1wYXJzZXInO1xuaW1wb3J0IHRyaW0gZnJvbSAnbG9kYXNoL3RyaW0nO1xuaW1wb3J0IGdldCBmcm9tICdsb2Rhc2gvZ2V0JztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtQbGlua0Vudn0gZnJvbSAnLi4vbm9kZS1wYXRoJztcbmltcG9ydCAqIGFzIGNmb250cyBmcm9tICdjZm9udHMnO1xuaW1wb3J0IFRhYmxlIGZyb20gJ2NsaS10YWJsZTMnO1xuXG5jb25zdCB7aXNEcmNwU3ltbGluaywgd29ya0Rpciwgcm9vdERpciwgc3ltbGlua0Rpck5hbWUsIGRpc3REaXIsIG5vZGVQYXRoLCBwbGlua0Rpcn0gPVxuICBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcbmV4cG9ydCBjb25zdCBwbGlua0VudjogUGxpbmtFbnYgPSB7aXNEcmNwU3ltbGluaywgd29ya0Rpciwgcm9vdERpciwgc3ltbGlua0Rpck5hbWUsIGRpc3REaXIsIG5vZGVQYXRoLCBwbGlua0Rpcn07XG5leHBvcnQge2lzRHJjcFN5bWxpbmt9O1xuXG5leHBvcnQgZW51bSBXb3JkVG9rZW5UeXBlIHtcbiAgZW9sID0gMCxcbiAgd29yZCxcbiAgdGFiLFxuICBlb3MsIC8vIGVuZCBvZiBzZW50ZW5jZVxuICBvdGhlclxufVxuXG5leHBvcnQgY2xhc3MgV29yZExleGVyIGV4dGVuZHMgQmFzZUxleGVyPFdvcmRUb2tlblR5cGU+IHtcbiAgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRva2VuPFdvcmRUb2tlblR5cGU+PiB7XG4gICAgd2hpbGUgKHRoaXMubGEoKSAhPSBudWxsKSB7XG4gICAgICBjb25zdCBzdGFydCA9IHRoaXMucG9zaXRpb247XG4gICAgICBzd2l0Y2ggKHRoaXMubGEoKSkge1xuICAgICAgICBjYXNlICdcXG4nOlxuICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIGlmICh0aGlzLmxhKCkgPT09ICdcXHInKVxuICAgICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUuZW9sLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ1xcdCc6XG4gICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUudGFiLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgY29uc3QgZmlyc3QgPSB0aGlzLmxhKCkhO1xuICAgICAgICAgIGlmICgvW2EtekEtWiRfXS8udGVzdChmaXJzdCkpIHtcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgd2hpbGUodGhpcy5sYSgpICE9IG51bGwgJiYgL1thLXpBLVokXzAtOV0vLnRlc3QodGhpcy5sYSgpISkpIHtcbiAgICAgICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoLy0vLnRlc3QodGhpcy5sYSgpISkpXG4gICAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUud29yZCwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgvWzAtOV0vLnRlc3QodGhpcy5sYSgpISkpIHtcbiAgICAgICAgICAgIHRoaXMuY29uc3VtZU51bWJlcnMoKTtcbiAgICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLndvcmQsIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZmlyc3QgPT09ICctJyAmJiB0aGlzLmxhKDIpICYmIC9bMC05XS8udGVzdCh0aGlzLmxhKDIpISkpIHtcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgdGhpcy5jb25zdW1lTnVtYmVycygpO1xuICAgICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUud29yZCwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgvWywuXS8udGVzdChmaXJzdCkpIHtcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUuZW9zLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUub3RoZXIsIHRoaXMsIHN0YXJ0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjb25zdW1lTnVtYmVycygpIHtcbiAgICAvLyBpZiAoL1swLTldLy50ZXN0KHRoaXMubGEoKSkpIHtcbiAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICB3aGlsZSh0aGlzLmxhKCkgIT0gbnVsbCAmJiAvWzAtOS5dLy50ZXN0KHRoaXMubGEoKSEpKSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICB9XG4gICAgLy8gfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBib3hTdHJpbmcodGV4dDogc3RyaW5nLCBsaW5lV2lkdGggPSA3MCwgd2hpdGVzcGFjZVdyYXAgPSB0cnVlKTogc3RyaW5nIHtcbiAgY29uc3QgdGIgPSBjcmVhdGVDbGlUYWJsZSh7XG4gICAgY29sV2lkdGhzOiBbbGluZVdpZHRoXSxcbiAgICB3b3JkV3JhcDogd2hpdGVzcGFjZVdyYXAsXG4gICAgaG9yaXpvbnRhbExpbmVzOiBmYWxzZVxuICB9KTtcbiAgdGIucHVzaCguLi50ZXh0LnNwbGl0KC9cXG5cXHI/LykubWFwKGl0ZW0gPT4gW2l0ZW1dKSk7XG4gIHJldHVybiB0Yi50b1N0cmluZygpO1xuICAvLyBjb25zdCBsZXhlciA9IG5ldyBXb3JkTGV4ZXIodGV4dCk7XG5cbiAgLy8gbGluZVdpZHRoID0gbGluZVdpZHRoIC0gNDtcbiAgLy8gbGV0IHVwZGF0ZWQgPSBgKyR7Jy0nLnJlcGVhdChsaW5lV2lkdGggKyAyKX0rXFxuYDtcbiAgLy8gbGV0IGNvbHVtbiA9IDA7XG4gIC8vIGZvciAoY29uc3Qgd29yZCBvZiBsZXhlcikge1xuICAvLyAgIGlmICh3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUud29yZCB8fCB3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUuZW9zIHx8IHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS5vdGhlciB8fFxuICAvLyAgICAgd29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLnRhYikge1xuICAvLyAgICAgaWYgKGNvbHVtbiA9PT0gMCkge1xuICAvLyAgICAgICB1cGRhdGVkICs9ICd8ICc7XG4gIC8vICAgICB9XG4gIC8vICAgICBpZiAoY29sdW1uICsgd29yZC50ZXh0Lmxlbmd0aCA+IGxpbmVXaWR0aCkge1xuICAvLyAgICAgICB1cGRhdGVkICs9ICcgJy5yZXBlYXQobGluZVdpZHRoIC0gY29sdW1uKTtcbiAgLy8gICAgICAgdXBkYXRlZCArPSAnIHxcXG58ICc7XG4gIC8vICAgICAgIC8vIHBhZFxuICAvLyAgICAgICBjb2x1bW4gPSAwO1xuICAvLyAgICAgfVxuICAvLyAgICAgdXBkYXRlZCArPSB3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUudGFiID8gJyAgJyA6IHdvcmQudGV4dDtcbiAgLy8gICAgIGNvbHVtbiArPSB3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUudGFiID8gMiA6IHdvcmQudGV4dC5sZW5ndGg7XG4gIC8vICAgfSBlbHNlIGlmICh3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUuZW9sKSB7XG4gIC8vICAgICBpZiAoY29sdW1uID09PSAwKSB7XG4gIC8vICAgICAgIHVwZGF0ZWQgKz0gJ3wgJztcbiAgLy8gICAgIH1cbiAgLy8gICAgIHVwZGF0ZWQgKz0gJyAnLnJlcGVhdChsaW5lV2lkdGggLSBjb2x1bW4pO1xuICAvLyAgICAgdXBkYXRlZCArPSAnIHxcXG4nO1xuICAvLyAgICAgY29sdW1uID0gMDtcbiAgLy8gICB9XG4gIC8vIH1cbiAgLy8gaWYgKGNvbHVtbiAhPT0gMCkge1xuICAvLyAgIHVwZGF0ZWQgKz0gJyAnLnJlcGVhdChsaW5lV2lkdGggLSBjb2x1bW4pO1xuICAvLyAgIHVwZGF0ZWQgKz0gJyB8XFxuJztcbiAgLy8gfVxuICAvLyB1cGRhdGVkICs9IGArJHsnLScucmVwZWF0KGxpbmVXaWR0aCArIDIpfStgO1xuICAvLyByZXR1cm4gdXBkYXRlZC5yZXBsYWNlKC9eKD89LikvbWcsICcgICcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V4eUZvbnQodGV4dDogc3RyaW5nLCBjb2xvciA9ICcjOTlhMzI5JywgZm9udDogY2ZvbnRzLkZvbnRPcHRpb25bJ2ZvbnQnXSA9ICdibG9jaycpIHtcbiAgcmV0dXJuIGNmb250cy5yZW5kZXIodGV4dCwge2ZvbnQsIGNvbG9yczogW2NvbG9yXX0pO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENsaVRhYmxlT3B0aW9uIGV4dGVuZHMgTm9uTnVsbGFibGU8Q29uc3RydWN0b3JQYXJhbWV0ZXJzPFRhYmxlPlswXT4ge1xuICBob3Jpem9udGFsTGluZXM/OiBib29sZWFuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ2xpVGFibGUob3B0PzogQ2xpVGFibGVPcHRpb24pIHtcbiAgY29uc3QgdGFibGVPcHQ6IENsaVRhYmxlT3B0aW9uID0ge1xuICAgIC8vIHN0eWxlOiB7aGVhZDogW119LFxuICAgIHdvcmRXcmFwOiB0cnVlLFxuICAgIC4uLm9wdFxuICB9O1xuICBkZWxldGUgdGFibGVPcHQuaG9yaXpvbnRhbExpbmVzO1xuXG4gIGlmIChvcHQgJiYgb3B0Lmhvcml6b250YWxMaW5lcyA9PT0gZmFsc2UpIHtcbiAgICB0YWJsZU9wdC5jaGFycyA9IHttaWQ6ICcnLCAnbGVmdC1taWQnOiAnJywgJ21pZC1taWQnOiAnJywgJ3JpZ2h0LW1pZCc6ICcnLCAndG9wLW1pZCc6ICcnfTtcbiAgfVxuICBpZiAob3B0ICYmIG9wdC5ob3Jpem9udGFsTGluZXMpIHtcbiAgICB0YWJsZU9wdC5jb2xBbGlnbnMgPSBvcHQuY29sQWxpZ25zO1xuICB9XG4gIHJldHVybiBuZXcgVGFibGUodGFibGVPcHQpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VUc0RpcnMge1xuICAvKiogc3JjRGlyIHdvcmtzIGxpa2UgXCJyb290RGlyXCIgaW4gdHNjb25maWcgY29tcGlsZXJPcHRpb25zICovXG4gIHNyY0Rpcjogc3RyaW5nO1xuICBkZXN0RGlyOiBzdHJpbmc7XG4gIGlzb21EaXI/OiBzdHJpbmc7XG4gIC8qKiBGb3IgcGxpbmsgY29tbWFuZCB0c2MsIFwiaXNvbURpclwiIHdpbGwgYmUgaWdub3JlZCBpZiBcImluY2x1ZGVcIiBpcyBzZXQgaW4gcGFja2FnZS5qc29uICovXG4gIGluY2x1ZGU/OiBzdHJpbmdbXSB8IHN0cmluZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRzY0NvbmZpZ09mUGtnKGpzb246IGFueSk6IFBhY2thZ2VUc0RpcnMge1xuICAvLyBjb25zdCBnbG9iczogc3RyaW5nW10gfCB1bmRlZmluZWQgPSBnZXQoanNvbiwgJ2RyLnRzLmdsb2JzJyk7XG4gIGNvbnN0IHNyY0RpciA9IGdldChqc29uLCAnZHIudHMuc3JjJywgZ2V0KGpzb24sICdwbGluay50c2Muc3JjJywgJ3RzJykpO1xuICBjb25zdCBpc29tRGlyID0gZ2V0KGpzb24sICdkci50cy5pc29tJywgZ2V0KGpzb24sICdwbGluay50c2MuaXNvbScsICdpc29tJykpO1xuICBjb25zdCBpbmNsdWRlID0gZ2V0KGpzb24sICdkci50cy5pbmNsdWRlJywgZ2V0KGpzb24sICdwbGluay50c2MuaW5jbHVkZScpKTtcbiAgbGV0IGRlc3REaXIgPSBnZXQoanNvbiwgJ2RyLnRzLmRlc3QnLCBnZXQoanNvbiwgJ3BsaW5rLnRzYy5kZXN0JywgJ2Rpc3QnKSk7XG5cbiAgZGVzdERpciA9IHRyaW0odHJpbShkZXN0RGlyLCAnXFxcXCcpLCAnLycpO1xuICByZXR1cm4ge1xuICAgIHNyY0RpciwgZGVzdERpciwgaXNvbURpciwgaW5jbHVkZVxuICB9O1xufVxuXG5leHBvcnQgY29uc3QgZ2V0Um9vdERpciA9ICgpID0+IHJvb3REaXI7XG4vKiogZ2V0IFBsaW5rIHdvcmsgZGlyZWN0b3J5IG9yIHByb2Nlc3MuY3dkKCkgKi9cbmV4cG9ydCBjb25zdCBnZXRXb3JrRGlyID0gKCkgPT4gd29ya0RpcjtcblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTeW1saW5rRm9yUGFja2FnZShwa2dOYW1lOiBzdHJpbmcsIHdvcmtzcGFjZURpciA9IHdvcmtEaXIpIHtcbiAgaWYgKHN5bWxpbmtEaXJOYW1lKVxuICAgIHJldHVybiBQYXRoLnJlc29sdmUod29ya3NwYWNlRGlyLCBzeW1saW5rRGlyTmFtZSwgcGtnTmFtZSk7XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xvc2VzdENvbW1vblBhcmVudERpcihwYXRoczogSXRlcmFibGU8c3RyaW5nPikge1xuICBsZXQgY29tbW9uRGlyOiBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcblxuICBmb3IgKGNvbnN0IHJlYWxQYXRoIG9mIHBhdGhzKSB7XG4gICAgaWYgKGNvbW1vbkRpciA9PSBudWxsKSB7XG4gICAgICBjb21tb25EaXIgPSByZWFsUGF0aC5zcGxpdChQYXRoLnNlcCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgZGlyID0gcmVhbFBhdGguc3BsaXQoUGF0aC5zZXApO1xuICAgIC8vIEZpbmQgdGhlIGNsb3Nlc3QgY29tbW9uIHBhcmVudCBkaXJlY3RvcnksIHVzZSBpdCBhcyByb290RGlyXG4gICAgZm9yIChsZXQgaSA9IDAsIGwgPSBjb21tb25EaXIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBpZiAoaSA+PSBkaXIubGVuZ3RoIHx8IGNvbW1vbkRpcltpXSAhPT0gZGlyW2ldKSB7XG4gICAgICAgIGNvbW1vbkRpciA9IGNvbW1vbkRpci5zbGljZSgwLCBpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGxldCBkaXIgPSBjb21tb25EaXIgPyBjb21tb25EaXIuam9pbihQYXRoLnNlcCkgOiB3b3JrRGlyO1xuICBpZiAoZGlyLmVuZHNXaXRoKCc6JykpIHtcbiAgICAvLyB3aW5kb3cgZGlzayByb290IGRpcmVjdG9yeSBsaWtlIFwiYzpcIiwgbmVlZHMgdG8gdHVybiBpdCB0byBcImM6XFxcXFwiLCBzaW5jZSBwYXRoIG1vZHVsZSBtYWxmdW5jdGlvbnMgb24gXCJjOlwiXG4gICAgZGlyICs9IFBhdGguc2VwO1xuICB9XG4gIHJldHVybiBkaXI7XG59XG5cbi8vIGludGVyZmFjZSBNYXBPclNldCBleHRlbmRzIEl0ZXJhYmxlPGFueT4ge1xuLy8gICBzaXplOiBudW1iZXI7XG4vLyAgIGhhcyhlbDogYW55KTogYm9vbGVhbjtcbi8vIH1cbmV4cG9ydCBmdW5jdGlvbiBpc0VxdWFsTWFwU2V0PFQ+KHNldDE6IFNldDxUPiB8IE1hcDxULCBhbnk+LCBzZXQyOiBTZXQ8VD4gfCBNYXA8VCwgYW55Pikge1xuICBpZiAoc2V0MS5zaXplICE9PSBzZXQyLnNpemUpXG4gICAgcmV0dXJuIGZhbHNlO1xuICBmb3IgKGNvbnN0IGVsIG9mIHNldDEgaW5zdGFuY2VvZiBNYXAgPyBzZXQxLmtleXMoKSA6IHNldDEpIHtcbiAgICBpZiAoIXNldDIuaGFzKGVsKSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBmb3IgKGNvbnN0IGVsIG9mIHNldDIgaW5zdGFuY2VvZiBNYXAgPyBzZXQyLmtleXMoKSA6IHNldDIpIHtcbiAgICBpZiAoIXNldDEuaGFzKGVsKSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZXhwb3J0IGNsYXNzIFNpbXBsZUxpbmtlZExpc3ROb2RlPFQ+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHByZXY6IFNpbXBsZUxpbmtlZExpc3ROb2RlPFQ+IHwgbnVsbCxcbiAgICBwdWJsaWMgbmV4dDogU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4gfCBudWxsLFxuICAgIHB1YmxpYyB2YWx1ZTogVFxuICApIHt9XG59XG5cbmV4cG9ydCBjbGFzcyBTaW1wbGVMaW5rZWRMaXN0PFQ+IHtcbiAgZmlyc3Q6IFNpbXBsZUxpbmtlZExpc3ROb2RlPFQ+IHwgbnVsbDtcbiAgbGFzdDogU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4gfCBudWxsO1xuXG4gIHJlbW92ZU5vZGUobm9kZTogU2ltcGxlTGlua2VkTGlzdE5vZGU8VD4pIHtcbiAgICBpZiAobm9kZS5wcmV2KVxuICAgICAgbm9kZS5wcmV2Lm5leHQgPSBub2RlLm5leHQ7XG4gICAgaWYgKG5vZGUubmV4dClcbiAgICAgIG5vZGUubmV4dC5wcmV2ID0gbm9kZS5wcmV2O1xuICAgIGlmICh0aGlzLmZpcnN0ID09PSBub2RlKSB7XG4gICAgICB0aGlzLmZpcnN0ID0gbm9kZS5uZXh0O1xuICAgIH1cbiAgICBpZiAodGhpcy5sYXN0ID09PSBub2RlKSB7XG4gICAgICB0aGlzLmxhc3QgPSBub2RlLnByZXY7XG4gICAgfVxuICB9XG5cbiAgcHVzaCh2YWx1ZTogVCk6IFNpbXBsZUxpbmtlZExpc3ROb2RlPFQ+IHtcbiAgICBjb25zdCBub2RlID0gbmV3IFNpbXBsZUxpbmtlZExpc3ROb2RlPFQ+KHRoaXMubGFzdCwgbnVsbCwgdmFsdWUpO1xuICAgIGlmICh0aGlzLmxhc3QpXG4gICAgICB0aGlzLmxhc3QubmV4dCA9IG5vZGU7XG4gICAgdGhpcy5sYXN0ID0gbm9kZTtcbiAgICBpZiAodGhpcy5maXJzdCA9PSBudWxsKSB7XG4gICAgICB0aGlzLmZpcnN0ID0gbm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICAqdHJhdmVyc2UoKSB7XG4gICAgZm9yIChsZXQgY3VyciA9IHRoaXMuZmlyc3Q7IGN1cnIgIT0gbnVsbDsgY3VyciA9IGN1cnIubmV4dCkge1xuICAgICAgeWllbGQgY3Vyci52YWx1ZTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==