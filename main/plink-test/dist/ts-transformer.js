"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const tsc_language_service_1 = require("@wfh/plink/wfh/dist/plink2/sub-cmds/tsc-language-service");
const init_plink_1 = require("./init-plink");
const service = (0, tsc_language_service_1.languageServices)(typescript_1.default);
const transpile = (0, tsc_language_service_1.createTranspileFileWithTsCheck)(typescript_1.default, Object.assign(Object.assign({}, init_plink_1.tsconfigJson), { compilerOptions: Object.assign(Object.assign({}, init_plink_1.tsconfigJson.compilerOptions), { declaration: false, strict: false }) }), path_1.default.basename(init_plink_1.tsconfigFile));
const createTransformer = (_config) => {
    const transformer = {
        process(sourceText, sourcePath, _options) {
            const [compiled, sourceMap] = transpile(sourceText, sourcePath);
            let basename = path_1.default.basename(sourcePath);
            basename = basename.slice(0, basename.lastIndexOf('.'));
            service.i.ft.addSourceFile(sourcePath, true, sourceText).dp();
            // eslint-disable-next-line no-console
            console.log('[ts-transformer] transpile', sourcePath);
            return { code: compiled, map: sourceMap };
        }
    };
    return transformer;
};
exports.default = { createTransformer };
//# sourceMappingURL=ts-transformer.js.map