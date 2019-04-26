"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const base_LLn_parser_1 = require("./base-LLn-parser");
const trim_1 = tslib_1.__importDefault(require("lodash/trim"));
const get_1 = tslib_1.__importDefault(require("lodash/get"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx1REFBcUQ7QUFDckQsK0RBQStCO0FBQy9CLDZEQUE2QjtBQUU3QixJQUFZLGFBTVg7QUFORCxXQUFZLGFBQWE7SUFDeEIsK0NBQU8sQ0FBQTtJQUNQLGlEQUFJLENBQUE7SUFDSiwrQ0FBRyxDQUFBO0lBQ0gsK0NBQUcsQ0FBQTtJQUNILG1EQUFLLENBQUE7QUFDTixDQUFDLEVBTlcsYUFBYSxHQUFiLHFCQUFhLEtBQWIscUJBQWEsUUFNeEI7QUFFRCxNQUFhLFNBQVUsU0FBUSwyQkFBd0I7SUFDdEQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDakIsT0FBTyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksSUFBSSxFQUFFO1lBQ3pCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDNUIsUUFBUSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUU7Z0JBQ2xCLEtBQUssSUFBSTtvQkFDUixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2YsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEtBQUssSUFBSTt3QkFDckIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNoQixNQUFNLElBQUksdUJBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDaEQsTUFBTTtnQkFDUCxLQUFLLElBQUk7b0JBQ1IsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNmLE1BQU0sSUFBSSx1QkFBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUNoRCxNQUFNO2dCQUNQO29CQUNDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDeEIsSUFBSSxZQUFZLENBQUMsSUFB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