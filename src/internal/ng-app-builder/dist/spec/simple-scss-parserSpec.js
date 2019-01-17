"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable no-console
const simple_scss_parser_1 = require("../utils/simple-scss-parser");
const base_LLn_parser_1 = require("dr-comp-package/wfh/dist/base-LLn-parser");
const fs = tslib_1.__importStar(require("fs"));
const Path = tslib_1.__importStar(require("path"));
describe('simple-scss-parser', () => {
    let text;
    beforeAll(() => {
        text = fs.readFileSync(Path.join(__dirname, '../../ts/spec/simple-scss-parser-test.scss'), 'utf-8');
    });
    it('lexer should work', () => {
        const lexer = new simple_scss_parser_1.ScssLexer(text);
        console.log('-----------');
        const tokens = Array.from(new base_LLn_parser_1.TokenFilter(lexer, simple_scss_parser_1.TokenType.any));
        console.log(tokens);
        // expect(tokens.length).toBe(9);
        for (const tk of tokens) {
            expect(text.slice(tk.start, tk.end)).toBe(tk.text);
        }
    });
    it('getAllImport() should work', () => {
        const lexer = new simple_scss_parser_1.ScssLexer(text);
        const parser = new simple_scss_parser_1.ScssParser(lexer);
        const imports = parser.getAllImport(text);
        console.log(imports);
        expect(imports.length).toBe(2);
    });
    it('getResUrl() should work', () => {
        const lexer = new simple_scss_parser_1.ScssLexer(text);
        const parser = new simple_scss_parser_1.ScssParser(lexer);
        const urls = parser.getResUrl(text);
        console.log(urls);
        expect(urls.length).toBe(7);
        expect(urls[4].text).toBe('../../credit-common/vendors/material/iconfont/MaterialIcons-Regular.woff');
    });
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL3NpbXBsZS1zY3NzLXBhcnNlclNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCLG9FQUE2RTtBQUM3RSw4RUFBcUU7QUFDckUsK0NBQXlCO0FBQ3pCLG1EQUE2QjtBQUU3QixRQUFRLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ25DLElBQUksSUFBWSxDQUFDO0lBQ2pCLFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDZCxJQUFJLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FDckIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsNENBQTRDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMvRSxDQUFDLENBQUMsQ0FBQztJQUNILEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDNUIsTUFBTSxLQUFLLEdBQUcsSUFBSSw4QkFBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDM0IsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLDZCQUFXLENBQUMsS0FBSyxFQUFFLDhCQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNqRSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BCLGlDQUFpQztRQUNqQyxLQUFLLE1BQU0sRUFBRSxJQUFJLE1BQU0sRUFBRTtZQUN4QixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDbkQ7SUFDRixDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7UUFDckMsTUFBTSxLQUFLLEdBQUcsSUFBSSw4QkFBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sTUFBTSxHQUFHLElBQUksK0JBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1FBQ2xDLE1BQU0sS0FBSyxHQUFHLElBQUksOEJBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQyxNQUFNLE1BQU0sR0FBRyxJQUFJLCtCQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLDBFQUEwRSxDQUFDLENBQUM7SUFDdkcsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9zcGVjL3NpbXBsZS1zY3NzLXBhcnNlclNwZWMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG5pbXBvcnQge1Njc3NMZXhlciwgU2Nzc1BhcnNlciwgVG9rZW5UeXBlfSBmcm9tICcuLi91dGlscy9zaW1wbGUtc2Nzcy1wYXJzZXInO1xuaW1wb3J0IHtUb2tlbkZpbHRlcn0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2Jhc2UtTExuLXBhcnNlcic7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuXG5kZXNjcmliZSgnc2ltcGxlLXNjc3MtcGFyc2VyJywgKCkgPT4ge1xuXHRsZXQgdGV4dDogc3RyaW5nO1xuXHRiZWZvcmVBbGwoKCkgPT4ge1xuXHRcdHRleHQgPSBmcy5yZWFkRmlsZVN5bmMoXG5cdFx0XHRQYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9zaW1wbGUtc2Nzcy1wYXJzZXItdGVzdC5zY3NzJyksICd1dGYtOCcpO1xuXHR9KTtcblx0aXQoJ2xleGVyIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuXHRcdGNvbnN0IGxleGVyID0gbmV3IFNjc3NMZXhlcih0ZXh0KTtcblx0XHRjb25zb2xlLmxvZygnLS0tLS0tLS0tLS0nKTtcblx0XHRjb25zdCB0b2tlbnMgPSBBcnJheS5mcm9tKG5ldyBUb2tlbkZpbHRlcihsZXhlciwgVG9rZW5UeXBlLmFueSkpO1xuXHRcdGNvbnNvbGUubG9nKHRva2Vucyk7XG5cdFx0Ly8gZXhwZWN0KHRva2Vucy5sZW5ndGgpLnRvQmUoOSk7XG5cdFx0Zm9yIChjb25zdCB0ayBvZiB0b2tlbnMpIHtcblx0XHRcdGV4cGVjdCh0ZXh0LnNsaWNlKHRrLnN0YXJ0LCB0ay5lbmQpKS50b0JlKHRrLnRleHQpO1xuXHRcdH1cblx0fSk7XG5cblx0aXQoJ2dldEFsbEltcG9ydCgpIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuXHRcdGNvbnN0IGxleGVyID0gbmV3IFNjc3NMZXhlcih0ZXh0KTtcblx0XHRjb25zdCBwYXJzZXIgPSBuZXcgU2Nzc1BhcnNlcihsZXhlcik7XG5cdFx0Y29uc3QgaW1wb3J0cyA9IHBhcnNlci5nZXRBbGxJbXBvcnQodGV4dCk7XG5cdFx0Y29uc29sZS5sb2coaW1wb3J0cyk7XG5cdFx0ZXhwZWN0KGltcG9ydHMubGVuZ3RoKS50b0JlKDIpO1xuXHR9KTtcblxuXHRpdCgnZ2V0UmVzVXJsKCkgc2hvdWxkIHdvcmsnLCAoKSA9PiB7XG5cdFx0Y29uc3QgbGV4ZXIgPSBuZXcgU2Nzc0xleGVyKHRleHQpO1xuXHRcdGNvbnN0IHBhcnNlciA9IG5ldyBTY3NzUGFyc2VyKGxleGVyKTtcblx0XHRjb25zdCB1cmxzID0gcGFyc2VyLmdldFJlc1VybCh0ZXh0KTtcblx0XHRjb25zb2xlLmxvZyh1cmxzKTtcblx0XHRleHBlY3QodXJscy5sZW5ndGgpLnRvQmUoNyk7XG5cdFx0ZXhwZWN0KHVybHNbNF0udGV4dCkudG9CZSgnLi4vLi4vY3JlZGl0LWNvbW1vbi92ZW5kb3JzL21hdGVyaWFsL2ljb25mb250L01hdGVyaWFsSWNvbnMtUmVndWxhci53b2ZmJyk7XG5cdH0pO1xufSk7XG4iXX0=
