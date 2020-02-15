"use strict";
/**
 * Do not import any 3rd-party dependency in this file,
 * it is run by `init` command at the time there probably is
 * no dependencies installed yet
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const os_1 = __importDefault(require("os"));
const isWin32 = os_1.default.platform().indexOf('win32') >= 0;
const readdirAsync = util_1.default.promisify(fs_1.default.readdir);
const lstatAsync = util_1.default.promisify(fs_1.default.lstat);
const unlinkAsync = util_1.default.promisify(fs_1.default.unlink);
function scanNodeModules(deleteOption = 'invalid') {
    return __awaiter(this, void 0, void 0, function* () {
        const level1Dirs = yield readdirAsync('node_modules');
        const deleteAll = deleteOption === 'all';
        yield Promise.all(level1Dirs.map((dir) => __awaiter(this, void 0, void 0, function* () {
            if (dir.startsWith('@')) {
                // it is a scope package
                const subdirs = yield readdirAsync(path_1.default.resolve('node_modules', dir));
                yield Promise.all(subdirs.map(s => checkDir(path_1.default.resolve('node_modules', dir, s), deleteAll)));
            }
            else {
                yield checkDir(path_1.default.resolve('node_modules', dir), deleteAll);
            }
        })));
    });
}
exports.default = scanNodeModules;
function linkDrcp() {
    const sourceDir = path_1.default.resolve(__dirname, '../../..');
    fs_1.default.symlinkSync(path_1.default.relative(path_1.default.resolve('node_modules'), sourceDir), path_1.default.resolve('node_modules', 'dr-comp-package'), isWin32 ? 'junction' : 'dir');
}
exports.linkDrcp = linkDrcp;
function checkDir(dir, deleteAll = false) {
    return __awaiter(this, void 0, void 0, function* () {
        if ((yield lstatAsync(dir)).isSymbolicLink() && (deleteAll ||
            !fs_1.default.existsSync(path_1.default.resolve(path_1.default.dirname(dir), fs_1.default.readlinkSync(dir))))) {
            // tslint:disable-next-line: no-console
            console.log(`[symlink check] Remove ${deleteAll ? '' : 'invalid'} symlink ${path_1.default.relative('.', dir)}`);
            yield unlinkAsync(dir);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltbGlua3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9zeW1saW5rcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7Ozs7Ozs7Ozs7OztBQUVILDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUVwQixNQUFNLE9BQU8sR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNwRCxNQUFNLFlBQVksR0FBRyxjQUFJLENBQUMsU0FBUyxDQUFDLFlBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNoRCxNQUFNLFVBQVUsR0FBRyxjQUFJLENBQUMsU0FBUyxDQUFDLFlBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUM1QyxNQUFNLFdBQVcsR0FBRyxjQUFJLENBQUMsU0FBUyxDQUFDLFlBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUU5QyxTQUE4QixlQUFlLENBQUMsZUFBa0MsU0FBUzs7UUFDdkYsTUFBTSxVQUFVLEdBQUcsTUFBTSxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFdEQsTUFBTSxTQUFTLEdBQUcsWUFBWSxLQUFLLEtBQUssQ0FBQztRQUV6QyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFNLEdBQUcsRUFBQyxFQUFFO1lBQzNDLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDdkIsd0JBQXdCO2dCQUN4QixNQUFNLE9BQU8sR0FBRyxNQUFNLFlBQVksQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN0RSxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2hHO2lCQUFNO2dCQUNMLE1BQU0sUUFBUSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2FBQzlEO1FBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQztDQUFBO0FBZEQsa0NBY0M7QUFFRCxTQUFnQixRQUFRO0lBQ3RCLE1BQU0sU0FBUyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3RELFlBQUUsQ0FBQyxXQUFXLENBQUMsY0FBSSxDQUFDLFFBQVEsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUNuRSxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNuRixDQUFDO0FBSkQsNEJBSUM7QUFFRCxTQUFlLFFBQVEsQ0FBQyxHQUFXLEVBQUUsU0FBUyxHQUFHLEtBQUs7O1FBQ3BELElBQUksQ0FBQyxNQUFNLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN4RCxDQUFDLFlBQUUsQ0FBQyxVQUFVLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLFlBQUUsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDeEUsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLFlBQVksY0FBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZHLE1BQU0sV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3hCO0lBQ0gsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBEbyBub3QgaW1wb3J0IGFueSAzcmQtcGFydHkgZGVwZW5kZW5jeSBpbiB0aGlzIGZpbGUsXG4gKiBpdCBpcyBydW4gYnkgYGluaXRgIGNvbW1hbmQgYXQgdGhlIHRpbWUgdGhlcmUgcHJvYmFibHkgaXNcbiAqIG5vIGRlcGVuZGVuY2llcyBpbnN0YWxsZWQgeWV0XG4gKi9cblxuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuXG5jb25zdCBpc1dpbjMyID0gb3MucGxhdGZvcm0oKS5pbmRleE9mKCd3aW4zMicpID49IDA7XG5jb25zdCByZWFkZGlyQXN5bmMgPSB1dGlsLnByb21pc2lmeShmcy5yZWFkZGlyKTtcbmNvbnN0IGxzdGF0QXN5bmMgPSB1dGlsLnByb21pc2lmeShmcy5sc3RhdCk7XG5jb25zdCB1bmxpbmtBc3luYyA9IHV0aWwucHJvbWlzaWZ5KGZzLnVubGluayk7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIHNjYW5Ob2RlTW9kdWxlcyhkZWxldGVPcHRpb246ICdhbGwnIHwgJ2ludmFsaWQnID0gJ2ludmFsaWQnKSB7XG4gIGNvbnN0IGxldmVsMURpcnMgPSBhd2FpdCByZWFkZGlyQXN5bmMoJ25vZGVfbW9kdWxlcycpO1xuXG4gIGNvbnN0IGRlbGV0ZUFsbCA9IGRlbGV0ZU9wdGlvbiA9PT0gJ2FsbCc7XG5cbiAgYXdhaXQgUHJvbWlzZS5hbGwobGV2ZWwxRGlycy5tYXAoYXN5bmMgZGlyID0+IHtcbiAgICBpZiAoZGlyLnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAgICAgLy8gaXQgaXMgYSBzY29wZSBwYWNrYWdlXG4gICAgICBjb25zdCBzdWJkaXJzID0gYXdhaXQgcmVhZGRpckFzeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgZGlyKSk7XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChzdWJkaXJzLm1hcChzID0+IGNoZWNrRGlyKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgZGlyLCBzKSwgZGVsZXRlQWxsKSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCBjaGVja0RpcihQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycsIGRpciksIGRlbGV0ZUFsbCk7XG4gICAgfVxuICB9KSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaW5rRHJjcCgpIHtcbiAgY29uc3Qgc291cmNlRGlyID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uLy4uJyk7XG4gIGZzLnN5bWxpbmtTeW5jKFBhdGgucmVsYXRpdmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnKSwgc291cmNlRGlyKSxcbiAgICBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycsICdkci1jb21wLXBhY2thZ2UnKSwgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNoZWNrRGlyKGRpcjogc3RyaW5nLCBkZWxldGVBbGwgPSBmYWxzZSkge1xuICBpZiAoKGF3YWl0IGxzdGF0QXN5bmMoZGlyKSkuaXNTeW1ib2xpY0xpbmsoKSAmJiAoZGVsZXRlQWxsIHx8XG4gICAgIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShkaXIpLCBmcy5yZWFkbGlua1N5bmMoZGlyKSkpKSkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGBbc3ltbGluayBjaGVja10gUmVtb3ZlICR7ZGVsZXRlQWxsID8gJycgOiAnaW52YWxpZCd9IHN5bWxpbmsgJHtQYXRoLnJlbGF0aXZlKCcuJywgZGlyKX1gKTtcbiAgICBhd2FpdCB1bmxpbmtBc3luYyhkaXIpO1xuICB9XG59XG5cbiJdfQ==