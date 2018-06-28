"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable no-console */
const ps = require("../utils/ng-html-parser");
const fs = require("fs");
const _ = require("lodash");
describe('ng-html-parser', () => {
    const lexer = new ps.BaseLexer('abcde');
    it('Lexer.la()  should work', () => {
        // let lexer = new ps.Lexer('abcde');
        expect(lexer.la()).toEqual('a');
        expect(lexer.la(2)).toEqual('b');
        expect(lexer.la(3)).toEqual('c');
    });
    it('Lexer.advance()  should work', () => {
        lexer.advance(2);
        expect(lexer.la()).toEqual('c');
        expect(lexer.la(3)).toEqual('e');
        expect(lexer.la(7)).toEqual(null);
    });
    it('Lexer.isNext("cde") should work', () => {
        expect(lexer.isNext('cde')).toBeTruthy();
        expect(lexer.isNext('cd')).toBeTruthy();
        expect(lexer.isNext('cdef')).toBeFalsy();
    });
    const lexer2 = new ps.BaseLexer('0123\n5678\n0abcd\n');
    it('line and column shoud be correct', () => {
        expect(lexer2.la(10 + 1)).toEqual('0');
        let chr = lexer2.la();
        while (chr != null) {
            lexer2.advance();
            console.log(lexer2.getCurrentPosInfo());
            chr = lexer2.la();
        }
        console.log(lexer2.lineBeginPositions);
        expect(lexer2.getLineColumn(0)).toEqual([0, 0]);
        expect(lexer2.getLineColumn(3)).toEqual([0, 3]);
        expect(lexer2.getLineColumn(11)).toEqual([2, 1]);
    });
    it('template lexer should work for test html file', () => {
        const ngHtml = fs.readFileSync(__dirname + '/../../ts/spec/test-parser.html', 'utf8');
        const lexer = new ps.TemplateLexer(ngHtml);
        for (const token of lexer) {
            console.log(`type: ${ps.TokenType[token.type]},\ttext: ` + token.text);
        }
    });
    it('parser should work for test html file', () => {
        const ngHtml = fs.readFileSync(__dirname + '/../../ts/spec/test-parser.html', 'utf8');
        const ast = new ps.TemplateParser(ngHtml).parse();
        console.log(JSON.stringify(ast, null, '  '));
        for (const tag of ast) {
            console.log(tag);
            for (const attrValue of _.values(tag.attrs)) {
                if (attrValue == null)
                    continue;
                expect(ngHtml.substring(attrValue.start, attrValue.end)).toEqual(attrValue.text);
            }
        }
        expect(ast[0].start).toBe(0);
    });
});

//# sourceMappingURL=ng-html-parserSpec.js.map
