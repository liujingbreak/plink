"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable no-console */
const core_1 = require("@angular-devkit/core");
class ReadHookHost extends core_1.virtualFs.AliasHost {
    read(path) {
        console.log('ReadHookHost reading ', path);
        return super.read(path);
    }
}
exports.default = ReadHookHost;

//# sourceMappingURL=hooked-vfs-host.js.map
