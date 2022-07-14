"use strict";
/* eslint-disable @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call */
/**
 * Hack Node.js common module resolve process
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hookCommonJsRequire = void 0;
const tslib_1 = require("tslib");
// export interface CmjHookFunction {
//   (): 
// }
const module_1 = tslib_1.__importDefault(require("module"));
/**
 * Hook into Node.js common JS module require function
 */
function hookCommonJsRequire(hook) {
    const superReq = module_1.default.prototype.require;
    module_1.default.prototype.require = function (target) {
        const callSuperReq = () => superReq.call(this, target);
        const exported = hook(this.filename, target, callSuperReq, (resolveTarget, options) => module_1.default._resolveFilename(resolveTarget, this, false, options));
        return exported === undefined ? callSuperReq() : exported;
    };
}
exports.hookCommonJsRequire = hookCommonJsRequire;
//# sourceMappingURL=loaderHooks.js.map