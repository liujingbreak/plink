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
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
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
    /**
       * Same as `return la(1) === values[0] && la(2) === values[1]...`
       * @param values lookahead string or tokens
       */
    isNext(...values) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._isNext(values);
        });
    }
    _isNext(values, isEqual = (a, b) => a === b) {
        return __awaiter(this, void 0, void 0, function* () {
            let compareTo;
            let compareFn;
            if (this.isString) {
                compareTo = values.join('');
                compareFn = (a, b) => a === b;
            }
            else {
                compareTo = values;
                compareFn = isEqual;
            }
            let i = 0;
            const l = compareTo.length;
            let next = yield this.la(i + 1);
            while (true) {
                if (i === l)
                    return true;
                next = yield this.la(i + 1);
                if (next == null)
                    return false; // EOF
                else if (!compareFn(next, compareTo[i]))
                    return false;
                i++;
            }
        });
    }
    throwError(unexpected = 'End-of-stream', stack) {
        // tslint:disable-next-line: max-line-length
        throw new Error(`In ${this.name} unexpected ${JSON.stringify(unexpected)} at ${this.getCurrentPosInfo()}, ${stack ? 'previous stack:' + stack : ''}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMtTExuLXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FzeW5jLUxMbi1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLCtCQUFvRjtBQUNwRiw4Q0FBOEM7QUFDOUMsTUFBYSxLQUFLO0lBT2hCLFlBQ1MsR0FBVyxFQUFTLElBQVksRUFBUyxHQUFXO1FBQXBELFFBQUcsR0FBSCxHQUFHLENBQVE7UUFBUyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQVMsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQU43RCxXQUFNLEdBQVMsRUFBRSxDQUFDO1FBRWxCLGFBQVEsR0FBRyxLQUFLLENBQUM7UUFDakIsZUFBVSxHQUFHLElBQUksQ0FBQztJQUlmLENBQUM7SUFFSixLQUFLLENBQUMsUUFBZ0I7UUFDcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDckIsSUFBSSxDQUFDLEdBQUcsR0FBRyxRQUFRLENBQUM7UUFDcEIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQ0Y7QUFoQkQsc0JBZ0JDO0FBRUQsTUFBYSxLQUFTLFNBQVEsS0FBZ0I7Q0FFN0M7QUFGRCxzQkFFQztBQU1EOzs7OztHQUtHO0FBQ0gsU0FBZ0IsTUFBTSxDQUNwQixJQUFZLEVBQ1osS0FBOEIsRUFDOUIsUUFBd0IsRUFDeEIsYUFBb0UsRUFDcEUsWUFBZ0M7SUFHaEMsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLEVBQTBCLEVBQUUsRUFBRTtRQUN0RCxPQUFPLFdBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNoQyxDQUFDLENBQUM7SUFFRixJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUNyQixxQkFBUyxDQUFDLHFCQUFjLENBQUMsRUFDekIsU0FBUyxDQUFDLElBQUksR0FBRyxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQ3BDLGVBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNU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QUFVO1FBQ1IsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVEOzs7U0FHRTtJQUNRLElBQUksQ0FBQyxHQUFXO1FBQ3hCLE1BQU0sV0FBVyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDO1FBQzdDLElBQUksV0FBVyxHQUFHLENBQUMsRUFBRTtZQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLGtEQUFrRCxHQUFHLEVBQUUsQ0FBQyxDQUFDO1NBQzFFO1FBQ0QsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7WUFDcEMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztTQUNsRDthQUFNO1lBQ0wsSUFBSSxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUM7WUFDdEIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDM0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUM7WUFDN0IsQ0FBQyxDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7Q0FDRjtBQXBLRCw4QkFvS0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge09ic2VydmFibGUsIFN1YnNjcmliZXIsIGZyb20sIE9wZXJhdG9yRnVuY3Rpb24sIHF1ZXVlU2NoZWR1bGVyfSBmcm9tICdyeGpzJztcbmltcG9ydCB7bWFwLCBvYnNlcnZlT259IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmV4cG9ydCBjbGFzcyBDaHVuazxWLCBUPiB7XG4gIHR5cGU6IFQ7XG4gIHZhbHVlcz86IFZbXSA9IFtdO1xuICBlbmQ/OiBudW1iZXI7XG4gIGlzQ2xvc2VkID0gZmFsc2U7XG4gIHRyYWNrVmFsdWUgPSB0cnVlO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyBwb3M6IG51bWJlciwgcHVibGljIGxpbmU6IG51bWJlciwgcHVibGljIGNvbDogbnVtYmVyXG4gICkge31cblxuICBjbG9zZShwb3NpdGlvbjogbnVtYmVyKSB7XG4gICAgdGhpcy5pc0Nsb3NlZCA9IHRydWU7XG4gICAgdGhpcy5lbmQgPSBwb3NpdGlvbjtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVG9rZW48VD4gZXh0ZW5kcyBDaHVuazxzdHJpbmcsIFQ+IHtcbiAgdGV4dDogc3RyaW5nO1xufVxuLyoqXG4gKiBZb3UgY2FuIGRlZmluZSBhIGxleGVyIGFzIGEgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IHR5cGUgUGFyc2VMZXg8SSwgVD4gPSAobGE6IExvb2tBaGVhZE9ic2VydmFibGU8SSxUPiwgc3ViOiBTdWJzY3JpYmVyPENodW5rPEksIFQ+PikgPT4gUHJvbWlzZTxhbnk+O1xuZXhwb3J0IHR5cGUgUGFyc2VHcmFtbWFyPEEsIFQ+ID0gKGxhOiBMb29rQWhlYWQ8VG9rZW48VD4sIFQ+KSA9PiBQcm9taXNlPEE+O1xuLyoqXG4gKiBQYXJzZXJcbiAqIEBwYXJhbSBpbnB1dCBzdHJpbmcgdHlwZVxuICogQHBhcmFtIHBhcnNlTGV4IFxuICogQHBhcmFtIHBhcnNlR3JhbW1hciBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlcjxJLCBBLCBUPihcbiAgbmFtZTogc3RyaW5nLFxuICBpbnB1dDogT2JzZXJ2YWJsZTxJdGVyYWJsZTxJPj4sXG4gIHBhcnNlTGV4OiBQYXJzZUxleDxJLCBUPixcbiAgcGlwZU9wZXJhdG9yczogSXRlcmFibGU8T3BlcmF0b3JGdW5jdGlvbjxUb2tlbjxUPiwgVG9rZW48VD4+PiB8IG51bGwsXG4gIHBhcnNlR3JhbW1hcjogUGFyc2VHcmFtbWFyPEEsIFQ+XG4pOiBQcm9taXNlPEE+IHtcblxuICBjb25zdCBfcGFyc2VHcmFtbWFyT2JzID0gKGxhOiBMb29rQWhlYWQ8VG9rZW48VD4sIFQ+KSA9PiB7XG4gICAgcmV0dXJuIGZyb20ocGFyc2VHcmFtbWFyKGxhKSk7XG4gIH07XG5cbiAgbGV0IHRva2VucyA9IGlucHV0LnBpcGUoXG4gICAgb2JzZXJ2ZU9uKHF1ZXVlU2NoZWR1bGVyKSxcbiAgICBtYXBDaHVua3MobmFtZSArICctbGV4ZXInLCBwYXJzZUxleCksXG4gICAgbWFwKGNodW5rID0+IHtcbiAgICAgIChjaHVuayBhcyBUb2tlbjxUPikudGV4dCA9IGNodW5rLnZhbHVlcyEuam9pbignJyk7XG4gICAgICBkZWxldGUgY2h1bmsudmFsdWVzO1xuICAgICAgcmV0dXJuIGNodW5rIGFzIFRva2VuPFQ+O1xuICAgIH0pXG4gICk7XG4gIGlmIChwaXBlT3BlcmF0b3JzKSB7XG4gICAgZm9yIChjb25zdCBvcGVyYXRvciBvZiBwaXBlT3BlcmF0b3JzKVxuICAgICAgdG9rZW5zID0gdG9rZW5zLnBpcGUob3BlcmF0b3IpO1xuICB9XG5cbiAgcmV0dXJuIHRva2Vucy5waXBlKFxuICAgIG1hcCh0b2tlbiA9PiBbdG9rZW5dKSxcbiAgICBtYXBDaHVua3NPYnMobmFtZSArICctcGFyc2VyJywgX3BhcnNlR3JhbW1hck9icylcbiAgKS50b1Byb21pc2UoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hcENodW5rc09iczxJLCBPPihuYW1lOiBzdHJpbmcsIHBhcnNlOiAobGE6IExvb2tBaGVhZDxJPikgPT4gT2JzZXJ2YWJsZTxPPik6XG4oaW5wdXQ6IE9ic2VydmFibGU8SXRlcmFibGU8ST4+KT0+IE9ic2VydmFibGU8Tz4ge1xuXG4gIHJldHVybiBmdW5jdGlvbihpbnB1dDogT2JzZXJ2YWJsZTxJdGVyYWJsZTxJPj4pIHtcbiAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8Tz4oc3ViID0+IHtcbiAgICAgIGNvbnN0IGxhID0gbmV3IExvb2tBaGVhZDxJPihuYW1lKTtcbiAgICAgIGlucHV0LnN1YnNjcmliZShpbnB1dCA9PiBsYS5fd3JpdGUoaW5wdXQpLFxuICAgICAgICBlcnIgPT4gc3ViLmVycm9yKGVyciksXG4gICAgICAgICgpID0+IGxhLl9maW5hbCgpXG4gICAgICApO1xuICAgICAgcGFyc2UobGEpLnN1YnNjcmliZShcbiAgICAgICAgb3VwdXQgPT4gc3ViLm5leHQob3VwdXQpLFxuICAgICAgICBlcnIgPT4gc3ViLmVycm9yKGVyciksXG4gICAgICAgICgpID0+IHN1Yi5jb21wbGV0ZSgpXG4gICAgICApO1xuICAgIH0pO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFwQ2h1bmtzPEksIFQ+KFxuICBuYW1lOiBzdHJpbmcsXG4gIHBhcnNlOiBQYXJzZUxleDxJLCBUPlxuKTogKGlucHV0OiBPYnNlcnZhYmxlPEl0ZXJhYmxlPEk+Pik9PiBPYnNlcnZhYmxlPENodW5rPEksIFQ+PiB7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGlucHV0OiBPYnNlcnZhYmxlPEl0ZXJhYmxlPEk+Pikge1xuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxDaHVuazxJLCBUPj4oc3ViID0+IHtcbiAgICAgIGNvbnN0IGxhID0gbmV3IExvb2tBaGVhZDxJLCBUPihuYW1lKTtcbiAgICAgIGlucHV0LnN1YnNjcmliZShpbnB1dCA9PiBsYS5fd3JpdGUoaW5wdXQpLFxuICAgICAgICBlcnIgPT4gc3ViLmVycm9yKGVyciksXG4gICAgICAgICgpID0+IGxhLl9maW5hbCgpXG4gICAgICApO1xuICAgICAgY29uc3QgbGEkID0gbGEgYXMgTG9va0FoZWFkT2JzZXJ2YWJsZTxJLCBUPjtcblxuICAgICAgbGEkLnN0YXJ0VG9rZW4gPSBsYS5zdGFydENodW5rO1xuXG4gICAgICBsYSQuZW1pdFRva2VuID0gZnVuY3Rpb24odGhpczogTG9va0FoZWFkT2JzZXJ2YWJsZTxJLCBUPikge1xuICAgICAgICBjb25zdCBjaHVuayA9IHRoaXMuY2xvc2VDaHVuaygpO1xuICAgICAgICBzdWIubmV4dChjaHVuayk7XG4gICAgICAgIHJldHVybiBjaHVuaztcbiAgICAgIH07XG4gICAgICBwYXJzZShsYSQsIHN1YilcbiAgICAgIC50aGVuKCgpID0+IHN1Yi5jb21wbGV0ZSgpKTtcbiAgICB9KTtcbiAgfTtcbn1cblxuZXhwb3J0IGNsYXNzIExvb2tBaGVhZDxULCBUVCA9IGFueT4ge1xuICBjYWNoZWQ6IEFycmF5PFR8bnVsbD47XG4gIGxhc3RDb25zdW1lZDogVHx1bmRlZmluZWR8bnVsbDtcbiAgaXNTdHJpbmc6IGJvb2xlYW47XG4gIGxpbmUgPSAxO1xuICBjb2x1bW4gPSAxO1xuICBwcm90ZWN0ZWQgY3VyclBvcyA9IDA7XG4gIHByaXZhdGUgY2FjaGVTdGFydFBvcyA9IDA7IC8vIEN1cnJlbnRseSBpcyBhbHdheXMgc2FtZSBhcyBjdXJyUG9zXG4gIHByaXZhdGUgcmVhZFJlc29sdmU6ICh2YWx1ZTogVCB8IG51bGwpID0+IHZvaWQgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgd2FpdEZvclBvczogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIGN1cnJDaHVuazogQ2h1bms8VCwgVFQ+O1xuXG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBuYW1lOiBzdHJpbmcpIHtcbiAgICB0aGlzLmNhY2hlZCA9IFtdO1xuICB9XG5cbiAgX3dyaXRlKHZhbHVlczogSXRlcmFibGU8VHxudWxsPikge1xuICAgIHRoaXMuY2FjaGVkLnB1c2goLi4udmFsdWVzKTtcblxuICAgIGlmICh0aGlzLnJlYWRSZXNvbHZlICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IHJlc29sdmUgPSB0aGlzLnJlYWRSZXNvbHZlO1xuICAgICAgY29uc3QgY2FjaGVPZmZzZXQgPSB0aGlzLndhaXRGb3JQb3MhIC0gdGhpcy5jYWNoZVN0YXJ0UG9zO1xuICAgICAgaWYgKGNhY2hlT2Zmc2V0IDwgdGhpcy5jYWNoZWQubGVuZ3RoKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnJlYWRSZXNvbHZlO1xuICAgICAgICBkZWxldGUgdGhpcy53YWl0Rm9yUG9zO1xuICAgICAgICByZXNvbHZlKHRoaXMuY2FjaGVkW2NhY2hlT2Zmc2V0XSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgX2ZpbmFsKCkge1xuICAgIHRoaXMuX3dyaXRlKFtudWxsXSk7XG4gIH1cblxuICBnZXQgcG9zaXRpb24oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyUG9zO1xuICB9XG5cbiAgLyoqXG5cdCAqIGxvb2sgYWhlYWQgZm9yIDEgY2hhcmFjdGVyXG5cdCAqIEBwYXJhbSBudW0gZGVmYXVsdCBpcyAxXG5cdCAqIEByZXR1cm4gbnVsbCBpZiBFT0YgaXMgcmVhY2hlZFxuXHQgKi9cbiAgbGEobnVtID0gMSk6IFByb21pc2U8VCB8IG51bGw+IHtcbiAgICBjb25zdCByZWFkUG9zID0gdGhpcy5jdXJyUG9zICsgbnVtIC0gMTtcbiAgICByZXR1cm4gdGhpcy5yZWFkKHJlYWRQb3MpO1xuICB9XG5cbiAgLy8gbGIobnVtID0gMSk6IFQgfCBudWxsIHtcbiAgLy8gICBjb25zdCBwb3MgPSB0aGlzLmN1cnJQb3MgLSAobnVtIC0gMSk7XG4gIC8vICAgaWYgKHBvcyA8IDApXG4gIC8vICAgICByZXR1cm4gbnVsbDtcbiAgLy8gICByZXR1cm4gdGhpcy5yZWFkKHBvcyk7XG4gIC8vIH1cblxuICBhZHZhbmNlKGNvdW50ID0gMSk6IFByb21pc2U8VD4ge1xuICAgIC8vIGNvbnN0IHN0YWNrID0gbmV3IEVycm9yKCkuc3RhY2s7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgbGV0IGN1cnJWYWx1ZTogVDtcbiAgICAgIGxldCBpID0gMDtcblxuICAgICAgY29uc3QgcmVhZCA9ICgpID0+IHtcbiAgICAgICAgaWYgKGkrKyA8IGNvdW50KSB7XG4gICAgICAgICAgdGhpcy5sYSgxKVxuICAgICAgICAgIC50aGVuKHZhbHVlID0+IHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLnRocm93RXJyb3IoJ1VuZXhwZWN0IEVPRicpOyAvLyAsIHN0YWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY3VyclBvcysrO1xuICAgICAgICAgICAgdGhpcy5jb2x1bW4rKztcbiAgICAgICAgICAgIGlmICgodmFsdWUgYXMgYW55KSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgdGhpcy5saW5lKys7XG4gICAgICAgICAgICAgIHRoaXMuY29sdW1uID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY2FjaGVkLnNoaWZ0KCk7XG4gICAgICAgICAgICB0aGlzLmNhY2hlU3RhcnRQb3MrKztcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJDaHVuayAmJiAhdGhpcy5jdXJyQ2h1bmsuaXNDbG9zZWQgJiYgdGhpcy5jdXJyQ2h1bmsudHJhY2tWYWx1ZSkge1xuICAgICAgICAgICAgICB0aGlzLmN1cnJDaHVuay52YWx1ZXMhLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3VyclZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICByZWFkKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5sYXN0Q29uc3VtZWQgPSBjdXJyVmFsdWU7XG4gICAgICAgICAgcmVzb2x2ZShjdXJyVmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgcmVhZCgpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG5cdCAqIFNhbWUgYXMgYHJldHVybiBsYSgxKSA9PT0gdmFsdWVzWzBdICYmIGxhKDIpID09PSB2YWx1ZXNbMV0uLi5gXG5cdCAqIEBwYXJhbSB2YWx1ZXMgbG9va2FoZWFkIHN0cmluZyBvciB0b2tlbnNcblx0ICovXG4gIGFzeW5jIGlzTmV4dCguLi52YWx1ZXM6IFRbXSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHJldHVybiB0aGlzLl9pc05leHQ8VD4odmFsdWVzKTtcbiAgfVxuXG4gIGFzeW5jIF9pc05leHQ8Qz4odmFsdWVzOiBDW10sIGlzRXF1YWwgPSAoYTogVCwgYjogQykgPT4gYSBhcyBhbnkgPT09IGIpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBsZXQgY29tcGFyZVRvOiBDW118IHN0cmluZztcbiAgICBsZXQgY29tcGFyZUZuOiAoLi4uYXJnOiBhbnlbXSkgPT4gYm9vbGVhbjtcbiAgICBpZiAodGhpcy5pc1N0cmluZykge1xuICAgICAgY29tcGFyZVRvID0gdmFsdWVzLmpvaW4oJycpO1xuICAgICAgY29tcGFyZUZuID0gKGE6IHN0cmluZywgYjogc3RyaW5nKSA9PiBhID09PSBiO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21wYXJlVG8gPSB2YWx1ZXM7XG4gICAgICBjb21wYXJlRm4gPSBpc0VxdWFsO1xuICAgIH1cbiAgICBsZXQgaSA9IDA7XG4gICAgY29uc3QgbCA9IGNvbXBhcmVUby5sZW5ndGg7XG4gICAgbGV0IG5leHQgPSBhd2FpdCB0aGlzLmxhKGkgKyAxKTtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgaWYgKGkgPT09IGwpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgbmV4dCA9IGF3YWl0IHRoaXMubGEoaSArIDEpO1xuICAgICAgaWYgKG5leHQgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBFT0ZcbiAgICAgIGVsc2UgaWYgKCFjb21wYXJlRm4obmV4dCwgY29tcGFyZVRvW2ldKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuXG4gIHRocm93RXJyb3IodW5leHBlY3RlZCA9ICdFbmQtb2Ytc3RyZWFtJywgc3RhY2s/OiBhbnkpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG1heC1saW5lLWxlbmd0aFxuICAgIHRocm93IG5ldyBFcnJvcihgSW4gJHt0aGlzLm5hbWV9IHVuZXhwZWN0ZWQgJHtKU09OLnN0cmluZ2lmeSh1bmV4cGVjdGVkKX0gYXQgJHt0aGlzLmdldEN1cnJlbnRQb3NJbmZvKCl9LCAke3N0YWNrID8gJ3ByZXZpb3VzIHN0YWNrOicgKyBzdGFjayA6ICcnfWApO1xuICB9XG5cbiAgZ2V0Q3VycmVudFBvc0luZm8oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYG9mZnNldCAke3RoaXMuY3VyclBvc30gWyR7dGhpcy5saW5lfToke3RoaXMuY29sdW1ufV1gO1xuICB9XG5cbiAgc3RhcnRDaHVuayh0eXBlOiBUVCwgdHJhY2tWYWx1ZSA9IHRydWUpIHtcbiAgICBpZiAodGhpcy5jdXJyQ2h1bmsgJiYgIXRoaXMuY3VyckNodW5rLmlzQ2xvc2VkKVxuICAgICAgdGhpcy5jdXJyQ2h1bmsuY2xvc2UodGhpcy5jdXJyUG9zKTtcbiAgICB0aGlzLmN1cnJDaHVuayA9IG5ldyBDaHVuazxULCBUVD4odGhpcy5jdXJyUG9zLCB0aGlzLmxpbmUsIHRoaXMuY29sdW1uKTtcbiAgICB0aGlzLmN1cnJDaHVuay50cmFja1ZhbHVlID0gdHJhY2tWYWx1ZTtcbiAgICB0aGlzLmN1cnJDaHVuay50eXBlID0gdHlwZTtcbiAgICByZXR1cm4gdGhpcy5jdXJyQ2h1bms7XG4gIH1cblxuICBjbG9zZUNodW5rKCkge1xuICAgIHJldHVybiB0aGlzLmN1cnJDaHVuay5jbG9zZSh0aGlzLmN1cnJQb3MpO1xuICB9XG5cbiAgLyoqXG5cdCAqIERvIG5vdCByZWFkIHBvc3Rpb24gbGVzcyB0aGFuIDBcblx0ICogQHBhcmFtIHBvcyBcblx0ICovXG4gIHByb3RlY3RlZCByZWFkKHBvczogbnVtYmVyKTogUHJvbWlzZTxUIHwgbnVsbD4ge1xuICAgIGNvbnN0IGNhY2hlT2Zmc2V0ID0gcG9zIC0gdGhpcy5jYWNoZVN0YXJ0UG9zO1xuICAgIGlmIChjYWNoZU9mZnNldCA8IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCByZWFkIGJlaGluZCBzdHJlYW0gY2FjaGUsIGF0IHBvc2l0aW9uOiAke3Bvc31gKTtcbiAgICB9XG4gICAgaWYgKGNhY2hlT2Zmc2V0IDwgdGhpcy5jYWNoZWQubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuY2FjaGVkW2NhY2hlT2Zmc2V0XSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMud2FpdEZvclBvcyA9IHBvcztcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgdGhpcy5yZWFkUmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBMb29rQWhlYWRPYnNlcnZhYmxlPFYsIFQ+IGV4dGVuZHMgTG9va0FoZWFkPFYsIFQ+IHtcbiAgc3RhcnRUb2tlbjogTG9va0FoZWFkPFYsIFQ+WydzdGFydENodW5rJ107XG4gIGVtaXRUb2tlbigpOiBDaHVuazxWLCBUPjtcbn1cblxuIl19