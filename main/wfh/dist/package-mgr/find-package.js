"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const Path = __importStar(require("path"));
const rxjs_1 = require("rxjs");
const log4js_1 = require("log4js");
const log = (0, log4js_1.getLogger)('plink.package-mgr.find-package');
/**
 * Recursively lookup `fromDir` folder for private module's package.json file
 */
function findPackageJson(_fromDirs, startFromSubDir) {
    let fromDirs;
    if (!Array.isArray(_fromDirs))
        fromDirs = [_fromDirs];
    else
        fromDirs = _fromDirs;
    return (0, rxjs_1.merge)(...fromDirs.map(d => new FolderScanner(d).getPackageJsonFiles(startFromSubDir)));
}
exports.default = findPackageJson;
class FolderScanner {
    constructor(fromDir) {
        this.fromDir = Path.resolve(fromDir);
    }
    getPackageJsonFiles(startFromSubDir) {
        return new rxjs_1.Observable(sub => {
            this.out = sub;
            if (startFromSubDir)
                this.checkSubFolders(this.fromDir);
            else
                this.checkFolder(this.fromDir);
            sub.complete();
        });
    }
    checkSubFolders(parentDir) {
        const folders = fs.readdirSync(parentDir);
        for (const name of folders) {
            try {
                if (name === 'node_modules') {
                    const testDir = Path.resolve(parentDir, 'node_modules');
                    if (fs.lstatSync(testDir).isSymbolicLink()) {
                        // eslint-disable-next-line no-console
                        log.debug('Found existing symlink node_modules:', testDir);
                    }
                    continue;
                }
                const dir = Path.join(parentDir, name);
                this.checkFolder(dir);
            }
            catch (er) {
                console.error('', er);
            }
        }
    }
    checkFolder(dir) {
        if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
            const pkJsonPath = Path.join(dir, 'package.json');
            if (fs.existsSync(pkJsonPath)) {
                this.out.next(pkJsonPath);
            }
            else {
                this.checkSubFolders(dir);
            }
        }
    }
}
//# sourceMappingURL=find-package.js.map