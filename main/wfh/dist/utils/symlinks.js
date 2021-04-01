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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recreateSymlink = exports.validateLink = exports.symlinkAsync = exports.listModuleSymlinks = exports.unlinkAsync = exports._symlinkAsync = exports.lstatAsync = exports.isWin32 = void 0;
const fs = __importStar(require("fs"));
// import {removeSync} from 'fs-extra';
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const os_1 = __importDefault(require("os"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const misc_1 = require("./misc");
exports.isWin32 = os_1.default.platform().indexOf('win32') >= 0;
// export const readdirAsync = util.promisify(fs.readdir);
exports.lstatAsync = util_1.default.promisify(fs.lstat);
exports._symlinkAsync = util_1.default.promisify(fs.symlink);
exports.unlinkAsync = util_1.default.promisify(fs.unlink);
/**
 * Return all deleted symlinks
 * @param deleteOption
 */
function scanNodeModules(deleteOption = 'invalid') {
    return __awaiter(this, void 0, void 0, function* () {
        const deleteAll = deleteOption === 'all';
        const deletedList = [];
        yield listModuleSymlinks(path_1.default.join(misc_1.getWorkDir(), 'node_modules'), link => {
            if (validateLink(link, deleteAll)) {
                deletedList.push(link);
            }
        });
        return deletedList;
    });
}
exports.default = scanNodeModules;
function listModuleSymlinks(parentDir, onFound) {
    // const level1Dirs = await readdirAsync(parentDir);
    return rx.from(fs.promises.readdir(parentDir)).pipe(op.concatMap(level1Dirs => level1Dirs), op.mergeMap(dirname => {
        const dir = path_1.default.resolve(parentDir, dirname);
        if (dirname.startsWith('@') && fs.statSync(dir).isDirectory()) {
            // it is a scope package
            return rx.from(fs.promises.readdir(dir))
                .pipe(op.mergeMap(subdirs => subdirs), op.mergeMap(file => onEachFile(path_1.default.resolve(dir, file))));
        }
        else {
            return onEachFile(dir);
        }
    })).toPromise();
    // await Promise.all(level1Dirs.map(async dir => {
    //   if (dir.startsWith('@')) {
    //     // it is a scope package
    //     const subdirs = await readdirAsync(Path.resolve(parentDir, dir));
    //     await Promise.all(subdirs.map(file => onEachFile(Path.resolve(parentDir, dir, file))));
    //   } else {
    //     await onEachFile(Path.resolve(parentDir, dir));
    //   }
    // }));
    function onEachFile(file) {
        return __awaiter(this, void 0, void 0, function* () {
            let isSymlink = false;
            try {
                isSymlink = fs.lstatSync(file).isSymbolicLink();
            }
            catch (e) { }
            if (isSymlink) {
                yield Promise.resolve(onFound(file));
            }
        });
    }
}
exports.listModuleSymlinks = listModuleSymlinks;
/**
 * Do check existing symlink, recreate a new one if existing one is invalid symlink
 * @param linkTarget
 * @param link
 */
function symlinkAsync(linkTarget, link) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (fs.lstatSync(link).isSymbolicLink() && path_1.default.resolve(path_1.default.dirname(link), fs.readlinkSync(link)) === linkTarget) {
                // console.log('exits', link);
                return;
            }
            // tslint:disable-next-line: no-console
            console.log(`remove ${link}`);
            fs.unlinkSync(link);
        }
        catch (ex) {
            // link does not exist
            // console.log(ex);
        }
        // tslint:disable-next-line: no-console
        console.log(`create symlink ${link} --> ${linkTarget}`);
        return exports._symlinkAsync(path_1.default.relative(path_1.default.dirname(link), linkTarget), link, exports.isWin32 ? 'junction' : 'dir');
    });
}
exports.symlinkAsync = symlinkAsync;
function validateLink(link, deleteAll = false) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if ((yield exports.lstatAsync(link)).isSymbolicLink() &&
                (deleteAll || !fs.existsSync(path_1.default.resolve(path_1.default.dirname(link), fs.readlinkSync(link))))) {
                // tslint:disable-next-line: no-console
                console.log(`[symlink check] Remove ${deleteAll ? '' : 'invalid'} symlink ${path_1.default.relative('.', link)}`);
                yield exports.unlinkAsync(link);
                return false;
            }
            return true;
        }
        catch (ex) {
            return false;
        }
    });
}
exports.validateLink = validateLink;
/**
 * Delete symlink or file/directory if it is invalid symlink or pointing to nonexisting target
 * @param link the symlink
 * @param target
 * @returns true if needs to create a new symlink
 */
function recreateSymlink(link, target) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if ((yield exports.lstatAsync(link)).isSymbolicLink() &&
                !fs.existsSync(path_1.default.resolve(path_1.default.dirname(link), fs.readlinkSync(link)))) {
                yield exports.unlinkAsync(link);
                return false;
            }
            return true;
        }
        catch (ex) {
            return false;
        }
    });
}
exports.recreateSymlink = recreateSymlink;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltbGlua3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9zeW1saW5rcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdUNBQXlCO0FBQ3pCLHVDQUF1QztBQUN2QyxnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUNwQix5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLGlDQUFrQztBQUVyQixRQUFBLE9BQU8sR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMzRCwwREFBMEQ7QUFDN0MsUUFBQSxVQUFVLEdBQUcsY0FBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDdEMsUUFBQSxhQUFhLEdBQUcsY0FBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDM0MsUUFBQSxXQUFXLEdBQUcsY0FBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFckQ7OztHQUdHO0FBQ0gsU0FBOEIsZUFBZSxDQUFDLGVBQWtDLFNBQVM7O1FBQ3ZGLE1BQU0sU0FBUyxHQUFHLFlBQVksS0FBSyxLQUFLLENBQUM7UUFDekMsTUFBTSxXQUFXLEdBQWEsRUFBRSxDQUFDO1FBQ2pDLE1BQU0sa0JBQWtCLENBQUMsY0FBSSxDQUFDLElBQUksQ0FBQyxpQkFBVSxFQUFFLEVBQUUsY0FBYyxDQUFDLEVBQzlELElBQUksQ0FBQyxFQUFFO1lBQ0wsSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxFQUFFO2dCQUNqQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3hCO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0NBQUE7QUFWRCxrQ0FVQztBQUVELFNBQWdCLGtCQUFrQixDQUNoQyxTQUFpQixFQUNqQixPQUErQztJQUMvQyxvREFBb0Q7SUFDcEQsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUNqRCxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQ3RDLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDcEIsTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDN0MsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDN0Qsd0JBQXdCO1lBQ3hCLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDdkMsSUFBSSxDQUNILEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFDL0IsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQ3pELENBQUM7U0FDSDthQUFNO1lBQ0wsT0FBTyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDeEI7SUFDSCxDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2Qsa0RBQWtEO0lBQ2xELCtCQUErQjtJQUMvQiwrQkFBK0I7SUFDL0Isd0VBQXdFO0lBQ3hFLDhGQUE4RjtJQUM5RixhQUFhO0lBQ2Isc0RBQXNEO0lBQ3RELE1BQU07SUFDTixPQUFPO0lBRVAsU0FBZSxVQUFVLENBQUMsSUFBWTs7WUFDcEMsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDO1lBQ3RCLElBQUk7Z0JBQ0YsU0FBUyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7YUFDakQ7WUFBQyxPQUFPLENBQUMsRUFBRSxHQUFFO1lBQ2QsSUFBSSxTQUFTLEVBQUU7Z0JBQ2IsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2FBQ3RDO1FBQ0gsQ0FBQztLQUFBO0FBQ0gsQ0FBQztBQXZDRCxnREF1Q0M7QUFFRDs7OztHQUlHO0FBQ0gsU0FBc0IsWUFBWSxDQUFDLFVBQWtCLEVBQUUsSUFBWTs7UUFDakUsSUFBSTtZQUNGLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxjQUFjLEVBQUUsSUFBSSxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLFVBQVUsRUFBRTtnQkFDakgsOEJBQThCO2dCQUM5QixPQUFPO2FBQ1I7WUFDQSx1Q0FBdUM7WUFDeEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksRUFBRSxDQUFDLENBQUM7WUFDOUIsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNyQjtRQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsc0JBQXNCO1lBQ3RCLG1CQUFtQjtTQUNwQjtRQUNELHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixJQUFJLFFBQVEsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUN4RCxPQUFPLHFCQUFhLENBQ2xCLGNBQUksQ0FBQyxRQUFRLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLENBQUMsRUFDN0MsSUFBSSxFQUFFLGVBQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQ25DLENBQUM7SUFDSixDQUFDO0NBQUE7QUFuQkQsb0NBbUJDO0FBRUQsU0FBc0IsWUFBWSxDQUFDLElBQVksRUFBRSxTQUFTLEdBQUcsS0FBSzs7UUFDaEUsSUFBSTtZQUNGLElBQUksQ0FBQyxNQUFNLGtCQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUU7Z0JBQzNDLENBQUMsU0FBUyxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDcEY7Z0JBQ0YsdUNBQXVDO2dCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxZQUFZLGNBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEcsTUFBTSxtQkFBVyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN4QixPQUFPLEtBQUssQ0FBQzthQUNkO1lBQ0QsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsT0FBTyxLQUFLLENBQUM7U0FDZDtJQUNILENBQUM7Q0FBQTtBQWRELG9DQWNDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxTQUFzQixlQUFlLENBQUMsSUFBWSxFQUFFLE1BQWM7O1FBQ2hFLElBQUk7WUFDRixJQUFJLENBQUMsTUFBTSxrQkFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFO2dCQUMzQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUNyRTtnQkFDRixNQUFNLG1CQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3hCLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7WUFDRCxPQUFPLElBQUksQ0FBQztTQUNiO1FBQUMsT0FBTyxFQUFFLEVBQUU7WUFDWCxPQUFPLEtBQUssQ0FBQztTQUNkO0lBQ0gsQ0FBQztDQUFBO0FBWkQsMENBWUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG4vLyBpbXBvcnQge3JlbW92ZVN5bmN9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge2dldFdvcmtEaXJ9IGZyb20gJy4vbWlzYyc7XG5cbmV4cG9ydCBjb25zdCBpc1dpbjMyID0gb3MucGxhdGZvcm0oKS5pbmRleE9mKCd3aW4zMicpID49IDA7XG4vLyBleHBvcnQgY29uc3QgcmVhZGRpckFzeW5jID0gdXRpbC5wcm9taXNpZnkoZnMucmVhZGRpcik7XG5leHBvcnQgY29uc3QgbHN0YXRBc3luYyA9IHV0aWwucHJvbWlzaWZ5KGZzLmxzdGF0KTtcbmV4cG9ydCBjb25zdCBfc3ltbGlua0FzeW5jID0gdXRpbC5wcm9taXNpZnkoZnMuc3ltbGluayk7XG5leHBvcnQgY29uc3QgdW5saW5rQXN5bmMgPSB1dGlsLnByb21pc2lmeShmcy51bmxpbmspO1xuXG4vKipcbiAqIFJldHVybiBhbGwgZGVsZXRlZCBzeW1saW5rc1xuICogQHBhcmFtIGRlbGV0ZU9wdGlvbiBcbiAqL1xuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gc2Nhbk5vZGVNb2R1bGVzKGRlbGV0ZU9wdGlvbjogJ2FsbCcgfCAnaW52YWxpZCcgPSAnaW52YWxpZCcpIHtcbiAgY29uc3QgZGVsZXRlQWxsID0gZGVsZXRlT3B0aW9uID09PSAnYWxsJztcbiAgY29uc3QgZGVsZXRlZExpc3Q6IHN0cmluZ1tdID0gW107XG4gIGF3YWl0IGxpc3RNb2R1bGVTeW1saW5rcyhQYXRoLmpvaW4oZ2V0V29ya0RpcigpLCAnbm9kZV9tb2R1bGVzJyksXG4gICAgbGluayA9PiB7XG4gICAgICBpZiAodmFsaWRhdGVMaW5rKGxpbmssIGRlbGV0ZUFsbCkpIHtcbiAgICAgICAgZGVsZXRlZExpc3QucHVzaChsaW5rKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgcmV0dXJuIGRlbGV0ZWRMaXN0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdE1vZHVsZVN5bWxpbmtzKFxuICBwYXJlbnREaXI6IHN0cmluZyxcbiAgb25Gb3VuZDogKGxpbms6IHN0cmluZykgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4pIHtcbiAgLy8gY29uc3QgbGV2ZWwxRGlycyA9IGF3YWl0IHJlYWRkaXJBc3luYyhwYXJlbnREaXIpO1xuICByZXR1cm4gcnguZnJvbShmcy5wcm9taXNlcy5yZWFkZGlyKHBhcmVudERpcikpLnBpcGUoXG4gICAgb3AuY29uY2F0TWFwKGxldmVsMURpcnMgPT4gbGV2ZWwxRGlycyksXG4gICAgb3AubWVyZ2VNYXAoZGlybmFtZSA9PiB7XG4gICAgICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUocGFyZW50RGlyLCBkaXJuYW1lKTtcbiAgICAgIGlmIChkaXJuYW1lLnN0YXJ0c1dpdGgoJ0AnKSAmJiBmcy5zdGF0U3luYyhkaXIpLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgLy8gaXQgaXMgYSBzY29wZSBwYWNrYWdlXG4gICAgICAgIHJldHVybiByeC5mcm9tKGZzLnByb21pc2VzLnJlYWRkaXIoZGlyKSlcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgb3AubWVyZ2VNYXAoc3ViZGlycyA9PiBzdWJkaXJzKSxcbiAgICAgICAgICBvcC5tZXJnZU1hcChmaWxlID0+IG9uRWFjaEZpbGUoUGF0aC5yZXNvbHZlKGRpciwgZmlsZSkpKVxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG9uRWFjaEZpbGUoZGlyKTtcbiAgICAgIH1cbiAgICB9KVxuICApLnRvUHJvbWlzZSgpO1xuICAvLyBhd2FpdCBQcm9taXNlLmFsbChsZXZlbDFEaXJzLm1hcChhc3luYyBkaXIgPT4ge1xuICAvLyAgIGlmIChkaXIuc3RhcnRzV2l0aCgnQCcpKSB7XG4gIC8vICAgICAvLyBpdCBpcyBhIHNjb3BlIHBhY2thZ2VcbiAgLy8gICAgIGNvbnN0IHN1YmRpcnMgPSBhd2FpdCByZWFkZGlyQXN5bmMoUGF0aC5yZXNvbHZlKHBhcmVudERpciwgZGlyKSk7XG4gIC8vICAgICBhd2FpdCBQcm9taXNlLmFsbChzdWJkaXJzLm1hcChmaWxlID0+IG9uRWFjaEZpbGUoUGF0aC5yZXNvbHZlKHBhcmVudERpciwgZGlyLCBmaWxlKSkpKTtcbiAgLy8gICB9IGVsc2Uge1xuICAvLyAgICAgYXdhaXQgb25FYWNoRmlsZShQYXRoLnJlc29sdmUocGFyZW50RGlyLCBkaXIpKTtcbiAgLy8gICB9XG4gIC8vIH0pKTtcblxuICBhc3luYyBmdW5jdGlvbiBvbkVhY2hGaWxlKGZpbGU6IHN0cmluZykge1xuICAgIGxldCBpc1N5bWxpbmsgPSBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgaXNTeW1saW5rID0gZnMubHN0YXRTeW5jKGZpbGUpLmlzU3ltYm9saWNMaW5rKCk7XG4gICAgfSBjYXRjaCAoZSkge31cbiAgICBpZiAoaXNTeW1saW5rKSB7XG4gICAgICBhd2FpdCBQcm9taXNlLnJlc29sdmUob25Gb3VuZChmaWxlKSk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogRG8gY2hlY2sgZXhpc3Rpbmcgc3ltbGluaywgcmVjcmVhdGUgYSBuZXcgb25lIGlmIGV4aXN0aW5nIG9uZSBpcyBpbnZhbGlkIHN5bWxpbmtcbiAqIEBwYXJhbSBsaW5rVGFyZ2V0IFxuICogQHBhcmFtIGxpbmsgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzeW1saW5rQXN5bmMobGlua1RhcmdldDogc3RyaW5nLCBsaW5rOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICBpZiAoZnMubHN0YXRTeW5jKGxpbmspLmlzU3ltYm9saWNMaW5rKCkgJiYgUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShsaW5rKSwgZnMucmVhZGxpbmtTeW5jKGxpbmspKSA9PT0gbGlua1RhcmdldCkge1xuICAgICAgLy8gY29uc29sZS5sb2coJ2V4aXRzJywgbGluayk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhgcmVtb3ZlICR7bGlua31gKTtcbiAgICBmcy51bmxpbmtTeW5jKGxpbmspO1xuICB9IGNhdGNoIChleCkge1xuICAgIC8vIGxpbmsgZG9lcyBub3QgZXhpc3RcbiAgICAvLyBjb25zb2xlLmxvZyhleCk7XG4gIH1cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKGBjcmVhdGUgc3ltbGluayAke2xpbmt9IC0tPiAke2xpbmtUYXJnZXR9YCk7XG4gIHJldHVybiBfc3ltbGlua0FzeW5jKFxuICAgIFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKGxpbmspLCBsaW5rVGFyZ2V0KSxcbiAgICBsaW5rLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInXG4gICk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB2YWxpZGF0ZUxpbmsobGluazogc3RyaW5nLCBkZWxldGVBbGwgPSBmYWxzZSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGlmICgoYXdhaXQgbHN0YXRBc3luYyhsaW5rKSkuaXNTeW1ib2xpY0xpbmsoKSAmJlxuICAgICAgKGRlbGV0ZUFsbCB8fCAhZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGxpbmspLCBmcy5yZWFkbGlua1N5bmMobGluaykpKSlcbiAgICAgICkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhgW3N5bWxpbmsgY2hlY2tdIFJlbW92ZSAke2RlbGV0ZUFsbCA/ICcnIDogJ2ludmFsaWQnfSBzeW1saW5rICR7UGF0aC5yZWxhdGl2ZSgnLicsIGxpbmspfWApO1xuICAgICAgYXdhaXQgdW5saW5rQXN5bmMobGluayk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChleCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vKipcbiAqIERlbGV0ZSBzeW1saW5rIG9yIGZpbGUvZGlyZWN0b3J5IGlmIGl0IGlzIGludmFsaWQgc3ltbGluayBvciBwb2ludGluZyB0byBub25leGlzdGluZyB0YXJnZXRcbiAqIEBwYXJhbSBsaW5rIHRoZSBzeW1saW5rXG4gKiBAcGFyYW0gdGFyZ2V0IFxuICogQHJldHVybnMgdHJ1ZSBpZiBuZWVkcyB0byBjcmVhdGUgYSBuZXcgc3ltbGlua1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVjcmVhdGVTeW1saW5rKGxpbms6IHN0cmluZywgdGFyZ2V0OiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBpZiAoKGF3YWl0IGxzdGF0QXN5bmMobGluaykpLmlzU3ltYm9saWNMaW5rKCkgJiZcbiAgICAgICFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUobGluayksIGZzLnJlYWRsaW5rU3luYyhsaW5rKSkpXG4gICAgICApIHtcbiAgICAgIGF3YWl0IHVubGlua0FzeW5jKGxpbmspO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuIl19