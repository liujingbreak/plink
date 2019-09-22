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
    let tokens = input.pipe(mapChunks(name + '-lexer', parseLex))
        .pipe(operators_1.map(chunk => {
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
                sub.next(this.closeChunk());
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
                        if (this.currChunk && !this.currChunk.isClosed) {
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
    startChunk(type) {
        if (this.currChunk && !this.currChunk.isClosed)
            this.currChunk.close(this.currPos);
        this.currChunk = new Chunk(this.currPos, this.line, this.column);
        this.currChunk.type = type;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMtTExuLXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FzeW5jLUxMbi1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLCtCQUFvRTtBQUNwRSw4Q0FBbUM7QUFDbkMsTUFBYSxLQUFLO0lBTWhCLFlBQ1MsR0FBVyxFQUFTLElBQVksRUFBUyxHQUFXO1FBQXBELFFBQUcsR0FBSCxHQUFHLENBQVE7UUFBUyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQVMsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUw3RCxXQUFNLEdBQVMsRUFBRSxDQUFDO1FBRWxCLGFBQVEsR0FBRyxLQUFLLENBQUM7SUFJZCxDQUFDO0lBRUosS0FBSyxDQUFDLFFBQWdCO1FBQ3BCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDO1FBQ3BCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUNGO0FBZkQsc0JBZUM7QUFFRCxNQUFhLEtBQU0sU0FBUSxLQUFhO0NBRXZDO0FBRkQsc0JBRUM7QUFJRDs7Ozs7R0FLRztBQUNILFNBQWdCLE1BQU0sQ0FDcEIsSUFBWSxFQUNaLEtBQXNCLEVBQ3RCLFFBQXFCLEVBQ3JCLGFBQXNELEVBQ3RELFlBQTZCO0lBRzdCLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxFQUFvQixFQUFFLEVBQUU7UUFDaEQsT0FBTyxXQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDaEMsQ0FBQyxDQUFDO0lBRUYsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUksSUFBSSxHQUFHLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztTQUMvRCxJQUFJLENBQ0gsZUFBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ1QsS0FBZSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsTUFBTyxDQUFDLElB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RCxHQUFHLEVBQUUsQ0FBQyxDQUFDO1NBQzFFO1FBQ0QsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7WUFDcEMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztTQUNsRDthQUFNO1lBQ0wsSUFBSSxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUM7WUFDdEIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDM0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUM7WUFDN0IsQ0FBQyxDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7Q0FDRjtBQWxLRCw4QkFrS0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge09ic2VydmFibGUsIFN1YnNjcmliZXIsIGZyb20sIE9wZXJhdG9yRnVuY3Rpb259IGZyb20gJ3J4anMnO1xuaW1wb3J0IHttYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmV4cG9ydCBjbGFzcyBDaHVuazxWPiB7XG4gIHR5cGU6IGFueTtcbiAgdmFsdWVzPzogVltdID0gW107XG4gIGVuZD86IG51bWJlcjtcbiAgaXNDbG9zZWQgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcG9zOiBudW1iZXIsIHB1YmxpYyBsaW5lOiBudW1iZXIsIHB1YmxpYyBjb2w6IG51bWJlclxuICApIHt9XG5cbiAgY2xvc2UocG9zaXRpb246IG51bWJlcikge1xuICAgIHRoaXMuaXNDbG9zZWQgPSB0cnVlO1xuICAgIHRoaXMuZW5kID0gcG9zaXRpb247XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFRva2VuIGV4dGVuZHMgQ2h1bms8c3RyaW5nPiB7XG4gIHRleHQ6IHN0cmluZztcbn1cblxuZXhwb3J0IHR5cGUgUGFyc2VMZXg8ST4gPSAobGE6IExvb2tBaGVhZE9ic2VydmFibGU8ST4sIHN1YjogU3Vic2NyaWJlcjxDaHVuazxJPj4pID0+IFByb21pc2U8YW55PjtcbmV4cG9ydCB0eXBlIFBhcnNlR3JhbW1hcjxBPiA9IChsYTogTG9va0FoZWFkPFRva2VuPikgPT4gUHJvbWlzZTxBPjtcbi8qKlxuICogUGFyc2VyXG4gKiBAcGFyYW0gaW5wdXQgc3RyaW5nIHR5cGVcbiAqIEBwYXJhbSBwYXJzZUxleCBcbiAqIEBwYXJhbSBwYXJzZUdyYW1tYXIgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZXI8SSwgQT4oXG4gIG5hbWU6IHN0cmluZyxcbiAgaW5wdXQ6IE9ic2VydmFibGU8SVtdPixcbiAgcGFyc2VMZXg6IFBhcnNlTGV4PEk+LFxuICBwaXBlT3BlcmF0b3JzOiBPcGVyYXRvckZ1bmN0aW9uPFRva2VuLCBUb2tlbj5bXSB8IG51bGwsXG4gIHBhcnNlR3JhbW1hcjogUGFyc2VHcmFtbWFyPEE+XG4pOiBQcm9taXNlPEE+IHtcblxuICBjb25zdCBfcGFyc2VHcmFtbWFyT2JzID0gKGxhOiBMb29rQWhlYWQ8VG9rZW4+KSA9PiB7XG4gICAgcmV0dXJuIGZyb20ocGFyc2VHcmFtbWFyKGxhKSk7XG4gIH07XG5cbiAgbGV0IHRva2VucyA9IGlucHV0LnBpcGUobWFwQ2h1bmtzPEk+KG5hbWUgKyAnLWxleGVyJywgcGFyc2VMZXgpKVxuICAucGlwZShcbiAgICBtYXAoY2h1bmsgPT4ge1xuICAgICAgKGNodW5rIGFzIFRva2VuKS50ZXh0ID0gY2h1bmsudmFsdWVzIS5qb2luKCcnKTtcbiAgICAgIGRlbGV0ZSBjaHVuay52YWx1ZXM7XG4gICAgICByZXR1cm4gY2h1bmsgYXMgVG9rZW47XG4gICAgfSlcbiAgKTtcbiAgaWYgKHBpcGVPcGVyYXRvcnMpIHtcbiAgICBmb3IgKGNvbnN0IG9wZXJhdG9yIG9mIHBpcGVPcGVyYXRvcnMpXG4gICAgICB0b2tlbnMgPSB0b2tlbnMucGlwZShvcGVyYXRvcik7XG4gIH1cblxuICByZXR1cm4gdG9rZW5zLnBpcGUoXG4gICAgbWFwKHRva2VuID0+IFt0b2tlbl0pLFxuICAgIG1hcENodW5rc09icyhuYW1lICsgJy1wYXJzZXInLCBfcGFyc2VHcmFtbWFyT2JzKVxuICApLnRvUHJvbWlzZSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFwQ2h1bmtzT2JzPEksIE8+KG5hbWU6IHN0cmluZywgcGFyc2U6IChsYTogTG9va0FoZWFkPEk+KSA9PiBPYnNlcnZhYmxlPE8+KTpcbihpbnB1dDogT2JzZXJ2YWJsZTxJW10+KT0+IE9ic2VydmFibGU8Tz4ge1xuXG4gIHJldHVybiBmdW5jdGlvbihpbnB1dDogT2JzZXJ2YWJsZTxJW10+KSB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPE8+KHN1YiA9PiB7XG4gICAgICBjb25zdCBsYSA9IG5ldyBMb29rQWhlYWQ8ST4obmFtZSk7XG4gICAgICBpbnB1dC5zdWJzY3JpYmUoaW5wdXQgPT4gbGEuX3dyaXRlKGlucHV0KSxcbiAgICAgICAgZXJyID0+IHN1Yi5lcnJvcihlcnIpLFxuICAgICAgICAoKSA9PiBsYS5fZmluYWwoKVxuICAgICAgKTtcbiAgICAgIHBhcnNlKGxhKS5zdWJzY3JpYmUoXG4gICAgICAgIG91cHV0ID0+IHN1Yi5uZXh0KG91cHV0KSxcbiAgICAgICAgZXJyID0+IHN1Yi5lcnJvcihlcnIpLFxuICAgICAgICAoKSA9PiBzdWIuY29tcGxldGUoKVxuICAgICAgKTtcbiAgICB9KTtcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hcENodW5rczxJPihcbiAgbmFtZTogc3RyaW5nLFxuICBwYXJzZTogUGFyc2VMZXg8ST5cbik6IChpbnB1dDogT2JzZXJ2YWJsZTxJW10+KT0+IE9ic2VydmFibGU8Q2h1bms8ST4+IHtcblxuICByZXR1cm4gZnVuY3Rpb24oaW5wdXQ6IE9ic2VydmFibGU8SVtdPikge1xuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxDaHVuazxJPj4oc3ViID0+IHtcbiAgICAgIGNvbnN0IGxhID0gbmV3IExvb2tBaGVhZDxJPihuYW1lKTtcbiAgICAgIGlucHV0LnN1YnNjcmliZShpbnB1dCA9PiBsYS5fd3JpdGUoaW5wdXQpLFxuICAgICAgICBlcnIgPT4gc3ViLmVycm9yKGVyciksXG4gICAgICAgICgpID0+IGxhLl9maW5hbCgpXG4gICAgICApO1xuICAgICAgY29uc3QgbGEkOiBMb29rQWhlYWRPYnNlcnZhYmxlPEk+ID0gbGEgYXMgYW55O1xuICAgICAgbGEkLnN0YXJ0VG9rZW4gPSBsYS5zdGFydENodW5rO1xuICAgICAgbGEkLmVtaXRUb2tlbiA9IGZ1bmN0aW9uKHRoaXM6IExvb2tBaGVhZE9ic2VydmFibGU8ST4pIHtcbiAgICAgICAgc3ViLm5leHQodGhpcy5jbG9zZUNodW5rKCkpO1xuICAgICAgfTtcbiAgICAgIHBhcnNlKGxhJCwgc3ViKVxuICAgICAgLnRoZW4oKCkgPT4gc3ViLmNvbXBsZXRlKCkpO1xuICAgIH0pO1xuICB9O1xufVxuXG5leHBvcnQgY2xhc3MgTG9va0FoZWFkPFQ+IHtcbiAgY2FjaGVkOiBBcnJheTxUfG51bGw+O1xuICBsYXN0Q29uc3VtZWQ6IFR8dW5kZWZpbmVkfG51bGw7XG4gIGlzU3RyaW5nOiBib29sZWFuO1xuICBsaW5lID0gMTtcbiAgY29sdW1uID0gMTtcbiAgcHJvdGVjdGVkIGN1cnJQb3MgPSAwO1xuICBwcml2YXRlIGNhY2hlU3RhcnRQb3MgPSAwOyAvLyBDdXJyZW50bHkgaXMgYWx3YXlzIHNhbWUgYXMgY3VyclBvc1xuICBwcml2YXRlIHJlYWRSZXNvbHZlOiAodmFsdWU6IFQgfCBudWxsKSA9PiB2b2lkIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIHdhaXRGb3JQb3M6IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBjdXJyQ2h1bms6IENodW5rPFQ+O1xuXG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBuYW1lOiBzdHJpbmcpIHtcbiAgICB0aGlzLmNhY2hlZCA9IFtdO1xuICB9XG5cbiAgX3dyaXRlKHZhbHVlczogQXJyYXk8VHxudWxsPikge1xuICAgIHRoaXMuY2FjaGVkLnB1c2goLi4udmFsdWVzKTtcblxuICAgIGlmICh0aGlzLnJlYWRSZXNvbHZlICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IHJlc29sdmUgPSB0aGlzLnJlYWRSZXNvbHZlO1xuICAgICAgY29uc3QgY2FjaGVPZmZzZXQgPSB0aGlzLndhaXRGb3JQb3MhIC0gdGhpcy5jYWNoZVN0YXJ0UG9zO1xuICAgICAgaWYgKGNhY2hlT2Zmc2V0IDwgdGhpcy5jYWNoZWQubGVuZ3RoKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnJlYWRSZXNvbHZlO1xuICAgICAgICBkZWxldGUgdGhpcy53YWl0Rm9yUG9zO1xuICAgICAgICByZXNvbHZlKHRoaXMuY2FjaGVkW2NhY2hlT2Zmc2V0XSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgX2ZpbmFsKCkge1xuICAgIHRoaXMuX3dyaXRlKFtudWxsXSk7XG4gIH1cblxuICBnZXQgcG9zaXRpb24oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyUG9zO1xuICB9XG5cbiAgLyoqXG5cdCAqIGxvb2sgYWhlYWQgZm9yIDEgY2hhcmFjdGVyXG5cdCAqIEBwYXJhbSBudW0gZGVmYXVsdCBpcyAxXG5cdCAqIEByZXR1cm4gbnVsbCBpZiBFT0YgaXMgcmVhY2hlZFxuXHQgKi9cbiAgbGEobnVtID0gMSk6IFByb21pc2U8VCB8IG51bGw+IHtcbiAgICBjb25zdCByZWFkUG9zID0gdGhpcy5jdXJyUG9zICsgbnVtIC0gMTtcbiAgICByZXR1cm4gdGhpcy5yZWFkKHJlYWRQb3MpO1xuICB9XG5cbiAgLy8gbGIobnVtID0gMSk6IFQgfCBudWxsIHtcbiAgLy8gICBjb25zdCBwb3MgPSB0aGlzLmN1cnJQb3MgLSAobnVtIC0gMSk7XG4gIC8vICAgaWYgKHBvcyA8IDApXG4gIC8vICAgICByZXR1cm4gbnVsbDtcbiAgLy8gICByZXR1cm4gdGhpcy5yZWFkKHBvcyk7XG4gIC8vIH1cblxuICBhZHZhbmNlKGNvdW50ID0gMSk6IFByb21pc2U8VD4ge1xuICAgIC8vIGNvbnN0IHN0YWNrID0gbmV3IEVycm9yKCkuc3RhY2s7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgbGV0IGN1cnJWYWx1ZTogVDtcbiAgICAgIGxldCBpID0gMDtcblxuICAgICAgY29uc3QgcmVhZCA9ICgpID0+IHtcbiAgICAgICAgaWYgKGkrKyA8IGNvdW50KSB7XG4gICAgICAgICAgdGhpcy5sYSgxKVxuICAgICAgICAgIC50aGVuKHZhbHVlID0+IHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLnRocm93RXJyb3IoJ1VuZXhwZWN0IEVPRicpOyAvLyAsIHN0YWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY3VyclBvcysrO1xuICAgICAgICAgICAgdGhpcy5jb2x1bW4rKztcbiAgICAgICAgICAgIGlmICgodmFsdWUgYXMgYW55KSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgdGhpcy5saW5lKys7XG4gICAgICAgICAgICAgIHRoaXMuY29sdW1uID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY2FjaGVkLnNoaWZ0KCk7XG4gICAgICAgICAgICB0aGlzLmNhY2hlU3RhcnRQb3MrKztcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJDaHVuayAmJiAhdGhpcy5jdXJyQ2h1bmsuaXNDbG9zZWQpIHtcbiAgICAgICAgICAgICAgdGhpcy5jdXJyQ2h1bmsudmFsdWVzIS5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN1cnJWYWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgcmVhZCgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMubGFzdENvbnN1bWVkID0gY3VyclZhbHVlO1xuICAgICAgICAgIHJlc29sdmUoY3VyclZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHJlYWQoKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBTYW1lIGFzIGByZXR1cm4gbGEoMSkgPT09IHZhbHVlc1swXSAmJiBsYSgyKSA9PT0gdmFsdWVzWzFdLi4uYFxuXHQgKiBAcGFyYW0gdmFsdWVzIGxvb2thaGVhZCBzdHJpbmcgb3IgdG9rZW5zXG5cdCAqL1xuICBhc3luYyBpc05leHQoLi4udmFsdWVzOiBUW10pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gdGhpcy5faXNOZXh0PFQ+KHZhbHVlcyk7XG4gIH1cblxuICBhc3luYyBfaXNOZXh0PEM+KHZhbHVlczogQ1tdLCBpc0VxdWFsID0gKGE6IFQsIGI6IEMpID0+IGEgYXMgYW55ID09PSBiKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgbGV0IGNvbXBhcmVUbzogQ1tdfCBzdHJpbmc7XG4gICAgbGV0IGNvbXBhcmVGbjogKC4uLmFyZzogYW55W10pID0+IGJvb2xlYW47XG4gICAgaWYgKHRoaXMuaXNTdHJpbmcpIHtcbiAgICAgIGNvbXBhcmVUbyA9IHZhbHVlcy5qb2luKCcnKTtcbiAgICAgIGNvbXBhcmVGbiA9IChhOiBzdHJpbmcsIGI6IHN0cmluZykgPT4gYSA9PT0gYjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29tcGFyZVRvID0gdmFsdWVzO1xuICAgICAgY29tcGFyZUZuID0gaXNFcXVhbDtcbiAgICB9XG4gICAgbGV0IGkgPSAwO1xuICAgIGNvbnN0IGwgPSBjb21wYXJlVG8ubGVuZ3RoO1xuICAgIGxldCBuZXh0ID0gYXdhaXQgdGhpcy5sYShpICsgMSk7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGlmIChpID09PSBsKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIG5leHQgPSBhd2FpdCB0aGlzLmxhKGkgKyAxKTtcbiAgICAgIGlmIChuZXh0ID09IG51bGwpXG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gRU9GXG4gICAgICBlbHNlIGlmICghY29tcGFyZUZuKG5leHQsIGNvbXBhcmVUb1tpXSkpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIGkrKztcbiAgICB9XG4gIH1cblxuICB0aHJvd0Vycm9yKHVuZXhwZWN0ZWQgPSAnRW5kLW9mLXN0cmVhbScsIHN0YWNrPzogYW55KSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEluICR7dGhpcy5uYW1lfSB1bmV4cGVjdGVkICR7SlNPTi5zdHJpbmdpZnkodW5leHBlY3RlZCl9IGF0ICR7dGhpcy5nZXRDdXJyZW50UG9zSW5mbygpfSwgJHtzdGFjayA/ICdwcmV2aW91cyBzdGFjazonICsgc3RhY2sgOiAnJ31gKTtcbiAgfVxuXG4gIGdldEN1cnJlbnRQb3NJbmZvKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBvZmZzZXQgJHt0aGlzLmN1cnJQb3N9IFske3RoaXMubGluZX06JHt0aGlzLmNvbHVtbn1dYDtcbiAgfVxuXG4gIHN0YXJ0Q2h1bms8VEs+KHR5cGU6IFRLKSB7XG4gICAgaWYgKHRoaXMuY3VyckNodW5rICYmICF0aGlzLmN1cnJDaHVuay5pc0Nsb3NlZClcbiAgICAgIHRoaXMuY3VyckNodW5rLmNsb3NlKHRoaXMuY3VyclBvcyk7XG4gICAgdGhpcy5jdXJyQ2h1bmsgPSBuZXcgQ2h1bms8VD4odGhpcy5jdXJyUG9zLCB0aGlzLmxpbmUsIHRoaXMuY29sdW1uKTtcbiAgICB0aGlzLmN1cnJDaHVuay50eXBlID0gdHlwZTtcbiAgfVxuXG4gIGNsb3NlQ2h1bmsoKSB7XG4gICAgcmV0dXJuIHRoaXMuY3VyckNodW5rLmNsb3NlKHRoaXMuY3VyclBvcyk7XG4gIH1cblxuICAvKipcblx0ICogRG8gbm90IHJlYWQgcG9zdGlvbiBsZXNzIHRoYW4gMFxuXHQgKiBAcGFyYW0gcG9zIFxuXHQgKi9cbiAgcHJvdGVjdGVkIHJlYWQocG9zOiBudW1iZXIpOiBQcm9taXNlPFQgfCBudWxsPiB7XG4gICAgY29uc3QgY2FjaGVPZmZzZXQgPSBwb3MgLSB0aGlzLmNhY2hlU3RhcnRQb3M7XG4gICAgaWYgKGNhY2hlT2Zmc2V0IDwgMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gbm90IHJlYWQgYmVoaW5kIHN0cmVhbSBjYWNoZSwgYXQgcG9zaXRpb246ICR7cG9zfWApO1xuICAgIH1cbiAgICBpZiAoY2FjaGVPZmZzZXQgPCB0aGlzLmNhY2hlZC5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5jYWNoZWRbY2FjaGVPZmZzZXRdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy53YWl0Rm9yUG9zID0gcG9zO1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICB0aGlzLnJlYWRSZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIExvb2tBaGVhZE9ic2VydmFibGU8VD4gZXh0ZW5kcyBMb29rQWhlYWQ8VD4ge1xuICBzdGFydFRva2VuOiBMb29rQWhlYWQ8VD5bJ3N0YXJ0Q2h1bmsnXTtcbiAgZW1pdFRva2VuKCk6IHZvaWQ7XG59XG5cbiJdfQ==