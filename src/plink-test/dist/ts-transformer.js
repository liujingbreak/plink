"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const tsc_util_1 = require("@wfh/plink/wfh/dist/utils/tsc-util");
// import logConfig from '@wfh/plink/wfh/dist/log-config';
const typescript_1 = tslib_1.__importDefault(require("typescript"));
// inspector.open(9222, 'localhost', true);
const transformerWithTsCheck = (0, tsc_util_1.createTranspileFileWithTsCheck)(typescript_1.default, {});
const createTransformer = (_config) => {
    const transformer = {
        process(sourceText, sourcePath, _options) {
            return transformerWithTsCheck(sourceText, sourcePath);
            // const compiled = transpileSingleFile(sourceText, ts);
            // if (compiled.diagnosticsText) {
            //   console.error(compiled.diagnosticsText);
            // }
            // return {
            //   code: compiled.outputText,
            //   map: compiled.sourceMapText
            // };
        }
    };
    return transformer;
};
exports.default = { createTransformer };
//# sourceMappingURL=ts-transformer.js.map