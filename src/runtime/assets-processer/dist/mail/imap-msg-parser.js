"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// import {Subscriber} from 'rxjs';
var ImapTokenType;
(function (ImapTokenType) {
    ImapTokenType[ImapTokenType["number"] = 1] = "number";
    ImapTokenType[ImapTokenType["stringLit"] = 2] = "stringLit";
    ImapTokenType[ImapTokenType["stringQuote"] = 3] = "stringQuote";
    ImapTokenType[ImapTokenType["binString"] = 4] = "binString";
    ImapTokenType[ImapTokenType["("] = 5] = "(";
    ImapTokenType[ImapTokenType[")"] = 6] = ")";
    ImapTokenType[ImapTokenType["space"] = 7] = "space";
    ImapTokenType[ImapTokenType["atom"] = 8] = "atom";
    ImapTokenType[ImapTokenType["CRLF"] = 9] = "CRLF";
    ImapTokenType[ImapTokenType["nil"] = 10] = "nil";
})(ImapTokenType = exports.ImapTokenType || (exports.ImapTokenType = {}));
exports.parseLex = function (reply, sub) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let next = yield reply.la();
        while (next != null) {
            if (/[0-9]/.test(next)) {
                reply.startToken(ImapTokenType.number);
                yield reply.advance();
                next = yield reply.la();
                while (next != null && /[0-9.]/.test(next)) {
                    yield reply.advance();
                    next = yield reply.la();
                }
                reply.emitToken();
            }
            else if ('\r' === next) {
                reply.startToken(ImapTokenType.CRLF);
                yield reply.advance();
                if ((yield reply.la()) === '\n')
                    yield reply.advance();
                reply.emitToken();
            }
            else if ('\n' === next) {
                reply.startToken(ImapTokenType.CRLF);
                yield reply.advance();
                reply.emitToken();
            }
            else if (/\s/.test(next)) {
                do {
                    yield reply.advance();
                    next = yield reply.la();
                } while (next && /\s/.test(next));
            }
            else if ('"' === next) {
                reply.startToken('stringQuote');
                const openChar = yield reply.advance();
                while (true) {
                    const la = yield reply.la();
                    if (la == null) {
                        return reply.throwError();
                    }
                    if (la === '\\') {
                        yield reply.advance(2);
                    }
                    else if (la === openChar) {
                        yield reply.advance();
                        reply.emitToken();
                        break;
                    }
                    else {
                        yield reply.advance();
                    }
                }
            }
            else if ('{' === next) {
                const next2 = yield reply.la(2);
                if (next2 && /\d/.test(next2)) {
                    parseLiteralString(reply, sub);
                }
            }
            else {
                reply.startToken(ImapTokenType.atom);
                yield reply.advance();
                next = yield reply.la();
                while (next != null && /[^0-9\s{"]/.test(next)) {
                    yield reply.advance();
                    next = yield reply.la();
                }
                reply.emitToken();
            }
            next = yield reply.la();
        }
    });
};
function parseLiteralString(reply, sub) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        reply.startToken(ImapTokenType.stringLit);
        yield reply.advance();
        let numStr = yield reply.advance();
        let next = yield reply.la();
        while (next && next !== '}') {
            numStr += next;
            yield reply.advance();
            next = yield reply.la();
        }
        const numByte = parseInt(numStr, 10);
        for (let i = 0; i < numByte;) {
            next = yield reply.la();
            if (next == null)
                return reply.throwError();
            if (!/\s/.test(next)) {
                i++;
            }
            yield reply.advance();
        }
        const cr = yield reply.advance();
        if (cr !== '\r')
            reply.throwError(cr);
        const lf = yield reply.advance();
        if (lf !== '\n')
            reply.throwError(cr);
        reply.emitToken();
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL21haWwvaW1hcC1tc2ctcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG1DQUFtQztBQUVuQyxJQUFZLGFBV1g7QUFYRCxXQUFZLGFBQWE7SUFDdkIscURBQVUsQ0FBQTtJQUNWLDJEQUFTLENBQUE7SUFDVCwrREFBVyxDQUFBO0lBQ1gsMkRBQVMsQ0FBQTtJQUNULDJDQUFHLENBQUE7SUFDSCwyQ0FBRyxDQUFBO0lBQ0gsbURBQUssQ0FBQTtJQUNMLGlEQUFJLENBQUE7SUFDSixpREFBSSxDQUFBO0lBQ0osZ0RBQUcsQ0FBQTtBQUNMLENBQUMsRUFYVyxhQUFhLEdBQWIscUJBQWEsS0FBYixxQkFBYSxRQVd4QjtBQUVZLFFBQUEsUUFBUSxHQUFxQixVQUFlLEtBQUssRUFBRSxHQUFHOztRQUNqRSxJQUFJLElBQUksR0FBSSxNQUFNLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM3QixPQUFPLElBQUksSUFBSSxJQUFJLEVBQUU7WUFDbkIsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN0QixLQUFLLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDdkMsTUFBTSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3RCLElBQUksR0FBRyxNQUFNLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDeEIsT0FBTyxJQUFJLElBQUksSUFBSSxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQzFDLE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUN0QixJQUFJLEdBQUcsTUFBTSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUM7aUJBQ3pCO2dCQUNELEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQzthQUNuQjtpQkFBTSxJQUFJLElBQUksS0FBSyxJQUFJLEVB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QUFDLFNBQVMsRUFBRSxDQUFDO0lBQ3BCLENBQUM7Q0FBQSIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L21haWwvaW1hcC1tc2ctcGFyc2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUGFyc2VMZXggfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYXN5bmMtTExuLXBhcnNlcic7XG4vLyBpbXBvcnQge1N1YnNjcmliZXJ9IGZyb20gJ3J4anMnO1xuXG5leHBvcnQgZW51bSBJbWFwVG9rZW5UeXBlIHtcbiAgbnVtYmVyID0gMSxcbiAgc3RyaW5nTGl0LFxuICBzdHJpbmdRdW90ZSxcbiAgYmluU3RyaW5nLFxuICAnKCcsXG4gICcpJyxcbiAgc3BhY2UsXG4gIGF0b20sXG4gIENSTEYsXG4gIG5pbFxufVxuXG5leHBvcnQgY29uc3QgcGFyc2VMZXg6IFBhcnNlTGV4PHN0cmluZz4gPSBhc3luYyBmdW5jdGlvbihyZXBseSwgc3ViKSB7XG4gIGxldCBuZXh0ID0gIGF3YWl0IHJlcGx5LmxhKCk7XG4gIHdoaWxlIChuZXh0ICE9IG51bGwpIHtcbiAgICBpZiAoL1swLTldLy50ZXN0KG5leHQpKSB7XG4gICAgICByZXBseS5zdGFydFRva2VuKEltYXBUb2tlblR5cGUubnVtYmVyKTtcbiAgICAgIGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgICAgIG5leHQgPSBhd2FpdCByZXBseS5sYSgpO1xuICAgICAgd2hpbGUgKG5leHQgIT0gbnVsbCAmJiAvWzAtOS5dLy50ZXN0KG5leHQpKSB7XG4gICAgICAgIGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgICAgICAgbmV4dCA9IGF3YWl0IHJlcGx5LmxhKCk7XG4gICAgICB9XG4gICAgICByZXBseS5lbWl0VG9rZW4oKTtcbiAgICB9IGVsc2UgaWYgKCdcXHInID09PSBuZXh0KSB7XG4gICAgICByZXBseS5zdGFydFRva2VuKEltYXBUb2tlblR5cGUuQ1JMRik7XG4gICAgICBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gICAgICBpZiAoKGF3YWl0IHJlcGx5LmxhKCkpID09PSAnXFxuJylcbiAgICAgICAgYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICAgICAgcmVwbHkuZW1pdFRva2VuKCk7XG4gICAgfSBlbHNlIGlmICgnXFxuJyA9PT0gbmV4dCkge1xuICAgICAgcmVwbHkuc3RhcnRUb2tlbihJbWFwVG9rZW5UeXBlLkNSTEYpO1xuICAgICAgYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICAgICAgcmVwbHkuZW1pdFRva2VuKCk7XG4gICAgfSBlbHNlIGlmICgvXFxzLy50ZXN0KG5leHQpKSB7XG4gICAgICBkbyB7XG4gICAgICAgIGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgICAgICAgbmV4dCA9IGF3YWl0IHJlcGx5LmxhKCk7XG4gICAgICB9IHdoaWxlIChuZXh0ICYmIC9cXHMvLnRlc3QobmV4dCkpO1xuICAgIH0gZWxzZSBpZiAoJ1wiJyA9PT0gbmV4dCkge1xuICAgICAgcmVwbHkuc3RhcnRUb2tlbignc3RyaW5nUXVvdGUnKTtcbiAgICAgIGNvbnN0IG9wZW5DaGFyID0gYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgY29uc3QgbGEgPSBhd2FpdCByZXBseS5sYSgpO1xuICAgICAgICBpZiAobGEgPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiByZXBseS50aHJvd0Vycm9yKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxhID09PSAnXFxcXCcpIHtcbiAgICAgICAgICBhd2FpdCByZXBseS5hZHZhbmNlKDIpO1xuICAgICAgICB9IGVsc2UgaWYgKGxhID09PSBvcGVuQ2hhcikge1xuICAgICAgICAgIGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgICAgICAgICByZXBseS5lbWl0VG9rZW4oKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCd7JyA9PT0gbmV4dCkge1xuICAgICAgY29uc3QgbmV4dDIgPSBhd2FpdCByZXBseS5sYSgyKTtcbiAgICAgIGlmIChuZXh0MiAmJiAvXFxkLy50ZXN0KG5leHQyKSkge1xuICAgICAgICBwYXJzZUxpdGVyYWxTdHJpbmcocmVwbHksIHN1Yik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlcGx5LnN0YXJ0VG9rZW4oSW1hcFRva2VuVHlwZS5hdG9tKTtcbiAgICAgIGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgICAgIG5leHQgPSBhd2FpdCByZXBseS5sYSgpO1xuICAgICAgd2hpbGUgKG5leHQgIT0gbnVsbCAmJiAvW14wLTlcXHN7XCJdLy50ZXN0KG5leHQpKSB7XG4gICAgICAgIGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgICAgICAgbmV4dCA9IGF3YWl0IHJlcGx5LmxhKCk7XG4gICAgICB9XG4gICAgICByZXBseS5lbWl0VG9rZW4oKTtcbiAgICB9XG4gICAgbmV4dCA9ICBhd2FpdCByZXBseS5sYSgpO1xuICB9XG59O1xuXG5hc3luYyBmdW5jdGlvbiBwYXJzZUxpdGVyYWxTdHJpbmcocmVwbHk6IFBhcmFtZXRlcnM8UGFyc2VMZXg8c3RyaW5nPj5bMF0sIHN1YjogUGFyYW1ldGVyczxQYXJzZUxleDxzdHJpbmc+PlsxXSkge1xuICByZXBseS5zdGFydFRva2VuKEltYXBUb2tlblR5cGUuc3RyaW5nTGl0KTtcblxuICBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gIGxldCBudW1TdHIgPSBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gIGxldCBuZXh0ID0gYXdhaXQgcmVwbHkubGEoKTtcbiAgd2hpbGUgKG5leHQgJiYgbmV4dCAhPT0gJ30nKSB7XG4gICAgbnVtU3RyICs9IG5leHQ7XG4gICAgYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICAgIG5leHQgPSBhd2FpdCByZXBseS5sYSgpO1xuICB9XG4gIGNvbnN0IG51bUJ5dGUgPSBwYXJzZUludChudW1TdHIsIDEwKTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IG51bUJ5dGU7KSB7XG4gICAgbmV4dCA9IGF3YWl0IHJlcGx5LmxhKCk7XG4gICAgaWYgKG5leHQgPT0gbnVsbClcbiAgICAgIHJldHVybiByZXBseS50aHJvd0Vycm9yKCk7XG4gICAgaWYgKCEvXFxzLy50ZXN0KG5leHQpKSB7XG4gICAgICBpKys7XG4gICAgfVxuICAgIGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgfVxuICBjb25zdCBjciA9IGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgaWYgKGNyICE9PSAnXFxyJylcbiAgICByZXBseS50aHJvd0Vycm9yKGNyKTtcbiAgY29uc3QgbGYgPSBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gIGlmIChsZiAhPT0gJ1xcbicpXG4gICAgcmVwbHkudGhyb3dFcnJvcihjcik7XG4gIHJlcGx5LmVtaXRUb2tlbigpO1xufVxuIl19
