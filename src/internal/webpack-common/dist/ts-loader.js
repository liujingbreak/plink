"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const replace_and_inject_1 = __importDefault(require("./tsjs/replace-and-inject"));
const loader = function (source, sourceMap) {
    const file = this.resourcePath;
    const opts = this.query;
    // console.log(file);
    const cb = this.async();
    try {
        const replaced = replace_and_inject_1.default(file, source, opts.injector, opts.tsConfigFile, opts.compileExpContex ? opts.compileExpContex(file) : {});
        cb(null, replaced, sourceMap);
    }
    catch (e) {
        console.error('[webpack-common.ts-loader]processing: ' + file, e);
        return cb(e);
    }
};
exports.default = loader;
//# sourceMappingURL=ts-loader.js.map