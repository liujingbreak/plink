"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_LLn_parser_1 = require("./base-LLn-parser");
const trim_1 = __importDefault(require("lodash/trim"));
const get_1 = __importDefault(require("lodash/get"));
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
    let updated = `${'-'.repeat(lineWidth + 4)}\n`;
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
    updated += `${'-'.repeat(lineWidth + 4)}`;
    return updated;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHVEQUFxRDtBQUNyRCx1REFBK0I7QUFDL0IscURBQTZCO0FBRTdCLElBQVksYUFNWDtBQU5ELFdBQVksYUFBYTtJQUN2QiwrQ0FBTyxDQUFBO0lBQ1AsaURBQUksQ0FBQTtJQUNKLCtDQUFHLENBQUE7SUFDSCwrQ0FBRyxDQUFBO0lBQ0gsbURBQUssQ0FBQTtBQUNQLENBQUMsRUFOVyxhQUFhLEdBQWIscUJBQWEsS0FBYixxQkFBYSxRQU14QjtBQUVELE1BQWEsU0FBVSxTQUFRLDJCQUF3QjtJQUNyRCxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNoQixPQUFPLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxJQUFJLEVBQUU7WUFDeEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUM1QixRQUFRLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRTtnQkFDakIsS0FBSyxJQUFJO29CQUNQLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDZixJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsS0FBSyxJQUFJO3dCQUNwQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2pCLE1BQU0sSUFBSSx1QkFBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUNoRCxNQUFNO2dCQUNSLEtBQUssSUFBSTtvQkFDUCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2YsTUFBTSxJQUFJLHVCQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQ2hELE1BQU07Z0JBQ1I7b0JBQ0UsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRyxDQUFDO29CQUN6QixJQUFJLFlBQVksQ0FBQyxJ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QVMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQzFDLE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFuQ0QsOEJBbUNDO0FBUUQsU0FBZ0Isa0JBQWtCLENBQUMsSUFBUztJQUMxQyxJQUFJLE1BQU0sR0FBRyxhQUFHLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMxQyxJQUFJLE9BQU8sR0FBRyxhQUFHLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM5QyxJQUFJLE9BQU8sR0FBRyxhQUFHLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUU5QyxPQUFPLEdBQUcsY0FBSSxDQUFDLGNBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDekMsTUFBTSxHQUFHLGNBQUksQ0FBQyxjQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3ZDLE9BQU8sR0FBRyxjQUFJLENBQUMsY0FBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN6QyxPQUFPO1FBQ0wsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPO0tBQ3pCLENBQUM7QUFDSixDQUFDO0FBWEQsZ0RBV0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCYXNlTGV4ZXIsIFRva2VuIH0gZnJvbSAnLi9iYXNlLUxMbi1wYXJzZXInO1xuaW1wb3J0IHRyaW0gZnJvbSAnbG9kYXNoL3RyaW0nO1xuaW1wb3J0IGdldCBmcm9tICdsb2Rhc2gvZ2V0JztcblxuZXhwb3J0IGVudW0gV29yZFRva2VuVHlwZSB7XG4gIGVvbCA9IDAsXG4gIHdvcmQsXG4gIHRhYixcbiAgZW9zLCAvLyBlbmQgb2Ygc2VudGVuY2VcbiAgb3RoZXJcbn1cblxuZXhwb3J0IGNsYXNzIFdvcmRMZXhlciBleHRlbmRzIEJhc2VMZXhlcjxXb3JkVG9rZW5UeXBlPiB7XG4gICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUb2tlbjxXb3JkVG9rZW5UeXBlPj4ge1xuICAgIHdoaWxlICh0aGlzLmxhKCkgIT0gbnVsbCkge1xuICAgICAgY29uc3Qgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuICAgICAgc3dpdGNoICh0aGlzLmxhKCkpIHtcbiAgICAgICAgY2FzZSAnXFxuJzpcbiAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICBpZiAodGhpcy5sYSgpID09PSAnXFxyJylcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLmVvbCwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdcXHQnOlxuICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLnRhYiwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGNvbnN0IGZpcnN0ID0gdGhpcy5sYSgpITtcbiAgICAgICAgICBpZiAoL1thLXpBLVokX10vLnRlc3QoZmlyc3QpKSB7XG4gICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIHdoaWxlKHRoaXMubGEoKSAhPSBudWxsICYmIC9bYS16QS1aJF8wLTldLy50ZXN0KHRoaXMubGEoKSEpKSB7XG4gICAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKC8tLy50ZXN0KHRoaXMubGEoKSEpKVxuICAgICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLndvcmQsIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoL1swLTldLy50ZXN0KHRoaXMubGEoKSEpKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnN1bWVOdW1iZXJzKCk7XG4gICAgICAgICAgICB5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS53b3JkLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGZpcnN0ID09PSAnLScgJiYgdGhpcy5sYSgyKSAmJiAvWzAtOV0vLnRlc3QodGhpcy5sYSgyKSEpKSB7XG4gICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIHRoaXMuY29uc3VtZU51bWJlcnMoKTtcbiAgICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLndvcmQsIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoL1ssLl0vLnRlc3QoZmlyc3QpKSB7XG4gICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLmVvcywgdGhpcywgc3RhcnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLm90aGVyLCB0aGlzLCBzdGFydCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3VtZU51bWJlcnMoKSB7XG4gICAgLy8gaWYgKC9bMC05XS8udGVzdCh0aGlzLmxhKCkpKSB7XG4gICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgd2hpbGUodGhpcy5sYSgpICE9IG51bGwgJiYgL1swLTkuXS8udGVzdCh0aGlzLmxhKCkhKSkge1xuICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgfVxuICAgIC8vIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYm94U3RyaW5nKHRleHQ6IHN0cmluZywgbGluZVdpZHRoID0gNjAsIHdoaXRlc3BhY2VXcmFwID0gdHJ1ZSk6IHN0cmluZyB7XG4gIGNvbnN0IGxleGVyID0gbmV3IFdvcmRMZXhlcih0ZXh0KTtcblxuICBsaW5lV2lkdGggPSBsaW5lV2lkdGggLSA0O1xuICBsZXQgdXBkYXRlZCA9IGAkeyctJy5yZXBlYXQobGluZVdpZHRoICsgNCl9XFxuYDtcbiAgbGV0IGNvbHVtbiA9IDA7XG4gIGZvciAoY29uc3Qgd29yZCBvZiBsZXhlcikge1xuICAgIGlmICh3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUud29yZCB8fCB3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUuZW9zIHx8IHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS5vdGhlciB8fFxuICAgICAgd29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLnRhYikge1xuICAgICAgaWYgKGNvbHVtbiA9PT0gMCkge1xuICAgICAgICB1cGRhdGVkICs9ICd8ICc7XG4gICAgICB9XG4gICAgICBpZiAoY29sdW1uICsgd29yZC50ZXh0Lmxlbmd0aCA+IGxpbmVXaWR0aCkge1xuICAgICAgICB1cGRhdGVkICs9ICcgJy5yZXBlYXQobGluZVdpZHRoIC0gY29sdW1uKTtcbiAgICAgICAgdXBkYXRlZCArPSAnIHxcXG58ICc7XG4gICAgICAgIC8vIHBhZFxuICAgICAgICBjb2x1bW4gPSAwO1xuICAgICAgfVxuICAgICAgdXBkYXRlZCArPSB3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUudGFiID8gJyAgJyA6IHdvcmQudGV4dDtcbiAgICAgIGNvbHVtbiArPSB3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUudGFiID8gMiA6IHdvcmQudGV4dC5sZW5ndGg7XG4gICAgfSBlbHNlIGlmICh3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUuZW9sKSB7XG4gICAgICBpZiAoY29sdW1uID09PSAwKSB7XG4gICAgICAgIHVwZGF0ZWQgKz0gJ3wgJztcbiAgICAgIH1cbiAgICAgIHVwZGF0ZWQgKz0gJyAnLnJlcGVhdChsaW5lV2lkdGggLSBjb2x1bW4pO1xuICAgICAgdXBkYXRlZCArPSAnIHxcXG4nO1xuICAgICAgY29sdW1uID0gMDtcbiAgICB9XG4gIH1cbiAgaWYgKGNvbHVtbiAhPT0gMCkge1xuICAgIHVwZGF0ZWQgKz0gJyAnLnJlcGVhdChsaW5lV2lkdGggLSBjb2x1bW4pO1xuICAgIHVwZGF0ZWQgKz0gJyB8XFxuJztcbiAgfVxuICB1cGRhdGVkICs9IGAkeyctJy5yZXBlYXQobGluZVdpZHRoICsgNCl9YDtcbiAgcmV0dXJuIHVwZGF0ZWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZVRzRGlycyB7XG4gIHNyY0Rpcjogc3RyaW5nO1xuICBkZXN0RGlyOiBzdHJpbmc7XG4gIGlzb21EaXI6IHN0cmluZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRzRGlyc09mUGFja2FnZShqc29uOiBhbnkpOiBQYWNrYWdlVHNEaXJzIHtcbiAgbGV0IHNyY0RpciA9IGdldChqc29uLCAnZHIudHMuc3JjJywgJ3RzJyk7XG4gIGxldCBkZXN0RGlyID0gZ2V0KGpzb24sICdkci50cy5kZXN0JywgJ2Rpc3QnKTtcbiAgbGV0IGlzb21EaXIgPSBnZXQoanNvbiwgJ2RyLnRzLmlzb20nLCAnaXNvbScpO1xuXG4gIGRlc3REaXIgPSB0cmltKHRyaW0oZGVzdERpciwgJ1xcXFwnKSwgJy8nKTtcbiAgc3JjRGlyID0gdHJpbSh0cmltKHNyY0RpciwgJy8nKSwgJ1xcXFwnKTtcbiAgaXNvbURpciA9IHRyaW0odHJpbShpc29tRGlyLCAnLycpLCAnXFxcXCcpO1xuICByZXR1cm4ge1xuICAgIHNyY0RpciwgZGVzdERpciwgaXNvbURpclxuICB9O1xufVxuXG4iXX0=