"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable no-console */
const core_1 = require("@angular-devkit/core");
const operators_1 = require("rxjs/operators");
class ReadHookHost extends core_1.virtualFs.AliasHost {
    set hookRead(func) {
        this._readFunc = func;
    }
    read(path) {
        return super.read(path).pipe(operators_1.concatMap((buffer) => {
            let sPath = core_1.getSystemPath(path);
            return this._hookRead(sPath, buffer);
        }));
    }
    _hookRead(path, buffer) {
        return this._readFunc(path, buffer);
    }
}
exports.default = ReadHookHost;

//# sourceMappingURL=read-hook-vfshost.js.map
