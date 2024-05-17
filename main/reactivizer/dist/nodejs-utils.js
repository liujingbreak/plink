"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatToConcise = exports.conciseConsoleLogger = void 0;
const node_util_1 = require("node:util");
const conciseConsoleLogger = (...msgs) => {
    // eslint-disable-next-line no-console
    console.log(formatToConcise(...msgs));
};
exports.conciseConsoleLogger = conciseConsoleLogger;
function formatToConcise(...messageItems) {
    return messageItems.map(msg => typeof msg === 'string' ? msg : (0, node_util_1.inspect)(msg, false, 0, true)).join();
}
exports.formatToConcise = formatToConcise;
//# sourceMappingURL=nodejs-utils.js.map