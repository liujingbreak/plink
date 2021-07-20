"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const util = __importStar(require("util"));
const generateKeyPairAsync = util.promisify(crypto_1.generateKeyPair);
function genKeyPair(fileName, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const keypairs = yield generateKeyPairAsync('ec', {
            namedCurve: 'secp160k1',
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        /* eslint-disable no-console */
        console.log(keypairs.publicKey);
        console.log(keypairs.privateKey);
    });
}
exports.default = genKeyPair;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWtleXBhaXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGkta2V5cGFpci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBeUM7QUFDekMsMkNBQTZCO0FBRTdCLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyx3QkFBZSxDQUFDLENBQUM7QUFFN0QsU0FBOEIsVUFBVSxDQUFDLFFBQTRCLEVBQUUsT0FBVzs7UUFDaEYsTUFBTSxRQUFRLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQyxJQUFJLEVBQUU7WUFDaEQsVUFBVSxFQUFFLFdBQVc7WUFDdkIsaUJBQWlCLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUM7WUFDaEQsa0JBQWtCLEVBQUUsRUFBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUM7U0FDbkQsQ0FBQyxDQUFDO1FBQ0QsK0JBQStCO1FBQ2pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ25DLENBQUM7Q0FBQTtBQVRELDZCQVNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZ2VuZXJhdGVLZXlQYWlyIH0gZnJvbSAnY3J5cHRvJztcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAndXRpbCc7XG5cbmNvbnN0IGdlbmVyYXRlS2V5UGFpckFzeW5jID0gdXRpbC5wcm9taXNpZnkoZ2VuZXJhdGVLZXlQYWlyKTtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gZ2VuS2V5UGFpcihmaWxlTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBvcHRpb25zOiB7fSkge1xuICBjb25zdCBrZXlwYWlycyA9IGF3YWl0IGdlbmVyYXRlS2V5UGFpckFzeW5jKCdlYycsIHtcbiAgICBuYW1lZEN1cnZlOiAnc2VjcDE2MGsxJyxcbiAgICBwdWJsaWNLZXlFbmNvZGluZzoge3R5cGU6ICdzcGtpJywgZm9ybWF0OiAncGVtJ30sXG4gICAgcHJpdmF0ZUtleUVuY29kaW5nOiB7dHlwZTogJ3BrY3M4JywgZm9ybWF0OiAncGVtJ31cbiAgfSk7XG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuICBjb25zb2xlLmxvZyhrZXlwYWlycy5wdWJsaWNLZXkpO1xuICBjb25zb2xlLmxvZyhrZXlwYWlycy5wcml2YXRlS2V5KTtcbn1cbiJdfQ==