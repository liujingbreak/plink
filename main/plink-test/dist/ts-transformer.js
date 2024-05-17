"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const tsc_util_1 = require("@wfh/plink/wfh/dist/utils/tsc-util");
const init_plink_1 = require("./init-plink");
// inspector.open(9222, 'localhost', true);
const transformerWithTsCheck = (0, tsc_util_1.createTranspileFileWithTsCheck)(typescript_1.default, { tscOpts: () => {
        // Typescript will take effort in parseJsonConfigFileContent() to traverse all "include" files names, or report error on not found any file
        // tsconfigJson.include = ['no-exist-file.ts'];
        delete init_plink_1.tsconfigJson.include;
        init_plink_1.tsconfigJson.compilerOptions.incremental = false;
        init_plink_1.tsconfigJson.compilerOptions.inlineSourceMap = true;
        const parsed = typescript_1.default.parseJsonConfigFileContent(init_plink_1.tsconfigJson, typescript_1.default.sys, path_1.default.dirname(init_plink_1.tsconfigFile));
        const { options } = parsed;
        // if (errors.length > 0) {
        //   console.error('jest-transformer error', errors);
        //   console.error('complete information:', parsed);
        // }
        return options;
    } });
const createTransformer = (_config) => {
    const transformer = {
        process(sourceText, sourcePath, _options) {
            const done = transformerWithTsCheck(sourceText, sourcePath);
            // eslint-disable-next-line no-console
            console.log('[ts-transformer] transpile', sourcePath);
            return done;
        }
    };
    return transformer;
};
exports.default = { createTransformer };
//# sourceMappingURL=ts-transformer.js.map