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
// eslint-disable  no-console
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlLXNjc3MtcGFyc2VyU3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNpbXBsZS1zY3NzLXBhcnNlclNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLG9FQUE2RTtBQUM3RSx5RUFBZ0U7QUFDaEUsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUU3QixRQUFRLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLElBQUksSUFBWSxDQUFDO0lBQ2pCLFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDYixJQUFJLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsNENBQTRDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNqRixDQUFDLENBQUMsQ0FBQztJQUNILEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDM0IsTUFBTSxLQUFLLEdBQUcsSUFBSSw4QkFBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDM0IsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLDZCQUFXLENBQUMsS0FBSyxFQUFFLDhCQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNqRSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BCLGlDQUFpQztRQUNqQyxLQUFLLE1BQU0sRUFBRSxJQUFJLE1BQU0sRUFBRTtZQUN2QixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDcEQ7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7UUFDcEMsTUFBTSxLQUFLLEdBQUcsSUFBSSw4QkFBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sTUFBTSxHQUFHLElBQUksK0JBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1FBQ2pDLE1BQU0sS0FBSyxHQUFHLElBQUksOEJBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQyxNQUFNLE1BQU0sR0FBRyxJQUFJLCtCQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLDBFQUEwRSxDQUFDLENBQUM7SUFDeEcsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGVzbGludC1kaXNhYmxlICBuby1jb25zb2xlXG5pbXBvcnQge1Njc3NMZXhlciwgU2Nzc1BhcnNlciwgVG9rZW5UeXBlfSBmcm9tICcuLi91dGlscy9zaW1wbGUtc2Nzcy1wYXJzZXInO1xuaW1wb3J0IHtUb2tlbkZpbHRlcn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9iYXNlLUxMbi1wYXJzZXInO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcblxuZGVzY3JpYmUoJ3NpbXBsZS1zY3NzLXBhcnNlcicsICgpID0+IHtcbiAgbGV0IHRleHQ6IHN0cmluZztcbiAgYmVmb3JlQWxsKCgpID0+IHtcbiAgICB0ZXh0ID0gZnMucmVhZEZpbGVTeW5jKFxuICAgICAgUGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvc2ltcGxlLXNjc3MtcGFyc2VyLXRlc3Quc2NzcycpLCAndXRmLTgnKTtcbiAgfSk7XG4gIGl0KCdsZXhlciBzaG91bGQgd29yaycsICgpID0+IHtcbiAgICBjb25zdCBsZXhlciA9IG5ldyBTY3NzTGV4ZXIodGV4dCk7XG4gICAgY29uc29sZS5sb2coJy0tLS0tLS0tLS0tJyk7XG4gICAgY29uc3QgdG9rZW5zID0gQXJyYXkuZnJvbShuZXcgVG9rZW5GaWx0ZXIobGV4ZXIsIFRva2VuVHlwZS5hbnkpKTtcbiAgICBjb25zb2xlLmxvZyh0b2tlbnMpO1xuICAgIC8vIGV4cGVjdCh0b2tlbnMubGVuZ3RoKS50b0JlKDkpO1xuICAgIGZvciAoY29uc3QgdGsgb2YgdG9rZW5zKSB7XG4gICAgICBleHBlY3QodGV4dC5zbGljZSh0ay5zdGFydCwgdGsuZW5kKSkudG9CZSh0ay50ZXh0KTtcbiAgICB9XG4gIH0pO1xuXG4gIGl0KCdnZXRBbGxJbXBvcnQoKSBzaG91bGQgd29yaycsICgpID0+IHtcbiAgICBjb25zdCBsZXhlciA9IG5ldyBTY3NzTGV4ZXIodGV4dCk7XG4gICAgY29uc3QgcGFyc2VyID0gbmV3IFNjc3NQYXJzZXIobGV4ZXIpO1xuICAgIGNvbnN0IGltcG9ydHMgPSBwYXJzZXIuZ2V0QWxsSW1wb3J0KHRleHQpO1xuICAgIGNvbnNvbGUubG9nKGltcG9ydHMpO1xuICAgIGV4cGVjdChpbXBvcnRzLmxlbmd0aCkudG9CZSgyKTtcbiAgfSk7XG5cbiAgaXQoJ2dldFJlc1VybCgpIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIGNvbnN0IGxleGVyID0gbmV3IFNjc3NMZXhlcih0ZXh0KTtcbiAgICBjb25zdCBwYXJzZXIgPSBuZXcgU2Nzc1BhcnNlcihsZXhlcik7XG4gICAgY29uc3QgdXJscyA9IHBhcnNlci5nZXRSZXNVcmwodGV4dCk7XG4gICAgY29uc29sZS5sb2codXJscyk7XG4gICAgZXhwZWN0KHVybHMubGVuZ3RoKS50b0JlKDcpO1xuICAgIGV4cGVjdCh1cmxzWzRdLnRleHQpLnRvQmUoJy4uLy4uL2NyZWRpdC1jb21tb24vdmVuZG9ycy9tYXRlcmlhbC9pY29uZm9udC9NYXRlcmlhbEljb25zLVJlZ3VsYXIud29mZicpO1xuICB9KTtcbn0pO1xuIl19