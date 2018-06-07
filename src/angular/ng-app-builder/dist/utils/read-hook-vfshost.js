"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable no-console */
const core_1 = require("@angular-devkit/core");
const operators_1 = require("rxjs/operators");
class ReadHookHost extends core_1.virtualFs.AliasHost {
    read(path) {
        return super.read(path).pipe(this.hookRead ?
            operators_1.concatMap((buffer) => {
                return this.hookRead(path, buffer);
            }) :
            operators_1.tap(() => {
                console.log('ReadHookHost reading ', path);
            }));
    }
}
exports.default = ReadHookHost;

//# sourceMappingURL=read-hook-vfshost.js.map
