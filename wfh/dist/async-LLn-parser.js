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
    _write(values) {
        this.cached.push(...values);
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
        // const stack = new Error().stack;
        return new Promise(resolve => {
            let currValue;
            let i = 0;
            const read = () => {
                if (i++ < count) {
                    this.la(1)
                        .then(value => {
                        if (value == null) {
                            return this.throwError('Unexpect EOF'); // , stack);
                        }
                        this.currPos++;
                        this.column++;
                        if (value === '\n') {
                            this.line++;
                            this.column = 1;
                        }
                        this.cached.shift();
                        this.cacheStartPos++;
                        if (this.currChunk && !this.currChunk.isClosed && this.currChunk.trackValue) {
                            this.currChunk.values.push(value);
                        }
                        currValue = value;
                        read();
                    });
                }
                else {
                    this.lastConsumed = currValue;
                    resolve(currValue);
                }
            };
            read();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMtTExuLXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FzeW5jLUxMbi1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUFvRjtBQUNwRiw4Q0FBOEM7QUFDOUMsZ0RBQXdCO0FBQ3hCLE1BQWEsS0FBSztJQU9oQixZQUNTLEdBQVcsRUFBUyxJQUFZLEVBQVMsR0FBVztRQUFwRCxRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQVMsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUFTLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFON0QsV0FBTSxHQUFTLEVBQUUsQ0FBQztRQUVsQixhQUFRLEdBQUcsS0FBSyxDQUFDO1FBQ2pCLGVBQVUsR0FBRyxJQUFJLENBQUM7SUFJZixDQUFDO0lBRUosS0FBSyxDQUFDLFFBQWdCO1FBQ3BCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDO1FBQ3BCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUNGO0FBaEJELHNCQWdCQztBQUVELE1BQWEsS0FBUyxTQUFRLEtBQWdCO0NBRTdDO0FBRkQsc0JBRUM7QUFNRDs7Ozs7R0FLRztBQUNILFNBQWdCLE1BQU0sQ0FDcEIsSUFBWSxFQUNaLEtBQThCLEVBQzlCLFFBQXdCLEVBQ3hCLGFBQW9FLEVBQ3BFLFlBQWdDO0lBR2hDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxFQUEwQixFQUFFLEVBQUU7UUFDdEQsT0FBTyxXQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDaEMsQ0FBQyxDQUFDO0lBRUYsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FDckIscUJBQVMsQ0FBQyxxQkFBYyxDQUFDLEVBQ3pCLFNBQVMsQ0FBQyxJQUFJLEdBQUcsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUNwQyxlQUFHLENBQUMsS0FB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QUksS0FBSyxDQUFDLGtEQUFrRCxHQUFHLEVBQUUsQ0FBQyxDQUFDO1NBQzFFO1FBQ0QsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7WUFDcEMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztTQUNsRDthQUFNO1lBQ0wsSUFBSSxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUM7WUFDdEIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDM0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUM7WUFDN0IsQ0FBQyxDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7Q0FDRjtBQXRMRCw4QkFzTEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge09ic2VydmFibGUsIFN1YnNjcmliZXIsIGZyb20sIE9wZXJhdG9yRnVuY3Rpb24sIHF1ZXVlU2NoZWR1bGVyfSBmcm9tICdyeGpzJztcbmltcG9ydCB7bWFwLCBvYnNlcnZlT259IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuZXhwb3J0IGNsYXNzIENodW5rPFYsIFQ+IHtcbiAgdHlwZTogVDtcbiAgdmFsdWVzPzogVltdID0gW107XG4gIGVuZD86IG51bWJlcjtcbiAgaXNDbG9zZWQgPSBmYWxzZTtcbiAgdHJhY2tWYWx1ZSA9IHRydWU7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHBvczogbnVtYmVyLCBwdWJsaWMgbGluZTogbnVtYmVyLCBwdWJsaWMgY29sOiBudW1iZXJcbiAgKSB7fVxuXG4gIGNsb3NlKHBvc2l0aW9uOiBudW1iZXIpIHtcbiAgICB0aGlzLmlzQ2xvc2VkID0gdHJ1ZTtcbiAgICB0aGlzLmVuZCA9IHBvc2l0aW9uO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUb2tlbjxUPiBleHRlbmRzIENodW5rPHN0cmluZywgVD4ge1xuICB0ZXh0OiBzdHJpbmc7XG59XG4vKipcbiAqIFlvdSBjYW4gZGVmaW5lIGEgbGV4ZXIgYXMgYSBmdW5jdGlvblxuICovXG5leHBvcnQgdHlwZSBQYXJzZUxleDxJLCBUPiA9IChsYTogTG9va0FoZWFkT2JzZXJ2YWJsZTxJLFQ+LCBzdWI6IFN1YnNjcmliZXI8Q2h1bms8SSwgVD4+KSA9PiBQcm9taXNlPGFueT47XG5leHBvcnQgdHlwZSBQYXJzZUdyYW1tYXI8QSwgVD4gPSAobGE6IExvb2tBaGVhZDxUb2tlbjxUPiwgVD4pID0+IFByb21pc2U8QT47XG4vKipcbiAqIFBhcnNlclxuICogQHBhcmFtIGlucHV0IHN0cmluZyB0eXBlXG4gKiBAcGFyYW0gcGFyc2VMZXggXG4gKiBAcGFyYW0gcGFyc2VHcmFtbWFyIFxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VyPEksIEEsIFQ+KFxuICBuYW1lOiBzdHJpbmcsXG4gIGlucHV0OiBPYnNlcnZhYmxlPEl0ZXJhYmxlPEk+PixcbiAgcGFyc2VMZXg6IFBhcnNlTGV4PEksIFQ+LFxuICBwaXBlT3BlcmF0b3JzOiBJdGVyYWJsZTxPcGVyYXRvckZ1bmN0aW9uPFRva2VuPFQ+LCBUb2tlbjxUPj4+IHwgbnVsbCxcbiAgcGFyc2VHcmFtbWFyOiBQYXJzZUdyYW1tYXI8QSwgVD5cbik6IFByb21pc2U8QT4ge1xuXG4gIGNvbnN0IF9wYXJzZUdyYW1tYXJPYnMgPSAobGE6IExvb2tBaGVhZDxUb2tlbjxUPiwgVD4pID0+IHtcbiAgICByZXR1cm4gZnJvbShwYXJzZUdyYW1tYXIobGEpKTtcbiAgfTtcblxuICBsZXQgdG9rZW5zID0gaW5wdXQucGlwZShcbiAgICBvYnNlcnZlT24ocXVldWVTY2hlZHVsZXIpLFxuICAgIG1hcENodW5rcyhuYW1lICsgJy1sZXhlcicsIHBhcnNlTGV4KSxcbiAgICBtYXAoY2h1bmsgPT4ge1xuICAgICAgKGNodW5rIGFzIFRva2VuPFQ+KS50ZXh0ID0gY2h1bmsudmFsdWVzIS5qb2luKCcnKTtcbiAgICAgIGRlbGV0ZSBjaHVuay52YWx1ZXM7XG4gICAgICByZXR1cm4gY2h1bmsgYXMgVG9rZW48VD47XG4gICAgfSlcbiAgKTtcbiAgaWYgKHBpcGVPcGVyYXRvcnMpIHtcbiAgICBmb3IgKGNvbnN0IG9wZXJhdG9yIG9mIHBpcGVPcGVyYXRvcnMpXG4gICAgICB0b2tlbnMgPSB0b2tlbnMucGlwZShvcGVyYXRvcik7XG4gIH1cblxuICByZXR1cm4gdG9rZW5zLnBpcGUoXG4gICAgbWFwKHRva2VuID0+IFt0b2tlbl0pLFxuICAgIG1hcENodW5rc09icyhuYW1lICsgJy1wYXJzZXInLCBfcGFyc2VHcmFtbWFyT2JzKVxuICApLnRvUHJvbWlzZSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFwQ2h1bmtzT2JzPEksIE8+KG5hbWU6IHN0cmluZywgcGFyc2U6IChsYTogTG9va0FoZWFkPEk+KSA9PiBPYnNlcnZhYmxlPE8+KTpcbihpbnB1dDogT2JzZXJ2YWJsZTxJdGVyYWJsZTxJPj4pPT4gT2JzZXJ2YWJsZTxPPiB7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGlucHV0OiBPYnNlcnZhYmxlPEl0ZXJhYmxlPEk+Pikge1xuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxPPihzdWIgPT4ge1xuICAgICAgY29uc3QgbGEgPSBuZXcgTG9va0FoZWFkPEk+KG5hbWUpO1xuICAgICAgaW5wdXQuc3Vic2NyaWJlKGlucHV0ID0+IGxhLl93cml0ZShpbnB1dCksXG4gICAgICAgIGVyciA9PiBzdWIuZXJyb3IoZXJyKSxcbiAgICAgICAgKCkgPT4gbGEuX2ZpbmFsKClcbiAgICAgICk7XG4gICAgICBwYXJzZShsYSkuc3Vic2NyaWJlKFxuICAgICAgICBvdXB1dCA9PiBzdWIubmV4dChvdXB1dCksXG4gICAgICAgIGVyciA9PiBzdWIuZXJyb3IoZXJyKSxcbiAgICAgICAgKCkgPT4gc3ViLmNvbXBsZXRlKClcbiAgICAgICk7XG4gICAgfSk7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXBDaHVua3M8SSwgVD4oXG4gIG5hbWU6IHN0cmluZyxcbiAgcGFyc2U6IFBhcnNlTGV4PEksIFQ+XG4pOiAoaW5wdXQ6IE9ic2VydmFibGU8SXRlcmFibGU8ST4+KT0+IE9ic2VydmFibGU8Q2h1bms8SSwgVD4+IHtcblxuICByZXR1cm4gZnVuY3Rpb24oaW5wdXQ6IE9ic2VydmFibGU8SXRlcmFibGU8ST4+KSB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPENodW5rPEksIFQ+PihzdWIgPT4ge1xuICAgICAgY29uc3QgbGEgPSBuZXcgTG9va0FoZWFkPEksIFQ+KG5hbWUpO1xuICAgICAgaW5wdXQuc3Vic2NyaWJlKGlucHV0ID0+IGxhLl93cml0ZShpbnB1dCksXG4gICAgICAgIGVyciA9PiBzdWIuZXJyb3IoZXJyKSxcbiAgICAgICAgKCkgPT4gbGEuX2ZpbmFsKClcbiAgICAgICk7XG4gICAgICBjb25zdCBsYSQgPSBsYSBhcyBMb29rQWhlYWRPYnNlcnZhYmxlPEksIFQ+O1xuXG4gICAgICBsYSQuc3RhcnRUb2tlbiA9IGxhLnN0YXJ0Q2h1bms7XG5cbiAgICAgIGxhJC5lbWl0VG9rZW4gPSBmdW5jdGlvbih0aGlzOiBMb29rQWhlYWRPYnNlcnZhYmxlPEksIFQ+KSB7XG4gICAgICAgIGNvbnN0IGNodW5rID0gdGhpcy5jbG9zZUNodW5rKCk7XG4gICAgICAgIHN1Yi5uZXh0KGNodW5rKTtcbiAgICAgICAgcmV0dXJuIGNodW5rO1xuICAgICAgfTtcbiAgICAgIHBhcnNlKGxhJCwgc3ViKVxuICAgICAgLnRoZW4oKCkgPT4gc3ViLmNvbXBsZXRlKCkpO1xuICAgIH0pO1xuICB9O1xufVxuXG5leHBvcnQgY2xhc3MgTG9va0FoZWFkPFQsIFRUID0gYW55PiB7XG4gIGNhY2hlZDogQXJyYXk8VHxudWxsPjtcbiAgbGFzdENvbnN1bWVkOiBUfHVuZGVmaW5lZHxudWxsO1xuICAvLyBpc1N0cmluZzogYm9vbGVhbjtcbiAgbGluZSA9IDE7XG4gIGNvbHVtbiA9IDE7XG4gIHByb3RlY3RlZCBjdXJyUG9zID0gMDtcbiAgcHJpdmF0ZSBjYWNoZVN0YXJ0UG9zID0gMDsgLy8gQ3VycmVudGx5IGlzIGFsd2F5cyBzYW1lIGFzIGN1cnJQb3NcbiAgcHJpdmF0ZSByZWFkUmVzb2x2ZTogKHZhbHVlOiBUIHwgbnVsbCkgPT4gdm9pZCB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSB3YWl0Rm9yUG9zOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgY3VyckNodW5rOiBDaHVuazxULCBUVD47XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIG5hbWU6IHN0cmluZykge1xuICAgIHRoaXMuY2FjaGVkID0gW107XG4gIH1cblxuICBfd3JpdGUodmFsdWVzOiBJdGVyYWJsZTxUfG51bGw+KSB7XG4gICAgdGhpcy5jYWNoZWQucHVzaCguLi52YWx1ZXMpO1xuXG4gICAgaWYgKHRoaXMucmVhZFJlc29sdmUgIT0gbnVsbCkge1xuICAgICAgY29uc3QgcmVzb2x2ZSA9IHRoaXMucmVhZFJlc29sdmU7XG4gICAgICBjb25zdCBjYWNoZU9mZnNldCA9IHRoaXMud2FpdEZvclBvcyEgLSB0aGlzLmNhY2hlU3RhcnRQb3M7XG4gICAgICBpZiAoY2FjaGVPZmZzZXQgPCB0aGlzLmNhY2hlZC5sZW5ndGgpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMucmVhZFJlc29sdmU7XG4gICAgICAgIGRlbGV0ZSB0aGlzLndhaXRGb3JQb3M7XG4gICAgICAgIHJlc29sdmUodGhpcy5jYWNoZWRbY2FjaGVPZmZzZXRdKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBfZmluYWwoKSB7XG4gICAgdGhpcy5fd3JpdGUoW251bGxdKTtcbiAgfVxuXG4gIGdldCBwb3NpdGlvbigpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLmN1cnJQb3M7XG4gIH1cblxuICAvKipcblx0ICogbG9vayBhaGVhZCBmb3IgMSBjaGFyYWN0ZXJcblx0ICogQHBhcmFtIG51bSBkZWZhdWx0IGlzIDFcblx0ICogQHJldHVybiBudWxsIGlmIEVPRiBpcyByZWFjaGVkXG5cdCAqL1xuICBsYShudW0gPSAxKTogUHJvbWlzZTxUIHwgbnVsbD4ge1xuICAgIGNvbnN0IHJlYWRQb3MgPSB0aGlzLmN1cnJQb3MgKyBudW0gLSAxO1xuICAgIHJldHVybiB0aGlzLnJlYWQocmVhZFBvcyk7XG4gIH1cblxuICAvLyBsYihudW0gPSAxKTogVCB8IG51bGwge1xuICAvLyAgIGNvbnN0IHBvcyA9IHRoaXMuY3VyclBvcyAtIChudW0gLSAxKTtcbiAgLy8gICBpZiAocG9zIDwgMClcbiAgLy8gICAgIHJldHVybiBudWxsO1xuICAvLyAgIHJldHVybiB0aGlzLnJlYWQocG9zKTtcbiAgLy8gfVxuXG4gIGFkdmFuY2UoY291bnQgPSAxKTogUHJvbWlzZTxUPiB7XG4gICAgLy8gY29uc3Qgc3RhY2sgPSBuZXcgRXJyb3IoKS5zdGFjaztcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICBsZXQgY3VyclZhbHVlOiBUO1xuICAgICAgbGV0IGkgPSAwO1xuXG4gICAgICBjb25zdCByZWFkID0gKCkgPT4ge1xuICAgICAgICBpZiAoaSsrIDwgY291bnQpIHtcbiAgICAgICAgICB0aGlzLmxhKDEpXG4gICAgICAgICAgLnRoZW4odmFsdWUgPT4ge1xuICAgICAgICAgICAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudGhyb3dFcnJvcignVW5leHBlY3QgRU9GJyk7IC8vICwgc3RhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jdXJyUG9zKys7XG4gICAgICAgICAgICB0aGlzLmNvbHVtbisrO1xuICAgICAgICAgICAgaWYgKCh2YWx1ZSBhcyBhbnkpID09PSAnXFxuJykge1xuICAgICAgICAgICAgICB0aGlzLmxpbmUrKztcbiAgICAgICAgICAgICAgdGhpcy5jb2x1bW4gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jYWNoZWQuc2hpZnQoKTtcbiAgICAgICAgICAgIHRoaXMuY2FjaGVTdGFydFBvcysrO1xuICAgICAgICAgICAgaWYgKHRoaXMuY3VyckNodW5rICYmICF0aGlzLmN1cnJDaHVuay5pc0Nsb3NlZCAmJiB0aGlzLmN1cnJDaHVuay50cmFja1ZhbHVlKSB7XG4gICAgICAgICAgICAgIHRoaXMuY3VyckNodW5rLnZhbHVlcyEucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXJyVmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIHJlYWQoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLmxhc3RDb25zdW1lZCA9IGN1cnJWYWx1ZTtcbiAgICAgICAgICByZXNvbHZlKGN1cnJWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICByZWFkKCk7XG4gICAgfSk7XG4gIH1cblxuICBpc05leHQoLi4udmFsdWVzOiBUW10pIHtcbiAgICByZXR1cm4gdGhpcy5pc05leHRXaXRoKHZhbHVlcyk7XG4gIH1cbiAgLyoqXG5cdCAqIFNhbWUgYXMgYHJldHVybiBsYSgxKSA9PT0gdmFsdWVzWzBdICYmIGxhKDIpID09PSB2YWx1ZXNbMV0uLi5gXG5cdCAqIEBwYXJhbSB2YWx1ZXMgbG9va2FoZWFkIHN0cmluZyBvciB0b2tlbnNcblx0ICovXG4gIGFzeW5jIGlzTmV4dFdpdGg8Qz4odmFsdWVzOiBDW10sIGlzRXF1YWwgPSAoYTogVCwgYjogQykgPT4gYSBhcyBhbnkgPT09IGIpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBsZXQgY29tcGFyZVRvOiBDW118IHN0cmluZztcbiAgICBsZXQgY29tcGFyZUZuOiAoLi4uYXJnOiBhbnlbXSkgPT4gYm9vbGVhbjtcbiAgICBjb21wYXJlVG8gPSB2YWx1ZXM7XG4gICAgY29tcGFyZUZuID0gaXNFcXVhbDtcbiAgICBsZXQgaSA9IDA7XG4gICAgY29uc3QgbCA9IGNvbXBhcmVUby5sZW5ndGg7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGlmIChpID09PSBsKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIGNvbnN0IG5leHQgPSBhd2FpdCB0aGlzLmxhKGkgKyAxKTtcbiAgICAgIGlmIChuZXh0ID09IG51bGwpXG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gRU9GXG4gICAgICBlbHNlIGlmICghY29tcGFyZUZuKG5leHQsIGNvbXBhcmVUb1tpXSkpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIGkrKztcbiAgICB9XG4gIH1cblxuICBhc3NlcnRBZHZhbmNlKC4uLnZhbHVlczogVFtdKSB7XG4gICAgcmV0dXJuIHRoaXMuYXNzZXJ0QWR2YW5jZVdpdGgodmFsdWVzKTtcbiAgfVxuXG4gIGFzeW5jIGFzc2VydEFkdmFuY2VXaXRoPEM+KHZhbHVlczogQ1tdLCBpc0VxdWFsID0gKGE6IFQsIGI6IEMpID0+IGEgYXMgYW55ID09PSBiKSB7XG4gICAgbGV0IGNvbXBhcmVUbzogQ1tdfCBzdHJpbmc7XG4gICAgbGV0IGNvbXBhcmVGbjogKC4uLmFyZzogYW55W10pID0+IGJvb2xlYW47XG4gICAgY29tcGFyZVRvID0gdmFsdWVzO1xuICAgIGNvbXBhcmVGbiA9IGlzRXF1YWw7XG4gICAgbGV0IGkgPSAwO1xuICAgIGNvbnN0IGwgPSBjb21wYXJlVG8ubGVuZ3RoO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBpZiAoaSA9PT0gbClcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBjb25zdCBuZXh0ID0gYXdhaXQgdGhpcy5hZHZhbmNlKGkgKyAxKTtcbiAgICAgIGlmIChuZXh0ID09IG51bGwpXG4gICAgICAgIHRoaXMudGhyb3dFcnJvcignRU9GJywgbmV3IEVycm9yKCkuc3RhY2spOyAvLyBFT0ZcbiAgICAgIGVsc2UgaWYgKCFjb21wYXJlRm4obmV4dCwgY29tcGFyZVRvW2ldKSlcbiAgICAgICAgdGhpcy50aHJvd0Vycm9yKHV0aWwuaW5zcGVjdChuZXh0KSwgbmV3IEVycm9yKCkuc3RhY2ssIGNvbXBhcmVUb1tpXSArICcnKTtcbiAgICAgIGkrKztcbiAgICB9XG4gIH1cblxuICB0aHJvd0Vycm9yKHVuZXhwZWN0ZWQgPSAnRW5kLW9mLXN0cmVhbScsIHN0YWNrPzogYW55LCBleHBlY3Q/OiBzdHJpbmcpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG1heC1saW5lLWxlbmd0aFxuICAgIHRocm93IG5ldyBFcnJvcihgSW4gJHt0aGlzLm5hbWV9IHVuZXhwZWN0ZWQgJHtKU09OLnN0cmluZ2lmeSh1bmV4cGVjdGVkKX1gK1xuICAgIChleHBlY3QgPyBgKGV4cGVjdGluZyBcIiR7ZXhwZWN0fVwiKWAgOiAnJykgK1xuICAgIGBhdCAke3RoaXMuZ2V0Q3VycmVudFBvc0luZm8oKX0sICR7c3RhY2sgPyAncHJldmlvdXMgc3RhY2s6JyArIHN0YWNrIDogJyd9YCk7XG4gIH1cblxuICBnZXRDdXJyZW50UG9zSW5mbygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgb2Zmc2V0ICR7dGhpcy5jdXJyUG9zfSBbJHt0aGlzLmxpbmV9OiR7dGhpcy5jb2x1bW59XWA7XG4gIH1cblxuICBzdGFydENodW5rKHR5cGU6IFRULCB0cmFja1ZhbHVlID0gdHJ1ZSkge1xuICAgIGlmICh0aGlzLmN1cnJDaHVuayAmJiAhdGhpcy5jdXJyQ2h1bmsuaXNDbG9zZWQpXG4gICAgICB0aGlzLmN1cnJDaHVuay5jbG9zZSh0aGlzLmN1cnJQb3MpO1xuICAgIHRoaXMuY3VyckNodW5rID0gbmV3IENodW5rPFQsIFRUPih0aGlzLmN1cnJQb3MsIHRoaXMubGluZSwgdGhpcy5jb2x1bW4pO1xuICAgIHRoaXMuY3VyckNodW5rLnRyYWNrVmFsdWUgPSB0cmFja1ZhbHVlO1xuICAgIHRoaXMuY3VyckNodW5rLnR5cGUgPSB0eXBlO1xuICAgIHJldHVybiB0aGlzLmN1cnJDaHVuaztcbiAgfVxuXG4gIGNsb3NlQ2h1bmsoKSB7XG4gICAgcmV0dXJuIHRoaXMuY3VyckNodW5rLmNsb3NlKHRoaXMuY3VyclBvcyk7XG4gIH1cblxuICAvKipcblx0ICogRG8gbm90IHJlYWQgcG9zdGlvbiBsZXNzIHRoYW4gMFxuXHQgKiBAcGFyYW0gcG9zIFxuXHQgKi9cbiAgcHJvdGVjdGVkIHJlYWQocG9zOiBudW1iZXIpOiBQcm9taXNlPFQgfCBudWxsPiB7XG4gICAgY29uc3QgY2FjaGVPZmZzZXQgPSBwb3MgLSB0aGlzLmNhY2hlU3RhcnRQb3M7XG4gICAgaWYgKGNhY2hlT2Zmc2V0IDwgMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gbm90IHJlYWQgYmVoaW5kIHN0cmVhbSBjYWNoZSwgYXQgcG9zaXRpb246ICR7cG9zfWApO1xuICAgIH1cbiAgICBpZiAoY2FjaGVPZmZzZXQgPCB0aGlzLmNhY2hlZC5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5jYWNoZWRbY2FjaGVPZmZzZXRdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy53YWl0Rm9yUG9zID0gcG9zO1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICB0aGlzLnJlYWRSZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIExvb2tBaGVhZE9ic2VydmFibGU8ViwgVD4gZXh0ZW5kcyBMb29rQWhlYWQ8ViwgVD4ge1xuICBzdGFydFRva2VuOiBMb29rQWhlYWQ8ViwgVD5bJ3N0YXJ0Q2h1bmsnXTtcbiAgZW1pdFRva2VuKCk6IENodW5rPFYsIFQ+O1xufVxuXG4iXX0=