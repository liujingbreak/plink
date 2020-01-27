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
// interface LookAheadState<T, TT> {
//   line: number;
//   column: number;
//   currPos: number;
//   cacheStartPos: number;
//   currChunk: Chunk<T, TT>;
// }
class LookAhead {
    // private savedState: LookAheadState<T, TT> = {} as LookAheadState<T, TT>;
    constructor(name, onDrain) {
        this.name = name;
        this.onDrain = onDrain;
        this.line = 1;
        this.column = 1;
        this.currPos = 0;
        this.cacheStartPos = 0;
        this.cached = [];
    }
    _write(values) {
        for (const v of values)
            this.cached.push(v);
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
    // private saveState() {
    //   this.savedState.line = this.line;
    //   this.savedState.column = this.column;
    //   this.savedState.currPos = this.currPos;
    //   this.savedState.currChunk = this.currChunk;
    //   this.savedState.cacheStartPos = this.cacheStartPos;
    // }
    // private restoreState() {
    //   this.line = this.savedState.line;
    //   this.column = this.savedState.column;
    //   this.currPos = this.savedState.currPos;
    //   this.currChunk = this.savedState.currChunk;
    //   this.cacheStartPos = this.savedState.cacheStartPos;
    // }
    /**
       * Do not read postion less than 0
       * @param pos
       */
    read(pos) {
        const cacheOffset = pos - this.cacheStartPos;
        if (cacheOffset < 0) {
            throw new Error(`Can not read behind stream cache, at position: ${pos}`);
        }
        while (true) {
            if (cacheOffset < this.cached.length) {
                return this.cached[cacheOffset];
            }
            else {
                if (this.onDrain) {
                    this.onDrain();
                    continue;
                }
                throw new Error(`The internal buffer is drained early at ${pos}`);
                // this.waitForPos = pos;
                // const err = new WaitError();
                // throw err;
                // return new Promise(resolve => {
                //   this.readResolve = resolve;
                // });
            }
        }
    }
}
exports.LookAhead = LookAhead;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTExuLXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL0xMbi1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUFnRTtBQUNoRSw4Q0FBMEM7QUFDMUMsZ0RBQXdCO0FBQ3hCLE1BQWEsS0FBSztJQU9oQixZQUNTLEdBQVcsRUFBUyxJQUFZLEVBQVMsR0FBVztRQUFwRCxRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQVMsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUFTLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFON0QsV0FBTSxHQUFTLEVBQUUsQ0FBQztRQUVsQixhQUFRLEdBQUcsS0FBSyxDQUFDO1FBQ2pCLGVBQVUsR0FBRyxJQUFJLENBQUM7SUFJZixDQUFDO0lBRUosS0FBSyxDQUFDLFFBQWdCO1FBQ3BCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDO1FBQ3BCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUNGO0FBaEJELHNCQWdCQztBQUVELE1BQWEsS0FBUyxTQUFRLEtBQWdCO0NBRTdDO0FBRkQsc0JBRUM7QUFNRDs7Ozs7R0FLRztBQUNILFNBQWdCLE1BQU0sQ0FDcEIsSUFBWSxFQUNaLEtBQThCLEVBQzlCLFFBQXdCLEVBQ3hCLGFBQW9FLEVBQ3BFLFlBQWdDO0lBR2hDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxFQUEwQixFQUFFLEVBQUU7UUFDdEQsT0FBTyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDMUIsQ0FBQyxDQUFDO0lBRUYsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUk7SUFDckIsNkJBQTZCO0lBQzdCLFNBQVMsQ0FBQyxJQUFJLEdBQUcsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUNwQyxlQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDVCxLQUFrQixDQUFDLElBQUksR0FBRyxLQUFL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QkFBTTtnQkFDTCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7b0JBQ2hCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDZixTQUFTO2lCQUNWO2dCQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsMkNBQTJDLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQ2xFLHlCQUF5QjtnQkFDekIsK0JBQStCO2dCQUMvQixhQUFhO2dCQUNiLGtDQUFrQztnQkFDbEMsZ0NBQWdDO2dCQUNoQyxNQUFNO2FBQ1A7U0FDRjtJQUNILENBQUM7Q0FDRjtBQTFMRCw4QkEwTEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBPYnNlcnZhYmxlLCBPcGVyYXRvckZ1bmN0aW9uLCBTdWJzY3JpYmVyIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBtYXAsIHRhcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuZXhwb3J0IGNsYXNzIENodW5rPFYsIFQ+IHtcbiAgdHlwZTogVDtcbiAgdmFsdWVzPzogVltdID0gW107XG4gIGVuZD86IG51bWJlcjtcbiAgaXNDbG9zZWQgPSBmYWxzZTtcbiAgdHJhY2tWYWx1ZSA9IHRydWU7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHBvczogbnVtYmVyLCBwdWJsaWMgbGluZTogbnVtYmVyLCBwdWJsaWMgY29sOiBudW1iZXJcbiAgKSB7fVxuXG4gIGNsb3NlKHBvc2l0aW9uOiBudW1iZXIpIHtcbiAgICB0aGlzLmlzQ2xvc2VkID0gdHJ1ZTtcbiAgICB0aGlzLmVuZCA9IHBvc2l0aW9uO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUb2tlbjxUPiBleHRlbmRzIENodW5rPHN0cmluZywgVD4ge1xuICB0ZXh0OiBzdHJpbmc7XG59XG4vKipcbiAqIFlvdSBjYW4gZGVmaW5lIGEgbGV4ZXIgYXMgYSBmdW5jdGlvblxuICovXG5leHBvcnQgdHlwZSBQYXJzZUxleDxJLCBUPiA9IChsYTogTG9va0FoZWFkT2JzZXJ2YWJsZTxJLFQ+LCBzdWI6IFN1YnNjcmliZXI8Q2h1bms8SSwgVD4+KSA9PiB2b2lkO1xuZXhwb3J0IHR5cGUgUGFyc2VHcmFtbWFyPEEsIFQ+ID0gKGxhOiBMb29rQWhlYWQ8VG9rZW48VD4sIFQ+KSA9PiBBO1xuLyoqXG4gKiBQYXJzZXJcbiAqIEBwYXJhbSBpbnB1dCBzdHJpbmcgdHlwZVxuICogQHBhcmFtIHBhcnNlTGV4IFxuICogQHBhcmFtIHBhcnNlR3JhbW1hciBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlcjxJLCBBLCBUPihcbiAgbmFtZTogc3RyaW5nLFxuICBpbnB1dDogT2JzZXJ2YWJsZTxJdGVyYWJsZTxJPj4sXG4gIHBhcnNlTGV4OiBQYXJzZUxleDxJLCBUPixcbiAgcGlwZU9wZXJhdG9yczogSXRlcmFibGU8T3BlcmF0b3JGdW5jdGlvbjxUb2tlbjxUPiwgVG9rZW48VD4+PiB8IG51bGwsXG4gIHBhcnNlR3JhbW1hcjogUGFyc2VHcmFtbWFyPEEsIFQ+XG4pOiBBIHwgdW5kZWZpbmVkIHtcblxuICBjb25zdCBfcGFyc2VHcmFtbWFyT2JzID0gKGxhOiBMb29rQWhlYWQ8VG9rZW48VD4sIFQ+KSA9PiB7XG4gICAgcmV0dXJuIHBhcnNlR3JhbW1hcihsYSk7XG4gIH07XG5cbiAgbGV0IHRva2VucyA9IGlucHV0LnBpcGUoXG4gICAgLy8gb2JzZXJ2ZU9uKHF1ZXVlU2NoZWR1bGVyKSxcbiAgICBtYXBDaHVua3MobmFtZSArICctbGV4ZXInLCBwYXJzZUxleCksXG4gICAgbWFwKGNodW5rID0+IHtcbiAgICAgIChjaHVuayBhcyBUb2tlbjxUPikudGV4dCA9IGNodW5rLnZhbHVlcyEuam9pbignJyk7XG4gICAgICBkZWxldGUgY2h1bmsudmFsdWVzO1xuICAgICAgcmV0dXJuIGNodW5rIGFzIFRva2VuPFQ+O1xuICAgIH0pXG4gICk7XG4gIGlmIChwaXBlT3BlcmF0b3JzKSB7XG4gICAgZm9yIChjb25zdCBvcGVyYXRvciBvZiBwaXBlT3BlcmF0b3JzKVxuICAgICAgdG9rZW5zID0gdG9rZW5zLnBpcGUob3BlcmF0b3IpO1xuICB9XG5cbiAgbGV0IHJlc3VsdDogQSB8IHVuZGVmaW5lZDtcbiAgdG9rZW5zLnBpcGUoXG4gICAgbWFwKHRva2VuID0+IFt0b2tlbl0pLFxuICAgIG1hcENodW5rc09icyhuYW1lICsgJy1wYXJzZXInLCBfcGFyc2VHcmFtbWFyT2JzKSxcbiAgICB0YXAoYXN0ID0+IHtcbiAgICAgIHJlc3VsdCA9IGFzdDtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFwQ2h1bmtzT2JzPEksIE8+KG5hbWU6IHN0cmluZywgcGFyc2U6IChsYTogTG9va0FoZWFkPEk+KSA9PiBPKTpcbihpbnB1dDogT2JzZXJ2YWJsZTxJdGVyYWJsZTxJPj4pPT4gT2JzZXJ2YWJsZTxPPiB7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGlucHV0OiBPYnNlcnZhYmxlPEl0ZXJhYmxlPEk+Pikge1xuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxPPihzdWIgPT4ge1xuICAgICAgY29uc3QgbGEgPSBuZXcgTG9va0FoZWFkPEk+KG5hbWUpO1xuICAgICAgaW5wdXQuc3Vic2NyaWJlKGlucHV0ID0+IGxhLl93cml0ZShpbnB1dCksXG4gICAgICAgIGVyciA9PiBzdWIuZXJyb3IoZXJyKSxcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgIGxhLl9maW5hbCgpO1xuICAgICAgICB9XG4gICAgICApO1xuICAgICAgdHJ5IHtcbiAgICAgICAgc3ViLm5leHQocGFyc2UobGEpKTtcbiAgICAgICAgc3ViLmNvbXBsZXRlKCk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgc3ViLmVycm9yKGVycik7XG4gICAgICB9XG5cbiAgICB9KTtcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hcENodW5rczxJLCBUPihcbiAgbmFtZTogc3RyaW5nLFxuICBwYXJzZTogUGFyc2VMZXg8SSwgVD5cbik6IChpbnB1dDogT2JzZXJ2YWJsZTxJdGVyYWJsZTxJPj4pPT4gT2JzZXJ2YWJsZTxDaHVuazxJLCBUPj4ge1xuXG4gIHJldHVybiBmdW5jdGlvbihpbnB1dDogT2JzZXJ2YWJsZTxJdGVyYWJsZTxJPj4pIHtcbiAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8Q2h1bms8SSwgVD4+KHN1YiA9PiB7XG4gICAgICBjb25zdCBsYSA9IG5ldyBMb29rQWhlYWQ8SSwgVD4obmFtZSk7XG5cbiAgICAgIGlucHV0LnN1YnNjcmliZShpbnB1dCA9PiBsYS5fd3JpdGUoaW5wdXQpLFxuICAgICAgICBlcnIgPT4gc3ViLmVycm9yKGVyciksXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICBsYS5fZmluYWwoKTtcbiAgICAgICAgICBjb25zdCBsYSQgPSBsYSBhcyBMb29rQWhlYWRPYnNlcnZhYmxlPEksIFQ+O1xuICAgICAgICAgIGxhJC5zdGFydFRva2VuID0gbGEuc3RhcnRDaHVuaztcblxuICAgICAgICAgIGxhJC5lbWl0VG9rZW4gPSBmdW5jdGlvbih0aGlzOiBMb29rQWhlYWRPYnNlcnZhYmxlPEksIFQ+KSB7XG4gICAgICAgICAgICBjb25zdCBjaHVuayA9IHRoaXMuY2xvc2VDaHVuaygpO1xuICAgICAgICAgICAgc3ViLm5leHQoY2h1bmspO1xuICAgICAgICAgICAgcmV0dXJuIGNodW5rO1xuICAgICAgICAgIH07XG4gICAgICAgICAgcGFyc2UobGEkLCBzdWIpO1xuICAgICAgICAgIHN1Yi5jb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgICApO1xuICAgIH0pO1xuICB9O1xufVxuXG4vLyBpbnRlcmZhY2UgTG9va0FoZWFkU3RhdGU8VCwgVFQ+IHtcbi8vICAgbGluZTogbnVtYmVyO1xuLy8gICBjb2x1bW46IG51bWJlcjtcbi8vICAgY3VyclBvczogbnVtYmVyO1xuLy8gICBjYWNoZVN0YXJ0UG9zOiBudW1iZXI7XG4vLyAgIGN1cnJDaHVuazogQ2h1bms8VCwgVFQ+O1xuLy8gfVxuZXhwb3J0IGNsYXNzIExvb2tBaGVhZDxULCBUVCA9IGFueT4ge1xuICBzdGF0aWMgV0FJVF9FUlJPUjogJ1dBSVRfRVJST1InO1xuICBjYWNoZWQ6IEFycmF5PFR8bnVsbD47XG4gIGxpbmUgPSAxO1xuICBjb2x1bW4gPSAxO1xuICBsYXN0Q29uc3VtZWQ6IFQ7XG4gIHByaXZhdGUgY3VyclBvcyA9IDA7XG4gIHByaXZhdGUgY2FjaGVTdGFydFBvcyA9IDA7XG4gIC8vIHByaXZhdGUgcmVhZFJlc29sdmU6ICgpID0+IHZvaWQgfCB1bmRlZmluZWQ7XG4gIC8vIHByaXZhdGUgd2FpdEZvclBvczogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIGN1cnJDaHVuazogQ2h1bms8VCwgVFQ+O1xuXG4gIC8vIHByaXZhdGUgc2F2ZWRTdGF0ZTogTG9va0FoZWFkU3RhdGU8VCwgVFQ+ID0ge30gYXMgTG9va0FoZWFkU3RhdGU8VCwgVFQ+O1xuXG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBuYW1lOiBzdHJpbmcsIHByaXZhdGUgb25EcmFpbj86ICgpID0+IHZvaWQpIHtcbiAgICB0aGlzLmNhY2hlZCA9IFtdO1xuICB9XG5cbiAgX3dyaXRlKHZhbHVlczogSXRlcmFibGU8VHxudWxsPikge1xuICAgIGZvciAoY29uc3QgdiBvZiB2YWx1ZXMpXG4gICAgICB0aGlzLmNhY2hlZC5wdXNoKHYpO1xuICB9XG5cbiAgX2ZpbmFsKCkge1xuICAgIHRoaXMuX3dyaXRlKFtudWxsXSk7XG4gIH1cblxuICBnZXQgcG9zaXRpb24oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyUG9zO1xuICB9XG5cbiAgLyoqXG5cdCAqIGxvb2sgYWhlYWQgZm9yIDEgY2hhcmFjdGVyXG5cdCAqIEBwYXJhbSBudW0gZGVmYXVsdCBpcyAxXG5cdCAqIEByZXR1cm4gbnVsbCBpZiBFT0YgaXMgcmVhY2hlZFxuXHQgKi9cbiAgbGEobnVtID0gMSk6IFQgfCBudWxsIHtcbiAgICBjb25zdCByZWFkUG9zID0gdGhpcy5jdXJyUG9zICsgbnVtIC0gMTtcbiAgICByZXR1cm4gdGhpcy5yZWFkKHJlYWRQb3MpO1xuICB9XG5cbiAgYWR2YW5jZShjb3VudCA9IDEpOiBUIHtcbiAgICAvLyByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgbGV0IGN1cnJWYWx1ZTogVDtcbiAgICBsZXQgaSA9IDA7XG4gICAgd2hpbGUgKGkrKyA8IGNvdW50KSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHRoaXMubGEoMSk7XG4gICAgICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgICAgICB0aGlzLnRocm93RXJyb3IoJ1VuZXhwZWN0IEVPRicpOyAvLyAsIHN0YWNrKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICB0aGlzLmN1cnJQb3MrKztcbiAgICAgIHRoaXMuY29sdW1uKys7XG4gICAgICBpZiAoKHZhbHVlIGFzIGFueSkgPT09ICdcXG4nKSB7XG4gICAgICAgIHRoaXMubGluZSsrO1xuICAgICAgICB0aGlzLmNvbHVtbiA9IDE7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5jdXJyUG9zIC0gdGhpcy5jYWNoZVN0YXJ0UG9zID4gMHgxMDAwMDApIHtcbiAgICAgICAgdGhpcy5jYWNoZWQuc3BsaWNlKDAsIDB4MTAwMDAwKTtcbiAgICAgICAgdGhpcy5jYWNoZVN0YXJ0UG9zICs9IDB4MTAwMDAwO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuY3VyckNodW5rICYmICF0aGlzLmN1cnJDaHVuay5pc0Nsb3NlZCAmJiB0aGlzLmN1cnJDaHVuay50cmFja1ZhbHVlKSB7XG4gICAgICAgIHRoaXMuY3VyckNodW5rLnZhbHVlcyEucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgICBjdXJyVmFsdWUgPSB2YWx1ZTtcbiAgICB9XG4gICAgdGhpcy5sYXN0Q29uc3VtZWQgPSBjdXJyVmFsdWUhO1xuICAgIHJldHVybiBjdXJyVmFsdWUhO1xuICB9XG5cbiAgaXNOZXh0KC4uLnZhbHVlczogVFtdKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNOZXh0V2l0aCh2YWx1ZXMpO1xuICB9XG4gIC8qKlxuXHQgKiBTYW1lIGFzIGByZXR1cm4gbGEoMSkgPT09IHZhbHVlc1swXSAmJiBsYSgyKSA9PT0gdmFsdWVzWzFdLi4uYFxuXHQgKiBAcGFyYW0gdmFsdWVzIGxvb2thaGVhZCBzdHJpbmcgb3IgdG9rZW5zXG5cdCAqL1xuICBpc05leHRXaXRoPEM+KHZhbHVlczogQ1tdLCBpc0VxdWFsID0gKGE6IFQsIGI6IEMpID0+IGEgYXMgYW55ID09PSBiKTogYm9vbGVhbiB7XG4gICAgbGV0IGNvbXBhcmVUbzogQ1tdfCBzdHJpbmc7XG4gICAgbGV0IGNvbXBhcmVGbjogKC4uLmFyZzogYW55W10pID0+IGJvb2xlYW47XG4gICAgY29tcGFyZVRvID0gdmFsdWVzO1xuICAgIGNvbXBhcmVGbiA9IGlzRXF1YWw7XG4gICAgbGV0IGkgPSAwO1xuICAgIGNvbnN0IGwgPSBjb21wYXJlVG8ubGVuZ3RoO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBpZiAoaSA9PT0gbClcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBjb25zdCBuZXh0ID0gdGhpcy5sYShpICsgMSk7XG4gICAgICBpZiAobmV4dCA9PSBudWxsKVxuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIEVPRlxuICAgICAgZWxzZSBpZiAoIWNvbXBhcmVGbihuZXh0LCBjb21wYXJlVG9baV0pKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICBpKys7XG4gICAgfVxuICB9XG5cbiAgYXNzZXJ0QWR2YW5jZSguLi52YWx1ZXM6IFRbXSkge1xuICAgIHJldHVybiB0aGlzLmFzc2VydEFkdmFuY2VXaXRoKHZhbHVlcyk7XG4gIH1cblxuICBhc3luYyBhc3NlcnRBZHZhbmNlV2l0aDxDPih2YWx1ZXM6IENbXSwgaXNFcXVhbCA9IChhOiBULCBiOiBDKSA9PiBhIGFzIGFueSA9PT0gYikge1xuICAgIGxldCBjb21wYXJlVG86IENbXXwgc3RyaW5nO1xuICAgIGxldCBjb21wYXJlRm46ICguLi5hcmc6IGFueVtdKSA9PiBib29sZWFuO1xuICAgIGNvbXBhcmVUbyA9IHZhbHVlcztcbiAgICBjb21wYXJlRm4gPSBpc0VxdWFsO1xuICAgIGxldCBpID0gMDtcbiAgICBjb25zdCBsID0gY29tcGFyZVRvLmxlbmd0aDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgaWYgKGkgPT09IGwpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgY29uc3QgbmV4dCA9IGF3YWl0IHRoaXMuYWR2YW5jZShpICsgMSk7XG4gICAgICBpZiAobmV4dCA9PSBudWxsKVxuICAgICAgICB0aGlzLnRocm93RXJyb3IoJ0VPRicsIG5ldyBFcnJvcigpLnN0YWNrKTsgLy8gRU9GXG4gICAgICBlbHNlIGlmICghY29tcGFyZUZuKG5leHQsIGNvbXBhcmVUb1tpXSkpXG4gICAgICAgIHRoaXMudGhyb3dFcnJvcih1dGlsLmluc3BlY3QobmV4dCksIG5ldyBFcnJvcigpLnN0YWNrLCBjb21wYXJlVG9baV0gKyAnJyk7XG4gICAgICBpKys7XG4gICAgfVxuICB9XG5cbiAgdGhyb3dFcnJvcih1bmV4cGVjdGVkID0gJ0VuZC1vZi1zdHJlYW0nLCBzdGFjaz86IGFueSwgZXhwZWN0Pzogc3RyaW5nKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEluICR7dGhpcy5uYW1lfSB1bmV4cGVjdGVkICR7SlNPTi5zdHJpbmdpZnkodW5leHBlY3RlZCl9YCtcbiAgICAoZXhwZWN0ID8gYChleHBlY3RpbmcgXCIke2V4cGVjdH1cIilgIDogJycpICtcbiAgICBgYXQgJHt0aGlzLmdldEN1cnJlbnRQb3NJbmZvKCl9LCAke3N0YWNrID8gJ3ByZXZpb3VzIHN0YWNrOicgKyBzdGFjayA6ICcnfWApO1xuICB9XG5cbiAgZ2V0Q3VycmVudFBvc0luZm8oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYG9mZnNldCAke3RoaXMuY3VyclBvc30gWyR7dGhpcy5saW5lfToke3RoaXMuY29sdW1ufV1gO1xuICB9XG5cbiAgc3RhcnRDaHVuayh0eXBlOiBUVCwgdHJhY2tWYWx1ZSA9IHRydWUpIHtcbiAgICBpZiAodGhpcy5jdXJyQ2h1bmsgJiYgIXRoaXMuY3VyckNodW5rLmlzQ2xvc2VkKVxuICAgICAgdGhpcy5jdXJyQ2h1bmsuY2xvc2UodGhpcy5jdXJyUG9zKTtcbiAgICB0aGlzLmN1cnJDaHVuayA9IG5ldyBDaHVuazxULCBUVD4odGhpcy5jdXJyUG9zLCB0aGlzLmxpbmUsIHRoaXMuY29sdW1uKTtcbiAgICB0aGlzLmN1cnJDaHVuay50cmFja1ZhbHVlID0gdHJhY2tWYWx1ZTtcbiAgICB0aGlzLmN1cnJDaHVuay50eXBlID0gdHlwZTtcbiAgICByZXR1cm4gdGhpcy5jdXJyQ2h1bms7XG4gIH1cblxuICBjbG9zZUNodW5rKCkge1xuICAgIHJldHVybiB0aGlzLmN1cnJDaHVuay5jbG9zZSh0aGlzLmN1cnJQb3MpO1xuICB9XG5cbiAgLy8gcHJpdmF0ZSBzYXZlU3RhdGUoKSB7XG4gIC8vICAgdGhpcy5zYXZlZFN0YXRlLmxpbmUgPSB0aGlzLmxpbmU7XG4gIC8vICAgdGhpcy5zYXZlZFN0YXRlLmNvbHVtbiA9IHRoaXMuY29sdW1uO1xuICAvLyAgIHRoaXMuc2F2ZWRTdGF0ZS5jdXJyUG9zID0gdGhpcy5jdXJyUG9zO1xuICAvLyAgIHRoaXMuc2F2ZWRTdGF0ZS5jdXJyQ2h1bmsgPSB0aGlzLmN1cnJDaHVuaztcbiAgLy8gICB0aGlzLnNhdmVkU3RhdGUuY2FjaGVTdGFydFBvcyA9IHRoaXMuY2FjaGVTdGFydFBvcztcbiAgLy8gfVxuXG4gIC8vIHByaXZhdGUgcmVzdG9yZVN0YXRlKCkge1xuICAvLyAgIHRoaXMubGluZSA9IHRoaXMuc2F2ZWRTdGF0ZS5saW5lO1xuICAvLyAgIHRoaXMuY29sdW1uID0gdGhpcy5zYXZlZFN0YXRlLmNvbHVtbjtcbiAgLy8gICB0aGlzLmN1cnJQb3MgPSB0aGlzLnNhdmVkU3RhdGUuY3VyclBvcztcbiAgLy8gICB0aGlzLmN1cnJDaHVuayA9IHRoaXMuc2F2ZWRTdGF0ZS5jdXJyQ2h1bms7XG4gIC8vICAgdGhpcy5jYWNoZVN0YXJ0UG9zID0gdGhpcy5zYXZlZFN0YXRlLmNhY2hlU3RhcnRQb3M7XG4gIC8vIH1cblxuICAvKipcblx0ICogRG8gbm90IHJlYWQgcG9zdGlvbiBsZXNzIHRoYW4gMFxuXHQgKiBAcGFyYW0gcG9zIFxuXHQgKi9cbiAgcHJpdmF0ZSByZWFkKHBvczogbnVtYmVyKTogVCB8IG51bGwge1xuICAgIGNvbnN0IGNhY2hlT2Zmc2V0ID0gcG9zIC0gdGhpcy5jYWNoZVN0YXJ0UG9zO1xuICAgIGlmIChjYWNoZU9mZnNldCA8IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCByZWFkIGJlaGluZCBzdHJlYW0gY2FjaGUsIGF0IHBvc2l0aW9uOiAke3Bvc31gKTtcbiAgICB9XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGlmIChjYWNoZU9mZnNldCA8IHRoaXMuY2FjaGVkLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWNoZWRbY2FjaGVPZmZzZXRdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMub25EcmFpbikge1xuICAgICAgICAgIHRoaXMub25EcmFpbigpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIGludGVybmFsIGJ1ZmZlciBpcyBkcmFpbmVkIGVhcmx5IGF0ICR7cG9zfWApO1xuICAgICAgICAvLyB0aGlzLndhaXRGb3JQb3MgPSBwb3M7XG4gICAgICAgIC8vIGNvbnN0IGVyciA9IG5ldyBXYWl0RXJyb3IoKTtcbiAgICAgICAgLy8gdGhyb3cgZXJyO1xuICAgICAgICAvLyByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIC8vICAgdGhpcy5yZWFkUmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICAgIC8vIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIExvb2tBaGVhZE9ic2VydmFibGU8ViwgVD4gZXh0ZW5kcyBMb29rQWhlYWQ8ViwgVD4ge1xuICBzdGFydFRva2VuOiBMb29rQWhlYWQ8ViwgVD5bJ3N0YXJ0Q2h1bmsnXTtcbiAgZW1pdFRva2VuKCk6IENodW5rPFYsIFQ+O1xufVxuXG4iXX0=