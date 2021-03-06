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
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable no-console
const simple_scss_parser_1 = require("../utils/simple-scss-parser");
const base_LLn_parser_1 = require("@wfh/plink/wfh/dist/base-LLn-parser");
const fs = __importStar(require("fs"));
const Path = __importStar(require("path"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlLXNjc3MtcGFyc2VyU3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNpbXBsZS1zY3NzLXBhcnNlclNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLG9FQUE2RTtBQUM3RSx5RUFBZ0U7QUFDaEUsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUU3QixRQUFRLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLElBQUksSUFBWSxDQUFDO0lBQ2pCLFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDYixJQUFJLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsNENBQTRDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNqRixDQUFDLENBQUMsQ0FBQztJQUNILEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDM0IsTUFBTSxLQUFLLEdBQUcsSUFBSSw4QkFBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDM0IsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLDZCQUFXLENBQUMsS0FBSyxFQUFFLDhCQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNqRSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BCLGlDQUFpQztRQUNqQyxLQUFLLE1BQU0sRUFBRSxJQUFJLE1BQU0sRUFBRTtZQUN2QixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDcEQ7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7UUFDcEMsTUFBTSxLQUFLLEdBQUcsSUFBSSw4QkFBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sTUFBTSxHQUFHLElBQUksK0JBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1FBQ2pDLE1BQU0sS0FBSyxHQUFHLElBQUksOEJBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQyxNQUFNLE1BQU0sR0FBRyxJQUFJLCtCQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLDBFQUEwRSxDQUFDLENBQUM7SUFDeEcsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGVcbmltcG9ydCB7U2Nzc0xleGVyLCBTY3NzUGFyc2VyLCBUb2tlblR5cGV9IGZyb20gJy4uL3V0aWxzL3NpbXBsZS1zY3NzLXBhcnNlcic7XG5pbXBvcnQge1Rva2VuRmlsdGVyfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2Jhc2UtTExuLXBhcnNlcic7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuXG5kZXNjcmliZSgnc2ltcGxlLXNjc3MtcGFyc2VyJywgKCkgPT4ge1xuICBsZXQgdGV4dDogc3RyaW5nO1xuICBiZWZvcmVBbGwoKCkgPT4ge1xuICAgIHRleHQgPSBmcy5yZWFkRmlsZVN5bmMoXG4gICAgICBQYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9zaW1wbGUtc2Nzcy1wYXJzZXItdGVzdC5zY3NzJyksICd1dGYtOCcpO1xuICB9KTtcbiAgaXQoJ2xleGVyIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIGNvbnN0IGxleGVyID0gbmV3IFNjc3NMZXhlcih0ZXh0KTtcbiAgICBjb25zb2xlLmxvZygnLS0tLS0tLS0tLS0nKTtcbiAgICBjb25zdCB0b2tlbnMgPSBBcnJheS5mcm9tKG5ldyBUb2tlbkZpbHRlcihsZXhlciwgVG9rZW5UeXBlLmFueSkpO1xuICAgIGNvbnNvbGUubG9nKHRva2Vucyk7XG4gICAgLy8gZXhwZWN0KHRva2Vucy5sZW5ndGgpLnRvQmUoOSk7XG4gICAgZm9yIChjb25zdCB0ayBvZiB0b2tlbnMpIHtcbiAgICAgIGV4cGVjdCh0ZXh0LnNsaWNlKHRrLnN0YXJ0LCB0ay5lbmQpKS50b0JlKHRrLnRleHQpO1xuICAgIH1cbiAgfSk7XG5cbiAgaXQoJ2dldEFsbEltcG9ydCgpIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIGNvbnN0IGxleGVyID0gbmV3IFNjc3NMZXhlcih0ZXh0KTtcbiAgICBjb25zdCBwYXJzZXIgPSBuZXcgU2Nzc1BhcnNlcihsZXhlcik7XG4gICAgY29uc3QgaW1wb3J0cyA9IHBhcnNlci5nZXRBbGxJbXBvcnQodGV4dCk7XG4gICAgY29uc29sZS5sb2coaW1wb3J0cyk7XG4gICAgZXhwZWN0KGltcG9ydHMubGVuZ3RoKS50b0JlKDIpO1xuICB9KTtcblxuICBpdCgnZ2V0UmVzVXJsKCkgc2hvdWxkIHdvcmsnLCAoKSA9PiB7XG4gICAgY29uc3QgbGV4ZXIgPSBuZXcgU2Nzc0xleGVyKHRleHQpO1xuICAgIGNvbnN0IHBhcnNlciA9IG5ldyBTY3NzUGFyc2VyKGxleGVyKTtcbiAgICBjb25zdCB1cmxzID0gcGFyc2VyLmdldFJlc1VybCh0ZXh0KTtcbiAgICBjb25zb2xlLmxvZyh1cmxzKTtcbiAgICBleHBlY3QodXJscy5sZW5ndGgpLnRvQmUoNyk7XG4gICAgZXhwZWN0KHVybHNbNF0udGV4dCkudG9CZSgnLi4vLi4vY3JlZGl0LWNvbW1vbi92ZW5kb3JzL21hdGVyaWFsL2ljb25mb250L01hdGVyaWFsSWNvbnMtUmVndWxhci53b2ZmJyk7XG4gIH0pO1xufSk7XG4iXX0=