"use strict";
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
async function scan(dir) {
    // let globExcludes: string[] = ['node_modules'];
    if (!dir)
        dir = path_1.default.resolve();
    const result = {};
    await globDirs(dir, result);
    log.info(result);
}
exports.scan = scan;
const readdir = (0, util_1.promisify)(fs_1.default.readdir);
const statAsync = (0, util_1.promisify)(fs_1.default.stat);
async function globDirs(dir, collection) {
    const baseDirName = path_1.default.basename(dir);
    if (baseDirName === 'node_modules' || baseDirName.startsWith('.'))
        return Promise.resolve(collection);
    log.info('scan', dir);
    const subDirDone = readdir(dir)
        .then(async (dirs) => {
        const subDirs = await Promise.all(dirs.map(async (baseSubDir) => {
            const subDir = path_1.default.resolve(dir, baseSubDir);
            const stat = await statAsync(subDir);
            if (stat.isFile() && subDir.endsWith('.md')) {
                let col = collection[dir];
                if (!col)
                    col = collection[dir] = [];
                col.push(baseSubDir);
            }
            return stat.isDirectory() ? subDir : null;
        }));
        return Promise.all(subDirs.filter(subDir => subDir).map(subDir => {
            return globDirs(subDir, collection);
        }));
    });
    await subDirDone;
    return collection;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nhbi1tYXJrZG93bi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNjYW4tbWFya2Rvd24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQ0EsMkJBQTJCO0FBQzNCLGdEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFDcEIsK0JBQStCO0FBRS9CLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztBQUUzRSxLQUFLLFVBQVUsSUFBSSxDQUFDLEdBQVc7SUFDcEMsaURBQWlEO0lBQ2pELElBQUksQ0FBQyxHQUFHO1FBQ04sR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUV2QixNQUFNLE1BQU0sR0FBOEIsRUFBRSxDQUFDO0lBQzdDLE1BQU0sUUFBUSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUU1QixHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ25CLENBQUM7QUFURCxvQkFTQztBQUVELE1BQU0sT0FBTyxHQUFHLElBQUEsZ0JBQVMsRUFBQyxZQUFFLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdEMsTUFBTSxTQUFTLEdBQUcsSUFBQSxnQkFBUyxFQUFDLFlBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUdyQyxLQUFLLFVBQVUsUUFBUSxDQUFDLEdBQVcsRUFBRSxVQUFxQztJQUN4RSxNQUFNLFdBQVcsR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZDLElBQUksV0FBVyxLQUFLLGNBQWMsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztRQUMvRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFFckMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFFdEIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztTQUM5QixJQUFJLENBQUMsS0FBSyxFQUFDLElBQUksRUFBQyxFQUFFO1FBQ2pCLE1BQU0sT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBQyxVQUFVLEVBQUMsRUFBRTtZQUM1RCxNQUFNLE1BQU0sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUM3QyxNQUFNLElBQUksR0FBRyxNQUFNLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNyQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUMzQyxJQUFJLEdBQUcsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxHQUFHO29CQUNOLEdBQUcsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUM3QixHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQ3RCO1lBQ0QsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQzVDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMvRCxPQUFPLFFBQVEsQ0FBQyxNQUFPLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNOLENBQUMsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxVQUFVLENBQUM7SUFDakIsT0FBTyxVQUFVLENBQUM7QUFDcEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlxuLy8gaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge3Byb21pc2lmeX0gZnJvbSAndXRpbCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCd0b29sLW1pc2MuJyArIFBhdGguYmFzZW5hbWUoX19maWxlbmFtZSkpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2NhbihkaXI6IHN0cmluZykge1xuICAvLyBsZXQgZ2xvYkV4Y2x1ZGVzOiBzdHJpbmdbXSA9IFsnbm9kZV9tb2R1bGVzJ107XG4gIGlmICghZGlyKVxuICAgIGRpciA9IFBhdGgucmVzb2x2ZSgpO1xuXG4gIGNvbnN0IHJlc3VsdDoge1tkaXI6IHN0cmluZ106IHN0cmluZ1tdfSA9IHt9O1xuICBhd2FpdCBnbG9iRGlycyhkaXIsIHJlc3VsdCk7XG5cbiAgbG9nLmluZm8ocmVzdWx0KTtcbn1cblxuY29uc3QgcmVhZGRpciA9IHByb21pc2lmeShmcy5yZWFkZGlyKTtcbmNvbnN0IHN0YXRBc3luYyA9IHByb21pc2lmeShmcy5zdGF0KTtcblxuXG5hc3luYyBmdW5jdGlvbiBnbG9iRGlycyhkaXI6IHN0cmluZywgY29sbGVjdGlvbjoge1tkaXI6IHN0cmluZ106IHN0cmluZ1tdfSk6IFByb21pc2U8e1tkaXI6IHN0cmluZ106IHN0cmluZ1tdfT4ge1xuICBjb25zdCBiYXNlRGlyTmFtZSA9IFBhdGguYmFzZW5hbWUoZGlyKTtcbiAgaWYgKGJhc2VEaXJOYW1lID09PSAnbm9kZV9tb2R1bGVzJyB8fCBiYXNlRGlyTmFtZS5zdGFydHNXaXRoKCcuJykpXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShjb2xsZWN0aW9uKTtcblxuICBsb2cuaW5mbygnc2NhbicsIGRpcik7XG5cbiAgY29uc3Qgc3ViRGlyRG9uZSA9IHJlYWRkaXIoZGlyKVxuICAudGhlbihhc3luYyBkaXJzID0+IHtcbiAgICBjb25zdCBzdWJEaXJzID0gYXdhaXQgUHJvbWlzZS5hbGwoZGlycy5tYXAoYXN5bmMgYmFzZVN1YkRpciA9PiB7XG4gICAgICBjb25zdCBzdWJEaXIgPSBQYXRoLnJlc29sdmUoZGlyLCBiYXNlU3ViRGlyKTtcbiAgICAgIGNvbnN0IHN0YXQgPSBhd2FpdCBzdGF0QXN5bmMoc3ViRGlyKTtcbiAgICAgIGlmIChzdGF0LmlzRmlsZSgpICYmIHN1YkRpci5lbmRzV2l0aCgnLm1kJykpIHtcbiAgICAgICAgbGV0IGNvbCA9IGNvbGxlY3Rpb25bZGlyXTtcbiAgICAgICAgaWYgKCFjb2wpXG4gICAgICAgICAgY29sID0gY29sbGVjdGlvbltkaXJdID0gW107XG4gICAgICAgIGNvbC5wdXNoKGJhc2VTdWJEaXIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0YXQuaXNEaXJlY3RvcnkoKSA/IHN1YkRpciA6IG51bGw7XG4gICAgfSkpO1xuICAgIHJldHVybiBQcm9taXNlLmFsbChzdWJEaXJzLmZpbHRlcihzdWJEaXIgPT4gc3ViRGlyKS5tYXAoc3ViRGlyID0+IHtcbiAgICAgIHJldHVybiBnbG9iRGlycyhzdWJEaXIhLCBjb2xsZWN0aW9uKTtcbiAgICB9KSk7XG4gIH0pO1xuICBhd2FpdCBzdWJEaXJEb25lO1xuICByZXR1cm4gY29sbGVjdGlvbjtcbn1cbiJdfQ==