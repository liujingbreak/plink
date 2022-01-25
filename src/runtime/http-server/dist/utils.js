"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressResponse = exports.compressedIncomingMsgToBuffer = exports.readCompressedResponse = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxnREFBd0I7QUFFeEIsbUNBQTZFO0FBRXRFLEtBQUssVUFBVSxzQkFBc0IsQ0FBQyxjQUErQixFQUFFLE1BQWdCO0lBQzVGLE9BQU8sSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDM0MsTUFBTSxPQUFPLEdBQWdELEdBQUcsQ0FBQyxFQUFFO1lBQ2pFLElBQUksR0FBRztnQkFDTCxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNyQixPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUMsQ0FBQztRQUVGLFFBQVEsY0FBYyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO1lBQ2xELEtBQUssSUFBSTtnQkFDUCxJQUFBLGlCQUFRLEVBQUMsY0FBYyxFQUFFLGNBQUksQ0FBQyxzQkFBc0IsRUFBRSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDekUsTUFBTTtZQUNSLHlFQUF5RTtZQUN6RSxLQUFLLE1BQU07Z0JBQ1QsSUFBQSxpQkFBUSxFQUFDLGNBQWMsRUFBRSxjQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUMvRCxNQUFNO1lBQ1IsS0FBSyxTQUFTO2dCQUNaLElBQUEsaUJBQVEsRUFBQyxjQUFjLEVBQUUsY0FBSSxDQUFDLGFBQWEsRUFBRSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDaEUsTUFBTTtZQUNSO2dCQUNFLElBQUEsaUJBQVEsRUFBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUMxQyxNQUFNO1NBQ1Q7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUF4QkQsd0RBd0JDO0FBRU0sS0FBSyxVQUFVLDZCQUE2QixDQUFDLEdBQW9CO0lBQ3RFLE1BQU0sSUFBSSxHQUFHLEVBQWMsQ0FBQztJQUM1QixNQUFNLE1BQU0sR0FBRyxJQUFJLGlCQUFRLENBQUM7UUFDMUIsS0FBSyxDQUFDLEtBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pCLEVBQUUsRUFBRSxDQUFDO1FBQ1AsQ0FBQztRQUNELEtBQUssQ0FBQyxFQUFFO1lBQ04sRUFBRSxFQUFFLENBQUM7UUFDUCxDQUFDO0tBQ0YsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDMUMsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzdCLENBQUM7QUFiRCxzRUFhQztBQUVNLEtBQUssVUFBVSxnQkFBZ0IsQ0FBQyxJQUFxQixFQUFFLFFBQWtCLEVBQUUsZUFBd0I7SUFDeEcsTUFBTSxNQUFNLEdBQUcsSUFBSSxpQkFBUSxDQUFDLEVBQUUsSUFBSTtZQUNoQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEIsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUVKLFFBQU8sZUFBZSxFQUFFO1FBQ3RCLEtBQUssSUFBSTtZQUNQLE9BQU8saUJBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLGNBQUksQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzNFLEtBQUssTUFBTTtZQUNULE9BQU8saUJBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLGNBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNqRSxLQUFLLFNBQVM7WUFDWixPQUFPLGlCQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxjQUFJLENBQUMsYUFBYSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDcEU7WUFDRSxPQUFPLGlCQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztLQUMvQztBQUNILENBQUM7QUFoQkQsNENBZ0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHpsaWIgZnJvbSAnemxpYic7XG5pbXBvcnQge0luY29taW5nTWVzc2FnZX0gZnJvbSAnaHR0cCc7XG5pbXBvcnQgeyBwcm9taXNlcyBhcyBzdHJlYW1Qcm8sIHBpcGVsaW5lLCBSZWFkYWJsZSwgV3JpdGFibGUgfSBmcm9tICdzdHJlYW0nO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZENvbXByZXNzZWRSZXNwb25zZShjbGllbnRSZXNwb25zZTogSW5jb21pbmdNZXNzYWdlLCBvdXRwdXQ6IFdyaXRhYmxlKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3Qgb25FcnJvcjogKGVycjogTm9kZUpTLkVycm5vRXhjZXB0aW9uIHwgbnVsbCkgPT4gdm9pZCA9IGVyciA9PiB7XG4gICAgICBpZiAoZXJyKVxuICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICByZXNvbHZlKCk7XG4gICAgfTtcblxuICAgIHN3aXRjaCAoY2xpZW50UmVzcG9uc2UuaGVhZGVyc1snY29udGVudC1lbmNvZGluZyddKSB7XG4gICAgICBjYXNlICdicic6XG4gICAgICAgIHBpcGVsaW5lKGNsaWVudFJlc3BvbnNlLCB6bGliLmNyZWF0ZUJyb3RsaURlY29tcHJlc3MoKSwgb3V0cHV0LCBvbkVycm9yKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBPciwganVzdCB1c2UgemxpYi5jcmVhdGVVbnppcCgpIHRvIGhhbmRsZSBib3RoIG9mIHRoZSBmb2xsb3dpbmcgY2FzZXM6XG4gICAgICBjYXNlICdnemlwJzpcbiAgICAgICAgcGlwZWxpbmUoY2xpZW50UmVzcG9uc2UsIHpsaWIuY3JlYXRlR3VuemlwKCksIG91dHB1dCwgb25FcnJvcik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnZGVmbGF0ZSc6XG4gICAgICAgIHBpcGVsaW5lKGNsaWVudFJlc3BvbnNlLCB6bGliLmNyZWF0ZUluZmxhdGUoKSwgb3V0cHV0LCBvbkVycm9yKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBwaXBlbGluZShjbGllbnRSZXNwb25zZSwgb3V0cHV0LCBvbkVycm9yKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbXByZXNzZWRJbmNvbWluZ01zZ1RvQnVmZmVyKG1zZzogSW5jb21pbmdNZXNzYWdlKTogUHJvbWlzZTxCdWZmZXI+IHtcbiAgY29uc3QgZGF0YSA9IFtdIGFzIEJ1ZmZlcltdO1xuICBjb25zdCBvdXRwdXQgPSBuZXcgV3JpdGFibGUoe1xuICAgIHdyaXRlKGNodW5rOiBCdWZmZXIsIF9lbmMsIGNiKSB7XG4gICAgICBkYXRhLnB1c2goY2h1bmspO1xuICAgICAgY2IoKTtcbiAgICB9LFxuICAgIGZpbmFsKGNiKSB7XG4gICAgICBjYigpO1xuICAgIH1cbiAgfSk7XG4gIGF3YWl0IHJlYWRDb21wcmVzc2VkUmVzcG9uc2UobXNnLCBvdXRwdXQpO1xuICByZXR1cm4gQnVmZmVyLmNvbmNhdChkYXRhKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbXByZXNzUmVzcG9uc2UoZGF0YTogQnVmZmVyIHwgc3RyaW5nLCByZXNwb25zZTogV3JpdGFibGUsIGNvbnRlbnRFbmNvZGluZz86IHN0cmluZykge1xuICBjb25zdCBzb3VyY2UgPSBuZXcgUmVhZGFibGUoeyByZWFkKCkge1xuICAgIHRoaXMucHVzaChkYXRhKTtcbiAgICB0aGlzLnB1c2gobnVsbCk7XG4gIH19KTtcblxuICBzd2l0Y2goY29udGVudEVuY29kaW5nKSB7XG4gICAgY2FzZSAnYnInOlxuICAgICAgcmV0dXJuIHN0cmVhbVByby5waXBlbGluZShzb3VyY2UsIHpsaWIuY3JlYXRlQnJvdGxpQ29tcHJlc3MoKSwgcmVzcG9uc2UpO1xuICAgIGNhc2UgJ2d6aXAnOlxuICAgICAgcmV0dXJuIHN0cmVhbVByby5waXBlbGluZShzb3VyY2UsIHpsaWIuY3JlYXRlR3ppcCgpLCByZXNwb25zZSk7XG4gICAgY2FzZSAnZGVmbGF0ZSc6XG4gICAgICByZXR1cm4gc3RyZWFtUHJvLnBpcGVsaW5lKHNvdXJjZSwgemxpYi5jcmVhdGVEZWZsYXRlKCksIHJlc3BvbnNlKTtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHN0cmVhbVByby5waXBlbGluZShzb3VyY2UsIHJlc3BvbnNlKTtcbiAgfVxufVxuXG4iXX0=