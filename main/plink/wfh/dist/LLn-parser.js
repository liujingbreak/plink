"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTextParser = exports.LookAhead = exports.parser = exports.Token = exports.Chunk = exports.listTokens = exports.createStringParser = void 0;
const tslib_1 = require("tslib");
const util_1 = tslib_1.__importDefault(require("util"));
/**
 * T - Token Types
 * AST - type of returned AST object
 */
function createStringParser(parserName, lexer, grammar) {
    return function (input) {
        const p = parser(parserName, lexer, grammar);
        p.write(input);
        p.end();
        return p.getResult();
    };
}
exports.createStringParser = createStringParser;
/**
 * Help for testing result of lexer function
 * @param lexer
 */
function listTokens(debugName, input, lexer) {
    const lexerLa = new LookAhead(debugName, () => {
        lexerLa._write(input);
        lexerLa._final();
    });
    const tokens = [];
    lexer(lexerLa, {
        emit() {
            if (lexerLa.currChunk == null)
                return;
            const token = strChunk2Token(lexerLa.currChunk);
            token.close(lexerLa.position);
            tokens.push(token);
        },
        end() { }
    });
    return tokens;
}
exports.listTokens = listTokens;
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
function parser(parserName, lexer, grammar, chunkConverter) {
    let isString;
    const lexerLa = new LookAhead(parserName + ' lexer');
    const tokenEmitter = {
        emit() {
            if (lexerLa.currChunk == null)
                return;
            if (isString === undefined && lexerLa.currChunk.values != null)
                isString = typeof lexerLa.currChunk.values[0] === 'string';
            const token = chunkConverter ? chunkConverter(lexerLa.currChunk) :
                (isString ?
                    strChunk2Token(lexerLa.currChunk) :
                    lexerLa.currChunk);
            tokenLa._write([token]);
            token.close(lexerLa.position);
        },
        end() {
            tokenLa._final();
        }
    };
    const tokenLa = new LookAhead(parserName + ' grammar', function () {
        lexer(lexerLa, tokenEmitter);
    });
    return {
        write: lexerLa._write.bind(lexerLa),
        end: lexerLa._final.bind(lexerLa),
        getResult() {
            return grammar(tokenLa);
        }
    };
}
exports.parser = parser;
class LookAhead {
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
        let compareTo;
        let compareFn;
        compareTo = values;
        compareFn = isEqual;
        let i = 0;
        const l = compareTo.length;
        while (true) {
            if (i === l)
                return true;
            const next = this.advance(i + 1);
            if (next == null)
                this.throwError('EOF', new Error().stack); // EOF
            else if (!compareFn(next, compareTo[i]))
                this.throwError(util_1.default.inspect(next), new Error().stack, compareTo[i] + '');
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
function strChunk2Token(chunk) {
    if (chunk.values) {
        chunk.text = chunk.values.join('');
        delete chunk.values;
    }
    return chunk;
}
/**
 * Convenient function for creating a text based parser,
 * you only need to define Token types, lexer function, grammar function
 */
function createTextParser() {
}
exports.createTextParser = createTextParser;
//# sourceMappingURL=LLn-parser.js.map