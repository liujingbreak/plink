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
        return rxjs_1.from(parseGrammar(la));
    };
    let tokens = input.pipe(operators_1.observeOn(rxjs_1.queueScheduler), mapChunks(name + '-lexer', parseLex), operators_1.map(chunk => {
        chunk.text = chunk.values.join('');
        delete chunk.values;
        return chunk;
    }));
    if (pipeOperators) {
        for (const operator of pipeOperators)
            tokens = tokens.pipe(operator);
    }
    return tokens.pipe(operators_1.map(token => [token]), mapChunksObs(name + '-parser', _parseGrammarObs)).toPromise();
}
exports.parser = parser;
function mapChunksObs(name, parse) {
    return function (input) {
        return new rxjs_1.Observable(sub => {
            const la = new LookAhead(name);
            input.subscribe(input => la._write(input), err => sub.error(err), () => la._final());
            parse(la).subscribe(ouput => sub.next(ouput), err => sub.error(err), () => sub.complete());
        });
    };
}
exports.mapChunksObs = mapChunksObs;
function mapChunks(name, parse) {
    return function (input) {
        return new rxjs_1.Observable(sub => {
            const la = new LookAhead(name);
            input.subscribe(input => la._write(input), err => sub.error(err), () => la._final());
            const la$ = la;
            la$.startToken = la.startChunk;
            la$.emitToken = function () {
                const chunk = this.closeChunk();
                sub.next(chunk);
                return chunk;
            };
            parse(la$, sub)
                .then(() => sub.complete());
        });
    };
}
exports.mapChunks = mapChunks;
class LookAhead {
    constructor(name) {
        this.name = name;
        // isString: boolean;
        this.line = 1;
        this.column = 1;
        this.currPos = 0;
        this.cacheStartPos = 0; // Currently is always same as currPos
        this.cached = [];
    }
    // _writeBuf(buf: Uint8Array) {
    //   this.cached = this.cached.concat(Array.from(buf));
    // }
    _write(values) {
        for (const v of values)
            this.cached.push(v);
        // console.log('_writeAndResolve resolve ', this.cached.length);
        if (this.readResolve != null) {
            const resolve = this.readResolve;
            const cacheOffset = this.waitForPos - this.cacheStartPos;
            if (cacheOffset < this.cached.length) {
                delete this.readResolve;
                delete this.waitForPos;
                resolve(this.cached[cacheOffset]);
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
    // lb(num = 1): T | null {
    //   const pos = this.currPos - (num - 1);
    //   if (pos < 0)
    //     return null;
    //   return this.read(pos);
    // }
    advance(count = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            let currValue;
            let i = 0;
            while (i++ < count) {
                const value = yield this.la(1);
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
        });
    }
    isNext(...values) {
        return this.isNextWith(values);
    }
    /**
       * Same as `return la(1) === values[0] && la(2) === values[1]...`
       * @param values lookahead string or tokens
       */
    isNextWith(values, isEqual = (a, b) => a === b) {
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
                const next = yield this.la(i + 1);
                if (next == null)
                    return false; // EOF
                else if (!compareFn(next, compareTo[i]))
                    return false;
                i++;
            }
        });
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
                    this.throwError(util_1.default.inspect(next), new Error().stack, compareTo.join(','));
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
            return Promise.resolve(this.cached[cacheOffset]);
        }
        else {
            this.waitForPos = pos;
            return new Promise(resolve => {
                this.readResolve = resolve;
            });
        }
    }
}
exports.LookAhead = LookAhead;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMtTExuLXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FzeW5jLUxMbi1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUFvRjtBQUNwRiw4Q0FBOEM7QUFDOUMsZ0RBQXdCO0FBQ3hCLE1BQWEsS0FBSztJQU9oQixZQUNTLEdBQVcsRUFBUyxJQUFZLEVBQVMsR0FBVztRQUFwRCxRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQVMsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUFTLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFON0QsV0FBTSxHQUFTLEVBQUUsQ0FBQztRQUVsQixhQUFRLEdBQUcsS0FBSyxDQUFDO1FBQ2pCLGVBQVUsR0FBRyxJQUFJLENBQUM7SUFJZixDQUFDO0lBRUosS0FBSyxDQUFDLFFBQWdCO1FBQ3BCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDO1FBQ3BCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUNGO0FBaEJELHNCQWdCQztBQUVELE1BQWEsS0FBUyxTQUFRLEtBQWdCO0NBRTdDO0FBRkQsc0JBRUM7QUFNRDs7Ozs7R0FLRztBQUNILFNBQWdCLE1BQU0sQ0FDcEIsSUFBWSxFQUNaLEtBQThCLEVBQzlCLFFBQXdCLEVBQ3hCLGFBQW9FLEVBQ3BFLFlBQWdDO0lBR2hDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxFQUEwQixFQUFFLEVBQUU7UUFDdEQsT0FBTyxXQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDaEMsQ0FBQyxDQUFDO0lBRUYsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FDckIscUJBQVMsQ0FBQyxxQkFBYyxDQUFDLEVBQ3pCLFNBQVMsQ0FBQyxJQUFJLEdBQUcsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUNwQyxlQUFHLENBQUMsS0FB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QUFDLENBQUM7U0FDMUU7UUFDRCxJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtZQUNwQyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1NBQ2xEO2FBQU07WUFDTCxJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQztZQUN0QixPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUMzQixJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQztZQUM3QixDQUFDLENBQUMsQ0FBQztTQUNKO0lBQ0gsQ0FBQztDQUNGO0FBckxELDhCQXFMQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7T2JzZXJ2YWJsZSwgU3Vic2NyaWJlciwgZnJvbSwgT3BlcmF0b3JGdW5jdGlvbiwgcXVldWVTY2hlZHVsZXJ9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHttYXAsIG9ic2VydmVPbn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5leHBvcnQgY2xhc3MgQ2h1bms8ViwgVD4ge1xuICB0eXBlOiBUO1xuICB2YWx1ZXM/OiBWW10gPSBbXTtcbiAgZW5kPzogbnVtYmVyO1xuICBpc0Nsb3NlZCA9IGZhbHNlO1xuICB0cmFja1ZhbHVlID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcG9zOiBudW1iZXIsIHB1YmxpYyBsaW5lOiBudW1iZXIsIHB1YmxpYyBjb2w6IG51bWJlclxuICApIHt9XG5cbiAgY2xvc2UocG9zaXRpb246IG51bWJlcikge1xuICAgIHRoaXMuaXNDbG9zZWQgPSB0cnVlO1xuICAgIHRoaXMuZW5kID0gcG9zaXRpb247XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFRva2VuPFQ+IGV4dGVuZHMgQ2h1bms8c3RyaW5nLCBUPiB7XG4gIHRleHQ6IHN0cmluZztcbn1cbi8qKlxuICogWW91IGNhbiBkZWZpbmUgYSBsZXhlciBhcyBhIGZ1bmN0aW9uXG4gKi9cbmV4cG9ydCB0eXBlIFBhcnNlTGV4PEksIFQ+ID0gKGxhOiBMb29rQWhlYWRPYnNlcnZhYmxlPEksVD4sIHN1YjogU3Vic2NyaWJlcjxDaHVuazxJLCBUPj4pID0+IFByb21pc2U8YW55PjtcbmV4cG9ydCB0eXBlIFBhcnNlR3JhbW1hcjxBLCBUPiA9IChsYTogTG9va0FoZWFkPFRva2VuPFQ+LCBUPikgPT4gUHJvbWlzZTxBPjtcbi8qKlxuICogUGFyc2VyXG4gKiBAcGFyYW0gaW5wdXQgc3RyaW5nIHR5cGVcbiAqIEBwYXJhbSBwYXJzZUxleCBcbiAqIEBwYXJhbSBwYXJzZUdyYW1tYXIgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZXI8SSwgQSwgVD4oXG4gIG5hbWU6IHN0cmluZyxcbiAgaW5wdXQ6IE9ic2VydmFibGU8SXRlcmFibGU8ST4+LFxuICBwYXJzZUxleDogUGFyc2VMZXg8SSwgVD4sXG4gIHBpcGVPcGVyYXRvcnM6IEl0ZXJhYmxlPE9wZXJhdG9yRnVuY3Rpb248VG9rZW48VD4sIFRva2VuPFQ+Pj4gfCBudWxsLFxuICBwYXJzZUdyYW1tYXI6IFBhcnNlR3JhbW1hcjxBLCBUPlxuKTogUHJvbWlzZTxBPiB7XG5cbiAgY29uc3QgX3BhcnNlR3JhbW1hck9icyA9IChsYTogTG9va0FoZWFkPFRva2VuPFQ+LCBUPikgPT4ge1xuICAgIHJldHVybiBmcm9tKHBhcnNlR3JhbW1hcihsYSkpO1xuICB9O1xuXG4gIGxldCB0b2tlbnMgPSBpbnB1dC5waXBlKFxuICAgIG9ic2VydmVPbihxdWV1ZVNjaGVkdWxlciksXG4gICAgbWFwQ2h1bmtzKG5hbWUgKyAnLWxleGVyJywgcGFyc2VMZXgpLFxuICAgIG1hcChjaHVuayA9PiB7XG4gICAgICAoY2h1bmsgYXMgVG9rZW48VD4pLnRleHQgPSBjaHVuay52YWx1ZXMhLmpvaW4oJycpO1xuICAgICAgZGVsZXRlIGNodW5rLnZhbHVlcztcbiAgICAgIHJldHVybiBjaHVuayBhcyBUb2tlbjxUPjtcbiAgICB9KVxuICApO1xuICBpZiAocGlwZU9wZXJhdG9ycykge1xuICAgIGZvciAoY29uc3Qgb3BlcmF0b3Igb2YgcGlwZU9wZXJhdG9ycylcbiAgICAgIHRva2VucyA9IHRva2Vucy5waXBlKG9wZXJhdG9yKTtcbiAgfVxuXG4gIHJldHVybiB0b2tlbnMucGlwZShcbiAgICBtYXAodG9rZW4gPT4gW3Rva2VuXSksXG4gICAgbWFwQ2h1bmtzT2JzKG5hbWUgKyAnLXBhcnNlcicsIF9wYXJzZUdyYW1tYXJPYnMpXG4gICkudG9Qcm9taXNlKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXBDaHVua3NPYnM8SSwgTz4obmFtZTogc3RyaW5nLCBwYXJzZTogKGxhOiBMb29rQWhlYWQ8ST4pID0+IE9ic2VydmFibGU8Tz4pOlxuKGlucHV0OiBPYnNlcnZhYmxlPEl0ZXJhYmxlPEk+Pik9PiBPYnNlcnZhYmxlPE8+IHtcblxuICByZXR1cm4gZnVuY3Rpb24oaW5wdXQ6IE9ic2VydmFibGU8SXRlcmFibGU8ST4+KSB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPE8+KHN1YiA9PiB7XG4gICAgICBjb25zdCBsYSA9IG5ldyBMb29rQWhlYWQ8ST4obmFtZSk7XG4gICAgICBpbnB1dC5zdWJzY3JpYmUoaW5wdXQgPT4gbGEuX3dyaXRlKGlucHV0KSxcbiAgICAgICAgZXJyID0+IHN1Yi5lcnJvcihlcnIpLFxuICAgICAgICAoKSA9PiBsYS5fZmluYWwoKVxuICAgICAgKTtcbiAgICAgIHBhcnNlKGxhKS5zdWJzY3JpYmUoXG4gICAgICAgIG91cHV0ID0+IHN1Yi5uZXh0KG91cHV0KSxcbiAgICAgICAgZXJyID0+IHN1Yi5lcnJvcihlcnIpLFxuICAgICAgICAoKSA9PiBzdWIuY29tcGxldGUoKVxuICAgICAgKTtcbiAgICB9KTtcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hcENodW5rczxJLCBUPihcbiAgbmFtZTogc3RyaW5nLFxuICBwYXJzZTogUGFyc2VMZXg8SSwgVD5cbik6IChpbnB1dDogT2JzZXJ2YWJsZTxJdGVyYWJsZTxJPj4pPT4gT2JzZXJ2YWJsZTxDaHVuazxJLCBUPj4ge1xuXG4gIHJldHVybiBmdW5jdGlvbihpbnB1dDogT2JzZXJ2YWJsZTxJdGVyYWJsZTxJPj4pIHtcbiAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8Q2h1bms8SSwgVD4+KHN1YiA9PiB7XG4gICAgICBjb25zdCBsYSA9IG5ldyBMb29rQWhlYWQ8SSwgVD4obmFtZSk7XG4gICAgICBpbnB1dC5zdWJzY3JpYmUoaW5wdXQgPT4gbGEuX3dyaXRlKGlucHV0KSxcbiAgICAgICAgZXJyID0+IHN1Yi5lcnJvcihlcnIpLFxuICAgICAgICAoKSA9PiBsYS5fZmluYWwoKVxuICAgICAgKTtcbiAgICAgIGNvbnN0IGxhJCA9IGxhIGFzIExvb2tBaGVhZE9ic2VydmFibGU8SSwgVD47XG5cbiAgICAgIGxhJC5zdGFydFRva2VuID0gbGEuc3RhcnRDaHVuaztcblxuICAgICAgbGEkLmVtaXRUb2tlbiA9IGZ1bmN0aW9uKHRoaXM6IExvb2tBaGVhZE9ic2VydmFibGU8SSwgVD4pIHtcbiAgICAgICAgY29uc3QgY2h1bmsgPSB0aGlzLmNsb3NlQ2h1bmsoKTtcbiAgICAgICAgc3ViLm5leHQoY2h1bmspO1xuICAgICAgICByZXR1cm4gY2h1bms7XG4gICAgICB9O1xuICAgICAgcGFyc2UobGEkLCBzdWIpXG4gICAgICAudGhlbigoKSA9PiBzdWIuY29tcGxldGUoKSk7XG4gICAgfSk7XG4gIH07XG59XG5cbmV4cG9ydCBjbGFzcyBMb29rQWhlYWQ8VCwgVFQgPSBhbnk+IHtcbiAgY2FjaGVkOiBBcnJheTxUfG51bGw+O1xuICBsYXN0Q29uc3VtZWQ6IFR8dW5kZWZpbmVkfG51bGw7XG4gIC8vIGlzU3RyaW5nOiBib29sZWFuO1xuICBsaW5lID0gMTtcbiAgY29sdW1uID0gMTtcbiAgcHJvdGVjdGVkIGN1cnJQb3MgPSAwO1xuICBwcml2YXRlIGNhY2hlU3RhcnRQb3MgPSAwOyAvLyBDdXJyZW50bHkgaXMgYWx3YXlzIHNhbWUgYXMgY3VyclBvc1xuICBwcml2YXRlIHJlYWRSZXNvbHZlOiAodmFsdWU6IFQgfCBudWxsKSA9PiB2b2lkIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIHdhaXRGb3JQb3M6IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBjdXJyQ2h1bms6IENodW5rPFQsIFRUPjtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgbmFtZTogc3RyaW5nKSB7XG4gICAgdGhpcy5jYWNoZWQgPSBbXTtcbiAgfVxuXG5cbiAgLy8gX3dyaXRlQnVmKGJ1ZjogVWludDhBcnJheSkge1xuICAvLyAgIHRoaXMuY2FjaGVkID0gdGhpcy5jYWNoZWQuY29uY2F0KEFycmF5LmZyb20oYnVmKSk7XG4gIC8vIH1cblxuICBfd3JpdGUodmFsdWVzOiBJdGVyYWJsZTxUfG51bGw+KSB7XG4gICAgZm9yIChjb25zdCB2IG9mIHZhbHVlcylcbiAgICAgIHRoaXMuY2FjaGVkLnB1c2godik7XG4gICAgLy8gY29uc29sZS5sb2coJ193cml0ZUFuZFJlc29sdmUgcmVzb2x2ZSAnLCB0aGlzLmNhY2hlZC5sZW5ndGgpO1xuXG4gICAgaWYgKHRoaXMucmVhZFJlc29sdmUgIT0gbnVsbCkge1xuICAgICAgY29uc3QgcmVzb2x2ZSA9IHRoaXMucmVhZFJlc29sdmU7XG4gICAgICBjb25zdCBjYWNoZU9mZnNldCA9IHRoaXMud2FpdEZvclBvcyEgLSB0aGlzLmNhY2hlU3RhcnRQb3M7XG4gICAgICBpZiAoY2FjaGVPZmZzZXQgPCB0aGlzLmNhY2hlZC5sZW5ndGgpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMucmVhZFJlc29sdmU7XG4gICAgICAgIGRlbGV0ZSB0aGlzLndhaXRGb3JQb3M7XG4gICAgICAgIHJlc29sdmUodGhpcy5jYWNoZWRbY2FjaGVPZmZzZXRdKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBfZmluYWwoKSB7XG4gICAgdGhpcy5fd3JpdGUoW251bGxdKTtcbiAgfVxuXG4gIGdldCBwb3NpdGlvbigpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLmN1cnJQb3M7XG4gIH1cblxuICAvKipcblx0ICogbG9vayBhaGVhZCBmb3IgMSBjaGFyYWN0ZXJcblx0ICogQHBhcmFtIG51bSBkZWZhdWx0IGlzIDFcblx0ICogQHJldHVybiBudWxsIGlmIEVPRiBpcyByZWFjaGVkXG5cdCAqL1xuICBsYShudW0gPSAxKTogUHJvbWlzZTxUIHwgbnVsbD4ge1xuICAgIGNvbnN0IHJlYWRQb3MgPSB0aGlzLmN1cnJQb3MgKyBudW0gLSAxO1xuICAgIHJldHVybiB0aGlzLnJlYWQocmVhZFBvcyk7XG4gIH1cblxuICAvLyBsYihudW0gPSAxKTogVCB8IG51bGwge1xuICAvLyAgIGNvbnN0IHBvcyA9IHRoaXMuY3VyclBvcyAtIChudW0gLSAxKTtcbiAgLy8gICBpZiAocG9zIDwgMClcbiAgLy8gICAgIHJldHVybiBudWxsO1xuICAvLyAgIHJldHVybiB0aGlzLnJlYWQocG9zKTtcbiAgLy8gfVxuXG4gIGFzeW5jIGFkdmFuY2UoY291bnQgPSAxKTogUHJvbWlzZTxUPiB7XG4gICAgbGV0IGN1cnJWYWx1ZTogVDtcbiAgICBsZXQgaSA9IDA7XG4gICAgd2hpbGUgKGkrKyA8IGNvdW50KSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IGF3YWl0IHRoaXMubGEoMSk7XG4gICAgICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgICAgICB0aGlzLnRocm93RXJyb3IoJ1VuZXhwZWN0IEVPRicpOyAvLyAsIHN0YWNrKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICB0aGlzLmN1cnJQb3MrKztcbiAgICAgIHRoaXMuY29sdW1uKys7XG4gICAgICBpZiAoKHZhbHVlIGFzIGFueSkgPT09ICdcXG4nKSB7XG4gICAgICAgIHRoaXMubGluZSsrO1xuICAgICAgICB0aGlzLmNvbHVtbiA9IDE7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5jdXJyUG9zIC0gdGhpcy5jYWNoZVN0YXJ0UG9zID4gMHgxMDAwMDApIHtcbiAgICAgICAgdGhpcy5jYWNoZWQuc3BsaWNlKDAsIDB4MTAwMDAwKTtcbiAgICAgICAgdGhpcy5jYWNoZVN0YXJ0UG9zICs9IDB4MTAwMDAwO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuY3VyckNodW5rICYmICF0aGlzLmN1cnJDaHVuay5pc0Nsb3NlZCAmJiB0aGlzLmN1cnJDaHVuay50cmFja1ZhbHVlKSB7XG4gICAgICAgIHRoaXMuY3VyckNodW5rLnZhbHVlcyEucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgICBjdXJyVmFsdWUgPSB2YWx1ZTtcbiAgICB9XG4gICAgdGhpcy5sYXN0Q29uc3VtZWQgPSBjdXJyVmFsdWUhO1xuICAgIHJldHVybiBjdXJyVmFsdWUhO1xuICB9XG5cbiAgaXNOZXh0KC4uLnZhbHVlczogVFtdKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNOZXh0V2l0aCh2YWx1ZXMpO1xuICB9XG4gIC8qKlxuXHQgKiBTYW1lIGFzIGByZXR1cm4gbGEoMSkgPT09IHZhbHVlc1swXSAmJiBsYSgyKSA9PT0gdmFsdWVzWzFdLi4uYFxuXHQgKiBAcGFyYW0gdmFsdWVzIGxvb2thaGVhZCBzdHJpbmcgb3IgdG9rZW5zXG5cdCAqL1xuICBhc3luYyBpc05leHRXaXRoPEM+KHZhbHVlczogQ1tdLCBpc0VxdWFsID0gKGE6IFQsIGI6IEMpID0+IGEgYXMgYW55ID09PSBiKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgbGV0IGNvbXBhcmVUbzogQ1tdfCBzdHJpbmc7XG4gICAgbGV0IGNvbXBhcmVGbjogKC4uLmFyZzogYW55W10pID0+IGJvb2xlYW47XG4gICAgY29tcGFyZVRvID0gdmFsdWVzO1xuICAgIGNvbXBhcmVGbiA9IGlzRXF1YWw7XG4gICAgbGV0IGkgPSAwO1xuICAgIGNvbnN0IGwgPSBjb21wYXJlVG8ubGVuZ3RoO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBpZiAoaSA9PT0gbClcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBjb25zdCBuZXh0ID0gYXdhaXQgdGhpcy5sYShpICsgMSk7XG4gICAgICBpZiAobmV4dCA9PSBudWxsKVxuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIEVPRlxuICAgICAgZWxzZSBpZiAoIWNvbXBhcmVGbihuZXh0LCBjb21wYXJlVG9baV0pKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICBpKys7XG4gICAgfVxuICB9XG5cbiAgYXNzZXJ0QWR2YW5jZSguLi52YWx1ZXM6IFRbXSkge1xuICAgIHJldHVybiB0aGlzLmFzc2VydEFkdmFuY2VXaXRoKHZhbHVlcyk7XG4gIH1cblxuICBhc3luYyBhc3NlcnRBZHZhbmNlV2l0aDxDPih2YWx1ZXM6IENbXSwgaXNFcXVhbCA9IChhOiBULCBiOiBDKSA9PiBhIGFzIGFueSA9PT0gYikge1xuICAgIGxldCBjb21wYXJlVG86IENbXXwgc3RyaW5nO1xuICAgIGxldCBjb21wYXJlRm46ICguLi5hcmc6IGFueVtdKSA9PiBib29sZWFuO1xuICAgIGNvbXBhcmVUbyA9IHZhbHVlcztcbiAgICBjb21wYXJlRm4gPSBpc0VxdWFsO1xuICAgIGxldCBpID0gMDtcbiAgICBjb25zdCBsID0gY29tcGFyZVRvLmxlbmd0aDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgaWYgKGkgPT09IGwpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgY29uc3QgbmV4dCA9IGF3YWl0IHRoaXMuYWR2YW5jZShpICsgMSk7XG4gICAgICBpZiAobmV4dCA9PSBudWxsKVxuICAgICAgICB0aGlzLnRocm93RXJyb3IoJ0VPRicsIG5ldyBFcnJvcigpLnN0YWNrKTsgLy8gRU9GXG4gICAgICBlbHNlIGlmICghY29tcGFyZUZuKG5leHQsIGNvbXBhcmVUb1tpXSkpXG4gICAgICAgIHRoaXMudGhyb3dFcnJvcih1dGlsLmluc3BlY3QobmV4dCksIG5ldyBFcnJvcigpLnN0YWNrLCBjb21wYXJlVG8uam9pbignLCcpKTtcbiAgICAgIGkrKztcbiAgICB9XG4gIH1cblxuICB0aHJvd0Vycm9yKHVuZXhwZWN0ZWQgPSAnRW5kLW9mLXN0cmVhbScsIHN0YWNrPzogYW55LCBleHBlY3Q/OiBzdHJpbmcpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG1heC1saW5lLWxlbmd0aFxuICAgIHRocm93IG5ldyBFcnJvcihgSW4gJHt0aGlzLm5hbWV9IHVuZXhwZWN0ZWQgJHtKU09OLnN0cmluZ2lmeSh1bmV4cGVjdGVkKX1gK1xuICAgIChleHBlY3QgPyBgKGV4cGVjdGluZyBcIiR7ZXhwZWN0fVwiKWAgOiAnJykgK1xuICAgIGBhdCAke3RoaXMuZ2V0Q3VycmVudFBvc0luZm8oKX0sICR7c3RhY2sgPyAncHJldmlvdXMgc3RhY2s6JyArIHN0YWNrIDogJyd9YCk7XG4gIH1cblxuICBnZXRDdXJyZW50UG9zSW5mbygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgb2Zmc2V0ICR7dGhpcy5jdXJyUG9zfSBbJHt0aGlzLmxpbmV9OiR7dGhpcy5jb2x1bW59XWA7XG4gIH1cblxuICBzdGFydENodW5rKHR5cGU6IFRULCB0cmFja1ZhbHVlID0gdHJ1ZSkge1xuICAgIGlmICh0aGlzLmN1cnJDaHVuayAmJiAhdGhpcy5jdXJyQ2h1bmsuaXNDbG9zZWQpXG4gICAgICB0aGlzLmN1cnJDaHVuay5jbG9zZSh0aGlzLmN1cnJQb3MpO1xuICAgIHRoaXMuY3VyckNodW5rID0gbmV3IENodW5rPFQsIFRUPih0aGlzLmN1cnJQb3MsIHRoaXMubGluZSwgdGhpcy5jb2x1bW4pO1xuICAgIHRoaXMuY3VyckNodW5rLnRyYWNrVmFsdWUgPSB0cmFja1ZhbHVlO1xuICAgIHRoaXMuY3VyckNodW5rLnR5cGUgPSB0eXBlO1xuICAgIHJldHVybiB0aGlzLmN1cnJDaHVuaztcbiAgfVxuXG4gIGNsb3NlQ2h1bmsoKSB7XG4gICAgcmV0dXJuIHRoaXMuY3VyckNodW5rLmNsb3NlKHRoaXMuY3VyclBvcyk7XG4gIH1cblxuICAvKipcblx0ICogRG8gbm90IHJlYWQgcG9zdGlvbiBsZXNzIHRoYW4gMFxuXHQgKiBAcGFyYW0gcG9zIFxuXHQgKi9cbiAgcHJvdGVjdGVkIHJlYWQocG9zOiBudW1iZXIpOiBQcm9taXNlPFQgfCBudWxsPiB7XG4gICAgY29uc3QgY2FjaGVPZmZzZXQgPSBwb3MgLSB0aGlzLmNhY2hlU3RhcnRQb3M7XG4gICAgaWYgKGNhY2hlT2Zmc2V0IDwgMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gbm90IHJlYWQgYmVoaW5kIHN0cmVhbSBjYWNoZSwgYXQgcG9zaXRpb246ICR7cG9zfWApO1xuICAgIH1cbiAgICBpZiAoY2FjaGVPZmZzZXQgPCB0aGlzLmNhY2hlZC5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5jYWNoZWRbY2FjaGVPZmZzZXRdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy53YWl0Rm9yUG9zID0gcG9zO1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICB0aGlzLnJlYWRSZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIExvb2tBaGVhZE9ic2VydmFibGU8ViwgVD4gZXh0ZW5kcyBMb29rQWhlYWQ8ViwgVD4ge1xuICBzdGFydFRva2VuOiBMb29rQWhlYWQ8ViwgVD5bJ3N0YXJ0Q2h1bmsnXTtcbiAgZW1pdFRva2VuKCk6IENodW5rPFYsIFQ+O1xufVxuXG4iXX0=