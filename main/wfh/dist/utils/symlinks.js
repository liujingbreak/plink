"use strict";
/**
 * Do not import any 3rd-party dependency in this file,
 * it is run by `init` command at the time there probably is
 * no dependencies installed yet
 */
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
exports.getRealPath = exports.recreateSymlink = exports.validateLink = exports.symlinkAsync = exports.linkDrcp = exports.listModuleSymlinks = exports.unlinkAsync = exports._symlinkAsync = exports.lstatAsync = exports.readdirAsync = exports.isWin32 = void 0;
const fs = __importStar(require("fs"));
// import {removeSync} from 'fs-extra';
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const os_1 = __importDefault(require("os"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
exports.isWin32 = os_1.default.platform().indexOf('win32') >= 0;
exports.readdirAsync = util_1.default.promisify(fs.readdir);
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
        yield listModuleSymlinks(path_1.default.join(process.cwd(), 'node_modules'), link => {
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
    return rx.from(exports.readdirAsync(parentDir)).pipe(op.concatMap(level1Dirs => level1Dirs), op.mergeMap(dir => {
        if (dir.startsWith('@')) {
            // it is a scope package
            return rx.from(exports.readdirAsync(path_1.default.resolve(parentDir, dir)))
                .pipe(op.mergeMap(subdirs => subdirs), op.mergeMap(file => onEachFile(path_1.default.resolve(parentDir, dir, file))));
        }
        else {
            return onEachFile(path_1.default.resolve(parentDir, dir));
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
 * 1. create symlink node_modules/@wfh/plink --> directory "main"
 * 2. create symlink <parent directory of "main">/node_modules --> node_modules
 */
function linkDrcp() {
    const sourceDir = path_1.default.resolve(__dirname, '../../..'); // directory "main"
    // 1. create symlink node_modules/@wfh/plink --> directory "main"
    const target = getRealPath('node_modules/@wfh/plink');
    if (target !== sourceDir) {
        if (!fs.existsSync('node_modules'))
            fs.mkdirSync('node_modules');
        if (!fs.existsSync('node_modules/@wfh'))
            fs.mkdirSync('node_modules/@wfh');
        if (target != null) {
            fs.unlinkSync(path_1.default.resolve('node_modules/@wfh/plink'));
            // fs.unlinkSync(Path.resolve('node_modules/@wfh/plink'));
        }
        fs.symlinkSync(path_1.default.relative(path_1.default.resolve('node_modules', '@wfh'), sourceDir), path_1.default.resolve('node_modules', '@wfh', 'plink'), exports.isWin32 ? 'junction' : 'dir');
        // tslint:disable-next-line: no-console
        console.log(path_1.default.resolve('node_modules', '@wfh/plink') + ' is created');
    }
    // // 2. create symlink <parent directory of "main">/node_modules --> node_modules
    // const topModuleDir = Path.resolve(sourceDir, '../node_modules');
    // if (fs.existsSync(topModuleDir)) {
    //   if (fs.realpathSync(topModuleDir) !== Path.resolve('node_modules')) {
    //     fs.unlinkSync(topModuleDir);
    //     fs.symlinkSync(Path.relative(Path.dirname(topModuleDir), Path.resolve('node_modules')),
    //     topModuleDir, isWin32 ? 'junction' : 'dir');
    //     // tslint:disable-next-line: no-console
    //     console.log(topModuleDir + ' is created');
    //   }
    // } else {
    //   fs.symlinkSync(Path.relative(Path.dirname(topModuleDir), Path.resolve('node_modules')),
    //     topModuleDir, isWin32 ? 'junction' : 'dir');
    //   // tslint:disable-next-line: no-console
    //   console.log(topModuleDir + ' is created');
    // }
}
exports.linkDrcp = linkDrcp;
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
/**
 * Unlike fs.realPath(), it supports symlink of which target file no longer exists
 * @param file
 */
function getRealPath(file) {
    try {
        if (fs.lstatSync(file).isSymbolicLink()) {
            return path_1.default.resolve(path_1.default.dirname(file), fs.readlinkSync(file));
        }
        else {
            return path_1.default.resolve(file);
        }
    }
    catch (e) {
        return null;
    }
}
exports.getRealPath = getRealPath;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltbGlua3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9zeW1saW5rcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILHVDQUF5QjtBQUN6Qix1Q0FBdUM7QUFDdkMsZ0RBQXdCO0FBQ3hCLGdEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFDcEIseUNBQTJCO0FBQzNCLG1EQUFxQztBQUV4QixRQUFBLE9BQU8sR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM5QyxRQUFBLFlBQVksR0FBRyxjQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMxQyxRQUFBLFVBQVUsR0FBRyxjQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN0QyxRQUFBLGFBQWEsR0FBRyxjQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMzQyxRQUFBLFdBQVcsR0FBRyxjQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUVyRDs7O0dBR0c7QUFDSCxTQUE4QixlQUFlLENBQUMsZUFBa0MsU0FBUzs7UUFDdkYsTUFBTSxTQUFTLEdBQUcsWUFBWSxLQUFLLEtBQUssQ0FBQztRQUN6QyxNQUFNLFdBQVcsR0FBYSxFQUFFLENBQUM7UUFDakMsTUFBTSxrQkFBa0IsQ0FBQyxjQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxjQUFjLENBQUMsRUFDL0QsSUFBSSxDQUFDLEVBQUU7WUFDTCxJQUFJLFlBQVksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUU7Z0JBQ2pDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDeEI7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUM7Q0FBQTtBQVZELGtDQVVDO0FBRUQsU0FBZ0Isa0JBQWtCLENBQ2hDLFNBQWlCLEVBQ2pCLE9BQStDO0lBQy9DLG9EQUFvRDtJQUNwRCxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDMUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUN0QyxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2hCLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN2Qix3QkFBd0I7WUFDeEIsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFZLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztpQkFDekQsSUFBSSxDQUNILEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFDL0IsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUNwRSxDQUFDO1NBQ0g7YUFBTTtZQUNMLE9BQU8sVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDakQ7SUFDSCxDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2Qsa0RBQWtEO0lBQ2xELCtCQUErQjtJQUMvQiwrQkFBK0I7SUFDL0Isd0VBQXdFO0lBQ3hFLDhGQUE4RjtJQUM5RixhQUFhO0lBQ2Isc0RBQXNEO0lBQ3RELE1BQU07SUFDTixPQUFPO0lBRVAsU0FBZSxVQUFVLENBQUMsSUFBWTs7WUFDcEMsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDO1lBQ3RCLElBQUk7Z0JBQ0YsU0FBUyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7YUFDakQ7WUFBQyxPQUFPLENBQUMsRUFBRSxHQUFFO1lBQ2QsSUFBSSxTQUFTLEVBQUU7Z0JBQ2IsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2FBQ3RDO1FBQ0gsQ0FBQztLQUFBO0FBQ0gsQ0FBQztBQXRDRCxnREFzQ0M7QUFFRDs7O0dBR0c7QUFDSCxTQUFnQixRQUFRO0lBQ3RCLE1BQU0sU0FBUyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsbUJBQW1CO0lBRTFFLGlFQUFpRTtJQUNqRSxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUN0RCxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7UUFDeEIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDO1lBQ2hDLEVBQUUsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUM7WUFDckMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBRXBDLElBQUksTUFBTSxJQUFJLElBQUksRUFBRTtZQUNsQixFQUFFLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDO1lBQ3ZELDBEQUEwRDtTQUMzRDtRQUNELEVBQUUsQ0FBQyxXQUFXLENBQUMsY0FBSSxDQUFDLFFBQVEsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsRUFBRSxTQUFTLENBQUMsRUFDM0UsY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxFQUFFLGVBQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvRSx1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxZQUFZLENBQUMsR0FBRyxhQUFhLENBQUMsQ0FBQztLQUN6RTtJQUVELGtGQUFrRjtJQUNsRixtRUFBbUU7SUFDbkUscUNBQXFDO0lBQ3JDLDBFQUEwRTtJQUMxRSxtQ0FBbUM7SUFDbkMsOEZBQThGO0lBQzlGLG1EQUFtRDtJQUNuRCw4Q0FBOEM7SUFDOUMsaURBQWlEO0lBQ2pELE1BQU07SUFDTixXQUFXO0lBQ1gsNEZBQTRGO0lBQzVGLG1EQUFtRDtJQUNuRCw0Q0FBNEM7SUFDNUMsK0NBQStDO0lBQy9DLElBQUk7QUFDTixDQUFDO0FBckNELDRCQXFDQztBQUVEOzs7O0dBSUc7QUFDSCxTQUFzQixZQUFZLENBQUMsVUFBa0IsRUFBRSxJQUFZOztRQUNqRSxJQUFJO1lBQ0YsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLGNBQWMsRUFBRSxJQUFJLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssVUFBVSxFQUFFO2dCQUNqSCw4QkFBOEI7Z0JBQzlCLE9BQU87YUFDUjtZQUNBLHVDQUF1QztZQUN4QyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUM5QixFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3JCO1FBQUMsT0FBTyxFQUFFLEVBQUU7WUFDWCxzQkFBc0I7WUFDdEIsbUJBQW1CO1NBQ3BCO1FBQ0QsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLElBQUksUUFBUSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELE9BQU8scUJBQWEsQ0FDbEIsY0FBSSxDQUFDLFFBQVEsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsQ0FBQyxFQUM3QyxJQUFJLEVBQUUsZUFBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FDbkMsQ0FBQztJQUNKLENBQUM7Q0FBQTtBQW5CRCxvQ0FtQkM7QUFFRCxTQUFzQixZQUFZLENBQUMsSUFBWSxFQUFFLFNBQVMsR0FBRyxLQUFLOztRQUNoRSxJQUFJO1lBQ0YsSUFBSSxDQUFDLE1BQU0sa0JBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRTtnQkFDM0MsQ0FBQyxTQUFTLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNwRjtnQkFDRix1Q0FBdUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLFlBQVksY0FBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN4RyxNQUFNLG1CQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3hCLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7WUFDRCxPQUFPLElBQUksQ0FBQztTQUNiO1FBQUMsT0FBTyxFQUFFLEVBQUU7WUFDWCxPQUFPLEtBQUssQ0FBQztTQUNkO0lBQ0gsQ0FBQztDQUFBO0FBZEQsb0NBY0M7QUFFRDs7Ozs7R0FLRztBQUNILFNBQXNCLGVBQWUsQ0FBQyxJQUFZLEVBQUUsTUFBYzs7UUFDaEUsSUFBSTtZQUNGLElBQUksQ0FBQyxNQUFNLGtCQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUU7Z0JBQzNDLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ3JFO2dCQUNGLE1BQU0sbUJBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDeEIsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUNELE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFBQyxPQUFPLEVBQUUsRUFBRTtZQUNYLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7SUFDSCxDQUFDO0NBQUE7QUFaRCwwQ0FZQztBQUVEOzs7R0FHRztBQUNILFNBQWdCLFdBQVcsQ0FBQyxJQUFZO0lBQ3RDLElBQUk7UUFDRixJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsY0FBYyxFQUFFLEVBQUU7WUFDdkMsT0FBTyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQ2hFO2FBQU07WUFDTCxPQUFPLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDM0I7S0FDRjtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1YsT0FBTyxJQUFJLENBQUM7S0FDYjtBQUNILENBQUM7QUFWRCxrQ0FVQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogRG8gbm90IGltcG9ydCBhbnkgM3JkLXBhcnR5IGRlcGVuZGVuY3kgaW4gdGhpcyBmaWxlLFxuICogaXQgaXMgcnVuIGJ5IGBpbml0YCBjb21tYW5kIGF0IHRoZSB0aW1lIHRoZXJlIHByb2JhYmx5IGlzXG4gKiBubyBkZXBlbmRlbmNpZXMgaW5zdGFsbGVkIHlldFxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbi8vIGltcG9ydCB7cmVtb3ZlU3luY30gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuZXhwb3J0IGNvbnN0IGlzV2luMzIgPSBvcy5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcbmV4cG9ydCBjb25zdCByZWFkZGlyQXN5bmMgPSB1dGlsLnByb21pc2lmeShmcy5yZWFkZGlyKTtcbmV4cG9ydCBjb25zdCBsc3RhdEFzeW5jID0gdXRpbC5wcm9taXNpZnkoZnMubHN0YXQpO1xuZXhwb3J0IGNvbnN0IF9zeW1saW5rQXN5bmMgPSB1dGlsLnByb21pc2lmeShmcy5zeW1saW5rKTtcbmV4cG9ydCBjb25zdCB1bmxpbmtBc3luYyA9IHV0aWwucHJvbWlzaWZ5KGZzLnVubGluayk7XG5cbi8qKlxuICogUmV0dXJuIGFsbCBkZWxldGVkIHN5bWxpbmtzXG4gKiBAcGFyYW0gZGVsZXRlT3B0aW9uIFxuICovXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBzY2FuTm9kZU1vZHVsZXMoZGVsZXRlT3B0aW9uOiAnYWxsJyB8ICdpbnZhbGlkJyA9ICdpbnZhbGlkJykge1xuICBjb25zdCBkZWxldGVBbGwgPSBkZWxldGVPcHRpb24gPT09ICdhbGwnO1xuICBjb25zdCBkZWxldGVkTGlzdDogc3RyaW5nW10gPSBbXTtcbiAgYXdhaXQgbGlzdE1vZHVsZVN5bWxpbmtzKFBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCAnbm9kZV9tb2R1bGVzJyksXG4gICAgbGluayA9PiB7XG4gICAgICBpZiAodmFsaWRhdGVMaW5rKGxpbmssIGRlbGV0ZUFsbCkpIHtcbiAgICAgICAgZGVsZXRlZExpc3QucHVzaChsaW5rKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgcmV0dXJuIGRlbGV0ZWRMaXN0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdE1vZHVsZVN5bWxpbmtzKFxuICBwYXJlbnREaXI6IHN0cmluZyxcbiAgb25Gb3VuZDogKGxpbms6IHN0cmluZykgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4pIHtcbiAgLy8gY29uc3QgbGV2ZWwxRGlycyA9IGF3YWl0IHJlYWRkaXJBc3luYyhwYXJlbnREaXIpO1xuICByZXR1cm4gcnguZnJvbShyZWFkZGlyQXN5bmMocGFyZW50RGlyKSkucGlwZShcbiAgICBvcC5jb25jYXRNYXAobGV2ZWwxRGlycyA9PiBsZXZlbDFEaXJzKSxcbiAgICBvcC5tZXJnZU1hcChkaXIgPT4ge1xuICAgICAgaWYgKGRpci5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgICAgLy8gaXQgaXMgYSBzY29wZSBwYWNrYWdlXG4gICAgICAgIHJldHVybiByeC5mcm9tKHJlYWRkaXJBc3luYyhQYXRoLnJlc29sdmUocGFyZW50RGlyLCBkaXIpKSlcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgb3AubWVyZ2VNYXAoc3ViZGlycyA9PiBzdWJkaXJzKSxcbiAgICAgICAgICBvcC5tZXJnZU1hcChmaWxlID0+IG9uRWFjaEZpbGUoUGF0aC5yZXNvbHZlKHBhcmVudERpciwgZGlyLCBmaWxlKSkpXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb25FYWNoRmlsZShQYXRoLnJlc29sdmUocGFyZW50RGlyLCBkaXIpKTtcbiAgICAgIH1cbiAgICB9KVxuICApLnRvUHJvbWlzZSgpO1xuICAvLyBhd2FpdCBQcm9taXNlLmFsbChsZXZlbDFEaXJzLm1hcChhc3luYyBkaXIgPT4ge1xuICAvLyAgIGlmIChkaXIuc3RhcnRzV2l0aCgnQCcpKSB7XG4gIC8vICAgICAvLyBpdCBpcyBhIHNjb3BlIHBhY2thZ2VcbiAgLy8gICAgIGNvbnN0IHN1YmRpcnMgPSBhd2FpdCByZWFkZGlyQXN5bmMoUGF0aC5yZXNvbHZlKHBhcmVudERpciwgZGlyKSk7XG4gIC8vICAgICBhd2FpdCBQcm9taXNlLmFsbChzdWJkaXJzLm1hcChmaWxlID0+IG9uRWFjaEZpbGUoUGF0aC5yZXNvbHZlKHBhcmVudERpciwgZGlyLCBmaWxlKSkpKTtcbiAgLy8gICB9IGVsc2Uge1xuICAvLyAgICAgYXdhaXQgb25FYWNoRmlsZShQYXRoLnJlc29sdmUocGFyZW50RGlyLCBkaXIpKTtcbiAgLy8gICB9XG4gIC8vIH0pKTtcblxuICBhc3luYyBmdW5jdGlvbiBvbkVhY2hGaWxlKGZpbGU6IHN0cmluZykge1xuICAgIGxldCBpc1N5bWxpbmsgPSBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgaXNTeW1saW5rID0gZnMubHN0YXRTeW5jKGZpbGUpLmlzU3ltYm9saWNMaW5rKCk7XG4gICAgfSBjYXRjaCAoZSkge31cbiAgICBpZiAoaXNTeW1saW5rKSB7XG4gICAgICBhd2FpdCBQcm9taXNlLnJlc29sdmUob25Gb3VuZChmaWxlKSk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogMS4gY3JlYXRlIHN5bWxpbmsgbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsgLS0+IGRpcmVjdG9yeSBcIm1haW5cIlxuICogMi4gY3JlYXRlIHN5bWxpbmsgPHBhcmVudCBkaXJlY3Rvcnkgb2YgXCJtYWluXCI+L25vZGVfbW9kdWxlcyAtLT4gbm9kZV9tb2R1bGVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsaW5rRHJjcCgpIHtcbiAgY29uc3Qgc291cmNlRGlyID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uLy4uJyk7IC8vIGRpcmVjdG9yeSBcIm1haW5cIlxuXG4gIC8vIDEuIGNyZWF0ZSBzeW1saW5rIG5vZGVfbW9kdWxlcy9Ad2ZoL3BsaW5rIC0tPiBkaXJlY3RvcnkgXCJtYWluXCJcbiAgY29uc3QgdGFyZ2V0ID0gZ2V0UmVhbFBhdGgoJ25vZGVfbW9kdWxlcy9Ad2ZoL3BsaW5rJyk7XG4gIGlmICh0YXJnZXQgIT09IHNvdXJjZURpcikge1xuICAgIGlmICghZnMuZXhpc3RzU3luYygnbm9kZV9tb2R1bGVzJykpXG4gICAgICBmcy5ta2RpclN5bmMoJ25vZGVfbW9kdWxlcycpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYygnbm9kZV9tb2R1bGVzL0B3ZmgnKSlcbiAgICAgIGZzLm1rZGlyU3luYygnbm9kZV9tb2R1bGVzL0B3ZmgnKTtcblxuICAgIGlmICh0YXJnZXQgIT0gbnVsbCkge1xuICAgICAgZnMudW5saW5rU3luYyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9Ad2ZoL3BsaW5rJykpO1xuICAgICAgLy8gZnMudW5saW5rU3luYyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9Ad2ZoL3BsaW5rJykpO1xuICAgIH1cbiAgICBmcy5zeW1saW5rU3luYyhQYXRoLnJlbGF0aXZlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgJ0B3ZmgnKSwgc291cmNlRGlyKSxcbiAgICAgIFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgJ0B3ZmgnLCAncGxpbmsnKSwgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAnQHdmaC9wbGluaycpICsgJyBpcyBjcmVhdGVkJyk7XG4gIH1cblxuICAvLyAvLyAyLiBjcmVhdGUgc3ltbGluayA8cGFyZW50IGRpcmVjdG9yeSBvZiBcIm1haW5cIj4vbm9kZV9tb2R1bGVzIC0tPiBub2RlX21vZHVsZXNcbiAgLy8gY29uc3QgdG9wTW9kdWxlRGlyID0gUGF0aC5yZXNvbHZlKHNvdXJjZURpciwgJy4uL25vZGVfbW9kdWxlcycpO1xuICAvLyBpZiAoZnMuZXhpc3RzU3luYyh0b3BNb2R1bGVEaXIpKSB7XG4gIC8vICAgaWYgKGZzLnJlYWxwYXRoU3luYyh0b3BNb2R1bGVEaXIpICE9PSBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycpKSB7XG4gIC8vICAgICBmcy51bmxpbmtTeW5jKHRvcE1vZHVsZURpcik7XG4gIC8vICAgICBmcy5zeW1saW5rU3luYyhQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZSh0b3BNb2R1bGVEaXIpLCBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycpKSxcbiAgLy8gICAgIHRvcE1vZHVsZURpciwgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gIC8vICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgLy8gICAgIGNvbnNvbGUubG9nKHRvcE1vZHVsZURpciArICcgaXMgY3JlYXRlZCcpO1xuICAvLyAgIH1cbiAgLy8gfSBlbHNlIHtcbiAgLy8gICBmcy5zeW1saW5rU3luYyhQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZSh0b3BNb2R1bGVEaXIpLCBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycpKSxcbiAgLy8gICAgIHRvcE1vZHVsZURpciwgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gIC8vICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIC8vICAgY29uc29sZS5sb2codG9wTW9kdWxlRGlyICsgJyBpcyBjcmVhdGVkJyk7XG4gIC8vIH1cbn1cblxuLyoqXG4gKiBEbyBjaGVjayBleGlzdGluZyBzeW1saW5rLCByZWNyZWF0ZSBhIG5ldyBvbmUgaWYgZXhpc3Rpbmcgb25lIGlzIGludmFsaWQgc3ltbGlua1xuICogQHBhcmFtIGxpbmtUYXJnZXQgXG4gKiBAcGFyYW0gbGluayBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN5bWxpbmtBc3luYyhsaW5rVGFyZ2V0OiBzdHJpbmcsIGxpbms6IHN0cmluZykge1xuICB0cnkge1xuICAgIGlmIChmcy5sc3RhdFN5bmMobGluaykuaXNTeW1ib2xpY0xpbmsoKSAmJiBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGxpbmspLCBmcy5yZWFkbGlua1N5bmMobGluaykpID09PSBsaW5rVGFyZ2V0KSB7XG4gICAgICAvLyBjb25zb2xlLmxvZygnZXhpdHMnLCBsaW5rKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGByZW1vdmUgJHtsaW5rfWApO1xuICAgIGZzLnVubGlua1N5bmMobGluayk7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgLy8gbGluayBkb2VzIG5vdCBleGlzdFxuICAgIC8vIGNvbnNvbGUubG9nKGV4KTtcbiAgfVxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coYGNyZWF0ZSBzeW1saW5rICR7bGlua30gLS0+ICR7bGlua1RhcmdldH1gKTtcbiAgcmV0dXJuIF9zeW1saW5rQXN5bmMoXG4gICAgUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUobGluayksIGxpbmtUYXJnZXQpLFxuICAgIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcidcbiAgKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHZhbGlkYXRlTGluayhsaW5rOiBzdHJpbmcsIGRlbGV0ZUFsbCA9IGZhbHNlKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHRyeSB7XG4gICAgaWYgKChhd2FpdCBsc3RhdEFzeW5jKGxpbmspKS5pc1N5bWJvbGljTGluaygpICYmXG4gICAgICAoZGVsZXRlQWxsIHx8ICFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUobGluayksIGZzLnJlYWRsaW5rU3luYyhsaW5rKSkpKVxuICAgICAgKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGBbc3ltbGluayBjaGVja10gUmVtb3ZlICR7ZGVsZXRlQWxsID8gJycgOiAnaW52YWxpZCd9IHN5bWxpbmsgJHtQYXRoLnJlbGF0aXZlKCcuJywgbGluayl9YCk7XG4gICAgICBhd2FpdCB1bmxpbmtBc3luYyhsaW5rKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogRGVsZXRlIHN5bWxpbmsgb3IgZmlsZS9kaXJlY3RvcnkgaWYgaXQgaXMgaW52YWxpZCBzeW1saW5rIG9yIHBvaW50aW5nIHRvIG5vbmV4aXN0aW5nIHRhcmdldFxuICogQHBhcmFtIGxpbmsgdGhlIHN5bWxpbmtcbiAqIEBwYXJhbSB0YXJnZXQgXG4gKiBAcmV0dXJucyB0cnVlIGlmIG5lZWRzIHRvIGNyZWF0ZSBhIG5ldyBzeW1saW5rXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWNyZWF0ZVN5bWxpbmsobGluazogc3RyaW5nLCB0YXJnZXQ6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGlmICgoYXdhaXQgbHN0YXRBc3luYyhsaW5rKSkuaXNTeW1ib2xpY0xpbmsoKSAmJlxuICAgICAgIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShsaW5rKSwgZnMucmVhZGxpbmtTeW5jKGxpbmspKSlcbiAgICAgICkge1xuICAgICAgYXdhaXQgdW5saW5rQXN5bmMobGluayk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChleCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vKipcbiAqIFVubGlrZSBmcy5yZWFsUGF0aCgpLCBpdCBzdXBwb3J0cyBzeW1saW5rIG9mIHdoaWNoIHRhcmdldCBmaWxlIG5vIGxvbmdlciBleGlzdHNcbiAqIEBwYXJhbSBmaWxlIFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVhbFBhdGgoZmlsZTogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgaWYgKGZzLmxzdGF0U3luYyhmaWxlKS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICByZXR1cm4gUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShmaWxlKSwgZnMucmVhZGxpbmtTeW5jKGZpbGUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFBhdGgucmVzb2x2ZShmaWxlKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4iXX0=