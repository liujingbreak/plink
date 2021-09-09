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
const readdir = (0, util_1.promisify)(fs_1.default.readdir);
const statAsync = (0, util_1.promisify)(fs_1.default.stat);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nhbi1tYXJrZG93bi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNjYW4tbWFya2Rvd24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsMkJBQTJCO0FBQzNCLGdEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFDcEIsK0JBQStCO0FBRS9CLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztBQUVsRixTQUFzQixJQUFJLENBQUMsR0FBVzs7UUFDcEMsaURBQWlEO1FBQ2pELElBQUksQ0FBQyxHQUFHO1lBQ04sR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUV2QixNQUFNLE1BQU0sR0FBOEIsRUFBRSxDQUFDO1FBQzdDLE1BQU0sUUFBUSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUU1QixHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ25CLENBQUM7Q0FBQTtBQVRELG9CQVNDO0FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBQSxnQkFBUyxFQUFDLFlBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN0QyxNQUFNLFNBQVMsR0FBRyxJQUFBLGdCQUFTLEVBQUMsWUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBR3JDLFNBQWUsUUFBUSxDQUFDLEdBQVcsRUFBRSxVQUFxQzs7UUFDeEUsTUFBTSxXQUFXLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QyxJQUFJLFdBQVcsS0FBSyxjQUFjLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDL0QsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXJDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRXRCLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7YUFDOUIsSUFBSSxDQUFDLENBQU0sSUFBSSxFQUFDLEVBQUU7WUFDakIsTUFBTSxPQUFPLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBTSxVQUFVLEVBQUMsRUFBRTtnQkFDNUQsTUFBTSxNQUFNLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQzdDLE1BQU0sSUFBSSxHQUFHLE1BQU0sU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNyQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUMzQyxJQUFJLEdBQUcsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQzFCLElBQUksQ0FBQyxHQUFHO3dCQUNOLEdBQUcsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO29CQUM3QixHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2lCQUN0QjtnQkFDRCxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDNUMsQ0FBQyxDQUFBLENBQUMsQ0FBQyxDQUFDO1lBQ0osT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQy9ELE9BQU8sUUFBUSxDQUFDLE1BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztZQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ04sQ0FBQyxDQUFBLENBQUMsQ0FBQztRQUNILE1BQU0sVUFBVSxDQUFDO1FBQ2pCLE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FBQSIsInNvdXJjZXNDb250ZW50IjpbIlxuLy8gaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge3Byb21pc2lmeX0gZnJvbSAndXRpbCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCd0b29sLW1pc2MuJyArIFBhdGguYmFzZW5hbWUoX19maWxlbmFtZSkpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2NhbihkaXI6IHN0cmluZykge1xuICAvLyBsZXQgZ2xvYkV4Y2x1ZGVzOiBzdHJpbmdbXSA9IFsnbm9kZV9tb2R1bGVzJ107XG4gIGlmICghZGlyKVxuICAgIGRpciA9IFBhdGgucmVzb2x2ZSgpO1xuXG4gIGNvbnN0IHJlc3VsdDoge1tkaXI6IHN0cmluZ106IHN0cmluZ1tdfSA9IHt9O1xuICBhd2FpdCBnbG9iRGlycyhkaXIsIHJlc3VsdCk7XG5cbiAgbG9nLmluZm8ocmVzdWx0KTtcbn1cblxuY29uc3QgcmVhZGRpciA9IHByb21pc2lmeShmcy5yZWFkZGlyKTtcbmNvbnN0IHN0YXRBc3luYyA9IHByb21pc2lmeShmcy5zdGF0KTtcblxuXG5hc3luYyBmdW5jdGlvbiBnbG9iRGlycyhkaXI6IHN0cmluZywgY29sbGVjdGlvbjoge1tkaXI6IHN0cmluZ106IHN0cmluZ1tdfSk6IFByb21pc2U8e1tkaXI6IHN0cmluZ106IHN0cmluZ1tdfT4ge1xuICBjb25zdCBiYXNlRGlyTmFtZSA9IFBhdGguYmFzZW5hbWUoZGlyKTtcbiAgaWYgKGJhc2VEaXJOYW1lID09PSAnbm9kZV9tb2R1bGVzJyB8fCBiYXNlRGlyTmFtZS5zdGFydHNXaXRoKCcuJykpXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShjb2xsZWN0aW9uKTtcblxuICBsb2cuaW5mbygnc2NhbicsIGRpcik7XG5cbiAgY29uc3Qgc3ViRGlyRG9uZSA9IHJlYWRkaXIoZGlyKVxuICAudGhlbihhc3luYyBkaXJzID0+IHtcbiAgICBjb25zdCBzdWJEaXJzID0gYXdhaXQgUHJvbWlzZS5hbGwoZGlycy5tYXAoYXN5bmMgYmFzZVN1YkRpciA9PiB7XG4gICAgICBjb25zdCBzdWJEaXIgPSBQYXRoLnJlc29sdmUoZGlyLCBiYXNlU3ViRGlyKTtcbiAgICAgIGNvbnN0IHN0YXQgPSBhd2FpdCBzdGF0QXN5bmMoc3ViRGlyKTtcbiAgICAgIGlmIChzdGF0LmlzRmlsZSgpICYmIHN1YkRpci5lbmRzV2l0aCgnLm1kJykpIHtcbiAgICAgICAgbGV0IGNvbCA9IGNvbGxlY3Rpb25bZGlyXTtcbiAgICAgICAgaWYgKCFjb2wpXG4gICAgICAgICAgY29sID0gY29sbGVjdGlvbltkaXJdID0gW107XG4gICAgICAgIGNvbC5wdXNoKGJhc2VTdWJEaXIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0YXQuaXNEaXJlY3RvcnkoKSA/IHN1YkRpciA6IG51bGw7XG4gICAgfSkpO1xuICAgIHJldHVybiBQcm9taXNlLmFsbChzdWJEaXJzLmZpbHRlcihzdWJEaXIgPT4gc3ViRGlyKS5tYXAoc3ViRGlyID0+IHtcbiAgICAgIHJldHVybiBnbG9iRGlycyhzdWJEaXIhLCBjb2xsZWN0aW9uKTtcbiAgICB9KSk7XG4gIH0pO1xuICBhd2FpdCBzdWJEaXJEb25lO1xuICByZXR1cm4gY29sbGVjdGlvbjtcbn1cbiJdfQ==