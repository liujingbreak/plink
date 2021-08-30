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
/* eslint-disable  no-console */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctaHRtbC1wYXJzZXJTcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibmctaHRtbC1wYXJzZXJTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdDQUFnQztBQUNoQywwRUFBeUY7QUFDekYsK0RBQTBEO0FBQzFELGtEQUEwQjtBQUUxQix1Q0FBeUI7QUFDekIsMENBQTRCO0FBRTVCLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFFOUIsRUFBRSxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsRUFBRTtRQUMvQyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFNBQVMsR0FBRyxpQ0FBaUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN0Rix1QkFBVSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsc0JBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNqRCxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQUssQ0FBQyxJQUFJLENBQUMsOEJBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEUsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLEVBQUMsT0FBTyxFQUFFLEdBQUcsRUFBQyxHQUFHLHdCQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDckMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM3QyxLQUFLLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBRTtZQUNyQixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzdDLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyx3QkFBTyxDQUFDLElBQUksRUFBRTtnQkFDN0IsS0FBSyxNQUFNLFNBQVMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFFLEdBQWtCLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQzNELElBQUksU0FBUyxDQUFDLEtBQUssSUFBSSxJQUFJO3dCQUN6QixTQUFTO29CQUVYLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7b0JBQ3ZFLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDaEc7YUFDRjtTQUNGO1FBQ0QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0IsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlICBuby1jb25zb2xlICovXG5pbXBvcnQgcGFyc2UsIHtIdG1sVG9rZW5UeXBlLCBsZXhlciwgVGFnS2luZCwgT3BlblRhZ0FzdH0gZnJvbSAnLi4vdXRpbHMvbmctaHRtbC1wYXJzZXInO1xuaW1wb3J0IHtsaXN0VG9rZW5zfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L0xMbi1wYXJzZXInO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuXG5kZXNjcmliZSgnbmctaHRtbC1wYXJzZXInLCAoKSA9PiB7XG5cbiAgaXQoJ3BhcnNlciBzaG91bGQgd29yayBmb3IgdGVzdCBodG1sIGZpbGUnLCAoKSA9PiB7XG4gICAgY29uc3QgbmdIdG1sID0gZnMucmVhZEZpbGVTeW5jKF9fZGlybmFtZSArICcvLi4vLi4vdHMvc3BlYy90ZXN0LXBhcnNlci5odG1sJywgJ3V0ZjgnKTtcbiAgICBsaXN0VG9rZW5zKCdkZWJ1ZycsIG5nSHRtbCwgbGV4ZXIpLmZvckVhY2godG9rZW4gPT4ge1xuICAgICAgY29uc29sZS5sb2coY2hhbGsuY3lhbihIdG1sVG9rZW5UeXBlW3Rva2VuLnR5cGUhXSksIHRva2VuLnRleHQpO1xuICAgIH0pO1xuICAgIGNvbnN0IHthbGxUYWdzOiBhc3R9ID0gcGFyc2UobmdIdG1sKTtcbiAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhc3QsIG51bGwsICcgICcpKTtcbiAgICBmb3IgKGNvbnN0IHRhZyBvZiBhc3QpIHtcbiAgICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHRhZywgbnVsbCwgJyAgJykpO1xuICAgICAgaWYgKHRhZy5raW5kID09PSBUYWdLaW5kLm9wZW4pIHtcbiAgICAgICAgZm9yIChjb25zdCBhdHRyVmFsdWUgb2YgXy52YWx1ZXMoKHRhZyBhcyBPcGVuVGFnQXN0KS5hdHRycykpIHtcbiAgICAgICAgICBpZiAoYXR0clZhbHVlLnZhbHVlID09IG51bGwpXG4gICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgIGV4cGVjdChhdHRyVmFsdWUudmFsdWUuc3RhcnQpLm5vdC50b0JlKGF0dHJWYWx1ZS52YWx1ZS5lbmQsIGF0dHJWYWx1ZSk7XG4gICAgICAgICAgZXhwZWN0KG5nSHRtbC5zbGljZShhdHRyVmFsdWUudmFsdWUuc3RhcnQsIGF0dHJWYWx1ZS52YWx1ZS5lbmQpKS50b0VxdWFsKGF0dHJWYWx1ZS52YWx1ZS50ZXh0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBleHBlY3QoYXN0WzBdLnN0YXJ0KS50b0JlKDApO1xuICB9KTtcbn0pO1xuIl19