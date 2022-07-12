"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Node option prever-symlink does not effect on "main" file, so this file acts as main file to call real file from
 * a symlink location
 */
const path_1 = __importDefault(require("path"));
let dir = process.env.PLINK_WORK_DIR ? process.env.PLINK_WORK_DIR : process.cwd();
const root = path_1.default.parse(dir).root;
let target;
while (true) {
    target = path_1.default.resolve(dir, 'node_modules', process.env.__plink_fork_main);
    try {
        require.resolve(target);
        break;
    }
    catch (ex) {
        if (dir === root) {
            console.error(ex);
            break;
        }
        dir = path_1.default.dirname(dir);
    }
}
require(target);
//# sourceMappingURL=fork-preserve-symlink-main.js.map