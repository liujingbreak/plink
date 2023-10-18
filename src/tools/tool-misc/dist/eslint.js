"use strict";
/// <reference path="./eslint-cli.d.ts" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.eslint = void 0;
const tslib_1 = require("tslib");
const cli_1 = require("eslint/lib/cli");
const glob_1 = tslib_1.__importDefault(require("glob"));
const path_1 = tslib_1.__importDefault(require("path"));
/**
 * Run eslint only for .ts file, exclude .d.ts files
 * @param dir
 */
async function eslint(dir) {
    const files = await new Promise((resolve, reject) => {
        (0, glob_1.default)(dir + '/**/*.ts', (err, matches) => {
            if (err)
                return reject(err);
            resolve(matches.filter(file => !file.endsWith('.d.ts')));
        });
    });
    const args = [...process.argv.slice(0, 2), '-c', path_1.default.resolve(__dirname, '../eslintrc.js'), ''];
    for (const file of files) {
        args.pop();
        args.push(file);
        (0, cli_1.execute)(args, null);
    }
}
exports.eslint = eslint;
//# sourceMappingURL=eslint.js.map