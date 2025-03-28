"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const tsc_language_service_1 = require("@wfh/plink/wfh/dist/plink2/sub-cmds/tsc-language-service");
const init_plink_1 = require("./init-plink");
const transpile = (0, tsc_language_service_1.createTranspileFileWithTsCheck)(typescript_1.default, Object.assign(Object.assign({}, init_plink_1.tsconfigJson), { compilerOptions: Object.assign(Object.assign({}, init_plink_1.tsconfigJson.compilerOptions), { declaration: false, inlineSourceMap: true, strict: false }) }), path_1.default.dirname(init_plink_1.tsconfigFile));
function procecc(sourceText, sourcePath) {
    const [compiled, sourceMap] = transpile(sourceText, sourcePath);
    let basename = path_1.default.basename(sourcePath);
    basename = basename.slice(0, basename.lastIndexOf('.'));
    // service.i.ft.addSourceFile(sourcePath, true, sourceText).dp();
    // eslint-disable-next-line no-console
    console.log('[ts-transformer] transpile', sourcePath);
    return { code: compiled, map: sourceMap };
}
const createTransformer = (_config) => {
    const transformer = {
        process(sourceText, sourcePath, _options) {
            return procecc(sourceText, sourcePath);
        },
        processAsync(sourceText, sourcePath, _options) {
            return Promise.resolve(procecc(sourceText, sourcePath));
        }
    };
    return transformer;
};
exports.default = { createTransformer };
//# sourceMappingURL=ts-transformer.js.map