"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable no-console */
const ng_html_parser_1 = tslib_1.__importStar(require("../utils/ng-html-parser"));
const LLn_parser_1 = require("dr-comp-package/wfh/dist/LLn-parser");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const fs = tslib_1.__importStar(require("fs"));
const _ = tslib_1.__importStar(require("lodash"));
describe('ng-html-parser', () => {
    it('parser should work for test html file', () => {
        const ngHtml = fs.readFileSync(__dirname + '/../../ts/spec/test-parser.html', 'utf8');
        LLn_parser_1.listTokens('debug', ngHtml, ng_html_parser_1.lexer).forEach(token => {
            console.log(chalk_1.default.cyan(ng_html_parser_1.HtmlTokenType[token.type]), token.text);
        });
        const { allTags: ast } = ng_html_parser_1.default(ngHtml);
        console.log(JSON.stringify(ast, null, '  '));
        for (const tag of ast) {
            console.log(JSON.stringify(tag, null, '  '));
            if (tag.kind === ng_html_parser_1.TagKind.open) {
                for (const attrValue of _.values(tag.attrs)) {
                    if (attrValue.value == null)
                        continue;
                    expect(attrValue.value.start).not.toBe(attrValue.value.end, attrValue);
                    expect(ngHtml.slice(attrValue.value.start, attrValue.value.end)).toEqual(attrValue.value.text);
                }
            }
        }
        expect(ast[0].start).toBe(0);
    });
});

//# sourceMappingURL=ng-html-parserSpec.js.map
