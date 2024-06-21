"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conciseNocolorConsoleLogger = exports.conciseConsoleLogger = void 0;
exports.formatToConcise = formatToConcise;
exports.formatToConciseNoColor = formatToConciseNoColor;
const node_util_1 = require("node:util");
const conciseConsoleLogger = (...msgs) => {
    // eslint-disable-next-line no-console
    console.log(formatToConcise(...msgs));
};
exports.conciseConsoleLogger = conciseConsoleLogger;
const conciseNocolorConsoleLogger = (...msgs) => {
    // eslint-disable-next-line no-console
    console.log(formatToConciseNoColor(...msgs));
};
exports.conciseNocolorConsoleLogger = conciseNocolorConsoleLogger;
function formatToConcise(...messageItems) {
    return messageItems.map(msg => typeof msg === 'string' ? msg : (0, node_util_1.inspect)(msg, false, 0, true)).join(' ');
}
function formatToConciseNoColor(...messageItems) {
    return messageItems.map(msg => typeof msg === 'string' ? msg : (0, node_util_1.inspect)(msg, false, 0, false)).join(' ');
}
//# sourceMappingURL=nodejs-utils.js.map