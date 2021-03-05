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
    program.command('scan-tran <directory> [metadata-dir]')
        .description('Can string literals, template expressions, JSX text from specific TS[X], JS[X] files, generate a temporary i18n metadata files', {
        directory: 'Target directory to be scanned',
        'metadata-dir': 'output directory of metadata JSON files, default is <pkg dir>/ts/i18n'
    })
        .action((dir, output) => __awaiter(void 0, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-scan-tran')))).scanTran(dir, output);
    }));
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLE9BQU8sQ0FBQyxPQUFPLENBQUMsc0NBQXNDLENBQUM7U0FDdEQsV0FBVyxDQUFDLGdJQUFnSSxFQUMzSTtRQUNFLFNBQVMsRUFBRSxnQ0FBZ0M7UUFDM0MsY0FBYyxFQUFFLHVFQUF1RTtLQUN4RixDQUFDO1NBQ0gsTUFBTSxDQUFDLENBQU8sR0FBVyxFQUFFLE1BQWUsRUFBRSxFQUFFO1FBQzdDLE1BQU0sQ0FBQyx3REFBYSxpQkFBaUIsR0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNoRSxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBRUwsQ0FBQyxDQUFDO0FBRUYsa0JBQWUsTUFBTSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtDbGlFeHRlbnNpb259IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QnO1xuXG5jb25zdCBjbGlFeHQ6IENsaUV4dGVuc2lvbiA9IChwcm9ncmFtKSA9PiB7XG4gIHByb2dyYW0uY29tbWFuZCgnc2Nhbi10cmFuIDxkaXJlY3Rvcnk+IFttZXRhZGF0YS1kaXJdJylcbiAgLmRlc2NyaXB0aW9uKCdDYW4gc3RyaW5nIGxpdGVyYWxzLCB0ZW1wbGF0ZSBleHByZXNzaW9ucywgSlNYIHRleHQgZnJvbSBzcGVjaWZpYyBUU1tYXSwgSlNbWF0gZmlsZXMsIGdlbmVyYXRlIGEgdGVtcG9yYXJ5IGkxOG4gbWV0YWRhdGEgZmlsZXMnLFxuICAgIHtcbiAgICAgIGRpcmVjdG9yeTogJ1RhcmdldCBkaXJlY3RvcnkgdG8gYmUgc2Nhbm5lZCcsXG4gICAgICAnbWV0YWRhdGEtZGlyJzogJ291dHB1dCBkaXJlY3Rvcnkgb2YgbWV0YWRhdGEgSlNPTiBmaWxlcywgZGVmYXVsdCBpcyA8cGtnIGRpcj4vdHMvaTE4bidcbiAgICB9KVxuICAuYWN0aW9uKGFzeW5jIChkaXI6IHN0cmluZywgb3V0cHV0Pzogc3RyaW5nKSA9PiB7XG4gICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktc2Nhbi10cmFuJykpLnNjYW5UcmFuKGRpciwgb3V0cHV0KTtcbiAgfSk7XG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsaUV4dDtcbiJdfQ==