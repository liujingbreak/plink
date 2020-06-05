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
    if (!fs_1.default.existsSync('node_modules'))
        fs_1.default.mkdirSync('node_modules');
    fs_1.default.symlinkSync(path_1.default.relative(path_1.default.resolve('node_modules'), sourceDir), path_1.default.resolve('node_modules', 'dr-comp-package'), isWin32 ? 'junction' : 'dir');
    // tslint:disable-next-line: no-console
    console.log(path_1.default.resolve('node_modules', 'dr-comp-package') + ' is created');
}
exports.linkDrcp = linkDrcp;
function checkDir(dir, deleteAll = false) {
    return __awaiter(this, void 0, void 0, function* () {
        if ((yield lstatAsync(dir)).isSymbolicLink() &&
            (deleteAll || !fs_1.default.existsSync(path_1.default.resolve(path_1.default.dirname(dir), fs_1.default.readlinkSync(dir))))) {
            // tslint:disable-next-line: no-console
            console.log(`[symlink check] Remove ${deleteAll ? '' : 'invalid'} symlink ${path_1.default.relative('.', dir)}`);
            yield unlinkAsync(dir);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltbGlua3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9zeW1saW5rcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7Ozs7Ozs7Ozs7OztBQUVILDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUVwQixNQUFNLE9BQU8sR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNwRCxNQUFNLFlBQVksR0FBRyxjQUFJLENBQUMsU0FBUyxDQUFDLFlBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNoRCxNQUFNLFVBQVUsR0FBRyxjQUFJLENBQUMsU0FBUyxDQUFDLFlBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUM1QyxNQUFNLFdBQVcsR0FBRyxjQUFJLENBQUMsU0FBUyxDQUFDLFlBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUU5QyxTQUE4QixlQUFlLENBQUMsZUFBa0MsU0FBUzs7UUFDdkYsTUFBTSxVQUFVLEdBQUcsTUFBTSxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFdEQsTUFBTSxTQUFTLEdBQUcsWUFBWSxLQUFLLEtBQUssQ0FBQztRQUV6QyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFNLEdBQUcsRUFBQyxFQUFFO1lBQzNDLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDdkIsd0JBQXdCO2dCQUN4QixNQUFNLE9BQU8sR0FBRyxNQUFNLFlBQVksQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN0RSxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2hHO2lCQUFNO2dCQUNMLE1BQU0sUUFBUSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2FBQzlEO1FBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQztDQUFBO0FBZEQsa0NBY0M7QUFFRCxTQUFnQixRQUFRO0lBQ3RCLE1BQU0sU0FBUyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3RELElBQUksQ0FBQyxZQUFFLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQztRQUNoQyxZQUFFLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQy9CLFlBQUUsQ0FBQyxXQUFXLENBQUMsY0FBSSxDQUFDLFFBQVEsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUNuRSxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNqRix1Q0FBdUM7SUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxDQUFDO0FBQy9FLENBQUM7QUFSRCw0QkFRQztBQUVELFNBQWUsUUFBUSxDQUFDLEdBQVcsRUFBRSxTQUFTLEdBQUcsS0FBSzs7UUFDcEQsSUFBSSxDQUFDLE1BQU0sVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFO1lBQzFDLENBQUMsU0FBUyxJQUFLLENBQUMsWUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsWUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDbkY7WUFDRix1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsWUFBWSxjQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDdkcsTUFBTSxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDeEI7SUFDSCxDQUFDO0NBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIERvIG5vdCBpbXBvcnQgYW55IDNyZC1wYXJ0eSBkZXBlbmRlbmN5IGluIHRoaXMgZmlsZSxcbiAqIGl0IGlzIHJ1biBieSBgaW5pdGAgY29tbWFuZCBhdCB0aGUgdGltZSB0aGVyZSBwcm9iYWJseSBpc1xuICogbm8gZGVwZW5kZW5jaWVzIGluc3RhbGxlZCB5ZXRcbiAqL1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5cbmNvbnN0IGlzV2luMzIgPSBvcy5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcbmNvbnN0IHJlYWRkaXJBc3luYyA9IHV0aWwucHJvbWlzaWZ5KGZzLnJlYWRkaXIpO1xuY29uc3QgbHN0YXRBc3luYyA9IHV0aWwucHJvbWlzaWZ5KGZzLmxzdGF0KTtcbmNvbnN0IHVubGlua0FzeW5jID0gdXRpbC5wcm9taXNpZnkoZnMudW5saW5rKTtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gc2Nhbk5vZGVNb2R1bGVzKGRlbGV0ZU9wdGlvbjogJ2FsbCcgfCAnaW52YWxpZCcgPSAnaW52YWxpZCcpIHtcbiAgY29uc3QgbGV2ZWwxRGlycyA9IGF3YWl0IHJlYWRkaXJBc3luYygnbm9kZV9tb2R1bGVzJyk7XG5cbiAgY29uc3QgZGVsZXRlQWxsID0gZGVsZXRlT3B0aW9uID09PSAnYWxsJztcblxuICBhd2FpdCBQcm9taXNlLmFsbChsZXZlbDFEaXJzLm1hcChhc3luYyBkaXIgPT4ge1xuICAgIGlmIChkaXIuc3RhcnRzV2l0aCgnQCcpKSB7XG4gICAgICAvLyBpdCBpcyBhIHNjb3BlIHBhY2thZ2VcbiAgICAgIGNvbnN0IHN1YmRpcnMgPSBhd2FpdCByZWFkZGlyQXN5bmMoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCBkaXIpKTtcbiAgICAgIGF3YWl0IFByb21pc2UuYWxsKHN1YmRpcnMubWFwKHMgPT4gY2hlY2tEaXIoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCBkaXIsIHMpLCBkZWxldGVBbGwpKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IGNoZWNrRGlyKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgZGlyKSwgZGVsZXRlQWxsKTtcbiAgICB9XG4gIH0pKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpbmtEcmNwKCkge1xuICBjb25zdCBzb3VyY2VEaXIgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vLi4nKTtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKCdub2RlX21vZHVsZXMnKSlcbiAgICBmcy5ta2RpclN5bmMoJ25vZGVfbW9kdWxlcycpO1xuICBmcy5zeW1saW5rU3luYyhQYXRoLnJlbGF0aXZlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJyksIHNvdXJjZURpciksXG4gICAgUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAnZHItY29tcC1wYWNrYWdlJyksIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAnZHItY29tcC1wYWNrYWdlJykgKyAnIGlzIGNyZWF0ZWQnKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY2hlY2tEaXIoZGlyOiBzdHJpbmcsIGRlbGV0ZUFsbCA9IGZhbHNlKSB7XG4gIGlmICgoYXdhaXQgbHN0YXRBc3luYyhkaXIpKS5pc1N5bWJvbGljTGluaygpICYmXG4gICAgKGRlbGV0ZUFsbCB8fCAgIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShkaXIpLCBmcy5yZWFkbGlua1N5bmMoZGlyKSkpKVxuICAgICkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGBbc3ltbGluayBjaGVja10gUmVtb3ZlICR7ZGVsZXRlQWxsID8gJycgOiAnaW52YWxpZCd9IHN5bWxpbmsgJHtQYXRoLnJlbGF0aXZlKCcuJywgZGlyKX1gKTtcbiAgICBhd2FpdCB1bmxpbmtBc3luYyhkaXIpO1xuICB9XG59XG5cbiJdfQ==