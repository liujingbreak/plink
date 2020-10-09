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
/* tslint:disable no-console */
const ng_html_parser_1 = __importStar(require("../utils/ng-html-parser"));
const LLn_parser_1 = require("@wfh/plink/wfh/dist/LLn-parser");
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs"));
const _ = __importStar(require("lodash"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9zcGVjL25nLWh0bWwtcGFyc2VyU3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0IsMEVBQXlGO0FBQ3pGLCtEQUEwRDtBQUMxRCxrREFBMEI7QUFFMUIsdUNBQXlCO0FBQ3pCLDBDQUE0QjtBQUU1QixRQUFRLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO0lBRTlCLEVBQUUsQ0FBQyx1Q0FBdUMsRUFBRSxHQUFHLEVBQUU7UUFDL0MsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxTQUFTLEdBQUcsaUNBQWlDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdEYsdUJBQVUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLHNCQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLDhCQUFhLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pFLENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxFQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUMsR0FBRyx3QkFBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDN0MsS0FBSyxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUU7WUFDckIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUM3QyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssd0JBQU8sQ0FBQyxJQUFJLEVBQUU7Z0JBQzdCLEtBQUssTUFBTSxTQUFTLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBRSxHQUFrQixDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUMzRCxJQUFJLFNBQVMsQ0FBQyxLQUFLLElBQUksSUFBSTt3QkFDekIsU0FBUztvQkFFWCxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUN2RSxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ2hHO2FBQ0Y7U0FDRjtRQUNELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9CLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoiZGlzdC9zcGVjL25nLWh0bWwtcGFyc2VyU3BlYy5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
