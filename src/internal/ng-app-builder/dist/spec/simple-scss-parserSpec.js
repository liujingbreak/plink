"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable no-console
const simple_scss_parser_1 = require("../utils/simple-scss-parser");
const base_LLn_parser_1 = require("dr-comp-package/wfh/dist/base-LLn-parser");
const fs = require("fs");
const Path = require("path");
describe('simple-scss-parser', () => {
    let text;
    beforeAll(() => {
        text = fs.readFileSync(Path.join(__dirname, '../../ts/spec/simple-scss-parser-test.scss'), 'utf-8');
    });
    it('lexer should work', () => {
        const lexer = new simple_scss_parser_1.ScssLexer(text);
        console.log('-----------');
        const tokens = Array.from(new base_LLn_parser_1.TokenFilter(lexer, simple_scss_parser_1.TokenType.any));
        // console.log(tokens);
        expect(tokens.length).toBe(9);
        for (const tk of tokens) {
            expect(text.slice(tk.start, tk.end)).toBe(tk.text);
        }
    });
    it('parser should work', () => {
        const lexer = new simple_scss_parser_1.ScssLexer(text);
        const parser = new simple_scss_parser_1.ScssParser(lexer);
        const imports = parser.getAllImport();
        console.log(imports);
    });
});

//# sourceMappingURL=simple-scss-parserSpec.js.map
