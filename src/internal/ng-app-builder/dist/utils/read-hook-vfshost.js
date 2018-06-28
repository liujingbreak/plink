"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable no-console */
/**
 * TODO: So far Angular TS compiler reads file not in async mode, even return type is an Observable,
 * we probably can pre-read files and cache them to make hooks work in async-like mode.
 */
const core_1 = require("@angular-devkit/core");
const operators_1 = require("rxjs/operators");
class ReadHookHost extends core_1.virtualFs.AliasHost {
    set hookRead(func) {
        this._readFunc = func;
    }
    read(path) {
        return super.read(path).pipe(operators_1.concatMap((buffer) => {
            const sPath = core_1.getSystemPath(path);
            return this._hookRead(sPath, buffer);
        }));
    }
    _hookRead(path, buffer) {
        return this._readFunc(path, buffer);
    }
}
exports.default = ReadHookHost;

//# sourceMappingURL=read-hook-vfshost.js.map
