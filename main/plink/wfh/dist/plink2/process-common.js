"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupTTY = void 0;
const tslib_1 = require("tslib");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
function setupTTY(screenColumns, screenRows) {
    chalk_1.default.level = 3;
    process.stdout.isTTY = true;
    process.stderr.isTTY = true;
    process.stdout.columns = screenColumns;
    process.stderr.columns = screenColumns;
    process.stdout.rows = screenRows;
    process.stderr.rows = screenRows;
    process.stdout.hasColors = process.stderr.hasColors = (...cnt) => {
        return true;
    };
    process.stdout.getWindowSize = process.stderr.getWindowSize = () => [screenColumns, screenRows];
}
exports.setupTTY = setupTTY;
//# sourceMappingURL=process-common.js.map