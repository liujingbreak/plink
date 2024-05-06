"use strict";
/**
 * This file is intented to run before "npm install" in workspace, should not dependens on any 3rd-party node packages
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
if (fs_1.default.existsSync('node_modules')) {
    const files = fs_1.default.readdirSync('node_modules');
    for (const fname of files) {
        const target = path_1.default.resolve('node_modules', fname);
        try {
            const stat = fs_1.default.lstatSync(target);
            if (stat.isDirectory() && fname.startsWith('@')) {
                const scopeDir = target;
                const scopedNames = fs_1.default.readdirSync(scopeDir);
                for (const partName of scopedNames) {
                    const scopedPkg = path_1.default.resolve(scopeDir, partName);
                    try {
                        if (fs_1.default.lstatSync(scopedPkg).isSymbolicLink()) {
                            fs_1.default.unlinkSync(scopedPkg);
                            // eslint-disable-next-line no-console
                            console.log('[preinstall] delete symlink', scopedPkg);
                        }
                    }
                    catch (err) {
                        // eslint-disable-next-line no-console
                        console.log('[preinstall] delete symlink', scopedPkg);
                        fs_1.default.unlinkSync(scopedPkg);
                    }
                }
            }
            else if (stat.isSymbolicLink()) {
                // eslint-disable-next-line no-console
                console.log('[preinstall] delete symlink', target);
                fs_1.default.unlinkSync(target);
            }
        }
        catch (ex) {
            // eslint-disable-next-line no-console
            console.log('[preinstall] delete symlink', target);
            fs_1.default.unlinkSync(target);
        }
    }
}
//# sourceMappingURL=preinstall.js.map