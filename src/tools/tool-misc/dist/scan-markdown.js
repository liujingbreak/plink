"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// import api from '__api';
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const util_1 = require("util");
const log = require('log4js').getLogger('tool-misc.' + path_1.default.basename(__filename));
function scan(dir) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const baseDirName = path_1.default.basename(dir);
        if (baseDirName === 'node_modules' || baseDirName.startsWith('.'))
            return Promise.resolve(collection);
        log.info('scan', dir);
        const subDirDone = readdir(dir)
            .then((dirs) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const subDirs = yield Promise.all(dirs.map((baseSubDir) => tslib_1.__awaiter(this, void 0, void 0, function* () {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvdG9vbC1taXNjL3RzL3NjYW4tbWFya2Rvd24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsMkJBQTJCO0FBQzNCLHdEQUF3QjtBQUN4QixvREFBb0I7QUFDcEIsK0JBQStCO0FBRS9CLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztBQUVsRixTQUFzQixJQUFJLENBQUMsR0FBVzs7UUFDcEMsaURBQWlEO1FBQ2pELElBQUksQ0FBQyxHQUFHO1lBQ04sR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUV2QixNQUFNLE1BQU0sR0FBOEIsRUFBRSxDQUFDO1FBQzdDLE1BQU0sUUFBUSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUU1QixHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ25CLENBQUM7Q0FBQTtBQVRELG9CQVNDO0FBRUQsTUFBTSxPQUFPLEdBQUcsZ0JBQVMsQ0FBQyxZQUFFLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdEMsTUFBTSxTQUFTLEdBQUcsZ0JBQVMsQ0FBQyxZQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7QUFHckMsU0FBZSxRQUFRLENBQUMsR0FBVyxFQUFFLFVBQXFDOztRQUN4RSxNQUFNLFdBQVcsR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZDLElBQUksV0FBVyxLQUFLLGNBQWMsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUMvRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFckMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFFdEIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQzthQUM5QixJQUFJLENBQUMsQ0FBTSxJQUFJLEVBQUMsRUFBRTtZQUNqQixNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFNLFVBQVUsRUFBQyxFQUFFO2dCQUM1RCxNQUFNLE1BQU0sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDN0MsTUFBTSxJQUFJLEdBQUcsTUFBTSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3JDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQzNDLElBQUksR0FBRyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDMUIsSUFBSSxDQUFDLEdBQUc7d0JBQ04sR0FBRyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7b0JBQzdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7aUJBQ3RCO2dCQUNELE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUM1QyxDQUFDLENBQUEsQ0FBQyxDQUFDLENBQUM7WUFDSixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDL0QsT0FBTyxRQUFRLENBQUMsTUFBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTixDQUFDLENBQUEsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxVQUFVLENBQUM7UUFDakIsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUFBIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHIvdG9vbC1taXNjL2Rpc3Qvc2Nhbi1tYXJrZG93bi5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLy8gaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge3Byb21pc2lmeX0gZnJvbSAndXRpbCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCd0b29sLW1pc2MuJyArIFBhdGguYmFzZW5hbWUoX19maWxlbmFtZSkpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2NhbihkaXI6IHN0cmluZykge1xuICAvLyBsZXQgZ2xvYkV4Y2x1ZGVzOiBzdHJpbmdbXSA9IFsnbm9kZV9tb2R1bGVzJ107XG4gIGlmICghZGlyKVxuICAgIGRpciA9IFBhdGgucmVzb2x2ZSgpO1xuXG4gIGNvbnN0IHJlc3VsdDoge1tkaXI6IHN0cmluZ106IHN0cmluZ1tdfSA9IHt9O1xuICBhd2FpdCBnbG9iRGlycyhkaXIsIHJlc3VsdCk7XG5cbiAgbG9nLmluZm8ocmVzdWx0KTtcbn1cblxuY29uc3QgcmVhZGRpciA9IHByb21pc2lmeShmcy5yZWFkZGlyKTtcbmNvbnN0IHN0YXRBc3luYyA9IHByb21pc2lmeShmcy5zdGF0KTtcblxuXG5hc3luYyBmdW5jdGlvbiBnbG9iRGlycyhkaXI6IHN0cmluZywgY29sbGVjdGlvbjoge1tkaXI6IHN0cmluZ106IHN0cmluZ1tdfSk6IFByb21pc2U8e1tkaXI6IHN0cmluZ106IHN0cmluZ1tdfT4ge1xuICBjb25zdCBiYXNlRGlyTmFtZSA9IFBhdGguYmFzZW5hbWUoZGlyKTtcbiAgaWYgKGJhc2VEaXJOYW1lID09PSAnbm9kZV9tb2R1bGVzJyB8fCBiYXNlRGlyTmFtZS5zdGFydHNXaXRoKCcuJykpXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShjb2xsZWN0aW9uKTtcblxuICBsb2cuaW5mbygnc2NhbicsIGRpcik7XG5cbiAgY29uc3Qgc3ViRGlyRG9uZSA9IHJlYWRkaXIoZGlyKVxuICAudGhlbihhc3luYyBkaXJzID0+IHtcbiAgICBjb25zdCBzdWJEaXJzID0gYXdhaXQgUHJvbWlzZS5hbGwoZGlycy5tYXAoYXN5bmMgYmFzZVN1YkRpciA9PiB7XG4gICAgICBjb25zdCBzdWJEaXIgPSBQYXRoLnJlc29sdmUoZGlyLCBiYXNlU3ViRGlyKTtcbiAgICAgIGNvbnN0IHN0YXQgPSBhd2FpdCBzdGF0QXN5bmMoc3ViRGlyKTtcbiAgICAgIGlmIChzdGF0LmlzRmlsZSgpICYmIHN1YkRpci5lbmRzV2l0aCgnLm1kJykpIHtcbiAgICAgICAgbGV0IGNvbCA9IGNvbGxlY3Rpb25bZGlyXTtcbiAgICAgICAgaWYgKCFjb2wpXG4gICAgICAgICAgY29sID0gY29sbGVjdGlvbltkaXJdID0gW107XG4gICAgICAgIGNvbC5wdXNoKGJhc2VTdWJEaXIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0YXQuaXNEaXJlY3RvcnkoKSA/IHN1YkRpciA6IG51bGw7XG4gICAgfSkpO1xuICAgIHJldHVybiBQcm9taXNlLmFsbChzdWJEaXJzLmZpbHRlcihzdWJEaXIgPT4gc3ViRGlyKS5tYXAoc3ViRGlyID0+IHtcbiAgICAgIHJldHVybiBnbG9iRGlycyhzdWJEaXIhLCBjb2xsZWN0aW9uKTtcbiAgICB9KSk7XG4gIH0pO1xuICBhd2FpdCBzdWJEaXJEb25lO1xuICByZXR1cm4gY29sbGVjdGlvbjtcbn1cbiJdfQ==
