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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL25nLWh0bWwtcGFyc2VyU3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwrQkFBK0I7QUFDL0Isa0ZBQXlGO0FBQ3pGLG9FQUErRDtBQUMvRCwwREFBMEI7QUFFMUIsK0NBQXlCO0FBQ3pCLGtEQUE0QjtBQUU1QixRQUFRLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO0lBRTlCLEVBQUUsQ0FBQyx1Q0FBdUMsRUFBRSxHQUFHLEVBQUU7UUFDL0MsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxTQUFTLEdBQUcsaUNBQWlDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdEYsdUJBQVUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLHNCQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLDhCQUFhLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pFLENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxFQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUMsR0FBRyx3QkFBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDN0MsS0FBSyxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUU7WUFDckIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUM3QyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssd0JBQU8sQ0FBQyxJQUFJLEVBQUU7Z0JBQzdCLEtBQUssTUFBTSxTQUFTLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBRSxHQUFrQixDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUMzRCxJQUFJLFNBQVMsQ0FBQyxLQUFLLElBQUksSUFBSTt3QkFDekIsU0FBUztvQkFFWCxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUN2RSxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ2hHO2FBQ0Y7U0FDRjtRQUNELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9CLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3Qvc3BlYy9uZy1odG1sLXBhcnNlclNwZWMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgcGFyc2UsIHtIdG1sVG9rZW5UeXBlLCBsZXhlciwgVGFnS2luZCwgT3BlblRhZ0FzdH0gZnJvbSAnLi4vdXRpbHMvbmctaHRtbC1wYXJzZXInO1xuaW1wb3J0IHtsaXN0VG9rZW5zfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvTExuLXBhcnNlcic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmRlc2NyaWJlKCduZy1odG1sLXBhcnNlcicsICgpID0+IHtcblxuICBpdCgncGFyc2VyIHNob3VsZCB3b3JrIGZvciB0ZXN0IGh0bWwgZmlsZScsICgpID0+IHtcbiAgICBjb25zdCBuZ0h0bWwgPSBmcy5yZWFkRmlsZVN5bmMoX19kaXJuYW1lICsgJy8uLi8uLi90cy9zcGVjL3Rlc3QtcGFyc2VyLmh0bWwnLCAndXRmOCcpO1xuICAgIGxpc3RUb2tlbnMoJ2RlYnVnJywgbmdIdG1sLCBsZXhlcikuZm9yRWFjaCh0b2tlbiA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhjaGFsay5jeWFuKEh0bWxUb2tlblR5cGVbdG9rZW4udHlwZV0pLCB0b2tlbi50ZXh0KTtcbiAgICB9KTtcbiAgICBjb25zdCB7YWxsVGFnczogYXN0fSA9IHBhcnNlKG5nSHRtbCk7XG4gICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYXN0LCBudWxsLCAnICAnKSk7XG4gICAgZm9yIChjb25zdCB0YWcgb2YgYXN0KSB7XG4gICAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh0YWcsIG51bGwsICcgICcpKTtcbiAgICAgIGlmICh0YWcua2luZCA9PT0gVGFnS2luZC5vcGVuKSB7XG4gICAgICAgIGZvciAoY29uc3QgYXR0clZhbHVlIG9mIF8udmFsdWVzKCh0YWcgYXMgT3BlblRhZ0FzdCkuYXR0cnMpKSB7XG4gICAgICAgICAgaWYgKGF0dHJWYWx1ZS52YWx1ZSA9PSBudWxsKVxuICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICBleHBlY3QoYXR0clZhbHVlLnZhbHVlLnN0YXJ0KS5ub3QudG9CZShhdHRyVmFsdWUudmFsdWUuZW5kLCBhdHRyVmFsdWUpO1xuICAgICAgICAgIGV4cGVjdChuZ0h0bWwuc2xpY2UoYXR0clZhbHVlLnZhbHVlLnN0YXJ0LCBhdHRyVmFsdWUudmFsdWUuZW5kKSkudG9FcXVhbChhdHRyVmFsdWUudmFsdWUudGV4dCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZXhwZWN0KGFzdFswXS5zdGFydCkudG9CZSgwKTtcbiAgfSk7XG59KTtcbiJdfQ==
