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
                    if (first === '-' && /[0-9]/.test(this.la(2))) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHVEQUFxRDtBQUNyRCx1REFBK0I7QUFDL0IscURBQTZCO0FBRTdCLElBQVksYUFNWDtBQU5ELFdBQVksYUFBYTtJQUN4QiwrQ0FBTyxDQUFBO0lBQ1AsaURBQUksQ0FBQTtJQUNKLCtDQUFHLENBQUE7SUFDSCwrQ0FBRyxDQUFBO0lBQ0gsbURBQUssQ0FBQTtBQUNOLENBQUMsRUFOVyxhQUFhLEdBQWIscUJBQWEsS0FBYixxQkFBYSxRQU14QjtBQUVELE1BQWEsU0FBVSxTQUFRLDJCQUF3QjtJQUN0RCxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNqQixPQUFPLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxJQUFJLEVBQUU7WUFDekIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUM1QixRQUFRLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRTtnQkFDbEIsS0FBSyxJQUFJO29CQUNSLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDZixJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsS0FBSyxJQUFJO3dCQUNyQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2hCLE1BQU0sSUFBSSx1QkFBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUNoRCxNQUFNO2dCQUNQLEtBQUssSUFBSTtvQkFDUixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2YsTUFBTSxJQUFJLHVCQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQ2hELE1BQU07Z0JBQ1A7b0JBQ0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUN4QixJQUFJLFlBQVksQ0FBQyxJ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