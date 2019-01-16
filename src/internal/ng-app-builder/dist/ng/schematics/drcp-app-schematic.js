"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Path = tslib_1.__importStar(require("path"));
const NM_DIR = Path.sep + 'node_modules' + Path.sep;
// You don't have to export the function as default. You can also have more than one rule factory
// per file.
function drcpApp( /*options: any*/) {
    return (tree, _context) => {
        tree.visit((path /*, entry: FileEntry*/) => {
            if (path.startsWith(NM_DIR))
                return;
            // console.log(path);
        });
        return tree;
    };
}
exports.drcpApp = drcpApp;

//# sourceMappingURL=drcp-app-schematic.js.map
