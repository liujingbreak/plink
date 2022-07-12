"use strict";
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
    async advance(count = 1) {
        let currValue;
        let i = 0;
        while (i++ < count) {
            const value = await this.la(1);
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
    async isNextWith(values, isEqual = (a, b) => a === b) {
        let compareTo;
        let compareFn;
        compareTo = values;
        compareFn = isEqual;
        let i = 0;
        const l = compareTo.length;
        while (true) {
            if (i === l)
                return true;
            const next = await this.la(i + 1);
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
    async assertAdvanceWith(values, isEqual = (a, b) => a === b) {
        let compareTo;
        let compareFn;
        compareTo = values;
        compareFn = isEqual;
        let i = 0;
        const l = compareTo.length;
        while (true) {
            if (i === l)
                return true;
            const next = await this.advance(i + 1);
            if (next == null)
                this.throwError('EOF', new Error().stack); // EOF
            else if (!compareFn(next, compareTo[i]))
                this.throwError(util_1.default.inspect(next), new Error().stack, compareTo.join(','));
            i++;
        }
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
//# sourceMappingURL=async-LLn-parser.js.map