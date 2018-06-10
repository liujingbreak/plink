"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable no-console */
const core_1 = require("@angular-devkit/core");
const operators_1 = require("rxjs/operators");
class ReadHookHost extends core_1.virtualFs.AliasHost {
    read(path) {
        return super.read(path).pipe(this.hookRead ?
            operators_1.concatMap((buffer) => {
                let sPath = core_1.getSystemPath(path);
                // if (isWindows) {
                // 	let match = /^\/([^/]+)(.*)/.exec(path);
                // 	if (match)
                // 		sPath = match[1] + ':' + match[2].replace(/\//g, sep);
                // }
                return this.hookRead(sPath, buffer);
            }) :
            operators_1.tap(() => {
                console.log('ReadHookHost reading ', path);
            }));
    }
    _resolve(path) {
        let r = super._resolve(path);
        return r;
    }
}
exports.default = ReadHookHost;

//# sourceMappingURL=read-hook-vfshost.js.map
