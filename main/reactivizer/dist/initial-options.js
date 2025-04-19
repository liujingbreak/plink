"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initOptions = void 0;
exports.changeInitOptions = changeInitOptions;
/**
 * Any change of this configuration object must be done earlier
 * before any reactive service being created to actually take effect.
 *
 * Also this configuration is not shared cross workers or threads, for
 * each worker or thread, the changes to it must be repeated.
**/
exports.initOptions = {
    enableLog: false,
    logStyle: 'full'
};
function changeInitOptions(opts) {
    Object.assign(exports.initOptions, opts);
}
//# sourceMappingURL=initial-options.js.map