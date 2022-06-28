"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressResWithContentLength = exports.compressResponse = exports.compressedIncomingMsgToBuffer = exports.readCompressedResponse = void 0;
const zlib_1 = __importDefault(require("zlib"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxnREFBd0I7QUFFeEIsbUNBQTJFO0FBRXBFLEtBQUssVUFBVSxzQkFBc0IsQ0FBQyxjQUErQixFQUFFLE1BQWdCO0lBQzVGLE9BQU8sSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDM0MsTUFBTSxPQUFPLEdBQWdELEdBQUcsQ0FBQyxFQUFFO1lBQ2pFLElBQUksR0FBRztnQkFDTCxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNyQixPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUMsQ0FBQztRQUVGLFFBQVEsY0FBYyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO1lBQ2xELEtBQUssSUFBSTtnQkFDUCxJQUFBLGlCQUFRLEVBQUMsY0FBYyxFQUFFLGNBQUksQ0FBQyxzQkFBc0IsRUFBRSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDekUsTUFBTTtZQUNSLHlFQUF5RTtZQUN6RSxLQUFLLE1BQU07Z0JBQ1QsSUFBQSxpQkFBUSxFQUFDLGNBQWMsRUFBRSxjQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUMvRCxNQUFNO1lBQ1IsS0FBSyxTQUFTO2dCQUNaLElBQUEsaUJBQVEsRUFBQyxjQUFjLEVBQUUsY0FBSSxDQUFDLGFBQWEsRUFBRSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDaEUsTUFBTTtZQUNSO2dCQUNFLElBQUEsaUJBQVEsRUFBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUMxQyxNQUFNO1NBQ1Q7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUF4QkQsd0RBd0JDO0FBRU0sS0FBSyxVQUFVLDZCQUE2QixDQUFDLEdBQW9CO0lBQ3RF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O0tBQ0YsQ0FBQztBQUNKLENBQUM7QUE5QkQsb0VBOEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHpsaWIgZnJvbSAnemxpYic7XG5pbXBvcnQge0luY29taW5nTWVzc2FnZX0gZnJvbSAnaHR0cCc7XG5pbXBvcnQge3Byb21pc2VzIGFzIHN0cmVhbVBybywgcGlwZWxpbmUsIFJlYWRhYmxlLCBXcml0YWJsZX0gZnJvbSAnc3RyZWFtJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRDb21wcmVzc2VkUmVzcG9uc2UoY2xpZW50UmVzcG9uc2U6IEluY29taW5nTWVzc2FnZSwgb3V0cHV0OiBXcml0YWJsZSkge1xuICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IG9uRXJyb3I6IChlcnI6IE5vZGVKUy5FcnJub0V4Y2VwdGlvbiB8IG51bGwpID0+IHZvaWQgPSBlcnIgPT4ge1xuICAgICAgaWYgKGVycilcbiAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgcmVzb2x2ZSgpO1xuICAgIH07XG5cbiAgICBzd2l0Y2ggKGNsaWVudFJlc3BvbnNlLmhlYWRlcnNbJ2NvbnRlbnQtZW5jb2RpbmcnXSkge1xuICAgICAgY2FzZSAnYnInOlxuICAgICAgICBwaXBlbGluZShjbGllbnRSZXNwb25zZSwgemxpYi5jcmVhdGVCcm90bGlEZWNvbXByZXNzKCksIG91dHB1dCwgb25FcnJvcik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gT3IsIGp1c3QgdXNlIHpsaWIuY3JlYXRlVW56aXAoKSB0byBoYW5kbGUgYm90aCBvZiB0aGUgZm9sbG93aW5nIGNhc2VzOlxuICAgICAgY2FzZSAnZ3ppcCc6XG4gICAgICAgIHBpcGVsaW5lKGNsaWVudFJlc3BvbnNlLCB6bGliLmNyZWF0ZUd1bnppcCgpLCBvdXRwdXQsIG9uRXJyb3IpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2RlZmxhdGUnOlxuICAgICAgICBwaXBlbGluZShjbGllbnRSZXNwb25zZSwgemxpYi5jcmVhdGVJbmZsYXRlKCksIG91dHB1dCwgb25FcnJvcik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcGlwZWxpbmUoY2xpZW50UmVzcG9uc2UsIG91dHB1dCwgb25FcnJvcik7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb21wcmVzc2VkSW5jb21pbmdNc2dUb0J1ZmZlcihtc2c6IEluY29taW5nTWVzc2FnZSk6IFByb21pc2U8QnVmZmVyPiB7XG4gIGNvbnN0IGRhdGEgPSBbXSBhcyBCdWZmZXJbXTtcbiAgY29uc3Qgb3V0cHV0ID0gbmV3IFdyaXRhYmxlKHtcbiAgICB3cml0ZShjaHVuazogQnVmZmVyLCBfZW5jLCBjYikge1xuICAgICAgZGF0YS5wdXNoKGNodW5rKTtcbiAgICAgIGNiKCk7XG4gICAgfSxcbiAgICBmaW5hbChjYikge1xuICAgICAgY2IoKTtcbiAgICB9XG4gIH0pO1xuICBhd2FpdCByZWFkQ29tcHJlc3NlZFJlc3BvbnNlKG1zZywgb3V0cHV0KTtcbiAgcmV0dXJuIEJ1ZmZlci5jb25jYXQoZGF0YSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb21wcmVzc1Jlc3BvbnNlKGRhdGE6IEJ1ZmZlciB8IHN0cmluZywgcmVzcG9uc2U6IFdyaXRhYmxlLCBjb250ZW50RW5jb2Rpbmc/OiBzdHJpbmcpIHtcbiAgY29uc3Qgc291cmNlID0gbmV3IFJlYWRhYmxlKHtyZWFkKCkge1xuICAgIHRoaXMucHVzaChkYXRhKTtcbiAgICB0aGlzLnB1c2gobnVsbCk7XG4gIH19KTtcblxuICBzd2l0Y2ggKGNvbnRlbnRFbmNvZGluZykge1xuICAgIGNhc2UgJ2JyJzpcbiAgICAgIHJldHVybiBzdHJlYW1Qcm8ucGlwZWxpbmUoc291cmNlLCB6bGliLmNyZWF0ZUJyb3RsaUNvbXByZXNzKCksIHJlc3BvbnNlKTtcbiAgICBjYXNlICdnemlwJzpcbiAgICAgIHJldHVybiBzdHJlYW1Qcm8ucGlwZWxpbmUoc291cmNlLCB6bGliLmNyZWF0ZUd6aXAoKSwgcmVzcG9uc2UpO1xuICAgIGNhc2UgJ2RlZmxhdGUnOlxuICAgICAgcmV0dXJuIHN0cmVhbVByby5waXBlbGluZShzb3VyY2UsIHpsaWIuY3JlYXRlRGVmbGF0ZSgpLCByZXNwb25zZSk7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBzdHJlYW1Qcm8ucGlwZWxpbmUoc291cmNlLCByZXNwb25zZSk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbXByZXNzUmVzV2l0aENvbnRlbnRMZW5ndGgoZGF0YTogQnVmZmVyIHwgc3RyaW5nLCByZXNwb25zZTogV3JpdGFibGUsIGNvbnRlbnRFbmNvZGluZz86IHN0cmluZyk6IFByb21pc2U8e2NvbnRlbnRMZW5ndGg6IG51bWJlcjsgd3JpdGUoKTogUHJvbWlzZTx2b2lkPn0+IHtcbiAgY29uc3QgY2h1bmtzID0gW10gYXMgQnVmZmVyW107XG4gIGxldCBsZW4gPSAwO1xuICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPihyZXNvbHZlID0+IHtcbiAgICBjb25zdCBvdXRwdXQgPSBuZXcgV3JpdGFibGUoe1xuICAgICAgd3JpdGUoY2h1bmssIGVuYywgY2IpIHtcbiAgICAgICAgY29uc3QgYnVmID0gY2h1bmsgYXMgQnVmZmVyO1xuICAgICAgICBjaHVua3MucHVzaChidWYpO1xuICAgICAgICBsZW4gKz0gYnVmLmxlbmd0aDtcbiAgICAgICAgY2IoKTtcbiAgICAgIH0sXG4gICAgICBmaW5hbChjYikge1xuICAgICAgICBjYigpO1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdm9pZCBjb21wcmVzc1Jlc3BvbnNlKGRhdGEsIG91dHB1dCwgY29udGVudEVuY29kaW5nKTtcbiAgfSk7XG4gIHJldHVybiB7XG4gICAgY29udGVudExlbmd0aDogbGVuLFxuICAgIHdyaXRlKCkge1xuICAgICAgcmV0dXJuIHN0cmVhbVByby5waXBlbGluZShuZXcgUmVhZGFibGUoe1xuICAgICAgICByZWFkKCkge1xuICAgICAgICAgIHRoaXMucHVzaChjaHVua3Muc2hpZnQoKSk7XG4gICAgICAgICAgaWYgKGNodW5rcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICB0aGlzLnB1c2gobnVsbCk7XG4gICAgICAgIH1cbiAgICAgIH0pLCByZXNwb25zZSk7XG4gICAgfVxuICB9O1xufVxuIl19