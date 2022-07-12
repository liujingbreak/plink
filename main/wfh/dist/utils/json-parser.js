"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Token = void 0;
const async_LLn_parser_1 = require("../async-LLn-parser");
Object.defineProperty(exports, "Token", { enumerable: true, get: function () { return async_LLn_parser_1.Token; } });
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
function parse(reader, onToken) {
    const input = new rxjs_1.Observable(sub => {
        reader.on('data', (buf) => sub.next(buf.split('')));
        reader.on('end', () => sub.complete());
    });
    const operators = onToken ? [(0, operators_1.tap)(onToken)] : null;
    return (0, async_LLn_parser_1.parser)('JSON', input, parseLex, operators, parseGrammar);
}
exports.default = parse;
async function parseLex(strLookAhead, tokenSub) {
    let char = await strLookAhead.la();
    while (char != null) {
        if (/[{}\[\],:]/.test(char)) {
            strLookAhead.startToken(char);
            await strLookAhead.advance();
            strLookAhead.emitToken();
        }
        else if (/\s/.test(char)) {
            do {
                await strLookAhead.advance();
                char = await strLookAhead.la();
            } while (char && /\s/.test(char));
        }
        else if (/["']/.test(char)) {
            strLookAhead.startToken('stringLiteral');
            const openChar = await strLookAhead.advance();
            while (true) {
                const la = await strLookAhead.la();
                if (la == null) {
                    return strLookAhead.throwError();
                }
                if (la === '\\') {
                    await strLookAhead.advance(2);
                }
                else if (la === openChar) {
                    await strLookAhead.advance();
                    strLookAhead.emitToken();
                    break;
                }
                else {
                    await strLookAhead.advance();
                }
            }
        }
        else {
            strLookAhead.startToken('other');
            let next;
            do {
                await strLookAhead.advance();
                next = await strLookAhead.la();
            } while (next != null && !/[{}\[\],:\s'"]/.test(next));
            strLookAhead.emitToken();
        }
        char = await strLookAhead.la();
    }
}
var AstType;
(function (AstType) {
    AstType[AstType["object"] = 0] = "object";
    AstType[AstType["array"] = 1] = "array";
    AstType[AstType["property"] = 2] = "property";
    AstType[AstType["value"] = 3] = "value";
})(AstType || (AstType = {}));
async function parseGrammar(tokenLa) {
    return doObject(tokenLa);
}
async function doObject(lexer) {
    const ast = {
        type: AstType.object,
        properties: []
    };
    await lexer.advance();
    let next = await lexer.la();
    while (next != null && next.type !== '}') {
        const propToken = await lexer.advance();
        const colon = await lexer.advance();
        if (colon.type !== ':') {
            throw new Error(`Expect ':' but recieve '${colon.text}' at ${colon.line}:${colon.col}`);
        }
        ast.properties.push({ name: propToken, value: await doValue(lexer) });
        next = await lexer.la();
        if (next && next.type === ',')
            await lexer.advance();
        next = await lexer.la();
    }
    await lexer.advance(); // }
    return ast;
}
async function doArray(lexer) {
    const ast = {
        type: AstType.array,
        items: []
    };
    await lexer.advance();
    let next = await lexer.la();
    while (next != null && next.type !== ']') {
        if (next.type !== ',') {
            ast.items.push(await doValue(lexer));
        }
        next = await lexer.la();
    }
    if (next && next.type === ']')
        await lexer.advance(); // ]
    else if (next == null)
        throw new Error('Unexpect EOF after ' + lexer.lastConsumed.text);
    else
        throw new Error(`Unexpect ${next.text} at ${next.line}:${next.col}`);
    return ast;
}
async function doValue(lexer) {
    const next = await lexer.la();
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
//# sourceMappingURL=json-parser.js.map