"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    const operators = onToken ? [operators_1.tap(onToken)] : null;
    return async_LLn_parser_1.parser('JSON', input, parseLex, operators, parseGrammar);
}
exports.default = parse;
function parseLex(strLookAhead, tokenSub) {
    return __awaiter(this, void 0, void 0, function* () {
        let char = yield strLookAhead.la();
        while (char != null) {
            if (/[{}\[\],:]/.test(char)) {
                strLookAhead.startToken(char);
                yield strLookAhead.advance();
                strLookAhead.emitToken();
            }
            else if (/\s/.test(char)) {
                do {
                    yield strLookAhead.advance();
                    char = yield strLookAhead.la();
                } while (char && /\s/.test(char));
            }
            else if (/["']/.test(char)) {
                strLookAhead.startToken('stringLiteral');
                const openChar = yield strLookAhead.advance();
                while (true) {
                    const la = yield strLookAhead.la();
                    if (la == null) {
                        return strLookAhead.throwError();
                    }
                    if (la === '\\') {
                        yield strLookAhead.advance(2);
                    }
                    else if (la === openChar) {
                        yield strLookAhead.advance();
                        strLookAhead.emitToken();
                        break;
                    }
                    else {
                        yield strLookAhead.advance();
                    }
                }
            }
            else {
                strLookAhead.startToken('other');
                let next;
                do {
                    yield strLookAhead.advance();
                    next = yield strLookAhead.la();
                } while (next != null && !/[{}\[\],:\s'"]/.test(next));
                strLookAhead.emitToken();
            }
            char = yield strLookAhead.la();
        }
    });
}
var AstType;
(function (AstType) {
    AstType[AstType["object"] = 0] = "object";
    AstType[AstType["array"] = 1] = "array";
    AstType[AstType["property"] = 2] = "property";
    AstType[AstType["value"] = 3] = "value";
})(AstType || (AstType = {}));
function parseGrammar(tokenLa) {
    return __awaiter(this, void 0, void 0, function* () {
        return doObject(tokenLa);
    });
}
function doObject(lexer) {
    return __awaiter(this, void 0, void 0, function* () {
        const ast = {
            type: AstType.object,
            properties: []
        };
        yield lexer.advance();
        let next = yield lexer.la();
        while (next != null && next.type !== '}') {
            const propToken = yield lexer.advance();
            const colon = yield lexer.advance();
            if (colon.type !== ':') {
                throw new Error(`Expect ':' but recieve '${colon.text}' at ${colon.line}:${colon.col}`);
            }
            ast.properties.push({ name: propToken, value: yield doValue(lexer) });
            next = yield lexer.la();
            if (next && next.type === ',')
                yield lexer.advance();
            next = yield lexer.la();
        }
        yield lexer.advance(); // }
        return ast;
    });
}
function doArray(lexer) {
    return __awaiter(this, void 0, void 0, function* () {
        const ast = {
            type: AstType.array,
            items: []
        };
        yield lexer.advance();
        let next = yield lexer.la();
        while (next != null && next.type !== ']') {
            if (next.type !== ',') {
                ast.items.push(yield doValue(lexer));
            }
            next = yield lexer.la();
        }
        if (next && next.type === ']')
            yield lexer.advance(); // ]
        else if (next == null)
            throw new Error('Unexpect EOF after ' + lexer.lastConsumed.text);
        else
            throw new Error(`Unexpect ${next.text} at ${next.line}:${next.col}`);
        return ast;
    });
}
function doValue(lexer) {
    return __awaiter(this, void 0, void 0, function* () {
        const next = yield lexer.la();
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
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9qc29uLXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFDQSwwREFBeUY7QUFnQmpGLHNGQWhCK0Msd0JBQUssT0FnQi9DO0FBZmIsK0JBQTRDO0FBQzVDLDhDQUFtQztBQUduQyxTQUF3QixLQUFLLENBQUMsTUFBZ0IsRUFBRSxPQUF3QztJQUN0RixNQUFNLEtBQUssR0FBRyxJQUFJLGlCQUFVLENBQVcsR0FBRyxDQUFDLEVBQUU7UUFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUVsRCxPQUFPLHlCQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDO0FBQ2xFLENBQUM7QUFURCx3QkFTQztBQUlELFNBQWUsUUFBUSxDQUNyQixZQUFpRCxFQUNqRCxRQUEyQzs7UUFDM0MsSUFBSSxJQUFJLEdBQUcsTUFBTSxZQUFZLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDbkMsT0FBTyxJQUFJLElBQUksSUFBSSxFQUFFO1lBQ25CLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDM0IsWUFBWSxDQUFDLFVBQVUs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c0NvbnRlbnQiOlsiXG5pbXBvcnQge3BhcnNlciwgTG9va0FoZWFkLCBMb29rQWhlYWRPYnNlcnZhYmxlLCBDaHVuaywgVG9rZW59IGZyb20gJy4uL2FzeW5jLUxMbi1wYXJzZXInO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBTdWJzY3JpYmVyfSBmcm9tICdyeGpzJztcbmltcG9ydCB7dGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge1JlYWRhYmxlfSBmcm9tICdzdHJlYW0nO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBwYXJzZShyZWFkZXI6IFJlYWRhYmxlLCBvblRva2VuPzogKHRva2VuOiBUb2tlbjxzdHJpbmc+KSA9PiB2b2lkKSB7XG4gIGNvbnN0IGlucHV0ID0gbmV3IE9ic2VydmFibGU8c3RyaW5nW10+KHN1YiA9PiB7XG4gICAgcmVhZGVyLm9uKCdkYXRhJywgKGJ1Zjogc3RyaW5nKSA9PiBzdWIubmV4dChidWYuc3BsaXQoJycpKSk7XG4gICAgcmVhZGVyLm9uKCdlbmQnLCAoKSA9PiBzdWIuY29tcGxldGUoKSk7XG4gIH0pO1xuXG4gIGNvbnN0IG9wZXJhdG9ycyA9IG9uVG9rZW4gPyBbdGFwKG9uVG9rZW4pXSA6IG51bGw7XG5cbiAgcmV0dXJuIHBhcnNlcignSlNPTicsIGlucHV0LCBwYXJzZUxleCwgb3BlcmF0b3JzLCBwYXJzZUdyYW1tYXIpO1xufVxuXG5leHBvcnQge1Rva2VufTtcblxuYXN5bmMgZnVuY3Rpb24gcGFyc2VMZXgoXG4gIHN0ckxvb2tBaGVhZDogTG9va0FoZWFkT2JzZXJ2YWJsZTxzdHJpbmcsIHN0cmluZz4sXG4gIHRva2VuU3ViOiBTdWJzY3JpYmVyPENodW5rPHN0cmluZywgc3RyaW5nPj4pIHtcbiAgbGV0IGNoYXIgPSBhd2FpdCBzdHJMb29rQWhlYWQubGEoKTtcbiAgd2hpbGUgKGNoYXIgIT0gbnVsbCkge1xuICAgIGlmICgvW3t9XFxbXFxdLDpdLy50ZXN0KGNoYXIpKSB7XG4gICAgICBzdHJMb29rQWhlYWQuc3RhcnRUb2tlbihjaGFyKTtcbiAgICAgIGF3YWl0IHN0ckxvb2tBaGVhZC5hZHZhbmNlKCk7XG4gICAgICBzdHJMb29rQWhlYWQuZW1pdFRva2VuKCk7XG4gICAgfSBlbHNlIGlmICgvXFxzLy50ZXN0KGNoYXIpKSB7XG4gICAgICBkbyB7XG4gICAgICAgIGF3YWl0IHN0ckxvb2tBaGVhZC5hZHZhbmNlKCk7XG4gICAgICAgIGNoYXIgPSBhd2FpdCBzdHJMb29rQWhlYWQubGEoKTtcbiAgICAgIH0gd2hpbGUgKGNoYXIgJiYgL1xccy8udGVzdChjaGFyKSk7XG4gICAgfSBlbHNlIGlmICgvW1wiJ10vLnRlc3QoY2hhcikpIHtcbiAgICAgIHN0ckxvb2tBaGVhZC5zdGFydFRva2VuKCdzdHJpbmdMaXRlcmFsJyk7XG4gICAgICBjb25zdCBvcGVuQ2hhciA9IGF3YWl0IHN0ckxvb2tBaGVhZC5hZHZhbmNlKCk7XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBjb25zdCBsYSA9IGF3YWl0IHN0ckxvb2tBaGVhZC5sYSgpO1xuICAgICAgICBpZiAobGEgPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBzdHJMb29rQWhlYWQudGhyb3dFcnJvcigpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsYSA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgYXdhaXQgc3RyTG9va0FoZWFkLmFkdmFuY2UoMik7XG4gICAgICAgIH0gZWxzZSBpZiAobGEgPT09IG9wZW5DaGFyKSB7XG4gICAgICAgICAgYXdhaXQgc3RyTG9va0FoZWFkLmFkdmFuY2UoKTtcbiAgICAgICAgICBzdHJMb29rQWhlYWQuZW1pdFRva2VuKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgc3RyTG9va0FoZWFkLmFkdmFuY2UoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHJMb29rQWhlYWQuc3RhcnRUb2tlbignb3RoZXInKTtcbiAgICAgIGxldCBuZXh0OiBzdHJpbmcgfCBudWxsO1xuICAgICAgZG8ge1xuICAgICAgICBhd2FpdCBzdHJMb29rQWhlYWQuYWR2YW5jZSgpO1xuICAgICAgICBuZXh0ID0gYXdhaXQgc3RyTG9va0FoZWFkLmxhKCk7XG4gICAgICB9IHdoaWxlIChuZXh0ICE9IG51bGwgJiYgIS9be31cXFtcXF0sOlxccydcIl0vLnRlc3QobmV4dCkpO1xuICAgICAgc3RyTG9va0FoZWFkLmVtaXRUb2tlbigpO1xuICAgIH1cbiAgICBjaGFyID0gYXdhaXQgc3RyTG9va0FoZWFkLmxhKCk7XG4gIH1cbn1cblxudHlwZSBMZXhlciA9IExvb2tBaGVhZDxUb2tlbjxzdHJpbmc+LCBzdHJpbmc+O1xuXG5lbnVtIEFzdFR5cGUge1xuICBvYmplY3QgPSAwLFxuICBhcnJheSxcbiAgcHJvcGVydHksXG4gIHZhbHVlXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXN0IHtcbiAgdHlwZTogQXN0VHlwZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBPYmplY3RBc3QgZXh0ZW5kcyBBc3Qge1xuICBwcm9wZXJ0aWVzOiB7bmFtZTogVG9rZW48c3RyaW5nPiwgdmFsdWU6IEFzdHxUb2tlbjxzdHJpbmc+fVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFycmF5QXN0IGV4dGVuZHMgQXN0IHtcbiAgaXRlbXM6IEFycmF5PEFzdCB8IFRva2VuPHN0cmluZz4+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFZhbHVlQXN0IGV4dGVuZHMgQXN0IHtcbiAgdmFsdWU6IFRva2VuPHN0cmluZz47XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHBhcnNlR3JhbW1hcih0b2tlbkxhOiBMZXhlcikge1xuICByZXR1cm4gZG9PYmplY3QodG9rZW5MYSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGRvT2JqZWN0KGxleGVyOiBMZXhlcik6IFByb21pc2U8T2JqZWN0QXN0PiB7XG4gIGNvbnN0IGFzdDogT2JqZWN0QXN0ID0ge1xuICAgIHR5cGU6IEFzdFR5cGUub2JqZWN0LFxuICAgIHByb3BlcnRpZXM6IFtdXG4gIH07XG4gIGF3YWl0IGxleGVyLmFkdmFuY2UoKTtcbiAgbGV0IG5leHQgPSBhd2FpdCBsZXhlci5sYSgpO1xuICB3aGlsZSAobmV4dCAhPSBudWxsICYmIG5leHQudHlwZSAhPT0gJ30nKSB7XG4gICAgY29uc3QgcHJvcFRva2VuID0gYXdhaXQgbGV4ZXIuYWR2YW5jZSgpO1xuICAgIGNvbnN0IGNvbG9uID0gYXdhaXQgbGV4ZXIuYWR2YW5jZSgpO1xuICAgIGlmIChjb2xvbi50eXBlICE9PSAnOicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ICc6JyBidXQgcmVjaWV2ZSAnJHtjb2xvbi50ZXh0fScgYXQgJHtjb2xvbi5saW5lfToke2NvbG9uLmNvbH1gKTtcbiAgICB9XG5cbiAgICBhc3QucHJvcGVydGllcy5wdXNoKHtuYW1lOiBwcm9wVG9rZW4sIHZhbHVlOiBhd2FpdCBkb1ZhbHVlKGxleGVyKX0pO1xuICAgIG5leHQgPSBhd2FpdCBsZXhlci5sYSgpO1xuICAgIGlmIChuZXh0ICYmIG5leHQudHlwZSA9PT0gJywnKVxuICAgICAgYXdhaXQgbGV4ZXIuYWR2YW5jZSgpO1xuICAgIG5leHQgPSBhd2FpdCBsZXhlci5sYSgpO1xuICB9XG4gIGF3YWl0IGxleGVyLmFkdmFuY2UoKTsgLy8gfVxuICByZXR1cm4gYXN0O1xufVxuXG5hc3luYyBmdW5jdGlvbiBkb0FycmF5KGxleGVyOiBMZXhlcik6IFByb21pc2U8QXJyYXlBc3Q+IHtcbiAgY29uc3QgYXN0OiBBcnJheUFzdCA9IHtcbiAgICB0eXBlOiBBc3RUeXBlLmFycmF5LFxuICAgIGl0ZW1zOiBbXVxuICB9O1xuICBhd2FpdCBsZXhlci5hZHZhbmNlKCk7XG4gIGxldCBuZXh0ID0gYXdhaXQgbGV4ZXIubGEoKTtcbiAgd2hpbGUgKG5leHQgIT0gbnVsbCAmJiBuZXh0LnR5cGUgIT09ICddJykge1xuICAgIGlmIChuZXh0LnR5cGUgIT09ICcsJykge1xuICAgICAgYXN0Lml0ZW1zLnB1c2goYXdhaXQgZG9WYWx1ZShsZXhlcikpO1xuICAgIH1cbiAgICBuZXh0ID0gYXdhaXQgbGV4ZXIubGEoKTtcbiAgfVxuICBpZiAobmV4dCAmJiBuZXh0LnR5cGUgPT09ICddJylcbiAgICBhd2FpdCBsZXhlci5hZHZhbmNlKCk7IC8vIF1cbiAgZWxzZSBpZiAobmV4dCA9PSBudWxsKVxuICAgIHRocm93IG5ldyBFcnJvcignVW5leHBlY3QgRU9GIGFmdGVyICcgKyBsZXhlci5sYXN0Q29uc3VtZWQhLnRleHQpO1xuICBlbHNlXG4gICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdCAke25leHQudGV4dH0gYXQgJHtuZXh0LmxpbmV9OiR7bmV4dC5jb2x9YCk7XG4gIHJldHVybiBhc3Q7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGRvVmFsdWUobGV4ZXI6IExleGVyKSB7XG4gIGNvbnN0IG5leHQgPSBhd2FpdCBsZXhlci5sYSgpO1xuICBpZiAobmV4dCA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignVW5leHBlY3QgRU9GJyk7XG4gIH1cbiAgaWYgKG5leHQudHlwZSA9PT0gJ3snKSB7XG4gICAgcmV0dXJuIGRvT2JqZWN0KGxleGVyKTtcbiAgfSBlbHNlIGlmIChuZXh0LnR5cGUgPT09ICdbJykge1xuICAgIHJldHVybiBkb0FycmF5KGxleGVyKTtcbiAgfSBlbHNlIGlmIChuZXh0LnR5cGUgPT09ICdzdHJpbmdMaXRlcmFsJyB8fCBuZXh0LnR5cGUgPT09ICdvdGhlcicpIHtcbiAgICByZXR1cm4gbGV4ZXIuYWR2YW5jZSgpO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3QgJyR7bmV4dC50ZXh0fScgYXQgJHtuZXh0LmxpbmV9OiR7bmV4dC5jb2x9YCk7XG4gIH1cbn1cbiJdfQ==