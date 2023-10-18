"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressResWithContentLength = exports.compressResponse = exports.compressedIncomingMsgToBuffer = exports.readCompressedResponse = void 0;
const tslib_1 = require("tslib");
const zlib_1 = tslib_1.__importDefault(require("zlib"));
const stream_1 = require("stream");
async function readCompressedResponse(clientResponse, output) {
    return new Promise((resolve, reject) => {
        const onError = err => {
            if (err)
                return reject(err);
            resolve();
        };
        switch (clientResponse.headers['content-encoding']) {
            case 'br':
                (0, stream_1.pipeline)(clientResponse, zlib_1.default.createBrotliDecompress(), output, onError);
                break;
            // Or, just use zlib.createUnzip() to handle both of the following cases:
            case 'gzip':
                (0, stream_1.pipeline)(clientResponse, zlib_1.default.createGunzip(), output, onError);
                break;
            case 'deflate':
                (0, stream_1.pipeline)(clientResponse, zlib_1.default.createInflate(), output, onError);
                break;
            default:
                (0, stream_1.pipeline)(clientResponse, output, onError);
                break;
        }
    });
}
exports.readCompressedResponse = readCompressedResponse;
async function compressedIncomingMsgToBuffer(msg) {
    const data = [];
    const output = new stream_1.Writable({
        write(chunk, _enc, cb) {
            data.push(chunk);
            cb();
        },
        final(cb) {
            cb();
        }
    });
    await readCompressedResponse(msg, output);
    return Buffer.concat(data);
}
exports.compressedIncomingMsgToBuffer = compressedIncomingMsgToBuffer;
/** Make sure you remove "content-length" header so that Node.js will add "tranfer-encoding: chunked" */
async function compressResponse(data, response, contentEncoding) {
    const source = new stream_1.Readable({ read() {
            this.push(data);
            this.push(null);
        } });
    switch (contentEncoding) {
        case 'br':
            return stream_1.promises.pipeline(source, zlib_1.default.createBrotliCompress(), response);
        case 'gzip':
            return stream_1.promises.pipeline(source, zlib_1.default.createGzip(), response);
        case 'deflate':
            return stream_1.promises.pipeline(source, zlib_1.default.createDeflate(), response);
        default:
            return stream_1.promises.pipeline(source, response);
    }
}
exports.compressResponse = compressResponse;
/** You set content-length header, this will disable "tranfer-encoding: chunked" mode */
async function compressResWithContentLength(data, response, contentEncoding) {
    const chunks = [];
    let len = 0;
    await new Promise(resolve => {
        const output = new stream_1.Writable({
            write(chunk, enc, cb) {
                const buf = chunk;
                chunks.push(buf);
                len += buf.length;
                cb();
            },
            final(cb) {
                cb();
                resolve();
            }
        });
        void compressResponse(data, output, contentEncoding);
    });
    return {
        contentLength: len,
        write() {
            return stream_1.promises.pipeline(new stream_1.Readable({
                read() {
                    this.push(chunks.shift());
                    if (chunks.length === 0)
                        this.push(null);
                }
            }), response);
        }
    };
}
exports.compressResWithContentLength = compressResWithContentLength;
//# sourceMappingURL=utils.js.map