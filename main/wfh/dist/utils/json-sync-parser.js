"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isToken = exports.isArrayAst = exports.isObjectAst = void 0;
const LLn_parser_1 = require("../LLn-parser");
const lexer = function (strLookAhead, emitter) {
    let char = strLookAhead.la();
    if (char == null) {
        emitter.end();
        return;
    }
    if (/[{}\[\],:]/.test(char)) {
        strLookAhead.startChunk(char);
        strLookAhead.advance();
        emitter.emit();
    }
    else if (/\s/.test(char)) {
        do {
            strLookAhead.advance();
            char = strLookAhead.la();
        } while (char && /\s/.test(char));
    }
    else if (/["']/.test(char)) {
        strLookAhead.startChunk('stringLiteral');
        const openChar = strLookAhead.advance();
        while (true) {
            const la = strLookAhead.la();
            if (la == null) {
                return strLookAhead.throwError();
            }
            if (la === '\\') {
                strLookAhead.advance(2);
            }
            else if (la === openChar) {
                strLookAhead.advance();
                emitter.emit();
                return;
            }
            else {
                strLookAhead.advance();
            }
        }
    }
    else {
        strLookAhead.startChunk('other');
        let next;
        do {
            strLookAhead.advance();
            next = strLookAhead.la();
        } while (next != null && !/[{}\[\],:\s'"]/.test(next));
        emitter.emit();
    }
    char = strLookAhead.la();
};
var AstType;
(function (AstType) {
    AstType[AstType["object"] = 0] = "object";
    AstType[AstType["array"] = 1] = "array";
    AstType[AstType["property"] = 2] = "property";
    AstType[AstType["value"] = 3] = "value";
})(AstType || (AstType = {}));
function isObjectAst(ast) {
    return ast.type === AstType.object;
}
exports.isObjectAst = isObjectAst;
function isArrayAst(ast) {
    return ast.type === AstType.array;
}
exports.isArrayAst = isArrayAst;
function isToken(ast) {
    return ast.text != null;
}
exports.isToken = isToken;
const grammar = function (tokenLa) {
    return doObject(tokenLa);
};
function doObject(lexer) {
    const ast = {
        type: AstType.object,
        properties: []
    };
    const lp = lexer.advance();
    ast.start = lp.pos;
    let next = lexer.la();
    while (next != null && next.type !== '}') {
        const propToken = lexer.advance();
        const colon = lexer.advance();
        if (colon.type !== ':') {
            throw new Error(`Expect ':' but recieve '${colon.text}' at ${colon.line}:${colon.col}`);
        }
        ast.properties.push({ name: propToken, value: doValue(lexer) });
        next = lexer.la();
        if (next && next.type === ',')
            lexer.advance();
        next = lexer.la();
    }
    const rp = lexer.advance(); // }
    ast.end = rp.end;
    return ast;
}
function doArray(lexer) {
    var _a;
    const ast = {
        type: AstType.array,
        items: []
    };
    const lp = lexer.advance();
    ast.start = lp.pos;
    let next = lexer.la();
    while (next != null && next.type !== ']') {
        if (next.type !== ',') {
            ast.items.push(doValue(lexer));
        }
        else {
            lexer.advance();
        }
        next = lexer.la();
    }
    if (next && next.type === ']') {
        ast.end = lexer.advance().end; // ]
    }
    else if (next == null)
        throw new Error('Unexpect EOF after ' + ((_a = lexer.lastConsumed) === null || _a === void 0 ? void 0 : _a.text));
    else
        throw new Error(`Unexpect ${next.text} at ${next.line}:${next.col}`);
    return ast;
}
function doValue(lexer) {
    const next = lexer.la();
    if (next === null) {
        throw new Error('Unexpect EOF');
    }
    if (next.type === '{') {
        return doObject(lexer);
    }
    else if (next.type === '[') {
        return doArray(lexer);
    }
    else if (next.type === 'stringLiteral' || next.type === 'other') {
        return lexer.advance();
    }
    else {
        throw new Error(`Unexpect '${next.text}' at ${next.line}:${next.col}`);
    }
}
function parse(content) {
    const jsonParser = (0, LLn_parser_1.parser)('JSON', lexer, grammar);
    jsonParser.write(content);
    jsonParser.end();
    return jsonParser.getResult();
}
exports.default = parse;
//# sourceMappingURL=json-sync-parser.js.map