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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDrcpSymlink = exports.getRootDir = exports.getTsDirsOfPackage = exports.boxString = exports.WordLexer = exports.WordTokenType = void 0;
const base_LLn_parser_1 = require("./base-LLn-parser");
const trim_1 = __importDefault(require("lodash/trim"));
const get_1 = __importDefault(require("lodash/get"));
const fs = __importStar(require("fs"));
const Path = __importStar(require("path"));
const lodash_1 = __importDefault(require("lodash"));
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
function boxString(text, lineWidth = 60, whitespaceWrap = true) {
    const lexer = new WordLexer(text);
    lineWidth = lineWidth - 4;
    let updated = `+${'-'.repeat(lineWidth + 2)}+\n`;
    let column = 0;
    for (const word of lexer) {
        if (word.type === WordTokenType.word || word.type === WordTokenType.eos || word.type === WordTokenType.other ||
            word.type === WordTokenType.tab) {
            if (column === 0) {
                updated += '| ';
            }
            if (column + word.text.length > lineWidth) {
                updated += ' '.repeat(lineWidth - column);
                updated += ' |\n| ';
                // pad
                column = 0;
            }
            updated += word.type === WordTokenType.tab ? '  ' : word.text;
            column += word.type === WordTokenType.tab ? 2 : word.text.length;
        }
        else if (word.type === WordTokenType.eol) {
            if (column === 0) {
                updated += '| ';
            }
            updated += ' '.repeat(lineWidth - column);
            updated += ' |\n';
            column = 0;
        }
    }
    if (column !== 0) {
        updated += ' '.repeat(lineWidth - column);
        updated += ' |\n';
    }
    updated += `+${'-'.repeat(lineWidth + 2)}+`;
    return updated.replace(/^(?=.)/mg, '  ');
}
exports.boxString = boxString;
function getTsDirsOfPackage(json) {
    let srcDir = get_1.default(json, 'dr.ts.src', 'ts');
    let destDir = get_1.default(json, 'dr.ts.dest', 'dist');
    let isomDir = get_1.default(json, 'dr.ts.isom', 'isom');
    destDir = trim_1.default(trim_1.default(destDir, '\\'), '/');
    srcDir = trim_1.default(trim_1.default(srcDir, '/'), '\\');
    isomDir = trim_1.default(trim_1.default(isomDir, '/'), '\\');
    return {
        srcDir, destDir, isomDir
    };
}
exports.getTsDirsOfPackage = getTsDirsOfPackage;
function findRootDir() {
    let dir = process.cwd();
    while (!fs.existsSync(Path.resolve(dir, 'dist/dr-state.json'))) {
        const parentDir = Path.dirname(dir);
        if (parentDir === dir) {
            dir = process.cwd();
            break;
        }
        dir = parentDir;
    }
    return dir;
}
exports.getRootDir = lodash_1.default.memoize(findRootDir);
exports.isDrcpSymlink = fs.lstatSync(Path.resolve(exports.getRootDir(), 'node_modules/dr-comp-package')).isSymbolicLink();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdURBQXFEO0FBQ3JELHVEQUErQjtBQUMvQixxREFBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUM3QixvREFBdUI7QUFFdkIsSUFBWSxhQU1YO0FBTkQsV0FBWSxhQUFhO0lBQ3ZCLCtDQUFPLENBQUE7SUFDUCxpREFBSSxDQUFBO0lBQ0osK0NBQUcsQ0FBQTtJQUNILCtDQUFHLENBQUE7SUFDSCxtREFBSyxDQUFBO0FBQ1AsQ0FBQyxFQU5XLGFBQWEsR0FBYixxQkFBYSxLQUFiLHFCQUFhLFFBTXhCO0FBRUQsTUFBYSxTQUFVLFNBQVEsMkJBQXdCO0lBQ3JELENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLElBQUksRUFBRTtZQUN4QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQzVCLFFBQVEsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFO2dCQUNqQixLQUFLLElBQUk7b0JBQ1AsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNmLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxLQUFLLElBQUk7d0JBQ3BCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDakIsTUFBTSxJQUFJLHVCQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQ2hELE1BQU07Z0JBQ1IsS0FBSyxJQUFJO29CQUNQLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDZixNQUFNLElBQUksdUJBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDaEQsTUFBTTtnQkFDUjtvQkFDRSxNQUFN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QUNwQyxJQUFJLFNBQVMsS0FBSyxHQUFHLEVBQUU7WUFDckIsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNwQixNQUFNO1NBQ1A7UUFDRCxHQUFHLEdBQUcsU0FBUyxDQUFDO0tBQ2pCO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBRVksUUFBQSxVQUFVLEdBQUcsZ0JBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFcEMsUUFBQSxhQUFhLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFVLEVBQUUsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCYXNlTGV4ZXIsIFRva2VuIH0gZnJvbSAnLi9iYXNlLUxMbi1wYXJzZXInO1xuaW1wb3J0IHRyaW0gZnJvbSAnbG9kYXNoL3RyaW0nO1xuaW1wb3J0IGdldCBmcm9tICdsb2Rhc2gvZ2V0JztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuXG5leHBvcnQgZW51bSBXb3JkVG9rZW5UeXBlIHtcbiAgZW9sID0gMCxcbiAgd29yZCxcbiAgdGFiLFxuICBlb3MsIC8vIGVuZCBvZiBzZW50ZW5jZVxuICBvdGhlclxufVxuXG5leHBvcnQgY2xhc3MgV29yZExleGVyIGV4dGVuZHMgQmFzZUxleGVyPFdvcmRUb2tlblR5cGU+IHtcbiAgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRva2VuPFdvcmRUb2tlblR5cGU+PiB7XG4gICAgd2hpbGUgKHRoaXMubGEoKSAhPSBudWxsKSB7XG4gICAgICBjb25zdCBzdGFydCA9IHRoaXMucG9zaXRpb247XG4gICAgICBzd2l0Y2ggKHRoaXMubGEoKSkge1xuICAgICAgICBjYXNlICdcXG4nOlxuICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIGlmICh0aGlzLmxhKCkgPT09ICdcXHInKVxuICAgICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUuZW9sLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ1xcdCc6XG4gICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUudGFiLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgY29uc3QgZmlyc3QgPSB0aGlzLmxhKCkhO1xuICAgICAgICAgIGlmICgvW2EtekEtWiRfXS8udGVzdChmaXJzdCkpIHtcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgd2hpbGUodGhpcy5sYSgpICE9IG51bGwgJiYgL1thLXpBLVokXzAtOV0vLnRlc3QodGhpcy5sYSgpISkpIHtcbiAgICAgICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoLy0vLnRlc3QodGhpcy5sYSgpISkpXG4gICAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUud29yZCwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgvWzAtOV0vLnRlc3QodGhpcy5sYSgpISkpIHtcbiAgICAgICAgICAgIHRoaXMuY29uc3VtZU51bWJlcnMoKTtcbiAgICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLndvcmQsIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZmlyc3QgPT09ICctJyAmJiB0aGlzLmxhKDIpICYmIC9bMC05XS8udGVzdCh0aGlzLmxhKDIpISkpIHtcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgdGhpcy5jb25zdW1lTnVtYmVycygpO1xuICAgICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUud29yZCwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgvWywuXS8udGVzdChmaXJzdCkpIHtcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUuZW9zLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgeWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUub3RoZXIsIHRoaXMsIHN0YXJ0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjb25zdW1lTnVtYmVycygpIHtcbiAgICAvLyBpZiAoL1swLTldLy50ZXN0KHRoaXMubGEoKSkpIHtcbiAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICB3aGlsZSh0aGlzLmxhKCkgIT0gbnVsbCAmJiAvWzAtOS5dLy50ZXN0KHRoaXMubGEoKSEpKSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICB9XG4gICAgLy8gfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBib3hTdHJpbmcodGV4dDogc3RyaW5nLCBsaW5lV2lkdGggPSA2MCwgd2hpdGVzcGFjZVdyYXAgPSB0cnVlKTogc3RyaW5nIHtcbiAgY29uc3QgbGV4ZXIgPSBuZXcgV29yZExleGVyKHRleHQpO1xuXG4gIGxpbmVXaWR0aCA9IGxpbmVXaWR0aCAtIDQ7XG4gIGxldCB1cGRhdGVkID0gYCskeyctJy5yZXBlYXQobGluZVdpZHRoICsgMil9K1xcbmA7XG4gIGxldCBjb2x1bW4gPSAwO1xuICBmb3IgKGNvbnN0IHdvcmQgb2YgbGV4ZXIpIHtcbiAgICBpZiAod29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLndvcmQgfHwgd29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLmVvcyB8fCB3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUub3RoZXIgfHxcbiAgICAgIHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS50YWIpIHtcbiAgICAgIGlmIChjb2x1bW4gPT09IDApIHtcbiAgICAgICAgdXBkYXRlZCArPSAnfCAnO1xuICAgICAgfVxuICAgICAgaWYgKGNvbHVtbiArIHdvcmQudGV4dC5sZW5ndGggPiBsaW5lV2lkdGgpIHtcbiAgICAgICAgdXBkYXRlZCArPSAnICcucmVwZWF0KGxpbmVXaWR0aCAtIGNvbHVtbik7XG4gICAgICAgIHVwZGF0ZWQgKz0gJyB8XFxufCAnO1xuICAgICAgICAvLyBwYWRcbiAgICAgICAgY29sdW1uID0gMDtcbiAgICAgIH1cbiAgICAgIHVwZGF0ZWQgKz0gd29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLnRhYiA/ICcgICcgOiB3b3JkLnRleHQ7XG4gICAgICBjb2x1bW4gKz0gd29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLnRhYiA/IDIgOiB3b3JkLnRleHQubGVuZ3RoO1xuICAgIH0gZWxzZSBpZiAod29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLmVvbCkge1xuICAgICAgaWYgKGNvbHVtbiA9PT0gMCkge1xuICAgICAgICB1cGRhdGVkICs9ICd8ICc7XG4gICAgICB9XG4gICAgICB1cGRhdGVkICs9ICcgJy5yZXBlYXQobGluZVdpZHRoIC0gY29sdW1uKTtcbiAgICAgIHVwZGF0ZWQgKz0gJyB8XFxuJztcbiAgICAgIGNvbHVtbiA9IDA7XG4gICAgfVxuICB9XG4gIGlmIChjb2x1bW4gIT09IDApIHtcbiAgICB1cGRhdGVkICs9ICcgJy5yZXBlYXQobGluZVdpZHRoIC0gY29sdW1uKTtcbiAgICB1cGRhdGVkICs9ICcgfFxcbic7XG4gIH1cbiAgdXBkYXRlZCArPSBgKyR7Jy0nLnJlcGVhdChsaW5lV2lkdGggKyAyKX0rYDtcbiAgcmV0dXJuIHVwZGF0ZWQucmVwbGFjZSgvXig/PS4pL21nLCAnICAnKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlVHNEaXJzIHtcbiAgc3JjRGlyOiBzdHJpbmc7XG4gIGRlc3REaXI6IHN0cmluZztcbiAgaXNvbURpcjogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHNEaXJzT2ZQYWNrYWdlKGpzb246IGFueSk6IFBhY2thZ2VUc0RpcnMge1xuICBsZXQgc3JjRGlyID0gZ2V0KGpzb24sICdkci50cy5zcmMnLCAndHMnKTtcbiAgbGV0IGRlc3REaXIgPSBnZXQoanNvbiwgJ2RyLnRzLmRlc3QnLCAnZGlzdCcpO1xuICBsZXQgaXNvbURpciA9IGdldChqc29uLCAnZHIudHMuaXNvbScsICdpc29tJyk7XG5cbiAgZGVzdERpciA9IHRyaW0odHJpbShkZXN0RGlyLCAnXFxcXCcpLCAnLycpO1xuICBzcmNEaXIgPSB0cmltKHRyaW0oc3JjRGlyLCAnLycpLCAnXFxcXCcpO1xuICBpc29tRGlyID0gdHJpbSh0cmltKGlzb21EaXIsICcvJyksICdcXFxcJyk7XG4gIHJldHVybiB7XG4gICAgc3JjRGlyLCBkZXN0RGlyLCBpc29tRGlyXG4gIH07XG59XG5cbmZ1bmN0aW9uIGZpbmRSb290RGlyKCkge1xuICBsZXQgZGlyID0gcHJvY2Vzcy5jd2QoKTtcbiAgd2hpbGUgKCFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShkaXIsICdkaXN0L2RyLXN0YXRlLmpzb24nKSkpIHtcbiAgICBjb25zdCBwYXJlbnREaXIgPSBQYXRoLmRpcm5hbWUoZGlyKTtcbiAgICBpZiAocGFyZW50RGlyID09PSBkaXIpIHtcbiAgICAgIGRpciA9IHByb2Nlc3MuY3dkKCk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgZGlyID0gcGFyZW50RGlyO1xuICB9XG4gIHJldHVybiBkaXI7XG59XG5cbmV4cG9ydCBjb25zdCBnZXRSb290RGlyID0gXy5tZW1vaXplKGZpbmRSb290RGlyKTtcblxuZXhwb3J0IGNvbnN0IGlzRHJjcFN5bWxpbmsgPSBmcy5sc3RhdFN5bmMoUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkuaXNTeW1ib2xpY0xpbmsoKTtcblxuIl19