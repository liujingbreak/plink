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
        return (0, rxjs_1.from)(parseGrammar(la));
    };
    let tokens = input.pipe((0, operators_1.observeOn)(rxjs_1.queueScheduler), mapChunks(name + '-lexer', parseLex), (0, operators_1.map)(chunk => {
        chunk.text = chunk.values.join('');
        delete chunk.values;
        return chunk;
    }));
    if (pipeOperators) {
        for (const operator of pipeOperators)
            tokens = tokens.pipe(operator);
    }
    return tokens.pipe((0, operators_1.map)(token => [token]), mapChunksObs(name + '-parser', _parseGrammarObs)).toPromise();
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
                .then(() => sub.complete())
                .catch(err => sub.error(err));
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
        // eslint-disable-next-line max-len
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMtTExuLXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FzeW5jLUxMbi1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQW9GO0FBQ3BGLDhDQUE4QztBQUM5QyxnREFBd0I7QUFDeEIsTUFBYSxLQUFLO0lBT2hCLFlBQ1MsR0FBVyxFQUFTLElBQVksRUFBUyxHQUFXO1FBQXBELFFBQUcsR0FBSCxHQUFHLENBQVE7UUFBUyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQVMsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQU43RCxXQUFNLEdBQVMsRUFBRSxDQUFDO1FBRWxCLGFBQVEsR0FBRyxLQUFLLENBQUM7UUFDakIsZUFBVSxHQUFHLElBQUksQ0FBQztJQUlmLENBQUM7SUFFSixLQUFLLENBQUMsUUFBZ0I7UUFDcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDckIsSUFBSSxDQUFDLEdBQUcsR0FBRyxRQUFRLENBQUM7UUFDcEIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQ0Y7QUFoQkQsc0JBZ0JDO0FBRUQsTUFBYSxLQUFTLFNBQVEsS0FBZ0I7Q0FFN0M7QUFGRCxzQkFFQztBQU1EOzs7OztHQUtHO0FBQ0gsU0FBZ0IsTUFBTSxDQUNwQixJQUFZLEVBQ1osS0FBOEIsRUFDOUIsUUFBd0IsRUFDeEIsYUFBb0UsRUFDcEUsWUFBZ0M7SUFHaEMsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLEVBQTBCLEVBQUUsRUFBRTtRQUN0RCxPQUFPLElBQUEsV0FBSSxFQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2hDLENBQUMsQ0FBQztJQUVGLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQ3JCLElBQUEscUJBQVMsRUFBQyxxQkFBYyxDQUFDLEVBQ3pCLFNBQVMsQ0FBQyxJQUFJLEdBQUcsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUNwQyxJ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QUFHLENBQUMsRUFBRTtZQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLGtEQUFrRCxHQUFHLEVBQUUsQ0FBQyxDQUFDO1NBQzFFO1FBQ0QsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7WUFDcEMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztTQUNsRDthQUFNO1lBQ0wsSUFBSSxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUM7WUFDdEIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDM0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUM7WUFDN0IsQ0FBQyxDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7Q0FDRjtBQWhMRCw4QkFnTEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge09ic2VydmFibGUsIFN1YnNjcmliZXIsIGZyb20sIE9wZXJhdG9yRnVuY3Rpb24sIHF1ZXVlU2NoZWR1bGVyfSBmcm9tICdyeGpzJztcbmltcG9ydCB7bWFwLCBvYnNlcnZlT259IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuZXhwb3J0IGNsYXNzIENodW5rPFYsIFQ+IHtcbiAgdHlwZTogVCB8IHVuZGVmaW5lZDtcbiAgdmFsdWVzPzogVltdID0gW107XG4gIGVuZD86IG51bWJlcjtcbiAgaXNDbG9zZWQgPSBmYWxzZTtcbiAgdHJhY2tWYWx1ZSA9IHRydWU7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHBvczogbnVtYmVyLCBwdWJsaWMgbGluZTogbnVtYmVyLCBwdWJsaWMgY29sOiBudW1iZXJcbiAgKSB7fVxuXG4gIGNsb3NlKHBvc2l0aW9uOiBudW1iZXIpIHtcbiAgICB0aGlzLmlzQ2xvc2VkID0gdHJ1ZTtcbiAgICB0aGlzLmVuZCA9IHBvc2l0aW9uO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUb2tlbjxUPiBleHRlbmRzIENodW5rPHN0cmluZywgVD4ge1xuICB0ZXh0ITogc3RyaW5nO1xufVxuLyoqXG4gKiBZb3UgY2FuIGRlZmluZSBhIGxleGVyIGFzIGEgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IHR5cGUgUGFyc2VMZXg8SSwgVD4gPSAobGE6IExvb2tBaGVhZE9ic2VydmFibGU8SSwgVD4sIHN1YjogU3Vic2NyaWJlcjxDaHVuazxJLCBUPj4pID0+IFByb21pc2U8YW55PjtcbmV4cG9ydCB0eXBlIFBhcnNlR3JhbW1hcjxBLCBUPiA9IChsYTogTG9va0FoZWFkPFRva2VuPFQ+LCBUPikgPT4gUHJvbWlzZTxBPjtcbi8qKlxuICogUGFyc2VyXG4gKiBAcGFyYW0gaW5wdXQgc3RyaW5nIHR5cGVcbiAqIEBwYXJhbSBwYXJzZUxleCBcbiAqIEBwYXJhbSBwYXJzZUdyYW1tYXIgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZXI8SSwgQSwgVD4oXG4gIG5hbWU6IHN0cmluZyxcbiAgaW5wdXQ6IE9ic2VydmFibGU8SXRlcmFibGU8ST4+LFxuICBwYXJzZUxleDogUGFyc2VMZXg8SSwgVD4sXG4gIHBpcGVPcGVyYXRvcnM6IEl0ZXJhYmxlPE9wZXJhdG9yRnVuY3Rpb248VG9rZW48VD4sIFRva2VuPFQ+Pj4gfCBudWxsLFxuICBwYXJzZUdyYW1tYXI6IFBhcnNlR3JhbW1hcjxBLCBUPlxuKTogUHJvbWlzZTxBPiB7XG5cbiAgY29uc3QgX3BhcnNlR3JhbW1hck9icyA9IChsYTogTG9va0FoZWFkPFRva2VuPFQ+LCBUPikgPT4ge1xuICAgIHJldHVybiBmcm9tKHBhcnNlR3JhbW1hcihsYSkpO1xuICB9O1xuXG4gIGxldCB0b2tlbnMgPSBpbnB1dC5waXBlKFxuICAgIG9ic2VydmVPbihxdWV1ZVNjaGVkdWxlciksXG4gICAgbWFwQ2h1bmtzKG5hbWUgKyAnLWxleGVyJywgcGFyc2VMZXgpLFxuICAgIG1hcChjaHVuayA9PiB7XG4gICAgICAoY2h1bmsgYXMgVG9rZW48VD4pLnRleHQgPSBjaHVuay52YWx1ZXMhLmpvaW4oJycpO1xuICAgICAgZGVsZXRlIGNodW5rLnZhbHVlcztcbiAgICAgIHJldHVybiBjaHVuayBhcyBUb2tlbjxUPjtcbiAgICB9KVxuICApO1xuICBpZiAocGlwZU9wZXJhdG9ycykge1xuICAgIGZvciAoY29uc3Qgb3BlcmF0b3Igb2YgcGlwZU9wZXJhdG9ycylcbiAgICAgIHRva2VucyA9IHRva2Vucy5waXBlKG9wZXJhdG9yKTtcbiAgfVxuXG4gIHJldHVybiB0b2tlbnMucGlwZShcbiAgICBtYXAodG9rZW4gPT4gW3Rva2VuXSksXG4gICAgbWFwQ2h1bmtzT2JzKG5hbWUgKyAnLXBhcnNlcicsIF9wYXJzZUdyYW1tYXJPYnMpXG4gICkudG9Qcm9taXNlKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXBDaHVua3NPYnM8SSwgTz4obmFtZTogc3RyaW5nLCBwYXJzZTogKGxhOiBMb29rQWhlYWQ8ST4pID0+IE9ic2VydmFibGU8Tz4pOlxuKGlucHV0OiBPYnNlcnZhYmxlPEl0ZXJhYmxlPEk+PikgPT4gT2JzZXJ2YWJsZTxPPiB7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGlucHV0OiBPYnNlcnZhYmxlPEl0ZXJhYmxlPEk+Pikge1xuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxPPihzdWIgPT4ge1xuICAgICAgY29uc3QgbGEgPSBuZXcgTG9va0FoZWFkPEk+KG5hbWUpO1xuICAgICAgaW5wdXQuc3Vic2NyaWJlKGlucHV0ID0+IGxhLl93cml0ZShpbnB1dCksXG4gICAgICAgIGVyciA9PiBzdWIuZXJyb3IoZXJyKSxcbiAgICAgICAgKCkgPT4gbGEuX2ZpbmFsKClcbiAgICAgICk7XG4gICAgICBwYXJzZShsYSkuc3Vic2NyaWJlKFxuICAgICAgICBvdXB1dCA9PiBzdWIubmV4dChvdXB1dCksXG4gICAgICAgIGVyciA9PiBzdWIuZXJyb3IoZXJyKSxcbiAgICAgICAgKCkgPT4gc3ViLmNvbXBsZXRlKClcbiAgICAgICk7XG4gICAgfSk7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXBDaHVua3M8SSwgVD4oXG4gIG5hbWU6IHN0cmluZyxcbiAgcGFyc2U6IFBhcnNlTGV4PEksIFQ+XG4pOiAoaW5wdXQ6IE9ic2VydmFibGU8SXRlcmFibGU8ST4+KSA9PiBPYnNlcnZhYmxlPENodW5rPEksIFQ+PiB7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGlucHV0OiBPYnNlcnZhYmxlPEl0ZXJhYmxlPEk+Pikge1xuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxDaHVuazxJLCBUPj4oc3ViID0+IHtcbiAgICAgIGNvbnN0IGxhID0gbmV3IExvb2tBaGVhZDxJLCBUPihuYW1lKTtcbiAgICAgIGlucHV0LnN1YnNjcmliZShpbnB1dCA9PiBsYS5fd3JpdGUoaW5wdXQpLFxuICAgICAgICBlcnIgPT4gc3ViLmVycm9yKGVyciksXG4gICAgICAgICgpID0+IGxhLl9maW5hbCgpXG4gICAgICApO1xuICAgICAgY29uc3QgbGEkID0gbGEgYXMgTG9va0FoZWFkT2JzZXJ2YWJsZTxJLCBUPjtcblxuICAgICAgbGEkLnN0YXJ0VG9rZW4gPSBsYS5zdGFydENodW5rO1xuXG4gICAgICBsYSQuZW1pdFRva2VuID0gZnVuY3Rpb24odGhpczogTG9va0FoZWFkT2JzZXJ2YWJsZTxJLCBUPikge1xuICAgICAgICBjb25zdCBjaHVuayA9IHRoaXMuY2xvc2VDaHVuaygpO1xuICAgICAgICBzdWIubmV4dChjaHVuayk7XG4gICAgICAgIHJldHVybiBjaHVuaztcbiAgICAgIH07XG4gICAgICBwYXJzZShsYSQsIHN1YilcbiAgICAgIC50aGVuKCgpID0+IHN1Yi5jb21wbGV0ZSgpKVxuICAgICAgLmNhdGNoKGVyciA9PiBzdWIuZXJyb3IoZXJyKSk7XG4gICAgfSk7XG4gIH07XG59XG5cbmV4cG9ydCBjbGFzcyBMb29rQWhlYWQ8VCwgVFQgPSBhbnk+IHtcbiAgY2FjaGVkOiBBcnJheTxUIHwgbnVsbD47XG4gIGxhc3RDb25zdW1lZDogVCB8IHVuZGVmaW5lZCB8IG51bGw7XG4gIC8vIGlzU3RyaW5nOiBib29sZWFuO1xuICBsaW5lID0gMTtcbiAgY29sdW1uID0gMTtcbiAgcHJvdGVjdGVkIGN1cnJQb3MgPSAwO1xuICBwcml2YXRlIGNhY2hlU3RhcnRQb3MgPSAwOyAvLyBDdXJyZW50bHkgaXMgYWx3YXlzIHNhbWUgYXMgY3VyclBvc1xuICBwcml2YXRlIHJlYWRSZXNvbHZlOiAoKHZhbHVlOiBUIHwgbnVsbCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgd2FpdEZvclBvczogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIGN1cnJDaHVuazogQ2h1bms8VCwgVFQ+IHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBuYW1lOiBzdHJpbmcpIHtcbiAgICB0aGlzLmNhY2hlZCA9IFtdO1xuICB9XG5cbiAgX3dyaXRlKHZhbHVlczogSXRlcmFibGU8VCB8IG51bGw+KSB7XG4gICAgZm9yIChjb25zdCB2IG9mIHZhbHVlcylcbiAgICAgIHRoaXMuY2FjaGVkLnB1c2godik7XG4gICAgLy8gY29uc29sZS5sb2coJ193cml0ZUFuZFJlc29sdmUgcmVzb2x2ZSAnLCB0aGlzLmNhY2hlZC5sZW5ndGgpO1xuXG4gICAgaWYgKHRoaXMucmVhZFJlc29sdmUgIT0gbnVsbCkge1xuICAgICAgY29uc3QgcmVzb2x2ZSA9IHRoaXMucmVhZFJlc29sdmU7XG4gICAgICBjb25zdCBjYWNoZU9mZnNldCA9IHRoaXMud2FpdEZvclBvcyEgLSB0aGlzLmNhY2hlU3RhcnRQb3M7XG4gICAgICBpZiAoY2FjaGVPZmZzZXQgPCB0aGlzLmNhY2hlZC5sZW5ndGgpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMucmVhZFJlc29sdmU7XG4gICAgICAgIGRlbGV0ZSB0aGlzLndhaXRGb3JQb3M7XG4gICAgICAgIHJlc29sdmUodGhpcy5jYWNoZWRbY2FjaGVPZmZzZXRdKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBfZmluYWwoKSB7XG4gICAgdGhpcy5fd3JpdGUoW251bGxdKTtcbiAgfVxuXG4gIGdldCBwb3NpdGlvbigpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLmN1cnJQb3M7XG4gIH1cblxuICAvKipcblx0ICogbG9vayBhaGVhZCBmb3IgMSBjaGFyYWN0ZXJcblx0ICogQHBhcmFtIG51bSBkZWZhdWx0IGlzIDFcblx0ICogQHJldHVybiBudWxsIGlmIEVPRiBpcyByZWFjaGVkXG5cdCAqL1xuICBsYShudW0gPSAxKTogUHJvbWlzZTxUIHwgbnVsbD4ge1xuICAgIGNvbnN0IHJlYWRQb3MgPSB0aGlzLmN1cnJQb3MgKyBudW0gLSAxO1xuICAgIHJldHVybiB0aGlzLnJlYWQocmVhZFBvcyk7XG4gIH1cblxuICAvLyBsYihudW0gPSAxKTogVCB8IG51bGwge1xuICAvLyAgIGNvbnN0IHBvcyA9IHRoaXMuY3VyclBvcyAtIChudW0gLSAxKTtcbiAgLy8gICBpZiAocG9zIDwgMClcbiAgLy8gICAgIHJldHVybiBudWxsO1xuICAvLyAgIHJldHVybiB0aGlzLnJlYWQocG9zKTtcbiAgLy8gfVxuXG4gIGFzeW5jIGFkdmFuY2UoY291bnQgPSAxKTogUHJvbWlzZTxUPiB7XG4gICAgbGV0IGN1cnJWYWx1ZTogVDtcbiAgICBsZXQgaSA9IDA7XG4gICAgd2hpbGUgKGkrKyA8IGNvdW50KSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IGF3YWl0IHRoaXMubGEoMSk7XG4gICAgICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgICAgICB0aGlzLnRocm93RXJyb3IoJ1VuZXhwZWN0IEVPRicpOyAvLyAsIHN0YWNrKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICB0aGlzLmN1cnJQb3MrKztcbiAgICAgIHRoaXMuY29sdW1uKys7XG4gICAgICBpZiAoKHZhbHVlIGFzIGFueSkgPT09ICdcXG4nKSB7XG4gICAgICAgIHRoaXMubGluZSsrO1xuICAgICAgICB0aGlzLmNvbHVtbiA9IDE7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5jdXJyUG9zIC0gdGhpcy5jYWNoZVN0YXJ0UG9zID4gMHgxMDAwMDApIHtcbiAgICAgICAgdGhpcy5jYWNoZWQuc3BsaWNlKDAsIDB4MTAwMDAwKTtcbiAgICAgICAgdGhpcy5jYWNoZVN0YXJ0UG9zICs9IDB4MTAwMDAwO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuY3VyckNodW5rICYmICF0aGlzLmN1cnJDaHVuay5pc0Nsb3NlZCAmJiB0aGlzLmN1cnJDaHVuay50cmFja1ZhbHVlKSB7XG4gICAgICAgIHRoaXMuY3VyckNodW5rLnZhbHVlcyEucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgICBjdXJyVmFsdWUgPSB2YWx1ZTtcbiAgICB9XG4gICAgdGhpcy5sYXN0Q29uc3VtZWQgPSBjdXJyVmFsdWUhO1xuICAgIHJldHVybiBjdXJyVmFsdWUhO1xuICB9XG5cbiAgaXNOZXh0KC4uLnZhbHVlczogVFtdKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNOZXh0V2l0aCh2YWx1ZXMpO1xuICB9XG4gIC8qKlxuXHQgKiBTYW1lIGFzIGByZXR1cm4gbGEoMSkgPT09IHZhbHVlc1swXSAmJiBsYSgyKSA9PT0gdmFsdWVzWzFdLi4uYFxuXHQgKiBAcGFyYW0gdmFsdWVzIGxvb2thaGVhZCBzdHJpbmcgb3IgdG9rZW5zXG5cdCAqL1xuICBhc3luYyBpc05leHRXaXRoPEM+KHZhbHVlczogQ1tdLCBpc0VxdWFsID0gKGE6IFQsIGI6IEMpID0+IGEgYXMgYW55ID09PSBiKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgbGV0IGNvbXBhcmVUbzogQ1tdIHwgc3RyaW5nO1xuICAgIGxldCBjb21wYXJlRm46ICguLi5hcmc6IGFueVtdKSA9PiBib29sZWFuO1xuICAgIGNvbXBhcmVUbyA9IHZhbHVlcztcbiAgICBjb21wYXJlRm4gPSBpc0VxdWFsO1xuICAgIGxldCBpID0gMDtcbiAgICBjb25zdCBsID0gY29tcGFyZVRvLmxlbmd0aDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgaWYgKGkgPT09IGwpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgY29uc3QgbmV4dCA9IGF3YWl0IHRoaXMubGEoaSArIDEpO1xuICAgICAgaWYgKG5leHQgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBFT0ZcbiAgICAgIGVsc2UgaWYgKCFjb21wYXJlRm4obmV4dCwgY29tcGFyZVRvW2ldKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuXG4gIGFzc2VydEFkdmFuY2UoLi4udmFsdWVzOiBUW10pIHtcbiAgICByZXR1cm4gdGhpcy5hc3NlcnRBZHZhbmNlV2l0aCh2YWx1ZXMpO1xuICB9XG5cbiAgYXN5bmMgYXNzZXJ0QWR2YW5jZVdpdGg8Qz4odmFsdWVzOiBDW10sIGlzRXF1YWwgPSAoYTogVCwgYjogQykgPT4gYSBhcyBhbnkgPT09IGIpIHtcbiAgICBsZXQgY29tcGFyZVRvOiBDW10gfCBzdHJpbmc7XG4gICAgbGV0IGNvbXBhcmVGbjogKC4uLmFyZzogYW55W10pID0+IGJvb2xlYW47XG4gICAgY29tcGFyZVRvID0gdmFsdWVzO1xuICAgIGNvbXBhcmVGbiA9IGlzRXF1YWw7XG4gICAgbGV0IGkgPSAwO1xuICAgIGNvbnN0IGwgPSBjb21wYXJlVG8ubGVuZ3RoO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBpZiAoaSA9PT0gbClcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBjb25zdCBuZXh0ID0gYXdhaXQgdGhpcy5hZHZhbmNlKGkgKyAxKTtcbiAgICAgIGlmIChuZXh0ID09IG51bGwpXG4gICAgICAgIHRoaXMudGhyb3dFcnJvcignRU9GJywgbmV3IEVycm9yKCkuc3RhY2spOyAvLyBFT0ZcbiAgICAgIGVsc2UgaWYgKCFjb21wYXJlRm4obmV4dCwgY29tcGFyZVRvW2ldKSlcbiAgICAgICAgdGhpcy50aHJvd0Vycm9yKHV0aWwuaW5zcGVjdChuZXh0KSwgbmV3IEVycm9yKCkuc3RhY2ssIGNvbXBhcmVUby5qb2luKCcsJykpO1xuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuXG4gIHRocm93RXJyb3IodW5leHBlY3RlZCA9ICdFbmQtb2Ytc3RyZWFtJywgc3RhY2s/OiBhbnksIGV4cGVjdD86IHN0cmluZykge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBtYXgtbGVuXG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbiAke3RoaXMubmFtZX0gdW5leHBlY3RlZCAke0pTT04uc3RyaW5naWZ5KHVuZXhwZWN0ZWQpfWAgK1xuICAgIChleHBlY3QgPyBgKGV4cGVjdGluZyBcIiR7ZXhwZWN0fVwiKWAgOiAnJykgK1xuICAgIGBhdCAke3RoaXMuZ2V0Q3VycmVudFBvc0luZm8oKX0sICR7c3RhY2sgPyAncHJldmlvdXMgc3RhY2s6JyArIHN0YWNrIDogJyd9YCk7XG4gIH1cblxuICBnZXRDdXJyZW50UG9zSW5mbygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgb2Zmc2V0ICR7dGhpcy5jdXJyUG9zfSBbJHt0aGlzLmxpbmV9OiR7dGhpcy5jb2x1bW59XWA7XG4gIH1cblxuICBzdGFydENodW5rKHR5cGU6IFRULCB0cmFja1ZhbHVlID0gdHJ1ZSkge1xuICAgIGlmICh0aGlzLmN1cnJDaHVuayAmJiAhdGhpcy5jdXJyQ2h1bmsuaXNDbG9zZWQpXG4gICAgICB0aGlzLmN1cnJDaHVuay5jbG9zZSh0aGlzLmN1cnJQb3MpO1xuICAgIHRoaXMuY3VyckNodW5rID0gbmV3IENodW5rPFQsIFRUPih0aGlzLmN1cnJQb3MsIHRoaXMubGluZSwgdGhpcy5jb2x1bW4pO1xuICAgIHRoaXMuY3VyckNodW5rLnRyYWNrVmFsdWUgPSB0cmFja1ZhbHVlO1xuICAgIHRoaXMuY3VyckNodW5rLnR5cGUgPSB0eXBlO1xuICAgIHJldHVybiB0aGlzLmN1cnJDaHVuaztcbiAgfVxuXG4gIGNsb3NlQ2h1bmsoKSB7XG4gICAgcmV0dXJuIHRoaXMuY3VyckNodW5rIS5jbG9zZSh0aGlzLmN1cnJQb3MpO1xuICB9XG5cbiAgLyoqXG5cdCAqIERvIG5vdCByZWFkIHBvc3Rpb24gbGVzcyB0aGFuIDBcblx0ICogQHBhcmFtIHBvcyBcblx0ICovXG4gIHByb3RlY3RlZCByZWFkKHBvczogbnVtYmVyKTogUHJvbWlzZTxUIHwgbnVsbD4ge1xuICAgIGNvbnN0IGNhY2hlT2Zmc2V0ID0gcG9zIC0gdGhpcy5jYWNoZVN0YXJ0UG9zO1xuICAgIGlmIChjYWNoZU9mZnNldCA8IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCByZWFkIGJlaGluZCBzdHJlYW0gY2FjaGUsIGF0IHBvc2l0aW9uOiAke3Bvc31gKTtcbiAgICB9XG4gICAgaWYgKGNhY2hlT2Zmc2V0IDwgdGhpcy5jYWNoZWQubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuY2FjaGVkW2NhY2hlT2Zmc2V0XSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMud2FpdEZvclBvcyA9IHBvcztcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgdGhpcy5yZWFkUmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBMb29rQWhlYWRPYnNlcnZhYmxlPFYsIFQ+IGV4dGVuZHMgTG9va0FoZWFkPFYsIFQ+IHtcbiAgc3RhcnRUb2tlbjogTG9va0FoZWFkPFYsIFQ+WydzdGFydENodW5rJ107XG4gIGVtaXRUb2tlbigpOiBDaHVuazxWLCBUPjtcbn1cblxuIl19