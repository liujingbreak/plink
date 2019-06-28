"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_LLn_parser_1 = require("./base-LLn-parser");
var JsonTokenType;
(function (JsonTokenType) {
    JsonTokenType[JsonTokenType["primitive"] = 0] = "primitive";
    JsonTokenType[JsonTokenType["stringLit"] = 1] = "stringLit";
    JsonTokenType[JsonTokenType[','] = 2] = ',';
    JsonTokenType[JsonTokenType['['] = 3] = '[';
    JsonTokenType[JsonTokenType[']'] = 4] = ']';
    JsonTokenType[JsonTokenType['{'] = 5] = '{';
    JsonTokenType[JsonTokenType['}'] = 6] = '}';
    JsonTokenType[JsonTokenType[':'] = 7] = ':';
    JsonTokenType[JsonTokenType["skip"] = 8] = "skip";
    JsonTokenType[JsonTokenType["any"] = 9] = "any"; // .*
})(JsonTokenType = exports.JsonTokenType || (exports.JsonTokenType = {}));
class JsonLexer extends base_LLn_parser_1.BaseLexer {
    *[Symbol.iterator]() {
        while (this.la()) {
            const char = this.la();
            const start = this.position;
            if (char == null) {
                return;
            }
            if (/\s/.test(this.la())) {
                yield this.skip();
                continue;
            }
            switch (char) {
                case ',':
                case '[':
                case ']':
                case '{':
                case '}':
                case ':':
                    this.advance();
                    yield new base_LLn_parser_1.Token(JsonTokenType[char], this, start);
                    continue;
                case '"':
                    yield this.stringLit('"');
                    continue;
                case '\'':
                    yield this.stringLit('\'');
                    continue;
                default:
                    this.advance();
                    yield new base_LLn_parser_1.Token(JsonTokenType.primitive, this, start);
            }
        }
    }
    stringLit(quote) {
        const start = this.position;
        this.advance();
        while (this.la() !== quote) {
            if (this.la() == null)
                this.throwError();
            // console.log(':', this.la());
            if (this.la() === '\\') {
                this.advance();
            }
            this.advance();
        }
        this.advance();
        const tk = new base_LLn_parser_1.Token(JsonTokenType.stringLit, this, start);
        return tk;
    }
    skip() {
        const start = this.position;
        while (this.la() != null && /\s/.test(this.la())) {
            this.advance();
        }
        return new base_LLn_parser_1.Token(JsonTokenType.skip, this, start);
    }
}
exports.JsonLexer = JsonLexer;
class JsonParser extends base_LLn_parser_1.BaseParser {
    // TODO
    skip() { }
}
exports.JsonParser = JsonParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1maWxlLXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2pzb24tZmlsZS1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1REFBK0Q7QUFFL0QsSUFBWSxhQVdYO0FBWEQsV0FBWSxhQUFhO0lBQ3ZCLDJEQUFTLENBQUE7SUFDVCwyREFBUyxDQUFBO0lBQ1QsNEJBQUMsR0FBRyxTQUFILEdBQUksQ0FBQTtJQUNMLDRCQUFDLEdBQUcsU0FBSCxHQUFJLENBQUE7SUFDTCw0QkFBQyxHQUFHLFNBQUgsR0FBSSxDQUFBO0lBQ0wsNEJBQUMsR0FBRyxTQUFILEdBQUksQ0FBQTtJQUNMLDRCQUFDLEdBQUcsU0FBSCxHQUFJLENBQUE7SUFDTCw0QkFBQyxHQUFHLFNBQUgsR0FBSSxDQUFBO0lBQ0wsaURBQUksQ0FBQTtJQUNKLCtDQUFHLENBQUEsQ0FBQyxLQUFLO0FBQ1gsQ0FBQyxFQVhXLGFBQWEsR0FBYixxQkFBYSxLQUFiLHFCQUFhLFFBV3hCO0FBRUQsTUFBYSxTQUFVLFNBQVEsMkJBQXdCO0lBRXJELENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFO1lBQ2hCLE1BQU0sSUFBSSxHQUFXLElBQUksQ0FBQyxFQUFFLEVBQUcsQ0FBQztZQUNoQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQzVCLElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtnQkFDaEIsT0FBTzthQUNSO1lBQ0QsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUcsQ0FBQyxFQUFFO2dCQUN6QixNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDbEIsU0FBUzthQUNWO1lBQ0QsUUFBUSxJQUFJLEVBQUU7Z0JBQ1osS0FBSyxHQUFHLENBQUM7Z0JBQ1QsS0FBSyxHQUFHLENBQUM7Z0JBQ1QsS0FBSyxHQUFHLENBQUM7Z0JBQ1QsS0FBSyxHQUFHLENBQUM7Z0JBQ1QsS0FBSyxHQUFHLENBQUM7Z0JBQ1QsS0FBSyxHQUFHO29CQUNOLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDZixNQUFNLElBQUksdUJBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUNsRCxTQUFTO2dCQUNYLEtBQUssR0FBRztvQkFDTixNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQzFCLFNBQVM7Z0JBQ1gsS0FBSyxJQUFJO29CQUNQLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDM0IsU0FBUztnQkFDWDtvQkFDRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2YsTUFBTSxJQUFJLHVCQUFLLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFDekQ7U0FDRjtJQUNILENBQUM7SUFFRCxTQUFTLENBQUMsS0FBYTtRQUNyQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQzVCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNmLE9BQU8sSUFBSSxDQUFDLEVBQUUsRUFBRSxLQUFLLEtBQUssRUFBRTtZQUMxQixJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxJQUFJO2dCQUNuQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDcEIsK0JBQStCO1lBQy9CLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDdEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQ2hCO1lBQ0QsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1NBQ2hCO1FBQ0QsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2YsTUFBTSxFQUFFLEdBQUcsSUFBSSx1QkFBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzNELE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQUVELElBQUk7UUFDRixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQzVCLE9BQU8sSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUcsQ0FBQyxFQUFFO1lBQ2pELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUNoQjtRQUNELE9BQU8sSUFBSSx1QkFBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3BELENBQUM7Q0FDRjtBQTVERCw4QkE0REM7QUFFRCxNQUFhLFVBQVcsU0FBUSw0QkFBeUI7SUFDdkQsT0FBTztJQUNQLElBQUksS0FBSSxDQUFDO0NBQ1Y7QUFIRCxnQ0FHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7VG9rZW4sIEJhc2VMZXhlciwgQmFzZVBhcnNlcn0gZnJvbSAnLi9iYXNlLUxMbi1wYXJzZXInO1xuXG5leHBvcnQgZW51bSBKc29uVG9rZW5UeXBlIHtcbiAgcHJpbWl0aXZlLFxuICBzdHJpbmdMaXQsXG4gIFsnLCddLFxuICBbJ1snXSxcbiAgWyddJ10sXG4gIFsneyddLFxuICBbJ30nXSxcbiAgWyc6J10sXG4gIHNraXAsXG4gIGFueSAvLyAuKlxufVxuXG5leHBvcnQgY2xhc3MgSnNvbkxleGVyIGV4dGVuZHMgQmFzZUxleGVyPEpzb25Ub2tlblR5cGU+IHtcblxuICAqW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VG9rZW48SnNvblRva2VuVHlwZT4+IHtcbiAgICB3aGlsZSAodGhpcy5sYSgpKSB7XG4gICAgICBjb25zdCBjaGFyOiBzdHJpbmcgPSB0aGlzLmxhKCkhO1xuICAgICAgY29uc3Qgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuICAgICAgaWYgKGNoYXIgPT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoL1xccy8udGVzdCh0aGlzLmxhKCkhKSkge1xuICAgICAgICB5aWVsZCB0aGlzLnNraXAoKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBzd2l0Y2ggKGNoYXIpIHtcbiAgICAgICAgY2FzZSAnLCc6XG4gICAgICAgIGNhc2UgJ1snOlxuICAgICAgICBjYXNlICddJzpcbiAgICAgICAgY2FzZSAneyc6XG4gICAgICAgIGNhc2UgJ30nOlxuICAgICAgICBjYXNlICc6JzpcbiAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICB5aWVsZCBuZXcgVG9rZW4oSnNvblRva2VuVHlwZVtjaGFyXSwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICBjYXNlICdcIic6XG4gICAgICAgICAgeWllbGQgdGhpcy5zdHJpbmdMaXQoJ1wiJyk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIGNhc2UgJ1xcJyc6XG4gICAgICAgICAgeWllbGQgdGhpcy5zdHJpbmdMaXQoJ1xcJycpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihKc29uVG9rZW5UeXBlLnByaW1pdGl2ZSwgdGhpcywgc3RhcnQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHN0cmluZ0xpdChxdW90ZTogc3RyaW5nKSB7XG4gICAgY29uc3Qgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgIHdoaWxlICh0aGlzLmxhKCkgIT09IHF1b3RlKSB7XG4gICAgICBpZiAodGhpcy5sYSgpID09IG51bGwpXG4gICAgICAgIHRoaXMudGhyb3dFcnJvcigpO1xuICAgICAgLy8gY29uc29sZS5sb2coJzonLCB0aGlzLmxhKCkpO1xuICAgICAgaWYgKHRoaXMubGEoKSA9PT0gJ1xcXFwnKSB7XG4gICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgfVxuICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgfVxuICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgIGNvbnN0IHRrID0gbmV3IFRva2VuKEpzb25Ub2tlblR5cGUuc3RyaW5nTGl0LCB0aGlzLCBzdGFydCk7XG4gICAgcmV0dXJuIHRrO1xuICB9XG5cbiAgc2tpcCgpIHtcbiAgICBjb25zdCBzdGFydCA9IHRoaXMucG9zaXRpb247XG4gICAgd2hpbGUgKHRoaXMubGEoKSAhPSBudWxsICYmIC9cXHMvLnRlc3QodGhpcy5sYSgpISkpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFRva2VuKEpzb25Ub2tlblR5cGUuc2tpcCwgdGhpcywgc3RhcnQpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBKc29uUGFyc2VyIGV4dGVuZHMgQmFzZVBhcnNlcjxKc29uVG9rZW5UeXBlPiB7XG4gIC8vIFRPRE9cbiAgc2tpcCgpIHt9XG59XG4iXX0=