"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupPlinkRoot = exports.setupTTY = void 0;
const tslib_1 = require("tslib");
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const node_fs_1 = tslib_1.__importDefault(require("node:fs"));
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
function lookupPlinkRoot(cwd) {
    const { root } = node_path_1.default.parse(cwd);
    let plinkRoot;
    while (cwd !== root) {
        if (node_fs_1.default.existsSync(node_path_1.default.join(cwd, 'node_modules/@wfh/plink'))) {
            plinkRoot = cwd;
            break;
        }
        cwd = node_path_1.default.dirname(cwd);
    }
    return plinkRoot;
}
exports.lookupPlinkRoot = lookupPlinkRoot;
//# sourceMappingURL=process-common.js.map