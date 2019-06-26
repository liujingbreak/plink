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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHVEQUFxRDtBQUNyRCx1REFBK0I7QUFDL0IscURBQTZCO0FBRTdCLElBQVksYUFNWDtBQU5ELFdBQVksYUFBYTtJQUN4QiwrQ0FBTyxDQUFBO0lBQ1AsaURBQUksQ0FBQTtJQUNKLCtDQUFHLENBQUE7SUFDSCwrQ0FBRyxDQUFBO0lBQ0gsbURBQUssQ0FBQTtBQUNOLENBQUMsRUFOVyxhQUFhLEdBQWIscUJBQWEsS0FBYixxQkFBYSxRQU14QjtBQUVELE1BQWEsU0FBVSxTQUFRLDJCQUF3QjtJQUN0RCxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNqQixPQUFPLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxJQUFJLEVBQUU7WUFDekIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUM1QixRQUFRLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRTtnQkFDbEIsS0FBSyxJQUFJO29CQUNSLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDZixJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsS0FBSyxJQUFJO3dCQUNyQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2hCLE1BQU0sSUFBSSx1QkFBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUNoRCxNQUFNO2dCQUNQLEtBQUssSUFBSTtvQkFDUixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2YsTUFBTSxJQUFJLHVCQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQ2hELE1BQU07Z0JBQ1A7b0JBQ0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRyxDQUFDO29CQUN6QixJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7d0JBQzdCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDZixPQUFNLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxJQUFJLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFHLENBQUMsRUFBRTs0QkFDNUQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO3lCQUNmO3dCQUNELElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFHLENBQUM7NEJBQ3ZCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDaEIsTUFBTSxJQUFJLHVCQUFLLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7d0JBQ2pELE1BQU07cUJBQ047b0JBQ0QsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUcsQ0FBQyxFQUFFO3dCQUM3QixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7d0JBQ3RCLE1BQU0sSUFBSSx1QkFBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO3dCQUNqRCxNQUFNO3FCQUNOO29CQUNELElBQUksS0FBSyxLQUFLLEdBQUcsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUUsQ0FBQyxFQUFFO3dCQUM3RCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQ2YsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO3dCQUN0QixNQUFNLElBQUksdUJBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQzt3QkFDakQsTUFBTTtxQkFDTjtvQkFDRCxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7d0JBQ3ZCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDZixNQUFNLElBQUksdUJBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQzt3QkFDaEQsTUFBTTtxQkFDTjtvQkFDRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2YsTUFBTSxJQUFJLHVCQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFDbkQ7U0FDRDtJQUNGLENBQUM7SUFFRCxjQUFjO1FBQ2IsaUNBQWlDO1FBQ2pDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNmLE9BQU0sSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLElBQUksSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUcsQ0FBQyxFQUFFO1lBQ3JELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUNmO1FBQ0QsSUFBSTtJQUNMLENBQUM7Q0FDRDtBQXpERCw4QkF5REM7QUFFRCxTQUFnQixTQUFTLENBQUMsSUFBWSxFQUFFLFNBQVMsR0FBRyxFQUFFLEVBQUUsY0FBYyxHQUFHLElBQUk7SUFDNUUsTUFBTSxLQUFLLEdBQUcsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFbEMsU0FBUyxHQUFHLFNBQVMsR0FBRyxDQUFDLENBQUM7SUFDMUIsSUFBSSxPQUFPLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQy9DLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztJQUNmLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1FBQ3pCLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxhQUFhLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssYUFBYSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLGFBQWEsQ0FBQyxLQUFLO1lBQzNHLElBQUksQ0FBQyxJQUFJLEtBQUssYUFBYSxDQUFDLEdBQUcsRUFBRTtZQUNqQyxJQUFJLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ2pCLE9BQU8sSUFBSSxJQUFJLENBQUM7YUFDaEI7WUFDRCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLEVBQUU7Z0JBQzFDLE9BQU8sSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsQ0FBQztnQkFDMUMsT0FBTyxJQUFJLFFBQVEsQ0FBQztnQkFDcEIsTUFBTTtnQkFDTixNQUFNLEdBQUcsQ0FBQyxDQUFDO2FBQ1g7WUFDRCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDOUQsTUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztTQUNqRTthQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxhQUFhLENBQUMsR0FBRyxFQUFFO1lBQzNDLElBQUksTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDakIsT0FBTyxJQUFJLElBQUksQ0FBQzthQUNoQjtZQUNELE9BQU8sSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsQ0FBQztZQUMxQyxPQUFPLElBQUksTUFBTSxDQUFDO1lBQ2xCLE1BQU0sR0FBRyxDQUFDLENBQUM7U0FDWDtLQUNEO0lBQ0QsSUFBSSxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQ2pCLE9BQU8sSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsQ0FBQztRQUMxQyxPQUFPLElBQUksTUFBTSxDQUFDO0tBQ2xCO0lBQ0QsT0FBTyxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUMxQyxPQUFPLE9BQU8sQ0FBQztBQUNoQixDQUFDO0FBbkNELDhCQW1DQztBQVFELFNBQWdCLGtCQUFrQixDQUFDLElBQVM7SUFDM0MsSUFBSSxNQUFNLEdBQUcsYUFBRyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDMUMsSUFBSSxPQUFPLEdBQUcsYUFBRyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDOUMsSUFBSSxPQUFPLEdBQUcsYUFBRyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFFOUMsT0FBTyxHQUFHLGNBQUksQ0FBQyxjQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3pDLE1BQU0sR0FBRyxjQUFJLENBQUMsY0FBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN2QyxPQUFPLEdBQUcsY0FBSSxDQUFDLGNBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDekMsT0FBTztRQUNOLE1BQU0sRUFBRSxPQUFPLEVBQUUsT0FBTztLQUN4QixDQUFDO0FBQ0gsQ0FBQztBQVhELGdEQVdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQmFzZUxleGVyLCBUb2tlbiB9IGZyb20gJy4vYmFzZS1MTG4tcGFyc2VyJztcbmltcG9ydCB0cmltIGZyb20gJ2xvZGFzaC90cmltJztcbmltcG9ydCBnZXQgZnJvbSAnbG9kYXNoL2dldCc7XG5cbmV4cG9ydCBlbnVtIFdvcmRUb2tlblR5cGUge1xuXHRlb2wgPSAwLFxuXHR3b3JkLFxuXHR0YWIsXG5cdGVvcywgLy8gZW5kIG9mIHNlbnRlbmNlXG5cdG90aGVyXG59XG5cbmV4cG9ydCBjbGFzcyBXb3JkTGV4ZXIgZXh0ZW5kcyBCYXNlTGV4ZXI8V29yZFRva2VuVHlwZT4ge1xuXHQqW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VG9rZW48V29yZFRva2VuVHlwZT4+IHtcblx0XHR3aGlsZSAodGhpcy5sYSgpICE9IG51bGwpIHtcblx0XHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcblx0XHRcdHN3aXRjaCAodGhpcy5sYSgpKSB7XG5cdFx0XHRcdGNhc2UgJ1xcbic6XG5cdFx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHRcdFx0aWYgKHRoaXMubGEoKSA9PT0gJ1xccicpXG5cdFx0XHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdFx0XHR5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS5lb2wsIHRoaXMsIHN0YXJ0KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAnXFx0Jzpcblx0XHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdFx0XHR5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS50YWIsIHRoaXMsIHN0YXJ0KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRjb25zdCBmaXJzdCA9IHRoaXMubGEoKSE7XG5cdFx0XHRcdFx0aWYgKC9bYS16QS1aJF9dLy50ZXN0KGZpcnN0KSkge1xuXHRcdFx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHRcdFx0XHR3aGlsZSh0aGlzLmxhKCkgIT0gbnVsbCAmJiAvW2EtekEtWiRfMC05XS8udGVzdCh0aGlzLmxhKCkhKSkge1xuXHRcdFx0XHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmICgvLS8udGVzdCh0aGlzLmxhKCkhKSlcblx0XHRcdFx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHRcdFx0XHR5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS53b3JkLCB0aGlzLCBzdGFydCk7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKC9bMC05XS8udGVzdCh0aGlzLmxhKCkhKSkge1xuXHRcdFx0XHRcdFx0dGhpcy5jb25zdW1lTnVtYmVycygpO1xuXHRcdFx0XHRcdFx0eWllbGQgbmV3IFRva2VuKFdvcmRUb2tlblR5cGUud29yZCwgdGhpcywgc3RhcnQpO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChmaXJzdCA9PT0gJy0nICYmIHRoaXMubGEoMikgJiYgL1swLTldLy50ZXN0KHRoaXMubGEoMikhKSkge1xuXHRcdFx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHRcdFx0XHR0aGlzLmNvbnN1bWVOdW1iZXJzKCk7XG5cdFx0XHRcdFx0XHR5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS53b3JkLCB0aGlzLCBzdGFydCk7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKC9bLC5dLy50ZXN0KGZpcnN0KSkge1xuXHRcdFx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHRcdFx0XHR5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS5lb3MsIHRoaXMsIHN0YXJ0KTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdFx0XHR5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS5vdGhlciwgdGhpcywgc3RhcnQpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGNvbnN1bWVOdW1iZXJzKCkge1xuXHRcdC8vIGlmICgvWzAtOV0vLnRlc3QodGhpcy5sYSgpKSkge1xuXHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdHdoaWxlKHRoaXMubGEoKSAhPSBudWxsICYmIC9bMC05Ll0vLnRlc3QodGhpcy5sYSgpISkpIHtcblx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdH1cblx0XHQvLyB9XG5cdH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJveFN0cmluZyh0ZXh0OiBzdHJpbmcsIGxpbmVXaWR0aCA9IDYwLCB3aGl0ZXNwYWNlV3JhcCA9IHRydWUpOiBzdHJpbmcge1xuXHRjb25zdCBsZXhlciA9IG5ldyBXb3JkTGV4ZXIodGV4dCk7XG5cblx0bGluZVdpZHRoID0gbGluZVdpZHRoIC0gNDtcblx0bGV0IHVwZGF0ZWQgPSBgJHsnLScucmVwZWF0KGxpbmVXaWR0aCArIDQpfVxcbmA7XG5cdGxldCBjb2x1bW4gPSAwO1xuXHRmb3IgKGNvbnN0IHdvcmQgb2YgbGV4ZXIpIHtcblx0XHRpZiAod29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLndvcmQgfHwgd29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLmVvcyB8fCB3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUub3RoZXIgfHxcblx0XHRcdHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS50YWIpIHtcblx0XHRcdGlmIChjb2x1bW4gPT09IDApIHtcblx0XHRcdFx0dXBkYXRlZCArPSAnfCAnO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNvbHVtbiArIHdvcmQudGV4dC5sZW5ndGggPiBsaW5lV2lkdGgpIHtcblx0XHRcdFx0dXBkYXRlZCArPSAnICcucmVwZWF0KGxpbmVXaWR0aCAtIGNvbHVtbik7XG5cdFx0XHRcdHVwZGF0ZWQgKz0gJyB8XFxufCAnO1xuXHRcdFx0XHQvLyBwYWRcblx0XHRcdFx0Y29sdW1uID0gMDtcblx0XHRcdH1cblx0XHRcdHVwZGF0ZWQgKz0gd29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLnRhYiA/ICcgICcgOiB3b3JkLnRleHQ7XG5cdFx0XHRjb2x1bW4gKz0gd29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLnRhYiA/IDIgOiB3b3JkLnRleHQubGVuZ3RoO1xuXHRcdH0gZWxzZSBpZiAod29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLmVvbCkge1xuXHRcdFx0aWYgKGNvbHVtbiA9PT0gMCkge1xuXHRcdFx0XHR1cGRhdGVkICs9ICd8ICc7XG5cdFx0XHR9XG5cdFx0XHR1cGRhdGVkICs9ICcgJy5yZXBlYXQobGluZVdpZHRoIC0gY29sdW1uKTtcblx0XHRcdHVwZGF0ZWQgKz0gJyB8XFxuJztcblx0XHRcdGNvbHVtbiA9IDA7XG5cdFx0fVxuXHR9XG5cdGlmIChjb2x1bW4gIT09IDApIHtcblx0XHR1cGRhdGVkICs9ICcgJy5yZXBlYXQobGluZVdpZHRoIC0gY29sdW1uKTtcblx0XHR1cGRhdGVkICs9ICcgfFxcbic7XG5cdH1cblx0dXBkYXRlZCArPSBgJHsnLScucmVwZWF0KGxpbmVXaWR0aCArIDQpfWA7XG5cdHJldHVybiB1cGRhdGVkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VUc0RpcnMge1xuXHRzcmNEaXI6IHN0cmluZztcblx0ZGVzdERpcjogc3RyaW5nO1xuXHRpc29tRGlyOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUc0RpcnNPZlBhY2thZ2UoanNvbjogYW55KTogUGFja2FnZVRzRGlycyB7XG5cdGxldCBzcmNEaXIgPSBnZXQoanNvbiwgJ2RyLnRzLnNyYycsICd0cycpO1xuXHRsZXQgZGVzdERpciA9IGdldChqc29uLCAnZHIudHMuZGVzdCcsICdkaXN0Jyk7XG5cdGxldCBpc29tRGlyID0gZ2V0KGpzb24sICdkci50cy5pc29tJywgJ2lzb20nKTtcblxuXHRkZXN0RGlyID0gdHJpbSh0cmltKGRlc3REaXIsICdcXFxcJyksICcvJyk7XG5cdHNyY0RpciA9IHRyaW0odHJpbShzcmNEaXIsICcvJyksICdcXFxcJyk7XG5cdGlzb21EaXIgPSB0cmltKHRyaW0oaXNvbURpciwgJy8nKSwgJ1xcXFwnKTtcblx0cmV0dXJuIHtcblx0XHRzcmNEaXIsIGRlc3REaXIsIGlzb21EaXJcblx0fTtcbn1cblxuIl19