"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scan = void 0;
// import api from '__api';
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
const log = require('log4js').getLogger('tool-misc.' + path_1.default.basename(__filename));
function scan(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        // let globExcludes: string[] = ['node_modules'];
        if (!dir)
            dir = path_1.default.resolve();
        const result = {};
        yield globDirs(dir, result);
        log.info(result);
    });
}
exports.scan = scan;
const readdir = util_1.promisify(fs_1.default.readdir);
const statAsync = util_1.promisify(fs_1.default.stat);
function globDirs(dir, collection) {
    return __awaiter(this, void 0, void 0, function* () {
        const baseDirName = path_1.default.basename(dir);
        if (baseDirName === 'node_modules' || baseDirName.startsWith('.'))
            return Promise.resolve(collection);
        log.info('scan', dir);
        const subDirDone = readdir(dir)
            .then((dirs) => __awaiter(this, void 0, void 0, function* () {
            const subDirs = yield Promise.all(dirs.map((baseSubDir) => __awaiter(this, void 0, void 0, function* () {
                const subDir = path_1.default.resolve(dir, baseSubDir);
                const stat = yield statAsync(subDir);
                if (stat.isFile() && subDir.endsWith('.md')) {
                    let col = collection[dir];
                    if (!col)
                        col = collection[dir] = [];
                    col.push(baseSubDir);
                }
                return stat.isDirectory() ? subDir : null;
            })));
            return Promise.all(subDirs.filter(subDir => subDir).map(subDir => {
                return globDirs(subDir, collection);
            }));
        }));
        yield subDirDone;
        return collection;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nhbi1tYXJrZG93bi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNjYW4tbWFya2Rvd24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsMkJBQTJCO0FBQzNCLGdEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFDcEIsK0JBQStCO0FBRS9CLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztBQUVsRixTQUFzQixJQUFJLENBQUMsR0FBVzs7UUFDcEMsaURBQWlEO1FBQ2pELElBQUksQ0FBQyxHQUFHO1lBQ04sR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUV2QixNQUFNLE1BQU0sR0FBOEIsRUFBRSxDQUFDO1FBQzdDLE1BQU0sUUFBUSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUU1QixHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ25CLENBQUM7Q0FBQTtBQVRELG9CQVNDO0FBRUQsTUFBTSxPQUFPLEdBQUcsZ0JBQVMsQ0FBQyxZQUFFLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdEMsTUFBTSxTQUFTLEdBQUcsZ0JBQVMsQ0FBQyxZQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7QUFHckMsU0FBZSxRQUFRLENBQUMsR0FBVyxFQUFFLFVBQXFDOztRQUN4RSxNQUFNLFdBQVcsR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZDLElBQUksV0FBVyxLQUFLLGNBQWMsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUMvRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFckMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFFdEIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQzthQUM5QixJQUFJLENBQUMsQ0FBTSxJQUFJLEVBQUMsRUFBRTtZQUNqQixNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFNLFVBQVUsRUFBQyxFQUFFO2dCQUM1RCxNQUFNLE1BQU0sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDN0MsTUFBTSxJQUFJLEdBQUcsTUFBTSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3JDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQzNDLElBQUksR0FBRyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDMUIsSUFBSSxDQUFDLEdBQUc7d0JBQ04sR0FBRyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7b0JBQzdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7aUJBQ3RCO2dCQUNELE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUM1QyxDQUFDLENBQUEsQ0FBQyxDQUFDLENBQUM7WUFDSixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDL0QsT0FBTyxRQUFRLENBQUMsTUFBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTixDQUFDLENBQUEsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxVQUFVLENBQUM7UUFDakIsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiXG4vLyBpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7cHJvbWlzaWZ5fSBmcm9tICd1dGlsJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ3Rvb2wtbWlzYy4nICsgUGF0aC5iYXNlbmFtZShfX2ZpbGVuYW1lKSk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzY2FuKGRpcjogc3RyaW5nKSB7XG4gIC8vIGxldCBnbG9iRXhjbHVkZXM6IHN0cmluZ1tdID0gWydub2RlX21vZHVsZXMnXTtcbiAgaWYgKCFkaXIpXG4gICAgZGlyID0gUGF0aC5yZXNvbHZlKCk7XG5cbiAgY29uc3QgcmVzdWx0OiB7W2Rpcjogc3RyaW5nXTogc3RyaW5nW119ID0ge307XG4gIGF3YWl0IGdsb2JEaXJzKGRpciwgcmVzdWx0KTtcblxuICBsb2cuaW5mbyhyZXN1bHQpO1xufVxuXG5jb25zdCByZWFkZGlyID0gcHJvbWlzaWZ5KGZzLnJlYWRkaXIpO1xuY29uc3Qgc3RhdEFzeW5jID0gcHJvbWlzaWZ5KGZzLnN0YXQpO1xuXG5cbmFzeW5jIGZ1bmN0aW9uIGdsb2JEaXJzKGRpcjogc3RyaW5nLCBjb2xsZWN0aW9uOiB7W2Rpcjogc3RyaW5nXTogc3RyaW5nW119KTogUHJvbWlzZTx7W2Rpcjogc3RyaW5nXTogc3RyaW5nW119PiB7XG4gIGNvbnN0IGJhc2VEaXJOYW1lID0gUGF0aC5iYXNlbmFtZShkaXIpO1xuICBpZiAoYmFzZURpck5hbWUgPT09ICdub2RlX21vZHVsZXMnIHx8IGJhc2VEaXJOYW1lLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGNvbGxlY3Rpb24pO1xuXG4gIGxvZy5pbmZvKCdzY2FuJywgZGlyKTtcblxuICBjb25zdCBzdWJEaXJEb25lID0gcmVhZGRpcihkaXIpXG4gIC50aGVuKGFzeW5jIGRpcnMgPT4ge1xuICAgIGNvbnN0IHN1YkRpcnMgPSBhd2FpdCBQcm9taXNlLmFsbChkaXJzLm1hcChhc3luYyBiYXNlU3ViRGlyID0+IHtcbiAgICAgIGNvbnN0IHN1YkRpciA9IFBhdGgucmVzb2x2ZShkaXIsIGJhc2VTdWJEaXIpO1xuICAgICAgY29uc3Qgc3RhdCA9IGF3YWl0IHN0YXRBc3luYyhzdWJEaXIpO1xuICAgICAgaWYgKHN0YXQuaXNGaWxlKCkgJiYgc3ViRGlyLmVuZHNXaXRoKCcubWQnKSkge1xuICAgICAgICBsZXQgY29sID0gY29sbGVjdGlvbltkaXJdO1xuICAgICAgICBpZiAoIWNvbClcbiAgICAgICAgICBjb2wgPSBjb2xsZWN0aW9uW2Rpcl0gPSBbXTtcbiAgICAgICAgY29sLnB1c2goYmFzZVN1YkRpcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RhdC5pc0RpcmVjdG9yeSgpID8gc3ViRGlyIDogbnVsbDtcbiAgICB9KSk7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHN1YkRpcnMuZmlsdGVyKHN1YkRpciA9PiBzdWJEaXIpLm1hcChzdWJEaXIgPT4ge1xuICAgICAgcmV0dXJuIGdsb2JEaXJzKHN1YkRpciEsIGNvbGxlY3Rpb24pO1xuICAgIH0pKTtcbiAgfSk7XG4gIGF3YWl0IHN1YkRpckRvbmU7XG4gIHJldHVybiBjb2xsZWN0aW9uO1xufVxuIl19