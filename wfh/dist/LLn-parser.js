"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const util_1 = __importDefault(require("util"));
class Chunk {
    constructor(pos, line, col) {
        this.pos = pos;
        this.line = line;
        this.col = col;
        this.values = [];
        this.isClosed = false;
        this.trackValue = true;
    }
    close(position) {
        this.isClosed = true;
        this.end = position;
        return this;
    }
}
exports.Chunk = Chunk;
class Token extends Chunk {
}
exports.Token = Token;
/**
 * Parser
 * @param input string type
 * @param parseLex
 * @param parseGrammar
 */
function parser(name, input, parseLex, pipeOperators, parseGrammar) {
    const _parseGrammarObs = (la) => {
        return parseGrammar(la);
    };
    let tokens = input.pipe(
    // observeOn(queueScheduler),
    mapChunks(name + '-lexer', parseLex), operators_1.map(chunk => {
        chunk.text = chunk.values.join('');
        delete chunk.values;
        return chunk;
    }));
    if (pipeOperators) {
        for (const operator of pipeOperators)
            tokens = tokens.pipe(operator);
    }
    let result;
    tokens.pipe(operators_1.map(token => [token]), mapChunksObs(name + '-parser', _parseGrammarObs), operators_1.tap(ast => {
        result = ast;
    })).subscribe();
    return result;
}
exports.parser = parser;
function mapChunksObs(name, parse) {
    return function (input) {
        return new rxjs_1.Observable(sub => {
            const la = new LookAhead(name);
            input.subscribe(input => la._write(input), err => sub.error(err), () => {
                la._final();
            });
            try {
                sub.next(parse(la));
                sub.complete();
            }
            catch (err) {
                sub.error(err);
            }
        });
    };
}
exports.mapChunksObs = mapChunksObs;
function mapChunks(name, parse) {
    return function (input) {
        return new rxjs_1.Observable(sub => {
            const la = new LookAhead(name);
            input.subscribe(input => la._write(input), err => sub.error(err), () => {
                la._final();
                const la$ = la;
                la$.startToken = la.startChunk;
                la$.emitToken = function () {
                    const chunk = this.closeChunk();
                    sub.next(chunk);
                    return chunk;
                };
                parse(la$, sub);
                sub.complete();
            });
        });
    };
}
exports.mapChunks = mapChunks;
class LookAhead {
    constructor(name) {
        this.name = name;
        this.line = 1;
        this.column = 1;
        this.currPos = 0;
        this.cacheStartPos = 0;
        this.savedState = {};
        this.cached = [];
    }
    // _retryOnRefuel<R>(parseCb: (ctx: LookAhead<T, TT>) => R): R | Promise<R> {
    //   this.saveState();
    //   try {
    //     return parseCb(this);
    //   } catch (e) {
    //     if (e.message === LookAhead.WAIT_ERROR) {
    //       return new Promise(resolve => {
    //         this.readResolve = resolve;
    //         this.restoreState();
    //       }).then(() => {
    //         return this.retryOnRefuel(parseCb);
    //       }).catch(e => {
    //       });
    //     }
    //     throw e;
    //   }
    // }
    retryOnRefuel(parseCb) {
        return __awaiter(this, void 0, void 0, function* () {
            while (true) {
                this.saveState();
                try {
                    const res = yield Promise.resolve(parseCb(this));
                    return res;
                }
                catch (e) {
                    if (e.code === 'WAIT') {
                        this.restoreState();
                        yield new Promise(resolve => {
                            this.readResolve = resolve;
                        });
                    }
                    else {
                        throw e;
                    }
                }
            }
        });
    }
    _write(values) {
        for (const v of values)
            this.cached.push(v);
        if (this.readResolve != null) {
            const resolve = this.readResolve;
            if (this.waitForPos < this.cacheStartPos + this.cached.length) {
                delete this.readResolve;
                delete this.waitForPos;
                resolve();
            }
        }
    }
    _final() {
        this._write([null]);
    }
    get position() {
        return this.currPos;
    }
    /**
       * look ahead for 1 character
       * @param num default is 1
       * @return null if EOF is reached
       */
    la(num = 1) {
        const readPos = this.currPos + num - 1;
        return this.read(readPos);
    }
    advance(count = 1) {
        // return new Promise(resolve => {
        let currValue;
        let i = 0;
        while (i++ < count) {
            const value = this.la(1);
            if (value == null) {
                this.throwError('Unexpect EOF'); // , stack);
                break;
            }
            this.currPos++;
            this.column++;
            if (value === '\n') {
                this.line++;
                this.column = 1;
            }
            if (this.currPos - this.cacheStartPos > 0x100000) {
                this.cached.splice(0, 0x100000);
                this.cacheStartPos += 0x100000;
            }
            if (this.currChunk && !this.currChunk.isClosed && this.currChunk.trackValue) {
                this.currChunk.values.push(value);
            }
            currValue = value;
        }
        this.lastConsumed = currValue;
        return currValue;
    }
    isNext(...values) {
        return this.isNextWith(values);
    }
    /**
       * Same as `return la(1) === values[0] && la(2) === values[1]...`
       * @param values lookahead string or tokens
       */
    isNextWith(values, isEqual = (a, b) => a === b) {
        let compareTo;
        let compareFn;
        compareTo = values;
        compareFn = isEqual;
        let i = 0;
        const l = compareTo.length;
        while (true) {
            if (i === l)
                return true;
            const next = this.la(i + 1);
            if (next == null)
                return false; // EOF
            else if (!compareFn(next, compareTo[i]))
                return false;
            i++;
        }
    }
    assertAdvance(...values) {
        return this.assertAdvanceWith(values);
    }
    assertAdvanceWith(values, isEqual = (a, b) => a === b) {
        return __awaiter(this, void 0, void 0, function* () {
            let compareTo;
            let compareFn;
            compareTo = values;
            compareFn = isEqual;
            let i = 0;
            const l = compareTo.length;
            while (true) {
                if (i === l)
                    return true;
                const next = yield this.advance(i + 1);
                if (next == null)
                    this.throwError('EOF', new Error().stack); // EOF
                else if (!compareFn(next, compareTo[i]))
                    this.throwError(util_1.default.inspect(next), new Error().stack, compareTo[i] + '');
                i++;
            }
        });
    }
    throwError(unexpected = 'End-of-stream', stack, expect) {
        // tslint:disable-next-line: max-line-length
        throw new Error(`In ${this.name} unexpected ${JSON.stringify(unexpected)}` +
            (expect ? `(expecting "${expect}")` : '') +
            `at ${this.getCurrentPosInfo()}, ${stack ? 'previous stack:' + stack : ''}`);
    }
    getCurrentPosInfo() {
        return `offset ${this.currPos} [${this.line}:${this.column}]`;
    }
    startChunk(type, trackValue = true) {
        if (this.currChunk && !this.currChunk.isClosed)
            this.currChunk.close(this.currPos);
        this.currChunk = new Chunk(this.currPos, this.line, this.column);
        this.currChunk.trackValue = trackValue;
        this.currChunk.type = type;
        return this.currChunk;
    }
    closeChunk() {
        return this.currChunk.close(this.currPos);
    }
    saveState() {
        this.savedState.line = this.line;
        this.savedState.column = this.column;
        this.savedState.currPos = this.currPos;
        this.savedState.currChunk = this.currChunk;
        this.savedState.cacheStartPos = this.cacheStartPos;
    }
    restoreState() {
        this.line = this.savedState.line;
        this.column = this.savedState.column;
        this.currPos = this.savedState.currPos;
        this.currChunk = this.savedState.currChunk;
        this.cacheStartPos = this.savedState.cacheStartPos;
    }
    /**
       * Do not read postion less than 0
       * @param pos
       */
    read(pos) {
        const cacheOffset = pos - this.cacheStartPos;
        if (cacheOffset < 0) {
            throw new Error(`Can not read behind stream cache, at position: ${pos}`);
        }
        if (cacheOffset < this.cached.length) {
            return this.cached[cacheOffset];
        }
        else {
            this.waitForPos = pos;
            const err = new WaitError();
            throw err;
            // return new Promise(resolve => {
            //   this.readResolve = resolve;
            // });
        }
    }
}
exports.LookAhead = LookAhead;
class WaitError extends Error {
    constructor() {
        super();
        this.code = 'WAIT';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTExuLXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL0xMbi1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUFnRTtBQUNoRSw4Q0FBMEM7QUFDMUMsZ0RBQXdCO0FBQ3hCLE1BQWEsS0FBSztJQU9oQixZQUNTLEdBQVcsRUFBUyxJQUFZLEVBQVMsR0FBVztRQUFwRCxRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQVMsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUFTLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFON0QsV0FBTSxHQUFTLEVBQUUsQ0FBQztRQUVsQixhQUFRLEdBQUcsS0FBSyxDQUFDO1FBQ2pCLGVBQVUsR0FBRyxJQUFJLENBQUM7SUFJZixDQUFDO0lBRUosS0FBSyxDQUFDLFFBQWdCO1FBQ3BCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDO1FBQ3BCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUNGO0FBaEJELHNCQWdCQztBQUVELE1BQWEsS0FBUyxTQUFRLEtBQWdCO0NBRTdDO0FBRkQsc0JBRUM7QUFNRDs7Ozs7R0FLRztBQUNILFNBQWdCLE1BQU0sQ0FDcEIsSUFBWSxFQUNaLEtBQThCLEVBQzlCLFFBQXdCLEVBQ3hCLGFBQW9FLEVBQ3BFLFlBQWdDO0lBR2hDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxFQUEwQixFQUFFLEVBQUU7UUFDdEQsT0FBTyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDMUIsQ0FBQyxDQUFDO0lBRUYsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUk7SUFDckIsNkJBQTZCO0lBQzdCLFNBQVMsQ0FBQyxJQUFJLEdBQUcsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUNwQyxlQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDVCxLQUFrQixDQUFDLElBQUksR0FBRyxLQUFL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QVUsQ0FBQyxhQUFhLENBQUM7SUFDckQsQ0FBQztJQUVEOzs7U0FHRTtJQUNNLElBQUksQ0FBQyxHQUFXO1FBQ3RCLE1BQU0sV0FBVyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDO1FBQzdDLElBQUksV0FBVyxHQUFHLENBQUMsRUFBRTtZQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLGtEQUFrRCxHQUFHLEVBQUUsQ0FBQyxDQUFDO1NBQzFFO1FBQ0QsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7WUFDcEMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1NBQ2pDO2FBQU07WUFDTCxJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQztZQUN0QixNQUFNLEdBQUcsR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQzVCLE1BQU0sR0FBRyxDQUFDO1lBQ1Ysa0NBQWtDO1lBQ2xDLGdDQUFnQztZQUNoQyxNQUFNO1NBQ1A7SUFDSCxDQUFDO0NBQ0Y7QUFsT0QsOEJBa09DO0FBRUQsTUFBTSxTQUFVLFNBQVEsS0FBSztJQUczQjtRQUNFLEtBQUssRUFBRSxDQUFDO1FBSFYsU0FBSSxHQUFHLE1BQU0sQ0FBQztJQUlkLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE9ic2VydmFibGUsIE9wZXJhdG9yRnVuY3Rpb24sIFN1YnNjcmliZXIgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IG1hcCwgdGFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5leHBvcnQgY2xhc3MgQ2h1bms8ViwgVD4ge1xuICB0eXBlOiBUO1xuICB2YWx1ZXM/OiBWW10gPSBbXTtcbiAgZW5kPzogbnVtYmVyO1xuICBpc0Nsb3NlZCA9IGZhbHNlO1xuICB0cmFja1ZhbHVlID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcG9zOiBudW1iZXIsIHB1YmxpYyBsaW5lOiBudW1iZXIsIHB1YmxpYyBjb2w6IG51bWJlclxuICApIHt9XG5cbiAgY2xvc2UocG9zaXRpb246IG51bWJlcikge1xuICAgIHRoaXMuaXNDbG9zZWQgPSB0cnVlO1xuICAgIHRoaXMuZW5kID0gcG9zaXRpb247XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFRva2VuPFQ+IGV4dGVuZHMgQ2h1bms8c3RyaW5nLCBUPiB7XG4gIHRleHQ6IHN0cmluZztcbn1cbi8qKlxuICogWW91IGNhbiBkZWZpbmUgYSBsZXhlciBhcyBhIGZ1bmN0aW9uXG4gKi9cbmV4cG9ydCB0eXBlIFBhcnNlTGV4PEksIFQ+ID0gKGxhOiBMb29rQWhlYWRPYnNlcnZhYmxlPEksVD4sIHN1YjogU3Vic2NyaWJlcjxDaHVuazxJLCBUPj4pID0+IHZvaWQ7XG5leHBvcnQgdHlwZSBQYXJzZUdyYW1tYXI8QSwgVD4gPSAobGE6IExvb2tBaGVhZDxUb2tlbjxUPiwgVD4pID0+IEE7XG4vKipcbiAqIFBhcnNlclxuICogQHBhcmFtIGlucHV0IHN0cmluZyB0eXBlXG4gKiBAcGFyYW0gcGFyc2VMZXggXG4gKiBAcGFyYW0gcGFyc2VHcmFtbWFyIFxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VyPEksIEEsIFQ+KFxuICBuYW1lOiBzdHJpbmcsXG4gIGlucHV0OiBPYnNlcnZhYmxlPEl0ZXJhYmxlPEk+PixcbiAgcGFyc2VMZXg6IFBhcnNlTGV4PEksIFQ+LFxuICBwaXBlT3BlcmF0b3JzOiBJdGVyYWJsZTxPcGVyYXRvckZ1bmN0aW9uPFRva2VuPFQ+LCBUb2tlbjxUPj4+IHwgbnVsbCxcbiAgcGFyc2VHcmFtbWFyOiBQYXJzZUdyYW1tYXI8QSwgVD5cbik6IEEgfCB1bmRlZmluZWQge1xuXG4gIGNvbnN0IF9wYXJzZUdyYW1tYXJPYnMgPSAobGE6IExvb2tBaGVhZDxUb2tlbjxUPiwgVD4pID0+IHtcbiAgICByZXR1cm4gcGFyc2VHcmFtbWFyKGxhKTtcbiAgfTtcblxuICBsZXQgdG9rZW5zID0gaW5wdXQucGlwZShcbiAgICAvLyBvYnNlcnZlT24ocXVldWVTY2hlZHVsZXIpLFxuICAgIG1hcENodW5rcyhuYW1lICsgJy1sZXhlcicsIHBhcnNlTGV4KSxcbiAgICBtYXAoY2h1bmsgPT4ge1xuICAgICAgKGNodW5rIGFzIFRva2VuPFQ+KS50ZXh0ID0gY2h1bmsudmFsdWVzIS5qb2luKCcnKTtcbiAgICAgIGRlbGV0ZSBjaHVuay52YWx1ZXM7XG4gICAgICByZXR1cm4gY2h1bmsgYXMgVG9rZW48VD47XG4gICAgfSlcbiAgKTtcbiAgaWYgKHBpcGVPcGVyYXRvcnMpIHtcbiAgICBmb3IgKGNvbnN0IG9wZXJhdG9yIG9mIHBpcGVPcGVyYXRvcnMpXG4gICAgICB0b2tlbnMgPSB0b2tlbnMucGlwZShvcGVyYXRvcik7XG4gIH1cblxuICBsZXQgcmVzdWx0OiBBIHwgdW5kZWZpbmVkO1xuICB0b2tlbnMucGlwZShcbiAgICBtYXAodG9rZW4gPT4gW3Rva2VuXSksXG4gICAgbWFwQ2h1bmtzT2JzKG5hbWUgKyAnLXBhcnNlcicsIF9wYXJzZUdyYW1tYXJPYnMpLFxuICAgIHRhcChhc3QgPT4ge1xuICAgICAgcmVzdWx0ID0gYXN0O1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXBDaHVua3NPYnM8SSwgTz4obmFtZTogc3RyaW5nLCBwYXJzZTogKGxhOiBMb29rQWhlYWQ8ST4pID0+IE8pOlxuKGlucHV0OiBPYnNlcnZhYmxlPEl0ZXJhYmxlPEk+Pik9PiBPYnNlcnZhYmxlPE8+IHtcblxuICByZXR1cm4gZnVuY3Rpb24oaW5wdXQ6IE9ic2VydmFibGU8SXRlcmFibGU8ST4+KSB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPE8+KHN1YiA9PiB7XG4gICAgICBjb25zdCBsYSA9IG5ldyBMb29rQWhlYWQ8ST4obmFtZSk7XG4gICAgICBpbnB1dC5zdWJzY3JpYmUoaW5wdXQgPT4gbGEuX3dyaXRlKGlucHV0KSxcbiAgICAgICAgZXJyID0+IHN1Yi5lcnJvcihlcnIpLFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgbGEuX2ZpbmFsKCk7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgICB0cnkge1xuICAgICAgICBzdWIubmV4dChwYXJzZShsYSkpO1xuICAgICAgICBzdWIuY29tcGxldGUoKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBzdWIuZXJyb3IoZXJyKTtcbiAgICAgIH1cblxuICAgIH0pO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFwQ2h1bmtzPEksIFQ+KFxuICBuYW1lOiBzdHJpbmcsXG4gIHBhcnNlOiBQYXJzZUxleDxJLCBUPlxuKTogKGlucHV0OiBPYnNlcnZhYmxlPEl0ZXJhYmxlPEk+Pik9PiBPYnNlcnZhYmxlPENodW5rPEksIFQ+PiB7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGlucHV0OiBPYnNlcnZhYmxlPEl0ZXJhYmxlPEk+Pikge1xuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxDaHVuazxJLCBUPj4oc3ViID0+IHtcbiAgICAgIGNvbnN0IGxhID0gbmV3IExvb2tBaGVhZDxJLCBUPihuYW1lKTtcblxuICAgICAgaW5wdXQuc3Vic2NyaWJlKGlucHV0ID0+IGxhLl93cml0ZShpbnB1dCksXG4gICAgICAgIGVyciA9PiBzdWIuZXJyb3IoZXJyKSxcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgIGxhLl9maW5hbCgpO1xuICAgICAgICAgIGNvbnN0IGxhJCA9IGxhIGFzIExvb2tBaGVhZE9ic2VydmFibGU8SSwgVD47XG4gICAgICAgICAgbGEkLnN0YXJ0VG9rZW4gPSBsYS5zdGFydENodW5rO1xuXG4gICAgICAgICAgbGEkLmVtaXRUb2tlbiA9IGZ1bmN0aW9uKHRoaXM6IExvb2tBaGVhZE9ic2VydmFibGU8SSwgVD4pIHtcbiAgICAgICAgICAgIGNvbnN0IGNodW5rID0gdGhpcy5jbG9zZUNodW5rKCk7XG4gICAgICAgICAgICBzdWIubmV4dChjaHVuayk7XG4gICAgICAgICAgICByZXR1cm4gY2h1bms7XG4gICAgICAgICAgfTtcbiAgICAgICAgICBwYXJzZShsYSQsIHN1Yik7XG4gICAgICAgICAgc3ViLmNvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfSk7XG4gIH07XG59XG5cbmludGVyZmFjZSBMb29rQWhlYWRTdGF0ZTxULCBUVD4ge1xuICBsaW5lOiBudW1iZXI7XG4gIGNvbHVtbjogbnVtYmVyO1xuICBjdXJyUG9zOiBudW1iZXI7XG4gIGNhY2hlU3RhcnRQb3M6IG51bWJlcjtcbiAgY3VyckNodW5rOiBDaHVuazxULCBUVD47XG59XG5leHBvcnQgY2xhc3MgTG9va0FoZWFkPFQsIFRUID0gYW55PiB7XG4gIHN0YXRpYyBXQUlUX0VSUk9SOiAnV0FJVF9FUlJPUic7XG4gIGNhY2hlZDogQXJyYXk8VHxudWxsPjtcbiAgbGluZSA9IDE7XG4gIGNvbHVtbiA9IDE7XG4gIGxhc3RDb25zdW1lZDogVDtcbiAgcHJpdmF0ZSBjdXJyUG9zID0gMDtcbiAgcHJpdmF0ZSBjYWNoZVN0YXJ0UG9zID0gMDtcbiAgcHJpdmF0ZSByZWFkUmVzb2x2ZTogKCkgPT4gdm9pZCB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSB3YWl0Rm9yUG9zOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgY3VyckNodW5rOiBDaHVuazxULCBUVD47XG5cbiAgcHJpdmF0ZSBzYXZlZFN0YXRlOiBMb29rQWhlYWRTdGF0ZTxULCBUVD4gPSB7fSBhcyBMb29rQWhlYWRTdGF0ZTxULCBUVD47XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIG5hbWU6IHN0cmluZykge1xuICAgIHRoaXMuY2FjaGVkID0gW107XG4gIH1cblxuICAvLyBfcmV0cnlPblJlZnVlbDxSPihwYXJzZUNiOiAoY3R4OiBMb29rQWhlYWQ8VCwgVFQ+KSA9PiBSKTogUiB8IFByb21pc2U8Uj4ge1xuICAvLyAgIHRoaXMuc2F2ZVN0YXRlKCk7XG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIHJldHVybiBwYXJzZUNiKHRoaXMpO1xuICAvLyAgIH0gY2F0Y2ggKGUpIHtcbiAgLy8gICAgIGlmIChlLm1lc3NhZ2UgPT09IExvb2tBaGVhZC5XQUlUX0VSUk9SKSB7XG4gIC8vICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgLy8gICAgICAgICB0aGlzLnJlYWRSZXNvbHZlID0gcmVzb2x2ZTtcbiAgLy8gICAgICAgICB0aGlzLnJlc3RvcmVTdGF0ZSgpO1xuICAvLyAgICAgICB9KS50aGVuKCgpID0+IHtcbiAgLy8gICAgICAgICByZXR1cm4gdGhpcy5yZXRyeU9uUmVmdWVsKHBhcnNlQ2IpO1xuICAvLyAgICAgICB9KS5jYXRjaChlID0+IHtcblxuICAvLyAgICAgICB9KTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIHRocm93IGU7XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgYXN5bmMgcmV0cnlPblJlZnVlbDxSPihwYXJzZUNiOiAoY3R4OiBMb29rQWhlYWQ8VCwgVFQ+KSA9PiBSKTogUHJvbWlzZTxSPiB7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHRoaXMuc2F2ZVN0YXRlKCk7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXMgPSBhd2FpdCBQcm9taXNlLnJlc29sdmUocGFyc2VDYih0aGlzKSk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGlmIChlLmNvZGUgPT09ICdXQUlUJykge1xuICAgICAgICAgIHRoaXMucmVzdG9yZVN0YXRlKCk7XG4gICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgICB0aGlzLnJlYWRSZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgX3dyaXRlKHZhbHVlczogSXRlcmFibGU8VHxudWxsPikge1xuICAgIGZvciAoY29uc3QgdiBvZiB2YWx1ZXMpXG4gICAgICB0aGlzLmNhY2hlZC5wdXNoKHYpO1xuXG4gICAgaWYgKHRoaXMucmVhZFJlc29sdmUgIT0gbnVsbCkge1xuICAgICAgY29uc3QgcmVzb2x2ZSA9IHRoaXMucmVhZFJlc29sdmU7XG4gICAgICBpZiAodGhpcy53YWl0Rm9yUG9zISA8IHRoaXMuY2FjaGVTdGFydFBvcyArIHRoaXMuY2FjaGVkLmxlbmd0aCkge1xuICAgICAgICBkZWxldGUgdGhpcy5yZWFkUmVzb2x2ZTtcbiAgICAgICAgZGVsZXRlIHRoaXMud2FpdEZvclBvcztcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIF9maW5hbCgpIHtcbiAgICB0aGlzLl93cml0ZShbbnVsbF0pO1xuICB9XG5cbiAgZ2V0IHBvc2l0aW9uKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuY3VyclBvcztcbiAgfVxuXG4gIC8qKlxuXHQgKiBsb29rIGFoZWFkIGZvciAxIGNoYXJhY3RlclxuXHQgKiBAcGFyYW0gbnVtIGRlZmF1bHQgaXMgMVxuXHQgKiBAcmV0dXJuIG51bGwgaWYgRU9GIGlzIHJlYWNoZWRcblx0ICovXG4gIGxhKG51bSA9IDEpOiBUIHwgbnVsbCB7XG4gICAgY29uc3QgcmVhZFBvcyA9IHRoaXMuY3VyclBvcyArIG51bSAtIDE7XG4gICAgcmV0dXJuIHRoaXMucmVhZChyZWFkUG9zKTtcbiAgfVxuXG4gIGFkdmFuY2UoY291bnQgPSAxKTogVCB7XG4gICAgLy8gcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgIGxldCBjdXJyVmFsdWU6IFQ7XG4gICAgbGV0IGkgPSAwO1xuICAgIHdoaWxlIChpKysgPCBjb3VudCkge1xuICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLmxhKDEpO1xuICAgICAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICAgICAgdGhpcy50aHJvd0Vycm9yKCdVbmV4cGVjdCBFT0YnKTsgLy8gLCBzdGFjayk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgdGhpcy5jdXJyUG9zKys7XG4gICAgICB0aGlzLmNvbHVtbisrO1xuICAgICAgaWYgKCh2YWx1ZSBhcyBhbnkpID09PSAnXFxuJykge1xuICAgICAgICB0aGlzLmxpbmUrKztcbiAgICAgICAgdGhpcy5jb2x1bW4gPSAxO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuY3VyclBvcyAtIHRoaXMuY2FjaGVTdGFydFBvcyA+IDB4MTAwMDAwKSB7XG4gICAgICAgIHRoaXMuY2FjaGVkLnNwbGljZSgwLCAweDEwMDAwMCk7XG4gICAgICAgIHRoaXMuY2FjaGVTdGFydFBvcyArPSAweDEwMDAwMDtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmN1cnJDaHVuayAmJiAhdGhpcy5jdXJyQ2h1bmsuaXNDbG9zZWQgJiYgdGhpcy5jdXJyQ2h1bmsudHJhY2tWYWx1ZSkge1xuICAgICAgICB0aGlzLmN1cnJDaHVuay52YWx1ZXMhLnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgICAgY3VyclZhbHVlID0gdmFsdWU7XG4gICAgfVxuICAgIHRoaXMubGFzdENvbnN1bWVkID0gY3VyclZhbHVlITtcbiAgICByZXR1cm4gY3VyclZhbHVlITtcbiAgfVxuXG4gIGlzTmV4dCguLi52YWx1ZXM6IFRbXSkge1xuICAgIHJldHVybiB0aGlzLmlzTmV4dFdpdGgodmFsdWVzKTtcbiAgfVxuICAvKipcblx0ICogU2FtZSBhcyBgcmV0dXJuIGxhKDEpID09PSB2YWx1ZXNbMF0gJiYgbGEoMikgPT09IHZhbHVlc1sxXS4uLmBcblx0ICogQHBhcmFtIHZhbHVlcyBsb29rYWhlYWQgc3RyaW5nIG9yIHRva2Vuc1xuXHQgKi9cbiAgaXNOZXh0V2l0aDxDPih2YWx1ZXM6IENbXSwgaXNFcXVhbCA9IChhOiBULCBiOiBDKSA9PiBhIGFzIGFueSA9PT0gYik6IGJvb2xlYW4ge1xuICAgIGxldCBjb21wYXJlVG86IENbXXwgc3RyaW5nO1xuICAgIGxldCBjb21wYXJlRm46ICguLi5hcmc6IGFueVtdKSA9PiBib29sZWFuO1xuICAgIGNvbXBhcmVUbyA9IHZhbHVlcztcbiAgICBjb21wYXJlRm4gPSBpc0VxdWFsO1xuICAgIGxldCBpID0gMDtcbiAgICBjb25zdCBsID0gY29tcGFyZVRvLmxlbmd0aDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgaWYgKGkgPT09IGwpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgY29uc3QgbmV4dCA9IHRoaXMubGEoaSArIDEpO1xuICAgICAgaWYgKG5leHQgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBFT0ZcbiAgICAgIGVsc2UgaWYgKCFjb21wYXJlRm4obmV4dCwgY29tcGFyZVRvW2ldKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuXG4gIGFzc2VydEFkdmFuY2UoLi4udmFsdWVzOiBUW10pIHtcbiAgICByZXR1cm4gdGhpcy5hc3NlcnRBZHZhbmNlV2l0aCh2YWx1ZXMpO1xuICB9XG5cbiAgYXN5bmMgYXNzZXJ0QWR2YW5jZVdpdGg8Qz4odmFsdWVzOiBDW10sIGlzRXF1YWwgPSAoYTogVCwgYjogQykgPT4gYSBhcyBhbnkgPT09IGIpIHtcbiAgICBsZXQgY29tcGFyZVRvOiBDW118IHN0cmluZztcbiAgICBsZXQgY29tcGFyZUZuOiAoLi4uYXJnOiBhbnlbXSkgPT4gYm9vbGVhbjtcbiAgICBjb21wYXJlVG8gPSB2YWx1ZXM7XG4gICAgY29tcGFyZUZuID0gaXNFcXVhbDtcbiAgICBsZXQgaSA9IDA7XG4gICAgY29uc3QgbCA9IGNvbXBhcmVUby5sZW5ndGg7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGlmIChpID09PSBsKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIGNvbnN0IG5leHQgPSBhd2FpdCB0aGlzLmFkdmFuY2UoaSArIDEpO1xuICAgICAgaWYgKG5leHQgPT0gbnVsbClcbiAgICAgICAgdGhpcy50aHJvd0Vycm9yKCdFT0YnLCBuZXcgRXJyb3IoKS5zdGFjayk7IC8vIEVPRlxuICAgICAgZWxzZSBpZiAoIWNvbXBhcmVGbihuZXh0LCBjb21wYXJlVG9baV0pKVxuICAgICAgICB0aGlzLnRocm93RXJyb3IodXRpbC5pbnNwZWN0KG5leHQpLCBuZXcgRXJyb3IoKS5zdGFjaywgY29tcGFyZVRvW2ldICsgJycpO1xuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuXG4gIHRocm93RXJyb3IodW5leHBlY3RlZCA9ICdFbmQtb2Ytc3RyZWFtJywgc3RhY2s/OiBhbnksIGV4cGVjdD86IHN0cmluZykge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbiAke3RoaXMubmFtZX0gdW5leHBlY3RlZCAke0pTT04uc3RyaW5naWZ5KHVuZXhwZWN0ZWQpfWArXG4gICAgKGV4cGVjdCA/IGAoZXhwZWN0aW5nIFwiJHtleHBlY3R9XCIpYCA6ICcnKSArXG4gICAgYGF0ICR7dGhpcy5nZXRDdXJyZW50UG9zSW5mbygpfSwgJHtzdGFjayA/ICdwcmV2aW91cyBzdGFjazonICsgc3RhY2sgOiAnJ31gKTtcbiAgfVxuXG4gIGdldEN1cnJlbnRQb3NJbmZvKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBvZmZzZXQgJHt0aGlzLmN1cnJQb3N9IFske3RoaXMubGluZX06JHt0aGlzLmNvbHVtbn1dYDtcbiAgfVxuXG4gIHN0YXJ0Q2h1bmsodHlwZTogVFQsIHRyYWNrVmFsdWUgPSB0cnVlKSB7XG4gICAgaWYgKHRoaXMuY3VyckNodW5rICYmICF0aGlzLmN1cnJDaHVuay5pc0Nsb3NlZClcbiAgICAgIHRoaXMuY3VyckNodW5rLmNsb3NlKHRoaXMuY3VyclBvcyk7XG4gICAgdGhpcy5jdXJyQ2h1bmsgPSBuZXcgQ2h1bms8VCwgVFQ+KHRoaXMuY3VyclBvcywgdGhpcy5saW5lLCB0aGlzLmNvbHVtbik7XG4gICAgdGhpcy5jdXJyQ2h1bmsudHJhY2tWYWx1ZSA9IHRyYWNrVmFsdWU7XG4gICAgdGhpcy5jdXJyQ2h1bmsudHlwZSA9IHR5cGU7XG4gICAgcmV0dXJuIHRoaXMuY3VyckNodW5rO1xuICB9XG5cbiAgY2xvc2VDaHVuaygpIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyQ2h1bmsuY2xvc2UodGhpcy5jdXJyUG9zKTtcbiAgfVxuXG4gIHByaXZhdGUgc2F2ZVN0YXRlKCkge1xuICAgIHRoaXMuc2F2ZWRTdGF0ZS5saW5lID0gdGhpcy5saW5lO1xuICAgIHRoaXMuc2F2ZWRTdGF0ZS5jb2x1bW4gPSB0aGlzLmNvbHVtbjtcbiAgICB0aGlzLnNhdmVkU3RhdGUuY3VyclBvcyA9IHRoaXMuY3VyclBvcztcbiAgICB0aGlzLnNhdmVkU3RhdGUuY3VyckNodW5rID0gdGhpcy5jdXJyQ2h1bms7XG4gICAgdGhpcy5zYXZlZFN0YXRlLmNhY2hlU3RhcnRQb3MgPSB0aGlzLmNhY2hlU3RhcnRQb3M7XG4gIH1cblxuICBwcml2YXRlIHJlc3RvcmVTdGF0ZSgpIHtcbiAgICB0aGlzLmxpbmUgPSB0aGlzLnNhdmVkU3RhdGUubGluZTtcbiAgICB0aGlzLmNvbHVtbiA9IHRoaXMuc2F2ZWRTdGF0ZS5jb2x1bW47XG4gICAgdGhpcy5jdXJyUG9zID0gdGhpcy5zYXZlZFN0YXRlLmN1cnJQb3M7XG4gICAgdGhpcy5jdXJyQ2h1bmsgPSB0aGlzLnNhdmVkU3RhdGUuY3VyckNodW5rO1xuICAgIHRoaXMuY2FjaGVTdGFydFBvcyA9IHRoaXMuc2F2ZWRTdGF0ZS5jYWNoZVN0YXJ0UG9zO1xuICB9XG5cbiAgLyoqXG5cdCAqIERvIG5vdCByZWFkIHBvc3Rpb24gbGVzcyB0aGFuIDBcblx0ICogQHBhcmFtIHBvcyBcblx0ICovXG4gIHByaXZhdGUgcmVhZChwb3M6IG51bWJlcik6IFQgfCBudWxsIHtcbiAgICBjb25zdCBjYWNoZU9mZnNldCA9IHBvcyAtIHRoaXMuY2FjaGVTdGFydFBvcztcbiAgICBpZiAoY2FjaGVPZmZzZXQgPCAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbiBub3QgcmVhZCBiZWhpbmQgc3RyZWFtIGNhY2hlLCBhdCBwb3NpdGlvbjogJHtwb3N9YCk7XG4gICAgfVxuICAgIGlmIChjYWNoZU9mZnNldCA8IHRoaXMuY2FjaGVkLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGVkW2NhY2hlT2Zmc2V0XTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy53YWl0Rm9yUG9zID0gcG9zO1xuICAgICAgY29uc3QgZXJyID0gbmV3IFdhaXRFcnJvcigpO1xuICAgICAgdGhyb3cgZXJyO1xuICAgICAgLy8gcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgLy8gICB0aGlzLnJlYWRSZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgIC8vIH0pO1xuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBXYWl0RXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvZGUgPSAnV0FJVCc7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIExvb2tBaGVhZE9ic2VydmFibGU8ViwgVD4gZXh0ZW5kcyBMb29rQWhlYWQ8ViwgVD4ge1xuICBzdGFydFRva2VuOiBMb29rQWhlYWQ8ViwgVD5bJ3N0YXJ0Q2h1bmsnXTtcbiAgZW1pdFRva2VuKCk6IENodW5rPFYsIFQ+O1xufVxuXG4iXX0=