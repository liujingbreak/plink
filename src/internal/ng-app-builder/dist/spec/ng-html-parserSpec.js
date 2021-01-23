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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctaHRtbC1wYXJzZXJTcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibmctaHRtbC1wYXJzZXJTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUErQjtBQUMvQiwwRUFBeUY7QUFDekYsK0RBQTBEO0FBQzFELGtEQUEwQjtBQUUxQix1Q0FBeUI7QUFDekIsMENBQTRCO0FBRTVCLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFFOUIsRUFBRSxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsRUFBRTtRQUMvQyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFNBQVMsR0FBRyxpQ0FBaUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN0Rix1QkFBVSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsc0JBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNqRCxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQUssQ0FBQyxJQUFJLENBQUMsOEJBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakUsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLEVBQUMsT0FBTyxFQUFFLEdBQUcsRUFBQyxHQUFHLHdCQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDckMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM3QyxLQUFLLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBRTtZQUNyQixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzdDLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyx3QkFBTyxDQUFDLElBQUksRUFBRTtnQkFDN0IsS0FBSyxNQUFNLFNBQVMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFFLEdBQWtCLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQzNELElBQUksU0FBUyxDQUFDLEtBQUssSUFBSSxJQUFJO3dCQUN6QixTQUFTO29CQUVYLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7b0JBQ3ZFLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDaEc7YUFDRjtTQUNGO1FBQ0QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0IsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCBwYXJzZSwge0h0bWxUb2tlblR5cGUsIGxleGVyLCBUYWdLaW5kLCBPcGVuVGFnQXN0fSBmcm9tICcuLi91dGlscy9uZy1odG1sLXBhcnNlcic7XG5pbXBvcnQge2xpc3RUb2tlbnN9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvTExuLXBhcnNlcic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmRlc2NyaWJlKCduZy1odG1sLXBhcnNlcicsICgpID0+IHtcblxuICBpdCgncGFyc2VyIHNob3VsZCB3b3JrIGZvciB0ZXN0IGh0bWwgZmlsZScsICgpID0+IHtcbiAgICBjb25zdCBuZ0h0bWwgPSBmcy5yZWFkRmlsZVN5bmMoX19kaXJuYW1lICsgJy8uLi8uLi90cy9zcGVjL3Rlc3QtcGFyc2VyLmh0bWwnLCAndXRmOCcpO1xuICAgIGxpc3RUb2tlbnMoJ2RlYnVnJywgbmdIdG1sLCBsZXhlcikuZm9yRWFjaCh0b2tlbiA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhjaGFsay5jeWFuKEh0bWxUb2tlblR5cGVbdG9rZW4udHlwZV0pLCB0b2tlbi50ZXh0KTtcbiAgICB9KTtcbiAgICBjb25zdCB7YWxsVGFnczogYXN0fSA9IHBhcnNlKG5nSHRtbCk7XG4gICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYXN0LCBudWxsLCAnICAnKSk7XG4gICAgZm9yIChjb25zdCB0YWcgb2YgYXN0KSB7XG4gICAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh0YWcsIG51bGwsICcgICcpKTtcbiAgICAgIGlmICh0YWcua2luZCA9PT0gVGFnS2luZC5vcGVuKSB7XG4gICAgICAgIGZvciAoY29uc3QgYXR0clZhbHVlIG9mIF8udmFsdWVzKCh0YWcgYXMgT3BlblRhZ0FzdCkuYXR0cnMpKSB7XG4gICAgICAgICAgaWYgKGF0dHJWYWx1ZS52YWx1ZSA9PSBudWxsKVxuICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICBleHBlY3QoYXR0clZhbHVlLnZhbHVlLnN0YXJ0KS5ub3QudG9CZShhdHRyVmFsdWUudmFsdWUuZW5kLCBhdHRyVmFsdWUpO1xuICAgICAgICAgIGV4cGVjdChuZ0h0bWwuc2xpY2UoYXR0clZhbHVlLnZhbHVlLnN0YXJ0LCBhdHRyVmFsdWUudmFsdWUuZW5kKSkudG9FcXVhbChhdHRyVmFsdWUudmFsdWUudGV4dCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZXhwZWN0KGFzdFswXS5zdGFydCkudG9CZSgwKTtcbiAgfSk7XG59KTtcbiJdfQ==