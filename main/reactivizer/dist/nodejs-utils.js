"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conciseNocolorConsoleLogger = exports.conciseConsoleLogger = void 0;
exports.formatToConcise = formatToConcise;
exports.formatToConciseNoColor = formatToConciseNoColor;
exports.createSimpleIndentLogger = createSimpleIndentLogger;
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
function createSimpleIndentLogger(colorful, timestamp, out) {
    let lastPrefix;
    return function (prefix, ...msgs) {
        if (lastPrefix === prefix) {
            const hashPos = prefix.indexOf('#');
            out.write('  ');
            if (hashPos >= 0) {
                out.write(prefix.slice(hashPos));
                out.write(' ');
            }
        }
        else {
            out.write(prefix);
            out.write(' ');
            lastPrefix = prefix;
        }
        if (timestamp) {
            const date = new Date();
            out.write('[');
            out.write(date.getHours() + ':');
            out.write(date.getMinutes() + ':');
            out.write(date.getSeconds() + '.');
            out.write(date.getMilliseconds() + '] ');
        }
        const rawMsg = colorful ? formatToConcise(...msgs) : formatToConciseNoColor(...msgs);
        out.write(rawMsg.replaceAll(/\r?\n/g, '\n    '));
        out.write('\n');
    };
}
//# sourceMappingURL=nodejs-utils.js.map