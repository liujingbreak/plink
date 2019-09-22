"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const async_LLn_parser_1 = require("../async-LLn-parser");
exports.Token = async_LLn_parser_1.Token;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9qc29uLXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQ0EsMERBQXlGO0FBZ0JqRixnQkFoQitDLHdCQUFLLENBZ0IvQztBQWZiLCtCQUE0QztBQUM1Qyw4Q0FBbUM7QUFHbkMsU0FBd0IsS0FBSyxDQUFDLE1BQWdCLEVBQUUsT0FBZ0M7SUFDOUUsTUFBTSxLQUFLLEdBQUcsSUFBSSxpQkFBVSxDQUFXLEdBQUcsQ0FBQyxFQUFFO1FBQzNDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBVyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQ3pDLENBQUMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFFbEQsT0FBTyx5QkFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQztBQUNsRSxDQUFDO0FBVEQsd0JBU0M7QUFJRCxTQUFlLFFBQVEsQ0FBQyxZQUF5QyxFQUFFLFFBQW1DOztRQUNwRyxJQUFJLElBQUksR0FBRyxNQUFNLFlBQVksQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNuQyxPQUFPLElBQUksSUFBSSxJQUFJLEVBQUU7WUFDbkIsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUMzQixZQUFZLENBQUMsVUFBVSxDQUFD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dGVudCI6WyJcbmltcG9ydCB7cGFyc2VyLCBMb29rQWhlYWQsIExvb2tBaGVhZE9ic2VydmFibGUsIENodW5rLCBUb2tlbn0gZnJvbSAnLi4vYXN5bmMtTExuLXBhcnNlcic7XG5pbXBvcnQge09ic2VydmFibGUsIFN1YnNjcmliZXJ9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHt0YXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7UmVhZGFibGV9IGZyb20gJ3N0cmVhbSc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHBhcnNlKHJlYWRlcjogUmVhZGFibGUsIG9uVG9rZW4/OiAodG9rZW46IFRva2VuKSA9PiB2b2lkKSB7XG4gIGNvbnN0IGlucHV0ID0gbmV3IE9ic2VydmFibGU8c3RyaW5nW10+KHN1YiA9PiB7XG4gICAgcmVhZGVyLm9uKCdkYXRhJywgKGJ1Zjogc3RyaW5nKSA9PiBzdWIubmV4dChidWYuc3BsaXQoJycpKSk7XG4gICAgcmVhZGVyLm9uKCdlbmQnLCAoKSA9PiBzdWIuY29tcGxldGUoKSk7XG4gIH0pO1xuXG4gIGNvbnN0IG9wZXJhdG9ycyA9IG9uVG9rZW4gPyBbdGFwKG9uVG9rZW4pXSA6IG51bGw7XG5cbiAgcmV0dXJuIHBhcnNlcignSlNPTicsIGlucHV0LCBwYXJzZUxleCwgb3BlcmF0b3JzLCBwYXJzZUdyYW1tYXIpO1xufVxuXG5leHBvcnQge1Rva2VufTtcblxuYXN5bmMgZnVuY3Rpb24gcGFyc2VMZXgoc3RyTG9va0FoZWFkOiBMb29rQWhlYWRPYnNlcnZhYmxlPHN0cmluZz4sIHRva2VuU3ViOiBTdWJzY3JpYmVyPENodW5rPHN0cmluZz4+KSB7XG4gIGxldCBjaGFyID0gYXdhaXQgc3RyTG9va0FoZWFkLmxhKCk7XG4gIHdoaWxlIChjaGFyICE9IG51bGwpIHtcbiAgICBpZiAoL1t7fVxcW1xcXSw6XS8udGVzdChjaGFyKSkge1xuICAgICAgc3RyTG9va0FoZWFkLnN0YXJ0VG9rZW4oY2hhcik7XG4gICAgICBhd2FpdCBzdHJMb29rQWhlYWQuYWR2YW5jZSgpO1xuICAgICAgc3RyTG9va0FoZWFkLmVtaXRUb2tlbigpO1xuICAgIH0gZWxzZSBpZiAoL1xccy8udGVzdChjaGFyKSkge1xuICAgICAgZG8ge1xuICAgICAgICBhd2FpdCBzdHJMb29rQWhlYWQuYWR2YW5jZSgpO1xuICAgICAgICBjaGFyID0gYXdhaXQgc3RyTG9va0FoZWFkLmxhKCk7XG4gICAgICB9IHdoaWxlIChjaGFyICYmIC9cXHMvLnRlc3QoY2hhcikpO1xuICAgIH0gZWxzZSBpZiAoL1tcIiddLy50ZXN0KGNoYXIpKSB7XG4gICAgICBzdHJMb29rQWhlYWQuc3RhcnRUb2tlbignc3RyaW5nTGl0ZXJhbCcpO1xuICAgICAgY29uc3Qgb3BlbkNoYXIgPSBhd2FpdCBzdHJMb29rQWhlYWQuYWR2YW5jZSgpO1xuICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgY29uc3QgbGEgPSBhd2FpdCBzdHJMb29rQWhlYWQubGEoKTtcbiAgICAgICAgaWYgKGxhID09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gc3RyTG9va0FoZWFkLnRocm93RXJyb3IoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobGEgPT09ICdcXFxcJykge1xuICAgICAgICAgIGF3YWl0IHN0ckxvb2tBaGVhZC5hZHZhbmNlKDIpO1xuICAgICAgICB9IGVsc2UgaWYgKGxhID09PSBvcGVuQ2hhcikge1xuICAgICAgICAgIGF3YWl0IHN0ckxvb2tBaGVhZC5hZHZhbmNlKCk7XG4gICAgICAgICAgc3RyTG9va0FoZWFkLmVtaXRUb2tlbigpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IHN0ckxvb2tBaGVhZC5hZHZhbmNlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyTG9va0FoZWFkLnN0YXJ0VG9rZW4oJ290aGVyJyk7XG4gICAgICBsZXQgbmV4dDogc3RyaW5nIHwgbnVsbDtcbiAgICAgIGRvIHtcbiAgICAgICAgYXdhaXQgc3RyTG9va0FoZWFkLmFkdmFuY2UoKTtcbiAgICAgICAgbmV4dCA9IGF3YWl0IHN0ckxvb2tBaGVhZC5sYSgpO1xuICAgICAgfSB3aGlsZSAobmV4dCAhPSBudWxsICYmICEvW3t9XFxbXFxdLDpcXHMnXCJdLy50ZXN0KG5leHQpKTtcbiAgICAgIHN0ckxvb2tBaGVhZC5lbWl0VG9rZW4oKTtcbiAgICB9XG4gICAgY2hhciA9IGF3YWl0IHN0ckxvb2tBaGVhZC5sYSgpO1xuICB9XG59XG5cbnR5cGUgTGV4ZXIgPSBMb29rQWhlYWQ8VG9rZW4+O1xuXG5lbnVtIEFzdFR5cGUge1xuICBvYmplY3QgPSAwLFxuICBhcnJheSxcbiAgcHJvcGVydHksXG4gIHZhbHVlXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXN0IHtcbiAgdHlwZTogQXN0VHlwZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBPYmplY3RBc3QgZXh0ZW5kcyBBc3Qge1xuICBwcm9wZXJ0aWVzOiB7bmFtZTogVG9rZW4sIHZhbHVlOiBBc3R8VG9rZW59W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXJyYXlBc3QgZXh0ZW5kcyBBc3Qge1xuICBpdGVtczogQXJyYXk8QXN0IHwgVG9rZW4+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFZhbHVlQXN0IGV4dGVuZHMgQXN0IHtcbiAgdmFsdWU6IFRva2VuO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwYXJzZUdyYW1tYXIodG9rZW5MYTogTGV4ZXIpIHtcbiAgcmV0dXJuIGRvT2JqZWN0KHRva2VuTGEpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBkb09iamVjdChsZXhlcjogTGV4ZXIpOiBQcm9taXNlPE9iamVjdEFzdD4ge1xuICBjb25zdCBhc3Q6IE9iamVjdEFzdCA9IHtcbiAgICB0eXBlOiBBc3RUeXBlLm9iamVjdCxcbiAgICBwcm9wZXJ0aWVzOiBbXVxuICB9O1xuICBhd2FpdCBsZXhlci5hZHZhbmNlKCk7XG4gIGxldCBuZXh0ID0gYXdhaXQgbGV4ZXIubGEoKTtcbiAgd2hpbGUgKG5leHQgIT0gbnVsbCAmJiBuZXh0LnR5cGUgIT09ICd9Jykge1xuICAgIGNvbnN0IHByb3BUb2tlbiA9IGF3YWl0IGxleGVyLmFkdmFuY2UoKTtcbiAgICBjb25zdCBjb2xvbiA9IGF3YWl0IGxleGVyLmFkdmFuY2UoKTtcbiAgICBpZiAoY29sb24udHlwZSAhPT0gJzonKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdCAnOicgYnV0IHJlY2lldmUgJyR7Y29sb24udGV4dH0nIGF0ICR7Y29sb24ubGluZX06JHtjb2xvbi5jb2x9YCk7XG4gICAgfVxuXG4gICAgYXN0LnByb3BlcnRpZXMucHVzaCh7bmFtZTogcHJvcFRva2VuLCB2YWx1ZTogYXdhaXQgZG9WYWx1ZShsZXhlcil9KTtcbiAgICBuZXh0ID0gYXdhaXQgbGV4ZXIubGEoKTtcbiAgICBpZiAobmV4dCAmJiBuZXh0LnR5cGUgPT09ICcsJylcbiAgICAgIGF3YWl0IGxleGVyLmFkdmFuY2UoKTtcbiAgICBuZXh0ID0gYXdhaXQgbGV4ZXIubGEoKTtcbiAgfVxuICBhd2FpdCBsZXhlci5hZHZhbmNlKCk7IC8vIH1cbiAgcmV0dXJuIGFzdDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZG9BcnJheShsZXhlcjogTGV4ZXIpOiBQcm9taXNlPEFycmF5QXN0PiB7XG4gIGNvbnN0IGFzdDogQXJyYXlBc3QgPSB7XG4gICAgdHlwZTogQXN0VHlwZS5hcnJheSxcbiAgICBpdGVtczogW11cbiAgfTtcbiAgYXdhaXQgbGV4ZXIuYWR2YW5jZSgpO1xuICBsZXQgbmV4dCA9IGF3YWl0IGxleGVyLmxhKCk7XG4gIHdoaWxlIChuZXh0ICE9IG51bGwgJiYgbmV4dC50eXBlICE9PSAnXScpIHtcbiAgICBpZiAobmV4dC50eXBlICE9PSAnLCcpIHtcbiAgICAgIGFzdC5pdGVtcy5wdXNoKGF3YWl0IGRvVmFsdWUobGV4ZXIpKTtcbiAgICB9XG4gICAgbmV4dCA9IGF3YWl0IGxleGVyLmxhKCk7XG4gIH1cbiAgaWYgKG5leHQgJiYgbmV4dC50eXBlID09PSAnXScpXG4gICAgYXdhaXQgbGV4ZXIuYWR2YW5jZSgpOyAvLyBdXG4gIGVsc2UgaWYgKG5leHQgPT0gbnVsbClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0IEVPRiBhZnRlciAnICsgbGV4ZXIubGFzdENvbnN1bWVkIS50ZXh0KTtcbiAgZWxzZVxuICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3QgJHtuZXh0LnRleHR9IGF0ICR7bmV4dC5saW5lfToke25leHQuY29sfWApO1xuICByZXR1cm4gYXN0O1xufVxuXG5hc3luYyBmdW5jdGlvbiBkb1ZhbHVlKGxleGVyOiBMZXhlcikge1xuICBjb25zdCBuZXh0ID0gYXdhaXQgbGV4ZXIubGEoKTtcbiAgaWYgKG5leHQgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0IEVPRicpO1xuICB9XG4gIGlmIChuZXh0LnR5cGUgPT09ICd7Jykge1xuICAgIHJldHVybiBkb09iamVjdChsZXhlcik7XG4gIH0gZWxzZSBpZiAobmV4dC50eXBlID09PSAnWycpIHtcbiAgICByZXR1cm4gZG9BcnJheShsZXhlcik7XG4gIH0gZWxzZSBpZiAobmV4dC50eXBlID09PSAnc3RyaW5nTGl0ZXJhbCcgfHwgbmV4dC50eXBlID09PSAnb3RoZXInKSB7XG4gICAgcmV0dXJuIGxleGVyLmFkdmFuY2UoKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ICcke25leHQudGV4dH0nIGF0ICR7bmV4dC5saW5lfToke25leHQuY29sfWApO1xuICB9XG59XG4iXX0=