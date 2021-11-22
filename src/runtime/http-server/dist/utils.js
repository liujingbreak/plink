"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readCompressedResponse = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxnREFBd0I7QUFFeEIsbUNBQTRDO0FBRXJDLEtBQUssVUFBVSxzQkFBc0IsQ0FBQyxjQUErQixFQUFFLE1BQWdCO0lBQzVGLE9BQU8sSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDM0MsTUFBTSxPQUFPLEdBQWdELEdBQUcsQ0FBQyxFQUFFO1lBQ2pFLElBQUksR0FBRztnQkFDTCxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNyQixPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUMsQ0FBQztRQUVGLFFBQVEsY0FBYyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO1lBQ2xELEtBQUssSUFBSTtnQkFDUCxJQUFBLGlCQUFRLEVBQUMsY0FBYyxFQUFFLGNBQUksQ0FBQyxzQkFBc0IsRUFBRSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDekUsTUFBTTtZQUNSLHlFQUF5RTtZQUN6RSxLQUFLLE1BQU07Z0JBQ1QsSUFBQSxpQkFBUSxFQUFDLGNBQWMsRUFBRSxjQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUMvRCxNQUFNO1lBQ1IsS0FBSyxTQUFTO2dCQUNaLElBQUEsaUJBQVEsRUFBQyxjQUFjLEVBQUUsY0FBSSxDQUFDLGFBQWEsRUFBRSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDaEUsTUFBTTtZQUNSO2dCQUNFLElBQUEsaUJBQVEsRUFBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUMxQyxNQUFNO1NBQ1Q7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUF4QkQsd0RBd0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHpsaWIgZnJvbSAnemxpYic7XG5pbXBvcnQge0luY29taW5nTWVzc2FnZX0gZnJvbSAnaHR0cCc7XG5pbXBvcnQgeyBwaXBlbGluZSwgV3JpdGFibGUgfSBmcm9tICdzdHJlYW0nO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZENvbXByZXNzZWRSZXNwb25zZShjbGllbnRSZXNwb25zZTogSW5jb21pbmdNZXNzYWdlLCBvdXRwdXQ6IFdyaXRhYmxlKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3Qgb25FcnJvcjogKGVycjogTm9kZUpTLkVycm5vRXhjZXB0aW9uIHwgbnVsbCkgPT4gdm9pZCA9IGVyciA9PiB7XG4gICAgICBpZiAoZXJyKVxuICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICByZXNvbHZlKCk7XG4gICAgfTtcblxuICAgIHN3aXRjaCAoY2xpZW50UmVzcG9uc2UuaGVhZGVyc1snY29udGVudC1lbmNvZGluZyddKSB7XG4gICAgICBjYXNlICdicic6XG4gICAgICAgIHBpcGVsaW5lKGNsaWVudFJlc3BvbnNlLCB6bGliLmNyZWF0ZUJyb3RsaURlY29tcHJlc3MoKSwgb3V0cHV0LCBvbkVycm9yKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBPciwganVzdCB1c2UgemxpYi5jcmVhdGVVbnppcCgpIHRvIGhhbmRsZSBib3RoIG9mIHRoZSBmb2xsb3dpbmcgY2FzZXM6XG4gICAgICBjYXNlICdnemlwJzpcbiAgICAgICAgcGlwZWxpbmUoY2xpZW50UmVzcG9uc2UsIHpsaWIuY3JlYXRlR3VuemlwKCksIG91dHB1dCwgb25FcnJvcik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnZGVmbGF0ZSc6XG4gICAgICAgIHBpcGVsaW5lKGNsaWVudFJlc3BvbnNlLCB6bGliLmNyZWF0ZUluZmxhdGUoKSwgb3V0cHV0LCBvbkVycm9yKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBwaXBlbGluZShjbGllbnRSZXNwb25zZSwgb3V0cHV0LCBvbkVycm9yKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9KTtcbn1cbiJdfQ==