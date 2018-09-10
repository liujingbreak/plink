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
//# sourceMappingURL=json-file-parser.js.map