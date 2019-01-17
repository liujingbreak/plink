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
        while (true) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1maWxlLXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2pzb24tZmlsZS1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1REFBK0Q7QUFFL0QsSUFBWSxhQVdYO0FBWEQsV0FBWSxhQUFhO0lBQ3hCLDJEQUFTLENBQUE7SUFDVCwyREFBUyxDQUFBO0lBQ1QsNEJBQUMsR0FBRyxTQUFILEdBQUksQ0FBQTtJQUNMLDRCQUFDLEdBQUcsU0FBSCxHQUFJLENBQUE7SUFDTCw0QkFBQyxHQUFHLFNBQUgsR0FBSSxDQUFBO0lBQ0wsNEJBQUMsR0FBRyxTQUFILEdBQUksQ0FBQTtJQUNMLDRCQUFDLEdBQUcsU0FBSCxHQUFJLENBQUE7SUFDTCw0QkFBQyxHQUFHLFNBQUgsR0FBSSxDQUFBO0lBQ0wsaURBQUksQ0FBQTtJQUNKLCtDQUFHLENBQUEsQ0FBQyxLQUFLO0FBQ1YsQ0FBQyxFQVhXLGFBQWEsR0FBYixxQkFBYSxLQUFiLHFCQUFhLFFBV3hCO0FBRUQsTUFBYSxTQUFVLFNBQVEsMkJBQXdCO0lBRXRELENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2pCLE9BQU8sSUFBSSxFQUFFO1lBQ1osTUFBTSxJQUFJLEdBQVcsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQy9CLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDNUIsSUFBSSxJQUFJLElBQUksSUFBSSxFQUFFO2dCQUNqQixPQUFPO2FBQ1A7WUFDRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUU7Z0JBQ3pCLE1BQU0sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNsQixTQUFTO2FBQ1Q7WUFDRCxRQUFRLElBQUksRUFBRTtnQkFDYixLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUc7b0JBQ1AsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNmLE1BQU0sSUFBSSx1QkFBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQ2xELFNBQVM7Z0JBQ1YsS0FBSyxHQUFHO29CQUNQLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDMUIsU0FBUztnQkFDVixLQUFLLElBQUk7b0JBQ1IsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUMzQixTQUFTO2dCQUNWO29CQUNDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDZixNQUFNLElBQUksdUJBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQzthQUN2RDtTQUNEO0lBQ0YsQ0FBQztJQUVELFNBQVMsQ0FBQyxLQUFhO1FBQ3RCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDNUIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2YsT0FBTyxJQUFJLENBQUMsRUFBRSxFQUFFLEtBQUssS0FBSyxFQUFFO1lBQzNCLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLElBQUk7Z0JBQ3BCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNuQiwrQkFBK0I7WUFDL0IsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO2dCQUN2QixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDZjtZQUNELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUNmO1FBQ0QsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2YsTUFBTSxFQUFFLEdBQUcsSUFBSSx1QkFBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzNELE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUVELElBQUk7UUFDSCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQzVCLE9BQU8sSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQ2pELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUNmO1FBQ0QsT0FBTyxJQUFJLHVCQUFLLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDbkQsQ0FBQztDQUNEO0FBNURELDhCQTREQztBQUVELE1BQWEsVUFBVyxTQUFRLDRCQUF5QjtJQUN4RCxPQUFPO0lBQ1AsSUFBSSxLQUFJLENBQUM7Q0FDVDtBQUhELGdDQUdDIn0=