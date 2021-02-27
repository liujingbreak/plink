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
const cliExt = (program) => {
    program.command('scan-tran <directory> [metadata-json-file]')
        .description('Can string literals, template expressions, JSX text from specific TS[X], JS[X] files, generate a temporary i18n metadata files', {
        directory: 'Target directory to be scanned',
        'metadata-json-file': 'output metadata JSON file, default output file is named "scan-tran.json" under target scanned directory'
    })
        .action((dir, output) => __awaiter(void 0, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-scan-tran')))).scanTran(dir, output);
    }));
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLE9BQU8sQ0FBQyxPQUFPLENBQUMsNENBQTRDLENBQUM7U0FDNUQsV0FBVyxDQUFDLGdJQUFnSSxFQUMzSTtRQUNFLFNBQVMsRUFBRSxnQ0FBZ0M7UUFDM0Msb0JBQW9CLEVBQUUseUdBQXlHO0tBQ2hJLENBQUM7U0FDSCxNQUFNLENBQUMsQ0FBTyxHQUFXLEVBQUUsTUFBZSxFQUFFLEVBQUU7UUFDN0MsTUFBTSxDQUFDLHdEQUFhLGlCQUFpQixHQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2hFLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFFTCxDQUFDLENBQUM7QUFFRixrQkFBZSxNQUFNLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0NsaUV4dGVuc2lvbn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdCc7XG5cbmNvbnN0IGNsaUV4dDogQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW0pID0+IHtcbiAgcHJvZ3JhbS5jb21tYW5kKCdzY2FuLXRyYW4gPGRpcmVjdG9yeT4gW21ldGFkYXRhLWpzb24tZmlsZV0nKVxuICAuZGVzY3JpcHRpb24oJ0NhbiBzdHJpbmcgbGl0ZXJhbHMsIHRlbXBsYXRlIGV4cHJlc3Npb25zLCBKU1ggdGV4dCBmcm9tIHNwZWNpZmljIFRTW1hdLCBKU1tYXSBmaWxlcywgZ2VuZXJhdGUgYSB0ZW1wb3JhcnkgaTE4biBtZXRhZGF0YSBmaWxlcycsXG4gICAge1xuICAgICAgZGlyZWN0b3J5OiAnVGFyZ2V0IGRpcmVjdG9yeSB0byBiZSBzY2FubmVkJyxcbiAgICAgICdtZXRhZGF0YS1qc29uLWZpbGUnOiAnb3V0cHV0IG1ldGFkYXRhIEpTT04gZmlsZSwgZGVmYXVsdCBvdXRwdXQgZmlsZSBpcyBuYW1lZCBcInNjYW4tdHJhbi5qc29uXCIgdW5kZXIgdGFyZ2V0IHNjYW5uZWQgZGlyZWN0b3J5J1xuICAgIH0pXG4gIC5hY3Rpb24oYXN5bmMgKGRpcjogc3RyaW5nLCBvdXRwdXQ/OiBzdHJpbmcpID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1zY2FuLXRyYW4nKSkuc2NhblRyYW4oZGlyLCBvdXRwdXQpO1xuICB9KTtcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xpRXh0O1xuIl19