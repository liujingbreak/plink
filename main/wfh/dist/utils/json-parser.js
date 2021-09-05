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
    const operators = onToken ? [(0, operators_1.tap)(onToken)] : null;
    return (0, async_LLn_parser_1.parser)('JSON', input, parseLex, operators, parseGrammar);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9qc29uLXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFDQSwwREFBeUY7QUFnQmpGLHNGQWhCK0Msd0JBQUssT0FnQi9DO0FBZmIsK0JBQTRDO0FBQzVDLDhDQUFtQztBQUduQyxTQUF3QixLQUFLLENBQUMsTUFBZ0IsRUFBRSxPQUF3QztJQUN0RixNQUFNLEtBQUssR0FBRyxJQUFJLGlCQUFVLENBQVcsR0FBRyxDQUFDLEVBQUU7UUFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBQSxlQUFHLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBRWxELE9BQU8sSUFBQSx5QkFBTSxFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQztBQUNsRSxDQUFDO0FBVEQsd0JBU0M7QUFJRCxTQUFlLFFBQVEsQ0FDckIsWUFBaUQsRUFDakQsUUFBMkM7O1FBQzNDLElBQUksSUFBSSxHQUFHLE1BQU0sWUFBWSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ25DLE9BQU8sSUFBSSxJQUFJLElBQUksRUFBRTtZQUNuQixJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzNCLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzlCLE1BQU0sWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUM3QixZQUFZLENBQUMsU0FBUyxFQUFFLENBQUM7YUFDMUI7aUJBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUMxQixHQUFHO29CQUNELE1BQU0sWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUM3QixJQUFJLEdBQUcsTUFBTSxZQUFZLENBQUMsRUFBRSxFQUFFLENBQUM7aUJBQ2hDLFFBQVEsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7YUFDbkM7aUJBQU0sSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUM1QixZQUFZLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUN6QyxNQUFNLFFBQVEsR0FBRyxNQUFNLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDOUMsT0FBTyxJQUFJLEVBQUU7b0JBQ1gsTUFBTSxFQUFFLEdBQUcsTUFBTSxZQUFZLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ25DLElBQUksRUFBRSxJQUFJLElBQUksRUFBRTt3QkFDZCxPQUFPLFlBQVksQ0FBQyxVQUFVLEVBQUUsQ0FBQztxQkFDbEM7b0JBQ0QsSUFBSSxFQUFFLEtBQUssSUFBSSxFQUFFO3dCQUNmLE1BQU0sWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDL0I7eUJBQU0sSUFBSSxFQUFFLEtBQUssUUFBUSxFQUFFO3dCQUMxQixNQUFNLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDN0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDO3dCQUN6QixNQUFNO3FCQUNQO3lCQUFNO3dCQUNMLE1BQU0sWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO3FCQUM5QjtpQkFDRjthQUNGO2lCQUFNO2dCQUNMLFlBQVksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ2pDLElBQUksSUFBbUIsQ0FBQztnQkFDeEIsR0FBRztvQkFDRCxNQUFNLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDN0IsSUFBSSxHQUFHLE1BQU0sWUFBWSxDQUFDLEVBQUUsRUFBRSxDQUFDO2lCQUNoQyxRQUFRLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3ZELFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQzthQUMxQjtZQUNELElBQUksR0FBRyxNQUFNLFlBQVksQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNoQztJQUNILENBQUM7Q0FBQTtBQUlELElBQUssT0FLSjtBQUxELFdBQUssT0FBTztJQUNWLHlDQUFVLENBQUE7SUFDVix1Q0FBSyxDQUFBO0lBQ0wsNkNBQVEsQ0FBQTtJQUNSLHVDQUFLLENBQUE7QUFDUCxDQUFDLEVBTEksT0FBTyxLQUFQLE9BQU8sUUFLWDtBQWtCRCxTQUFlLFlBQVksQ0FBQyxPQUFjOztRQUN4QyxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMzQixDQUFDO0NBQUE7QUFFRCxTQUFlLFFBQVEsQ0FBQyxLQUFZOztRQUNsQyxNQUFNLEdBQUcsR0FBYztZQUNyQixJQUFJLEVBQUUsT0FBTyxDQUFDLE1BQU07WUFDcEIsVUFBVSxFQUFFLEVBQUU7U0FDZixDQUFDO1FBQ0YsTUFBTSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdEIsSUFBSSxJQUFJLEdBQUcsTUFBTSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDNUIsT0FBTyxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssR0FBRyxFQUFFO1lBQ3hDLE1BQU0sU0FBUyxHQUFHLE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3hDLE1BQU0sS0FBSyxHQUFHLE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3BDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUU7Z0JBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLEtBQUssQ0FBQyxJQUFJLFFBQVEsS0FBSyxDQUFDLElBQUksSUFBSSxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQzthQUN6RjtZQUVELEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDO1lBQ3BFLElBQUksR0FBRyxNQUFNLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN4QixJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLEdBQUc7Z0JBQzNCLE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3hCLElBQUksR0FBRyxNQUFNLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUN6QjtRQUNELE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSTtRQUMzQixPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7Q0FBQTtBQUVELFNBQWUsT0FBTyxDQUFDLEtBQVk7O1FBQ2pDLE1BQU0sR0FBRyxHQUFhO1lBQ3BCLElBQUksRUFBRSxPQUFPLENBQUMsS0FBSztZQUNuQixLQUFLLEVBQUUsRUFBRTtTQUNWLENBQUM7UUFDRixNQUFNLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN0QixJQUFJLElBQUksR0FBRyxNQUFNLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM1QixPQUFPLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUU7WUFDeEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLEdBQUcsRUFBRTtnQkFDckIsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzthQUN0QztZQUNELElBQUksR0FBRyxNQUFNLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUN6QjtRQUNELElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssR0FBRztZQUMzQixNQUFNLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLElBQUk7YUFDeEIsSUFBSSxJQUFJLElBQUksSUFBSTtZQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixHQUFHLEtBQUssQ0FBQyxZQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7O1lBRWxFLE1BQU0sSUFBSSxLQUFLLENBQUMsWUFBWSxJQUFJLENBQUMsSUFBSSxPQUFPLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDdkUsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0NBQUE7QUFFRCxTQUFlLE9BQU8sQ0FBQyxLQUFZOztRQUNqQyxNQUFNLElBQUksR0FBRyxNQUFNLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM5QixJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7WUFDakIsTUFBTSxJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztTQUNqQztRQUNELElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUU7WUFDckIsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDeEI7YUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssR0FBRyxFQUFFO1lBQzVCLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ3ZCO2FBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLGVBQWUsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTtZQUNqRSxPQUFPLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUN4QjthQUFNO1lBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQyxhQUFhLElBQUksQ0FBQyxJQUFJLFFBQVEsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztTQUN4RTtJQUNILENBQUM7Q0FBQSIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IHtwYXJzZXIsIExvb2tBaGVhZCwgTG9va0FoZWFkT2JzZXJ2YWJsZSwgQ2h1bmssIFRva2VufSBmcm9tICcuLi9hc3luYy1MTG4tcGFyc2VyJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgU3Vic2NyaWJlcn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge3RhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtSZWFkYWJsZX0gZnJvbSAnc3RyZWFtJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcGFyc2UocmVhZGVyOiBSZWFkYWJsZSwgb25Ub2tlbj86ICh0b2tlbjogVG9rZW48c3RyaW5nPikgPT4gdm9pZCkge1xuICBjb25zdCBpbnB1dCA9IG5ldyBPYnNlcnZhYmxlPHN0cmluZ1tdPihzdWIgPT4ge1xuICAgIHJlYWRlci5vbignZGF0YScsIChidWY6IHN0cmluZykgPT4gc3ViLm5leHQoYnVmLnNwbGl0KCcnKSkpO1xuICAgIHJlYWRlci5vbignZW5kJywgKCkgPT4gc3ViLmNvbXBsZXRlKCkpO1xuICB9KTtcblxuICBjb25zdCBvcGVyYXRvcnMgPSBvblRva2VuID8gW3RhcChvblRva2VuKV0gOiBudWxsO1xuXG4gIHJldHVybiBwYXJzZXIoJ0pTT04nLCBpbnB1dCwgcGFyc2VMZXgsIG9wZXJhdG9ycywgcGFyc2VHcmFtbWFyKTtcbn1cblxuZXhwb3J0IHtUb2tlbn07XG5cbmFzeW5jIGZ1bmN0aW9uIHBhcnNlTGV4KFxuICBzdHJMb29rQWhlYWQ6IExvb2tBaGVhZE9ic2VydmFibGU8c3RyaW5nLCBzdHJpbmc+LFxuICB0b2tlblN1YjogU3Vic2NyaWJlcjxDaHVuazxzdHJpbmcsIHN0cmluZz4+KSB7XG4gIGxldCBjaGFyID0gYXdhaXQgc3RyTG9va0FoZWFkLmxhKCk7XG4gIHdoaWxlIChjaGFyICE9IG51bGwpIHtcbiAgICBpZiAoL1t7fVxcW1xcXSw6XS8udGVzdChjaGFyKSkge1xuICAgICAgc3RyTG9va0FoZWFkLnN0YXJ0VG9rZW4oY2hhcik7XG4gICAgICBhd2FpdCBzdHJMb29rQWhlYWQuYWR2YW5jZSgpO1xuICAgICAgc3RyTG9va0FoZWFkLmVtaXRUb2tlbigpO1xuICAgIH0gZWxzZSBpZiAoL1xccy8udGVzdChjaGFyKSkge1xuICAgICAgZG8ge1xuICAgICAgICBhd2FpdCBzdHJMb29rQWhlYWQuYWR2YW5jZSgpO1xuICAgICAgICBjaGFyID0gYXdhaXQgc3RyTG9va0FoZWFkLmxhKCk7XG4gICAgICB9IHdoaWxlIChjaGFyICYmIC9cXHMvLnRlc3QoY2hhcikpO1xuICAgIH0gZWxzZSBpZiAoL1tcIiddLy50ZXN0KGNoYXIpKSB7XG4gICAgICBzdHJMb29rQWhlYWQuc3RhcnRUb2tlbignc3RyaW5nTGl0ZXJhbCcpO1xuICAgICAgY29uc3Qgb3BlbkNoYXIgPSBhd2FpdCBzdHJMb29rQWhlYWQuYWR2YW5jZSgpO1xuICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgY29uc3QgbGEgPSBhd2FpdCBzdHJMb29rQWhlYWQubGEoKTtcbiAgICAgICAgaWYgKGxhID09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gc3RyTG9va0FoZWFkLnRocm93RXJyb3IoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobGEgPT09ICdcXFxcJykge1xuICAgICAgICAgIGF3YWl0IHN0ckxvb2tBaGVhZC5hZHZhbmNlKDIpO1xuICAgICAgICB9IGVsc2UgaWYgKGxhID09PSBvcGVuQ2hhcikge1xuICAgICAgICAgIGF3YWl0IHN0ckxvb2tBaGVhZC5hZHZhbmNlKCk7XG4gICAgICAgICAgc3RyTG9va0FoZWFkLmVtaXRUb2tlbigpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IHN0ckxvb2tBaGVhZC5hZHZhbmNlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyTG9va0FoZWFkLnN0YXJ0VG9rZW4oJ290aGVyJyk7XG4gICAgICBsZXQgbmV4dDogc3RyaW5nIHwgbnVsbDtcbiAgICAgIGRvIHtcbiAgICAgICAgYXdhaXQgc3RyTG9va0FoZWFkLmFkdmFuY2UoKTtcbiAgICAgICAgbmV4dCA9IGF3YWl0IHN0ckxvb2tBaGVhZC5sYSgpO1xuICAgICAgfSB3aGlsZSAobmV4dCAhPSBudWxsICYmICEvW3t9XFxbXFxdLDpcXHMnXCJdLy50ZXN0KG5leHQpKTtcbiAgICAgIHN0ckxvb2tBaGVhZC5lbWl0VG9rZW4oKTtcbiAgICB9XG4gICAgY2hhciA9IGF3YWl0IHN0ckxvb2tBaGVhZC5sYSgpO1xuICB9XG59XG5cbnR5cGUgTGV4ZXIgPSBMb29rQWhlYWQ8VG9rZW48c3RyaW5nPiwgc3RyaW5nPjtcblxuZW51bSBBc3RUeXBlIHtcbiAgb2JqZWN0ID0gMCxcbiAgYXJyYXksXG4gIHByb3BlcnR5LFxuICB2YWx1ZVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFzdCB7XG4gIHR5cGU6IEFzdFR5cGU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgT2JqZWN0QXN0IGV4dGVuZHMgQXN0IHtcbiAgcHJvcGVydGllczoge25hbWU6IFRva2VuPHN0cmluZz47IHZhbHVlOiBBc3R8VG9rZW48c3RyaW5nPn1bXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBcnJheUFzdCBleHRlbmRzIEFzdCB7XG4gIGl0ZW1zOiBBcnJheTxBc3QgfCBUb2tlbjxzdHJpbmc+Pjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBWYWx1ZUFzdCBleHRlbmRzIEFzdCB7XG4gIHZhbHVlOiBUb2tlbjxzdHJpbmc+O1xufVxuXG5hc3luYyBmdW5jdGlvbiBwYXJzZUdyYW1tYXIodG9rZW5MYTogTGV4ZXIpIHtcbiAgcmV0dXJuIGRvT2JqZWN0KHRva2VuTGEpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBkb09iamVjdChsZXhlcjogTGV4ZXIpOiBQcm9taXNlPE9iamVjdEFzdD4ge1xuICBjb25zdCBhc3Q6IE9iamVjdEFzdCA9IHtcbiAgICB0eXBlOiBBc3RUeXBlLm9iamVjdCxcbiAgICBwcm9wZXJ0aWVzOiBbXVxuICB9O1xuICBhd2FpdCBsZXhlci5hZHZhbmNlKCk7XG4gIGxldCBuZXh0ID0gYXdhaXQgbGV4ZXIubGEoKTtcbiAgd2hpbGUgKG5leHQgIT0gbnVsbCAmJiBuZXh0LnR5cGUgIT09ICd9Jykge1xuICAgIGNvbnN0IHByb3BUb2tlbiA9IGF3YWl0IGxleGVyLmFkdmFuY2UoKTtcbiAgICBjb25zdCBjb2xvbiA9IGF3YWl0IGxleGVyLmFkdmFuY2UoKTtcbiAgICBpZiAoY29sb24udHlwZSAhPT0gJzonKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdCAnOicgYnV0IHJlY2lldmUgJyR7Y29sb24udGV4dH0nIGF0ICR7Y29sb24ubGluZX06JHtjb2xvbi5jb2x9YCk7XG4gICAgfVxuXG4gICAgYXN0LnByb3BlcnRpZXMucHVzaCh7bmFtZTogcHJvcFRva2VuLCB2YWx1ZTogYXdhaXQgZG9WYWx1ZShsZXhlcil9KTtcbiAgICBuZXh0ID0gYXdhaXQgbGV4ZXIubGEoKTtcbiAgICBpZiAobmV4dCAmJiBuZXh0LnR5cGUgPT09ICcsJylcbiAgICAgIGF3YWl0IGxleGVyLmFkdmFuY2UoKTtcbiAgICBuZXh0ID0gYXdhaXQgbGV4ZXIubGEoKTtcbiAgfVxuICBhd2FpdCBsZXhlci5hZHZhbmNlKCk7IC8vIH1cbiAgcmV0dXJuIGFzdDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZG9BcnJheShsZXhlcjogTGV4ZXIpOiBQcm9taXNlPEFycmF5QXN0PiB7XG4gIGNvbnN0IGFzdDogQXJyYXlBc3QgPSB7XG4gICAgdHlwZTogQXN0VHlwZS5hcnJheSxcbiAgICBpdGVtczogW11cbiAgfTtcbiAgYXdhaXQgbGV4ZXIuYWR2YW5jZSgpO1xuICBsZXQgbmV4dCA9IGF3YWl0IGxleGVyLmxhKCk7XG4gIHdoaWxlIChuZXh0ICE9IG51bGwgJiYgbmV4dC50eXBlICE9PSAnXScpIHtcbiAgICBpZiAobmV4dC50eXBlICE9PSAnLCcpIHtcbiAgICAgIGFzdC5pdGVtcy5wdXNoKGF3YWl0IGRvVmFsdWUobGV4ZXIpKTtcbiAgICB9XG4gICAgbmV4dCA9IGF3YWl0IGxleGVyLmxhKCk7XG4gIH1cbiAgaWYgKG5leHQgJiYgbmV4dC50eXBlID09PSAnXScpXG4gICAgYXdhaXQgbGV4ZXIuYWR2YW5jZSgpOyAvLyBdXG4gIGVsc2UgaWYgKG5leHQgPT0gbnVsbClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0IEVPRiBhZnRlciAnICsgbGV4ZXIubGFzdENvbnN1bWVkIS50ZXh0KTtcbiAgZWxzZVxuICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3QgJHtuZXh0LnRleHR9IGF0ICR7bmV4dC5saW5lfToke25leHQuY29sfWApO1xuICByZXR1cm4gYXN0O1xufVxuXG5hc3luYyBmdW5jdGlvbiBkb1ZhbHVlKGxleGVyOiBMZXhlcikge1xuICBjb25zdCBuZXh0ID0gYXdhaXQgbGV4ZXIubGEoKTtcbiAgaWYgKG5leHQgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0IEVPRicpO1xuICB9XG4gIGlmIChuZXh0LnR5cGUgPT09ICd7Jykge1xuICAgIHJldHVybiBkb09iamVjdChsZXhlcik7XG4gIH0gZWxzZSBpZiAobmV4dC50eXBlID09PSAnWycpIHtcbiAgICByZXR1cm4gZG9BcnJheShsZXhlcik7XG4gIH0gZWxzZSBpZiAobmV4dC50eXBlID09PSAnc3RyaW5nTGl0ZXJhbCcgfHwgbmV4dC50eXBlID09PSAnb3RoZXInKSB7XG4gICAgcmV0dXJuIGxleGVyLmFkdmFuY2UoKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ICcke25leHQudGV4dH0nIGF0ICR7bmV4dC5saW5lfToke25leHQuY29sfWApO1xuICB9XG59XG4iXX0=