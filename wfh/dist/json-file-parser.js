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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1maWxlLXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2pzb24tZmlsZS1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1REFBK0Q7QUFFL0QsSUFBWSxhQVdYO0FBWEQsV0FBWSxhQUFhO0lBQ3hCLDJEQUFTLENBQUE7SUFDVCwyREFBUyxDQUFBO0lBQ1QsNEJBQUMsR0FBRyxTQUFILEdBQUksQ0FBQTtJQUNMLDRCQUFDLEdBQUcsU0FBSCxHQUFJLENBQUE7SUFDTCw0QkFBQyxHQUFHLFNBQUgsR0FBSSxDQUFBO0lBQ0wsNEJBQUMsR0FBRyxTQUFILEdBQUksQ0FBQTtJQUNMLDRCQUFDLEdBQUcsU0FBSCxHQUFJLENBQUE7SUFDTCw0QkFBQyxHQUFHLFNBQUgsR0FBSSxDQUFBO0lBQ0wsaURBQUksQ0FBQTtJQUNKLCtDQUFHLENBQUEsQ0FBQyxLQUFLO0FBQ1YsQ0FBQyxFQVhXLGFBQWEsR0FBYixxQkFBYSxLQUFiLHFCQUFhLFFBV3hCO0FBRUQsTUFBYSxTQUFVLFNBQVEsMkJBQXdCO0lBRXRELENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFO1lBQ2pCLE1BQU0sSUFBSSxHQUFXLElBQUksQ0FBQyxFQUFFLEVBQUcsQ0FBQztZQUNoQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQzVCLElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtnQkFDakIsT0FBTzthQUNQO1lBQ0QsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUcsQ0FBQyxFQUFFO2dCQUMxQixNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDbEIsU0FBUzthQUNUO1lBQ0QsUUFBUSxJQUFJLEVBQUU7Z0JBQ2IsS0FBSyxHQUFHLENBQUM7Z0JBQ1QsS0FBSyxHQUFHLENBQUM7Z0JBQ1QsS0FBSyxHQUFHLENBQUM7Z0JBQ1QsS0FBSyxHQUFHLENBQUM7Z0JBQ1QsS0FBSyxHQUFHLENBQUM7Z0JBQ1QsS0FBSyxHQUFHO29CQUNQLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDZixNQUFNLElBQUksdUJBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUNsRCxTQUFTO2dCQUNWLEtBQUssR0FBRztvQkFDUCxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQzFCLFNBQVM7Z0JBQ1YsS0FBSyxJQUFJO29CQUNSLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDM0IsU0FBUztnQkFDVjtvQkFDQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2YsTUFBTSxJQUFJLHVCQUFLLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFDdkQ7U0FDRDtJQUNGLENBQUM7SUFFRCxTQUFTLENBQUMsS0FBYTtRQUN0QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQzVCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNmLE9BQU8sSUFBSSxDQUFDLEVBQUUsRUFBRSxLQUFLLEtBQUssRUFBRTtZQUMzQixJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxJQUFJO2dCQUNwQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDbkIsK0JBQStCO1lBQy9CLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDdkIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQ2Y7WUFDRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDZjtRQUNELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNmLE1BQU0sRUFBRSxHQUFHLElBQUksdUJBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMzRCxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxJQUFJO1FBQ0gsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUM1QixPQUFPLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFHLENBQUMsRUFBRTtZQUNsRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDZjtRQUNELE9BQU8sSUFBSSx1QkFBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ25ELENBQUM7Q0FDRDtBQTVERCw4QkE0REM7QUFFRCxNQUFhLFVBQVcsU0FBUSw0QkFBeUI7SUFDeEQsT0FBTztJQUNQLElBQUksS0FBSSxDQUFDO0NBQ1Q7QUFIRCxnQ0FHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7VG9rZW4sIEJhc2VMZXhlciwgQmFzZVBhcnNlcn0gZnJvbSAnLi9iYXNlLUxMbi1wYXJzZXInO1xuXG5leHBvcnQgZW51bSBKc29uVG9rZW5UeXBlIHtcblx0cHJpbWl0aXZlLFxuXHRzdHJpbmdMaXQsXG5cdFsnLCddLFxuXHRbJ1snXSxcblx0WyddJ10sXG5cdFsneyddLFxuXHRbJ30nXSxcblx0Wyc6J10sXG5cdHNraXAsXG5cdGFueSAvLyAuKlxufVxuXG5leHBvcnQgY2xhc3MgSnNvbkxleGVyIGV4dGVuZHMgQmFzZUxleGVyPEpzb25Ub2tlblR5cGU+IHtcblxuXHQqW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VG9rZW48SnNvblRva2VuVHlwZT4+IHtcblx0XHR3aGlsZSAodGhpcy5sYSgpKSB7XG5cdFx0XHRjb25zdCBjaGFyOiBzdHJpbmcgPSB0aGlzLmxhKCkhO1xuXHRcdFx0Y29uc3Qgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuXHRcdFx0aWYgKGNoYXIgPT0gbnVsbCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRpZiAoL1xccy8udGVzdCh0aGlzLmxhKCkhKSkge1xuXHRcdFx0XHR5aWVsZCB0aGlzLnNraXAoKTtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cdFx0XHRzd2l0Y2ggKGNoYXIpIHtcblx0XHRcdFx0Y2FzZSAnLCc6XG5cdFx0XHRcdGNhc2UgJ1snOlxuXHRcdFx0XHRjYXNlICddJzpcblx0XHRcdFx0Y2FzZSAneyc6XG5cdFx0XHRcdGNhc2UgJ30nOlxuXHRcdFx0XHRjYXNlICc6Jzpcblx0XHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdFx0XHR5aWVsZCBuZXcgVG9rZW4oSnNvblRva2VuVHlwZVtjaGFyXSwgdGhpcywgc3RhcnQpO1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRjYXNlICdcIic6XG5cdFx0XHRcdFx0eWllbGQgdGhpcy5zdHJpbmdMaXQoJ1wiJyk7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdGNhc2UgJ1xcJyc6XG5cdFx0XHRcdFx0eWllbGQgdGhpcy5zdHJpbmdMaXQoJ1xcJycpO1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0XHRcdHlpZWxkIG5ldyBUb2tlbihKc29uVG9rZW5UeXBlLnByaW1pdGl2ZSwgdGhpcywgc3RhcnQpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHN0cmluZ0xpdChxdW90ZTogc3RyaW5nKSB7XG5cdFx0Y29uc3Qgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuXHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdHdoaWxlICh0aGlzLmxhKCkgIT09IHF1b3RlKSB7XG5cdFx0XHRpZiAodGhpcy5sYSgpID09IG51bGwpXG5cdFx0XHRcdHRoaXMudGhyb3dFcnJvcigpO1xuXHRcdFx0Ly8gY29uc29sZS5sb2coJzonLCB0aGlzLmxhKCkpO1xuXHRcdFx0aWYgKHRoaXMubGEoKSA9PT0gJ1xcXFwnKSB7XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0fVxuXHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdGNvbnN0IHRrID0gbmV3IFRva2VuKEpzb25Ub2tlblR5cGUuc3RyaW5nTGl0LCB0aGlzLCBzdGFydCk7XG5cdFx0cmV0dXJuIHRrO1xuXHR9XG5cblx0c2tpcCgpIHtcblx0XHRjb25zdCBzdGFydCA9IHRoaXMucG9zaXRpb247XG5cdFx0d2hpbGUgKHRoaXMubGEoKSAhPSBudWxsICYmIC9cXHMvLnRlc3QodGhpcy5sYSgpISkpIHtcblx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdH1cblx0XHRyZXR1cm4gbmV3IFRva2VuKEpzb25Ub2tlblR5cGUuc2tpcCwgdGhpcywgc3RhcnQpO1xuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBKc29uUGFyc2VyIGV4dGVuZHMgQmFzZVBhcnNlcjxKc29uVG9rZW5UeXBlPiB7XG5cdC8vIFRPRE9cblx0c2tpcCgpIHt9XG59XG4iXX0=