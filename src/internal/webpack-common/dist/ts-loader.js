"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const replace_and_inject_1 = tslib_1.__importDefault(require("./tsjs/replace-and-inject"));
const loader = function (source, sourceMap) {
    const file = this.resourcePath;
    const opts = this.query;
    // console.log(file);
    const cb = this.async();
    try {
        const replaced = (0, replace_and_inject_1.default)(file, source, opts.injector, opts.tsConfigFile, opts.compileExpContext ? opts.compileExpContext(file) : {});
        cb(null, replaced, sourceMap);
    }
    catch (e) {
        this.getLogger('@wfh/webpack-common.ts-loader').error(file, e);
        return cb(e);
    }
};
exports.default = loader;
//# sourceMappingURL=ts-loader.js.map