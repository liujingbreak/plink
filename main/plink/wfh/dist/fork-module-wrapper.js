"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runModule = void 0;
const bootstrap_process_1 = require("./utils/bootstrap-process");
if (process.send)
    process.on('message', init);
function init(msg) {
    var _a;
    if (typeof msg !== 'string')
        return;
    const msgObj = JSON.parse(msg);
    if (msgObj.type === 'plink-fork-wrapper') {
        process.off('message', init);
        runModule(msgObj.moduleFile, (_a = msgObj.opts) === null || _a === void 0 ? void 0 : _a.stateExitAction);
    }
}
function runModule(moduleFile, stateExitAction) {
    process.env.__plinkLogMainPid = process.pid + '';
    (0, bootstrap_process_1.initProcess)(stateExitAction || 'none');
    require(moduleFile);
}
exports.runModule = runModule;
//# sourceMappingURL=fork-module-wrapper.js.map