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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LookAhead = exports.mapChunks = exports.mapChunksObs = exports.parser = exports.Token = exports.Chunk = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMtTExuLXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FzeW5jLUxMbi1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQW9GO0FBQ3BGLDhDQUE4QztBQUM5QyxnREFBd0I7QUFDeEIsTUFBYSxLQUFLO0lBT2hCLFlBQ1MsR0FBVyxFQUFTLElBQVksRUFBUyxHQUFXO1FBQXBELFFBQUcsR0FBSCxHQUFHLENBQVE7UUFBUyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQVMsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQU43RCxXQUFNLEdBQVMsRUFBRSxDQUFDO1FBRWxCLGFBQVEsR0FBRyxLQUFLLENBQUM7UUFDakIsZUFBVSxHQUFHLElBQUksQ0FBQztJQUlmLENBQUM7SUFFSixLQUFLLENBQUMsUUFBZ0I7UUFDcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDckIsSUFBSSxDQUFDLEdBQUcsR0FBRyxRQUFRLENBQUM7UUFDcEIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQ0Y7QUFoQkQsc0JBZ0JDO0FBRUQsTUFBYSxLQUFTLFNBQVEsS0FBZ0I7Q0FFN0M7QUFGRCxzQkFFQztBQU1EOzs7OztHQUtHO0FBQ0gsU0FBZ0IsTUFBTSxDQUNwQixJQUFZLEVBQ1osS0FBOEIsRUFDOUIsUUFBd0IsRUFDeEIsYUFBb0UsRUFDcEUsWUFBZ0M7SUFHaEMsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLEVBQTBCLEVBQUUsRUFBRTtRQUN0RCxPQUFPLFdBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNoQyxDQUFDLENBQUM7SUFFRixJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUNyQixxQkFBUyxDQUFDLHFCQUFjLENBQUMsRUFDekIsU0FBUyxDQUFDLElBQUksR0FBRyxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQ3BDLGVBQUcsQ0FBQyxL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LENBQUMsQ0FBQztTQUMxRTtRQUNELElBQUksV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO1lBQ3BDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7U0FDbEQ7YUFBTTtZQUNMLElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDO1lBQ3RCLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQzNCLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDO1lBQzdCLENBQUMsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDO0NBQ0Y7QUFyTEQsOEJBcUxDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtPYnNlcnZhYmxlLCBTdWJzY3JpYmVyLCBmcm9tLCBPcGVyYXRvckZ1bmN0aW9uLCBxdWV1ZVNjaGVkdWxlcn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge21hcCwgb2JzZXJ2ZU9ufSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgdXRpbCBmcm9tICd1dGlsJztcbmV4cG9ydCBjbGFzcyBDaHVuazxWLCBUPiB7XG4gIHR5cGU6IFQ7XG4gIHZhbHVlcz86IFZbXSA9IFtdO1xuICBlbmQ/OiBudW1iZXI7XG4gIGlzQ2xvc2VkID0gZmFsc2U7XG4gIHRyYWNrVmFsdWUgPSB0cnVlO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyBwb3M6IG51bWJlciwgcHVibGljIGxpbmU6IG51bWJlciwgcHVibGljIGNvbDogbnVtYmVyXG4gICkge31cblxuICBjbG9zZShwb3NpdGlvbjogbnVtYmVyKSB7XG4gICAgdGhpcy5pc0Nsb3NlZCA9IHRydWU7XG4gICAgdGhpcy5lbmQgPSBwb3NpdGlvbjtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVG9rZW48VD4gZXh0ZW5kcyBDaHVuazxzdHJpbmcsIFQ+IHtcbiAgdGV4dDogc3RyaW5nO1xufVxuLyoqXG4gKiBZb3UgY2FuIGRlZmluZSBhIGxleGVyIGFzIGEgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IHR5cGUgUGFyc2VMZXg8SSwgVD4gPSAobGE6IExvb2tBaGVhZE9ic2VydmFibGU8SSxUPiwgc3ViOiBTdWJzY3JpYmVyPENodW5rPEksIFQ+PikgPT4gUHJvbWlzZTxhbnk+O1xuZXhwb3J0IHR5cGUgUGFyc2VHcmFtbWFyPEEsIFQ+ID0gKGxhOiBMb29rQWhlYWQ8VG9rZW48VD4sIFQ+KSA9PiBQcm9taXNlPEE+O1xuLyoqXG4gKiBQYXJzZXJcbiAqIEBwYXJhbSBpbnB1dCBzdHJpbmcgdHlwZVxuICogQHBhcmFtIHBhcnNlTGV4IFxuICogQHBhcmFtIHBhcnNlR3JhbW1hciBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlcjxJLCBBLCBUPihcbiAgbmFtZTogc3RyaW5nLFxuICBpbnB1dDogT2JzZXJ2YWJsZTxJdGVyYWJsZTxJPj4sXG4gIHBhcnNlTGV4OiBQYXJzZUxleDxJLCBUPixcbiAgcGlwZU9wZXJhdG9yczogSXRlcmFibGU8T3BlcmF0b3JGdW5jdGlvbjxUb2tlbjxUPiwgVG9rZW48VD4+PiB8IG51bGwsXG4gIHBhcnNlR3JhbW1hcjogUGFyc2VHcmFtbWFyPEEsIFQ+XG4pOiBQcm9taXNlPEE+IHtcblxuICBjb25zdCBfcGFyc2VHcmFtbWFyT2JzID0gKGxhOiBMb29rQWhlYWQ8VG9rZW48VD4sIFQ+KSA9PiB7XG4gICAgcmV0dXJuIGZyb20ocGFyc2VHcmFtbWFyKGxhKSk7XG4gIH07XG5cbiAgbGV0IHRva2VucyA9IGlucHV0LnBpcGUoXG4gICAgb2JzZXJ2ZU9uKHF1ZXVlU2NoZWR1bGVyKSxcbiAgICBtYXBDaHVua3MobmFtZSArICctbGV4ZXInLCBwYXJzZUxleCksXG4gICAgbWFwKGNodW5rID0+IHtcbiAgICAgIChjaHVuayBhcyBUb2tlbjxUPikudGV4dCA9IGNodW5rLnZhbHVlcyEuam9pbignJyk7XG4gICAgICBkZWxldGUgY2h1bmsudmFsdWVzO1xuICAgICAgcmV0dXJuIGNodW5rIGFzIFRva2VuPFQ+O1xuICAgIH0pXG4gICk7XG4gIGlmIChwaXBlT3BlcmF0b3JzKSB7XG4gICAgZm9yIChjb25zdCBvcGVyYXRvciBvZiBwaXBlT3BlcmF0b3JzKVxuICAgICAgdG9rZW5zID0gdG9rZW5zLnBpcGUob3BlcmF0b3IpO1xuICB9XG5cbiAgcmV0dXJuIHRva2Vucy5waXBlKFxuICAgIG1hcCh0b2tlbiA9PiBbdG9rZW5dKSxcbiAgICBtYXBDaHVua3NPYnMobmFtZSArICctcGFyc2VyJywgX3BhcnNlR3JhbW1hck9icylcbiAgKS50b1Byb21pc2UoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hcENodW5rc09iczxJLCBPPihuYW1lOiBzdHJpbmcsIHBhcnNlOiAobGE6IExvb2tBaGVhZDxJPikgPT4gT2JzZXJ2YWJsZTxPPik6XG4oaW5wdXQ6IE9ic2VydmFibGU8SXRlcmFibGU8ST4+KT0+IE9ic2VydmFibGU8Tz4ge1xuXG4gIHJldHVybiBmdW5jdGlvbihpbnB1dDogT2JzZXJ2YWJsZTxJdGVyYWJsZTxJPj4pIHtcbiAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8Tz4oc3ViID0+IHtcbiAgICAgIGNvbnN0IGxhID0gbmV3IExvb2tBaGVhZDxJPihuYW1lKTtcbiAgICAgIGlucHV0LnN1YnNjcmliZShpbnB1dCA9PiBsYS5fd3JpdGUoaW5wdXQpLFxuICAgICAgICBlcnIgPT4gc3ViLmVycm9yKGVyciksXG4gICAgICAgICgpID0+IGxhLl9maW5hbCgpXG4gICAgICApO1xuICAgICAgcGFyc2UobGEpLnN1YnNjcmliZShcbiAgICAgICAgb3VwdXQgPT4gc3ViLm5leHQob3VwdXQpLFxuICAgICAgICBlcnIgPT4gc3ViLmVycm9yKGVyciksXG4gICAgICAgICgpID0+IHN1Yi5jb21wbGV0ZSgpXG4gICAgICApO1xuICAgIH0pO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFwQ2h1bmtzPEksIFQ+KFxuICBuYW1lOiBzdHJpbmcsXG4gIHBhcnNlOiBQYXJzZUxleDxJLCBUPlxuKTogKGlucHV0OiBPYnNlcnZhYmxlPEl0ZXJhYmxlPEk+Pik9PiBPYnNlcnZhYmxlPENodW5rPEksIFQ+PiB7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGlucHV0OiBPYnNlcnZhYmxlPEl0ZXJhYmxlPEk+Pikge1xuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxDaHVuazxJLCBUPj4oc3ViID0+IHtcbiAgICAgIGNvbnN0IGxhID0gbmV3IExvb2tBaGVhZDxJLCBUPihuYW1lKTtcbiAgICAgIGlucHV0LnN1YnNjcmliZShpbnB1dCA9PiBsYS5fd3JpdGUoaW5wdXQpLFxuICAgICAgICBlcnIgPT4gc3ViLmVycm9yKGVyciksXG4gICAgICAgICgpID0+IGxhLl9maW5hbCgpXG4gICAgICApO1xuICAgICAgY29uc3QgbGEkID0gbGEgYXMgTG9va0FoZWFkT2JzZXJ2YWJsZTxJLCBUPjtcblxuICAgICAgbGEkLnN0YXJ0VG9rZW4gPSBsYS5zdGFydENodW5rO1xuXG4gICAgICBsYSQuZW1pdFRva2VuID0gZnVuY3Rpb24odGhpczogTG9va0FoZWFkT2JzZXJ2YWJsZTxJLCBUPikge1xuICAgICAgICBjb25zdCBjaHVuayA9IHRoaXMuY2xvc2VDaHVuaygpO1xuICAgICAgICBzdWIubmV4dChjaHVuayk7XG4gICAgICAgIHJldHVybiBjaHVuaztcbiAgICAgIH07XG4gICAgICBwYXJzZShsYSQsIHN1YilcbiAgICAgIC50aGVuKCgpID0+IHN1Yi5jb21wbGV0ZSgpKTtcbiAgICB9KTtcbiAgfTtcbn1cblxuZXhwb3J0IGNsYXNzIExvb2tBaGVhZDxULCBUVCA9IGFueT4ge1xuICBjYWNoZWQ6IEFycmF5PFR8bnVsbD47XG4gIGxhc3RDb25zdW1lZDogVHx1bmRlZmluZWR8bnVsbDtcbiAgLy8gaXNTdHJpbmc6IGJvb2xlYW47XG4gIGxpbmUgPSAxO1xuICBjb2x1bW4gPSAxO1xuICBwcm90ZWN0ZWQgY3VyclBvcyA9IDA7XG4gIHByaXZhdGUgY2FjaGVTdGFydFBvcyA9IDA7IC8vIEN1cnJlbnRseSBpcyBhbHdheXMgc2FtZSBhcyBjdXJyUG9zXG4gIHByaXZhdGUgcmVhZFJlc29sdmU6ICgodmFsdWU6IFQgfCBudWxsKSA9PiB2b2lkKSB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSB3YWl0Rm9yUG9zOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgY3VyckNodW5rOiBDaHVuazxULCBUVD47XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIG5hbWU6IHN0cmluZykge1xuICAgIHRoaXMuY2FjaGVkID0gW107XG4gIH1cblxuXG4gIC8vIF93cml0ZUJ1ZihidWY6IFVpbnQ4QXJyYXkpIHtcbiAgLy8gICB0aGlzLmNhY2hlZCA9IHRoaXMuY2FjaGVkLmNvbmNhdChBcnJheS5mcm9tKGJ1ZikpO1xuICAvLyB9XG5cbiAgX3dyaXRlKHZhbHVlczogSXRlcmFibGU8VHxudWxsPikge1xuICAgIGZvciAoY29uc3QgdiBvZiB2YWx1ZXMpXG4gICAgICB0aGlzLmNhY2hlZC5wdXNoKHYpO1xuICAgIC8vIGNvbnNvbGUubG9nKCdfd3JpdGVBbmRSZXNvbHZlIHJlc29sdmUgJywgdGhpcy5jYWNoZWQubGVuZ3RoKTtcblxuICAgIGlmICh0aGlzLnJlYWRSZXNvbHZlICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IHJlc29sdmUgPSB0aGlzLnJlYWRSZXNvbHZlO1xuICAgICAgY29uc3QgY2FjaGVPZmZzZXQgPSB0aGlzLndhaXRGb3JQb3MhIC0gdGhpcy5jYWNoZVN0YXJ0UG9zO1xuICAgICAgaWYgKGNhY2hlT2Zmc2V0IDwgdGhpcy5jYWNoZWQubGVuZ3RoKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnJlYWRSZXNvbHZlO1xuICAgICAgICBkZWxldGUgdGhpcy53YWl0Rm9yUG9zO1xuICAgICAgICByZXNvbHZlKHRoaXMuY2FjaGVkW2NhY2hlT2Zmc2V0XSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgX2ZpbmFsKCkge1xuICAgIHRoaXMuX3dyaXRlKFtudWxsXSk7XG4gIH1cblxuICBnZXQgcG9zaXRpb24oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyUG9zO1xuICB9XG5cbiAgLyoqXG5cdCAqIGxvb2sgYWhlYWQgZm9yIDEgY2hhcmFjdGVyXG5cdCAqIEBwYXJhbSBudW0gZGVmYXVsdCBpcyAxXG5cdCAqIEByZXR1cm4gbnVsbCBpZiBFT0YgaXMgcmVhY2hlZFxuXHQgKi9cbiAgbGEobnVtID0gMSk6IFByb21pc2U8VCB8IG51bGw+IHtcbiAgICBjb25zdCByZWFkUG9zID0gdGhpcy5jdXJyUG9zICsgbnVtIC0gMTtcbiAgICByZXR1cm4gdGhpcy5yZWFkKHJlYWRQb3MpO1xuICB9XG5cbiAgLy8gbGIobnVtID0gMSk6IFQgfCBudWxsIHtcbiAgLy8gICBjb25zdCBwb3MgPSB0aGlzLmN1cnJQb3MgLSAobnVtIC0gMSk7XG4gIC8vICAgaWYgKHBvcyA8IDApXG4gIC8vICAgICByZXR1cm4gbnVsbDtcbiAgLy8gICByZXR1cm4gdGhpcy5yZWFkKHBvcyk7XG4gIC8vIH1cblxuICBhc3luYyBhZHZhbmNlKGNvdW50ID0gMSk6IFByb21pc2U8VD4ge1xuICAgIGxldCBjdXJyVmFsdWU6IFQ7XG4gICAgbGV0IGkgPSAwO1xuICAgIHdoaWxlIChpKysgPCBjb3VudCkge1xuICAgICAgY29uc3QgdmFsdWUgPSBhd2FpdCB0aGlzLmxhKDEpO1xuICAgICAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICAgICAgdGhpcy50aHJvd0Vycm9yKCdVbmV4cGVjdCBFT0YnKTsgLy8gLCBzdGFjayk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgdGhpcy5jdXJyUG9zKys7XG4gICAgICB0aGlzLmNvbHVtbisrO1xuICAgICAgaWYgKCh2YWx1ZSBhcyBhbnkpID09PSAnXFxuJykge1xuICAgICAgICB0aGlzLmxpbmUrKztcbiAgICAgICAgdGhpcy5jb2x1bW4gPSAxO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuY3VyclBvcyAtIHRoaXMuY2FjaGVTdGFydFBvcyA+IDB4MTAwMDAwKSB7XG4gICAgICAgIHRoaXMuY2FjaGVkLnNwbGljZSgwLCAweDEwMDAwMCk7XG4gICAgICAgIHRoaXMuY2FjaGVTdGFydFBvcyArPSAweDEwMDAwMDtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmN1cnJDaHVuayAmJiAhdGhpcy5jdXJyQ2h1bmsuaXNDbG9zZWQgJiYgdGhpcy5jdXJyQ2h1bmsudHJhY2tWYWx1ZSkge1xuICAgICAgICB0aGlzLmN1cnJDaHVuay52YWx1ZXMhLnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgICAgY3VyclZhbHVlID0gdmFsdWU7XG4gICAgfVxuICAgIHRoaXMubGFzdENvbnN1bWVkID0gY3VyclZhbHVlITtcbiAgICByZXR1cm4gY3VyclZhbHVlITtcbiAgfVxuXG4gIGlzTmV4dCguLi52YWx1ZXM6IFRbXSkge1xuICAgIHJldHVybiB0aGlzLmlzTmV4dFdpdGgodmFsdWVzKTtcbiAgfVxuICAvKipcblx0ICogU2FtZSBhcyBgcmV0dXJuIGxhKDEpID09PSB2YWx1ZXNbMF0gJiYgbGEoMikgPT09IHZhbHVlc1sxXS4uLmBcblx0ICogQHBhcmFtIHZhbHVlcyBsb29rYWhlYWQgc3RyaW5nIG9yIHRva2Vuc1xuXHQgKi9cbiAgYXN5bmMgaXNOZXh0V2l0aDxDPih2YWx1ZXM6IENbXSwgaXNFcXVhbCA9IChhOiBULCBiOiBDKSA9PiBhIGFzIGFueSA9PT0gYik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGxldCBjb21wYXJlVG86IENbXXwgc3RyaW5nO1xuICAgIGxldCBjb21wYXJlRm46ICguLi5hcmc6IGFueVtdKSA9PiBib29sZWFuO1xuICAgIGNvbXBhcmVUbyA9IHZhbHVlcztcbiAgICBjb21wYXJlRm4gPSBpc0VxdWFsO1xuICAgIGxldCBpID0gMDtcbiAgICBjb25zdCBsID0gY29tcGFyZVRvLmxlbmd0aDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgaWYgKGkgPT09IGwpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgY29uc3QgbmV4dCA9IGF3YWl0IHRoaXMubGEoaSArIDEpO1xuICAgICAgaWYgKG5leHQgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBFT0ZcbiAgICAgIGVsc2UgaWYgKCFjb21wYXJlRm4obmV4dCwgY29tcGFyZVRvW2ldKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuXG4gIGFzc2VydEFkdmFuY2UoLi4udmFsdWVzOiBUW10pIHtcbiAgICByZXR1cm4gdGhpcy5hc3NlcnRBZHZhbmNlV2l0aCh2YWx1ZXMpO1xuICB9XG5cbiAgYXN5bmMgYXNzZXJ0QWR2YW5jZVdpdGg8Qz4odmFsdWVzOiBDW10sIGlzRXF1YWwgPSAoYTogVCwgYjogQykgPT4gYSBhcyBhbnkgPT09IGIpIHtcbiAgICBsZXQgY29tcGFyZVRvOiBDW118IHN0cmluZztcbiAgICBsZXQgY29tcGFyZUZuOiAoLi4uYXJnOiBhbnlbXSkgPT4gYm9vbGVhbjtcbiAgICBjb21wYXJlVG8gPSB2YWx1ZXM7XG4gICAgY29tcGFyZUZuID0gaXNFcXVhbDtcbiAgICBsZXQgaSA9IDA7XG4gICAgY29uc3QgbCA9IGNvbXBhcmVUby5sZW5ndGg7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGlmIChpID09PSBsKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIGNvbnN0IG5leHQgPSBhd2FpdCB0aGlzLmFkdmFuY2UoaSArIDEpO1xuICAgICAgaWYgKG5leHQgPT0gbnVsbClcbiAgICAgICAgdGhpcy50aHJvd0Vycm9yKCdFT0YnLCBuZXcgRXJyb3IoKS5zdGFjayk7IC8vIEVPRlxuICAgICAgZWxzZSBpZiAoIWNvbXBhcmVGbihuZXh0LCBjb21wYXJlVG9baV0pKVxuICAgICAgICB0aGlzLnRocm93RXJyb3IodXRpbC5pbnNwZWN0KG5leHQpLCBuZXcgRXJyb3IoKS5zdGFjaywgY29tcGFyZVRvLmpvaW4oJywnKSk7XG4gICAgICBpKys7XG4gICAgfVxuICB9XG5cbiAgdGhyb3dFcnJvcih1bmV4cGVjdGVkID0gJ0VuZC1vZi1zdHJlYW0nLCBzdGFjaz86IGFueSwgZXhwZWN0Pzogc3RyaW5nKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEluICR7dGhpcy5uYW1lfSB1bmV4cGVjdGVkICR7SlNPTi5zdHJpbmdpZnkodW5leHBlY3RlZCl9YCtcbiAgICAoZXhwZWN0ID8gYChleHBlY3RpbmcgXCIke2V4cGVjdH1cIilgIDogJycpICtcbiAgICBgYXQgJHt0aGlzLmdldEN1cnJlbnRQb3NJbmZvKCl9LCAke3N0YWNrID8gJ3ByZXZpb3VzIHN0YWNrOicgKyBzdGFjayA6ICcnfWApO1xuICB9XG5cbiAgZ2V0Q3VycmVudFBvc0luZm8oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYG9mZnNldCAke3RoaXMuY3VyclBvc30gWyR7dGhpcy5saW5lfToke3RoaXMuY29sdW1ufV1gO1xuICB9XG5cbiAgc3RhcnRDaHVuayh0eXBlOiBUVCwgdHJhY2tWYWx1ZSA9IHRydWUpIHtcbiAgICBpZiAodGhpcy5jdXJyQ2h1bmsgJiYgIXRoaXMuY3VyckNodW5rLmlzQ2xvc2VkKVxuICAgICAgdGhpcy5jdXJyQ2h1bmsuY2xvc2UodGhpcy5jdXJyUG9zKTtcbiAgICB0aGlzLmN1cnJDaHVuayA9IG5ldyBDaHVuazxULCBUVD4odGhpcy5jdXJyUG9zLCB0aGlzLmxpbmUsIHRoaXMuY29sdW1uKTtcbiAgICB0aGlzLmN1cnJDaHVuay50cmFja1ZhbHVlID0gdHJhY2tWYWx1ZTtcbiAgICB0aGlzLmN1cnJDaHVuay50eXBlID0gdHlwZTtcbiAgICByZXR1cm4gdGhpcy5jdXJyQ2h1bms7XG4gIH1cblxuICBjbG9zZUNodW5rKCkge1xuICAgIHJldHVybiB0aGlzLmN1cnJDaHVuay5jbG9zZSh0aGlzLmN1cnJQb3MpO1xuICB9XG5cbiAgLyoqXG5cdCAqIERvIG5vdCByZWFkIHBvc3Rpb24gbGVzcyB0aGFuIDBcblx0ICogQHBhcmFtIHBvcyBcblx0ICovXG4gIHByb3RlY3RlZCByZWFkKHBvczogbnVtYmVyKTogUHJvbWlzZTxUIHwgbnVsbD4ge1xuICAgIGNvbnN0IGNhY2hlT2Zmc2V0ID0gcG9zIC0gdGhpcy5jYWNoZVN0YXJ0UG9zO1xuICAgIGlmIChjYWNoZU9mZnNldCA8IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCByZWFkIGJlaGluZCBzdHJlYW0gY2FjaGUsIGF0IHBvc2l0aW9uOiAke3Bvc31gKTtcbiAgICB9XG4gICAgaWYgKGNhY2hlT2Zmc2V0IDwgdGhpcy5jYWNoZWQubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuY2FjaGVkW2NhY2hlT2Zmc2V0XSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMud2FpdEZvclBvcyA9IHBvcztcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgdGhpcy5yZWFkUmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBMb29rQWhlYWRPYnNlcnZhYmxlPFYsIFQ+IGV4dGVuZHMgTG9va0FoZWFkPFYsIFQ+IHtcbiAgc3RhcnRUb2tlbjogTG9va0FoZWFkPFYsIFQ+WydzdGFydENodW5rJ107XG4gIGVtaXRUb2tlbigpOiBDaHVuazxWLCBUPjtcbn1cblxuIl19