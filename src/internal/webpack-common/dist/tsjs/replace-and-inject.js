"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const lodash_1 = require("lodash");
const tsjs_replacement_1 = tslib_1.__importDefault(require("./tsjs-replacement"));
let tsPreCompiler;
function replace(file, source, injector, tsConfigFile, compileExpContex) {
    injector.changeTsCompiler(typescript_1.default);
    // eslint-disable-next-line prefer-const
    let { replaced, ast, patches } = injector.injectToFileWithPatchInfo(file, source);
    if (tsPreCompiler == null) {
        tsPreCompiler = new tsjs_replacement_1.default(tsConfigFile, __api_1.default.ssr, file => __api_1.default.findPackageByFile(file));
    }
    let offset = 0;
    const offsets = patches.reduce((offsets, el) => {
        offset += el.replacement.length - (el.end - el.start);
        offsets.push(offset);
        return offsets;
    }, []);
    replaced = tsPreCompiler.parse(file, replaced, compileExpContex, ast, pos => {
        const idx = (0, lodash_1.sortedIndexBy)(patches, { start: pos, end: pos, replacement: '' }, el => el.start) - 1;
        if (idx >= 0 && idx < offsets.length - 1) {
            return pos + offsets[idx];
        }
        return pos;
    });
    return replaced;
}
exports.default = replace;
//# sourceMappingURL=replace-and-inject.js.map