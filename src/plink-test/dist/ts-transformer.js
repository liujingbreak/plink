"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const tsc_util_1 = require("@wfh/plink/wfh/dist/utils/tsc-util");
const ts_cmd_1 = require("@wfh/plink/wfh/dist/ts-cmd");
const plink_1 = require("@wfh/plink");
// import logConfig from '@wfh/plink/wfh/dist/log-config';
const typescript_1 = tslib_1.__importDefault(require("typescript"));
// inspector.open(9222, 'localhost', true);
const transformerWithTsCheck = (0, tsc_util_1.createTranspileFileWithTsCheck)(typescript_1.default, { tscOpts: {
        inlineSourceMap: true,
        changeCompilerOptions(co) {
            (0, ts_cmd_1.setupCompilerOptionsWithPackages)(co, plink_1.plinkEnv.workDir, {}, typescript_1.default);
        }
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